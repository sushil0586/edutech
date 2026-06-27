from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.academics.models import AcademicYear, Cohort, Program, Subject, Topic, TopicDifficulty
from apps.accounts.models import AccountProfile, AccountRole
from apps.attempts.models import StudentExamAttempt
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.models import (
    AssignmentMode,
    AttemptPolicy,
    DeliveryMode,
    Exam,
    ExamQuestion,
    ExamSection,
    ExamSourceType,
    ExamStudentAssignment,
    ExamType,
    NavigationMode,
    ResultPublishMode,
    ReviewMode,
    SecurityMode,
    TimerMode,
)
from apps.exams.services import publish_exam, refresh_exam_status, sync_total_marks_from_questions
from apps.institutes.models import Institute
from apps.question_bank.models import ContentFormat, Question, QuestionOption, QuestionType
from apps.results.models import ExamResult
from apps.results.services import calculate_exam_performance_summary, calculate_exam_ranks, calculate_student_topic_performance
from apps.students.models import StudentProfile
from apps.teachers.models import AssignmentRole, TeacherAssignment, TeacherProfile


User = get_user_model()

DEMO_PASSWORD = "Demo@12345"
DEMO_INSTITUTE_CODE = "DLI001"
DEMO_ACADEMIC_YEAR = "2026-2027"
SEED_BATCH = "demo_multi_subject_suite_v1"

SUBJECT_BLUEPRINTS = (
    {
        "code": "MATH10",
        "name": "Mathematics",
        "sort_order": 1,
        "topic_code": "ALG-01",
        "topic_name": "Algebra",
        "question_text": "What is 12 / 3?",
        "correct_option": "4",
        "wrong_options": ["2", "3"],
        "marks": Decimal("4.00"),
        "negative_marks": Decimal("1.00"),
    },
    {
        "code": "PHY10",
        "name": "Physics",
        "sort_order": 2,
        "topic_code": "MOT-01",
        "topic_name": "Motion and Force",
        "question_text": "What is the SI unit of force?",
        "correct_option": "Newton",
        "wrong_options": ["Joule", "Pascal"],
        "marks": Decimal("4.00"),
        "negative_marks": Decimal("1.00"),
    },
    {
        "code": "CHEM10",
        "name": "Chemistry",
        "sort_order": 3,
        "topic_code": "MAT-01",
        "topic_name": "Matter and Molecules",
        "question_text": "What is the chemical formula of water?",
        "correct_option": "H2O",
        "wrong_options": ["CO2", "O2"],
        "marks": Decimal("4.00"),
        "negative_marks": Decimal("1.00"),
    },
)

EXAM_BLUEPRINTS = (
    {
        "code": "DMO-MIX-MOCK-01",
        "title": "Demo Multi Subject Live Mock",
        "exam_type": ExamType.MOCK_EXAM,
        "duration_minutes": 90,
        "timer_mode": TimerMode.SECTION,
        "navigation_mode": NavigationMode.SEQUENTIAL,
        "attempt_policy": AttemptPolicy.SINGLE,
        "result_publish_mode": ResultPublishMode.AFTER_REVIEW,
        "review_mode": ReviewMode.ATTEMPTED_ONLY,
        "security_mode": SecurityMode.FOCUS,
        "show_result_immediately": False,
        "start_offset_minutes": -30,
        "end_offset_days": 2,
        "seed_attempt": False,
        "subjects": ("MATH10", "PHY10", "CHEM10"),
    },
    {
        "code": "DMO-MIX-PRACTICE-01",
        "title": "Demo Multi Subject Practice Loop",
        "exam_type": ExamType.PRACTICE,
        "duration_minutes": 45,
        "timer_mode": TimerMode.GLOBAL,
        "navigation_mode": NavigationMode.FREE_EXAM,
        "attempt_policy": AttemptPolicy.UNLIMITED_PRACTICE,
        "result_publish_mode": ResultPublishMode.IMMEDIATE,
        "review_mode": ReviewMode.SOLUTION_REVIEW,
        "security_mode": SecurityMode.NORMAL,
        "show_result_immediately": True,
        "start_offset_minutes": -45,
        "end_offset_days": 5,
        "seed_attempt": True,
        "subjects": ("MATH10", "PHY10", "CHEM10"),
    },
    {
        "code": "DMO-SCI-QUIZ-01",
        "title": "Demo Physics Chemistry Quiz",
        "exam_type": ExamType.QUIZ,
        "duration_minutes": 30,
        "timer_mode": TimerMode.GLOBAL,
        "navigation_mode": NavigationMode.FREE_EXAM,
        "attempt_policy": AttemptPolicy.SINGLE,
        "result_publish_mode": ResultPublishMode.IMMEDIATE,
        "review_mode": ReviewMode.ALL_QUESTIONS,
        "security_mode": SecurityMode.NORMAL,
        "show_result_immediately": True,
        "start_offset_minutes": -20,
        "end_offset_days": 3,
        "seed_attempt": False,
        "subjects": ("PHY10", "CHEM10"),
    },
)


class Command(BaseCommand):
    help = (
        "Seed a reusable three-subject demo suite for the standard demo institute accounts "
        "and prepare one completed attempt for results/analytics verification."
    )

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

        AccountProfile.objects.update_or_create(
            user=user,
            defaults={
                "role": role,
                "institute": institute,
                "student_profile": student_profile,
                "teacher_profile": teacher_profile,
                "registration_context": registration_context or {},
                "is_active": True,
            },
        )
        return user

    def _load_base_context(self):
        institute, _ = Institute.objects.get_or_create(
            code=DEMO_INSTITUTE_CODE,
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
        academic_year, _ = AcademicYear.objects.get_or_create(
            institute=institute,
            name=DEMO_ACADEMIC_YEAR,
            defaults={
                "start_date": timezone.localdate() - timedelta(days=30),
                "end_date": timezone.localdate() + timedelta(days=330),
                "is_current": True,
                "is_active": True,
            },
        )
        if not academic_year.is_current or not academic_year.is_active:
            academic_year.is_current = True
            academic_year.is_active = True
            academic_year.save(update_fields=["is_current", "is_active", "updated_at"])

        program, _ = Program.objects.get_or_create(
            institute=institute,
            code="CLS10F",
            defaults={
                "name": "Class 10 Foundation",
                "category": "school",
                "description": "Demo program for multi-subject suite validation.",
                "sort_order": 1,
                "is_active": True,
            },
        )
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
        if cohort.program_id != program.id or cohort.academic_year_id != academic_year.id:
            cohort.program = program
            cohort.academic_year = academic_year
            cohort.is_active = True
            cohort.save(update_fields=["program", "academic_year", "is_active", "updated_at"])

        teacher, _ = TeacherProfile.objects.get_or_create(
            institute=institute,
            employee_code="TCH001",
            defaults={
                "first_name": "Neha",
                "last_name": "Kapoor",
                "email": "neha@example.com",
                "specialization": "Science and Mathematics",
                "is_active": True,
            },
        )
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
        student_changed = False
        if student.academic_year_id != academic_year.id:
            student.academic_year = academic_year
            student_changed = True
        if student.program_id != program.id:
            student.program = program
            student_changed = True
        if student.cohort_id != cohort.id:
            student.cohort = cohort
            student_changed = True
        if student_changed:
            student.is_active = True
            student.save(update_fields=["academic_year", "program", "cohort", "is_active", "updated_at"])
        return {
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
            "teacher": teacher,
            "student": student,
        }

    def _ensure_subject_bundle(self, *, institute, program, teacher, academic_year, cohort):
        subjects = {}
        questions = {}

        for blueprint in SUBJECT_BLUEPRINTS:
            subject, _ = Subject.objects.update_or_create(
                institute=institute,
                code=blueprint["code"],
                defaults={
                    "program": program,
                    "name": blueprint["name"],
                    "description": f"{blueprint['name']} demo subject for multi-subject validation.",
                    "sort_order": blueprint["sort_order"],
                    "is_active": True,
                },
            )
            topic, _ = Topic.objects.update_or_create(
                subject=subject,
                code=blueprint["topic_code"],
                defaults={
                    "institute": institute,
                    "name": blueprint["topic_name"],
                    "description": f"{blueprint['name']} demo topic.",
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "sort_order": 1,
                    "is_active": True,
                },
            )
            TeacherAssignment.objects.update_or_create(
                institute=institute,
                teacher=teacher,
                academic_year=academic_year,
                program=program,
                cohort=cohort,
                subject=subject,
                assignment_role=AssignmentRole.MAIN_TEACHER,
                defaults={"is_primary": True, "is_active": True},
            )
            question, _ = Question.objects.update_or_create(
                institute=institute,
                program=program,
                subject=subject,
                topic=topic,
                question_text=blueprint["question_text"],
                defaults={
                    "created_by_teacher": teacher,
                    "question_type": QuestionType.MCQ_SINGLE,
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "content_format": ContentFormat.PLAIN_TEXT,
                    "explanation": f"Seeded {blueprint['name']} explanation.",
                    "default_marks": blueprint["marks"],
                    "negative_marks": blueprint["negative_marks"],
                    "is_verified": True,
                    "metadata": {
                        "seed_batch": SEED_BATCH,
                        "subject_code": blueprint["code"],
                    },
                    "is_active": True,
                },
            )
            QuestionOption.objects.filter(question=question).delete()
            option_rows = [
                (blueprint["correct_option"], True),
                *[(option_text, False) for option_text in blueprint["wrong_options"]],
            ]
            for index, (option_text, is_correct) in enumerate(option_rows, start=1):
                QuestionOption.objects.create(
                    question=question,
                    option_text=option_text,
                    option_order=index,
                    is_correct=is_correct,
                    is_active=True,
                )

            subjects[subject.code] = subject
            questions[subject.code] = question

        return subjects, questions

    def _reset_seeded_exams(self, institute):
        seeded_codes = [blueprint["code"] for blueprint in EXAM_BLUEPRINTS]
        Exam.objects.filter(institute=institute, code__in=seeded_codes).delete()

    def _create_exam(self, *, context, subjects, questions, blueprint):
        now = timezone.now()
        primary_subject = subjects[blueprint["subjects"][0]]
        exam = Exam.objects.create(
            institute=context["institute"],
            academic_year=context["academic_year"],
            program=context["program"],
            cohort=context["cohort"],
            subject=primary_subject,
            title=blueprint["title"],
            code=blueprint["code"],
            description="Seeded demo exam for full institute/teacher/student/admin verification.",
            exam_type=blueprint["exam_type"],
            delivery_mode=DeliveryMode.ONLINE,
            status="draft",
            duration_minutes=blueprint["duration_minutes"],
            total_marks=Decimal("0.00"),
            passing_marks=Decimal("0.00"),
            start_at=now + timedelta(minutes=blueprint["start_offset_minutes"]),
            end_at=now + timedelta(days=blueprint["end_offset_days"]),
            instructions="Seeded by seed_demo_multi_subject_suite.",
            allow_late_submit=False,
            randomize_questions=False,
            randomize_options=False,
            show_result_immediately=blueprint["show_result_immediately"],
            allow_review_after_submit=True,
            max_attempts=1,
            timer_mode=blueprint["timer_mode"],
            navigation_mode=blueprint["navigation_mode"],
            attempt_policy=blueprint["attempt_policy"],
            result_publish_mode=blueprint["result_publish_mode"],
            review_mode=blueprint["review_mode"],
            security_mode=blueprint["security_mode"],
            source_type=ExamSourceType.TEACHER,
            source_teacher=context["teacher"],
            assignment_mode=AssignmentMode.SELECTED_STUDENTS,
            allow_resume=True,
            allow_section_switching=blueprint["navigation_mode"] != NavigationMode.SEQUENTIAL,
            allow_return_to_previous_section=blueprint["navigation_mode"] != NavigationMode.SEQUENTIAL,
            metadata={
                "seed_batch": SEED_BATCH,
                "suite": "demo_multi_subject",
                "subject_codes": list(blueprint["subjects"]),
            },
            is_active=True,
        )

        question_order = 1
        section_duration = max(int(blueprint["duration_minutes"] / max(len(blueprint["subjects"]), 1)), 10)
        for section_order, subject_code in enumerate(blueprint["subjects"], start=1):
            subject = subjects[subject_code]
            question = questions[subject_code]
            section = ExamSection.objects.create(
                exam=exam,
                subject=subject,
                name=f"{subject.name} Section",
                description=f"{subject.name} questions",
                section_order=section_order,
                instructions=f"Answer the {subject.name.lower()} section carefully.",
                total_questions=1,
                marks_per_question=question.default_marks,
                negative_marks_per_question=question.negative_marks,
                timer_enabled=blueprint["timer_mode"] == TimerMode.SECTION,
                duration_minutes=section_duration if blueprint["timer_mode"] == TimerMode.SECTION else None,
                allow_skip_section=blueprint["navigation_mode"] != NavigationMode.SEQUENTIAL,
                lock_after_submit=blueprint["navigation_mode"] == NavigationMode.SEQUENTIAL,
                is_active=True,
            )
            ExamQuestion.objects.create(
                exam=exam,
                question=question,
                section=section,
                section_name=section.name,
                question_order=question_order,
                marks=question.default_marks,
                negative_marks=question.negative_marks,
                is_mandatory=True,
                is_active=True,
            )
            question_order += 1

        sync_total_marks_from_questions(exam)
        exam.refresh_from_db()
        exam.passing_marks = (exam.total_marks / Decimal("3")).quantize(Decimal("0.01"))
        exam.save(update_fields=["passing_marks", "updated_at"])
        exam = publish_exam(exam, changed_by=context["teacher"], remarks="Seed multi-subject demo suite")
        exam = refresh_exam_status(exam, at_time=timezone.now(), changed_by=context["teacher"])
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=context["student"],
            assigned_by=context["teacher"],
            notes="Seeded multi-subject demo assignment.",
            is_active=True,
        )
        return exam

    def _seed_completed_practice_attempt(self, exam, student):
        StudentExamAttempt.objects.filter(exam=exam, student=student).delete()
        ExamResult.objects.filter(exam=exam, student=student).delete()

        attempt = start_attempt(student, exam)
        exam_questions = list(
            exam.exam_questions.filter(is_active=True)
            .select_related("question")
            .order_by("question_order", "created_at")
        )
        for exam_question in exam_questions:
            question = exam_question.question
            correct_option = question.options.filter(is_correct=True, is_active=True).order_by("option_order").first()
            save_answer(
                attempt=attempt,
                question=question,
                selected_option=correct_option,
                time_spent_seconds=25,
            )
        attempt = submit_attempt(attempt)
        calculate_student_topic_performance(exam, student, attempt)
        calculate_exam_ranks(exam)
        calculate_exam_performance_summary(exam)
        return attempt

    @transaction.atomic
    def handle(self, *args, **options):
        context = self._load_base_context()
        self._ensure_demo_user(
            username="demo-platform-admin",
            password=DEMO_PASSWORD,
            role=AccountRole.PLATFORM_ADMIN,
        )
        self._ensure_demo_user(
            username="demo-institute-admin",
            password=DEMO_PASSWORD,
            role=AccountRole.INSTITUTE_ADMIN,
            institute=context["institute"],
        )
        self._ensure_demo_user(
            username="demo-teacher",
            password=DEMO_PASSWORD,
            role=AccountRole.TEACHER,
            institute=context["institute"],
            teacher_profile=context["teacher"],
        )
        self._ensure_demo_user(
            username="demo-student",
            password=DEMO_PASSWORD,
            role=AccountRole.STUDENT,
            institute=context["institute"],
            student_profile=context["student"],
            registration_context={
                "role": "student",
                "class_level": "10",
                "board": "CBSE",
                "exam_interest": "School and entrance prep",
                "subject_interests": [blueprint["name"] for blueprint in SUBJECT_BLUEPRINTS],
                "school_name": context["institute"].name,
                "school_code": context["institute"].code,
            },
        )

        subjects, questions = self._ensure_subject_bundle(
            institute=context["institute"],
            program=context["program"],
            teacher=context["teacher"],
            academic_year=context["academic_year"],
            cohort=context["cohort"],
        )
        self._reset_seeded_exams(context["institute"])

        created_exams = []
        seeded_attempt = None
        for blueprint in EXAM_BLUEPRINTS:
            exam = self._create_exam(
                context=context,
                subjects=subjects,
                questions=questions,
                blueprint=blueprint,
            )
            created_exams.append(exam)
            if blueprint["seed_attempt"]:
                seeded_attempt = self._seed_completed_practice_attempt(exam, context["student"])

        self.stdout.write(self.style.SUCCESS("Demo multi-subject suite is ready"))
        self.stdout.write(f"Institute: {context['institute'].name} ({context['institute'].code})")
        self.stdout.write(f"Teacher login: demo-teacher / {DEMO_PASSWORD}")
        self.stdout.write(f"Student login: demo-student / {DEMO_PASSWORD}")
        self.stdout.write("Seeded subjects: Mathematics, Physics, Chemistry")
        for exam in created_exams:
            self.stdout.write(f"- {exam.code}: {exam.title}")
        if seeded_attempt is not None:
            self.stdout.write(
                f"Completed attempt ready: exam={seeded_attempt.exam.code} attempt_no={seeded_attempt.attempt_no}"
            )
