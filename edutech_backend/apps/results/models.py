from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.academics.models import Subject, Topic
from apps.attempts.models import StudentExamAttempt
from apps.exams.models import Exam
from apps.institutes.models import Institute
from apps.students.models import StudentProfile
from common.models import BaseModel


class ResultStatus(models.TextChoices):
    PASS = "pass", "Pass"
    FAIL = "fail", "Fail"
    ABSENT = "absent", "Absent"
    WITHHELD = "withheld", "Withheld"


class ExamResult(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="exam_results",
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="results",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="exam_results",
    )
    attempt = models.OneToOneField(
        StudentExamAttempt,
        on_delete=models.CASCADE,
        related_name="result",
    )
    result_status = models.CharField(max_length=20, choices=ResultStatus.choices)
    rank = models.PositiveIntegerField(blank=True, null=True)
    total_marks = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    negative_score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    final_score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    percentage = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    correct_answers = models.PositiveIntegerField(default=0)
    incorrect_answers = models.PositiveIntegerField(default=0)
    skipped_questions = models.PositiveIntegerField(default=0)
    time_taken_seconds = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(blank=True, null=True)
    is_published = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["rank", "-final_score", "time_taken_seconds"]
        constraints = [
            models.UniqueConstraint(
                fields=["exam", "student", "attempt"],
                name="unique_exam_student_attempt_result",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "exam", "student"]),
            models.Index(fields=["result_status", "is_published"]),
            models.Index(fields=["rank", "final_score", "percentage"]),
            models.Index(fields=["published_at"]),
        ]

    def clean(self):
        super().clean()
        if self.attempt_id and self.attempt.status not in {"submitted", "auto_submitted"}:
            raise ValidationError({"attempt": "Result can only be generated from submitted attempts."})
        if self.exam_id and self.attempt_id and self.attempt.exam_id != self.exam_id:
            raise ValidationError({"attempt": "Attempt must belong to the selected exam."})
        if self.student_id and self.attempt_id and self.attempt.student_id != self.student_id:
            raise ValidationError({"attempt": "Attempt must belong to the selected student."})
        if self.institute_id and self.exam_id and self.exam.institute_id != self.institute_id:
            raise ValidationError({"exam": "Exam must belong to the selected institute."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.full_name} - {self.exam.code}"


class StudentTopicPerformance(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="topic_performances",
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="topic_performances",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="topic_performances",
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="topic_performances",
    )
    topic = models.ForeignKey(
        Topic,
        on_delete=models.SET_NULL,
        related_name="student_performances",
        blank=True,
        null=True,
    )
    total_questions = models.PositiveIntegerField(default=0)
    attempted_questions = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    incorrect_answers = models.PositiveIntegerField(default=0)
    skipped_questions = models.PositiveIntegerField(default=0)
    score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    negative_score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    final_score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    percentage = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["student", "subject", "topic"]
        constraints = [
            models.UniqueConstraint(
                fields=["exam", "student", "subject", "topic"],
                name="unique_exam_student_subject_topic_performance",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "exam", "student"]),
            models.Index(fields=["subject", "topic"]),
            models.Index(fields=["percentage"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} - {self.subject.name}"


class ExamPerformanceSummary(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="exam_summaries",
    )
    exam = models.OneToOneField(
        Exam,
        on_delete=models.CASCADE,
        related_name="performance_summary",
    )
    total_students = models.PositiveIntegerField(default=0)
    total_attempted = models.PositiveIntegerField(default=0)
    total_passed = models.PositiveIntegerField(default=0)
    total_failed = models.PositiveIntegerField(default=0)
    average_score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    highest_score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    lowest_score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    average_percentage = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    last_calculated_at = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-last_calculated_at"]
        indexes = [
            models.Index(fields=["institute", "exam"]),
            models.Index(fields=["last_calculated_at"]),
        ]

    def __str__(self):
        return f"{self.exam.code} summary"
