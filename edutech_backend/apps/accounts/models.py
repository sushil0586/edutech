from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models

from apps.institutes.models import Institute
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherProfile
from common.models import BaseModel


User = get_user_model()


class AccountRole(models.TextChoices):
    PLATFORM_ADMIN = "platform_admin", "Platform Admin"
    INSTITUTE_ADMIN = "institute_admin", "Institute Admin"
    TEACHER = "teacher", "Teacher"
    STUDENT = "student", "Student"
    PARENT = "parent", "Parent"


class OnboardingStatus(models.TextChoices):
    NOT_STARTED = "not_started", "Not Started"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"


class AccountProfile(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="account_profile")
    role = models.CharField(max_length=30, choices=AccountRole.choices)
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="account_profiles",
        blank=True,
        null=True,
    )
    student_profile = models.OneToOneField(
        StudentProfile,
        on_delete=models.SET_NULL,
        related_name="account_profile",
        blank=True,
        null=True,
    )
    teacher_profile = models.OneToOneField(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="account_profile",
        blank=True,
        null=True,
    )
    registration_context = models.JSONField(default=dict, blank=True)
    onboarding_status = models.CharField(
        max_length=20,
        choices=OnboardingStatus.choices,
        default=OnboardingStatus.COMPLETED,
    )
    profile_completion_required = models.BooleanField(default=False)
    profile_completion_completed_at = models.DateTimeField(blank=True, null=True)
    onboarding_role = models.CharField(max_length=30, choices=AccountRole.choices, blank=True, default="")
    onboarding_version = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        ordering = ["user__username"]
        indexes = [
            models.Index(fields=["role", "is_active"]),
            models.Index(fields=["institute"]),
            models.Index(
                fields=["profile_completion_required", "onboarding_status"],
                name="accounts_onboard_state_idx",
            ),
        ]

    def clean(self):
        super().clean()
        if self.role == AccountRole.PLATFORM_ADMIN:
            return

        if self.institute_id is None:
            raise ValidationError({"institute": "Institute is required for this role."})

        if self.role == AccountRole.STUDENT:
            if self.student_profile_id is None and not self.profile_completion_required:
                raise ValidationError({"student_profile": "Student profile is required for student role."})
            if self.student_profile_id and self.student_profile.institute_id != self.institute_id:
                raise ValidationError(
                    {"student_profile": "Student profile must belong to the selected institute."}
                )

        if self.role == AccountRole.TEACHER:
            if self.teacher_profile_id is None and not self.profile_completion_required:
                raise ValidationError({"teacher_profile": "Teacher profile is required for teacher role."})
            if self.teacher_profile_id and self.teacher_profile.institute_id != self.institute_id:
                raise ValidationError(
                    {"teacher_profile": "Teacher profile must belong to the selected institute."}
                )

        if self.role in {AccountRole.INSTITUTE_ADMIN, AccountRole.PARENT}:
            if self.student_profile_id and self.student_profile.institute_id != self.institute_id:
                raise ValidationError(
                    {"student_profile": "Student profile must belong to the selected institute."}
                )
            if self.teacher_profile_id and self.teacher_profile.institute_id != self.institute_id:
                raise ValidationError(
                    {"teacher_profile": "Teacher profile must belong to the selected institute."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.role}"


class AccountLocation(BaseModel):
    account_profile = models.OneToOneField(
        AccountProfile,
        on_delete=models.CASCADE,
        related_name="location_profile",
    )
    detected_country = models.CharField(max_length=100, blank=True)
    detected_state = models.CharField(max_length=100, blank=True)
    detected_city = models.CharField(max_length=100, blank=True)
    detected_pincode = models.CharField(max_length=20, blank=True)
    detected_timezone = models.CharField(max_length=100, blank=True)
    detection_source = models.CharField(max_length=50, blank=True)
    detected_at = models.DateTimeField(blank=True, null=True)
    confirmed_country = models.CharField(max_length=100, blank=True)
    confirmed_state = models.CharField(max_length=100, blank=True)
    confirmed_city = models.CharField(max_length=100, blank=True)
    confirmed_pincode = models.CharField(max_length=20, blank=True)
    confirmed_timezone = models.CharField(max_length=100, blank=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["account_profile__user__username"]
        indexes = [
            models.Index(fields=["confirmed_country", "confirmed_state", "confirmed_city"]),
            models.Index(fields=["detection_source"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"Location for {self.account_profile.user.username}"


class AccountAcquisition(BaseModel):
    account_profile = models.OneToOneField(
        AccountProfile,
        on_delete=models.CASCADE,
        related_name="acquisition_profile",
    )
    signup_source = models.CharField(max_length=50, blank=True)
    landing_variant = models.CharField(max_length=100, blank=True)
    platform = models.CharField(max_length=50, blank=True)
    device_category = models.CharField(max_length=50, blank=True)
    app_version = models.CharField(max_length=50, blank=True)
    browser_family = models.CharField(max_length=100, blank=True)
    utm_source = models.CharField(max_length=100, blank=True)
    utm_medium = models.CharField(max_length=100, blank=True)
    utm_campaign = models.CharField(max_length=150, blank=True)
    utm_term = models.CharField(max_length=150, blank=True)
    utm_content = models.CharField(max_length=150, blank=True)
    referral_channel = models.CharField(max_length=50, blank=True)
    referral_identifier = models.CharField(max_length=150, blank=True)
    invite_code = models.CharField(max_length=100, blank=True)
    school_name_text = models.CharField(max_length=255, blank=True)
    school_normalization_status = models.CharField(max_length=50, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["account_profile__user__username"]
        indexes = [
            models.Index(fields=["signup_source", "platform"]),
            models.Index(fields=["referral_channel", "referral_identifier"]),
            models.Index(fields=["school_normalization_status"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.metadata is None:
            self.metadata = {}
        if not isinstance(self.metadata, dict):
            raise ValidationError({"metadata": "Metadata must be stored as an object."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Acquisition for {self.account_profile.user.username}"
