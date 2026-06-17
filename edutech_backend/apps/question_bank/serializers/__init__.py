from django.db import transaction
from rest_framework import serializers

from apps.academics.services import QUESTION_DIFFICULTY_NAMESPACE, validate_option_catalog_code
from apps.academics.models import Topic
from apps.question_bank.models import (
    Question,
    QuestionAttachment,
    QuestionOption,
    QuestionTag,
    QuestionTagMap,
)
from apps.question_bank.services import (
    QUESTION_TYPES_WITH_OPTIONS,
    IMPORT_TEMPLATE_COLUMNS,
    sync_master_question_from_institute_question,
    validate_question_options,
)


class QuestionOptionSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

    class Meta:
        model = QuestionOption
        fields = (
            "id",
            "question",
            "content_format",
            "option_text",
            "option_order",
            "is_correct",
            "is_active",
        )
        read_only_fields = ("question",)


class QuestionTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionTag
        fields = "__all__"


class QuestionTagMapSerializer(serializers.ModelSerializer):
    tag_detail = QuestionTagSerializer(source="tag", read_only=True)

    class Meta:
        model = QuestionTagMap
        fields = ("id", "question", "tag", "tag_detail", "is_active", "created_at", "updated_at")


class QuestionAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = QuestionAttachment
        fields = (
            "id",
            "question",
            "file",
            "file_url",
            "attachment_type",
            "title",
            "display_order",
            "alt_text",
            "is_inline",
            "is_active",
            "created_at",
            "updated_at",
        )

    def get_file_url(self, obj):
        try:
            return obj.file.url
        except ValueError:
            return ""


class QuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, required=False)
    tag_maps = QuestionTagMapSerializer(many=True, read_only=True)
    attachments = QuestionAttachmentSerializer(many=True, read_only=True)
    usage_count = serializers.IntegerField(read_only=True, default=0)
    correct_count = serializers.IntegerField(read_only=True, default=0)
    wrong_count = serializers.IntegerField(read_only=True, default=0)
    skipped_count = serializers.IntegerField(read_only=True, default=0)
    correct_attempt_percentage = serializers.SerializerMethodField()
    wrong_attempt_percentage = serializers.SerializerMethodField()
    skip_percentage = serializers.SerializerMethodField()
    has_explanation = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = (
            "id",
            "institute",
            "program",
            "subject",
            "topic",
            "created_by_teacher",
            "question_type",
            "difficulty_level",
            "content_format",
            "question_text",
            "explanation",
            "default_marks",
            "negative_marks",
            "is_active",
            "is_verified",
            "metadata",
            "options",
            "tag_maps",
            "attachments",
            "usage_count",
            "correct_count",
            "wrong_count",
            "skipped_count",
            "correct_attempt_percentage",
            "wrong_attempt_percentage",
            "skip_percentage",
            "has_explanation",
            "created_at",
            "updated_at",
        )

    def get_correct_attempt_percentage(self, obj):
        usage = getattr(obj, "usage_count", 0) or 0
        if not usage:
            return "0.00"
        return f"{(getattr(obj, 'correct_count', 0) / usage) * 100:.2f}"

    def get_wrong_attempt_percentage(self, obj):
        usage = getattr(obj, "usage_count", 0) or 0
        if not usage:
            return "0.00"
        return f"{(getattr(obj, 'wrong_count', 0) / usage) * 100:.2f}"

    def get_skip_percentage(self, obj):
        usage = getattr(obj, "usage_count", 0) or 0
        if not usage:
            return "0.00"
        return f"{(getattr(obj, 'skipped_count', 0) / usage) * 100:.2f}"

    def get_has_explanation(self, obj):
        return bool((obj.explanation or "").strip())

    def validate(self, attrs):
        options_payload = attrs.pop("options", serializers.empty)
        instance = getattr(self, "instance", None)
        question_type = attrs.get("question_type", getattr(instance, "question_type", None))

        if options_payload is serializers.empty:
            if instance is not None and question_type in QUESTION_TYPES_WITH_OPTIONS:
                existing_options = list(instance.options.filter(is_active=True))
                validate_question_options(question_type, existing_options)
            elif instance is None and question_type in QUESTION_TYPES_WITH_OPTIONS:
                raise serializers.ValidationError(
                    {"options": "Options are required for MCQ and True/False questions."}
                )
            elif instance is not None and question_type == "short_answer":
                existing_options = list(instance.options.filter(is_active=True))
                validate_question_options(question_type, existing_options)
        else:
            validate_question_options(question_type, options_payload)
            attrs["options"] = options_payload

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        question = Question.objects.create(**validated_data)
        self._replace_options(question, options_data)
        sync_master_question_from_institute_question(question)
        return question

    @transaction.atomic
    def update(self, instance, validated_data):
        options_data = validated_data.pop("options", serializers.empty)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if options_data is not serializers.empty:
            self._replace_options(instance, options_data)

        sync_master_question_from_institute_question(instance)
        return instance

    def _replace_options(self, question, options_data):
        existing_options = {str(option.id): option for option in question.options.all()}
        seen_option_ids = set()

        for option_data in options_data:
            option_id = str(option_data.pop("id", "")) if option_data.get("id") else None
            if option_id and option_id in existing_options:
                option = existing_options[option_id]
                for attr, value in option_data.items():
                    setattr(option, attr, value)
                option.question = question
                option.save()
                seen_option_ids.add(option_id)
            else:
                QuestionOption.objects.create(question=question, **option_data)

        stale_option_ids = set(existing_options.keys()) - seen_option_ids
        if stale_option_ids:
            question.options.filter(id__in=stale_option_ids).update(is_active=False)


class QuestionListSerializer(serializers.ModelSerializer):
    usage_count = serializers.IntegerField(read_only=True, default=0)
    correct_count = serializers.IntegerField(read_only=True, default=0)
    wrong_count = serializers.IntegerField(read_only=True, default=0)
    skipped_count = serializers.IntegerField(read_only=True, default=0)
    option_count = serializers.IntegerField(read_only=True, default=0)
    correct_option_count = serializers.IntegerField(read_only=True, default=0)
    attachment_count = serializers.IntegerField(read_only=True, default=0)
    tag_count = serializers.IntegerField(read_only=True, default=0)
    has_explanation = serializers.SerializerMethodField()
    wrong_attempt_percentage = serializers.SerializerMethodField()
    skip_percentage = serializers.SerializerMethodField()
    is_quality_ready = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = (
            "id",
            "institute",
            "program",
            "subject",
            "topic",
            "question_type",
            "difficulty_level",
            "content_format",
            "question_text",
            "explanation",
            "default_marks",
            "negative_marks",
            "is_active",
            "is_verified",
            "metadata",
            "usage_count",
            "correct_count",
            "wrong_count",
            "skipped_count",
            "option_count",
            "correct_option_count",
            "attachment_count",
            "tag_count",
            "has_explanation",
            "wrong_attempt_percentage",
            "skip_percentage",
            "is_quality_ready",
        )
        read_only_fields = fields

    def get_has_explanation(self, obj):
        return bool((obj.explanation or "").strip())

    def get_wrong_attempt_percentage(self, obj):
        usage = getattr(obj, "usage_count", 0) or 0
        if not usage:
            return "0.00"
        return f"{(getattr(obj, 'wrong_count', 0) / usage) * 100:.2f}"

    def get_skip_percentage(self, obj):
        usage = getattr(obj, "usage_count", 0) or 0
        if not usage:
            return "0.00"
        return f"{(getattr(obj, 'skipped_count', 0) / usage) * 100:.2f}"

    def get_is_quality_ready(self, obj):
        has_explanation = self.get_has_explanation(obj)
        correct_option_count = getattr(obj, "correct_option_count", 0) or 0
        option_count = getattr(obj, "option_count", 0) or 0

        if obj.question_type == "short_answer":
            return has_explanation
        if obj.question_type == "true_false":
            return has_explanation and correct_option_count > 0 and option_count == 2
        return has_explanation and correct_option_count > 0 and option_count >= 2


class QuestionImportPreviewRowSerializer(serializers.Serializer):
    row_number = serializers.IntegerField()
    status = serializers.CharField()
    question_text = serializers.CharField(allow_blank=True)
    subject_name = serializers.CharField(allow_blank=True)
    topic_name = serializers.CharField(allow_blank=True)
    question_type = serializers.CharField()
    difficulty_level = serializers.CharField()
    tag_values = serializers.ListField(child=serializers.CharField(), required=False)
    errors = serializers.DictField(required=False)


class QuestionImportPreviewResponseSerializer(serializers.Serializer):
    total_rows = serializers.IntegerField()
    valid_rows = serializers.IntegerField()
    invalid_rows = serializers.IntegerField()
    rows = QuestionImportPreviewRowSerializer(many=True)


class QuestionBulkActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=(
            "delete",
            "activate",
            "deactivate",
            "assign_tag",
            "set_topic",
            "set_difficulty",
        )
    )
    question_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    tag = serializers.UUIDField(required=False)
    topic = serializers.UUIDField(required=False, allow_null=True)
    difficulty_level = serializers.CharField(required=False)

    def validate(self, attrs):
        action = attrs["action"]
        if action == "assign_tag" and not attrs.get("tag"):
            raise serializers.ValidationError({"tag": "Tag is required for assign_tag."})
        if action == "set_difficulty" and not attrs.get("difficulty_level"):
            raise serializers.ValidationError(
                {"difficulty_level": "Difficulty is required for set_difficulty."}
            )
        if action == "set_topic" and "topic" not in attrs:
            raise serializers.ValidationError({"topic": "Topic must be provided for set_topic."})
        if action == "set_difficulty" and attrs.get("difficulty_level"):
            attrs["difficulty_level"] = validate_option_catalog_code(
                QUESTION_DIFFICULTY_NAMESPACE,
                attrs["difficulty_level"],
                "difficulty_level",
            )
        return attrs


class QuestionImportFinalizeSerializer(serializers.Serializer):
    preview_rows = QuestionImportPreviewRowSerializer(many=True)
    valid_payloads = serializers.ListField(child=serializers.DictField(), allow_empty=True)


class QuestionImportTemplateSerializer(serializers.Serializer):
    columns = serializers.ListField(child=serializers.CharField(), default=IMPORT_TEMPLATE_COLUMNS)
    csv_content = serializers.CharField()
