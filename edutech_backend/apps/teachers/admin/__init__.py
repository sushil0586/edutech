from django.contrib import admin

from apps.teachers.models import TeacherAssignment, TeacherProfile


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "employee_code",
        "institute",
        "email",
        "phone",
        "specialization",
        "is_active",
    )
    list_filter = ("institute", "is_active")
    search_fields = (
        "full_name",
        "employee_code",
        "first_name",
        "last_name",
        "email",
        "phone",
        "specialization",
        "qualification",
    )
    ordering = ("full_name",)
    autocomplete_fields = ("institute",)


@admin.register(TeacherAssignment)
class TeacherAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "teacher",
        "subject",
        "program",
        "cohort",
        "academic_year",
        "assignment_role",
        "is_primary",
        "is_active",
    )
    list_filter = (
        "institute",
        "academic_year",
        "program",
        "cohort",
        "subject",
        "assignment_role",
        "is_primary",
        "is_active",
    )
    search_fields = (
        "teacher__full_name",
        "teacher__employee_code",
        "subject__name",
        "program__name",
        "cohort__name",
        "academic_year__name",
    )
    ordering = ("-is_primary", "subject__name", "teacher__full_name")
    autocomplete_fields = ("institute", "teacher", "academic_year", "program", "cohort", "subject")
