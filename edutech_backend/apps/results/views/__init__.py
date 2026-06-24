from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.exceptions import PermissionDenied
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from django.db.models import Count, Max, Min, Q, Prefetch

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
from apps.attempts.models import StudentAnswer, StudentAnswerReviewTask, StudentExamAttempt
from apps.attempts.serializers import (
    assertion_reason_fields_for_question,
    matrix_match_fields_for_question,
    review_answer_key_for_question,
)
from apps.attempts.services import ordered_exam_questions_for_attempt, submit_attempt
from apps.attempts.services import REVIEW_TASK_UNRESOLVED_STATUSES
from apps.exams.models import Exam
from apps.question_bank.models import AttachmentType, QuestionOption
from apps.question_bank.registry import (
    get_question_type_definition,
    get_question_type_definition_payload,
)
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
    TeacherAttemptQuestionAnalysisResponseSerializer,
    TeacherQuestionAnalysisSerializer,
)
from apps.reports.models import AuditLog
from apps.results.services import (
    calculate_exam_performance_summary,
    calculate_exam_ranks,
    ensure_attempt_can_be_force_submitted,
    calculate_student_topic_performance,
    filter_teacher_attempt_monitor_payloads,
    generate_result_from_attempt,
    generate_results_for_exam,
    hydrate_teacher_attempt_monitor_payloads,
    publish_exam_results,
    search_teacher_attempt_monitor_payloads,
    sort_teacher_attempt_monitor_payloads,
    summarize_teacher_attempt_monitor_payloads,
)
from apps.reports.services import create_audit_log
from common.pagination import StandardResultsSetPagination
from common.responses import action_response


def _result_question_media_context(question):
    attachments = list(question.attachments.filter(is_active=True).order_by("display_order", "created_at"))
    definition = get_question_type_definition(question.question_type)
    attachment_types = []
    for attachment in attachments:
        normalized_type = str(attachment.attachment_type or "").strip()
        if normalized_type and normalized_type not in attachment_types:
            attachment_types.append(normalized_type)

    total_attachments = len(attachments)
    return {
        "has_media": total_attachments > 0,
        "total_attachments": total_attachments,
        "attachment_types": attachment_types,
        "primary_attachment_type": attachment_types[0] if attachment_types else None,
        "delivery_mode": (
            definition.media_delivery_mode
            if definition is not None and total_attachments > 0
            else "none"
        ),
        "preload_strategy": (
            definition.media_preload_strategy
            if definition is not None and total_attachments > 0
            else "none"
        ),
        "supports_audio_prompt": AttachmentType.AUDIO in attachment_types,
        "supports_video_prompt": AttachmentType.VIDEO in attachment_types,
        "supports_document_prompt": AttachmentType.PDF in attachment_types,
        "supports_visual_prompt": any(
            attachment_type in attachment_types
            for attachment_type in (AttachmentType.IMAGE, AttachmentType.DIAGRAM)
        ),
        "inline_attachment_count": sum(1 for attachment in attachments if attachment.is_inline),
    }


class ExamResultViewSet(ModelViewSet):
    serializer_class = ExamResultSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
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
        summary = queryset.aggregate(
            total=Count("id"),
            ranked=Count("id", filter=Q(rank__isnull=False)),
            published=Count("id", filter=Q(is_published=True)),
        )
        page = self.paginate_queryset(queryset)
        serializer = ExamLeaderboardSerializer(page, many=True)
        response = self.get_paginated_response(serializer.data)
        total = summary["total"] or 0
        ranked = summary["ranked"] or 0
        published = summary["published"] or 0
        response.data["summary"] = {
            "total": total,
            "ranked_count": ranked,
            "published_count": published,
            "all_ranked": total > 0 and ranked == total,
            "published_results": total > 0 and published == total,
        }
        return response

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
        if not any(
            key in request.query_params
            for key in ("page", "page_size", "filter", "sort", "search", "attempt_id")
        ):
            attempts = hydrate_teacher_attempt_monitor_payloads(queryset.order_by("-started_at"))
            return Response(
                TeacherExamAttemptSerializer(attempts, many=True).data,
                status=status.HTTP_200_OK,
            )

        attempt_filter = (request.query_params.get("filter") or "all").strip()
        attempt_sort = (request.query_params.get("sort") or "latest").strip()
        search_value = (request.query_params.get("search") or "").strip()
        selected_attempt_id = (request.query_params.get("attempt_id") or "").strip()

        attempts = hydrate_teacher_attempt_monitor_payloads(queryset.order_by("-started_at"))
        total_attempts = len(attempts)
        filtered_attempts = filter_teacher_attempt_monitor_payloads(attempts, attempt_filter)
        searched_attempts = search_teacher_attempt_monitor_payloads(filtered_attempts, search_value)
        sorted_attempts = sort_teacher_attempt_monitor_payloads(searched_attempts, attempt_sort)
        selected_attempt = next(
            (attempt for attempt in attempts if str(attempt.id) == selected_attempt_id),
            None,
        )

        page = self.paginate_queryset(sorted_attempts)
        serializer = TeacherExamAttemptSerializer(page if page is not None else sorted_attempts, many=True)
        if page is not None:
            response = self.get_paginated_response(serializer.data)
        else:
            response = Response(
                {
                    "count": len(sorted_attempts),
                    "next": None,
                    "previous": None,
                    "results": serializer.data,
                },
                status=status.HTTP_200_OK,
            )
        response.data["summary"] = {
            "total_attempts": total_attempts,
        }
        response.data["applied_filter"] = attempt_filter
        response.data["applied_sort"] = attempt_sort
        response.data["applied_search"] = search_value
        response.data["selected_attempt"] = (
            TeacherExamAttemptSerializer(selected_attempt).data if selected_attempt else None
        )
        return response

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
        monitor_summary = summarize_teacher_attempt_monitor_payloads(attempt_rows, recent_limit=8)
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
            "alerted_attempts": monitor_summary["alerted_attempts"],
            "high_alert_attempts": monitor_summary["high_alert_attempts"],
            "medium_alert_attempts": monitor_summary["medium_alert_attempts"],
            "stalled_attempts": monitor_summary["stalled_attempts"],
            "integrity_warning_attempts": monitor_summary["integrity_warning_attempts"],
            "integrity_warnings_total": monitor_summary["integrity_warnings_total"],
            "threshold_reached_attempts": monitor_summary["threshold_reached_attempts"],
            "attempts_by_health": monitor_summary["attempts_by_health"],
            "completion_percentage": completion_percentage,
            "submission_percentage": submission_percentage,
            "last_activity_at": student_rollup["last_activity_at"],
            "recent_attempts": TeacherExamAttemptSerializer(
                monitor_summary["recent_attempts"], many=True
            ).data,
        }
        return Response(
            LiveExamMonitorSerializer(payload).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path=r"exam/(?P<exam_id>[^/.]+)/question-analysis")
    def question_analysis(self, request, exam_id=None):
        def _attempt_rate(count, usage_count):
            usage = int(usage_count or 0)
            if usage <= 0:
                return 0.0
            return round((int(count or 0) / usage) * 100, 2)

        def _distractor_signal(*, is_correct, selected_count, selected_correct_count, selected_wrong_count, selection_rate):
            if is_correct:
                if selected_correct_count >= max(selected_wrong_count, 1):
                    return "validated_key"
                return "key_review"
            if selected_wrong_count == 0 and selected_count == 0:
                return "untested_distractor"
            if selected_wrong_count == 0:
                return "weak_distractor"
            if selection_rate >= 35:
                return "strong_distractor"
            if selection_rate >= 15:
                return "working_distractor"
            return "light_distractor"

        def _distractor_note(signal):
            if signal == "validated_key":
                return "Students are finding the keyed answer reliably."
            if signal == "key_review":
                return "The keyed answer is not separating learners cleanly. Recheck wording and scoring."
            if signal == "untested_distractor":
                return "This distractor has not attracted any responses yet."
            if signal == "weak_distractor":
                return "This distractor exists but rarely captures wrong answers. Consider rewriting it."
            if signal == "strong_distractor":
                return "This distractor is pulling a large share of wrong responses and may reveal a misconception."
            if signal == "working_distractor":
                return "This distractor is doing useful separation work."
            return "This distractor is lightly used and can be monitored over more attempts."

        def _quality_payload(row):
            total_attempts = row["total_attempts"] or 0
            correct_count = row["correct_count"] or 0
            wrong_count = row["wrong_count"] or 0
            skipped_count = row["skipped_count"] or 0
            marked_count = row["marked_for_review_count"] or 0
            denominator = max(total_attempts, 1)
            correct_rate = round((correct_count / denominator) * 100, 2)
            wrong_rate = round((wrong_count / denominator) * 100, 2)
            skip_rate = round((skipped_count / denominator) * 100, 2)
            marked_rate = round((marked_count / denominator) * 100, 2)

            if total_attempts < 3:
                quality_signal = "emerging"
                revision_priority = "watch"
                quality_note = "More response volume is needed before treating this question as a revision candidate."
            elif skip_rate >= 40:
                quality_signal = "skip_risk"
                revision_priority = "urgent"
                quality_note = "Learners are skipping this question heavily. Review clarity, cognitive load, and time burden."
            elif wrong_rate >= 60:
                quality_signal = "hard"
                revision_priority = "urgent"
                quality_note = "Wrong answers dominate this question. Recheck expectations, wording, and distractor fairness."
            elif marked_rate >= 20 and marked_count >= 2:
                quality_signal = "ambiguous"
                revision_priority = "high"
                quality_note = "Learners frequently flag this question for review, which suggests ambiguity or low confidence."
            elif wrong_rate >= 40 or skip_rate >= 25:
                quality_signal = "revision_candidate"
                revision_priority = "high"
                quality_note = "This question is underperforming and should be reviewed for editorial revision."
            elif correct_rate >= 85 and wrong_count <= 1:
                quality_signal = "healthy"
                revision_priority = "none"
                quality_note = "This question is currently performing in a stable range."
            else:
                quality_signal = "watch"
                revision_priority = "medium"
                quality_note = "Keep monitoring this question for drift before changing it."

            return {
                "total_attempts": total_attempts,
                "correct_count": correct_count,
                "wrong_count": wrong_count,
                "skipped_count": skipped_count,
                "marked_for_review_count": marked_count,
                "correct_rate": correct_rate,
                "wrong_rate": wrong_rate,
                "skip_rate": skip_rate,
                "quality_signal": quality_signal,
                "revision_priority": revision_priority,
                "quality_note": quality_note,
            }

        def _build_revision_reasons(item):
            reasons = []
            if item["wrong_rate"] >= 60:
                reasons.append("High wrong-answer pressure")
            elif item["wrong_rate"] >= 40:
                reasons.append("Elevated wrong-answer rate")
            if item["skip_rate"] >= 40:
                reasons.append("Heavy skip behaviour")
            elif item["skip_rate"] >= 25:
                reasons.append("Visible skip behaviour")
            if item["marked_for_review_count"] >= 2:
                reasons.append("Learners often mark it for review")
            for distractor in item.get("distractor_insights", []):
                signal = distractor.get("distractor_signal")
                if signal == "weak_distractor":
                    reasons.append(f"Weak distractor: {distractor.get('option_text_summary', 'option')}")
                elif signal == "strong_distractor":
                    reasons.append(f"Strong misconception trap: {distractor.get('option_text_summary', 'option')}")
                elif signal == "key_review":
                    reasons.append("Keyed answer may need review")
            deduped = []
            for reason in reasons:
                if reason not in deduped:
                    deduped.append(reason)
            return deduped[:4]

        def _question_quality_summary(payload):
            revision_candidates = [
                item for item in payload if item["revision_priority"] in {"high", "urgent"}
            ]
            signal_counts = {
                "healthy_questions": sum(1 for item in payload if item["quality_signal"] == "healthy"),
                "watch_questions": sum(1 for item in payload if item["quality_signal"] == "watch"),
                "ambiguous_questions": sum(1 for item in payload if item["quality_signal"] == "ambiguous"),
                "emerging_questions": sum(1 for item in payload if item["quality_signal"] == "emerging"),
                "high_skip_questions": sum(1 for item in payload if item["quality_signal"] == "skip_risk"),
                "hard_questions": sum(1 for item in payload if item["quality_signal"] == "hard"),
            }

            topic_rollup = {}
            for item in revision_candidates:
                topic_name = (item.get("topic_name") or "").strip() or "Unmapped topic"
                topic_rollup[topic_name] = topic_rollup.get(topic_name, 0) + 1
            top_revision_topics = [
                {"topic_name": topic_name, "count": count}
                for topic_name, count in sorted(
                    topic_rollup.items(),
                    key=lambda row: (-row[1], row[0]),
                )[:3]
            ]
            top_revision_questions = [
                {
                    "question_id": item["question_id"],
                    "question_text_summary": item["question_text_summary"],
                    "topic_name": item.get("topic_name"),
                    "revision_priority": item["revision_priority"],
                    "quality_signal": item["quality_signal"],
                }
                for item in sorted(
                    revision_candidates,
                    key=lambda row: (
                        0 if row["revision_priority"] == "urgent" else 1,
                        -row["wrong_rate"],
                        -row["skip_rate"],
                    ),
                )[:5]
            ]

            recommended_actions = []
            urgent_count = sum(
                1 for item in revision_candidates if item["revision_priority"] == "urgent"
            )
            if urgent_count > 0:
                recommended_actions.append(
                    f"Review {urgent_count} urgent question(s) first and fix the ones with the highest wrong or skip pressure."
                )
            if signal_counts["high_skip_questions"] > 0:
                recommended_actions.append(
                    "Inspect skip-risk questions for wording clarity, time burden, and whether learners can start the item confidently."
                )
            if signal_counts["ambiguous_questions"] > 0:
                recommended_actions.append(
                    "Audit ambiguous questions for editorial confusion, weak distractors, or multiple plausible interpretations."
                )
            if signal_counts["emerging_questions"] > 0:
                recommended_actions.append(
                    "Keep emerging questions under observation until more live attempt volume confirms whether they are stable or risky."
                )
            if not recommended_actions:
                recommended_actions.append(
                    "Question quality looks stable right now. Use this exam as a benchmark and monitor future drift before revising the bank."
                )

            return {
                "revision_candidates": len(revision_candidates),
                "urgent_revision_candidates": urgent_count,
                **signal_counts,
                "top_revision_topics": top_revision_topics,
                "top_revision_questions": top_revision_questions,
                "recommended_actions": recommended_actions[:4],
            }

        def _distractor_quality_summary(payload):
            all_distractors = [
                distractor
                for item in payload
                for distractor in item.get("distractor_insights", [])
            ]
            weak_distractors = [
                item for item in all_distractors if item["distractor_signal"] == "weak_distractor"
            ]
            untested_distractors = [
                item for item in all_distractors if item["distractor_signal"] == "untested_distractor"
            ]
            strong_distractors = [
                item for item in all_distractors if item["distractor_signal"] == "strong_distractor"
            ]
            key_review_options = [
                item for item in all_distractors if item["distractor_signal"] == "key_review"
            ]
            return {
                "weak_distractors": len(weak_distractors),
                "untested_distractors": len(untested_distractors),
                "strong_distractors": len(strong_distractors),
                "key_review_options": len(key_review_options),
                "top_weak_distractors": sorted(
                    weak_distractors,
                    key=lambda item: (-item["selected_count"], item["option_text_summary"]),
                )[:5],
                "top_strong_distractors": sorted(
                    strong_distractors,
                    key=lambda item: (-item["selected_wrong_count"], item["option_text_summary"]),
                )[:5],
            }

        if not any(key in request.query_params for key in ("page", "page_size", "filter")):
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
                    "question__passage__title",
                    "question__subject__name",
                    "question__topic__name",
                )
                .annotate(
                    total_attempts=Count("id"),
                    correct_count=Count("id", filter=Q(is_correct=True)),
                    wrong_count=Count("id", filter=Q(is_correct=False)),
                    skipped_count=Count("id", filter=Q(selected_option__isnull=True, answer_text="")),
                    marked_for_review_count=Count("id", filter=Q(is_marked_for_review=True)),
                )
                .order_by("-wrong_count", "-skipped_count", "question__question_text")
            )
            question_rows = [
                {
                    "question_id": row["question_id"],
                    "question_text_summary": (row["question__question_text"] or "")[:140],
                    "passage_title": row["question__passage__title"] or "",
                    "subject_name": row["question__subject__name"],
                    "topic_name": row["question__topic__name"],
                    **_quality_payload(row),
                }
                for row in analysis_queryset
            ]
            serializer = TeacherQuestionAnalysisSerializer(question_rows, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        question_filter = (request.query_params.get("filter") or "all").strip()
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
                "question__passage__title",
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
        )
        if question_filter == "hard_questions":
            analysis_queryset = analysis_queryset.filter(
                total_attempts__gt=0,
                wrong_count__gte=1,
            )
        elif question_filter == "skipped_often":
            analysis_queryset = analysis_queryset.filter(skipped_count__gte=2)
        elif question_filter == "revision_candidates":
            analysis_queryset = analysis_queryset.filter(total_attempts__gte=3).filter(
                Q(wrong_count__gte=2) | Q(skipped_count__gte=2) | Q(marked_for_review_count__gte=2)
            )
        else:
            question_filter = "all"

        analysis_queryset = analysis_queryset.order_by(
            "-wrong_count", "-marked_for_review_count", "question__question_text"
        )

        rubric_tasks = StudentAnswerReviewTask.objects.filter(
            exam_id=exam_id,
            is_active=True,
        )
        rubric_summary_map = {}
        reviewed_rubric_responses = 0
        for task in rubric_tasks:
            metadata = task.metadata if isinstance(task.metadata, dict) else {}
            rubric_scores = (
                metadata.get("moderation_rubric_scores")
                or metadata.get("rubric_scores")
                or []
            )
            if not isinstance(rubric_scores, list) or not rubric_scores:
                continue
            reviewed_rubric_responses += 1
            for score in rubric_scores:
                if not isinstance(score, dict):
                    continue
                criterion_key = str(score.get("criterion_key", "") or "").strip()
                if not criterion_key:
                    continue
                current = rubric_summary_map.setdefault(
                    criterion_key,
                    {
                        "criterion_key": criterion_key,
                        "criterion_label": str(score.get("criterion_label", "") or criterion_key),
                        "awarded_total": 0.0,
                        "max_total": 0.0,
                        "reviewed_count": 0,
                    },
                )
                current["awarded_total"] += float(score.get("awarded_score", 0) or 0)
                current["max_total"] += float(score.get("max_score", 0) or 0)
                current["reviewed_count"] += 1

        rubric_criteria = sorted(
            [
                {
                    **item,
                    "average_percentage": round((item["awarded_total"] / item["max_total"]) * 100)
                    if item["max_total"] > 0
                    else 0,
                    "average_awarded_score": round(item["awarded_total"] / item["reviewed_count"], 2)
                    if item["reviewed_count"] > 0
                    else 0.0,
                    "average_max_score": round(item["max_total"] / item["reviewed_count"], 2)
                    if item["reviewed_count"] > 0
                    else 0.0,
                }
                for item in rubric_summary_map.values()
            ],
            key=lambda item: (item["average_percentage"], item["criterion_label"]),
        )

        analysis_rows = list(analysis_queryset)
        usage_count_map = {
            str(row["question_id"]): row["total_attempts"] or 0
            for row in analysis_rows
        }
        question_ids = [row["question_id"] for row in analysis_rows]
        distractor_map = {}
        if question_ids:
            option_queryset = QuestionOption.objects.filter(
                question_id__in=question_ids,
                is_active=True,
            ).annotate(
                selected_count=Count(
                    "student_answers",
                    filter=Q(
                        student_answers__attempt__in=attempt_queryset,
                        student_answers__is_active=True,
                    ),
                    distinct=True,
                ),
                selected_correct_count=Count(
                    "student_answers",
                    filter=Q(
                        student_answers__attempt__in=attempt_queryset,
                        student_answers__is_active=True,
                        student_answers__is_correct=True,
                    ),
                    distinct=True,
                ),
                selected_wrong_count=Count(
                    "student_answers",
                    filter=Q(
                        student_answers__attempt__in=attempt_queryset,
                        student_answers__is_active=True,
                        student_answers__is_correct=False,
                    ),
                    distinct=True,
                ),
            ).order_by("question_id", "option_order", "created_at")
            for option in option_queryset:
                usage_count = usage_count_map.get(str(option.question_id), 0)
                selection_rate = _attempt_rate(
                    getattr(option, "selected_count", 0) or 0,
                    usage_count,
                )
                signal = _distractor_signal(
                    is_correct=bool(option.is_correct),
                    selected_count=getattr(option, "selected_count", 0) or 0,
                    selected_correct_count=getattr(option, "selected_correct_count", 0) or 0,
                    selected_wrong_count=getattr(option, "selected_wrong_count", 0) or 0,
                    selection_rate=selection_rate,
                )
                option_payload = {
                    "option_id": str(option.id),
                    "option_text_summary": (
                        option.option_text[:80] + ("..." if len(option.option_text) > 80 else "")
                    ),
                    "is_correct": bool(option.is_correct),
                    "selected_count": getattr(option, "selected_count", 0) or 0,
                    "selected_correct_count": getattr(option, "selected_correct_count", 0) or 0,
                    "selected_wrong_count": getattr(option, "selected_wrong_count", 0) or 0,
                    "selection_rate": selection_rate,
                    "distractor_signal": signal,
                    "distractor_note": _distractor_note(signal),
                }
                distractor_map.setdefault(str(option.question_id), []).append(option_payload)

        payload = []
        for row in analysis_rows:
            question_payload = {
                "question_id": row["question_id"],
                "question_text_summary": (
                    row["question__question_text"][:120]
                    + ("..." if len(row["question__question_text"]) > 120 else "")
                ),
                "passage_title": row["question__passage__title"] or "",
                "subject_name": row["question__subject__name"],
                "topic_name": row["question__topic__name"],
                **_quality_payload(row),
            }
            question_payload["distractor_insights"] = distractor_map.get(
                str(row["question_id"]),
                [],
            )[:4]
            question_payload["revision_reasons"] = _build_revision_reasons(question_payload)
            payload.append(question_payload)
        page = self.paginate_queryset(payload)
        serializer = TeacherQuestionAnalysisSerializer(page, many=True)
        response = self.get_paginated_response(serializer.data)
        response.data["summary"] = {
            "question_quality": _question_quality_summary(payload),
            "distractor_quality": _distractor_quality_summary(payload),
            "rubric": {
                "reviewed_responses": reviewed_rubric_responses,
                "criteria_count": len(rubric_criteria),
                "weakest_criteria": rubric_criteria[:5],
                "strongest_criteria": list(reversed(rubric_criteria[-3:])),
            }
        }
        response.data["applied_filter"] = question_filter
        return response

    @action(detail=False, methods=["get"], url_path=r"exam/(?P<exam_id>[^/.]+)/attempt-question-analysis")
    def attempt_question_analysis(self, request, exam_id=None):
        attempt_id = (request.query_params.get("attempt_id") or "").strip()
        answer_filter = (request.query_params.get("filter") or "all").strip()
        search_value = (request.query_params.get("search") or "").strip().lower()

        attempts_queryset = scope_teacher_queryset(
            StudentExamAttempt.objects.select_related("exam", "student", "institute"),
            request.user,
        ).filter(exam_id=exam_id, is_active=True)

        if not attempts_queryset.exists():
            payload = {
                "selected_attempt": None,
                "summary": {
                    "total_questions": 0,
                    "attempted_questions": 0,
                    "correct_count": 0,
                    "wrong_count": 0,
                    "skipped_count": 0,
                    "marked_count": 0,
                    "total_time_seconds": 0,
                    "average_time_seconds": 0,
                },
                "applied_filter": "all",
                "results": [],
            }
            serializer = TeacherAttemptQuestionAnalysisResponseSerializer(payload)
            return Response(serializer.data, status=status.HTTP_200_OK)

        selected_attempt = (
            attempts_queryset.filter(pk=attempt_id).first()
            if attempt_id
            else attempts_queryset.order_by("-submitted_at", "-updated_at", "-created_at").first()
        )
        if selected_attempt is None:
            return Response(
                {"detail": "Attempt not found in the selected exam scope."},
                status=status.HTTP_404_NOT_FOUND,
            )

        exam_questions = list(
            selected_attempt.exam.exam_questions.select_related(
                "question",
                "question__subject",
                "question__topic",
            ).prefetch_related(
                Prefetch("question__options")
            )
        )
        ordered_exam_questions = ordered_exam_questions_for_attempt(selected_attempt, exam_questions)
        answers = list(
            StudentAnswer.objects.filter(attempt=selected_attempt, is_active=True)
            .select_related(
                "question",
                "question__subject",
                "question__topic",
                "question__passage",
                "selected_option",
                "reviewed_by_teacher",
            )
        )
        review_task_map = {
            str(task.answer_id): task
            for task in StudentAnswerReviewTask.objects.filter(
                answer_id__in=[answer.id for answer in answers],
                is_active=True,
            )
        }
        answer_map = {str(answer.question_id): answer for answer in answers}

        rows = []
        for index, exam_question in enumerate(ordered_exam_questions, start=1):
            question = exam_question.question
            answer = answer_map.get(str(question.id))
            review_task = review_task_map.get(str(answer.id)) if answer else None
            review_task_metadata = (
                review_task.metadata
                if review_task and isinstance(review_task.metadata, dict)
                else {}
            )
            rubric_definition = None
            question_metadata = question.metadata if isinstance(question.metadata, dict) else {}
            raw_rubric = question_metadata.get("rubric", {})
            if isinstance(raw_rubric, dict) and isinstance(raw_rubric.get("criteria"), list):
                rubric_definition = {
                    "mode": str(raw_rubric.get("mode", "criterion_scores") or "criterion_scores"),
                    "criteria": raw_rubric.get("criteria", []),
                }
            question_text = (question.question_text or "").strip()
            selected_option_ids = [str(item) for item in (getattr(answer, "selected_option_ids", []) or []) if str(item).strip()] if answer else []
            option_text_map = {str(option.id): option.option_text for option in question.options.all()}
            selected_option_texts = [option_text_map[item] for item in selected_option_ids if item in option_text_map]
            selected_option_text = answer.selected_option.option_text if answer and answer.selected_option_id else None
            answer_text = (answer.answer_text or "").strip() if answer else ""
            has_response = bool(
                answer
                and (
                    answer.selected_option_id
                    or selected_option_ids
                    or answer_text
                )
            )
            was_skipped = not has_response
            is_correct = answer.is_correct if answer and has_response else None
            outcome = "skipped" if was_skipped else "correct" if answer and answer.is_correct else "wrong"
            row = {
                "answer_id": answer.id if answer else None,
                "review_task_id": review_task.id if review_task else None,
                "question_id": question.id,
                "question_order": index,
                "question_text_summary": question_text[:180] + ("..." if len(question_text) > 180 else ""),
                "question_text": question_text,
                "assertion_text": assertion_reason_fields_for_question(question)[0],
                "reason_text": assertion_reason_fields_for_question(question)[1],
                "matrix_left_items": matrix_match_fields_for_question(question)[0],
                "matrix_right_items": matrix_match_fields_for_question(question)[1],
                "question_type": question.question_type,
                "question_type_definition": get_question_type_definition_payload(question.question_type),
                "content_format": question.content_format,
                "question_marks": exam_question.marks,
                "passage": question.passage_id,
                "passage_order": question.passage_order,
                "passage_title": question.passage.title if question.passage_id else "",
                "passage_content_format": question.passage.content_format if question.passage_id else "",
                "passage_text": question.passage.passage_text if question.passage_id else "",
                "passage_description": question.passage.description if question.passage_id else "",
                "subject_name": question.subject.name if question.subject_id else None,
                "topic_name": question.topic.name if question.topic_id else None,
                "accepted_answers": review_answer_key_for_question(question),
                "selected_option": answer.selected_option_id if answer else None,
                "selected_option_text": selected_option_text,
                "selected_option_ids": selected_option_ids,
                "selected_option_texts": selected_option_texts,
                "answer_text": answer_text,
                "answer_transcript": (answer.answer_transcript or "").strip() if answer else "",
                "response_artifacts": answer.response_artifacts if answer else [],
                "attachments": [
                    {
                        "id": str(attachment.id),
                        "file": attachment.file.url if attachment.file else "",
                        "file_url": attachment.file_url,
                        "attachment_type": attachment.attachment_type,
                        "title": attachment.title,
                        "display_order": attachment.display_order,
                        "alt_text": attachment.alt_text,
                        "is_inline": attachment.is_inline,
                        "is_active": attachment.is_active,
                    }
                    for attachment in question.attachments.filter(is_active=True).order_by("display_order", "created_at")
                ],
                "media_context": _result_question_media_context(question),
                "evaluation_status": answer.evaluation_status if answer else "",
                "outcome": outcome,
                "is_correct": is_correct,
                "was_skipped": was_skipped,
                "is_marked_for_review": answer.is_marked_for_review if answer else False,
                "marks_awarded": answer.marks_awarded if answer else None,
                "negative_marks_applied": answer.negative_marks_applied if answer else None,
                "reviewed_at": answer.reviewed_at if answer else None,
                "reviewed_by_teacher_name": answer.reviewed_by_teacher.full_name if answer and answer.reviewed_by_teacher_id else "",
                "review_notes": answer.review_notes if answer else "",
                "has_rubric": bool(rubric_definition),
                "rubric": rubric_definition,
                "rubric_scores": (
                    review_task_metadata.get("moderation_rubric_scores")
                    or review_task_metadata.get("rubric_scores")
                    or []
                ),
                "rubric_total": str(
                    review_task_metadata.get("moderation_rubric_total")
                    or review_task_metadata.get("rubric_total")
                    or ""
                ),
                "time_spent_seconds": answer.time_spent_seconds if answer else None,
                "answered_at": answer.answered_at if answer else None,
            }
            rows.append(row)

        if answer_filter == "wrong":
            rows = [row for row in rows if row["outcome"] == "wrong"]
        elif answer_filter == "skipped":
            rows = [row for row in rows if row["outcome"] == "skipped"]
        elif answer_filter == "marked":
            rows = [row for row in rows if row["is_marked_for_review"]]
        elif answer_filter == "correct":
            rows = [row for row in rows if row["outcome"] == "correct"]
        elif answer_filter == "slow":
            rows = [row for row in rows if (row["time_spent_seconds"] or 0) >= 90]
        else:
            answer_filter = "all"

        if search_value:
            rows = [
                row
                for row in rows
                if search_value in row["question_text_summary"].lower()
                or search_value in (row["subject_name"] or "").lower()
                or search_value in (row["topic_name"] or "").lower()
            ]

        total_time_seconds = sum((row["time_spent_seconds"] or 0) for row in rows)
        attempted_questions = sum(1 for row in rows if row["outcome"] != "skipped")
        summary = {
            "total_questions": len(rows),
            "attempted_questions": attempted_questions,
            "correct_count": sum(1 for row in rows if row["outcome"] == "correct"),
            "wrong_count": sum(1 for row in rows if row["outcome"] == "wrong"),
            "skipped_count": sum(1 for row in rows if row["outcome"] == "skipped"),
            "marked_count": sum(1 for row in rows if row["is_marked_for_review"]),
            "total_time_seconds": total_time_seconds,
            "average_time_seconds": round(total_time_seconds / len(rows)) if rows else 0,
        }
        payload = {
            "selected_attempt": selected_attempt,
            "summary": summary,
            "applied_filter": answer_filter,
            "results": rows,
        }
        serializer = TeacherAttemptQuestionAnalysisResponseSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
        unresolved_statuses = tuple(REVIEW_TASK_UNRESOLVED_STATUSES)
        queryset = ExamPerformanceSummary.objects.select_related("institute", "exam").annotate(
            total_results_count=Count("exam__results", distinct=True),
            published_results_count=Count(
                "exam__results",
                filter=Q(exam__results__is_published=True),
                distinct=True,
            ),
            pending_review_tasks_count=Count(
                "exam__answer_review_tasks",
                filter=Q(exam__answer_review_tasks__status__in=unresolved_statuses),
                distinct=True,
            ),
            recheck_review_tasks_count=Count(
                "exam__answer_review_tasks",
                filter=Q(exam__answer_review_tasks__status="recheck_requested"),
                distinct=True,
            ),
            oldest_pending_review_opened_at=Min(
                "exam__answer_review_tasks__opened_at",
                filter=Q(exam__answer_review_tasks__status__in=unresolved_statuses),
            ),
        )
        return scope_teacher_queryset(queryset, self.request.user)
