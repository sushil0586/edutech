from django.contrib import admin
from django.db.models import Count

from apps.attempts.models import AttemptIntegrityEvent, StudentAnswer, StudentExamAttempt
from common.admin import JsonPreviewAdminMixin, RichModelAdmin, RichTabularInline, build_json_preview


class StudentAnswerInline(RichTabularInline):
    model = StudentAnswer
    autocomplete_fields = ("question", "selected_option")
    fields = (
        "question",
        "selected_option",
        "is_correct",
        "marks_awarded",
        "negative_marks_applied",
        "is_marked_for_review",
        "answered_at",
        "is_active",
    )


class AttemptIntegrityEventInline(RichTabularInline):
    model = AttemptIntegrityEvent
    readonly_fields = ("event_type", "severity", "counts_as_violation", "event_at", "metadata")
    fields = ("event_type", "severity", "counts_as_violation", "event_at", "metadata", "is_active")


@admin.register(StudentExamAttempt)
class StudentExamAttemptAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "student",
        "exam",
        "attempt_no",
        "status",
        "attempted_questions",
        "final_score",
        "percentage",
        "violation_count",
        "started_at",
        "submitted_at",
    )
    list_filter = ("institute", "exam", "status", "is_auto_submitted", "is_active")
    search_fields = ("student__full_name", "student__admission_no", "exam__title", "exam__code")
    ordering = ("-started_at",)
    autocomplete_fields = ("institute", "exam", "student")
    inlines = (StudentAnswerInline, AttemptIntegrityEventInline)
    date_hierarchy = "started_at"

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            violation_total=Count("integrity_events", distinct=True)
        )

    @admin.display(ordering="violation_total", description="Integrity events")
    def violation_count(self, obj):
        return obj.violation_total


@admin.register(StudentAnswer)
class StudentAnswerAdmin(RichModelAdmin):
    list_display = (
        "attempt",
        "question",
        "selected_option",
        "is_correct",
        "marks_awarded",
        "negative_marks_applied",
        "answered_at",
        "is_marked_for_review",
        "is_active",
    )
    list_filter = ("is_correct", "is_marked_for_review", "is_active", "question__question_type")
    search_fields = (
        "attempt__student__full_name",
        "attempt__exam__title",
        "question__question_text",
        "answer_text",
    )
    ordering = ("-answered_at",)
    autocomplete_fields = ("attempt", "question", "selected_option")


@admin.register(AttemptIntegrityEvent)
class AttemptIntegrityEventAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "attempt",
        "event_type",
        "severity",
        "counts_as_violation",
        "event_at",
        "is_active",
    )
    list_filter = ("event_type", "severity", "counts_as_violation", "is_active")
    search_fields = (
        "attempt__student__full_name",
        "attempt__exam__title",
        "attempt__exam__code",
    )
    ordering = ("-event_at",)
    autocomplete_fields = ("attempt", "exam", "student", "institute")
