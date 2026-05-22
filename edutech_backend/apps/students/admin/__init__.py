from django.contrib import admin

from apps.students.models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "admission_no",
        "institute",
        "academic_year",
        "program",
        "cohort",
        "phone",
        "is_active",
    )
    list_filter = ("institute", "academic_year", "program", "cohort", "gender", "is_active")
    search_fields = (
        "full_name",
        "admission_no",
        "first_name",
        "last_name",
        "email",
        "phone",
        "guardian_name",
    )
    ordering = ("full_name", "admission_no")
    autocomplete_fields = ("institute", "academic_year", "program", "cohort")
