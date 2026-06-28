from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.economy.models import (
    ContentAccessPolicy,
    InstituteQuestionEntitlementStatus,
    InstituteSubscriptionRequest,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    ReferralProgram,
    RewardRule,
    StarPack,
    SubscriptionPlan,
    SubscriptionPlanQuestionBankPackage,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
    UnlockRule,
)
from apps.economy.services import grant_institute_question_bank_entitlement
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
        self.assertEqual(QuestionBankPackage.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(
            SubscriptionPlanQuestionBankPackage.objects.filter(institute=self.institute).count(),
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

        starter_package = QuestionBankPackage.objects.get(
            institute=self.institute,
            metadata__seed_code="starter-question-bank-access",
        )
        self.assertEqual(starter_package.ownership_type, QuestionBankOwnershipType.INSTITUTE)
        starter_plan = SubscriptionPlan.objects.get(
            institute=self.institute,
            metadata__seed_code="starter",
        )
        starter_link = SubscriptionPlanQuestionBankPackage.objects.get(
            institute=self.institute,
            subscription_plan=starter_plan,
            question_bank_package=starter_package,
        )
        self.assertEqual(starter_link.grant_mode, "included")

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
        self.assertEqual(QuestionBankPackage.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(
            SubscriptionPlanQuestionBankPackage.objects.filter(institute=self.institute).count(),
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
        self.assertEqual(QuestionBankPackage.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(
            SubscriptionPlanQuestionBankPackage.objects.filter(institute=self.institute).count(),
            2,
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

    def test_seed_economy_defaults_uses_platform_owned_packages_for_public_content_hub(self):
        public_hub = self.builder.create_institute(
            name="Demo Public Content Hub",
            code="PUBDLI1",
            metadata={"is_public_content_hub": True},
        )
        stdout = StringIO()

        call_command("seed_economy_defaults", public_hub.code, stdout=stdout)

        self.assertEqual(QuestionBankPackage.objects.filter(institute=public_hub).count(), 2)
        self.assertEqual(
            SubscriptionPlanQuestionBankPackage.objects.filter(institute=public_hub).count(),
            2,
        )
        self.assertEqual(
            QuestionBankPackage.objects.filter(
                institute=public_hub,
                ownership_type=QuestionBankOwnershipType.PLATFORM,
            ).count(),
            2,
        )


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
        self.assertEqual(QuestionBankPackage.objects.filter(institute=self.institute).count(), 2)
        self.assertEqual(
            SubscriptionPlanQuestionBankPackage.objects.filter(institute=self.institute).count(),
            2,
        )
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


class ResetDemoInstituteSubscriptionWorkflowCommandTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.institute = self.builder.create_institute(code="DLI001")
        call_command("seed_economy_defaults", self.institute.code, stdout=StringIO())
        self.plan = SubscriptionPlan.objects.get(
            institute=self.institute,
            metadata__seed_code="starter",
        )
        self.cycle = SubscriptionPlanCycle.objects.get(
            institute=self.institute,
            metadata__seed_code="starter-monthly",
        )
        self.package = QuestionBankPackage.objects.get(
            institute=self.institute,
            metadata__seed_code="starter-question-bank-access",
        )

    def test_reset_demo_institute_subscription_workflow_revokes_live_entitlements_and_deletes_requests(self):
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.institute,
            question_bank_package=self.package,
            granted_via="subscription",
            subscription_plan=self.plan,
            subscription_plan_cycle=self.cycle,
            notes="Seeded for reset command test.",
        )
        request = InstituteSubscriptionRequest.objects.create(
            institute=self.institute,
            subscription_plan_cycle=self.cycle,
            status="fulfilled",
            grant_modes=["included"],
            notes="Seeded request for reset command test.",
        )

        stdout = StringIO()
        call_command(
            "reset_demo_institute_subscription_workflow",
            "--target-institute-code",
            self.institute.code,
            stdout=stdout,
        )

        entitlement.refresh_from_db()
        self.assertEqual(entitlement.status, InstituteQuestionEntitlementStatus.REVOKED)
        self.assertFalse(InstituteSubscriptionRequest.objects.filter(pk=request.pk).exists())

        output = stdout.getvalue()
        self.assertIn("Demo institute subscription workflow reset complete.", output)
        self.assertIn("deleted_subscription_requests=1", output)
        self.assertIn("revoked_entitlements=1", output)
