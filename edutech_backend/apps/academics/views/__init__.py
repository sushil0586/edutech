from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import CanManageAcademics
from apps.accounts.permissions import CanViewAcademics
from apps.accounts.permissions import IsPlatformAdmin
from apps.accounts.scopes import scope_teacher_academic_queryset
from apps.academics.models import (
    AcademicYear,
    AssessmentFamily,
    Cohort,
    OptionCatalogEntry,
    Program,
    Subject,
    Topic,
)
from apps.academics.serializers import (
    AcademicYearSerializer,
    AcademicYearListSerializer,
    AcademicPresetApplySerializer,
    AcademicPresetPreviewSerializer,
    AssessmentFamilyListSerializer,
    AssessmentFamilySerializer,
    CohortSerializer,
    CohortListSerializer,
    OptionCatalogEntrySerializer,
    OptionCatalogEntryListSerializer,
    ProgramSerializer,
    ProgramListSerializer,
    SubjectSerializer,
    SubjectListSerializer,
    TopicSerializer,
    TopicListSerializer,
)
from apps.academics.services import (
    apply_academic_preset_to_institute,
    get_academic_preset_detail,
    list_academic_presets,
    preview_academic_preset_application,
)
from apps.institutes.models import Institute
from apps.institutes.models import InstituteOnboardingRun
from apps.institutes.models import InstituteOnboardingRunStatus
from apps.institutes.services import (
    complete_institute_onboarding_run,
    resume_institute_onboarding_run,
    start_institute_onboarding_run,
)
from common.viewsets import SoftDeleteModelViewSetMixin


class AcademicPresetListView(APIView):
    permission_classes = [IsAuthenticated, CanViewAcademics]

    def get(self, request):
        return Response(list_academic_presets())


class AcademicPresetDetailView(APIView):
    permission_classes = [IsAuthenticated, CanViewAcademics]

    def get(self, request, preset_code):
        try:
            payload = get_academic_preset_detail(preset_code)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
        return Response(payload)


class AcademicPresetPreviewView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        serializer = AcademicPresetPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        try:
            preview = preview_academic_preset_application(
                institute_id=payload["institute"],
                preset_code=payload["preset_code"],
                mode=payload["mode"],
                subject_codes=payload.get("subject_codes") or [],
                topic_codes=payload.get("topic_codes") or [],
                academic_year_name=payload["academic_year_name"],
                academic_year_start=payload["academic_year_start"].isoformat(),
                academic_year_end=payload["academic_year_end"].isoformat(),
                question_bank_package_enabled=payload.get("question_bank_package_enabled", False),
                question_bank_package_code=payload.get("question_bank_package_code") or "",
                advanced_builder_enabled=payload.get("advanced_builder_enabled", False),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
        return Response(preview)


class AcademicPresetApplyView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        serializer = AcademicPresetApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        institute = Institute.objects.filter(id=payload["institute"]).first()
        onboarding_run = None
        requested_run_id = payload.get("onboarding_run_id")
        if institute is not None and requested_run_id is not None:
            onboarding_run = InstituteOnboardingRun.objects.filter(
                id=requested_run_id,
                institute=institute,
            ).first()
            if onboarding_run is not None:
                resume_institute_onboarding_run(run=onboarding_run)
        if institute is not None and onboarding_run is None:
            onboarding_run = start_institute_onboarding_run(
                institute=institute,
                profile_code=payload.get("onboarding_profile_code") or "",
                source="master_defaults",
                requested_config_json={
                    "preset_code": payload["preset_code"],
                    "mode": payload["mode"],
                    "subject_codes": payload.get("subject_codes") or [],
                    "topic_codes": payload.get("topic_codes") or [],
                    "academic_year_name": payload["academic_year_name"],
                    "academic_year_start": payload["academic_year_start"].isoformat(),
                    "academic_year_end": payload["academic_year_end"].isoformat(),
                    "question_bank_package_enabled": payload.get("question_bank_package_enabled", False),
                    "question_bank_package_code": payload.get("question_bank_package_code") or "",
                    "advanced_builder_enabled": payload.get("advanced_builder_enabled", False),
                },
                resolved_config_json={
                    "onboarding_profile_code": payload.get("onboarding_profile_code") or "",
                },
                initiated_by=request.user,
            )
        try:
            result = apply_academic_preset_to_institute(
                institute_id=payload["institute"],
                preset_code=payload["preset_code"],
                mode=payload["mode"],
                subject_codes=payload.get("subject_codes") or [],
                topic_codes=payload.get("topic_codes") or [],
                academic_year_name=payload["academic_year_name"],
                academic_year_start=payload["academic_year_start"].isoformat(),
                academic_year_end=payload["academic_year_end"].isoformat(),
                question_bank_package_enabled=payload.get("question_bank_package_enabled", False),
                question_bank_package_code=payload.get("question_bank_package_code") or "",
                advanced_builder_enabled=payload.get("advanced_builder_enabled", False),
                onboarding_run_id=onboarding_run.id if onboarding_run is not None else None,
            )
        except DjangoValidationError as exc:
            if onboarding_run is not None:
                complete_institute_onboarding_run(
                    run=onboarding_run,
                    status=InstituteOnboardingRunStatus.FAILED,
                    error_summary="; ".join(exc.messages) if hasattr(exc, "messages") else "Validation error",
                )
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            if onboarding_run is not None:
                complete_institute_onboarding_run(
                    run=onboarding_run,
                    status=InstituteOnboardingRunStatus.FAILED,
                    error_summary=str(exc),
                )
            raise
        if onboarding_run is not None:
            complete_institute_onboarding_run(
                run=onboarding_run,
                status=InstituteOnboardingRunStatus.COMPLETED,
            )
            if result.get("onboarding_run"):
                result["onboarding_run"]["status"] = InstituteOnboardingRunStatus.COMPLETED
        return Response(result, status=201)


class AcademicYearViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "is_current", "is_active"]
    search_fields = ["name", "institute__name", "institute__code"]
    ordering_fields = ["name", "start_date", "end_date", "created_at"]
    ordering = ["-start_date"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAcademics()]
        return [IsAuthenticated(), CanManageAcademics()]

    def get_serializer_class(self):
        if self.action == "list":
            return AcademicYearListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = AcademicYear.objects.select_related("institute")
        if self.action == "list":
            queryset = queryset.only(
                "id",
                "institute_id",
                "name",
                "start_date",
                "end_date",
                "is_current",
                "is_active",
            )
        return scope_teacher_academic_queryset(queryset, self.request.user)


class AssessmentFamilyViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = AssessmentFamilySerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    filterset_fields = ["code", "is_active"]
    search_fields = ["code", "label", "description"]
    ordering_fields = ["sort_order", "label", "created_at"]
    ordering = ["sort_order", "label"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAcademics()]
        return [IsAuthenticated(), IsPlatformAdmin()]

    def get_serializer_class(self):
        if self.action == "list":
            return AssessmentFamilyListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = AssessmentFamily.objects.all()
        if self.action == "list":
            queryset = queryset.only(
                "id",
                "code",
                "label",
                "description",
                "sort_order",
                "allowed_question_types",
                "scoring_defaults",
                "delivery_defaults",
                "analytics_preset",
                "authoring_hints",
                "is_active",
            )
        return queryset


class ProgramViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "assessment_family", "category", "is_active"]
    search_fields = ["name", "code", "category", "institute__name", "assessment_family__label"]
    ordering_fields = ["name", "code", "sort_order", "created_at"]
    ordering = ["sort_order", "name"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAcademics()]
        return [IsAuthenticated(), CanManageAcademics()]

    def get_serializer_class(self):
        if self.action == "list":
            return ProgramListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = Program.objects.select_related("institute", "assessment_family")
        if self.action == "list":
            queryset = queryset.only(
                "id",
                "institute_id",
                "assessment_family_id",
                "assessment_family__code",
                "assessment_family__label",
                "assessment_family__description",
                "assessment_family__sort_order",
                "assessment_family__allowed_question_types",
                "assessment_family__scoring_defaults",
                "assessment_family__delivery_defaults",
                "assessment_family__analytics_preset",
                "assessment_family__authoring_hints",
                "assessment_family__is_active",
                "name",
                "code",
                "category",
                "description",
                "sort_order",
                "is_active",
            )
        return scope_teacher_academic_queryset(queryset, self.request.user)


class CohortViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = CohortSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "program", "academic_year", "is_active"]
    search_fields = ["name", "code", "program__name", "academic_year__name", "institute__name"]
    ordering_fields = ["name", "code", "capacity", "created_at"]
    ordering = ["program__sort_order", "name"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAcademics()]
        return [IsAuthenticated(), CanManageAcademics()]

    def get_serializer_class(self):
        if self.action == "list":
            return CohortListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = Cohort.objects.select_related("institute", "program", "academic_year")
        if self.action == "list":
            queryset = queryset.only(
                "id",
                "institute_id",
                "program_id",
                "academic_year_id",
                "name",
                "code",
                "capacity",
                "is_active",
            )
        return scope_teacher_academic_queryset(queryset, self.request.user)


class SubjectViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "program", "is_active"]
    search_fields = ["name", "code", "program__name", "institute__name"]
    ordering_fields = ["name", "code", "sort_order", "created_at"]
    ordering = ["sort_order", "name"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAcademics()]
        return [IsAuthenticated(), CanManageAcademics()]

    def get_serializer_class(self):
        if self.action == "list":
            return SubjectListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = Subject.objects.select_related("institute", "program")
        if self.action == "list":
            queryset = queryset.only(
                "id",
                "institute_id",
                "program_id",
                "name",
                "code",
                "sort_order",
                "is_active",
            )
        return scope_teacher_academic_queryset(queryset, self.request.user)


class TopicViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "subject", "parent_topic", "difficulty_level", "is_active"]
    search_fields = ["name", "code", "subject__name", "parent_topic__name", "institute__name"]
    ordering_fields = ["name", "code", "sort_order", "created_at"]
    ordering = ["sort_order", "name"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAcademics()]
        return [IsAuthenticated(), CanManageAcademics()]

    def get_serializer_class(self):
        if self.action == "list":
            return TopicListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = Topic.objects.select_related("institute", "subject", "parent_topic")
        if self.action == "list":
            queryset = queryset.only(
                "id",
                "institute_id",
                "subject_id",
                "parent_topic_id",
                "name",
                "code",
                "difficulty_level",
                "sort_order",
                "is_active",
            )
        return scope_teacher_academic_queryset(queryset, self.request.user)


class OptionCatalogEntryViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = OptionCatalogEntrySerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["namespace", "is_active", "is_default"]
    search_fields = ["namespace", "code", "label", "description"]
    ordering_fields = ["namespace", "sort_order", "label", "created_at"]
    ordering = ["namespace", "sort_order", "label"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAcademics()]
        return [IsAuthenticated(), CanManageAcademics()]

    def get_serializer_class(self):
        if self.action == "list":
            return OptionCatalogEntryListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = OptionCatalogEntry.objects.all()
        if self.action == "list":
            queryset = queryset.only(
                "id",
                "namespace",
                "code",
                "label",
                "description",
                "sort_order",
                "is_default",
                "metadata",
                "is_active",
                "created_at",
                "updated_at",
            )
        return queryset
