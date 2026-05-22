from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from common.tests.builders import AcademicAssessmentBuilder


class BulkRosterImportTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.institute_admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="bulk-admin",
            password="Admin@123",
            email="bulk-admin@example.com",
        )
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="bulk-teacher",
            password="Teacher@123",
            email="bulk-teacher@example.com",
        )
        self.client = APIClient()

    @staticmethod
    def _csv_file(content, name):
        return SimpleUploadedFile(name, content.encode("utf-8"), content_type="text/csv")

    def test_admin_can_preview_and_finalize_student_import_with_login(self):
        self.client.force_authenticate(user=self.institute_admin_user)
        csv_content = (
            "admission_no,first_name,last_name,gender,academic_year,program,cohort,email,phone,guardian_name,"
            "guardian_phone,address,joined_at,is_active,create_login,username,password\n"
            f"STU909,Diya,Kapoor,female,{self.context['academic_year'].name},{self.context['program'].name},"
            f"{self.context['cohort'].name},diya@example.com,9999999999,Raj Kapoor,8888888888,Delhi,2026-05-21,"
            "true,true,diya.kapoor,Student@123\n"
        )
        preview_response = self.client.post(
            "/api/v1/students/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, "students.csv"),
            },
            format="multipart",
        )
        self.assertEqual(preview_response.status_code, 200)
        self.assertEqual(preview_response.data["valid_rows"], 1)

        finalize_response = self.client.post(
            "/api/v1/students/finalize-import/",
            {
                "institute": str(self.context["institute"].id),
                "valid_payloads": preview_response.data["valid_payloads"],
            },
            format="json",
        )
        self.assertEqual(finalize_response.status_code, 201)
        self.assertEqual(finalize_response.data["created_count"], 1)
        self.assertEqual(finalize_response.data["credentials"][0]["username"], "diya.kapoor")

        login_response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "diya.kapoor", "password": "Student@123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)

    def test_admin_can_preview_and_finalize_teacher_import_with_generated_password(self):
        self.client.force_authenticate(user=self.institute_admin_user)
        csv_content = (
            "employee_code,first_name,last_name,email,phone,qualification,specialization,bio,joined_at,is_active,"
            "create_login,username,password\n"
            "TCH909,Anita,Verma,anita@example.com,9999999999,MSc Physics,Physics,Senior teacher,2026-05-21,"
            "true,true,,\n"
        )
        preview_response = self.client.post(
            "/api/v1/teachers/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, "teachers.csv"),
            },
            format="multipart",
        )
        self.assertEqual(preview_response.status_code, 200)
        self.assertEqual(preview_response.data["valid_rows"], 1)

        finalize_response = self.client.post(
            "/api/v1/teachers/finalize-import/",
            {
                "institute": str(self.context["institute"].id),
                "valid_payloads": preview_response.data["valid_payloads"],
            },
            format="json",
        )
        self.assertEqual(finalize_response.status_code, 201)
        self.assertEqual(finalize_response.data["created_count"], 1)
        self.assertEqual(len(finalize_response.data["credentials"]), 1)
        self.assertTrue(finalize_response.data["credentials"][0]["generated_password"])

    def test_teacher_cannot_access_bulk_roster_import_endpoints(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/v1/students/import-template/")
        self.assertEqual(response.status_code, 403)
