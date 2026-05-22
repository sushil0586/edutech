import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import IsPlatformOrInstituteAdmin
from apps.accounts.permissions import CanManageAcademics
from apps.accounts.permissions import CanManageStudents
from apps.accounts.scopes import scope_institute_queryset, scope_teacher_queryset
from apps.accounts.services import (
    import_bulk_teachers,
    parse_csv_import_file,
    preview_bulk_teacher_import,
    teacher_import_template_csv,
    TEACHER_IMPORT_TEMPLATE_COLUMNS,
)
from apps.institutes.models import Institute
from apps.reports.services import create_audit_log
from apps.teachers.models import TeacherAssignment, TeacherProfile
from apps.teachers.serializers import TeacherAssignmentSerializer, TeacherProfileSerializer
from common.viewsets import SoftDeleteModelViewSetMixin


import_logger = logging.getLogger("nexora.imports")


class TeacherProfileViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = TeacherProfileSerializer
    permission_classes = [IsAuthenticated, CanManageStudents]
    filterset_fields = ["institute", "is_active"]
    search_fields = [
        "employee_code",
        "first_name",
        "last_name",
        "full_name",
        "email",
        "phone",
        "qualification",
        "specialization",
    ]
    ordering_fields = ["full_name", "employee_code", "joined_at", "created_at"]
    ordering = ["full_name"]

    def get_queryset(self):
        queryset = TeacherProfile.objects.select_related(
            "institute",
            "account_profile",
            "account_profile__user",
        ).all()
        return scope_teacher_queryset(queryset, self.request.user)

    def get_permissions(self):
        if self.action in {"import_template", "preview_import", "finalize_import"}:
            return [IsAuthenticated(), IsPlatformOrInstituteAdmin()]
        return super().get_permissions()

    @action(detail=False, methods=["get"], url_path="import-template")
    def import_template(self, request):
        return Response(
            {
                "columns": TEACHER_IMPORT_TEMPLATE_COLUMNS,
                "csv_content": teacher_import_template_csv(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="preview-import")
    def preview_import(self, request):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return Response({"file": "Upload a CSV file first."}, status=status.HTTP_400_BAD_REQUEST)
        institute_queryset = scope_institute_queryset(Institute.objects.all(), request.user)
        institute_id = request.data.get("institute")
        institute = institute_queryset.filter(pk=institute_id).first() if institute_id else institute_queryset.first()
        if institute is None:
            return Response({"institute": "Institute scope not found for import."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rows = parse_csv_import_file(uploaded_file, TEACHER_IMPORT_TEMPLATE_COLUMNS)
            preview = preview_bulk_teacher_import(institute=institute, rows=rows)
        except DjangoValidationError as exc:
            import_logger.warning("Teacher import preview failed", extra={"user_id": request.user.id})
            detail = exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)
        return Response(preview, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="finalize-import")
    def finalize_import(self, request):
        institute_queryset = scope_institute_queryset(Institute.objects.all(), request.user)
        institute_id = request.data.get("institute")
        institute = institute_queryset.filter(pk=institute_id).first() if institute_id else institute_queryset.first()
        if institute is None:
            return Response({"institute": "Institute scope not found for import."}, status=status.HTTP_400_BAD_REQUEST)
        valid_payloads = request.data.get("valid_payloads") or []
        if not isinstance(valid_payloads, list) or not valid_payloads:
            return Response({"valid_payloads": "Preview valid rows before finalizing import."}, status=status.HTTP_400_BAD_REQUEST)
        result = import_bulk_teachers(institute=institute, valid_payloads=valid_payloads)
        create_audit_log(
            user=request.user,
            institute=institute,
            action="bulk_teacher_import",
            entity_type="teacher_import",
            entity_id=institute.id,
            message="Bulk teacher import finalized.",
            metadata={"created_count": result["created_count"], "failed_count": result["failed_count"]},
            request=request,
        )
        return Response(result, status=status.HTTP_201_CREATED)


class TeacherAssignmentViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = TeacherAssignmentSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = [
        "institute",
        "teacher",
        "academic_year",
        "program",
        "cohort",
        "subject",
        "assignment_role",
        "is_primary",
        "is_active",
    ]
    search_fields = [
        "teacher__full_name",
        "teacher__employee_code",
        "subject__name",
        "program__name",
        "cohort__name",
        "academic_year__name",
    ]
    ordering_fields = ["teacher__full_name", "subject__name", "created_at"]
    ordering = ["-is_primary", "subject__name"]

    def get_queryset(self):
        queryset = TeacherAssignment.objects.select_related(
            "institute",
            "teacher",
            "academic_year",
            "program",
            "cohort",
            "subject",
        ).all()
        return scope_teacher_queryset(queryset, self.request.user)
