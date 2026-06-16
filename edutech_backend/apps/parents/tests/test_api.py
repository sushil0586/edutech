from django.test import TestCase
from rest_framework.test import APIClient

from apps.parents.models import ParentAlert, ParentChildRelationship, ParentProfile, ParentRelationshipStatus
from common.tests.builders import AcademicAssessmentBuilder


class ParentApiTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.client = APIClient()

        self.parent_user, self.parent_account = self.builder.create_parent_account(
            institute=self.context["institute"],
            username="parent-api-user",
            password="Parent@123",
            email="parent-api@example.com",
        )
        self.parent_profile = ParentProfile.objects.create(
            institute=self.context["institute"],
            account_profile=self.parent_account,
            first_name="Rakesh",
            last_name="Sharma",
            email="parent-api@example.com",
        )
        self.relationship = ParentChildRelationship.objects.create(
            institute=self.context["institute"],
            parent_profile=self.parent_profile,
            student=self.context["student"],
            relationship_type="father",
            is_primary_contact=True,
            can_view_progress=True,
            can_view_results=True,
            can_receive_alerts=True,
            status=ParentRelationshipStatus.ACTIVE,
        )
        self.other_student = self.builder.create_student(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            admission_no="STU099",
            first_name="Other",
            last_name="Student",
            email="other-student@example.com",
        )
        self.client.force_authenticate(user=self.parent_user)

    def test_parent_can_view_linked_children(self):
        response = self.client.get("/api/v1/parent/children/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["student_id"], str(self.context["student"].id))

    def test_parent_cannot_view_unlinked_child_detail(self):
        response = self.client.get(f"/api/v1/parent/children/{self.other_student.id}/")

        self.assertEqual(response.status_code, 403)

    def test_parent_can_view_dashboard_summary_for_linked_child(self):
        response = self.client.get(
            f"/api/v1/parent/dashboard/summary/?child_id={self.context['student'].id}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["child"]["student_id"], str(self.context["student"].id))
        self.assertIn("progress_summary", response.data)
        self.assertIn("recent_results", response.data)

    def test_parent_preferences_persist(self):
        patch_response = self.client.patch(
            "/api/v1/parent/preferences/",
            {
                "weekly_summary": True,
                "score_drops": False,
            },
            format="json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertTrue(patch_response.data["weekly_summary"])
        self.assertFalse(patch_response.data["score_drops"])

        get_response = self.client.get("/api/v1/parent/preferences/")
        self.assertEqual(get_response.status_code, 200)
        self.assertTrue(get_response.data["weekly_summary"])
        self.assertFalse(get_response.data["score_drops"])

    def test_parent_alerts_are_relationship_scoped(self):
        ParentAlert.objects.create(
            institute=self.context["institute"],
            parent_profile=self.parent_profile,
            student=self.context["student"],
            relationship=self.relationship,
            alert_type="score_drop",
            severity="warning",
            title="Score dropped in mathematics",
            message="Recent performance dipped below the prior average.",
        )
        response = self.client.get(f"/api/v1/parent/alerts/?child_id={self.context['student'].id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["alert_type"], "score_drop")

    def test_parent_can_mark_alert_as_read(self):
        alert = ParentAlert.objects.create(
            institute=self.context["institute"],
            parent_profile=self.parent_profile,
            student=self.context["student"],
            relationship=self.relationship,
            alert_type="score_drop",
            severity="warning",
            title="Score dropped in mathematics",
            message="Recent performance dipped below the prior average.",
        )

        response = self.client.patch(
            f"/api/v1/parent/alerts/{alert.id}/status/",
            {"status": "read"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "read")
        self.assertIsNotNone(response.data["read_at"])

    def test_parent_can_resolve_alert(self):
        alert = ParentAlert.objects.create(
            institute=self.context["institute"],
            parent_profile=self.parent_profile,
            student=self.context["student"],
            relationship=self.relationship,
            alert_type="exam_risk",
            severity="high",
            title="High risk exam integrity alert",
            message="An integrity alert was raised during an exam attempt.",
        )

        response = self.client.patch(
            f"/api/v1/parent/alerts/{alert.id}/status/",
            {"status": "resolved"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "resolved")
        self.assertIsNotNone(response.data["resolved_at"])
