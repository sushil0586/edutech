from django.test import TestCase
from rest_framework.test import APIClient

from apps.students.models import StudentAccommodationProfile
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


class StudentAccommodationProfileNormalizationTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()

    def test_student_save_syncs_typed_accommodation_profile(self):
        student = self.context["student"]
        student.set_accommodation_profile(
            {
            "extra_time_minutes": 20,
            "extra_time_percentage": 15,
            "additional_violation_allowance": 1,
            "simplified_warning_copy": True,
            "alternative_instructions": "Read each prompt twice.",
            "notes": "Approved support plan.",
            "source": "manual_review",
            }
        )

        typed_profile = StudentAccommodationProfile.objects.get(student=student)
        self.assertEqual(typed_profile.extra_time_minutes, 20)
        self.assertEqual(typed_profile.extra_time_percentage, 15)
        self.assertEqual(typed_profile.additional_violation_allowance, 1)
        self.assertTrue(typed_profile.simplified_warning_copy)
        self.assertEqual(typed_profile.alternative_instructions, "Read each prompt twice.")
        self.assertEqual(typed_profile.notes, "Approved support plan.")
        self.assertEqual(typed_profile.source, "manual_review")

    def test_normalized_accommodation_profile_prefers_typed_profile(self):
        student = self.context["student"]
        student.set_accommodation_profile({
            "extra_time_minutes": 5,
            "notes": "Legacy JSON",
        })

        typed_profile = student.typed_accommodation_profile
        typed_profile.extra_time_minutes = 30
        typed_profile.notes = "Typed profile wins"
        typed_profile.source = "typed_override"
        typed_profile.save()

        snapshot = student.normalized_accommodation_profile()

        self.assertEqual(snapshot["extra_time_minutes"], 30)
        self.assertEqual(snapshot["notes"], "Typed profile wins")
        self.assertEqual(snapshot["source"], "typed_override")
