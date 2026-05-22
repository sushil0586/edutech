from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.exceptions import PermissionDenied
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from django.db.models import Count, Q

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
from apps.exams.models import Exam
from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance
from apps.results.serializers import (
    ExamLeaderboardSerializer,
    ExamPerformanceSummarySerializer,
    ExamResultSerializer,
    GenerateForExamSerializer,
    GenerateFromAttemptSerializer,
    PublishExamResultsSerializer,
    StudentTopicPerformanceSerializer,
    TeacherExamAttemptSerializer,
    TeacherQuestionAnalysisSerializer,
)
from apps.results.services import (
    calculate_exam_performance_summary,
    calculate_exam_ranks,
    calculate_student_topic_performance,
    generate_result_from_attempt,
    generate_results_for_exam,
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
        }:
            return [IsAuthenticated(), CanPublishResults()]
        return [IsAuthenticated(), CanViewAnalytics()]

    def get_queryset(self):
        queryset = ExamResult.objects.select_related("institute", "exam", "student", "attempt").all()
        return scope_result_queryset(queryset, self.request.user)

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
        return Response(ExamResultSerializer(queryset, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path=r"exam/(?P<exam_id>[^/.]+)/attempts")
    def exam_attempts(self, request, exam_id=None):
        queryset = scope_teacher_queryset(
            StudentExamAttempt.objects.select_related("exam", "student", "institute"),
            request.user,
        ).filter(exam_id=exam_id, is_active=True)
        return Response(
            TeacherExamAttemptSerializer(queryset.order_by("-started_at"), many=True).data,
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
