from django.contrib import admin

from apps.accounts.models import AccountAcquisition, AccountLocation, AccountProfile
from common.admin import JsonPreviewAdminMixin, RichModelAdmin, RichTabularInline, build_json_preview


class AccountLocationInline(RichTabularInline):
    model = AccountLocation
    fields = (
        "confirmed_country",
        "confirmed_state",
        "confirmed_city",
        "confirmed_pincode",
        "detection_source",
        "confirmed_at",
        "is_active",
    )


class AccountAcquisitionInline(RichTabularInline):
    model = AccountAcquisition
    fields = (
        "signup_source",
        "platform",
        "device_category",
        "referral_channel",
        "invite_code",
        "school_normalization_status",
        "is_active",
    )


@admin.register(AccountProfile)
class AccountProfileAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("registration_context",)
    registration_context_preview = build_json_preview("registration_context", "Registration context")
    list_display = (
        "user",
        "email",
        "role",
        "institute",
        "onboarding_status",
        "profile_completion_required",
        "student_profile",
        "teacher_profile",
        "parent_profile_link",
        "is_active",
    )
    list_filter = ("role", "institute", "onboarding_status", "profile_completion_required", "is_active")
    search_fields = ("user__username", "user__email", "onboarding_version")
    ordering = ("user__username",)
    autocomplete_fields = ("user", "institute", "student_profile", "teacher_profile")
    inlines = (AccountLocationInline, AccountAcquisitionInline)

    @admin.display(ordering="user__email", description="Email")
    def email(self, obj):
        return obj.user.email

    @admin.display(description="Parent profile")
    def parent_profile_link(self, obj):
        return getattr(obj, "parent_profile", None)


@admin.register(AccountLocation)
class AccountLocationAdmin(RichModelAdmin):
    list_display = (
        "account_profile",
        "confirmed_country",
        "confirmed_state",
        "confirmed_city",
        "confirmed_pincode",
        "detected_country",
        "detection_source",
        "confirmed_at",
        "is_active",
    )
    list_filter = ("confirmed_country", "confirmed_state", "detection_source", "is_active")
    search_fields = (
        "account_profile__user__username",
        "account_profile__user__email",
        "confirmed_city",
        "confirmed_pincode",
        "detected_city",
    )
    ordering = ("account_profile__user__username",)
    autocomplete_fields = ("account_profile",)


@admin.register(AccountAcquisition)
class AccountAcquisitionAdmin(JsonPreviewAdminMixin, RichModelAdmin):
    json_preview_fields = ("metadata",)
    metadata_preview = build_json_preview("metadata", "Metadata")
    list_display = (
        "account_profile",
        "signup_source",
        "landing_variant",
        "platform",
        "device_category",
        "browser_family",
        "referral_channel",
        "invite_code",
        "school_normalization_status",
        "is_active",
    )
    list_filter = (
        "signup_source",
        "platform",
        "device_category",
        "referral_channel",
        "school_normalization_status",
        "is_active",
    )
    search_fields = (
        "account_profile__user__username",
        "account_profile__user__email",
        "invite_code",
        "referral_identifier",
        "school_name_text",
        "utm_source",
        "utm_campaign",
    )
    ordering = ("account_profile__user__username",)
    autocomplete_fields = ("account_profile",)
