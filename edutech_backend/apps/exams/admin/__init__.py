from django.contrib import admin
from django.db.models import Count

from apps.exams.models import Exam, ExamPublishLog, ExamQuestion, ExamSection, ExamStudentAssignment
from common.admin import JsonPreviewAdminMixin, ReadOnlyAdmin, RichModelAdmin, RichTabularInline, build_json_preview


class ExamSectionInline(RichTabularInline):
    model = ExamSection
    fields = (
        "name",
        "section_order",
        "total_questions",
        "marks_per_question",
        "negative_marks_per_question",
        "timer_enabled",
        "duration_minutes",
        "is_active",
    )


class ExamQuestionInline(RichTabularInline):
    model = ExamQuestion
    autocomplete_fields = ("question", "section")
    fields = (
        "question_order",
        "question",
        "section",
        "marks",
        "negative_marks",
        "is_mandatory",
        "is_active",
    )


class ExamStudentAssignmentInline(RichTabularInline):
    model = ExamStudentAssignment
    autocomplete_fields = ("student", "assigned_by")
    fields = ("student", "assigned_by", "notes", "is_active")


@admin.register(Exam)
class ExamAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "title",
        "code",
        "institute",
        "source_type",
        "source_teacher",
        "program",
        "subject",
        "status",
        "start_at",
        "end_at",
        "total_marks",
        "section_count",
        "question_count",
        "attempt_count",
        "is_active",
    )
    list_filter = (
        "institute",
        "source_type",
        "academic_year",
        "program",
        "cohort",
        "subject",
        "exam_type",
        "delivery_mode",
        "status",
        "is_active",
    )
    search_fields = ("title", "code", "description", "instructions")
    ordering = ("-start_at", "-created_at")
    autocomplete_fields = ("institute", "academic_year", "program", "cohort", "subject", "source_teacher")
    inlines = (ExamSectionInline, ExamQuestionInline, ExamStudentAssignmentInline)
    date_hierarchy = "start_at"

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            section_total=Count("sections", distinct=True),
            question_total=Count("exam_questions", distinct=True),
            attempt_total=Count("attempts", distinct=True),
        )

    @admin.display(ordering="section_total", description="Sections")
    def section_count(self, obj):
        return obj.section_total

    @admin.display(ordering="question_total", description="Questions")
    def question_count(self, obj):
        return obj.question_total

    @admin.display(ordering="attempt_total", description="Attempts")
    def attempt_count(self, obj):
        return obj.attempt_total


@admin.register(ExamSection)
class ExamSectionAdmin(RichModelAdmin):
    list_display = (
        "name",
        "exam",
        "section_order",
        "total_questions",
        "marks_per_question",
        "negative_marks_per_question",
        "timer_enabled",
        "is_active",
    )
    list_filter = ("timer_enabled", "lock_after_submit", "allow_skip_section", "is_active")
    search_fields = ("name", "exam__title", "exam__code", "description")
    ordering = ("exam", "section_order")
    autocomplete_fields = ("exam",)


@admin.register(ExamQuestion)
class ExamQuestionAdmin(RichModelAdmin):
    list_display = (
        "exam",
        "question_order",
        "question",
        "section_name",
        "marks",
        "negative_marks",
        "is_mandatory",
        "is_active",
    )
    list_filter = ("is_mandatory", "is_active", "exam__status")
    search_fields = ("exam__title", "exam__code", "question__question_text", "section_name")
    ordering = ("exam", "question_order")
    autocomplete_fields = ("exam", "question", "section")


@admin.register(ExamPublishLog)
class ExamPublishLogAdmin(ReadOnlyAdmin):
    list_display = ("exam", "old_status", "new_status", "changed_by", "created_at")
    list_filter = ("old_status", "new_status", "changed_by")
    search_fields = ("exam__title", "exam__code", "changed_by__full_name", "remarks")
    ordering = ("-created_at",)
    autocomplete_fields = ("exam", "changed_by")


@admin.register(ExamStudentAssignment)
class ExamStudentAssignmentAdmin(RichModelAdmin):
    list_display = ("exam", "student", "assigned_by", "notes", "is_active", "created_at")
    list_filter = ("exam__institute", "exam__academic_year", "exam__program", "is_active")
    search_fields = ("exam__title", "exam__code", "student__full_name", "student__admission_no", "notes")
    ordering = ("exam__title", "student__full_name")
    autocomplete_fields = ("exam", "student", "assigned_by")
