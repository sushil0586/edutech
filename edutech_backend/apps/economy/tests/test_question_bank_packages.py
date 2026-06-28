from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.economy.models import (
    BillingInterval,
    InstituteQuestionEntitlement,
    InstituteQuestionEntitlementStatus,
    InstituteQuestionFeatureEntitlement,
    InstituteQuestionUsageActionType,
    InstituteQuestionUsageLedger,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageScope,
    QuestionBankPackageType,
    SubscriptionPlan,
    SubscriptionPlanCycle,
    SubscriptionPlanQuestionBankPackage,
)
from common.tests.builders import AcademicAssessmentBuilder


class QuestionBankPackageModelTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.public_institute = self.builder.create_institute(
            code="PUB001",
            name="Nexora Public Institute",
            metadata={"is_public_content_hub": True},
        )
        self.private_institute = self.builder.create_institute(
            code="SCH001",
            name="Springfield School",
        )
        self.program = self.builder.create_program(
            self.public_institute,
            code="CLS7",
            name="Class 7",
        )
        self.subject = self.builder.create_subject(
            self.public_institute,
            self.program,
            code="CLS7-MATH",
            name="Math",
        )
        self.topic = self.builder.create_topic(
            self.public_institute,
            self.subject,
            code="MATH-NUMBERS-LARGE",
            name="Large Numbers Around Us",
        )
        self.plan = SubscriptionPlan.objects.create(
            institute=self.public_institute,
            name="Question Bank Premium",
            code="QB_PREMIUM",
        )
        self.plan_cycle = SubscriptionPlanCycle.objects.create(
            institute=self.public_institute,
            plan=self.plan,
            billing_interval=BillingInterval.MONTHLY,
            interval_count=1,
            price_amount="999.00",
        )

    def test_platform_owned_package_must_belong_to_public_hub(self):
        package = QuestionBankPackage(
            institute=self.private_institute,
            name="Class 7 Math Core",
            code="cls7_math_core",
            description="Core school package.",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )

        with self.assertRaises(ValidationError):
            package.full_clean()

    def test_institute_owned_package_cannot_belong_to_public_hub(self):
        package = QuestionBankPackage(
            institute=self.public_institute,
            name="Private School Bundle",
            code="private_school_bundle",
            description="Should not live on public hub.",
            package_type=QuestionBankPackageType.CUSTOM_BUNDLE,
            ownership_type=QuestionBankOwnershipType.INSTITUTE,
        )

        with self.assertRaises(ValidationError):
            package.full_clean()

    def test_platform_owned_package_on_public_hub_is_valid_and_normalizes_code(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="cls7_math_core",
            description=" Core school package. ",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )

        self.assertEqual(package.code, "CLS7_MATH_CORE")
        self.assertEqual(package.description, "Core school package.")

    def test_scope_requires_at_least_one_target_dimension(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        scope = QuestionBankPackageScope(
            institute=self.public_institute,
            package=package,
        )

        with self.assertRaises(ValidationError):
            scope.full_clean()

    def test_scope_topic_must_match_selected_subject(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        other_subject = self.builder.create_subject(
            self.public_institute,
            self.program,
            code="CLS7-SCI",
            name="Science",
        )
        scope = QuestionBankPackageScope(
            institute=self.public_institute,
            package=package,
            subject=other_subject,
            topic=self.topic,
        )

        with self.assertRaises(ValidationError):
            scope.full_clean()

    def test_scope_accepts_program_subject_topic_chain(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        scope = QuestionBankPackageScope.objects.create(
            institute=self.public_institute,
            package=package,
            program=self.program,
            subject=self.subject,
            topic=self.topic,
            max_questions_total=500,
            max_questions_per_topic=500,
        )

        self.assertEqual(scope.program_id, self.program.id)
        self.assertEqual(scope.subject_id, self.subject.id)
        self.assertEqual(scope.topic_id, self.topic.id)

    def test_subscription_plan_package_mapping_requires_same_institute(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        private_plan = SubscriptionPlan.objects.create(
            institute=self.private_institute,
            name="School Premium",
            code="SCHOOL_PREMIUM",
        )
        mapping = SubscriptionPlanQuestionBankPackage(
            institute=self.private_institute,
            subscription_plan=private_plan,
            question_bank_package=package,
        )

        with self.assertRaises(ValidationError):
            mapping.full_clean()

    def test_entitlement_requires_plan_cycle_to_match_selected_plan(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        other_plan = SubscriptionPlan.objects.create(
            institute=self.public_institute,
            name="Question Bank Gold",
            code="QB_GOLD",
        )
        other_cycle = SubscriptionPlanCycle.objects.create(
            institute=self.public_institute,
            plan=other_plan,
            billing_interval=BillingInterval.YEARLY,
            interval_count=1,
            price_amount="4999.00",
        )

        entitlement = InstituteQuestionEntitlement(
            institute=self.public_institute,
            question_bank_package=package,
            subscription_plan=self.plan,
            subscription_plan_cycle=other_cycle,
        )

        with self.assertRaises(ValidationError):
            entitlement.full_clean()

    def test_platform_package_can_be_entitled_to_private_institute(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        entitlement = InstituteQuestionEntitlement(
            institute=self.private_institute,
            question_bank_package=package,
        )

        entitlement.full_clean()

    def test_platform_package_entitlement_can_reference_public_hub_subscription_plan_for_private_institute(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        entitlement = InstituteQuestionEntitlement(
            institute=self.private_institute,
            question_bank_package=package,
            subscription_plan=self.plan,
            subscription_plan_cycle=self.plan_cycle,
        )

        entitlement.full_clean()

    def test_institute_owned_package_cannot_be_entitled_to_other_institute(self):
        package = QuestionBankPackage.objects.create(
            institute=self.private_institute,
            name="Private School Bundle",
            code="PRIVATE_SCHOOL_BUNDLE",
            package_type=QuestionBankPackageType.CUSTOM_BUNDLE,
            ownership_type=QuestionBankOwnershipType.INSTITUTE,
        )
        other_private_institute = self.builder.create_institute(
            code="SCH002",
            name="Shelbyville School",
        )
        entitlement = InstituteQuestionEntitlement(
            institute=other_private_institute,
            question_bank_package=package,
        )

        with self.assertRaises(ValidationError):
            entitlement.full_clean()

    def test_entitlement_rejects_end_time_before_start_time(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        entitlement = InstituteQuestionEntitlement(
            institute=self.public_institute,
            question_bank_package=package,
            starts_at=timezone.now(),
            ends_at=timezone.now() - timedelta(days=1),
        )

        with self.assertRaises(ValidationError):
            entitlement.full_clean()

    def test_live_entitlement_is_unique_per_package(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        InstituteQuestionEntitlement.objects.create(
            institute=self.public_institute,
            question_bank_package=package,
            status=InstituteQuestionEntitlementStatus.ACTIVE,
            subscription_plan=self.plan,
            subscription_plan_cycle=self.plan_cycle,
        )

        with self.assertRaises(ValidationError):
            InstituteQuestionEntitlement.objects.create(
                institute=self.public_institute,
                question_bank_package=package,
                status=InstituteQuestionEntitlementStatus.DRAFT,
            )

    def test_feature_entitlement_normalizes_feature_code(self):
        entitlement = InstituteQuestionFeatureEntitlement.objects.create(
            institute=self.public_institute,
            feature_code=" exam_blueprint_export ",
        )

        self.assertEqual(entitlement.feature_code, "EXAM_BLUEPRINT_EXPORT")

    def test_live_feature_entitlement_is_unique_per_feature_code(self):
        InstituteQuestionFeatureEntitlement.objects.create(
            institute=self.public_institute,
            feature_code="EXAM_BLUEPRINT_EXPORT",
            status=InstituteQuestionEntitlementStatus.ACTIVE,
        )

        with self.assertRaises(ValidationError):
            InstituteQuestionFeatureEntitlement.objects.create(
                institute=self.public_institute,
                feature_code="exam_blueprint_export",
                status=InstituteQuestionEntitlementStatus.PAUSED,
            )

    def test_usage_ledger_requires_entitlement_to_match_package(self):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Core",
            code="CLS7_MATH_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        other_package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Science Core",
            code="CLS7_SCI_CORE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        entitlement = InstituteQuestionEntitlement.objects.create(
            institute=self.public_institute,
            question_bank_package=other_package,
            status=InstituteQuestionEntitlementStatus.ACTIVE,
        )

        ledger = InstituteQuestionUsageLedger(
            institute=self.public_institute,
            question_bank_package=package,
            entitlement=entitlement,
            action_type=InstituteQuestionUsageActionType.ENTITLEMENT_OVERRIDE,
            effective_at=timezone.now(),
        )

        with self.assertRaises(ValidationError):
            ledger.full_clean()
