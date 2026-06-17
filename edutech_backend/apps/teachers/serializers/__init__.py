from rest_framework import serializers

from apps.accounts.serializers import CredentialStatusMixin
from apps.teachers.models import TeacherAssignment, TeacherProfile


class TeacherProfileSerializer(CredentialStatusMixin, serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = "__all__"
        read_only_fields = ("full_name",)


class TeacherProfileListSerializer(CredentialStatusMixin, serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = (
            "id",
            "institute",
            "employee_code",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "qualification",
            "specialization",
            "bio",
            "joined_at",
            "is_active",
            "has_login",
            "login_username",
            "login_is_active",
            "account_user_id",
        )
        read_only_fields = fields


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAssignment
        fields = "__all__"
