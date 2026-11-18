from rest_framework import serializers

from apps.accounts.serializers import CredentialStatusMixin
from apps.students.models import StudentProfile


class StudentProfileSerializer(CredentialStatusMixin, serializers.ModelSerializer):
    accommodation_profile = serializers.SerializerMethodField()

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
            "date_of_birth",
            "email",
            "phone",
            "guardian_name",
            "guardian_phone",
            "profile_photo",
            "address",
            "joined_at",
            "accommodation_profile",
            "is_active",
            "created_at",
            "updated_at",
            "has_login",
            "login_username",
            "login_is_active",
            "account_user_id",
        )
        read_only_fields = ("full_name",)

    def get_accommodation_profile(self, obj) -> dict:
        return obj.normalized_accommodation_profile()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        raw_profile = self.initial_data.get("accommodation_profile", serializers.empty)
        if raw_profile is not serializers.empty and not isinstance(raw_profile, dict):
            raise serializers.ValidationError(
                {"accommodation_profile": "Accommodation profile must be stored as an object."}
            )
        attrs["_accommodation_profile_payload"] = raw_profile
        return attrs

    def create(self, validated_data):
        raw_profile = validated_data.pop("_accommodation_profile_payload", serializers.empty)
        instance = super().create(validated_data)
        if raw_profile is not serializers.empty:
            instance.set_accommodation_profile(raw_profile)
        return instance

    def update(self, instance, validated_data):
        raw_profile = validated_data.pop("_accommodation_profile_payload", serializers.empty)
        instance = super().update(instance, validated_data)
        if raw_profile is not serializers.empty:
            instance.set_accommodation_profile(raw_profile)
        return instance


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
