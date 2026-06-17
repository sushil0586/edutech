from django.test import TestCase
from rest_framework.test import APIClient

from common.tests.builders import AcademicAssessmentBuilder


class StudentProfileListRegressionTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="teacher-student-list",
            password="Teacher@123",
            email="teacher-student-list@example.com",
        )
        self.institute_admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="institute-student-list",
            password="Institute@123",
            email="institute-student-list@example.com",
        )

    def test_student_list_loads_for_teacher_scope(self):
        client = APIClient()
        client.force_authenticate(user=self.teacher_user)

        response = client.get(
            "/api/v1/students/",
            {
                "page_size": 20,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 1)
        self.assertTrue(response.data["results"])
        self.assertEqual(
            response.data["results"][0]["full_name"],
            self.context["student"].full_name,
        )

    def test_student_list_loads_for_institute_admin_scope(self):
        client = APIClient()
        client.force_authenticate(user=self.institute_admin_user)

        response = client.get(
            "/api/v1/students/",
            {
                "page_size": 20,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 1)
        self.assertTrue(response.data["results"])
        self.assertEqual(
            response.data["results"][0]["full_name"],
            self.context["student"].full_name,
        )
