from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.economy.models import (
    ContentAccessPolicy,
    EconomyBalanceSource,
    InstituteQuestionEntitlement,
    InstituteQuestionEntitlementStatus,
    InstituteQuestionFeatureEntitlement,
    InstituteQuestionUsageActionType,
    InstituteQuestionUsageLedger,
    QuestionBankAccessMode,
    PaymentOrder,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageScope,
    QuestionBankPackageType,
    ReferralProgram,
    ReferralRewardSide,
    RewardRule,
    StarPack,
    StudentEconomyProfile,
    StudentEntitlement,
    StudentSubscription,
    SubscriptionPlan,
    SubscriptionPlanQuestionBankPackage,
    SubscriptionPlanCycle,
    SubscriptionStarCreditRule,
)
from apps.economy.services import (
    active_institute_question_entitlements,
    active_institute_question_feature_entitlements,
    apply_subscription_plan_question_bank_links_to_institute,
    apply_referral_code_for_student_signup,
    complete_payment_order,
    credit_stars,
    create_star_pack_payment_order,
    create_subscription_payment_order,
    debit_stars,
    evaluate_and_sync_unlock_state,
    grant_institute_feature_entitlement,
    grant_institute_question_bank_entitlement,
    get_entitlement_quota_summary,
    get_or_create_student_economy_profile,
    get_or_create_student_referral_code,
    institute_has_master_question_access,
    institute_has_question_bank_feature,
    institute_has_question_bank_package,
    issue_reward_for_event,
    list_accessible_question_bank_packages,
    find_matching_question_bank_packages_for_master_question,
    resolve_question_bank_entitlement_for_master_question_use,
    process_exam_result_rewards,
    process_signup_rewards,
    record_exam_question_bank_usage,
)
from apps.question_bank.models import MasterQuestion, MasterQuestionSourceType, MasterQuestionVisibility, Question
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

    def test_active_institute_question_entitlements_only_returns_live_active_rows(self):
        public_hub = self.builder.create_institute(
            code="PUBEQ1",
            name="Public Question Hub",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Class 10 Math Library",
            code="CLS10_MATH_LIBRARY",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        now = timezone.now()
        active_entitlement = InstituteQuestionEntitlement.objects.create(
            institute=public_hub,
            question_bank_package=package,
            status=InstituteQuestionEntitlementStatus.ACTIVE,
            starts_at=now - timedelta(days=1),
            ends_at=now + timedelta(days=1),
        )
        InstituteQuestionEntitlement.objects.create(
            institute=public_hub,
            question_bank_package=package,
            status=InstituteQuestionEntitlementStatus.REVOKED,
            starts_at=now - timedelta(days=3),
            ends_at=now - timedelta(days=2),
        )

        entitlements = list(active_institute_question_entitlements(public_hub, at_time=now))

        self.assertEqual(entitlements, [active_entitlement])

    def test_list_accessible_question_bank_packages_and_has_package_follow_active_entitlements(self):
        public_hub = self.builder.create_institute(
            code="PUBEQ2",
            name="Public Question Hub 2",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="NEET Physics Core",
            code="NEET_PHYSICS_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        InstituteQuestionEntitlement.objects.create(
            institute=public_hub,
            question_bank_package=package,
            status=InstituteQuestionEntitlementStatus.ACTIVE,
        )

        package_ids = list(
            list_accessible_question_bank_packages(institute=public_hub).values_list("id", flat=True)
        )

        self.assertEqual(package_ids, [package.id])
        self.assertTrue(institute_has_question_bank_package(public_hub, question_bank_package=package))

    def test_grant_institute_question_bank_entitlement_is_idempotent_for_live_row(self):
        public_hub = self.builder.create_institute(
            code="PUBEQ3",
            name="Public Question Hub 3",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="JEE Chemistry Core",
            code="JEE_CHEMISTRY_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )

        first_entitlement, first_created = grant_institute_question_bank_entitlement(
            institute=public_hub,
            question_bank_package=package,
            notes="Initial grant",
        )
        second_entitlement, second_created = grant_institute_question_bank_entitlement(
            institute=public_hub,
            question_bank_package=package,
            notes="Refreshed grant",
        )

        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(first_entitlement.id, second_entitlement.id)
        self.assertEqual(second_entitlement.notes, "Refreshed grant")
        usage_entries = list(
            InstituteQuestionUsageLedger.objects.filter(
                entitlement=second_entitlement,
                action_type=InstituteQuestionUsageActionType.ENTITLEMENT_OVERRIDE,
            ).order_by("created_at")
        )
        self.assertEqual(len(usage_entries), 2)
        self.assertTrue(usage_entries[0].metadata["created"])
        self.assertFalse(usage_entries[1].metadata["created"])

    def test_grant_institute_feature_entitlement_enables_feature_lookup(self):
        public_hub = self.builder.create_institute(
            code="PUBEQ4",
            name="Public Question Hub 4",
            metadata={"is_public_content_hub": True},
        )

        entitlement, created = grant_institute_feature_entitlement(
            institute=public_hub,
            feature_code="exam_blueprint_export",
        )

        self.assertTrue(created)
        self.assertEqual(entitlement.feature_code, "EXAM_BLUEPRINT_EXPORT")
        self.assertTrue(institute_has_question_bank_feature(public_hub, "exam_blueprint_export"))
        self.assertEqual(
            list(active_institute_question_feature_entitlements(public_hub).values_list("feature_code", flat=True)),
            ["EXAM_BLUEPRINT_EXPORT"],
        )

    def test_platform_master_question_access_requires_matching_package_scope(self):
        public_hub = self.builder.create_institute(
            code="PUBEQ5",
            name="Public Question Hub 5",
            metadata={"is_public_content_hub": True},
        )
        private_institute = self.builder.create_institute(
            code="SCH900",
            name="Subscribed School",
        )
        public_program = self.builder.create_program(public_hub, code="CLS7", name="Class 7")
        public_subject = self.builder.create_subject(public_hub, public_program, code="CLS7-MATH", name="Math")
        public_topic = self.builder.create_topic(public_hub, public_subject, code="ALG-01", name="Algebra")
        master_question = MasterQuestion.objects.create(
            source_institute=public_hub,
            source_program=public_program,
            source_subject=public_subject,
            source_topic=public_topic,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="What is x + x?",
            source_type=MasterQuestionSourceType.PLATFORM,
            visibility=MasterQuestionVisibility.SHARED_BY_REQUEST,
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Class 7 Math Library",
            code="CLS7_MATH_LIBRARY",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=package,
            program=public_program,
            subject=public_subject,
            topic=public_topic,
            question_source_type="platform_only",
            question_type="mcq_single",
            difficulty_level="intermediate",
            master_visibility="shared_by_request",
        )

        self.assertFalse(institute_has_master_question_access(private_institute, master_question=master_question))

        grant_institute_question_bank_entitlement(
            institute=private_institute,
            question_bank_package=package,
        )

        matches = find_matching_question_bank_packages_for_master_question(
            private_institute,
            master_question=master_question,
        )

        self.assertEqual([matched.id for matched in matches], [package.id])
        self.assertTrue(institute_has_master_question_access(private_institute, master_question=master_question))

    def test_quota_resolution_skips_exhausted_entitlement_and_picks_available_match(self):
        public_hub = self.builder.create_institute(
            code="PUBEQ6",
            name="Public Question Hub 6",
            metadata={"is_public_content_hub": True},
        )
        private_institute = self.builder.create_institute(
            code="SCH901",
            name="Subscribed School 2",
        )
        public_program = self.builder.create_program(public_hub, code="CLS7", name="Class 7")
        public_subject = self.builder.create_subject(public_hub, public_program, code="CLS7-MATH", name="Math")
        public_topic = self.builder.create_topic(public_hub, public_subject, code="ALG-01", name="Algebra")
        master_question = MasterQuestion.objects.create(
            source_institute=public_hub,
            source_program=public_program,
            source_subject=public_subject,
            source_topic=public_topic,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="What is x + x + x?",
            source_type=MasterQuestionSourceType.PLATFORM,
            visibility=MasterQuestionVisibility.SHARED_BY_REQUEST,
        )
        exhausted_package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Quota Math Library A",
            code="CLS7_MATH_LIBRARY_A",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode=QuestionBankAccessMode.QUOTA_LIMITED,
        )
        available_package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Quota Math Library B",
            code="CLS7_MATH_LIBRARY_B",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode=QuestionBankAccessMode.QUOTA_LIMITED,
        )
        exhausted_scope = QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=exhausted_package,
            program=public_program,
            subject=public_subject,
            topic=public_topic,
            question_source_type="platform_only",
            question_type="mcq_single",
            difficulty_level="intermediate",
            master_visibility="shared_by_request",
            max_questions_total=1,
        )
        QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=available_package,
            program=public_program,
            subject=public_subject,
            topic=public_topic,
            question_source_type="platform_only",
            question_type="mcq_single",
            difficulty_level="intermediate",
            master_visibility="shared_by_request",
            max_questions_total=3,
        )

        exhausted_entitlement, _ = grant_institute_question_bank_entitlement(
            institute=private_institute,
            question_bank_package=exhausted_package,
        )
        available_entitlement, _ = grant_institute_question_bank_entitlement(
            institute=private_institute,
            question_bank_package=available_package,
        )

        InstituteQuestionUsageLedger.objects.create(
            institute=private_institute,
            entitlement=exhausted_entitlement,
            question_bank_package=exhausted_package,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            master_question=master_question,
            quantity=1,
            effective_at=timezone.now(),
            metadata={},
        )

        resolved = resolve_question_bank_entitlement_for_master_question_use(
            private_institute,
            master_question=master_question,
        )

        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.id, available_entitlement.id)

    def test_entitlement_quota_summary_flags_near_limit_before_exhaustion(self):
        public_hub = self.builder.create_institute(
            code="PUBEQ8",
            name="Public Question Hub 8",
            metadata={"is_public_content_hub": True},
        )
        private_institute = self.builder.create_institute(
            code="SCH903",
            name="Subscribed School 4",
        )
        public_program = self.builder.create_program(public_hub, code="CLS8", name="Class 8")
        public_subject = self.builder.create_subject(public_hub, public_program, code="CLS8-MATH", name="Math")
        public_topic = self.builder.create_topic(public_hub, public_subject, code="ALG-02", name="Expressions")
        master_question = MasterQuestion.objects.create(
            source_institute=public_hub,
            source_program=public_program,
            source_subject=public_subject,
            source_topic=public_topic,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Simplify 2x + 3x.",
            source_type=MasterQuestionSourceType.PLATFORM,
            visibility=MasterQuestionVisibility.SHARED_BY_REQUEST,
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Near Limit Math Library",
            code="CLS8_MATH_NEAR_LIMIT",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode=QuestionBankAccessMode.QUOTA_LIMITED,
        )
        QuestionBankPackageScope.objects.create(
            institute=public_hub,
            package=package,
            program=public_program,
            subject=public_subject,
            topic=public_topic,
            question_source_type="platform_only",
            question_type="mcq_single",
            difficulty_level="intermediate",
            master_visibility="shared_by_request",
            max_questions_total=10,
        )
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=private_institute,
            question_bank_package=package,
        )
        InstituteQuestionUsageLedger.objects.create(
            institute=private_institute,
            entitlement=entitlement,
            question_bank_package=package,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            master_question=master_question,
            quantity=9,
            effective_at=timezone.now(),
            metadata={},
        )

        summary = get_entitlement_quota_summary(entitlement)

        self.assertTrue(summary["quota_configured"])
        self.assertEqual(summary["quota_status"], "available")
        self.assertEqual(summary["quota_watch_state"], "near_limit")
        self.assertEqual(summary["quota_remaining_min"], 1)

    def test_apply_subscription_plan_question_bank_links_to_institute_grants_included_links_only(self):
        public_hub = self.builder.create_institute(
            code="PUBEQ7",
            name="Public Question Hub 7",
            metadata={"is_public_content_hub": True},
        )
        target_institute = self.builder.create_institute(
            code="SCH902",
            name="Subscribed School 3",
        )
        included_package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Included Math Library",
            code="INCLUDED_MATH_LIBRARY",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        addon_package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Addon Science Library",
            code="ADDON_SCIENCE_LIBRARY",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        plan = SubscriptionPlan.objects.create(
            institute=public_hub,
            name="Question Bank Access Plan",
            code="QB_ACCESS_PLAN",
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

        entitlements = apply_subscription_plan_question_bank_links_to_institute(
            subscription_plan=plan,
            target_institute=target_institute,
            granted_by=self.admin_user,
            notes="Apply included links",
        )

        self.assertEqual(len(entitlements), 1)
        self.assertEqual(entitlements[0].question_bank_package_id, included_package.id)
        self.assertEqual(entitlements[0].subscription_plan_id, plan.id)
        self.assertEqual(entitlements[0].granted_via, "subscription")
        self.assertFalse(
            InstituteQuestionEntitlement.objects.filter(
                institute=target_institute,
                question_bank_package=addon_package,
                status=InstituteQuestionEntitlementStatus.ACTIVE,
            ).exists()
        )

    def test_record_exam_question_bank_usage_groups_linked_questions_by_package(self):
        linked_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Linked shared-library local question",
            metadata={"linked_from_master": "master-1"},
        )
        second_linked_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Second linked shared-library local question",
            metadata={"linked_from_master": "master-2"},
        )

        package = QuestionBankPackage.objects.create(
            institute=self.context["institute"],
            name="Quota-backed Math Package",
            code="QB_MATH_LOCAL",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.INSTITUTE,
        )
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
        )

        InstituteQuestionUsageLedger.objects.create(
            institute=self.context["institute"],
            entitlement=entitlement,
            question_bank_package=package,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            question=linked_question,
            quantity=1,
            effective_at=timezone.now(),
            metadata={},
        )
        InstituteQuestionUsageLedger.objects.create(
            institute=self.context["institute"],
            entitlement=entitlement,
            question_bank_package=package,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            question=second_linked_question,
            quantity=1,
            effective_at=timezone.now(),
            metadata={},
        )

        exam = self.context["exam"]
        exam.exam_questions.all().delete()
        self.builder.create_exam_question(exam, linked_question, question_order=1)
        self.builder.create_exam_question(exam, second_linked_question, question_order=2)

        recorded_entries = record_exam_question_bank_usage(
            exam=exam,
            action_type=InstituteQuestionUsageActionType.EXAM_CREATED,
            performed_by=None,
            metadata={"operation": "test"},
        )

        self.assertEqual(len(recorded_entries), 1)
        entry = recorded_entries[0]
        self.assertEqual(entry.question_bank_package_id, package.id)
        self.assertEqual(entry.entitlement_id, entitlement.id)
        self.assertEqual(entry.exam_id, exam.id)
        self.assertEqual(entry.quantity, 2)
        self.assertEqual(entry.metadata["linked_question_count"], 2)
        self.assertEqual(len(entry.metadata["question_ids"]), 2)

        repeat_entries = record_exam_question_bank_usage(
            exam=exam,
            action_type=InstituteQuestionUsageActionType.EXAM_CREATED,
            performed_by=None,
            metadata={"operation": "test-repeat"},
        )
        self.assertEqual(len(repeat_entries), 1)
        self.assertEqual(
            InstituteQuestionUsageLedger.objects.filter(
                institute=self.context["institute"],
                question_bank_package=package,
                entitlement=entitlement,
                action_type=InstituteQuestionUsageActionType.EXAM_CREATED,
                exam=exam,
                is_active=True,
            ).count(),
            1,
        )
