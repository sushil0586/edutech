from django.db.models import Count, Q
from django.db.models import Prefetch
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.accounts.models import AccountProfile, AccountRole
from apps.accounts.permissions import CanManageAcademics
from apps.accounts.permissions import IsPlatformAdmin
from apps.accounts.scopes import get_account_profile
from apps.institutes.models import (
    Institute,
    InstituteOnboardingProfile,
    InstituteOnboardingRun,
    InstituteOnboardingTaskRun,
)
from apps.institutes.serializers import (
    InstituteOnboardingRunDetailSerializer,
    InstituteListSerializer,
    InstituteOnboardingProfileListSerializer,
    InstituteOnboardingRunListSerializer,
    InstituteOnboardingTaskRunListSerializer,
    InstituteSerializer,
)
from common.viewsets import SoftDeleteModelViewSetMixin


class InstituteOnboardingProfileListView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = InstituteOnboardingProfile.objects.filter(is_active=True).order_by("sort_order", "name")
        return Response(InstituteOnboardingProfileListSerializer(queryset, many=True).data)


class InstituteOnboardingRunListView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request, institute_id):
        queryset = (
            InstituteOnboardingRun.objects.filter(institute_id=institute_id)
            .select_related("profile")
            .annotate(
                task_total=Count("tasks", distinct=True),
                task_completed_total=Count(
                    "tasks",
                    filter=Q(tasks__status__in=["completed", "skipped", "failed"]),
                    distinct=True,
                ),
            )
            .order_by("-created_at")[:12]
        )
        return Response(InstituteOnboardingRunListSerializer(queryset, many=True).data)


class InstituteOnboardingRunDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request, institute_id, run_id):
        run = (
            InstituteOnboardingRun.objects.filter(id=run_id, institute_id=institute_id)
            .select_related("profile")
            .first()
        )
        if run is None:
            return Response({"detail": "Onboarding run not found."}, status=404)
        return Response(InstituteOnboardingRunDetailSerializer(run).data)


class InstituteOnboardingTaskRunListView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request, institute_id, run_id):
        queryset = (
            InstituteOnboardingTaskRun.objects.filter(
                run_id=run_id,
                run__institute_id=institute_id,
            )
            .select_related("run")
            .order_by("created_at")
        )
        return Response(InstituteOnboardingTaskRunListSerializer(queryset, many=True).data)


class InstituteViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = InstituteSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["is_active", "city", "state", "country"]
    search_fields = ["name", "code", "email", "phone", "city", "state", "country"]
    ordering_fields = ["name", "code", "created_at", "updated_at"]
    ordering = ["name"]
    archive_message = "Institute archived successfully."

    institute_admin_prefetch = Prefetch(
        "account_profiles",
        queryset=AccountProfile.objects.filter(role=AccountRole.INSTITUTE_ADMIN)
        .select_related("user")
        .order_by("created_at", "user__username"),
        to_attr="institute_admin_profiles",
    )
    onboarding_run_prefetch = Prefetch(
        "onboarding_runs",
        queryset=InstituteOnboardingRun.objects.select_related("profile").order_by("-created_at"),
        to_attr="prefetched_onboarding_runs",
    )

    def get_serializer_class(self):
        if self.action == "list":
            return InstituteListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = Institute.objects.all().prefetch_related(
            self.institute_admin_prefetch,
            self.onboarding_run_prefetch,
        )
        if self.action == "list":
            queryset = queryset.only(
                "id",
                "name",
                "code",
                "email",
                "phone",
                "city",
                "state",
                "country",
                "is_active",
            )
        profile = get_account_profile(self.request.user)
        if profile is None or not profile.is_active:
            return queryset.none()
        if profile.role == "platform_admin":
            return queryset
        if profile.institute_id:
            return queryset.filter(id=profile.institute_id)
        return queryset.none()
