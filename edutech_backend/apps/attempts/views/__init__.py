import logging

from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.accounts.models import AccountRole
from apps.accounts.scopes import (
    get_account_profile,
    get_scoped_object_or_403,
    scope_attempt_workspace_queryset,
    scope_exam_queryset,
    scope_student_profile_queryset,
    scope_student_queryset,
)
from apps.attempts.models import StudentAnswer, StudentExamAttempt
from apps.attempts.serializers import (
    AttemptDetailSerializer,
    AttemptIntegrityEventSerializer,
    AttemptReviewSerializer,
    AttemptSwitchSectionSerializer,
    AttemptStartSerializer,
    AttemptSubmitSerializer,
    ReportIntegrityEventSerializer,
    AttemptSummarySerializer,
    SaveAnswerSerializer,
    StudentAnswerSerializer,
    StudentExamAttemptSerializer,
)
from apps.exams.models import ExamSection
from apps.exams.services import is_review_available_for_attempt
from apps.attempts.services import (
    log_integrity_event,
    refresh_attempt_runtime_state,
    save_answer,
    start_attempt,
    submit_attempt,
    switch_section,
)
from apps.reports.services import create_audit_log
from common.throttles import AttemptLifecycleRateThrottle, AttemptSaveAnswerRateThrottle
from common.responses import action_response


exam_logger = logging.getLogger("nexora.exam")


def _validation_error_data(exc):
    if getattr(exc, "message_dict", None):
        return exc.message_dict
    if getattr(exc, "messages", None):
        return {"detail": exc.messages}
    return {"detail": ["Validation error."]}


class StudentExamAttemptViewSet(ReadOnlyModelViewSet):
    serializer_class = StudentExamAttemptSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["institute", "exam", "student", "status", "is_active"]
    search_fields = ["exam__title", "exam__code", "student__full_name", "student__admission_no"]
    ordering_fields = ["started_at", "submitted_at", "final_score", "percentage"]
    ordering = ["-started_at"]

    def get_throttles(self):
        if self.action == "save_answer_action":
            return [AttemptSaveAnswerRateThrottle()]
        if self.action in {"start", "submit", "integrity_event_action"}:
            return [AttemptLifecycleRateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        queryset = (
            StudentExamAttempt.objects.select_related(
                "institute",
                "exam",
                "exam__subject",
                "exam__program",
                "exam__cohort",
                "student",
                "result",
            )
            .prefetch_related(
                "answers__question",
                "answers__selected_option",
                "exam__exam_questions__question",
                "exam__exam_questions__section",
                "exam__exam_questions__question__options",
                "exam__exam_questions__question__attachments",
            )
            .all()
        )
        return scope_attempt_workspace_queryset(queryset, self.request.user)

    @action(detail=False, methods=["post"], url_path="start")
    def start(self, request):
        serializer = AttemptStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = get_account_profile(request.user)

        if profile is None or not profile.is_active:
            return Response({"detail": "Authentication scope not found."}, status=status.HTTP_403_FORBIDDEN)

        if (
            profile.role == AccountRole.STUDENT
            and profile.student_profile_id != serializer.validated_data["student_obj"].id
        ):
            return Response(
                {"detail": "You can only start attempts for your own student profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if profile.role not in {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.STUDENT,
        }:
            return Response(
                {"detail": "You do not have permission to start attempts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            exam = get_scoped_object_or_403(
                scope_exam_queryset(
                    serializer.validated_data["exam_obj"].__class__.objects.select_related(
                        "institute",
                        "academic_year",
                        "program",
                        "cohort",
                    ),
                    request.user,
                ),
                user=request.user,
                value=serializer.validated_data["exam_obj"].pk,
                not_found_message="Exam not found in your scope.",
            )
            student = get_scoped_object_or_403(
                scope_student_profile_queryset(
                    serializer.validated_data["student_obj"].__class__.objects.select_related(
                        "institute",
                        "academic_year",
                        "program",
                        "cohort",
                    ),
                    request.user,
                ),
                user=request.user,
                value=serializer.validated_data["student_obj"].pk,
                not_found_message="Student not found in your scope.",
            )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            attempt = start_attempt(
                student=student,
                exam=exam,
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=attempt.institute,
            action="attempt_start",
            entity_type="attempt",
            entity_id=attempt.id,
            message="Student exam attempt started.",
            metadata={"exam_id": str(attempt.exam_id), "student_id": str(attempt.student_id)},
            request=request,
        )
        return action_response(
            data=StudentExamAttemptSerializer(attempt).data,
            message="Attempt started successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="save-answer")
    def save_answer_action(self, request, pk=None):
        attempt = self.get_object()
        serializer = SaveAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            answer = save_answer(
                attempt=attempt,
                question=serializer.validated_data["question_obj"],
                selected_option=serializer.validated_data["selected_option_obj"],
                selected_option_ids=[
                    str(option.id)
                    for option in serializer.validated_data.get("selected_option_objs", [])
                ],
                answer_text=serializer.validated_data.get("answer_text", ""),
                time_spent_seconds=serializer.validated_data.get("time_spent_seconds"),
                is_marked_for_review=serializer.validated_data.get("is_marked_for_review", False),
                clear_response=serializer.validated_data.get("clear_response", False),
                skip=serializer.validated_data.get("skip", False),
            )
        except DjangoValidationError as exc:
            exam_logger.warning(
                "Attempt save-answer failed",
                extra={"attempt_id": str(attempt.id), "user_id": request.user.id},
            )
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        return action_response(
            data=StudentAnswerSerializer(answer).data,
            message="Answer saved successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        attempt = self.get_object()
        serializer = AttemptSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            attempt = submit_attempt(
                attempt,
                auto_submitted=serializer.validated_data.get("auto_submitted", False),
            )
        except DjangoValidationError as exc:
            exam_logger.warning(
                "Attempt submit failed",
                extra={"attempt_id": str(attempt.id), "user_id": request.user.id},
            )
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=attempt.institute,
            action="attempt_submit",
            entity_type="attempt",
            entity_id=attempt.id,
            message="Student exam attempt submitted.",
            metadata={"exam_id": str(attempt.exam_id), "status": attempt.status},
            request=request,
        )
        return action_response(
            data=AttemptSummarySerializer(attempt).data,
            message="Attempt submitted successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="switch-section")
    def switch_section_action(self, request, pk=None):
        attempt = self.get_object()
        serializer = AttemptSwitchSectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            section = ExamSection.objects.get(pk=serializer.validated_data["section"])
        except ExamSection.DoesNotExist:
            return Response(
                {"section": ["Section not found."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            attempt = switch_section(attempt, section)
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        return action_response(
            data=AttemptDetailSerializer(attempt).data,
            message="Section switched successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="summary")
    def summary(self, request, pk=None):
        attempt = self.get_object()
        refresh_attempt_runtime_state(attempt)
        return Response(AttemptSummarySerializer(attempt).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="detail")
    def detail_action(self, request, pk=None):
        attempt = self.get_object()
        refresh_attempt_runtime_state(attempt)
        return Response(AttemptDetailSerializer(attempt).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="integrity-event")
    def integrity_event_action(self, request, pk=None):
        attempt = self.get_object()
        serializer = ReportIntegrityEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = log_integrity_event(
                attempt,
                event_type=serializer.validated_data["event_type"],
                metadata=serializer.validated_data.get("metadata", {}),
                event_at=serializer.validated_data.get("event_at"),
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        latest_attempt = StudentExamAttempt.objects.select_related("exam", "student").get(pk=attempt.pk)
        if result["auto_submitted"]:
            create_audit_log(
                user=request.user,
                institute=latest_attempt.institute,
                action="attempt_auto_submit_integrity",
                entity_type="attempt",
                entity_id=latest_attempt.id,
                message="Attempt auto-submitted after reaching the integrity warning threshold.",
                metadata={
                    "exam_id": str(latest_attempt.exam_id),
                    "student_id": str(latest_attempt.student_id),
                    "event_type": serializer.validated_data["event_type"],
                    "violation_count": result["summary"]["violation_count"],
                },
                request=request,
            )
        else:
            create_audit_log(
                user=request.user,
                institute=latest_attempt.institute,
                action="attempt_integrity_event",
                entity_type="attempt",
                entity_id=latest_attempt.id,
                message="Integrity event captured during attempt runtime.",
                metadata={
                    "exam_id": str(latest_attempt.exam_id),
                    "student_id": str(latest_attempt.student_id),
                    "event_type": serializer.validated_data["event_type"],
                    "severity": result["event"].severity,
                },
                request=request,
            )

        return action_response(
            data={
                "event": AttemptIntegrityEventSerializer(result["event"]).data,
                "integrity_summary": result["summary"],
                "attempt_status": latest_attempt.status,
                "auto_submitted": result["auto_submitted"],
                "duplicate": result["duplicate"],
            },
            message="Integrity event recorded successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="review")
    def review(self, request, pk=None):
        attempt = self.get_object()
        exam = attempt.exam
        result = getattr(attempt, "result", None)
        review_allowed = is_review_available_for_attempt(
            exam,
            attempt,
            result=result,
        )
        if not review_allowed:
            return Response(
                {"detail": "Review is not available for this attempt yet."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(AttemptReviewSerializer(attempt).data, status=status.HTTP_200_OK)


class StudentAnswerViewSet(ReadOnlyModelViewSet):
    serializer_class = StudentAnswerSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["attempt", "question", "is_active"]
    search_fields = ["attempt__exam__title", "attempt__student__full_name", "question__question_text"]
    ordering_fields = ["answered_at", "created_at", "time_spent_seconds"]
    ordering = ["-answered_at", "-created_at"]

    def get_queryset(self):
        queryset = StudentAnswer.objects.select_related(
            "attempt",
            "attempt__exam",
            "attempt__student",
            "question",
            "selected_option",
        ).all()
        return queryset.filter(
            attempt__in=scope_attempt_workspace_queryset(StudentExamAttempt.objects.all(), self.request.user)
        )
