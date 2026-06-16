from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.academics.models import AcademicYear, Cohort, Program, Subject
from apps.accounts.models import AccountProfile, AccountRole
from apps.exams.models import Exam, ExamQuestion
from apps.exams.services import publish_exam, sync_total_marks_from_questions
from apps.institutes.models import Institute
from apps.question_bank.models import Question
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherProfile


User = get_user_model()

SHOWCASE_BATCH = "showcase_100_v1"

EXAM_SPECS = [
    {
        "code": "MATH-PRACTICE-01",
        "title": "Math Practice Sprint",
        "description": "A short readiness set to warm up with mixed fundamentals.",
        "exam_type": "practice",
        "duration_minutes": 20,
        "question_count": 12,
        "type_mix": {
            "mcq_single": 4,
            "mcq_multiple": 3,
            "true_false": 2,
            "short_answer": 3,
        },
        "start_offset_minutes": -90,
        "end_offset_minutes": 240,
        "allow_review_after_submit": True,
        "show_result_immediately": True,
        "max_attempts": 1,
        "attempt_policy": "unlimited_practice",
        "review_mode": "solution_review",
        "security_mode": "normal",
        "randomize_questions": True,
        "randomize_options": True,
    },
    {
        "code": "MATH-PRACTICE-02",
        "title": "Math Practice Booster",
        "description": "A second repeatable practice set to support focused improvement loops between scored exams.",
        "exam_type": "practice",
        "duration_minutes": 18,
        "question_count": 10,
        "type_mix": {
            "mcq_single": 3,
            "mcq_multiple": 2,
            "true_false": 2,
            "short_answer": 3,
        },
        "start_offset_minutes": -80,
        "end_offset_minutes": 240,
        "allow_review_after_submit": True,
        "show_result_immediately": True,
        "max_attempts": 1,
        "attempt_policy": "unlimited_practice",
        "review_mode": "solution_review",
        "security_mode": "normal",
        "randomize_questions": True,
        "randomize_options": True,
    },
    {
        "code": "MATH-MOCK-01",
        "title": "Class 10 Mock Test 01",
        "description": "A full mock test with balanced coverage across all seeded math topics.",
        "exam_type": "mock_exam",
        "duration_minutes": 60,
        "question_count": 30,
        "type_mix": {
            "mcq_single": 10,
            "mcq_multiple": 8,
            "true_false": 6,
            "short_answer": 6,
        },
        "start_offset_minutes": -60,
        "end_offset_minutes": 300,
        "allow_review_after_submit": True,
        "show_result_immediately": False,
        "max_attempts": 1,
        "attempt_policy": "single",
        "review_mode": "attempted_only",
        "security_mode": "focus",
        "randomize_questions": True,
        "randomize_options": True,
    },
    {
        "code": "MATH-SECURE-01",
        "title": "Secure Readiness Assessment",
        "description": "A monitored assessment to exercise fullscreen and integrity workflows.",
        "exam_type": "assessment",
        "duration_minutes": 45,
        "question_count": 20,
        "type_mix": {
            "mcq_single": 7,
            "mcq_multiple": 5,
            "true_false": 4,
            "short_answer": 4,
        },
        "start_offset_minutes": -30,
        "end_offset_minutes": 180,
        "allow_review_after_submit": False,
        "show_result_immediately": False,
        "max_attempts": 1,
        "attempt_policy": "single",
        "review_mode": "none",
        "security_mode": "violation_limited",
        "randomize_questions": True,
        "randomize_options": True,
    },
    {
        "code": "MATH-UPCOMING-01",
        "title": "Upcoming Weekly Challenge",
        "description": "An upcoming exam to populate countdown and reminder states in the student portal.",
        "exam_type": "quiz",
        "duration_minutes": 25,
        "question_count": 15,
        "type_mix": {
            "mcq_single": 4,
            "mcq_multiple": 4,
            "true_false": 3,
            "short_answer": 4,
        },
        "start_offset_minutes": 25,
        "end_offset_minutes": 70,
        "allow_review_after_submit": True,
        "show_result_immediately": True,
        "max_attempts": 1,
        "attempt_policy": "single",
        "review_mode": "all_questions",
        "security_mode": "normal",
        "randomize_questions": False,
        "randomize_options": False,
    },
]


class Command(BaseCommand):
    help = "Seed showcase exams from the 100-question demo bank for realistic student flows."

    def _ensure_demo_user(
        self,
        *,
        username,
        password,
        role,
        institute=None,
        student_profile=None,
        teacher_profile=None,
        registration_context=None,
    ):
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
            "registration_context": registration_context or {},
            "is_active": True,
        }
        AccountProfile.objects.update_or_create(user=user, defaults=profile_defaults)
        return user

    def _ensure_institute(self):
        institute, _ = Institute.objects.get_or_create(
            code="DLI001",
            defaults={
                "name": "Demo Learning Institute",
                "email": "hello@demo.edu",
                "phone": "9999999999",
                "city": "Bengaluru",
                "state": "Karnataka",
                "country": "India",
                "is_active": True,
            },
        )
        return institute

    def _ensure_academic_year(self, institute):
        today = timezone.localdate()
        academic_year, _ = AcademicYear.objects.get_or_create(
            institute=institute,
            name="2026-2027",
            defaults={
                "start_date": today - timedelta(days=30),
                "end_date": today + timedelta(days=330),
                "is_current": True,
                "is_active": True,
            },
        )
        if not academic_year.is_current:
            academic_year.is_current = True
            academic_year.save(update_fields=["is_current", "updated_at"])
        return academic_year

    def _ensure_program(self, institute):
        program, _ = Program.objects.get_or_create(
            institute=institute,
            code="CLS10F",
            defaults={
                "name": "Class 10 Foundation",
                "category": "school",
                "description": "Demo program for showcase student journeys.",
                "sort_order": 1,
                "is_active": True,
            },
        )
        return program

    def _ensure_cohort(self, institute, program, academic_year):
        cohort, _ = Cohort.objects.get_or_create(
            institute=institute,
            code="CLS10A",
            defaults={
                "program": program,
                "academic_year": academic_year,
                "name": "Class 10-A",
                "capacity": 40,
                "is_active": True,
            },
        )
        return cohort

    def _ensure_subject(self, institute, program):
        subject, _ = Subject.objects.get_or_create(
            institute=institute,
            code="MATH10",
            defaults={
                "program": program,
                "name": "Mathematics",
                "sort_order": 1,
                "is_active": True,
            },
        )
        if subject.program_id is None:
            subject.program = program
            subject.save(update_fields=["program", "updated_at"])
        return subject

    def _ensure_teacher(self, institute):
        teacher, _ = TeacherProfile.objects.get_or_create(
            institute=institute,
            employee_code="TCH001",
            defaults={
                "first_name": "Neha",
                "last_name": "Kapoor",
                "email": "neha@example.com",
                "specialization": "Mathematics",
                "is_active": True,
            },
        )
        return teacher

    def _ensure_student(self, institute, academic_year, program, cohort):
        student, _ = StudentProfile.objects.get_or_create(
            institute=institute,
            admission_no="STU001",
            defaults={
                "academic_year": academic_year,
                "program": program,
                "cohort": cohort,
                "first_name": "Aarav",
                "last_name": "Sharma",
                "email": "aarav@example.com",
                "guardian_name": "Raj Sharma",
                "guardian_phone": "8888888888",
                "is_active": True,
            },
        )
        return student

    def _question_pool(self, subject):
        return list(
            Question.objects.filter(
                subject=subject,
                is_active=True,
                metadata__seed_batch=SHOWCASE_BATCH,
            )
            .select_related("topic")
            .order_by("metadata__seed_sequence", "created_at")
        )

    def _partition_question_pool(self, questions):
        buckets = {
            "mcq_single": [],
            "mcq_multiple": [],
            "true_false": [],
            "short_answer": [],
        }
        for question in questions:
            buckets.setdefault(question.question_type, []).append(question)
        return buckets

    def _take_questions(self, pools, question_type, count):
        available = pools.get(question_type, [])
        if len(available) < count:
            raise ValueError(
                f"Not enough questions available for type '{question_type}' to seed showcase exams."
            )
        selected = available[:count]
        pools[question_type] = available[count:]
        return selected

    def _build_exam(self, *, institute, academic_year, program, cohort, subject, teacher, spec, questions):
        now = timezone.now()
        start_at = now + timedelta(minutes=spec["start_offset_minutes"])
        end_at = now + timedelta(minutes=spec["end_offset_minutes"])
        exam, _ = Exam.objects.update_or_create(
            institute=institute,
            code=spec["code"],
            defaults={
                "academic_year": academic_year,
                "program": program,
                "cohort": cohort,
                "subject": subject,
                "title": spec["title"],
                "description": spec["description"],
                "exam_type": spec["exam_type"],
                "delivery_mode": "online",
                "status": "draft",
                "duration_minutes": spec["duration_minutes"],
                "total_marks": Decimal("0.00"),
                "passing_marks": Decimal("0.00"),
                "start_at": start_at,
                "end_at": end_at,
                "instructions": (
                    "Read each question carefully, manage your time well, and submit before the timer ends."
                ),
                "allow_late_submit": False,
                "randomize_questions": spec["randomize_questions"],
                "randomize_options": spec["randomize_options"],
                "show_result_immediately": spec["show_result_immediately"],
                "allow_review_after_submit": spec["allow_review_after_submit"],
                "max_attempts": spec["max_attempts"],
                "timer_mode": "global",
                "navigation_mode": "free_exam",
                "attempt_policy": spec["attempt_policy"],
                "result_publish_mode": (
                    "immediate" if spec["show_result_immediately"] else "after_review"
                ),
                "review_mode": spec["review_mode"],
                "security_mode": spec["security_mode"],
                "assignment_mode": "scope",
                "allow_resume": True,
                "allow_section_switching": True,
                "allow_return_to_previous_section": True,
                "metadata": {
                    "seed_batch": "showcase_exams_v1",
                    "source_question_batch": SHOWCASE_BATCH,
                },
                "is_active": True,
            },
        )

        exam.exam_questions.all().delete()
        for order, question in enumerate(questions, start=1):
            ExamQuestion.objects.create(
                exam=exam,
                question=question,
                section_name="Section A",
                question_order=order,
                marks=question.default_marks,
                negative_marks=question.negative_marks,
                is_mandatory=True,
                is_active=True,
            )

        exam = sync_total_marks_from_questions(exam)
        exam.passing_marks = (exam.total_marks * Decimal("0.40")).quantize(Decimal("0.01"))
        exam.save(update_fields=["total_marks", "passing_marks", "updated_at"])

        if exam.status != "scheduled":
            exam = publish_exam(exam, changed_by=teacher, remarks="Showcase exam seed publish")
        return exam

    @transaction.atomic
    def handle(self, *args, **options):
        institute = self._ensure_institute()
        academic_year = self._ensure_academic_year(institute)
        program = self._ensure_program(institute)
        cohort = self._ensure_cohort(institute, program, academic_year)
        subject = self._ensure_subject(institute, program)
        teacher = self._ensure_teacher(institute)
        student = self._ensure_student(institute, academic_year, program, cohort)

        questions = self._question_pool(subject)
        if len(questions) < 100:
            raise ValueError(
                "Expected 100 showcase questions. Run `python manage.py seed_showcase_questions` first."
            )

        self._ensure_demo_user(
            username="demo-teacher",
            password="Demo@12345",
            role=AccountRole.TEACHER,
            institute=institute,
            teacher_profile=teacher,
        )
        self._ensure_demo_user(
            username="demo-student",
            password="Demo@12345",
            role=AccountRole.STUDENT,
            institute=institute,
            student_profile=student,
            registration_context={
                "role": "student",
                "class_level": "10",
                "board": "CBSE",
                "exam_interest": "Olympiad",
                "subject_interests": [
                    "Mathematics",
                    "Science",
                    "Computer",
                    "Social Science",
                    "GK",
                    "Mental Aptitude",
                ],
                "school_name": institute.name,
                "school_code": institute.code,
            },
        )

        created_codes = []
        question_pools = self._partition_question_pool(questions)
        topic_count = {}
        for spec in EXAM_SPECS:
            selected = []
            for question_type, count in spec["type_mix"].items():
                selected.extend(self._take_questions(question_pools, question_type, count))
            exam = self._build_exam(
                institute=institute,
                academic_year=academic_year,
                program=program,
                cohort=cohort,
                subject=subject,
                teacher=teacher,
                spec=spec,
                questions=selected,
            )
            created_codes.append(exam.code)
            for item in selected:
                topic_name = item.topic.name if item.topic_id else "Unassigned"
                topic_count[topic_name] = topic_count.get(topic_name, 0) + 1

        self.stdout.write(self.style.SUCCESS("Showcase exams are ready for student testing."))
        self.stdout.write(
            "\n".join(
                [
                    f"Institute: {institute.name} ({institute.code})",
                    f"Program/Cohort: {program.name} / {cohort.name}",
                    f"Student login: demo-student / Demo@12345",
                    f"Teacher login: demo-teacher / Demo@12345",
                    f"Question source batch: {SHOWCASE_BATCH}",
                    f"Exams seeded: {', '.join(created_codes)}",
                ]
                + [f"{name}: {count} linked questions" for name, count in sorted(topic_count.items())]
            )
        )
