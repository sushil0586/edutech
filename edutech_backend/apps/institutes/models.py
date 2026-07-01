from django.db import models

from common.models import BaseModel


class Institute(BaseModel):
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    logo = models.FileField(upload_to="institutes/logos/", blank=True, null=True)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["city", "state", "country"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class InstituteOnboardingProfile(BaseModel):
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=80, blank=True, default="general")
    is_default = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=100)
    config_json = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["code"]),
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["is_default", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class InstituteOnboardingRunStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class InstituteOnboardingTaskStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    SKIPPED = "skipped", "Skipped"
    FAILED = "failed", "Failed"


class InstituteOnboardingRun(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="onboarding_runs",
    )
    profile = models.ForeignKey(
        InstituteOnboardingProfile,
        on_delete=models.SET_NULL,
        related_name="runs",
        blank=True,
        null=True,
    )
    profile_code = models.CharField(max_length=80, blank=True)
    source = models.CharField(max_length=80, default="master_defaults")
    status = models.CharField(
        max_length=20,
        choices=InstituteOnboardingRunStatus.choices,
        default=InstituteOnboardingRunStatus.PENDING,
    )
    requested_config_json = models.JSONField(default=dict, blank=True)
    resolved_config_json = models.JSONField(default=dict, blank=True)
    initiated_by_user_id = models.IntegerField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    error_summary = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["institute", "created_at"]),
            models.Index(fields=["profile_code", "created_at"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["source", "created_at"]),
        ]

    def __str__(self):
        return f"{self.institute.code} · {self.profile_code or 'manual'} · {self.status}"


class InstituteOnboardingTaskRun(BaseModel):
    run = models.ForeignKey(
        InstituteOnboardingRun,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    task_code = models.CharField(max_length=120)
    label = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=InstituteOnboardingTaskStatus.choices,
        default=InstituteOnboardingTaskStatus.PENDING,
    )
    message = models.TextField(blank=True)
    result_json = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["run", "created_at"]),
            models.Index(fields=["task_code", "status"]),
        ]

    def __str__(self):
        return f"{self.run_id} · {self.task_code} · {self.status}"
