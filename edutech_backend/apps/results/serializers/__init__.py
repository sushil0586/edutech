from rest_framework import serializers

from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance
from apps.attempts.models import StudentExamAttempt
from apps.results.services import attempt_monitor_alerts, force_submit_eligibility


class ExamResultSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_admission_no = serializers.CharField(source="student.admission_no", read_only=True)

    class Meta:
        model = ExamResult
        fields = "__all__"


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

    class Meta:
        model = ExamPerformanceSummary
        fields = "__all__"


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
            "alerts",
        )

    def get_can_force_submit(self, obj):
        return force_submit_eligibility(obj)["allowed"]

    def get_force_submit_block_reason(self, obj):
        return force_submit_eligibility(obj)["reason"]

    def get_alerts(self, obj):
        return attempt_monitor_alerts(obj)


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
    completion_percentage = serializers.FloatField()
    submission_percentage = serializers.FloatField()
    last_activity_at = serializers.DateTimeField(allow_null=True)
    recent_attempts = serializers.ListField(child=serializers.DictField())
