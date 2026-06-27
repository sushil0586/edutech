from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.exams.models import Exam
from apps.results.models import ExamResult
from apps.students.models import StudentProfile


class SeedDemoNeetSuiteCommandTestCase(TestCase):
    def test_seed_demo_neet_suite_creates_full_mock_and_result_ready_neet_lane(self):
        stdout = StringIO()

        call_command("seed_demo_neet_suite", stdout=stdout)

        student = StudentProfile.objects.get(admission_no="STU-NEET-001")
        live_mock_exam = Exam.objects.get(code="DMO-NEET-FULL-01")
        published_exam = Exam.objects.get(code="DMO-NEET-RESULT-01")

        self.assertEqual(live_mock_exam.program.category, "competitive")
        self.assertEqual(live_mock_exam.program.assessment_family.code, "competitive")
        self.assertEqual(live_mock_exam.metadata["exam_family_id"], "neet")
        self.assertEqual(
            set(live_mock_exam.sections.values_list("subject__code", flat=True)),
            {"NEETPHY", "NEETCHEM", "NEETBIO"},
        )
        self.assertEqual(live_mock_exam.exam_questions.filter(is_active=True).count(), 9)
        self.assertTrue(live_mock_exam.student_assignments.filter(student=student, is_active=True).exists())

        self.assertEqual(published_exam.metadata["exam_family_id"], "neet")
        self.assertEqual(published_exam.exam_questions.filter(is_active=True).count(), 9)
        self.assertTrue(
            ExamResult.objects.filter(
                exam=published_exam,
                student=student,
                is_active=True,
            ).exists()
        )

        output = stdout.getvalue()
        self.assertIn("Demo NEET suite is ready", output)
        self.assertIn("DMO-NEET-FULL-01", output)
        self.assertIn("DMO-NEET-RESULT-01", output)
