from apps.attempts.models import StudentAnswer, StudentExamAttempt
from apps.attempts.serializers import StudentAnswerSerializer, attempt_accommodation_snapshot
from apps.attempts.services import attempt_integrity_summary
from apps.exams.services import is_review_available_for_attempt, resolve_exam_source_metadata
from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance
from apps.results.services import attempt_monitor_alerts, force_submit_eligibility
from apps.reports.models import AuditLog
from rest_framework import serializers


class ExamResultSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_admission_no = serializers.CharField(source="student.admission_no", read_only=True)
    review_available = serializers.SerializerMethodField()
    source_type = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_teacher_id = serializers.SerializerMethodField()
    source_teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = ExamResult
        fields = "__all__"

    def get_review_available(self, obj):
        if not obj.attempt_id:
            return False
        return is_review_available_for_attempt(obj.exam, obj.attempt, result=obj)

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


class ExamResultListSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_admission_no = serializers.CharField(source="student.admission_no", read_only=True)
    review_available = serializers.SerializerMethodField()
    source_type = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_teacher_id = serializers.SerializerMethodField()
    source_teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = ExamResult
        fields = (
            "id",
            "institute",
            "exam",
            "exam_title",
            "exam_code",
            "student",
            "student_name",
            "student_admission_no",
            "attempt",
            "result_status",
            "rank",
            "total_marks",
            "score",
            "negative_score",
            "final_score",
            "percentage",
            "correct_answers",
            "incorrect_answers",
            "skipped_questions",
            "time_taken_seconds",
            "published_at",
            "is_published",
            "metadata",
            "review_available",
            "source_type",
            "source_label",
            "source_name",
            "source_teacher_id",
            "source_teacher_name",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_review_available(self, obj):
        if not obj.attempt_id:
            return False
        return is_review_available_for_attempt(obj.exam, obj.attempt, result=obj)

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


class StudentTopicPerformanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    topic_name = serializers.CharField(source="topic.name", read_only=True)
    exam_title = serializers.CharField(source="exam.title", read_only=True)

    class Meta:
        model = StudentTopicPerformance
        fields = "__all__"


class ExamPerformanceSummarySerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    total_results_count = serializers.IntegerField(read_only=True)
    published_results_count = serializers.IntegerField(read_only=True)
    results_published = serializers.SerializerMethodField()

    class Meta:
        model = ExamPerformanceSummary
        fields = "__all__"

    def get_results_published(self, obj):
        total_results_count = getattr(obj, "total_results_count", 0) or 0
        published_results_count = getattr(obj, "published_results_count", 0) or 0
        return total_results_count > 0 and total_results_count == published_results_count


class GenerateFromAttemptSerializer(serializers.Serializer):
    attempt = serializers.UUIDField()


class GenerateForExamSerializer(serializers.Serializer):
    exam = serializers.UUIDField()


class PublishExamResultsSerializer(serializers.Serializer):
    exam = serializers.UUIDField()


class ExamLeaderboardSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_admission_no = serializers.CharField(source="student.admission_no", read_only=True)

    class Meta:
        model = ExamResult
        fields = (
            "id",
            "student",
            "student_name",
            "student_admission_no",
            "rank",
            "final_score",
            "percentage",
            "time_taken_seconds",
            "result_status",
            "is_published",
        )


class TeacherExamAttemptSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_admission_no = serializers.CharField(source="student.admission_no", read_only=True)
    can_force_submit = serializers.SerializerMethodField()
    force_submit_block_reason = serializers.SerializerMethodField()
    alerts = serializers.SerializerMethodField()
    integrity_summary = serializers.SerializerMethodField()
    accommodation_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = StudentExamAttempt
        fields = (
            "id",
            "exam",
            "exam_title",
            "student",
            "student_name",
            "student_admission_no",
            "attempt_no",
            "status",
            "started_at",
            "submitted_at",
            "attempted_questions",
            "correct_answers",
            "incorrect_answers",
            "skipped_questions",
            "final_score",
            "percentage",
            "time_taken_seconds",
            "is_auto_submitted",
            "can_force_submit",
            "force_submit_block_reason",
            "integrity_summary",
            "accommodation_snapshot",
            "alerts",
        )

    def get_can_force_submit(self, obj):
        return force_submit_eligibility(obj)["allowed"]

    def get_force_submit_block_reason(self, obj):
        return force_submit_eligibility(obj)["reason"]

    def get_alerts(self, obj):
        return attempt_monitor_alerts(obj)

    def get_integrity_summary(self, obj):
        return attempt_integrity_summary(obj)

    def get_accommodation_snapshot(self, obj):
        return attempt_accommodation_snapshot(obj)


class TeacherQuestionAnalysisSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    question_text_summary = serializers.CharField()
    subject_name = serializers.CharField(allow_null=True)
    topic_name = serializers.CharField(allow_null=True)
    total_attempts = serializers.IntegerField()
    correct_count = serializers.IntegerField()
    wrong_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()
    marked_for_review_count = serializers.IntegerField()


class LiveExamMonitorSerializer(serializers.Serializer):
    exam_id = serializers.UUIDField()
    exam_title = serializers.CharField()
    exam_code = serializers.CharField()
    exam_status = serializers.CharField()
    total_students = serializers.IntegerField()
    started_students = serializers.IntegerField()
    not_started_students = serializers.IntegerField()
    in_progress_students = serializers.IntegerField()
    submitted_students = serializers.IntegerField()
    auto_submitted_students = serializers.IntegerField()
    completed_students = serializers.IntegerField()
    alerted_attempts = serializers.IntegerField()
    high_alert_attempts = serializers.IntegerField()
    medium_alert_attempts = serializers.IntegerField()
    stalled_attempts = serializers.IntegerField()
    integrity_warning_attempts = serializers.IntegerField()
    integrity_warnings_total = serializers.IntegerField()
    threshold_reached_attempts = serializers.IntegerField()
    attempts_by_health = serializers.DictField(child=serializers.IntegerField())
    completion_percentage = serializers.FloatField()
    submission_percentage = serializers.FloatField()
    last_activity_at = serializers.DateTimeField(allow_null=True)
    recent_attempts = serializers.ListField(child=serializers.DictField())


class TeacherAttemptInterventionSerializer(serializers.ModelSerializer):
    user_label = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "action",
            "message",
            "metadata",
            "created_at",
            "user_label",
        )

    def get_user_label(self, obj):
        if not obj.user:
            return "System"
        full_name = obj.user.get_full_name().strip()
        return full_name or obj.user.username


class TeacherAttemptInterventionCreateSerializer(serializers.Serializer):
    attempt = serializers.UUIDField()
    note = serializers.CharField(max_length=1000)
    follow_up = serializers.ChoiceField(
        choices=[
            ("monitoring", "Monitoring"),
            ("contacted", "Contacted"),
            ("force_submit_considered", "Force Submit Considered"),
            ("resolved", "Resolved"),
        ]
    )


class TeacherAttemptQuestionAnalysisRowSerializer(serializers.Serializer):
    answer_id = serializers.UUIDField(allow_null=True)
    question_id = serializers.UUIDField()
    question_order = serializers.IntegerField()
    question_text_summary = serializers.CharField()
    question_type = serializers.CharField()
    subject_name = serializers.CharField(allow_null=True)
    topic_name = serializers.CharField(allow_null=True)
    selected_option = serializers.UUIDField(allow_null=True)
    selected_option_text = serializers.CharField(allow_null=True)
    selected_option_ids = serializers.ListField(child=serializers.CharField(), default=list)
    selected_option_texts = serializers.ListField(child=serializers.CharField(), default=list)
    answer_text = serializers.CharField(allow_blank=True)
    outcome = serializers.ChoiceField(choices=["correct", "wrong", "skipped"])
    is_correct = serializers.BooleanField(allow_null=True)
    was_skipped = serializers.BooleanField()
    is_marked_for_review = serializers.BooleanField()
    marks_awarded = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True)
    negative_marks_applied = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True)
    time_spent_seconds = serializers.IntegerField(allow_null=True)
    answered_at = serializers.DateTimeField(allow_null=True)


class TeacherAttemptQuestionAnalysisSummarySerializer(serializers.Serializer):
    total_questions = serializers.IntegerField()
    attempted_questions = serializers.IntegerField()
    correct_count = serializers.IntegerField()
    wrong_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()
    marked_count = serializers.IntegerField()
    total_time_seconds = serializers.IntegerField()
    average_time_seconds = serializers.IntegerField()


class TeacherAttemptQuestionAnalysisResponseSerializer(serializers.Serializer):
    selected_attempt = TeacherExamAttemptSerializer(allow_null=True)
    summary = TeacherAttemptQuestionAnalysisSummarySerializer()
    applied_filter = serializers.CharField()
    results = TeacherAttemptQuestionAnalysisRowSerializer(many=True)
