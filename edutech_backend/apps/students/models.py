from datetime import date

from django.core.exceptions import ValidationError
from django.db import models

from apps.academics.models import AcademicYear, Cohort, Program
from apps.institutes.models import Institute
from common.models import BaseModel


class StudentGender(models.TextChoices):
    MALE = "male", "Male"
    FEMALE = "female", "Female"
    OTHER = "other", "Other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"


class StudentProfile(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="students",
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="students",
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name="students",
    )
    cohort = models.ForeignKey(
        Cohort,
        on_delete=models.SET_NULL,
        related_name="students",
        blank=True,
        null=True,
    )
    admission_no = models.CharField(max_length=50)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    full_name = models.CharField(max_length=220, editable=False, db_index=True)
    gender = models.CharField(
        max_length=20,
        choices=StudentGender.choices,
        default=StudentGender.PREFER_NOT_TO_SAY,
    )
    date_of_birth = models.DateField(blank=True, null=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    guardian_name = models.CharField(max_length=150, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    profile_photo = models.FileField(upload_to="students/profiles/", blank=True, null=True)
    address = models.TextField(blank=True)
    joined_at = models.DateField(default=date.today)
    accommodation_profile = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["first_name", "last_name", "admission_no"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "admission_no"],
                name="unique_student_admission_no_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "program", "cohort"]),
            models.Index(fields=["institute", "academic_year"]),
            models.Index(fields=["full_name"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if (
            self.academic_year_id
            and self.institute_id
            and self.academic_year.institute_id != self.institute_id
        ):
            raise ValidationError(
                {"academic_year": "Academic year must belong to the same institute."}
            )
        if self.program_id and self.institute_id and self.program.institute_id != self.institute_id:
            raise ValidationError({"program": "Program must belong to the same institute."})
        if self.cohort_id:
            if self.cohort.institute_id != self.institute_id:
                raise ValidationError({"cohort": "Cohort must belong to the same institute."})
            if self.cohort.program_id != self.program_id:
                raise ValidationError({"cohort": "Cohort must match the selected program."})
            if self.cohort.academic_year_id != self.academic_year_id:
                raise ValidationError(
                    {"cohort": "Cohort must match the selected academic year."}
                )
        if self.accommodation_profile is None:
            self.accommodation_profile = {}
        if not isinstance(self.accommodation_profile, dict):
            raise ValidationError(
                {"accommodation_profile": "Accommodation profile must be stored as an object."}
            )

    def save(self, *args, **kwargs):
        self.full_name = " ".join(
            part.strip() for part in [self.first_name, self.last_name] if part and part.strip()
        )
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.admission_no})"
