from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.exams.models import Exam
from apps.results.models import ExamResult
from apps.students.models import StudentProfile


class SeedDemoGreSuiteCommandTestCase(TestCase):
    def test_seed_demo_gre_suite_creates_sectional_quant_lane(self):
        stdout = StringIO()

        call_command("seed_demo_gre_suite", stdout=stdout)

        student = StudentProfile.objects.get(admission_no="STU-GRE-001")
        live_exam = Exam.objects.get(code="DMO-GRE-QUANT-01")
        published_exam = Exam.objects.get(code="DMO-GRE-RESULT-01")

        self.assertEqual(live_exam.program.category, "competitive")
        self.assertEqual(live_exam.program.assessment_family.code, "competitive")
        self.assertEqual(live_exam.metadata["exam_family_id"], "gre")
        self.assertEqual(live_exam.metadata["preset_pack_code"], "gre_quant")
        self.assertEqual(live_exam.sections.filter(is_active=True).count(), 2)
        self.assertEqual(
            list(live_exam.sections.filter(is_active=True).order_by("section_order").values_list("name", flat=True)),
            ["Quant Section 1", "Quant Section 2"],
        )
        self.assertEqual(live_exam.exam_questions.filter(is_active=True).count(), 6)
        self.assertTrue(live_exam.student_assignments.filter(student=student, is_active=True).exists())
        self.assertEqual(
            live_exam.metadata["advanced_builder"]["reporting_contract"]["score_reporting_mode"],
            "total_score_first",
        )

        self.assertEqual(published_exam.metadata["exam_family_id"], "gre")
        self.assertTrue(
            ExamResult.objects.filter(
                exam=published_exam,
                student=student,
                is_active=True,
            ).exists()
        )

        output = stdout.getvalue()
        self.assertIn("Demo GRE suite is ready", output)
        self.assertIn("DMO-GRE-QUANT-01", output)
        self.assertIn("DMO-GRE-RESULT-01", output)
