from django.contrib import admin
from django.db.models import Count

from apps.students.models import StudentAccommodationProfile, StudentProfile
from common.admin import RichModelAdmin


class StudentAccommodationProfileInline(admin.StackedInline):
    model = StudentAccommodationProfile
    extra = 0
    can_delete = False


@admin.register(StudentProfile)
class StudentProfileAdmin(RichModelAdmin):
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
    inlines = (StudentAccommodationProfileInline,)

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


@admin.register(StudentAccommodationProfile)
class StudentAccommodationProfileAdmin(RichModelAdmin):
    list_display = (
        "student",
        "extra_time_minutes",
        "extra_time_percentage",
        "additional_violation_allowance",
        "simplified_warning_copy",
        "source",
        "is_active",
    )
    list_filter = ("simplified_warning_copy", "source", "is_active")
    search_fields = ("student__full_name", "student__admission_no", "notes", "alternative_instructions")
    ordering = ("student__full_name",)
    autocomplete_fields = ("student",)
