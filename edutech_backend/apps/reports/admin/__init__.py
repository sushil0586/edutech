from django.contrib import admin

from apps.reports.models import AuditLog, InAppNotification
from common.admin import JsonPreviewAdminMixin, ReadOnlyAdmin, RichModelAdmin, build_json_preview


@admin.register(InAppNotification)
class InAppNotificationAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "title",
        "notification_type",
        "recipient_user",
        "institute",
        "is_read",
        "read_at",
        "created_at",
    )
    list_filter = ("notification_type", "is_read", "is_active", "institute")
    search_fields = (
        "title",
        "message",
        "recipient_user__username",
        "recipient_user__email",
        "related_object_id",
    )
    ordering = ("-created_at",)
    autocomplete_fields = ("institute", "recipient_user")
    readonly_fields = ("read_at",)


@admin.register(AuditLog)
class AuditLogAdmin(JsonPreviewAdminMixin, ReadOnlyAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "action",
        "entity_type",
        "entity_id",
        "user",
        "institute",
        "ip_address",
        "created_at",
    )
    list_filter = ("action", "entity_type", "institute")
    search_fields = (
        "action",
        "entity_type",
        "entity_id",
        "message",
        "user__username",
        "user__email",
    )
    ordering = ("-created_at",)
    autocomplete_fields = ("institute", "user")
