from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.economy.models import (
    ContentAccessPolicy,
    ReferralProgram,
    RewardRule,
    StarPack,
    SubscriptionPlan,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
    UnlockRule,
)
from apps.academics.models import OptionCatalogEntry
from common.tests.builders import AcademicAssessmentBuilder


class SeedEconomyDefaultsCommandTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.institute = self.builder.create_institute()

    def test_seed_economy_defaults_creates_expected_records_and_is_idempotent(self):
        stdout = StringIO()

        call_command("seed_economy_defaults", self.institute.code, stdout=stdout)

        self.assertEqual(RewardRule.objects.filter(institute=self.institute).count(), 4)
        self.assertEqual(ReferralProgram.objects.filter(institute=self.institute).count(), 1)
        self.assertEqual(StarPack.objects.filter(institute=self.institute).count(), 3)
        self.assertEqual(SubscriptionPlan.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(SubscriptionPlanCycle.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(
            SubscriptionStarCreditRule.objects.filter(institute=self.institute).count(),
            2,
        )
        self.assertEqual(ContentAccessPolicy.objects.filter(institute=self.institute).count(), 5)
        self.assertEqual(UnlockRule.objects.filter(institute=self.institute).count(), 5)

        signup_rule = RewardRule.objects.get(
            institute=self.institute,
            metadata__seed_code="default_signup_bonus_v1",
        )
        self.assertEqual(signup_rule.stars_awarded, 100)
        self.assertEqual(signup_rule.rule_type, "signup")

        subscription_policy = ContentAccessPolicy.objects.get(
            institute=self.institute,
            metadata__seed_code="access-template-subscription-premium",
        )
        self.assertEqual(subscription_policy.policy_type, "stars_or_entitlement")
        self.assertEqual(subscription_policy.star_cost, 250)
        self.assertEqual(subscription_policy.entitlement_code, "subscription:starter")

        entitlement_policy = ContentAccessPolicy.objects.get(
            institute=self.institute,
            metadata__seed_code="access-template-subscription-only",
        )
        self.assertEqual(entitlement_policy.policy_type, "entitlement_only")
        self.assertEqual(entitlement_policy.entitlement_code, "subscription:starter")

        unlock_rule = UnlockRule.objects.get(
            institute=self.institute,
            metadata__seed_code="unlock-template-score-seventy-five",
        )
        self.assertEqual(str(unlock_rule.required_score_percentage), "75.00")
        self.assertEqual(unlock_rule.rule_type, "score_threshold")

        first_output = stdout.getvalue()
        self.assertIn("Economy defaults seeded for institutes", first_output)
        self.assertIn(self.institute.code, first_output)

        stdout = StringIO()
        call_command("seed_economy_defaults", self.institute.code, stdout=stdout)

        self.assertEqual(RewardRule.objects.filter(institute=self.institute).count(), 4)
        self.assertEqual(ReferralProgram.objects.filter(institute=self.institute).count(), 1)
        self.assertEqual(StarPack.objects.filter(institute=self.institute).count(), 3)
        self.assertEqual(SubscriptionPlan.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(SubscriptionPlanCycle.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(
            SubscriptionStarCreditRule.objects.filter(institute=self.institute).count(),
            2,
        )
        self.assertEqual(ContentAccessPolicy.objects.filter(institute=self.institute).count(), 5)
        self.assertEqual(UnlockRule.objects.filter(institute=self.institute).count(), 5)

        second_output = stdout.getvalue()
        self.assertIn("updated=", second_output)
        self.assertIn("Template mode: baseline only", second_output)

    def test_seed_economy_defaults_can_include_future_templates(self):
        stdout = StringIO()

        call_command(
            "seed_economy_defaults",
            self.institute.code,
            include_future_templates=True,
            stdout=stdout,
        )

        self.assertEqual(RewardRule.objects.filter(institute=self.institute).count(), 7)
        self.assertEqual(StarPack.objects.filter(institute=self.institute).count(), 4)
        self.assertEqual(SubscriptionPlan.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(SubscriptionPlanCycle.objects.filter(institute=self.institute).count(), 3)
        self.assertEqual(
            SubscriptionStarCreditRule.objects.filter(institute=self.institute).count(),
            3,
        )
        self.assertEqual(ContentAccessPolicy.objects.filter(institute=self.institute).count(), 6)
        self.assertEqual(UnlockRule.objects.filter(institute=self.institute).count(), 6)

        yearly_cycle = SubscriptionPlanCycle.objects.get(
            institute=self.institute,
            metadata__seed_code="scholar-yearly",
        )
        self.assertEqual(yearly_cycle.billing_interval, "yearly")

        streak_rule = RewardRule.objects.get(
            institute=self.institute,
            metadata__seed_code="streak_reward_7_day_v1",
        )
        self.assertEqual(streak_rule.rule_type, "streak")

        composite_unlock = UnlockRule.objects.get(
            institute=self.institute,
            metadata__seed_code="unlock-template-composite-merit-subscription",
        )
        self.assertEqual(composite_unlock.rule_type, "composite")
        self.assertEqual(composite_unlock.metadata["logic"], "all")

        self.assertIn("Template mode: baseline + future templates", stdout.getvalue())


class SeedMasterEconomyCommandTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.institute = self.builder.create_institute()

    def test_seed_master_economy_runs_prerequisite_and_economy_seeds(self):
        stdout = StringIO()

        call_command("seed_master_economy", self.institute.code, stdout=stdout)

        self.assertGreater(OptionCatalogEntry.objects.count(), 0)
        self.assertEqual(RewardRule.objects.filter(institute=self.institute).count(), 4)
        self.assertEqual(ReferralProgram.objects.filter(institute=self.institute).count(), 1)
        self.assertEqual(StarPack.objects.filter(institute=self.institute).count(), 3)
        self.assertEqual(SubscriptionPlan.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(ContentAccessPolicy.objects.filter(institute=self.institute).count(), 5)
        self.assertEqual(UnlockRule.objects.filter(institute=self.institute).count(), 5)

        output = stdout.getvalue()
        self.assertIn("Starting master economy seed flow", output)
        self.assertIn("Option catalog refreshed", output)
        self.assertIn("Master economy seed flow completed successfully", output)

    def test_seed_master_economy_can_skip_option_catalog(self):
        stdout = StringIO()

        call_command(
            "seed_master_economy",
            self.institute.code,
            skip_option_catalog=True,
            stdout=stdout,
        )

        self.assertEqual(RewardRule.objects.filter(institute=self.institute).count(), 4)
        self.assertIn("Skipping academic option catalog refresh", stdout.getvalue())
