from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.exams.models import Exam
from apps.institutes.models import Institute
from apps.question_bank.models import Question, QuestionOption
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherProfile
from common.models import BaseModel


class AttemptStatus(models.TextChoices):
    IN_PROGRESS = "in_progress", "In Progress"
    SUBMITTED = "submitted", "Submitted"
    AUTO_SUBMITTED = "auto_submitted", "Auto Submitted"
    EXPIRED = "expired", "Expired"
    CANCELLED = "cancelled", "Cancelled"


class StudentExamAttempt(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="exam_attempts",
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    access_slot = models.ForeignKey(
        "exams.ExamAccessSlot",
        on_delete=models.SET_NULL,
        related_name="attempts",
        blank=True,
        null=True,
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="exam_attempts",
    )
    attempt_no = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=AttemptStatus.choices,
        default=AttemptStatus.IN_PROGRESS,
    )
    started_at = models.DateTimeField()
    submitted_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    total_questions = models.PositiveIntegerField(default=0)
    attempted_questions = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    incorrect_answers = models.PositiveIntegerField(default=0)
    skipped_questions = models.PositiveIntegerField(default=0)
    score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    negative_score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    final_score = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    percentage = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    time_taken_seconds = models.PositiveIntegerField(default=0)
    is_auto_submitted = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-started_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["exam", "student", "attempt_no"],
                name="unique_exam_student_attempt_number",
            ),
            models.CheckConstraint(
                condition=models.Q(submitted_at__isnull=True)
                | models.Q(submitted_at__gte=models.F("started_at")),
                name="attempt_submitted_not_before_started",
            ),
            models.CheckConstraint(
                condition=models.Q(expires_at__isnull=True)
                | models.Q(expires_at__gte=models.F("started_at")),
                name="attempt_expires_not_before_started",
            ),
            models.CheckConstraint(
                condition=models.Q(attempted_questions__lte=models.F("total_questions")),
                name="attempt_attempted_lte_total_questions",
            ),
            models.CheckConstraint(
                condition=models.Q(correct_answers__lte=models.F("attempted_questions")),
                name="attempt_correct_lte_attempted_questions",
            ),
            models.CheckConstraint(
                condition=models.Q(incorrect_answers__lte=models.F("attempted_questions")),
                name="attempt_incorrect_lte_attempted_questions",
            ),
            models.CheckConstraint(
                condition=models.Q(skipped_questions__lte=models.F("total_questions")),
                name="attempt_skipped_lte_total_questions",
            ),
            models.CheckConstraint(
                condition=models.Q(score__gte=0),
                name="attempt_score_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(negative_score__gte=0),
                name="attempt_negative_score_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["institute", "exam", "student"]),
            models.Index(fields=["access_slot", "status", "is_active"]),
            models.Index(fields=["status", "is_active"]),
            models.Index(fields=["exam", "status", "is_active"]),
            models.Index(fields=["student", "is_active", "started_at"]),
            models.Index(fields=["student", "status", "is_active", "started_at"]),
            models.Index(fields=["exam", "student", "status", "is_active", "attempt_no", "created_at"]),
            models.Index(fields=["started_at", "submitted_at"]),
            models.Index(fields=["status", "expires_at"]),
            models.Index(fields=["final_score", "percentage"]),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.exam_id:
            if self.student.institute_id != self.exam.institute_id:
                raise ValidationError({"student": "Student and exam must belong to the same institute."})
        if self.institute_id and self.exam_id and self.exam.institute_id != self.institute_id:
            raise ValidationError({"exam": "Exam must belong to the same institute."})
        if self.institute_id and self.student_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the same institute."})
        if self.access_slot_id and self.exam_id and self.access_slot.exam_id != self.exam_id:
            raise ValidationError({"access_slot": "Attempt slot must belong to the same exam."})
        if self.submitted_at and self.submitted_at < self.started_at:
            raise ValidationError({"submitted_at": "Submission time cannot be earlier than start time."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.full_name} - {self.exam.code} (Attempt {self.attempt_no})"


class IntegrityEventType(models.TextChoices):
    FOCUS_LOST = "focus_lost", "Focus Lost"
    VISIBILITY_HIDDEN = "visibility_hidden", "Tab Hidden"
    FULLSCREEN_EXITED = "fullscreen_exited", "Fullscreen Exited"
    FULLSCREEN_RESTORED = "fullscreen_restored", "Fullscreen Restored"
    CONNECTION_LOST = "connection_lost", "Connection Lost"
    CONNECTION_RESTORED = "connection_restored", "Connection Restored"
    WARNING_THRESHOLD_REACHED = "warning_threshold_reached", "Warning Threshold Reached"


class IntegrityEventSeverity(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"


class AttemptIntegrityEvent(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="attempt_integrity_events",
    )
    attempt = models.ForeignKey(
        StudentExamAttempt,
        on_delete=models.CASCADE,
        related_name="integrity_events",
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="integrity_events",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="attempt_integrity_events",
    )
    event_type = models.CharField(max_length=40, choices=IntegrityEventType.choices)
    severity = models.CharField(
        max_length=10,
        choices=IntegrityEventSeverity.choices,
        default=IntegrityEventSeverity.LOW,
    )
    counts_as_violation = models.BooleanField(default=False)
    event_at = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-event_at", "-created_at"]
        indexes = [
            models.Index(fields=["attempt", "event_type", "event_at"]),
            models.Index(fields=["attempt", "counts_as_violation", "event_at"]),
            models.Index(fields=["exam", "student", "event_at"]),
            models.Index(fields=["severity", "counts_as_violation"]),
        ]

    def clean(self):
        super().clean()
        if self.attempt_id and self.exam_id and self.attempt.exam_id != self.exam_id:
            raise ValidationError({"exam": "Integrity event exam must match the attempt exam."})
        if self.attempt_id and self.student_id and self.attempt.student_id != self.student_id:
            raise ValidationError({"student": "Integrity event student must match the attempt student."})
        if self.attempt_id and self.institute_id and self.attempt.institute_id != self.institute_id:
            raise ValidationError({"institute": "Integrity event institute must match the attempt institute."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.attempt_id} - {self.event_type}"


class StudentAnswer(BaseModel):
    class EvaluationStatus(models.TextChoices):
        AUTO_EVALUATED = "auto_evaluated", "Auto Evaluated"
        MANUAL_PENDING = "manual_pending", "Manual Review Pending"
        MANUAL_REVIEWED = "manual_reviewed", "Manual Review Completed"

    attempt = models.ForeignKey(
        StudentExamAttempt,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="student_answers",
    )
    selected_option = models.ForeignKey(
        QuestionOption,
        on_delete=models.SET_NULL,
        related_name="student_answers",
        blank=True,
        null=True,
    )
    answer_text = models.TextField(blank=True)
    answer_transcript = models.TextField(blank=True)
    response_artifacts = models.JSONField(default=list, blank=True)
    evaluation_status = models.CharField(
        max_length=30,
        choices=EvaluationStatus.choices,
        default=EvaluationStatus.AUTO_EVALUATED,
    )
    is_correct = models.BooleanField(default=False)
    marks_awarded = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    negative_marks_applied = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    answered_at = models.DateTimeField(blank=True, null=True)
    time_spent_seconds = models.PositiveIntegerField(blank=True, null=True)
    is_marked_for_review = models.BooleanField(default=False)
    reviewed_by_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="reviewed_student_answers",
        blank=True,
        null=True,
    )
    reviewed_at = models.DateTimeField(blank=True, null=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["question__id", "-answered_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["attempt", "question"],
                name="unique_attempt_question_answer",
            )
        ]
        indexes = [
            models.Index(fields=["attempt", "question"]),
            models.Index(fields=["attempt", "is_active"]),
            models.Index(fields=["attempt", "is_active", "answered_at", "created_at"]),
            models.Index(fields=["question", "attempt", "is_active"]),
            models.Index(fields=["question", "is_active", "answered_at", "created_at"]),
        ]

    def clean(self):
        super().clean()
        if self.question_id and self.attempt_id:
            if not self.attempt.exam.exam_questions.filter(question=self.question, is_active=True).exists():
                raise ValidationError({"question": "Question must belong to the attempt exam."})
        if self.selected_option_id and self.selected_option.question_id != self.question_id:
            raise ValidationError(
                {"selected_option": "Selected option must belong to the same question."}
            )
        if self.response_artifacts:
            if not isinstance(self.response_artifacts, list):
                raise ValidationError(
                    {"response_artifacts": "Response artifacts must be stored as a list."}
                )
            for index, artifact in enumerate(self.response_artifacts):
                if not isinstance(artifact, dict):
                    raise ValidationError(
                        {"response_artifacts": f"Artifact {index + 1} must be an object."}
                    )
                asset_kind = str(artifact.get("asset_kind", "") or "").strip()
                upload_token = str(artifact.get("upload_token", "") or "").strip()
                if not asset_kind:
                    raise ValidationError(
                        {"response_artifacts": f"Artifact {index + 1} must include asset_kind."}
                    )
                if not upload_token:
                    raise ValidationError(
                        {"response_artifacts": f"Artifact {index + 1} must include upload_token."}
                    )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    @property
    def resolved_selected_option_ids(self):
        return [
            str(option_id)
            for option_id in list(
            self.selected_option_links.order_by("selected_order", "created_at").values_list(
                "question_option_id",
                flat=True,
            )
            )
        ] if self.pk else []

    def set_selected_option_ids(self, selected_option_ids):
        if not self.pk:
            raise ValueError("StudentAnswer must be saved before selected options can be assigned.")
        normalized_ids = [str(item) for item in (selected_option_ids or []) if str(item).strip()]
        existing = {
            str(link.question_option_id): link
            for link in self.selected_option_links.all()
        }
        keep_ids = []
        for index, option_id in enumerate(normalized_ids):
            instance = existing.get(option_id)
            if instance is None:
                instance = StudentAnswerSelectedOption.objects.create(
                    student_answer=self,
                    question_option_id=option_id,
                    selected_order=index,
                )
            else:
                if instance.selected_order != index:
                    instance.selected_order = index
                    instance.save(update_fields=["selected_order", "updated_at"])
            keep_ids.append(instance.id)
        if keep_ids:
            self.selected_option_links.exclude(id__in=keep_ids).delete()
        else:
            self.selected_option_links.all().delete()

    def __str__(self):
        return f"{self.attempt_id} - {self.question_id}"


class StudentAnswerSelectedOption(BaseModel):
    student_answer = models.ForeignKey(
        StudentAnswer,
        on_delete=models.CASCADE,
        related_name="selected_option_links",
    )
    question_option = models.ForeignKey(
        QuestionOption,
        on_delete=models.CASCADE,
        related_name="student_answer_links",
    )
    selected_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["selected_order", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["student_answer", "question_option"],
                name="unique_student_answer_selected_option",
            ),
            models.UniqueConstraint(
                fields=["student_answer", "selected_order"],
                name="unique_student_answer_selected_option_order",
            ),
        ]
        indexes = [
            models.Index(fields=["student_answer", "selected_order"]),
            models.Index(fields=["question_option", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if (
            self.student_answer_id
            and self.question_option_id
            and self.question_option.question_id != self.student_answer.question_id
        ):
            raise ValidationError(
                {"question_option": "Selected option must belong to the same question as the answer."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_answer_id} - {self.question_option_id}"


class ReviewTaskStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ASSIGNED = "assigned", "Assigned"
    IN_REVIEW = "in_review", "In Review"
    REVIEWED = "reviewed", "Reviewed"
    RECHECK_REQUESTED = "recheck_requested", "Recheck Requested"
    MODERATED = "moderated", "Moderated"
    CANCELLED = "cancelled", "Cancelled"


class ReviewTaskPriority(models.TextChoices):
    LOW = "low", "Low"
    NORMAL = "normal", "Normal"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class ReviewEventType(models.TextChoices):
    TASK_OPENED = "task_opened", "Task Opened"
    ASSIGNED = "assigned", "Assigned"
    UNASSIGNED = "unassigned", "Unassigned"
    REVIEW_SAVED = "review_saved", "Review Saved"
    REVIEW_UPDATED = "review_updated", "Review Updated"
    RECHECK_REQUESTED = "recheck_requested", "Recheck Requested"
    MODERATED = "moderated", "Moderated"


class StudentAnswerReviewTask(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="answer_review_tasks",
    )
    answer = models.OneToOneField(
        StudentAnswer,
        on_delete=models.CASCADE,
        related_name="review_task",
    )
    attempt = models.ForeignKey(
        StudentExamAttempt,
        on_delete=models.CASCADE,
        related_name="review_tasks",
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="answer_review_tasks",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="answer_review_tasks",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="review_tasks",
    )
    assigned_to_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="assigned_answer_review_tasks",
        blank=True,
        null=True,
    )
    assigned_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_answer_review_tasks",
        blank=True,
        null=True,
    )
    status = models.CharField(
        max_length=30,
        choices=ReviewTaskStatus.choices,
        default=ReviewTaskStatus.PENDING,
    )
    priority = models.CharField(
        max_length=20,
        choices=ReviewTaskPriority.choices,
        default=ReviewTaskPriority.NORMAL,
    )
    opened_at = models.DateTimeField(default=timezone.now)
    assigned_at = models.DateTimeField(blank=True, null=True)
    review_started_at = models.DateTimeField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    last_reviewed_at = models.DateTimeField(blank=True, null=True)
    last_reviewed_by_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="completed_answer_review_tasks",
        blank=True,
        null=True,
    )
    latest_marks_awarded = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    latest_review_summary = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["status", "-opened_at", "-created_at"]
        indexes = [
            models.Index(fields=["institute", "status", "priority"]),
            models.Index(fields=["assigned_to_teacher", "status", "opened_at"]),
            models.Index(fields=["exam", "status", "opened_at"]),
            models.Index(fields=["student", "status", "opened_at"]),
        ]

    def clean(self):
        super().clean()
        if self.answer_id:
            if self.attempt_id and self.answer.attempt_id != self.attempt_id:
                raise ValidationError({"attempt": "Review task attempt must match the answer attempt."})
            if self.question_id and self.answer.question_id != self.question_id:
                raise ValidationError({"question": "Review task question must match the answer question."})
        if self.attempt_id and self.exam_id and self.attempt.exam_id != self.exam_id:
            raise ValidationError({"exam": "Review task exam must match the attempt exam."})
        if self.attempt_id and self.student_id and self.attempt.student_id != self.student_id:
            raise ValidationError({"student": "Review task student must match the attempt student."})
        if self.attempt_id and self.institute_id and self.attempt.institute_id != self.institute_id:
            raise ValidationError({"institute": "Review task institute must match the attempt institute."})
        if self.assigned_to_teacher_id and self.institute_id:
            if self.assigned_to_teacher.institute_id != self.institute_id:
                raise ValidationError({"assigned_to_teacher": "Assigned teacher must belong to the same institute."})
        if self.last_reviewed_by_teacher_id and self.institute_id:
            if self.last_reviewed_by_teacher.institute_id != self.institute_id:
                raise ValidationError(
                    {"last_reviewed_by_teacher": "Reviewer must belong to the same institute."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.answer_id} - {self.status}"


class StudentAnswerReviewEvent(BaseModel):
    review_task = models.ForeignKey(
        StudentAnswerReviewTask,
        on_delete=models.CASCADE,
        related_name="events",
    )
    answer = models.ForeignKey(
        StudentAnswer,
        on_delete=models.CASCADE,
        related_name="review_events",
    )
    attempt = models.ForeignKey(
        StudentExamAttempt,
        on_delete=models.CASCADE,
        related_name="review_events",
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="answer_review_events",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="answer_review_events",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="review_events",
    )
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="answer_review_events",
        blank=True,
        null=True,
    )
    actor_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="answer_review_events",
        blank=True,
        null=True,
    )
    event_type = models.CharField(max_length=30, choices=ReviewEventType.choices)
    from_status = models.CharField(max_length=30, choices=ReviewTaskStatus.choices, blank=True)
    to_status = models.CharField(max_length=30, choices=ReviewTaskStatus.choices, blank=True)
    marks_awarded = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["review_task", "created_at"]),
            models.Index(fields=["exam", "created_at"]),
            models.Index(fields=["student", "created_at"]),
        ]

    def clean(self):
        super().clean()
        if self.review_task_id and self.answer_id and self.review_task.answer_id != self.answer_id:
            raise ValidationError({"answer": "Review event answer must match the review task answer."})
        if self.answer_id and self.attempt_id and self.answer.attempt_id != self.attempt_id:
            raise ValidationError({"attempt": "Review event attempt must match the answer attempt."})
        if self.answer_id and self.question_id and self.answer.question_id != self.question_id:
            raise ValidationError({"question": "Review event question must match the answer question."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.review_task_id} - {self.event_type}"
