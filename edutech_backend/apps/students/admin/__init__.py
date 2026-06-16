from django.contrib import admin
from django.db.models import Count

from apps.students.models import StudentProfile
from common.admin import JsonPreviewAdminMixin, RichModelAdmin, build_json_preview


@admin.register(StudentProfile)
class StudentProfileAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("accommodation_profile",)
    accommodation_profile_preview = build_json_preview("accommodation_profile", "Accommodation profile")
    list_display = (
        "full_name",
        "admission_no",
        "institute",
        "academic_year",
        "program",
        "cohort",
        "phone",
        "parent_links_count",
        "attempt_count",
        "result_count",
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

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            parent_total=Count("parent_relationships", distinct=True),
            attempt_total=Count("exam_attempts", distinct=True),
            result_total=Count("exam_results", distinct=True),
        )

    @admin.display(ordering="parent_total", description="Parent links")
    def parent_links_count(self, obj):
        return obj.parent_total

    @admin.display(ordering="attempt_total", description="Attempts")
    def attempt_count(self, obj):
        return obj.attempt_total

    @admin.display(ordering="result_total", description="Results")
    def result_count(self, obj):
        return obj.result_total
