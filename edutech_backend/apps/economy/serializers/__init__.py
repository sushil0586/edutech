from rest_framework import serializers

from apps.economy.models import (
    PaymentOrder,
    PaymentTransaction,
    StudentRewardEvent,
    StarLedger,
    StarPack,
    StudentEconomyProfile,
    StudentSubscription,
    StudentUnlockState,
    SubscriptionBillingEvent,
    SubscriptionPlan,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
)


class StudentEconomyProfileSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_admission_no = serializers.CharField(source="student.admission_no", read_only=True)

    class Meta:
        model = StudentEconomyProfile
        fields = (
            "id",
            "institute",
            "student",
            "student_name",
            "student_admission_no",
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
            "is_active",
        )


class StarLedgerSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    created_by_label = serializers.SerializerMethodField()

    class Meta:
        model = StarLedger
        fields = (
            "id",
            "institute",
            "student",
            "student_name",
            "direction",
            "source_type",
            "source_id",
            "source_reference",
            "reason",
            "stars_delta",
            "balance_after",
            "balance_source",
            "created_by",
            "created_by_label",
            "effective_at",
            "metadata",
            "created_at",
            "updated_at",
            "is_active",
        )

    def get_created_by_label(self, obj):
        if not obj.created_by:
            return None
        full_name = obj.created_by.get_full_name().strip()
        return full_name or obj.created_by.username


class StudentRewardEventSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    reward_rule_name = serializers.CharField(source="reward_rule.name", read_only=True)
    reward_rule_type = serializers.CharField(source="reward_rule.rule_type", read_only=True)
    ledger_entry = StarLedgerSerializer(read_only=True)

    class Meta:
        model = StudentRewardEvent
        fields = (
            "id",
            "institute",
            "student",
            "student_name",
            "reward_rule",
            "reward_rule_name",
            "reward_rule_type",
            "ledger_entry",
            "event_key",
            "event_reference",
            "awarded_stars",
            "processed_at",
            "metadata",
            "created_at",
            "updated_at",
            "is_active",
        )


class StudentUnlockStateSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    granted_by_label = serializers.SerializerMethodField()

    class Meta:
        model = StudentUnlockState
        fields = (
            "id",
            "institute",
            "student",
            "student_name",
            "subject",
            "subject_name",
            "content_type",
            "content_key",
            "content_label",
            "status",
            "lock_reason_code",
            "lock_reason_message",
            "unlocked_at",
            "locked_at",
            "last_evaluated_at",
            "granted_by",
            "granted_by_label",
            "metadata",
            "created_at",
            "updated_at",
            "is_active",
        )

    def get_granted_by_label(self, obj):
        if not obj.granted_by:
            return None
        full_name = obj.granted_by.get_full_name().strip()
        return full_name or obj.granted_by.username


class AdminGrantStarsSerializer(serializers.Serializer):
    student = serializers.UUIDField()
    stars = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=255)
    source_reference = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class StarPackSerializer(serializers.ModelSerializer):
    class Meta:
        model = StarPack
        fields = (
            "id",
            "institute",
            "name",
            "code",
            "stars_credited",
            "price_amount",
            "currency",
            "sort_order",
            "metadata",
            "is_active",
        )


class SubscriptionStarCreditRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionStarCreditRule
        fields = (
            "id",
            "stars_credited",
            "credit_on_activation",
            "credit_on_renewal",
            "metadata",
            "is_active",
        )


class SubscriptionPlanCycleSerializer(serializers.ModelSerializer):
    star_credit_rules = SubscriptionStarCreditRuleSerializer(many=True, read_only=True)

    class Meta:
        model = SubscriptionPlanCycle
        fields = (
            "id",
            "billing_interval",
            "interval_count",
            "price_amount",
            "currency",
            "metadata",
            "is_active",
            "star_credit_rules",
        )


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    cycles = SubscriptionPlanCycleSerializer(many=True, read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = (
            "id",
            "institute",
            "name",
            "code",
            "description",
            "metadata",
            "is_active",
            "cycles",
        )


class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = (
            "id",
            "status",
            "provider_name",
            "provider_transaction_reference",
            "amount",
            "currency",
            "ledger_entry",
            "processed_at",
            "metadata",
            "created_at",
            "updated_at",
            "is_active",
        )


class PaymentOrderSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    star_pack_name = serializers.CharField(source="star_pack.name", read_only=True)
    subscription_plan_name = serializers.CharField(
        source="subscription_plan_cycle.plan.name",
        read_only=True,
    )
    subscription_cycle_label = serializers.SerializerMethodField()
    transactions = PaymentTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = PaymentOrder
        fields = (
            "id",
            "institute",
            "student",
            "student_name",
            "star_pack",
            "star_pack_name",
            "subscription_plan_cycle",
            "subscription_plan_name",
            "subscription_cycle_label",
            "order_type",
            "status",
            "amount",
            "currency",
            "provider_name",
            "provider_order_reference",
            "metadata",
            "transactions",
            "created_at",
            "updated_at",
            "is_active",
        )

    def get_subscription_cycle_label(self, obj):
        cycle = obj.subscription_plan_cycle
        if cycle is None:
            return ""
        return f"{cycle.billing_interval}:{cycle.interval_count}"


class SubscriptionBillingEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionBillingEvent
        fields = (
            "id",
            "payment_transaction",
            "ledger_entry",
            "event_type",
            "amount",
            "currency",
            "event_at",
            "metadata",
            "created_at",
            "updated_at",
            "is_active",
        )


class StudentSubscriptionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    plan_name = serializers.CharField(source="plan_cycle.plan.name", read_only=True)
    billing_interval = serializers.CharField(source="plan_cycle.billing_interval", read_only=True)
    interval_count = serializers.IntegerField(source="plan_cycle.interval_count", read_only=True)
    billing_events = SubscriptionBillingEventSerializer(many=True, read_only=True)

    class Meta:
        model = StudentSubscription
        fields = (
            "id",
            "institute",
            "student",
            "student_name",
            "plan_cycle",
            "plan_name",
            "billing_interval",
            "interval_count",
            "status",
            "activated_at",
            "current_period_start",
            "current_period_end",
            "cancelled_at",
            "metadata",
            "billing_events",
            "created_at",
            "updated_at",
            "is_active",
        )


class SpendStarsForContentSerializer(serializers.Serializer):
    content_type = serializers.CharField(max_length=50)
    content_key = serializers.CharField(max_length=100)
    subject = serializers.UUIDField(required=False, allow_null=True)


class CreateStarPackOrderSerializer(serializers.Serializer):
    star_pack = serializers.UUIDField()
    provider_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default="manual")
    provider_order_reference = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default="",
    )
    metadata = serializers.JSONField(required=False)


class CreateSubscriptionOrderSerializer(serializers.Serializer):
    subscription_plan_cycle = serializers.UUIDField()
    provider_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default="manual")
    provider_order_reference = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default="",
    )
    metadata = serializers.JSONField(required=False)


class ConfirmPaymentOrderSerializer(serializers.Serializer):
    provider_transaction_reference = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default="",
    )
    metadata = serializers.JSONField(required=False)
