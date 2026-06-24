import logging
import hashlib
import os

from django.core.files.storage import default_storage
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
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
    scope_teacher_queryset,
)
from apps.attempts.models import StudentAnswer, StudentAnswerReviewTask, StudentExamAttempt
from apps.attempts.media import (
    build_response_artifact_storage_path,
    validate_response_artifact_file,
)
from apps.attempts.serializers import (
    AssignReviewTaskSerializer,
    AttemptDetailSerializer,
    AttemptIntegrityEventSerializer,
    AttemptReviewSerializer,
    AttemptSwitchSectionSerializer,
    AttemptStartSerializer,
    AttemptSubmitSerializer,
    ReportIntegrityEventSerializer,
    ReviewTaskStatusNoteSerializer,
    AttemptSummarySerializer,
    SaveAnswerSerializer,
    StudentAnswerSerializer,
    BulkAssignReviewTaskSerializer,
    BulkModerateReviewTaskSerializer,
    BulkReviewTaskStatusNoteSerializer,
    StudentAnswerReviewTaskDetailSerializer,
    StudentAnswerReviewTaskSerializer,
    StudentExamAttemptSerializer,
    ManualReviewAnswerSerializer,
    UploadStudentResponseArtifactSerializer,
)
from apps.exams.models import ExamSection
from apps.exams.services import is_review_available_for_attempt
from apps.attempts.services import (
    assign_review_task,
    claim_review_task_for_teacher,
    log_integrity_event,
    moderate_review_task,
    refresh_attempt_runtime_state,
    request_review_recheck,
    review_manual_answer,
    review_queue_summary,
    save_answer,
    start_attempt,
    submit_attempt,
    switch_section,
)
from apps.question_bank.registry import (
    get_question_type_definition,
    question_type_allowed_response_artifact_types,
    question_type_supports_response_artifacts,
)
from apps.teachers.models import TeacherProfile
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
                "exam__exam_questions__question__passage",
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
                answer_transcript=serializer.validated_data.get("answer_transcript"),
                response_artifacts=serializer.validated_data.get("response_artifacts"),
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

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-response-artifact",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_response_artifact_action(self, request, pk=None):
        attempt = self.get_object()
        refresh_attempt_runtime_state(attempt)
        if attempt.status != "in_progress":
            return Response(
                {"detail": "Response artifacts can only be uploaded while the attempt is in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = UploadStudentResponseArtifactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question_id = serializer.validated_data["question"]
        asset_kind = serializer.validated_data["asset_kind"]
        uploaded_file = serializer.validated_data["file"]

        try:
            question = attempt.exam.exam_questions.select_related("question").get(
                question_id=question_id,
                is_active=True,
            ).question
        except attempt.exam.exam_questions.model.DoesNotExist:
            return Response(
                {"question": "Question is not part of this attempt."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        definition = get_question_type_definition(question.question_type)
        if definition is None or not question_type_supports_response_artifacts(question.question_type):
            return Response(
                {
                    "question": (
                        "Response artifact uploads are not enabled for this question type."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_asset_kinds = question_type_allowed_response_artifact_types(question.question_type)
        if asset_kind not in allowed_asset_kinds:
            return Response(
                {
                    "asset_kind": (
                        "This response artifact type is not allowed for the selected question."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_response_artifact_file(uploaded_file=uploaded_file, asset_kind=asset_kind)
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if getattr(exc, "message_dict", None) else {"file": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        checksum = hashlib.sha256(uploaded_file.read()).hexdigest()
        uploaded_file.seek(0)
        storage_name = default_storage.save(
            build_response_artifact_storage_path(
                attempt_id=attempt.id,
                question_id=question.id,
                asset_kind=asset_kind,
                original_name=uploaded_file.name,
            ),
            uploaded_file,
        )
        public_url = request.build_absolute_uri(default_storage.url(storage_name))
        artifact_payload = {
            "asset_kind": asset_kind,
            "upload_token": os.path.splitext(os.path.basename(storage_name))[0],
            "file_name": str(uploaded_file.name or "").strip(),
            "mime_type": str(getattr(uploaded_file, "content_type", "") or "").strip(),
            "size_bytes": int(getattr(uploaded_file, "size", 0) or 0),
            "storage_status": "uploaded",
            "checksum": checksum,
            "storage_path": storage_name,
            "file_url": public_url,
        }

        return Response(artifact_payload, status=status.HTTP_201_CREATED)

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
            "reviewed_by_teacher",
        ).all()
        return queryset.filter(
            attempt__in=scope_attempt_workspace_queryset(StudentExamAttempt.objects.all(), self.request.user)
        )

    @action(detail=True, methods=["post"], url_path="manual-review")
    def manual_review(self, request, pk=None):
        answer = self.get_object()
        profile = get_account_profile(request.user)
        if profile is None or profile.role not in {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.TEACHER,
        }:
            return Response({"detail": "You do not have permission to review answers."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ManualReviewAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            answer = review_manual_answer(
                answer=answer,
                reviewed_by_teacher=getattr(profile, "teacher_profile", None),
                marks_awarded=serializer.validated_data["marks_awarded"],
                review_notes=serializer.validated_data.get("review_notes", ""),
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        create_audit_log(
            user=request.user,
            institute=answer.attempt.institute,
            action="manual_answer_review",
            entity_type="student_answer",
            entity_id=answer.id,
            message="Manual answer review completed.",
            metadata={
                "attempt_id": str(answer.attempt_id),
                "question_id": str(answer.question_id),
                "marks_awarded": str(answer.marks_awarded),
            },
            request=request,
        )
        return action_response(
            data=StudentAnswerSerializer(answer).data,
            message="Answer reviewed successfully.",
            status_code=status.HTTP_200_OK,
        )


class StudentAnswerReviewTaskViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "priority", "exam", "student", "question", "assigned_to_teacher", "is_active"]
    search_fields = ["student__full_name", "student__admission_no", "exam__title", "question__question_text"]
    ordering_fields = ["opened_at", "last_reviewed_at", "created_at"]
    ordering = ["status", "-opened_at", "-created_at"]

    def _ensure_review_permissions(self):
        profile = get_account_profile(self.request.user)
        if profile is None or profile.role not in {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.TEACHER,
        }:
            raise PermissionDenied("You do not have permission to access review tasks.")
        return profile

    def get_serializer_class(self):
        if self.action == "retrieve":
            return StudentAnswerReviewTaskDetailSerializer
        return StudentAnswerReviewTaskSerializer

    def get_queryset(self):
        self._ensure_review_permissions()
        queryset = StudentAnswerReviewTask.objects.select_related(
            "answer",
            "attempt",
            "exam",
            "student",
            "question",
            "assigned_to_teacher",
            "last_reviewed_by_teacher",
        ).prefetch_related("events__actor_user", "events__actor_teacher")
        scoped_attempts = scope_attempt_workspace_queryset(StudentExamAttempt.objects.all(), self.request.user)
        queryset = queryset.filter(attempt__in=scoped_attempts)
        assignment_scope = self.request.query_params.get("assignment_scope", "").strip().lower()
        if assignment_scope == "unassigned":
            queryset = queryset.filter(assigned_to_teacher__isnull=True)
        elif assignment_scope == "assigned":
            queryset = queryset.filter(assigned_to_teacher__isnull=False)
        return queryset

    def _require_institute_admin(self):
        profile = self._ensure_review_permissions()
        if profile.role not in {AccountRole.PLATFORM_ADMIN, AccountRole.INSTITUTE_ADMIN}:
            raise PermissionDenied("Only institute admins can assign review tasks.")
        return profile

    def _require_teacher_profile(self):
        profile = self._ensure_review_permissions()
        if profile.role != AccountRole.TEACHER or not getattr(profile, "teacher_profile", None):
            raise PermissionDenied("A teacher profile is required for this action.")
        return profile

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        return Response(review_queue_summary(queryset=queryset), status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="bulk-assign")
    def bulk_assign(self, request):
        self._require_institute_admin()
        serializer = BulkAssignReviewTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        teacher = None
        teacher_id = serializer.validated_data.get("assigned_to_teacher")
        if teacher_id:
            try:
                teacher = get_scoped_object_or_403(
                    scope_teacher_queryset(
                        TeacherProfile.objects.select_related("institute"),
                        request.user,
                    ),
                    user=request.user,
                    value=teacher_id,
                    not_found_message="Teacher not found in your scope.",
                )
            except PermissionDenied as exc:
                return Response({"assigned_to_teacher": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        scoped_tasks = self.get_queryset()
        tasks = list(
            scoped_tasks.filter(pk__in=serializer.validated_data["task_ids"]).select_related(
                "assigned_to_teacher",
                "institute",
            )
        )
        requested_task_ids = {str(task_id) for task_id in serializer.validated_data["task_ids"]}
        found_task_ids = {str(task.id) for task in tasks}
        missing_task_ids = sorted(requested_task_ids - found_task_ids)
        if missing_task_ids:
            return Response(
                {"task_ids": ["One or more selected review tasks are not available in your scope."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_tasks = []
        try:
            for task in tasks:
                updated_tasks.append(
                    assign_review_task(
                        task=task,
                        assigned_to_teacher=teacher,
                        assigned_by_user=request.user,
                    )
                )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        for task in updated_tasks:
            create_audit_log(
                user=request.user,
                institute=task.institute,
                action="review_task_bulk_assign",
                entity_type="student_answer_review_task",
                entity_id=task.id,
                message="Review task assignment updated via bulk action.",
                metadata={
                    "assigned_to_teacher_id": str(teacher.id) if teacher else None,
                    "status": task.status,
                    "bulk_assignment": True,
                },
                request=request,
            )

        refreshed_tasks = list(
            StudentAnswerReviewTask.objects.filter(pk__in=[task.pk for task in updated_tasks])
            .select_related(
                "answer",
                "attempt",
                "exam",
                "student",
                "question",
                "assigned_to_teacher",
                "last_reviewed_by_teacher",
            )
            .prefetch_related("events__actor_user", "events__actor_teacher")
            .order_by("status", "-opened_at", "-created_at")
        )
        return action_response(
            data=StudentAnswerReviewTaskSerializer(refreshed_tasks, many=True).data,
            message=(
                f"{len(refreshed_tasks)} review task(s) assigned successfully."
                if teacher
                else f"{len(refreshed_tasks)} review task(s) returned to the unassigned queue."
            ),
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk-request-recheck")
    def bulk_request_recheck(self, request):
        profile = self._require_institute_admin()
        serializer = BulkReviewTaskStatusNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        scoped_tasks = self.get_queryset()
        tasks = list(
            scoped_tasks.filter(pk__in=serializer.validated_data["task_ids"]).select_related(
                "assigned_to_teacher",
                "institute",
            )
        )
        requested_task_ids = {str(task_id) for task_id in serializer.validated_data["task_ids"]}
        found_task_ids = {str(task.id) for task in tasks}
        missing_task_ids = sorted(requested_task_ids - found_task_ids)
        if missing_task_ids:
            return Response(
                {"task_ids": ["One or more selected review tasks are not available in your scope."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_tasks = []
        try:
            for task in tasks:
                updated_tasks.append(
                    request_review_recheck(
                        task=task,
                        requested_by_user=request.user,
                        requested_by_teacher=getattr(profile, "teacher_profile", None),
                        review_notes=serializer.validated_data.get("review_notes", ""),
                    )
                )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        for task in updated_tasks:
            create_audit_log(
                user=request.user,
                institute=task.institute,
                action="review_task_bulk_recheck",
                entity_type="student_answer_review_task",
                entity_id=task.id,
                message="Review task returned for recheck via bulk action.",
                metadata={
                    "status": task.status,
                    "bulk_recheck": True,
                },
                request=request,
            )

        refreshed_tasks = list(
            StudentAnswerReviewTask.objects.filter(pk__in=[task.pk for task in updated_tasks])
            .select_related(
                "answer",
                "attempt",
                "exam",
                "student",
                "question",
                "assigned_to_teacher",
                "last_reviewed_by_teacher",
            )
            .prefetch_related("events__actor_user", "events__actor_teacher")
            .order_by("status", "-opened_at", "-created_at")
        )
        return action_response(
            data=StudentAnswerReviewTaskSerializer(refreshed_tasks, many=True).data,
            message=f"{len(refreshed_tasks)} review task(s) returned for recheck successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk-moderate")
    def bulk_moderate(self, request):
        profile = self._require_institute_admin()
        serializer = BulkModerateReviewTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        scoped_tasks = self.get_queryset()
        tasks = list(
            scoped_tasks.filter(pk__in=serializer.validated_data["task_ids"]).select_related(
                "assigned_to_teacher",
                "last_reviewed_by_teacher",
                "institute",
                "answer",
                "attempt",
                "exam",
                "student",
                "question",
            )
        )
        requested_task_ids = {str(task_id) for task_id in serializer.validated_data["task_ids"]}
        found_task_ids = {str(task.id) for task in tasks}
        missing_task_ids = sorted(requested_task_ids - found_task_ids)
        if missing_task_ids:
            return Response(
                {"task_ids": ["One or more selected review tasks are not available in your scope."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invalid_tasks = [
            str(task.id)
            for task in tasks
            if task.status not in {"reviewed", "moderated"}
        ]
        if invalid_tasks:
            return Response(
                {"task_ids": ["Bulk moderation only supports tasks that are already reviewed or moderated."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_tasks = []
        shared_note = serializer.validated_data.get("review_notes", "")
        try:
            for task in tasks:
                moderation_note = shared_note or task.latest_review_summary
                updated_tasks.append(
                    moderate_review_task(
                        task=task,
                        reviewed_by_teacher=getattr(profile, "teacher_profile", None) or task.last_reviewed_by_teacher,
                        marks_awarded=task.latest_marks_awarded,
                        review_notes=moderation_note,
                        actor_user=request.user,
                    )
                )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        for task in updated_tasks:
            create_audit_log(
                user=request.user,
                institute=task.institute,
                action="review_task_bulk_moderate",
                entity_type="student_answer_review_task",
                entity_id=task.id,
                message="Review task moderated via bulk action.",
                metadata={
                    "status": task.status,
                    "bulk_moderation": True,
                    "marks_awarded": str(task.latest_marks_awarded),
                },
                request=request,
            )

        refreshed_tasks = list(
            StudentAnswerReviewTask.objects.filter(pk__in=[task.pk for task in updated_tasks])
            .select_related(
                "answer",
                "attempt",
                "exam",
                "student",
                "question",
                "assigned_to_teacher",
                "last_reviewed_by_teacher",
            )
            .prefetch_related("events__actor_user", "events__actor_teacher")
            .order_by("status", "-opened_at", "-created_at")
        )
        return action_response(
            data=StudentAnswerReviewTaskSerializer(refreshed_tasks, many=True).data,
            message=f"{len(refreshed_tasks)} review task(s) moderated successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="submit-review")
    def submit_review(self, request, pk=None):
        task = self.get_object()
        profile = self._ensure_review_permissions()
        serializer = ManualReviewAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            answer = review_manual_answer(
                answer=task.answer,
                reviewed_by_teacher=getattr(profile, "teacher_profile", None),
                marks_awarded=serializer.validated_data["marks_awarded"],
                review_notes=serializer.validated_data.get("review_notes", ""),
                rubric_scores=serializer.validated_data.get("rubric_scores"),
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        refreshed_task = StudentAnswerReviewTask.objects.select_related(
            "answer",
            "attempt",
            "exam",
            "student",
            "question",
            "assigned_to_teacher",
            "last_reviewed_by_teacher",
        ).prefetch_related("events__actor_user", "events__actor_teacher").get(pk=task.pk)

        create_audit_log(
            user=request.user,
            institute=answer.attempt.institute,
            action="review_task_submit_review",
            entity_type="student_answer_review_task",
            entity_id=refreshed_task.id,
            message="Review task completed.",
            metadata={
                "attempt_id": str(answer.attempt_id),
                "question_id": str(answer.question_id),
                "answer_id": str(answer.id),
                "marks_awarded": str(answer.marks_awarded),
            },
            request=request,
        )
        return action_response(
            data=StudentAnswerReviewTaskDetailSerializer(refreshed_task).data,
            message="Review task updated successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        task = self.get_object()
        self._require_institute_admin()
        serializer = AssignReviewTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        teacher = None
        teacher_id = serializer.validated_data.get("assigned_to_teacher")
        if teacher_id:
            try:
                teacher = get_scoped_object_or_403(
                    scope_teacher_queryset(
                        TeacherProfile.objects.select_related("institute"),
                        request.user,
                    ),
                    user=request.user,
                    value=teacher_id,
                    not_found_message="Teacher not found in your scope.",
                )
            except PermissionDenied as exc:
                return Response({"assigned_to_teacher": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            task = assign_review_task(
                task=task,
                assigned_to_teacher=teacher,
                assigned_by_user=request.user,
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        refreshed_task = StudentAnswerReviewTask.objects.select_related(
            "answer",
            "attempt",
            "exam",
            "student",
            "question",
            "assigned_to_teacher",
            "last_reviewed_by_teacher",
        ).prefetch_related("events__actor_user", "events__actor_teacher").get(pk=task.pk)

        create_audit_log(
            user=request.user,
            institute=task.institute,
            action="review_task_assign",
            entity_type="student_answer_review_task",
            entity_id=task.id,
            message="Review task assignment updated.",
            metadata={
                "assigned_to_teacher_id": str(teacher.id) if teacher else None,
                "status": task.status,
            },
            request=request,
        )
        return action_response(
            data=StudentAnswerReviewTaskDetailSerializer(refreshed_task).data,
            message="Review task assignment updated successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="assign-to-me")
    def assign_to_me(self, request, pk=None):
        task = self.get_object()
        profile = self._require_teacher_profile()

        if task.assigned_to_teacher_id and task.assigned_to_teacher_id != profile.teacher_profile.id:
            return Response(
                {"detail": "This review task is already assigned to another teacher."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            task = assign_review_task(
                task=task,
                assigned_to_teacher=profile.teacher_profile,
                assigned_by_user=request.user,
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        refreshed_task = StudentAnswerReviewTask.objects.select_related(
            "answer",
            "attempt",
            "exam",
            "student",
            "question",
            "assigned_to_teacher",
            "last_reviewed_by_teacher",
        ).prefetch_related("events__actor_user", "events__actor_teacher").get(pk=task.pk)

        create_audit_log(
            user=request.user,
            institute=task.institute,
            action="review_task_self_assign",
            entity_type="student_answer_review_task",
            entity_id=task.id,
            message="Review task self-assigned by teacher.",
            metadata={"assigned_to_teacher_id": str(profile.teacher_profile.id)},
            request=request,
        )
        return action_response(
            data=StudentAnswerReviewTaskDetailSerializer(refreshed_task).data,
            message="Review task assigned to you successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="claim-next")
    def claim_next(self, request):
        profile = self._require_teacher_profile()
        teacher_id = profile.teacher_profile.id
        scoped_tasks = self.filter_queryset(self.get_queryset())

        next_task = (
            scoped_tasks.filter(
                assigned_to_teacher_id=teacher_id,
                status__in=["assigned", "in_review", "recheck_requested"],
            )
            .order_by("review_started_at", "opened_at", "created_at")
            .first()
        )
        if next_task is None:
            next_task = (
                scoped_tasks.filter(
                    assigned_to_teacher__isnull=True,
                    status__in=["pending", "recheck_requested"],
                )
                .order_by("opened_at", "created_at")
                .first()
            )

        if next_task is None:
            return Response(
                {"detail": "No review task is available to claim right now."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            next_task = claim_review_task_for_teacher(
                task=next_task,
                teacher_profile=profile.teacher_profile,
                actor_user=request.user,
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        refreshed_task = StudentAnswerReviewTask.objects.select_related(
            "answer",
            "attempt",
            "exam",
            "student",
            "question",
            "assigned_to_teacher",
            "last_reviewed_by_teacher",
        ).prefetch_related("events__actor_user", "events__actor_teacher").get(pk=next_task.pk)

        create_audit_log(
            user=request.user,
            institute=next_task.institute,
            action="review_task_claim_next",
            entity_type="student_answer_review_task",
            entity_id=next_task.id,
            message="Teacher claimed the next review task.",
            metadata={"assigned_to_teacher_id": str(profile.teacher_profile.id)},
            request=request,
        )
        return action_response(
            data=StudentAnswerReviewTaskDetailSerializer(refreshed_task).data,
            message="Next review task claimed successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="request-recheck")
    def request_recheck(self, request, pk=None):
        task = self.get_object()
        profile = self._ensure_review_permissions()
        serializer = ReviewTaskStatusNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            task = request_review_recheck(
                task=task,
                requested_by_user=request.user,
                requested_by_teacher=getattr(profile, "teacher_profile", None),
                review_notes=serializer.validated_data.get("review_notes", ""),
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        refreshed_task = StudentAnswerReviewTask.objects.select_related(
            "answer",
            "attempt",
            "exam",
            "student",
            "question",
            "assigned_to_teacher",
            "last_reviewed_by_teacher",
        ).prefetch_related("events__actor_user", "events__actor_teacher").get(pk=task.pk)

        create_audit_log(
            user=request.user,
            institute=task.institute,
            action="review_task_request_recheck",
            entity_type="student_answer_review_task",
            entity_id=task.id,
            message="Review task returned for recheck.",
            metadata={"status": task.status},
            request=request,
        )
        return action_response(
            data=StudentAnswerReviewTaskDetailSerializer(refreshed_task).data,
            message="Review task sent for recheck successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="moderate")
    def moderate(self, request, pk=None):
        task = self.get_object()
        profile = self._require_institute_admin()
        serializer = ManualReviewAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            task = moderate_review_task(
                task=task,
                reviewed_by_teacher=getattr(profile, "teacher_profile", None),
                marks_awarded=serializer.validated_data["marks_awarded"],
                review_notes=serializer.validated_data.get("review_notes", ""),
                actor_user=request.user,
                rubric_scores=serializer.validated_data.get("rubric_scores"),
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_data(exc), status=status.HTTP_400_BAD_REQUEST)

        refreshed_task = StudentAnswerReviewTask.objects.select_related(
            "answer",
            "attempt",
            "exam",
            "student",
            "question",
            "assigned_to_teacher",
            "last_reviewed_by_teacher",
        ).prefetch_related("events__actor_user", "events__actor_teacher").get(pk=task.pk)

        create_audit_log(
            user=request.user,
            institute=task.institute,
            action="review_task_moderate",
            entity_type="student_answer_review_task",
            entity_id=task.id,
            message="Review task moderated.",
            metadata={"status": task.status, "marks_awarded": str(task.latest_marks_awarded)},
            request=request,
        )
        return action_response(
            data=StudentAnswerReviewTaskDetailSerializer(refreshed_task).data,
            message="Review task moderated successfully.",
            status_code=status.HTTP_200_OK,
        )
