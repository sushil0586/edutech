from rest_framework import serializers

from apps.parents.models import ParentAlert, ParentProfile, default_notification_preferences


class ParentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentProfile
        fields = (
            "id",
            "institute",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "alternate_phone",
            "email",
            "preferred_language",
            "notification_preferences",
            "metadata",
            "is_active",
        )


class ParentChildListSerializer(serializers.Serializer):
    relationship_id = serializers.UUIDField()
    student_id = serializers.UUIDField()
    student_name = serializers.CharField()
    admission_no = serializers.CharField()
    program_name = serializers.CharField()
    academic_year_name = serializers.CharField()
    cohort_name = serializers.CharField(allow_blank=True)
    relationship_type = serializers.CharField()
    relationship_label = serializers.CharField(allow_blank=True)
    is_primary_contact = serializers.BooleanField()
    permissions = serializers.DictField(child=serializers.BooleanField())
    status = serializers.CharField()
    is_active = serializers.BooleanField()


class ParentPreferencesSerializer(serializers.Serializer):
    score_drops = serializers.BooleanField(required=False)
    inactivity = serializers.BooleanField(required=False)
    milestones = serializers.BooleanField(required=False)
    weekly_summary = serializers.BooleanField(required=False)
    result_published = serializers.BooleanField(required=False)
    high_risk_exam_integrity = serializers.BooleanField(required=False)

    def to_representation(self, instance):
        current = {
            **default_notification_preferences(),
            **(instance or {}),
        }
        return super().to_representation(current)


class ParentAlertSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    relationship_type = serializers.CharField(source="relationship.relationship_type", read_only=True)

    class Meta:
        model = ParentAlert
        fields = (
            "id",
            "student",
            "student_name",
            "relationship",
            "relationship_type",
            "alert_type",
            "severity",
            "title",
            "message",
            "status",
            "source_type",
            "source_reference",
            "metadata",
            "read_at",
            "resolved_at",
            "created_at",
            "updated_at",
            "is_active",
        )
