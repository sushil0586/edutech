from datetime import date

from django.db import models
from django.db.models import Q

from apps.academics.models import AcademicYear, Cohort, Program, Subject
from apps.institutes.models import Institute
from apps.teachers.services import validate_teacher_assignment_relations
from common.models import BaseModel


class TeacherProfile(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="teachers",
    )
    employee_code = models.CharField(max_length=50)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    full_name = models.CharField(max_length=220, editable=False, db_index=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    qualification = models.CharField(max_length=255, blank=True)
    specialization = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    profile_photo = models.FileField(upload_to="teachers/profiles/", blank=True, null=True)
    joined_at = models.DateField(default=date.today)

    class Meta:
        ordering = ["first_name", "last_name", "employee_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "employee_code"],
                name="unique_teacher_employee_code_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "employee_code"]),
            models.Index(fields=["full_name"]),
            models.Index(fields=["is_active"]),
        ]

    def save(self, *args, **kwargs):
        self.full_name = " ".join(
            part.strip() for part in [self.first_name, self.last_name] if part and part.strip()
        )
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.employee_code})"


class AssignmentRole(models.TextChoices):
    MAIN_TEACHER = "main_teacher", "Main Teacher"
    ASSISTANT = "assistant", "Assistant"
    MENTOR = "mentor", "Mentor"


class TeacherAssignment(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )
    cohort = models.ForeignKey(
        Cohort,
        on_delete=models.SET_NULL,
        related_name="teacher_assignments",
        blank=True,
        null=True,
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )
    assignment_role = models.CharField(
        max_length=30,
        choices=AssignmentRole.choices,
        default=AssignmentRole.MAIN_TEACHER,
    )
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_primary", "subject__name", "teacher__full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["teacher", "academic_year", "program", "cohort", "subject", "assignment_role"],
                name="unique_teacher_assignment_scope_role",
            ),
            models.UniqueConstraint(
                fields=["institute", "academic_year", "program", "cohort", "subject"],
                condition=Q(is_primary=True),
                name="unique_primary_teacher_assignment_per_scope",
            ),
        ]
        indexes = [
            models.Index(fields=["institute", "academic_year"]),
            models.Index(fields=["program", "cohort", "subject"]),
            models.Index(fields=["teacher", "academic_year"]),
            models.Index(fields=["is_primary"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        required_relations = [
            self.teacher_id,
            self.academic_year_id,
            self.program_id,
            self.subject_id,
            self.institute_id,
        ]
        if all(required_relations):
            validate_teacher_assignment_relations(self)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.teacher.full_name} - {self.subject.name}"
