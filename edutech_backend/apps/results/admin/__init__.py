from django.contrib import admin

from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance
from common.admin import JsonPreviewAdminMixin, ReadOnlyAdmin, RichModelAdmin, build_json_preview


@admin.register(ExamResult)
class ExamResultAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "student",
        "exam",
        "result_status",
        "rank",
        "final_score",
        "percentage",
        "correct_answers",
        "incorrect_answers",
        "is_published",
    )
    list_filter = ("institute", "exam", "result_status", "is_published", "is_active")
    search_fields = ("student__full_name", "student__admission_no", "exam__title", "exam__code")
    ordering = ("rank", "-final_score", "time_taken_seconds")
    autocomplete_fields = ("institute", "exam", "student", "attempt")


@admin.register(StudentTopicPerformance)
class StudentTopicPerformanceAdmin(RichModelAdmin):
    list_display = (
        "student",
        "exam",
        "subject",
        "topic",
        "correct_answers",
        "incorrect_answers",
        "final_score",
        "percentage",
        "is_active",
    )
    list_filter = ("institute", "exam", "subject", "topic", "is_active")
    search_fields = ("student__full_name", "student__admission_no", "exam__title", "subject__name")
    ordering = ("-percentage", "-final_score")
    autocomplete_fields = ("institute", "exam", "student", "subject", "topic")


@admin.register(ExamPerformanceSummary)
class ExamPerformanceSummaryAdmin(JsonPreviewAdminMixin, ReadOnlyAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "exam",
        "total_students",
        "total_attempted",
        "total_passed",
        "total_failed",
        "average_score",
        "average_percentage",
        "last_calculated_at",
    )
    list_filter = ("institute", "is_active")
    search_fields = ("exam__title", "exam__code")
    ordering = ("-last_calculated_at",)
    autocomplete_fields = ("institute", "exam")
