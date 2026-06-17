from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.exceptions import PermissionDenied
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from django.db.models import Count, Max, Q

from apps.accounts.permissions import CanPublishResults
from apps.accounts.permissions import CanViewAnalytics
from apps.accounts.models import AccountRole
from apps.accounts.scopes import (
    get_account_profile,
    get_scoped_object_or_403,
    scope_exam_queryset,
    scope_result_queryset,
    scope_student_queryset,
    scope_teacher_queryset,
)
from apps.attempts.models import StudentAnswer, StudentExamAttempt
from apps.attempts.services import submit_attempt
from apps.exams.models import Exam
from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance
from apps.students.models import StudentProfile
from apps.results.serializers import (
    ExamLeaderboardSerializer,
    ExamPerformanceSummarySerializer,
    ExamResultListSerializer,
    ExamResultSerializer,
    GenerateForExamSerializer,
    LiveExamMonitorSerializer,
    GenerateFromAttemptSerializer,
    PublishExamResultsSerializer,
    StudentTopicPerformanceSerializer,
    TeacherExamAttemptSerializer,
    TeacherAttemptInterventionCreateSerializer,
    TeacherAttemptInterventionSerializer,
    TeacherQuestionAnalysisSerializer,
)
from apps.reports.models import AuditLog
from apps.results.services import (
    attempt_monitor_alerts,
    calculate_exam_performance_summary,
    calculate_exam_ranks,
    ensure_attempt_can_be_force_submitted,
    calculate_student_topic_performance,
    generate_result_from_attempt,
    generate_results_for_exam,
    hydrate_teacher_attempt_monitor_payloads,
    publish_exam_results,
)
from apps.reports.services import create_audit_log
from common.responses import action_response


class ExamResultViewSet(ModelViewSet):
    serializer_class = ExamResultSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["institute", "exam", "student", "result_status", "is_published", "is_active"]
    search_fields = ["exam__title", "exam__code", "student__full_name", "student__admission_no"]
    ordering_fields = ["rank", "final_score", "percentage", "time_taken_seconds", "published_at"]
    ordering = ["rank", "-final_score", "time_taken_seconds"]

    def get_permissions(self):
        if self.action in {
            "generate_from_attempt",
            "generate_for_exam",
            "calculate_ranks",
            "publish_results",
            "force_submit_attempt",
        }:
            return [IsAuthenticated(), CanPublishResults()]
        return [IsAuthenticated(), CanViewAnalytics()]

    def get_queryset(self):
        queryset = ExamResult.objects.select_related(
            "institute",
            "exam",
            "exam__institute",
            "exam__source_teacher",
            "student",
            "attempt",
        )
        return scope_result_queryset(queryset, self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return ExamResultListSerializer
        return super().get_serializer_class()

    @action(detail=False, methods=["post"], url_path="generate-from-attempt")
    def generate_from_attempt(self, request):
        serializer = GenerateFromAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            attempt = get_scoped_object_or_403(
                scope_teacher_queryset(
                    StudentExamAttempt.objects.select_related("exam", "student", "institute"),
                    request.user,
                ),
                user=request.user,
                value=serializer.validated_data["attempt"],
                not_found_message="Attempt not found in your scope.",
            )
        except PermissionDenied as exc:
            return Response({"attempt": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            result = generate_result_from_attempt(attempt)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        calculate_student_topic_performance(attempt.exam, attempt.student, attempt)
        calculate_exam_performance_summary(attempt.exam)
        return action_response(
            data=ExamResultSerializer(result).data,
            message="Result generated successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="generate-for-exam")
    def generate_for_exam(self, request):
        serializer = GenerateForExamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            exam = get_scoped_object_or_403(
                scope_exam_queryset(Exam.objects.all(), request.user),
                user=request.user,
                value=serializer.validated_data["exam"],
                not_found_message="Exam not found in your scope.",
            )
        except PermissionDenied as exc:
            return Response({"exam": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            results = generate_results_for_exam(exam)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        return action_response(
            data=ExamResultSerializer(results, many=True).data,
            message="Exam results generated successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="calculate-ranks")
    def calculate_ranks(self, request):
        serializer = GenerateForExamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            exam = get_scoped_object_or_403(
                scope_exam_queryset(Exam.objects.all(), request.user),
                user=request.user,
                value=serializer.validated_data["exam"],
                not_found_message="Exam not found in your scope.",
            )
        except PermissionDenied as exc:
            return Response({"exam": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        results = calculate_exam_ranks(exam)
        return action_response(
            data=ExamResultSerializer(results, many=True).data,
            message="Exam ranks calculated successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="publish-exam-results")
    def publish_results(self, request):
        serializer = PublishExamResultsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            exam = get_scoped_object_or_403(
                scope_exam_queryset(Exam.objects.all(), request.user),
                user=request.user,
                value=serializer.validated_data["exam"],
                not_found_message="Exam not found in your scope.",
            )
        except PermissionDenied as exc:
            return Response({"exam": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            results = publish_exam_results(exam)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="result_publish",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam results published.",
            metadata={"result_count": len(results)},
            request=request,
        )
        return action_response(
            data=ExamResultSerializer(results, many=True).data,
            message="Exam results published successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path=r"exam/(?P<exam_id>[^/.]+)/leaderboard")
    def leaderboard(self, request, exam_id=None):
        queryset = self.get_queryset().filter(exam_id=exam_id, is_active=True).order_by(
            "rank", "-final_score", "time_taken_seconds"
        )
        return Response(ExamLeaderboardSerializer(queryset, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path=r"student/(?P<student_id>[^/.]+)/performance")
    def student_performance(self, request, student_id=None):
        profile = get_account_profile(request.user)
        if (
            profile
            and profile.role == AccountRole.STUDENT
            and str(profile.student_profile_id) != str(student_id)
        ):
            return Response(
                {"detail": "You can only view your own performance."},
                status=status.HTTP_403_FORBIDDEN,
            )
        queryset = self.get_queryset().filter(student_id=student_id, is_active=True).order_by(
            "-published_at", "-created_at"
        )
        return Response(ExamResultListSerializer(queryset, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path=r"exam/(?P<exam_id>[^/.]+)/attempts")
    def exam_attempts(self, request, exam_id=None):
        queryset = scope_teacher_queryset(
            StudentExamAttempt.objects.select_related("exam", "student", "institute"),
            request.user,
        ).filter(exam_id=exam_id, is_active=True)
        attempts = hydrate_teacher_attempt_monitor_payloads(queryset.order_by("-started_at"))
        return Response(
            TeacherExamAttemptSerializer(attempts, many=True).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="force-submit-attempt")
    def force_submit_attempt(self, request):
        serializer = GenerateFromAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            attempt = get_scoped_object_or_403(
                scope_teacher_queryset(
                    StudentExamAttempt.objects.select_related("exam", "student", "institute"),
                    request.user,
                ),
                user=request.user,
                value=serializer.validated_data["attempt"],
                not_found_message="Attempt not found in your scope.",
            )
        except PermissionDenied as exc:
            return Response({"attempt": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            ensure_attempt_can_be_force_submitted(attempt)
            attempt = submit_attempt(attempt, auto_submitted=True)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        create_audit_log(
            user=request.user,
            institute=attempt.institute,
            action="attempt_force_submit",
            entity_type="attempt",
            entity_id=attempt.id,
            message="Teacher force-submitted an in-progress attempt.",
            metadata={
                "exam_id": str(attempt.exam_id),
                "student_id": str(attempt.student_id),
                "status": attempt.status,
            },
            request=request,
        )
        return action_response(
            data=TeacherExamAttemptSerializer(attempt).data,
            message="Attempt force-submitted successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path=r"attempt/(?P<attempt_id>[^/.]+)/interventions")
    def attempt_interventions(self, request, attempt_id=None):
        try:
            attempt = get_scoped_object_or_403(
                scope_teacher_queryset(
                    StudentExamAttempt.objects.select_related("exam", "student", "institute"),
                    request.user,
                ),
                user=request.user,
                value=attempt_id,
                not_found_message="Attempt not found in your scope.",
            )
        except PermissionDenied as exc:
            return Response({"attempt": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        logs = AuditLog.objects.filter(
            entity_type="attempt",
            entity_id=str(attempt.id),
            action__in=[
                "attempt_force_submit",
                "attempt_intervention_note",
            ],
        ).select_related("user").order_by("-created_at")

        return Response(
            TeacherAttemptInterventionSerializer(logs, many=True).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="attempt-intervention-note")
    def attempt_intervention_note(self, request):
        serializer = TeacherAttemptInterventionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            attempt = get_scoped_object_or_403(
                scope_teacher_queryset(
                    StudentExamAttempt.objects.select_related("exam", "student", "institute"),
                    request.user,
                ),
                user=request.user,
                value=serializer.validated_data["attempt"],
                not_found_message="Attempt not found in your scope.",
            )
        except PermissionDenied as exc:
            return Response({"attempt": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        log = create_audit_log(
            user=request.user,
            institute=attempt.institute,
            action="attempt_intervention_note",
            entity_type="attempt",
            entity_id=attempt.id,
            message=serializer.validated_data["note"],
            metadata={
                "exam_id": str(attempt.exam_id),
                "student_id": str(attempt.student_id),
                "follow_up": serializer.validated_data["follow_up"],
            },
            request=request,
        )
        return action_response(
            data=TeacherAttemptInterventionSerializer(log).data,
            message="Intervention note saved successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path=r"exam/(?P<exam_id>[^/.]+)/live-monitor")
    def live_monitor(self, request, exam_id=None):
        try:
            exam = get_scoped_object_or_403(
                scope_exam_queryset(Exam.objects.all(), request.user),
                user=request.user,
                value=exam_id,
                not_found_message="Exam not found in your scope.",
            )
        except PermissionDenied as exc:
            return Response({"exam": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        student_queryset = StudentProfile.objects.filter(
            institute_id=exam.institute_id,
            academic_year_id=exam.academic_year_id,
            program_id=exam.program_id,
            is_active=True,
        )
        if exam.cohort_id:
            student_queryset = student_queryset.filter(cohort_id=exam.cohort_id)

        total_students = student_queryset.count()
        attempt_queryset = scope_teacher_queryset(
            StudentExamAttempt.objects.select_related("exam", "student", "institute"),
            request.user,
        ).filter(exam_id=exam.id, is_active=True)

        student_rollup = attempt_queryset.aggregate(
            started_students=Count("student_id", distinct=True),
            in_progress_students=Count(
                "student_id",
                filter=Q(status="in_progress"),
                distinct=True,
            ),
            submitted_students=Count(
                "student_id",
                filter=Q(status="submitted"),
                distinct=True,
            ),
            auto_submitted_students=Count(
                "student_id",
                filter=Q(status="auto_submitted"),
                distinct=True,
            ),
            completed_students=Count(
                "student_id",
                filter=Q(status__in=["submitted", "auto_submitted"]),
                distinct=True,
            ),
            last_activity_at=Max("updated_at"),
        )

        started_students = student_rollup["started_students"] or 0
        in_progress_students = student_rollup["in_progress_students"] or 0
        submitted_students = student_rollup["submitted_students"] or 0
        auto_submitted_students = student_rollup["auto_submitted_students"] or 0
        completed_students = student_rollup["completed_students"] or 0
        not_started_students = max(total_students - started_students, 0)

        completion_percentage = (
            round((completed_students / total_students) * 100, 2)
            if total_students > 0
            else 0.0
        )
        submission_percentage = (
            round((started_students / total_students) * 100, 2)
            if total_students > 0
            else 0.0
        )

        attempt_rows = hydrate_teacher_attempt_monitor_payloads(list(attempt_queryset))
        alerted_attempts = 0
        stalled_attempts = 0
        high_alert_attempts = 0
        medium_alert_attempts = 0
        for attempt in attempt_rows:
            alerts = attempt_monitor_alerts(attempt)
            if alerts:
                alerted_attempts += 1
            if any(alert["code"] == "stalled_activity" for alert in alerts):
                stalled_attempts += 1
            if any(alert["severity"] == "high" for alert in alerts):
                high_alert_attempts += 1
            elif any(alert["severity"] == "medium" for alert in alerts):
                medium_alert_attempts += 1

        recent_attempts = list(
            sorted(
                attempt_rows,
                key=lambda attempt: (
                    max(
                        (
                            3 if alert["severity"] == "high"
                            else 2 if alert["severity"] == "medium"
                            else 1
                            for alert in attempt_monitor_alerts(attempt)
                        ),
                        default=0,
                    ),
                    attempt.updated_at or attempt.started_at,
                    attempt.started_at,
                ),
                reverse=True,
            )[:8]
        )
        payload = {
            "exam_id": exam.id,
            "exam_title": exam.title,
            "exam_code": exam.code,
            "exam_status": exam.status,
            "total_students": total_students,
            "started_students": started_students,
            "not_started_students": not_started_students,
            "in_progress_students": in_progress_students,
            "submitted_students": submitted_students,
            "auto_submitted_students": auto_submitted_students,
            "completed_students": completed_students,
            "alerted_attempts": alerted_attempts,
            "high_alert_attempts": high_alert_attempts,
            "medium_alert_attempts": medium_alert_attempts,
            "stalled_attempts": stalled_attempts,
            "completion_percentage": completion_percentage,
            "submission_percentage": submission_percentage,
            "last_activity_at": student_rollup["last_activity_at"],
            "recent_attempts": TeacherExamAttemptSerializer(recent_attempts, many=True).data,
        }
        return Response(
            LiveExamMonitorSerializer(payload).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path=r"exam/(?P<exam_id>[^/.]+)/question-analysis")
    def question_analysis(self, request, exam_id=None):
        attempt_queryset = scope_teacher_queryset(
            StudentExamAttempt.objects.select_related("exam", "student", "institute"),
            request.user,
        ).filter(exam_id=exam_id, is_active=True)

        analysis_queryset = (
            StudentAnswer.objects.filter(attempt__in=attempt_queryset, is_active=True)
            .select_related("question", "question__subject", "question__topic")
            .values(
                "question_id",
                "question__question_text",
                "question__subject__name",
                "question__topic__name",
            )
            .annotate(
                total_attempts=Count("id"),
                correct_count=Count("id", filter=Q(selected_option__isnull=False, is_correct=True)),
                wrong_count=Count("id", filter=Q(selected_option__isnull=False, is_correct=False)),
                skipped_count=Count("id", filter=Q(selected_option__isnull=True)),
                marked_for_review_count=Count("id", filter=Q(is_marked_for_review=True)),
            )
            .order_by("-wrong_count", "-marked_for_review_count", "question__question_text")
        )

        payload = [
            {
                "question_id": row["question_id"],
                "question_text_summary": (
                    row["question__question_text"][:120]
                    + ("..." if len(row["question__question_text"]) > 120 else "")
                ),
                "subject_name": row["question__subject__name"],
                "topic_name": row["question__topic__name"],
                "total_attempts": row["total_attempts"],
                "correct_count": row["correct_count"],
                "wrong_count": row["wrong_count"],
                "skipped_count": row["skipped_count"],
                "marked_for_review_count": row["marked_for_review_count"],
            }
            for row in analysis_queryset
        ]
        return Response(
            TeacherQuestionAnalysisSerializer(payload, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentTopicPerformanceViewSet(ReadOnlyModelViewSet):
    serializer_class = StudentTopicPerformanceSerializer
    permission_classes = [IsAuthenticated, CanViewAnalytics]
    filterset_fields = ["institute", "exam", "student", "subject", "topic", "is_active"]
    search_fields = ["exam__title", "exam__code", "student__full_name", "student__admission_no"]
    ordering_fields = ["final_score", "percentage", "created_at"]
    ordering = ["-percentage", "-final_score"]

    def list(self, request, *args, **kwargs):
        profile = get_account_profile(request.user)
        requested_student = request.query_params.get("student")
        if (
            profile
            and profile.role == AccountRole.STUDENT
            and requested_student
            and str(profile.student_profile_id) != requested_student
        ):
            return Response(
                {"detail": "You can only view your own topic performance."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = StudentTopicPerformance.objects.select_related(
            "institute", "exam", "student", "subject", "topic"
        ).all()
        return scope_result_queryset(queryset, self.request.user)


class ExamPerformanceSummaryViewSet(ReadOnlyModelViewSet):
    serializer_class = ExamPerformanceSummarySerializer
    permission_classes = [IsAuthenticated, CanViewAnalytics]
    filterset_fields = ["institute", "exam", "is_active"]
    search_fields = ["exam__title", "exam__code"]
    ordering_fields = ["last_calculated_at", "average_score", "average_percentage"]
    ordering = ["-last_calculated_at"]

    def get_queryset(self):
        queryset = ExamPerformanceSummary.objects.select_related("institute", "exam").all()
        return scope_teacher_queryset(queryset, self.request.user)
