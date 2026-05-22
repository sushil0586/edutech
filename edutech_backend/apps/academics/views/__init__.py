from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import CanManageAcademics
from apps.accounts.scopes import scope_teacher_queryset
from apps.academics.models import AcademicYear, Cohort, Program, Subject, Topic
from apps.academics.serializers import (
    AcademicYearSerializer,
    CohortSerializer,
    ProgramSerializer,
    SubjectSerializer,
    TopicSerializer,
)
from common.viewsets import SoftDeleteModelViewSetMixin


class AcademicYearViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "is_current", "is_active"]
    search_fields = ["name", "institute__name", "institute__code"]
    ordering_fields = ["name", "start_date", "end_date", "created_at"]
    ordering = ["-start_date"]

    def get_queryset(self):
        queryset = AcademicYear.objects.select_related("institute").all()
        return scope_teacher_queryset(queryset, self.request.user)


class ProgramViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "category", "is_active"]
    search_fields = ["name", "code", "category", "institute__name"]
    ordering_fields = ["name", "code", "sort_order", "created_at"]
    ordering = ["sort_order", "name"]

    def get_queryset(self):
        queryset = Program.objects.select_related("institute").all()
        return scope_teacher_queryset(queryset, self.request.user)


class CohortViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = CohortSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "program", "academic_year", "is_active"]
    search_fields = ["name", "code", "program__name", "academic_year__name", "institute__name"]
    ordering_fields = ["name", "code", "capacity", "created_at"]
    ordering = ["program__sort_order", "name"]

    def get_queryset(self):
        queryset = Cohort.objects.select_related("institute", "program", "academic_year").all()
        return scope_teacher_queryset(queryset, self.request.user)


class SubjectViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "program", "is_active"]
    search_fields = ["name", "code", "program__name", "institute__name"]
    ordering_fields = ["name", "code", "sort_order", "created_at"]
    ordering = ["sort_order", "name"]

    def get_queryset(self):
        queryset = Subject.objects.select_related("institute", "program").all()
        return scope_teacher_queryset(queryset, self.request.user)


class TopicViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["institute", "subject", "parent_topic", "difficulty_level", "is_active"]
    search_fields = ["name", "code", "subject__name", "parent_topic__name", "institute__name"]
    ordering_fields = ["name", "code", "sort_order", "created_at"]
    ordering = ["sort_order", "name"]

    def get_queryset(self):
        queryset = Topic.objects.select_related("institute", "subject", "parent_topic").all()
        return scope_teacher_queryset(queryset, self.request.user)
