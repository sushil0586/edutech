from django.utils import timezone
from rest_framework import serializers

from apps.exams.models import (
    Exam,
    ExamPublishLog,
    ExamQuestion,
    ExamSection,
    ExamStudentAssignment,
)
from apps.exams.services import (
    apply_institute_exam_defaults,
    is_exam_assigned_to_student,
    is_review_available_for_attempt,
    remaining_attempts_for_student,
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
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["duration_minutes"].required = False

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)
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

    class Meta:
        model = Exam
        fields = "__all__"


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

    class Meta:
        model = Exam
        fields = "__all__"

    def get_active_questions_count(self, obj):
        return obj.exam_questions.filter(is_active=True).count()

    def get_assigned_student_count(self, obj):
        return obj.student_assignments.filter(is_active=True).count()


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
    assignment_mode = serializers.CharField(read_only=True)
    assigned_to_student = serializers.SerializerMethodField()

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
            "assignment_mode",
            "assigned_to_student",
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
