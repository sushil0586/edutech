from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.exams.services import sync_total_marks_from_questions
from apps.reports.models import AuditLog
from common.tests.builders import AcademicAssessmentBuilder


class AuditAndHealthTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.student_user, _ = self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=self.context["student"],
            username="audit-student",
            password="Student@123",
        )
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="audit-teacher",
            password="Teacher@123",
        )
        self.client = APIClient()
        self.exam = sync_total_marks_from_questions(self.context["exam"])
        self.exam.passing_marks = self.exam.total_marks
        self.exam.save(update_fields=["passing_marks", "updated_at"])

    def test_health_endpoint_returns_database_status(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["database"], "ok")
        self.assertIn("version", response.data)
        self.assertIn("build", response.data)

    def test_login_creates_audit_log(self):
        cache.clear()
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "audit-student", "password": "Student@123"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.student_user,
                action="login",
                entity_type="user",
            ).exists()
        )

    def test_exam_publish_endpoint_creates_audit_log(self):
        self.client.force_authenticate(self.teacher_user)
        response = self.client.post(
            f"/api/v1/exams/{self.exam.id}/publish/",
            {"changed_by": str(self.context["teacher"].id), "remarks": "Audit test publish"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.teacher_user,
                action="exam_publish",
                entity_type="exam",
                entity_id=str(self.exam.id),
            ).exists()
        )
