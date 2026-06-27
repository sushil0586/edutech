from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.academics.models import AcademicYear, Cohort, Program, Subject
from apps.exams.services import generate_exam_access_key, normalize_exam_access_key, validate_exam_scope
from apps.institutes.models import Institute
from apps.question_bank.models import Question
from apps.students.models import StudentProfile
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


class TimerMode(models.TextChoices):
    GLOBAL = "global", "Global Timer"
    SECTION = "section", "Section Timer"
    HYBRID = "hybrid", "Hybrid Timer"


class NavigationMode(models.TextChoices):
    FREE_EXAM = "free_exam", "Free Across Exam"
    FREE_SECTION = "free_section", "Free Within Section"
    SEQUENTIAL = "sequential", "Sequential Sections"
    HYBRID = "hybrid", "Hybrid"


class AttemptPolicy(models.TextChoices):
    SINGLE = "single", "Single Attempt"
    LATEST = "latest", "Latest Attempt Counted"
    BEST = "best", "Best Attempt Counted"
    UNLIMITED_PRACTICE = "unlimited_practice", "Unlimited Practice"


class ResultPublishMode(models.TextChoices):
    IMMEDIATE = "immediate", "Immediate"
    SCHEDULED = "scheduled", "Scheduled"
    AFTER_REVIEW = "after_review", "After Review"


class ReviewMode(models.TextChoices):
    NONE = "none", "No Review"
    ATTEMPTED_ONLY = "attempted_only", "Attempted Only"
    ALL_QUESTIONS = "all_questions", "All Questions"
    SOLUTION_REVIEW = "solution_review", "Solution Review"


class SecurityMode(models.TextChoices):
    NORMAL = "normal", "Normal"
    FOCUS = "focus", "Focus Mode"
    FULLSCREEN = "fullscreen", "Fullscreen Required"
    VIOLATION_LIMITED = "violation_limited", "Violation Limited"
    PROCTORED = "proctored", "Proctored"


class AssignmentMode(models.TextChoices):
    SCOPE = "scope", "Program/Cohort Scope"
    SELECTED_STUDENTS = "selected_students", "Selected Students"


class ExamSourceType(models.TextChoices):
    PLATFORM = "platform", "Platform"
    INSTITUTE = "institute", "Institute"
    TEACHER = "teacher", "Teacher"


class AdvancedExamTemplateAudience(models.TextChoices):
    INSTITUTE = "institute", "Institute"
    TEACHER = "teacher", "Teacher"


class ExamPresetPackScope(models.TextChoices):
    PLATFORM = "platform", "Platform"
    INSTITUTE = "institute", "Institute"


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
    timer_mode = models.CharField(
        max_length=20,
        choices=TimerMode.choices,
        default=TimerMode.GLOBAL,
    )
    navigation_mode = models.CharField(
        max_length=20,
        choices=NavigationMode.choices,
        default=NavigationMode.FREE_EXAM,
    )
    attempt_policy = models.CharField(
        max_length=30,
        choices=AttemptPolicy.choices,
        default=AttemptPolicy.SINGLE,
    )
    result_publish_mode = models.CharField(
        max_length=20,
        choices=ResultPublishMode.choices,
        default=ResultPublishMode.AFTER_REVIEW,
    )
    review_mode = models.CharField(
        max_length=20,
        choices=ReviewMode.choices,
        default=ReviewMode.ATTEMPTED_ONLY,
    )
    security_mode = models.CharField(
        max_length=30,
        choices=SecurityMode.choices,
        default=SecurityMode.NORMAL,
    )
    access_key = models.CharField(max_length=16, blank=True)
    access_key_enabled = models.BooleanField(default=True)
    source_type = models.CharField(
        max_length=20,
        choices=ExamSourceType.choices,
        default=ExamSourceType.INSTITUTE,
    )
    source_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="source_owned_exams",
        blank=True,
        null=True,
    )
    assignment_mode = models.CharField(
        max_length=30,
        choices=AssignmentMode.choices,
        default=AssignmentMode.SCOPE,
    )
    allow_resume = models.BooleanField(default=True)
    allow_section_switching = models.BooleanField(default=True)
    allow_return_to_previous_section = models.BooleanField(default=True)
    result_publish_at = models.DateTimeField(blank=True, null=True)
    review_available_from = models.DateTimeField(blank=True, null=True)
    review_available_until = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-start_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"],
                name="unique_exam_code_per_institute",
            ),
            models.UniqueConstraint(
                fields=["institute", "access_key"],
                name="unique_exam_access_key_per_institute",
            ),
        ]
        indexes = [
            models.Index(fields=["institute", "academic_year"]),
            models.Index(fields=["program", "cohort", "subject"]),
            models.Index(fields=["exam_type", "delivery_mode", "status"]),
            models.Index(fields=["institute", "source_type", "source_teacher"]),
            models.Index(fields=["access_key", "access_key_enabled", "is_active"]),
            models.Index(fields=["source_type"]),
            models.Index(fields=["source_teacher"]),
            models.Index(fields=["start_at", "end_at"]),
            models.Index(fields=["institute", "access_key_enabled"]),
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
        if self.result_publish_at and self.end_at and self.result_publish_at < self.end_at:
            raise ValidationError(
                {"result_publish_at": "Scheduled result publish time should be after exam end time."}
            )
        if (
            self.review_available_from
            and self.review_available_until
            and self.review_available_until <= self.review_available_from
        ):
            raise ValidationError(
                {"review_available_until": "Review availability end must be after start."}
            )
        if self.attempt_policy == AttemptPolicy.UNLIMITED_PRACTICE and self.max_attempts != 1:
            raise ValidationError(
                {"max_attempts": "Unlimited practice uses policy instead of raising max attempts."}
            )
        if self.attempt_policy != AttemptPolicy.UNLIMITED_PRACTICE and self.max_attempts <= 0:
            raise ValidationError({"max_attempts": "Max attempts must be at least 1."})
        if self.access_key:
            self.access_key = normalize_exam_access_key(self.access_key)
        if self.institute_id and self.academic_year_id and self.program_id:
            validate_exam_scope(self)
        if self.source_type == ExamSourceType.TEACHER:
            if self.source_teacher_id is None:
                raise ValidationError(
                    {"source_teacher": "Teacher source exams must define a source teacher."}
                )
            if self.source_teacher.institute_id != self.institute_id:
                raise ValidationError(
                    {"source_teacher": "Source teacher must belong to the same institute as the exam."}
                )
        elif self.source_teacher_id and self.source_teacher.institute_id != self.institute_id:
            raise ValidationError(
                {"source_teacher": "Source teacher must belong to the same institute as the exam."}
            )

    def save(self, *args, **kwargs):
        if not self.access_key:
            self.access_key = generate_exam_access_key()
        self.access_key = normalize_exam_access_key(self.access_key)
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.code})"

    @property
    def source_label(self):
        return ExamSourceType(self.source_type).label


class AdvancedExamTemplate(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="advanced_exam_templates",
    )
    created_by_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="advanced_exam_templates_created",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    audience_context = models.CharField(
        max_length=20,
        choices=AdvancedExamTemplateAudience.choices,
        default=AdvancedExamTemplateAudience.INSTITUTE,
    )
    blueprint = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name", "-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "name"],
                name="unique_advanced_exam_template_name_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "audience_context"]),
            models.Index(fields=["created_by_teacher"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.created_by_teacher_id and self.created_by_teacher.institute_id != self.institute_id:
            raise ValidationError(
                {"created_by_teacher": "Template teacher must belong to the same institute."}
            )
        if not isinstance(self.blueprint, dict):
            raise ValidationError({"blueprint": "Blueprint must be stored as a JSON object."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ExamPresetPack(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="exam_preset_packs",
        blank=True,
        null=True,
    )
    scope_type = models.CharField(
        max_length=20,
        choices=ExamPresetPackScope.choices,
        default=ExamPresetPackScope.PLATFORM,
    )
    code = models.CharField(max_length=100)
    label = models.CharField(max_length=255)
    family = models.CharField(max_length=120)
    note = models.TextField(blank=True)
    chip = models.CharField(max_length=120, blank=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["scope_type", "family", "label", "-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["scope_type", "institute", "code"],
                name="unique_exam_preset_pack_code_per_scope",
            )
        ]
        indexes = [
            models.Index(fields=["scope_type", "institute"], name="exams_examp_scope_t_613f61_idx"),
            models.Index(fields=["code"], name="exams_examp_code_1c7118_idx"),
            models.Index(fields=["is_active"], name="exams_examp_is_acti_04d118_idx"),
        ]

    def clean(self):
        super().clean()
        if self.scope_type == ExamPresetPackScope.PLATFORM and self.institute_id is not None:
            raise ValidationError(
                {"institute": "Platform preset packs cannot be bound to an institute."}
            )
        if self.scope_type == ExamPresetPackScope.INSTITUTE and self.institute_id is None:
            raise ValidationError(
                {"institute": "Institute preset packs must belong to an institute."}
            )
        if not isinstance(self.config, dict):
            raise ValidationError({"config": "Preset pack config must be a JSON object."})
        normalized_code = str(self.code or "").strip().lower()
        if not normalized_code:
            raise ValidationError({"code": "Preset pack code is required."})
        self.code = normalized_code

        duplicate_queryset = ExamPresetPack.objects.filter(
            scope_type=self.scope_type,
            code=self.code,
            is_active=True,
        )
        if self.scope_type == ExamPresetPackScope.PLATFORM:
            duplicate_queryset = duplicate_queryset.filter(institute__isnull=True)
        else:
            duplicate_queryset = duplicate_queryset.filter(institute_id=self.institute_id)
        if self._state.adding is False and self.pk:
            duplicate_queryset = duplicate_queryset.exclude(pk=self.pk)
        if duplicate_queryset.exists():
            raise ValidationError({"code": "A preset pack with this code already exists in this scope."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.label


class ExamSection(BaseModel):
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        related_name="exam_sections",
        blank=True,
        null=True,
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
    timer_enabled = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(blank=True, null=True)
    allow_skip_section = models.BooleanField(default=True)
    lock_after_submit = models.BooleanField(default=False)

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
        if self.subject_id and self.exam_id:
            if self.subject.institute_id != self.exam.institute_id:
                raise ValidationError({"subject": "Section subject must belong to the same institute as the exam."})
            if self.subject.program_id and self.subject.program_id != self.exam.program_id:
                raise ValidationError({"subject": "Section subject must belong to the same program as the exam."})
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
        if self.timer_enabled and not self.duration_minutes:
            raise ValidationError(
                {"duration_minutes": "Section duration is required when section timer is enabled."}
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
    section = models.ForeignKey(
        ExamSection,
        on_delete=models.SET_NULL,
        related_name="exam_questions",
        blank=True,
        null=True,
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
        if self.section_id and self.section.exam_id != self.exam_id:
            raise ValidationError({"section": "Section must belong to the same exam."})
        if self.marks is not None and self.marks < 0:
            raise ValidationError({"marks": "Marks cannot be negative."})
        if self.negative_marks is not None and self.negative_marks < 0:
            raise ValidationError({"negative_marks": "Negative marks cannot be negative."})

    def save(self, *args, **kwargs):
        if self.marks is None and self.question_id:
            self.marks = self.question.default_marks
        if self.negative_marks is None and self.question_id:
            self.negative_marks = self.question.negative_marks
        if self.section_id:
            self.section_name = self.section.name
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


class ExamStudentAssignment(BaseModel):
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="student_assignments",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="exam_assignments",
    )
    assigned_by = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="student_exam_assignments",
        blank=True,
        null=True,
    )
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["student__first_name", "student__last_name", "student__admission_no"]
        constraints = [
            models.UniqueConstraint(
                fields=["exam", "student"],
                name="unique_exam_student_assignment",
            )
        ]
        indexes = [
            models.Index(fields=["exam", "student"]),
            models.Index(fields=["exam", "is_active", "student"]),
            models.Index(fields=["student", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.exam_id:
            if self.student.institute_id != self.exam.institute_id:
                raise ValidationError(
                    {"student": "Assigned student must belong to the same institute."}
                )
            if self.student.program_id != self.exam.program_id:
                raise ValidationError(
                    {"student": "Assigned student must belong to the same program."}
                )
            if self.student.academic_year_id != self.exam.academic_year_id:
                raise ValidationError(
                    {"student": "Assigned student must belong to the same academic year."}
                )
            if self.exam.cohort_id and self.student.cohort_id != self.exam.cohort_id:
                raise ValidationError(
                    {"student": "Assigned student must belong to the exam cohort."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.exam.code} -> {self.student.full_name}"
