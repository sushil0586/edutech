from datetime import date

from django.core.exceptions import ValidationError
from django.db import models

from apps.academics.models import AcademicYear, Cohort, Program
from apps.institutes.models import Institute
from common.models import BaseModel


MAX_STUDENT_ACCOMMODATION_EXTRA_TIME_MINUTES = 180
MAX_STUDENT_ACCOMMODATION_EXTRA_TIME_PERCENTAGE = 300
MAX_STUDENT_ACCOMMODATION_VIOLATION_ALLOWANCE = 2


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

    def save(self, *args, **kwargs):
        self.full_name = " ".join(
            part.strip() for part in [self.first_name, self.last_name] if part and part.strip()
        )
        self.full_clean()
        return super().save(*args, **kwargs)

    def normalized_accommodation_profile(self):
        typed_profile = getattr(self, "typed_accommodation_profile", None)
        if typed_profile is not None:
            return typed_profile.to_snapshot()
        return StudentAccommodationProfile.normalized_snapshot_from_dict({})

    def set_accommodation_profile(self, raw_profile):
        normalized = StudentAccommodationProfile.normalized_snapshot_from_dict(raw_profile)
        StudentAccommodationProfile.objects.update_or_create(
            student=self,
            defaults={
                "extra_time_minutes": normalized["extra_time_minutes"],
                "extra_time_percentage": normalized["extra_time_percentage"],
                "additional_violation_allowance": normalized["additional_violation_allowance"],
                "simplified_warning_copy": normalized["simplified_warning_copy"],
                "alternative_instructions": normalized["alternative_instructions"],
                "notes": normalized["notes"],
                "source": normalized["source"],
            },
        )

    def __str__(self):
        return f"{self.full_name} ({self.admission_no})"


class StudentAccommodationProfile(BaseModel):
    student = models.OneToOneField(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="typed_accommodation_profile",
    )
    extra_time_minutes = models.PositiveIntegerField(default=0)
    extra_time_percentage = models.PositiveIntegerField(default=0)
    additional_violation_allowance = models.PositiveIntegerField(default=0)
    simplified_warning_copy = models.BooleanField(default=False)
    alternative_instructions = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    source = models.CharField(max_length=80, blank=True, default="")

    class Meta:
        ordering = ["student__full_name"]
        indexes = [
            models.Index(fields=["source", "is_active"]),
        ]

    @staticmethod
    def normalized_snapshot_from_dict(raw_profile):
        raw_profile = raw_profile if isinstance(raw_profile, dict) else {}

        def integer_value(key):
            value = raw_profile.get(key, 0)
            try:
                numeric = int(value)
            except (TypeError, ValueError):
                return 0
            return max(numeric, 0)

        def string_value(key):
            value = raw_profile.get(key, "")
            return value.strip() if isinstance(value, str) else ""

        extra_time_minutes = min(
            integer_value("extra_time_minutes"),
            MAX_STUDENT_ACCOMMODATION_EXTRA_TIME_MINUTES,
        )
        extra_time_percentage = min(
            integer_value("extra_time_percentage"),
            MAX_STUDENT_ACCOMMODATION_EXTRA_TIME_PERCENTAGE,
        )
        additional_violation_allowance = min(
            integer_value("additional_violation_allowance"),
            MAX_STUDENT_ACCOMMODATION_VIOLATION_ALLOWANCE,
        )
        simplified_warning_copy = bool(raw_profile.get("simplified_warning_copy", False))
        alternative_instructions = string_value("alternative_instructions")
        notes = string_value("notes")

        has_accommodations = any(
            [
                extra_time_minutes > 0,
                extra_time_percentage > 0,
                additional_violation_allowance > 0,
                simplified_warning_copy,
                bool(alternative_instructions),
                bool(notes),
            ]
        )

        return {
            "has_accommodations": has_accommodations,
            "extra_time_minutes": extra_time_minutes,
            "extra_time_percentage": extra_time_percentage,
            "additional_violation_allowance": additional_violation_allowance,
            "simplified_warning_copy": simplified_warning_copy,
            "alternative_instructions": alternative_instructions,
            "notes": notes,
            "source": string_value("source") or ("student_profile" if has_accommodations else "none"),
        }

    def clean(self):
        super().clean()
        if self.extra_time_minutes > MAX_STUDENT_ACCOMMODATION_EXTRA_TIME_MINUTES:
            raise ValidationError(
                {
                    "extra_time_minutes": (
                        f"Extra time minutes cannot exceed {MAX_STUDENT_ACCOMMODATION_EXTRA_TIME_MINUTES}."
                    )
                }
            )
        if self.extra_time_percentage > MAX_STUDENT_ACCOMMODATION_EXTRA_TIME_PERCENTAGE:
            raise ValidationError(
                {
                    "extra_time_percentage": (
                        f"Extra time percentage cannot exceed {MAX_STUDENT_ACCOMMODATION_EXTRA_TIME_PERCENTAGE}."
                    )
                }
            )
        if self.additional_violation_allowance > MAX_STUDENT_ACCOMMODATION_VIOLATION_ALLOWANCE:
            raise ValidationError(
                {
                    "additional_violation_allowance": (
                        "Additional violation allowance cannot exceed "
                        f"{MAX_STUDENT_ACCOMMODATION_VIOLATION_ALLOWANCE}."
                    )
                }
            )

    def save(self, *args, **kwargs):
        self.alternative_instructions = (self.alternative_instructions or "").strip()
        self.notes = (self.notes or "").strip()
        self.source = (self.source or "").strip()
        self.full_clean()
        return super().save(*args, **kwargs)

    def to_snapshot(self):
        has_accommodations = any(
            [
                self.extra_time_minutes > 0,
                self.extra_time_percentage > 0,
                self.additional_violation_allowance > 0,
                self.simplified_warning_copy,
                bool(self.alternative_instructions),
                bool(self.notes),
            ]
        )
        return {
            "has_accommodations": has_accommodations,
            "extra_time_minutes": self.extra_time_minutes,
            "extra_time_percentage": self.extra_time_percentage,
            "additional_violation_allowance": self.additional_violation_allowance,
            "simplified_warning_copy": self.simplified_warning_copy,
            "alternative_instructions": self.alternative_instructions,
            "notes": self.notes,
            "source": self.source or ("student_profile" if has_accommodations else "none"),
        }
