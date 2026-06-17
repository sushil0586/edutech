from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.academics.models import Topic
from apps.question_bank.models import Question
from common.tests.builders import AcademicAssessmentBuilder


class SeedCurriculumQuestionsCommandTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.institute = self.builder.create_institute(code="SCH001", name="Springfield School")
        call_command("seed_institute_academics", "SCH001")

    def test_seeds_math_questions_per_leaf_topic_with_requested_distribution(self):
        stdout = StringIO()

        call_command(
            "seed_curriculum_questions",
            "SCH001",
            subjects=["math"],
            questions_per_topic=10,
            stdout=stdout,
        )

        math_leaf_topics = Topic.objects.filter(
            institute=self.institute,
            subject__code="CLS7-MATH",
            parent_topic__isnull=False,
        ).count()
        self.assertEqual(Question.objects.filter(institute=self.institute, subject__code="CLS7-MATH").count(), math_leaf_topics * 10)
        self.assertIn("Curriculum questions seeded for SCH001", stdout.getvalue())

    def test_seeds_science_assertion_reason_as_mcq_single_pattern(self):
        call_command(
            "seed_curriculum_questions",
            "SCH001",
            subjects=["science"],
            questions_per_topic=60,
        )

        question = Question.objects.filter(
            institute=self.institute,
            subject__code="CLS7-SCI",
            metadata__question_pattern="assertion_reason",
        ).first()
        self.assertIsNotNone(question)
        self.assertEqual(question.question_type, "mcq_single")

    def test_seeded_question_texts_do_not_include_seed_prefixes(self):
        call_command(
            "seed_curriculum_questions",
            "SCH001",
            subjects=["science"],
            questions_per_topic=2,
        )

        question = Question.objects.filter(
            institute=self.institute,
            subject__code="CLS7-SCI",
        ).first()
        self.assertIsNotNone(question)
        self.assertNotIn("[Science", question.question_text)
        self.assertNotIn("[Math", question.question_text)

    def test_is_idempotent_for_same_question_texts(self):
        call_command(
            "seed_curriculum_questions",
            "SCH001",
            subjects=["math"],
            questions_per_topic=5,
        )
        first_count = Question.objects.filter(institute=self.institute, subject__code="CLS7-MATH").count()

        call_command(
            "seed_curriculum_questions",
            "SCH001",
            subjects=["math"],
            questions_per_topic=5,
        )
        second_count = Question.objects.filter(institute=self.institute, subject__code="CLS7-MATH").count()

        self.assertEqual(first_count, second_count)

    def test_reactivates_inactive_subject_and_topic_scope_before_seeding(self):
        topic = Topic.objects.filter(
            institute=self.institute,
            subject__code="CLS7-MATH",
            parent_topic__isnull=False,
        ).order_by("sort_order", "name").first()
        topic.is_active = False
        topic.save(update_fields=["is_active", "updated_at"])

        topic.subject.is_active = False
        topic.subject.save(update_fields=["is_active", "updated_at"])

        call_command(
            "seed_curriculum_questions",
            "SCH001",
            subjects=["math"],
            questions_per_topic=1,
        )

        topic.refresh_from_db()
        topic.subject.refresh_from_db()
        self.assertTrue(topic.is_active)
        self.assertTrue(topic.subject.is_active)
        self.assertTrue(
            Question.objects.filter(
                institute=self.institute,
                subject__code="CLS7-MATH",
                topic=topic,
                metadata__seed_batch="curriculum_questions_v1",
                metadata__seed_sequence=1,
            ).exists()
        )

    def test_rerun_updates_old_seeded_question_text_in_place(self):
        call_command(
            "seed_curriculum_questions",
            "SCH001",
            subjects=["science"],
            questions_per_topic=1,
        )
        question = Question.objects.get(
            institute=self.institute,
            subject__code="CLS7-SCI",
            topic__code="SCI-MATTER-ACIDBASE",
            metadata__seed_batch="curriculum_questions_v1",
            metadata__seed_sequence=1,
        )
        question.question_text = "[Science SCI-OLD 001] Old seed text"
        question.save(update_fields=["question_text", "updated_at"])

        call_command(
            "seed_curriculum_questions",
            "SCH001",
            subjects=["science"],
            questions_per_topic=1,
        )

        updated = Question.objects.get(pk=question.pk)
        self.assertNotIn("[Science", updated.question_text)
        self.assertEqual(
            Question.objects.filter(
                institute=self.institute,
                subject__code="CLS7-SCI",
                topic__code="SCI-MATTER-ACIDBASE",
                metadata__seed_batch="curriculum_questions_v1",
                metadata__seed_sequence=1,
            ).count(),
            1,
        )

    def test_rejects_public_hub_for_institute_question_seed(self):
        self.institute.metadata = {"is_public_content_hub": True}
        self.institute.save()

        with self.assertRaisesMessage(
            CommandError,
            "Institute SCH001 is the public content hub. Use seed_master_question_library instead.",
        ):
            call_command("seed_curriculum_questions", "SCH001")
