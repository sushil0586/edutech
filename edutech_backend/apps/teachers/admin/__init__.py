from django.contrib import admin
from django.db.models import Count

from apps.teachers.models import TeacherAssignment, TeacherProfile
from common.admin import RichModelAdmin, RichTabularInline


class TeacherAssignmentInline(RichTabularInline):
    model = TeacherAssignment
    autocomplete_fields = ("academic_year", "program", "cohort", "subject")
    fields = (
        "academic_year",
        "program",
        "cohort",
        "subject",
        "assignment_role",
        "is_primary",
        "is_active",
    )


@admin.register(TeacherProfile)
class TeacherProfileAdmin(RichModelAdmin):
    list_display = (
        "full_name",
        "employee_code",
        "institute",
        "email",
        "phone",
        "specialization",
        "assignment_count",
        "question_count",
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
    inlines = (TeacherAssignmentInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            assignment_total=Count("assignments", distinct=True),
            question_total=Count("questions_created", distinct=True),
        )

    @admin.display(ordering="assignment_total", description="Assignments")
    def assignment_count(self, obj):
        return obj.assignment_total

    @admin.display(ordering="question_total", description="Questions")
    def question_count(self, obj):
        return obj.question_total


@admin.register(TeacherAssignment)
class TeacherAssignmentAdmin(RichModelAdmin):
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
