from rest_framework import serializers

from apps.accounts.serializers import CredentialStatusMixin
from apps.teachers.models import TeacherAssignment, TeacherProfile


class TeacherProfileSerializer(CredentialStatusMixin, serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = "__all__"
        read_only_fields = ("full_name",)


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAssignment
        fields = "__all__"
