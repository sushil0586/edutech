from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import CanBuildExams
from apps.accounts.models import AccountRole
from apps.accounts.scopes import (
    get_account_profile,
    get_scoped_object_or_403,
    scope_exam_queryset,
    scope_student_profile_queryset,
    scope_teacher_queryset,
)
from apps.institutes.models import Institute
from apps.exams.models import (
    AdvancedExamTemplate,
    Exam,
    ExamPresetPack,
    ExamPresetPackScope,
    ExamPublishLog,
    ExamQuestion,
    ExamSection,
    ExamStudentAssignment,
)
from apps.exams.serializers import (
    AdvancedExamBuilderSerializer,
    ExamPresetPackSerializer,
    AdvancedExamTemplateSerializer,
    ExamActionSerializer,
    ExamEconomyPolicyUpdateSerializer,
    ExamListSerializer,
    ExamPublishLogSerializer,
    ExamQuestionSerializer,
    ExamReadSerializer,
    ExamSectionSerializer,
    ExamStudentAssignmentUpdateSerializer,
    ExamSyncMarksResponseSerializer,
    TeacherExamPreviewSerializer,
    ExamWriteSerializer,
)
from apps.exams.services import (
    EXAM_CONTENT_TYPE,
    create_advanced_exam_from_blueprint,
    cancel_exam,
    build_exam_publish_readiness,
    default_exam_source_for_profile,
    regenerate_exam_access_key,
    mark_exam_completed,
    mark_exam_live,
    publish_exam,
    preview_advanced_exam_blueprint,
    refresh_exam_status,
    sync_exam_access_policy,
    sync_total_marks_from_questions,
)
from apps.economy.services import institute_has_question_bank_feature
from apps.teachers.models import TeacherProfile
from apps.students.models import StudentProfile
from apps.reports.services import create_audit_log
from common.responses import action_response
from common.viewsets import SoftDeleteModelViewSetMixin


class ExamViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    ADVANCED_BUILDER_FEATURE_CODE = "ADVANCED_EXAM_BUILDER"
    permission_classes = [IsAuthenticated, CanBuildExams]
    filterset_fields = [
        "institute",
        "academic_year",
        "program",
        "cohort",
        "subject",
        "exam_type",
        "delivery_mode",
        "status",
        "is_active",
    ]
    search_fields = ["title", "code", "description"]
    ordering_fields = ["start_at", "end_at", "created_at", "title"]
    ordering = ["-start_at", "-created_at"]

    def get_queryset(self):
        queryset = Exam.objects.select_related(
            "institute",
            "academic_year",
            "program",
            "cohort",
            "subject",
            "source_teacher",
        )
        if self.action == "list":
            queryset = queryset.annotate(
                assigned_student_count=models.Count(
                    "student_assignments",
                    filter=models.Q(student_assignments__is_active=True),
                    distinct=True,
                ),
                active_questions_count=models.Count(
                    "exam_questions",
                    filter=models.Q(exam_questions__is_active=True),
                    distinct=True,
                ),
            )
        else:
            queryset = queryset.prefetch_related(
                "sections",
                "student_assignments__student__cohort",
                "exam_questions__question",
                "exam_questions__question__passage",
                "exam_questions__section",
                "publish_logs__changed_by",
            )
        return scope_exam_queryset(queryset, self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return ExamListSerializer
        if self.action == "retrieve":
            return ExamReadSerializer
        if self.action == "sync_marks":
            return ExamSyncMarksResponseSerializer
        return ExamWriteSerializer

    def _hydrate_economy_policies(self, exams):
        if not exams:
            return

        from apps.economy.models import ContentAccessPolicy

        institute_ids = {exam.institute_id for exam in exams if exam.institute_id}
        content_keys = {str(exam.id) for exam in exams}
        if not institute_ids or not content_keys:
            return

        policies = list(
            ContentAccessPolicy.objects.filter(
                institute_id__in=institute_ids,
                content_type=EXAM_CONTENT_TYPE,
                content_key__in=content_keys,
                is_active=True,
            )
            .select_related("subject")
            .order_by("priority", "created_at")
        )

        policy_by_target = {}
        for policy in policies:
            target_key = (policy.institute_id, policy.content_key)
            current = policy_by_target.get(target_key)
            if current is None:
                policy_by_target[target_key] = {"subjects": {}, "fallback": None}
                current = policy_by_target[target_key]
            if policy.subject_id is not None:
                current["subjects"].setdefault(policy.subject_id, policy)
            elif policy.subject_id is None and current["fallback"] is None:
                current["fallback"] = policy

        for exam in exams:
            resolved = policy_by_target.get((exam.institute_id, str(exam.id)))
            if resolved is None:
                exam._resolved_access_policy = None
                continue
            subject_policy = resolved["subjects"].get(exam.subject_id)
            fallback_policy = resolved["fallback"]
            exam._resolved_access_policy = subject_policy if subject_policy is not None else fallback_policy

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            self._hydrate_economy_policies(page)
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        self._hydrate_economy_policies(queryset)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def _resolve_changed_by(self, serializer):
        changed_by = serializer.validated_data.get("changed_by")
        if changed_by is None:
            return None

        return get_scoped_object_or_403(
            scope_teacher_queryset(TeacherProfile.objects.select_related("institute"), self.request.user),
            user=self.request.user,
            value=changed_by.pk,
            not_found_message="Teacher not found in your scope.",
        )

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        try:
            return super().partial_update(request, *args, **kwargs)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

    def _enforce_advanced_builder_feature_access(self, profile):
        if profile is None or profile.role == AccountRole.PLATFORM_ADMIN:
            return
        if profile.role not in {AccountRole.INSTITUTE_ADMIN, AccountRole.TEACHER}:
            return
        institute = getattr(profile, "institute", None)
        if institute is None:
            raise PermissionDenied("Advanced exam builder requires an institute-scoped account.")
        if institute_has_question_bank_feature(institute, self.ADVANCED_BUILDER_FEATURE_CODE):
            return
        raise PermissionDenied(
            "Advanced exam builder is not enabled for your institute subscription."
        )

    @action(detail=False, methods=["post"], url_path="advanced-builder/preview")
    def advanced_builder_preview(self, request):
        serializer = AdvancedExamBuilderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        blueprint = serializer.validated_data
        profile = get_account_profile(request.user)
        self._enforce_advanced_builder_feature_access(profile)
        if blueprint["exam"].get("source_type") in {None, ""}:
            blueprint["exam"]["source_type"] = default_exam_source_for_profile(profile)

        try:
            preview = preview_advanced_exam_blueprint(actor=request.user, blueprint=blueprint)
        except DjangoValidationError as exc:
            detail = exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "valid": True,
            "blockers": preview["blockers"],
            "warnings": preview["warnings"],
            "resolved_exam": {
                "title": preview["resolved_exam"]["title"],
                "code": preview["resolved_exam"]["code"],
                "source_type": preview["resolved_exam"]["source_type"],
                "source_teacher_id": preview["resolved_exam"]["source_teacher_id"],
                "primary_subject": preview["resolved_exam"]["primary_subject"],
                "primary_subject_name": preview["resolved_exam"]["primary_subject_name"],
                "assessment_family_profile": preview["resolved_exam"]["assessment_family_profile"],
                "start_at": preview["resolved_exam"]["start_at"],
                "end_at": preview["resolved_exam"]["end_at"],
                "academic_year_end_at": preview["resolved_exam"]["academic_year_end_at"],
                "duration_minutes": preview["resolved_exam"]["duration_minutes"],
                "total_questions": preview["resolved_exam"]["total_questions"],
                "total_marks": preview["resolved_exam"]["total_marks"],
                "question_quality": preview["resolved_exam"]["question_quality"],
                "reporting_contract": preview["resolved_exam"]["reporting_contract"],
                "experience_profile": preview["resolved_exam"]["experience_profile"],
            },
            "sections": [
                {
                    "name": section["name"],
                    "order": section["order"],
                    "subject": section["subject"],
                    "subject_code": section["subject_code"],
                    "subject_name": section["subject_name"],
                    "requested": section["requested"],
                    "resolved": section["resolved"],
                    "difficulty_mix": section["difficulty_mix"],
                    "actual_difficulty_breakup": section["actual_difficulty_breakup"],
                    "quality_summary": section["quality_summary"],
                    "topic_breakup": section["topic_breakup"],
                    "family_contract": section["family_contract"],
                    "blockers": section["blockers"],
                    "warnings": section["warnings"],
                }
                for section in preview["sections"]
            ],
        }
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="advanced-builder/create")
    def advanced_builder_create(self, request):
        serializer = AdvancedExamBuilderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        blueprint = serializer.validated_data
        profile = get_account_profile(request.user)
        self._enforce_advanced_builder_feature_access(profile)
        if blueprint["exam"].get("source_type") in {None, ""}:
            blueprint["exam"]["source_type"] = default_exam_source_for_profile(profile)

        try:
            result = create_advanced_exam_from_blueprint(actor=request.user, blueprint=blueprint)
        except DjangoValidationError as exc:
            detail = exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        exam = result["exam"]
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="advanced_exam_builder_create",
            entity_type="exam",
            entity_id=exam.id,
            message="Advanced exam created from blueprint.",
            metadata={
                "source_type": exam.source_type,
                "question_count": exam.exam_questions.filter(is_active=True).count(),
                "section_count": exam.sections.filter(is_active=True).count(),
            },
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam, context={"request": request}).data,
            message="Advanced exam created successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="sync-marks")
    def sync_marks(self, request, pk=None):
        exam = self.get_object()
        exam = sync_total_marks_from_questions(exam)
        serializer = ExamSyncMarksResponseSerializer(exam)
        return action_response(
            data=serializer.data,
            message="Exam marks synchronized successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        exam = self.get_object()
        serializer = ExamActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            changed_by = self._resolve_changed_by(serializer)
        except PermissionDenied as exc:
            return Response({"changed_by": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        try:
            publish_exam(
                exam,
                changed_by=changed_by,
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_publish",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam published/scheduled.",
            metadata={"status": exam.status},
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam).data,
            message="Exam published successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="publish-readiness")
    def publish_readiness(self, request, pk=None):
        exam = self.get_object()
        return action_response(
            data=build_exam_publish_readiness(exam),
            message="Exam publish readiness evaluated successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="refresh-status")
    def refresh_status(self, request, pk=None):
        exam = self.get_object()
        serializer = ExamActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            changed_by = self._resolve_changed_by(serializer)
        except PermissionDenied as exc:
            return Response({"changed_by": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        try:
            exam = refresh_exam_status(
                exam,
                changed_by=changed_by,
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_refresh_status",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam status refreshed.",
            metadata={"status": exam.status},
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam).data,
            message="Exam status refreshed successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="mark-live")
    def mark_live(self, request, pk=None):
        exam = self.get_object()
        serializer = ExamActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            changed_by = self._resolve_changed_by(serializer)
        except PermissionDenied as exc:
            return Response({"changed_by": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        try:
            exam = mark_exam_live(
                exam,
                changed_by=changed_by,
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_mark_live",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam marked live.",
            metadata={"status": exam.status},
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam).data,
            message="Exam marked live successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="mark-completed")
    def mark_completed(self, request, pk=None):
        exam = self.get_object()
        serializer = ExamActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            changed_by = self._resolve_changed_by(serializer)
        except PermissionDenied as exc:
            return Response({"changed_by": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        try:
            exam = mark_exam_completed(
                exam,
                changed_by=changed_by,
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_mark_completed",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam marked completed.",
            metadata={"status": exam.status},
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam).data,
            message="Exam marked completed successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        exam = self.get_object()
        serializer = ExamActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            changed_by = self._resolve_changed_by(serializer)
        except PermissionDenied as exc:
            return Response({"changed_by": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        try:
            cancel_exam(
                exam,
                changed_by=changed_by,
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_cancel",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam cancelled.",
            metadata={"status": exam.status},
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam).data,
            message="Exam cancelled successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="regenerate-access-key")
    def regenerate_access_key(self, request, pk=None):
        exam = self.get_object()
        exam = regenerate_exam_access_key(exam)
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_regenerate_access_key",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam access key regenerated.",
            metadata={"access_key_enabled": exam.access_key_enabled},
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam).data,
            message="Exam access key regenerated successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="toggle-access-key")
    def toggle_access_key(self, request, pk=None):
        exam = self.get_object()
        exam.access_key_enabled = not exam.access_key_enabled
        exam.save(update_fields=["access_key_enabled", "updated_at"])
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_toggle_access_key",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam access key availability updated.",
            metadata={"access_key_enabled": exam.access_key_enabled},
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam).data,
            message=(
                "Exam access key enabled successfully."
                if exam.access_key_enabled
                else "Exam access key disabled successfully."
            ),
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="economy-access-policy")
    def economy_access_policy(self, request, pk=None):
        exam = self.get_object()
        serializer = ExamEconomyPolicyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        policy = sync_exam_access_policy(
            exam,
            policy_type=serializer.validated_data.get("policy_type", ""),
            star_cost=serializer.validated_data.get("star_cost", 0),
            entitlement_code=serializer.validated_data.get("entitlement_code", ""),
            priority=serializer.validated_data.get("priority", 100),
        )

        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_update_economy_access_policy",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam economy access policy updated.",
            metadata={
                "policy_type": getattr(policy, "policy_type", ""),
                "star_cost": int(getattr(policy, "star_cost", 0) or 0),
                "priority": getattr(policy, "priority", None),
            },
            request=request,
        )
        exam.refresh_from_db()
        return action_response(
            data=ExamReadSerializer(exam).data,
            message=(
                "Exam access policy cleared successfully."
                if policy is None
                else "Exam access policy updated successfully."
            ),
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="preview")
    def preview(self, request, pk=None):
        exam = self.get_object()
        return Response(
            TeacherExamPreviewSerializer(exam, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="assign-students")
    def assign_students(self, request, pk=None):
        exam = self.get_object()
        serializer = ExamStudentAssignmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student_ids = serializer.validated_data.get("student_ids", [])
        students = list(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related(
                    "cohort",
                    "program",
                    "academic_year",
                ),
                request.user,
            ).filter(pk__in=student_ids, is_active=True)
        )
        if len(students) != len(set(student_ids)):
            return Response(
                {"student_ids": ["One or more students were not found in your scope."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment_mode = serializer.validated_data["assignment_mode"]
        exam.assignment_mode = assignment_mode
        exam.save(update_fields=["assignment_mode", "updated_at"])

        keep_student_ids = [student.id for student in students]
        ExamStudentAssignment.objects.filter(exam=exam).exclude(
            student_id__in=keep_student_ids
        ).delete()

        if assignment_mode == "selected_students":
            profile = get_account_profile(request.user)
            teacher_profile = getattr(profile, "teacher_profile", None)
            existing_student_ids = set(
                ExamStudentAssignment.objects.filter(exam=exam).values_list(
                    "student_id",
                    flat=True,
                )
            )
            for student in students:
                if student.id in existing_student_ids:
                    continue
                ExamStudentAssignment.objects.create(
                    exam=exam,
                    student=student,
                    assigned_by=teacher_profile,
                )
        else:
            ExamStudentAssignment.objects.filter(exam=exam).delete()

        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_assign_students",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam assignment audience updated.",
            metadata={
                "assignment_mode": assignment_mode,
                "student_count": len(students),
            },
            request=request,
        )
        exam.refresh_from_db()
        return action_response(
            data=ExamReadSerializer(exam).data,
            message="Exam assignments updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdvancedExamTemplateViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    TEMPLATE_LIBRARY_FEATURE_CODE = "EXAM_BLUEPRINT_EXPORT"
    permission_classes = [IsAuthenticated, CanBuildExams]
    serializer_class = AdvancedExamTemplateSerializer
    filterset_fields = ["institute", "audience_context", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["name", "-updated_at"]

    def _profile(self):
        return get_account_profile(self.request.user)

    def _assert_can_manage_template(self, *, profile, template):
        if profile is None or not profile.is_active:
            raise PermissionDenied("You do not have permission to manage this template.")
        if profile.role == AccountRole.PLATFORM_ADMIN:
            return
        if profile.institute_id != template.institute_id:
            raise PermissionDenied("You do not have permission to manage this template.")
        if profile.role == AccountRole.INSTITUTE_ADMIN:
            if template.audience_context != "institute":
                raise PermissionDenied("Institute admins can manage institute templates only.")
            return
        if profile.role == AccountRole.TEACHER:
            if (
                template.audience_context != "teacher"
                or profile.teacher_profile_id is None
                or profile.teacher_profile_id != template.created_by_teacher_id
            ):
                raise PermissionDenied("Teachers can manage only their own personal templates.")
            return
        raise PermissionDenied("You do not have permission to manage this template.")

    def _enforce_template_library_feature_access(self, profile):
        if profile is None or profile.role == AccountRole.PLATFORM_ADMIN:
            return
        if profile.role not in {AccountRole.INSTITUTE_ADMIN, AccountRole.TEACHER}:
            return
        institute = getattr(profile, "institute", None)
        if institute is None:
            raise PermissionDenied("Advanced exam templates require an institute-scoped account.")
        if institute_has_question_bank_feature(institute, self.TEMPLATE_LIBRARY_FEATURE_CODE):
            return
        raise PermissionDenied(
            "Advanced exam template library is not enabled for your institute subscription."
        )

    def get_queryset(self):
        self._enforce_template_library_feature_access(self._profile())
        queryset = AdvancedExamTemplate.objects.select_related(
            "institute",
            "created_by_teacher",
        ).all()
        profile = self._profile()
        if profile is None or not profile.is_active:
            return queryset.none()
        if profile.role == AccountRole.PLATFORM_ADMIN:
            return queryset
        if profile.role == AccountRole.INSTITUTE_ADMIN and profile.institute_id:
            return queryset.filter(
                institute_id=profile.institute_id,
                audience_context="institute",
            )
        if profile.role == AccountRole.TEACHER and profile.institute_id:
            return queryset.filter(institute_id=profile.institute_id).filter(
                models.Q(audience_context="institute")
                | models.Q(
                    audience_context="teacher",
                    created_by_teacher_id=profile.teacher_profile_id,
                )
            )
        return queryset.none()

    def perform_create(self, serializer):
        profile = self._profile()
        self._enforce_template_library_feature_access(profile)
        institute = None
        if profile is not None and profile.role == AccountRole.PLATFORM_ADMIN:
            requested_institute_id = str(self.request.data.get("institute_id", "")).strip()
            if requested_institute_id:
                institute = Institute.objects.filter(id=requested_institute_id, is_active=True).first()
        if institute is None and profile is not None and profile.institute_id:
            institute = profile.institute
        if institute is None:
            raise serializers.ValidationError(
                {"institute": "A valid institute scope is required to save templates."}
            )

        payload = serializer.validated_data
        audience_context = payload.get("audience_context", "institute")
        if profile.role == AccountRole.TEACHER and audience_context != "teacher":
            raise PermissionDenied("Teachers can save personal templates only.")
        if profile.role == AccountRole.INSTITUTE_ADMIN and audience_context != "institute":
            raise PermissionDenied("Institute admins can save institute templates only.")

        existing_template = AdvancedExamTemplate.objects.filter(
            institute=institute,
            name=payload["name"],
        ).first()

        if existing_template is not None:
            self._assert_can_manage_template(profile=profile, template=existing_template)
            existing_template.description = payload.get("description", "")
            existing_template.blueprint = payload["blueprint"]
            existing_template.is_active = payload.get("is_active", True)
            existing_template.save()
            template = existing_template
        else:
            template = AdvancedExamTemplate.objects.create(
                institute=institute,
                name=payload["name"],
                description=payload.get("description", ""),
                audience_context=audience_context,
                blueprint=payload["blueprint"],
                is_active=payload.get("is_active", True),
                created_by_teacher=getattr(profile, "teacher_profile", None)
                if audience_context == "teacher"
                else None,
            )
        serializer.instance = template
        create_audit_log(
            user=self.request.user,
            institute=template.institute,
            action="advanced_exam_template_save",
            entity_type="advanced_exam_template",
            entity_id=template.id,
            message="Advanced exam template saved.",
            metadata={"template_name": template.name, "audience_context": template.audience_context},
            request=self.request,
        )

    def perform_update(self, serializer):
        template = self.get_object()
        self._assert_can_manage_template(profile=self._profile(), template=template)
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        template = self.get_object()
        self._assert_can_manage_template(profile=self._profile(), template=template)
        create_audit_log(
            user=request.user,
            institute=template.institute,
            action="advanced_exam_template_delete",
            entity_type="advanced_exam_template",
            entity_id=template.id,
            message="Advanced exam template deleted.",
            metadata={"template_name": template.name, "audience_context": template.audience_context},
            request=request,
        )
        return super().destroy(request, *args, **kwargs)


class ExamPresetPackViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated, CanBuildExams]
    serializer_class = ExamPresetPackSerializer
    filterset_fields = ["scope_type", "institute", "is_active"]
    search_fields = ["code", "label", "family", "note", "chip"]
    ordering_fields = ["scope_type", "family", "label", "created_at", "updated_at"]
    ordering = ["scope_type", "family", "label", "-updated_at"]

    def _profile(self):
        return get_account_profile(self.request.user)

    def _assert_can_manage_pack(self, *, profile, pack):
        if profile is None or not profile.is_active:
            raise PermissionDenied("You do not have permission to manage this preset pack.")
        if profile.role == AccountRole.PLATFORM_ADMIN:
            return
        if profile.role == AccountRole.INSTITUTE_ADMIN:
            if (
                pack.scope_type != ExamPresetPackScope.INSTITUTE
                or profile.institute_id != pack.institute_id
            ):
                raise PermissionDenied("Institute admins can manage only their own institute preset packs.")
            return
        raise PermissionDenied("You do not have permission to manage this preset pack.")

    def get_queryset(self):
        queryset = ExamPresetPack.objects.select_related("institute").all()
        profile = self._profile()
        if profile is None or not profile.is_active:
            return queryset.none()
        if profile.role == AccountRole.PLATFORM_ADMIN:
            return queryset
        if self.action in {"update", "partial_update", "destroy"}:
            if profile.role == AccountRole.INSTITUTE_ADMIN and profile.institute_id:
                return queryset.filter(
                    scope_type=ExamPresetPackScope.INSTITUTE,
                    institute_id=profile.institute_id,
                )
            return queryset.none()
        if profile.institute_id and profile.role in {AccountRole.INSTITUTE_ADMIN, AccountRole.TEACHER}:
            return queryset.filter(
                models.Q(scope_type=ExamPresetPackScope.PLATFORM)
                | models.Q(
                    scope_type=ExamPresetPackScope.INSTITUTE,
                    institute_id=profile.institute_id,
                )
            )
        return queryset.filter(scope_type=ExamPresetPackScope.PLATFORM)

    def create(self, request, *args, **kwargs):
        profile = self._profile()
        if profile is None or not profile.is_active:
            raise PermissionDenied("A valid account profile is required to save preset packs.")
        if profile.role not in {AccountRole.PLATFORM_ADMIN, AccountRole.INSTITUTE_ADMIN}:
            raise PermissionDenied("You do not have permission to save preset packs.")
        if (
            profile.role == AccountRole.INSTITUTE_ADMIN
            and request.data.get("scope_type", ExamPresetPackScope.INSTITUTE) != ExamPresetPackScope.INSTITUTE
        ):
            raise PermissionDenied("Institute admins can save institute preset packs only.")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        profile = self._profile()
        if profile is None or not profile.is_active:
            raise serializers.ValidationError(
                {"detail": "A valid account profile is required to save preset packs."}
            )
        payload = serializer.validated_data
        scope_type = payload.get("scope_type", ExamPresetPackScope.PLATFORM)

        if profile.role == AccountRole.INSTITUTE_ADMIN and scope_type != ExamPresetPackScope.INSTITUTE:
            raise PermissionDenied("Institute admins can save institute preset packs only.")
        if profile.role not in {AccountRole.PLATFORM_ADMIN, AccountRole.INSTITUTE_ADMIN}:
            raise PermissionDenied("You do not have permission to save preset packs.")

        if scope_type == ExamPresetPackScope.PLATFORM:
            pack = ExamPresetPack.objects.create(
                institute=None,
                scope_type=scope_type,
                code=payload["code"],
                label=payload["label"],
                family=payload["family"],
                note=payload.get("note", ""),
                chip=payload.get("chip", ""),
                config=payload.get("config", {}),
                is_active=payload.get("is_active", True),
            )
        else:
            institute = getattr(profile, "institute", None)
            if institute is None:
                raise serializers.ValidationError(
                    {"institute": "A valid institute scope is required to save institute preset packs."}
                )
            pack = ExamPresetPack.objects.create(
                institute=institute,
                scope_type=scope_type,
                code=payload["code"],
                label=payload["label"],
                family=payload["family"],
                note=payload.get("note", ""),
                chip=payload.get("chip", ""),
                config=payload.get("config", {}),
                is_active=payload.get("is_active", True),
            )
        serializer.instance = pack
        create_audit_log(
            user=self.request.user,
            institute=pack.institute,
            action="exam_preset_pack_save",
            entity_type="exam_preset_pack",
            entity_id=pack.id,
            message="Exam preset pack saved.",
            metadata={"code": pack.code, "scope_type": pack.scope_type},
            request=self.request,
        )

    def perform_update(self, serializer):
        pack = self.get_object()
        self._assert_can_manage_pack(profile=self._profile(), pack=pack)
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        pack = self.get_object()
        self._assert_can_manage_pack(profile=self._profile(), pack=pack)
        create_audit_log(
            user=request.user,
            institute=pack.institute,
            action="exam_preset_pack_delete",
            entity_type="exam_preset_pack",
            entity_id=pack.id,
            message="Exam preset pack deleted.",
            metadata={"code": pack.code, "scope_type": pack.scope_type},
            request=request,
        )
        return super().destroy(request, *args, **kwargs)



class ExamSectionViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = ExamSectionSerializer
    permission_classes = [IsAuthenticated, CanBuildExams]
    filterset_fields = ["exam", "is_active"]
    search_fields = ["name", "description", "instructions", "exam__title", "exam__code"]
    ordering_fields = ["section_order", "created_at", "name"]
    ordering = ["section_order", "name"]

    def get_queryset(self):
        queryset = ExamSection.objects.select_related("exam", "exam__program", "exam__subject").all()
        return queryset.filter(exam__in=scope_exam_queryset(Exam.objects.all(), self.request.user))

    def perform_destroy(self, instance):
        instance.exam_questions.update(section=None, section_name="", updated_at=timezone.now())
        super().perform_destroy(instance)


class ExamQuestionViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = ExamQuestionSerializer
    permission_classes = [IsAuthenticated, CanBuildExams]
    filterset_fields = ["exam", "question", "is_mandatory", "is_active"]
    search_fields = ["section_name", "question__question_text", "exam__title", "exam__code"]
    ordering_fields = ["question_order", "marks", "created_at"]
    ordering = ["question_order"]

    def get_queryset(self):
        queryset = ExamQuestion.objects.select_related(
            "exam",
            "section",
            "question",
            "question__subject",
            "question__topic",
        ).all()
        return queryset.filter(exam__in=scope_exam_queryset(Exam.objects.all(), self.request.user))


class ExamPublishLogViewSet(ModelViewSet):
    serializer_class = ExamPublishLogSerializer
    permission_classes = [IsAuthenticated, CanBuildExams]
    http_method_names = ["get", "head", "options"]
    filterset_fields = ["exam", "old_status", "new_status", "changed_by"]
    search_fields = ["exam__title", "exam__code", "remarks", "changed_by__full_name"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = ExamPublishLog.objects.select_related("exam", "changed_by").all()
        return queryset.filter(exam__in=scope_exam_queryset(Exam.objects.all(), self.request.user))
