from rest_framework import serializers

from apps.attempts.models import StudentAnswer, StudentExamAttempt
from apps.exams.serializers import StudentExamQuestionDetailSerializer
from apps.exams.models import Exam
from apps.question_bank.models import Question, QuestionOption
from apps.students.models import StudentProfile


class StudentAnswerSerializer(serializers.ModelSerializer):
    question_text_summary = serializers.SerializerMethodField()
    selected_option_text = serializers.CharField(source="selected_option.option_text", read_only=True)

    class Meta:
        model = StudentAnswer
        fields = (
            "id",
            "attempt",
            "question",
            "question_text_summary",
            "selected_option",
            "selected_option_text",
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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        exam = instance.attempt.exam
        allow_review = exam.show_result_immediately or exam.allow_review_after_submit
        result_published = getattr(getattr(instance.attempt, "result", None), "is_published", False)

        if instance.attempt.status == "in_progress" or not (allow_review or result_published):
            data.pop("is_correct", None)
            data.pop("marks_awarded", None)
            data.pop("negative_marks_applied", None)
        return data


class StudentExamAttemptSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    answers = StudentAnswerSerializer(many=True, read_only=True)
    server_time = serializers.SerializerMethodField()

    class Meta:
        model = StudentExamAttempt
        fields = "__all__"

    def get_server_time(self, obj):
        from django.utils import timezone

        return timezone.now()


class AttemptDetailSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    questions = serializers.SerializerMethodField()
    answers = StudentAnswerSerializer(many=True, read_only=True)
    server_time = serializers.SerializerMethodField()

    class Meta:
        model = StudentExamAttempt
        fields = (
            "id",
            "institute",
            "exam",
            "exam_title",
            "exam_code",
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
            "metadata",
            "questions",
            "answers",
            "created_at",
            "updated_at",
        )

    def get_questions(self, obj):
        exam_questions = (
            obj.exam.exam_questions.filter(is_active=True)
            .select_related("question")
            .prefetch_related("question__options", "question__attachments")
            .order_by("question_order")
        )
        return StudentExamQuestionDetailSerializer(exam_questions, many=True).data

    def get_server_time(self, obj):
        from django.utils import timezone

        return timezone.now()


class AttemptReviewSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    server_time = serializers.SerializerMethodField()
    review_questions = serializers.SerializerMethodField()

    class Meta:
        model = StudentExamAttempt
        fields = (
            "id",
            "exam",
            "exam_title",
            "exam_code",
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
            "review_questions",
        )

    def get_server_time(self, obj):
        from django.utils import timezone

        return timezone.now()

    def get_review_questions(self, obj):
        exam_questions = (
            obj.exam.exam_questions.filter(is_active=True)
            .select_related("question", "question__topic", "question__subject")
            .prefetch_related("question__options", "question__attachments")
            .order_by("question_order")
        )
        answer_map = {
            answer.question_id: answer
            for answer in obj.answers.select_related("selected_option").all()
        }
        rows = []
        for exam_question in exam_questions:
            question = exam_question.question
            answer = answer_map.get(question.id)
            selected_option_id = answer.selected_option_id if answer else None
            rows.append(
                {
                    "exam_question_id": str(exam_question.id),
                    "question_id": str(question.id),
                    "question_order": exam_question.question_order,
                    "section_name": exam_question.section_name,
                    "question_text": question.question_text,
                    "content_format": question.content_format,
                    "question_type": question.question_type,
                    "difficulty_level": question.difficulty_level,
                    "subject_name": question.subject.name if question.subject_id else None,
                    "topic_name": question.topic.name if question.topic_id else None,
                    "explanation": question.explanation,
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
                    "answer_text": answer.answer_text if answer else "",
                    "is_marked_for_review": answer.is_marked_for_review if answer else False,
                    "marks_awarded": str(answer.marks_awarded) if answer else "0.00",
                    "negative_marks_applied": str(answer.negative_marks_applied) if answer else "0.00",
                    "result_status": (
                        "correct"
                        if answer and answer.selected_option_id and answer.is_correct
                        else "wrong"
                        if answer and answer.selected_option_id
                        else "skipped"
                    ),
                    "options": [
                        {
                            "id": str(option.id),
                            "content_format": option.content_format,
                            "option_text": option.option_text,
                            "option_order": option.option_order,
                            "is_selected": option.id == selected_option_id,
                            "is_correct": option.is_correct,
                        }
                        for option in sorted(
                            [item for item in question.options.all() if item.is_active],
                            key=lambda item: item.option_order,
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
        if selected_option_id:
            try:
                attrs["selected_option_obj"] = QuestionOption.objects.get(pk=selected_option_id)
            except QuestionOption.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"selected_option": "Selected option not found."}
                ) from exc
        else:
            attrs["selected_option_obj"] = None

        if attrs.get("clear_response") and attrs.get("selected_option"):
            raise serializers.ValidationError(
                {"clear_response": "Clear response cannot be combined with selected_option."}
            )
        if attrs.get("skip") and attrs.get("selected_option"):
            raise serializers.ValidationError(
                {"skip": "Skip cannot be combined with selected_option."}
            )

        return attrs


class AttemptSubmitSerializer(serializers.Serializer):
    auto_submitted = serializers.BooleanField(required=False, default=False)


class AttemptSummarySerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    server_time = serializers.SerializerMethodField()

    class Meta:
        model = StudentExamAttempt
        fields = (
            "id",
            "exam",
            "exam_title",
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
        )

    def get_server_time(self, obj):
        from django.utils import timezone

        return timezone.now()
