from django.contrib.auth import get_user_model
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.accounts.models import AccountProfile
from apps.attempts.models import StudentExamAttempt
from apps.exams.models import Exam
from apps.institutes.models import Institute
from apps.question_bank.models import Question
from apps.results.models import ExamResult
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherProfile


class SeedDemoAcademicDataCommandTestCase(TestCase):
    def test_seed_demo_academic_data_command_creates_demo_flow(self):
        stdout = StringIO()
        user_model = get_user_model()

        call_command("seed_demo_academic_data", stdout=stdout)

        self.assertTrue(Institute.objects.filter(code="DLI001").exists())
        self.assertTrue(StudentProfile.objects.filter(admission_no="STU001").exists())
        self.assertTrue(TeacherProfile.objects.filter(employee_code="TCH001").exists())
        self.assertTrue(Question.objects.filter(question_text="What is 2 + 2?").exists())
        self.assertTrue(Exam.objects.filter(code="MATH-WT-01").exists())
        self.assertTrue(StudentExamAttempt.objects.exists())
        self.assertTrue(ExamResult.objects.exists())
        self.assertTrue(user_model.objects.filter(username="demo-platform-admin").exists())
        self.assertTrue(AccountProfile.objects.filter(user__username="demo-teacher", role="teacher").exists())
        self.assertIn("Demo academic assessment data is ready", stdout.getvalue())
        self.assertIn("demo-platform-admin", stdout.getvalue())
