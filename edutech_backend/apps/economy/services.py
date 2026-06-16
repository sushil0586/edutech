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
    LedgerEntryDirection,
    PaymentOrder,
    PaymentOrderStatus,
    PaymentTransaction,
    PaymentTransactionStatus,
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
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
    UnlockRule,
    UnlockRuleType,
    UnlockStateStatus,
)
from apps.academics.models import Subject
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
