from django.contrib.auth import get_user_model
from django.db import models

from apps.institutes.models import Institute
from common.models import BaseModel


User = get_user_model()


class NotificationType(models.TextChoices):
    EXAM_SCHEDULED = "exam_scheduled", "Exam Scheduled"
    EXAM_STARTING_SOON = "exam_starting_soon", "Exam Starting Soon"
    EXAM_LIVE = "exam_live", "Exam Live"
    EXAM_SUBMITTED = "exam_submitted", "Exam Submitted"
    RESULT_PUBLISHED = "result_published", "Result Published"
    TEACHER_REVIEW_NEEDED = "teacher_review_needed", "Teacher Review Needed"
    QUESTION_MISSING_EXPLANATION = (
        "question_missing_explanation",
        "Question Missing Explanation",
    )


class InAppNotification(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="notifications",
        blank=True,
        null=True,
    )
    recipient_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=40,
        choices=NotificationType.choices,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_object_type = models.CharField(max_length=100, blank=True)
    related_object_id = models.CharField(max_length=64, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient_user", "is_active", "is_read", "created_at"]),
            models.Index(fields=["recipient_user", "is_active", "created_at"]),
            models.Index(fields=["recipient_user", "is_active", "notification_type", "created_at"]),
            models.Index(fields=["recipient_user", "is_active", "related_object_type", "created_at"]),
            models.Index(fields=["notification_type", "is_read"]),
            models.Index(fields=["institute", "created_at"]),
            models.Index(fields=["related_object_type", "related_object_id"]),
        ]

    def __str__(self):
        return f"{self.recipient_user} - {self.title}"


class AuditLog(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        blank=True,
        null=True,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        blank=True,
        null=True,
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=64)
    message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["institute", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"{self.action} - {self.entity_type}:{self.entity_id}"
