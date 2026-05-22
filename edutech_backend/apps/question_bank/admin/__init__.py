from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms import BaseInlineFormSet

from apps.question_bank.models import (
    Question,
    QuestionAttachment,
    QuestionOption,
    QuestionTag,
    QuestionTagMap,
)
from apps.question_bank.services import validate_question_options


class QuestionOptionInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()

        options = []
        for form in self.forms:
            if not hasattr(form, "cleaned_data") or not form.cleaned_data:
                continue
            if form.cleaned_data.get("DELETE"):
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


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 0
    formset = QuestionOptionInlineFormSet


class QuestionAttachmentInline(admin.TabularInline):
    model = QuestionAttachment
    extra = 0


class QuestionTagMapInline(admin.TabularInline):
    model = QuestionTagMap
    extra = 0
    autocomplete_fields = ("tag",)


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "subject",
        "topic",
        "question_type",
        "difficulty_level",
        "default_marks",
        "negative_marks",
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


@admin.register(QuestionOption)
class QuestionOptionAdmin(admin.ModelAdmin):
    list_display = ("question", "option_order", "is_correct", "is_active")
    list_filter = ("is_correct", "is_active", "question__question_type")
    search_fields = ("option_text", "question__question_text")
    ordering = ("question", "option_order")
    autocomplete_fields = ("question",)


@admin.register(QuestionTag)
class QuestionTagAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "institute", "is_active")
    list_filter = ("institute", "is_active")
    search_fields = ("name", "code", "institute__name")
    ordering = ("name",)
    autocomplete_fields = ("institute",)


@admin.register(QuestionTagMap)
class QuestionTagMapAdmin(admin.ModelAdmin):
    list_display = ("question", "tag", "is_active", "created_at")
    list_filter = ("tag", "is_active")
    search_fields = ("question__question_text", "tag__name", "tag__code")
    ordering = ("tag__name",)
    autocomplete_fields = ("question", "tag")


@admin.register(QuestionAttachment)
class QuestionAttachmentAdmin(admin.ModelAdmin):
    list_display = ("title", "question", "attachment_type", "is_active", "created_at")
    list_filter = ("attachment_type", "is_active")
    search_fields = ("title", "question__question_text")
    ordering = ("title", "created_at")
    autocomplete_fields = ("question",)
