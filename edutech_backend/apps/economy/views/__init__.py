import csv
from collections import defaultdict

from django.db import models
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import CanBuildExams, CanManageQuestionBank, IsPlatformAdmin, IsPlatformOrInstituteAdmin, IsStudent
from apps.accounts.scopes import (
    get_scoped_object_or_403,
    scope_exam_queryset,
    scope_queryset_for_institute,
    scope_student_profile_queryset,
    scope_student_queryset,
)
from apps.economy.models import (
    ContentAccessPolicy,
    InstituteQuestionEntitlement,
    InstituteQuestionUsageActionType,
    InstituteQuestionFeatureEntitlement,
    InstituteSubscriptionRequest,
    InstituteQuestionUsageLedger,
    PaymentOrder,
    QuestionBankPackage,
    QuestionBankPackageScope,
    ReferralProgram,
    RewardRule,
    StarLedger,
    StarPack,
    StudentRewardEvent,
    StudentSubscription,
    StudentEntitlement,
    StudentUnlockState,
    SubscriptionPlan,
    UnlockRule,
    UnlockRuleType,
    UnlockStateStatus,
)
from apps.economy.governance import (
    enforce_institute_admin_order_confirmation_policy,
    enforce_institute_admin_star_grant_policy,
    get_or_create_economy_operator_policy_config,
    get_economy_operator_policy,
)
from apps.exams.services import invalidate_exam_access_policy_cache
from apps.economy.serializers import (
    AdminApplySubscriptionPlanToInstituteSerializer,
    AdminContentAccessPolicySerializer,
    AdminInstituteQuestionEntitlementSerializer,
    AdminInstituteQuestionFeatureEntitlementCreateSerializer,
    AdminInstituteQuestionFeatureEntitlementSerializer,
    AdminInstituteQuestionFeatureEntitlementStatusUpdateSerializer,
    AdminInstituteQuestionEntitlementStatusUpdateSerializer,
    AdminQuestionBankPackageUpsertSerializer,
    CreateInstituteSubscriptionRequestSerializer,
    AdminInstituteQuestionUsageLedgerSerializer,
    AdminQuestionBankPackageSerializer,
    AdminRewardRuleSerializer,
    AdminReferralProgramSerializer,
    AdminStarPackSerializer,
    AdminSubscriptionPlanSerializer,
    AdminUnlockRuleSerializer,
    AdminGrantStarsSerializer,
    ConfirmPaymentOrderSerializer,
    CreateStarPackOrderSerializer,
    CreateSubscriptionOrderSerializer,
    EconomyCatalogItemStatusUpdateSerializer,
    EconomyPolicyAuditLogSerializer,
    EconomyOperatorPolicyConfigSerializer,
    InstituteRequestableSubscriptionPlanSerializer,
    InstituteSubscriptionRequestSerializer,
    PaymentOrderSerializer,
    PaymentTransactionSerializer,
    ReviewInstituteSubscriptionRequestSerializer,
    SpendStarsForContentSerializer,
    StarLedgerSerializer,
    StarPackSerializer,
    StudentRewardEventSerializer,
    StudentSubscriptionSerializer,
    StudentEconomyProfileSerializer,
    StudentUnlockStateSerializer,
    SubscriptionPlanSerializer,
)
from apps.economy.services import (
    apply_subscription_plan_question_bank_links_to_institute,
    complete_payment_order,
    create_star_pack_payment_order,
    create_subscription_payment_order,
    create_institute_subscription_request,
    get_entitlement_quota_summary,
    get_or_create_student_economy_profile,
    grant_admin_stars,
    grant_institute_feature_entitlement,
    invalidate_question_bank_package_entitlement_snapshots,
    list_active_star_packs,
    list_active_subscription_plans,
    list_requestable_subscription_plans_for_institute,
    list_student_payment_orders,
    list_student_subscriptions,
    package_scope_matches_master_question,
    review_institute_subscription_request,
    spend_stars_for_content,
    update_institute_question_feature_entitlement_status,
    update_institute_question_bank_entitlement_status,
)
from apps.question_bank.models import (
    MasterQuestion,
    MasterQuestionSourceType,
    MasterQuestionVisibility,
)
from apps.results.models import ExamResult
from apps.reports.models import AuditLog
from apps.students.models import StudentProfile
from apps.reports.services import create_audit_log
from common.responses import action_response


ECONOMY_CATALOG_MODEL_MAP = {
    "reward_rule": RewardRule,
    "referral_program": ReferralProgram,
    "star_pack": StarPack,
    "subscription_plan": SubscriptionPlan,
}


class EconomySchemaFallbackSerializer(serializers.Serializer):
    """Fallback schema hook for APIViews with action-specific response payloads."""


class EconomyAPIView(APIView):
    serializer_class = EconomySchemaFallbackSerializer


def _serialize_economy_catalog_item(item_type, obj):
    institute_name = getattr(getattr(obj, "institute", None), "name", "")
    payload = {
        "id": str(obj.id),
        "item_type": item_type,
        "name": getattr(obj, "name", ""),
        "is_active": obj.is_active,
        "updated_at": obj.updated_at,
        "institute": str(obj.institute_id) if getattr(obj, "institute_id", None) else None,
        "institute_name": institute_name,
        "code": "",
        "secondary_label": "",
        "metric_label": "",
    }

    if item_type == "reward_rule":
        payload["secondary_label"] = (
            f"{obj.rule_type.replace('_', ' ')}"
            + (f" · {obj.subject.name}" if obj.subject_id else "")
        )
        payload["metric_label"] = f"{obj.stars_awarded} stars"
    elif item_type == "referral_program":
        payload["secondary_label"] = f"{obj.reward_side.replace('_', ' ')} reward"
        payload["metric_label"] = f"{obj.referrer_stars}/{obj.referee_stars} stars"
    elif item_type == "star_pack":
        payload["code"] = obj.code
        payload["secondary_label"] = f"{obj.currency} {obj.price_amount}"
        payload["metric_label"] = f"{obj.stars_credited} stars"
    elif item_type == "subscription_plan":
        payload["code"] = obj.code
        active_cycles = [cycle for cycle in obj.cycles.all() if cycle.is_active]
        payload["secondary_label"] = (
            f"{len(active_cycles)} active cycle{'s' if len(active_cycles) != 1 else ''}"
        )
        if active_cycles:
            cheapest_cycle = min(active_cycles, key=lambda cycle: cycle.price_amount)
            payload["metric_label"] = f"from {cheapest_cycle.currency} {cheapest_cycle.price_amount}"
        else:
            payload["metric_label"] = "No active cycle"
    return payload


def _list_student_visible_exam_unlock_targets(student):
    from apps.exams.models import Exam
    from apps.exams.services import EXAM_CONTENT_TYPE, is_exam_assigned_to_student

    targeted_exam_keys = set(
        ContentAccessPolicy.objects.filter(
            institute=student.institute,
            content_type=EXAM_CONTENT_TYPE,
            is_active=True,
        ).values_list("content_key", flat=True)
    )
    targeted_exam_keys.update(
        UnlockRule.objects.filter(
            institute=student.institute,
            content_type=EXAM_CONTENT_TYPE,
            is_active=True,
        ).values_list("content_key", flat=True)
    )
    if not targeted_exam_keys:
        return []

    student_account = getattr(getattr(student, "account_profile", None), "user", None)
    if student_account is not None:
        visible_exams = scope_exam_queryset(
            Exam.objects.filter(institute=student.institute).select_related("subject", "cohort"),
            student_account,
        )
    else:
        visible_exams = Exam.objects.filter(
            institute=student.institute,
            is_active=True,
            program_id=student.program_id,
        ).select_related("subject", "cohort")
        if student.cohort_id:
            visible_exams = visible_exams.filter(
                models.Q(cohort_id=student.cohort_id) | models.Q(cohort__isnull=True)
            )

    targets = []
    for exam in visible_exams:
        if str(exam.id) not in targeted_exam_keys:
            continue
        if not is_exam_assigned_to_student(exam, student):
            continue
        targets.append(
            {
                "content_type": EXAM_CONTENT_TYPE,
                "content_key": str(exam.id),
                "subject": getattr(exam, "subject", None),
            }
        )
    return targets


def _match_best_access_policy(candidates, *, subject):
    subject_id = getattr(subject, "id", None)
    if subject_id is not None:
        for policy in candidates:
            if policy.subject_id == subject_id:
                return policy
    for policy in candidates:
        if policy.subject_id is None:
            return policy
    return None


def _matching_unlock_rules(candidates, *, subject):
    subject_id = getattr(subject, "id", None)
    if subject_id is None:
        return [rule for rule in candidates if rule.subject_id is None]
    return [rule for rule in candidates if rule.subject_id is None or rule.subject_id == subject_id]


def _active_student_entitlement_lookup(student):
    now = timezone.now()
    return set(
        StudentEntitlement.objects.filter(
            student=student,
            is_active=True,
            status="active",
        )
        .filter(
            models.Q(valid_from__isnull=True) | models.Q(valid_from__lte=now),
            models.Q(valid_until__isnull=True) | models.Q(valid_until__gte=now),
        )
        .values_list("entitlement_code", "content_type", "content_key")
    )


def _student_completion_count_cached(student, *, subject, cache):
    subject_id = getattr(subject, "id", None)
    if subject_id not in cache:
        queryset = ExamResult.objects.filter(student=student, is_active=True)
        if subject_id is not None:
            queryset = queryset.filter(exam__subject=subject)
        cache[subject_id] = queryset.count()
    return cache[subject_id]


def _student_best_percentage_cached(student, *, subject, cache):
    subject_id = getattr(subject, "id", None)
    if subject_id not in cache:
        queryset = ExamResult.objects.filter(student=student, is_active=True)
        if subject_id is not None:
            queryset = queryset.filter(exam__subject=subject)
        best = queryset.order_by("-percentage").values_list("percentage", flat=True).first()
        cache[subject_id] = float(best or 0)
    return cache[subject_id]


def _refresh_student_unlock_states_bulk(*, student, candidate_targets, granted_by=None):
    if not candidate_targets:
        return []

    target_keys = {(item["content_type"], item["content_key"]) for item in candidate_targets}
    content_types = {item[0] for item in target_keys}
    content_keys = {item[1] for item in target_keys}

    access_policy_rows = (
        ContentAccessPolicy.objects.filter(
            institute=student.institute,
            is_active=True,
            content_type__in=content_types,
            content_key__in=content_keys,
        )
        .select_related("subject")
        .order_by("priority", "created_at")
    )
    unlock_rule_rows = (
        UnlockRule.objects.filter(
            institute=student.institute,
            is_active=True,
            content_type__in=content_types,
            content_key__in=content_keys,
        )
        .select_related("subject")
        .order_by("priority", "created_at")
    )
    policies_by_target = defaultdict(list)
    rules_by_target = defaultdict(list)
    for policy in access_policy_rows:
        policies_by_target[(policy.content_type, policy.content_key)].append(policy)
    for rule in unlock_rule_rows:
        rules_by_target[(rule.content_type, rule.content_key)].append(rule)

    existing_states = {
        (state.content_type, state.content_key): state
        for state in StudentUnlockState.objects.filter(student=student, is_active=True).select_related("subject")
    }
    entitlement_lookup = _active_student_entitlement_lookup(student)
    completion_count_cache = {}
    best_percentage_cache = {}
    profile = get_or_create_student_economy_profile(student)
    refreshed_states = []

    for target in candidate_targets:
        content_type = target["content_type"]
        content_key = target["content_key"]
        subject = target["subject"]
        access_policy = _match_best_access_policy(
            policies_by_target.get((content_type, content_key), []),
            subject=subject,
        )
        unlock_rules = _matching_unlock_rules(
            rules_by_target.get((content_type, content_key), []),
            subject=subject,
        )

        status_value = UnlockStateStatus.UNLOCKED
        reason_code = ""
        reason_message = ""

        if access_policy is not None:
            spend_unlock_code = f"unlock:{content_type}:{content_key}"
            has_spend_unlock = (spend_unlock_code, content_type, content_key) in entitlement_lookup

            if access_policy.policy_type == "stars_only":
                if not has_spend_unlock and profile.available_stars < access_policy.star_cost:
                    status_value = UnlockStateStatus.LOCKED
                    reason_code = "insufficient_stars"
                    reason_message = f"{access_policy.star_cost} stars are required to access this content."
            elif access_policy.policy_type == "entitlement_only":
                has_entitlement = (
                    access_policy.entitlement_code,
                    content_type,
                    content_key,
                ) in entitlement_lookup
                if not has_entitlement:
                    status_value = UnlockStateStatus.LOCKED
                    reason_code = "missing_entitlement"
                    reason_message = "An entitlement is required to access this content."
            elif access_policy.policy_type == "stars_or_entitlement":
                has_entitlement = (
                    access_policy.entitlement_code,
                    content_type,
                    content_key,
                ) in entitlement_lookup
                if not has_entitlement and not has_spend_unlock and profile.available_stars < access_policy.star_cost:
                    status_value = UnlockStateStatus.LOCKED
                    reason_code = "insufficient_stars_or_entitlement"
                    reason_message = f"Either {access_policy.star_cost} stars or a valid entitlement is required."

        if status_value == UnlockStateStatus.UNLOCKED:
            for rule in unlock_rules:
                passed = True
                if rule.rule_type == UnlockRuleType.STARS_BALANCE:
                    required = int(rule.required_star_balance or 0)
                    passed = profile.available_stars >= required
                    if not passed:
                        reason_code = "insufficient_stars"
                        reason_message = f"{required} stars are required to unlock this content."
                elif rule.rule_type == UnlockRuleType.ENTITLEMENT:
                    passed = (rule.required_entitlement_code, rule.content_type, rule.content_key) in entitlement_lookup
                    if not passed:
                        reason_code = "missing_entitlement"
                        reason_message = "An entitlement is required to unlock this content."
                elif rule.rule_type == UnlockRuleType.EXAM_COMPLETION:
                    required = int(rule.required_completion_count or 0)
                    completed = _student_completion_count_cached(
                        student,
                        subject=rule.subject,
                        cache=completion_count_cache,
                    )
                    passed = completed >= required
                    if not passed:
                        reason_code = "completion_requirement_not_met"
                        reason_message = f"Complete {required} qualifying tests to unlock this content."
                elif rule.rule_type == UnlockRuleType.SCORE_THRESHOLD:
                    required = float(rule.required_score_percentage or 0)
                    achieved = _student_best_percentage_cached(
                        student,
                        subject=rule.subject,
                        cache=best_percentage_cache,
                    )
                    passed = achieved >= required
                    if not passed:
                        reason_code = "score_requirement_not_met"
                        reason_message = f"Score at least {required:g}% in a qualifying test to unlock this content."

                if not passed:
                    status_value = UnlockStateStatus.LOCKED
                    break

        unlock_state = existing_states.get((content_type, content_key))
        if unlock_state is None:
            unlock_state = StudentUnlockState(
                institute=student.institute,
                student=student,
                content_type=content_type,
                content_key=content_key,
                metadata={},
            )
            existing_states[(content_type, content_key)] = unlock_state

        unlock_state.subject = subject
        if access_policy is not None and access_policy.content_label:
            unlock_state.content_label = access_policy.content_label
        unlock_state.status = status_value
        unlock_state.lock_reason_code = reason_code
        unlock_state.lock_reason_message = reason_message
        unlock_state.last_evaluated_at = timezone.now()
        if status_value == UnlockStateStatus.UNLOCKED and unlock_state.unlocked_at is None:
            unlock_state.unlocked_at = timezone.now()
        if status_value == UnlockStateStatus.LOCKED:
            unlock_state.locked_at = timezone.now()
        if granted_by is not None:
            unlock_state.granted_by = granted_by
        unlock_state.save()
        refreshed_states.append(unlock_state)

    return refreshed_states


def _economy_catalog_group_payload(*, item_type, queryset):
    model = ECONOMY_CATALOG_MODEL_MAP[item_type]
    total = model.objects.count()
    active = model.objects.filter(is_active=True).count()
    return {
        "item_type": item_type,
        "total": total,
        "active": active,
        "inactive": total - active,
        "items": [_serialize_economy_catalog_item(item_type, item) for item in queryset],
    }


def _serialize_audit_value(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _question_bank_package_report_rows(*, packages, entitlements, usage_entries):
    entitlement_groups = defaultdict(list)
    for entitlement in entitlements:
        entitlement_groups[str(entitlement.question_bank_package_id)].append(entitlement)

    usage_groups = defaultdict(list)
    for entry in usage_entries:
        if entry.question_bank_package_id:
            usage_groups[str(entry.question_bank_package_id)].append(entry)

    rows = []
    for package in packages:
        package_id = str(package.id)
        package_entitlements = entitlement_groups.get(package_id, [])
        package_usage_entries = usage_groups.get(package_id, [])
        active_scopes = [scope for scope in package.scopes.all() if scope.is_active]
        subject_labels = sorted({scope.subject.name for scope in active_scopes if scope.subject_id})
        topic_labels = sorted({scope.topic.name for scope in active_scopes if scope.topic_id})
        program_labels = sorted({scope.program.name for scope in active_scopes if scope.program_id})

        usage_by_action = defaultdict(int)
        for entry in package_usage_entries:
            usage_by_action[str(entry.action_type or "").strip() or "unknown"] += entry.quantity or 0

        active_count = sum(1 for entitlement in package_entitlements if entitlement.status == "active")
        paused_count = sum(1 for entitlement in package_entitlements if entitlement.status == "paused")
        revoked_count = sum(1 for entitlement in package_entitlements if entitlement.status == "revoked")
        expired_count = sum(1 for entitlement in package_entitlements if entitlement.status == "expired")
        near_limit_count = 0
        limit_reached_count = 0
        for entitlement in package_entitlements:
            quota_summary = get_entitlement_quota_summary(entitlement)
            if quota_summary["quota_watch_state"] == "near_limit":
                near_limit_count += 1
            elif quota_summary["quota_watch_state"] == "limit_reached":
                limit_reached_count += 1

        rows.append(
            {
                "package_id": package_id,
                "package_code": package.code,
                "package_name": package.name,
                "owner_institute_code": package.institute.code,
                "owner_institute_name": package.institute.name,
                "package_type": package.package_type,
                "ownership_type": package.ownership_type,
                "access_mode": package.access_mode,
                "is_public_catalog": package.is_public_catalog,
                "scope_count": len(active_scopes),
                "program_labels": program_labels,
                "subject_labels": subject_labels,
                "topic_labels": topic_labels,
                "linked_plan_count": len([link for link in package.subscription_plan_links.all() if link.is_active]),
                "entitlement_total": len(package_entitlements),
                "entitlement_active": active_count,
                "entitlement_paused": paused_count,
                "entitlement_revoked": revoked_count,
                "entitlement_expired": expired_count,
                "entitlement_near_limit": near_limit_count,
                "entitlement_limit_reached": limit_reached_count,
                "usage_total_units": sum(entry.quantity or 0 for entry in package_usage_entries),
                "usage_question_linked": usage_by_action["question_linked"],
                "usage_exam_created": usage_by_action["exam_created"],
                "usage_exam_published": usage_by_action["exam_published"],
                "usage_entitlement_override": usage_by_action["entitlement_override"],
                "usage_question_unlinked": usage_by_action["question_unlinked"],
                "usage_question_materialized": usage_by_action["question_materialized"],
            }
        )

    return rows


def _build_question_bank_entitlement_visibility_audit(*, entitlement):
    active_scopes = [
        scope
        for scope in entitlement.question_bank_package.scopes.all()
        if scope.is_active
    ]
    if not active_scopes:
        return {
            "expected_master_question_total": 0,
            "linked_master_question_total": 0,
            "missing_linked_master_question_total": 0,
            "subject_breakdown": [],
        }

    candidate_questions = (
        MasterQuestion.objects.select_related(
            "source_program",
            "source_subject",
            "source_topic",
        )
        .filter(
            source_type=MasterQuestionSourceType.PLATFORM,
            is_active=True,
        )
        .exclude(visibility=MasterQuestionVisibility.PRIVATE)
    )

    expected_question_ids: set[str] = set()
    subject_buckets: dict[str, dict[str, object]] = {}

    for question in candidate_questions.iterator():
        if not any(
            package_scope_matches_master_question(scope=scope, master_question=question)
            for scope in active_scopes
        ):
            continue

        question_id = str(question.id)
        expected_question_ids.add(question_id)

        subject_key = str(question.source_subject_id)
        if subject_key not in subject_buckets:
            subject_buckets[subject_key] = {
                "subject_id": subject_key,
                "subject_code": question.source_subject.code,
                "subject_name": question.source_subject.name,
                "question_ids": set(),
                "topic_labels": set(),
            }

        subject_buckets[subject_key]["question_ids"].add(question_id)
        if question.source_topic_id:
            subject_buckets[subject_key]["topic_labels"].add(question.source_topic.name)

    linked_question_ids = {
        str(question_id)
        for question_id in InstituteQuestionUsageLedger.objects.filter(
            institute=entitlement.institute,
            question_bank_package=entitlement.question_bank_package,
            entitlement=entitlement,
            is_active=True,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            master_question__isnull=False,
        )
        .values_list("master_question_id", flat=True)
        .distinct()
    }

    linked_relevant_question_ids = expected_question_ids & linked_question_ids
    subject_breakdown = []
    for bucket in sorted(
        subject_buckets.values(),
        key=lambda item: (
            -len(item["question_ids"]),
            str(item["subject_name"]).lower(),
        ),
    ):
        subject_question_ids = bucket["question_ids"]
        linked_subject_ids = subject_question_ids & linked_relevant_question_ids
        expected_count = len(subject_question_ids)
        linked_count = len(linked_subject_ids)
        subject_breakdown.append(
            {
                "subject_id": bucket["subject_id"],
                "subject_code": bucket["subject_code"],
                "subject_name": bucket["subject_name"],
                "expected_master_question_total": expected_count,
                "linked_master_question_total": linked_count,
                "missing_linked_master_question_total": max(expected_count - linked_count, 0),
                "topic_count": len(bucket["topic_labels"]),
                "topic_labels": sorted(bucket["topic_labels"]),
            }
        )

    expected_total = len(expected_question_ids)
    linked_total = len(linked_relevant_question_ids)
    return {
        "expected_master_question_total": expected_total,
        "linked_master_question_total": linked_total,
        "missing_linked_master_question_total": max(expected_total - linked_total, 0),
        "subject_breakdown": subject_breakdown,
    }


def _question_bank_package_report_csv_response(*, rows):
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="question-bank-package-report.csv"'
    writer = csv.writer(response)
    writer.writerow(
        [
            "package_code",
            "package_name",
            "owner_institute_code",
            "owner_institute_name",
            "package_type",
            "ownership_type",
            "access_mode",
            "is_public_catalog",
            "scope_count",
            "program_labels",
            "subject_labels",
            "topic_labels",
            "linked_plan_count",
            "entitlement_total",
            "entitlement_active",
            "entitlement_paused",
            "entitlement_revoked",
            "entitlement_expired",
            "entitlement_near_limit",
            "entitlement_limit_reached",
            "usage_total_units",
            "usage_question_linked",
            "usage_exam_created",
            "usage_exam_published",
            "usage_entitlement_override",
            "usage_question_unlinked",
            "usage_question_materialized",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row["package_code"],
                row["package_name"],
                row["owner_institute_code"],
                row["owner_institute_name"],
                row["package_type"],
                row["ownership_type"],
                row["access_mode"],
                "yes" if row["is_public_catalog"] else "no",
                row["scope_count"],
                " | ".join(row["program_labels"]),
                " | ".join(row["subject_labels"]),
                " | ".join(row["topic_labels"]),
                row["linked_plan_count"],
                row["entitlement_total"],
                row["entitlement_active"],
                row["entitlement_paused"],
                row["entitlement_revoked"],
                row["entitlement_expired"],
                row["entitlement_near_limit"],
                row["entitlement_limit_reached"],
                row["usage_total_units"],
                row["usage_question_linked"],
                row["usage_exam_created"],
                row["usage_exam_published"],
                row["usage_entitlement_override"],
                row["usage_question_unlinked"],
                row["usage_question_materialized"],
            ]
        )
    return response


class StudentWalletView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        profile = get_or_create_student_economy_profile(student)
        return Response(
            StudentEconomyProfileSerializer(profile).data,
            status=status.HTTP_200_OK,
        )


class StudentLedgerView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        queryset = (
            scope_student_queryset(
                StarLedger.objects.select_related("student", "created_by"),
                request.user,
            )
            .filter(is_active=True)
            .order_by("-effective_at", "-created_at")
        )
        return Response(StarLedgerSerializer(queryset, many=True).data, status=status.HTTP_200_OK)


class StudentRewardEventListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        queryset = (
            scope_student_queryset(
                StudentRewardEvent.objects.select_related(
                    "student",
                    "reward_rule",
                    "ledger_entry",
                    "ledger_entry__created_by",
                ),
                request.user,
            )
            .filter(is_active=True)
            .order_by("-processed_at", "-created_at")
        )
        return Response(
            StudentRewardEventSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentUnlockStateListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        queryset = (
            scope_student_queryset(
                StudentUnlockState.objects.select_related("student", "subject", "granted_by"),
                request.user,
            )
            .filter(is_active=True)
            .order_by("content_type", "content_key")
        )
        return Response(
            StudentUnlockStateSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentStarPackListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        queryset = list_active_star_packs(institute=student.institute)
        return Response(StarPackSerializer(queryset, many=True).data, status=status.HTTP_200_OK)


class StudentSubscriptionPlanListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        queryset = list_active_subscription_plans(institute=student.institute)
        return Response(
            SubscriptionPlanSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentPaymentOrderListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        queryset = list_student_payment_orders(student=student)
        return Response(
            PaymentOrderSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentSubscriptionListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        queryset = list_student_subscriptions(student=student)
        return Response(
            StudentSubscriptionSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentCreateStarPackOrderView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = CreateStarPackOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = request.user.account_profile.student_profile
        payment_order = create_star_pack_payment_order(
            student=student,
            star_pack=serializer.validated_data["star_pack"],
            provider_name=serializer.validated_data["provider_name"],
            provider_order_reference=serializer.validated_data["provider_order_reference"],
            metadata=serializer.validated_data.get("metadata") or {},
        )
        return action_response(
            data=PaymentOrderSerializer(payment_order).data,
            message="Star pack payment order created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class StudentCreateSubscriptionOrderView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = CreateSubscriptionOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = request.user.account_profile.student_profile
        payment_order = create_subscription_payment_order(
            student=student,
            plan_cycle=serializer.validated_data["subscription_plan_cycle"],
            provider_name=serializer.validated_data["provider_name"],
            provider_order_reference=serializer.validated_data["provider_order_reference"],
            metadata=serializer.validated_data.get("metadata") or {},
        )
        return action_response(
            data=PaymentOrderSerializer(payment_order).data,
            message="Subscription payment order created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class StudentSpendStarsView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = SpendStarsForContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = request.user.account_profile.student_profile
        result = spend_stars_for_content(
            student=student,
            content_type=serializer.validated_data["content_type"],
            content_key=serializer.validated_data["content_key"],
            subject=serializer.validated_data.get("subject"),
            created_by=request.user,
        )

        return action_response(
            data={
                "spent_stars": result["spent_stars"],
                "message": result["message"],
                "ledger_entry": (
                    StarLedgerSerializer(result["ledger_entry"]).data
                    if result["ledger_entry"] is not None
                    else None
                ),
                "unlock_state": StudentUnlockStateSerializer(result["unlock_state"]).data,
            },
            message=result["message"],
            status_code=status.HTTP_200_OK,
        )


class AdminGrantStarsView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def post(self, request):
        serializer = AdminGrantStarsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enforce_institute_admin_star_grant_policy(
            user=request.user,
            stars=serializer.validated_data["stars"],
        )

        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute", "program"),
                request.user,
            ),
            user=request.user,
            value=serializer.validated_data["student"],
            not_found_message="Student not found in your scope.",
        )

        ledger_entry = grant_admin_stars(
            student=student,
            stars=serializer.validated_data["stars"],
            reason=serializer.validated_data["reason"],
            created_by=request.user,
            source_reference=serializer.validated_data["source_reference"],
            metadata={"trigger": "admin_grant"},
        )

        return action_response(
            data=StarLedgerSerializer(ledger_entry).data,
            message="Stars granted successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminEconomyPolicyView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request):
        return Response(get_economy_operator_policy(user=request.user), status=status.HTTP_200_OK)


class AdminEconomyPolicyConfigView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        config_object = get_or_create_economy_operator_policy_config()
        return Response(
            EconomyOperatorPolicyConfigSerializer(config_object).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        config_object = get_or_create_economy_operator_policy_config()
        previous_state = {
            "institute_admin_can_confirm_orders": config_object.institute_admin_can_confirm_orders,
            "institute_admin_max_confirm_order_amount": str(config_object.institute_admin_max_confirm_order_amount),
            "institute_admin_confirm_order_currency": config_object.institute_admin_confirm_order_currency,
            "institute_admin_can_grant_stars": config_object.institute_admin_can_grant_stars,
            "institute_admin_max_grant_stars": config_object.institute_admin_max_grant_stars,
            "platform_catalog_governance_scope": config_object.platform_catalog_governance_scope,
            "institute_catalog_governance_scope": config_object.institute_catalog_governance_scope,
            "platform_support_scope": config_object.platform_support_scope,
            "institute_support_scope": config_object.institute_support_scope,
        }
        serializer = EconomyOperatorPolicyConfigSerializer(
            config_object,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_policy_update",
            entity_type="economy_operator_policy_config",
            entity_id=config_object.id,
            message="Economy operator policy updated.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=serializer.data,
            message="Economy operator policy updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminEconomyPolicyAuditListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        config_object = get_or_create_economy_operator_policy_config()
        queryset = (
            AuditLog.objects.filter(
                entity_type="economy_operator_policy_config",
                entity_id=str(config_object.id),
                is_active=True,
            )
            .select_related("user")
            .order_by("-created_at")[:20]
        )
        return Response(
            EconomyPolicyAuditLogSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminEconomyCatalogOverviewView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        reward_rules = RewardRule.objects.select_related("institute", "subject").order_by(
            "institute__name",
            "priority",
            "name",
        )[:8]
        referral_programs = ReferralProgram.objects.select_related("institute").order_by(
            "institute__name",
            "name",
        )[:8]
        star_packs = StarPack.objects.select_related("institute").order_by(
            "institute__name",
            "sort_order",
            "price_amount",
            "name",
        )[:8]
        subscription_plans = SubscriptionPlan.objects.select_related("institute").prefetch_related(
            "cycles",
        ).order_by("institute__name", "name")[:8]

        return Response(
            {
                "reward_rules": _economy_catalog_group_payload(
                    item_type="reward_rule",
                    queryset=reward_rules,
                ),
                "referral_programs": _economy_catalog_group_payload(
                    item_type="referral_program",
                    queryset=referral_programs,
                ),
                "star_packs": _economy_catalog_group_payload(
                    item_type="star_pack",
                    queryset=star_packs,
                ),
                "subscription_plans": _economy_catalog_group_payload(
                    item_type="subscription_plan",
                    queryset=subscription_plans,
                ),
            },
            status=status.HTTP_200_OK,
        )


class AdminEconomyCatalogItemStatusView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, item_type, item_id):
        model = ECONOMY_CATALOG_MODEL_MAP.get(item_type)
        if model is None:
            return Response(
                {"detail": "Unsupported economy catalog item type."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EconomyCatalogItemStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance = get_scoped_object_or_403(
            model.objects.select_related("institute"),
            user=request.user,
            value=item_id,
            not_found_message="Economy catalog item not found.",
        )
        previous_state = instance.is_active
        instance.is_active = serializer.validated_data["is_active"]
        instance.save(update_fields=["is_active", "updated_at"])

        create_audit_log(
            user=request.user,
            action="economy_catalog_item_status_update",
            entity_type=item_type,
            entity_id=instance.id,
            message=f"Economy catalog item status updated for {instance.name}.",
            metadata={
                "before": {"is_active": previous_state},
                "after": {"is_active": instance.is_active},
                "item_name": instance.name,
            },
            request=request,
        )

        return action_response(
            data=_serialize_economy_catalog_item(item_type, instance),
            message="Economy catalog item status updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminQuestionBankPackageListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    @extend_schema(operation_id="v1_economy_admin_question_bank_packages_list")
    def get(self, request):
        compact = str(request.query_params.get("compact", "")).lower() in {"1", "true", "yes"}
        queryset = QuestionBankPackage.objects.select_related("institute").prefetch_related(
            "scopes__program",
            "scopes__subject",
            "scopes__topic",
            "institute_entitlements",
            "subscription_plan_links",
        )
        if not compact:
            queryset = queryset.prefetch_related("usage_entries")
        queryset = queryset.order_by("institute__name", "sort_order", "name")
        return Response(
            AdminQuestionBankPackageSerializer(
                queryset,
                many=True,
                context={"include_scopes": not compact},
            ).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminQuestionBankPackageUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        refreshed_instance = (
            QuestionBankPackage.objects.select_related("institute")
            .prefetch_related(
                "scopes__program",
                "scopes__subject",
                "scopes__topic",
                "institute_entitlements",
                "subscription_plan_links",
                "usage_entries",
            )
            .get(pk=instance.pk)
        )
        create_audit_log(
            user=request.user,
            action="economy_question_bank_package_create",
            entity_type="question_bank_package",
            entity_id=refreshed_instance.id,
            message=f"Question bank package created: {refreshed_instance.name}.",
            metadata={
                "package_code": refreshed_instance.code,
                "package_type": refreshed_instance.package_type,
                "ownership_type": refreshed_instance.ownership_type,
                "scope_count": len([scope for scope in refreshed_instance.scopes.all() if scope.is_active]),
            },
            request=request,
        )
        return action_response(
            data=AdminQuestionBankPackageSerializer(refreshed_instance).data,
            message="Question bank package created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminQuestionBankPackageDetailView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    @extend_schema(operation_id="v1_economy_admin_question_bank_packages_detail")
    def get(self, request, package_id):
        instance = get_scoped_object_or_403(
            QuestionBankPackage.objects.select_related("institute").prefetch_related(
                "scopes__program",
                "scopes__subject",
                "scopes__topic",
                "institute_entitlements",
                "subscription_plan_links",
                "usage_entries",
            ),
            user=request.user,
            value=package_id,
            not_found_message="Question bank package not found.",
        )
        return action_response(
            message="Question bank package detail loaded successfully.",
            data=AdminQuestionBankPackageSerializer(instance).data,
            status_code=status.HTTP_200_OK,
        )

    def patch(self, request, package_id):
        instance = get_scoped_object_or_403(
            QuestionBankPackage.objects.select_related("institute").prefetch_related(
                "scopes__program",
                "scopes__subject",
                "scopes__topic",
                "institute_entitlements",
                "subscription_plan_links",
                "usage_entries",
            ),
            user=request.user,
            value=package_id,
            not_found_message="Question bank package not found.",
        )
        previous_state = {
            "name": instance.name,
            "code": instance.code,
            "description": instance.description,
            "package_type": instance.package_type,
            "ownership_type": instance.ownership_type,
            "access_mode": instance.access_mode,
            "is_public_catalog": instance.is_public_catalog,
            "sort_order": instance.sort_order,
            "is_active": instance.is_active,
            "scope_count": len([scope for scope in instance.scopes.all() if scope.is_active]),
        }
        serializer = AdminQuestionBankPackageUpsertSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        refreshed_instance = (
            QuestionBankPackage.objects.select_related("institute")
            .prefetch_related(
                "scopes__program",
                "scopes__subject",
                "scopes__topic",
                "institute_entitlements",
                "subscription_plan_links",
                "usage_entries",
            )
            .get(pk=updated_instance.pk)
        )
        current_scope_count = len([scope for scope in refreshed_instance.scopes.all() if scope.is_active])
        invalidate_question_bank_package_entitlement_snapshots(question_bank_package=refreshed_instance)
        create_audit_log(
            user=request.user,
            action="economy_question_bank_package_update",
            entity_type="question_bank_package",
            entity_id=refreshed_instance.id,
            message=f"Question bank package updated: {refreshed_instance.name}.",
            metadata={
                "changed_fields": {
                    key: {
                        "before": previous_state[key],
                        "after": (
                            current_scope_count
                            if key == "scope_count"
                            else getattr(refreshed_instance, key)
                        ),
                    }
                    for key in previous_state
                }
            },
            request=request,
        )
        return action_response(
            data=AdminQuestionBankPackageSerializer(refreshed_instance).data,
            message="Question bank package updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminInstituteQuestionEntitlementListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    @extend_schema(operation_id="v1_economy_admin_question_bank_entitlements_list")
    def get(self, request):
        queryset = (
            InstituteQuestionEntitlement.objects.select_related(
                "institute",
                "question_bank_package",
                "question_bank_package__institute",
                "subscription_plan",
                "subscription_plan_cycle",
                "granted_by",
                "revoked_by",
            )
            .prefetch_related(
                models.Prefetch(
                    "question_bank_package__scopes",
                    queryset=QuestionBankPackageScope.objects.filter(is_active=True).select_related(
                        "program",
                        "subject",
                        "topic",
                    ),
                    to_attr="_prefetched_active_scopes",
                ),
            )
            .order_by("-created_at")
        )
        return Response(
            AdminInstituteQuestionEntitlementSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminInstituteQuestionEntitlementDetailView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    @extend_schema(operation_id="v1_economy_admin_question_bank_entitlements_detail")
    def get(self, request, entitlement_id):
        instance = get_scoped_object_or_403(
            InstituteQuestionEntitlement.objects.select_related(
                "institute",
                "question_bank_package",
                "question_bank_package__institute",
                "subscription_plan",
                "subscription_plan_cycle",
                "granted_by",
                "revoked_by",
            ).prefetch_related(
                models.Prefetch(
                    "question_bank_package__scopes",
                    queryset=QuestionBankPackageScope.objects.filter(is_active=True).select_related(
                        "program",
                        "subject",
                        "topic",
                    ),
                    to_attr="_prefetched_active_scopes",
                ),
            ),
            user=request.user,
            value=entitlement_id,
            not_found_message="Question bank entitlement not found.",
        )
        return Response(
            {
                "data": AdminInstituteQuestionEntitlementSerializer(instance).data,
                "visibility_audit": _build_question_bank_entitlement_visibility_audit(
                    entitlement=instance,
                ),
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, entitlement_id):
        instance = get_scoped_object_or_403(
            InstituteQuestionEntitlement.objects.select_related(
                "institute",
                "question_bank_package",
                "question_bank_package__institute",
                "subscription_plan",
                "subscription_plan_cycle",
                "granted_by",
                "revoked_by",
            ),
            user=request.user,
            value=entitlement_id,
            not_found_message="Question bank entitlement not found.",
        )
        previous_state = {
            "status": instance.status,
            "notes": instance.notes,
            "starts_at": instance.starts_at,
            "ends_at": instance.ends_at,
            "revoked_by": str(instance.revoked_by_id) if instance.revoked_by_id else None,
        }
        serializer = AdminInstituteQuestionEntitlementStatusUpdateSerializer(
            data=request.data,
            context={"instance": instance},
        )
        serializer.is_valid(raise_exception=True)
        updated_instance = update_institute_question_bank_entitlement_status(
            entitlement=instance,
            status=serializer.validated_data["status"],
            changed_by=request.user,
            notes=serializer.validated_data.get("notes", instance.notes),
            starts_at=serializer.validated_data.get("starts_at"),
            ends_at=serializer.validated_data.get("ends_at"),
            starts_at_provided="starts_at" in serializer.validated_data,
            ends_at_provided="ends_at" in serializer.validated_data,
        )
        refreshed_instance = InstituteQuestionEntitlement.objects.select_related(
            "institute",
            "question_bank_package",
            "question_bank_package__institute",
            "subscription_plan",
            "subscription_plan_cycle",
            "granted_by",
            "revoked_by",
        ).prefetch_related(
            "question_bank_package__scopes__program",
            "question_bank_package__scopes__subject",
            "question_bank_package__scopes__topic",
        ).get(pk=updated_instance.pk)
        create_audit_log(
            user=request.user,
            action="economy_question_bank_entitlement_update",
            entity_type="institute_question_entitlement",
            entity_id=refreshed_instance.id,
            message=(
                f"Question bank entitlement {refreshed_instance.id} status updated "
                f"from {previous_state['status']} to {refreshed_instance.status}."
            ),
            metadata={
                "changed_fields": {
                    "status": {
                        "before": previous_state["status"],
                        "after": refreshed_instance.status,
                    },
                    "notes": {
                        "before": previous_state["notes"],
                        "after": refreshed_instance.notes,
                    },
                    "starts_at": {
                        "before": _serialize_audit_value(previous_state["starts_at"]),
                        "after": _serialize_audit_value(refreshed_instance.starts_at),
                    },
                    "ends_at": {
                        "before": _serialize_audit_value(previous_state["ends_at"]),
                        "after": _serialize_audit_value(refreshed_instance.ends_at),
                    },
                    "revoked_by": {
                        "before": previous_state["revoked_by"],
                        "after": str(refreshed_instance.revoked_by_id) if refreshed_instance.revoked_by_id else None,
                    },
                }
            },
            request=request,
        )
        return action_response(
            data=AdminInstituteQuestionEntitlementSerializer(refreshed_instance).data,
            message="Question bank entitlement updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminInstituteQuestionFeatureEntitlementListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = (
            InstituteQuestionFeatureEntitlement.objects.select_related(
                "institute",
                "source_package",
                "source_subscription_plan",
            )
            .order_by("feature_code", "-created_at")
        )
        return Response(
            AdminInstituteQuestionFeatureEntitlementSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminInstituteQuestionFeatureEntitlementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entitlement, created = grant_institute_feature_entitlement(
            institute=serializer.validated_data["institute"],
            feature_code=serializer.validated_data["feature_code"],
            source_package=serializer.validated_data.get("source_package"),
            source_subscription_plan=serializer.validated_data.get("source_subscription_plan"),
            starts_at=serializer.validated_data.get("starts_at"),
            ends_at=serializer.validated_data.get("ends_at"),
            metadata=serializer.validated_data.get("metadata"),
        )
        refreshed_instance = InstituteQuestionFeatureEntitlement.objects.select_related(
            "institute",
            "source_package",
            "source_subscription_plan",
        ).get(pk=entitlement.pk)
        create_audit_log(
            user=request.user,
            action="economy_question_feature_entitlement_create"
            if created
            else "economy_question_feature_entitlement_restore",
            entity_type="institute_question_feature_entitlement",
            entity_id=refreshed_instance.id,
            message=(
                f"Question feature entitlement {'created' if created else 'restored'}: "
                f"{refreshed_instance.feature_code} for {refreshed_instance.institute.code}."
            ),
            metadata={
                "feature_code": refreshed_instance.feature_code,
                "institute_code": refreshed_instance.institute.code,
                "source_package_code": refreshed_instance.source_package.code
                if refreshed_instance.source_package_id
                else None,
                "status": refreshed_instance.status,
            },
            request=request,
        )
        return action_response(
            data=AdminInstituteQuestionFeatureEntitlementSerializer(refreshed_instance).data,
            message="Question bank feature entitlement granted successfully.",
            status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AdminInstituteQuestionFeatureEntitlementDetailView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, entitlement_id):
        instance = get_scoped_object_or_403(
            InstituteQuestionFeatureEntitlement.objects.select_related(
                "institute",
                "source_package",
                "source_subscription_plan",
            ),
            user=request.user,
            value=entitlement_id,
            not_found_message="Question bank feature entitlement not found.",
        )
        previous_state = {"status": instance.status}
        serializer = AdminInstituteQuestionFeatureEntitlementStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated_instance = update_institute_question_feature_entitlement_status(
            entitlement=instance,
            status=serializer.validated_data["status"],
        )
        refreshed_instance = InstituteQuestionFeatureEntitlement.objects.select_related(
            "institute",
            "source_package",
            "source_subscription_plan",
        ).get(pk=updated_instance.pk)
        create_audit_log(
            user=request.user,
            action="economy_question_feature_entitlement_update",
            entity_type="institute_question_feature_entitlement",
            entity_id=refreshed_instance.id,
            message=(
                f"Question feature entitlement {refreshed_instance.id} status updated "
                f"from {previous_state['status']} to {refreshed_instance.status}."
            ),
            metadata={
                "changed_fields": {
                    "status": {
                        "before": previous_state["status"],
                        "after": refreshed_instance.status,
                    },
                }
            },
            request=request,
        )
        return action_response(
            data=AdminInstituteQuestionFeatureEntitlementSerializer(refreshed_instance).data,
            message="Question bank feature entitlement updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminInstituteQuestionUsageLedgerListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = (
            InstituteQuestionUsageLedger.objects.select_related(
                "institute",
                "question_bank_package",
                "entitlement",
                "master_question",
                "question",
                "exam",
                "performed_by",
            )
            .order_by("-effective_at", "-created_at")
        )

        institute_id = str(request.query_params.get("institute", "") or "").strip()
        package_id = str(request.query_params.get("question_bank_package", "") or "").strip()
        action_type = str(request.query_params.get("action_type", "") or "").strip()

        if institute_id:
            queryset = queryset.filter(institute_id=institute_id)
        if package_id:
            queryset = queryset.filter(question_bank_package_id=package_id)
        if action_type:
            queryset = queryset.filter(action_type=action_type)

        return Response(
            AdminInstituteQuestionUsageLedgerSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminQuestionBankPackageReportView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        institute_id = str(request.query_params.get("institute", "") or "").strip()
        package_id = str(request.query_params.get("question_bank_package", "") or "").strip()
        response_format = str(
            request.query_params.get("export", "") or request.query_params.get("format", "") or ""
        ).strip().lower()

        package_queryset = QuestionBankPackage.objects.select_related("institute").prefetch_related(
            "scopes__program",
            "scopes__subject",
            "scopes__topic",
            "subscription_plan_links",
        ).order_by("sort_order", "name")
        entitlement_queryset = InstituteQuestionEntitlement.objects.select_related(
            "institute",
            "question_bank_package",
            "question_bank_package__institute",
        ).order_by("-created_at")
        usage_queryset = InstituteQuestionUsageLedger.objects.select_related(
            "institute",
            "question_bank_package",
            "entitlement",
        ).order_by("-effective_at", "-created_at")

        if institute_id:
            entitlement_queryset = entitlement_queryset.filter(institute_id=institute_id)
            usage_queryset = usage_queryset.filter(institute_id=institute_id)
            referenced_package_ids = set(
                entitlement_queryset.values_list("question_bank_package_id", flat=True)
            ) | set(usage_queryset.exclude(question_bank_package_id__isnull=True).values_list("question_bank_package_id", flat=True))
            package_queryset = package_queryset.filter(id__in=referenced_package_ids)

        if package_id:
            package_queryset = package_queryset.filter(id=package_id)
            entitlement_queryset = entitlement_queryset.filter(question_bank_package_id=package_id)
            usage_queryset = usage_queryset.filter(question_bank_package_id=package_id)

        package_list = list(package_queryset)
        entitlement_list = list(entitlement_queryset)
        usage_list = list(usage_queryset)
        rows = _question_bank_package_report_rows(
            packages=package_list,
            entitlements=entitlement_list,
            usage_entries=usage_list,
        )

        if response_format == "csv":
            return _question_bank_package_report_csv_response(rows=rows)

        return Response(rows, status=status.HTTP_200_OK)


class InstituteScopedQuestionBankEntitlementListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, CanManageQuestionBank]

    def get(self, request):
        queryset = scope_queryset_for_institute(
            InstituteQuestionEntitlement.objects.select_related(
                "institute",
                "question_bank_package",
                "question_bank_package__institute",
                "subscription_plan",
                "subscription_plan_cycle",
                "granted_by",
                "revoked_by",
            ).prefetch_related(
                "question_bank_package__scopes__program",
                "question_bank_package__scopes__subject",
                "question_bank_package__scopes__topic",
            ).order_by("-created_at"),
            request.user,
        )
        return Response(
            AdminInstituteQuestionEntitlementSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class InstituteScopedQuestionBankUsageLedgerListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request):
        queryset = scope_queryset_for_institute(
            InstituteQuestionUsageLedger.objects.select_related(
                "institute",
                "question_bank_package",
                "entitlement",
                "master_question",
                "question",
                "exam",
                "performed_by",
            ).order_by("-effective_at", "-created_at"),
            request.user,
        )

        package_id = str(request.query_params.get("question_bank_package", "") or "").strip()
        action_type = str(request.query_params.get("action_type", "") or "").strip()

        if package_id:
            queryset = queryset.filter(question_bank_package_id=package_id)
        if action_type:
            queryset = queryset.filter(action_type=action_type)

        return Response(
            AdminInstituteQuestionUsageLedgerSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class InstituteScopedQuestionBankFeatureEntitlementListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, CanBuildExams]

    def get(self, request):
        queryset = scope_queryset_for_institute(
            InstituteQuestionFeatureEntitlement.objects.select_related(
                "institute",
                "source_package",
                "source_subscription_plan",
            ).order_by("feature_code", "-created_at"),
            request.user,
        )
        return Response(
            AdminInstituteQuestionFeatureEntitlementSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminStarPackListCreateView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = StarPack.objects.select_related("institute").order_by(
            "institute__name",
            "sort_order",
            "price_amount",
            "name",
        )
        return Response(
            AdminStarPackSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminStarPackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        create_audit_log(
            user=request.user,
            action="economy_star_pack_create",
            entity_type="star_pack",
            entity_id=instance.id,
            message=f"Star pack created: {instance.name}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "code": instance.code,
                "stars_credited": instance.stars_credited,
                "price_amount": str(instance.price_amount),
                "currency": instance.currency,
            },
            request=request,
        )
        return action_response(
            data=AdminStarPackSerializer(instance).data,
            message="Star pack created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminStarPackDetailView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, star_pack_id):
        instance = get_scoped_object_or_403(
            StarPack.objects.select_related("institute"),
            user=request.user,
            value=star_pack_id,
            not_found_message="Star pack not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "name": instance.name,
            "code": instance.code,
            "stars_credited": instance.stars_credited,
            "price_amount": str(instance.price_amount),
            "currency": instance.currency,
            "sort_order": instance.sort_order,
            "is_active": instance.is_active,
        }
        serializer = AdminStarPackSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_star_pack_update",
            entity_type="star_pack",
            entity_id=updated_instance.id,
            message=f"Star pack updated: {updated_instance.name}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=serializer.data,
            message="Star pack updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminSubscriptionPlanListCreateView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = SubscriptionPlan.objects.select_related("institute").prefetch_related(
            "cycles__star_credit_rules",
            "cycles__exam_allowance_config",
            "question_bank_package_links__question_bank_package__institute",
        ).order_by("institute__name", "name")
        return Response(
            AdminSubscriptionPlanSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminSubscriptionPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        refreshed_instance = (
            SubscriptionPlan.objects.select_related("institute")
            .prefetch_related(
                "cycles__star_credit_rules",
                "cycles__exam_allowance_config",
                "question_bank_package_links__question_bank_package__institute",
            )
            .get(pk=instance.pk)
        )
        create_audit_log(
            user=request.user,
            action="economy_subscription_plan_create",
            entity_type="subscription_plan",
            entity_id=refreshed_instance.id,
            message=f"Subscription plan created: {refreshed_instance.name}.",
            metadata={
                "institute_id": str(refreshed_instance.institute_id),
                "code": refreshed_instance.code,
                "cycle_count": refreshed_instance.cycles.count(),
            },
            request=request,
        )
        return action_response(
            data=AdminSubscriptionPlanSerializer(refreshed_instance).data,
            message="Subscription plan created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminSubscriptionPlanDetailView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, plan_id):
        instance = get_scoped_object_or_403(
            SubscriptionPlan.objects.select_related("institute").prefetch_related(
                "cycles__star_credit_rules",
                "cycles__exam_allowance_config",
                "question_bank_package_links__question_bank_package__institute",
            ),
            user=request.user,
            value=plan_id,
            not_found_message="Subscription plan not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "name": instance.name,
            "code": instance.code,
            "description": instance.description,
            "is_active": instance.is_active,
            "cycle_count": instance.cycles.count(),
        }
        serializer = AdminSubscriptionPlanSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        refreshed_instance = (
            SubscriptionPlan.objects.select_related("institute")
            .prefetch_related(
                "cycles__star_credit_rules",
                "cycles__exam_allowance_config",
                "question_bank_package_links__question_bank_package__institute",
            )
            .get(pk=updated_instance.pk)
        )
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in ("institute", "name", "code", "description", "is_active")
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        if "cycles" in request.data:
            changed_fields["cycle_count"] = {
                "before": previous_state["cycle_count"],
                "after": refreshed_instance.cycles.count(),
            }
        create_audit_log(
            user=request.user,
            action="economy_subscription_plan_update",
            entity_type="subscription_plan",
            entity_id=refreshed_instance.id,
            message=f"Subscription plan updated: {refreshed_instance.name}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminSubscriptionPlanSerializer(refreshed_instance).data,
            message="Subscription plan updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminSubscriptionPlanApplyToInstituteView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, plan_id):
        plan = get_scoped_object_or_403(
            SubscriptionPlan.objects.select_related("institute").prefetch_related(
                "question_bank_package_links__question_bank_package__institute",
            ),
            user=request.user,
            value=plan_id,
            not_found_message="Subscription plan not found.",
        )
        serializer = AdminApplySubscriptionPlanToInstituteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_institute_id = serializer.validated_data["institute"]
        target_institute = get_scoped_object_or_403(
            SubscriptionPlan._meta.get_field("institute").remote_field.model.objects.all(),
            user=request.user,
            value=target_institute_id,
            not_found_message="Institute not found.",
        )
        entitlements = apply_subscription_plan_question_bank_links_to_institute(
            subscription_plan=plan,
            target_institute=target_institute,
            grant_modes=serializer.validated_data.get("grant_modes"),
            granted_by=request.user,
            notes=serializer.validated_data.get("notes", ""),
        )
        create_audit_log(
            user=request.user,
            action="economy_subscription_plan_apply_to_institute",
            entity_type="subscription_plan",
            entity_id=plan.id,
            message=f"Subscription plan {plan.name} applied to institute {target_institute.code}.",
            metadata={
                "target_institute_id": str(target_institute.id),
                "target_institute_code": target_institute.code,
                "grant_modes": serializer.validated_data.get("grant_modes", []),
                "entitlement_count": len(entitlements),
                "question_bank_package_codes": [entitlement.question_bank_package.code for entitlement in entitlements],
            },
            request=request,
        )
        return action_response(
            data={
                "subscription_plan_id": str(plan.id),
                "subscription_plan_code": plan.code,
                "target_institute_id": str(target_institute.id),
                "target_institute_code": target_institute.code,
                "entitlement_count": len(entitlements),
                "question_bank_package_codes": [entitlement.question_bank_package.code for entitlement in entitlements],
            },
            message="Subscription plan question-bank links applied successfully.",
            status_code=status.HTTP_200_OK,
        )


class InstituteRequestableSubscriptionPlanListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request):
        profile = getattr(request.user, "account_profile", None)
        if profile is None or not profile.is_active or profile.institute_id is None:
            return Response({"detail": "An institute-scoped account is required."}, status=status.HTTP_403_FORBIDDEN)
        queryset = list_requestable_subscription_plans_for_institute(institute=profile.institute)
        return Response(
            InstituteRequestableSubscriptionPlanSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class InstituteSubscriptionRequestListCreateView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request):
        queryset = scope_queryset_for_institute(
            InstituteSubscriptionRequest.objects.select_related(
                "institute",
                "subscription_plan_cycle",
                "subscription_plan_cycle__plan",
                "requested_by",
                "reviewed_by",
            ).order_by("-created_at"),
            request.user,
        )
        return Response(
            InstituteSubscriptionRequestSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        profile = getattr(request.user, "account_profile", None)
        if profile is None or not profile.is_active or profile.institute_id is None:
            return Response({"detail": "An institute-scoped account is required."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CreateInstituteSubscriptionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription_request, created = create_institute_subscription_request(
            institute=profile.institute,
            subscription_plan_cycle=serializer.validated_data["subscription_plan_cycle"],
            requested_by=request.user,
            grant_modes=serializer.validated_data.get("grant_modes"),
            notes=serializer.validated_data.get("notes", ""),
            metadata=serializer.validated_data.get("metadata") or {},
        )
        refreshed = InstituteSubscriptionRequest.objects.select_related(
            "institute",
            "subscription_plan_cycle",
            "subscription_plan_cycle__plan",
            "requested_by",
            "reviewed_by",
        ).get(pk=subscription_request.pk)
        create_audit_log(
            user=request.user,
            action="economy_institute_subscription_request_create",
            entity_type="institute_subscription_request",
            entity_id=refreshed.id,
            message=f"Institute subscription request created for {refreshed.subscription_plan_cycle.plan.code}.",
            metadata={
                "created": created,
                "subscription_plan_cycle_id": str(refreshed.subscription_plan_cycle_id),
                "subscription_plan_code": refreshed.subscription_plan_cycle.plan.code,
                "grant_modes": refreshed.resolved_grant_modes,
            },
            request=request,
        )
        return action_response(
            data=InstituteSubscriptionRequestSerializer(refreshed).data,
            message="Subscription request submitted successfully." if created else "A matching pending subscription request already exists.",
            status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AdminInstituteSubscriptionRequestReviewView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, request_id):
        instance = get_scoped_object_or_403(
            InstituteSubscriptionRequest.objects.select_related(
                "institute",
                "subscription_plan_cycle",
                "subscription_plan_cycle__plan",
                "requested_by",
                "reviewed_by",
            ),
            user=request.user,
            value=request_id,
            not_found_message="Institute subscription request not found.",
        )
        serializer = ReviewInstituteSubscriptionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reviewed_request, entitlements = review_institute_subscription_request(
            subscription_request=instance,
            decision=serializer.validated_data["decision"],
            reviewed_by=request.user,
            operator_notes=serializer.validated_data.get("operator_notes", ""),
        )
        refreshed = InstituteSubscriptionRequest.objects.select_related(
            "institute",
            "subscription_plan_cycle",
            "subscription_plan_cycle__plan",
            "requested_by",
            "reviewed_by",
        ).get(pk=reviewed_request.pk)
        create_audit_log(
            user=request.user,
            action="economy_institute_subscription_request_review",
            entity_type="institute_subscription_request",
            entity_id=refreshed.id,
            message=(
                f"Institute subscription request for {refreshed.subscription_plan_cycle.plan.code} "
                f"was {serializer.validated_data['decision']}d."
            ),
            metadata={
                "decision": serializer.validated_data["decision"],
                "entitlement_count": len(entitlements),
                "question_bank_package_codes": [entitlement.question_bank_package.code for entitlement in entitlements],
            },
            request=request,
        )
        return action_response(
            data=InstituteSubscriptionRequestSerializer(refreshed).data,
            message="Subscription request reviewed successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminReferralProgramListCreateView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = ReferralProgram.objects.select_related("institute").order_by("institute__name", "name")
        return Response(
            AdminReferralProgramSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminReferralProgramSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        create_audit_log(
            user=request.user,
            action="economy_referral_program_create",
            entity_type="referral_program",
            entity_id=instance.id,
            message=f"Referral program created: {instance.name}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "reward_side": instance.reward_side,
                "referrer_stars": instance.referrer_stars,
                "referee_stars": instance.referee_stars,
            },
            request=request,
        )
        return action_response(
            data=AdminReferralProgramSerializer(instance).data,
            message="Referral program created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminReferralProgramDetailView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, program_id):
        instance = get_scoped_object_or_403(
            ReferralProgram.objects.select_related("institute"),
            user=request.user,
            value=program_id,
            not_found_message="Referral program not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "name": instance.name,
            "referrer_stars": instance.referrer_stars,
            "referee_stars": instance.referee_stars,
            "reward_side": instance.reward_side,
            "valid_from": instance.valid_from.isoformat() if instance.valid_from else None,
            "valid_until": instance.valid_until.isoformat() if instance.valid_until else None,
            "is_active": instance.is_active,
        }
        serializer = AdminReferralProgramSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_referral_program_update",
            entity_type="referral_program",
            entity_id=updated_instance.id,
            message=f"Referral program updated: {updated_instance.name}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminReferralProgramSerializer(updated_instance).data,
            message="Referral program updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminRewardRuleListCreateView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = RewardRule.objects.select_related("institute", "subject").order_by(
            "institute__name",
            "priority",
            "name",
        )
        return Response(
            AdminRewardRuleSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminRewardRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        create_audit_log(
            user=request.user,
            action="economy_reward_rule_create",
            entity_type="reward_rule",
            entity_id=instance.id,
            message=f"Reward rule created: {instance.name}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "rule_type": instance.rule_type,
                "stars_awarded": instance.stars_awarded,
                "subject_id": str(instance.subject_id) if instance.subject_id else None,
            },
            request=request,
        )
        return action_response(
            data=AdminRewardRuleSerializer(instance).data,
            message="Reward rule created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminRewardRuleDetailView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, rule_id):
        instance = get_scoped_object_or_403(
            RewardRule.objects.select_related("institute", "subject"),
            user=request.user,
            value=rule_id,
            not_found_message="Reward rule not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "subject": str(instance.subject_id) if instance.subject_id else None,
            "name": instance.name,
            "rule_type": instance.rule_type,
            "stars_awarded": instance.stars_awarded,
            "score_threshold_percentage": (
                str(instance.score_threshold_percentage)
                if instance.score_threshold_percentage is not None
                else None
            ),
            "completion_count_threshold": instance.completion_count_threshold,
            "streak_count_threshold": instance.streak_count_threshold,
            "priority": instance.priority,
            "valid_from": instance.valid_from.isoformat() if instance.valid_from else None,
            "valid_until": instance.valid_until.isoformat() if instance.valid_until else None,
            "is_active": instance.is_active,
        }
        serializer = AdminRewardRuleSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_reward_rule_update",
            entity_type="reward_rule",
            entity_id=updated_instance.id,
            message=f"Reward rule updated: {updated_instance.name}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminRewardRuleSerializer(updated_instance).data,
            message="Reward rule updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminContentAccessPolicyListCreateView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = ContentAccessPolicy.objects.select_related("institute", "subject").order_by(
            "institute__name",
            "priority",
            "content_type",
            "content_key",
        )
        return Response(
            AdminContentAccessPolicySerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminContentAccessPolicySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        if instance.content_type == "exam":
            invalidate_exam_access_policy_cache(institute=instance.institute)
        create_audit_log(
            user=request.user,
            action="economy_content_access_policy_create",
            entity_type="content_access_policy",
            entity_id=instance.id,
            message=f"Content access policy created for {instance.content_type}:{instance.content_key}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "policy_type": instance.policy_type,
                "star_cost": instance.star_cost,
                "entitlement_code": instance.entitlement_code,
            },
            request=request,
        )
        return action_response(
            data=AdminContentAccessPolicySerializer(instance).data,
            message="Content access policy created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminContentAccessPolicyDetailView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, policy_id):
        instance = get_scoped_object_or_403(
            ContentAccessPolicy.objects.select_related("institute", "subject"),
            user=request.user,
            value=policy_id,
            not_found_message="Content access policy not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "subject": str(instance.subject_id) if instance.subject_id else None,
            "content_type": instance.content_type,
            "content_key": instance.content_key,
            "content_label": instance.content_label,
            "policy_type": instance.policy_type,
            "star_cost": instance.star_cost,
            "entitlement_code": instance.entitlement_code,
            "priority": instance.priority,
            "is_active": instance.is_active,
        }
        serializer = AdminContentAccessPolicySerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        if updated_instance.content_type == "exam":
            invalidate_exam_access_policy_cache(institute=updated_instance.institute)
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_content_access_policy_update",
            entity_type="content_access_policy",
            entity_id=updated_instance.id,
            message=f"Content access policy updated for {updated_instance.content_type}:{updated_instance.content_key}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminContentAccessPolicySerializer(updated_instance).data,
            message="Content access policy updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminUnlockRuleListCreateView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = UnlockRule.objects.select_related("institute", "subject").order_by(
            "institute__name",
            "priority",
            "content_type",
            "content_key",
        )
        return Response(
            AdminUnlockRuleSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminUnlockRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        create_audit_log(
            user=request.user,
            action="economy_unlock_rule_create",
            entity_type="unlock_rule",
            entity_id=instance.id,
            message=f"Unlock rule created for {instance.content_type}:{instance.content_key}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "rule_type": instance.rule_type,
                "required_star_balance": instance.required_star_balance,
                "required_entitlement_code": instance.required_entitlement_code,
            },
            request=request,
        )
        return action_response(
            data=AdminUnlockRuleSerializer(instance).data,
            message="Unlock rule created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminUnlockRuleDetailView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, rule_id):
        instance = get_scoped_object_or_403(
            UnlockRule.objects.select_related("institute", "subject"),
            user=request.user,
            value=rule_id,
            not_found_message="Unlock rule not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "subject": str(instance.subject_id) if instance.subject_id else None,
            "content_type": instance.content_type,
            "content_key": instance.content_key,
            "content_label": instance.content_label,
            "rule_type": instance.rule_type,
            "required_star_balance": instance.required_star_balance,
            "required_entitlement_code": instance.required_entitlement_code,
            "required_completion_count": instance.required_completion_count,
            "required_score_percentage": (
                str(instance.required_score_percentage)
                if instance.required_score_percentage is not None
                else None
            ),
            "admin_override_allowed": instance.admin_override_allowed,
            "priority": instance.priority,
            "is_active": instance.is_active,
        }
        serializer = AdminUnlockRuleSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_unlock_rule_update",
            entity_type="unlock_rule",
            entity_id=updated_instance.id,
            message=f"Unlock rule updated for {updated_instance.content_type}:{updated_instance.content_key}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminUnlockRuleSerializer(updated_instance).data,
            message="Unlock rule updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminConfirmPaymentOrderView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def post(self, request, order_id):
        serializer = ConfirmPaymentOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_order = get_scoped_object_or_403(
            scope_queryset_for_institute(
                PaymentOrder.objects.select_related(
                    "student",
                    "star_pack",
                    "subscription_plan_cycle",
                    "subscription_plan_cycle__plan",
                ),
                request.user,
            ),
            user=request.user,
            value=order_id,
            not_found_message="Payment order not found in your scope.",
        )
        enforce_institute_admin_order_confirmation_policy(
            user=request.user,
            payment_order=payment_order,
        )

        result = complete_payment_order(
            payment_order=payment_order,
            provider_transaction_reference=serializer.validated_data["provider_transaction_reference"],
            created_by=request.user,
            metadata=serializer.validated_data.get("metadata") or {},
        )
        return action_response(
            data={
                "payment_order": PaymentOrderSerializer(result["payment_order"]).data,
                "payment_transaction": (
                    PaymentTransactionSerializer(result["payment_transaction"]).data
                    if result["payment_transaction"] is not None
                    else None
                ),
                "ledger_entry": (
                    StarLedgerSerializer(result["ledger_entry"]).data
                    if result["ledger_entry"] is not None
                    else None
                ),
                "student_subscription": (
                    StudentSubscriptionSerializer(result["student_subscription"]).data
                    if result["student_subscription"] is not None
                    else None
                ),
            },
            message=(
                "Payment order was already completed."
                if not result["created"]
                else "Payment order completed successfully."
            ),
            status_code=status.HTTP_200_OK,
        )


class AdminStudentWalletView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request, student_id):
        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute"),
                request.user,
            ),
            user=request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )
        profile = get_or_create_student_economy_profile(student)
        return Response(
            StudentEconomyProfileSerializer(profile).data,
            status=status.HTTP_200_OK,
        )


class AdminStudentRewardEventListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request, student_id):
        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute"),
                request.user,
            ),
            user=request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )
        queryset = (
            StudentRewardEvent.objects.select_related(
                "student",
                "reward_rule",
                "ledger_entry",
                "ledger_entry__created_by",
            )
            .filter(student=student, is_active=True)
            .order_by("-processed_at", "-created_at")
        )
        return Response(
            StudentRewardEventSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminStudentPaymentOrderListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request, student_id):
        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute"),
                request.user,
            ),
            user=request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )
        queryset = list_student_payment_orders(student=student)
        return Response(
            PaymentOrderSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminSubscriptionAllowanceOpsSummaryView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request):
        queryset = scope_queryset_for_institute(
            StudentSubscription.objects.filter(
                is_active=True,
                status="active",
            )
            .select_related("student", "plan_cycle", "plan_cycle__plan", "plan_cycle__exam_allowance_config")
            .prefetch_related("allowance_usage_entries"),
            request.user,
        )
        institute_id = str(request.query_params.get("institute", "")).strip()
        if institute_id:
            queryset = queryset.filter(institute_id=institute_id)

        active_quota_subscriptions = 0
        active_student_ids = set()
        near_exhausted_student_ids = set()
        exhausted_student_ids = set()
        current_cycle_usage_total = 0
        plan_buckets = {}

        for subscription in queryset:
            allowance_config = getattr(subscription.plan_cycle, "exam_allowance_config", None)
            if allowance_config is None or not allowance_config.is_active:
                continue

            included_allowance = int(allowance_config.included_exam_attempts or 0)
            if included_allowance <= 0:
                continue

            usage_entries = [entry for entry in subscription.allowance_usage_entries.all() if entry.is_active]
            if subscription.current_period_start is not None and subscription.current_period_end is not None:
                usage_entries = [
                    entry
                    for entry in usage_entries
                    if entry.billing_period_start == subscription.current_period_start
                    and entry.billing_period_end == subscription.current_period_end
                ]

            used_allowance = sum(int(entry.consumed_count or 0) for entry in usage_entries)
            remaining_allowance = max(included_allowance - used_allowance, 0)

            active_quota_subscriptions += 1
            active_student_ids.add(str(subscription.student_id))
            current_cycle_usage_total += used_allowance

            if remaining_allowance == 0:
                exhausted_student_ids.add(str(subscription.student_id))
            elif remaining_allowance <= 1:
                near_exhausted_student_ids.add(str(subscription.student_id))

            bucket = plan_buckets.setdefault(
                str(subscription.plan_cycle.plan_id),
                {
                    "plan_id": str(subscription.plan_cycle.plan_id),
                    "plan_name": subscription.plan_cycle.plan.name,
                    "plan_code": subscription.plan_cycle.plan.code,
                    "active_subscriptions": 0,
                    "active_student_ids": set(),
                    "included_allowance_total": 0,
                    "used_allowance_total": 0,
                    "remaining_allowance_total": 0,
                    "near_exhausted_subscriptions": 0,
                    "exhausted_subscriptions": 0,
                },
            )
            bucket["active_subscriptions"] += 1
            bucket["active_student_ids"].add(str(subscription.student_id))
            bucket["included_allowance_total"] += included_allowance
            bucket["used_allowance_total"] += used_allowance
            bucket["remaining_allowance_total"] += remaining_allowance
            if remaining_allowance == 0:
                bucket["exhausted_subscriptions"] += 1
            elif remaining_allowance <= 1:
                bucket["near_exhausted_subscriptions"] += 1

        top_used_plans = sorted(
            plan_buckets.values(),
            key=lambda item: (
                -int(item["used_allowance_total"]),
                -int(item["active_subscriptions"]),
                str(item["plan_name"]).lower(),
            ),
        )[:5]

        return Response(
            {
                "active_quota_subscriptions": active_quota_subscriptions,
                "active_students_with_subscriptions": len(active_student_ids),
                "students_near_exhaustion": len(near_exhausted_student_ids),
                "students_exhausted": len(exhausted_student_ids),
                "current_cycle_usage_total": current_cycle_usage_total,
                "top_used_plans": [
                    {
                        "plan_id": item["plan_id"],
                        "plan_name": item["plan_name"],
                        "plan_code": item["plan_code"],
                        "active_subscriptions": item["active_subscriptions"],
                        "active_students": len(item["active_student_ids"]),
                        "included_allowance_total": item["included_allowance_total"],
                        "used_allowance_total": item["used_allowance_total"],
                        "remaining_allowance_total": item["remaining_allowance_total"],
                        "near_exhausted_subscriptions": item["near_exhausted_subscriptions"],
                        "exhausted_subscriptions": item["exhausted_subscriptions"],
                    }
                    for item in top_used_plans
                ],
            },
            status=status.HTTP_200_OK,
        )


class AdminStudentSubscriptionListView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request, student_id):
        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute"),
                request.user,
            ),
            user=request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )
        queryset = list_student_subscriptions(student=student)
        return Response(
            StudentSubscriptionSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminStudentUnlockRefreshView(EconomyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def post(self, request, student_id):
        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute"),
                request.user,
            ),
            user=request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )

        candidate_targets = {}
        existing_states = StudentUnlockState.objects.filter(student=student, is_active=True).select_related(
            "subject"
        )
        for unlock_state in existing_states:
            candidate_targets[(unlock_state.content_type, unlock_state.content_key)] = unlock_state.subject
        for target in _list_student_visible_exam_unlock_targets(student):
            candidate_targets.setdefault((target["content_type"], target["content_key"]), target["subject"])

        unlock_states = _refresh_student_unlock_states_bulk(
            student=student,
            candidate_targets=[
                {
                    "content_type": content_type,
                    "content_key": content_key,
                    "subject": subject,
                }
                for (content_type, content_key), subject in candidate_targets.items()
            ],
            granted_by=request.user,
        )

        return action_response(
            data=StudentUnlockStateSerializer(unlock_states, many=True).data,
            message="Unlock states refreshed successfully.",
            status_code=status.HTTP_200_OK,
        )
