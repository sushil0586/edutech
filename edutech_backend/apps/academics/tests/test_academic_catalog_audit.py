from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.academics.models import Subject, Topic
from apps.question_bank.models import Question
from common.tests.builders import AcademicAssessmentBuilder


class AcademicCatalogAuditCommandTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.institute = self.builder.create_institute(code="AUD001", name="Audit Institute")
        self.program = self.builder.create_program(self.institute, code="CLS7", name="Class 7")
        self.subject = self.builder.create_subject(self.institute, self.program, code="CLS7-MATH", name="Math")
        self.topic = self.builder.create_topic(
            self.institute,
            self.subject,
            code="CLS7-MATH-INTEGERS",
            name="Integers",
        )

    def test_audit_passes_for_clean_catalog_without_empty_topic_check(self):
        stdout = StringIO()

        call_command(
            "audit_academic_catalog",
            institute_code="AUD001",
            fail_on_findings=True,
            stdout=stdout,
        )

        self.assertIn("Academic catalog audit passed with no findings.", stdout.getvalue())

    def test_audit_can_fail_on_empty_active_topics(self):
        with self.assertRaisesMessage(CommandError, "Academic catalog audit failed."):
            call_command(
                "audit_academic_catalog",
                institute_code="AUD001",
                fail_on_empty_active_topics=True,
                fail_on_findings=True,
            )

    def test_audit_detects_mismatched_question_topic(self):
        other_subject = self.builder.create_subject(
            self.institute,
            self.program,
            code="CLS7-SCI",
            name="Science",
        )
        question, _ = self.builder.create_question_with_options(
            self.institute,
            self.program,
            other_subject,
            self.builder.create_topic(
                self.institute,
                other_subject,
                code="CLS7-SCI-PLANTS",
                name="Plants",
            ),
            self.builder.create_teacher(self.institute, employee_code="AUDTCH01"),
            question_text="Audit mismatch question",
        )
        Question.objects.filter(pk=question.pk).update(topic=self.topic)

        with self.assertRaisesMessage(CommandError, "Academic catalog audit failed."):
            call_command(
                "audit_academic_catalog",
                institute_code="AUD001",
                fail_on_findings=True,
            )


class AcademicNormalizationTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.institute = self.builder.create_institute(code="NOR001", name="Normalization Institute")
        self.program = self.builder.create_program(self.institute, code="cls7", name="  Class 7  ")

    def test_subject_and_topic_codes_are_normalized_on_save(self):
        subject = Subject.objects.create(
            institute=self.institute,
            program=self.program,
            code=" cls7-math ",
            name="  Math  ",
            is_active=True,
        )
        topic = Topic.objects.create(
            institute=self.institute,
            subject=subject,
            code=" cls7-math-integers ",
            name="  Integers  ",
            is_active=True,
        )

        self.assertEqual(subject.code, "CLS7-MATH")
        self.assertEqual(subject.name, "Math")
        self.assertEqual(topic.code, "CLS7-MATH-INTEGERS")
        self.assertEqual(topic.name, "Integers")
