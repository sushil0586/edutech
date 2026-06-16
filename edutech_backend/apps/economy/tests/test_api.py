from django.test import TestCase
from rest_framework.test import APIClient

from apps.economy.models import (
    PaymentOrder,
    RewardRule,
    StarPack,
    StudentSubscription,
    StudentUnlockState,
    SubscriptionPlan,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
)
from apps.economy.services import credit_stars, get_or_create_student_economy_profile
from common.tests.builders import AcademicAssessmentBuilder


class EconomyApiTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.student = self.context["student"]
        self.student_user, _ = self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=self.student,
            username="economy-student",
            password="Student@123",
            email="economy-student@example.com",
        )
        self.admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="economy-institute-admin",
            password="Admin@123",
            email="economy-admin@example.com",
        )
        self.client = APIClient()

    def test_student_can_view_wallet_and_ledger(self):
        credit_stars(
            student=self.student,
            source_type="signup_bonus",
            reason="Signup reward",
            stars=100,
        )
        self.client.force_authenticate(user=self.student_user)

        wallet_response = self.client.get("/api/v1/economy/wallet/")
        self.assertEqual(wallet_response.status_code, 200)
        self.assertEqual(wallet_response.data["available_stars"], 100)

        ledger_response = self.client.get("/api/v1/economy/ledger/")
        self.assertEqual(ledger_response.status_code, 200)
        self.assertEqual(len(ledger_response.data), 1)
        self.assertEqual(ledger_response.data[0]["stars_delta"], 100)

    def test_student_and_admin_can_view_reward_history(self):
        RewardRule.objects.create(
            institute=self.context["institute"],
            name="Default signup reward",
            rule_type="signup",
            stars_awarded=100,
        )
        from apps.economy.services import process_signup_rewards

        process_signup_rewards(student=self.student, created_by=self.admin_user)

        self.client.force_authenticate(user=self.student_user)
        student_response = self.client.get("/api/v1/economy/rewards/")
        self.assertEqual(student_response.status_code, 200)
        self.assertEqual(len(student_response.data), 1)
        self.assertEqual(student_response.data[0]["reward_rule_type"], "signup")
        self.assertEqual(student_response.data[0]["ledger_entry"]["source_type"], "signup_bonus")

        self.client.force_authenticate(user=self.admin_user)
        admin_response = self.client.get(f"/api/v1/economy/admin/student/{self.student.id}/rewards/")
        self.assertEqual(admin_response.status_code, 200)
        self.assertEqual(len(admin_response.data), 1)
        self.assertEqual(admin_response.data[0]["awarded_stars"], 100)

    def test_student_can_view_unlock_states(self):
        StudentUnlockState.objects.create(
            institute=self.context["institute"],
            student=self.student,
            subject=self.context["subject"],
            content_type="sample_test",
            content_key="sample-math-1",
            content_label="Math Sample Test 1",
            status="locked",
            lock_reason_code="insufficient_stars",
            lock_reason_message="20 stars are required.",
        )
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get("/api/v1/economy/unlocks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["content_key"], "sample-math-1")

    def test_admin_can_grant_stars_and_view_student_wallet(self):
        self.client.force_authenticate(user=self.admin_user)

        grant_response = self.client.post(
            "/api/v1/economy/admin/grant-stars/",
            {
                "student": str(self.student.id),
                "stars": 50,
                "reason": "Support grant",
                "source_reference": "ticket-123",
            },
            format="json",
        )
        self.assertEqual(grant_response.status_code, 201)
        self.assertEqual(grant_response.data["data"]["stars_delta"], 50)

        wallet_response = self.client.get(f"/api/v1/economy/admin/student/{self.student.id}/wallet/")
        self.assertEqual(wallet_response.status_code, 200)
        self.assertEqual(wallet_response.data["available_stars"], 50)

        profile = get_or_create_student_economy_profile(self.student)
        self.assertEqual(profile.admin_granted_stars, 50)

    def test_student_can_view_star_packs_and_subscription_plans(self):
        StarPack.objects.create(
            institute=self.context["institute"],
            name="Starter Pack",
            code="START100",
            stars_credited=100,
            price_amount="100.00",
            currency="INR",
            sort_order=1,
        )
        plan = SubscriptionPlan.objects.create(
            institute=self.context["institute"],
            name="Monthly Plus",
            code="MONTHLY_PLUS",
            description="Monthly access with recurring stars",
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

        self.client.force_authenticate(user=self.student_user)

        packs_response = self.client.get("/api/v1/economy/star-packs/")
        self.assertEqual(packs_response.status_code, 200)
        self.assertEqual(len(packs_response.data), 1)
        self.assertEqual(packs_response.data[0]["stars_credited"], 100)

        plans_response = self.client.get("/api/v1/economy/subscription-plans/")
        self.assertEqual(plans_response.status_code, 200)
        self.assertEqual(len(plans_response.data), 1)
        self.assertEqual(plans_response.data[0]["cycles"][0]["star_credit_rules"][0]["stars_credited"], 500)

    def test_student_can_spend_stars_to_unlock_content(self):
        credit_stars(
            student=self.student,
            source_type="signup_bonus",
            reason="Signup reward",
            stars=100,
        )
        self.client.force_authenticate(user=self.student_user)

        from apps.economy.models import ContentAccessPolicy

        ContentAccessPolicy.objects.create(
            institute=self.context["institute"],
            subject=self.context["subject"],
            content_type="sample_test",
            content_key="sample-math-2",
            content_label="Math Sample Test 2",
            policy_type="stars_only",
            star_cost=20,
        )

        response = self.client.post(
            "/api/v1/economy/spend-stars/",
            {
                "content_type": "sample_test",
                "content_key": "sample-math-2",
                "subject": str(self.context["subject"].id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["spent_stars"], 20)
        self.assertEqual(response.data["data"]["unlock_state"]["status"], "unlocked")

        wallet_response = self.client.get("/api/v1/economy/wallet/")
        self.assertEqual(wallet_response.status_code, 200)
        self.assertEqual(wallet_response.data["available_stars"], 80)

    def test_student_can_create_star_pack_order_and_admin_can_confirm_it(self):
        star_pack = StarPack.objects.create(
            institute=self.context["institute"],
            name="Starter Pack",
            code="START100",
            stars_credited=100,
            price_amount="100.00",
            currency="INR",
            sort_order=1,
        )

        self.client.force_authenticate(user=self.student_user)
        create_response = self.client.post(
            "/api/v1/economy/orders/star-pack/",
            {
                "star_pack": str(star_pack.id),
                "provider_name": "manual",
                "provider_order_reference": "order-pack-api-1",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        order_id = create_response.data["data"]["id"]

        list_response = self.client.get("/api/v1/economy/orders/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["order_type"], "star_pack")

        self.client.force_authenticate(user=self.admin_user)
        confirm_response = self.client.post(
            f"/api/v1/economy/admin/orders/{order_id}/confirm/",
            {
                "provider_transaction_reference": "txn-pack-api-1",
            },
            format="json",
        )
        self.assertEqual(confirm_response.status_code, 200)
        self.assertEqual(confirm_response.data["data"]["ledger_entry"]["stars_delta"], 100)

        profile = get_or_create_student_economy_profile(self.student)
        self.assertEqual(profile.available_stars, 100)
        self.assertEqual(PaymentOrder.objects.get(pk=order_id).status, "completed")

    def test_student_can_create_subscription_order_and_admin_can_confirm_it(self):
        plan = SubscriptionPlan.objects.create(
            institute=self.context["institute"],
            name="Monthly Plus",
            code="MONTHLY_PLUS",
            description="Monthly star plan",
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

        self.client.force_authenticate(user=self.student_user)
        create_response = self.client.post(
            "/api/v1/economy/orders/subscription/",
            {
                "subscription_plan_cycle": str(cycle.id),
                "provider_name": "manual",
                "provider_order_reference": "order-sub-api-1",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        order_id = create_response.data["data"]["id"]

        self.client.force_authenticate(user=self.admin_user)
        confirm_response = self.client.post(
            f"/api/v1/economy/admin/orders/{order_id}/confirm/",
            {
                "provider_transaction_reference": "txn-sub-api-1",
            },
            format="json",
        )
        self.assertEqual(confirm_response.status_code, 200)
        self.assertEqual(confirm_response.data["data"]["student_subscription"]["status"], "active")

        self.client.force_authenticate(user=self.student_user)
        subscriptions_response = self.client.get("/api/v1/economy/subscriptions/")
        self.assertEqual(subscriptions_response.status_code, 200)
        self.assertEqual(len(subscriptions_response.data), 1)
        self.assertEqual(subscriptions_response.data[0]["plan_name"], "Monthly Plus")

        profile = get_or_create_student_economy_profile(self.student)
        self.assertEqual(profile.available_stars, 500)
        self.assertEqual(StudentSubscription.objects.filter(student=self.student).count(), 1)
