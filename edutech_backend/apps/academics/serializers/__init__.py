from rest_framework import serializers

from apps.academics.assessment_family_contracts import merge_assessment_family_contract
from apps.academics.models import (
    AcademicYear,
    AssessmentFamily,
    Cohort,
    OptionCatalogEntry,
    Program,
    Subject,
    Topic,
)


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = "__all__"


class AcademicYearListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = (
            "id",
            "institute",
            "name",
            "start_date",
            "end_date",
            "is_current",
            "is_active",
        )
        read_only_fields = fields


class AssessmentFamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentFamily
        fields = "__all__"


class AssessmentFamilyListSerializer(serializers.ModelSerializer):
    allowed_question_types = serializers.SerializerMethodField()
    scoring_defaults = serializers.SerializerMethodField()

    def get_allowed_question_types(self, obj):
        contract = merge_assessment_family_contract(
            family_code=getattr(obj, "code", None),
            allowed_question_types=getattr(obj, "allowed_question_types", []),
            scoring_defaults=getattr(obj, "scoring_defaults", {}),
        )
        return contract["allowed_question_types"]

    def get_scoring_defaults(self, obj):
        contract = merge_assessment_family_contract(
            family_code=getattr(obj, "code", None),
            allowed_question_types=getattr(obj, "allowed_question_types", []),
            scoring_defaults=getattr(obj, "scoring_defaults", {}),
        )
        return contract["scoring_defaults"]

    class Meta:
        model = AssessmentFamily
        fields = (
            "id",
            "code",
            "label",
            "description",
            "sort_order",
            "allowed_question_types",
            "scoring_defaults",
            "delivery_defaults",
            "analytics_preset",
            "authoring_hints",
            "is_active",
        )
        read_only_fields = fields


class ProgramSerializer(serializers.ModelSerializer):
    assessment_family_code = serializers.SerializerMethodField()
    assessment_family_label = serializers.SerializerMethodField()
    assessment_family_profile = serializers.SerializerMethodField()

    def get_assessment_family_code(self, obj):
        family = getattr(obj, "assessment_family", None)
        return family.code if family is not None else None

    def get_assessment_family_label(self, obj):
        family = getattr(obj, "assessment_family", None)
        return family.label if family is not None else None

    def get_assessment_family_profile(self, obj):
        family = getattr(obj, "assessment_family", None)
        if family is None:
            return None
        return AssessmentFamilyListSerializer(family).data

    class Meta:
        model = Program
        fields = "__all__"


class ProgramListSerializer(serializers.ModelSerializer):
    assessment_family_code = serializers.SerializerMethodField()
    assessment_family_label = serializers.SerializerMethodField()
    assessment_family_profile = serializers.SerializerMethodField()

    def get_assessment_family_code(self, obj):
        family = getattr(obj, "assessment_family", None)
        return family.code if family is not None else None

    def get_assessment_family_label(self, obj):
        family = getattr(obj, "assessment_family", None)
        return family.label if family is not None else None

    def get_assessment_family_profile(self, obj):
        family = getattr(obj, "assessment_family", None)
        if family is None:
            return None
        return AssessmentFamilyListSerializer(family).data

    class Meta:
        model = Program
        fields = (
            "id",
            "institute",
            "assessment_family",
            "assessment_family_code",
            "assessment_family_label",
            "assessment_family_profile",
            "name",
            "code",
            "category",
            "description",
            "sort_order",
            "is_active",
        )
        read_only_fields = fields


class CohortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cohort
        fields = "__all__"


class CohortListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cohort
        fields = (
            "id",
            "institute",
            "program",
            "academic_year",
            "name",
            "code",
            "capacity",
            "is_active",
        )
        read_only_fields = fields


class SubjectSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)
        program = attrs.get("program", getattr(instance, "program", None))
        if program is None:
            raise serializers.ValidationError(
                {
                    "program": (
                        "Program is required for subjects. "
                        "Questions imported or created under this subject inherit the subject program."
                    )
                }
            )
        return attrs

    class Meta:
        model = Subject
        fields = "__all__"


class SubjectListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = (
            "id",
            "institute",
            "program",
            "name",
            "code",
            "sort_order",
            "is_active",
        )
        read_only_fields = fields


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = "__all__"


class TopicListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = (
            "id",
            "institute",
            "subject",
            "parent_topic",
            "name",
            "code",
            "difficulty_level",
            "sort_order",
            "is_active",
        )
        read_only_fields = fields


class OptionCatalogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionCatalogEntry
        fields = "__all__"


class OptionCatalogEntryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionCatalogEntry
        fields = (
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
        read_only_fields = fields


class AcademicPresetPreviewSerializer(serializers.Serializer):
    institute = serializers.UUIDField()
    onboarding_run_id = serializers.UUIDField(required=False, allow_null=True)
    preset_code = serializers.CharField(max_length=120)
    mode = serializers.ChoiceField(
        choices=[
            ("full", "Full"),
            ("selected_subjects", "Selected subjects"),
            ("selected_topic_groups", "Selected topic groups"),
        ],
        default="full",
    )
    subject_codes = serializers.ListField(
        child=serializers.CharField(max_length=80),
        required=False,
        allow_empty=True,
    )
    topic_codes = serializers.ListField(
        child=serializers.CharField(max_length=80),
        required=False,
        allow_empty=True,
    )
    academic_year_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="2026-2027")
    academic_year_start = serializers.DateField(required=False, default="2026-04-01")
    academic_year_end = serializers.DateField(required=False, default="2027-03-31")
    question_bank_package_enabled = serializers.BooleanField(required=False, default=False)
    question_bank_package_code = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
        allow_null=True,
        default="",
    )
    advanced_builder_enabled = serializers.BooleanField(required=False, default=False)
    onboarding_profile_code = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
        default="",
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs["academic_year_start"] >= attrs["academic_year_end"]:
            raise serializers.ValidationError(
                {"academic_year_end": "Academic year end date must be later than start date."}
            )
        if attrs["mode"] == "selected_subjects" and not attrs.get("subject_codes"):
            raise serializers.ValidationError(
                {"subject_codes": "Select at least one subject for selective apply."}
            )
        if attrs["mode"] == "selected_topic_groups" and not attrs.get("topic_codes"):
            raise serializers.ValidationError(
                {"topic_codes": "Select at least one topic group for selective apply."}
            )
        if attrs.get("question_bank_package_enabled") and not str(attrs.get("question_bank_package_code") or "").strip():
            raise serializers.ValidationError(
                {"question_bank_package_code": "Select a question-bank package when package access is enabled."}
            )
        return attrs


class AcademicPresetApplySerializer(AcademicPresetPreviewSerializer):
    pass
