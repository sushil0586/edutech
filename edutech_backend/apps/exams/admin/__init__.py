from django.contrib import admin

from apps.exams.models import Exam, ExamPublishLog, ExamQuestion, ExamSection


class ExamSectionInline(admin.TabularInline):
    model = ExamSection
    extra = 0


class ExamQuestionInline(admin.TabularInline):
    model = ExamQuestion
    extra = 0
    autocomplete_fields = ("question",)


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "code",
        "institute",
        "program",
        "subject",
        "status",
        "start_at",
        "end_at",
        "total_marks",
        "is_active",
    )
    list_filter = (
        "institute",
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
    autocomplete_fields = ("institute", "academic_year", "program", "cohort", "subject")
    inlines = (ExamSectionInline, ExamQuestionInline)


@admin.register(ExamSection)
class ExamSectionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "exam",
        "section_order",
        "total_questions",
        "marks_per_question",
        "negative_marks_per_question",
        "is_active",
    )
    list_filter = ("is_active",)
    search_fields = ("name", "exam__title", "exam__code", "description")
    ordering = ("exam", "section_order")
    autocomplete_fields = ("exam",)


@admin.register(ExamQuestion)
class ExamQuestionAdmin(admin.ModelAdmin):
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
    autocomplete_fields = ("exam", "question")


@admin.register(ExamPublishLog)
class ExamPublishLogAdmin(admin.ModelAdmin):
    list_display = ("exam", "old_status", "new_status", "changed_by", "created_at")
    list_filter = ("old_status", "new_status", "changed_by")
    search_fields = ("exam__title", "exam__code", "changed_by__full_name", "remarks")
    ordering = ("-created_at",)
    autocomplete_fields = ("exam", "changed_by")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
