from decimal import Decimal

from rest_framework import serializers

from apps.attempts.models import (
    AttemptIntegrityEvent,
    StudentAnswer,
    StudentAnswerReviewEvent,
    StudentAnswerReviewTask,
    StudentExamAttempt,
)
from apps.attempts.services import (
    attempt_integrity_summary,
    ensure_delivery_snapshot,
    ordered_exam_questions_for_attempt,
    ordered_options_for_attempt,
    question_order_map_for_attempt,
    refresh_attempt_runtime_state,
    resolve_attempt_security_policy,
)
from apps.exams.serializers import StudentExamQuestionDetailSerializer
from apps.exams.models import Exam
from apps.exams.services import (
    is_result_visible_for_attempt,
    resolve_exam_experience_profile,
    resolve_exam_source_metadata,
    review_visibility_for_attempt,
)
from apps.question_bank.registry import (
    get_question_type_definition,
    get_question_type_definition_payload,
    question_type_allowed_response_artifact_types,
    question_type_supports_response_artifacts,
    question_type_supports_text_answer,
)
from apps.question_bank.models import AttachmentType, Question, QuestionOption
from apps.students.models import StudentProfile


def attempt_accommodation_snapshot(attempt):
    metadata = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    snapshot = metadata.get("accommodation_snapshot", {})
    return snapshot if isinstance(snapshot, dict) else {}


def review_answer_key_for_question(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    accepted_answers = metadata.get("accepted_answers")
    if isinstance(accepted_answers, list):
        return [str(value).strip() for value in accepted_answers if str(value).strip()]

    single_answer = metadata.get("accepted_answer") or metadata.get("answer_key")
    if single_answer is None:
        return []
    normalized = str(single_answer).strip()
    return [normalized] if normalized else []


def assertion_reason_fields_for_question(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    payload = metadata.get("assertion_reason", {})
    if not isinstance(payload, dict):
        return "", ""
    return str(payload.get("assertion_text", "") or ""), str(payload.get("reason_text", "") or "")


def matrix_match_fields_for_question(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    payload = metadata.get("matrix_match", {})
    if not isinstance(payload, dict):
        return [], []
    left_items = [str(item).strip() for item in payload.get("left_items", []) if str(item).strip()]
    right_items = [str(item).strip() for item in payload.get("right_items", []) if str(item).strip()]
    return left_items, right_items


def review_guidance_for_question(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    return str(metadata.get("review_guidance", "") or "").strip()


def rubric_definition_for_question(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    rubric = metadata.get("rubric", {})
    if not isinstance(rubric, dict):
        return None

    criteria = rubric.get("criteria", [])
    if not isinstance(criteria, list) or not criteria:
        return None

    normalized_criteria = []
    for index, criterion in enumerate(criteria):
        if not isinstance(criterion, dict):
            continue
        key = str(criterion.get("key", "") or "").strip()
        label = str(criterion.get("label", "") or "").strip()
        max_score = criterion.get("max_score")
        if not key or not label or max_score in (None, ""):
            continue
        normalized_criteria.append(
            {
                "key": key,
                "label": label,
                "max_score": str(max_score),
                "display_order": int(criterion.get("display_order", index + 1) or (index + 1)),
                "reviewer_hint": str(criterion.get("reviewer_hint", "") or "").strip(),
                "band_descriptors": (
                    criterion.get("band_descriptors", [])
                    if isinstance(criterion.get("band_descriptors", []), list)
                    else []
                ),
            }
        )

    if not normalized_criteria:
        return None

    return {
        "mode": str(rubric.get("mode", "criterion_scores") or "criterion_scores"),
        "criteria": sorted(normalized_criteria, key=lambda item: (item["display_order"], item["label"])),
    }


def media_context_for_question(question):
    attachments = list(
        question.attachments.filter(is_active=True).order_by("display_order", "created_at")
    )
    definition = get_question_type_definition(question.question_type)
    attachment_types = []
    for attachment in attachments:
        normalized_type = str(attachment.attachment_type or "").strip()
        if normalized_type and normalized_type not in attachment_types:
            attachment_types.append(normalized_type)

    total_attachments = len(attachments)
    return {
        "has_media": total_attachments > 0,
        "total_attachments": total_attachments,
        "attachment_types": attachment_types,
        "primary_attachment_type": attachment_types[0] if attachment_types else None,
        "delivery_mode": (
            definition.media_delivery_mode
            if definition is not None and total_attachments > 0
            else "none"
        ),
        "preload_strategy": (
            definition.media_preload_strategy
            if definition is not None and total_attachments > 0
            else "none"
        ),
        "supports_audio_prompt": AttachmentType.AUDIO in attachment_types,
        "supports_video_prompt": AttachmentType.VIDEO in attachment_types,
        "supports_document_prompt": AttachmentType.PDF in attachment_types,
        "supports_visual_prompt": any(
            attachment_type in attachment_types
            for attachment_type in (AttachmentType.IMAGE, AttachmentType.DIAGRAM)
        ),
        "inline_attachment_count": sum(1 for attachment in attachments if attachment.is_inline),
    }


def _section_media_notice(*, has_audio, has_video, has_document, has_visual):
    if has_audio or has_video:
        return (
            "This section includes guided prompt media. Open each prompt early, keep playback controls "
            "available while answering, and avoid switching sections mid-instruction."
        )
    if has_document:
        return (
            "This section includes reference documents. Review each attachment before finalizing your response."
        )
    if has_visual:
        return (
            "This section includes diagrams or images. Inspect the visuals carefully before selecting your answer."
        )
    return "No additional media instructions are required for this section."


def current_section_media_context_for_attempt(attempt):
    metadata = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    section_runtime = metadata.get("section_runtime", {})
    if not isinstance(section_runtime, dict):
        section_runtime = {}

    current_section_id = section_runtime.get("current_section_id")
    current_section_name = section_runtime.get("current_section_name")

    exam_questions = (
        attempt.exam.exam_questions.filter(is_active=True)
        .select_related("question", "section")
        .prefetch_related("question__attachments")
        .order_by("question_order", "created_at")
    )
    if current_section_id:
        exam_questions = exam_questions.filter(section_id=current_section_id)

    question_contexts = []
    for exam_question in exam_questions:
        context = media_context_for_question(exam_question.question)
        if context["has_media"]:
            question_contexts.append(context)

    attachment_types = []
    delivery_modes = []
    preload_strategies = []
    for context in question_contexts:
        for attachment_type in context["attachment_types"]:
            if attachment_type not in attachment_types:
                attachment_types.append(attachment_type)
        if context["delivery_mode"] not in delivery_modes:
            delivery_modes.append(context["delivery_mode"])
        if context["preload_strategy"] not in preload_strategies:
            preload_strategies.append(context["preload_strategy"])

    has_audio = any(context["supports_audio_prompt"] for context in question_contexts)
    has_video = any(context["supports_video_prompt"] for context in question_contexts)
    has_document = any(context["supports_document_prompt"] for context in question_contexts)
    has_visual = any(context["supports_visual_prompt"] for context in question_contexts)
    total_attachments = sum(context["total_attachments"] for context in question_contexts)
    inline_attachment_count = sum(
        context["inline_attachment_count"] for context in question_contexts
    )

    if has_audio or has_video:
        recommended_experience = "media_guided"
    elif has_document or has_visual:
        recommended_experience = "reference_supported"
    else:
        recommended_experience = "standard"

    return {
        "has_media": bool(question_contexts),
        "scope": "section" if current_section_id else "exam",
        "section_id": str(current_section_id) if current_section_id else None,
        "section_name": current_section_name or None,
        "question_count": exam_questions.count(),
        "questions_with_media": len(question_contexts),
        "total_attachments": total_attachments,
        "inline_attachment_count": inline_attachment_count,
        "attachment_types": attachment_types,
        "delivery_modes": delivery_modes,
        "preload_strategies": preload_strategies,
        "supports_audio_prompt": has_audio,
        "supports_video_prompt": has_video,
        "supports_document_prompt": has_document,
        "supports_visual_prompt": has_visual,
        "recommended_experience": recommended_experience,
        "learner_notice": _section_media_notice(
            has_audio=has_audio,
            has_video=has_video,
            has_document=has_document,
            has_visual=has_visual,
        ),
    }


def rubric_checklist_from_guidance(review_guidance):
    normalized = str(review_guidance or "").replace("\r\n", "\n").strip()
    if not normalized:
        return []

    items = []
    for raw_line in normalized.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        for prefix in ("- ", "* ", "• ", "1. ", "2. ", "3. ", "4. ", "5. "):
            if line.startswith(prefix):
                line = line[len(prefix):].strip()
                break
        if line:
            items.append(line)

    if len(items) <= 1:
        sentence_items = [
            chunk.strip()
            for chunk in normalized.replace(";", ".").split(".")
            if chunk.strip()
        ]
        if len(sentence_items) > 1:
            return sentence_items

    return items


class StudentAnswerSerializer(serializers.ModelSerializer):
    question = serializers.UUIDField(source="question_id", read_only=True)
    question_text_summary = serializers.SerializerMethodField()
    selected_option_text = serializers.CharField(source="selected_option.option_text", read_only=True)
    selected_option_ids = serializers.SerializerMethodField()
    selected_option_texts = serializers.SerializerMethodField()
    reviewed_by_teacher = serializers.UUIDField(source="reviewed_by_teacher_id", read_only=True)

    class Meta:
        model = StudentAnswer
        fields = (
            "id",
            "attempt",
            "question",
            "question_text_summary",
            "selected_option",
            "selected_option_text",
            "selected_option_ids",
            "selected_option_texts",
            "answer_text",
            "answer_transcript",
            "response_artifacts",
            "evaluation_status",
            "is_correct",
            "marks_awarded",
            "negative_marks_applied",
            "answered_at",
            "time_spent_seconds",
            "is_marked_for_review",
            "reviewed_by_teacher",
            "reviewed_at",
            "review_notes",
            "is_active",
            "created_at",
            "updated_at",
        )

    def get_question_text_summary(self, obj):
        text = obj.question.question_text.strip()
        return text[:120] + ("..." if len(text) > 120 else "")

    def get_selected_option_ids(self, obj):
        values = getattr(obj, "selected_option_ids", []) or []
        return [str(item) for item in values if str(item).strip()]

    def get_selected_option_texts(self, obj):
        selected_ids = self.get_selected_option_ids(obj)
        if not selected_ids:
            return []
        options = obj.question.options.filter(id__in=selected_ids)
        option_map = {str(option.id): option.option_text for option in options}
        return [option_map[option_id] for option_id in selected_ids if option_id in option_map]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        exam = instance.attempt.exam
        result = getattr(instance.attempt, "result", None)
        result_visible = is_result_visible_for_attempt(
            exam,
            instance.attempt,
            result=result,
        )

        if instance.attempt.status == "in_progress" or not result_visible:
            data.pop("is_correct", None)
            data.pop("marks_awarded", None)
            data.pop("negative_marks_applied", None)
        return data


class ManualReviewAnswerSerializer(serializers.Serializer):
    marks_awarded = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0.00"))
    review_notes = serializers.CharField(required=False, allow_blank=True, default="")
    rubric_scores = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
    )

    def validate_rubric_scores(self, value):
        normalized = []
        for index, item in enumerate(value or []):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"Criterion score {index + 1} must be an object.")
            criterion_key = str(item.get("criterion_key", "") or "").strip()
            awarded_score = item.get("awarded_score", "")
            note = str(item.get("note", "") or "").strip()
            if not criterion_key:
                raise serializers.ValidationError(f"Criterion score {index + 1} must include criterion_key.")
            normalized.append(
                {
                    "criterion_key": criterion_key,
                    "awarded_score": str(awarded_score or "").strip(),
                    "note": note,
                }
            )
        return normalized


class AssignReviewTaskSerializer(serializers.Serializer):
    assigned_to_teacher = serializers.UUIDField(required=False, allow_null=True)


class BulkAssignReviewTaskSerializer(serializers.Serializer):
    task_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )
    assigned_to_teacher = serializers.UUIDField(required=False, allow_null=True)


class BulkReviewTaskStatusNoteSerializer(serializers.Serializer):
    task_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )
    review_notes = serializers.CharField(required=False, allow_blank=True, default="")


class BulkModerateReviewTaskSerializer(serializers.Serializer):
    task_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )
    review_notes = serializers.CharField(required=False, allow_blank=True, default="")


class ReviewTaskStatusNoteSerializer(serializers.Serializer):
    review_notes = serializers.CharField(required=False, allow_blank=True, default="")


class StudentAnswerReviewEventSerializer(serializers.ModelSerializer):
    actor_user_name = serializers.SerializerMethodField()
    actor_teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentAnswerReviewEvent
        fields = (
            "id",
            "event_type",
            "from_status",
            "to_status",
            "marks_awarded",
            "notes",
            "metadata",
            "actor_user",
            "actor_user_name",
            "actor_teacher",
            "actor_teacher_name",
            "created_at",
        )

    def get_actor_user_name(self, obj):
        if obj.actor_user_id:
            return obj.actor_user.get_username()
        return ""

    def get_actor_teacher_name(self, obj):
        return obj.actor_teacher.full_name if obj.actor_teacher_id else ""


class StudentAnswerReviewTaskSerializer(serializers.ModelSerializer):
    answer_id = serializers.UUIDField(read_only=True)
    attempt_id = serializers.UUIDField(read_only=True)
    exam_id = serializers.UUIDField(read_only=True)
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    student_id = serializers.UUIDField(read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    question_id = serializers.UUIDField(read_only=True)
    question_type = serializers.CharField(source="question.question_type", read_only=True)
    question_type_definition = serializers.SerializerMethodField()
    question_text_summary = serializers.SerializerMethodField()
    question_text = serializers.CharField(source="question.question_text", read_only=True)
    assertion_text = serializers.SerializerMethodField()
    reason_text = serializers.SerializerMethodField()
    matrix_left_items = serializers.SerializerMethodField()
    matrix_right_items = serializers.SerializerMethodField()
    content_format = serializers.CharField(source="question.content_format", read_only=True)
    passage = serializers.UUIDField(source="question.passage_id", read_only=True)
    passage_order = serializers.IntegerField(source="question.passage_order", read_only=True)
    passage_detail = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    media_context = serializers.SerializerMethodField()
    answer_text = serializers.CharField(source="answer.answer_text", read_only=True)
    answer_transcript = serializers.CharField(source="answer.answer_transcript", read_only=True)
    response_artifacts = serializers.JSONField(source="answer.response_artifacts", read_only=True)
    review_guidance = serializers.SerializerMethodField()
    rubric_checklist = serializers.SerializerMethodField()
    has_rubric = serializers.SerializerMethodField()
    rubric = serializers.SerializerMethodField()
    rubric_scores = serializers.SerializerMethodField()
    rubric_total = serializers.SerializerMethodField()
    question_marks = serializers.SerializerMethodField()
    assigned_to_teacher_name = serializers.SerializerMethodField()
    last_reviewed_by_teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentAnswerReviewTask
        fields = (
            "id",
            "answer_id",
            "attempt_id",
            "exam_id",
            "exam_title",
            "student_id",
            "student_name",
            "question_id",
            "question_type",
            "question_type_definition",
            "question_text_summary",
            "question_text",
            "assertion_text",
            "reason_text",
            "matrix_left_items",
            "matrix_right_items",
            "content_format",
            "passage",
            "passage_order",
            "passage_detail",
            "attachments",
            "media_context",
            "answer_text",
            "answer_transcript",
            "response_artifacts",
            "review_guidance",
            "rubric_checklist",
            "has_rubric",
            "rubric",
            "rubric_scores",
            "rubric_total",
            "question_marks",
            "status",
            "priority",
            "opened_at",
            "assigned_at",
            "review_started_at",
            "resolved_at",
            "last_reviewed_at",
            "latest_marks_awarded",
            "latest_review_summary",
            "assigned_to_teacher",
            "assigned_to_teacher_name",
            "last_reviewed_by_teacher",
            "last_reviewed_by_teacher_name",
            "created_at",
            "updated_at",
        )

    def get_question_text_summary(self, obj):
        text = (obj.question.question_text or "").strip()
        return text[:160] + ("..." if len(text) > 160 else "")

    def get_question_type_definition(self, obj):
        return get_question_type_definition_payload(obj.question.question_type)

    def get_assertion_text(self, obj):
        return assertion_reason_fields_for_question(obj.question)[0]

    def get_reason_text(self, obj):
        return assertion_reason_fields_for_question(obj.question)[1]

    def get_matrix_left_items(self, obj):
        return matrix_match_fields_for_question(obj.question)[0]

    def get_matrix_right_items(self, obj):
        return matrix_match_fields_for_question(obj.question)[1]

    def get_passage_detail(self, obj):
        passage = getattr(obj.question, "passage", None)
        if passage is None:
            return None
        return {
            "id": str(passage.id),
            "title": passage.title,
            "content_format": passage.content_format,
            "passage_text": passage.passage_text,
            "description": passage.description,
        }

    def get_attachments(self, obj):
        return [
            {
                "id": str(attachment.id),
                "file": attachment.file.url if attachment.file else "",
                "file_url": attachment.file_url,
                "attachment_type": attachment.attachment_type,
                "title": attachment.title,
                "display_order": attachment.display_order,
                "alt_text": attachment.alt_text,
                "is_inline": attachment.is_inline,
                "is_active": attachment.is_active,
            }
            for attachment in obj.question.attachments.filter(is_active=True).order_by("display_order", "created_at")
        ]

    def get_media_context(self, obj):
        return media_context_for_question(obj.question)

    def get_review_guidance(self, obj):
        return review_guidance_for_question(obj.question)

    def get_rubric_checklist(self, obj):
        return rubric_checklist_from_guidance(self.get_review_guidance(obj))

    def get_has_rubric(self, obj):
        return bool(rubric_definition_for_question(obj.question))

    def get_rubric(self, obj):
        return rubric_definition_for_question(obj.question)

    def get_rubric_scores(self, obj):
        metadata = obj.metadata if isinstance(obj.metadata, dict) else {}
        scores = metadata.get("rubric_scores", [])
        return scores if isinstance(scores, list) else []

    def get_rubric_total(self, obj):
        metadata = obj.metadata if isinstance(obj.metadata, dict) else {}
        total = metadata.get("rubric_total")
        return str(total) if total not in (None, "") else ""

    def get_question_marks(self, obj):
        exam_question = obj.attempt.exam.exam_questions.filter(question=obj.question, is_active=True).only("marks").first()
        return str(exam_question.marks if exam_question and exam_question.marks is not None else Decimal("0.00"))

    def get_assigned_to_teacher_name(self, obj):
        return obj.assigned_to_teacher.full_name if obj.assigned_to_teacher_id else ""

    def get_last_reviewed_by_teacher_name(self, obj):
        return obj.last_reviewed_by_teacher.full_name if obj.last_reviewed_by_teacher_id else ""


class StudentAnswerReviewTaskDetailSerializer(StudentAnswerReviewTaskSerializer):
    events = StudentAnswerReviewEventSerializer(many=True, read_only=True)

    class Meta(StudentAnswerReviewTaskSerializer.Meta):
        fields = StudentAnswerReviewTaskSerializer.Meta.fields + ("events",)


class StudentExamAttemptSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    exam_type = serializers.CharField(source="exam.exam_type", read_only=True)
    source_type = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_teacher_id = serializers.SerializerMethodField()
    source_teacher_name = serializers.SerializerMethodField()
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    answers = StudentAnswerSerializer(many=True, read_only=True)
    server_time = serializers.SerializerMethodField()
    section_runtime = serializers.SerializerMethodField()
    current_section_media_context = serializers.SerializerMethodField()
    experience_profile = serializers.SerializerMethodField()
    security_mode = serializers.CharField(source="exam.security_mode", read_only=True)
    security_policy = serializers.SerializerMethodField()
    integrity_summary = serializers.SerializerMethodField()
    accommodation_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = StudentExamAttempt
        fields = "__all__"

    def get_server_time(self, obj):
        from django.utils import timezone

        return timezone.now()

    def get_source_type(self, obj):
        return resolve_exam_source_metadata(obj.exam)["source_type"]

    def get_source_label(self, obj):
        return resolve_exam_source_metadata(obj.exam)["source_label"]

    def get_source_name(self, obj):
        return resolve_exam_source_metadata(obj.exam)["source_name"]

    def get_source_teacher_id(self, obj):
        return resolve_exam_source_metadata(obj.exam)["teacher_id"]

    def get_source_teacher_name(self, obj):
        return resolve_exam_source_metadata(obj.exam)["teacher_name"]

    def get_section_runtime(self, obj):
        refresh_attempt_runtime_state(obj)
        metadata = obj.metadata if isinstance(obj.metadata, dict) else {}
        runtime = metadata.get("section_runtime", {})
        return runtime if isinstance(runtime, dict) else {}

    def get_current_section_media_context(self, obj):
        refresh_attempt_runtime_state(obj)
        return current_section_media_context_for_attempt(obj)

    def get_experience_profile(self, obj):
        return resolve_exam_experience_profile(obj.exam)

    def get_security_policy(self, obj):
        return resolve_attempt_security_policy(obj)

    def get_integrity_summary(self, obj):
        return attempt_integrity_summary(obj)

    def get_accommodation_snapshot(self, obj):
        return attempt_accommodation_snapshot(obj)


class AttemptDetailSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    exam_type = serializers.CharField(source="exam.exam_type", read_only=True)
    source_type = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_teacher_name = serializers.SerializerMethodField()
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    questions = serializers.SerializerMethodField()
    answers = StudentAnswerSerializer(many=True, read_only=True)
    server_time = serializers.SerializerMethodField()
    section_runtime = serializers.SerializerMethodField()
    current_section_media_context = serializers.SerializerMethodField()
    experience_profile = serializers.SerializerMethodField()
    security_mode = serializers.CharField(source="exam.security_mode", read_only=True)
    security_policy = serializers.SerializerMethodField()
    integrity_summary = serializers.SerializerMethodField()
    accommodation_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = StudentExamAttempt
        fields = (
            "id",
            "institute",
            "exam",
            "exam_title",
            "exam_code",
            "exam_type",
            "source_type",
            "source_label",
            "source_name",
            "source_teacher_name",
            "student",
            "student_name",
            "attempt_no",
            "status",
            "started_at",
            "submitted_at",
            "expires_at",
            "server_time",
            "section_runtime",
            "current_section_media_context",
            "experience_profile",
            "security_mode",
            "security_policy",
            "integrity_summary",
            "accommodation_snapshot",
            "total_questions",
            "attempted_questions",
            "correct_answers",
            "incorrect_answers",
            "skipped_questions",
            "score",
            "negative_score",
            "final_score",
            "percentage",
            "time_taken_seconds",
            "is_auto_submitted",
            "metadata",
            "questions",
            "answers",
            "created_at",
            "updated_at",
        )

    def get_questions(self, obj):
        exam_questions = list(
            obj.exam.exam_questions.filter(is_active=True)
            .select_related("question", "question__passage", "section")
            .prefetch_related("question__options", "question__attachments")
        )
        ensure_delivery_snapshot(obj)
        ordered_questions = ordered_exam_questions_for_attempt(obj, exam_questions)
        return StudentExamQuestionDetailSerializer(
            ordered_questions,
            many=True,
            context={
                **self.context,
                "attempt": obj,
                "question_order_map": question_order_map_for_attempt(
                    obj,
                    exam_questions,
                ),
            },
        ).data

    def get_server_time(self, obj):
        from django.utils import timezone

        return timezone.now()

    def get_source_type(self, obj):
        return resolve_exam_source_metadata(obj.exam)["source_type"]

    def get_source_label(self, obj):
        return resolve_exam_source_metadata(obj.exam)["source_label"]

    def get_source_name(self, obj):
        return resolve_exam_source_metadata(obj.exam)["source_name"]

    def get_source_teacher_name(self, obj):
        return resolve_exam_source_metadata(obj.exam)["teacher_name"]

    def get_section_runtime(self, obj):
        refresh_attempt_runtime_state(obj)
        metadata = obj.metadata if isinstance(obj.metadata, dict) else {}
        runtime = metadata.get("section_runtime", {})
        return runtime if isinstance(runtime, dict) else {}

    def get_current_section_media_context(self, obj):
        refresh_attempt_runtime_state(obj)
        return current_section_media_context_for_attempt(obj)

    def get_experience_profile(self, obj):
        return resolve_exam_experience_profile(obj.exam)

    def get_security_policy(self, obj):
        return resolve_attempt_security_policy(obj)

    def get_integrity_summary(self, obj):
        return attempt_integrity_summary(obj)

    def get_accommodation_snapshot(self, obj):
        return attempt_accommodation_snapshot(obj)


class AttemptIntegrityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttemptIntegrityEvent
        fields = (
            "id",
            "event_type",
            "severity",
            "counts_as_violation",
            "event_at",
            "metadata",
        )


class ReportIntegrityEventSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(choices=AttemptIntegrityEvent._meta.get_field("event_type").choices)
    event_at = serializers.DateTimeField(required=False)
    metadata = serializers.JSONField(required=False)

    def validate_metadata(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Metadata must be an object.")
        return value


class AttemptReviewSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    exam_type = serializers.CharField(source="exam.exam_type", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    server_time = serializers.SerializerMethodField()
    review_questions = serializers.SerializerMethodField()
    review_mode = serializers.SerializerMethodField()
    show_correct_answers = serializers.SerializerMethodField()
    show_explanations = serializers.SerializerMethodField()

    class Meta:
        model = StudentExamAttempt
        fields = (
            "id",
            "exam",
            "exam_title",
            "exam_code",
            "exam_type",
            "student",
            "student_name",
            "attempt_no",
            "status",
            "started_at",
            "submitted_at",
            "expires_at",
            "server_time",
            "total_questions",
            "attempted_questions",
            "correct_answers",
            "incorrect_answers",
            "skipped_questions",
            "score",
            "negative_score",
            "final_score",
            "percentage",
            "time_taken_seconds",
            "is_auto_submitted",
            "review_mode",
            "show_correct_answers",
            "show_explanations",
            "review_questions",
        )

    def get_server_time(self, obj):
        from django.utils import timezone

        return timezone.now()

    def _review_visibility(self, obj):
        result = getattr(obj, "result", None)
        return review_visibility_for_attempt(obj.exam, obj, result=result)

    def get_review_mode(self, obj):
        return self._review_visibility(obj)["review_mode"]

    def get_show_correct_answers(self, obj):
        return self._review_visibility(obj)["show_correct_answers"]

    def get_show_explanations(self, obj):
        return self._review_visibility(obj)["show_explanations"]

    def get_review_questions(self, obj):
        exam_questions = list(
            obj.exam.exam_questions.filter(is_active=True)
            .select_related(
                "question",
                "question__topic",
                "question__subject",
                "question__passage",
                "section",
            )
            .prefetch_related("question__options", "question__attachments")
        )
        ensure_delivery_snapshot(obj)
        ordered_questions = ordered_exam_questions_for_attempt(obj, exam_questions)
        order_map = question_order_map_for_attempt(obj, exam_questions)
        review_visibility = self._review_visibility(obj)
        answer_map = {
            answer.question_id: answer
            for answer in obj.answers.select_related("selected_option").all()
        }
        rows = []
        for exam_question in ordered_questions:
            question = exam_question.question
            answer = answer_map.get(question.id)
            selected_option_ids = [
                str(item)
                for item in (getattr(answer, "selected_option_ids", []) or [])
                if str(item).strip()
            ]
            has_response = bool(
                answer
                and (
                    answer.selected_option_id
                    or selected_option_ids
                    or (answer.answer_text or "").strip()
                    or (answer.answer_transcript or "").strip()
                    or bool(answer.response_artifacts)
                )
            )
            if not review_visibility["include_all_questions"]:
                has_attempt = bool(has_response or (answer and answer.is_marked_for_review))
                if not has_attempt:
                    continue
            selected_option_id = answer.selected_option_id if answer else None
            ordered_options = ordered_options_for_attempt(
                obj,
                question,
                [item for item in question.options.all() if item.is_active],
            )
            rows.append(
                {
                    "exam_question_id": str(exam_question.id),
                    "question_id": str(question.id),
                    "question_order": order_map.get(
                        str(exam_question.id),
                        exam_question.question_order,
                    ),
                    "section_id": str(exam_question.section_id) if exam_question.section_id else None,
                    "section_name": exam_question.section_name,
                    "section_title": exam_question.section.name if exam_question.section_id else None,
                    "section_order": exam_question.section.section_order if exam_question.section_id else None,
                    "question_text": question.question_text,
                    "assertion_text": assertion_reason_fields_for_question(question)[0],
                    "reason_text": assertion_reason_fields_for_question(question)[1],
                    "matrix_left_items": matrix_match_fields_for_question(question)[0],
                    "matrix_right_items": matrix_match_fields_for_question(question)[1],
                    "content_format": question.content_format,
                    "question_type": question.question_type,
                    "question_type_definition": get_question_type_definition_payload(question.question_type),
                    "passage": str(question.passage_id) if question.passage_id else None,
                    "passage_order": question.passage_order,
                    "passage_detail": (
                        {
                            "id": str(question.passage.id),
                            "title": question.passage.title,
                            "content_format": question.passage.content_format,
                            "passage_text": question.passage.passage_text,
                            "description": question.passage.description,
                        }
                        if question.passage_id
                        else None
                    ),
                    "difficulty_level": question.difficulty_level,
                    "subject_name": question.subject.name if question.subject_id else None,
                    "topic_name": question.topic.name if question.topic_id else None,
                    "accepted_answers": (
                        review_answer_key_for_question(question)
                        if review_visibility["show_correct_answers"]
                        else []
                    ),
                    "explanation": (
                        question.explanation
                        if review_visibility["show_explanations"]
                        else ""
                    ),
                    "attachments": [
                        {
                            "id": str(attachment.id),
                            "file": attachment.file.url if attachment.file else "",
                            "file_url": attachment.file.url if attachment.file else "",
                            "attachment_type": attachment.attachment_type,
                            "title": attachment.title,
                            "display_order": attachment.display_order,
                            "alt_text": attachment.alt_text,
                            "is_inline": attachment.is_inline,
                            "is_active": attachment.is_active,
                        }
                        for attachment in sorted(
                            [item for item in question.attachments.all() if item.is_active],
                            key=lambda item: (item.display_order, item.created_at),
                        )
                    ],
                    "selected_option": str(selected_option_id) if selected_option_id else None,
                    "selected_option_ids": selected_option_ids,
                    "answer_text": answer.answer_text if answer else "",
                    "answer_transcript": answer.answer_transcript if answer else "",
                    "response_artifacts": answer.response_artifacts if answer else [],
                    "is_marked_for_review": answer.is_marked_for_review if answer else False,
                    "marks_awarded": str(answer.marks_awarded) if answer else "0.00",
                    "negative_marks_applied": str(answer.negative_marks_applied) if answer else "0.00",
                    "result_status": (
                        "correct"
                        if has_response and answer and answer.is_correct
                        else "wrong"
                        if has_response
                        else "skipped"
                    ),
                    "options": [
                        {
                            "id": str(option.id),
                            "content_format": option.content_format,
                            "option_text": option.option_text,
                            "option_order": index + 1,
                            "is_selected": (
                                option.id == selected_option_id
                                or str(option.id) in selected_option_ids
                            ),
                            "is_correct": (
                                option.is_correct
                                if review_visibility["show_correct_answers"]
                                else False
                            ),
                        }
                        for index, option in enumerate(
                            ordered_options,
                        )
                    ],
                }
            )
        return rows


class AttemptStartSerializer(serializers.Serializer):
    exam = serializers.UUIDField()
    student = serializers.UUIDField()

    def validate(self, attrs):
        try:
            attrs["exam_obj"] = Exam.objects.select_related("institute").get(pk=attrs["exam"])
        except Exam.DoesNotExist as exc:
            raise serializers.ValidationError({"exam": "Exam not found."}) from exc

        try:
            attrs["student_obj"] = StudentProfile.objects.select_related("institute").get(
                pk=attrs["student"]
            )
        except StudentProfile.DoesNotExist as exc:
            raise serializers.ValidationError({"student": "Student not found."}) from exc

        return attrs


class SaveAnswerSerializer(serializers.Serializer):
    question = serializers.UUIDField()
    selected_option = serializers.UUIDField(required=False, allow_null=True)
    selected_option_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    answer_text = serializers.CharField(required=False, allow_blank=True, default="")
    answer_transcript = serializers.CharField(required=False, allow_blank=True)
    response_artifacts = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
    )
    time_spent_seconds = serializers.IntegerField(required=False, min_value=0, allow_null=True)
    is_marked_for_review = serializers.BooleanField(required=False, default=False)
    clear_response = serializers.BooleanField(required=False, default=False)
    skip = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        try:
            attrs["question_obj"] = Question.objects.get(pk=attrs["question"])
        except Question.DoesNotExist as exc:
            raise serializers.ValidationError({"question": "Question not found."}) from exc

        selected_option_id = attrs.get("selected_option")
        selected_option_ids = attrs.get("selected_option_ids", [])
        if selected_option_id:
            try:
                attrs["selected_option_obj"] = QuestionOption.objects.get(pk=selected_option_id)
            except QuestionOption.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"selected_option": "Selected option not found."}
                ) from exc
        else:
            attrs["selected_option_obj"] = None

        option_objects = []
        if selected_option_ids:
            if selected_option_id:
                raise serializers.ValidationError(
                    {
                        "selected_option_ids": (
                            "Use either selected_option or selected_option_ids, not both."
                        )
                    }
                )
            option_map = {
                str(option.id): option
                for option in QuestionOption.objects.filter(id__in=selected_option_ids)
            }
            missing = [
                str(option_id)
                for option_id in selected_option_ids
                if str(option_id) not in option_map
            ]
            if missing:
                raise serializers.ValidationError(
                    {"selected_option_ids": "One or more selected options were not found."}
                )
            option_objects = [option_map[str(option_id)] for option_id in selected_option_ids]
        attrs["selected_option_objs"] = option_objects

        if "response_artifacts" in attrs:
            normalized_artifacts = []
            for index, artifact in enumerate(attrs.get("response_artifacts", [])):
                asset_kind = str(artifact.get("asset_kind", "") or "").strip().lower()
                upload_token = str(artifact.get("upload_token", "") or "").strip()
                if not asset_kind:
                    raise serializers.ValidationError(
                        {"response_artifacts": f"Artifact {index + 1} must include asset_kind."}
                    )
                if not upload_token:
                    raise serializers.ValidationError(
                        {"response_artifacts": f"Artifact {index + 1} must include upload_token."}
                    )
                normalized_artifact = {
                    "asset_kind": asset_kind,
                    "upload_token": upload_token,
                }
                for field_name in ("file_name", "mime_type", "storage_status", "checksum", "storage_path", "file_url"):
                    value = str(artifact.get(field_name, "") or "").strip()
                    if value:
                        normalized_artifact[field_name] = value
                for field_name in ("size_bytes", "duration_seconds"):
                    value = artifact.get(field_name)
                    if value in (None, ""):
                        continue
                    try:
                        numeric_value = int(value)
                    except (TypeError, ValueError) as exc:
                        raise serializers.ValidationError(
                            {"response_artifacts": f"Artifact {index + 1} field {field_name} must be numeric."}
                        ) from exc
                    if numeric_value < 0:
                        raise serializers.ValidationError(
                            {"response_artifacts": f"Artifact {index + 1} field {field_name} cannot be negative."}
                        )
                    normalized_artifact[field_name] = numeric_value
                normalized_artifacts.append(normalized_artifact)
            attrs["response_artifacts"] = normalized_artifacts

        if attrs.get("clear_response") and (
            attrs.get("selected_option")
            or attrs.get("selected_option_ids")
            or attrs.get("answer_text", "").strip()
            or str(attrs.get("answer_transcript", "") or "").strip()
            or attrs.get("response_artifacts")
        ):
            raise serializers.ValidationError(
                {
                    "clear_response": (
                        "Clear response cannot be combined with answer content or response artifacts."
                    )
                }
            )
        if attrs.get("skip") and (
            attrs.get("selected_option")
            or attrs.get("selected_option_ids")
            or attrs.get("answer_text", "").strip()
            or str(attrs.get("answer_transcript", "") or "").strip()
            or attrs.get("response_artifacts")
        ):
            raise serializers.ValidationError(
                {"skip": "Skip cannot be combined with answer content or response artifacts."}
            )

        question_type = attrs["question_obj"].question_type
        has_text_answer = bool(attrs.get("answer_text", "").strip())
        has_answer_transcript = bool(str(attrs.get("answer_transcript", "") or "").strip())
        has_response_artifacts = "response_artifacts" in attrs and bool(attrs.get("response_artifacts"))
        supports_response_artifacts = question_type_supports_response_artifacts(question_type)
        allowed_response_artifact_types = question_type_allowed_response_artifact_types(question_type)
        if question_type_supports_text_answer(question_type):
            if selected_option_id or selected_option_ids:
                raise serializers.ValidationError(
                    {
                        "answer_text": (
                            "Short answer questions only accept answer_text responses."
                        )
                    }
                )
            if has_answer_transcript and not supports_response_artifacts:
                raise serializers.ValidationError(
                    {
                        "answer_transcript": (
                            "answer_transcript is only supported when this question type allows response artifacts."
                        )
                    }
                )
            if has_response_artifacts:
                unsupported_artifact = next(
                    (
                        artifact["asset_kind"]
                        for artifact in attrs.get("response_artifacts", [])
                        if artifact["asset_kind"] not in allowed_response_artifact_types
                    ),
                    None,
                )
                if unsupported_artifact:
                    raise serializers.ValidationError(
                        {
                            "response_artifacts": (
                                f"{unsupported_artifact} is not allowed for this question type."
                            )
                        }
                    )
        elif has_text_answer or has_answer_transcript or has_response_artifacts:
            raise serializers.ValidationError(
                {
                    "answer_text": (
                        "answer_text, answer_transcript, and response_artifacts are only "
                        "supported for text-response question types."
                    )
                }
            )

        return attrs


class UploadStudentResponseArtifactSerializer(serializers.Serializer):
    question = serializers.UUIDField()
    asset_kind = serializers.ChoiceField(
        choices=[
            ("audio_recording", "Audio Recording"),
            ("video_recording", "Video Recording"),
            ("image_upload", "Image Upload"),
            ("document_upload", "Document Upload"),
        ]
    )
    file = serializers.FileField()


class AttemptSubmitSerializer(serializers.Serializer):
    auto_submitted = serializers.BooleanField(required=False, default=False)


class AttemptSwitchSectionSerializer(serializers.Serializer):
    section = serializers.UUIDField()


class AttemptSummarySerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_type = serializers.CharField(source="exam.exam_type", read_only=True)
    source_type = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_teacher_name = serializers.SerializerMethodField()
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    server_time = serializers.SerializerMethodField()
    result_visible = serializers.SerializerMethodField()
    review_available = serializers.SerializerMethodField()
    accommodation_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = StudentExamAttempt
        fields = (
            "id",
            "exam",
            "exam_title",
            "exam_type",
            "source_type",
            "source_label",
            "source_name",
            "source_teacher_name",
            "student",
            "student_name",
            "attempt_no",
            "status",
            "started_at",
            "submitted_at",
            "expires_at",
            "total_questions",
            "attempted_questions",
            "correct_answers",
            "incorrect_answers",
            "skipped_questions",
            "score",
            "negative_score",
            "final_score",
            "percentage",
            "time_taken_seconds",
            "is_auto_submitted",
            "server_time",
            "result_visible",
            "review_available",
            "accommodation_snapshot",
        )

    def get_server_time(self, obj):
        from django.utils import timezone

        return timezone.now()

    def get_result_visible(self, obj):
        result = getattr(obj, "result", None)
        return is_result_visible_for_attempt(obj.exam, obj, result=result)

    def get_source_type(self, obj):
        return resolve_exam_source_metadata(obj.exam)["source_type"]

    def get_source_label(self, obj):
        return resolve_exam_source_metadata(obj.exam)["source_label"]

    def get_source_name(self, obj):
        return resolve_exam_source_metadata(obj.exam)["source_name"]

    def get_source_teacher_name(self, obj):
        return resolve_exam_source_metadata(obj.exam)["teacher_name"]

    def get_review_available(self, obj):
        result = getattr(obj, "result", None)
        return review_visibility_for_attempt(obj.exam, obj, result=result)[
            "review_available"
        ]

    def get_accommodation_snapshot(self, obj):
        return attempt_accommodation_snapshot(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.get_result_visible(instance):
            for field in (
                "correct_answers",
                "incorrect_answers",
                "skipped_questions",
                "score",
                "negative_score",
                "final_score",
                "percentage",
            ):
                data[field] = None
        return data
