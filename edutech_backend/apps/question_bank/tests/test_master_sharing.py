from django.contrib.auth import get_user_model
from django.test import TestCase

from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.core.exceptions import ValidationError

from apps.question_bank.models import (
    InstituteQuestionAccess,
    InstituteQuestionAccessStatus,
    MasterQuestion,
    Question,
    QuestionOption,
)
from apps.economy.models import (
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageScope,
    QuestionBankPackageType,
)
from apps.economy.services import grant_institute_question_bank_entitlement
from apps.question_bank.services import (
    link_master_question_to_institute,
    materialize_master_question_for_source_institute,
    request_master_question_access,
    sync_master_question_from_institute_question,
)
from common.tests.builders import AcademicAssessmentBuilder


User = get_user_model()


class MasterQuestionSharingTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.public_institute = self.builder.create_institute(
            code="PUB001",
            name="Nexora Public Institute",
            metadata={"is_public_content_hub": True},
        )
        self.private_institute = self.builder.create_institute(
            code="SCH001",
            name="Springfield School",
            email="springfield@example.com",
        )

        self.public_year = self.builder.create_academic_year(self.public_institute)
        self.public_program = self.builder.create_program(self.public_institute, code="CLS7", name="Class 7")
        self.public_subject = self.builder.create_subject(
            self.public_institute,
            self.public_program,
            code="CLS7-SCI",
            name="Science",
        )
        self.public_topic = self.builder.create_topic(
            self.public_institute,
            self.public_subject,
            code="SCI-LIFE-PLANTS",
            name="Life Processes in Plants",
        )
        self.public_teacher = self.builder.create_teacher(self.public_institute, employee_code="TCHPUB")

        self.private_year = self.builder.create_academic_year(
            self.private_institute,
            name="2026-2027",
        )
        self.private_program = self.builder.create_program(
            self.private_institute,
            code="CLS7",
            name="Class 7",
        )
        self.private_subject = self.builder.create_subject(
            self.private_institute,
            self.private_program,
            code="CLS7-SCI",
            name="Science",
        )
        self.private_topic = self.builder.create_topic(
            self.private_institute,
            self.private_subject,
            code="SCI-LIFE-PLANTS",
            name="Life Processes in Plants",
        )
        self.private_teacher = self.builder.create_teacher(self.private_institute, employee_code="TCHPVT")
        self.platform_user = User.objects.create_user(
            username="platform-admin",
            password="password123",
            email="platform@example.com",
        )

    def _grant_public_question_package(self, *, topic=None):
        package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Science Library",
            code=f"SCI_LIBRARY_{QuestionBankPackage.objects.count() + 1}",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        QuestionBankPackageScope.objects.create(
            institute=self.public_institute,
            package=package,
            program=self.public_program,
            subject=self.public_subject,
            topic=topic or self.public_topic,
            question_source_type="platform_only",
            question_type="mcq_single",
            difficulty_level="intermediate",
            master_visibility="shared_by_request",
        )
        grant_institute_question_bank_entitlement(
            institute=self.private_institute,
            question_bank_package=package,
        )
        return package

    def test_sync_master_question_from_institute_question_creates_canonical_record(self):
        question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Which process helps plants make food?",
            explanation="Photosynthesis helps plants make food.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(question=question, option_text="Photosynthesis", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=question, option_text="Respiration", option_order=2, is_correct=False)

        master = sync_master_question_from_institute_question(question)

        question.refresh_from_db()
        self.assertEqual(question.master_question_id, master.id)
        self.assertEqual(master.source_type, "platform")
        self.assertEqual(master.visibility, "shared_by_request")
        self.assertEqual(master.options.count(), 2)

    def test_private_institute_question_cannot_promote_itself_to_platform_or_shared_visibility(self):
        question = Question.objects.create(
            institute=self.private_institute,
            program=self.private_program,
            subject=self.private_subject,
            topic=self.private_topic,
            created_by_teacher=self.private_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="A private institute question should stay private.",
            explanation="Private institute content must not self-promote into shared platform lanes.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={
                "source_type": "platform",
                "question_visibility": "public",
            },
        )
        QuestionOption.objects.create(question=question, option_text="Correct", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=question, option_text="Wrong", option_order=2, is_correct=False)

        master = sync_master_question_from_institute_question(question)

        self.assertEqual(master.source_type, "teacher")
        self.assertEqual(master.visibility, "private")

    def test_private_institute_admin_authored_question_stays_institute_private_in_master_library(self):
        question = Question.objects.create(
            institute=self.private_institute,
            program=self.private_program,
            subject=self.private_subject,
            topic=self.private_topic,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="An institute-authored question should remain institute-private.",
            explanation="Institute-authored private content must not leak into public/shared visibility.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={
                "source_type": "platform",
                "question_visibility": "shared_by_request",
            },
        )
        QuestionOption.objects.create(question=question, option_text="Correct", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=question, option_text="Wrong", option_order=2, is_correct=False)

        master = sync_master_question_from_institute_question(question)

        self.assertEqual(master.source_type, "institute")
        self.assertEqual(master.visibility, "private")

    def test_request_does_not_auto_link_public_question_to_private_institute(self):
        question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Water moves through which tissue in plants?",
            explanation="Xylem transports water.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        master = sync_master_question_from_institute_question(question)
        self._grant_public_question_package()

        access = request_master_question_access(
            master_question=master,
            institute=self.private_institute,
            requested_by_teacher=self.private_teacher,
            local_program=self.private_program,
            local_subject=self.private_subject,
            local_topic=self.private_topic,
        )

        self.assertEqual(access.status, InstituteQuestionAccessStatus.REQUESTED)
        self.assertIsNone(access.linked_question)
        self.assertFalse(
            Question.objects.filter(
                institute=self.private_institute,
                master_question=master,
            ).exists()
        )

    def test_request_requires_matching_platform_package_entitlement(self):
        question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="A shared question outside package access",
            explanation="Explanation.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        master = sync_master_question_from_institute_question(question)

        with self.assertRaisesMessage(
            ValidationError,
            "outside the institute's active subscribed question-bank packages",
        ):
            request_master_question_access(
                master_question=master,
                institute=self.private_institute,
                requested_by_teacher=self.private_teacher,
                local_program=self.private_program,
                local_subject=self.private_subject,
                local_topic=self.private_topic,
            )

    def test_linking_public_question_creates_institute_operational_copy(self):
        question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Which gas is released during photosynthesis?",
            explanation="Oxygen is released during photosynthesis.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(question=question, option_text="Oxygen", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=question, option_text="Carbon dioxide", option_order=2, is_correct=False)
        master = sync_master_question_from_institute_question(question)
        self._grant_public_question_package()

        access = link_master_question_to_institute(
            master_question=master,
            institute=self.private_institute,
            approved_by=self.platform_user,
            requested_by_teacher=self.private_teacher,
            local_program=self.private_program,
            local_subject=self.private_subject,
            local_topic=self.private_topic,
        )

        self.assertEqual(access.status, InstituteQuestionAccessStatus.LINKED)
        self.assertIsNotNone(access.linked_question)
        self.assertEqual(access.linked_question.institute_id, self.private_institute.id)
        self.assertEqual(access.linked_question.master_question_id, master.id)
        self.assertEqual(access.linked_question.options.count(), 2)

    def test_materialize_master_question_for_source_institute_creates_operational_copy_without_access_link(self):
        question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Which mineral helps leaves stay green?",
            explanation="Magnesium supports chlorophyll.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(question=question, option_text="Magnesium", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=question, option_text="Nitrogen", option_order=2, is_correct=False)
        master = sync_master_question_from_institute_question(question)

        question.delete()

        materialized = materialize_master_question_for_source_institute(master_question=master)

        self.assertEqual(materialized.institute_id, self.public_institute.id)
        self.assertEqual(materialized.master_question_id, master.id)
        self.assertEqual(materialized.options.count(), 2)
        self.assertFalse(
            InstituteQuestionAccess.objects.filter(
                institute=self.public_institute,
                master_question=master,
            ).exists()
        )

    def test_materialize_master_question_for_source_institute_updates_existing_row_when_type_changes(self):
        question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Which mineral helps leaves stay green?",
            explanation="Magnesium supports chlorophyll.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(question=question, option_text="Magnesium", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=question, option_text="Nitrogen", option_order=2, is_correct=False)
        master = sync_master_question_from_institute_question(question)

        materialized = materialize_master_question_for_source_institute(master_question=master)
        master.question_type = "short_answer"
        master.question_text = "Name the mineral that helps leaves stay green."
        master.metadata = {
            **(master.metadata or {}),
            "accepted_answers": ["Magnesium", "magnesium"],
        }
        master.save(update_fields=["question_type", "question_text", "metadata", "updated_at"])
        master.options.all().delete()

        refreshed = materialize_master_question_for_source_institute(master_question=master)

        self.assertEqual(refreshed.pk, materialized.pk)
        self.assertEqual(refreshed.question_type, "short_answer")
        self.assertEqual(refreshed.question_text, "Name the mineral that helps leaves stay green.")

    def test_seed_master_question_library_creates_master_rows_without_private_links(self):
        stdout = StringIO()
        call_command("seed_public_academics", institute_code="PUB001")

        call_command(
            "seed_master_question_library",
            "PUB001",
            subjects=["science"],
            questions_per_topic=10,
            stdout=stdout,
        )

        self.assertGreater(MasterQuestion.objects.filter(source_institute=self.public_institute).count(), 0)
        self.assertEqual(Question.objects.filter(institute=self.private_institute).count(), 0)
        self.assertIn("Master question library seeded for PUB001", stdout.getvalue())

    def test_seed_master_question_library_rerun_rewrites_prefixed_question_text(self):
        call_command("seed_public_academics", institute_code="PUB001")
        call_command(
            "seed_master_question_library",
            "PUB001",
            subjects=["science"],
            questions_per_topic=1,
        )

        master_question = MasterQuestion.objects.get(
            source_institute=self.public_institute,
            source_subject__code="CLS7-SCI",
            source_topic__code="SCI-MATTER-ACIDBASE",
            metadata__seed_batch="master_question_library_v1",
            metadata__seed_sequence=1,
        )
        master_question.question_text = "[Science SCI-OLD 001] Old master seed text"
        master_question.save(update_fields=["question_text", "updated_at"])

        call_command(
            "seed_master_question_library",
            "PUB001",
            subjects=["science"],
            questions_per_topic=1,
        )

        updated = MasterQuestion.objects.get(pk=master_question.pk)
        self.assertNotIn("[Science", updated.question_text)
        self.assertEqual(
            MasterQuestion.objects.filter(
                source_institute=self.public_institute,
                source_subject__code="CLS7-SCI",
                source_topic__code="SCI-MATTER-ACIDBASE",
                metadata__seed_batch="master_question_library_v1",
                metadata__seed_sequence=1,
            ).count(),
            1,
        )

    def test_seed_master_question_library_reactivates_inactive_subject_and_topic_scope(self):
        call_command("seed_public_academics", institute_code="PUB001")

        parent_topic = self.public_subject.topics.filter(parent_topic__isnull=True).first()
        leaf_topic = self.public_subject.topics.filter(parent_topic__isnull=False).first()
        leaf_topic.is_active = False
        leaf_topic.save(update_fields=["is_active", "updated_at"])
        if parent_topic is not None:
            parent_topic.is_active = False
            parent_topic.save(update_fields=["is_active", "updated_at"])
        self.public_subject.is_active = False
        self.public_subject.save(update_fields=["is_active", "updated_at"])

        call_command(
            "seed_master_question_library",
            "PUB001",
            subjects=["science"],
            questions_per_topic=1,
        )

        self.public_subject.refresh_from_db()
        leaf_topic.refresh_from_db()
        self.assertTrue(self.public_subject.is_active)
        self.assertTrue(leaf_topic.is_active)
        if parent_topic is not None:
            parent_topic.refresh_from_db()
            self.assertTrue(parent_topic.is_active)
        self.assertTrue(
            MasterQuestion.objects.filter(
                source_institute=self.public_institute,
                source_subject=self.public_subject,
                source_topic=leaf_topic,
                metadata__seed_batch="master_question_library_v1",
                metadata__seed_sequence=1,
            ).exists()
        )

    def test_link_master_questions_to_institute_request_mode_creates_requests_only(self):
        question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Which structure carries water upward in plants?",
            explanation="Xylem carries water upward.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(question=question, option_text="Xylem", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=question, option_text="Phloem", option_order=2, is_correct=False)
        master = sync_master_question_from_institute_question(question)
        self._grant_public_question_package()

        stdout = StringIO()
        call_command(
            "link_master_questions_to_institute",
            "SCH001",
            mode="request",
            source_institute="PUB001",
            question_ids=[str(master.id)],
            teacher_employee_code="TCHPVT",
            stdout=stdout,
        )

        access = InstituteQuestionAccess.objects.get(
            institute=self.private_institute,
            master_question=master,
        )
        self.assertEqual(access.status, InstituteQuestionAccessStatus.REQUESTED)
        self.assertIsNone(access.linked_question)
        self.assertIn("requested=1", stdout.getvalue())

    def test_link_master_questions_to_institute_approve_mode_creates_linked_questions(self):
        question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="What is the green pigment in leaves called?",
            explanation="Chlorophyll is the green pigment in leaves.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(question=question, option_text="Chlorophyll", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=question, option_text="Starch", option_order=2, is_correct=False)
        master = sync_master_question_from_institute_question(question)
        self._grant_public_question_package()

        call_command(
            "link_master_questions_to_institute",
            "SCH001",
            mode="request",
            source_institute="PUB001",
            question_ids=[str(master.id)],
            teacher_employee_code="TCHPVT",
        )

        stdout = StringIO()
        call_command(
            "link_master_questions_to_institute",
            "SCH001",
            mode="approve",
            source_institute="PUB001",
            question_ids=[str(master.id)],
            teacher_employee_code="TCHPVT",
            approved_by_username="platform-admin",
            only_requested=True,
            stdout=stdout,
        )

        access = InstituteQuestionAccess.objects.get(
            institute=self.private_institute,
            master_question=master,
        )
        self.assertEqual(access.status, InstituteQuestionAccessStatus.LINKED)
        self.assertIsNotNone(access.linked_question)
        self.assertEqual(access.linked_question.institute_id, self.private_institute.id)
        self.assertIn("linked=1", stdout.getvalue())

    def test_link_master_questions_to_institute_rejects_public_target(self):
        with self.assertRaisesMessage(
            CommandError,
            "Target institute PUB001 is the public content hub. Choose a private institute instead.",
        ):
            call_command(
                "link_master_questions_to_institute",
                "PUB001",
                mode="request",
                source_institute="PUB001",
            )

    def test_materialize_master_questions_for_source_institute_command_creates_question_rows(self):
        question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Which part of the plant absorbs water?",
            explanation="Roots absorb water from soil.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(question=question, option_text="Roots", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=question, option_text="Leaves", option_order=2, is_correct=False)
        master = sync_master_question_from_institute_question(question)
        question.delete()

        stdout = StringIO()
        call_command(
            "materialize_master_questions_for_source_institute",
            "PUB001",
            question_ids=[str(master.id)],
            stdout=stdout,
        )

        self.assertTrue(
            Question.objects.filter(
                institute=self.public_institute,
                master_question=master,
            ).exists()
        )
        self.assertIn("materialized=1", stdout.getvalue())
