from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.academics.models import Subject
from apps.institutes.models import Institute
from apps.students.models import StudentProfile
from common.models import BaseModel


class EconomyBalanceSource(models.TextChoices):
    EARNED = "earned", "Earned"
    ADMIN_GRANTED = "admin_granted", "Admin Granted"
    PAID = "paid", "Paid"
    SUBSCRIPTION = "subscription", "Subscription"
    ADJUSTMENT = "adjustment", "Adjustment"


class LedgerEntryDirection(models.TextChoices):
    CREDIT = "credit", "Credit"
    DEBIT = "debit", "Debit"


class LedgerEntrySourceType(models.TextChoices):
    SIGNUP_BONUS = "signup_bonus", "Signup Bonus"
    REFERRAL_BONUS = "referral_bonus", "Referral Bonus"
    ADMIN_GRANT = "admin_grant", "Admin Grant"
    EXAM_REWARD = "exam_reward", "Exam Reward"
    PURCHASE = "purchase", "Purchase"
    SUBSCRIPTION = "subscription", "Subscription"
    CONTENT_SPEND = "content_spend", "Content Spend"
    REFUND = "refund", "Refund"
    ADJUSTMENT = "adjustment", "Adjustment"
    EXPIRY = "expiry", "Expiry"


class RewardRuleType(models.TextChoices):
    SIGNUP = "signup", "Signup"
    REFERRAL = "referral", "Referral"
    EXAM_COMPLETION = "exam_completion", "Exam Completion"
    SCORE_THRESHOLD = "score_threshold", "Score Threshold"
    STREAK = "streak", "Streak"
    TOPIC_MASTERY = "topic_mastery", "Topic Mastery"
    ADMIN_CAMPAIGN = "admin_campaign", "Admin Campaign"


class ReferralRewardSide(models.TextChoices):
    REFERRER = "referrer", "Referrer"
    REFEREE = "referee", "Referee"
    BOTH = "both", "Both"


class PaymentOrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


class PaymentTransactionStatus(models.TextChoices):
    INITIATED = "initiated", "Initiated"
    AUTHORIZED = "authorized", "Authorized"
    CAPTURED = "captured", "Captured"
    FAILED = "failed", "Failed"
    VOIDED = "voided", "Voided"
    REFUNDED = "refunded", "Refunded"


class BillingInterval(models.TextChoices):
    MONTHLY = "monthly", "Monthly"
    QUARTERLY = "quarterly", "Quarterly"
    YEARLY = "yearly", "Yearly"
    CUSTOM = "custom", "Custom"


class StudentSubscriptionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    PAST_DUE = "past_due", "Past Due"
    PAUSED = "paused", "Paused"
    CANCELLED = "cancelled", "Cancelled"
    EXPIRED = "expired", "Expired"


class AccessPolicyType(models.TextChoices):
    FREE = "free", "Free"
    STARS_ONLY = "stars_only", "Stars Only"
    ENTITLEMENT_ONLY = "entitlement_only", "Entitlement Only"
    STARS_OR_ENTITLEMENT = "stars_or_entitlement", "Stars Or Entitlement"


class UnlockRuleType(models.TextChoices):
    STARS_BALANCE = "stars_balance", "Stars Balance"
    ENTITLEMENT = "entitlement", "Entitlement"
    EXAM_COMPLETION = "exam_completion", "Exam Completion"
    SCORE_THRESHOLD = "score_threshold", "Score Threshold"
    ADMIN_APPROVAL = "admin_approval", "Admin Approval"
    COMPOSITE = "composite", "Composite"


class UnlockStateStatus(models.TextChoices):
    LOCKED = "locked", "Locked"
    UNLOCKED = "unlocked", "Unlocked"
    HIDDEN = "hidden", "Hidden"
    CONSUMED = "consumed", "Consumed"


class EntitlementStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    EXPIRED = "expired", "Expired"
    REVOKED = "revoked", "Revoked"
    CONSUMED = "consumed", "Consumed"


class ContentTargetMixin(models.Model):
    subject = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        related_name="%(class)s_targets",
        blank=True,
        null=True,
    )
    content_type = models.CharField(max_length=50)
    content_key = models.CharField(max_length=100)
    content_label = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["content_type", "content_key"]),
        ]


class StudentEconomyProfile(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="student_economy_profiles",
    )
    student = models.OneToOneField(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="economy_profile",
    )
    available_stars = models.IntegerField(default=0)
    lifetime_earned_stars = models.PositiveIntegerField(default=0)
    lifetime_spent_stars = models.PositiveIntegerField(default=0)
    admin_granted_stars = models.PositiveIntegerField(default=0)
    paid_credited_stars = models.PositiveIntegerField(default=0)
    subscription_credited_stars = models.PositiveIntegerField(default=0)
    reserved_stars = models.PositiveIntegerField(default=0)
    last_ledger_entry_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["student__full_name"]
        indexes = [
            models.Index(fields=["institute", "student"]),
            models.Index(fields=["available_stars"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.institute_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the selected institute."})
        numeric_fields = [
            "available_stars",
            "lifetime_earned_stars",
            "lifetime_spent_stars",
            "admin_granted_stars",
            "paid_credited_stars",
            "subscription_credited_stars",
            "reserved_stars",
        ]
        for field_name in numeric_fields:
            value = getattr(self, field_name)
            if value < 0:
                raise ValidationError({field_name: "Star values cannot be negative."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.full_name} economy"


class StarLedger(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="star_ledger_entries",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="star_ledger_entries",
    )
    economy_profile = models.ForeignKey(
        StudentEconomyProfile,
        on_delete=models.CASCADE,
        related_name="ledger_entries",
    )
    direction = models.CharField(max_length=20, choices=LedgerEntryDirection.choices)
    source_type = models.CharField(max_length=40, choices=LedgerEntrySourceType.choices)
    source_id = models.CharField(max_length=64, blank=True)
    source_reference = models.CharField(max_length=255, blank=True)
    reason = models.CharField(max_length=255)
    stars_delta = models.IntegerField()
    balance_after = models.IntegerField()
    balance_source = models.CharField(
        max_length=30,
        choices=EconomyBalanceSource.choices,
        default=EconomyBalanceSource.EARNED,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_star_ledger_entries",
        blank=True,
        null=True,
    )
    effective_at = models.DateTimeField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-effective_at", "-created_at"]
        indexes = [
            models.Index(fields=["institute", "student", "effective_at"]),
            models.Index(fields=["economy_profile", "effective_at"]),
            models.Index(fields=["source_type", "source_id"]),
            models.Index(fields=["balance_source"]),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.institute_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the selected institute."})
        if self.economy_profile_id:
            if self.economy_profile.student_id != self.student_id:
                raise ValidationError({"economy_profile": "Economy profile must match the student."})
            if self.economy_profile.institute_id != self.institute_id:
                raise ValidationError({"economy_profile": "Economy profile must match the institute."})
        if self.direction == LedgerEntryDirection.CREDIT and self.stars_delta <= 0:
            raise ValidationError({"stars_delta": "Credit entries must use a positive star delta."})
        if self.direction == LedgerEntryDirection.DEBIT and self.stars_delta >= 0:
            raise ValidationError({"stars_delta": "Debit entries must use a negative star delta."})
        if self.balance_after < 0:
            raise ValidationError({"balance_after": "Balance after entry cannot be negative."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.full_name} {self.source_type} {self.stars_delta}"


class RewardRule(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="reward_rules",
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        related_name="reward_rules",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)
    rule_type = models.CharField(max_length=40, choices=RewardRuleType.choices)
    stars_awarded = models.PositiveIntegerField(default=0)
    score_threshold_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
    )
    completion_count_threshold = models.PositiveIntegerField(blank=True, null=True)
    streak_count_threshold = models.PositiveIntegerField(blank=True, null=True)
    priority = models.PositiveIntegerField(default=100)
    valid_from = models.DateTimeField(blank=True, null=True)
    valid_until = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["priority", "name"]
        indexes = [
            models.Index(fields=["institute", "rule_type"]),
            models.Index(fields=["subject", "rule_type"]),
            models.Index(fields=["valid_from", "valid_until"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.subject_id and self.institute_id and self.subject.institute_id != self.institute_id:
            raise ValidationError({"subject": "Subject must belong to the selected institute."})
        if self.stars_awarded <= 0:
            raise ValidationError({"stars_awarded": "Stars awarded must be greater than zero."})
        if self.score_threshold_percentage is not None:
            if self.score_threshold_percentage < 0 or self.score_threshold_percentage > 100:
                raise ValidationError(
                    {"score_threshold_percentage": "Score threshold must be between 0 and 100."}
                )
        if self.rule_type == RewardRuleType.SCORE_THRESHOLD:
            if self.score_threshold_percentage is None:
                raise ValidationError(
                    {"score_threshold_percentage": "Score threshold reward rules require a percentage."}
                )
        elif self.score_threshold_percentage is not None:
            raise ValidationError(
                {
                    "score_threshold_percentage": (
                        "Score threshold percentage can only be set for score threshold reward rules."
                    )
                }
            )
        if self.valid_from and self.valid_until and self.valid_until <= self.valid_from:
            raise ValidationError({"valid_until": "Valid until must be after valid from."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class StudentRewardEvent(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="student_reward_events",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="reward_events",
    )
    reward_rule = models.ForeignKey(
        RewardRule,
        on_delete=models.CASCADE,
        related_name="reward_events",
    )
    ledger_entry = models.OneToOneField(
        StarLedger,
        on_delete=models.SET_NULL,
        related_name="reward_event",
        blank=True,
        null=True,
    )
    event_key = models.CharField(max_length=150)
    event_reference = models.CharField(max_length=150, blank=True)
    awarded_stars = models.PositiveIntegerField(default=0)
    processed_at = models.DateTimeField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-processed_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "reward_rule", "event_key"],
                name="unique_student_reward_rule_event_key",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "student", "processed_at"]),
            models.Index(fields=["reward_rule", "processed_at"]),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.institute_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the selected institute."})
        if self.reward_rule_id and self.reward_rule.institute_id != self.institute_id:
            raise ValidationError({"reward_rule": "Reward rule must belong to the selected institute."})
        if self.ledger_entry_id and self.ledger_entry.student_id != self.student_id:
            raise ValidationError({"ledger_entry": "Ledger entry must belong to the selected student."})


class ReferralProgram(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="referral_programs",
    )
    name = models.CharField(max_length=255)
    referrer_stars = models.PositiveIntegerField(default=0)
    referee_stars = models.PositiveIntegerField(default=0)
    reward_side = models.CharField(
        max_length=20,
        choices=ReferralRewardSide.choices,
        default=ReferralRewardSide.BOTH,
    )
    valid_from = models.DateTimeField(blank=True, null=True)
    valid_until = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["institute", "valid_from", "valid_until"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.valid_from and self.valid_until and self.valid_until <= self.valid_from:
            raise ValidationError({"valid_until": "Valid until must be after valid from."})


class ReferralCode(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="referral_codes",
    )
    program = models.ForeignKey(
        ReferralProgram,
        on_delete=models.CASCADE,
        related_name="codes",
    )
    owner_student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="referral_codes",
    )
    code = models.CharField(max_length=50)
    usage_limit = models.PositiveIntegerField(blank=True, null=True)
    used_count = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["code"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"],
                name="unique_referral_code_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "owner_student"]),
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.program_id and self.program.institute_id != self.institute_id:
            raise ValidationError({"program": "Referral program must belong to the selected institute."})
        if self.owner_student_id and self.owner_student.institute_id != self.institute_id:
            raise ValidationError({"owner_student": "Student must belong to the selected institute."})


class ReferralEvent(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="referral_events",
    )
    program = models.ForeignKey(
        ReferralProgram,
        on_delete=models.CASCADE,
        related_name="events",
    )
    referral_code = models.ForeignKey(
        ReferralCode,
        on_delete=models.CASCADE,
        related_name="events",
    )
    referrer_student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="referral_events_as_referrer",
    )
    referee_student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="referral_events_as_referee",
    )
    referrer_ledger_entry = models.OneToOneField(
        StarLedger,
        on_delete=models.SET_NULL,
        related_name="referral_event_as_referrer",
        blank=True,
        null=True,
    )
    referee_ledger_entry = models.OneToOneField(
        StarLedger,
        on_delete=models.SET_NULL,
        related_name="referral_event_as_referee",
        blank=True,
        null=True,
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["program", "referee_student"],
                name="unique_referral_program_referee_student",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "referrer_student"]),
            models.Index(fields=["institute", "referee_student"]),
        ]

    def clean(self):
        super().clean()
        for field_name in ["program", "referral_code", "referrer_student", "referee_student"]:
            item = getattr(self, field_name, None)
            if item is not None and getattr(item, "institute_id", self.institute_id) != self.institute_id:
                raise ValidationError({field_name: f"{field_name.replace('_', ' ').title()} must belong to the selected institute."})
        if self.referrer_student_id and self.referrer_student_id == self.referee_student_id:
            raise ValidationError({"referee_student": "Referrer and referee cannot be the same student."})


class StarPack(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="star_packs",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    stars_credited = models.PositiveIntegerField()
    price_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    sort_order = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["sort_order", "price_amount", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"],
                name="unique_star_pack_code_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "sort_order"]),
            models.Index(fields=["price_amount"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.stars_credited <= 0:
            raise ValidationError({"stars_credited": "Stars credited must be greater than zero."})
        if self.price_amount <= Decimal("0.00"):
            raise ValidationError({"price_amount": "Price amount must be greater than zero."})


class SubscriptionPlan(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="subscription_plans",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"],
                name="unique_subscription_plan_code_per_institute",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "code"]),
            models.Index(fields=["is_active"]),
        ]


class SubscriptionPlanCycle(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="subscription_plan_cycles",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name="cycles",
    )
    billing_interval = models.CharField(max_length=20, choices=BillingInterval.choices)
    interval_count = models.PositiveIntegerField(default=1)
    price_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["plan__name", "price_amount"]
        constraints = [
            models.UniqueConstraint(
                fields=["plan", "billing_interval", "interval_count"],
                name="unique_subscription_plan_cycle",
            )
        ]
        indexes = [
            models.Index(fields=["institute", "billing_interval"]),
            models.Index(fields=["price_amount"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.plan_id and self.plan.institute_id != self.institute_id:
            raise ValidationError({"plan": "Plan must belong to the selected institute."})
        if self.interval_count <= 0:
            raise ValidationError({"interval_count": "Interval count must be at least 1."})
        if self.price_amount <= Decimal("0.00"):
            raise ValidationError({"price_amount": "Price amount must be greater than zero."})


class SubscriptionStarCreditRule(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="subscription_star_credit_rules",
    )
    plan_cycle = models.ForeignKey(
        SubscriptionPlanCycle,
        on_delete=models.CASCADE,
        related_name="star_credit_rules",
    )
    stars_credited = models.PositiveIntegerField()
    credit_on_activation = models.BooleanField(default=True)
    credit_on_renewal = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["plan_cycle__plan__name"]
        indexes = [
            models.Index(fields=["institute", "stars_credited"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.plan_cycle_id and self.plan_cycle.institute_id != self.institute_id:
            raise ValidationError({"plan_cycle": "Plan cycle must belong to the selected institute."})
        if self.stars_credited <= 0:
            raise ValidationError({"stars_credited": "Stars credited must be greater than zero."})


class PaymentOrder(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="payment_orders",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="payment_orders",
    )
    star_pack = models.ForeignKey(
        StarPack,
        on_delete=models.SET_NULL,
        related_name="payment_orders",
        blank=True,
        null=True,
    )
    subscription_plan_cycle = models.ForeignKey(
        SubscriptionPlanCycle,
        on_delete=models.SET_NULL,
        related_name="payment_orders",
        blank=True,
        null=True,
    )
    order_type = models.CharField(max_length=30)
    status = models.CharField(max_length=20, choices=PaymentOrderStatus.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    provider_name = models.CharField(max_length=100, blank=True)
    provider_order_reference = models.CharField(max_length=150, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["institute", "student", "status"]),
            models.Index(fields=["provider_name", "provider_order_reference"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the selected institute."})
        if self.star_pack_id and self.star_pack.institute_id != self.institute_id:
            raise ValidationError({"star_pack": "Star pack must belong to the selected institute."})
        if self.subscription_plan_cycle_id and self.subscription_plan_cycle.institute_id != self.institute_id:
            raise ValidationError({"subscription_plan_cycle": "Plan cycle must belong to the selected institute."})
        if bool(self.star_pack_id) == bool(self.subscription_plan_cycle_id):
            raise ValidationError(
                {"order_type": "Payment order must point to exactly one purchasable item."}
            )
        if self.amount <= Decimal("0.00"):
            raise ValidationError({"amount": "Amount must be greater than zero."})


class PaymentTransaction(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="payment_transactions",
    )
    payment_order = models.ForeignKey(
        PaymentOrder,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    status = models.CharField(max_length=20, choices=PaymentTransactionStatus.choices)
    provider_name = models.CharField(max_length=100)
    provider_transaction_reference = models.CharField(max_length=150, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    ledger_entry = models.OneToOneField(
        StarLedger,
        on_delete=models.SET_NULL,
        related_name="payment_transaction",
        blank=True,
        null=True,
    )
    processed_at = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-processed_at", "-created_at"]
        indexes = [
            models.Index(fields=["institute", "status"]),
            models.Index(fields=["provider_name", "provider_transaction_reference"]),
        ]

    def clean(self):
        super().clean()
        if self.payment_order_id and self.payment_order.institute_id != self.institute_id:
            raise ValidationError({"payment_order": "Payment order must belong to the selected institute."})
        if self.amount <= Decimal("0.00"):
            raise ValidationError({"amount": "Amount must be greater than zero."})


class StudentSubscription(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="student_subscriptions",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan_cycle = models.ForeignKey(
        SubscriptionPlanCycle,
        on_delete=models.CASCADE,
        related_name="student_subscriptions",
    )
    status = models.CharField(max_length=20, choices=StudentSubscriptionStatus.choices)
    activated_at = models.DateTimeField(blank=True, null=True)
    current_period_start = models.DateTimeField(blank=True, null=True)
    current_period_end = models.DateTimeField(blank=True, null=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["institute", "student", "status"]),
            models.Index(fields=["current_period_start", "current_period_end"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the selected institute."})
        if self.plan_cycle_id and self.plan_cycle.institute_id != self.institute_id:
            raise ValidationError({"plan_cycle": "Plan cycle must belong to the selected institute."})
        if (
            self.current_period_start
            and self.current_period_end
            and self.current_period_end <= self.current_period_start
        ):
            raise ValidationError(
                {"current_period_end": "Current period end must be after current period start."}
            )


class SubscriptionBillingEvent(BaseModel):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="subscription_billing_events",
    )
    student_subscription = models.ForeignKey(
        StudentSubscription,
        on_delete=models.CASCADE,
        related_name="billing_events",
    )
    payment_transaction = models.ForeignKey(
        PaymentTransaction,
        on_delete=models.SET_NULL,
        related_name="subscription_billing_events",
        blank=True,
        null=True,
    )
    ledger_entry = models.OneToOneField(
        StarLedger,
        on_delete=models.SET_NULL,
        related_name="subscription_billing_event",
        blank=True,
        null=True,
    )
    event_type = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=10, default="INR")
    event_at = models.DateTimeField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-event_at", "-created_at"]
        indexes = [
            models.Index(fields=["institute", "event_type", "event_at"]),
            models.Index(fields=["student_subscription", "event_at"]),
        ]

    def clean(self):
        super().clean()
        if self.student_subscription_id and self.student_subscription.institute_id != self.institute_id:
            raise ValidationError(
                {"student_subscription": "Student subscription must belong to the selected institute."}
            )


class ContentAccessPolicy(BaseModel, ContentTargetMixin):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="content_access_policies",
    )
    policy_type = models.CharField(max_length=30, choices=AccessPolicyType.choices)
    star_cost = models.PositiveIntegerField(default=0)
    entitlement_code = models.CharField(max_length=100, blank=True)
    priority = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ["priority", "content_type", "content_key"]
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "content_type", "content_key", "policy_type"],
                name="unique_content_access_policy_per_target_type",
            )
        ]
        indexes = ContentTargetMixin.Meta.indexes + [
            models.Index(fields=["institute", "policy_type"]),
            models.Index(fields=["star_cost"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.subject_id and self.subject.institute_id != self.institute_id:
            raise ValidationError({"subject": "Subject must belong to the selected institute."})
        if self.policy_type == AccessPolicyType.FREE and self.star_cost != 0:
            raise ValidationError({"star_cost": "Free policies cannot have a star cost."})
        if self.policy_type == AccessPolicyType.STARS_ONLY and self.star_cost <= 0:
            raise ValidationError({"star_cost": "Star-cost policies must charge at least one star."})
        if self.policy_type == AccessPolicyType.ENTITLEMENT_ONLY and not self.entitlement_code.strip():
            raise ValidationError(
                {"entitlement_code": "Entitlement-only policies must define an entitlement code."}
            )
        if self.policy_type == AccessPolicyType.STARS_OR_ENTITLEMENT:
            if self.star_cost <= 0:
                raise ValidationError(
                    {"star_cost": "Stars-or-entitlement policies must define a positive star cost."}
                )
            if not self.entitlement_code.strip():
                raise ValidationError(
                    {"entitlement_code": "Stars-or-entitlement policies must define an entitlement code."}
                )


class UnlockRule(BaseModel, ContentTargetMixin):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="unlock_rules",
    )
    rule_type = models.CharField(max_length=30, choices=UnlockRuleType.choices)
    required_star_balance = models.PositiveIntegerField(blank=True, null=True)
    required_entitlement_code = models.CharField(max_length=100, blank=True)
    required_completion_count = models.PositiveIntegerField(blank=True, null=True)
    required_score_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
    )
    admin_override_allowed = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ["priority", "content_type", "content_key"]
        indexes = ContentTargetMixin.Meta.indexes + [
            models.Index(fields=["institute", "rule_type"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.subject_id and self.subject.institute_id != self.institute_id:
            raise ValidationError({"subject": "Subject must belong to the selected institute."})
        if self.required_score_percentage is not None:
            if self.required_score_percentage < 0 or self.required_score_percentage > 100:
                raise ValidationError(
                    {"required_score_percentage": "Required score must be between 0 and 100."}
                )
        if self.rule_type == UnlockRuleType.STARS_BALANCE and not self.required_star_balance:
            raise ValidationError(
                {"required_star_balance": "Stars-balance rules must define a required balance."}
            )
        if self.rule_type == UnlockRuleType.ENTITLEMENT and not self.required_entitlement_code.strip():
            raise ValidationError(
                {"required_entitlement_code": "Entitlement rules must define an entitlement code."}
            )


class StudentUnlockState(BaseModel, ContentTargetMixin):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="student_unlock_states",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="unlock_states",
    )
    status = models.CharField(max_length=20, choices=UnlockStateStatus.choices)
    lock_reason_code = models.CharField(max_length=100, blank=True)
    lock_reason_message = models.TextField(blank=True)
    unlocked_at = models.DateTimeField(blank=True, null=True)
    locked_at = models.DateTimeField(blank=True, null=True)
    last_evaluated_at = models.DateTimeField(blank=True, null=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="granted_unlock_states",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["student__full_name", "content_type", "content_key"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "content_type", "content_key"],
                name="unique_student_unlock_state_per_target",
            )
        ]
        indexes = ContentTargetMixin.Meta.indexes + [
            models.Index(fields=["institute", "student", "status"]),
            models.Index(fields=["last_evaluated_at"]),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the selected institute."})
        if self.subject_id and self.subject.institute_id != self.institute_id:
            raise ValidationError({"subject": "Subject must belong to the selected institute."})


class StudentEntitlement(BaseModel, ContentTargetMixin):
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name="student_entitlements",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="entitlements",
    )
    entitlement_code = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=EntitlementStatus.choices)
    source_type = models.CharField(max_length=40)
    source_id = models.CharField(max_length=64, blank=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="granted_entitlements",
        blank=True,
        null=True,
    )
    valid_from = models.DateTimeField(blank=True, null=True)
    valid_until = models.DateTimeField(blank=True, null=True)
    consumed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["student__full_name", "entitlement_code"]
        indexes = ContentTargetMixin.Meta.indexes + [
            models.Index(fields=["institute", "student", "status"]),
            models.Index(fields=["entitlement_code", "status"]),
            models.Index(fields=["valid_from", "valid_until"]),
        ]

    def clean(self):
        super().clean()
        if self.student_id and self.student.institute_id != self.institute_id:
            raise ValidationError({"student": "Student must belong to the selected institute."})
        if self.subject_id and self.subject.institute_id != self.institute_id:
            raise ValidationError({"subject": "Subject must belong to the selected institute."})
        if self.valid_from and self.valid_until and self.valid_until <= self.valid_from:
            raise ValidationError({"valid_until": "Valid until must be after valid from."})
