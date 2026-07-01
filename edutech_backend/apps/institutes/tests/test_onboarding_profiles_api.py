from django.test import TestCase
from rest_framework.test import APIClient

from apps.institutes.models import InstituteOnboardingRun, InstituteOnboardingTaskRun
from common.tests.builders import AcademicAssessmentBuilder


class InstituteOnboardingProfileApiTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.platform_admin_user, _ = self.builder.create_platform_admin_account(
            username="onboarding-profile-admin",
            email="onboarding-profile-admin@example.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.platform_admin_user)

    def test_platform_admin_can_list_onboarding_profiles(self):
        response = self.client.get("/api/v1/institutes/onboarding-profiles/")

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 3)
        codes = [item["code"] for item in response.data]
        self.assertIn("BLANK_INSTITUTE", codes)
        self.assertIn("SCHOOL_STARTER", codes)
        self.assertIn("TRIAL_FULL_ACCESS", codes)

        blank_profile = next(item for item in response.data if item["code"] == "BLANK_INSTITUTE")
        self.assertTrue(blank_profile["is_default"])
        self.assertEqual(blank_profile["config_json"]["advanced_builder_enabled"], False)

    def test_platform_admin_can_create_institute_with_onboarding_profile(self):
        response = self.client.post(
            "/api/v1/institutes/",
            {
                "name": "Trial Onboarding Institute",
                "code": "TRIAL01",
                "onboarding_profile_code": "TRIAL_FULL_ACCESS",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data["onboarding_run_id"])
        self.assertEqual(response.data["onboarding_run_status"], "pending")

        run = InstituteOnboardingRun.objects.get(id=response.data["onboarding_run_id"])
        self.assertEqual(run.institute.code, "TRIAL01")
        self.assertEqual(run.profile_code, "TRIAL_FULL_ACCESS")
        self.assertEqual(run.source, "institute_create")
        self.assertEqual(run.status, "pending")

    def test_platform_admin_can_list_institute_onboarding_runs(self):
        institute = self.builder.create_institute(code="RUN001", name="Run Institute")
        run = InstituteOnboardingRun.objects.create(
            institute=institute,
            profile_code="TRIAL_FULL_ACCESS",
            source="master_defaults",
            status="completed",
        )

        response = self.client.get(f"/api/v1/institutes/{institute.id}/onboarding-runs/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(run.id))
        self.assertEqual(response.data[0]["profile_code"], "TRIAL_FULL_ACCESS")
        self.assertEqual(response.data[0]["status"], "completed")

    def test_platform_admin_can_list_institute_onboarding_run_tasks(self):
        institute = self.builder.create_institute(code="RUN002", name="Run Institute Tasks")
        run = InstituteOnboardingRun.objects.create(
            institute=institute,
            profile_code="TRIAL_FULL_ACCESS",
            source="master_defaults",
            status="completed",
        )
        task = InstituteOnboardingTaskRun.objects.create(
            run=run,
            task_code="academic_preset_apply",
            label="Academic preset apply",
            status="completed",
            message="Applied preset class_7_cbse_core.",
            result_json={"preset_code": "class_7_cbse_core"},
        )

        response = self.client.get(f"/api/v1/institutes/{institute.id}/onboarding-runs/{run.id}/tasks/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(task.id))
        self.assertEqual(response.data[0]["task_code"], "academic_preset_apply")
        self.assertEqual(response.data[0]["status"], "completed")

    def test_platform_admin_can_get_institute_onboarding_run_detail(self):
        institute = self.builder.create_institute(code="RUN003", name="Run Institute Detail")
        run = InstituteOnboardingRun.objects.create(
            institute=institute,
            profile_code="TRIAL_FULL_ACCESS",
            source="master_defaults",
            status="failed",
            requested_config_json={"preset_code": "class_7_cbse_core", "mode": "selected_subjects"},
            resolved_config_json={"onboarding_profile_code": "TRIAL_FULL_ACCESS"},
            error_summary="Preset apply failed.",
        )

        response = self.client.get(f"/api/v1/institutes/{institute.id}/onboarding-runs/{run.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["id"]), str(run.id))
        self.assertEqual(response.data["profile_code"], "TRIAL_FULL_ACCESS")
        self.assertEqual(response.data["status"], "failed")
        self.assertEqual(response.data["requested_config_json"]["preset_code"], "class_7_cbse_core")
