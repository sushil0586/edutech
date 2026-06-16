from rest_framework import serializers

from apps.attempts.models import AttemptIntegrityEvent, StudentAnswer, StudentExamAttempt
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
    resolve_exam_source_metadata,
    review_visibility_for_attempt,
)
from apps.question_bank.models import Question, QuestionOption
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


class StudentAnswerSerializer(serializers.ModelSerializer):
    question = serializers.UUIDField(source="question_id", read_only=True)
    question_text_summary = serializers.SerializerMethodField()
    selected_option_text = serializers.CharField(source="selected_option.option_text", read_only=True)
    selected_option_ids = serializers.SerializerMethodField()
    selected_option_texts = serializers.SerializerMethodField()

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
            "is_correct",
            "marks_awarded",
            "negative_marks_applied",
            "answered_at",
            "time_spent_seconds",
            "is_marked_for_review",
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
            .select_related("question", "section")
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
            .select_related("question", "question__topic", "question__subject", "section")
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
                    "content_format": question.content_format,
                    "question_type": question.question_type,
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

        if attrs.get("clear_response") and (
            attrs.get("selected_option")
            or attrs.get("selected_option_ids")
            or attrs.get("answer_text", "").strip()
        ):
            raise serializers.ValidationError(
                {
                    "clear_response": (
                        "Clear response cannot be combined with selected_option or "
                        "selected_option_ids."
                    )
                }
            )
        if attrs.get("skip") and (
            attrs.get("selected_option")
            or attrs.get("selected_option_ids")
            or attrs.get("answer_text", "").strip()
        ):
            raise serializers.ValidationError(
                {"skip": "Skip cannot be combined with selected_option, selected_option_ids, or answer_text."}
            )

        question_type = attrs["question_obj"].question_type
        has_text_answer = bool(attrs.get("answer_text", "").strip())
        if question_type == "short_answer":
            if selected_option_id or selected_option_ids:
                raise serializers.ValidationError(
                    {
                        "answer_text": (
                            "Short answer questions only accept answer_text responses."
                        )
                    }
                )
        elif has_text_answer:
            raise serializers.ValidationError(
                {"answer_text": "answer_text is only supported for short answer questions."}
            )

        return attrs


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
