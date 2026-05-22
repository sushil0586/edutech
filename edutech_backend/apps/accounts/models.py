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

    class Meta:
        ordering = ["user__username"]
        indexes = [
            models.Index(fields=["role", "is_active"]),
            models.Index(fields=["institute"]),
        ]

    def clean(self):
        super().clean()
        if self.role == AccountRole.PLATFORM_ADMIN:
            return

        if self.institute_id is None:
            raise ValidationError({"institute": "Institute is required for this role."})

        if self.role == AccountRole.STUDENT:
            if self.student_profile_id is None:
                raise ValidationError({"student_profile": "Student profile is required for student role."})
            if self.student_profile.institute_id != self.institute_id:
                raise ValidationError(
                    {"student_profile": "Student profile must belong to the selected institute."}
                )

        if self.role == AccountRole.TEACHER:
            if self.teacher_profile_id is None:
                raise ValidationError({"teacher_profile": "Teacher profile is required for teacher role."})
            if self.teacher_profile.institute_id != self.institute_id:
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
