from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from apps.academics.assessment_family_contracts import (
    validate_program_assessment_family_question_contract,
)
from apps.academics.services import QUESTION_DIFFICULTY_NAMESPACE, validate_option_catalog_code
from apps.academics.models import Topic
from apps.question_bank.models import (
    ContentFormat,
    Question,
    QuestionAttachment,
    QuestionOption,
    QuestionPassage,
    QuestionType,
    QuestionTag,
    QuestionTagMap,
)
from apps.question_bank.media import validate_question_attachment_file
from apps.question_bank.registry import (
    get_question_type_definition,
    get_question_type_definition_payload,
    question_type_supports_accepted_answers,
    question_type_supports_numeric_tolerance,
    question_type_supports_options,
    question_type_supports_review_guidance,
    question_type_supports_text_answer,
)
from apps.question_bank.rich_text import sanitize_content_by_format
from apps.question_bank.services import (
    IMPORT_PASSAGE_TEMPLATE_COLUMNS,
    IMPORT_TEMPLATE_COLUMNS,
    sync_master_question_from_institute_question,
    validate_academic_mapping,
    validate_question_passage_assignment,
    validate_question_options,
)
from decimal import Decimal, InvalidOperation


FILL_IN_BLANKS_MARKER = "[[blank]]"
ASSERTION_REASON_DEFAULT_OPTIONS = [
    "Both Assertion and Reason are true, and Reason is the correct explanation of Assertion.",
    "Both Assertion and Reason are true, but Reason is not the correct explanation of Assertion.",
    "Assertion is true, but Reason is false.",
    "Assertion is false, but Reason is true.",
]


def _decimal_string(value):
    if isinstance(value, Decimal):
        return format(value.quantize(Decimal("0.01")), "f")
    decimal_value = Decimal(str(value))
    return format(decimal_value.quantize(Decimal("0.01")), "f")


def _normalized_accepted_answers(values):
    normalized = []
    for value in values or []:
        text = str(value or "").strip()
        if text and text not in normalized:
            normalized.append(text)
    return normalized


def _extract_accepted_answers(metadata):
    if not isinstance(metadata, dict):
        return []
    return _normalized_accepted_answers(metadata.get("accepted_answers", []))


def _extract_numeric_tolerance(metadata):
    if not isinstance(metadata, dict):
        return None
    numeric_validation = metadata.get("numeric_validation", {})
    if not isinstance(numeric_validation, dict):
        return None
    tolerance = numeric_validation.get("tolerance")
    if tolerance in (None, ""):
        return None
    return str(tolerance)


def _fill_in_blanks_marker_count(question_text):
    return str(question_text or "").lower().count(FILL_IN_BLANKS_MARKER)


def _extract_assertion_reason(metadata):
    if not isinstance(metadata, dict):
        return "", ""
    payload = metadata.get("assertion_reason", {})
    if not isinstance(payload, dict):
        return "", ""
    return str(payload.get("assertion_text", "") or ""), str(payload.get("reason_text", "") or "")


def _normalized_text_list(values):
    normalized = []
    for value in values or []:
        text = str(value or "").strip()
        if text:
            normalized.append(text)
    return normalized


def _extract_matrix_match(metadata):
    if not isinstance(metadata, dict):
        return [], []
    payload = metadata.get("matrix_match", {})
    if not isinstance(payload, dict):
        return [], []
    return (
        _normalized_text_list(payload.get("left_items", [])),
        _normalized_text_list(payload.get("right_items", [])),
    )


def _extract_rubric_criteria(metadata):
    if not isinstance(metadata, dict):
        return []
    rubric = metadata.get("rubric", {})
    if not isinstance(rubric, dict):
        return []
    criteria = rubric.get("criteria", [])
    if not isinstance(criteria, list):
        return []

    normalized = []
    for index, criterion in enumerate(criteria):
        if not isinstance(criterion, dict):
            continue
        key = str(criterion.get("key", "") or "").strip()
        label = str(criterion.get("label", "") or "").strip()
        max_score = criterion.get("max_score")
        reviewer_hint = str(criterion.get("reviewer_hint", "") or "").strip()
        display_order = criterion.get("display_order", index + 1)
        band_descriptors = criterion.get("band_descriptors", [])
        if not key or not label or max_score in (None, ""):
            continue
        normalized.append(
            {
                "key": key,
                "label": label,
                "max_score": str(max_score),
                "display_order": display_order,
                "reviewer_hint": reviewer_hint,
                "band_descriptors": band_descriptors if isinstance(band_descriptors, list) else [],
            }
        )
    return normalized


def _attempt_rate(count, usage_count):
    usage = int(usage_count or 0)
    if usage <= 0:
        return 0.0
    return round((int(count or 0) / usage) * 100, 2)


def _question_quality_payload(obj):
    usage_count = getattr(obj, "usage_count", 0) or 0
    wrong_count = getattr(obj, "wrong_count", 0) or 0
    skipped_count = getattr(obj, "skipped_count", 0) or 0
    correct_count = getattr(obj, "correct_count", 0) or 0

    wrong_rate = _attempt_rate(wrong_count, usage_count)
    skip_rate = _attempt_rate(skipped_count, usage_count)
    correct_rate = _attempt_rate(correct_count, usage_count)

    if usage_count < 3:
        quality_signal = "emerging"
        revision_priority = "watch"
        quality_note = "Needs more live attempts before editorial decisions become reliable."
    elif wrong_rate >= 60 and skip_rate >= 20:
        quality_signal = "ambiguous"
        revision_priority = "urgent"
        quality_note = "High wrong and skip rates suggest confusing wording, weak distractors, or a scope mismatch."
    elif wrong_rate >= 70:
        quality_signal = "revision_candidate"
        revision_priority = "high"
        quality_note = "Learners are missing this question often. Review explanation quality, keying, and distractor balance."
    elif skip_rate >= 45:
        quality_signal = "skip_risk"
        revision_priority = "high"
        quality_note = "Students skip this question frequently. Tighten prompt clarity or break the task into simpler steps."
    elif wrong_rate >= 45:
        quality_signal = "hard"
        revision_priority = "medium"
        quality_note = "This is behaving like a difficult item. Validate whether the challenge is intentional for the target exam."
    elif wrong_rate >= 30 or skip_rate >= 25:
        quality_signal = "watch"
        revision_priority = "watch"
        quality_note = "Performance is acceptable but should stay on the editorial watchlist."
    else:
        quality_signal = "healthy"
        revision_priority = "none"
        quality_note = "Attempt patterns look healthy for current usage."

    return {
        "correct_rate": correct_rate,
        "wrong_rate": wrong_rate,
        "skip_rate": skip_rate,
        "quality_signal": quality_signal,
        "revision_priority": revision_priority,
        "quality_note": quality_note,
    }


def _normalize_rubric_criteria(value, *, question_type, default_marks):
    if value is serializers.empty or value is None or value == "":
        return serializers.empty

    if not question_type_supports_review_guidance(question_type):
        if value:
            raise serializers.ValidationError(
                {"rubric_criteria": "Rubric criteria are only supported for essay manual-review questions."}
            )
        return []

    if not isinstance(value, list):
        raise serializers.ValidationError({"rubric_criteria": "Rubric criteria must be provided as a list."})

    normalized = []
    seen_keys = set()
    total = Decimal("0.00")

    for index, criterion in enumerate(value):
        if not isinstance(criterion, dict):
            raise serializers.ValidationError(
                {"rubric_criteria": f"Criterion {index + 1} must be an object."}
            )

        key = str(criterion.get("key", "") or "").strip()
        label = str(criterion.get("label", "") or "").strip()
        reviewer_hint = str(criterion.get("reviewer_hint", "") or "").strip()
        band_descriptors = criterion.get("band_descriptors", [])
        display_order = criterion.get("display_order", index + 1)

        if not key:
            raise serializers.ValidationError({"rubric_criteria": f"Criterion {index + 1} must include a key."})
        if key in seen_keys:
            raise serializers.ValidationError({"rubric_criteria": f"Criterion key '{key}' is duplicated."})
        if not label:
            raise serializers.ValidationError({"rubric_criteria": f"Criterion {index + 1} must include a label."})

        try:
            max_score = Decimal(str(criterion.get("max_score", "") or ""))
        except (InvalidOperation, TypeError, ValueError):
            raise serializers.ValidationError(
                {"rubric_criteria": f"Criterion {index + 1} max_score must be a valid number."}
            )
        if max_score <= 0:
            raise serializers.ValidationError(
                {"rubric_criteria": f"Criterion {index + 1} max_score must be greater than zero."}
            )

        try:
            display_order_value = int(display_order)
        except (TypeError, ValueError):
            raise serializers.ValidationError(
                {"rubric_criteria": f"Criterion {index + 1} display_order must be an integer."}
            )

        normalized.append(
            {
                "key": key,
                "label": label,
                "max_score": _decimal_string(max_score),
                "display_order": display_order_value,
                "reviewer_hint": reviewer_hint,
                "band_descriptors": band_descriptors if isinstance(band_descriptors, list) else [],
            }
        )
        seen_keys.add(key)
        total += max_score

    if not normalized:
        return []

    try:
        max_marks = Decimal(str(default_marks or "0.00"))
    except (InvalidOperation, TypeError, ValueError):
        max_marks = Decimal("0.00")

    if total != max_marks:
        raise serializers.ValidationError(
            {
                "rubric_criteria": (
                    f"Rubric criteria total {_decimal_string(total)} must match question marks "
                    f"{_decimal_string(max_marks)}."
                )
            }
        )

    return normalized


class QuestionOptionSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    selected_count = serializers.IntegerField(read_only=True, default=0)
    selected_correct_count = serializers.IntegerField(read_only=True, default=0)
    selected_wrong_count = serializers.IntegerField(read_only=True, default=0)
    selection_rate = serializers.SerializerMethodField()
    distractor_signal = serializers.SerializerMethodField()
    distractor_note = serializers.SerializerMethodField()

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
            "selected_count",
            "selected_correct_count",
            "selected_wrong_count",
            "selection_rate",
            "distractor_signal",
            "distractor_note",
        )
        read_only_fields = ("question",)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        content_format = attrs.get("content_format", getattr(self.instance, "content_format", ContentFormat.MARKDOWN_LATEX))
        attrs["option_text"] = sanitize_content_by_format(content_format, attrs.get("option_text", ""))
        return attrs

    def get_selection_rate(self, obj):
        question = getattr(obj, "question", None)
        usage_count = getattr(question, "usage_count", 0) or 0
        return _attempt_rate(getattr(obj, "selected_count", 0) or 0, usage_count)

    def get_distractor_signal(self, obj):
        selected_count = getattr(obj, "selected_count", 0) or 0
        selected_correct_count = getattr(obj, "selected_correct_count", 0) or 0
        selected_wrong_count = getattr(obj, "selected_wrong_count", 0) or 0
        selection_rate = self.get_selection_rate(obj)

        if obj.is_correct:
            if selected_correct_count >= max(selected_wrong_count, 1):
                return "validated_key"
            return "key_review"
        if selected_wrong_count == 0 and selected_count == 0:
            return "untested_distractor"
        if selected_wrong_count == 0:
            return "weak_distractor"
        if selection_rate >= 35:
            return "strong_distractor"
        if selection_rate >= 15:
            return "working_distractor"
        return "light_distractor"

    def get_distractor_note(self, obj):
        signal = self.get_distractor_signal(obj)
        if signal == "validated_key":
            return "Students are finding the keyed answer reliably."
        if signal == "key_review":
            return "The keyed answer is not separating learners cleanly. Recheck wording and scoring."
        if signal == "untested_distractor":
            return "This distractor has not attracted any responses yet."
        if signal == "weak_distractor":
            return "This distractor exists but rarely captures wrong answers. Consider rewriting it."
        if signal == "strong_distractor":
            return "This distractor is pulling a large share of wrong responses and may reveal a misconception."
        if signal == "working_distractor":
            return "This distractor is doing useful separation work."
        return "This distractor is lightly used and can be monitored over more attempts."


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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        attachment_type = attrs.get("attachment_type", getattr(self.instance, "attachment_type", None))
        uploaded_file = attrs.get("file", getattr(self.instance, "file", None))
        validate_question_attachment_file(uploaded_file=uploaded_file, attachment_type=attachment_type)
        return attrs


class QuestionPassageQuestionSerializer(serializers.ModelSerializer):
    question_type_definition = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = (
            "id",
            "question_type",
            "question_type_definition",
            "difficulty_level",
            "question_text",
            "default_marks",
            "negative_marks",
            "passage_order",
            "is_active",
            "is_verified",
        )
        read_only_fields = fields

    def get_question_type_definition(self, obj):
        return get_question_type_definition_payload(obj.question_type)


class QuestionPassageSerializer(serializers.ModelSerializer):
    linked_questions = QuestionPassageQuestionSerializer(
        many=True,
        read_only=True,
        source="questions",
    )
    linked_question_count = serializers.SerializerMethodField()

    class Meta:
        model = QuestionPassage
        fields = (
            "id",
            "institute",
            "program",
            "subject",
            "topic",
            "created_by_teacher",
            "title",
            "content_format",
            "passage_text",
            "description",
            "metadata",
            "is_active",
            "linked_question_count",
            "linked_questions",
            "created_at",
            "updated_at",
        )

    def get_linked_question_count(self, obj):
        annotated = getattr(obj, "linked_question_count", None)
        if annotated is not None:
            return annotated
        return obj.questions.filter(is_active=True).count()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        content_format = attrs.get("content_format", getattr(self.instance, "content_format", ContentFormat.MARKDOWN_LATEX))
        attrs["passage_text"] = sanitize_content_by_format(content_format, attrs.get("passage_text", ""))
        attrs["description"] = sanitize_content_by_format(content_format, attrs.get("description", ""))
        institute = attrs.get("institute", getattr(self.instance, "institute", None))
        subject = attrs.get("subject", getattr(self.instance, "subject", None))
        program = attrs.get("program", getattr(self.instance, "program", None))
        topic = attrs.get("topic", getattr(self.instance, "topic", None))
        created_by_teacher = attrs.get("created_by_teacher", getattr(self.instance, "created_by_teacher", None))

        if institute is not None and subject is not None:
            validate_academic_mapping(
                institute=institute,
                subject=subject,
                program=program,
                topic=topic,
                created_by_teacher=created_by_teacher,
            )

        if self.instance is not None and self.instance.questions.filter(is_active=True).exists():
            immutable_mapping_fields = {
                "institute": institute,
                "program": program,
                "subject": subject,
                "topic": topic,
            }
            original_mapping_fields = {
                "institute": self.instance.institute,
                "program": self.instance.program,
                "subject": self.instance.subject,
                "topic": self.instance.topic,
            }
            for field_name, current_value in immutable_mapping_fields.items():
                original_value = original_mapping_fields[field_name]
                current_id = getattr(current_value, "id", None)
                original_id = getattr(original_value, "id", None)
                if current_id != original_id:
                    raise serializers.ValidationError(
                        {
                            field_name: (
                                "You cannot change academic mapping on a comprehension set after questions are linked. "
                                "Create a new set instead."
                            )
                        }
                    )
        return attrs


class QuestionPassageListSerializer(serializers.ModelSerializer):
    linked_question_count = serializers.SerializerMethodField()
    created_by_teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = QuestionPassage
        fields = (
            "id",
            "institute",
            "program",
            "subject",
            "topic",
            "created_by_teacher",
            "created_by_teacher_name",
            "title",
            "content_format",
            "description",
            "is_active",
            "linked_question_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_linked_question_count(self, obj):
        annotated = getattr(obj, "linked_question_count", None)
        if annotated is not None:
            return annotated
        return obj.questions.filter(is_active=True).count()

    def get_created_by_teacher_name(self, obj):
        teacher = getattr(obj, "created_by_teacher", None)
        return getattr(teacher, "full_name", "") or ""


class QuestionPassageInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionPassage
        fields = (
            "id",
            "title",
            "content_format",
            "passage_text",
            "description",
        )
        read_only_fields = fields


class QuestionSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    options = QuestionOptionSerializer(many=True, required=False)
    tag_maps = QuestionTagMapSerializer(many=True, read_only=True)
    attachments = QuestionAttachmentSerializer(many=True, read_only=True)
    passage_detail = QuestionPassageInlineSerializer(source="passage", read_only=True)
    accepted_answers = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)
    numeric_tolerance = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    review_guidance = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    rubric_criteria = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)
    assertion_text = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    reason_text = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    matrix_left_items = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)
    matrix_right_items = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)
    usage_count = serializers.IntegerField(read_only=True, default=0)
    correct_count = serializers.IntegerField(read_only=True, default=0)
    wrong_count = serializers.IntegerField(read_only=True, default=0)
    skipped_count = serializers.IntegerField(read_only=True, default=0)
    correct_attempt_percentage = serializers.SerializerMethodField()
    wrong_attempt_percentage = serializers.SerializerMethodField()
    skip_percentage = serializers.SerializerMethodField()
    has_explanation = serializers.SerializerMethodField()
    correct_rate = serializers.SerializerMethodField()
    wrong_rate = serializers.SerializerMethodField()
    skip_rate = serializers.SerializerMethodField()
    quality_signal = serializers.SerializerMethodField()
    revision_priority = serializers.SerializerMethodField()
    quality_note = serializers.SerializerMethodField()
    question_type_definition = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = (
            "id",
            "institute",
            "program",
            "subject",
            "topic",
            "created_by_teacher",
            "passage",
            "passage_order",
            "passage_detail",
            "question_type",
            "question_type_definition",
            "difficulty_level",
            "content_format",
            "question_text",
            "explanation",
            "accepted_answers",
            "numeric_tolerance",
            "review_guidance",
            "rubric_criteria",
            "assertion_text",
            "reason_text",
            "matrix_left_items",
            "matrix_right_items",
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
            "correct_rate",
            "wrong_rate",
            "skip_rate",
            "quality_signal",
            "revision_priority",
            "quality_note",
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

    def get_correct_rate(self, obj):
        return _question_quality_payload(obj)["correct_rate"]

    def get_wrong_rate(self, obj):
        return _question_quality_payload(obj)["wrong_rate"]

    def get_skip_rate(self, obj):
        return _question_quality_payload(obj)["skip_rate"]

    def get_quality_signal(self, obj):
        return _question_quality_payload(obj)["quality_signal"]

    def get_revision_priority(self, obj):
        return _question_quality_payload(obj)["revision_priority"]

    def get_quality_note(self, obj):
        return _question_quality_payload(obj)["quality_note"]

    def get_question_type_definition(self, obj):
        return get_question_type_definition_payload(obj.question_type)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["accepted_answers"] = _extract_accepted_answers(instance.metadata)
        data["numeric_tolerance"] = _extract_numeric_tolerance(instance.metadata)
        metadata = instance.metadata if isinstance(instance.metadata, dict) else {}
        data["review_guidance"] = str(metadata.get("review_guidance", "") or "")
        data["rubric_criteria"] = _extract_rubric_criteria(instance.metadata)
        assertion_text, reason_text = _extract_assertion_reason(instance.metadata)
        data["assertion_text"] = assertion_text
        data["reason_text"] = reason_text
        matrix_left_items, matrix_right_items = _extract_matrix_match(instance.metadata)
        data["matrix_left_items"] = matrix_left_items
        data["matrix_right_items"] = matrix_right_items
        return data

    def validate(self, attrs):
        content_format = attrs.get("content_format", getattr(self.instance, "content_format", ContentFormat.MARKDOWN_LATEX))
        attrs["question_text"] = sanitize_content_by_format(content_format, attrs.get("question_text", ""))
        attrs["explanation"] = sanitize_content_by_format(content_format, attrs.get("explanation", ""))

        options_payload = attrs.pop("options", serializers.empty)
        instance = getattr(self, "instance", None)
        question_type = attrs.get("question_type", getattr(instance, "question_type", None))
        metadata = dict(attrs.get("metadata", getattr(instance, "metadata", {}) or {}))
        accepted_answers_input = attrs.pop("accepted_answers", serializers.empty)
        numeric_tolerance_input = attrs.pop("numeric_tolerance", serializers.empty)
        review_guidance_input = attrs.pop("review_guidance", serializers.empty)
        rubric_criteria_input = attrs.pop("rubric_criteria", serializers.empty)
        assertion_text_input = attrs.pop("assertion_text", serializers.empty)
        reason_text_input = attrs.pop("reason_text", serializers.empty)
        matrix_left_items_input = attrs.pop("matrix_left_items", serializers.empty)
        matrix_right_items_input = attrs.pop("matrix_right_items", serializers.empty)
        question_type_definition = get_question_type_definition(question_type)
        if question_type_definition is None:
            raise serializers.ValidationError({"question_type": "Unsupported question type."})

        accepted_answers_provided = accepted_answers_input is not serializers.empty
        if accepted_answers_input is serializers.empty:
            accepted_answers = _extract_accepted_answers(metadata)
        else:
            accepted_answers = _normalized_accepted_answers(accepted_answers_input)

        if assertion_text_input is serializers.empty and reason_text_input is serializers.empty:
            assertion_text, reason_text = _extract_assertion_reason(metadata)
        else:
            assertion_text = str(assertion_text_input or "").strip()
            reason_text = str(reason_text_input or "").strip()

        assertion_text = sanitize_content_by_format(content_format, assertion_text)
        reason_text = sanitize_content_by_format(content_format, reason_text)
        if matrix_left_items_input is serializers.empty and matrix_right_items_input is serializers.empty:
            matrix_left_items, matrix_right_items = _extract_matrix_match(metadata)
        else:
            matrix_left_items = _normalized_text_list(matrix_left_items_input if matrix_left_items_input is not serializers.empty else [])
            matrix_right_items = _normalized_text_list(matrix_right_items_input if matrix_right_items_input is not serializers.empty else [])

        if question_type == QuestionType.ASSERTION_REASON:
            if not assertion_text:
                raise serializers.ValidationError({"assertion_text": "Assertion text is required."})
            if not reason_text:
                raise serializers.ValidationError({"reason_text": "Reason text is required."})
            metadata["assertion_reason"] = {
                "assertion_text": assertion_text,
                "reason_text": reason_text,
            }
            attrs["question_text"] = (
                "Assertion:\n"
                f"{assertion_text}\n\n"
                "Reason:\n"
                f"{reason_text}"
            )
        else:
            if assertion_text:
                raise serializers.ValidationError(
                    {"assertion_text": f"{question_type_definition.label} does not use assertion text."}
                )
            if reason_text:
                raise serializers.ValidationError(
                    {"reason_text": f"{question_type_definition.label} does not use reason text."}
                )
            metadata.pop("assertion_reason", None)

        if question_type == QuestionType.MATRIX_MATCH:
            if len(matrix_left_items) < 2:
                raise serializers.ValidationError(
                    {"matrix_left_items": "Provide at least two left-column items for matrix match questions."}
                )
            if len(matrix_right_items) < 2:
                raise serializers.ValidationError(
                    {"matrix_right_items": "Provide at least two right-column items for matrix match questions."}
                )
            metadata["matrix_match"] = {
                "left_items": matrix_left_items,
                "right_items": matrix_right_items,
            }
        else:
            if matrix_left_items:
                raise serializers.ValidationError(
                    {"matrix_left_items": f"{question_type_definition.label} does not use matrix left-column items."}
                )
            if matrix_right_items:
                raise serializers.ValidationError(
                    {"matrix_right_items": f"{question_type_definition.label} does not use matrix right-column items."}
                )
            metadata.pop("matrix_match", None)

        if question_type != QuestionType.ASSERTION_REASON and not str(attrs.get("question_text", "") or "").strip():
            raise serializers.ValidationError({"question_text": "Question text is required."})

        if question_type == QuestionType.FILL_IN_BLANKS:
            blank_count = _fill_in_blanks_marker_count(attrs.get("question_text", getattr(instance, "question_text", "")))
            if blank_count < 1:
                raise serializers.ValidationError(
                    {
                        "question_text": (
                            "Fill in the blanks questions must include at least one [[blank]] marker in the prompt."
                        )
                    }
                )
            if len(accepted_answers) != blank_count:
                raise serializers.ValidationError(
                    {
                        "accepted_answers": (
                            f"Provide exactly {blank_count} accepted answer entr"
                            f"{'y' if blank_count == 1 else 'ies'} in blank order."
                        )
                    }
                )
            metadata["fill_in_blanks"] = {"blank_count": blank_count}
        else:
            metadata.pop("fill_in_blanks", None)

        if question_type_supports_review_guidance(question_type):
            if accepted_answers_provided and accepted_answers:
                raise serializers.ValidationError(
                    {"accepted_answers": f"{question_type_definition.label} does not use accepted answers."}
                )
            metadata.pop("accepted_answers", None)
        elif question_type_supports_accepted_answers(question_type):
            if not accepted_answers:
                raise serializers.ValidationError(
                    {"accepted_answers": "Provide at least one accepted answer for text-based question types."}
                )
            metadata["accepted_answers"] = accepted_answers
        elif accepted_answers and accepted_answers_provided:
            raise serializers.ValidationError(
                {"accepted_answers": f"{question_type_definition.label} does not use accepted answers."}
            )
        else:
            metadata.pop("accepted_answers", None)

        if question_type_supports_numeric_tolerance(question_type):
            if numeric_tolerance_input is serializers.empty:
                tolerance_value = _extract_numeric_tolerance(metadata)
            else:
                tolerance_value = str(numeric_tolerance_input or "").strip()
            normalized_numeric_answers = []
            for answer in accepted_answers:
                try:
                    numeric_value = Decimal(answer.replace(",", ""))
                except (InvalidOperation, AttributeError):
                    raise serializers.ValidationError(
                        {"accepted_answers": f"'{answer}' is not a valid numeric answer."}
                    )
                normalized_value = format(numeric_value.normalize(), "f")
                if normalized_value not in normalized_numeric_answers:
                    normalized_numeric_answers.append(normalized_value)
            metadata["accepted_answers"] = normalized_numeric_answers

            if tolerance_value:
                try:
                    tolerance_decimal = Decimal(tolerance_value.replace(",", ""))
                except (InvalidOperation, AttributeError):
                    raise serializers.ValidationError(
                        {"numeric_tolerance": "Numeric tolerance must be a valid number."}
                    )
                if tolerance_decimal < 0:
                    raise serializers.ValidationError(
                        {"numeric_tolerance": "Numeric tolerance cannot be negative."}
                    )
                metadata["numeric_validation"] = {"tolerance": format(tolerance_decimal.normalize(), "f")}
            else:
                metadata.pop("numeric_validation", None)
        else:
            if numeric_tolerance_input not in {serializers.empty, None, ""} and str(numeric_tolerance_input).strip():
                raise serializers.ValidationError(
                    {"numeric_tolerance": "Numeric tolerance is only supported for numeric-answer questions."}
                )
            metadata.pop("numeric_validation", None)

        if review_guidance_input is serializers.empty:
            review_guidance = str(metadata.get("review_guidance", "") or "").strip()
        else:
            review_guidance = str(review_guidance_input or "").strip()

        rubric_criteria = _normalize_rubric_criteria(
            rubric_criteria_input
            if rubric_criteria_input is not serializers.empty
            else _extract_rubric_criteria(metadata),
            question_type=question_type,
            default_marks=attrs.get("default_marks", getattr(instance, "default_marks", Decimal("0.00"))),
        )

        if question_type_supports_review_guidance(question_type):
            if review_guidance:
                metadata["review_guidance"] = review_guidance
            else:
                metadata.pop("review_guidance", None)
            if rubric_criteria is serializers.empty:
                rubric_criteria = _extract_rubric_criteria(metadata)
            if rubric_criteria:
                metadata["rubric"] = {
                    "mode": "criterion_scores",
                    "criteria": rubric_criteria,
                }
            else:
                metadata.pop("rubric", None)
        else:
            if review_guidance_input not in {serializers.empty, None, ""} and review_guidance:
                raise serializers.ValidationError(
                    {"review_guidance": "Review guidance is only supported for essay manual-review questions."}
                )
            metadata.pop("review_guidance", None)
            if rubric_criteria_input is not serializers.empty and rubric_criteria_input not in (None, "") and rubric_criteria:
                raise serializers.ValidationError(
                    {"rubric_criteria": "Rubric criteria are only supported for essay manual-review questions."}
                )
            metadata.pop("rubric", None)

        attrs["metadata"] = metadata

        if options_payload is serializers.empty:
            if instance is not None and question_type_supports_options(question_type):
                existing_options = list(instance.options.filter(is_active=True))
                validate_question_options(question_type, existing_options)
            elif instance is None and question_type_supports_options(question_type):
                raise serializers.ValidationError(
                    {"options": "Options are required for MCQ and True/False questions."}
                )
            elif instance is not None and question_type_supports_text_answer(question_type):
                existing_options = list(instance.options.filter(is_active=True))
                validate_question_options(question_type, existing_options)
        else:
            validate_question_options(question_type, options_payload)
            if question_type == QuestionType.ASSERTION_REASON:
                normalized_texts = [
                    str(option.get("option_text", "") or "").strip()
                    for option in options_payload
                    if option.get("is_active", True)
                ]
                if normalized_texts != ASSERTION_REASON_DEFAULT_OPTIONS:
                    raise serializers.ValidationError(
                        {"options": "Assertion / Reason questions must use the fixed four-option relationship set."}
                    )
            attrs["options"] = options_payload

        institute = attrs.get("institute", getattr(instance, "institute", None))
        subject = attrs.get("subject", getattr(instance, "subject", None))
        program = attrs.get("program", getattr(instance, "program", None))
        topic = attrs.get("topic", getattr(instance, "topic", None))
        created_by_teacher = attrs.get("created_by_teacher", getattr(instance, "created_by_teacher", None))
        passage = attrs.get("passage", getattr(instance, "passage", None))
        passage_order = attrs.get("passage_order", getattr(instance, "passage_order", None))

        if institute is not None and subject is not None:
            validate_academic_mapping(
                institute=institute,
                subject=subject,
                program=program,
                topic=topic,
                created_by_teacher=created_by_teacher,
            )

        family_contract_errors = validate_program_assessment_family_question_contract(
            program=program,
            question_type=question_type,
            marks=attrs.get("default_marks", getattr(instance, "default_marks", Decimal("0.00"))),
            negative_marks=attrs.get("negative_marks", getattr(instance, "negative_marks", Decimal("0.00"))),
            question_type_definition=question_type_definition,
        )
        if family_contract_errors:
            raise serializers.ValidationError(family_contract_errors)

        if passage is not None:
            validate_question_passage_assignment(
                institute=institute,
                subject=subject,
                program=program,
                topic=topic,
                passage=passage,
            )
            if passage_order is not None and passage_order < 1:
                raise serializers.ValidationError(
                    {"passage_order": "Question order inside the comprehension set must be positive."}
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        try:
            question = Question.objects.create(**validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages}
            ) from exc
        self._replace_options(question, options_data)
        sync_master_question_from_institute_question(question)
        return question

    @transaction.atomic
    def update(self, instance, validated_data):
        options_data = validated_data.pop("options", serializers.empty)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        try:
            instance.save()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages}
            ) from exc

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
    created_by_teacher_name = serializers.SerializerMethodField()
    passage_title = serializers.SerializerMethodField()
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
    correct_rate = serializers.SerializerMethodField()
    wrong_rate = serializers.SerializerMethodField()
    skip_rate = serializers.SerializerMethodField()
    quality_signal = serializers.SerializerMethodField()
    revision_priority = serializers.SerializerMethodField()
    quality_note = serializers.SerializerMethodField()
    question_type_definition = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = (
            "id",
            "institute",
            "program",
            "subject",
            "topic",
            "created_by_teacher",
            "created_by_teacher_name",
            "passage",
            "passage_order",
            "passage_title",
            "question_type",
            "question_type_definition",
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
            "correct_rate",
            "wrong_rate",
            "skip_rate",
            "quality_signal",
            "revision_priority",
            "quality_note",
        )
        read_only_fields = fields

    def get_has_explanation(self, obj):
        return bool((obj.explanation or "").strip())

    def get_created_by_teacher_name(self, obj):
        teacher = getattr(obj, "created_by_teacher", None)
        return getattr(teacher, "full_name", "") or ""

    def get_passage_title(self, obj):
        passage = getattr(obj, "passage", None)
        return getattr(passage, "title", "") or ""

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

    def get_correct_rate(self, obj):
        return _question_quality_payload(obj)["correct_rate"]

    def get_wrong_rate(self, obj):
        return _question_quality_payload(obj)["wrong_rate"]

    def get_skip_rate(self, obj):
        return _question_quality_payload(obj)["skip_rate"]

    def get_quality_signal(self, obj):
        return _question_quality_payload(obj)["quality_signal"]

    def get_revision_priority(self, obj):
        return _question_quality_payload(obj)["revision_priority"]

    def get_quality_note(self, obj):
        return _question_quality_payload(obj)["quality_note"]

    def get_is_quality_ready(self, obj):
        has_explanation = self.get_has_explanation(obj)
        correct_option_count = getattr(obj, "correct_option_count", 0) or 0
        option_count = getattr(obj, "option_count", 0) or 0
        accepted_answers = _extract_accepted_answers(getattr(obj, "metadata", {}))

        if obj.question_type == "essay_manual_review":
            metadata = getattr(obj, "metadata", {}) if isinstance(getattr(obj, "metadata", {}), dict) else {}
            return has_explanation and bool(str(metadata.get("review_guidance", "") or "").strip())
        if question_type_supports_text_answer(obj.question_type):
            return has_explanation and bool(accepted_answers)
        if obj.question_type == "true_false":
            return has_explanation and correct_option_count > 0 and option_count == 2
        return has_explanation and correct_option_count > 0 and option_count >= 2

    def get_question_type_definition(self, obj):
        return get_question_type_definition_payload(obj.question_type)


class QuestionImportPreviewRowSerializer(serializers.Serializer):
    row_number = serializers.IntegerField()
    status = serializers.CharField(required=False)
    is_valid = serializers.BooleanField(required=False)
    question_text = serializers.CharField(allow_blank=True)
    passage_title = serializers.CharField(allow_blank=True, required=False)
    passage_order = serializers.JSONField(required=False)
    subject_name = serializers.CharField(allow_blank=True, required=False)
    topic_name = serializers.CharField(allow_blank=True, required=False)
    subject_code = serializers.CharField(allow_blank=True, required=False)
    topic_code = serializers.CharField(allow_blank=True, required=False)
    question_type = serializers.CharField()
    difficulty_level = serializers.CharField()
    tag_values = serializers.ListField(child=serializers.CharField(), required=False)
    errors = serializers.JSONField(required=False)
    error_fields = serializers.ListField(child=serializers.CharField(), required=False)
    expectations = serializers.ListField(child=serializers.CharField(), required=False)
    error_map = serializers.DictField(required=False)


class QuestionImportPreviewResponseSerializer(serializers.Serializer):
    preview_schema_version = serializers.IntegerField(required=False)
    preview_signature = serializers.CharField(required=False)
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
    preview_schema_version = serializers.IntegerField()
    preview_signature = serializers.CharField()
    preview_rows = QuestionImportPreviewRowSerializer(many=True)
    valid_payloads = serializers.ListField(child=serializers.DictField(), allow_empty=True)


class QuestionImportTemplateSerializer(serializers.Serializer):
    columns = serializers.ListField(child=serializers.CharField(), default=IMPORT_TEMPLATE_COLUMNS)
    csv_content = serializers.CharField()


class QuestionPassageImportPreviewRowSerializer(serializers.Serializer):
    row_number = serializers.IntegerField()
    status = serializers.CharField(required=False)
    is_valid = serializers.BooleanField(required=False)
    title = serializers.CharField(allow_blank=True)
    subject_name = serializers.CharField(allow_blank=True, required=False)
    topic_name = serializers.CharField(allow_blank=True, required=False)
    subject_code = serializers.CharField(allow_blank=True, required=False)
    topic_code = serializers.CharField(allow_blank=True, required=False)
    content_format = serializers.CharField()
    errors = serializers.JSONField(required=False)
    error_fields = serializers.ListField(child=serializers.CharField(), required=False)
    expectations = serializers.ListField(child=serializers.CharField(), required=False)
    error_map = serializers.DictField(required=False)


class QuestionPassageImportPreviewResponseSerializer(serializers.Serializer):
    preview_schema_version = serializers.IntegerField(required=False)
    preview_signature = serializers.CharField(required=False)
    total_rows = serializers.IntegerField()
    valid_rows = serializers.IntegerField()
    invalid_rows = serializers.IntegerField()
    rows = QuestionPassageImportPreviewRowSerializer(many=True)


class QuestionPassageImportFinalizeSerializer(serializers.Serializer):
    preview_schema_version = serializers.IntegerField()
    preview_signature = serializers.CharField()
    preview_rows = QuestionPassageImportPreviewRowSerializer(many=True)
    valid_payloads = serializers.ListField(child=serializers.DictField(), allow_empty=True)


class QuestionPassageImportTemplateSerializer(serializers.Serializer):
    columns = serializers.ListField(child=serializers.CharField(), default=IMPORT_PASSAGE_TEMPLATE_COLUMNS)
    csv_content = serializers.CharField()
