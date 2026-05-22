from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import CanManageAcademics
from apps.accounts.scopes import get_account_profile
from apps.institutes.models import Institute
from apps.institutes.serializers import InstituteSerializer
from common.viewsets import SoftDeleteModelViewSetMixin


class InstituteViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = InstituteSerializer
    permission_classes = [IsAuthenticated, CanManageAcademics]
    filterset_fields = ["is_active", "city", "state", "country"]
    search_fields = ["name", "code", "email", "phone", "city", "state", "country"]
    ordering_fields = ["name", "code", "created_at", "updated_at"]
    ordering = ["name"]
    archive_message = "Institute archived successfully."

    def get_queryset(self):
        queryset = Institute.objects.all()
        profile = get_account_profile(self.request.user)
        if profile is None or not profile.is_active:
            return queryset.none()
        if profile.role == "platform_admin":
            return queryset
        if profile.institute_id:
            return queryset.filter(id=profile.institute_id)
        return queryset.none()
