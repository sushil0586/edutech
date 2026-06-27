from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.economy.models import (
    EconomyOperatorPolicyConfig,
    PaymentOrder,
    ReferralProgram,
    RewardRule,
    StarPack,
    StudentSubscription,
    StudentUnlockState,
    SubscriptionPlan,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
)
from apps.economy.governance import get_or_create_economy_operator_policy_config
from apps.reports.models import AuditLog
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
        self.platform_admin_user, _ = self.builder.create_platform_admin_account(
            username="economy-platform-admin",
            password="Admin@123",
            email="economy-platform-admin@example.com",
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

    def test_admin_can_view_economy_operator_policy(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/v1/economy/admin/policy/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "institute_admin")
        self.assertEqual(response.data["support_scope"], "institute_only")
        self.assertEqual(response.data["catalog_governance_scope"], "platform_only")

    def test_platform_admin_can_view_and_update_economy_policy_config(self):
        self.client.force_authenticate(user=self.platform_admin_user)

        get_response = self.client.get("/api/v1/economy/admin/policy-config/")
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["singleton_key"], "default")

        patch_response = self.client.patch(
            "/api/v1/economy/admin/policy-config/",
            {
                "institute_admin_can_grant_stars": False,
                "institute_admin_max_grant_stars": 40,
                "institute_admin_can_confirm_orders": True,
                "institute_admin_max_confirm_order_amount": "750.00",
            },
            format="json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["data"]["institute_admin_can_grant_stars"], False)
        self.assertEqual(patch_response.data["data"]["institute_admin_max_grant_stars"], 40)
        self.assertEqual(
            patch_response.data["data"]["institute_admin_max_confirm_order_amount"],
            "750.00",
        )

        config_object = EconomyOperatorPolicyConfig.objects.get(singleton_key="default")
        self.assertFalse(config_object.institute_admin_can_grant_stars)
        self.assertEqual(config_object.institute_admin_max_grant_stars, 40)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_policy_update",
                entity_type="economy_operator_policy_config",
                entity_id=str(config_object.id),
            ).exists()
        )

    def test_platform_admin_can_view_economy_policy_audit_history(self):
        self.client.force_authenticate(user=self.platform_admin_user)

        self.client.patch(
            "/api/v1/economy/admin/policy-config/",
            {
                "institute_admin_can_grant_stars": False,
                "institute_admin_max_grant_stars": 25,
            },
            format="json",
        )

        response = self.client.get("/api/v1/economy/admin/policy-audit/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["action"], "economy_policy_update")
        self.assertEqual(response.data[0]["entity_type"], "economy_operator_policy_config")
        self.assertEqual(response.data[0]["user"], self.platform_admin_user.id)
        self.assertEqual(
            response.data[0]["metadata"]["changed_fields"]["institute_admin_can_grant_stars"]["after"],
            False,
        )

    def test_platform_admin_can_view_economy_catalog_overview(self):
        RewardRule.objects.create(
            institute=self.context["institute"],
            subject=self.context["subject"],
            name="Signup reward",
            rule_type="signup",
            stars_awarded=100,
        )
        ReferralProgram.objects.create(
            institute=self.context["institute"],
            name="Default referral",
            referrer_stars=50,
            referee_stars=25,
            reward_side="both",
        )
        StarPack.objects.create(
            institute=self.context["institute"],
            name="Starter Pack",
            code="START100",
            stars_credited=100,
            price_amount="99.00",
            currency="INR",
            sort_order=1,
        )
        plan = SubscriptionPlan.objects.create(
            institute=self.context["institute"],
            name="Monthly Plus",
            code="MONTHLY_PLUS",
            description="Monthly plan",
        )
        SubscriptionPlanCycle.objects.create(
            institute=self.context["institute"],
            plan=plan,
            billing_interval="monthly",
            interval_count=1,
            price_amount="299.00",
            currency="INR",
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.get("/api/v1/economy/admin/catalog-overview/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["reward_rules"]["total"], 1)
        self.assertEqual(response.data["referral_programs"]["active"], 1)
        self.assertEqual(response.data["star_packs"]["items"][0]["metric_label"], "100 stars")
        self.assertEqual(
            response.data["subscription_plans"]["items"][0]["secondary_label"],
            "1 active cycle",
        )

    def test_platform_admin_can_toggle_catalog_item_status(self):
        star_pack = StarPack.objects.create(
            institute=self.context["institute"],
            name="Starter Pack",
            code="START100",
            stars_credited=100,
            price_amount="99.00",
            currency="INR",
            sort_order=1,
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.patch(
            f"/api/v1/economy/admin/catalog-items/star_pack/{star_pack.id}/status/",
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        star_pack.refresh_from_db()
        self.assertFalse(star_pack.is_active)
        self.assertEqual(response.data["data"]["item_type"], "star_pack")
        self.assertEqual(response.data["data"]["is_active"], False)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_catalog_item_status_update",
                entity_type="star_pack",
                entity_id=str(star_pack.id),
            ).exists()
        )

    def test_platform_admin_can_list_create_and_update_star_packs(self):
        self.client.force_authenticate(user=self.platform_admin_user)

        create_response = self.client.post(
            "/api/v1/economy/admin/star-packs/",
            {
                "institute": str(self.context["institute"].id),
                "name": "Growth Pack",
                "code": "GROWTH500",
                "stars_credited": 500,
                "price_amount": "399.00",
                "currency": "INR",
                "sort_order": 2,
                "metadata": {"channel": "manual"},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        star_pack_id = create_response.data["data"]["id"]
        self.assertEqual(create_response.data["data"]["name"], "Growth Pack")

        list_response = self.client.get("/api/v1/economy/admin/star-packs/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["code"], "GROWTH500")

        update_response = self.client.patch(
            f"/api/v1/economy/admin/star-packs/{star_pack_id}/",
            {
                "price_amount": "449.00",
                "stars_credited": 550,
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["data"]["stars_credited"], 550)
        self.assertEqual(update_response.data["data"]["price_amount"], "449.00")
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_star_pack_update",
                entity_type="star_pack",
                entity_id=str(star_pack_id),
            ).exists()
        )

    def test_platform_admin_can_list_create_and_update_subscription_plans(self):
        self.client.force_authenticate(user=self.platform_admin_user)

        create_response = self.client.post(
            "/api/v1/economy/admin/subscription-plans/",
            {
                "institute": str(self.context["institute"].id),
                "name": "Scholar Plus",
                "code": "SCHOLAR_PLUS",
                "description": "Recurring value plan",
                "metadata": {"channel": "manual"},
                "is_active": True,
                "cycles": [
                    {
                        "billing_interval": "monthly",
                        "interval_count": 1,
                        "price_amount": "299.00",
                        "currency": "INR",
                        "metadata": {},
                        "is_active": True,
                        "star_credit_rules": [
                            {
                                "stars_credited": 500,
                                "credit_on_activation": True,
                                "credit_on_renewal": True,
                                "metadata": {},
                                "is_active": True,
                            }
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        plan_id = create_response.data["data"]["id"]
        cycle_id = create_response.data["data"]["cycles"][0]["id"]
        rule_id = create_response.data["data"]["cycles"][0]["star_credit_rules"][0]["id"]
        self.assertEqual(create_response.data["data"]["name"], "Scholar Plus")

        list_response = self.client.get("/api/v1/economy/admin/subscription-plans/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["code"], "SCHOLAR_PLUS")

        update_response = self.client.patch(
            f"/api/v1/economy/admin/subscription-plans/{plan_id}/",
            {
                "description": "Updated recurring value plan",
                "cycles": [
                    {
                        "id": cycle_id,
                        "billing_interval": "monthly",
                        "interval_count": 1,
                        "price_amount": "349.00",
                        "currency": "INR",
                        "metadata": {},
                        "is_active": True,
                        "star_credit_rules": [
                            {
                                "id": rule_id,
                                "stars_credited": 600,
                                "credit_on_activation": True,
                                "credit_on_renewal": True,
                                "metadata": {},
                                "is_active": True,
                            }
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["data"]["description"], "Updated recurring value plan")
        self.assertEqual(update_response.data["data"]["cycles"][0]["price_amount"], "349.00")
        self.assertEqual(
            update_response.data["data"]["cycles"][0]["star_credit_rules"][0]["stars_credited"],
            600,
        )
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_subscription_plan_update",
                entity_type="subscription_plan",
                entity_id=str(plan_id),
            ).exists()
        )

    def test_platform_admin_can_list_create_and_update_referral_programs(self):
        self.client.force_authenticate(user=self.platform_admin_user)

        create_response = self.client.post(
            "/api/v1/economy/admin/referral-programs/",
            {
                "institute": str(self.context["institute"].id),
                "name": "NEET Invite Drive",
                "referrer_stars": 60,
                "referee_stars": 40,
                "reward_side": "both",
                "valid_from": "2026-06-01T00:00:00Z",
                "valid_until": "2026-12-31T00:00:00Z",
                "metadata": {"channel": "campaign"},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        program_id = create_response.data["data"]["id"]
        self.assertEqual(create_response.data["data"]["name"], "NEET Invite Drive")

        list_response = self.client.get("/api/v1/economy/admin/referral-programs/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["reward_side"], "both")

        update_response = self.client.patch(
            f"/api/v1/economy/admin/referral-programs/{program_id}/",
            {
                "referrer_stars": 80,
                "reward_side": "referrer",
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["data"]["referrer_stars"], 80)
        self.assertEqual(update_response.data["data"]["reward_side"], "referrer")
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_referral_program_update",
                entity_type="referral_program",
                entity_id=str(program_id),
            ).exists()
        )

    def test_platform_admin_can_list_create_and_update_reward_rules(self):
        self.client.force_authenticate(user=self.platform_admin_user)

        create_response = self.client.post(
            "/api/v1/economy/admin/reward-rules/",
            {
                "institute": str(self.context["institute"].id),
                "subject": str(self.context["subject"].id),
                "name": "Score 60 reward",
                "rule_type": "score_threshold",
                "stars_awarded": 120,
                "score_threshold_percentage": "60.00",
                "completion_count_threshold": None,
                "streak_count_threshold": None,
                "priority": 10,
                "valid_from": "2026-06-01T00:00:00Z",
                "valid_until": "2026-12-31T00:00:00Z",
                "metadata": {"lane": "neet"},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        rule_id = create_response.data["data"]["id"]
        self.assertEqual(create_response.data["data"]["rule_type"], "score_threshold")

        list_response = self.client.get("/api/v1/economy/admin/reward-rules/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["stars_awarded"], 120)

        update_response = self.client.patch(
            f"/api/v1/economy/admin/reward-rules/{rule_id}/",
            {
                "stars_awarded": 150,
                "priority": 5,
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["data"]["stars_awarded"], 150)
        self.assertEqual(update_response.data["data"]["priority"], 5)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_reward_rule_update",
                entity_type="reward_rule",
                entity_id=str(rule_id),
            ).exists()
        )

    def test_platform_admin_can_list_create_and_update_content_access_policies(self):
        self.client.force_authenticate(user=self.platform_admin_user)

        create_response = self.client.post(
            "/api/v1/economy/admin/content-access-policies/",
            {
                "institute": str(self.context["institute"].id),
                "subject": str(self.context["subject"].id),
                "content_type": "exam",
                "content_key": "neet-mock-1",
                "content_label": "NEET Mock 1",
                "policy_type": "stars_or_entitlement",
                "star_cost": 75,
                "entitlement_code": "neet-premium",
                "priority": 20,
                "metadata": {"lane": "neet"},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        policy_id = create_response.data["data"]["id"]
        self.assertEqual(create_response.data["data"]["policy_type"], "stars_or_entitlement")

        list_response = self.client.get("/api/v1/economy/admin/content-access-policies/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["star_cost"], 75)

        update_response = self.client.patch(
            f"/api/v1/economy/admin/content-access-policies/{policy_id}/",
            {
                "policy_type": "stars_only",
                "star_cost": 90,
                "entitlement_code": "",
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["data"]["policy_type"], "stars_only")
        self.assertEqual(update_response.data["data"]["star_cost"], 90)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_content_access_policy_update",
                entity_type="content_access_policy",
                entity_id=str(policy_id),
            ).exists()
        )

    def test_platform_admin_can_list_create_and_update_unlock_rules(self):
        self.client.force_authenticate(user=self.platform_admin_user)

        create_response = self.client.post(
            "/api/v1/economy/admin/unlock-rules/",
            {
                "institute": str(self.context["institute"].id),
                "subject": str(self.context["subject"].id),
                "content_type": "exam",
                "content_key": "neet-mock-1",
                "content_label": "NEET Mock 1",
                "rule_type": "stars_balance",
                "required_star_balance": 100,
                "required_entitlement_code": "",
                "required_completion_count": None,
                "required_score_percentage": None,
                "admin_override_allowed": True,
                "priority": 30,
                "metadata": {"lane": "neet"},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        rule_id = create_response.data["data"]["id"]
        self.assertEqual(create_response.data["data"]["rule_type"], "stars_balance")

        list_response = self.client.get("/api/v1/economy/admin/unlock-rules/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["required_star_balance"], 100)

        update_response = self.client.patch(
            f"/api/v1/economy/admin/unlock-rules/{rule_id}/",
            {
                "rule_type": "entitlement",
                "required_star_balance": None,
                "required_entitlement_code": "neet-premium",
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["data"]["rule_type"], "entitlement")
        self.assertEqual(update_response.data["data"]["required_entitlement_code"], "neet-premium")
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_unlock_rule_update",
                entity_type="unlock_rule",
                entity_id=str(rule_id),
            ).exists()
        )

    def test_institute_admin_cannot_update_economy_policy_config(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            "/api/v1/economy/admin/policy-config/",
            {
                "institute_admin_can_grant_stars": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_view_student_payment_orders_in_scope(self):
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
                "provider_order_reference": "order-pack-admin-list-1",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)

        self.client.force_authenticate(user=self.admin_user)
        orders_response = self.client.get(f"/api/v1/economy/admin/student/{self.student.id}/orders/")
        self.assertEqual(orders_response.status_code, 200)
        self.assertEqual(len(orders_response.data), 1)
        self.assertEqual(orders_response.data[0]["order_type"], "star_pack")
        self.assertEqual(str(orders_response.data[0]["student"]), str(self.student.id))

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

    def test_institute_admin_star_grant_can_be_disabled_by_policy(self):
        config_object = get_or_create_economy_operator_policy_config()
        config_object.institute_admin_can_grant_stars = False
        config_object.save(update_fields=["institute_admin_can_grant_stars", "updated_at"])
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            "/api/v1/economy/admin/grant-stars/",
            {
                "student": str(self.student.id),
                "stars": 50,
                "reason": "Support grant",
                "source_reference": "ticket-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("cannot grant stars", str(response.data["detail"]).lower())

    def test_institute_admin_star_grant_threshold_is_enforced(self):
        config_object = get_or_create_economy_operator_policy_config()
        config_object.institute_admin_max_grant_stars = 25
        config_object.save(update_fields=["institute_admin_max_grant_stars", "updated_at"])
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            "/api/v1/economy/admin/grant-stars/",
            {
                "student": str(self.student.id),
                "stars": 50,
                "reason": "Support grant",
                "source_reference": "ticket-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("at most 25 stars", str(response.data["detail"]).lower())

    def test_platform_admin_bypasses_institute_admin_star_grant_threshold(self):
        config_object = get_or_create_economy_operator_policy_config()
        config_object.institute_admin_max_grant_stars = 25
        config_object.save(update_fields=["institute_admin_max_grant_stars", "updated_at"])
        self.client.force_authenticate(user=self.platform_admin_user)

        response = self.client.post(
            "/api/v1/economy/admin/grant-stars/",
            {
                "student": str(self.student.id),
                "stars": 50,
                "reason": "Platform support grant",
                "source_reference": "ticket-456",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["stars_delta"], 50)

    def test_institute_admin_order_confirmation_can_be_disabled_by_policy(self):
        config_object = get_or_create_economy_operator_policy_config()
        config_object.institute_admin_can_confirm_orders = False
        config_object.save(update_fields=["institute_admin_can_confirm_orders", "updated_at"])
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
                "provider_order_reference": "order-pack-policy-1",
            },
            format="json",
        )
        order_id = create_response.data["data"]["id"]

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f"/api/v1/economy/admin/orders/{order_id}/confirm/",
            {"provider_transaction_reference": "txn-pack-policy-1"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("cannot confirm payment orders", str(response.data["detail"]).lower())

    def test_institute_admin_order_confirmation_amount_threshold_is_enforced(self):
        config_object = get_or_create_economy_operator_policy_config()
        config_object.institute_admin_max_confirm_order_amount = Decimal("250.00")
        config_object.save(update_fields=["institute_admin_max_confirm_order_amount", "updated_at"])
        plan = SubscriptionPlan.objects.create(
            institute=self.context["institute"],
            name="Premium Plus",
            code="PREMIUM_PLUS",
            description="Higher-value subscription",
        )
        cycle = SubscriptionPlanCycle.objects.create(
            institute=self.context["institute"],
            plan=plan,
            billing_interval="monthly",
            interval_count=1,
            price_amount="999.00",
            currency="INR",
        )

        self.client.force_authenticate(user=self.student_user)
        create_response = self.client.post(
            "/api/v1/economy/orders/subscription/",
            {
                "subscription_plan_cycle": str(cycle.id),
                "provider_name": "manual",
                "provider_order_reference": "order-sub-policy-1",
            },
            format="json",
        )
        order_id = create_response.data["data"]["id"]

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f"/api/v1/economy/admin/orders/{order_id}/confirm/",
            {"provider_transaction_reference": "txn-sub-policy-1"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("250.00 inr", str(response.data["detail"]).lower())

    def test_platform_admin_bypasses_institute_admin_order_confirmation_threshold(self):
        config_object = get_or_create_economy_operator_policy_config()
        config_object.institute_admin_max_confirm_order_amount = Decimal("250.00")
        config_object.save(update_fields=["institute_admin_max_confirm_order_amount", "updated_at"])
        plan = SubscriptionPlan.objects.create(
            institute=self.context["institute"],
            name="Premium Plus",
            code="PREMIUM_PLUS_PLATFORM",
            description="Higher-value subscription",
        )
        cycle = SubscriptionPlanCycle.objects.create(
            institute=self.context["institute"],
            plan=plan,
            billing_interval="monthly",
            interval_count=1,
            price_amount="999.00",
            currency="INR",
        )
        SubscriptionStarCreditRule.objects.create(
            institute=self.context["institute"],
            plan_cycle=cycle,
            stars_credited=700,
            credit_on_activation=True,
            credit_on_renewal=True,
        )

        self.client.force_authenticate(user=self.student_user)
        create_response = self.client.post(
            "/api/v1/economy/orders/subscription/",
            {
                "subscription_plan_cycle": str(cycle.id),
                "provider_name": "manual",
                "provider_order_reference": "order-sub-policy-2",
            },
            format="json",
        )
        order_id = create_response.data["data"]["id"]

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.post(
            f"/api/v1/economy/admin/orders/{order_id}/confirm/",
            {"provider_transaction_reference": "txn-sub-policy-2"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["student_subscription"]["status"], "active")
