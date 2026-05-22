from django.contrib import admin

from apps.academics.models import AcademicYear, Cohort, Program, Subject, Topic


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ("name", "institute", "start_date", "end_date", "is_current", "is_active")
    list_filter = ("institute", "is_current", "is_active")
    search_fields = ("name", "institute__name", "institute__code")
    ordering = ("-start_date",)
    autocomplete_fields = ("institute",)


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "category", "institute", "sort_order", "is_active")
    list_filter = ("institute", "category", "is_active")
    search_fields = ("name", "code", "category", "institute__name")
    ordering = ("sort_order", "name")
    autocomplete_fields = ("institute",)


@admin.register(Cohort)
class CohortAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "institute",
        "program",
        "academic_year",
        "capacity",
        "is_active",
    )
    list_filter = ("institute", "academic_year", "program", "is_active")
    search_fields = ("name", "code", "program__name", "academic_year__name", "institute__name")
    ordering = ("program__sort_order", "name")
    autocomplete_fields = ("institute", "program", "academic_year")


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "institute", "program", "sort_order", "is_active")
    list_filter = ("institute", "program", "is_active")
    search_fields = ("name", "code", "program__name", "institute__name")
    ordering = ("sort_order", "name")
    autocomplete_fields = ("institute", "program")


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "subject",
        "parent_topic",
        "difficulty_level",
        "sort_order",
        "is_active",
    )
    list_filter = ("institute", "subject", "difficulty_level", "is_active")
    search_fields = ("name", "code", "subject__name", "parent_topic__name", "institute__name")
    ordering = ("subject__name", "sort_order", "name")
    autocomplete_fields = ("institute", "subject", "parent_topic")
