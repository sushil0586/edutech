from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, inline_serializer
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
    ExamAccessSlot,
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
    ExamAccessSlotSerializer,
    ExamAccessSlotWriteSerializer,
    ExamAssignedStudentSerializer,
    ExamEconomyPolicyUpdateSerializer,
    ExamListSerializer,
    ExamPublishLogSerializer,
    ExamQuestionSerializer,
    ExamReadSerializer,
    ExamSectionSerializer,
    ExamStudentAutoSlotAssignmentSerializer,
    ExamStudentBulkSlotAssignmentSerializer,
    ExamStudentSlotOverrideSerializer,
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
    create_exam_slot_audit_log,
    create_exam_slot_override_audit_log,
    default_exam_source_for_profile,
    hydrate_exam_access_policies,
    regenerate_exam_access_key,
    invalidate_exam_access_policy_cache,
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
from apps.reports.models import AuditLog
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
        "source_type",
        "is_active",
    ]
    search_fields = ["title", "code", "description"]
    ordering_fields = [
        "start_at",
        "end_at",
        "created_at",
        "title",
        "duration_minutes",
        "assigned_student_count",
        "active_questions_count",
    ]
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
            ).prefetch_related(
                models.Prefetch(
                    "sections",
                    queryset=ExamSection.objects.filter(is_active=True).select_related("subject"),
                )
            )
        else:
            queryset = queryset.prefetch_related(
                "sections",
                "student_assignments__student__cohort",
                "student_assignments__access_slot",
                "access_slots__cohort",
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
        hydrate_exam_access_policies(exams)

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

    @extend_schema(
        parameters=[
            OpenApiParameter(name="institute", type=str, required=False),
        ],
        responses=inline_serializer(
            name="PlatformExamCatalogSummary",
            fields={
                "total_count": serializers.IntegerField(),
                "source_counts": serializers.DictField(child=serializers.IntegerField()),
                "status_counts": serializers.DictField(child=serializers.IntegerField()),
            },
        ),
    )
    @action(detail=False, methods=["get"], url_path="platform-catalog-summary")
    def platform_catalog_summary(self, request, *args, **kwargs):
        profile = get_account_profile(request.user)
        if profile is None or profile.role != AccountRole.PLATFORM_ADMIN:
            raise PermissionDenied("Only platform admins can view platform exam catalog summary.")

        queryset = scope_exam_queryset(Exam.objects.all(), request.user)
        institute_id = str(request.query_params.get("institute") or "").strip()
        if institute_id:
            queryset = queryset.filter(institute_id=institute_id)

        source_counts = {
            row["source_type"]: row["count"]
            for row in queryset.values("source_type").annotate(count=models.Count("id"))
        }
        status_counts = {
            row["status"]: row["count"]
            for row in queryset.values("status").annotate(count=models.Count("id"))
        }

        return Response(
            {
                "total_count": queryset.count(),
                "source_counts": source_counts,
                "status_counts": status_counts,
            },
            status=status.HTTP_200_OK,
        )

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

    def _resolve_student_in_scope(self, student_id):
        return get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related(
                    "cohort",
                    "program",
                    "academic_year",
                ),
                self.request.user,
            ),
            user=self.request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )

    def _resolve_exam_slot_or_403(self, exam, slot_id):
        slot = exam.access_slots.select_related("cohort").filter(pk=slot_id).first()
        if slot is None:
            raise PermissionDenied("Exam access slot not found in your scope.")
        return slot

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
                "access_mode": preview["resolved_exam"]["access_mode"],
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

    @action(detail=True, methods=["get", "post"], url_path="slots")
    def slots(self, request, pk=None):
        exam = self.get_object()
        if request.method.lower() == "get":
            slots = exam.access_slots.select_related("cohort").order_by("slot_start_at", "created_at")
            serializer = ExamAccessSlotSerializer(slots, many=True)
            return action_response(
                data=serializer.data,
                message="Exam slots fetched successfully.",
                status_code=status.HTTP_200_OK,
            )

        serializer = ExamAccessSlotWriteSerializer(data=request.data, context={"exam": exam})
        serializer.is_valid(raise_exception=True)
        try:
            slot = serializer.save(exam=exam)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        create_exam_slot_audit_log(
            slot=slot,
            action="exam_slot_create",
            user=request.user,
            message="Exam access slot created.",
            metadata={
                "cohort_id": str(slot.cohort_id) if slot.cohort_id else None,
                "assignment_capacity": slot.assignment_capacity,
                "start_capacity": slot.start_capacity,
                "status": slot.status,
            },
            request=request,
        )
        return action_response(
            data=ExamAccessSlotSerializer(slot).data,
            message="Exam slot created successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    @extend_schema(
        parameters=[OpenApiParameter(name="slot_id", type=str, location=OpenApiParameter.PATH)],
        request=ExamAccessSlotWriteSerializer,
        responses={
            200: ExamAccessSlotSerializer,
            400: OpenApiResponse(description="Invalid slot update."),
        },
    )
    @action(detail=True, methods=["patch"], url_path=r"slots/(?P<slot_id>[^/.]+)")
    def update_slot(self, request, pk=None, slot_id=None):
        exam = self.get_object()
        slot = self._resolve_exam_slot_or_403(exam, slot_id)
        before = {
            "cohort_id": str(slot.cohort_id) if slot.cohort_id else None,
            "slot_label": slot.slot_label,
            "slot_start_at": slot.slot_start_at.isoformat() if slot.slot_start_at else None,
            "slot_end_at": slot.slot_end_at.isoformat() if slot.slot_end_at else None,
            "grace_period_minutes": slot.grace_period_minutes,
            "assignment_capacity": slot.assignment_capacity,
            "start_capacity": slot.start_capacity,
            "status": slot.status,
            "is_active": slot.is_active,
        }
        serializer = ExamAccessSlotWriteSerializer(
            slot,
            data=request.data,
            partial=True,
            context={"exam": exam},
        )
        serializer.is_valid(raise_exception=True)
        try:
            slot = serializer.save()
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        create_exam_slot_audit_log(
            slot=slot,
            action="exam_slot_update",
            user=request.user,
            message="Exam access slot updated.",
            metadata={
                "before": before,
                "after": {
                    "cohort_id": str(slot.cohort_id) if slot.cohort_id else None,
                    "slot_label": slot.slot_label,
                    "slot_start_at": slot.slot_start_at.isoformat() if slot.slot_start_at else None,
                    "slot_end_at": slot.slot_end_at.isoformat() if slot.slot_end_at else None,
                    "grace_period_minutes": slot.grace_period_minutes,
                    "assignment_capacity": slot.assignment_capacity,
                    "start_capacity": slot.start_capacity,
                    "status": slot.status,
                    "is_active": slot.is_active,
                },
            },
            request=request,
        )
        return action_response(
            data=ExamAccessSlotSerializer(slot).data,
            message="Exam slot updated successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="student-slot-override")
    def student_slot_override(self, request, pk=None):
        exam = self.get_object()
        if exam.assignment_mode != "selected_students":
            return Response(
                {"detail": "Student slot overrides are supported only for selected-student exams."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ExamStudentSlotOverrideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = self._resolve_student_in_scope(serializer.validated_data["student"])
        slot = None
        if "access_slot" in serializer.validated_data and serializer.validated_data["access_slot"] is not None:
            slot = self._resolve_exam_slot_or_403(exam, serializer.validated_data["access_slot"])

        profile = get_account_profile(request.user)
        teacher_profile = getattr(profile, "teacher_profile", None)
        try:
            assignment, created = ExamStudentAssignment.objects.get_or_create(
                exam=exam,
                student=student,
                defaults={
                    "assigned_by": teacher_profile,
                    "access_slot": slot,
                    "notes": serializer.validated_data.get("notes", ""),
                },
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        before = {
            "access_slot": str(assignment.access_slot_id) if assignment.access_slot_id else None,
            "notes": assignment.notes,
            "created": created,
        }

        if not created:
            if "access_slot" in serializer.validated_data:
                assignment.access_slot = slot
            if "notes" in serializer.validated_data:
                assignment.notes = serializer.validated_data.get("notes", "")
            if assignment.assigned_by_id is None and teacher_profile is not None:
                assignment.assigned_by = teacher_profile
            try:
                assignment.save()
            except DjangoValidationError as exc:
                return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        create_exam_slot_override_audit_log(
            exam=exam,
            student=student,
            slot=assignment.access_slot,
            action="exam_slot_override",
            user=request.user,
            message="Student slot override updated.",
            metadata={
                "before": before,
                "after": {
                    "access_slot": str(assignment.access_slot_id) if assignment.access_slot_id else None,
                    "notes": assignment.notes,
                    "created": created,
                },
            },
            request=request,
        )
        return action_response(
            data=ExamAssignedStudentSerializer(assignment).data,
            message="Student slot override updated successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="bulk-student-slot-assign")
    def bulk_student_slot_assign(self, request, pk=None):
        exam = self.get_object()
        if exam.assignment_mode != "selected_students":
            return Response(
                {"detail": "Bulk slot assignment is supported only for selected-student exams."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ExamStudentBulkSlotAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        slot = None
        if "access_slot" in serializer.validated_data and serializer.validated_data["access_slot"] is not None:
            slot = self._resolve_exam_slot_or_403(exam, serializer.validated_data["access_slot"])

        assignments = exam.student_assignments.select_related("student", "access_slot").filter(is_active=True)
        apply_to = serializer.validated_data["apply_to"]
        if apply_to == ExamStudentBulkSlotAssignmentSerializer.APPLY_TO_UNASSIGNED_SELECTED:
            assignments = assignments.filter(access_slot__isnull=True)
        elif apply_to == ExamStudentBulkSlotAssignmentSerializer.APPLY_TO_STUDENT_IDS:
            assignments = assignments.filter(student_id__in=serializer.validated_data.get("student_ids", []))

        assignments = list(assignments)
        if not assignments:
            return action_response(
                data={
                    "updated_count": 0,
                    "access_slot": str(slot.id) if slot else None,
                    "slot_label": slot.slot_label if slot else "",
                    "affected_student_ids": [],
                },
                message="No matching student assignments were found for this bulk slot update.",
                status_code=status.HTTP_200_OK,
            )

        notes = serializer.validated_data.get("notes", "")
        changed_assignments = [
            assignment for assignment in assignments if assignment.access_slot_id != getattr(slot, "id", None)
        ]
        if slot is not None and slot.assignment_capacity is not None:
            existing_count = exam.student_assignments.filter(access_slot=slot, is_active=True).exclude(
                pk__in=[assignment.pk for assignment in changed_assignments]
            ).count()
            if existing_count + len(changed_assignments) > slot.assignment_capacity:
                return Response(
                    {
                        "access_slot": [
                            "This slot does not have enough assignment capacity for the selected learners."
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        before = [
            {
                "student_id": str(assignment.student_id),
                "access_slot": str(assignment.access_slot_id) if assignment.access_slot_id else None,
                "notes": assignment.notes,
            }
            for assignment in assignments
        ]

        updated_assignments = []
        try:
            with transaction.atomic():
                for assignment in assignments:
                    assignment.access_slot = slot
                    if notes:
                        assignment.notes = notes
                    assignment.save()
                    updated_assignments.append(assignment)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_slot_bulk_assign",
            entity_type="exam_student_access_bulk_override",
            entity_id=exam.id,
            message="Bulk student slot assignment saved.",
            metadata={
                "exam_id": str(exam.id),
                "slot_id": str(slot.id) if slot else None,
                "slot_label": slot.slot_label if slot else "",
                "apply_to": apply_to,
                "updated_count": len(updated_assignments),
                "student_ids": [str(assignment.student_id) for assignment in updated_assignments],
                "before": before,
                "notes_applied": notes,
            },
            request=request,
        )
        return action_response(
            data={
                "updated_count": len(updated_assignments),
                "access_slot": str(slot.id) if slot else None,
                "slot_label": slot.slot_label if slot else "",
                "affected_student_ids": [str(assignment.student_id) for assignment in updated_assignments],
            },
            message="Bulk student slot assignment saved successfully.",
            status_code=status.HTTP_200_OK,
        )

    def _resolve_auto_slot_assignment_plan(self, *, exam, apply_to):
        active_slots = list(
            exam.access_slots.select_related("cohort")
            .filter(is_active=True, status="active")
            .order_by("slot_start_at", "created_at")
        )
        if not active_slots:
            return {
                "error": {"access_slots": ["Create at least one active slot before running automatic slot assignment."]}
            }

        assignments = exam.student_assignments.select_related("student", "access_slot").filter(is_active=True)
        if apply_to == ExamStudentAutoSlotAssignmentSerializer.APPLY_TO_UNASSIGNED_SELECTED:
            assignments = assignments.filter(access_slot__isnull=True)

        target_assignments = list(assignments)
        if not target_assignments:
            return {
                "active_slots": active_slots,
                "target_assignments": [],
                "planned_slot_ids_by_assignment": {},
                "slot_remaining": {},
                "unresolved_students": [],
            }

        target_assignment_ids = {assignment.id for assignment in target_assignments}
        slot_remaining = {}
        slot_existing_actual_count = {}
        slot_existing_excluding_target_count = {}
        for slot in active_slots:
            actual_count = exam.student_assignments.filter(access_slot=slot, is_active=True).count()
            existing_count = exam.student_assignments.filter(access_slot=slot, is_active=True).exclude(
                pk__in=target_assignment_ids
            ).count()
            slot_existing_actual_count[slot.id] = actual_count
            slot_existing_excluding_target_count[slot.id] = existing_count
            if slot.assignment_capacity is None:
                slot_remaining[slot.id] = None
            else:
                slot_remaining[slot.id] = max(slot.assignment_capacity - existing_count, 0)

        planned_slot_ids_by_assignment = {}
        unresolved_students = []
        for assignment in sorted(
            target_assignments,
            key=lambda item: (
                getattr(item.student, "cohort_id", None) is None,
                item.student.first_name.lower(),
                item.student.last_name.lower(),
                item.student.admission_no,
            ),
        ):
            cohort_matched_slots = [
                slot for slot in active_slots if slot.cohort_id and slot.cohort_id == assignment.student.cohort_id
            ]
            candidate_slots = cohort_matched_slots or [slot for slot in active_slots if slot.cohort_id is None]
            chosen_slot = None
            for slot in candidate_slots:
                remaining = slot_remaining[slot.id]
                if remaining is None or remaining > 0:
                    chosen_slot = slot
                    break
            if chosen_slot is None:
                unresolved_students.append(
                    f"{assignment.student.full_name} ({assignment.student.admission_no})"
                )
                continue
            planned_slot_ids_by_assignment[assignment.id] = chosen_slot.id
            if slot_remaining[chosen_slot.id] is not None:
                slot_remaining[chosen_slot.id] = max(slot_remaining[chosen_slot.id] - 1, 0)

        return {
            "active_slots": active_slots,
            "target_assignments": target_assignments,
            "planned_slot_ids_by_assignment": planned_slot_ids_by_assignment,
            "slot_remaining": slot_remaining,
            "slot_existing_actual_count": slot_existing_actual_count,
            "slot_existing_excluding_target_count": slot_existing_excluding_target_count,
            "unresolved_students": unresolved_students,
        }

    def _serialize_auto_slot_assignment_plan(self, *, plan, apply_to):
        active_slots = {slot.id: slot for slot in plan["active_slots"]}
        assignments_payload = []
        for assignment in plan["target_assignments"]:
            planned_slot_id = plan["planned_slot_ids_by_assignment"].get(assignment.id)
            planned_slot = active_slots.get(planned_slot_id)
            assignments_payload.append(
                {
                    "student_id": str(assignment.student_id),
                    "student_name": assignment.student.full_name,
                    "admission_no": assignment.student.admission_no,
                    "current_slot_id": str(assignment.access_slot_id) if assignment.access_slot_id else None,
                    "current_slot_label": assignment.access_slot.slot_label if assignment.access_slot_id else "",
                    "planned_slot_id": str(planned_slot.id) if planned_slot else None,
                    "planned_slot_label": planned_slot.slot_label if planned_slot else "",
                    "cohort_name": getattr(assignment.student.cohort, "name", "") or "",
                }
            )

        slot_summary = []
        for slot in plan["active_slots"]:
            remaining = plan["slot_remaining"].get(slot.id)
            actual_count = plan["slot_existing_actual_count"].get(slot.id, 0)
            excluding_target_count = plan["slot_existing_excluding_target_count"].get(slot.id, 0)
            planned_incoming_count = sum(
                1 for planned_slot_id in plan["planned_slot_ids_by_assignment"].values() if planned_slot_id == slot.id
            )
            slot_summary.append(
                {
                    "slot_id": str(slot.id),
                    "slot_label": slot.slot_label,
                    "cohort_name": getattr(slot.cohort, "name", "") or "",
                    "assignment_capacity": slot.assignment_capacity,
                    "current_assigned_count": actual_count,
                    "projected_assigned_count": excluding_target_count + planned_incoming_count,
                    "remaining_after_plan": remaining,
                }
            )

        return {
            "apply_to": apply_to,
            "updated_count": len(assignments_payload) - len(plan["unresolved_students"]),
            "targeted_count": len(plan["target_assignments"]),
            "assignments": assignments_payload,
            "slot_summary": slot_summary,
            "unresolved_students": plan["unresolved_students"],
        }

    @action(detail=True, methods=["post"], url_path="preview-auto-assign-students-to-slots")
    def preview_auto_assign_students_to_slots(self, request, pk=None):
        exam = self.get_object()
        if exam.assignment_mode != "selected_students":
            return Response(
                {"detail": "Automatic slot assignment preview is supported only for selected-student exams."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ExamStudentAutoSlotAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        apply_to = serializer.validated_data["apply_to"]
        plan = self._resolve_auto_slot_assignment_plan(exam=exam, apply_to=apply_to)
        if "error" in plan:
            return Response(plan["error"], status=status.HTTP_400_BAD_REQUEST)

        return action_response(
            data=self._serialize_auto_slot_assignment_plan(plan=plan, apply_to=apply_to),
            message="Automatic slot assignment preview generated successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="auto-assign-students-to-slots")
    def auto_assign_students_to_slots(self, request, pk=None):
        exam = self.get_object()
        if exam.assignment_mode != "selected_students":
            return Response(
                {"detail": "Automatic slot assignment is supported only for selected-student exams."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ExamStudentAutoSlotAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        apply_to = serializer.validated_data["apply_to"]
        plan = self._resolve_auto_slot_assignment_plan(exam=exam, apply_to=apply_to)
        if "error" in plan:
            return Response(plan["error"], status=status.HTTP_400_BAD_REQUEST)
        target_assignments = plan["target_assignments"]
        if not target_assignments:
            return action_response(
                data={"updated_count": 0, "affected_student_ids": [], "slot_ids": []},
                message="No matching student assignments were found for automatic slot allocation.",
                status_code=status.HTTP_200_OK,
            )
        planned_slot_ids_by_assignment = plan["planned_slot_ids_by_assignment"]
        unresolved_students = plan["unresolved_students"]
        if unresolved_students:
            return Response(
                {
                    "access_slots": [
                        "Automatic slot assignment could not place every learner within the current slot capacity and cohort routing."
                    ],
                    "unresolved_students": unresolved_students,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = serializer.validated_data.get("notes", "")
        before = [
            {
                "student_id": str(assignment.student_id),
                "access_slot": str(assignment.access_slot_id) if assignment.access_slot_id else None,
                "notes": assignment.notes,
            }
            for assignment in target_assignments
        ]

        updated_assignments = []
        with transaction.atomic():
            for assignment in target_assignments:
                slot_id = planned_slot_ids_by_assignment.get(assignment.id)
                assignment.access_slot_id = slot_id
                if notes:
                    assignment.notes = notes
                assignment.save()
                updated_assignments.append(assignment)

        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_slot_auto_assign",
            entity_type="exam_student_access_bulk_override",
            entity_id=exam.id,
            message="Automatic student slot assignment completed.",
            metadata={
                "exam_id": str(exam.id),
                "apply_to": apply_to,
                "updated_count": len(updated_assignments),
                "student_ids": [str(assignment.student_id) for assignment in updated_assignments],
                "slot_ids": [str(planned_slot_ids_by_assignment[assignment.id]) for assignment in updated_assignments],
                "before": before,
                "notes_applied": notes,
            },
            request=request,
        )
        return action_response(
            data={
                "updated_count": len(updated_assignments),
                "affected_student_ids": [str(assignment.student_id) for assignment in updated_assignments],
                "slot_ids": [str(planned_slot_ids_by_assignment[assignment.id]) for assignment in updated_assignments],
            },
            message="Automatic slot assignment completed successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="slot-audit-logs")
    def slot_audit_logs(self, request, pk=None):
        exam = self.get_object()
        queryset = AuditLog.objects.select_related("user").filter(
            institute=exam.institute,
            action__in=[
                "exam_slot_create",
                "exam_slot_update",
                "exam_slot_override",
                "exam_slot_bulk_assign",
                "exam_slot_auto_assign",
            ],
        )

        exam_id = str(exam.id)
        rows = []
        for audit in queryset[:100]:
            metadata = audit.metadata if isinstance(audit.metadata, dict) else {}
            metadata_exam_id = str(metadata.get("exam_id") or "")
            include = metadata_exam_id == exam_id

            if not include and audit.entity_type == "exam_access_slot":
                slot_exam_id = str(metadata.get("exam_id") or "")
                include = slot_exam_id == exam_id
            if not include and audit.entity_type == "exam_student_access_override":
                include = metadata_exam_id == exam_id
            if not include and audit.entity_type == "exam_student_access_bulk_override":
                include = str(audit.entity_id) == exam_id or metadata_exam_id == exam_id

            if not include:
                continue

            rows.append(
                {
                    "id": str(audit.id),
                    "action": audit.action,
                    "entity_type": audit.entity_type,
                    "entity_id": audit.entity_id,
                    "message": audit.message,
                    "metadata": metadata,
                    "created_at": audit.created_at,
                    "user_id": str(audit.user_id) if audit.user_id else None,
                    "user_label": (
                        audit.user.get_full_name().strip()
                        or getattr(audit.user, "username", "")
                        or getattr(audit.user, "email", "")
                    )
                    if audit.user_id
                    else "System",
                }
            )

        return action_response(
            data=rows,
            message="Exam slot audit logs fetched successfully.",
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
            commercial_path=serializer.validated_data.get("commercial_path", ""),
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
                "commercial_path": serializer.validated_data.get("commercial_path", ""),
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
