from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.economy.models import (
    InstituteQuestionEntitlementStatus,
    InstituteQuestionUsageActionType,
    InstituteQuestionUsageLedger,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageScope,
    QuestionBankPackageType,
)
from apps.economy.services import grant_institute_question_bank_entitlement
from apps.exams.serializers import ExamQuestionSerializer
from apps.exams.services import build_exam_publish_readiness, publish_exam, sync_total_marks_from_questions
from apps.question_bank.models import Question, QuestionOption
from apps.question_bank.services import link_master_question_to_institute, sync_master_question_from_institute_question
from common.tests.builders import AcademicAssessmentBuilder


class SharedLibraryExamAuthoringContractTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()

    def _build_linked_shared_question(self):
        public_institute = self.builder.create_institute(
            code="PUBENT1",
            name="Entitlement Public Hub",
            metadata={"is_public_content_hub": True},
        )
        public_program = self.builder.create_program(
            public_institute,
            code=self.context["program"].code,
            name=self.context["program"].name,
        )
        public_subject = self.builder.create_subject(
            public_institute,
            public_program,
            code=self.context["subject"].code,
            name=self.context["subject"].name,
        )
        public_topic = self.builder.create_topic(
            public_institute,
            public_subject,
            code=self.context["topic"].code,
            name=self.context["topic"].name,
        )
        public_teacher = self.builder.create_teacher(public_institute, employee_code="PUB-ENT-TCH")
        source_question = Question.objects.create(
            institute=public_institute,
            program=public_program,
            subject=public_subject,
            topic=public_topic,
            created_by_teacher=public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Shared entitlement-controlled question",
            explanation="Only licensed institutes should use this.",
            default_marks="2.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(question=source_question, option_text="A", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=source_question, option_text="B", option_order=2, is_correct=False)
        master_question = sync_master_question_from_institute_question(source_question)

        package = QuestionBankPackage.objects.create(
            institute=public_institute,
            name="Exam Enforcement Package",
            code="EXAM_ENFORCEMENT_PACKAGE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        QuestionBankPackageScope.objects.create(
            institute=public_institute,
            package=package,
            program=public_program,
            subject=public_subject,
            topic=public_topic,
            question_source_type="platform_only",
            question_type="mcq_single",
            difficulty_level="intermediate",
            master_visibility="shared_by_request",
        )
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
        )
        linked_access = link_master_question_to_institute(
            master_question=master_question,
            institute=self.context["institute"],
            approved_by=None,
            requested_by_teacher=self.context["teacher"],
            local_program=self.context["program"],
            local_subject=self.context["subject"],
            local_topic=self.context["topic"],
        )
        return linked_access.linked_question, entitlement

    def test_question_serializer_rejects_shared_library_question_when_entitlement_is_inactive(self):
        linked_question, entitlement = self._build_linked_shared_question()
        entitlement.status = InstituteQuestionEntitlementStatus.PAUSED
        entitlement.save(update_fields=["status", "updated_at"])

        serializer = ExamQuestionSerializer(
            data={
                "exam": str(self.context["exam"].id),
                "question": str(linked_question.id),
                "question_order": 99,
                "marks": "2.00",
                "negative_marks": "0.25",
                "is_mandatory": True,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("question", serializer.errors)
        self.assertIn("no longer covered", str(serializer.errors["question"][0]).lower())

    def test_question_serializer_rejects_updates_for_attached_shared_library_question_when_entitlement_is_inactive(self):
        linked_question, entitlement = self._build_linked_shared_question()
        self.context["exam"].exam_questions.all().delete()
        exam_question = self.builder.create_exam_question(
            self.context["exam"],
            linked_question,
            question_order=1,
        )
        entitlement.status = InstituteQuestionEntitlementStatus.PAUSED
        entitlement.save(update_fields=["status", "updated_at"])

        serializer = ExamQuestionSerializer(
            exam_question,
            data={
                "marks": "4.00",
                "negative_marks": "0.50",
                "is_mandatory": False,
            },
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("question", serializer.errors)
        self.assertIn("no longer covered", str(serializer.errors["question"][0]).lower())

    def test_publish_readiness_blocks_linked_shared_library_question_without_active_entitlement(self):
        linked_question, entitlement = self._build_linked_shared_question()
        self.context["exam"].exam_questions.all().delete()
        self.builder.create_exam_question(
            self.context["exam"],
            linked_question,
            question_order=1,
        )
        self.context["exam"].start_at = timezone.now()
        self.context["exam"].end_at = self.context["exam"].start_at + timedelta(minutes=60)
        self.context["exam"].save(update_fields=["start_at", "end_at", "updated_at"])
        sync_total_marks_from_questions(self.context["exam"])

        entitlement.status = InstituteQuestionEntitlementStatus.PAUSED
        entitlement.save(update_fields=["status", "updated_at"])

        readiness = build_exam_publish_readiness(self.context["exam"])

        self.assertFalse(readiness["ready"])
        blocker_codes = {item["code"] for item in readiness["blockers"]}
        self.assertIn("inactive_shared_library_entitlement", blocker_codes)

    def test_publish_exam_records_question_bank_usage_for_linked_shared_library_questions(self):
        linked_question, entitlement = self._build_linked_shared_question()
        self.context["exam"].exam_questions.all().delete()
        self.builder.create_exam_question(
            self.context["exam"],
            linked_question,
            question_order=1,
        )
        self.context["exam"].status = "draft"
        self.context["exam"].start_at = timezone.now() + timedelta(hours=1)
        self.context["exam"].end_at = self.context["exam"].start_at + timedelta(minutes=60)
        self.context["exam"].save(update_fields=["status", "start_at", "end_at", "updated_at"])
        sync_total_marks_from_questions(self.context["exam"])

        publish_exam(self.context["exam"], changed_by=None)

        usage_entry = InstituteQuestionUsageLedger.objects.get(
            institute=self.context["institute"],
            question_bank_package=entitlement.question_bank_package,
            entitlement=entitlement,
            action_type=InstituteQuestionUsageActionType.EXAM_PUBLISHED,
            exam=self.context["exam"],
        )
        self.assertEqual(usage_entry.quantity, 1)
        self.assertEqual(usage_entry.metadata["linked_question_count"], 1)
        self.assertEqual(usage_entry.metadata["operation"], "publish_exam")

    def test_publish_readiness_blocks_when_shared_library_publish_limit_is_exhausted(self):
        linked_question, entitlement = self._build_linked_shared_question()
        entitlement.question_bank_package.metadata = {
            **(entitlement.question_bank_package.metadata or {}),
            "max_exam_publish_count": 1,
        }
        entitlement.question_bank_package.save(update_fields=["metadata", "updated_at"])

        other_exam = self.builder.create_exam(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            subject=self.context["subject"],
            title="Earlier Published Shared Exam",
            code="EARLIER-SHARED-01",
            exam_type="test",
            status="draft",
        )
        self.builder.create_exam_question(other_exam, linked_question, question_order=1)
        other_exam.start_at = timezone.now() + timedelta(hours=2)
        other_exam.end_at = other_exam.start_at + timedelta(minutes=60)
        other_exam.save(update_fields=["start_at", "end_at", "updated_at"])
        sync_total_marks_from_questions(other_exam)
        publish_exam(other_exam, changed_by=None)

        self.context["exam"].exam_questions.all().delete()
        self.builder.create_exam_question(self.context["exam"], linked_question, question_order=1)
        self.context["exam"].status = "draft"
        self.context["exam"].start_at = timezone.now() + timedelta(hours=3)
        self.context["exam"].end_at = self.context["exam"].start_at + timedelta(minutes=60)
        self.context["exam"].save(update_fields=["status", "start_at", "end_at", "updated_at"])
        sync_total_marks_from_questions(self.context["exam"])

        readiness = build_exam_publish_readiness(self.context["exam"])

        self.assertFalse(readiness["ready"])
        blocker_codes = {item["code"] for item in readiness["blockers"]}
        self.assertIn("shared_library_publish_limit_reached", blocker_codes)

    def test_publish_readiness_warns_when_shared_library_publish_limit_is_near(self):
        linked_question, entitlement = self._build_linked_shared_question()
        entitlement.question_bank_package.metadata = {
            **(entitlement.question_bank_package.metadata or {}),
            "max_exam_publish_count": 2,
        }
        entitlement.question_bank_package.save(update_fields=["metadata", "updated_at"])

        other_exam = self.builder.create_exam(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            subject=self.context["subject"],
            title="Near Limit Shared Exam",
            code="NEAR-LIMIT-SHARED-01",
            exam_type="test",
            status="draft",
        )
        self.builder.create_exam_question(other_exam, linked_question, question_order=1)
        other_exam.start_at = timezone.now() + timedelta(hours=2)
        other_exam.end_at = other_exam.start_at + timedelta(minutes=60)
        other_exam.save(update_fields=["start_at", "end_at", "updated_at"])
        sync_total_marks_from_questions(other_exam)
        publish_exam(other_exam, changed_by=None)

        self.context["exam"].exam_questions.all().delete()
        self.builder.create_exam_question(self.context["exam"], linked_question, question_order=1)
        self.context["exam"].status = "draft"
        self.context["exam"].start_at = timezone.now() + timedelta(hours=3)
        self.context["exam"].end_at = self.context["exam"].start_at + timedelta(minutes=60)
        self.context["exam"].save(update_fields=["status", "start_at", "end_at", "updated_at"])
        sync_total_marks_from_questions(self.context["exam"])

        readiness = build_exam_publish_readiness(self.context["exam"])

        self.assertTrue(readiness["ready"])
        warning_codes = {item["code"] for item in readiness["warnings"]}
        self.assertIn("shared_library_publish_limit_near", warning_codes)
