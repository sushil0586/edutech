from rest_framework import serializers

from apps.accounts.serializers import CredentialStatusMixin
from apps.students.models import StudentProfile


class StudentProfileSerializer(CredentialStatusMixin, serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = "__all__"
        read_only_fields = ("full_name",)


class StudentProfileListSerializer(CredentialStatusMixin, serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = (
            "id",
            "institute",
            "academic_year",
            "program",
            "cohort",
            "admission_no",
            "first_name",
            "last_name",
            "full_name",
            "gender",
            "email",
            "phone",
            "guardian_name",
            "guardian_phone",
            "address",
            "joined_at",
            "is_active",
            "has_login",
            "login_username",
            "login_is_active",
            "account_user_id",
        )
        read_only_fields = fields
