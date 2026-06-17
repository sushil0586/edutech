from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from apps.accounts.scopes import get_account_profile
from apps.exams.models import (
    AdvancedExamTemplate,
    Exam,
    ExamPublishLog,
    ExamQuestion,
    ExamSection,
    ExamSourceType,
    ExamStudentAssignment,
)
from apps.exams.services import (
    ADVANCED_EXAM_SELECTION_MODES,
    apply_institute_exam_defaults,
    allowed_exam_sources_for_profile,
    build_exam_content_target,
    default_exam_source_for_profile,
    get_exam_access_policy,
    is_exam_assigned_to_student,
    is_review_available_for_attempt,
    remaining_attempts_for_student,
    resolve_exam_economy_access,
    resolve_exam_result_visibility_policy,
    resolve_exam_source_metadata,
    resolve_security_policy,
    sync_exam_access_policy,
    sync_total_marks_from_questions,
)
from apps.question_bank.models import QuestionAttachment, QuestionOption


class ExamSectionSerializer(serializers.ModelSerializer):
    linked_questions_count = serializers.SerializerMethodField()

    class Meta:
        model = ExamSection
        fields = "__all__"

    def get_linked_questions_count(self, obj):
        return obj.exam_questions.filter(is_active=True).count()


class ExamAssignedStudentSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="student.full_name", read_only=True)
    admission_no = serializers.CharField(source="student.admission_no", read_only=True)
    cohort_name = serializers.CharField(source="student.cohort.name", read_only=True)

    class Meta:
        model = ExamStudentAssignment
        fields = (
            "id",
            "student",
            "full_name",
            "admission_no",
            "cohort_name",
            "notes",
            "is_active",
        )


class ExamStudentAssignmentUpdateSerializer(serializers.Serializer):
    assignment_mode = serializers.ChoiceField(choices=Exam._meta.get_field("assignment_mode").choices)
    student_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )


class ExamQuestionSerializer(serializers.ModelSerializer):
    question_text_summary = serializers.SerializerMethodField()
    question_text = serializers.CharField(source="question.question_text", read_only=True)
    question_type = serializers.CharField(source="question.question_type", read_only=True)
    difficulty_level = serializers.CharField(source="question.difficulty_level", read_only=True)
    topic = serializers.UUIDField(source="question.topic_id", read_only=True)
    topic_name = serializers.CharField(source="question.topic.name", read_only=True)
    explanation = serializers.CharField(source="question.explanation", read_only=True)
    has_explanation = serializers.SerializerMethodField()
    section_title = serializers.CharField(source="section.name", read_only=True)
    section_order = serializers.IntegerField(source="section.section_order", read_only=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)
        exam = attrs.get("exam", getattr(instance, "exam", None))
        section = attrs.get("section", getattr(instance, "section", None))
        section_name = attrs.get("section_name", getattr(instance, "section_name", ""))

        if section is not None and exam is not None and section.exam_id != exam.id:
            raise serializers.ValidationError(
                {"section": "Section must belong to the same exam."}
            )
        if section is not None and section_name and section.name != section_name.strip():
            raise serializers.ValidationError(
                {
                    "section_name": (
                        "Section name must match the selected section, or be left blank."
                    )
                }
            )
        if section is not None:
            attrs["section_name"] = section.name
        return attrs

    class Meta:
        model = ExamQuestion
        fields = (
            "id",
            "exam",
            "question",
            "section",
            "section_title",
            "section_order",
            "question_text_summary",
            "question_text",
            "question_type",
            "difficulty_level",
            "topic",
            "topic_name",
            "explanation",
            "has_explanation",
            "section_name",
            "question_order",
            "marks",
            "negative_marks",
            "is_mandatory",
            "is_active",
            "created_at",
            "updated_at",
        )

    def get_question_text_summary(self, obj):
        text = obj.question.question_text.strip()
        return text[:120] + ("..." if len(text) > 120 else "")

    def get_has_explanation(self, obj):
        return bool(obj.question.explanation.strip())


class ExamPublishLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = ExamPublishLog
        fields = "__all__"


class ExamWriteSerializer(serializers.ModelSerializer):
    rank_visibility_mode = serializers.ChoiceField(
        choices=[
            ("hidden", "Hidden"),
            ("provisional_after_submit", "Provisional After Submit"),
            ("final_after_exam_closure", "Final After Exam Closure"),
        ],
        required=False,
        default="hidden",
    )
    percentile_visibility_mode = serializers.ChoiceField(
        choices=[
            ("hidden", "Hidden"),
            ("provisional_after_submit", "Provisional After Submit"),
            ("final_after_exam_closure", "Final After Exam Closure"),
        ],
        required=False,
        default="hidden",
    )
    benchmark_visibility_mode = serializers.ChoiceField(
        choices=[
            ("hidden", "Hidden"),
            ("peer_average_only", "Peer Average Only"),
            ("peer_average_plus_percentile", "Peer Average Plus Percentile"),
        ],
        required=False,
        default="peer_average_only",
    )
    rank_freeze_policy = serializers.ChoiceField(
        choices=[
            ("rolling_until_exam_closure", "Rolling Until Exam Closure"),
            ("freeze_on_exam_closure", "Freeze On Exam Closure"),
        ],
        required=False,
        default="freeze_on_exam_closure",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["duration_minutes"].required = False
        self.fields["access_key"].required = False
        self.fields["access_key_enabled"].required = False

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)
        request = self.context.get("request")
        profile = getattr(getattr(request, "user", None), "account_profile", None)
        allowed_sources = allowed_exam_sources_for_profile(profile)
        requested_source = attrs.get("source_type", getattr(instance, "source_type", None))

        if requested_source in {None, ""}:
            requested_source = default_exam_source_for_profile(profile)
            if requested_source is not None:
                attrs["source_type"] = requested_source

        if requested_source and requested_source not in allowed_sources:
            raise serializers.ValidationError(
                {
                    "source_type": (
                        "You are not allowed to publish this exam with the selected source."
                    )
                }
            )

        if requested_source == ExamSourceType.TEACHER:
            if attrs.get("source_teacher") is None and getattr(profile, "teacher_profile_id", None):
                attrs["source_teacher"] = profile.teacher_profile
        elif "source_teacher" not in attrs:
            attrs["source_teacher"] = None

        if instance is None:
            institute = attrs.get("institute")
            if institute is not None:
                attrs = apply_institute_exam_defaults(
                    institute,
                    attrs,
                    supplied_fields=self.initial_data.keys(),
                )
        start_at = attrs.get("start_at", getattr(instance, "start_at", None))
        end_at = attrs.get("end_at", getattr(instance, "end_at", None))
        if start_at and end_at and end_at <= start_at:
            raise serializers.ValidationError(
                {"end_at": "End time must be after start time."}
            )
        if instance is None and attrs.get("duration_minutes") in {None, ""}:
            raise serializers.ValidationError(
                {
                    "duration_minutes": (
                        "Duration is required either in the exam payload or "
                        "through institute exam defaults."
                    )
                }
            )
        return attrs

    def _merge_result_visibility_policy(self, validated_data, instance=None):
        policy_updates = {
            "rank_visibility_mode": validated_data.pop("rank_visibility_mode", None),
            "percentile_visibility_mode": validated_data.pop("percentile_visibility_mode", None),
            "benchmark_visibility_mode": validated_data.pop("benchmark_visibility_mode", None),
            "rank_freeze_policy": validated_data.pop("rank_freeze_policy", None),
        }
        metadata = validated_data.get("metadata")
        metadata = dict(metadata) if isinstance(metadata, dict) else {}

        if instance is not None and isinstance(getattr(instance, "metadata", None), dict):
            merged_metadata = dict(instance.metadata)
            merged_metadata.update(metadata)
            metadata = merged_metadata

        if instance is not None:
            policy = dict(resolve_exam_result_visibility_policy(instance))
        else:
            policy = {
                "rank_visibility_mode": "hidden",
                "percentile_visibility_mode": "hidden",
                "benchmark_visibility_mode": "peer_average_only",
                "rank_freeze_policy": "freeze_on_exam_closure",
            }

        for key, value in policy_updates.items():
            if isinstance(value, str) and value.strip():
                policy[key] = value.strip()

        metadata["result_visibility_policy"] = policy
        validated_data["metadata"] = metadata
        return validated_data

    def create(self, validated_data):
        validated_data = self._merge_result_visibility_policy(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._merge_result_visibility_policy(validated_data, instance=instance)
        return super().update(instance, validated_data)

    class Meta:
        model = Exam
        fields = "__all__"
        validators = [
            UniqueTogetherValidator(
                queryset=Exam.objects.all(),
                fields=("institute", "code"),
            )
        ]


class ExamEconomyPolicySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    content_type = serializers.CharField()
    content_key = serializers.CharField()
    content_label = serializers.CharField()
    policy_type = serializers.CharField()
    star_cost = serializers.IntegerField()
    entitlement_code = serializers.CharField()
    priority = serializers.IntegerField()
    subject = serializers.UUIDField(allow_null=True)
    subject_name = serializers.CharField(allow_null=True)
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class ExamEconomyPolicyUpdateSerializer(serializers.Serializer):
    policy_type = serializers.ChoiceField(
        choices=[
            ("", "Open Access"),
            ("free", "Free"),
            ("stars_only", "Stars Only"),
            ("entitlement_only", "Entitlement Only"),
            ("stars_or_entitlement", "Stars Or Entitlement"),
        ],
        required=False,
        allow_blank=True,
        default="",
    )
    star_cost = serializers.IntegerField(required=False, min_value=0, default=0)
    entitlement_code = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=100,
    )
    priority = serializers.IntegerField(required=False, min_value=1, default=100)

    def validate(self, attrs):
        policy_type = attrs.get("policy_type", "")
        star_cost = int(attrs.get("star_cost", 0) or 0)
        entitlement_code = str(attrs.get("entitlement_code", "") or "").strip()

        if policy_type == "stars_only" and star_cost <= 0:
            raise serializers.ValidationError(
                {"star_cost": "Star-cost policies must charge at least one star."}
            )

        if policy_type == "entitlement_only" and not entitlement_code:
            raise serializers.ValidationError(
                {"entitlement_code": "Entitlement-only policies must define an entitlement code."}
            )

        if policy_type == "stars_or_entitlement":
            errors = {}
            if star_cost <= 0:
                errors["star_cost"] = "Stars-or-entitlement policies must define a positive star cost."
            if not entitlement_code:
                errors["entitlement_code"] = (
                    "Stars-or-entitlement policies must define an entitlement code."
                )
            if errors:
                raise serializers.ValidationError(errors)

        return attrs


class AdvancedExamDifficultyMixSerializer(serializers.Serializer):
    foundation = serializers.IntegerField(min_value=0)
    intermediate = serializers.IntegerField(min_value=0)
    advanced = serializers.IntegerField(min_value=0)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if sum(attrs.values()) != 100:
            raise serializers.ValidationError("Difficulty mix must add up to 100.")
        return attrs


class AdvancedExamTopicCountSerializer(serializers.Serializer):
    topic_code = serializers.CharField(max_length=100)
    count = serializers.IntegerField(min_value=1)


class AdvancedExamSectionBlueprintSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    order = serializers.IntegerField(min_value=1)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    instructions = serializers.CharField(required=False, allow_blank=True, default="")
    question_count = serializers.IntegerField(min_value=1)
    marks_per_question = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    negative_marks_per_question = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    timer_enabled = serializers.BooleanField(required=False, default=False)
    duration_minutes = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    allow_skip_section = serializers.BooleanField(required=False, default=True)
    lock_after_submit = serializers.BooleanField(required=False, default=False)
    difficulty_mix = AdvancedExamDifficultyMixSerializer()
    topics = AdvancedExamTopicCountSerializer(many=True, allow_empty=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        assigned_topic_count = sum(topic_row["count"] for topic_row in attrs["topics"])
        if assigned_topic_count != attrs["question_count"]:
            section_name = attrs.get("name", "This section")
            raise serializers.ValidationError(
                {
                    "topics": (
                        f'{section_name} has {assigned_topic_count} topic slot(s), '
                        f'but needs {attrs["question_count"]} question(s). '
                        "Topic counts must add up to the section question count."
                    )
                }
            )
        if attrs.get("timer_enabled") and not attrs.get("duration_minutes"):
            raise serializers.ValidationError(
                {"duration_minutes": "Section duration is required when section timer is enabled."}
            )
        return attrs


class AdvancedExamScopeSerializer(serializers.Serializer):
    institute_code = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        default="",
    )
    academic_year_name = serializers.CharField(max_length=50)
    program_code = serializers.CharField(max_length=50)
    cohort_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=50)
    subject_code = serializers.CharField(max_length=50)
    source_teacher_employee_code = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=50,
    )


class AdvancedExamMetadataSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    code = serializers.CharField(max_length=50)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    exam_type = serializers.ChoiceField(choices=Exam._meta.get_field("exam_type").choices)
    delivery_mode = serializers.ChoiceField(choices=Exam._meta.get_field("delivery_mode").choices)
    status = serializers.ChoiceField(
        choices=Exam._meta.get_field("status").choices,
        default=Exam._meta.get_field("status").default,
    )
    duration_minutes = serializers.IntegerField(min_value=1)
    passing_marks = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        required=False,
        default="0.00",
    )
    start_at = serializers.DateTimeField(required=False, allow_null=True)
    end_at = serializers.DateTimeField(required=False, allow_null=True)
    instructions = serializers.CharField(required=False, allow_blank=True, default="")
    replace_existing_code = serializers.BooleanField(required=False, default=False)
    source_type = serializers.ChoiceField(
        choices=Exam._meta.get_field("source_type").choices,
        required=False,
        allow_null=True,
    )


class AdvancedExamDeliverySerializer(serializers.Serializer):
    timer_mode = serializers.ChoiceField(
        choices=Exam._meta.get_field("timer_mode").choices,
        default=Exam._meta.get_field("timer_mode").default,
    )
    navigation_mode = serializers.ChoiceField(
        choices=Exam._meta.get_field("navigation_mode").choices,
        default=Exam._meta.get_field("navigation_mode").default,
    )
    attempt_policy = serializers.ChoiceField(
        choices=Exam._meta.get_field("attempt_policy").choices,
        default=Exam._meta.get_field("attempt_policy").default,
    )
    max_attempts = serializers.IntegerField(min_value=1, default=1)
    result_publish_mode = serializers.ChoiceField(
        choices=Exam._meta.get_field("result_publish_mode").choices,
        default=Exam._meta.get_field("result_publish_mode").default,
    )
    review_mode = serializers.ChoiceField(
        choices=Exam._meta.get_field("review_mode").choices,
        default=Exam._meta.get_field("review_mode").default,
    )
    security_mode = serializers.ChoiceField(
        choices=Exam._meta.get_field("security_mode").choices,
        default=Exam._meta.get_field("security_mode").default,
    )
    assignment_mode = serializers.ChoiceField(
        choices=Exam._meta.get_field("assignment_mode").choices,
        default=Exam._meta.get_field("assignment_mode").default,
    )
    allow_late_submit = serializers.BooleanField(required=False, default=False)
    randomize_questions = serializers.BooleanField(required=False, default=False)
    randomize_options = serializers.BooleanField(required=False, default=False)
    show_result_immediately = serializers.BooleanField(required=False, default=False)
    allow_review_after_submit = serializers.BooleanField(required=False, default=True)
    allow_resume = serializers.BooleanField(required=False, default=True)
    allow_section_switching = serializers.BooleanField(required=False, default=True)
    allow_return_to_previous_section = serializers.BooleanField(required=False, default=True)
    result_publish_at = serializers.DateTimeField(required=False, allow_null=True)
    review_available_from = serializers.DateTimeField(required=False, allow_null=True)
    review_available_until = serializers.DateTimeField(required=False, allow_null=True)
    rank_visibility_mode = serializers.ChoiceField(
        choices=[
            ("hidden", "Hidden"),
            ("provisional_after_submit", "Provisional After Submit"),
            ("final_after_exam_closure", "Final After Exam Closure"),
        ],
        required=False,
        default="hidden",
    )
    percentile_visibility_mode = serializers.ChoiceField(
        choices=[
            ("hidden", "Hidden"),
            ("provisional_after_submit", "Provisional After Submit"),
            ("final_after_exam_closure", "Final After Exam Closure"),
        ],
        required=False,
        default="hidden",
    )
    benchmark_visibility_mode = serializers.ChoiceField(
        choices=[
            ("hidden", "Hidden"),
            ("peer_average_only", "Peer Average Only"),
            ("peer_average_plus_percentile", "Peer Average Plus Percentile"),
        ],
        required=False,
        default="peer_average_only",
    )
    rank_freeze_policy = serializers.ChoiceField(
        choices=[
            ("rolling_until_exam_closure", "Rolling Until Exam Closure"),
            ("freeze_on_exam_closure", "Freeze On Exam Closure"),
        ],
        required=False,
        default="freeze_on_exam_closure",
    )


class AdvancedExamUnlockRuleSerializer(serializers.Serializer):
    rule_type = serializers.ChoiceField(
        choices=[
            ("", "None"),
            ("stars_balance", "Stars Balance"),
            ("entitlement", "Entitlement"),
            ("exam_completion", "Exam Completion"),
            ("score_threshold", "Score Threshold"),
            ("admin_approval", "Admin Approval"),
            ("composite", "Composite"),
        ],
        required=False,
        allow_blank=True,
        default="",
    )
    required_star_balance = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    required_entitlement_code = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=100,
    )
    required_completion_count = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    required_score_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    admin_override_allowed = serializers.BooleanField(required=False, default=True)
    priority = serializers.IntegerField(required=False, min_value=1, default=100)


class AdvancedExamEconomySerializer(serializers.Serializer):
    policy_type = serializers.ChoiceField(
        choices=[
            ("", "Open Access"),
            ("free", "Free"),
            ("stars_only", "Stars Only"),
            ("entitlement_only", "Entitlement Only"),
            ("stars_or_entitlement", "Stars Or Entitlement"),
        ],
        required=False,
        allow_blank=True,
        default="",
    )
    star_cost = serializers.IntegerField(required=False, min_value=0, default=0)
    entitlement_code = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=100,
    )
    priority = serializers.IntegerField(required=False, min_value=1, default=100)
    unlock_rule = AdvancedExamUnlockRuleSerializer(required=False, default=dict)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        policy_type = attrs.get("policy_type", "")
        if policy_type == "stars_only" and attrs.get("star_cost", 0) <= 0:
            raise serializers.ValidationError({"star_cost": "Star-cost policies require a positive cost."})
        if policy_type == "entitlement_only" and not attrs.get("entitlement_code", "").strip():
            raise serializers.ValidationError(
                {"entitlement_code": "Entitlement-only policies require an entitlement code."}
            )
        if policy_type == "stars_or_entitlement":
            errors = {}
            if attrs.get("star_cost", 0) <= 0:
                errors["star_cost"] = "Stars-or-entitlement policies require a positive star cost."
            if not attrs.get("entitlement_code", "").strip():
                errors["entitlement_code"] = "Stars-or-entitlement policies require an entitlement code."
            if errors:
                raise serializers.ValidationError(errors)
        return attrs


class AdvancedExamCompositionSerializer(serializers.Serializer):
    selection_mode = serializers.ChoiceField(
        choices=sorted((value, value.replace("_", " ").title()) for value in ADVANCED_EXAM_SELECTION_MODES),
        default="strict",
    )
    sections = AdvancedExamSectionBlueprintSerializer(many=True, allow_empty=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        section_orders = [section["order"] for section in attrs["sections"]]
        if len(section_orders) != len(set(section_orders)):
            raise serializers.ValidationError({"sections": "Section order values must be unique."})
        return attrs


class AdvancedExamBuilderSerializer(serializers.Serializer):
    scope = AdvancedExamScopeSerializer()
    exam = AdvancedExamMetadataSerializer()
    composition = AdvancedExamCompositionSerializer()
    delivery = AdvancedExamDeliverySerializer(required=False, default=dict)
    economy = AdvancedExamEconomySerializer(required=False, default=dict)


class AdvancedExamTemplateSerializer(serializers.ModelSerializer):
    created_by_teacher_name = serializers.CharField(
        source="created_by_teacher.full_name",
        read_only=True,
    )
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = AdvancedExamTemplate
        fields = (
            "id",
            "institute",
            "created_by_teacher",
            "created_by_teacher_name",
            "name",
            "description",
            "audience_context",
            "blueprint",
            "is_active",
            "can_manage",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "institute",
            "created_by_teacher",
            "created_by_teacher_name",
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):
        normalized = str(value or "").strip()
        if not normalized:
            raise serializers.ValidationError("Template name is required.")
        return normalized

    def validate_blueprint(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Blueprint must be a JSON object.")
        required_keys = {"exam", "delivery", "economy", "selectionMode", "sections"}
        missing = sorted(required_keys - set(value.keys()))
        if missing:
            raise serializers.ValidationError(
                f"Blueprint is missing required key(s): {', '.join(missing)}."
            )
        if not isinstance(value.get("sections"), list) or not value["sections"]:
            raise serializers.ValidationError("Blueprint must define at least one section.")
        return value

    def get_can_manage(self, obj):
        request = self.context.get("request")
        profile = get_account_profile(getattr(request, "user", None))
        if profile is None or not profile.is_active:
            return False
        if profile.role == "platform_admin":
            return True
        if profile.role == "institute_admin":
            return obj.audience_context == "institute" and profile.institute_id == obj.institute_id
        if profile.role == "teacher":
            return (
                obj.audience_context == "teacher"
                and profile.teacher_profile_id is not None
                and profile.teacher_profile_id == obj.created_by_teacher_id
            )
        return False


class ExamReadSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    cohort_name = serializers.CharField(source="cohort.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    sections = ExamSectionSerializer(many=True, read_only=True)
    assigned_students = ExamAssignedStudentSerializer(
        many=True,
        source="student_assignments",
        read_only=True,
    )
    assigned_student_count = serializers.SerializerMethodField()
    exam_questions = ExamQuestionSerializer(many=True, read_only=True)
    publish_logs = ExamPublishLogSerializer(many=True, read_only=True)
    active_questions_count = serializers.SerializerMethodField()
    security_policy = serializers.SerializerMethodField()
    economy_policy = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_teacher_name = serializers.CharField(source="source_teacher.full_name", read_only=True)
    rank_visibility_mode = serializers.SerializerMethodField()
    percentile_visibility_mode = serializers.SerializerMethodField()
    benchmark_visibility_mode = serializers.SerializerMethodField()
    rank_freeze_policy = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = "__all__"

    def get_active_questions_count(self, obj):
        return obj.exam_questions.filter(is_active=True).count()

    def get_assigned_student_count(self, obj):
        return obj.student_assignments.filter(is_active=True).count()

    def get_security_policy(self, obj):
        return resolve_security_policy(obj)

    def get_economy_policy(self, obj):
        policy = get_exam_access_policy(obj)
        if policy is None:
            return None

        return ExamEconomyPolicySerializer(
            {
                "id": policy.id,
                "content_type": policy.content_type,
                "content_key": policy.content_key,
                "content_label": policy.content_label,
                "policy_type": policy.policy_type,
                "star_cost": int(policy.star_cost or 0),
                "entitlement_code": policy.entitlement_code,
                "priority": policy.priority,
                "subject": policy.subject_id,
                "subject_name": getattr(policy.subject, "name", None),
                "is_active": policy.is_active,
                "created_at": policy.created_at,
                "updated_at": policy.updated_at,
            }
        ).data

    def get_source_label(self, obj):
        return resolve_exam_source_metadata(obj)["source_label"]

    def get_source_name(self, obj):
        return resolve_exam_source_metadata(obj)["source_name"]

    def get_rank_visibility_mode(self, obj):
        return resolve_exam_result_visibility_policy(obj)["rank_visibility_mode"]

    def get_percentile_visibility_mode(self, obj):
        return resolve_exam_result_visibility_policy(obj)["percentile_visibility_mode"]

    def get_benchmark_visibility_mode(self, obj):
        return resolve_exam_result_visibility_policy(obj)["benchmark_visibility_mode"]

    def get_rank_freeze_policy(self, obj):
        return resolve_exam_result_visibility_policy(obj)["rank_freeze_policy"]


class ExamListSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    cohort_name = serializers.CharField(source="cohort.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    assigned_student_count = serializers.SerializerMethodField()
    active_questions_count = serializers.SerializerMethodField()
    security_policy = serializers.SerializerMethodField()
    economy_policy = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_teacher_name = serializers.CharField(source="source_teacher.full_name", read_only=True)
    rank_visibility_mode = serializers.SerializerMethodField()
    percentile_visibility_mode = serializers.SerializerMethodField()
    benchmark_visibility_mode = serializers.SerializerMethodField()
    rank_freeze_policy = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = (
            "id",
            "institute",
            "academic_year",
            "program",
            "program_name",
            "cohort",
            "cohort_name",
            "subject",
            "subject_name",
            "title",
            "code",
            "description",
            "exam_type",
            "delivery_mode",
            "status",
            "duration_minutes",
            "total_marks",
            "passing_marks",
            "start_at",
            "end_at",
            "instructions",
            "allow_late_submit",
            "randomize_questions",
            "randomize_options",
            "show_result_immediately",
            "allow_review_after_submit",
            "max_attempts",
            "timer_mode",
            "navigation_mode",
            "attempt_policy",
            "result_publish_mode",
            "review_mode",
            "security_mode",
            "access_key",
            "access_key_enabled",
            "source_type",
            "source_label",
            "source_name",
            "source_teacher_name",
            "assignment_mode",
            "allow_resume",
            "allow_section_switching",
            "allow_return_to_previous_section",
            "result_publish_at",
            "review_available_from",
            "review_available_until",
            "rank_visibility_mode",
            "percentile_visibility_mode",
            "benchmark_visibility_mode",
            "rank_freeze_policy",
            "metadata",
            "assigned_student_count",
            "active_questions_count",
            "security_policy",
            "economy_policy",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_active_questions_count(self, obj):
        annotated = getattr(obj, "active_questions_count", None)
        if annotated is not None:
            return annotated
        return obj.exam_questions.filter(is_active=True).count()

    def get_assigned_student_count(self, obj):
        annotated = getattr(obj, "assigned_student_count", None)
        if annotated is not None:
            return annotated
        return obj.student_assignments.filter(is_active=True).count()

    def get_security_policy(self, obj):
        return resolve_security_policy(obj)

    def _serialize_economy_policy(self, policy):
        return ExamEconomyPolicySerializer(
            {
                "id": policy.id,
                "content_type": policy.content_type,
                "content_key": policy.content_key,
                "content_label": policy.content_label,
                "policy_type": policy.policy_type,
                "star_cost": int(policy.star_cost or 0),
                "entitlement_code": policy.entitlement_code,
                "priority": policy.priority,
                "subject": policy.subject_id,
                "subject_name": getattr(policy.subject, "name", None),
                "is_active": policy.is_active,
                "created_at": policy.created_at,
                "updated_at": policy.updated_at,
            }
        ).data

    def get_economy_policy(self, obj):
        policy = getattr(obj, "_resolved_access_policy", None)
        if policy is None:
            policy = get_exam_access_policy(obj)
        if policy is None:
            return None
        return self._serialize_economy_policy(policy)

    def get_source_label(self, obj):
        return resolve_exam_source_metadata(obj)["source_label"]

    def get_source_name(self, obj):
        return resolve_exam_source_metadata(obj)["source_name"]

    def get_rank_visibility_mode(self, obj):
        return resolve_exam_result_visibility_policy(obj)["rank_visibility_mode"]

    def get_percentile_visibility_mode(self, obj):
        return resolve_exam_result_visibility_policy(obj)["percentile_visibility_mode"]

    def get_benchmark_visibility_mode(self, obj):
        return resolve_exam_result_visibility_policy(obj)["benchmark_visibility_mode"]

    def get_rank_freeze_policy(self, obj):
        return resolve_exam_result_visibility_policy(obj)["rank_freeze_policy"]


class StudentExamQuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ("id", "content_format", "option_text", "option_order", "is_active")


class StudentExamQuestionAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = QuestionAttachment
        fields = (
            "id",
            "file",
            "file_url",
            "attachment_type",
            "title",
            "display_order",
            "alt_text",
            "is_inline",
            "is_active",
        )

    def get_file_url(self, obj):
        try:
            return obj.file.url
        except ValueError:
            return ""


class StudentExamQuestionDetailSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    section_title = serializers.CharField(source="section.name", read_only=True)
    section_order = serializers.IntegerField(source="section.section_order", read_only=True)
    question_order = serializers.SerializerMethodField()

    class Meta:
        model = ExamQuestion
        fields = (
            "id",
            "exam",
            "question",
            "section",
            "section_title",
            "section_order",
            "question_text_summary",
            "section_name",
            "question_order",
            "marks",
            "negative_marks",
            "is_mandatory",
            "is_active",
            "created_at",
            "updated_at",
            "question_text",
            "question_type",
            "content_format",
            "options",
            "attachments",
        )

    question_text_summary = serializers.SerializerMethodField()
    question_text = serializers.CharField(source="question.question_text", read_only=True)
    question_type = serializers.CharField(source="question.question_type", read_only=True)
    content_format = serializers.CharField(source="question.content_format", read_only=True)

    def get_question_text_summary(self, obj):
        text = obj.question.question_text.strip()
        return text[:120] + ("..." if len(text) > 120 else "")

    def get_question_order(self, obj):
        order_map = self.context.get("question_order_map", {})
        if isinstance(order_map, dict):
            value = order_map.get(str(obj.id))
            if value is not None:
                return value
        return obj.question_order

    def get_options(self, obj):
        options = list(
            obj.question.options.filter(is_active=True).order_by(
                "option_order",
                "created_at",
            )
        )
        attempt = self.context.get("attempt")
        if attempt is not None:
            from apps.attempts.services import ordered_options_for_attempt

            options = ordered_options_for_attempt(attempt, obj.question, options)
        rows = StudentExamQuestionOptionSerializer(options, many=True).data
        for index, row in enumerate(rows, start=1):
            row["option_order"] = index
        return rows

    def get_attachments(self, obj):
        attachments = obj.question.attachments.filter(is_active=True).order_by("display_order", "created_at")
        return StudentExamQuestionAttachmentSerializer(attachments, many=True).data


class StudentExamDetailSerializer(ExamReadSerializer):
    exam_questions = StudentExamQuestionDetailSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop("access_key", None)
        return data


class StudentExamAvailabilitySerializer(serializers.ModelSerializer):
    exam_type = serializers.CharField(read_only=True)
    attempt_policy = serializers.CharField(read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    server_time = serializers.SerializerMethodField()
    attempts_used = serializers.SerializerMethodField()
    remaining_attempts = serializers.SerializerMethodField()
    active_attempt = serializers.SerializerMethodField()
    availability_state = serializers.SerializerMethodField()
    starts_in_seconds = serializers.SerializerMethodField()
    ends_in_seconds = serializers.SerializerMethodField()
    can_start = serializers.SerializerMethodField()
    can_resume = serializers.SerializerMethodField()
    review_available = serializers.SerializerMethodField()
    result_published = serializers.SerializerMethodField()
    result_status = serializers.SerializerMethodField()
    latest_attempt_status = serializers.SerializerMethodField()
    assignment_mode = serializers.CharField(read_only=True)
    assigned_to_student = serializers.SerializerMethodField()
    security_policy = serializers.SerializerMethodField()
    economy_access = serializers.SerializerMethodField()
    source_type = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_teacher_id = serializers.SerializerMethodField()
    source_teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = (
            "id",
            "title",
            "code",
            "exam_type",
            "attempt_policy",
            "access_key_enabled",
            "status",
            "subject_name",
            "duration_minutes",
            "start_at",
            "end_at",
            "total_marks",
            "passing_marks",
            "instructions",
            "security_mode",
            "security_policy",
            "server_time",
            "attempts_used",
            "remaining_attempts",
            "active_attempt",
            "availability_state",
            "starts_in_seconds",
            "ends_in_seconds",
            "can_start",
            "can_resume",
            "review_available",
            "result_published",
            "result_status",
            "latest_attempt_status",
            "assignment_mode",
            "assigned_to_student",
            "source_type",
            "source_label",
            "source_name",
            "source_teacher_id",
            "source_teacher_name",
            "economy_access",
        )

    def _student(self):
        request = self.context.get("request")
        profile = getattr(getattr(request, "user", None), "account_profile", None)
        return getattr(profile, "student_profile", None)

    def _economy_access(self, obj):
        cache = self.context.setdefault("_exam_economy_access_cache", {})
        cache_key = str(obj.id)
        if cache_key not in cache:
            student = self._student()
            if student is None:
                target = build_exam_content_target(obj)
                cache[cache_key] = {
                    "content_type": target["content_type"],
                    "content_key": target["content_key"],
                    "subject_id": str(target["subject"].id) if target["subject"] is not None else None,
                    "content_label": obj.title,
                    "policy_type": None,
                    "star_cost": 0,
                    "requires_unlock": False,
                    "can_unlock_with_stars": False,
                    "is_unlocked": True,
                    "is_locked": False,
                    "lock_reason_code": "",
                    "lock_reason_message": "",
                    "unlock_state_status": "",
                }
            else:
                cache[cache_key] = resolve_exam_economy_access(student, obj)
        return cache[cache_key]

    def _student_attempts(self, obj):
        student = self._student()
        if student is None:
            return []
        from apps.attempts.services import sync_attempt_access_state

        return [
            sync_attempt_access_state(attempt)
            for attempt in getattr(obj, "_prefetched_attempts_for_student", [])
            if attempt.student_id == student.id
        ]

    def _latest_attempt(self, obj):
        attempts = sorted(
            self._student_attempts(obj),
            key=lambda attempt: (attempt.attempt_no, attempt.created_at),
            reverse=True,
        )
        return attempts[0] if attempts else None

    def _active_attempt(self, obj):
        for attempt in self._student_attempts(obj):
            if attempt.status == "in_progress" and attempt.is_active:
                return attempt
        return None

    def _availability_state_value(self, obj):
        student = self._student()
        if student is not None and not is_exam_assigned_to_student(obj, student):
            return "not_assigned"
        now = timezone.now()
        latest_attempt = self._latest_attempt(obj)
        if latest_attempt and latest_attempt.status == "in_progress":
            return "available_now"
        if latest_attempt and latest_attempt.status in {"submitted", "auto_submitted"}:
            if self.get_remaining_attempts(obj) <= 0:
                return "completed"
        if obj.end_at and now > obj.end_at:
            if latest_attempt and latest_attempt.status in {"submitted", "auto_submitted"}:
                return "completed"
            return "missed"
        if obj.start_at and now < obj.start_at:
            return "upcoming"
        if obj.status in {"scheduled", "live"} and obj.is_active:
            return "available_now"
        if latest_attempt and latest_attempt.status in {"submitted", "auto_submitted"}:
            return "completed"
        return "completed"

    def get_server_time(self, obj):
        return timezone.now()

    def get_attempts_used(self, obj):
        return len(self._student_attempts(obj))

    def get_remaining_attempts(self, obj):
        return remaining_attempts_for_student(obj, self.get_attempts_used(obj))

    def get_active_attempt(self, obj):
        attempt = self._active_attempt(obj)
        if attempt is None:
            return None
        from apps.attempts.services import refresh_attempt_runtime_state

        refresh_attempt_runtime_state(attempt)
        metadata = attempt.metadata if isinstance(attempt.metadata, dict) else {}
        section_runtime = metadata.get("section_runtime", {})
        if not isinstance(section_runtime, dict):
            section_runtime = {}
        current_section_id = section_runtime.get("current_section_id")
        current_section = None
        if current_section_id:
            current_section = obj.sections.filter(
                pk=current_section_id,
                is_active=True,
            ).first()
        return {
            "id": str(attempt.id),
            "status": attempt.status,
            "started_at": attempt.started_at,
            "expires_at": attempt.expires_at,
            "section_runtime": {
                "current_section_id": current_section_id,
                "current_section_name": getattr(current_section, "name", None),
                "current_section_order": getattr(current_section, "section_order", None),
                "current_section_started_at": section_runtime.get("current_section_started_at"),
                "current_section_expires_at": section_runtime.get("current_section_expires_at"),
                "current_section_timer_enabled": section_runtime.get(
                    "current_section_timer_enabled",
                    False,
                ),
                "visited_section_ids": section_runtime.get("visited_section_ids", []),
                "highest_section_order_reached": section_runtime.get(
                    "highest_section_order_reached"
                ),
            },
        }

    def get_starts_in_seconds(self, obj):
        if not obj.start_at:
            return None
        return int((obj.start_at - timezone.now()).total_seconds())

    def get_ends_in_seconds(self, obj):
        if not obj.end_at:
            return None
        return int((obj.end_at - timezone.now()).total_seconds())

    def get_can_start(self, obj):
        return (
            self._availability_state_value(obj) == "available_now"
            and not self._economy_access(obj)["is_locked"]
            and self._active_attempt(obj) is None
            and self.get_remaining_attempts(obj) > 0
        )

    def get_can_resume(self, obj):
        return self._active_attempt(obj) is not None

    def get_review_available(self, obj):
        latest_attempt = self._latest_attempt(obj)
        if latest_attempt is None:
            return False
        result = getattr(latest_attempt, "result", None)
        return is_review_available_for_attempt(obj, latest_attempt, result=result)

    def get_result_published(self, obj):
        latest_attempt = self._latest_attempt(obj)
        result = getattr(latest_attempt, "result", None) if latest_attempt else None
        return bool(result and result.is_published)

    def get_result_status(self, obj):
        latest_attempt = self._latest_attempt(obj)
        result = getattr(latest_attempt, "result", None) if latest_attempt else None
        return getattr(result, "result_status", None)

    def get_latest_attempt_status(self, obj):
        latest_attempt = self._latest_attempt(obj)
        return latest_attempt.status if latest_attempt else None

    def get_assigned_to_student(self, obj):
        student = self._student()
        if student is None:
            return False
        return is_exam_assigned_to_student(obj, student)

    def get_security_policy(self, obj):
        return resolve_security_policy(obj)

    def get_economy_access(self, obj):
        return self._economy_access(obj)

    def get_availability_state(self, obj):
        base_state = self._availability_state_value(obj)
        if base_state == "available_now" and self._economy_access(obj)["is_locked"]:
            return "locked"
        return base_state

    def get_source_type(self, obj):
        return resolve_exam_source_metadata(obj)["source_type"]

    def get_source_label(self, obj):
        return resolve_exam_source_metadata(obj)["source_label"]

    def get_source_name(self, obj):
        return resolve_exam_source_metadata(obj)["source_name"]

    def get_source_teacher_id(self, obj):
        return resolve_exam_source_metadata(obj)["teacher_id"]

    def get_source_teacher_name(self, obj):
        return resolve_exam_source_metadata(obj)["teacher_name"]


class StudentExamReadinessSerializer(StudentExamDetailSerializer):
    def _availability_serializer(self, obj):
        return StudentExamAvailabilitySerializer(
            obj,
            context=self.context,
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        availability = self._availability_serializer(instance)
        data.update(
            {
                "server_time": timezone.now(),
                "active_attempt": availability.get_active_attempt(instance),
                "attempts_used": availability.get_attempts_used(instance),
                "remaining_attempts": availability.get_remaining_attempts(instance),
                "review_available": availability.get_review_available(instance),
                "result_published": availability.get_result_published(instance),
                "result_status": availability.get_result_status(instance),
                "availability_state": availability.get_availability_state(instance),
                "security_policy": availability.get_security_policy(instance),
                "economy_access": availability.get_economy_access(instance),
            }
        )
        return data


class TeacherExamPreviewSerializer(StudentExamDetailSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.update(
            {
                "server_time": timezone.now(),
                "active_attempt": None,
                "attempts_used": 0,
                "remaining_attempts": remaining_attempts_for_student(instance, 0),
                "review_available": False,
                "result_published": False,
                "result_status": None,
                "security_policy": resolve_security_policy(instance),
                "availability_state": (
                    "upcoming"
                    if instance.start_at and instance.start_at > timezone.now()
                    else "available_now"
                ),
            }
        )
        return data


class ExamActionSerializer(serializers.Serializer):
    changed_by = serializers.UUIDField(required=False)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_changed_by(self, value):
        from apps.teachers.models import TeacherProfile

        try:
            return TeacherProfile.objects.get(pk=value)
        except TeacherProfile.DoesNotExist as exc:
            raise serializers.ValidationError("Teacher not found.") from exc


class ExamSyncMarksResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = ("id", "title", "code", "total_marks", "status", "updated_at")
