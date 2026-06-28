import calendar
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.economy.models import (
    AccessPolicyType,
    BillingInterval,
    ContentAccessPolicy,
    EconomyBalanceSource,
    InstituteSubscriptionRequest,
    InstituteSubscriptionRequestStatus,
    InstituteQuestionEntitlement,
    InstituteQuestionEntitlementGrantMode,
    InstituteQuestionEntitlementStatus,
    InstituteQuestionFeatureEntitlement,
    InstituteQuestionUsageActionType,
    InstituteQuestionUsageLedger,
    LedgerEntryDirection,
    PaymentOrder,
    PaymentOrderStatus,
    PaymentTransaction,
    PaymentTransactionStatus,
    QuestionBankPackage,
    QuestionBankAccessMode,
    ReferralCode,
    ReferralEvent,
    ReferralProgram,
    ReferralRewardSide,
    RewardRule,
    RewardRuleType,
    StarLedger,
    StarPack,
    StudentEconomyProfile,
    StudentEntitlement,
    StudentRewardEvent,
    StudentSubscription,
    StudentSubscriptionStatus,
    StudentUnlockState,
    SubscriptionBillingEvent,
    SubscriptionPlan,
    SubscriptionPlanQuestionBankPackage,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
    UnlockRule,
    UnlockRuleType,
    UnlockStateStatus,
)
from apps.academics.models import Subject
from apps.question_bank.models import MasterQuestionSourceType, MasterQuestionVisibility
from apps.results.models import ExamResult


def _content_target_query(*, content_type, content_key, subject=None):
    query = Q(content_type=content_type, content_key=content_key, is_active=True)
    if subject is not None:
        query &= Q(subject=subject) | Q(subject__isnull=True)
    else:
        query &= Q(subject__isnull=True)
    return query


def _best_rule_match(queryset, *, subject=None):
    if subject is not None:
        exact = queryset.filter(subject=subject).order_by("priority", "created_at").first()
        if exact is not None:
            return exact
    return queryset.filter(subject__isnull=True).order_by("priority", "created_at").first()


def _derived_content_entitlement_code(*, content_type, content_key):
    return f"unlock:{content_type}:{content_key}"


def _active_reward_rules_queryset(*, institute, rule_type, at_time=None, subject=None):
    now = at_time or timezone.now()
    queryset = RewardRule.objects.filter(
        institute=institute,
        rule_type=rule_type,
        is_active=True,
    ).filter(
        Q(valid_from__isnull=True) | Q(valid_from__lte=now),
        Q(valid_until__isnull=True) | Q(valid_until__gte=now),
    )
    if subject is not None:
        queryset = queryset.filter(Q(subject=subject) | Q(subject__isnull=True))
    else:
        queryset = queryset.filter(subject__isnull=True)
    return queryset.order_by("priority", "created_at")


def _active_referral_programs_queryset(*, institute, at_time=None):
    now = at_time or timezone.now()
    return ReferralProgram.objects.filter(
        institute=institute,
        is_active=True,
    ).filter(
        Q(valid_from__isnull=True) | Q(valid_from__lte=now),
        Q(valid_until__isnull=True) | Q(valid_until__gte=now),
    ).order_by("created_at", "id")


def _reward_ledger_source_type(*, reward_rule):
    if reward_rule.rule_type == RewardRuleType.SIGNUP:
        return "signup_bonus"
    if reward_rule.rule_type == RewardRuleType.REFERRAL:
        return "referral_bonus"
    if reward_rule.rule_type in {RewardRuleType.EXAM_COMPLETION, RewardRuleType.SCORE_THRESHOLD}:
        return "exam_reward"
    return "adjustment"


def _normalize_referral_code(value):
    return "".join(str(value or "").strip().split()).lower()


@transaction.atomic
def get_or_create_student_referral_code(*, student, program=None):
    if program is None:
        program = _active_referral_programs_queryset(institute=student.institute).first()
    if program is None:
        return None
    if program.institute_id != student.institute_id:
        raise ValidationError({"program": "Referral program must belong to the student's institute."})

    referral_code = (
        ReferralCode.objects.select_for_update()
        .filter(
            institute=student.institute,
            owner_student=student,
            program=program,
            is_active=True,
        )
        .first()
    )
    if referral_code is not None:
        return referral_code

    from apps.accounts.services import build_unique_code

    seed = student.admission_no or student.email or student.full_name or str(student.id)
    code = build_unique_code(ReferralCode, "code", seed, "ref")
    return ReferralCode.objects.create(
        institute=student.institute,
        program=program,
        owner_student=student,
        code=code,
    )


@transaction.atomic
def apply_referral_code_for_student_signup(
    *,
    student,
    referral_code,
    created_by=None,
    processed_at=None,
    metadata=None,
):
    normalized_code = _normalize_referral_code(referral_code)
    if not normalized_code:
        return None

    processed_time = processed_at or timezone.now()
    referral_code_obj = (
        ReferralCode.objects.select_for_update()
        .select_related("program", "owner_student")
        .filter(code__iexact=normalized_code, is_active=True)
        .first()
    )
    if referral_code_obj is None:
        raise ValidationError({"referral_code": "Referral code is not valid."})
    if referral_code_obj.institute_id != student.institute_id:
        raise ValidationError(
            {"referral_code": "Referral code does not belong to the selected institute."}
        )
    if referral_code_obj.owner_student_id == student.id:
        raise ValidationError({"referral_code": "You cannot use your own referral code."})
    if (
        referral_code_obj.usage_limit is not None
        and referral_code_obj.used_count >= referral_code_obj.usage_limit
    ):
        raise ValidationError({"referral_code": "Referral code has reached its usage limit."})

    program = referral_code_obj.program
    if program is None or not program.is_active:
        raise ValidationError({"referral_code": "Referral program is not active."})
    if program.valid_from and program.valid_from > processed_time:
        raise ValidationError({"referral_code": "Referral program is not active yet."})
    if program.valid_until and program.valid_until < processed_time:
        raise ValidationError({"referral_code": "Referral program has expired."})

    existing_event = (
        ReferralEvent.objects.select_for_update()
        .filter(program=program, referee_student=student)
        .first()
    )
    if existing_event is not None:
        return existing_event

    event = ReferralEvent.objects.create(
        institute=student.institute,
        program=program,
        referral_code=referral_code_obj,
        referrer_student=referral_code_obj.owner_student,
        referee_student=student,
        metadata={
            "referral_code": referral_code_obj.code,
            **(metadata or {}),
        },
    )

    referrer_ledger_entry = None
    referee_ledger_entry = None

    if (
        program.reward_side in {ReferralRewardSide.REFERRER, ReferralRewardSide.BOTH}
        and program.referrer_stars > 0
    ):
        referrer_ledger_entry = credit_stars(
            student=referral_code_obj.owner_student,
            source_type="referral_bonus",
            reason=f"Referral reward for inviting {student.full_name}",
            stars=program.referrer_stars,
            balance_source=EconomyBalanceSource.EARNED,
            created_by=created_by,
            source_id=str(event.id),
            source_reference=referral_code_obj.code,
            effective_at=processed_time,
            metadata={
                "referral_event_id": str(event.id),
                "referee_student_id": str(student.id),
                **(metadata or {}),
            },
        )

    if (
        program.reward_side in {ReferralRewardSide.REFEREE, ReferralRewardSide.BOTH}
        and program.referee_stars > 0
    ):
        referee_ledger_entry = credit_stars(
            student=student,
            source_type="referral_bonus",
            reason=f"Referral reward for joining with code {referral_code_obj.code}",
            stars=program.referee_stars,
            balance_source=EconomyBalanceSource.EARNED,
            created_by=created_by,
            source_id=str(event.id),
            source_reference=referral_code_obj.code,
            effective_at=processed_time,
            metadata={
                "referral_event_id": str(event.id),
                "referrer_student_id": str(referral_code_obj.owner_student_id),
                **(metadata or {}),
            },
        )

    event.referrer_ledger_entry = referrer_ledger_entry
    event.referee_ledger_entry = referee_ledger_entry
    event.save(update_fields=["referrer_ledger_entry", "referee_ledger_entry", "updated_at"])

    referral_code_obj.used_count += 1
    referral_code_obj.save(update_fields=["used_count", "updated_at"])
    return event


@transaction.atomic
def get_or_create_student_economy_profile(student):
    profile, _ = StudentEconomyProfile.objects.select_for_update().get_or_create(
        student=student,
        defaults={
            "institute": student.institute,
        },
    )
    if profile.institute_id != student.institute_id:
        raise ValidationError({"student": "Economy profile institute does not match the student."})
    return profile


@transaction.atomic
def create_star_ledger_entry(
    *,
    student,
    source_type,
    reason,
    stars_delta,
    balance_source=EconomyBalanceSource.EARNED,
    created_by=None,
    source_id="",
    source_reference="",
    effective_at=None,
    metadata=None,
):
    if stars_delta == 0:
        raise ValidationError({"stars_delta": "Ledger entries must change the balance."})

    profile = get_or_create_student_economy_profile(student)
    next_balance = profile.available_stars + stars_delta
    if next_balance < 0:
        raise ValidationError({"stars_delta": "Insufficient stars for this operation."})

    direction = (
        LedgerEntryDirection.CREDIT if stars_delta > 0 else LedgerEntryDirection.DEBIT
    )
    effective_time = effective_at or timezone.now()

    entry = StarLedger.objects.create(
        institute=student.institute,
        student=student,
        economy_profile=profile,
        direction=direction,
        source_type=source_type,
        source_id=source_id,
        source_reference=source_reference,
        reason=reason,
        stars_delta=stars_delta,
        balance_after=next_balance,
        balance_source=balance_source,
        created_by=created_by,
        effective_at=effective_time,
        metadata=metadata or {},
    )

    profile.available_stars = next_balance
    if stars_delta > 0:
        profile.lifetime_earned_stars += stars_delta
        if balance_source == EconomyBalanceSource.ADMIN_GRANTED:
            profile.admin_granted_stars += stars_delta
        elif balance_source == EconomyBalanceSource.PAID:
            profile.paid_credited_stars += stars_delta
        elif balance_source == EconomyBalanceSource.SUBSCRIPTION:
            profile.subscription_credited_stars += stars_delta
    else:
        profile.lifetime_spent_stars += abs(stars_delta)
    profile.last_ledger_entry_at = effective_time
    profile.save()
    return entry


def credit_stars(
    *,
    student,
    source_type,
    reason,
    stars,
    balance_source=EconomyBalanceSource.EARNED,
    created_by=None,
    source_id="",
    source_reference="",
    effective_at=None,
    metadata=None,
):
    if stars <= 0:
        raise ValidationError({"stars": "Credit amount must be greater than zero."})
    return create_star_ledger_entry(
        student=student,
        source_type=source_type,
        reason=reason,
        stars_delta=stars,
        balance_source=balance_source,
        created_by=created_by,
        source_id=source_id,
        source_reference=source_reference,
        effective_at=effective_at,
        metadata=metadata,
    )


def debit_stars(
    *,
    student,
    source_type,
    reason,
    stars,
    created_by=None,
    source_id="",
    source_reference="",
    effective_at=None,
    metadata=None,
):
    if stars <= 0:
        raise ValidationError({"stars": "Debit amount must be greater than zero."})
    return create_star_ledger_entry(
        student=student,
        source_type=source_type,
        reason=reason,
        stars_delta=-stars,
        balance_source=EconomyBalanceSource.ADJUSTMENT,
        created_by=created_by,
        source_id=source_id,
        source_reference=source_reference,
        effective_at=effective_at,
        metadata=metadata,
    )


def grant_admin_stars(
    *,
    student,
    stars,
    reason,
    created_by,
    source_reference="",
    metadata=None,
):
    return credit_stars(
        student=student,
        source_type="admin_grant",
        reason=reason,
        stars=stars,
        balance_source=EconomyBalanceSource.ADMIN_GRANTED,
        created_by=created_by,
        source_id=str(getattr(created_by, "id", "")),
        source_reference=source_reference,
        metadata=metadata,
    )


def list_active_star_packs(*, institute):
    return StarPack.objects.filter(institute=institute, is_active=True).order_by(
        "sort_order", "price_amount", "name"
    )


def list_active_subscription_plans(*, institute):
    return (
        SubscriptionPlan.objects.filter(institute=institute, is_active=True)
        .prefetch_related("cycles__star_credit_rules")
        .order_by("name")
    )


def list_requestable_subscription_plans_for_institute(*, institute):
    return (
        SubscriptionPlan.objects.filter(
            is_active=True,
            question_bank_package_links__is_active=True,
        )
        .filter(Q(institute=institute) | Q(institute__metadata__is_public_content_hub=True))
        .select_related("institute")
        .prefetch_related(
            "cycles__star_credit_rules",
            "question_bank_package_links__question_bank_package__institute",
            "question_bank_package_links__question_bank_package__scopes",
        )
        .distinct()
        .order_by("institute__name", "name")
    )


def list_student_payment_orders(*, student):
    return (
        PaymentOrder.objects.filter(student=student, is_active=True)
        .select_related("star_pack", "subscription_plan_cycle", "subscription_plan_cycle__plan")
        .order_by("-created_at")
    )


def list_student_subscriptions(*, student):
    return (
        StudentSubscription.objects.filter(student=student, is_active=True)
        .select_related("plan_cycle", "plan_cycle__plan")
        .prefetch_related("billing_events")
        .order_by("-created_at")
    )


def _add_months(value, months):
    month_index = (value.month - 1) + months
    year = value.year + (month_index // 12)
    month = (month_index % 12) + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def _calculate_subscription_period_end(*, period_start, plan_cycle):
    if plan_cycle.billing_interval == BillingInterval.MONTHLY:
        return _add_months(period_start, plan_cycle.interval_count)
    if plan_cycle.billing_interval == BillingInterval.QUARTERLY:
        return _add_months(period_start, plan_cycle.interval_count * 3)
    if plan_cycle.billing_interval == BillingInterval.YEARLY:
        return _add_months(period_start, plan_cycle.interval_count * 12)

    custom_days = int((plan_cycle.metadata or {}).get("custom_duration_days") or 0)
    if custom_days <= 0:
        raise ValidationError(
            {
                "subscription_plan_cycle": (
                    "Custom billing cycles must define metadata.custom_duration_days."
                )
            }
        )
    return period_start + timedelta(days=custom_days)


def _resolve_subscription_credit_rules(*, plan_cycle, is_activation):
    rules = SubscriptionStarCreditRule.objects.filter(
        plan_cycle=plan_cycle,
        is_active=True,
    ).order_by("created_at")
    if is_activation:
        return [rule for rule in rules if rule.credit_on_activation]
    return [rule for rule in rules if rule.credit_on_renewal]


def _get_active_subscription_for_cycle(*, student, plan_cycle):
    active_statuses = [
        StudentSubscriptionStatus.ACTIVE,
        StudentSubscriptionStatus.PAST_DUE,
        StudentSubscriptionStatus.PAUSED,
        StudentSubscriptionStatus.DRAFT,
    ]
    return (
        StudentSubscription.objects.select_for_update()
        .filter(
            student=student,
            plan_cycle=plan_cycle,
            status__in=active_statuses,
            is_active=True,
        )
        .order_by("-current_period_end", "-created_at")
        .first()
    )


@transaction.atomic
def create_star_pack_payment_order(
    *,
    student,
    star_pack,
    provider_name="manual",
    provider_order_reference="",
    metadata=None,
):
    if not isinstance(star_pack, StarPack):
        star_pack = StarPack.objects.filter(pk=star_pack, is_active=True).first()
    if star_pack is None:
        raise ValidationError({"star_pack": "Star pack not found."})
    if star_pack.institute_id != student.institute_id:
        raise ValidationError({"star_pack": "Star pack does not belong to the student's institute."})
    if not star_pack.is_active:
        raise ValidationError({"star_pack": "Star pack is not active."})

    return PaymentOrder.objects.create(
        institute=student.institute,
        student=student,
        star_pack=star_pack,
        order_type="star_pack",
        status=PaymentOrderStatus.PENDING,
        amount=star_pack.price_amount,
        currency=star_pack.currency,
        provider_name=provider_name or "",
        provider_order_reference=provider_order_reference or "",
        metadata=metadata or {},
    )


@transaction.atomic
def create_subscription_payment_order(
    *,
    student,
    plan_cycle,
    provider_name="manual",
    provider_order_reference="",
    metadata=None,
):
    if not isinstance(plan_cycle, SubscriptionPlanCycle):
        plan_cycle = (
            SubscriptionPlanCycle.objects.select_related("plan")
            .filter(pk=plan_cycle, is_active=True)
            .first()
        )
    if plan_cycle is None:
        raise ValidationError({"subscription_plan_cycle": "Subscription cycle not found."})
    if plan_cycle.institute_id != student.institute_id:
        raise ValidationError(
            {"subscription_plan_cycle": "Subscription cycle does not belong to the student's institute."}
        )
    if not plan_cycle.is_active or not plan_cycle.plan.is_active:
        raise ValidationError({"subscription_plan_cycle": "Subscription cycle is not active."})

    return PaymentOrder.objects.create(
        institute=student.institute,
        student=student,
        subscription_plan_cycle=plan_cycle,
        order_type="subscription",
        status=PaymentOrderStatus.PENDING,
        amount=plan_cycle.price_amount,
        currency=plan_cycle.currency,
        provider_name=provider_name or "",
        provider_order_reference=provider_order_reference or "",
        metadata=metadata or {},
    )


@transaction.atomic
def activate_or_renew_student_subscription(
    *,
    payment_order,
    payment_transaction,
    created_by=None,
    processed_at=None,
):
    processed_time = processed_at or timezone.now()
    plan_cycle = payment_order.subscription_plan_cycle
    subscription = _get_active_subscription_for_cycle(
        student=payment_order.student,
        plan_cycle=plan_cycle,
    )
    is_activation = subscription is None

    if subscription is None:
        period_start = processed_time
        subscription = StudentSubscription.objects.create(
            institute=payment_order.institute,
            student=payment_order.student,
            plan_cycle=plan_cycle,
            status=StudentSubscriptionStatus.ACTIVE,
            activated_at=processed_time,
            current_period_start=period_start,
            current_period_end=_calculate_subscription_period_end(
                period_start=period_start,
                plan_cycle=plan_cycle,
            ),
            metadata={
                "activation_order_id": str(payment_order.id),
                "activation_transaction_id": str(payment_transaction.id),
            },
        )
        billing_event_type = "activation"
    else:
        period_start = subscription.current_period_end or processed_time
        if period_start < processed_time:
            period_start = processed_time
        subscription.status = StudentSubscriptionStatus.ACTIVE
        if subscription.activated_at is None:
            subscription.activated_at = processed_time
        subscription.current_period_start = period_start
        subscription.current_period_end = _calculate_subscription_period_end(
            period_start=period_start,
            plan_cycle=plan_cycle,
        )
        merged_metadata = dict(subscription.metadata or {})
        merged_metadata["last_renewal_order_id"] = str(payment_order.id)
        merged_metadata["last_renewal_transaction_id"] = str(payment_transaction.id)
        subscription.metadata = merged_metadata
        subscription.save()
        billing_event_type = "renewal"

    credit_rules = _resolve_subscription_credit_rules(
        plan_cycle=plan_cycle,
        is_activation=is_activation,
    )
    total_stars = sum(rule.stars_credited for rule in credit_rules)
    ledger_entry = None
    if total_stars > 0:
        ledger_entry = credit_stars(
            student=payment_order.student,
            source_type="subscription",
            reason=f"{plan_cycle.plan.name} {billing_event_type} stars",
            stars=total_stars,
            balance_source=EconomyBalanceSource.SUBSCRIPTION,
            created_by=created_by,
            source_id=str(subscription.id),
            source_reference=str(payment_order.id),
            effective_at=processed_time,
            metadata={
                "payment_order_id": str(payment_order.id),
                "payment_transaction_id": str(payment_transaction.id),
                "plan_cycle_id": str(plan_cycle.id),
                "billing_event_type": billing_event_type,
            },
        )

    billing_event = SubscriptionBillingEvent.objects.create(
        institute=payment_order.institute,
        student_subscription=subscription,
        payment_transaction=payment_transaction,
        ledger_entry=ledger_entry,
        event_type=billing_event_type,
        amount=payment_order.amount,
        currency=payment_order.currency,
        event_at=processed_time,
        metadata={
            "payment_order_id": str(payment_order.id),
            "plan_cycle_id": str(plan_cycle.id),
            "credited_stars": total_stars,
        },
    )
    return subscription, billing_event, ledger_entry


@transaction.atomic
def complete_payment_order(
    *,
    payment_order,
    provider_transaction_reference="",
    created_by=None,
    metadata=None,
    processed_at=None,
):
    processed_time = processed_at or timezone.now()
    if not isinstance(payment_order, PaymentOrder):
        payment_order = (
            PaymentOrder.objects.select_for_update()
            .filter(pk=payment_order, is_active=True)
            .first()
        )
    else:
        payment_order = (
            PaymentOrder.objects.select_for_update()
            .get(pk=payment_order.pk)
        )
    if payment_order is None:
        raise ValidationError({"payment_order": "Payment order not found."})
    if payment_order.status == PaymentOrderStatus.COMPLETED:
        existing_transaction = (
            payment_order.transactions.filter(status=PaymentTransactionStatus.CAPTURED)
            .order_by("-processed_at", "-created_at")
            .first()
        )
        return {
            "payment_order": payment_order,
            "payment_transaction": existing_transaction,
            "ledger_entry": getattr(existing_transaction, "ledger_entry", None),
            "student_subscription": None,
            "billing_event": None,
            "created": False,
        }
    if payment_order.status not in {PaymentOrderStatus.PENDING, PaymentOrderStatus.PROCESSING}:
        raise ValidationError(
            {"payment_order": f"Payment order cannot be completed from status '{payment_order.status}'."}
        )

    payment_order.status = PaymentOrderStatus.COMPLETED
    if provider_transaction_reference:
        payment_order.provider_order_reference = (
            payment_order.provider_order_reference or provider_transaction_reference
        )
    if metadata:
        merged_order_metadata = dict(payment_order.metadata or {})
        merged_order_metadata.update(metadata)
        payment_order.metadata = merged_order_metadata
    payment_order.save()

    payment_transaction = PaymentTransaction.objects.create(
        institute=payment_order.institute,
        payment_order=payment_order,
        status=PaymentTransactionStatus.CAPTURED,
        provider_name=payment_order.provider_name or "manual",
        provider_transaction_reference=provider_transaction_reference or "",
        amount=payment_order.amount,
        currency=payment_order.currency,
        processed_at=processed_time,
        metadata=metadata or {},
    )

    ledger_entry = None
    student_subscription = None
    billing_event = None

    if payment_order.star_pack_id:
        star_pack = payment_order.star_pack
        ledger_entry = credit_stars(
            student=payment_order.student,
            source_type="purchase",
            reason=f"Purchased {star_pack.name}",
            stars=star_pack.stars_credited,
            balance_source=EconomyBalanceSource.PAID,
            created_by=created_by,
            source_id=str(payment_order.id),
            source_reference=provider_transaction_reference or str(payment_transaction.id),
            effective_at=processed_time,
            metadata={
                "payment_order_id": str(payment_order.id),
                "payment_transaction_id": str(payment_transaction.id),
                "star_pack_id": str(star_pack.id),
            },
        )
        payment_transaction.ledger_entry = ledger_entry
        payment_transaction.save(update_fields=["ledger_entry", "updated_at"])
    else:
        (
            student_subscription,
            billing_event,
            ledger_entry,
        ) = activate_or_renew_student_subscription(
            payment_order=payment_order,
            payment_transaction=payment_transaction,
            created_by=created_by,
            processed_at=processed_time,
        )
        if ledger_entry is not None:
            payment_transaction.ledger_entry = ledger_entry
            payment_transaction.save(update_fields=["ledger_entry", "updated_at"])

    return {
        "payment_order": payment_order,
        "payment_transaction": payment_transaction,
        "ledger_entry": ledger_entry,
        "student_subscription": student_subscription,
        "billing_event": billing_event,
        "created": True,
    }


@transaction.atomic
def issue_reward_for_event(
    *,
    student,
    reward_rule,
    event_key,
    event_reference="",
    created_by=None,
    processed_at=None,
    metadata=None,
):
    event = (
        StudentRewardEvent.objects.select_for_update()
        .filter(student=student, reward_rule=reward_rule, event_key=event_key)
        .first()
    )
    if event is not None:
        return event, False

    processed_time = processed_at or timezone.now()
    ledger_entry = credit_stars(
        student=student,
        source_type=_reward_ledger_source_type(reward_rule=reward_rule),
        reason=f"Reward issued for rule: {reward_rule.name}",
        stars=reward_rule.stars_awarded,
        balance_source=EconomyBalanceSource.EARNED,
        created_by=created_by,
        source_id=str(reward_rule.id),
        source_reference=event_reference or event_key,
        effective_at=processed_time,
        metadata=metadata or {},
    )
    event = StudentRewardEvent.objects.create(
        institute=student.institute,
        student=student,
        reward_rule=reward_rule,
        ledger_entry=ledger_entry,
        event_key=event_key,
        event_reference=event_reference,
        awarded_stars=reward_rule.stars_awarded,
        processed_at=processed_time,
        metadata=metadata or {},
    )
    return event, True


@transaction.atomic
def process_signup_rewards(*, student, created_by=None, processed_at=None):
    processed_time = processed_at or timezone.now()
    created_events = []
    for reward_rule in _active_reward_rules_queryset(
        institute=student.institute,
        rule_type=RewardRuleType.SIGNUP,
        at_time=processed_time,
    ):
        event, created = issue_reward_for_event(
            student=student,
            reward_rule=reward_rule,
            event_key=f"signup:{student.id}",
            event_reference=str(student.id),
            created_by=created_by,
            processed_at=processed_time,
            metadata={"trigger": "signup"},
        )
        if created:
            created_events.append(event)
    return created_events


@transaction.atomic
def process_exam_result_rewards(*, result, created_by=None, processed_at=None):
    if not isinstance(result, ExamResult):
        raise ValidationError({"result": "A valid exam result is required."})

    processed_time = processed_at or timezone.now()
    created_events = []
    subject = getattr(result.exam, "subject", None)

    for reward_rule in _active_reward_rules_queryset(
        institute=result.institute,
        rule_type=RewardRuleType.EXAM_COMPLETION,
        at_time=processed_time,
        subject=subject,
    ):
        event, created = issue_reward_for_event(
            student=result.student,
            reward_rule=reward_rule,
            event_key=f"exam_completion:{result.id}",
            event_reference=str(result.exam_id),
            created_by=created_by,
            processed_at=processed_time,
            metadata={"result_id": str(result.id), "exam_id": str(result.exam_id)},
        )
        if created:
            created_events.append(event)

    percentage = float(result.percentage or 0)
    for reward_rule in _active_reward_rules_queryset(
        institute=result.institute,
        rule_type=RewardRuleType.SCORE_THRESHOLD,
        at_time=processed_time,
        subject=subject,
    ):
        threshold = float(reward_rule.score_threshold_percentage or 0)
        if percentage < threshold:
            continue
        event, created = issue_reward_for_event(
            student=result.student,
            reward_rule=reward_rule,
            event_key=f"score_threshold:{result.id}:{reward_rule.id}",
            event_reference=str(result.exam_id),
            created_by=created_by,
            processed_at=processed_time,
            metadata={
                "result_id": str(result.id),
                "exam_id": str(result.exam_id),
                "threshold": threshold,
                "achieved_percentage": percentage,
            },
        )
        if created:
            created_events.append(event)

    return created_events


def _active_institute_question_entitlements_queryset(*, institute, at_time=None):
    now = at_time or timezone.now()
    return InstituteQuestionEntitlement.objects.filter(
        institute=institute,
        is_active=True,
        status=InstituteQuestionEntitlementStatus.ACTIVE,
    ).filter(
        Q(starts_at__isnull=True) | Q(starts_at__lte=now),
        Q(ends_at__isnull=True) | Q(ends_at__gte=now),
    )


def _active_institute_question_feature_entitlements_queryset(*, institute, at_time=None):
    now = at_time or timezone.now()
    return InstituteQuestionFeatureEntitlement.objects.filter(
        institute=institute,
        is_active=True,
        status=InstituteQuestionEntitlementStatus.ACTIVE,
    ).filter(
        Q(starts_at__isnull=True) | Q(starts_at__lte=now),
        Q(ends_at__isnull=True) | Q(ends_at__gte=now),
    )


def active_institute_question_entitlements(institute, *, at_time=None):
    return (
        _active_institute_question_entitlements_queryset(institute=institute, at_time=at_time)
        .select_related("question_bank_package", "subscription_plan", "subscription_plan_cycle")
        .order_by("question_bank_package__sort_order", "question_bank_package__name", "created_at")
    )


def active_institute_question_feature_entitlements(institute, *, at_time=None):
    return (
        _active_institute_question_feature_entitlements_queryset(institute=institute, at_time=at_time)
        .select_related("source_package", "source_subscription_plan")
        .order_by("feature_code", "created_at")
    )


def list_accessible_question_bank_packages(*, institute, at_time=None):
    package_ids = _active_institute_question_entitlements_queryset(
        institute=institute,
        at_time=at_time,
    ).values_list("question_bank_package_id", flat=True)
    return QuestionBankPackage.objects.filter(
        id__in=package_ids,
        is_active=True,
    ).order_by("sort_order", "name")


def institute_has_question_bank_package(institute, *, question_bank_package, at_time=None):
    package_id = getattr(question_bank_package, "id", question_bank_package)
    return _active_institute_question_entitlements_queryset(
        institute=institute,
        at_time=at_time,
    ).filter(question_bank_package_id=package_id).exists()


def institute_has_question_bank_feature(institute, feature_code, *, at_time=None):
    normalized_code = str(feature_code or "").strip().upper()
    if not normalized_code:
        return False
    return _active_institute_question_feature_entitlements_queryset(
        institute=institute,
        at_time=at_time,
    ).filter(feature_code=normalized_code).exists()


def package_scope_matches_master_question(*, scope, master_question):
    if scope.program_id and scope.program_id != getattr(master_question, "source_program_id", None):
        return False
    if scope.subject_id and scope.subject_id != getattr(master_question, "source_subject_id", None):
        return False
    if scope.topic_id and scope.topic_id != getattr(master_question, "source_topic_id", None):
        return False
    if scope.difficulty_level and scope.difficulty_level != getattr(master_question, "difficulty_level", ""):
        return False
    if scope.question_type and scope.question_type != getattr(master_question, "question_type", ""):
        return False
    if scope.master_visibility and scope.master_visibility != getattr(master_question, "visibility", ""):
        return False

    scope_source_type = str(getattr(scope, "question_source_type", "") or "").strip()
    master_source_type = str(getattr(master_question, "source_type", "") or "").strip()
    if scope_source_type == "platform_only" and master_source_type != MasterQuestionSourceType.PLATFORM:
        return False
    if scope_source_type == "teacher_only" and master_source_type != MasterQuestionSourceType.TEACHER:
        return False
    if scope_source_type == "institute_only" and master_source_type != MasterQuestionSourceType.INSTITUTE:
        return False
    if scope_source_type == "non_platform" and master_source_type == MasterQuestionSourceType.PLATFORM:
        return False

    scope_metadata = getattr(scope, "metadata", {}) or {}
    master_metadata = getattr(master_question, "metadata", {}) or {}
    seed_lane_filters = scope_metadata.get("master_question_seed_lanes")
    if seed_lane_filters:
        normalized_seed_lanes = {
            str(seed_lane).strip()
            for seed_lane in seed_lane_filters
            if str(seed_lane).strip()
        }
        if normalized_seed_lanes:
            master_seed_lane = str(master_metadata.get("seed_lane", "")).strip()
            if master_seed_lane not in normalized_seed_lanes:
                return False

    return True


def find_matching_question_bank_packages_for_master_question(institute, *, master_question, at_time=None):
    entitlements = active_institute_question_entitlements(institute, at_time=at_time).prefetch_related(
        "question_bank_package__scopes"
    )
    matches = []
    for entitlement in entitlements:
        package = entitlement.question_bank_package
        package_scopes = list(package.scopes.filter(is_active=True))
        if any(package_scope_matches_master_question(scope=scope, master_question=master_question) for scope in package_scopes):
            matches.append(package)
    return matches


def find_matching_question_bank_entitlements_for_master_question(institute, *, master_question, at_time=None):
    entitlements = active_institute_question_entitlements(institute, at_time=at_time).prefetch_related(
        "question_bank_package__scopes"
    )
    matches = []
    for entitlement in entitlements:
        package_scopes = list(entitlement.question_bank_package.scopes.filter(is_active=True))
        if any(package_scope_matches_master_question(scope=scope, master_question=master_question) for scope in package_scopes):
            matches.append(entitlement)
    return matches


def _matching_scopes_for_master_question(*, entitlement, master_question):
    package_scopes = list(entitlement.question_bank_package.scopes.filter(is_active=True))
    return [
        scope
        for scope in package_scopes
        if package_scope_matches_master_question(scope=scope, master_question=master_question)
    ]


def _linked_usage_entries_for_scope(*, entitlement, scope):
    queryset = InstituteQuestionUsageLedger.objects.select_related("master_question").filter(
        institute=entitlement.institute,
        question_bank_package=entitlement.question_bank_package,
        entitlement=entitlement,
        is_active=True,
        action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
        master_question__isnull=False,
    )
    return [
        entry
        for entry in queryset
        if entry.master_question
        and package_scope_matches_master_question(scope=scope, master_question=entry.master_question)
    ]


def _coerce_positive_float(value):
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric if numeric > 0 else None


def _coerce_positive_int(value):
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        return None
    return numeric if numeric > 0 else None


def _quota_warning_threshold_for_limit(*, entitlement, scope, limit_value):
    scope_metadata = scope.metadata or {}
    package_metadata = (entitlement.question_bank_package.metadata or {}) if entitlement.question_bank_package_id else {}

    absolute_override = _coerce_positive_float(
        scope_metadata.get("quota_warning_remaining")
        or package_metadata.get("quota_warning_remaining")
    )
    if absolute_override is not None:
        return int(absolute_override)

    percent_override = _coerce_positive_float(
        scope_metadata.get("quota_warning_percent")
        or package_metadata.get("quota_warning_percent")
    )
    if percent_override is None:
        percent_override = 10.0

    if percent_override > 1:
        percent_override = percent_override / 100.0

    computed = int(limit_value * percent_override)
    if computed <= 0:
        computed = 1
    if computed > limit_value:
        computed = limit_value
    return computed


def _publish_warning_threshold_for_limit(*, entitlement, limit_value):
    entitlement_metadata = entitlement.metadata or {}
    package_metadata = (entitlement.question_bank_package.metadata or {}) if entitlement.question_bank_package_id else {}

    absolute_override = _coerce_positive_int(
        entitlement_metadata.get("publish_warning_remaining")
        or package_metadata.get("publish_warning_remaining")
    )
    if absolute_override is not None:
        return min(absolute_override, limit_value)

    percent_override = _coerce_positive_float(
        entitlement_metadata.get("publish_warning_percent")
        or package_metadata.get("publish_warning_percent")
    )
    if percent_override is None:
        percent_override = 10.0

    if percent_override > 1:
        percent_override = percent_override / 100.0

    computed = int(limit_value * percent_override)
    if computed <= 0:
        computed = 1
    if computed > limit_value:
        computed = limit_value
    return computed


def get_entitlement_quota_summary(entitlement):
    package = entitlement.question_bank_package
    active_scopes = list(package.scopes.filter(is_active=True))
    quota_scopes = [
        scope
        for scope in active_scopes
        if scope.max_questions_total is not None or scope.max_questions_per_topic is not None
    ]
    if package.access_mode != QuestionBankAccessMode.QUOTA_LIMITED or not quota_scopes:
        return {
            "quota_configured": False,
            "quota_status": "not_applicable",
            "quota_watch_state": "not_applicable",
            "quota_usage_total": 0,
            "quota_remaining_min": None,
            "quota_scope_summary": [],
        }

    usage_total = 0
    scope_summaries = []
    limit_reached = False
    near_limit = False
    remaining_min = None

    for scope in quota_scopes:
        linked_entries = _linked_usage_entries_for_scope(entitlement=entitlement, scope=scope)
        usage_total += sum(entry.quantity for entry in linked_entries)

        parts = []
        if scope.program_id:
            parts.append(scope.program.name)
        if scope.subject_id:
            parts.append(scope.subject.name)
        if scope.topic_id:
            parts.append(scope.topic.name)
        scope_label = " -> ".join(parts) if parts else "Scoped package segment"

        metrics = []
        scope_remaining_values = []
        if scope.max_questions_total is not None:
            total_used = sum(entry.quantity for entry in linked_entries)
            total_remaining = max(scope.max_questions_total - total_used, 0)
            scope_remaining_values.append(
                (
                    total_remaining,
                    _quota_warning_threshold_for_limit(
                        entitlement=entitlement,
                        scope=scope,
                        limit_value=scope.max_questions_total,
                    ),
                )
            )
            metrics.append(f"{total_used}/{scope.max_questions_total} linked")
            metrics.append(f"{total_remaining} total remaining")
            if total_remaining <= 0:
                limit_reached = True

        if scope.max_questions_per_topic is not None:
            usage_by_topic = {}
            for entry in linked_entries:
                topic_id = getattr(entry.master_question, "source_topic_id", None)
                usage_by_topic[topic_id] = usage_by_topic.get(topic_id, 0) + entry.quantity
            highest_topic_usage = max(usage_by_topic.values(), default=0)
            per_topic_remaining = max(scope.max_questions_per_topic - highest_topic_usage, 0)
            scope_remaining_values.append(
                (
                    per_topic_remaining,
                    _quota_warning_threshold_for_limit(
                        entitlement=entitlement,
                        scope=scope,
                        limit_value=scope.max_questions_per_topic,
                    ),
                )
            )
            metrics.append(
                f"{highest_topic_usage}/{scope.max_questions_per_topic} used in busiest topic"
            )
            metrics.append(f"{per_topic_remaining} per-topic remaining")
            if per_topic_remaining <= 0:
                limit_reached = True

        for remaining_value, warning_threshold in scope_remaining_values:
            if remaining_min is None or remaining_value < remaining_min:
                remaining_min = remaining_value
            if remaining_value > 0 and remaining_value <= warning_threshold:
                near_limit = True

        summary = f"{scope_label} ({', '.join(metrics)})" if metrics else scope_label
        scope_summaries.append(summary)

    watch_state = "healthy"
    if limit_reached:
        watch_state = "limit_reached"
    elif near_limit:
        watch_state = "near_limit"

    return {
        "quota_configured": True,
        "quota_status": "limit_reached" if limit_reached else "available",
        "quota_watch_state": watch_state,
        "quota_usage_total": usage_total,
        "quota_remaining_min": remaining_min,
        "quota_scope_summary": scope_summaries,
    }


def entitlement_has_available_question_quota(*, entitlement, master_question):
    package = entitlement.question_bank_package
    if package.access_mode != QuestionBankAccessMode.QUOTA_LIMITED:
        return True

    matching_scopes = _matching_scopes_for_master_question(
        entitlement=entitlement,
        master_question=master_question,
    )
    if not matching_scopes:
        return False

    for scope in matching_scopes:
        linked_entries = _linked_usage_entries_for_scope(entitlement=entitlement, scope=scope)

        if scope.max_questions_total is not None:
            total_used = sum(entry.quantity for entry in linked_entries)
            if total_used >= scope.max_questions_total:
                continue

        if scope.max_questions_per_topic is not None:
            target_topic_id = getattr(master_question, "source_topic_id", None)
            topic_used = sum(
                entry.quantity
                for entry in linked_entries
                if getattr(entry.master_question, "source_topic_id", None) == target_topic_id
            )
            if topic_used >= scope.max_questions_per_topic:
                continue

        return True

    return False


def resolve_question_bank_entitlement_for_master_question_use(
    institute,
    *,
    master_question,
    at_time=None,
):
    matching_entitlements = find_matching_question_bank_entitlements_for_master_question(
        institute,
        master_question=master_question,
        at_time=at_time,
    )
    if not matching_entitlements:
        return None

    for entitlement in matching_entitlements:
        if entitlement_has_available_question_quota(
            entitlement=entitlement,
            master_question=master_question,
        ):
            return entitlement

    return None


def get_master_question_access_summary(institute, *, master_question, at_time=None):
    matching_entitlements = find_matching_question_bank_entitlements_for_master_question(
        institute,
        master_question=master_question,
        at_time=at_time,
    )
    if not matching_entitlements:
        return {
            "has_entitlement": False,
            "has_access": False,
            "access_availability": "subscription_required",
            "quota_limited": False,
            "quota_exhausted": False,
            "quota_note": "No matching subscribed package was found for this local scope.",
        }

    available_entitlement = None
    for entitlement in matching_entitlements:
        if entitlement_has_available_question_quota(
            entitlement=entitlement,
            master_question=master_question,
        ):
            available_entitlement = entitlement
            break

    if available_entitlement is None:
        return {
            "has_entitlement": True,
            "has_access": False,
            "access_availability": "quota_exhausted",
            "quota_limited": any(
                entitlement.question_bank_package.access_mode == QuestionBankAccessMode.QUOTA_LIMITED
                for entitlement in matching_entitlements
            ),
            "quota_exhausted": True,
            "quota_note": "Matching subscribed packages were found, but their question quota is exhausted.",
        }

    if available_entitlement.question_bank_package.access_mode != QuestionBankAccessMode.QUOTA_LIMITED:
        return {
            "has_entitlement": True,
            "has_access": True,
            "access_availability": "available",
            "quota_limited": False,
            "quota_exhausted": False,
            "quota_note": "",
        }

    matching_scopes = _matching_scopes_for_master_question(
        entitlement=available_entitlement,
        master_question=master_question,
    )
    remaining_candidates = []
    for scope in matching_scopes:
        linked_entries = _linked_usage_entries_for_scope(entitlement=available_entitlement, scope=scope)
        scope_limits = []

        if scope.max_questions_total is not None:
            total_used = sum(entry.quantity for entry in linked_entries)
            scope_limits.append(max(scope.max_questions_total - total_used, 0))

        if scope.max_questions_per_topic is not None:
            target_topic_id = getattr(master_question, "source_topic_id", None)
            topic_used = sum(
                entry.quantity
                for entry in linked_entries
                if getattr(entry.master_question, "source_topic_id", None) == target_topic_id
            )
            scope_limits.append(max(scope.max_questions_per_topic - topic_used, 0))

        if scope_limits:
            remaining_candidates.append(min(scope_limits))

    quota_note = ""
    if remaining_candidates:
        quota_note = f"Matching package quota available. Remaining question allowance: {max(remaining_candidates)}."

    return {
        "has_entitlement": True,
        "has_access": True,
        "access_availability": "available",
        "quota_limited": True,
        "quota_exhausted": False,
        "quota_note": quota_note,
    }


def validate_institute_question_quota_access(*, institute, master_question, at_time=None):
    entitlement = resolve_question_bank_entitlement_for_master_question_use(
        institute,
        master_question=master_question,
        at_time=at_time,
    )
    if entitlement is not None:
        return entitlement

    raise ValidationError(
        {
            "master_question": (
                "This platform question is outside the institute's active subscribed question-bank packages "
                "or the matching package quota has been exhausted."
            )
        }
    )


def institute_has_master_question_access(institute, *, master_question, at_time=None):
    source_type = str(getattr(master_question, "source_type", "") or "").strip()
    visibility = str(getattr(master_question, "visibility", "") or "").strip()
    if source_type != MasterQuestionSourceType.PLATFORM:
        return True
    if visibility == MasterQuestionVisibility.PRIVATE:
        return False
    return bool(
        find_matching_question_bank_packages_for_master_question(
            institute,
            master_question=master_question,
            at_time=at_time,
        )
    )


def record_institute_question_usage(
    *,
    institute,
    question_bank_package,
    action_type,
    effective_at=None,
    entitlement=None,
    master_question=None,
    question=None,
    exam=None,
    quantity=1,
    performed_by=None,
    metadata=None,
):
    performed_by_user = performed_by
    account_profile = getattr(performed_by_user, "account_profile", None)
    if account_profile is not None and getattr(account_profile, "user", None) is not None:
        performed_by_user = account_profile.user
    else:
        performed_by_user = getattr(performed_by_user, "user", performed_by_user)
    return InstituteQuestionUsageLedger.objects.create(
        institute=institute,
        question_bank_package=question_bank_package,
        entitlement=entitlement,
        action_type=action_type,
        master_question=master_question,
        question=question,
        exam=exam,
        quantity=quantity,
        performed_by=performed_by_user,
        effective_at=effective_at or timezone.now(),
        metadata=metadata or {},
    )


def record_master_question_link_usage(
    *,
    institute,
    master_question,
    question,
    performed_by=None,
    effective_at=None,
    metadata=None,
):
    existing_entry = InstituteQuestionUsageLedger.objects.filter(
        institute=institute,
        action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
        master_question=master_question,
        question=question,
        is_active=True,
    ).first()
    if existing_entry is not None:
        return existing_entry

    entitlement = resolve_question_bank_entitlement_for_master_question_use(
        institute,
        master_question=master_question,
        at_time=effective_at,
    )
    if entitlement is None:
        return None
    return record_institute_question_usage(
        institute=institute,
        question_bank_package=entitlement.question_bank_package,
        entitlement=entitlement,
        action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
        effective_at=effective_at,
        master_question=master_question,
        question=question,
        performed_by=performed_by,
        metadata=metadata or {},
    )


def record_exam_question_bank_usage(
    *,
    exam,
    action_type,
    performed_by=None,
    effective_at=None,
    metadata=None,
):
    supported_actions = {
        InstituteQuestionUsageActionType.EXAM_CREATED,
        InstituteQuestionUsageActionType.EXAM_PUBLISHED,
    }
    if action_type not in supported_actions:
        raise ValidationError({"action_type": "Unsupported exam usage action."})
    grouped_entries = group_exam_question_bank_usage_buckets(exam=exam)
    if not grouped_entries:
        return []

    recorded_entries = []
    for bucket in grouped_entries:
        performed_by_user = performed_by
        account_profile = getattr(performed_by_user, "account_profile", None)
        if account_profile is not None and getattr(account_profile, "user", None) is not None:
            performed_by_user = account_profile.user
        else:
            performed_by_user = getattr(performed_by_user, "user", performed_by_user)
        payload = {
            "question_ids": bucket["question_ids"],
            "master_question_ids": bucket["master_question_ids"],
            "linked_question_count": len(bucket["question_ids"]),
            **(metadata or {}),
        }
        existing_entry = InstituteQuestionUsageLedger.objects.filter(
            institute=exam.institute,
            question_bank_package=bucket["package"],
            entitlement=bucket["entitlement"],
            action_type=action_type,
            exam=exam,
            is_active=True,
        ).first()
        if existing_entry is not None:
            existing_entry.quantity = len(bucket["question_ids"])
            existing_entry.performed_by = performed_by_user
            existing_entry.effective_at = effective_at or existing_entry.effective_at
            existing_entry.metadata = payload
            existing_entry.save(update_fields=["quantity", "performed_by", "effective_at", "metadata", "updated_at"])
            recorded_entries.append(existing_entry)
            continue

        recorded_entries.append(
            record_institute_question_usage(
                institute=exam.institute,
                question_bank_package=bucket["package"],
                entitlement=bucket["entitlement"],
                action_type=action_type,
                effective_at=effective_at,
                exam=exam,
                quantity=len(bucket["question_ids"]),
                performed_by=performed_by_user,
                metadata=payload,
            )
        )

    return recorded_entries


@transaction.atomic
def grant_institute_question_bank_entitlement(
    *,
    institute,
    question_bank_package,
    granted_via=InstituteQuestionEntitlementGrantMode.ADMIN_GRANT,
    subscription_plan=None,
    subscription_plan_cycle=None,
    starts_at=None,
    ends_at=None,
    granted_by=None,
    notes="",
    metadata=None,
):
    live_statuses = [
        InstituteQuestionEntitlementStatus.DRAFT,
        InstituteQuestionEntitlementStatus.ACTIVE,
        InstituteQuestionEntitlementStatus.PAUSED,
    ]
    entitlement = (
        InstituteQuestionEntitlement.objects.select_for_update()
        .filter(
            institute=institute,
            question_bank_package=question_bank_package,
            status__in=live_statuses,
        )
        .first()
    )
    if entitlement is None:
        entitlement = InstituteQuestionEntitlement.objects.create(
            institute=institute,
            question_bank_package=question_bank_package,
            status=InstituteQuestionEntitlementStatus.ACTIVE,
            granted_via=granted_via,
            subscription_plan=subscription_plan,
            subscription_plan_cycle=subscription_plan_cycle,
            starts_at=starts_at,
            ends_at=ends_at,
            granted_by=granted_by,
            notes=notes,
            metadata=metadata or {},
        )
        record_institute_question_usage(
            institute=institute,
            question_bank_package=question_bank_package,
            entitlement=entitlement,
            action_type=InstituteQuestionUsageActionType.ENTITLEMENT_OVERRIDE,
            performed_by=granted_by,
            metadata={
                "operation": "grant_entitlement",
                "created": True,
                "granted_via": granted_via,
                **(metadata or {}),
            },
        )
        return entitlement, True

    entitlement.status = InstituteQuestionEntitlementStatus.ACTIVE
    entitlement.granted_via = granted_via
    entitlement.subscription_plan = subscription_plan
    entitlement.subscription_plan_cycle = subscription_plan_cycle
    entitlement.starts_at = starts_at
    entitlement.ends_at = ends_at
    if granted_by is not None:
        entitlement.granted_by = granted_by
    entitlement.revoked_by = None
    entitlement.notes = notes
    entitlement.metadata = metadata or {}
    entitlement.save()
    record_institute_question_usage(
        institute=institute,
        question_bank_package=question_bank_package,
        entitlement=entitlement,
        action_type=InstituteQuestionUsageActionType.ENTITLEMENT_OVERRIDE,
        performed_by=granted_by,
        metadata={
            "operation": "grant_entitlement",
            "created": False,
            "granted_via": granted_via,
            **(metadata or {}),
        },
    )
    return entitlement, False


@transaction.atomic
def update_institute_question_bank_entitlement_status(
    *,
    entitlement,
    status,
    changed_by=None,
    notes=None,
    starts_at=None,
    ends_at=None,
    starts_at_provided=False,
    ends_at_provided=False,
):
    previous_status = entitlement.status
    if starts_at_provided:
        entitlement.starts_at = starts_at
    if ends_at_provided:
        entitlement.ends_at = ends_at

    if entitlement.starts_at and entitlement.ends_at and entitlement.ends_at <= entitlement.starts_at:
        raise ValidationError("Entitlement end time must be later than the start time.")

    entitlement.status = status
    if notes is not None:
        entitlement.notes = notes

    if status == InstituteQuestionEntitlementStatus.REVOKED:
        entitlement.revoked_by = changed_by
        if not ends_at_provided and entitlement.ends_at is None:
            entitlement.ends_at = timezone.now()
    elif status == InstituteQuestionEntitlementStatus.ACTIVE:
        entitlement.revoked_by = None

    entitlement.save()
    record_institute_question_usage(
        institute=entitlement.institute,
        question_bank_package=entitlement.question_bank_package,
        entitlement=entitlement,
        action_type=InstituteQuestionUsageActionType.ENTITLEMENT_OVERRIDE,
        performed_by=changed_by,
        metadata={
            "operation": "status_change",
            "before_status": previous_status,
            "after_status": status,
        },
    )
    return entitlement


def group_exam_question_bank_usage_buckets(*, exam):
    from apps.exams.models import ExamQuestion

    exam_questions = list(
        ExamQuestion.objects.select_related("question")
        .filter(exam=exam, is_active=True, question__is_active=True)
        .order_by("question_order", "created_at")
    )
    if not exam_questions:
        return []

    question_ids = [exam_question.question_id for exam_question in exam_questions if exam_question.question_id]
    if not question_ids:
        return []

    link_entries = list(
        InstituteQuestionUsageLedger.objects.select_related(
            "question_bank_package",
            "entitlement",
            "master_question",
        )
        .filter(
            institute=exam.institute,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            question_id__in=question_ids,
            is_active=True,
        )
        .order_by("created_at")
    )
    if not link_entries:
        return []

    grouped_entries = {}
    for entry in link_entries:
        grouping_key = (
            str(entry.question_bank_package_id),
            str(entry.entitlement_id) if entry.entitlement_id else "",
        )
        bucket = grouped_entries.setdefault(
            grouping_key,
            {
                "package": entry.question_bank_package,
                "entitlement": entry.entitlement,
                "question_ids": [],
                "master_question_ids": [],
            },
        )
        if entry.question_id and str(entry.question_id) not in bucket["question_ids"]:
            bucket["question_ids"].append(str(entry.question_id))
        if entry.master_question_id and str(entry.master_question_id) not in bucket["master_question_ids"]:
            bucket["master_question_ids"].append(str(entry.master_question_id))

    return list(grouped_entries.values())


def get_entitlement_exam_publish_policy_summary(entitlement, *, current_exam=None):
    entitlement_metadata = entitlement.metadata or {}
    package_metadata = (entitlement.question_bank_package.metadata or {}) if entitlement.question_bank_package_id else {}
    configured_limit = _coerce_positive_int(
        entitlement_metadata.get("max_exam_publish_count")
        or package_metadata.get("max_exam_publish_count")
    )
    if configured_limit is None:
        return {
            "publish_limit_configured": False,
            "publish_limit_total": None,
            "publish_usage_count": 0,
            "publish_remaining_count": None,
            "publish_watch_state": "not_applicable",
        }

    usage_queryset = InstituteQuestionUsageLedger.objects.filter(
        institute=entitlement.institute,
        question_bank_package=entitlement.question_bank_package,
        entitlement=entitlement,
        action_type=InstituteQuestionUsageActionType.EXAM_PUBLISHED,
        exam__isnull=False,
        is_active=True,
    )
    if current_exam is not None:
        usage_queryset = usage_queryset.exclude(exam=current_exam)
    usage_count = usage_queryset.count()
    remaining_count = max(configured_limit - usage_count, 0)
    warning_threshold = _publish_warning_threshold_for_limit(
        entitlement=entitlement,
        limit_value=configured_limit,
    )

    watch_state = "healthy"
    if remaining_count <= 0:
        watch_state = "limit_reached"
    elif remaining_count <= warning_threshold:
        watch_state = "near_limit"

    return {
        "publish_limit_configured": True,
        "publish_limit_total": configured_limit,
        "publish_usage_count": usage_count,
        "publish_remaining_count": remaining_count,
        "publish_watch_state": watch_state,
    }


@transaction.atomic
def grant_institute_feature_entitlement(
    *,
    institute,
    feature_code,
    source_package=None,
    source_subscription_plan=None,
    starts_at=None,
    ends_at=None,
    metadata=None,
):
    normalized_code = str(feature_code or "").strip().upper()
    live_statuses = [
        InstituteQuestionEntitlementStatus.DRAFT,
        InstituteQuestionEntitlementStatus.ACTIVE,
        InstituteQuestionEntitlementStatus.PAUSED,
    ]
    entitlement = (
        InstituteQuestionFeatureEntitlement.objects.select_for_update()
        .filter(
            institute=institute,
            feature_code=normalized_code,
            status__in=live_statuses,
        )
        .first()
    )
    if entitlement is None:
        entitlement = InstituteQuestionFeatureEntitlement.objects.create(
            institute=institute,
            feature_code=normalized_code,
            status=InstituteQuestionEntitlementStatus.ACTIVE,
            source_package=source_package,
            source_subscription_plan=source_subscription_plan,
            starts_at=starts_at,
            ends_at=ends_at,
            metadata=metadata or {},
        )
        return entitlement, True

    entitlement.status = InstituteQuestionEntitlementStatus.ACTIVE
    entitlement.source_package = source_package
    entitlement.source_subscription_plan = source_subscription_plan
    entitlement.starts_at = starts_at
    entitlement.ends_at = ends_at
    entitlement.metadata = metadata or {}
    entitlement.save()
    return entitlement, False


@transaction.atomic
def update_institute_question_feature_entitlement_status(
    *,
    entitlement,
    status,
):
    if not isinstance(entitlement, InstituteQuestionFeatureEntitlement):
        entitlement = InstituteQuestionFeatureEntitlement.objects.select_for_update().get(pk=entitlement)
    else:
        entitlement = InstituteQuestionFeatureEntitlement.objects.select_for_update().get(pk=entitlement.pk)

    entitlement.status = status
    if status == InstituteQuestionEntitlementStatus.REVOKED:
        entitlement.ends_at = entitlement.ends_at or timezone.now()
    entitlement.save()
    return entitlement


@transaction.atomic
def apply_subscription_plan_question_bank_links_to_institute(
    *,
    subscription_plan,
    target_institute,
    grant_modes=None,
    granted_by=None,
    notes="",
    activation_context_metadata=None,
):
    if not isinstance(subscription_plan, SubscriptionPlan):
        subscription_plan = SubscriptionPlan.objects.select_for_update().get(pk=subscription_plan)
    else:
        subscription_plan = SubscriptionPlan.objects.select_for_update().get(pk=subscription_plan.pk)

    allowed_grant_modes = {str(mode or "").strip() for mode in (grant_modes or ("included", "trial"))}
    if not allowed_grant_modes:
        raise ValidationError({"grant_modes": "At least one grant mode must be provided."})

    active_links = list(
        SubscriptionPlanQuestionBankPackage.objects.select_related("question_bank_package")
        .filter(
            subscription_plan=subscription_plan,
            is_active=True,
            grant_mode__in=allowed_grant_modes,
        )
        .order_by("question_bank_package__sort_order", "question_bank_package__name")
    )

    entitlements = []
    for link in active_links:
        package = link.question_bank_package
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=target_institute,
            question_bank_package=package,
            granted_via=InstituteQuestionEntitlementGrantMode.SUBSCRIPTION,
            subscription_plan=subscription_plan,
            granted_by=granted_by,
            notes=notes or f"Applied from subscription plan {subscription_plan.code}.",
            metadata={
                "subscription_plan_id": str(subscription_plan.id),
                "subscription_plan_code": subscription_plan.code,
                "grant_mode": link.grant_mode,
                "is_default": link.is_default,
                "link_metadata": link.metadata or {},
                **(activation_context_metadata or {}),
            },
        )
        entitlements.append(entitlement)

    return entitlements


@transaction.atomic
def create_institute_subscription_request(
    *,
    institute,
    subscription_plan_cycle,
    requested_by=None,
    grant_modes=None,
    notes="",
    metadata=None,
):
    if not isinstance(subscription_plan_cycle, SubscriptionPlanCycle):
        subscription_plan_cycle = (
            SubscriptionPlanCycle.objects.select_related("plan", "institute")
            .filter(pk=subscription_plan_cycle, is_active=True)
            .first()
        )
    if subscription_plan_cycle is None:
        raise ValidationError({"subscription_plan_cycle": "Subscription cycle not found."})

    cycle_institute = subscription_plan_cycle.institute
    cycle_is_public_hub = bool((cycle_institute.metadata or {}).get("is_public_content_hub"))
    if subscription_plan_cycle.institute_id != institute.id and not cycle_is_public_hub:
        raise ValidationError(
            {"subscription_plan_cycle": "Subscription cycle must belong to the institute or the public hub."}
        )
    if not subscription_plan_cycle.plan.question_bank_package_links.filter(is_active=True).exists():
        raise ValidationError(
            {"subscription_plan_cycle": "Selected plan does not expose any active question-bank packages."}
        )

    normalized_grant_modes = [str(mode).strip() for mode in (grant_modes or ["included", "trial"]) if str(mode).strip()]
    active_package_links = list(
        subscription_plan_cycle.plan.question_bank_package_links.select_related("question_bank_package")
        .filter(is_active=True, grant_mode__in=normalized_grant_modes)
        .order_by("question_bank_package__sort_order", "question_bank_package__name")
    )
    pending_request = (
        InstituteSubscriptionRequest.objects.select_for_update()
        .filter(
            institute=institute,
            subscription_plan_cycle=subscription_plan_cycle,
            status=InstituteSubscriptionRequestStatus.PENDING,
            is_active=True,
        )
        .first()
    )
    if pending_request is not None:
        return pending_request, False

    request = InstituteSubscriptionRequest.objects.create(
        institute=institute,
        subscription_plan_cycle=subscription_plan_cycle,
        status=InstituteSubscriptionRequestStatus.PENDING,
        requested_by=requested_by,
        grant_modes=normalized_grant_modes,
        notes=notes,
        metadata={
            **(metadata or {}),
            "requested_package_codes": [link.question_bank_package.code for link in active_package_links],
            "requested_package_names": [link.question_bank_package.name for link in active_package_links],
            "requested_package_count": len(active_package_links),
            "subscription_plan_code": subscription_plan_cycle.plan.code,
        },
    )
    return request, True


@transaction.atomic
def review_institute_subscription_request(
    *,
    subscription_request,
    decision,
    reviewed_by=None,
    operator_notes="",
):
    if not isinstance(subscription_request, InstituteSubscriptionRequest):
        subscription_request = (
            InstituteSubscriptionRequest.objects.select_for_update()
            .select_related("institute", "subscription_plan_cycle", "subscription_plan_cycle__plan")
            .get(pk=subscription_request)
        )
    else:
        subscription_request = (
            InstituteSubscriptionRequest.objects.select_for_update()
            .select_related("institute", "subscription_plan_cycle", "subscription_plan_cycle__plan")
            .get(pk=subscription_request.pk)
        )

    if subscription_request.status != InstituteSubscriptionRequestStatus.PENDING:
        raise ValidationError({"subscription_request": "Only pending requests can be reviewed."})

    normalized_decision = str(decision or "").strip().lower()
    if normalized_decision not in {"approve", "reject"}:
        raise ValidationError({"decision": "Decision must be approve or reject."})

    subscription_request.reviewed_by = reviewed_by
    subscription_request.reviewed_at = timezone.now()
    subscription_request.operator_notes = operator_notes

    entitlements = []
    if normalized_decision == "approve":
        entitlements = apply_subscription_plan_question_bank_links_to_institute(
            subscription_plan=subscription_request.subscription_plan_cycle.plan,
            target_institute=subscription_request.institute,
            grant_modes=subscription_request.grant_modes or ["included", "trial"],
            granted_by=reviewed_by,
            notes=operator_notes or (
                f"Applied from institute request for {subscription_request.subscription_plan_cycle.plan.code}."
            ),
            activation_context_metadata={
                "subscription_request_id": str(subscription_request.id),
                "subscription_plan_cycle_id": str(subscription_request.subscription_plan_cycle_id),
                "review_decision": "approved",
                "reviewed_by_id": str(reviewed_by.id) if reviewed_by is not None else None,
            },
        )
        subscription_request.status = InstituteSubscriptionRequestStatus.FULFILLED
        merged_metadata = dict(subscription_request.metadata or {})
        merged_metadata.update(
            {
                "decision": "approved",
                "entitlement_count": len(entitlements),
                "entitlement_ids": [str(entitlement.id) for entitlement in entitlements],
                "question_bank_package_codes": [
                    entitlement.question_bank_package.code for entitlement in entitlements
                ],
                "question_bank_package_names": [
                    entitlement.question_bank_package.name for entitlement in entitlements
                ],
            }
        )
        subscription_request.metadata = merged_metadata
    else:
        subscription_request.status = InstituteSubscriptionRequestStatus.REJECTED
        merged_metadata = dict(subscription_request.metadata or {})
        merged_metadata["decision"] = "rejected"
        subscription_request.metadata = merged_metadata

    subscription_request.save()
    return subscription_request, entitlements


def active_student_entitlements(student, *, at_time=None):
    now = at_time or timezone.now()
    return StudentEntitlement.objects.filter(
        student=student,
        is_active=True,
        status="active",
    ).filter(
        Q(valid_from__isnull=True) | Q(valid_from__lte=now),
        Q(valid_until__isnull=True) | Q(valid_until__gte=now),
    )


def student_has_entitlement(student, entitlement_code, *, content_type=None, content_key=None, at_time=None):
    queryset = active_student_entitlements(student, at_time=at_time).filter(
        entitlement_code=entitlement_code
    )
    if content_type is not None and content_key is not None:
        queryset = queryset.filter(content_type=content_type, content_key=content_key)
    return queryset.exists()


def resolve_content_access_policy(*, student, content_type, content_key, subject=None):
    queryset = ContentAccessPolicy.objects.filter(
        institute=student.institute,
    ).filter(
        _content_target_query(content_type=content_type, content_key=content_key, subject=subject)
    )
    return _best_rule_match(queryset, subject=subject)


def _student_completion_count(student, *, subject=None):
    queryset = ExamResult.objects.filter(student=student, is_active=True)
    if subject is not None:
        queryset = queryset.filter(exam__subject=subject)
    return queryset.count()


def _student_best_percentage(student, *, subject=None):
    queryset = ExamResult.objects.filter(student=student, is_active=True)
    if subject is not None:
        queryset = queryset.filter(exam__subject=subject)
    best = queryset.order_by("-percentage").values_list("percentage", flat=True).first()
    return float(best or 0)


def evaluate_unlock_rule(*, student, rule):
    if rule.rule_type == UnlockRuleType.STARS_BALANCE:
        profile = get_or_create_student_economy_profile(student)
        required = int(rule.required_star_balance or 0)
        passed = profile.available_stars >= required
        return {
            "passed": passed,
            "reason_code": "" if passed else "insufficient_stars",
            "reason_message": "" if passed else f"{required} stars are required to unlock this content.",
        }

    if rule.rule_type == UnlockRuleType.ENTITLEMENT:
        passed = student_has_entitlement(
            student,
            rule.required_entitlement_code,
            content_type=rule.content_type,
            content_key=rule.content_key,
        )
        return {
            "passed": passed,
            "reason_code": "" if passed else "missing_entitlement",
            "reason_message": ""
            if passed
            else "An entitlement is required to unlock this content.",
        }

    if rule.rule_type == UnlockRuleType.EXAM_COMPLETION:
        required = int(rule.required_completion_count or 0)
        completed = _student_completion_count(student, subject=rule.subject)
        passed = completed >= required
        return {
            "passed": passed,
            "reason_code": "" if passed else "completion_requirement_not_met",
            "reason_message": ""
            if passed
            else f"Complete {required} qualifying tests to unlock this content.",
        }

    if rule.rule_type == UnlockRuleType.SCORE_THRESHOLD:
        required = float(rule.required_score_percentage or 0)
        achieved = _student_best_percentage(student, subject=rule.subject)
        passed = achieved >= required
        return {
            "passed": passed,
            "reason_code": "" if passed else "score_requirement_not_met",
            "reason_message": ""
            if passed
            else f"Reach at least {required:.0f}% in a qualifying test to unlock this content.",
        }

    if rule.rule_type == UnlockRuleType.ADMIN_APPROVAL:
        return {
            "passed": False,
            "reason_code": "admin_approval_required",
            "reason_message": "Admin approval is required to unlock this content.",
        }

    return {
        "passed": False,
        "reason_code": "composite_rule_not_implemented",
        "reason_message": "This unlock rule requires composite evaluation support.",
    }


@transaction.atomic
def evaluate_and_sync_unlock_state(*, student, content_type, content_key, subject=None, granted_by=None):
    profile = get_or_create_student_economy_profile(student)
    access_policy = resolve_content_access_policy(
        student=student,
        content_type=content_type,
        content_key=content_key,
        subject=subject,
    )
    unlock_rules = list(
        UnlockRule.objects.filter(
            institute=student.institute,
        ).filter(
            _content_target_query(content_type=content_type, content_key=content_key, subject=subject)
        ).order_by("priority", "created_at")
    )

    status = UnlockStateStatus.UNLOCKED
    reason_code = ""
    reason_message = ""

    if access_policy is not None:
        spend_unlock_entitlement = _derived_content_entitlement_code(
            content_type=content_type,
            content_key=content_key,
        )
        has_spend_unlock = student_has_entitlement(
            student,
            spend_unlock_entitlement,
            content_type=content_type,
            content_key=content_key,
        )

        if access_policy.policy_type == AccessPolicyType.STARS_ONLY:
            if not has_spend_unlock and profile.available_stars < access_policy.star_cost:
                status = UnlockStateStatus.LOCKED
                reason_code = "insufficient_stars"
                reason_message = (
                    f"{access_policy.star_cost} stars are required to access this content."
                )
        elif access_policy.policy_type == AccessPolicyType.ENTITLEMENT_ONLY:
            if not student_has_entitlement(
                student,
                access_policy.entitlement_code,
                content_type=content_type,
                content_key=content_key,
            ):
                status = UnlockStateStatus.LOCKED
                reason_code = "missing_entitlement"
                reason_message = "An entitlement is required to access this content."
        elif access_policy.policy_type == AccessPolicyType.STARS_OR_ENTITLEMENT:
            has_entitlement = student_has_entitlement(
                student,
                access_policy.entitlement_code,
                content_type=content_type,
                content_key=content_key,
            )
            if not has_entitlement and not has_spend_unlock and profile.available_stars < access_policy.star_cost:
                status = UnlockStateStatus.LOCKED
                reason_code = "insufficient_stars_or_entitlement"
                reason_message = (
                    f"Either {access_policy.star_cost} stars or a valid entitlement is required."
                )

    if status == UnlockStateStatus.UNLOCKED:
        for rule in unlock_rules:
            result = evaluate_unlock_rule(student=student, rule=rule)
            if not result["passed"]:
                status = UnlockStateStatus.LOCKED
                reason_code = result["reason_code"]
                reason_message = result["reason_message"]
                break

    unlock_state, _ = StudentUnlockState.objects.select_for_update().get_or_create(
        student=student,
        content_type=content_type,
        content_key=content_key,
        defaults={
            "institute": student.institute,
            "subject": subject,
            "content_label": access_policy.content_label if access_policy else "",
            "status": status,
            "lock_reason_code": reason_code,
            "lock_reason_message": reason_message,
            "last_evaluated_at": timezone.now(),
            "unlocked_at": timezone.now() if status == UnlockStateStatus.UNLOCKED else None,
            "granted_by": granted_by,
            "metadata": {},
        },
    )

    unlock_state.subject = subject
    if access_policy and access_policy.content_label:
        unlock_state.content_label = access_policy.content_label
    unlock_state.status = status
    unlock_state.lock_reason_code = reason_code
    unlock_state.lock_reason_message = reason_message
    unlock_state.last_evaluated_at = timezone.now()
    if status == UnlockStateStatus.UNLOCKED and unlock_state.unlocked_at is None:
        unlock_state.unlocked_at = timezone.now()
    if status == UnlockStateStatus.LOCKED:
        unlock_state.locked_at = timezone.now()
    if granted_by is not None:
        unlock_state.granted_by = granted_by
    unlock_state.save()

    return unlock_state


@transaction.atomic
def spend_stars_for_content(
    *,
    student,
    content_type,
    content_key,
    subject=None,
    created_by=None,
):
    if subject is not None and not isinstance(subject, Subject):
        subject = Subject.objects.filter(pk=subject).first()
        if subject is None:
            raise ValidationError({"subject": "Subject not found."})

    access_policy = resolve_content_access_policy(
        student=student,
        content_type=content_type,
        content_key=content_key,
        subject=subject,
    )
    if access_policy is None:
        raise ValidationError({"content": "No access policy is configured for this content."})

    profile = get_or_create_student_economy_profile(student)
    existing_unlock_state = StudentUnlockState.objects.filter(
        student=student,
        content_type=content_type,
        content_key=content_key,
        is_active=True,
    ).first()
    if existing_unlock_state and existing_unlock_state.status == UnlockStateStatus.UNLOCKED:
        return {
            "unlock_state": existing_unlock_state,
            "ledger_entry": None,
            "spent_stars": 0,
            "message": "Content is already unlocked.",
        }

    if access_policy.policy_type == AccessPolicyType.FREE:
        unlock_state = evaluate_and_sync_unlock_state(
            student=student,
            content_type=content_type,
            content_key=content_key,
            subject=subject,
            granted_by=created_by,
        )
        return {
            "unlock_state": unlock_state,
            "ledger_entry": None,
            "spent_stars": 0,
            "message": "Free content unlocked successfully.",
        }

    if access_policy.policy_type == AccessPolicyType.ENTITLEMENT_ONLY:
        raise ValidationError(
            {"content": "This content requires an entitlement and cannot be unlocked by spending stars."}
        )

    if access_policy.policy_type == AccessPolicyType.STARS_OR_ENTITLEMENT and student_has_entitlement(
        student,
        access_policy.entitlement_code,
        content_type=content_type,
        content_key=content_key,
    ):
        unlock_state = evaluate_and_sync_unlock_state(
            student=student,
            content_type=content_type,
            content_key=content_key,
            subject=subject,
            granted_by=created_by,
        )
        return {
            "unlock_state": unlock_state,
            "ledger_entry": None,
            "spent_stars": 0,
            "message": "Content unlocked through entitlement.",
        }

    cost = int(access_policy.star_cost or 0)
    if cost <= 0:
        raise ValidationError({"content": "This content is not configured for star spending."})
    if profile.available_stars < cost:
        raise ValidationError({"stars": f"{cost} stars are required to unlock this content."})

    ledger_entry = debit_stars(
        student=student,
        source_type="content_spend",
        reason=f"Unlocked {access_policy.content_label or content_key}",
        stars=cost,
        created_by=created_by,
        source_id=content_key,
        source_reference=content_type,
        metadata={
            "content_type": content_type,
            "content_key": content_key,
            "subject_id": str(subject.id) if subject else "",
        },
    )
    StudentEntitlement.objects.create(
        institute=student.institute,
        student=student,
        subject=subject,
        content_type=content_type,
        content_key=content_key,
        content_label=access_policy.content_label,
        entitlement_code=_derived_content_entitlement_code(
            content_type=content_type,
            content_key=content_key,
        ),
        status="active",
        source_type="content_spend",
        source_id=str(ledger_entry.id),
        granted_by=created_by,
    )
    unlock_state = evaluate_and_sync_unlock_state(
        student=student,
        content_type=content_type,
        content_key=content_key,
        subject=subject,
        granted_by=created_by,
    )
    unlock_state.status = UnlockStateStatus.UNLOCKED
    unlock_state.lock_reason_code = ""
    unlock_state.lock_reason_message = ""
    if unlock_state.unlocked_at is None:
        unlock_state.unlocked_at = timezone.now()
    unlock_state.save()

    return {
        "unlock_state": unlock_state,
        "ledger_entry": ledger_entry,
        "spent_stars": cost,
        "message": "Content unlocked successfully.",
    }
