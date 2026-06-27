from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.exams.models import Exam
from apps.results.models import ExamResult
from apps.students.models import StudentProfile


class SeedDemoJeeSuiteCommandTestCase(TestCase):
    def test_seed_demo_jee_suite_creates_hybrid_multi_subject_jee_lane(self):
        stdout = StringIO()

        call_command("seed_demo_jee_suite", stdout=stdout)

        student = StudentProfile.objects.get(admission_no="STU-JEE-001")
        live_mock_exam = Exam.objects.get(code="DMO-JEE-FULL-01")
        published_exam = Exam.objects.get(code="DMO-JEE-RESULT-01")

        self.assertEqual(live_mock_exam.program.category, "competitive")
        self.assertEqual(live_mock_exam.program.assessment_family.code, "competitive")
        self.assertEqual(live_mock_exam.metadata["exam_family_id"], "jee")
        self.assertEqual(live_mock_exam.metadata["preset_pack_code"], "jee_mains_math")
        self.assertEqual(
            set(live_mock_exam.sections.values_list("subject__code", flat=True)),
            {"JEEPHY", "JEECHEM", "JEEMATH"},
        )
        self.assertEqual(live_mock_exam.sections.filter(is_active=True).count(), 6)
        self.assertEqual(live_mock_exam.exam_questions.filter(is_active=True).count(), 9)
        self.assertTrue(live_mock_exam.student_assignments.filter(student=student, is_active=True).exists())
        self.assertEqual(
            live_mock_exam.sections.filter(name__icontains="Numeric", negative_marks_per_question="0.00").count(),
            3,
        )

        self.assertEqual(published_exam.metadata["exam_family_id"], "jee")
        self.assertEqual(published_exam.exam_questions.filter(is_active=True).count(), 9)
        self.assertTrue(
            ExamResult.objects.filter(
                exam=published_exam,
                student=student,
                is_active=True,
            ).exists()
        )

        output = stdout.getvalue()
        self.assertIn("Demo JEE suite is ready", output)
        self.assertIn("DMO-JEE-FULL-01", output)
        self.assertIn("DMO-JEE-RESULT-01", output)
