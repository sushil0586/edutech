from django.test import TestCase
from rest_framework.test import APIClient

from apps.academics.models import AcademicYear, Program, Subject, Topic
from apps.economy.models import (
    InstituteQuestionEntitlement,
    InstituteQuestionFeatureEntitlement,
    InstituteQuestionEntitlementStatus,
    QuestionBankAccessMode,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageType,
)
from apps.institutes.models import InstituteOnboardingRun, InstituteOnboardingTaskRun
from common.tests.builders import AcademicAssessmentBuilder


class AcademicPresetApiTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.institute = self.builder.create_institute(code="PRE001", name="Preset Institute")
        self.platform_admin_user, _ = self.builder.create_platform_admin_account(
            username="preset-platform-admin",
            email="preset-platform-admin@example.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.platform_admin_user)

    def test_platform_admin_can_list_academic_presets(self):
        response = self.client.get("/api/v1/academics/presets/")

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["code"], "class_7_cbse_core")

    def test_platform_admin_can_preview_full_preset_application(self):
        response = self.client.post(
            "/api/v1/academics/presets/preview/",
            {
                "institute": str(self.institute.id),
                "preset_code": "class_7_cbse_core",
                "mode": "full",
                "academic_year_name": "2026-2027",
                "academic_year_start": "2026-04-01",
                "academic_year_end": "2027-03-31",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["program"]["code"], "CLS7")
        self.assertEqual(response.data["program"]["action"], "create")
        self.assertGreaterEqual(response.data["summary"]["subjects_to_apply"], 1)

    def test_platform_admin_can_apply_selected_subjects_from_preset(self):
        response = self.client.post(
            "/api/v1/academics/presets/apply/",
            {
                "institute": str(self.institute.id),
                "preset_code": "class_7_cbse_core",
                "mode": "selected_subjects",
                "subject_codes": ["CLS7-MATH", "CLS7-SCI"],
                "academic_year_name": "2026-2027",
                "academic_year_start": "2026-04-01",
                "academic_year_end": "2027-03-31",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(AcademicYear.objects.filter(institute=self.institute, name="2026-2027").exists())
        self.assertTrue(Program.objects.filter(institute=self.institute, code="CLS7").exists())
        self.assertTrue(Subject.objects.filter(institute=self.institute, code="CLS7-MATH").exists())
        self.assertTrue(Subject.objects.filter(institute=self.institute, code="CLS7-SCI").exists())
        self.assertFalse(Subject.objects.filter(institute=self.institute, code="CLS7-SST").exists())
        self.assertTrue(
            Topic.objects.filter(institute=self.institute, subject__code="CLS7-MATH", code="MATH-NUMBERS").exists()
        )
        self.assertEqual(response.data["summary"]["subjects"]["created"], 2)
        self.assertEqual(len(response.data["applied_subjects"]), 2)

    def test_platform_admin_can_apply_selected_topic_groups_from_preset(self):
        response = self.client.post(
            "/api/v1/academics/presets/apply/",
            {
                "institute": str(self.institute.id),
                "preset_code": "class_7_cbse_core",
                "mode": "selected_topic_groups",
                "topic_codes": ["SCI-MATTER"],
                "academic_year_name": "2026-2027",
                "academic_year_start": "2026-04-01",
                "academic_year_end": "2027-03-31",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Program.objects.filter(institute=self.institute, code="CLS7").exists())
        self.assertTrue(Subject.objects.filter(institute=self.institute, code="CLS7-SCI").exists())
        self.assertFalse(Subject.objects.filter(institute=self.institute, code="CLS7-MATH").exists())
        self.assertTrue(
            Topic.objects.filter(institute=self.institute, subject__code="CLS7-SCI", code="SCI-MATTER").exists()
        )
        self.assertTrue(
            Topic.objects.filter(
                institute=self.institute,
                subject__code="CLS7-SCI",
                code="SCI-MATTER-ACIDBASE",
            ).exists()
        )
        self.assertFalse(
            Topic.objects.filter(institute=self.institute, subject__code="CLS7-SCI", code="SCI-LIFE").exists()
        )
        self.assertEqual(len(response.data["applied_subjects"]), 1)

    def test_platform_admin_can_apply_preset_and_sync_master_default_access(self):
        public_hub = self.builder.create_institute(
            code="PUBPRE01",
            name="Preset Public Hub",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Starter Question Bank Access",
            code="starter_question_bank_access",
            description="Starter access package",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode=QuestionBankAccessMode.LINK_ON_DEMAND,
            is_public_catalog=True,
        )

        response = self.client.post(
            "/api/v1/academics/presets/apply/",
            {
                "institute": str(self.institute.id),
                "preset_code": "class_7_cbse_core",
                "mode": "selected_subjects",
                "subject_codes": ["CLS7-MATH"],
                "academic_year_name": "2026-2027",
                "academic_year_start": "2026-04-01",
                "academic_year_end": "2027-03-31",
                "question_bank_package_enabled": True,
                "question_bank_package_code": package.code,
                "advanced_builder_enabled": True,
                "onboarding_profile_code": "TRIAL_FULL_ACCESS",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            InstituteQuestionEntitlement.objects.filter(
                institute=self.institute,
                question_bank_package=package,
                status=InstituteQuestionEntitlementStatus.ACTIVE,
            ).exists()
        )
        self.assertTrue(
            InstituteQuestionFeatureEntitlement.objects.filter(
                institute=self.institute,
                feature_code="ADVANCED_EXAM_BUILDER",
                status=InstituteQuestionEntitlementStatus.ACTIVE,
                source_package=package,
            ).exists()
        )
        self.assertEqual(
            response.data["access_results"]["question_bank_package"]["package_code"],
            package.code,
        )
        self.assertEqual(
            response.data["access_results"]["advanced_builder"]["feature_code"],
            "ADVANCED_EXAM_BUILDER",
        )
        self.assertIsNotNone(response.data["onboarding_run"])
        self.assertEqual(response.data["onboarding_run"]["status"], "completed")
        run = InstituteOnboardingRun.objects.get(id=response.data["onboarding_run"]["id"])
        self.assertEqual(run.profile_code, "TRIAL_FULL_ACCESS")
        self.assertEqual(run.status, "completed")
        self.assertEqual(
            InstituteOnboardingTaskRun.objects.filter(run=run).count(),
            4,
        )

    def test_platform_admin_can_complete_existing_pending_onboarding_run(self):
        public_hub = self.builder.create_institute(
            code="PUBPRE02",
            name="Preset Public Hub 2",
            metadata={"is_public_content_hub": True},
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name="Starter Question Bank Access 2",
            code="starter_question_bank_access_2",
            description="Starter access package",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            access_mode=QuestionBankAccessMode.LINK_ON_DEMAND,
            is_public_catalog=True,
        )

        create_response = self.client.post(
            "/api/v1/institutes/",
            {
                "name": "Pending Run Institute",
                "code": "PND001",
                "onboarding_profile_code": "TRIAL_FULL_ACCESS",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        onboarding_run_id = create_response.data["onboarding_run_id"]
        self.assertIsNotNone(onboarding_run_id)

        response = self.client.post(
            "/api/v1/academics/presets/apply/",
            {
                "institute": str(create_response.data["id"]),
                "onboarding_run_id": onboarding_run_id,
                "preset_code": "class_7_cbse_core",
                "mode": "selected_subjects",
                "subject_codes": ["CLS7-MATH"],
                "academic_year_name": "2026-2027",
                "academic_year_start": "2026-04-01",
                "academic_year_end": "2027-03-31",
                "question_bank_package_enabled": True,
                "question_bank_package_code": package.code,
                "advanced_builder_enabled": True,
                "onboarding_profile_code": "TRIAL_FULL_ACCESS",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["onboarding_run"]["id"], onboarding_run_id)
        self.assertEqual(response.data["onboarding_run"]["status"], "completed")
        run = InstituteOnboardingRun.objects.get(id=onboarding_run_id)
        self.assertEqual(run.status, "completed")
        self.assertEqual(InstituteOnboardingTaskRun.objects.filter(run=run).count(), 4)
