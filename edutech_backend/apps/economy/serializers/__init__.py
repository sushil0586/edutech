from django.db import transaction
from rest_framework import serializers
from apps.reports.models import AuditLog

from apps.academics.models import Program, Subject, Topic
from apps.economy.models import (
    ContentAccessPolicy,
    EconomyOperatorPolicyConfig,
    InstituteSubscriptionRequest,
    InstituteQuestionEntitlement,
    InstituteQuestionFeatureEntitlement,
    InstituteQuestionEntitlementStatus,
    InstituteQuestionUsageLedger,
    PaymentOrder,
    PaymentTransaction,
    QuestionBankPackage,
    QuestionBankPackageType,
    QuestionBankPackageScope,
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
    SubscriptionPlanQuestionBankPackage,
    SubscriptionStarCreditRule,
    UnlockRule,
)
from apps.economy.services import get_entitlement_quota_summary


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


class AdminSubscriptionPlanQuestionBankPackageSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    question_bank_package_name = serializers.CharField(source="question_bank_package.name", read_only=True)
    question_bank_package_code = serializers.CharField(source="question_bank_package.code", read_only=True)
    question_bank_package_display_name = serializers.SerializerMethodField()
    question_bank_package_institute_name = serializers.CharField(
        source="question_bank_package.institute.name",
        read_only=True,
    )
    question_bank_package_institute_code = serializers.CharField(
        source="question_bank_package.institute.code",
        read_only=True,
    )
    question_bank_package_family_label = serializers.SerializerMethodField()
    question_bank_package_recommended_for_labels = serializers.SerializerMethodField()
    question_bank_package_commercial_labels = serializers.SerializerMethodField()
    question_bank_package_coverage_summary = serializers.SerializerMethodField()

    def _title_case_label(self, value):
        if not value:
            return None
        return str(value).replace("_", " ").strip().title()

    def get_question_bank_package_display_name(self, obj):
        package = obj.question_bank_package
        return f"{package.name} ({package.code})"

    def get_question_bank_package_family_label(self, obj):
        metadata = obj.question_bank_package.metadata or {}
        family = (
            metadata.get("package_family_label")
            or metadata.get("package_family")
            or metadata.get("assessment_family")
        )
        return self._title_case_label(family)

    def get_question_bank_package_recommended_for_labels(self, obj):
        metadata = obj.question_bank_package.metadata or {}
        raw_labels = (
            metadata.get("recommended_for_labels")
            or metadata.get("recommended_for")
            or metadata.get("audience_tags")
            or []
        )
        if isinstance(raw_labels, str):
            raw_labels = [raw_labels]
        return [
            self._title_case_label(item)
            for item in raw_labels
            if self._title_case_label(item)
        ]

    def get_question_bank_package_commercial_labels(self, obj):
        package = obj.question_bank_package
        metadata = package.metadata or {}
        labels = [
            self._title_case_label(package.package_type),
            self._title_case_label(package.access_mode),
            "Public Catalog" if package.is_public_catalog else "Private Catalog",
            "Platform Owned" if package.ownership_type == "platform" else "Institute Owned",
        ]
        extra_labels = metadata.get("commercial_labels")
        if isinstance(extra_labels, (list, tuple)):
            labels.extend(str(item).strip() for item in extra_labels if str(item).strip())
        elif isinstance(extra_labels, str) and extra_labels.strip():
            labels.append(extra_labels.strip())
        return list(dict.fromkeys(filter(None, labels)))

    def get_question_bank_package_coverage_summary(self, obj):
        package = obj.question_bank_package
        active_scopes = [scope for scope in package.scopes.all() if scope.is_active]
        program_count = len({scope.program_id for scope in active_scopes if scope.program_id})
        subject_count = len({scope.subject_id for scope in active_scopes if scope.subject_id})
        topic_count = len({scope.topic_id for scope in active_scopes if scope.topic_id})

        parts = []
        if subject_count:
            parts.append(f"{subject_count} subject{'s' if subject_count != 1 else ''}")
        elif program_count:
            parts.append(f"{program_count} program{'s' if program_count != 1 else ''}")
        if topic_count:
            parts.append(f"{topic_count} topic{'s' if topic_count != 1 else ''}")
        parts.append(f"{len(active_scopes)} scope row{'s' if len(active_scopes) != 1 else ''}")
        return " · ".join(parts)

    class Meta:
        model = SubscriptionPlanQuestionBankPackage
        fields = (
            "id",
            "question_bank_package",
            "question_bank_package_name",
            "question_bank_package_code",
            "question_bank_package_display_name",
            "question_bank_package_institute_name",
            "question_bank_package_institute_code",
            "question_bank_package_family_label",
            "question_bank_package_recommended_for_labels",
            "question_bank_package_commercial_labels",
            "question_bank_package_coverage_summary",
            "grant_mode",
            "is_default",
            "metadata",
            "is_active",
        )


class AdminSubscriptionPlanSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    cycles = AdminSubscriptionPlanCycleSerializer(many=True, required=False)
    question_bank_package_links = AdminSubscriptionPlanQuestionBankPackageSerializer(
        many=True,
        required=False,
    )

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
            "question_bank_package_links",
        )

    def validate_cycles(self, value):
        if not value:
            raise serializers.ValidationError("At least one subscription cycle is required.")
        return value

    def validate_question_bank_package_links(self, value):
        return value or []

    @transaction.atomic
    def create(self, validated_data):
        cycles_data = validated_data.pop("cycles", []) or []
        question_bank_package_links_data = validated_data.pop("question_bank_package_links", []) or []
        plan = SubscriptionPlan.objects.create(**validated_data)
        self._sync_cycles(plan=plan, cycles_data=cycles_data)
        self._sync_question_bank_package_links(
            plan=plan,
            question_bank_package_links_data=question_bank_package_links_data,
        )
        return plan

    @transaction.atomic
    def update(self, instance, validated_data):
        cycles_data = validated_data.pop("cycles", None)
        question_bank_package_links_data = validated_data.pop("question_bank_package_links", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if cycles_data is not None:
            self._sync_cycles(plan=instance, cycles_data=cycles_data or [])
        if question_bank_package_links_data is not None:
            self._sync_question_bank_package_links(
                plan=instance,
                question_bank_package_links_data=question_bank_package_links_data or [],
            )
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

    def _sync_question_bank_package_links(self, *, plan, question_bank_package_links_data):
        existing_links = {
            str(link.question_bank_package_id): link
            for link in plan.question_bank_package_links.all()
        }
        requested_package_ids: set[str] = set()

        for link_data in question_bank_package_links_data:
            package = link_data["question_bank_package"]
            package_id = str(package.id)
            requested_package_ids.add(package_id)

            if package.institute_id != plan.institute_id:
                raise serializers.ValidationError(
                    {
                        "question_bank_package_links": (
                            "Question bank package must belong to the same institute as the subscription plan."
                        )
                    }
                )

            existing_link = existing_links.get(package_id)
            if existing_link:
                existing_link.grant_mode = link_data.get("grant_mode", existing_link.grant_mode)
                existing_link.is_default = link_data.get("is_default", existing_link.is_default)
                existing_link.metadata = link_data.get("metadata", existing_link.metadata)
                existing_link.is_active = link_data.get("is_active", True)
                existing_link.full_clean()
                existing_link.save()
            else:
                SubscriptionPlanQuestionBankPackage.objects.create(
                    institute=plan.institute,
                    subscription_plan=plan,
                    question_bank_package=package,
                    grant_mode=link_data.get("grant_mode", "included"),
                    is_default=link_data.get("is_default", True),
                    metadata=link_data.get("metadata", {}),
                    is_active=link_data.get("is_active", True),
                )

        for package_id, existing_link in existing_links.items():
            if package_id not in requested_package_ids and existing_link.is_active:
                existing_link.is_active = False
                existing_link.save(update_fields=["is_active", "updated_at"])

    def to_representation(self, instance):
        payload = super().to_representation(instance)
        active_links = [
            link
            for link in instance.question_bank_package_links.all()
            if link.is_active
        ]
        payload["question_bank_package_links"] = AdminSubscriptionPlanQuestionBankPackageSerializer(
            active_links,
            many=True,
        ).data
        return payload


class AdminApplySubscriptionPlanToInstituteSerializer(serializers.Serializer):
    institute = serializers.UUIDField()
    grant_modes = serializers.ListField(
        child=serializers.ChoiceField(choices=("included", "trial", "optional_addon")),
        required=False,
        allow_empty=False,
        default=("included", "trial"),
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class InstituteRequestableSubscriptionPlanSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    cycles = AdminSubscriptionPlanCycleSerializer(many=True, read_only=True)
    question_bank_package_links = serializers.SerializerMethodField()

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
            "cycles",
            "question_bank_package_links",
        )

    def get_question_bank_package_links(self, obj):
        active_links = [link for link in obj.question_bank_package_links.all() if link.is_active]
        return AdminSubscriptionPlanQuestionBankPackageSerializer(active_links, many=True).data


class InstituteSubscriptionRequestSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    institute_code = serializers.CharField(source="institute.code", read_only=True)
    subscription_plan_name = serializers.CharField(source="subscription_plan_cycle.plan.name", read_only=True)
    subscription_plan_code = serializers.CharField(source="subscription_plan_cycle.plan.code", read_only=True)
    subscription_cycle_label = serializers.SerializerMethodField()
    requested_by_label = serializers.SerializerMethodField()
    reviewed_by_label = serializers.SerializerMethodField()
    activation_summary = serializers.SerializerMethodField()

    class Meta:
        model = InstituteSubscriptionRequest
        fields = (
            "id",
            "institute",
            "institute_name",
            "institute_code",
            "subscription_plan_cycle",
            "subscription_plan_name",
            "subscription_plan_code",
            "subscription_cycle_label",
            "status",
            "requested_by",
            "requested_by_label",
            "reviewed_by",
            "reviewed_by_label",
            "reviewed_at",
            "grant_modes",
            "notes",
            "operator_notes",
            "activation_summary",
            "metadata",
            "created_at",
            "updated_at",
            "is_active",
        )

    def get_subscription_cycle_label(self, obj):
        cycle = obj.subscription_plan_cycle
        return f"{cycle.billing_interval} x {cycle.interval_count}"

    def get_requested_by_label(self, obj):
        if not obj.requested_by_id:
            return None
        full_name = obj.requested_by.get_full_name().strip()
        return full_name or obj.requested_by.username

    def get_reviewed_by_label(self, obj):
        if not obj.reviewed_by_id:
            return None
        full_name = obj.reviewed_by.get_full_name().strip()
        return full_name or obj.reviewed_by.username

    def get_activation_summary(self, obj):
        metadata = obj.metadata if isinstance(obj.metadata, dict) else {}
        package_codes = metadata.get("question_bank_package_codes") or metadata.get("requested_package_codes") or []
        package_names = metadata.get("question_bank_package_names") or metadata.get("requested_package_names") or []
        entitlement_ids = metadata.get("entitlement_ids") or []
        return {
            "decision": metadata.get("decision"),
            "requested_package_count": metadata.get("requested_package_count", len(package_codes)),
            "package_codes": package_codes,
            "package_names": package_names,
            "entitlement_count": metadata.get("entitlement_count", len(entitlement_ids)),
            "entitlement_ids": entitlement_ids,
        }


class CreateInstituteSubscriptionRequestSerializer(serializers.Serializer):
    subscription_plan_cycle = serializers.UUIDField()
    grant_modes = serializers.ListField(
        child=serializers.ChoiceField(choices=("included", "trial", "optional_addon")),
        required=False,
        allow_empty=False,
        default=("included", "trial"),
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    metadata = serializers.JSONField(required=False)


class ReviewInstituteSubscriptionRequestSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=("approve", "reject"))
    operator_notes = serializers.CharField(required=False, allow_blank=True, default="")


class AdminQuestionBankPackageScopeSummarySerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    topic_name = serializers.CharField(source="topic.name", read_only=True)

    class Meta:
        model = QuestionBankPackageScope
        fields = (
            "id",
            "program",
            "program_name",
            "subject",
            "subject_name",
            "topic",
            "topic_name",
            "question_source_type",
            "difficulty_level",
            "question_type",
            "master_visibility",
            "max_questions_total",
            "max_questions_per_topic",
            "metadata",
            "is_active",
        )


class AdminQuestionBankPackageScopeInputSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    program = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    subject = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    topic = serializers.PrimaryKeyRelatedField(
        queryset=Topic.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = QuestionBankPackageScope
        fields = (
            "id",
            "program",
            "subject",
            "topic",
            "question_source_type",
            "difficulty_level",
            "question_type",
            "master_visibility",
            "max_questions_total",
            "max_questions_per_topic",
            "metadata",
            "is_active",
        )


class AdminQuestionBankPackageSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    institute_code = serializers.CharField(source="institute.code", read_only=True)
    display_name = serializers.SerializerMethodField()
    package_family_label = serializers.SerializerMethodField()
    commercial_labels = serializers.SerializerMethodField()
    recommended_for_labels = serializers.SerializerMethodField()
    coverage_program_labels = serializers.SerializerMethodField()
    coverage_subject_labels = serializers.SerializerMethodField()
    coverage_topic_labels = serializers.SerializerMethodField()
    program_count = serializers.SerializerMethodField()
    subject_count = serializers.SerializerMethodField()
    topic_count = serializers.SerializerMethodField()
    coverage_summary = serializers.SerializerMethodField()
    scope_count = serializers.SerializerMethodField()
    active_entitlement_count = serializers.SerializerMethodField()
    linked_plan_count = serializers.SerializerMethodField()
    default_plan_count = serializers.SerializerMethodField()
    usage_entry_count = serializers.SerializerMethodField()
    scopes = AdminQuestionBankPackageScopeSummarySerializer(many=True, read_only=True)

    class Meta:
        model = QuestionBankPackage
        fields = (
            "id",
            "institute",
            "institute_name",
            "institute_code",
            "name",
            "code",
            "description",
            "display_name",
            "package_type",
            "package_family_label",
            "ownership_type",
            "access_mode",
            "is_public_catalog",
            "sort_order",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
            "commercial_labels",
            "recommended_for_labels",
            "coverage_program_labels",
            "coverage_subject_labels",
            "coverage_topic_labels",
            "program_count",
            "subject_count",
            "topic_count",
            "coverage_summary",
            "scope_count",
            "active_entitlement_count",
            "linked_plan_count",
            "default_plan_count",
            "usage_entry_count",
            "scopes",
        )

    def _title_case_label(self, value):
        if not value:
            return None
        return str(value).replace("_", " ").strip().title()

    def _collect_scope_labels(self, obj, attribute):
        labels = []
        for scope in obj.scopes.all():
            if not scope.is_active:
                continue
            related = getattr(scope, attribute, None)
            label = getattr(related, "name", None)
            if label:
                labels.append(label)
        return sorted(set(labels))

    def get_display_name(self, obj):
        return f"{obj.name} ({obj.code})"

    def get_package_family_label(self, obj):
        metadata = obj.metadata or {}
        family = (
            metadata.get("package_family_label")
            or metadata.get("package_family")
            or metadata.get("assessment_family")
        )
        return self._title_case_label(family)

    def get_commercial_labels(self, obj):
        metadata = obj.metadata or {}
        labels = [
            self._title_case_label(obj.package_type),
            self._title_case_label(obj.access_mode),
            "Public Catalog" if obj.is_public_catalog else "Private Catalog",
            "Platform Owned" if obj.ownership_type == "platform" else "Institute Owned",
        ]
        extra_labels = metadata.get("commercial_labels")
        if isinstance(extra_labels, (list, tuple)):
            labels.extend(str(item).strip() for item in extra_labels if str(item).strip())
        elif isinstance(extra_labels, str) and extra_labels.strip():
            labels.append(extra_labels.strip())
        return list(dict.fromkeys(filter(None, labels)))

    def get_recommended_for_labels(self, obj):
        metadata = obj.metadata or {}
        raw_labels = (
            metadata.get("recommended_for_labels")
            or metadata.get("recommended_for")
            or metadata.get("audience_tags")
            or []
        )
        if isinstance(raw_labels, str):
            raw_labels = [raw_labels]
        return [
            self._title_case_label(item)
            for item in raw_labels
            if self._title_case_label(item)
        ]

    def get_coverage_program_labels(self, obj):
        return self._collect_scope_labels(obj, "program")

    def get_coverage_subject_labels(self, obj):
        return self._collect_scope_labels(obj, "subject")

    def get_coverage_topic_labels(self, obj):
        return self._collect_scope_labels(obj, "topic")

    def get_program_count(self, obj):
        return len(self.get_coverage_program_labels(obj))

    def get_subject_count(self, obj):
        return len(self.get_coverage_subject_labels(obj))

    def get_topic_count(self, obj):
        return len(self.get_coverage_topic_labels(obj))

    def get_coverage_summary(self, obj):
        parts = []
        program_count = self.get_program_count(obj)
        subject_count = self.get_subject_count(obj)
        topic_count = self.get_topic_count(obj)
        scope_count = self.get_scope_count(obj)

        if subject_count:
            parts.append(f"{subject_count} subject{'s' if subject_count != 1 else ''}")
        elif program_count:
            parts.append(f"{program_count} program{'s' if program_count != 1 else ''}")

        if topic_count:
            parts.append(f"{topic_count} topic{'s' if topic_count != 1 else ''}")

        parts.append(f"{scope_count} scope row{'s' if scope_count != 1 else ''}")
        return " · ".join(parts)

    def get_scope_count(self, obj):
        return len([scope for scope in obj.scopes.all() if scope.is_active])

    def get_active_entitlement_count(self, obj):
        return len(
            [
                entitlement
                for entitlement in obj.institute_entitlements.all()
                if entitlement.is_active and entitlement.status == "active"
            ]
        )

    def get_linked_plan_count(self, obj):
        return len(
            [
                link
                for link in obj.subscription_plan_links.all()
                if link.is_active
            ]
        )

    def get_default_plan_count(self, obj):
        return len(
            [
                link
                for link in obj.subscription_plan_links.all()
                if link.is_active and link.is_default
            ]
        )

    def get_usage_entry_count(self, obj):
        return len([entry for entry in obj.usage_entries.all() if entry.is_active])


class AdminQuestionBankPackageUpsertSerializer(serializers.ModelSerializer):
    scopes = AdminQuestionBankPackageScopeInputSerializer(many=True, required=False)

    class Meta:
        model = QuestionBankPackage
        fields = (
            "id",
            "institute",
            "name",
            "code",
            "description",
            "package_type",
            "ownership_type",
            "access_mode",
            "is_public_catalog",
            "sort_order",
            "metadata",
            "is_active",
            "scopes",
        )

    def validate_scopes(self, value):
        return value or []

    def validate(self, attrs):
        package_type = attrs.get("package_type", getattr(self.instance, "package_type", ""))
        scopes = attrs.get("scopes")
        if scopes is None:
            return attrs

        active_scopes = [scope for scope in scopes if scope.get("is_active", True)]
        if package_type != QuestionBankPackageType.FEATURE_BUNDLE and not active_scopes:
            raise serializers.ValidationError(
                {"scopes": "At least one active scope row is required for this package type."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        scopes_data = validated_data.pop("scopes", []) or []
        package = QuestionBankPackage.objects.create(**validated_data)
        self._sync_scopes(package=package, scopes_data=scopes_data)
        return package

    @transaction.atomic
    def update(self, instance, validated_data):
        scopes_data = validated_data.pop("scopes", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if scopes_data is not None:
            self._sync_scopes(package=instance, scopes_data=scopes_data or [])
        return instance

    def _sync_scopes(self, *, package, scopes_data):
        existing_scopes = {
            str(scope.id): scope
            for scope in package.scopes.all()
        }
        requested_scope_ids: set[str] = set()

        for scope_data in scopes_data:
            scope_id = str(scope_data.pop("id", "") or "")
            if scope_id:
                requested_scope_ids.add(scope_id)
                if scope_id not in existing_scopes:
                    raise serializers.ValidationError(
                        {"scopes": f"Scope {scope_id} does not belong to the selected package."}
                    )
                scope = existing_scopes[scope_id]
                for attr, value in scope_data.items():
                    setattr(scope, attr, value)
                scope.institute = package.institute
                scope.package = package
                scope.full_clean()
                scope.save()
                continue

            QuestionBankPackageScope.objects.create(
                institute=package.institute,
                package=package,
                **scope_data,
            )

        for scope_id, existing_scope in existing_scopes.items():
            if scope_id not in requested_scope_ids and existing_scope.is_active:
                existing_scope.is_active = False
                existing_scope.save(update_fields=["is_active", "updated_at"])


class AdminInstituteQuestionEntitlementSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    institute_code = serializers.CharField(source="institute.code", read_only=True)
    question_bank_package_name = serializers.CharField(source="question_bank_package.name", read_only=True)
    question_bank_package_code = serializers.CharField(source="question_bank_package.code", read_only=True)
    question_bank_package_type = serializers.CharField(source="question_bank_package.package_type", read_only=True)
    question_bank_package_ownership_type = serializers.CharField(
        source="question_bank_package.ownership_type",
        read_only=True,
    )
    question_bank_package_access_mode = serializers.CharField(
        source="question_bank_package.access_mode",
        read_only=True,
    )
    question_bank_package_is_public_catalog = serializers.BooleanField(
        source="question_bank_package.is_public_catalog",
        read_only=True,
    )
    package_owner_institute_name = serializers.CharField(
        source="question_bank_package.institute.name",
        read_only=True,
    )
    package_owner_institute_code = serializers.CharField(
        source="question_bank_package.institute.code",
        read_only=True,
    )
    subscription_plan_name = serializers.CharField(source="subscription_plan.name", read_only=True)
    subscription_plan_code = serializers.CharField(source="subscription_plan.code", read_only=True)
    subscription_cycle_label = serializers.SerializerMethodField()
    granted_by_label = serializers.SerializerMethodField()
    revoked_by_label = serializers.SerializerMethodField()
    scope_count = serializers.SerializerMethodField()
    scope_program_labels = serializers.SerializerMethodField()
    scope_subject_labels = serializers.SerializerMethodField()
    scope_topic_labels = serializers.SerializerMethodField()
    scope_summary = serializers.SerializerMethodField()
    quota_configured = serializers.SerializerMethodField()
    quota_status = serializers.SerializerMethodField()
    quota_watch_state = serializers.SerializerMethodField()
    quota_usage_total = serializers.SerializerMethodField()
    quota_remaining_min = serializers.SerializerMethodField()
    quota_scope_summary = serializers.SerializerMethodField()

    class Meta:
        model = InstituteQuestionEntitlement
        fields = (
            "id",
            "institute",
            "institute_name",
            "institute_code",
            "question_bank_package",
            "question_bank_package_name",
            "question_bank_package_code",
            "question_bank_package_type",
            "question_bank_package_ownership_type",
            "question_bank_package_access_mode",
            "question_bank_package_is_public_catalog",
            "package_owner_institute_name",
            "package_owner_institute_code",
            "status",
            "granted_via",
            "subscription_plan",
            "subscription_plan_name",
            "subscription_plan_code",
            "subscription_plan_cycle",
            "subscription_cycle_label",
            "starts_at",
            "ends_at",
            "granted_by",
            "granted_by_label",
            "revoked_by",
            "revoked_by_label",
            "scope_count",
            "scope_program_labels",
            "scope_subject_labels",
            "scope_topic_labels",
            "scope_summary",
            "quota_configured",
            "quota_status",
            "quota_watch_state",
            "quota_usage_total",
            "quota_remaining_min",
            "quota_scope_summary",
            "notes",
            "metadata",
            "created_at",
            "updated_at",
            "is_active",
        )

    def get_subscription_cycle_label(self, obj):
        if obj.subscription_plan_cycle_id is None:
            return None
        cycle = obj.subscription_plan_cycle
        return f"{cycle.billing_interval} x {cycle.interval_count}"

    def get_granted_by_label(self, obj):
        if not obj.granted_by_id:
            return None
        full_name = obj.granted_by.get_full_name().strip()
        return full_name or obj.granted_by.username

    def get_revoked_by_label(self, obj):
        if not obj.revoked_by_id:
            return None
        full_name = obj.revoked_by.get_full_name().strip()
        return full_name or obj.revoked_by.username

    def _active_scopes(self, obj):
        return [scope for scope in obj.question_bank_package.scopes.all() if scope.is_active]

    def get_scope_count(self, obj):
        return len(self._active_scopes(obj))

    def _unique_labels(self, values):
        labels = []
        seen = set()
        for value in values:
            label = str(value or "").strip()
            normalized = label.lower()
            if not label or normalized in seen:
                continue
            seen.add(normalized)
            labels.append(label)
        return labels

    def get_scope_program_labels(self, obj):
        return self._unique_labels(scope.program.name for scope in self._active_scopes(obj) if scope.program_id)

    def get_scope_subject_labels(self, obj):
        return self._unique_labels(scope.subject.name for scope in self._active_scopes(obj) if scope.subject_id)

    def get_scope_topic_labels(self, obj):
        return self._unique_labels(scope.topic.name for scope in self._active_scopes(obj) if scope.topic_id)

    def get_scope_summary(self, obj):
        summaries = []
        for scope in self._active_scopes(obj):
            parts = []
            if scope.program_id:
                parts.append(scope.program.name)
            if scope.subject_id:
                parts.append(scope.subject.name)
            if scope.topic_id:
                parts.append(scope.topic.name)

            quota_parts = []
            if scope.max_questions_total:
                quota_parts.append(f"{scope.max_questions_total} total")
            if scope.max_questions_per_topic:
                quota_parts.append(f"{scope.max_questions_per_topic} per topic")

            summary = " -> ".join(parts) if parts else "Scoped package segment"
            if quota_parts:
                summary = f"{summary} ({', '.join(quota_parts)})"
            summaries.append(summary)
        return summaries

    def _quota_summary(self, obj):
        cache_key = "_cached_quota_summary"
        cached = getattr(obj, cache_key, None)
        if cached is None:
            cached = get_entitlement_quota_summary(obj)
            setattr(obj, cache_key, cached)
        return cached

    def get_quota_configured(self, obj):
        return self._quota_summary(obj)["quota_configured"]

    def get_quota_status(self, obj):
        return self._quota_summary(obj)["quota_status"]

    def get_quota_usage_total(self, obj):
        return self._quota_summary(obj)["quota_usage_total"]

    def get_quota_watch_state(self, obj):
        return self._quota_summary(obj)["quota_watch_state"]

    def get_quota_remaining_min(self, obj):
        return self._quota_summary(obj)["quota_remaining_min"]

    def get_quota_scope_summary(self, obj):
        return self._quota_summary(obj)["quota_scope_summary"]


class AdminInstituteQuestionEntitlementStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            InstituteQuestionEntitlementStatus.ACTIVE,
            InstituteQuestionEntitlementStatus.PAUSED,
            InstituteQuestionEntitlementStatus.REVOKED,
        ]
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    starts_at = serializers.DateTimeField(required=False, allow_null=True)
    ends_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        instance = self.context.get("instance")
        starts_at = attrs["starts_at"] if "starts_at" in attrs else getattr(instance, "starts_at", None)
        ends_at = attrs["ends_at"] if "ends_at" in attrs else getattr(instance, "ends_at", None)

        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError(
                {"ends_at": "End time must be later than the start time."}
            )

        return attrs


class AdminInstituteQuestionFeatureEntitlementSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    institute_code = serializers.CharField(source="institute.code", read_only=True)
    source_package_name = serializers.CharField(source="source_package.name", read_only=True)
    source_package_code = serializers.CharField(source="source_package.code", read_only=True)
    source_package_type = serializers.CharField(source="source_package.package_type", read_only=True)
    source_subscription_plan_name = serializers.CharField(source="source_subscription_plan.name", read_only=True)
    source_subscription_plan_code = serializers.CharField(source="source_subscription_plan.code", read_only=True)

    class Meta:
        model = InstituteQuestionFeatureEntitlement
        fields = (
            "id",
            "institute",
            "institute_name",
            "institute_code",
            "feature_code",
            "status",
            "source_package",
            "source_package_name",
            "source_package_code",
            "source_package_type",
            "source_subscription_plan",
            "source_subscription_plan_name",
            "source_subscription_plan_code",
            "starts_at",
            "ends_at",
            "metadata",
            "created_at",
            "updated_at",
            "is_active",
        )


class AdminInstituteQuestionFeatureEntitlementStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            InstituteQuestionEntitlementStatus.ACTIVE,
            InstituteQuestionEntitlementStatus.PAUSED,
            InstituteQuestionEntitlementStatus.REVOKED,
        ]
    )


class AdminInstituteQuestionUsageLedgerSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source="institute.name", read_only=True)
    institute_code = serializers.CharField(source="institute.code", read_only=True)
    question_bank_package_name = serializers.CharField(source="question_bank_package.name", read_only=True)
    question_bank_package_code = serializers.CharField(source="question_bank_package.code", read_only=True)
    entitlement_status = serializers.CharField(source="entitlement.status", read_only=True)
    master_question_text = serializers.CharField(source="master_question.question_text", read_only=True)
    question_text = serializers.CharField(source="question.question_text", read_only=True)
    exam_title = serializers.CharField(source="exam.title", read_only=True)
    performed_by_label = serializers.SerializerMethodField()

    class Meta:
        model = InstituteQuestionUsageLedger
        fields = (
            "id",
            "institute",
            "institute_name",
            "institute_code",
            "question_bank_package",
            "question_bank_package_name",
            "question_bank_package_code",
            "entitlement",
            "entitlement_status",
            "action_type",
            "master_question",
            "master_question_text",
            "question",
            "question_text",
            "exam",
            "exam_title",
            "quantity",
            "performed_by",
            "performed_by_label",
            "effective_at",
            "metadata",
            "created_at",
            "updated_at",
            "is_active",
        )

    def get_performed_by_label(self, obj):
        if not obj.performed_by_id:
            return None
        full_name = obj.performed_by.get_full_name().strip()
        return full_name or obj.performed_by.username


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
