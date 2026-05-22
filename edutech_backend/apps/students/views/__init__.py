import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import IsPlatformOrInstituteAdmin
from apps.accounts.permissions import CanManageStudents
from apps.accounts.scopes import scope_institute_queryset, scope_teacher_queryset
from apps.accounts.services import (
    import_bulk_students,
    parse_csv_import_file,
    preview_bulk_student_import,
    student_import_template_csv,
    STUDENT_IMPORT_TEMPLATE_COLUMNS,
)
from apps.institutes.models import Institute
from apps.students.models import StudentProfile
from apps.students.serializers import StudentProfileSerializer
from apps.reports.services import create_audit_log
from common.viewsets import SoftDeleteModelViewSetMixin


import_logger = logging.getLogger("nexora.imports")


class StudentProfileViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, CanManageStudents]
    filterset_fields = ["institute", "academic_year", "program", "cohort", "gender", "is_active"]
    search_fields = [
        "admission_no",
        "first_name",
        "last_name",
        "full_name",
        "email",
        "phone",
        "guardian_name",
        "guardian_phone",
    ]
    ordering_fields = ["full_name", "admission_no", "joined_at", "created_at"]
    ordering = ["full_name"]

    def get_queryset(self):
        queryset = StudentProfile.objects.select_related(
            "institute",
            "academic_year",
            "program",
            "cohort",
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
                "columns": STUDENT_IMPORT_TEMPLATE_COLUMNS,
                "csv_content": student_import_template_csv(),
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
            rows = parse_csv_import_file(uploaded_file, STUDENT_IMPORT_TEMPLATE_COLUMNS)
            preview = preview_bulk_student_import(institute=institute, rows=rows)
        except DjangoValidationError as exc:
            import_logger.warning("Student import preview failed", extra={"user_id": request.user.id})
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
        result = import_bulk_students(institute=institute, valid_payloads=valid_payloads)
        create_audit_log(
            user=request.user,
            institute=institute,
            action="bulk_student_import",
            entity_type="student_import",
            entity_id=institute.id,
            message="Bulk student import finalized.",
            metadata={"created_count": result["created_count"], "failed_count": result["failed_count"]},
            request=request,
        )
        return Response(result, status=status.HTTP_201_CREATED)
