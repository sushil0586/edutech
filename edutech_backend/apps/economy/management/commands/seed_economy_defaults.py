import json
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

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

ECONOMY_DEFAULT_SEEDS_PATH = (
    Path(__file__).resolve().parents[2] / "contracts" / "economy_default_seeds.json"
)


def _convert_numeric_strings(value):
    if isinstance(value, list):
        return [_convert_numeric_strings(item) for item in value]
    if isinstance(value, dict):
        return {key: _convert_numeric_strings(item) for key, item in value.items()}
    if isinstance(value, str):
        try:
            if "." in value and all(part.isdigit() for part in value.split(".", 1)):
                return Decimal(value)
        except Exception:
            return value
    return value


@lru_cache(maxsize=1)
def load_economy_default_seeds():
    with ECONOMY_DEFAULT_SEEDS_PATH.open(encoding="utf-8") as manifest_file:
        payload = json.load(manifest_file)
    if not isinstance(payload, dict):
        raise ValueError("Economy default seeds manifest must be a JSON object.")
    return _convert_numeric_strings(payload)


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

        for payload in self._referral_program_seeds(include_future_templates=include_future_templates):
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
        manifest = load_economy_default_seeds()
        seeds = list(manifest["reward_rules"]["baseline"])
        if include_future_templates:
            seeds.extend(manifest["reward_rules"]["advanced"])
        return seeds

    def _referral_program_seeds(self, *, include_future_templates):
        manifest = load_economy_default_seeds()
        seeds = list(manifest["referral_programs"]["baseline"])
        if include_future_templates:
            seeds.extend(manifest["referral_programs"]["advanced"])
        return seeds

    def _star_pack_seeds(self, *, include_future_templates):
        manifest = load_economy_default_seeds()
        seeds = list(manifest["star_packs"]["baseline"])
        if include_future_templates:
            seeds.extend(manifest["star_packs"]["advanced"])
        return seeds

    def _subscription_plan_seeds(self, *, include_future_templates):
        manifest = load_economy_default_seeds()
        seeds = list(manifest["subscription_plans"]["baseline"])
        if include_future_templates:
            seeds.extend(manifest["subscription_plans"]["advanced"])
        return seeds

    def _content_access_policy_seeds(self, *, include_future_templates):
        manifest = load_economy_default_seeds()
        seeds = list(manifest["content_access_policies"]["baseline"])
        if include_future_templates:
            seeds.extend(manifest["content_access_policies"]["advanced"])
        return seeds

    def _question_bank_package_seeds(self):
        manifest = load_economy_default_seeds()
        seeds = []
        for payload in manifest["question_bank_packages"]["baseline"]:
            seeds.append(
                {
                    **payload,
                    "package_type": payload["package_type"],
                    "access_mode": payload["access_mode"],
                    "grant_mode": payload["grant_mode"],
                }
            )
        return seeds

    def _unlock_rule_seeds(self, *, include_future_templates):
        manifest = load_economy_default_seeds()
        seeds = list(manifest["unlock_rules"]["baseline"])
        if include_future_templates:
            seeds.extend(manifest["unlock_rules"]["advanced"])
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
