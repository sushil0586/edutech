from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.attempts.models import StudentExamAttempt
from apps.exams.models import ExamAccessMode, ExamAccessSlot, ExamStudentAssignment
from common.tests.builders import AcademicAssessmentBuilder


class ExamRuntimeSummaryApiTests(APITestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.platform_user, _ = self.builder.create_platform_admin_account(
            username="runtime-summary-platform",
            password="Platform@123",
        )
        self.institute_admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="runtime-summary-admin",
            password="Admin@123",
        )
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="runtime-summary-teacher",
            password="Teacher@123",
        )

    def _build_runtime_pressure_fixture(self):
        exam = self.context["exam"]
        exam.status = "scheduled"
        exam.access_mode = ExamAccessMode.SLOT_MANAGED
        exam.metadata = {
            **(exam.metadata if isinstance(exam.metadata, dict) else {}),
            "runtime_thresholds": {
                "daily_start_cap": 25,
                "hourly_start_cap": 10,
            },
        }
        exam.save(update_fields=["status", "access_mode", "metadata", "updated_at"])

        slot = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Morning Slot",
            slot_start_at=timezone.now() - timedelta(minutes=15),
            slot_end_at=timezone.now() + timedelta(minutes=45),
            assignment_capacity=20,
            start_capacity=1,
            status="active",
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
            access_slot=slot,
        )
        StudentExamAttempt.objects.create(
            institute=self.context["institute"],
            exam=exam,
            access_slot=slot,
            student=self.context["student"],
            attempt_no=1,
            status="in_progress",
            started_at=timezone.now() - timedelta(minutes=3),
            expires_at=timezone.now() + timedelta(minutes=57),
            total_questions=1,
            metadata={},
        )

        second_exam = self.builder.create_exam(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            subject=self.context["subject"],
            title="Threshold Managed Exam",
            code="THRESHOLD-OPS-01",
        )
        second_exam.status = "live"
        second_exam.access_mode = ExamAccessMode.LONG_WINDOW_ATTEMPT_MANAGED
        second_exam.metadata = {
            **(second_exam.metadata if isinstance(second_exam.metadata, dict) else {}),
            "runtime_thresholds": {
                "daily_start_cap": 40,
                "hourly_start_cap": 12,
                "concurrent_active_attempt_cap": 5,
            },
        }
        second_exam.save(update_fields=["status", "access_mode", "metadata", "updated_at"])

        return exam, second_exam

    def test_platform_admin_can_view_exam_runtime_summary(self):
        exam, _ = self._build_runtime_pressure_fixture()

        self.client.force_authenticate(self.platform_user)
        response = self.client.get("/api/v1/reports/exam-runtime-summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["tracked_exams"], 2)
        self.assertEqual(response.data["summary"]["slot_managed_exams"], 1)
        self.assertEqual(response.data["summary"]["threshold_managed_exams"], 2)
        self.assertEqual(response.data["summary"]["active_slots"], 1)
        self.assertEqual(response.data["summary"]["full_slots"], 1)
        self.assertEqual(response.data["summary"]["live_attempts"], 1)
        self.assertEqual(response.data["summary"]["assigned_learners"], 1)
        self.assertTrue(len(response.data["top_pressure_exams"]) >= 1)
        top_exam = response.data["top_pressure_exams"][0]
        self.assertEqual(top_exam["code"], exam.code)
        self.assertEqual(top_exam["full_slots"], 1)
        self.assertIn("Daily 25", top_exam["configured_caps"])

    def test_institute_admin_can_view_scoped_runtime_summary(self):
        self._build_runtime_pressure_fixture()
        self.client.force_authenticate(self.institute_admin_user)

        response = self.client.get("/api/v1/reports/exam-runtime-summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["tracked_exams"], 2)

    def test_teacher_can_view_scoped_runtime_summary(self):
        self._build_runtime_pressure_fixture()
        self.client.force_authenticate(self.teacher_user)

        response = self.client.get("/api/v1/reports/exam-runtime-summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["tracked_exams"], 2)
