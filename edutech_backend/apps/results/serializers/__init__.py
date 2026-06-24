from django.utils import timezone
from apps.attempts.models import StudentAnswer, StudentExamAttempt
from apps.attempts.serializers import StudentAnswerSerializer, attempt_accommodation_snapshot
from apps.attempts.services import attempt_integrity_summary
from apps.exams.services import (
    is_review_available_for_attempt,
    resolve_exam_experience_profile,
    resolve_exam_source_metadata,
)
from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance
from apps.results.services import attempt_monitor_alerts, force_submit_eligibility
from apps.reports.models import AuditLog
from rest_framework import serializers


def _review_release_risk_payload(obj):
    pending_count = getattr(obj, "pending_review_tasks_count", 0) or 0
    recheck_count = getattr(obj, "recheck_review_tasks_count", 0) or 0
    oldest_opened_at = getattr(obj, "oldest_pending_review_opened_at", None)
    oldest_open_hours = 0.0
    if oldest_opened_at:
        oldest_open_hours = max(
            (timezone.now() - oldest_opened_at).total_seconds() / 3600,
            0.0,
        )

    if pending_count <= 0:
        level = "none"
        label = "No review risk"
        summary = "No unresolved review work is currently blocking release."
    elif pending_count >= 8 or oldest_open_hours >= 72 or recheck_count >= 3:
        level = "high"
        label = "High release risk"
        summary = "Review backlog is severe enough to threaten timely result publication."
    elif pending_count >= 3 or oldest_open_hours >= 24 or recheck_count >= 1:
        level = "medium"
        label = "Medium release risk"
        summary = "Review backlog needs attention before it grows into a publication delay."
    else:
        level = "low"
        label = "Low release risk"
        summary = "There are review blockers, but current pressure still looks manageable."

    return {
        "level": level,
        "label": label,
        "summary": summary,
        "pending_review_tasks": pending_count,
        "recheck_review_tasks": recheck_count,
        "oldest_open_hours": round(oldest_open_hours, 2),
    }


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
    pending_review_tasks_count = serializers.IntegerField(read_only=True)
    recheck_review_tasks_count = serializers.IntegerField(read_only=True)
    results_published = serializers.SerializerMethodField()
    review_blocked = serializers.SerializerMethodField()
    review_release_risk = serializers.SerializerMethodField()
    score_distribution = serializers.SerializerMethodField()
    section_performance = serializers.SerializerMethodField()
    experience_profile = serializers.SerializerMethodField()

    class Meta:
        model = ExamPerformanceSummary
        fields = "__all__"

    def get_results_published(self, obj):
        total_results_count = getattr(obj, "total_results_count", 0) or 0
        published_results_count = getattr(obj, "published_results_count", 0) or 0
        return total_results_count > 0 and total_results_count == published_results_count

    def get_review_blocked(self, obj):
        return (getattr(obj, "pending_review_tasks_count", 0) or 0) > 0

    def get_review_release_risk(self, obj):
        return _review_release_risk_payload(obj)

    def get_score_distribution(self, obj):
        metadata = obj.metadata if isinstance(getattr(obj, "metadata", {}), dict) else {}
        return metadata.get("score_distribution", [])

    def get_section_performance(self, obj):
        metadata = obj.metadata if isinstance(getattr(obj, "metadata", {}), dict) else {}
        return metadata.get("section_performance", [])

    def get_experience_profile(self, obj):
        metadata = obj.metadata if isinstance(getattr(obj, "metadata", {}), dict) else {}
        if isinstance(metadata.get("experience_profile"), dict):
            return metadata["experience_profile"]
        return resolve_exam_experience_profile(obj.exam)


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
    passage_title = serializers.CharField(allow_blank=True, required=False)
    subject_name = serializers.CharField(allow_null=True)
    topic_name = serializers.CharField(allow_null=True)
    total_attempts = serializers.IntegerField()
    correct_count = serializers.IntegerField()
    wrong_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()
    marked_for_review_count = serializers.IntegerField()
    correct_rate = serializers.FloatField()
    wrong_rate = serializers.FloatField()
    skip_rate = serializers.FloatField()
    quality_signal = serializers.CharField()
    revision_priority = serializers.CharField()
    quality_note = serializers.CharField()
    distractor_insights = serializers.ListField(child=serializers.DictField(), default=list)
    revision_reasons = serializers.ListField(child=serializers.CharField(), default=list)


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
    review_task_id = serializers.UUIDField(allow_null=True, required=False)
    question_id = serializers.UUIDField()
    question_order = serializers.IntegerField()
    question_text_summary = serializers.CharField()
    question_text = serializers.CharField(allow_blank=True, required=False)
    assertion_text = serializers.CharField(allow_blank=True, required=False)
    reason_text = serializers.CharField(allow_blank=True, required=False)
    matrix_left_items = serializers.ListField(child=serializers.CharField(), default=list)
    matrix_right_items = serializers.ListField(child=serializers.CharField(), default=list)
    question_type = serializers.CharField()
    question_type_definition = serializers.JSONField(allow_null=True, required=False)
    content_format = serializers.CharField(allow_blank=True, required=False)
    question_marks = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True)
    passage = serializers.UUIDField(allow_null=True, required=False)
    passage_order = serializers.IntegerField(allow_null=True, required=False)
    passage_title = serializers.CharField(allow_blank=True, required=False)
    passage_content_format = serializers.CharField(allow_blank=True, required=False)
    passage_text = serializers.CharField(allow_blank=True, required=False)
    passage_description = serializers.CharField(allow_blank=True, required=False)
    subject_name = serializers.CharField(allow_null=True)
    topic_name = serializers.CharField(allow_null=True)
    accepted_answers = serializers.ListField(child=serializers.CharField(), default=list)
    selected_option = serializers.UUIDField(allow_null=True)
    selected_option_text = serializers.CharField(allow_null=True)
    selected_option_ids = serializers.ListField(child=serializers.CharField(), default=list)
    selected_option_texts = serializers.ListField(child=serializers.CharField(), default=list)
    answer_text = serializers.CharField(allow_blank=True)
    answer_transcript = serializers.CharField(allow_blank=True, required=False)
    response_artifacts = serializers.ListField(child=serializers.DictField(), default=list)
    attachments = serializers.ListField(child=serializers.DictField(), default=list)
    media_context = serializers.JSONField(required=False)
    evaluation_status = serializers.CharField(allow_blank=True, required=False)
    outcome = serializers.ChoiceField(choices=["correct", "wrong", "skipped"])
    is_correct = serializers.BooleanField(allow_null=True)
    was_skipped = serializers.BooleanField()
    is_marked_for_review = serializers.BooleanField()
    marks_awarded = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True)
    negative_marks_applied = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True)
    reviewed_at = serializers.DateTimeField(allow_null=True)
    reviewed_by_teacher_name = serializers.CharField(allow_blank=True, required=False)
    review_notes = serializers.CharField(allow_blank=True)
    has_rubric = serializers.BooleanField(required=False)
    rubric = serializers.JSONField(allow_null=True, required=False)
    rubric_scores = serializers.ListField(child=serializers.DictField(), default=list)
    rubric_total = serializers.CharField(allow_blank=True, required=False)
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
