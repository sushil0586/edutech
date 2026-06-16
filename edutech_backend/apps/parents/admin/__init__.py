from django.contrib import admin
from django.db.models import Count

from apps.parents.models import ParentAlert, ParentChildRelationship, ParentProfile
from common.admin import JsonPreviewAdminMixin, RichModelAdmin, RichTabularInline, build_json_preview


class ParentChildRelationshipInline(RichTabularInline):
    model = ParentChildRelationship
    autocomplete_fields = ("student", "linked_by", "approved_by", "revoked_by")
    fields = (
        "student",
        "relationship_type",
        "status",
        "is_primary_contact",
        "can_view_progress",
        "can_view_results",
        "can_receive_alerts",
        "is_active",
    )


@admin.register(ParentProfile)
class ParentProfileAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("notification_preferences", "metadata")
    notification_preferences_preview = build_json_preview("notification_preferences", "Notification preferences")
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "full_name",
        "institute",
        "email",
        "phone",
        "preferred_language",
        "child_count",
        "alert_count",
        "is_active",
    )
    search_fields = ("full_name", "email", "phone", "account_profile__user__username")
    list_filter = ("institute", "preferred_language", "is_active")
    autocomplete_fields = ("institute", "account_profile")
    inlines = (ParentChildRelationshipInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            relationship_total=Count("relationships", distinct=True),
            alert_total=Count("alerts", distinct=True),
        )

    @admin.display(ordering="relationship_total", description="Children")
    def child_count(self, obj):
        return obj.relationship_total

    @admin.display(ordering="alert_total", description="Alerts")
    def alert_count(self, obj):
        return obj.alert_total


@admin.register(ParentChildRelationship)
class ParentChildRelationshipAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "parent_profile",
        "student",
        "relationship_type",
        "status",
        "is_primary_contact",
        "can_receive_alerts",
        "linked_at",
        "approved_at",
        "is_active",
    )
    search_fields = (
        "parent_profile__full_name",
        "student__full_name",
        "student__admission_no",
    )
    list_filter = ("institute", "relationship_type", "status", "is_primary_contact", "is_active")
    autocomplete_fields = ("institute", "parent_profile", "student", "linked_by", "approved_by", "revoked_by")


@admin.register(ParentAlert)
class ParentAlertAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "parent_profile",
        "student",
        "alert_type",
        "severity",
        "status",
        "source_type",
        "created_at",
    )
    search_fields = ("parent_profile__full_name", "student__full_name", "title", "message", "source_reference")
    list_filter = ("institute", "alert_type", "severity", "status", "is_active")
    autocomplete_fields = ("institute", "parent_profile", "student", "relationship")
    date_hierarchy = "created_at"
