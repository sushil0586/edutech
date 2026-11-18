from django.test import RequestFactory, TestCase
from django.test.utils import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AccountRole
from apps.reports.models import AuditLog
from apps.reports.services import create_activation_audit_log
from common.tests.builders import AcademicAssessmentBuilder


@override_settings(APP_VERSION="2.5.0", APP_BUILD="pilot-build")
class ActivationMeasurementTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.institute = self.context["institute"]
        self.admin_user, _ = self.builder.create_institute_admin_account(self.institute)
        self.student_user, _ = self.builder.create_student_account(
            institute=self.institute,
            student_profile=self.context["student"],
            username="activation-student",
        )
        self.client = APIClient()

    def test_event_metadata_is_enriched_and_sensitive_values_are_discarded(self):
        request = RequestFactory().post(
            "/", HTTP_X_CLIENT_PLATFORM="android", HTTP_X_CLIENT_VERSION="4.2.1"
        )
        event = create_activation_audit_log(
            action="attempt_save_failed",
            entity_type="attempt",
            entity_id="attempt-1",
            user=self.student_user,
            institute=self.institute,
            metadata={
                "exam_id": "exam-1",
                "error_category": "conflict",
                "answer_text": "must never be retained",
                "password": "must never be retained",
            },
            request=request,
        )
        self.assertEqual(event.metadata["role"], AccountRole.STUDENT)
        self.assertEqual(event.metadata["platform"], "android")
        self.assertEqual(event.metadata["release_version"], "4.2.1")
        self.assertEqual(event.metadata["release_build"], "pilot-build")
        self.assertNotIn("answer_text", event.metadata)
        self.assertNotIn("password", event.metadata)

    def test_admin_summary_is_tenant_scoped_and_reports_rates(self):
        other_institute = self.builder.create_institute(name="Other", code="OTHER01")
        for action in ("public_registration", "onboarding_profile_complete", "attempt_start", "attempt_submit"):
            create_activation_audit_log(
                action=action,
                entity_type="user" if "registration" in action or "profile" in action else "attempt",
                entity_id=action,
                user=self.student_user,
                institute=self.institute,
            )
        create_activation_audit_log(
            action="support_request_created",
            entity_type="support_request",
            entity_id="other",
            user=self.student_user,
            institute=other_institute,
        )

        self.client.force_authenticate(self.admin_user)
        response = self.client.get("/api/v1/reports/activation-summary/?days=7")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["counts"]["public_registration"], 1)
        self.assertEqual(response.data["counts"]["support_request_created"], 0)
        self.assertEqual(response.data["rates"]["profile_completion_from_signup"], 100.0)
        self.assertEqual(response.data["rates"]["exam_submission_from_start"], 100.0)

    def test_non_admin_cannot_read_summary(self):
        self.client.force_authenticate(self.student_user)
        response = self.client.get("/api/v1/reports/activation-summary/")
        self.assertEqual(response.status_code, 403)

    def test_only_known_activation_actions_are_accepted(self):
        with self.assertRaises(ValueError):
            create_activation_audit_log(
                action="arbitrary_event",
                entity_type="user",
                entity_id=self.student_user.id,
                user=self.student_user,
            )
