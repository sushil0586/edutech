from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.exams.models import ExamAccessSlot, ExamStudentAssignment
from apps.exams.services import (
    build_exam_publish_readiness,
    create_exam_slot_audit_log,
    create_exam_slot_override_audit_log,
    sync_total_marks_from_questions,
)
from apps.reports.models import AuditLog
from common.tests.builders import AcademicAssessmentBuilder


class ExamSlotPublishReadinessTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.exam = self.context["exam"]
        self.exam.assignment_mode = "selected_students"
        self.exam.start_at = timezone.now()
        self.exam.end_at = self.exam.start_at + timedelta(minutes=90)
        self.exam.save(update_fields=["assignment_mode", "start_at", "end_at", "updated_at"])
        sync_total_marks_from_questions(self.exam)

    def test_publish_readiness_blocks_when_multiple_cohortless_slots_are_active(self):
        ExamAccessSlot.objects.create(
            exam=self.exam,
            slot_label="Morning",
            slot_start_at=timezone.now(),
            slot_end_at=timezone.now() + timedelta(hours=2),
        )
        ExamAccessSlot.objects.create(
            exam=self.exam,
            slot_label="Evening",
            slot_start_at=timezone.now() + timedelta(hours=3),
            slot_end_at=timezone.now() + timedelta(hours=5),
        )
        ExamStudentAssignment.objects.create(
            exam=self.exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
        )

        readiness = build_exam_publish_readiness(self.exam)

        self.assertFalse(readiness["ready"])
        blocker_codes = {item["code"] for item in readiness["blockers"]}
        self.assertIn("ambiguous_slot_configuration", blocker_codes)

    def test_publish_readiness_blocks_selected_student_exam_without_assignments_when_slots_exist(self):
        ExamAccessSlot.objects.create(
            exam=self.exam,
            slot_label="Only Slot",
            slot_start_at=timezone.now(),
            slot_end_at=timezone.now() + timedelta(hours=2),
        )

        readiness = build_exam_publish_readiness(self.exam)

        self.assertFalse(readiness["ready"])
        blocker_codes = {item["code"] for item in readiness["blockers"]}
        self.assertIn("missing_selected_student_assignments", blocker_codes)

    def test_publish_readiness_blocks_selected_student_assignment_without_resolvable_slot(self):
        self.exam.cohort = None
        self.exam.save(update_fields=["cohort", "updated_at"])
        other_cohort = self.builder.create_cohort(
            self.context["institute"],
            self.context["program"],
            self.context["academic_year"],
            name="Other Cohort",
            code="OTH-COHORT",
        )
        ExamAccessSlot.objects.create(
            exam=self.exam,
            slot_label="Other Cohort Slot",
            cohort=other_cohort,
            slot_start_at=timezone.now(),
            slot_end_at=timezone.now() + timedelta(hours=2),
        )
        ExamStudentAssignment.objects.create(
            exam=self.exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
        )

        readiness = build_exam_publish_readiness(self.exam)

        self.assertFalse(readiness["ready"])
        blocker_codes = {item["code"] for item in readiness["blockers"]}
        self.assertIn("unresolvable_slot_assignment", blocker_codes)

    def test_publish_readiness_warns_when_selected_students_rely_on_implicit_slot_routing(self):
        ExamAccessSlot.objects.create(
            exam=self.exam,
            slot_label="Default Slot",
            slot_start_at=timezone.now(),
            slot_end_at=timezone.now() + timedelta(hours=2),
        )
        ExamStudentAssignment.objects.create(
            exam=self.exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
        )

        readiness = build_exam_publish_readiness(self.exam)

        warning_codes = {item["code"] for item in readiness["warnings"]}
        self.assertIn("implicit_slot_routing_in_use", warning_codes)

    def test_publish_readiness_warns_when_slot_start_capacity_is_below_assignment_count(self):
        slot = ExamAccessSlot.objects.create(
            exam=self.exam,
            slot_label="Tight Runtime Slot",
            slot_start_at=timezone.now(),
            slot_end_at=timezone.now() + timedelta(hours=2),
            start_capacity=1,
        )
        second_student = self.builder.create_student(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            admission_no="SLOT-WARN-2",
            first_name="Slot",
            last_name="Warn",
        )
        ExamStudentAssignment.objects.create(
            exam=self.exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
            access_slot=slot,
        )
        ExamStudentAssignment.objects.create(
            exam=self.exam,
            student=second_student,
            assigned_by=self.context["teacher"],
            access_slot=slot,
        )

        readiness = build_exam_publish_readiness(self.exam)

        warning_codes = {item["code"] for item in readiness["warnings"]}
        self.assertIn("slot_start_cap_tight", warning_codes)


class ExamSlotAuditTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.slot = ExamAccessSlot.objects.create(
            exam=self.context["exam"],
            slot_label="Audit Slot",
            slot_start_at=timezone.now(),
            slot_end_at=timezone.now() + timedelta(hours=1),
        )
        self.user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="slot-audit-teacher",
            password="Teacher@123",
            email="slot-audit-teacher@example.com",
        )

    def test_create_exam_slot_audit_log_records_slot_metadata(self):
        create_exam_slot_audit_log(
            slot=self.slot,
            action="exam_slot_create",
            user=self.user,
            message="Exam slot created.",
            metadata={"source": "test"},
        )

        audit = AuditLog.objects.get(action="exam_slot_create")
        self.assertEqual(audit.entity_type, "exam_access_slot")
        self.assertEqual(audit.metadata["slot_label"], "Audit Slot")
        self.assertEqual(audit.metadata["source"], "test")

    def test_create_exam_slot_override_audit_log_records_exam_and_student(self):
        create_exam_slot_override_audit_log(
            exam=self.context["exam"],
            student=self.context["student"],
            slot=self.slot,
            action="exam_slot_override",
            user=self.user,
            message="Student moved to another slot.",
            metadata={"reason": "support"},
        )

        audit = AuditLog.objects.get(action="exam_slot_override")
        self.assertEqual(audit.entity_type, "exam_student_access_override")
        self.assertEqual(audit.metadata["student_id"], str(self.context["student"].id))
        self.assertEqual(audit.metadata["slot_id"], str(self.slot.id))
        self.assertEqual(audit.metadata["reason"], "support")
