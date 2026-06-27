from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.exams.models import Exam
from apps.results.models import ExamResult
from apps.students.models import StudentProfile


class SeedDemoAwsSuiteCommandTestCase(TestCase):
    def test_seed_demo_aws_suite_creates_practice_first_certification_lane(self):
        stdout = StringIO()

        call_command("seed_demo_aws_suite", stdout=stdout)

        student = StudentProfile.objects.get(admission_no="STU-AWS-001")
        live_exam = Exam.objects.get(code="DMO-AWS-PRACTICE-01")
        published_exam = Exam.objects.get(code="DMO-AWS-RESULT-01")

        self.assertEqual(live_exam.program.category, "certification")
        self.assertEqual(live_exam.program.assessment_family.code, "certification")
        self.assertEqual(live_exam.metadata["exam_family_id"], "aws_certification")
        self.assertEqual(live_exam.metadata["preset_pack_code"], "aws_practitioner")
        self.assertEqual(live_exam.sections.filter(is_active=True).count(), 1)
        self.assertEqual(live_exam.exam_questions.filter(is_active=True).count(), 3)
        self.assertEqual(live_exam.review_mode, "solution_review")
        self.assertEqual(live_exam.result_publish_mode, "immediate")
        self.assertTrue(live_exam.student_assignments.filter(student=student, is_active=True).exists())

        self.assertTrue(
            ExamResult.objects.filter(
                exam=published_exam,
                student=student,
                is_active=True,
            ).exists()
        )

        output = stdout.getvalue()
        self.assertIn("Demo AWS suite is ready", output)
        self.assertIn("DMO-AWS-PRACTICE-01", output)
        self.assertIn("DMO-AWS-RESULT-01", output)
