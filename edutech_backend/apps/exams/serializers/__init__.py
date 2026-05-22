from django.utils import timezone
from rest_framework import serializers

from apps.exams.models import Exam, ExamPublishLog, ExamQuestion, ExamSection
from apps.exams.services import sync_total_marks_from_questions
from apps.question_bank.models import QuestionAttachment, QuestionOption


class ExamSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSection
        fields = "__all__"


class ExamQuestionSerializer(serializers.ModelSerializer):
    question_text_summary = serializers.SerializerMethodField()

    class Meta:
        model = ExamQuestion
        fields = (
            "id",
            "exam",
            "question",
            "question_text_summary",
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


class ExamPublishLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = ExamPublishLog
        fields = "__all__"


class ExamWriteSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)
        start_at = attrs.get("start_at", getattr(instance, "start_at", None))
        end_at = attrs.get("end_at", getattr(instance, "end_at", None))
        if start_at and end_at and end_at <= start_at:
            raise serializers.ValidationError(
                {"end_at": "End time must be after start time."}
            )
        return attrs

    class Meta:
        model = Exam
        fields = "__all__"


class ExamReadSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    cohort_name = serializers.CharField(source="cohort.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    sections = ExamSectionSerializer(many=True, read_only=True)
    exam_questions = ExamQuestionSerializer(many=True, read_only=True)
    publish_logs = ExamPublishLogSerializer(many=True, read_only=True)
    active_questions_count = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = "__all__"

    def get_active_questions_count(self, obj):
        return obj.exam_questions.filter(is_active=True).count()


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

    class Meta:
        model = ExamQuestion
        fields = (
            "id",
            "exam",
            "question",
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

    def get_options(self, obj):
        options = obj.question.options.filter(is_active=True).order_by("option_order")
        return StudentExamQuestionOptionSerializer(options, many=True).data

    def get_attachments(self, obj):
        attachments = obj.question.attachments.filter(is_active=True).order_by("display_order", "created_at")
        return StudentExamQuestionAttachmentSerializer(attachments, many=True).data


class StudentExamDetailSerializer(ExamReadSerializer):
    exam_questions = StudentExamQuestionDetailSerializer(many=True, read_only=True)


class StudentExamAvailabilitySerializer(serializers.ModelSerializer):
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

    class Meta:
        model = Exam
        fields = (
            "id",
            "title",
            "code",
            "status",
            "subject_name",
            "duration_minutes",
            "start_at",
            "end_at",
            "total_marks",
            "passing_marks",
            "instructions",
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
        )

    def _student(self):
        request = self.context.get("request")
        profile = getattr(getattr(request, "user", None), "account_profile", None)
        return getattr(profile, "student_profile", None)

    def _student_attempts(self, obj):
        student = self._student()
        if student is None:
            return []
        return [
            attempt
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
        return max(obj.max_attempts - self.get_attempts_used(obj), 0)

    def get_active_attempt(self, obj):
        attempt = self._active_attempt(obj)
        if attempt is None:
            return None
        return {
            "id": str(attempt.id),
            "status": attempt.status,
            "started_at": attempt.started_at,
            "expires_at": attempt.expires_at,
        }

    def get_availability_state(self, obj):
        return self._availability_state_value(obj)

    def get_starts_in_seconds(self, obj):
        if not obj.start_at:
            return None
        return int((obj.start_at - timezone.now()).total_seconds())

    def get_ends_in_seconds(self, obj):
        if not obj.end_at:
            return None
        return int((obj.end_at - timezone.now()).total_seconds())

    def get_can_start(self, obj):
        return self._availability_state_value(obj) == "available_now" and self._active_attempt(obj) is None and self.get_remaining_attempts(obj) > 0

    def get_can_resume(self, obj):
        return self._active_attempt(obj) is not None

    def get_review_available(self, obj):
        latest_attempt = self._latest_attempt(obj)
        if latest_attempt is None:
            return False
        result = getattr(latest_attempt, "result", None)
        return obj.allow_review_after_submit or obj.show_result_immediately or bool(result and result.is_published)

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
