from django.contrib import admin

from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance


@admin.register(ExamResult)
class ExamResultAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "exam",
        "result_status",
        "rank",
        "final_score",
        "percentage",
        "is_published",
    )
    list_filter = ("institute", "exam", "result_status", "is_published", "is_active")
    search_fields = ("student__full_name", "student__admission_no", "exam__title", "exam__code")
    ordering = ("rank", "-final_score", "time_taken_seconds")
    autocomplete_fields = ("institute", "exam", "student", "attempt")


@admin.register(StudentTopicPerformance)
class StudentTopicPerformanceAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "exam",
        "subject",
        "topic",
        "final_score",
        "percentage",
        "is_active",
    )
    list_filter = ("institute", "exam", "subject", "topic", "is_active")
    search_fields = ("student__full_name", "student__admission_no", "exam__title", "subject__name")
    ordering = ("-percentage", "-final_score")
    autocomplete_fields = ("institute", "exam", "student", "subject", "topic")


@admin.register(ExamPerformanceSummary)
class ExamPerformanceSummaryAdmin(admin.ModelAdmin):
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

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
