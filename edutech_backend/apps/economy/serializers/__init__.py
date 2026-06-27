from django.db import transaction
from rest_framework import serializers
from apps.reports.models import AuditLog

from apps.economy.models import (
    ContentAccessPolicy,
    EconomyOperatorPolicyConfig,
    PaymentOrder,
    PaymentTransaction,
    ReferralProgram,
    RewardRule,
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
    UnlockRule,
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


class EconomyOperatorPolicyConfigSerializer(serializers.ModelSerializer):
    latest_audit = serializers.SerializerMethodField()

    class Meta:
        model = EconomyOperatorPolicyConfig
        fields = (
            "id",
            "singleton_key",
            "institute_admin_can_confirm_orders",
            "institute_admin_max_confirm_order_amount",
            "institute_admin_confirm_order_currency",
            "institute_admin_can_grant_stars",
            "institute_admin_max_grant_stars",
            "latest_audit",
            "created_at",
            "updated_at",
            "is_active",
        )
        read_only_fields = (
            "id",
            "singleton_key",
            "created_at",
            "updated_at",
            "is_active",
        )

    def get_latest_audit(self, obj):
        audit = (
            AuditLog.objects.filter(
                entity_type="economy_operator_policy_config",
                entity_id=str(obj.id),
                is_active=True,
            )
            .select_related("user")
            .order_by("-created_at")
            .first()
        )
        if audit is None:
            return None
        user_label = None
        if audit.user_id:
            full_name = audit.user.get_full_name().strip()
            user_label = full_name or audit.user.username
        return {
            "id": str(audit.id),
            "action": audit.action,
            "message": audit.message,
            "user": audit.user_id,
            "user_label": user_label,
            "created_at": audit.created_at,
            "metadata": audit.metadata,
        }


class EconomyPolicyAuditLogSerializer(serializers.ModelSerializer):
    user_label = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "user",
            "user_label",
            "action",
            "entity_type",
            "entity_id",
            "message",
            "metadata",
            "created_at",
        )
        read_only_fields = fields

    def get_user_label(self, obj):
        if not obj.user_id:
            return None
        full_name = obj.user.get_full_name().strip()
        return full_name or obj.user.username


class EconomyCatalogItemStatusUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()


class AdminStarPackSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)

    class Meta:
        model = StarPack
        fields = (
            "id",
            "institute",
            "institute_name",
            "name",
            "code",
            "stars_credited",
            "price_amount",
            "currency",
            "sort_order",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
        )


class AdminSubscriptionStarCreditRuleSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

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


class AdminSubscriptionPlanCycleSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    star_credit_rules = AdminSubscriptionStarCreditRuleSerializer(many=True, required=False)

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


class AdminSubscriptionPlanSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    cycles = AdminSubscriptionPlanCycleSerializer(many=True, required=False)

    class Meta:
        model = SubscriptionPlan
        fields = (
            "id",
            "institute",
            "institute_name",
            "name",
            "code",
            "description",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
            "cycles",
        )

    def validate_cycles(self, value):
        if not value:
            raise serializers.ValidationError("At least one subscription cycle is required.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        cycles_data = validated_data.pop("cycles", [])
        plan = SubscriptionPlan.objects.create(**validated_data)
        self._sync_cycles(plan=plan, cycles_data=cycles_data)
        return plan

    @transaction.atomic
    def update(self, instance, validated_data):
        cycles_data = validated_data.pop("cycles", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if cycles_data is not None:
            self._sync_cycles(plan=instance, cycles_data=cycles_data)
        return instance

    def _sync_cycles(self, *, plan, cycles_data):
        existing_cycles = {
            str(cycle.id): cycle
            for cycle in plan.cycles.all().prefetch_related("star_credit_rules")
        }

        for cycle_data in cycles_data:
            rules_data = cycle_data.pop("star_credit_rules", [])
            cycle_id = str(cycle_data.pop("id", "") or "")
            if cycle_id and cycle_id in existing_cycles:
                cycle = existing_cycles[cycle_id]
                for attr, value in cycle_data.items():
                    setattr(cycle, attr, value)
                cycle.save()
            else:
                cycle = SubscriptionPlanCycle.objects.create(
                    institute=plan.institute,
                    plan=plan,
                    **cycle_data,
                )

            existing_rules = {
                str(rule.id): rule
                for rule in cycle.star_credit_rules.all()
            }
            for rule_data in rules_data:
                rule_id = str(rule_data.pop("id", "") or "")
                if rule_id and rule_id in existing_rules:
                    rule = existing_rules[rule_id]
                    for attr, value in rule_data.items():
                        setattr(rule, attr, value)
                    rule.save()
                else:
                    SubscriptionStarCreditRule.objects.create(
                        institute=plan.institute,
                        plan_cycle=cycle,
                        **rule_data,
                    )


class AdminReferralProgramSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)

    class Meta:
        model = ReferralProgram
        fields = (
            "id",
            "institute",
            "institute_name",
            "name",
            "referrer_stars",
            "referee_stars",
            "reward_side",
            "valid_from",
            "valid_until",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
        )


class AdminRewardRuleSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = RewardRule
        fields = (
            "id",
            "institute",
            "institute_name",
            "subject",
            "subject_name",
            "name",
            "rule_type",
            "stars_awarded",
            "score_threshold_percentage",
            "completion_count_threshold",
            "streak_count_threshold",
            "priority",
            "valid_from",
            "valid_until",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
        )


class AdminContentAccessPolicySerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = ContentAccessPolicy
        fields = (
            "id",
            "institute",
            "institute_name",
            "subject",
            "subject_name",
            "content_type",
            "content_key",
            "content_label",
            "policy_type",
            "star_cost",
            "entitlement_code",
            "priority",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
        )


class AdminUnlockRuleSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = UnlockRule
        fields = (
            "id",
            "institute",
            "institute_name",
            "subject",
            "subject_name",
            "content_type",
            "content_key",
            "content_label",
            "rule_type",
            "required_star_balance",
            "required_entitlement_code",
            "required_completion_count",
            "required_score_percentage",
            "admin_override_allowed",
            "priority",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
        )


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
