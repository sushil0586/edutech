from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.academics.models import AcademicYear, Cohort, Program, Subject, Topic
from apps.accounts.models import AccountProfile, AccountRole
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.models import Exam, ExamQuestion
from apps.exams.services import (
    mark_exam_completed,
    publish_exam,
    sync_total_marks_from_questions,
)
from apps.institutes.models import Institute
from apps.question_bank.models import Question, QuestionOption, QuestionType
from apps.results.services import calculate_exam_ranks, generate_result_from_attempt, publish_exam_results
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherProfile


User = get_user_model()


class AcademicAssessmentBuilder:
    """Creates a compact end-to-end academic assessment dataset for tests and demos."""

    def __init__(self):
        self.now = timezone.now()

    def create_institute(self, **overrides):
        defaults = {
            "name": "Demo Learning Institute",
            "code": "DLI001",
            "email": "hello@demo.edu",
            "phone": "9999999999",
            "city": "Bengaluru",
            "state": "Karnataka",
            "country": "India",
            "is_active": True,
        }
        defaults.update(overrides)
        return Institute.objects.create(**defaults)

    def create_academic_year(self, institute, **overrides):
        defaults = {
            "institute": institute,
            "name": "2026-2027",
            "start_date": self.now.date() - timedelta(days=30),
            "end_date": self.now.date() + timedelta(days=330),
            "is_current": True,
            "is_active": True,
        }
        defaults.update(overrides)
        return AcademicYear.objects.create(**defaults)

    def create_program(self, institute, **overrides):
        defaults = {
            "institute": institute,
            "name": "Class 10 Foundation",
            "code": "CLS10F",
            "category": "school",
            "sort_order": 1,
            "is_active": True,
        }
        defaults.update(overrides)
        return Program.objects.create(**defaults)

    def create_cohort(self, institute, program, academic_year, **overrides):
        defaults = {
            "institute": institute,
            "program": program,
            "academic_year": academic_year,
            "name": "Class 10-A",
            "code": "CLS10A",
            "capacity": 40,
            "is_active": True,
        }
        defaults.update(overrides)
        return Cohort.objects.create(**defaults)

    def create_subject(self, institute, program, **overrides):
        defaults = {
            "institute": institute,
            "program": program,
            "name": "Mathematics",
            "code": "MATH10",
            "sort_order": 1,
            "is_active": True,
        }
        defaults.update(overrides)
        return Subject.objects.create(**defaults)

    def create_topic(self, institute, subject, **overrides):
        defaults = {
            "institute": institute,
            "subject": subject,
            "name": "Algebra",
            "code": "ALG-01",
            "difficulty_level": "intermediate",
            "sort_order": 1,
            "is_active": True,
        }
        defaults.update(overrides)
        return Topic.objects.create(**defaults)

    def create_student(self, institute, academic_year, program, cohort, **overrides):
        defaults = {
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
            "admission_no": "STU001",
            "first_name": "Aarav",
            "last_name": "Sharma",
            "email": "aarav@example.com",
            "guardian_name": "Raj Sharma",
            "guardian_phone": "8888888888",
            "is_active": True,
        }
        defaults.update(overrides)
        return StudentProfile.objects.create(**defaults)

    def create_teacher(self, institute, **overrides):
        defaults = {
            "institute": institute,
            "employee_code": "TCH001",
            "first_name": "Neha",
            "last_name": "Kapoor",
            "email": "neha@example.com",
            "specialization": "Mathematics",
            "is_active": True,
        }
        defaults.update(overrides)
        return TeacherProfile.objects.create(**defaults)

    def create_user(self, username, password="password123", **overrides):
        defaults = {
            "email": f"{username}@example.com",
            "is_active": True,
        }
        defaults.update(overrides)
        return User.objects.create_user(username=username, password=password, **defaults)

    def create_account_profile(self, user, role, institute=None, student_profile=None, teacher_profile=None, **overrides):
        defaults = {
            "user": user,
            "role": role,
            "institute": institute,
            "student_profile": student_profile,
            "teacher_profile": teacher_profile,
            "is_active": True,
        }
        defaults.update(overrides)
        return AccountProfile.objects.create(**defaults)

    def create_platform_admin_account(self, username="platform-admin", password="password123", **overrides):
        user = self.create_user(username=username, password=password, **overrides)
        profile = self.create_account_profile(user=user, role=AccountRole.PLATFORM_ADMIN)
        return user, profile

    def create_institute_admin_account(
        self,
        institute,
        username="institute-admin",
        password="password123",
        **overrides,
    ):
        user = self.create_user(username=username, password=password, **overrides)
        profile = self.create_account_profile(
            user=user,
            role=AccountRole.INSTITUTE_ADMIN,
            institute=institute,
        )
        return user, profile

    def create_teacher_account(
        self,
        institute,
        teacher_profile,
        username="teacher-demo",
        password="password123",
        **overrides,
    ):
        user = self.create_user(username=username, password=password, **overrides)
        profile = self.create_account_profile(
            user=user,
            role=AccountRole.TEACHER,
            institute=institute,
            teacher_profile=teacher_profile,
        )
        return user, profile

    def create_student_account(
        self,
        institute,
        student_profile,
        username="student-demo",
        password="password123",
        **overrides,
    ):
        user = self.create_user(username=username, password=password, **overrides)
        profile = self.create_account_profile(
            user=user,
            role=AccountRole.STUDENT,
            institute=institute,
            student_profile=student_profile,
        )
        return user, profile

    def create_parent_account(
        self,
        institute,
        student_profile=None,
        username="parent-demo",
        password="password123",
        **overrides,
    ):
        user = self.create_user(username=username, password=password, **overrides)
        profile = self.create_account_profile(
            user=user,
            role=AccountRole.PARENT,
            institute=institute,
            student_profile=student_profile,
        )
        return user, profile

    def create_question_with_options(self, institute, program, subject, topic, teacher, **overrides):
        question_defaults = {
            "institute": institute,
            "program": program,
            "subject": subject,
            "topic": topic,
            "created_by_teacher": teacher,
            "question_type": QuestionType.MCQ_SINGLE,
            "difficulty_level": "intermediate",
            "question_text": "What is 2 + 2?",
            "explanation": "Basic arithmetic.",
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.50"),
            "is_verified": True,
            "is_active": True,
        }
        options = overrides.pop(
            "options",
            [
                {"option_text": "3", "option_order": 1, "is_correct": False, "is_active": True},
                {"option_text": "4", "option_order": 2, "is_correct": True, "is_active": True},
            ],
        )
        question_defaults.update(overrides)
        question = Question.objects.create(**question_defaults)
        created_options = []
        for option in options:
            created_options.append(QuestionOption.objects.create(question=question, **option))
        return question, created_options

    def create_exam(self, institute, academic_year, program, cohort, subject, **overrides):
        defaults = {
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
            "subject": subject,
            "title": "Mathematics Weekly Test",
            "code": "MATH-WT-01",
            "description": "Weekly practice test.",
            "exam_type": "test",
            "delivery_mode": "online",
            "status": "draft",
            "duration_minutes": 30,
            "total_marks": Decimal("0.00"),
            "passing_marks": Decimal("0.00"),
            "start_at": self.now - timedelta(minutes=5),
            "end_at": self.now + timedelta(minutes=55),
            "allow_late_submit": False,
            "randomize_questions": False,
            "randomize_options": False,
            "show_result_immediately": False,
            "allow_review_after_submit": True,
            "max_attempts": 1,
            "is_active": True,
        }
        defaults.update(overrides)
        return Exam.objects.create(**defaults)

    def add_question_to_exam(self, exam, question, **overrides):
        defaults = {
            "exam": exam,
            "question": question,
            "section_name": "Section A",
            "question_order": 1,
            "marks": None,
            "negative_marks": None,
            "is_mandatory": True,
            "is_active": True,
        }
        defaults.update(overrides)
        exam_question = ExamQuestion.objects.create(**defaults)
        sync_total_marks_from_questions(exam)
        return exam_question

    def create_exam_question(self, exam, question, **overrides):
        return self.add_question_to_exam(exam, question, **overrides)

    def build_full_flow_entities(self):
        institute = self.create_institute()
        academic_year = self.create_academic_year(institute)
        program = self.create_program(institute)
        cohort = self.create_cohort(institute, program, academic_year)
        subject = self.create_subject(institute, program)
        topic = self.create_topic(institute, subject)
        student = self.create_student(institute, academic_year, program, cohort)
        teacher = self.create_teacher(institute)
        question, options = self.create_question_with_options(
            institute, program, subject, topic, teacher
        )
        exam = self.create_exam(institute, academic_year, program, cohort, subject)
        exam_question = self.add_question_to_exam(exam, question)

        return {
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
            "subject": subject,
            "topic": topic,
            "student": student,
            "teacher": teacher,
            "question": question,
            "options": options,
            "exam": exam,
            "exam_question": exam_question,
        }

    def run_full_assessment_flow(self, context):
        exam = sync_total_marks_from_questions(context["exam"])
        exam.passing_marks = min(exam.total_marks, Decimal("1.00"))
        exam.save(update_fields=["passing_marks", "updated_at"])
        publish_exam(exam, changed_by=context["teacher"], remarks="Demo publish")

        attempt = start_attempt(context["student"], exam)
        correct_option = next(option for option in context["options"] if option.is_correct)
        save_answer(
            attempt=attempt,
            question=context["question"],
            selected_option=correct_option,
            time_spent_seconds=18,
        )
        attempt = submit_attempt(attempt)
        result = generate_result_from_attempt(attempt)
        ranked_results = calculate_exam_ranks(exam)
        exam = mark_exam_completed(exam, changed_by=context["teacher"])
        published_results = publish_exam_results(exam)

        return {
            "exam": exam,
            "attempt": attempt,
            "result": result,
            "ranked_results": ranked_results,
            "published_results": published_results,
        }
