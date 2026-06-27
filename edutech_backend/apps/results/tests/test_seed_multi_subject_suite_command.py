from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.exams.models import Exam
from apps.results.models import ExamResult
from apps.students.models import StudentProfile


class SeedDemoMultiSubjectSuiteCommandTestCase(TestCase):
    def test_seed_demo_multi_subject_suite_creates_three_subject_demo_lane(self):
        stdout = StringIO()

        call_command("seed_demo_multi_subject_suite", stdout=stdout)

        student = StudentProfile.objects.get(admission_no="STU001")
        practice_exam = Exam.objects.get(code="DMO-MIX-PRACTICE-01")
        live_mock_exam = Exam.objects.get(code="DMO-MIX-MOCK-01")

        self.assertEqual(
            set(practice_exam.sections.values_list("subject__code", flat=True)),
            {"MATH10", "PHY10", "CHEM10"},
        )
        self.assertEqual(practice_exam.exam_questions.filter(is_active=True).count(), 3)
        self.assertTrue(practice_exam.student_assignments.filter(student=student, is_active=True).exists())
        self.assertTrue(
            ExamResult.objects.filter(
                exam=practice_exam,
                student=student,
                is_active=True,
            ).exists()
        )
        self.assertTrue(live_mock_exam.student_assignments.filter(student=student, is_active=True).exists())
        self.assertIn("Demo multi-subject suite is ready", stdout.getvalue())
        self.assertIn("DMO-MIX-MOCK-01", stdout.getvalue())
