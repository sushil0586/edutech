from rest_framework import serializers

from apps.accounts.serializers import CredentialStatusMixin
from apps.students.models import StudentProfile


class StudentProfileSerializer(CredentialStatusMixin, serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = "__all__"
        read_only_fields = ("full_name",)
