from django.core.cache import cache
from django.test import TestCase
from django.test.utils import override_settings
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

    @override_settings(
        APP_VERSION="2.4.1",
        APP_BUILD="a" * 40,
        APP_BUILD_TIMESTAMP="2026-10-15T09:30:00Z",
        APP_ENVIRONMENT="staging",
        APP_ARTIFACT_SHA256="b" * 64,
    )
    def test_health_endpoint_returns_database_and_release_identity(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["database"], "ok")
        self.assertEqual(response.data["version"], "2.4.1")
        self.assertEqual(response.data["build"], "a" * 40)
        self.assertEqual(response.data["build_timestamp"], "2026-10-15T09:30:00Z")
        self.assertEqual(response.data["environment"], "staging")
        self.assertEqual(response.data["artifact_sha256"], "b" * 64)

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
