from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.accounts.models import AccountRole
from apps.institutes.models import Institute
from apps.students.models import StudentProfile
from common.models import BaseModel


def default_notification_preferences():
    return {
        "score_drops": True,
        "inactivity": True,
        "milestones": True,
        "weekly_summary": False,
        "result_published": True,
        "high_risk_exam_integrity": False,
    }


class ParentRelationshipType(models.TextChoices):
    MOTHER = "mother", "Mother"
    FATHER = "father", "Father"
    GUARDIAN = "guardian", "Guardian"
    GRANDPARENT = "grandparent", "Grandparent"
    SIBLING_GUARDIAN = "sibling_guardian", "Sibling Guardian"
    OTHER = "other", "Other"


class ParentRelationshipStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    REVOKED = "revoked", "Revoked"


class ParentAlertType(models.TextChoices):
    SCORE_DROP = "score_drop", "Score Drop"
    INACTIVITY = "inactivity", "Inactivity"
    MILESTONE = "milestone", "Milestone"
    RESULT_PUBLISHED = "result_published", "Result Published"
    EXAM_RISK = "exam_risk", "Exam Risk"


class ParentAlertSeverity(models.TextChoices):
    INFO = "info", "Info"
    WARNING = "warning", "Warning"
    HIGH = "high", "High"


class ParentAlertStatus(models.TextChoices):
    NEW = "new", "New"
    READ = "read", "Read"
    RESOLVED = "resolved", "Resolved"
    DISMISSED = "dismissed", "Dismissed"


class ParentProfile(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="parent_profiles",
    )
    account_profile = models.OneToOneField(
        "accounts.AccountProfile",
        on_delete=models.CASCADE,
        related_name="parent_profile",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    full_name = models.CharField(max_length=220, editable=False, db_index=True)
    phone = models.CharField(max_length=20, blank=True)
    alternate_phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    preferred_language = models.CharField(max_length=50, default="en")
    notification_preferences = models.JSONField(
        default=default_notification_preferences,
        blank=True,
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["institute", "full_name"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.account_profile_id:
            profile = self.account_profile
            if profile.role != AccountRole.PARENT:
                raise ValidationError({"account_profile": "Account profile must have parent role."})
            if self.institute_id and profile.institute_id != self.institute_id:
                raise ValidationError(
                    {"account_profile": "Parent profile institute must match the account profile institute."}
                )
        if self.notification_preferences is None:
            self.notification_preferences = default_notification_preferences()
        if not isinstance(self.notification_preferences, dict):
            raise ValidationError(
                {"notification_preferences": "Notification preferences must be stored as an object."}
            )

    def save(self, *args, **kwargs):
        self.full_name = " ".join(
            part.strip() for part in [self.first_name, self.last_name] if part and part.strip()
        )
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.full_name or self.account_profile.user.username


class ParentChildRelationship(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="parent_child_relationships",
    )
    parent_profile = models.ForeignKey(
        ParentProfile,
        on_delete=models.CASCADE,
        related_name="relationships",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="parent_relationships",
    )
    relationship_type = models.CharField(
        max_length=40,
        choices=ParentRelationshipType.choices,
        default=ParentRelationshipType.GUARDIAN,
    )
    relationship_label = models.CharField(max_length=100, blank=True)
    is_primary_contact = models.BooleanField(default=False)
    can_view_progress = models.BooleanField(default=True)
    can_view_results = models.BooleanField(default=True)
    can_view_wallet = models.BooleanField(default=False)
    can_receive_alerts = models.BooleanField(default=True)
    can_receive_weekly_summary = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20,
        choices=ParentRelationshipStatus.choices,
        default=ParentRelationshipStatus.PENDING,
    )
    linked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_parent_relationships",
        blank=True,
        null=True,
    )
    linked_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="approved_parent_relationships",
        blank=True,
        null=True,
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="revoked_parent_relationships",
        blank=True,
        null=True,
    )
    revoked_at = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["parent_profile__full_name", "student__full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["parent_profile", "student", "relationship_type"],
                name="unique_parent_student_relationship_type",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "parent_profile"]),
            models.Index(fields=["institute", "student"]),
            models.Index(fields=["status", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.parent_profile_id and self.institute_id and self.parent_profile.institute_id != self.institute_id:
            raise ValidationError({"parent_profile": "Parent profile must belong to the selected institute."})
        if self.student_id and self.institute_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the selected institute."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.parent_profile.full_name} -> {self.student.full_name}"


class ParentAlert(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="parent_alerts",
    )
    parent_profile = models.ForeignKey(
        ParentProfile,
        on_delete=models.CASCADE,
        related_name="alerts",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="parent_alerts",
        blank=True,
        null=True,
    )
    relationship = models.ForeignKey(
        ParentChildRelationship,
        on_delete=models.SET_NULL,
        related_name="alerts",
        blank=True,
        null=True,
    )
    alert_type = models.CharField(max_length=40, choices=ParentAlertType.choices)
    severity = models.CharField(
        max_length=20,
        choices=ParentAlertSeverity.choices,
        default=ParentAlertSeverity.INFO,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=ParentAlertStatus.choices,
        default=ParentAlertStatus.NEW,
    )
    source_type = models.CharField(max_length=50, blank=True)
    source_reference = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["parent_profile", "status"]),
            models.Index(fields=["student", "alert_type"]),
            models.Index(fields=["severity", "created_at"]),
        ]

    def clean(self):
        super().clean()
        if self.parent_profile_id and self.institute_id and self.parent_profile.institute_id != self.institute_id:
            raise ValidationError({"parent_profile": "Parent profile must belong to the selected institute."})
        if self.student_id and self.institute_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the selected institute."})
        if self.relationship_id and self.relationship.parent_profile_id != self.parent_profile_id:
            raise ValidationError({"relationship": "Relationship must belong to the selected parent profile."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.parent_profile.full_name}: {self.title}"
