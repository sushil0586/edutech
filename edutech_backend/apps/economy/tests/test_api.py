from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.economy.models import (
    EconomyOperatorPolicyConfig,
    InstituteQuestionEntitlement,
    InstituteQuestionFeatureEntitlement,
    InstituteQuestionEntitlementStatus,
    InstituteSubscriptionRequest,
    InstituteSubscriptionRequestStatus,
    InstituteQuestionUsageActionType,
    InstituteQuestionUsageLedger,
    PaymentOrder,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageScope,
    QuestionBankPackageType,
    ReferralProgram,
    RewardRule,
    StarPack,
    StudentSubscription,
    StudentUnlockState,
    SubscriptionPlan,
    SubscriptionPlanCycle,
    SubscriptionPlanQuestionBankPackage,
    SubscriptionStarCreditRule,
)
from apps.economy.governance import get_or_create_economy_operator_policy_config
from apps.reports.models import AuditLog
from apps.economy.services import (
    credit_stars,
    get_or_create_student_economy_profile,
    grant_institute_question_bank_entitlement,
)
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
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="economy-teacher",
            password="Teacher@123",
            email="economy-teacher@example.com",
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

    def test_platform_admin_can_view_question_bank_packages_and_entitlements(self):
        public_hub = self.builder.create_institute(
            code="PUBECON1",
            name="Economy Public Hub",
            metadata={"is_public_content_hub": True},
        )
        program = self.builder.create_program(public_hub, code="CLS10", name="Class 10")
        subject = self.builder.create_subject(public_hub, program, code="MATH10", name="Mathematics")
        topic = self.builder.create_topic(public_hub, subject, code="ALG-LINEAR", name="Linear Equations")
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=package,
            program=program,
            subject=subject,
            topic=topic,
            max_questions_total=500,
            max_questions_per_topic=500,
        )
        InstituteQuestionEntitlement.objects.create(
            institute=self.context["institute"],
            question_bank_package=package,
            status=InstituteQuestionEntitlementStatus.ACTIVE,
            granted_via="admin_grant",
            granted_by=self.platform_admin_user,
        )
        plan = SubscriptionPlan.objects.create(
            institute=public_hub,
            name="Shared Library Plan",
            code="shared_library_plan",
            description="Plan linked to the demo package.",
        )
        SubscriptionPlanQuestionBankPackage.objects.create(
            institute=public_hub,
            subscription_plan=plan,
            question_bank_package=package,
            grant_mode="included",
            is_default=True,
        )

        self.client.force_authenticate(user=self.platform_admin_user)

        package_response = self.client.get("/api/v1/economy/admin/question-bank-packages/")
        entitlement_response = self.client.get("/api/v1/economy/admin/question-bank-entitlements/")

        self.assertEqual(package_response.status_code, 200)
        self.assertEqual(entitlement_response.status_code, 200)
        self.assertTrue(
            any(item["code"] == "DEMO_SHARED_LIBRARY_ACCESS" for item in package_response.data)
        )
        package_item = next(
            item for item in package_response.data if item["code"] == "DEMO_SHARED_LIBRARY_ACCESS"
        )
        self.assertEqual(
            package_item["display_name"],
            "Demo Shared Library Access (DEMO_SHARED_LIBRARY_ACCESS)",
        )
        self.assertIn("Mathematics", package_item["coverage_subject_labels"])
        self.assertIn("Linear Equations", package_item["coverage_topic_labels"])
        self.assertEqual(package_item["program_count"], 1)
        self.assertEqual(package_item["subject_count"], 1)
        self.assertEqual(package_item["topic_count"], 1)
        self.assertEqual(package_item["default_plan_count"], 1)
        self.assertIn("Platform Owned", package_item["commercial_labels"])
        self.assertIn("Public Catalog", package_item["commercial_labels"])
        self.assertEqual(package_item["coverage_summary"], "1 subject · 1 topic · 1 scope row")
        self.assertTrue(
            any(item["question_bank_package_code"] == "DEMO_SHARED_LIBRARY_ACCESS" for item in entitlement_response.data)
        )

    def test_platform_admin_can_create_question_bank_package_with_scope(self):
        public_hub = self.builder.create_institute(
            code="PUBPKG01",
            name="Economy Public Hub Packages",
            metadata={"is_public_content_hub": True},
        )
        program = self.builder.create_program(public_hub, code="CLS10", name="Class 10")
        subject = self.builder.create_subject(public_hub, program, code="MATH10", name="Mathematics")
        topic = self.builder.create_topic(public_hub, subject, code="ALG10", name="Linear Equations")

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.post(
            "/api/v1/economy/admin/question-bank-packages/",
            {
                "institute": str(public_hub.id),
                "name": "Class 10 Math Core",
                "code": "cls10_math_core",
                "description": "Core package for Class 10 math",
                "package_type": "subject_library",
                "ownership_type": "platform",
                "access_mode": "link_on_demand",
                "is_public_catalog": True,
                "sort_order": 10,
                "metadata": {},
                "is_active": True,
                "scopes": [
                    {
                        "program": str(program.id),
                        "subject": str(subject.id),
                        "topic": str(topic.id),
                        "question_source_type": "platform_only",
                        "difficulty_level": "intermediate",
                        "question_type": "mcq_single",
                        "master_visibility": "public",
                        "max_questions_total": 500,
                        "max_questions_per_topic": 200,
                        "metadata": {},
                        "is_active": True,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["code"], "CLS10_MATH_CORE")
        self.assertEqual(response.data["data"]["scope_count"], 1)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_question_bank_package_create",
                entity_type="question_bank_package",
            ).exists()
        )

    def test_platform_admin_can_update_question_bank_package_and_scope_rows(self):
        public_hub = self.builder.create_institute(
            code="PUBPKG02",
            name="Economy Public Hub Packages 2",
            metadata={"is_public_content_hub": True},
        )
        program = self.builder.create_program(public_hub, code="CLS11", name="Class 11")
        subject = self.builder.create_subject(public_hub, program, code="PHY11", name="Physics")
        topic = self.builder.create_topic(public_hub, subject, code="MOTION11", name="Motion")
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Physics Starter",
            code="physics_starter",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        scope = QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=package,
            program=program,
            subject=subject,
            topic=topic,
            question_source_type="platform_only",
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.patch(
            f"/api/v1/economy/admin/question-bank-packages/{package.id}/",
            {
                "name": "Physics Starter Updated",
                "access_mode": "quota_limited",
                "sort_order": 25,
                "scopes": [
                    {
                        "id": str(scope.id),
                        "program": str(program.id),
                        "subject": str(subject.id),
                        "topic": str(topic.id),
                        "question_source_type": "platform_only",
                        "difficulty_level": "advanced",
                        "question_type": "mcq_single",
                        "master_visibility": "public",
                        "max_questions_total": 300,
                        "max_questions_per_topic": 150,
                        "metadata": {},
                        "is_active": True,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        package.refresh_from_db()
        scope.refresh_from_db()
        self.assertEqual(package.name, "Physics Starter Updated")
        self.assertEqual(package.access_mode, "quota_limited")
        self.assertEqual(package.sort_order, 25)
        self.assertEqual(scope.difficulty_level, "advanced")
        self.assertEqual(scope.max_questions_total, 300)
        self.assertEqual(scope.max_questions_per_topic, 150)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_question_bank_package_update",
                entity_type="question_bank_package",
                entity_id=str(package.id),
            ).exists()
        )

    def test_platform_admin_can_view_question_bank_usage_entries(self):
        public_hub = self.builder.create_institute(
            code="PUBECON_USAGE",
            name="Economy Public Hub Usage",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
            granted_by=self.platform_admin_user,
            notes="Operator grant",
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.get("/api/v1/economy/admin/question-bank-usage/")

        self.assertEqual(response.status_code, 200)
        target_entry = next(
            (item for item in response.data if item["question_bank_package_code"] == "DEMO_SHARED_LIBRARY_ACCESS"),
            None,
        )
        self.assertIsNotNone(target_entry)
        self.assertEqual(target_entry["action_type"], InstituteQuestionUsageActionType.ENTITLEMENT_OVERRIDE)
        self.assertEqual(str(target_entry["institute"]), str(self.context["institute"].id))

    def test_platform_admin_can_pause_reactivate_and_revoke_question_bank_entitlement(self):
        public_hub = self.builder.create_institute(
            code="PUBECON_STATUS",
            name="Economy Public Hub Status",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
            granted_by=self.platform_admin_user,
            notes="Initial grant",
        )

        self.client.force_authenticate(user=self.platform_admin_user)

        pause_response = self.client.patch(
            f"/api/v1/economy/admin/question-bank-entitlements/{entitlement.id}/",
            {"status": "paused", "notes": "Paused for support review"},
            format="json",
        )
        self.assertEqual(pause_response.status_code, 200)
        entitlement.refresh_from_db()
        self.assertEqual(entitlement.status, InstituteQuestionEntitlementStatus.PAUSED)
        self.assertEqual(entitlement.notes, "Paused for support review")

        reactivate_response = self.client.patch(
            f"/api/v1/economy/admin/question-bank-entitlements/{entitlement.id}/",
            {"status": "active", "notes": "Reactivated"},
            format="json",
        )
        self.assertEqual(reactivate_response.status_code, 200)
        entitlement.refresh_from_db()
        self.assertEqual(entitlement.status, InstituteQuestionEntitlementStatus.ACTIVE)
        self.assertEqual(entitlement.notes, "Reactivated")
        self.assertIsNone(entitlement.revoked_by)

        revoke_response = self.client.patch(
            f"/api/v1/economy/admin/question-bank-entitlements/{entitlement.id}/",
            {"status": "revoked", "notes": "Revoked permanently"},
            format="json",
        )
        self.assertEqual(revoke_response.status_code, 200)
        entitlement.refresh_from_db()
        self.assertEqual(entitlement.status, InstituteQuestionEntitlementStatus.REVOKED)
        self.assertEqual(entitlement.notes, "Revoked permanently")
        self.assertEqual(entitlement.revoked_by_id, self.platform_admin_user.id)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.platform_admin_user,
                action="economy_question_bank_entitlement_update",
                entity_type="institute_question_entitlement",
                entity_id=str(entitlement.id),
            ).exists()
        )

    def test_platform_admin_can_update_question_bank_entitlement_lifecycle_window(self):
        public_hub = self.builder.create_institute(
            code="PUBECON_WINDOW1",
            name="Economy Public Hub Window 1",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access_window",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
            granted_by=self.platform_admin_user,
            notes="Initial lifecycle grant",
        )
        starts_at = timezone.now() + timedelta(days=1)
        ends_at = starts_at + timedelta(days=30)

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.patch(
            f"/api/v1/economy/admin/question-bank-entitlements/{entitlement.id}/",
            {
                "status": "active",
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "notes": "Window scheduled for monthly access",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        entitlement.refresh_from_db()
        self.assertEqual(entitlement.status, InstituteQuestionEntitlementStatus.ACTIVE)
        self.assertEqual(entitlement.notes, "Window scheduled for monthly access")
        self.assertIsNotNone(entitlement.starts_at)
        self.assertIsNotNone(entitlement.ends_at)
        self.assertEqual(entitlement.starts_at.isoformat(), starts_at.isoformat())
        self.assertEqual(entitlement.ends_at.isoformat(), ends_at.isoformat())

    def test_platform_admin_cannot_set_invalid_question_bank_entitlement_window(self):
        public_hub = self.builder.create_institute(
            code="PUBECON_WINDOW2",
            name="Economy Public Hub Window 2",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access_window_invalid",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
            granted_by=self.platform_admin_user,
        )
        starts_at = timezone.now() + timedelta(days=7)
        ends_at = starts_at - timedelta(days=1)

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.patch(
            f"/api/v1/economy/admin/question-bank-entitlements/{entitlement.id}/",
            {
                "status": "active",
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("ends_at", response.data)

    def test_institute_admin_cannot_view_platform_question_bank_usage_list(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/economy/admin/question-bank-usage/")
        self.assertEqual(response.status_code, 403)

    def test_institute_admin_cannot_update_platform_question_bank_entitlement(self):
        public_hub = self.builder.create_institute(
            code="PUBECON_STATUS2",
            name="Economy Public Hub Status 2",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
            granted_by=self.platform_admin_user,
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f"/api/v1/economy/admin/question-bank-entitlements/{entitlement.id}/",
            {"status": "paused"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_institute_admin_cannot_view_platform_question_bank_operator_lists(self):
        self.client.force_authenticate(user=self.admin_user)

        package_response = self.client.get("/api/v1/economy/admin/question-bank-packages/")
        entitlement_response = self.client.get("/api/v1/economy/admin/question-bank-entitlements/")
        usage_response = self.client.get("/api/v1/economy/admin/question-bank-usage/")

        self.assertEqual(package_response.status_code, 403)
        self.assertEqual(entitlement_response.status_code, 403)
        self.assertEqual(usage_response.status_code, 403)

    def test_institute_admin_can_view_only_own_institute_question_bank_entitlements(self):
        public_hub = self.builder.create_institute(
            code="PUBECON_INST1",
            name="Economy Public Hub Institute 1",
            metadata={"is_public_content_hub": True},
        )
        program = self.builder.create_program(public_hub, code="CLS10", name="Class 10")
        subject = self.builder.create_subject(public_hub, program, code="MATH10", name="Mathematics")
        topic = self.builder.create_topic(public_hub, subject, code="ALG-ENT-01", name="Linear Equations")
        other_institute = self.builder.create_institute(
            code="SCH-OTHER-ENT",
            name="Other Institute",
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=package,
            program=program,
            subject=subject,
            topic=topic,
            max_questions_total=500,
            max_questions_per_topic=250,
        )
        own_entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
            granted_by=self.platform_admin_user,
        )
        grant_institute_question_bank_entitlement(
            institute=other_institute,
            question_bank_package=package,
            granted_by=self.platform_admin_user,
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/economy/admin/institute-question-bank-entitlements/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(own_entitlement.id))
        self.assertEqual(str(response.data[0]["institute"]), str(self.context["institute"].id))
        self.assertEqual(response.data[0]["question_bank_package_type"], "subject_library")
        self.assertEqual(response.data[0]["question_bank_package_ownership_type"], "platform")
        self.assertEqual(response.data[0]["question_bank_package_access_mode"], "link_on_demand")
        self.assertEqual(response.data[0]["scope_count"], 1)
        self.assertIn("Mathematics", response.data[0]["scope_subject_labels"])
        self.assertIn("Linear Equations", response.data[0]["scope_topic_labels"])
        self.assertTrue(
            any("Class 10 -> Mathematics -> Linear Equations" in item for item in response.data[0]["scope_summary"])
        )
        self.assertFalse(response.data[0]["quota_configured"])
        self.assertEqual(response.data[0]["quota_status"], "not_applicable")
        self.assertEqual(response.data[0]["quota_watch_state"], "not_applicable")
        self.assertEqual(response.data[0]["quota_usage_total"], 0)
        self.assertIsNone(response.data[0]["quota_remaining_min"])
        self.assertEqual(response.data[0]["quota_scope_summary"], [])

    def test_teacher_can_view_scoped_question_bank_entitlements(self):
        public_hub = self.builder.create_institute(
            code="PUBECON_TEACH",
            name="Teacher Question Hub",
            metadata={"is_public_content_hub": True},
        )
        program = self.builder.create_program(public_hub, code="CLS9", name="Class 9")
        subject = self.builder.create_subject(public_hub, program, code="SCI9", name="Science")
        topic = self.builder.create_topic(public_hub, subject, code="SCI-CELL-01", name="Cell Basics")
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Teacher Scoped Science Library",
            code="teacher_scoped_science_library",
            description="Teacher-scoped shared science package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="quota_limited",
        )
        QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=package,
            program=program,
            subject=subject,
            topic=topic,
            max_questions_total=300,
        )
        own_entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
            granted_by=self.platform_admin_user,
        )

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/v1/economy/admin/institute-question-bank-entitlements/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(own_entitlement.id))
        self.assertEqual(response.data[0]["question_bank_package_name"], "Teacher Scoped Science Library")
        self.assertEqual(response.data[0]["question_bank_package_access_mode"], "quota_limited")
        self.assertTrue(response.data[0]["quota_configured"])
        self.assertEqual(response.data[0]["quota_status"], "available")
        self.assertEqual(response.data[0]["quota_watch_state"], "healthy")
        self.assertEqual(response.data[0]["quota_remaining_min"], 300)

    def test_platform_admin_can_view_question_bank_package_report(self):
        public_hub = self.builder.create_institute(
            code="PUBECONRPT",
            name="Economy Public Hub Report",
            metadata={"is_public_content_hub": True},
        )
        program = self.builder.create_program(public_hub, code="CLS10", name="Class 10")
        subject = self.builder.create_subject(public_hub, program, code="MATH10", name="Mathematics")
        topic = self.builder.create_topic(public_hub, subject, code="ALG-RPT-01", name="Linear Equations")
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Report Library",
            code="report_library",
            description="Package report fixture.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="quota_limited",
        )
        QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=package,
            program=program,
            subject=subject,
            topic=topic,
            max_questions_total=10,
        )
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
            granted_by=self.platform_admin_user,
        )
        InstituteQuestionUsageLedger.objects.create(
            institute=self.context["institute"],
            question_bank_package=package,
            entitlement=entitlement,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            quantity=3,
            effective_at=timezone.now(),
            metadata={},
        )
        InstituteQuestionUsageLedger.objects.create(
            institute=self.context["institute"],
            question_bank_package=package,
            entitlement=entitlement,
            action_type=InstituteQuestionUsageActionType.EXAM_PUBLISHED,
            quantity=1,
            effective_at=timezone.now(),
            metadata={},
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.get(
            "/api/v1/economy/admin/question-bank-package-report/",
            {"institute": str(self.context["institute"].id)},
        )

        self.assertEqual(response.status_code, 200)
        target_row = next((item for item in response.data if item["package_code"] == "REPORT_LIBRARY"), None)
        self.assertIsNotNone(target_row)
        self.assertEqual(target_row["entitlement_active"], 1)
        self.assertEqual(target_row["usage_question_linked"], 3)
        self.assertEqual(target_row["usage_exam_published"], 1)
        self.assertIn("Mathematics", target_row["subject_labels"])

    def test_platform_admin_can_export_question_bank_package_report_csv(self):
        public_hub = self.builder.create_institute(
            code="PUBECONCSV",
            name="Economy Public Hub CSV",
            metadata={"is_public_content_hub": True},
        )
        program = self.builder.create_program(public_hub, code="CLS9", name="Class 9")
        subject = self.builder.create_subject(public_hub, program, code="SCI9", name="Science")
        topic = self.builder.create_topic(public_hub, subject, code="CELL-CSV-01", name="Cell Basics")
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="CSV Library",
            code="csv_library",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=package,
            program=program,
            subject=subject,
            topic=topic,
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.get(
            "/api/v1/economy/admin/question-bank-package-report/",
            {"export": "csv"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn("CSV_LIBRARY", response.content.decode("utf-8"))

    def test_institute_admin_can_view_requestable_subscription_plans_and_submit_request(self):
        public_hub = self.builder.create_institute(
            code="PUBPLANREQ",
            name="Plan Request Hub",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Institute Access Library",
            code="institute_access_library",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        plan = SubscriptionPlan.objects.create(
            institute=public_hub,
            name="Institute Content Plan",
            code="INSTITUTE_CONTENT_PLAN",
            is_active=True,
        )
        cycle = SubscriptionPlanCycle.objects.create(
            institute=public_hub,
            plan=plan,
            billing_interval="monthly",
            interval_count=1,
            price_amount="1499.00",
            is_active=True,
        )
        SubscriptionPlanQuestionBankPackage.objects.create(
            institute=public_hub,
            subscription_plan=plan,
            question_bank_package=package,
            grant_mode="included",
            is_default=True,
            is_active=True,
        )

        self.client.force_authenticate(user=self.admin_user)
        catalog_response = self.client.get("/api/v1/economy/admin/institute-requestable-subscription-plans/")
        self.assertEqual(catalog_response.status_code, 200)
        self.assertTrue(any(item["code"] == "INSTITUTE_CONTENT_PLAN" for item in catalog_response.data))
        plan_payload = next(item for item in catalog_response.data if item["code"] == "INSTITUTE_CONTENT_PLAN")
        self.assertEqual(len(plan_payload["question_bank_package_links"]), 1)
        self.assertEqual(
            plan_payload["question_bank_package_links"][0]["question_bank_package_display_name"],
            "Institute Access Library (INSTITUTE_ACCESS_LIBRARY)",
        )
        self.assertIn(
            "Platform Owned",
            plan_payload["question_bank_package_links"][0]["question_bank_package_commercial_labels"],
        )
        self.assertEqual(
            plan_payload["question_bank_package_links"][0]["question_bank_package_coverage_summary"],
            "0 scope rows",
        )

        request_response = self.client.post(
            "/api/v1/economy/admin/institute-subscription-requests/",
            {
                "subscription_plan_cycle": str(cycle.id),
                "grant_modes": ["included"],
                "notes": "Need package access for shared-library launch.",
            },
            format="json",
        )
        self.assertEqual(request_response.status_code, 201)
        self.assertEqual(request_response.data["data"]["status"], InstituteSubscriptionRequestStatus.PENDING)
        self.assertEqual(request_response.data["data"]["subscription_plan_code"], "INSTITUTE_CONTENT_PLAN")
        self.assertEqual(request_response.data["data"]["activation_summary"]["requested_package_count"], 1)
        self.assertIn("INSTITUTE_ACCESS_LIBRARY", request_response.data["data"]["activation_summary"]["package_codes"])

    def test_platform_admin_can_review_subscription_request_and_apply_entitlements(self):
        public_hub = self.builder.create_institute(
            code="PUBPLANREV",
            name="Plan Review Hub",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Review Access Library",
            code="review_access_library",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        plan = SubscriptionPlan.objects.create(
            institute=public_hub,
            name="Reviewable Content Plan",
            code="REVIEWABLE_CONTENT_PLAN",
            is_active=True,
        )
        cycle = SubscriptionPlanCycle.objects.create(
            institute=public_hub,
            plan=plan,
            billing_interval="monthly",
            interval_count=1,
            price_amount="999.00",
            is_active=True,
        )
        SubscriptionPlanQuestionBankPackage.objects.create(
            institute=public_hub,
            subscription_plan=plan,
            question_bank_package=package,
            grant_mode="included",
            is_default=True,
            is_active=True,
        )
        subscription_request = InstituteSubscriptionRequest.objects.create(
            institute=self.context["institute"],
            subscription_plan_cycle=cycle,
            requested_by=self.admin_user,
            grant_modes=["included"],
            notes="Please activate this package lane.",
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        review_response = self.client.post(
            f"/api/v1/economy/admin/institute-subscription-requests/{subscription_request.id}/review/",
            {
                "decision": "approve",
                "operator_notes": "Approved and applied to institute.",
            },
            format="json",
        )
        self.assertEqual(review_response.status_code, 200)
        subscription_request.refresh_from_db()
        self.assertEqual(subscription_request.status, InstituteSubscriptionRequestStatus.FULFILLED)
        self.assertEqual(subscription_request.reviewed_by_id, self.platform_admin_user.id)
        self.assertEqual(review_response.data["data"]["activation_summary"]["entitlement_count"], 1)
        self.assertIn("REVIEW_ACCESS_LIBRARY", review_response.data["data"]["activation_summary"]["package_codes"])
        self.assertTrue(
            InstituteQuestionEntitlement.objects.filter(
                institute=self.context["institute"],
                question_bank_package=package,
                status=InstituteQuestionEntitlementStatus.ACTIVE,
                subscription_plan=plan,
            ).exists()
        )
        entitlement = InstituteQuestionEntitlement.objects.get(
            institute=self.context["institute"],
            question_bank_package=package,
            subscription_plan=plan,
        )
        self.assertEqual(
            entitlement.metadata.get("subscription_request_id"),
            str(subscription_request.id),
        )

    def test_institute_admin_can_view_only_own_institute_question_bank_usage(self):
        public_hub = self.builder.create_institute(
            code="PUBECON_INST2",
            name="Economy Public Hub Institute 2",
            metadata={"is_public_content_hub": True},
        )
        other_institute = self.builder.create_institute(
            code="SCH-OTHER-USG",
            name="Other Institute Usage",
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
            granted_by=self.platform_admin_user,
        )
        grant_institute_question_bank_entitlement(
            institute=other_institute,
            question_bank_package=package,
            granted_by=self.platform_admin_user,
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/economy/admin/institute-question-bank-usage/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["institute"]), str(self.context["institute"].id))
        self.assertEqual(
            response.data[0]["action_type"],
            InstituteQuestionUsageActionType.ENTITLEMENT_OVERRIDE,
        )

    def test_platform_admin_can_view_and_update_question_bank_feature_entitlements(self):
        public_hub = self.builder.create_institute(
            code="PUBFEAT1",
            name="Public Feature Hub",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Advanced Builder Feature Bundle",
            code="ADV_BUILDER_FEATURE",
            package_type=QuestionBankPackageType.FEATURE_BUNDLE,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        plan = SubscriptionPlan.objects.create(
            institute=self.context["institute"],
            name="Feature Access Plan",
            code="FEATURE_ACCESS_PLAN",
        )
        entitlement = InstituteQuestionFeatureEntitlement.objects.create(
            institute=self.context["institute"],
            feature_code="ADVANCED_EXAM_BUILDER",
            status=InstituteQuestionEntitlementStatus.ACTIVE,
            source_package=package,
            source_subscription_plan=plan,
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        list_response = self.client.get("/api/v1/economy/admin/question-bank-feature-entitlements/")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["feature_code"], "ADVANCED_EXAM_BUILDER")
        self.assertEqual(list_response.data[0]["source_package_code"], "ADV_BUILDER_FEATURE")

        patch_response = self.client.patch(
            f"/api/v1/economy/admin/question-bank-feature-entitlements/{entitlement.id}/",
            {"status": InstituteQuestionEntitlementStatus.PAUSED},
            format="json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["data"]["status"], InstituteQuestionEntitlementStatus.PAUSED)

    def test_institute_admin_cannot_view_platform_question_bank_feature_entitlement_lists(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/economy/admin/question-bank-feature-entitlements/")
        self.assertEqual(response.status_code, 403)

    def test_institute_admin_can_view_scoped_question_bank_feature_entitlements(self):
        public_hub = self.builder.create_institute(
            code="PUBFEAT2",
            name="Scoped Feature Hub",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Advanced Builder Feature Bundle",
            code="ADV_BUILDER_SCOPE",
            package_type=QuestionBankPackageType.FEATURE_BUNDLE,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        InstituteQuestionFeatureEntitlement.objects.create(
            institute=self.context["institute"],
            feature_code="ADVANCED_EXAM_BUILDER",
            status=InstituteQuestionEntitlementStatus.ACTIVE,
            source_package=package,
        )
        other_institute = self.builder.create_institute(code="OTHERFEAT1", name="Other Feature Institute")
        InstituteQuestionFeatureEntitlement.objects.create(
            institute=other_institute,
            feature_code="QUESTION_BANK_EXPORT",
            status=InstituteQuestionEntitlementStatus.ACTIVE,
            source_package=package,
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/economy/admin/institute-question-bank-feature-entitlements/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["feature_code"], "ADVANCED_EXAM_BUILDER")
        self.assertEqual(str(response.data[0]["institute"]), str(self.context["institute"].id))

    def test_teacher_can_view_scoped_question_bank_feature_entitlements(self):
        public_hub = self.builder.create_institute(
            code="PUBFEAT3",
            name="Teacher Scoped Feature Hub",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Advanced Builder Teacher Feature Bundle",
            code="ADV_BUILDER_TEACHER",
            package_type=QuestionBankPackageType.FEATURE_BUNDLE,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        InstituteQuestionFeatureEntitlement.objects.create(
            institute=self.context["institute"],
            feature_code="ADVANCED_EXAM_BUILDER",
            status=InstituteQuestionEntitlementStatus.ACTIVE,
            source_package=package,
        )

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/v1/economy/admin/institute-question-bank-feature-entitlements/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["feature_code"], "ADVANCED_EXAM_BUILDER")

    def test_platform_admin_can_view_subscription_plans_with_question_bank_package_links(self):
        public_hub = self.builder.create_institute(
            code="PUBECON2",
            name="Economy Public Hub 2",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        plan = SubscriptionPlan.objects.create(
            institute=public_hub,
            name="Question Bank Premium",
            code="QB_PREMIUM_VISIBILITY",
            description="Plan with package link visibility.",
        )
        SubscriptionPlanCycle.objects.create(
            institute=public_hub,
            plan=plan,
            billing_interval="monthly",
            interval_count=1,
            price_amount="299.00",
            currency="INR",
        )
        SubscriptionPlanQuestionBankPackage.objects.create(
            institute=public_hub,
            subscription_plan=plan,
            question_bank_package=package,
            grant_mode="included",
            is_default=True,
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.get("/api/v1/economy/admin/subscription-plans/")

        self.assertEqual(response.status_code, 200)
        target_plan = next((item for item in response.data if item["code"] == "QB_PREMIUM_VISIBILITY"), None)
        self.assertIsNotNone(target_plan)
        self.assertEqual(len(target_plan["question_bank_package_links"]), 1)
        self.assertEqual(
            target_plan["question_bank_package_links"][0]["question_bank_package_code"],
            "DEMO_SHARED_LIBRARY_ACCESS",
        )

    def test_platform_admin_can_create_and_update_subscription_plan_question_bank_links(self):
        public_hub = self.builder.create_institute(
            code="PUBECON3",
            name="Economy Public Hub 3",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )

        self.client.force_authenticate(user=self.platform_admin_user)

        create_response = self.client.post(
            "/api/v1/economy/admin/subscription-plans/",
            {
                "institute": str(public_hub.id),
                "name": "Question Bank Linked Plan",
                "code": "QB_LINKED_PLAN",
                "description": "Plan with package link authoring.",
                "metadata": {},
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
                "question_bank_package_links": [
                    {
                        "question_bank_package": str(package.id),
                        "grant_mode": "included",
                        "is_default": True,
                        "metadata": {"source": "test"},
                        "is_active": True,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        plan_id = create_response.data["data"]["id"]
        self.assertEqual(len(create_response.data["data"]["question_bank_package_links"]), 1)
        self.assertEqual(
            create_response.data["data"]["question_bank_package_links"][0]["question_bank_package_code"],
            "DEMO_SHARED_LIBRARY_ACCESS",
        )

        update_response = self.client.patch(
            f"/api/v1/economy/admin/subscription-plans/{plan_id}/",
            {
                "question_bank_package_links": [],
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["data"]["question_bank_package_links"], [])
        self.assertFalse(
            SubscriptionPlanQuestionBankPackage.objects.get(
                subscription_plan_id=plan_id,
                question_bank_package=package,
            ).is_active
        )

    def test_platform_admin_can_apply_subscription_plan_question_bank_links_to_target_institute(self):
        public_hub = self.builder.create_institute(
            code="PUBECON4",
            name="Economy Public Hub 4",
            metadata={"is_public_content_hub": True},
        )
        target_institute = self.builder.create_institute(
            code="SCH904",
            name="Linked Subscription School",
        )
        included_package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Demo Shared Library Access",
            code="demo_shared_library_access",
            description="Platform shared library package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        addon_package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Addon Practice Library",
            code="addon_practice_library",
            description="Optional addon package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode="link_on_demand",
        )
        plan = SubscriptionPlan.objects.create(
            institute=public_hub,
            name="Question Bank Premium",
            code="QB_PREMIUM_SYNC",
            description="Plan with linked packages.",
        )
        SubscriptionPlanQuestionBankPackage.objects.create(
            institute=public_hub,
            subscription_plan=plan,
            question_bank_package=included_package,
            grant_mode="included",
            is_default=True,
        )
        SubscriptionPlanQuestionBankPackage.objects.create(
            institute=public_hub,
            subscription_plan=plan,
            question_bank_package=addon_package,
            grant_mode="optional_addon",
            is_default=False,
        )

        self.client.force_authenticate(user=self.platform_admin_user)
        response = self.client.post(
            f"/api/v1/economy/admin/subscription-plans/{plan.id}/apply-to-institute/",
            {
                "institute": str(target_institute.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["entitlement_count"], 1)
        self.assertEqual(
            response.data["data"]["question_bank_package_codes"],
            ["DEMO_SHARED_LIBRARY_ACCESS"],
        )
        entitlement = InstituteQuestionEntitlement.objects.get(
            institute=target_institute,
            question_bank_package=included_package,
        )
        self.assertEqual(entitlement.subscription_plan_id, plan.id)
        self.assertEqual(entitlement.granted_via, "subscription")
        self.assertFalse(
            InstituteQuestionEntitlement.objects.filter(
                institute=target_institute,
                question_bank_package=addon_package,
            ).exists()
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
