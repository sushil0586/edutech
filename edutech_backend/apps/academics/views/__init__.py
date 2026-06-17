from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import CanManageAcademics
from apps.accounts.permissions import CanViewAcademics
from apps.accounts.scopes import scope_teacher_queryset
from apps.academics.models import AcademicYear, Cohort, OptionCatalogEntry, Program, Subject, Topic
from apps.academics.serializers import (
    AcademicYearSerializer,
    AcademicYearListSerializer,
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
from common.viewsets import SoftDeleteModelViewSetMixin


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
        return scope_teacher_queryset(queryset, self.request.user)


class ProgramViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "category", "is_active"]
    search_fields = ["name", "code", "category", "institute__name"]
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
        queryset = Program.objects.select_related("institute")
        if self.action == "list":
            queryset = queryset.only(
                "id",
                "institute_id",
                "name",
                "code",
                "category",
                "sort_order",
                "is_active",
            )
        return scope_teacher_queryset(queryset, self.request.user)


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
        return scope_teacher_queryset(queryset, self.request.user)


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
        return scope_teacher_queryset(queryset, self.request.user)


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
        return scope_teacher_queryset(queryset, self.request.user)


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
