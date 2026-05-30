from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from decimal import Decimal

from apps.academics.models import AcademicYear, Cohort, Program, Subject, Topic
from apps.accounts.models import AccountProfile, AccountRole
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.models import Exam
from apps.exams.services import (
    mark_exam_completed,
    publish_exam,
    sync_total_marks_from_questions,
)
from apps.institutes.models import Institute
from apps.question_bank.models import Question, QuestionOption
from apps.results.services import (
    calculate_exam_performance_summary,
    calculate_exam_ranks,
    calculate_student_topic_performance,
    generate_result_from_attempt,
    publish_exam_results,
)
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherProfile
from common.tests.builders import AcademicAssessmentBuilder


User = get_user_model()


class Command(BaseCommand):
    help = "Seed a complete demo academic assessment flow for local testing."

    def _ensure_demo_user(self, *, username, password, role, institute=None, student_profile=None, teacher_profile=None):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": f"{username}@demo.edu", "is_active": True},
        )
        if created or not user.check_password(password):
            user.set_password(password)
            user.is_active = True
            user.save(update_fields=["password", "is_active"])

        profile_defaults = {
            "role": role,
            "institute": institute,
            "student_profile": student_profile,
            "teacher_profile": teacher_profile,
            "is_active": True,
        }
        profile, _ = AccountProfile.objects.update_or_create(user=user, defaults=profile_defaults)
        return user, profile

    @transaction.atomic
    def handle(self, *args, **options):
        builder = AcademicAssessmentBuilder()
        institute = Institute.objects.filter(code="DLI001").first()
        if institute is None:
            context = builder.build_full_flow_entities()
        else:
            academic_year = AcademicYear.objects.get(institute=institute, name="2026-2027")
            program = Program.objects.get(institute=institute, code="CLS10F")
            cohort = Cohort.objects.get(institute=institute, code="CLS10A")
            subject = Subject.objects.get(institute=institute, code="MATH10")
            topic = Topic.objects.get(subject=subject, code="ALG-01")
            student = StudentProfile.objects.get(institute=institute, admission_no="STU001")
            teacher = TeacherProfile.objects.get(institute=institute, employee_code="TCH001")
            question = Question.objects.get(institute=institute, question_text="What is 2 + 2?")
            options = list(question.options.order_by("option_order"))
            exam = Exam.objects.get(institute=institute, code="MATH-WT-01")
            exam_question = exam.exam_questions.get(question=question)
            context = {
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

        exam = sync_total_marks_from_questions(context["exam"])
        exam.passing_marks = min(exam.total_marks, Decimal("1.00"))
        exam.save(update_fields=["passing_marks", "updated_at"])
        if exam.status == "draft":
            publish_exam(exam, changed_by=context["teacher"], remarks="Seed publish")

        attempt = exam.attempts.filter(student=context["student"]).order_by("-attempt_no").first()
        if attempt is None:
            attempt = start_attempt(context["student"], exam)

        if attempt.status == "in_progress":
            correct_option = next(option for option in context["options"] if option.is_correct)
            save_answer(
                attempt=attempt,
                question=context["question"],
                selected_option=correct_option,
                time_spent_seconds=20,
            )
            attempt = submit_attempt(attempt)

        result = getattr(attempt, "result", None) or generate_result_from_attempt(attempt)
        calculate_student_topic_performance(exam, context["student"], attempt)
        calculate_exam_ranks(exam)
        mark_exam_completed(exam, changed_by=context["teacher"])
        publish_exam_results(exam)
        calculate_exam_performance_summary(exam)

        demo_credentials = [
            ("platform_admin", "demo-platform-admin", "Demo@12345"),
            ("institute_admin", "demo-institute-admin", "Demo@12345"),
            ("teacher", "demo-teacher", "Demo@12345"),
            ("student", "demo-student", "Demo@12345"),
            ("parent", "demo-parent", "Demo@12345"),
        ]
        self._ensure_demo_user(
            username="demo-platform-admin",
            password="Demo@12345",
            role=AccountRole.PLATFORM_ADMIN,
        )
        self._ensure_demo_user(
            username="demo-institute-admin",
            password="Demo@12345",
            role=AccountRole.INSTITUTE_ADMIN,
            institute=context["institute"],
        )
        self._ensure_demo_user(
            username="demo-teacher",
            password="Demo@12345",
            role=AccountRole.TEACHER,
            institute=context["institute"],
            teacher_profile=context["teacher"],
        )
        self._ensure_demo_user(
            username="demo-student",
            password="Demo@12345",
            role=AccountRole.STUDENT,
            institute=context["institute"],
            student_profile=context["student"],
        )
        self._ensure_demo_user(
            username="demo-parent",
            password="Demo@12345",
            role=AccountRole.PARENT,
            institute=context["institute"],
        )

        self.stdout.write(self.style.SUCCESS("Demo academic assessment data is ready"))
        self.stdout.write(
            "\n".join(
                [
                    f"Institute: {context['institute'].name} ({context['institute'].code})",
                    f"Student: {context['student'].full_name} ({context['student'].admission_no})",
                    f"Teacher: {context['teacher'].full_name} ({context['teacher'].employee_code})",
                    f"Exam: {exam.title} ({exam.code})",
                    f"Attempt: #{attempt.attempt_no} status={attempt.status}",
                    f"Result: final_score={result.final_score} percentage={result.percentage}",
                    "",
                    "Demo users:",
                    *[f"- {role}: username={username} password={password}" for role, username, password in demo_credentials],
                ]
            )
        )
