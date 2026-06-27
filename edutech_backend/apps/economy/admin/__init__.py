from django.contrib import admin

from apps.economy.models import (
    ContentAccessPolicy,
    EconomyOperatorPolicyConfig,
    PaymentOrder,
    PaymentTransaction,
    ReferralCode,
    ReferralEvent,
    ReferralProgram,
    RewardRule,
    StarLedger,
    StarPack,
    StudentEconomyProfile,
    StudentEntitlement,
    StudentRewardEvent,
    StudentSubscription,
    StudentUnlockState,
    SubscriptionBillingEvent,
    SubscriptionPlan,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
    UnlockRule,
)
from common.admin import RichModelAdmin, RichTabularInline


class SubscriptionStarCreditRuleInline(RichTabularInline):
    model = SubscriptionStarCreditRule
    fields = (
        "stars_credited",
        "credit_on_activation",
        "credit_on_renewal",
        "metadata",
        "is_active",
    )


class SubscriptionPlanCycleInline(RichTabularInline):
    model = SubscriptionPlanCycle
    fields = (
        "billing_interval",
        "interval_count",
        "price_amount",
        "currency",
        "metadata",
        "is_active",
    )


@admin.register(EconomyOperatorPolicyConfig)
class EconomyOperatorPolicyConfigAdmin(RichModelAdmin):
    list_display = (
        "singleton_key",
        "institute_admin_can_confirm_orders",
        "institute_admin_max_confirm_order_amount",
        "institute_admin_can_grant_stars",
        "institute_admin_max_grant_stars",
        "is_active",
    )
    readonly_fields = ("singleton_key", "created_at", "updated_at")
@admin.register(StudentEconomyProfile)
class StudentEconomyProfileAdmin(RichModelAdmin):
    list_display = (
        "student",
        "institute",
        "available_stars",
        "lifetime_earned_stars",
        "lifetime_spent_stars",
        "paid_credited_stars",
        "subscription_credited_stars",
        "is_active",
    )
    list_filter = ("institute", "is_active")
    search_fields = ("student__full_name", "student__admission_no", "student__email")
    readonly_fields = (
        "available_stars",
        "lifetime_earned_stars",
        "lifetime_spent_stars",
        "admin_granted_stars",
        "paid_credited_stars",
        "subscription_credited_stars",
        "reserved_stars",
        "last_ledger_entry_at",
        "created_at",
        "updated_at",
    )


@admin.register(StarLedger)
class StarLedgerAdmin(RichModelAdmin):
    list_display = (
        "student",
        "source_type",
        "direction",
        "stars_delta",
        "balance_after",
        "balance_source",
        "effective_at",
    )
    list_filter = ("institute", "source_type", "direction", "balance_source", "is_active")
    search_fields = (
        "student__full_name",
        "student__admission_no",
        "reason",
        "source_id",
        "source_reference",
    )
    readonly_fields = (
        "institute",
        "student",
        "economy_profile",
        "direction",
        "source_type",
        "source_id",
        "source_reference",
        "reason",
        "stars_delta",
        "balance_after",
        "balance_source",
        "created_by",
        "effective_at",
        "metadata",
        "created_at",
        "updated_at",
    )
    ordering = ("-effective_at", "-created_at")


@admin.register(RewardRule)
class RewardRuleAdmin(RichModelAdmin):
    list_display = (
        "name",
        "institute",
        "subject",
        "rule_type",
        "stars_awarded",
        "priority",
        "is_active",
    )
    list_filter = ("institute", "rule_type", "is_active")
    search_fields = ("name", "subject__name")


@admin.register(StudentRewardEvent)
class StudentRewardEventAdmin(RichModelAdmin):
    list_display = (
        "student",
        "reward_rule",
        "awarded_stars",
        "event_key",
        "processed_at",
        "is_active",
    )
    list_filter = ("institute", "reward_rule__rule_type", "is_active")
    search_fields = ("student__full_name", "event_key", "event_reference")
    readonly_fields = ("processed_at", "created_at", "updated_at")


@admin.register(ReferralProgram)
class ReferralProgramAdmin(RichModelAdmin):
    list_display = (
        "name",
        "institute",
        "reward_side",
        "referrer_stars",
        "referee_stars",
        "is_active",
    )
    list_filter = ("institute", "reward_side", "is_active")
    search_fields = ("name",)


@admin.register(ReferralCode)
class ReferralCodeAdmin(RichModelAdmin):
    list_display = (
        "code",
        "program",
        "owner_student",
        "usage_limit",
        "used_count",
        "is_active",
    )
    list_filter = ("institute", "program", "is_active")
    search_fields = ("code", "owner_student__full_name", "owner_student__admission_no")


@admin.register(ReferralEvent)
class ReferralEventAdmin(RichModelAdmin):
    list_display = (
        "program",
        "referrer_student",
        "referee_student",
        "created_at",
        "is_active",
    )
    list_filter = ("institute", "program", "is_active")
    search_fields = (
        "referrer_student__full_name",
        "referee_student__full_name",
        "referral_code__code",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(StarPack)
class StarPackAdmin(RichModelAdmin):
    list_display = (
        "name",
        "code",
        "institute",
        "stars_credited",
        "price_amount",
        "currency",
        "sort_order",
        "is_active",
    )
    list_filter = ("institute", "currency", "is_active")
    search_fields = ("name", "code")
    ordering = ("sort_order", "price_amount", "name")


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(RichModelAdmin):
    list_display = ("name", "code", "institute", "is_active")
    list_filter = ("institute", "is_active")
    search_fields = ("name", "code", "description")
    inlines = [SubscriptionPlanCycleInline]


@admin.register(SubscriptionPlanCycle)
class SubscriptionPlanCycleAdmin(RichModelAdmin):
    list_display = (
        "plan",
        "billing_interval",
        "interval_count",
        "price_amount",
        "currency",
        "is_active",
    )
    list_filter = ("institute", "billing_interval", "currency", "is_active")
    search_fields = ("plan__name", "plan__code")
    inlines = [SubscriptionStarCreditRuleInline]


@admin.register(SubscriptionStarCreditRule)
class SubscriptionStarCreditRuleAdmin(RichModelAdmin):
    list_display = (
        "plan_cycle",
        "stars_credited",
        "credit_on_activation",
        "credit_on_renewal",
        "is_active",
    )
    list_filter = (
        "institute",
        "credit_on_activation",
        "credit_on_renewal",
        "is_active",
    )
    search_fields = ("plan_cycle__plan__name", "plan_cycle__plan__code")


@admin.register(PaymentOrder)
class PaymentOrderAdmin(RichModelAdmin):
    list_display = (
        "student",
        "order_type",
        "status",
        "amount",
        "currency",
        "provider_name",
        "provider_order_reference",
        "created_at",
    )
    list_filter = ("institute", "order_type", "status", "currency", "provider_name", "is_active")
    search_fields = (
        "student__full_name",
        "student__admission_no",
        "provider_order_reference",
        "star_pack__name",
        "subscription_plan_cycle__plan__name",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(RichModelAdmin):
    list_display = (
        "payment_order",
        "status",
        "provider_name",
        "provider_transaction_reference",
        "amount",
        "currency",
        "processed_at",
        "is_active",
    )
    list_filter = ("institute", "status", "currency", "provider_name", "is_active")
    search_fields = ("provider_transaction_reference", "payment_order__provider_order_reference")
    readonly_fields = ("created_at", "updated_at")


@admin.register(StudentSubscription)
class StudentSubscriptionAdmin(RichModelAdmin):
    list_display = (
        "student",
        "plan_cycle",
        "status",
        "activated_at",
        "current_period_start",
        "current_period_end",
        "is_active",
    )
    list_filter = ("institute", "status", "is_active")
    search_fields = (
        "student__full_name",
        "student__admission_no",
        "plan_cycle__plan__name",
        "plan_cycle__plan__code",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(SubscriptionBillingEvent)
class SubscriptionBillingEventAdmin(RichModelAdmin):
    list_display = (
        "student_subscription",
        "event_type",
        "amount",
        "currency",
        "event_at",
        "is_active",
    )
    list_filter = ("institute", "event_type", "currency", "is_active")
    search_fields = (
        "student_subscription__student__full_name",
        "student_subscription__plan_cycle__plan__name",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(ContentAccessPolicy)
class ContentAccessPolicyAdmin(RichModelAdmin):
    list_display = (
        "content_type",
        "content_key",
        "subject",
        "policy_type",
        "star_cost",
        "entitlement_code",
        "priority",
        "is_active",
    )
    list_filter = ("institute", "policy_type", "subject", "is_active")
    search_fields = ("content_type", "content_key", "content_label", "entitlement_code")


@admin.register(UnlockRule)
class UnlockRuleAdmin(RichModelAdmin):
    list_display = (
        "content_type",
        "content_key",
        "subject",
        "rule_type",
        "priority",
        "admin_override_allowed",
        "is_active",
    )
    list_filter = ("institute", "rule_type", "subject", "admin_override_allowed", "is_active")
    search_fields = ("content_type", "content_key", "content_label", "required_entitlement_code")


@admin.register(StudentUnlockState)
class StudentUnlockStateAdmin(RichModelAdmin):
    list_display = (
        "student",
        "content_type",
        "content_key",
        "status",
        "lock_reason_code",
        "last_evaluated_at",
        "is_active",
    )
    list_filter = ("institute", "status", "subject", "is_active")
    search_fields = (
        "student__full_name",
        "student__admission_no",
        "content_type",
        "content_key",
        "content_label",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(StudentEntitlement)
class StudentEntitlementAdmin(RichModelAdmin):
    list_display = (
        "student",
        "entitlement_code",
        "content_type",
        "content_key",
        "status",
        "valid_from",
        "valid_until",
        "is_active",
    )
    list_filter = ("institute", "status", "subject", "is_active")
    search_fields = (
        "student__full_name",
        "student__admission_no",
        "entitlement_code",
        "content_type",
        "content_key",
    )
    readonly_fields = ("created_at", "updated_at")
