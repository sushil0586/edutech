from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from apps.exams.models import ExamAccessMode, ExamAccessSlot, ExamStudentAssignment
from apps.exams.serializers import ExamListSerializer, ExamReadSerializer, ExamWriteSerializer
from apps.exams.services import (
    RUNTIME_BLOCK_REASON_CONCURRENT_ACTIVE_CAP_REACHED,
    RUNTIME_BLOCK_REASON_DAILY_START_CAP_REACHED,
    RUNTIME_BLOCK_REASON_HOURLY_START_CAP_REACHED,
    RUNTIME_BLOCK_REASON_MISSING_SLOT,
    resolve_exam_access_runtime,
)
from apps.institutes.models import InstituteManagementMode
from apps.attempts.models import StudentExamAttempt
from common.tests.builders import AcademicAssessmentBuilder


class ExamAccessModeContractTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.request_factory = APIRequestFactory()
        self.user, self.account_profile = self.builder.create_institute_admin_account(
            self.context["institute"],
            username="access-mode-admin",
        )
        self.user.account_profile = self.account_profile

    def test_exam_read_serializer_resolves_legacy_access_mode_when_value_is_null(self):
        exam = self.context["exam"]
        exam.access_mode = None
        exam.save(update_fields=["access_mode", "updated_at"])

        serializer = ExamReadSerializer(instance=exam)

        self.assertEqual(serializer.data["access_mode"], ExamAccessMode.GLOBAL_WINDOW_LEGACY)

    def test_exam_list_serializer_resolves_legacy_access_mode_when_value_is_null(self):
        exam = self.context["exam"]
        exam.access_mode = None
        exam.save(update_fields=["access_mode", "updated_at"])

        serializer = ExamListSerializer(instance=exam)

        self.assertEqual(serializer.data["access_mode"], ExamAccessMode.GLOBAL_WINDOW_LEGACY)

    def test_exam_write_serializer_defaults_access_mode_for_new_exam(self):
        now = timezone.now()
        request = self.request_factory.post("/api/v1/exams/")
        request.user = self.user
        serializer = ExamWriteSerializer(
            context={"request": request},
            data={
                "institute": str(self.context["institute"].id),
                "academic_year": str(self.context["academic_year"].id),
                "program": str(self.context["program"].id),
                "cohort": str(self.context["cohort"].id),
                "subject": str(self.context["subject"].id),
                "title": "Access mode contract exam",
                "code": "ACCESS-MODE-01",
                "description": "",
                "exam_type": self.context["exam"].exam_type,
                "delivery_mode": self.context["exam"].delivery_mode,
                "duration_minutes": 60,
                "total_marks": "100.00",
                "passing_marks": "40.00",
                "start_at": now.isoformat(),
                "end_at": (now + timedelta(hours=2)).isoformat(),
                "max_attempts": 1,
                "timer_mode": self.context["exam"].timer_mode,
                "navigation_mode": self.context["exam"].navigation_mode,
                "attempt_policy": self.context["exam"].attempt_policy,
                "result_publish_mode": self.context["exam"].result_publish_mode,
                "review_mode": self.context["exam"].review_mode,
                "security_mode": self.context["exam"].security_mode,
                "source_type": self.context["exam"].source_type,
                "assignment_mode": self.context["exam"].assignment_mode,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["access_mode"],
            ExamAccessMode.GLOBAL_WINDOW_LEGACY,
        )

    def test_exam_write_serializer_persists_runtime_threshold_fields_into_metadata(self):
        exam = self.context["exam"]
        request = self.request_factory.patch(f"/api/v1/exams/{exam.id}/")
        request.user = self.user
        serializer = ExamWriteSerializer(
            instance=exam,
            context={"request": request},
            data={
                "daily_start_cap": 25,
                "hourly_start_cap": 10,
                "concurrent_active_attempt_cap": 5,
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_exam = serializer.save()

        runtime_thresholds = updated_exam.metadata["runtime_thresholds"]
        self.assertEqual(runtime_thresholds["daily_start_cap"], 25)
        self.assertEqual(runtime_thresholds["hourly_start_cap"], 10)
        self.assertEqual(runtime_thresholds["concurrent_active_attempt_cap"], 5)

    def test_exam_read_serializer_exposes_runtime_threshold_fields(self):
        exam = self.context["exam"]
        exam.metadata = {
            **(exam.metadata if isinstance(exam.metadata, dict) else {}),
            "runtime_thresholds": {
                "daily_start_cap": 40,
                "hourly_start_cap": 12,
                "concurrent_active_attempt_cap": 8,
            },
        }
        exam.save(update_fields=["metadata", "updated_at"])

        serializer = ExamReadSerializer(instance=exam)

        self.assertEqual(serializer.data["daily_start_cap"], 40)
        self.assertEqual(serializer.data["hourly_start_cap"], 12)
        self.assertEqual(serializer.data["concurrent_active_attempt_cap"], 8)


class ExamAccessRuntimeContractTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.exam = self.context["exam"]
        self.student = self.context["student"]

    def test_runtime_defaults_to_private_management_and_legacy_access(self):
        self.exam.status = "scheduled"
        self.exam.save(update_fields=["status", "updated_at"])
        decision = resolve_exam_access_runtime(self.student, self.exam, now=timezone.now())

        self.assertTrue(decision["is_allowed"])
        self.assertEqual(
            decision["management_mode"],
            InstituteManagementMode.PRIVATE_INSTITUTE_MANAGED,
        )
        self.assertEqual(decision["access_mode"], ExamAccessMode.GLOBAL_WINDOW_LEGACY)
        self.assertEqual(decision["access_window"]["hard_end"], self.exam.end_at)

    def test_runtime_uses_public_management_with_long_window_attempt_mode(self):
        self.context["institute"].management_mode = InstituteManagementMode.PUBLIC_INSTITUTE_MANAGED
        self.context["institute"].save(update_fields=["management_mode", "updated_at"])
        self.exam.access_mode = ExamAccessMode.LONG_WINDOW_ATTEMPT_MANAGED
        self.exam.status = "scheduled"
        self.exam.save(update_fields=["access_mode", "status", "updated_at"])

        decision = resolve_exam_access_runtime(self.student, self.exam, now=timezone.now())

        self.assertTrue(decision["is_allowed"])
        self.assertEqual(
            decision["management_mode"],
            InstituteManagementMode.PUBLIC_INSTITUTE_MANAGED,
        )
        self.assertEqual(
            decision["access_mode"],
            ExamAccessMode.LONG_WINDOW_ATTEMPT_MANAGED,
        )
        self.assertIsNone(decision["access_window"]["hard_end"])

    def test_runtime_blocks_slot_managed_exam_without_resolved_slot(self):
        self.exam.access_mode = ExamAccessMode.SLOT_MANAGED
        self.exam.assignment_mode = "selected_students"
        self.exam.status = "scheduled"
        self.exam.save(update_fields=["access_mode", "assignment_mode", "status", "updated_at"])
        ExamStudentAssignment.objects.create(
            exam=self.exam,
            student=self.student,
            assigned_by=self.context["teacher"],
        )

        decision = resolve_exam_access_runtime(self.student, self.exam, now=timezone.now())

        self.assertFalse(decision["is_allowed"])
        self.assertEqual(decision["block_reason_code"], RUNTIME_BLOCK_REASON_MISSING_SLOT)

    def test_runtime_infers_slot_window_for_selected_student_assignment_with_slot_under_legacy_mode(self):
        self.exam.access_mode = None
        self.exam.assignment_mode = "selected_students"
        self.exam.status = "scheduled"
        self.exam.start_at = timezone.now() - timedelta(days=1)
        self.exam.end_at = timezone.now() - timedelta(hours=1)
        self.exam.save(
            update_fields=["access_mode", "assignment_mode", "status", "start_at", "end_at", "updated_at"]
        )
        slot = ExamAccessSlot.objects.create(
            exam=self.exam,
            slot_label="Legacy Resolved Slot",
            slot_start_at=timezone.now() - timedelta(minutes=10),
            slot_end_at=timezone.now() + timedelta(minutes=30),
            grace_period_minutes=15,
        )
        ExamStudentAssignment.objects.create(
            exam=self.exam,
            student=self.student,
            assigned_by=self.context["teacher"],
            access_slot=slot,
        )

        decision = resolve_exam_access_runtime(self.student, self.exam, now=timezone.now())

        self.assertTrue(decision["is_allowed"])
        self.assertEqual(decision["access_window"]["mode"], ExamAccessMode.SLOT_MANAGED)
        self.assertEqual(decision["access_window"]["slot_id"], str(slot.id))

    def test_runtime_reports_capacity_block_when_slot_is_full(self):
        self.exam.access_mode = ExamAccessMode.SLOT_MANAGED
        self.exam.assignment_mode = "selected_students"
        self.exam.status = "scheduled"
        self.exam.save(update_fields=["access_mode", "assignment_mode", "status", "updated_at"])
        slot = ExamAccessSlot.objects.create(
            exam=self.exam,
            slot_label="Runtime Full Slot",
            slot_start_at=timezone.now() - timedelta(minutes=10),
            slot_end_at=timezone.now() + timedelta(minutes=20),
            start_capacity=1,
        )
        ExamStudentAssignment.objects.create(
            exam=self.exam,
            student=self.student,
            assigned_by=self.context["teacher"],
            access_slot=slot,
        )
        StudentExamAttempt.objects.create(
            institute=self.context["institute"],
            exam=self.exam,
            access_slot=slot,
            student=self.student,
            attempt_no=1,
            status="in_progress",
            started_at=timezone.now() - timedelta(minutes=1),
            expires_at=timezone.now() + timedelta(minutes=29),
            total_questions=1,
            metadata={},
        )

        decision = resolve_exam_access_runtime(self.student, self.exam, now=timezone.now())

        self.assertFalse(decision["is_allowed"])
        self.assertEqual(decision["block_reason_code"], "slot_capacity_reached")
        self.assertTrue(decision["capacity_state"]["capacity_blocked"])

    def test_runtime_blocks_when_daily_start_cap_is_reached(self):
        self.context["institute"].management_mode = InstituteManagementMode.PUBLIC_INSTITUTE_MANAGED
        self.context["institute"].save(update_fields=["management_mode", "updated_at"])
        self.exam.access_mode = ExamAccessMode.LONG_WINDOW_ATTEMPT_MANAGED
        self.exam.status = "scheduled"
        self.exam.metadata = {
            **(self.exam.metadata if isinstance(self.exam.metadata, dict) else {}),
            "runtime_thresholds": {"daily_start_cap": 1},
        }
        self.exam.save(update_fields=["access_mode", "status", "metadata", "updated_at"])
        StudentExamAttempt.objects.create(
            institute=self.context["institute"],
            exam=self.exam,
            student=self.student,
            attempt_no=1,
            status="submitted",
            started_at=timezone.now() - timedelta(minutes=30),
            submitted_at=timezone.now() - timedelta(minutes=5),
            expires_at=timezone.now() - timedelta(minutes=1),
            total_questions=1,
            metadata={},
        )

        decision = resolve_exam_access_runtime(self.student, self.exam, now=timezone.now())

        self.assertFalse(decision["is_allowed"])
        self.assertEqual(decision["block_reason_code"], RUNTIME_BLOCK_REASON_DAILY_START_CAP_REACHED)
        self.assertTrue(decision["threshold_state"]["blocked"])

    def test_runtime_blocks_when_hourly_start_cap_is_reached(self):
        self.context["institute"].management_mode = InstituteManagementMode.PUBLIC_INSTITUTE_MANAGED
        self.context["institute"].save(update_fields=["management_mode", "updated_at"])
        self.exam.access_mode = ExamAccessMode.LONG_WINDOW_ATTEMPT_MANAGED
        self.exam.status = "scheduled"
        self.exam.metadata = {
            **(self.exam.metadata if isinstance(self.exam.metadata, dict) else {}),
            "runtime_thresholds": {"daily_start_cap": 10, "hourly_start_cap": 1},
        }
        self.exam.save(update_fields=["access_mode", "status", "metadata", "updated_at"])
        StudentExamAttempt.objects.create(
            institute=self.context["institute"],
            exam=self.exam,
            student=self.student,
            attempt_no=1,
            status="submitted",
            started_at=timezone.now() - timedelta(minutes=20),
            submitted_at=timezone.now() - timedelta(minutes=5),
            expires_at=timezone.now() - timedelta(minutes=1),
            total_questions=1,
            metadata={},
        )

        decision = resolve_exam_access_runtime(self.student, self.exam, now=timezone.now())

        self.assertFalse(decision["is_allowed"])
        self.assertEqual(decision["block_reason_code"], RUNTIME_BLOCK_REASON_HOURLY_START_CAP_REACHED)
        self.assertTrue(decision["threshold_state"]["blocked"])

    def test_runtime_blocks_when_concurrent_active_attempt_cap_is_reached(self):
        self.context["institute"].management_mode = InstituteManagementMode.PLATFORM_MANAGED
        self.context["institute"].save(update_fields=["management_mode", "updated_at"])
        self.exam.access_mode = ExamAccessMode.PLATFORM_EVENT_MANAGED
        self.exam.status = "scheduled"
        self.exam.metadata = {
            **(self.exam.metadata if isinstance(self.exam.metadata, dict) else {}),
            "runtime_thresholds": {
                "daily_start_cap": 10,
                "hourly_start_cap": 10,
                "concurrent_active_attempt_cap": 1,
            },
        }
        self.exam.save(update_fields=["access_mode", "status", "metadata", "updated_at"])
        StudentExamAttempt.objects.create(
            institute=self.context["institute"],
            exam=self.exam,
            student=self.student,
            attempt_no=1,
            status="in_progress",
            started_at=timezone.now() - timedelta(minutes=10),
            expires_at=timezone.now() + timedelta(minutes=30),
            total_questions=1,
            metadata={},
        )

        decision = resolve_exam_access_runtime(self.student, self.exam, now=timezone.now())

        self.assertFalse(decision["is_allowed"])
        self.assertEqual(
            decision["block_reason_code"],
            RUNTIME_BLOCK_REASON_CONCURRENT_ACTIVE_CAP_REACHED,
        )
        self.assertTrue(decision["threshold_state"]["blocked"])
