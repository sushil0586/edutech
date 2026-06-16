from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.db.models import Count
from django.forms import BaseInlineFormSet

from apps.question_bank.models import (
    InstituteQuestionAccess,
    MasterQuestion,
    MasterQuestionAttachment,
    MasterQuestionOption,
    Question,
    QuestionAttachment,
    QuestionOption,
    QuestionTag,
    QuestionTagMap,
)
from apps.question_bank.services import validate_question_options
from common.admin import JsonPreviewAdminMixin, RichModelAdmin, RichTabularInline, build_json_preview


class QuestionOptionInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()

        options = []
        for form in self.forms:
            if not hasattr(form, "cleaned_data") or not form.cleaned_data or form.cleaned_data.get("DELETE"):
                continue
            options.append(
                {
                    "option_text": form.cleaned_data.get("option_text", ""),
                    "option_order": form.cleaned_data.get("option_order"),
                    "is_correct": form.cleaned_data.get("is_correct", False),
                    "is_active": form.cleaned_data.get("is_active", True),
                }
            )

        question_type = None
        if self.instance and self.instance.pk:
            question_type = self.instance.question_type
        elif hasattr(self, "question_type_override"):
            question_type = self.question_type_override

        if question_type:
            try:
                validate_question_options(question_type, options)
            except ValidationError as exc:
                raise forms.ValidationError(exc) from exc


class QuestionOptionInline(RichTabularInline):
    model = QuestionOption
    formset = QuestionOptionInlineFormSet
    fields = ("option_order", "option_text", "content_format", "is_correct", "is_active")


class QuestionAttachmentInline(RichTabularInline):
    model = QuestionAttachment
    fields = ("title", "attachment_type", "display_order", "is_inline", "is_active")


class QuestionTagMapInline(RichTabularInline):
    model = QuestionTagMap
    autocomplete_fields = ("tag",)
    fields = ("tag", "is_active")


@admin.register(Question)
class QuestionAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "id",
        "subject",
        "topic",
        "question_type",
        "difficulty_level",
        "default_marks",
        "negative_marks",
        "option_count",
        "tag_count",
        "is_verified",
        "is_active",
        "created_at",
    )
    list_filter = (
        "institute",
        "program",
        "subject",
        "topic",
        "question_type",
        "difficulty_level",
        "is_verified",
        "is_active",
    )
    search_fields = ("question_text", "explanation", "subject__name", "topic__name")
    ordering = ("-created_at",)
    autocomplete_fields = ("institute", "program", "subject", "topic", "created_by_teacher")
    inlines = (QuestionOptionInline, QuestionTagMapInline, QuestionAttachmentInline)
    date_hierarchy = "created_at"

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            option_total=Count("options", distinct=True),
            tag_total=Count("tag_maps", distinct=True),
        )

    @admin.display(ordering="option_total", description="Options")
    def option_count(self, obj):
        return obj.option_total

    @admin.display(ordering="tag_total", description="Tags")
    def tag_count(self, obj):
        return obj.tag_total


@admin.register(QuestionOption)
class QuestionOptionAdmin(RichModelAdmin):
    list_display = ("question", "option_order", "content_format", "is_correct", "is_active")
    list_filter = ("is_correct", "is_active", "question__question_type")
    search_fields = ("option_text", "question__question_text")
    ordering = ("question", "option_order")
    autocomplete_fields = ("question",)


@admin.register(QuestionTag)
class QuestionTagAdmin(RichModelAdmin):
    list_display = ("name", "code", "institute", "mapped_questions_count", "is_active")
    list_filter = ("institute", "is_active")
    search_fields = ("name", "code", "institute__name")
    ordering = ("name",)
    autocomplete_fields = ("institute",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(question_total=Count("question_maps", distinct=True))

    @admin.display(ordering="question_total", description="Mapped questions")
    def mapped_questions_count(self, obj):
        return obj.question_total


@admin.register(QuestionTagMap)
class QuestionTagMapAdmin(RichModelAdmin):
    list_display = ("question", "tag", "is_active", "created_at")
    list_filter = ("tag", "is_active")
    search_fields = ("question__question_text", "tag__name", "tag__code")
    ordering = ("tag__name",)
    autocomplete_fields = ("question", "tag")


@admin.register(QuestionAttachment)
class QuestionAttachmentAdmin(RichModelAdmin):
    list_display = ("title", "question", "attachment_type", "display_order", "is_inline", "is_active", "created_at")
    list_filter = ("attachment_type", "is_inline", "is_active")
    search_fields = ("title", "question__question_text")
    ordering = ("title", "created_at")
    autocomplete_fields = ("question",)


class MasterQuestionOptionInline(RichTabularInline):
    model = MasterQuestionOption
    fields = ("option_order", "option_text", "content_format", "is_correct", "is_active")


class MasterQuestionAttachmentInline(RichTabularInline):
    model = MasterQuestionAttachment
    fields = ("title", "attachment_type", "display_order", "is_inline", "is_active")


@admin.register(MasterQuestion)
class MasterQuestionAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "id",
        "source_institute",
        "source_subject",
        "source_topic",
        "question_type",
        "source_type",
        "visibility",
        "is_verified",
        "is_active",
        "created_at",
    )
    list_filter = (
        "source_institute",
        "source_subject",
        "question_type",
        "source_type",
        "visibility",
        "difficulty_level",
        "is_verified",
        "is_active",
    )
    search_fields = ("question_text", "explanation", "source_subject__name", "source_topic__name")
    autocomplete_fields = ("source_institute", "source_program", "source_subject", "source_topic", "created_by_teacher")
    inlines = (MasterQuestionOptionInline, MasterQuestionAttachmentInline)


@admin.register(InstituteQuestionAccess)
class InstituteQuestionAccessAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "id",
        "institute",
        "master_question",
        "status",
        "requested_by_teacher",
        "approved_by",
        "linked_question",
        "is_active",
        "created_at",
    )
    list_filter = ("institute", "status", "is_active")
    search_fields = ("master_question__question_text", "institute__name", "requested_by_teacher__full_name")
    autocomplete_fields = (
        "institute",
        "master_question",
        "requested_by_teacher",
        "approved_by",
        "linked_question",
        "local_program",
        "local_subject",
        "local_topic",
    )
