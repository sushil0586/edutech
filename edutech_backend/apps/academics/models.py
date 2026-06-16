from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.academics.services import validate_academic_year_overlap
from apps.institutes.models import Institute
from common.models import BaseModel


class AcademicYear(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="academic_years",
    )
    name = models.CharField(max_length=150)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ["-start_date", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "name"],
                name="unique_academic_year_name_per_institute",
            ),
            models.UniqueConstraint(
                fields=["institute"],
                condition=Q(is_current=True),
                name="unique_current_academic_year_per_institute",
            ),
        ]
        indexes = [
            models.Index(fields=["institute", "is_current"]),
            models.Index(fields=["institute", "start_date", "end_date"]),
        ]

    def clean(self):
        super().clean()
        if self.start_date >= self.end_date:
            raise ValidationError({"end_date": "End date must be later than start date."})
        if self.institute_id:
            validate_academic_year_overlap(self)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.institute.code} - {self.name}"


class Program(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="programs",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"],
                name="unique_program_code_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "sort_order"]),
            models.Index(fields=["institute", "category"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Cohort(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="cohorts",
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name="cohorts",
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="cohorts",
    )
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    capacity = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        ordering = ["program__sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"],
                name="unique_cohort_code_per_institute",
            ),
            models.UniqueConstraint(
                fields=["institute", "program", "academic_year", "name"],
                name="unique_cohort_name_per_program_year",
            ),
        ]
        indexes = [
            models.Index(fields=["institute", "program"]),
            models.Index(fields=["academic_year", "program"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.program_id and self.institute_id and self.program.institute_id != self.institute_id:
            raise ValidationError({"program": "Program must belong to the same institute."})
        if (
            self.academic_year_id
            and self.institute_id
            and self.academic_year.institute_id != self.institute_id
        ):
            raise ValidationError(
                {"academic_year": "Academic year must belong to the same institute."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.program.name})"


class Subject(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="subjects",
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name="subjects",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"],
                name="unique_subject_code_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "program"]),
            models.Index(fields=["institute", "sort_order"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.program_id and self.institute_id and self.program.institute_id != self.institute_id:
            raise ValidationError({"program": "Program must belong to the same institute."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class TopicDifficulty(models.TextChoices):
    FOUNDATION = "foundation", "Foundation"
    INTERMEDIATE = "intermediate", "Intermediate"
    ADVANCED = "advanced", "Advanced"


class OptionCatalogEntry(BaseModel):
    namespace = models.CharField(max_length=80)
    code = models.CharField(max_length=80, blank=True)
    label = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_default = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["namespace", "sort_order", "label"]
        constraints = [
            models.UniqueConstraint(
                fields=["namespace", "code"],
                name="unique_option_catalog_code_per_namespace",
            ),
            models.UniqueConstraint(
                fields=["namespace"],
                condition=Q(is_default=True),
                name="unique_default_option_catalog_entry_per_namespace",
            ),
        ]
        indexes = [
            models.Index(fields=["namespace", "is_active"]),
            models.Index(fields=["namespace", "sort_order"]),
            models.Index(fields=["is_default"]),
        ]

    def save(self, *args, **kwargs):
        self.code = self.code.strip().lower()
        self.namespace = self.namespace.strip().lower()
        self.label = self.label.strip()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.namespace}:{self.code}"


class Topic(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="topics",
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="topics",
    )
    parent_topic = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="child_topics",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    difficulty_level = models.CharField(
        max_length=20,
        choices=TopicDifficulty.choices,
        default=TopicDifficulty.INTERMEDIATE,
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["subject", "code"],
                name="unique_topic_code_per_subject",
            )
        ]
        indexes = [
            models.Index(fields=["subject", "parent_topic"]),
            models.Index(fields=["institute", "subject"]),
            models.Index(fields=["parent_topic"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.subject_id and self.institute_id and self.subject.institute_id != self.institute_id:
            raise ValidationError({"subject": "Subject must belong to the same institute."})
        if self.parent_topic_id:
            if self.parent_topic_id == self.pk:
                raise ValidationError({"parent_topic": "Topic cannot be its own parent."})
            if self.parent_topic.institute_id != self.institute_id:
                raise ValidationError(
                    {"parent_topic": "Parent topic must belong to the same institute."}
                )
            if self.parent_topic.subject_id != self.subject_id:
                raise ValidationError(
                    {"parent_topic": "Parent topic must belong to the same subject."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name
