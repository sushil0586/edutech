from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.academics.models import AcademicYear, Cohort, Program, Subject
from apps.exams.services import validate_exam_scope
from apps.institutes.models import Institute
from apps.question_bank.models import Question
from apps.teachers.models import TeacherProfile
from common.models import BaseModel


class ExamType(models.TextChoices):
    PRACTICE = "practice", "Practice"
    QUIZ = "quiz", "Quiz"
    TEST = "test", "Test"
    ASSESSMENT = "assessment", "Assessment"
    MOCK_EXAM = "mock_exam", "Mock Exam"
    FINAL_EXAM = "final_exam", "Final Exam"


class DeliveryMode(models.TextChoices):
    ONLINE = "online", "Online"
    OFFLINE = "offline", "Offline"
    HYBRID = "hybrid", "Hybrid"


class ExamStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SCHEDULED = "scheduled", "Scheduled"
    LIVE = "live", "Live"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class Exam(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="exams",
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="exams",
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name="exams",
    )
    cohort = models.ForeignKey(
        Cohort,
        on_delete=models.SET_NULL,
        related_name="exams",
        blank=True,
        null=True,
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        related_name="exams",
        blank=True,
        null=True,
    )
    title = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    exam_type = models.CharField(max_length=30, choices=ExamType.choices)
    delivery_mode = models.CharField(max_length=20, choices=DeliveryMode.choices)
    status = models.CharField(max_length=20, choices=ExamStatus.choices, default=ExamStatus.DRAFT)
    duration_minutes = models.PositiveIntegerField()
    total_marks = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    passing_marks = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    start_at = models.DateTimeField(blank=True, null=True)
    end_at = models.DateTimeField(blank=True, null=True)
    instructions = models.TextField(blank=True)
    allow_late_submit = models.BooleanField(default=False)
    randomize_questions = models.BooleanField(default=False)
    randomize_options = models.BooleanField(default=False)
    show_result_immediately = models.BooleanField(default=False)
    allow_review_after_submit = models.BooleanField(default=True)
    max_attempts = models.PositiveIntegerField(default=1)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-start_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"],
                name="unique_exam_code_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "academic_year"]),
            models.Index(fields=["program", "cohort", "subject"]),
            models.Index(fields=["exam_type", "delivery_mode", "status"]),
            models.Index(fields=["start_at", "end_at"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.duration_minutes <= 0:
            raise ValidationError({"duration_minutes": "Duration must be greater than zero."})
        if self.total_marks < 0:
            raise ValidationError({"total_marks": "Total marks cannot be negative."})
        if self.passing_marks < 0:
            raise ValidationError({"passing_marks": "Passing marks cannot be negative."})
        if self.passing_marks > self.total_marks:
            raise ValidationError({"passing_marks": "Passing marks cannot exceed total marks."})
        if self.max_attempts <= 0:
            raise ValidationError({"max_attempts": "Max attempts must be at least 1."})
        if self.start_at and self.end_at and self.end_at <= self.start_at:
            raise ValidationError({"end_at": "End time must be after start time."})
        if self.institute_id and self.academic_year_id and self.program_id:
            validate_exam_scope(self)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.code})"


class ExamSection(BaseModel):
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    section_order = models.PositiveIntegerField(default=1)
    instructions = models.TextField(blank=True)
    total_questions = models.PositiveIntegerField(default=0)
    marks_per_question = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        blank=True,
        null=True,
    )
    negative_marks_per_question = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["section_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["exam", "section_order"],
                name="unique_exam_section_order",
            )
        ]
        indexes = [
            models.Index(fields=["exam", "section_order"]),
            models.Index(fields=["exam", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.total_questions < 0:
            raise ValidationError({"total_questions": "Total questions cannot be negative."})
        if self.marks_per_question is not None and self.marks_per_question < 0:
            raise ValidationError({"marks_per_question": "Marks per question cannot be negative."})
        if (
            self.negative_marks_per_question is not None
            and self.negative_marks_per_question < 0
        ):
            raise ValidationError(
                {"negative_marks_per_question": "Negative marks per question cannot be negative."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.exam.code} - {self.name}"


class ExamQuestion(BaseModel):
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="exam_questions",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="exam_links",
    )
    section_name = models.CharField(max_length=150, blank=True)
    question_order = models.PositiveIntegerField(default=1)
    marks = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    negative_marks = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    is_mandatory = models.BooleanField(default=True)

    class Meta:
        ordering = ["question_order", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["exam", "question"],
                name="unique_exam_question_pair",
            ),
            models.UniqueConstraint(
                fields=["exam", "question_order"],
                name="unique_exam_question_order",
            ),
        ]
        indexes = [
            models.Index(fields=["exam", "question_order"]),
            models.Index(fields=["exam", "question"]),
            models.Index(fields=["exam", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.exam_id and self.question_id and self.question.institute_id != self.exam.institute_id:
            raise ValidationError({"question": "Question must belong to the same institute as exam."})
        if self.marks is not None and self.marks < 0:
            raise ValidationError({"marks": "Marks cannot be negative."})
        if self.negative_marks is not None and self.negative_marks < 0:
            raise ValidationError({"negative_marks": "Negative marks cannot be negative."})

    def save(self, *args, **kwargs):
        if self.marks is None and self.question_id:
            self.marks = self.question.default_marks
        if self.negative_marks is None and self.question_id:
            self.negative_marks = self.question.negative_marks
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.exam.code} - Q{self.question_order}"


class ExamPublishLog(models.Model):
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="publish_logs",
    )
    old_status = models.CharField(max_length=20, choices=ExamStatus.choices)
    new_status = models.CharField(max_length=20, choices=ExamStatus.choices)
    changed_by = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="exam_publish_logs",
        blank=True,
        null=True,
    )
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["exam", "created_at"]),
            models.Index(fields=["new_status"]),
        ]

    def __str__(self):
        return f"{self.exam.code}: {self.old_status} -> {self.new_status}"
