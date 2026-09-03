from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.exams.models import ExamAccessSlot, ExamSourceType, ExamStudentAssignment
from apps.reports.models import AuditLog
from common.tests.builders import AcademicAssessmentBuilder


class ExamApiContractTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.client = APIClient()
        self.admin_user, _ = self.builder.create_institute_admin_account(
            self.context["institute"],
            username="exam-api-contract-admin",
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_platform_admin_catalog_summary_and_source_filter_use_server_side_counts(self):
        platform_admin_user, _ = self.builder.create_platform_admin_account(
            username="exam-catalog-platform-admin",
            email="exam-catalog-platform-admin@example.com",
        )
        base_exam = self.context["exam"]
        base_exam.status = "live"
        base_exam.source_type = ExamSourceType.INSTITUTE
        base_exam.source_teacher = None
        base_exam.save(update_fields=["status", "source_type", "source_teacher", "updated_at"])
        platform_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="CATALOG-PLATFORM-01",
            title="Catalog Platform Exam",
            status="draft",
            source_type=ExamSourceType.PLATFORM,
        )
        teacher_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="CATALOG-TEACHER-01",
            title="Catalog Teacher Exam",
            status="scheduled",
            source_type=ExamSourceType.TEACHER,
            source_teacher=self.context["teacher"],
        )

        self.client.force_authenticate(user=platform_admin_user)

        list_response = self.client.get("/api/v1/exams/?source_type=platform&page_size=10")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data["count"], 1)
        self.assertEqual(list_response.data["results"][0]["id"], str(platform_exam.id))

        summary_response = self.client.get(
            f"/api/v1/exams/platform-catalog-summary/?institute={self.context['institute'].id}"
        )
        self.assertEqual(summary_response.status_code, 200)
        self.assertEqual(summary_response.data["total_count"], 3)
        self.assertEqual(
            summary_response.data["source_counts"],
            {
                ExamSourceType.INSTITUTE: 1,
                ExamSourceType.PLATFORM: 1,
                ExamSourceType.TEACHER: 1,
            },
        )
        self.assertEqual(
            summary_response.data["status_counts"],
            {
                "draft": 1,
                "live": 1,
                "scheduled": 1,
            },
        )
        self.assertEqual(teacher_exam.source_type, ExamSourceType.TEACHER)

    def test_patch_preserves_scheduled_summary_only_delivery_contract_on_followup_read(self):
        exam = self.context["exam"]
        now = timezone.now()
        payload = {
            "start_at": (now + timedelta(hours=1)).isoformat(),
            "end_at": (now + timedelta(hours=2)).isoformat(),
            "total_marks": "10.00",
            "passing_marks": "4.00",
            "result_publish_mode": "scheduled",
            "review_mode": "none",
            "allow_review_after_submit": False,
            "show_result_immediately": False,
        }

        patch_response = self.client.patch(f"/api/v1/exams/{exam.id}/", payload, format="json")

        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["result_publish_mode"], "scheduled")
        self.assertEqual(patch_response.data["review_mode"], "none")
        self.assertFalse(patch_response.data["allow_review_after_submit"])
        self.assertFalse(patch_response.data["show_result_immediately"])

        get_response = self.client.get(f"/api/v1/exams/{exam.id}/")

        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["result_publish_mode"], "scheduled")
        self.assertEqual(get_response.data["review_mode"], "none")
        self.assertFalse(get_response.data["allow_review_after_submit"])
        self.assertFalse(get_response.data["show_result_immediately"])

    def test_slot_endpoints_create_list_and_update_exam_slots(self):
        exam = self.context["exam"]
        now = timezone.now()
        create_payload = {
            "slot_label": "Morning Batch",
            "cohort": str(self.context["cohort"].id),
            "slot_start_at": (now + timedelta(hours=1)).isoformat(),
            "slot_end_at": (now + timedelta(hours=3)).isoformat(),
            "grace_period_minutes": 20,
            "assignment_capacity": 120,
            "start_capacity": 40,
            "status": "active",
            "metadata": {"source": "contract-test"},
            "is_active": True,
        }

        create_response = self.client.post(f"/api/v1/exams/{exam.id}/slots/", create_payload, format="json")

        self.assertEqual(create_response.status_code, 201)
        slot_id = create_response.data["data"]["id"]
        self.assertEqual(create_response.data["data"]["slot_label"], "Morning Batch")
        self.assertEqual(create_response.data["data"]["occupancy"]["assignment_count"], 0)
        self.assertTrue(
            AuditLog.objects.filter(
                action="exam_slot_create",
                entity_type="exam_access_slot",
                entity_id=str(slot_id),
            ).exists()
        )

        list_response = self.client.get(f"/api/v1/exams/{exam.id}/slots/")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data["data"]), 1)
        self.assertEqual(list_response.data["data"][0]["id"], slot_id)

        update_response = self.client.patch(
            f"/api/v1/exams/{exam.id}/slots/{slot_id}/",
            {
                "slot_label": "Morning Batch Updated",
                "start_capacity": 55,
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["data"]["slot_label"], "Morning Batch Updated")
        self.assertEqual(update_response.data["data"]["start_capacity"], 55)
        self.assertTrue(
            AuditLog.objects.filter(
                action="exam_slot_update",
                entity_type="exam_access_slot",
                entity_id=str(slot_id),
            ).exists()
        )

    def test_retrieve_includes_slot_payloads_and_student_override_fields(self):
        exam = self.context["exam"]
        exam.assignment_mode = "selected_students"
        exam.save(update_fields=["assignment_mode", "updated_at"])
        slot = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Assigned Slot",
            slot_start_at=timezone.now() + timedelta(hours=2),
            slot_end_at=timezone.now() + timedelta(hours=4),
            assignment_capacity=50,
            start_capacity=20,
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
            access_slot=slot,
            notes="Priority learner",
        )

        response = self.client.get(f"/api/v1/exams/{exam.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["access_slots"]), 1)
        self.assertEqual(response.data["access_slots"][0]["id"], str(slot.id))
        self.assertEqual(response.data["assigned_students"][0]["access_slot"], str(slot.id))
        self.assertEqual(response.data["assigned_students"][0]["access_slot_label"], "Assigned Slot")

    def test_student_slot_override_creates_or_updates_assignment_and_audit_log(self):
        exam = self.context["exam"]
        exam.assignment_mode = "selected_students"
        exam.save(update_fields=["assignment_mode", "updated_at"])
        slot = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Override Slot",
            slot_start_at=timezone.now() + timedelta(hours=1),
            slot_end_at=timezone.now() + timedelta(hours=2),
        )

        response = self.client.post(
            f"/api/v1/exams/{exam.id}/student-slot-override/",
            {
                "student": str(self.context["student"].id),
                "access_slot": str(slot.id),
                "notes": "Moved by support",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        assignment = ExamStudentAssignment.objects.get(exam=exam, student=self.context["student"])
        self.assertEqual(assignment.access_slot_id, slot.id)
        self.assertEqual(assignment.notes, "Moved by support")
        self.assertEqual(response.data["data"]["access_slot"], str(slot.id))
        self.assertTrue(
            AuditLog.objects.filter(
                action="exam_slot_override",
                entity_type="exam_student_access_override",
                entity_id=str(self.context["student"].id),
            ).exists()
        )

    def test_bulk_student_slot_assignment_updates_matching_assignments_and_records_audit_log(self):
        exam = self.context["exam"]
        exam.assignment_mode = "selected_students"
        exam.save(update_fields=["assignment_mode", "updated_at"])
        slot = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Bulk Slot",
            slot_start_at=timezone.now() + timedelta(hours=1),
            slot_end_at=timezone.now() + timedelta(hours=2),
            assignment_capacity=10,
        )
        second_student = self.builder.create_student(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            admission_no="EXAM-BULK-2",
            first_name="Bulk",
            last_name="Two",
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=second_student,
            assigned_by=self.context["teacher"],
        )

        response = self.client.post(
            f"/api/v1/exams/{exam.id}/bulk-student-slot-assign/",
            {
                "apply_to": "unassigned_selected",
                "access_slot": str(slot.id),
                "notes": "Bulk scheduled",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["updated_count"], 2)
        self.assertEqual(
            ExamStudentAssignment.objects.filter(exam=exam, access_slot=slot, is_active=True).count(),
            2,
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action="exam_slot_bulk_assign",
                entity_type="exam_student_access_bulk_override",
                entity_id=str(exam.id),
            ).exists()
        )

    def test_bulk_student_slot_assignment_blocks_when_capacity_would_be_exceeded(self):
        exam = self.context["exam"]
        exam.assignment_mode = "selected_students"
        exam.save(update_fields=["assignment_mode", "updated_at"])
        slot = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Tight Slot",
            slot_start_at=timezone.now() + timedelta(hours=1),
            slot_end_at=timezone.now() + timedelta(hours=2),
            assignment_capacity=1,
        )
        second_student = self.builder.create_student(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            admission_no="EXAM-BULK-3",
            first_name="Bulk",
            last_name="Three",
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=second_student,
            assigned_by=self.context["teacher"],
        )

        response = self.client.post(
            f"/api/v1/exams/{exam.id}/bulk-student-slot-assign/",
            {
                "apply_to": "all_selected",
                "access_slot": str(slot.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("access_slot", response.data)

    def test_slot_audit_logs_endpoint_returns_recent_slot_operations_for_exam(self):
        exam = self.context["exam"]
        exam.assignment_mode = "selected_students"
        exam.save(update_fields=["assignment_mode", "updated_at"])
        slot = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Audit Trail Slot",
            slot_start_at=timezone.now() + timedelta(hours=1),
            slot_end_at=timezone.now() + timedelta(hours=2),
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
            access_slot=slot,
        )
        self.client.post(
            f"/api/v1/exams/{exam.id}/student-slot-override/",
            {
                "student": str(self.context["student"].id),
                "access_slot": str(slot.id),
                "notes": "Audit visibility check",
            },
            format="json",
        )

        response = self.client.get(f"/api/v1/exams/{exam.id}/slot-audit-logs/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data["data"]) >= 1)
        self.assertEqual(response.data["data"][0]["action"], "exam_slot_override")
        self.assertEqual(response.data["data"][0]["metadata"]["exam_id"], str(exam.id))

    def test_auto_assign_students_to_slots_distributes_selected_students_by_available_slots(self):
        exam = self.context["exam"]
        exam.assignment_mode = "selected_students"
        exam.save(update_fields=["assignment_mode", "updated_at"])
        slot_one = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Auto Slot One",
            slot_start_at=timezone.now() + timedelta(hours=1),
            slot_end_at=timezone.now() + timedelta(hours=2),
            assignment_capacity=1,
        )
        slot_two = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Auto Slot Two",
            slot_start_at=timezone.now() + timedelta(hours=3),
            slot_end_at=timezone.now() + timedelta(hours=4),
            assignment_capacity=2,
        )
        second_student = self.builder.create_student(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            admission_no="EXAM-AUTO-2",
            first_name="Auto",
            last_name="Two",
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=second_student,
            assigned_by=self.context["teacher"],
        )

        response = self.client.post(
            f"/api/v1/exams/{exam.id}/auto-assign-students-to-slots/",
            {"apply_to": "unassigned_selected", "notes": "Auto routed"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["updated_count"], 2)
        assigned_slot_ids = set(
            ExamStudentAssignment.objects.filter(exam=exam, is_active=True).values_list("access_slot_id", flat=True)
        )
        self.assertEqual(assigned_slot_ids, {slot_one.id, slot_two.id})
        self.assertTrue(
            AuditLog.objects.filter(
                action="exam_slot_auto_assign",
                entity_type="exam_student_access_bulk_override",
                entity_id=str(exam.id),
            ).exists()
        )

    def test_preview_auto_assign_students_to_slots_returns_planned_distribution_without_writing(self):
        exam = self.context["exam"]
        exam.assignment_mode = "selected_students"
        exam.save(update_fields=["assignment_mode", "updated_at"])
        slot_one = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Preview Slot One",
            slot_start_at=timezone.now() + timedelta(hours=1),
            slot_end_at=timezone.now() + timedelta(hours=2),
            assignment_capacity=1,
        )
        slot_two = ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Preview Slot Two",
            slot_start_at=timezone.now() + timedelta(hours=3),
            slot_end_at=timezone.now() + timedelta(hours=4),
            assignment_capacity=2,
        )
        second_student = self.builder.create_student(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            admission_no="EXAM-PREVIEW-2",
            first_name="Preview",
            last_name="Two",
        )
        first_assignment = ExamStudentAssignment.objects.create(
            exam=exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
        )
        second_assignment = ExamStudentAssignment.objects.create(
            exam=exam,
            student=second_student,
            assigned_by=self.context["teacher"],
        )

        response = self.client.post(
            f"/api/v1/exams/{exam.id}/preview-auto-assign-students-to-slots/",
            {"apply_to": "unassigned_selected"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["targeted_count"], 2)
        self.assertEqual(len(response.data["data"]["assignments"]), 2)
        self.assertEqual(response.data["data"]["slot_summary"][0]["current_assigned_count"], 0)
        self.assertTrue(
            response.data["data"]["slot_summary"][0]["projected_assigned_count"] >= 0
        )
        self.assertIn(
            response.data["data"]["assignments"][0]["planned_slot_id"],
            {str(slot_one.id), str(slot_two.id)},
        )
        first_assignment.refresh_from_db()
        second_assignment.refresh_from_db()
        self.assertIsNone(first_assignment.access_slot_id)
        self.assertIsNone(second_assignment.access_slot_id)

    def test_auto_assign_students_to_slots_blocks_when_capacity_cannot_fit_target_students(self):
        exam = self.context["exam"]
        exam.assignment_mode = "selected_students"
        exam.save(update_fields=["assignment_mode", "updated_at"])
        ExamAccessSlot.objects.create(
            exam=exam,
            cohort=self.context["cohort"],
            slot_label="Full Auto Slot",
            slot_start_at=timezone.now() + timedelta(hours=1),
            slot_end_at=timezone.now() + timedelta(hours=2),
            assignment_capacity=1,
        )
        second_student = self.builder.create_student(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            admission_no="EXAM-AUTO-3",
            first_name="Auto",
            last_name="Three",
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=self.context["student"],
            assigned_by=self.context["teacher"],
        )
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=second_student,
            assigned_by=self.context["teacher"],
        )

        response = self.client.post(
            f"/api/v1/exams/{exam.id}/auto-assign-students-to-slots/",
            {"apply_to": "all_selected"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("access_slots", response.data)
        self.assertIn("unresolved_students", response.data)
