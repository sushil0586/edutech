from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.economy.models import (
    ContentAccessPolicy,
    QuestionBankAccessMode,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageGrantMode,
    QuestionBankPackageType,
    ReferralProgram,
    RewardRule,
    StarPack,
    SubscriptionPlan,
    SubscriptionPlanQuestionBankPackage,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
    UnlockRule,
)
from apps.institutes.models import Institute


BASE_REWARD_RULE_SEEDS = [
    {
        "seed_code": "default_signup_bonus_v1",
        "name": "Default signup bonus",
        "rule_type": "signup",
        "stars_awarded": 100,
        "priority": 10,
        "metadata": {"phase": "phase_1"},
    },
    {
        "seed_code": "exam_completion_v1",
        "name": "Exam completion reward",
        "rule_type": "exam_completion",
        "stars_awarded": 10,
        "priority": 20,
        "metadata": {"phase": "phase_2"},
    },
    {
        "seed_code": "score_threshold_80_v1",
        "name": "Score 80 reward",
        "rule_type": "score_threshold",
        "stars_awarded": 20,
        "score_threshold_percentage": Decimal("80.00"),
        "priority": 30,
        "metadata": {"phase": "phase_2"},
    },
    {
        "seed_code": "score_threshold_90_v1",
        "name": "Score 90 reward",
        "rule_type": "score_threshold",
        "stars_awarded": 40,
        "score_threshold_percentage": Decimal("90.00"),
        "priority": 31,
        "metadata": {"phase": "phase_2"},
    },
]

ADVANCED_REWARD_RULE_SEEDS = [
    {
        "seed_code": "streak_reward_7_day_v1",
        "name": "7 day streak reward",
        "rule_type": "streak",
        "stars_awarded": 30,
        "priority": 40,
        "metadata": {
            "phase": "phase_3",
            "template": True,
            "scenario": "retention_streak",
            "recommended_streak_days": 7,
        },
    },
    {
        "seed_code": "topic_mastery_reward_v1",
        "name": "Topic mastery reward",
        "rule_type": "topic_mastery",
        "stars_awarded": 50,
        "priority": 50,
        "metadata": {
            "phase": "phase_3",
            "template": True,
            "scenario": "mastery_milestone",
        },
    },
    {
        "seed_code": "admin_campaign_reward_v1",
        "name": "Admin campaign reward",
        "rule_type": "admin_campaign",
        "stars_awarded": 75,
        "priority": 60,
        "metadata": {
            "phase": "phase_3",
            "template": True,
            "scenario": "campaign_or_retention_drop",
        },
    },
]

REFERRAL_PROGRAM_SEEDS = [
    {
        "seed_code": "default_referral_program_v1",
        "name": "Default referral program",
        "referrer_stars": 50,
        "referee_stars": 50,
        "reward_side": "both",
        "metadata": {"phase": "phase_1"},
    }
]

STAR_PACK_SEEDS = [
    {
        "seed_code": "stars-100",
        "name": "100 Stars",
        "code": "stars-100",
        "stars_credited": 100,
        "price_amount": Decimal("100.00"),
        "currency": "INR",
        "sort_order": 10,
        "metadata": {"phase": "phase_1"},
    },
    {
        "seed_code": "stars-500",
        "name": "500 Stars",
        "code": "stars-500",
        "stars_credited": 500,
        "price_amount": Decimal("299.00"),
        "currency": "INR",
        "sort_order": 20,
        "metadata": {"phase": "phase_1"},
    },
    {
        "seed_code": "stars-1000",
        "name": "1000 Stars",
        "code": "stars-1000",
        "stars_credited": 1000,
        "price_amount": Decimal("499.00"),
        "currency": "INR",
        "sort_order": 30,
        "metadata": {"phase": "phase_1"},
    },
]

BASE_SUBSCRIPTION_PLAN_SEEDS = [
    {
        "seed_code": "starter",
        "name": "Starter",
        "code": "starter",
        "description": "Basic recurring access with monthly stars.",
        "metadata": {"phase": "phase_1"},
        "cycles": [
            {
                "seed_code": "starter-monthly",
                "billing_interval": "monthly",
                "interval_count": 1,
                "price_amount": Decimal("199.00"),
                "currency": "INR",
                "metadata": {"phase": "phase_1"},
                "star_credit_rules": [
                    {
                        "seed_code": "starter-monthly-activation-renewal",
                        "stars_credited": 200,
                        "credit_on_activation": True,
                        "credit_on_renewal": True,
                        "metadata": {"phase": "phase_1"},
                    }
                ],
            }
        ],
    },
    {
        "seed_code": "scholar",
        "name": "Scholar",
        "code": "scholar",
        "description": "Higher recurring value with more star credit.",
        "metadata": {"phase": "phase_1"},
        "cycles": [
            {
                "seed_code": "scholar-monthly",
                "billing_interval": "monthly",
                "interval_count": 1,
                "price_amount": Decimal("399.00"),
                "currency": "INR",
                "metadata": {"phase": "phase_1"},
                "star_credit_rules": [
                    {
                        "seed_code": "scholar-monthly-activation-renewal",
                        "stars_credited": 500,
                        "credit_on_activation": True,
                        "credit_on_renewal": True,
                        "metadata": {"phase": "phase_1"},
                    }
                ],
            }
        ],
    },
]

BASE_QUESTION_BANK_PACKAGE_SEEDS = [
    {
        "seed_code": "starter-question-bank-access",
        "plan_seed_code": "starter",
        "name": "Starter Question Bank Access",
        "code": "starter-question-bank-access",
        "description": "Starter package baseline for subscription-backed question-bank access.",
        "package_type": QuestionBankPackageType.SUBJECT_LIBRARY,
        "access_mode": QuestionBankAccessMode.MATERIALIZE_ON_ENTITLEMENT,
        "grant_mode": QuestionBankPackageGrantMode.INCLUDED,
        "sort_order": 10,
        "metadata": {"phase": "phase_1", "template": True},
    },
    {
        "seed_code": "scholar-question-bank-access",
        "plan_seed_code": "scholar",
        "name": "Scholar Question Bank Access",
        "code": "scholar-question-bank-access",
        "description": "Scholar package baseline for broader subscription-backed question-bank access.",
        "package_type": QuestionBankPackageType.SUBJECT_LIBRARY,
        "access_mode": QuestionBankAccessMode.MATERIALIZE_ON_ENTITLEMENT,
        "grant_mode": QuestionBankPackageGrantMode.INCLUDED,
        "sort_order": 20,
        "metadata": {"phase": "phase_1", "template": True},
    },
]

ADVANCED_SUBSCRIPTION_PLAN_SEEDS = [
    {
        "seed_code": "scholar",
        "name": "Scholar",
        "code": "scholar",
        "description": "Higher recurring value with more star credit.",
        "metadata": {"phase": "phase_2", "template": True},
        "cycles": [
            {
                "seed_code": "scholar-yearly",
                "billing_interval": "yearly",
                "interval_count": 1,
                "price_amount": Decimal("3999.00"),
                "currency": "INR",
                "metadata": {"phase": "phase_2", "template": True},
                "star_credit_rules": [
                    {
                        "seed_code": "scholar-yearly-activation-renewal",
                        "stars_credited": 6500,
                        "credit_on_activation": True,
                        "credit_on_renewal": True,
                        "metadata": {"phase": "phase_2", "template": True},
                    }
                ],
            }
        ],
    }
]

BASE_CONTENT_ACCESS_POLICY_SEEDS = [
    {
        "seed_code": "access-template-free-sample",
        "content_type": "exam",
        "content_key": "sample-demo-exam",
        "content_label": "Sample Demo Exam Template",
        "policy_type": "free",
        "star_cost": 0,
        "entitlement_code": "",
        "priority": 10,
        "metadata": {"phase": "phase_1", "template": True},
    },
    {
        "seed_code": "access-template-premium-mock",
        "content_type": "exam",
        "content_key": "premium-mock-exam",
        "content_label": "Premium Mock Exam Template",
        "policy_type": "stars_only",
        "star_cost": 200,
        "entitlement_code": "",
        "priority": 20,
        "metadata": {"phase": "phase_1", "template": True},
    },
    {
        "seed_code": "access-template-chapter-premium",
        "content_type": "exam",
        "content_key": "chapter-premium-exam",
        "content_label": "Chapter Premium Exam Template",
        "policy_type": "stars_only",
        "star_cost": 100,
        "entitlement_code": "",
        "priority": 30,
        "metadata": {"phase": "phase_1", "template": True},
    },
    {
        "seed_code": "access-template-subscription-only",
        "content_type": "exam",
        "content_key": "subscription-member-exam",
        "content_label": "Subscription Member Exam Template",
        "policy_type": "entitlement_only",
        "star_cost": 0,
        "entitlement_code": "subscription:starter",
        "priority": 35,
        "metadata": {"phase": "phase_1", "template": True},
    },
    {
        "seed_code": "access-template-subscription-premium",
        "content_type": "exam",
        "content_key": "subscription-premium-exam",
        "content_label": "Subscription Premium Exam Template",
        "policy_type": "stars_or_entitlement",
        "star_cost": 250,
        "entitlement_code": "subscription:starter",
        "priority": 40,
        "metadata": {"phase": "phase_1", "template": True},
    },
]

ADVANCED_CONTENT_ACCESS_POLICY_SEEDS = [
    {
        "seed_code": "access-template-sponsored-entitlement",
        "content_type": "exam",
        "content_key": "sponsored-school-exam",
        "content_label": "Sponsored School Exam Template",
        "policy_type": "entitlement_only",
        "star_cost": 0,
        "entitlement_code": "grant:school_sponsored_access",
        "priority": 50,
        "metadata": {"phase": "phase_2", "template": True},
    }
]

BASE_UNLOCK_RULE_SEEDS = [
    {
        "seed_code": "unlock-template-complete-three-tests",
        "content_type": "exam",
        "content_key": "advanced-topic-test",
        "content_label": "Advanced Topic Test Template",
        "rule_type": "exam_completion",
        "required_completion_count": 3,
        "priority": 10,
        "admin_override_allowed": True,
        "metadata": {"phase": "phase_2", "template": True},
    },
    {
        "seed_code": "unlock-template-score-seventy-five",
        "content_type": "exam",
        "content_key": "elite-mock-exam",
        "content_label": "Elite Mock Exam Template",
        "rule_type": "score_threshold",
        "required_score_percentage": Decimal("75.00"),
        "priority": 20,
        "admin_override_allowed": True,
        "metadata": {"phase": "phase_2", "template": True},
    },
    {
        "seed_code": "unlock-template-maintain-five-hundred-stars",
        "content_type": "exam",
        "content_key": "premium-contest-lane",
        "content_label": "Premium Contest Lane Template",
        "rule_type": "stars_balance",
        "required_star_balance": 500,
        "priority": 30,
        "admin_override_allowed": True,
        "metadata": {"phase": "phase_2", "template": True},
    },
    {
        "seed_code": "unlock-template-special-entitlement",
        "content_type": "bundle",
        "content_key": "special-entitlement-bundle",
        "content_label": "Special Entitlement Bundle Template",
        "rule_type": "entitlement",
        "required_entitlement_code": "bundle:special_access",
        "priority": 40,
        "admin_override_allowed": True,
        "metadata": {"phase": "phase_2", "template": True},
    },
    {
        "seed_code": "unlock-template-admin-approval",
        "content_type": "exam",
        "content_key": "institute-special-content",
        "content_label": "Institute Special Content Template",
        "rule_type": "admin_approval",
        "priority": 50,
        "admin_override_allowed": True,
        "metadata": {"phase": "phase_2", "template": True},
    },
]

ADVANCED_UNLOCK_RULE_SEEDS = [
    {
        "seed_code": "unlock-template-composite-merit-subscription",
        "content_type": "exam",
        "content_key": "merit-scholar-lane",
        "content_label": "Merit Scholar Lane Template",
        "rule_type": "composite",
        "priority": 60,
        "admin_override_allowed": True,
        "metadata": {
            "phase": "phase_3",
            "template": True,
            "logic": "all",
            "conditions": [
                {"rule_type": "score_threshold", "required_score_percentage": "80.00"},
                {"rule_type": "entitlement", "required_entitlement_code": "subscription:scholar"},
            ],
        },
    }
]


class Command(BaseCommand):
    help = "Seed default economy configuration from the platform layer for one or more institutes."

    def add_arguments(self, parser):
        parser.add_argument(
            "institute_codes",
            nargs="*",
            help="One or more institute codes to seed.",
        )
        parser.add_argument(
            "--all-active",
            action="store_true",
            help="Seed every active institute.",
        )
        parser.add_argument(
            "--include-future-templates",
            action="store_true",
            help=(
                "Also seed optional advanced templates such as yearly subscriptions, "
                "campaign rewards, and composite unlock examples."
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute_codes = options["institute_codes"] or []
        seed_all_active = options["all_active"]
        include_future_templates = options["include_future_templates"]

        if not seed_all_active and not institute_codes:
            raise CommandError("Provide institute code(s) or use --all-active.")

        institutes = self._resolve_institutes(institute_codes=institute_codes, seed_all_active=seed_all_active)
        summary = {
            "reward_rules": {"created": 0, "updated": 0},
            "referral_programs": {"created": 0, "updated": 0},
            "star_packs": {"created": 0, "updated": 0},
            "subscription_plans": {"created": 0, "updated": 0},
            "subscription_cycles": {"created": 0, "updated": 0},
            "subscription_credit_rules": {"created": 0, "updated": 0},
            "question_bank_packages": {"created": 0, "updated": 0},
            "subscription_plan_question_bank_packages": {"created": 0, "updated": 0},
            "content_access_policies": {"created": 0, "updated": 0},
            "unlock_rules": {"created": 0, "updated": 0},
        }

        for institute in institutes:
            self._seed_institute(
                institute=institute,
                summary=summary,
                include_future_templates=include_future_templates,
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Economy defaults seeded for institutes: "
                + ", ".join(institute.code for institute in institutes)
            )
        )
        self.stdout.write(
            "Template mode: "
            + ("baseline + future templates" if include_future_templates else "baseline only")
        )
        for label, counts in summary.items():
            self.stdout.write(
                f"- {label}: created={counts['created']} updated={counts['updated']}"
            )

    def _resolve_institutes(self, *, institute_codes, seed_all_active):
        queryset = Institute.objects.filter(is_active=True) if seed_all_active else Institute.objects.filter(code__in=institute_codes)
        institutes = list(queryset.order_by("code"))
        if not institutes:
            raise CommandError("No matching institutes found for economy seeding.")
        if not seed_all_active:
            found_codes = {institute.code for institute in institutes}
            missing_codes = [code for code in institute_codes if code not in found_codes]
            if missing_codes:
                raise CommandError(f"Institute(s) not found: {', '.join(missing_codes)}")
        return institutes

    def _seed_institute(self, *, institute, summary, include_future_templates):
        seeded_plans_by_seed_code = {}

        for payload in self._reward_rule_seeds(include_future_templates=include_future_templates):
            self._upsert_seeded_record(
                model=RewardRule,
                institute=institute,
                seed_code=payload["seed_code"],
                defaults={
                    "name": payload["name"],
                    "rule_type": payload["rule_type"],
                    "stars_awarded": payload["stars_awarded"],
                    "score_threshold_percentage": payload.get("score_threshold_percentage"),
                    "completion_count_threshold": payload.get("completion_count_threshold"),
                    "streak_count_threshold": payload.get("streak_count_threshold"),
                    "priority": payload["priority"],
                    "subject": None,
                    "is_active": payload.get("is_active", True),
                    "metadata": self._seed_metadata(payload["seed_code"], payload.get("metadata")),
                },
                summary=summary["reward_rules"],
            )

        for payload in REFERRAL_PROGRAM_SEEDS:
            self._upsert_seeded_record(
                model=ReferralProgram,
                institute=institute,
                seed_code=payload["seed_code"],
                defaults={
                    "name": payload["name"],
                    "referrer_stars": payload["referrer_stars"],
                    "referee_stars": payload["referee_stars"],
                    "reward_side": payload["reward_side"],
                    "is_active": payload.get("is_active", True),
                    "metadata": self._seed_metadata(payload["seed_code"], payload.get("metadata")),
                },
                summary=summary["referral_programs"],
            )

        for payload in self._star_pack_seeds(include_future_templates=include_future_templates):
            self._upsert_seeded_record(
                model=StarPack,
                institute=institute,
                seed_code=payload["seed_code"],
                defaults={
                    "name": payload["name"],
                    "code": payload["code"],
                    "stars_credited": payload["stars_credited"],
                    "price_amount": payload["price_amount"],
                    "currency": payload["currency"],
                    "sort_order": payload["sort_order"],
                    "is_active": payload.get("is_active", True),
                    "metadata": self._seed_metadata(payload["seed_code"], payload.get("metadata")),
                },
                summary=summary["star_packs"],
            )

        for payload in self._subscription_plan_seeds(include_future_templates=include_future_templates):
            plan, created = self._upsert_seeded_record(
                model=SubscriptionPlan,
                institute=institute,
                seed_code=payload["seed_code"],
                defaults={
                    "name": payload["name"],
                    "code": payload["code"],
                    "description": payload["description"],
                    "is_active": payload.get("is_active", True),
                    "metadata": self._seed_metadata(payload["seed_code"], payload.get("metadata")),
                },
                summary=summary["subscription_plans"],
                return_instance=True,
            )
            if plan is None:
                continue
            seeded_plans_by_seed_code[payload["seed_code"]] = plan
            for cycle_payload in payload["cycles"]:
                cycle, cycle_created = self._upsert_seeded_record(
                    model=SubscriptionPlanCycle,
                    institute=institute,
                    seed_code=cycle_payload["seed_code"],
                    defaults={
                        "plan": plan,
                        "billing_interval": cycle_payload["billing_interval"],
                        "interval_count": cycle_payload["interval_count"],
                        "price_amount": cycle_payload["price_amount"],
                        "currency": cycle_payload["currency"],
                        "is_active": cycle_payload.get("is_active", payload.get("is_active", True)),
                        "metadata": self._seed_metadata(
                            cycle_payload["seed_code"], cycle_payload.get("metadata")
                        ),
                    },
                    summary=summary["subscription_cycles"],
                    return_instance=True,
                )
                if cycle is None:
                    continue
                for credit_payload in cycle_payload["star_credit_rules"]:
                    self._upsert_seeded_record(
                        model=SubscriptionStarCreditRule,
                        institute=institute,
                        seed_code=credit_payload["seed_code"],
                        defaults={
                            "plan_cycle": cycle,
                            "stars_credited": credit_payload["stars_credited"],
                            "credit_on_activation": credit_payload["credit_on_activation"],
                            "credit_on_renewal": credit_payload["credit_on_renewal"],
                            "is_active": credit_payload.get(
                                "is_active",
                                cycle_payload.get("is_active", payload.get("is_active", True)),
                            ),
                            "metadata": self._seed_metadata(
                                credit_payload["seed_code"], credit_payload.get("metadata")
                            ),
                        },
                        summary=summary["subscription_credit_rules"],
                    )

        package_ownership_type = (
            QuestionBankOwnershipType.PLATFORM
            if (institute.metadata or {}).get("is_public_content_hub")
            else QuestionBankOwnershipType.INSTITUTE
        )
        for payload in self._question_bank_package_seeds():
            package, created = self._upsert_seeded_record(
                model=QuestionBankPackage,
                institute=institute,
                seed_code=payload["seed_code"],
                defaults={
                    "name": payload["name"],
                    "code": payload["code"],
                    "description": payload["description"],
                    "package_type": payload["package_type"],
                    "ownership_type": package_ownership_type,
                    "access_mode": payload["access_mode"],
                    "is_public_catalog": True,
                    "sort_order": payload["sort_order"],
                    "is_active": payload.get("is_active", True),
                    "metadata": self._seed_metadata(payload["seed_code"], payload.get("metadata")),
                },
                summary=summary["question_bank_packages"],
                return_instance=True,
            )
            if package is None:
                continue
            plan = seeded_plans_by_seed_code.get(payload["plan_seed_code"])
            if plan is None:
                continue
            self._upsert_seeded_record(
                model=SubscriptionPlanQuestionBankPackage,
                institute=institute,
                seed_code=f"{payload['plan_seed_code']}::{payload['seed_code']}",
                defaults={
                    "subscription_plan": plan,
                    "question_bank_package": package,
                    "grant_mode": payload.get("grant_mode", QuestionBankPackageGrantMode.INCLUDED),
                    "is_default": True,
                    "is_active": payload.get("is_active", True),
                    "metadata": self._seed_metadata(
                        f"{payload['plan_seed_code']}::{payload['seed_code']}",
                        {
                            **(payload.get("metadata") or {}),
                            "plan_seed_code": payload["plan_seed_code"],
                            "package_seed_code": payload["seed_code"],
                        },
                    ),
                },
                summary=summary["subscription_plan_question_bank_packages"],
            )

        for payload in self._content_access_policy_seeds(
            include_future_templates=include_future_templates
        ):
            self._upsert_seeded_record(
                model=ContentAccessPolicy,
                institute=institute,
                seed_code=payload["seed_code"],
                defaults={
                    "subject": None,
                    "content_type": payload["content_type"],
                    "content_key": payload["content_key"],
                    "content_label": payload["content_label"],
                    "policy_type": payload["policy_type"],
                    "star_cost": payload["star_cost"],
                    "entitlement_code": payload["entitlement_code"],
                    "priority": payload["priority"],
                    "is_active": payload.get("is_active", True),
                    "metadata": self._seed_metadata(payload["seed_code"], payload.get("metadata")),
                },
                summary=summary["content_access_policies"],
            )

        for payload in self._unlock_rule_seeds(include_future_templates=include_future_templates):
            self._upsert_seeded_record(
                model=UnlockRule,
                institute=institute,
                seed_code=payload["seed_code"],
                defaults={
                    "subject": None,
                    "content_type": payload["content_type"],
                    "content_key": payload["content_key"],
                    "content_label": payload["content_label"],
                    "rule_type": payload["rule_type"],
                    "required_star_balance": payload.get("required_star_balance"),
                    "required_entitlement_code": payload.get("required_entitlement_code", ""),
                    "required_completion_count": payload.get("required_completion_count"),
                    "required_score_percentage": payload.get("required_score_percentage"),
                    "admin_override_allowed": payload["admin_override_allowed"],
                    "priority": payload["priority"],
                    "is_active": payload.get("is_active", True),
                    "metadata": self._seed_metadata(payload["seed_code"], payload.get("metadata")),
                },
                summary=summary["unlock_rules"],
            )

    def _reward_rule_seeds(self, *, include_future_templates):
        seeds = list(BASE_REWARD_RULE_SEEDS)
        if include_future_templates:
            seeds.extend(ADVANCED_REWARD_RULE_SEEDS)
        return seeds

    def _star_pack_seeds(self, *, include_future_templates):
        seeds = list(STAR_PACK_SEEDS)
        if include_future_templates:
            seeds.append(
                {
                    "seed_code": "stars-2500",
                    "name": "2500 Stars",
                    "code": "stars-2500",
                    "stars_credited": 2500,
                    "price_amount": Decimal("999.00"),
                    "currency": "INR",
                    "sort_order": 40,
                    "metadata": {"phase": "phase_2", "template": True},
                }
            )
        return seeds

    def _subscription_plan_seeds(self, *, include_future_templates):
        seeds = list(BASE_SUBSCRIPTION_PLAN_SEEDS)
        if include_future_templates:
            seeds.extend(ADVANCED_SUBSCRIPTION_PLAN_SEEDS)
        return seeds

    def _content_access_policy_seeds(self, *, include_future_templates):
        seeds = list(BASE_CONTENT_ACCESS_POLICY_SEEDS)
        if include_future_templates:
            seeds.extend(ADVANCED_CONTENT_ACCESS_POLICY_SEEDS)
        return seeds

    def _question_bank_package_seeds(self):
        return list(BASE_QUESTION_BANK_PACKAGE_SEEDS)

    def _unlock_rule_seeds(self, *, include_future_templates):
        seeds = list(BASE_UNLOCK_RULE_SEEDS)
        if include_future_templates:
            seeds.extend(ADVANCED_UNLOCK_RULE_SEEDS)
        return seeds

    def _seed_metadata(self, seed_code, extra_metadata=None):
        metadata = {"seed_code": seed_code}
        metadata.update(extra_metadata or {})
        return metadata

    def _upsert_seeded_record(
        self,
        *,
        model,
        institute,
        seed_code,
        defaults,
        summary,
        return_instance=False,
    ):
        instance = (
            model.objects.filter(institute=institute, metadata__seed_code=seed_code)
            .order_by("created_at")
            .first()
        )
        created = instance is None
        if created:
            instance = model(institute=institute, **defaults)
        else:
            for field_name, value in defaults.items():
                setattr(instance, field_name, value)
        instance.save()
        summary["created" if created else "updated"] += 1
        if return_instance:
            return instance, created
        return created
