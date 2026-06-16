from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.academics.models import Program, Subject, Topic, TopicDifficulty
from apps.institutes.models import Institute
from apps.teachers.models import TeacherProfile
from common.models import BaseModel


class QuestionType(models.TextChoices):
    MCQ_SINGLE = "mcq_single", "MCQ Single"
    MCQ_MULTIPLE = "mcq_multiple", "MCQ Multiple"
    TRUE_FALSE = "true_false", "True / False"
    SHORT_ANSWER = "short_answer", "Short Answer"


class AttachmentType(models.TextChoices):
    IMAGE = "image", "Image"
    DIAGRAM = "diagram", "Diagram"
    PDF = "pdf", "PDF"
    AUDIO = "audio", "Audio"
    VIDEO = "video", "Video"
    OTHER = "other", "Other"


class ContentFormat(models.TextChoices):
    PLAIN_TEXT = "plain_text", "Plain Text"
    MARKDOWN_LATEX = "markdown_latex", "Markdown + LaTeX"


class MasterQuestionVisibility(models.TextChoices):
    PRIVATE = "private", "Private"
    SHARED_BY_REQUEST = "shared_by_request", "Shared By Request"
    PUBLIC = "public", "Public"


class MasterQuestionSourceType(models.TextChoices):
    PLATFORM = "platform", "Platform"
    INSTITUTE = "institute", "Institute"
    TEACHER = "teacher", "Teacher"


class InstituteQuestionAccessStatus(models.TextChoices):
    REQUESTED = "requested", "Requested"
    APPROVED = "approved", "Approved"
    LINKED = "linked", "Linked"
    REJECTED = "rejected", "Rejected"
    ARCHIVED = "archived", "Archived"


class MasterQuestion(BaseModel):
    source_institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="master_questions",
    )
    source_program = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        related_name="master_questions",
        blank=True,
        null=True,
    )
    source_subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="master_questions",
    )
    source_topic = models.ForeignKey(
        Topic,
        on_delete=models.SET_NULL,
        related_name="master_questions",
        blank=True,
        null=True,
    )
    created_by_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="master_questions_created",
        blank=True,
        null=True,
    )
    question_type = models.CharField(max_length=30, choices=QuestionType.choices)
    difficulty_level = models.CharField(
        max_length=20,
        choices=TopicDifficulty.choices,
        default=TopicDifficulty.INTERMEDIATE,
    )
    content_format = models.CharField(
        max_length=20,
        choices=ContentFormat.choices,
        default=ContentFormat.MARKDOWN_LATEX,
    )
    question_text = models.TextField()
    explanation = models.TextField(blank=True)
    default_marks = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("1.00"))
    negative_marks = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    is_verified = models.BooleanField(default=False)
    source_type = models.CharField(
        max_length=20,
        choices=MasterQuestionSourceType.choices,
        default=MasterQuestionSourceType.INSTITUTE,
    )
    visibility = models.CharField(
        max_length=30,
        choices=MasterQuestionVisibility.choices,
        default=MasterQuestionVisibility.PRIVATE,
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source_institute", "source_subject"]),
            models.Index(fields=["source_type", "visibility"]),
            models.Index(fields=["question_type", "difficulty_level"]),
            models.Index(fields=["is_verified", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.default_marks < 0:
            raise ValidationError({"default_marks": "Default marks cannot be negative."})
        if self.negative_marks < 0:
            raise ValidationError({"negative_marks": "Negative marks cannot be negative."})
        if self.source_subject_id and self.source_subject.institute_id != self.source_institute_id:
            raise ValidationError({"source_subject": "Source subject must belong to the source institute."})
        if self.source_program_id and self.source_program.institute_id != self.source_institute_id:
            raise ValidationError({"source_program": "Source program must belong to the source institute."})
        if self.source_topic_id:
            if self.source_topic.institute_id != self.source_institute_id:
                raise ValidationError({"source_topic": "Source topic must belong to the source institute."})
            if self.source_topic.subject_id != self.source_subject_id:
                raise ValidationError({"source_topic": "Source topic must belong to the source subject."})
        if self.created_by_teacher_id and self.created_by_teacher.institute_id != self.source_institute_id:
            raise ValidationError(
                {"created_by_teacher": "Teacher must belong to the same institute as the master question."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.source_subject.name} - {self.get_question_type_display()}"


class MasterQuestionOption(BaseModel):
    master_question = models.ForeignKey(
        MasterQuestion,
        on_delete=models.CASCADE,
        related_name="options",
    )
    content_format = models.CharField(
        max_length=20,
        choices=ContentFormat.choices,
        default=ContentFormat.MARKDOWN_LATEX,
    )
    option_text = models.TextField()
    option_order = models.PositiveIntegerField(default=1)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ["option_order", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["master_question", "option_order"],
                name="unique_master_question_option_order",
            )
        ]
        indexes = [
            models.Index(fields=["master_question", "option_order"]),
            models.Index(fields=["master_question", "is_active"]),
        ]

    def __str__(self):
        return f"{self.master_question_id} - Option {self.option_order}"


class MasterQuestionAttachment(BaseModel):
    master_question = models.ForeignKey(
        MasterQuestion,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="question-bank/master-attachments/")
    attachment_type = models.CharField(max_length=20, choices=AttachmentType.choices)
    title = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=1)
    alt_text = models.CharField(max_length=255, blank=True)
    is_inline = models.BooleanField(default=False)

    class Meta:
        ordering = ["display_order", "title", "created_at"]
        indexes = [
            models.Index(fields=["master_question", "attachment_type"]),
            models.Index(fields=["master_question", "is_active"]),
            models.Index(fields=["master_question", "display_order"]),
        ]

    def __str__(self):
        return self.title or f"{self.get_attachment_type_display()} attachment"


class Question(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        related_name="questions",
        blank=True,
        null=True,
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    topic = models.ForeignKey(
        Topic,
        on_delete=models.SET_NULL,
        related_name="questions",
        blank=True,
        null=True,
    )
    created_by_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="questions_created",
        blank=True,
        null=True,
    )
    master_question = models.ForeignKey(
        MasterQuestion,
        on_delete=models.SET_NULL,
        related_name="institute_questions",
        blank=True,
        null=True,
    )
    question_type = models.CharField(max_length=30, choices=QuestionType.choices)
    difficulty_level = models.CharField(
        max_length=20,
        choices=TopicDifficulty.choices,
        default=TopicDifficulty.INTERMEDIATE,
    )
    content_format = models.CharField(
        max_length=20,
        choices=ContentFormat.choices,
        default=ContentFormat.MARKDOWN_LATEX,
    )
    question_text = models.TextField()
    explanation = models.TextField(blank=True)
    default_marks = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("1.00"))
    negative_marks = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    is_verified = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["institute", "subject"]),
            models.Index(fields=["program", "topic"]),
            models.Index(fields=["question_type", "difficulty_level"]),
            models.Index(fields=["is_verified", "is_active"]),
            models.Index(fields=["master_question"]),
        ]

    def clean(self):
        super().clean()
        if self.default_marks < 0:
            raise ValidationError({"default_marks": "Default marks cannot be negative."})
        if self.negative_marks < 0:
            raise ValidationError({"negative_marks": "Negative marks cannot be negative."})
        if self.institute_id and self.subject_id:
            from apps.question_bank.services import validate_question_relationships

            validate_question_relationships(self)
        if self.master_question_id:
            if self.master_question.question_type != self.question_type:
                raise ValidationError(
                    {"master_question": "Master question type must match the institute question type."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.subject.name} - {self.get_question_type_display()}"


class QuestionOption(BaseModel):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="options",
    )
    content_format = models.CharField(
        max_length=20,
        choices=ContentFormat.choices,
        default=ContentFormat.MARKDOWN_LATEX,
    )
    option_text = models.TextField()
    option_order = models.PositiveIntegerField(default=1)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ["option_order", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["question", "option_order"],
                name="unique_question_option_order",
            )
        ]
        indexes = [
            models.Index(fields=["question", "option_order"]),
            models.Index(fields=["question", "is_active"]),
        ]

    def __str__(self):
        return f"{self.question_id} - Option {self.option_order}"


class QuestionTag(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="question_tags",
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"],
                name="unique_question_tag_code_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "name"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name


class QuestionTagMap(BaseModel):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="tag_maps",
    )
    tag = models.ForeignKey(
        QuestionTag,
        on_delete=models.CASCADE,
        related_name="question_maps",
    )

    class Meta:
        ordering = ["tag__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["question", "tag"],
                name="unique_question_tag_mapping",
            )
        ]
        indexes = [
            models.Index(fields=["question", "tag"]),
        ]

    def clean(self):
        super().clean()
        if self.question_id and self.tag_id:
            from apps.question_bank.services import validate_tag_mapping

            validate_tag_mapping(self.question, self.tag)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.question_id} - {self.tag.name}"


class QuestionAttachment(BaseModel):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="question-bank/attachments/")
    attachment_type = models.CharField(max_length=20, choices=AttachmentType.choices)
    title = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=1)
    alt_text = models.CharField(max_length=255, blank=True)
    is_inline = models.BooleanField(default=False)

    class Meta:
        ordering = ["display_order", "title", "created_at"]
        indexes = [
            models.Index(fields=["question", "attachment_type"]),
            models.Index(fields=["question", "is_active"]),
            models.Index(fields=["question", "display_order"]),
        ]

    def __str__(self):
        return self.title or f"{self.get_attachment_type_display()} attachment"


class InstituteQuestionAccess(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="question_access_links",
    )
    master_question = models.ForeignKey(
        MasterQuestion,
        on_delete=models.CASCADE,
        related_name="access_links",
    )
    requested_by_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="requested_question_links",
        blank=True,
        null=True,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="approved_question_links",
        blank=True,
        null=True,
    )
    linked_question = models.ForeignKey(
        Question,
        on_delete=models.SET_NULL,
        related_name="access_links",
        blank=True,
        null=True,
    )
    local_program = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        related_name="question_access_links",
        blank=True,
        null=True,
    )
    local_subject = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        related_name="question_access_links",
        blank=True,
        null=True,
    )
    local_topic = models.ForeignKey(
        Topic,
        on_delete=models.SET_NULL,
        related_name="question_access_links",
        blank=True,
        null=True,
    )
    status = models.CharField(
        max_length=20,
        choices=InstituteQuestionAccessStatus.choices,
        default=InstituteQuestionAccessStatus.REQUESTED,
    )
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "master_question"],
                name="unique_institute_master_question_access",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "status"]),
            models.Index(fields=["master_question", "status"]),
            models.Index(fields=["linked_question"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.master_question_id and self.master_question.source_institute_id == self.institute_id:
            raise ValidationError(
                {"master_question": "Source institute questions should not create a separate access link to themselves."}
            )
        if self.requested_by_teacher_id and self.requested_by_teacher.institute_id != self.institute_id:
            raise ValidationError(
                {"requested_by_teacher": "Requesting teacher must belong to the target institute."}
            )
        if self.linked_question_id and self.linked_question.institute_id != self.institute_id:
            raise ValidationError({"linked_question": "Linked question must belong to the target institute."})
        if self.local_program_id and self.local_program.institute_id != self.institute_id:
            raise ValidationError({"local_program": "Local program must belong to the target institute."})
        if self.local_subject_id and self.local_subject.institute_id != self.institute_id:
            raise ValidationError({"local_subject": "Local subject must belong to the target institute."})
        if self.local_topic_id:
            if self.local_topic.institute_id != self.institute_id:
                raise ValidationError({"local_topic": "Local topic must belong to the target institute."})
            if self.local_subject_id and self.local_topic.subject_id != self.local_subject_id:
                raise ValidationError({"local_topic": "Local topic must belong to the selected local subject."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
