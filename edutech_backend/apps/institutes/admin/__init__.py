from django.contrib import admin
from django.db.models import Count

from apps.institutes.models import Institute
from common.admin import JsonPreviewAdminMixin, RichModelAdmin, build_json_preview


@admin.register(Institute)
class InstituteAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "name",
        "code",
        "email",
        "phone",
        "city",
        "state",
        "country",
        "student_count",
        "teacher_count",
        "exam_count",
        "is_active",
    )
    list_filter = ("is_active", "country", "state", "city")
    search_fields = ("name", "code", "email", "phone", "city", "state", "country", "website")
    ordering = ("name",)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            student_total=Count("students", distinct=True),
            teacher_total=Count("teachers", distinct=True),
            exam_total=Count("exams", distinct=True),
        )

    @admin.display(ordering="student_total", description="Students")
    def student_count(self, obj):
        return obj.student_total

    @admin.display(ordering="teacher_total", description="Teachers")
    def teacher_count(self, obj):
        return obj.teacher_total

    @admin.display(ordering="exam_total", description="Exams")
    def exam_count(self, obj):
        return obj.exam_total
