from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.exams.models import ExamSourceType
from common.tests.builders import AcademicAssessmentBuilder


class ExamSourceModelTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()

    def test_teacher_source_requires_source_teacher(self):
        exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="SRC-TEACHER-REQ-01",
        )

        exam.source_type = ExamSourceType.TEACHER
        exam.source_teacher = None

        with self.assertRaises(ValidationError) as exc:
            exam.full_clean()

        self.assertIn("source_teacher", exc.exception.message_dict)

    def test_teacher_source_accepts_teacher_from_same_institute(self):
        exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="SRC-TEACHER-OK-01",
            source_type=ExamSourceType.TEACHER,
            source_teacher=self.context["teacher"],
        )

        exam.full_clean()

        self.assertEqual(exam.source_type, ExamSourceType.TEACHER)
        self.assertEqual(exam.source_teacher_id, self.context["teacher"].id)

    def test_platform_and_institute_sources_do_not_require_teacher(self):
        platform_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="SRC-PLATFORM-01",
            source_type=ExamSourceType.PLATFORM,
        )
        institute_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="SRC-INSTITUTE-01",
            source_type=ExamSourceType.INSTITUTE,
        )

        platform_exam.full_clean()
        institute_exam.full_clean()

        self.assertEqual(platform_exam.source_label, "Platform")
        self.assertEqual(institute_exam.source_label, "Institute")
