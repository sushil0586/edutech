from django.contrib import admin

from apps.attempts.models import StudentAnswer, StudentExamAttempt


class StudentAnswerInline(admin.TabularInline):
    model = StudentAnswer
    extra = 0
    autocomplete_fields = ("question", "selected_option")


@admin.register(StudentExamAttempt)
class StudentExamAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "exam",
        "status",
        "score",
        "negative_score",
        "final_score",
        "percentage",
        "started_at",
        "submitted_at",
    )
    list_filter = ("institute", "exam", "status", "is_auto_submitted", "is_active")
    search_fields = ("student__full_name", "student__admission_no", "exam__title", "exam__code")
    ordering = ("-started_at",)
    autocomplete_fields = ("institute", "exam", "student")
    inlines = (StudentAnswerInline,)


@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
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
    list_filter = ("is_correct", "is_marked_for_review", "is_active")
    search_fields = (
        "attempt__student__full_name",
        "attempt__exam__title",
        "question__question_text",
        "answer_text",
    )
    ordering = ("-answered_at",)
    autocomplete_fields = ("attempt", "question", "selected_option")
