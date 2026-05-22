from rest_framework import serializers

from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance
from apps.attempts.models import StudentExamAttempt


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
        )


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
