from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.economy.models import (
    ContentAccessPolicy,
    EconomyBalanceSource,
    PaymentOrder,
    ReferralProgram,
    ReferralRewardSide,
    RewardRule,
    StarPack,
    StudentEconomyProfile,
    StudentEntitlement,
    StudentSubscription,
    SubscriptionPlan,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
)
from apps.economy.services import (
    apply_referral_code_for_student_signup,
    complete_payment_order,
    credit_stars,
    create_star_pack_payment_order,
    create_subscription_payment_order,
    debit_stars,
    evaluate_and_sync_unlock_state,
    get_or_create_student_economy_profile,
    get_or_create_student_referral_code,
    issue_reward_for_event,
    process_exam_result_rewards,
    process_signup_rewards,
)
from common.tests.builders import AcademicAssessmentBuilder


class EconomyServicesTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.student = self.context["student"]
        self.subject = self.context["subject"]
        self.admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="economy-admin",
            password="Admin@123",
        )

    def test_credit_and_debit_stars_update_profile_and_ledger(self):
        profile = get_or_create_student_economy_profile(self.student)
        self.assertEqual(profile.available_stars, 0)

        credit_entry = credit_stars(
            student=self.student,
            source_type="signup_bonus",
            reason="Signup reward",
            stars=100,
            balance_source=EconomyBalanceSource.EARNED,
            created_by=self.admin_user,
        )
        profile.refresh_from_db()
        self.assertEqual(credit_entry.balance_after, 100)
        self.assertEqual(profile.available_stars, 100)
        self.assertEqual(profile.lifetime_earned_stars, 100)

        debit_entry = debit_stars(
            student=self.student,
            source_type="content_spend",
            reason="Unlocked sample paper",
            stars=20,
            created_by=self.admin_user,
        )
        profile.refresh_from_db()
        self.assertEqual(debit_entry.balance_after, 80)
        self.assertEqual(profile.available_stars, 80)
        self.assertEqual(profile.lifetime_spent_stars, 20)

    def test_reward_issue_is_idempotent_for_same_event_key(self):
        reward_rule = RewardRule.objects.create(
            institute=self.context["institute"],
            subject=self.subject,
            name="Score above 50",
            rule_type="score_threshold",
            stars_awarded=20,
            score_threshold_percentage=Decimal("50.00"),
        )

        event, created = issue_reward_for_event(
            student=self.student,
            reward_rule=reward_rule,
            event_key="attempt:123:score-threshold",
            created_by=self.admin_user,
        )
        self.assertTrue(created)
        self.assertEqual(event.awarded_stars, 20)

        second_event, second_created = issue_reward_for_event(
            student=self.student,
            reward_rule=reward_rule,
            event_key="attempt:123:score-threshold",
            created_by=self.admin_user,
        )
        self.assertFalse(second_created)
        self.assertEqual(event.id, second_event.id)

    def test_unlock_state_uses_stars_only_policy(self):
        ContentAccessPolicy.objects.create(
            institute=self.context["institute"],
            subject=self.subject,
            content_type="sample_test",
            content_key="sample-math-1",
            content_label="Math Sample Test 1",
            policy_type="stars_only",
            star_cost=20,
        )

        locked_state = evaluate_and_sync_unlock_state(
            student=self.student,
            content_type="sample_test",
            content_key="sample-math-1",
            subject=self.subject,
        )
        self.assertEqual(locked_state.status, "locked")

        credit_stars(
            student=self.student,
            source_type="signup_bonus",
            reason="Signup stars",
            stars=100,
            balance_source=EconomyBalanceSource.EARNED,
        )

        unlocked_state = evaluate_and_sync_unlock_state(
            student=self.student,
            content_type="sample_test",
            content_key="sample-math-1",
            subject=self.subject,
        )
        self.assertEqual(unlocked_state.status, "unlocked")

    def test_unlock_state_supports_entitlement_only_policy(self):
        ContentAccessPolicy.objects.create(
            institute=self.context["institute"],
            content_type="premium_bundle",
            content_key="olympiad-pack-1",
            content_label="Olympiad Pack 1",
            policy_type="entitlement_only",
            entitlement_code="bundle_olympiad_pack_1",
        )

        locked_state = evaluate_and_sync_unlock_state(
            student=self.student,
            content_type="premium_bundle",
            content_key="olympiad-pack-1",
        )
        self.assertEqual(locked_state.status, "locked")

        StudentEntitlement.objects.create(
            institute=self.context["institute"],
            student=self.student,
            content_type="premium_bundle",
            content_key="olympiad-pack-1",
            entitlement_code="bundle_olympiad_pack_1",
            status="active",
            source_type="admin_grant",
            source_id="grant-1",
            granted_by=self.admin_user,
            valid_from=timezone.now(),
        )

        unlocked_state = evaluate_and_sync_unlock_state(
            student=self.student,
            content_type="premium_bundle",
            content_key="olympiad-pack-1",
        )
        self.assertEqual(unlocked_state.status, "unlocked")

    def test_process_signup_rewards_credits_matching_rules(self):
        RewardRule.objects.create(
            institute=self.context["institute"],
            name="Default signup reward",
            rule_type="signup",
            stars_awarded=100,
        )

        created_events = process_signup_rewards(student=self.student, created_by=self.admin_user)
        profile = StudentEconomyProfile.objects.get(student=self.student)

        self.assertEqual(len(created_events), 1)
        self.assertEqual(profile.available_stars, 100)

        second_run = process_signup_rewards(student=self.student, created_by=self.admin_user)
        profile.refresh_from_db()
        self.assertEqual(len(second_run), 0)
        self.assertEqual(profile.available_stars, 100)
        self.assertEqual(created_events[0].ledger_entry.source_type, "signup_bonus")

    def test_process_exam_result_rewards_applies_completion_and_threshold_rules(self):
        RewardRule.objects.create(
            institute=self.context["institute"],
            subject=self.subject,
            name="Completion reward",
            rule_type="exam_completion",
            stars_awarded=10,
        )
        RewardRule.objects.create(
            institute=self.context["institute"],
            subject=self.subject,
            name="Above 50 percent",
            rule_type="score_threshold",
            stars_awarded=20,
            score_threshold_percentage=Decimal("50.00"),
        )

        flow = self.builder.run_full_assessment_flow(self.context)
        profile = StudentEconomyProfile.objects.get(student=self.student)

        self.assertEqual(profile.available_stars, 30)

        created_events = process_exam_result_rewards(result=flow["result"], created_by=self.admin_user)
        profile.refresh_from_db()
        self.assertEqual(len(created_events), 0)
        self.assertEqual(profile.available_stars, 30)

    def test_score_threshold_rule_requires_percentage(self):
        reward_rule = RewardRule(
            institute=self.context["institute"],
            subject=self.subject,
            name="Invalid threshold",
            rule_type="score_threshold",
            stars_awarded=10,
        )

        with self.assertRaises(ValidationError):
            reward_rule.full_clean()

    def test_student_referral_code_is_created_for_active_program(self):
        program = ReferralProgram.objects.create(
            institute=self.context["institute"],
            name="Default referral",
            referrer_stars=50,
            referee_stars=25,
            reward_side=ReferralRewardSide.BOTH,
        )

        code = get_or_create_student_referral_code(student=self.student)

        self.assertIsNotNone(code)
        self.assertEqual(code.program_id, program.id)
        self.assertEqual(code.owner_student_id, self.student.id)

    def test_apply_referral_code_credits_referrer_and_referee(self):
        program = ReferralProgram.objects.create(
            institute=self.context["institute"],
            name="Default referral",
            referrer_stars=50,
            referee_stars=25,
            reward_side=ReferralRewardSide.BOTH,
        )
        referrer = self.builder.create_student(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            admission_no="STU002",
            first_name="Ishaan",
            last_name="Verma",
            email="ishaan@example.com",
        )
        referral_code = get_or_create_student_referral_code(student=referrer, program=program)

        event = apply_referral_code_for_student_signup(
            student=self.student,
            referral_code=referral_code.code,
            created_by=self.admin_user,
        )

        self.assertEqual(event.referrer_student_id, referrer.id)
        self.assertEqual(event.referee_student_id, self.student.id)
        self.assertEqual(event.referrer_ledger_entry.stars_delta, 50)
        self.assertEqual(event.referee_ledger_entry.stars_delta, 25)

        referrer_profile = get_or_create_student_economy_profile(referrer)
        referee_profile = get_or_create_student_economy_profile(self.student)
        self.assertEqual(referrer_profile.available_stars, 50)
        self.assertEqual(referee_profile.available_stars, 25)

    def test_complete_star_pack_payment_order_credits_paid_stars(self):
        star_pack = StarPack.objects.create(
            institute=self.context["institute"],
            name="Starter Pack",
            code="START100",
            stars_credited=100,
            price_amount="100.00",
            currency="INR",
        )

        payment_order = create_star_pack_payment_order(
            student=self.student,
            star_pack=star_pack,
            provider_name="manual",
            provider_order_reference="order-pack-1",
        )
        result = complete_payment_order(
            payment_order=payment_order,
            provider_transaction_reference="txn-pack-1",
            created_by=self.admin_user,
        )

        profile = get_or_create_student_economy_profile(self.student)
        payment_order.refresh_from_db()

        self.assertTrue(result["created"])
        self.assertEqual(payment_order.status, "completed")
        self.assertEqual(profile.available_stars, 100)
        self.assertEqual(profile.paid_credited_stars, 100)
        self.assertEqual(result["ledger_entry"].source_type, "purchase")

    def test_complete_subscription_payment_order_creates_subscription_and_credits_stars(self):
        plan = SubscriptionPlan.objects.create(
            institute=self.context["institute"],
            name="Monthly Plus",
            code="MONTHLY_PLUS",
        )
        cycle = SubscriptionPlanCycle.objects.create(
            institute=self.context["institute"],
            plan=plan,
            billing_interval="monthly",
            interval_count=1,
            price_amount="299.00",
            currency="INR",
        )
        SubscriptionStarCreditRule.objects.create(
            institute=self.context["institute"],
            plan_cycle=cycle,
            stars_credited=500,
            credit_on_activation=True,
            credit_on_renewal=True,
        )

        payment_order = create_subscription_payment_order(
            student=self.student,
            plan_cycle=cycle,
            provider_name="manual",
            provider_order_reference="order-sub-1",
        )
        result = complete_payment_order(
            payment_order=payment_order,
            provider_transaction_reference="txn-sub-1",
            created_by=self.admin_user,
        )

        profile = get_or_create_student_economy_profile(self.student)
        subscription = StudentSubscription.objects.get(student=self.student, plan_cycle=cycle)

        self.assertTrue(result["created"])
        self.assertEqual(profile.available_stars, 500)
        self.assertEqual(profile.subscription_credited_stars, 500)
        self.assertEqual(subscription.status, "active")
        self.assertEqual(result["billing_event"].event_type, "activation")

    def test_completing_same_payment_order_twice_is_idempotent(self):
        star_pack = StarPack.objects.create(
            institute=self.context["institute"],
            name="Repeat Safe Pack",
            code="SAFE100",
            stars_credited=100,
            price_amount="100.00",
            currency="INR",
        )
        payment_order = create_star_pack_payment_order(
            student=self.student,
            star_pack=star_pack,
            provider_name="manual",
        )

        first_result = complete_payment_order(
            payment_order=payment_order,
            provider_transaction_reference="txn-safe-1",
            created_by=self.admin_user,
        )
        second_result = complete_payment_order(
            payment_order=payment_order,
            provider_transaction_reference="txn-safe-1",
            created_by=self.admin_user,
        )

        profile = get_or_create_student_economy_profile(self.student)
        self.assertTrue(first_result["created"])
        self.assertFalse(second_result["created"])
        self.assertEqual(profile.available_stars, 100)
        self.assertEqual(PaymentOrder.objects.get(pk=payment_order.pk).transactions.count(), 1)
