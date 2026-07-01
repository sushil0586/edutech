from django.contrib import admin
from django.db.models import Count

from apps.institutes.models import (
    Institute,
    InstituteOnboardingProfile,
    InstituteOnboardingRun,
    InstituteOnboardingTaskRun,
)
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


@admin.register(InstituteOnboardingProfile)
class InstituteOnboardingProfileAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("config_json",)
    config_json_preview = build_json_preview("config_json", "Config")
    list_display = (
        "name",
        "code",
        "category",
        "is_default",
        "sort_order",
        "is_active",
    )
    list_filter = ("category", "is_default", "is_active")
    search_fields = ("name", "code", "description", "category")
    ordering = ("sort_order", "name")


class InstituteOnboardingTaskRunInline(admin.TabularInline):
    model = InstituteOnboardingTaskRun
    extra = 0
    can_delete = False
    fields = (
        "task_code",
        "label",
        "status",
        "message",
        "started_at",
        "completed_at",
    )
    readonly_fields = fields
    show_change_link = True


@admin.register(InstituteOnboardingRun)
class InstituteOnboardingRunAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("requested_config_json", "resolved_config_json")
    requested_config_json_preview = build_json_preview("requested_config_json", "Requested config")
    resolved_config_json_preview = build_json_preview("resolved_config_json", "Resolved config")
    list_display = (
        "institute",
        "profile_code",
        "source",
        "status",
        "initiated_by_user_id",
        "started_at",
        "completed_at",
        "is_active",
    )
    list_filter = ("status", "source", "profile_code", "is_active")
    search_fields = (
        "institute__name",
        "institute__code",
        "profile_code",
        "source",
        "error_summary",
    )
    ordering = ("-created_at",)
    inlines = (InstituteOnboardingTaskRunInline,)


@admin.register(InstituteOnboardingTaskRun)
class InstituteOnboardingTaskRunAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("result_json",)
    result_json_preview = build_json_preview("result_json", "Result")
    list_display = (
        "run",
        "task_code",
        "label",
        "status",
        "started_at",
        "completed_at",
        "is_active",
    )
    list_filter = ("status", "task_code", "is_active")
    search_fields = ("run__institute__name", "run__institute__code", "task_code", "label", "message")
    ordering = ("-created_at",)
