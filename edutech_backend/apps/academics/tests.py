from datetime import timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from apps.teachers.models import TeacherAssignment
from common.tests.builders import AcademicAssessmentBuilder


class AcademicLookupListRegressionTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        TeacherAssignment.objects.create(
            institute=self.context["institute"],
            teacher=self.context["teacher"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            subject=self.context["subject"],
            is_primary=True,
        )
        self.other_academic_year = self.builder.create_academic_year(
            self.context["institute"],
            name="2027-2028",
            start_date=self.context["academic_year"].end_date + timedelta(days=1),
            end_date=self.context["academic_year"].end_date + timedelta(days=365),
            is_current=False,
        )
        self.other_program = self.builder.create_program(
            self.context["institute"],
            name="Class 9 Foundation",
            code="CLS9F",
            sort_order=2,
        )
        self.other_cohort = self.builder.create_cohort(
            self.context["institute"],
            self.context["program"],
            self.context["academic_year"],
            name="Class 10-B",
            code="CLS10B",
        )
        self.other_subject = self.builder.create_subject(
            self.context["institute"],
            self.context["program"],
            name="Science",
            code="SCI10",
            sort_order=2,
        )
        self.other_topic = self.builder.create_topic(
            self.context["institute"],
            self.other_subject,
            name="Physics",
            code="PHY-01",
            sort_order=1,
        )
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
        return response

    def test_program_list_loads_for_teacher_scope(self):
        response = self._assert_list_ok(
            self.teacher_user,
            "/api/v1/academics/programs/?page_size=20",
            self.context["program"].id,
        )
        returned_ids = {entry["id"] for entry in response.data["results"]}
        self.assertEqual(returned_ids, {str(self.context["program"].id)})

    def test_program_list_loads_for_institute_admin_scope(self):
        response = self._assert_list_ok(
            self.institute_admin_user,
            "/api/v1/academics/programs/?page_size=20",
            self.context["program"].id,
        )
        returned_ids = {entry["id"] for entry in response.data["results"]}
        self.assertIn(str(self.context["program"].id), returned_ids)
        self.assertIn(str(self.other_program.id), returned_ids)

    def test_academic_year_list_only_returns_teacher_assignment_scope(self):
        response = self._assert_list_ok(
            self.teacher_user,
            "/api/v1/academics/academic-years/?page_size=20",
            self.context["academic_year"].id,
        )
        returned_ids = {entry["id"] for entry in response.data["results"]}
        self.assertEqual(returned_ids, {str(self.context["academic_year"].id)})

    def test_cohort_list_only_returns_teacher_assignment_scope(self):
        response = self._assert_list_ok(
            self.teacher_user,
            f"/api/v1/academics/cohorts/?program={self.context['program'].id}&academic_year={self.context['academic_year'].id}&page_size=20",
            self.context["cohort"].id,
        )
        returned_ids = {entry["id"] for entry in response.data["results"]}
        self.assertEqual(returned_ids, {str(self.context["cohort"].id)})

    def test_subject_list_loads_for_teacher_scope(self):
        response = self._assert_list_ok(
            self.teacher_user,
            f"/api/v1/academics/subjects/?program={self.context['program'].id}&page_size=20",
            self.context["subject"].id,
        )
        returned_ids = {entry["id"] for entry in response.data["results"]}
        self.assertEqual(returned_ids, {str(self.context["subject"].id)})

    def test_subject_list_loads_for_institute_admin_scope(self):
        response = self._assert_list_ok(
            self.institute_admin_user,
            f"/api/v1/academics/subjects/?program={self.context['program'].id}&page_size=20",
            self.context["subject"].id,
        )
        returned_ids = {entry["id"] for entry in response.data["results"]}
        self.assertIn(str(self.context["subject"].id), returned_ids)
        self.assertIn(str(self.other_subject.id), returned_ids)

    def test_topic_list_loads_for_teacher_scope(self):
        response = self._assert_list_ok(
            self.teacher_user,
            f"/api/v1/academics/topics/?subject={self.context['subject'].id}&page_size=20",
            self.context["topic"].id,
        )
        returned_ids = {entry["id"] for entry in response.data["results"]}
        self.assertEqual(returned_ids, {str(self.context["topic"].id)})

    def test_topic_list_loads_for_institute_admin_scope(self):
        self._assert_list_ok(
            self.institute_admin_user,
            f"/api/v1/academics/topics/?subject={self.context['subject'].id}&page_size=20",
            self.context["topic"].id,
        )
