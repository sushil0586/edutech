from django.contrib import admin
from django.db.models import Count

from apps.academics.models import (
    AcademicYear,
    AssessmentFamily,
    Cohort,
    OptionCatalogEntry,
    Program,
    Subject,
    Topic,
)
from common.admin import JsonPreviewAdminMixin, RichModelAdmin, build_json_preview


@admin.register(AcademicYear)
class AcademicYearAdmin(RichModelAdmin):
    list_display = (
        "name",
        "institute",
        "start_date",
        "end_date",
        "is_current",
        "cohort_count",
        "exam_count",
        "student_count",
        "is_active",
    )
    list_filter = ("institute", "is_current", "is_active")
    search_fields = ("name", "institute__name", "institute__code")
    ordering = ("-start_date",)
    autocomplete_fields = ("institute",)
    date_hierarchy = "start_date"

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            cohort_total=Count("cohorts", distinct=True),
            exam_total=Count("exams", distinct=True),
            student_total=Count("students", distinct=True),
        )

    @admin.display(ordering="cohort_total", description="Cohorts")
    def cohort_count(self, obj):
        return obj.cohort_total

    @admin.display(ordering="exam_total", description="Exams")
    def exam_count(self, obj):
        return obj.exam_total

    @admin.display(ordering="student_total", description="Students")
    def student_count(self, obj):
        return obj.student_total


@admin.register(Program)
class ProgramAdmin(RichModelAdmin):
    list_display = (
        "name",
        "code",
        "assessment_family",
        "category",
        "institute",
        "sort_order",
        "cohort_count",
        "subject_count",
        "student_count",
        "is_active",
    )
    list_filter = ("institute", "assessment_family", "category", "is_active")
    search_fields = ("name", "code", "category", "institute__name", "assessment_family__label")
    ordering = ("sort_order", "name")
    autocomplete_fields = ("institute", "assessment_family")

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            cohort_total=Count("cohorts", distinct=True),
            subject_total=Count("subjects", distinct=True),
            student_total=Count("students", distinct=True),
        )

    @admin.display(ordering="cohort_total", description="Cohorts")
    def cohort_count(self, obj):
        return obj.cohort_total

    @admin.display(ordering="subject_total", description="Subjects")
    def subject_count(self, obj):
        return obj.subject_total

    @admin.display(ordering="student_total", description="Students")
    def student_count(self, obj):
        return obj.student_total


@admin.register(AssessmentFamily)
class AssessmentFamilyAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = (
        "allowed_question_types",
        "scoring_defaults",
        "delivery_defaults",
        "analytics_preset",
        "authoring_hints",
    )
    list_display = ("label", "code", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("label", "code", "description")
    ordering = ("sort_order", "label")


@admin.register(Cohort)
class CohortAdmin(RichModelAdmin):
    list_display = (
        "name",
        "code",
        "institute",
        "program",
        "academic_year",
        "capacity",
        "student_count",
        "is_active",
    )
    list_filter = ("institute", "academic_year", "program", "is_active")
    search_fields = ("name", "code", "program__name", "academic_year__name", "institute__name")
    ordering = ("program__sort_order", "name")
    autocomplete_fields = ("institute", "program", "academic_year")

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(student_total=Count("students", distinct=True))

    @admin.display(ordering="student_total", description="Students")
    def student_count(self, obj):
        return obj.student_total


@admin.register(Subject)
class SubjectAdmin(RichModelAdmin):
    list_display = ("name", "code", "institute", "program", "sort_order", "topic_count", "question_count", "is_active")
    list_filter = ("institute", "program", "is_active")
    search_fields = ("name", "code", "program__name", "institute__name")
    ordering = ("sort_order", "name")
    autocomplete_fields = ("institute", "program")

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            topic_total=Count("topics", distinct=True),
            question_total=Count("questions", distinct=True),
        )

    @admin.display(ordering="topic_total", description="Topics")
    def topic_count(self, obj):
        return obj.topic_total

    @admin.display(ordering="question_total", description="Questions")
    def question_count(self, obj):
        return obj.question_total


@admin.register(Topic)
class TopicAdmin(RichModelAdmin):
    list_display = (
        "name",
        "code",
        "institute",
        "subject",
        "parent_topic",
        "difficulty_level",
        "sort_order",
        "question_count",
        "is_active",
    )
    list_filter = ("institute", "subject", "difficulty_level", "is_active")
    search_fields = ("name", "code", "subject__name", "parent_topic__name", "institute__name")
    ordering = ("subject__name", "sort_order", "name")
    autocomplete_fields = ("institute", "subject", "parent_topic")

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(question_total=Count("questions", distinct=True))

    @admin.display(ordering="question_total", description="Questions")
    def question_count(self, obj):
        return obj.question_total


@admin.register(OptionCatalogEntry)
class OptionCatalogEntryAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = ("namespace", "code", "label", "sort_order", "is_default", "is_active")
    list_filter = ("namespace", "is_default", "is_active")
    search_fields = ("namespace", "code", "label", "description")
    ordering = ("namespace", "sort_order", "label")
