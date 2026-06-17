from django.test import TestCase
from rest_framework.test import APIClient

from common.tests.builders import AcademicAssessmentBuilder


class AcademicLookupListRegressionTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="teacher-academics-list",
            password="Teacher@123",
            email="teacher-academics-list@example.com",
        )
        self.institute_admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="institute-academics-list",
            password="Institute@123",
            email="institute-academics-list@example.com",
        )

    def _assert_list_ok(self, user, path, expected_id):
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(path)

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 1)
        self.assertTrue(response.data["results"])
        self.assertEqual(response.data["results"][0]["id"], str(expected_id))

    def test_program_list_loads_for_teacher_scope(self):
        self._assert_list_ok(
            self.teacher_user,
            "/api/v1/academics/programs/?page_size=20",
            self.context["program"].id,
        )

    def test_program_list_loads_for_institute_admin_scope(self):
        self._assert_list_ok(
            self.institute_admin_user,
            "/api/v1/academics/programs/?page_size=20",
            self.context["program"].id,
        )

    def test_subject_list_loads_for_teacher_scope(self):
        self._assert_list_ok(
            self.teacher_user,
            f"/api/v1/academics/subjects/?program={self.context['program'].id}&page_size=20",
            self.context["subject"].id,
        )

    def test_subject_list_loads_for_institute_admin_scope(self):
        self._assert_list_ok(
            self.institute_admin_user,
            f"/api/v1/academics/subjects/?program={self.context['program'].id}&page_size=20",
            self.context["subject"].id,
        )

    def test_topic_list_loads_for_teacher_scope(self):
        self._assert_list_ok(
            self.teacher_user,
            f"/api/v1/academics/topics/?subject={self.context['subject'].id}&page_size=20",
            self.context["topic"].id,
        )

    def test_topic_list_loads_for_institute_admin_scope(self):
        self._assert_list_ok(
            self.institute_admin_user,
            f"/api/v1/academics/topics/?subject={self.context['subject'].id}&page_size=20",
            self.context["topic"].id,
        )
