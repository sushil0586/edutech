from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.academics.models import AcademicYear, AssessmentFamily, Cohort, Program, Subject, Topic, TopicDifficulty
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
from apps.results.services import (
    calculate_exam_performance_summary,
    calculate_exam_ranks,
    calculate_student_topic_performance,
)
from apps.students.models import StudentProfile
from apps.teachers.models import AssignmentRole, TeacherAssignment, TeacherProfile


User = get_user_model()

DEMO_PASSWORD = "Demo@12345"
DEMO_INSTITUTE_CODE = "DLI001"
DEMO_ACADEMIC_YEAR = "2026-2027"
SEED_BATCH = "demo_aws_suite_v1"

QUESTION_BLUEPRINTS = (
    {
        "question_text": "Which AWS service stores files as objects?",
        "correct_option": "Amazon S3",
        "wrong_options": ["Amazon EC2", "Amazon RDS", "Amazon CloudFront"],
    },
    {
        "question_text": "Which AWS pricing model helps reduce cost for steady long-term usage?",
        "correct_option": "Reserved Instances",
        "wrong_options": ["On-Demand only", "Data transfer plan", "Spot alarm"],
    },
    {
        "question_text": "Which AWS service is primarily used for DNS routing?",
        "correct_option": "Amazon Route 53",
        "wrong_options": ["Amazon VPC", "AWS Shield", "Amazon Athena"],
    },
)

EXAM_BLUEPRINTS = (
    {
        "code": "DMO-AWS-PRACTICE-01",
        "title": "Demo AWS Practitioner Practice 01",
        "exam_type": ExamType.PRACTICE,
        "duration_minutes": 45,
        "timer_mode": TimerMode.GLOBAL,
        "navigation_mode": NavigationMode.FREE_EXAM,
        "attempt_policy": AttemptPolicy.UNLIMITED_PRACTICE,
        "result_publish_mode": ResultPublishMode.IMMEDIATE,
        "review_mode": ReviewMode.SOLUTION_REVIEW,
        "security_mode": SecurityMode.NORMAL,
        "show_result_immediately": True,
        "start_offset_minutes": -30,
        "end_offset_days": 3,
        "seed_attempt": False,
    },
    {
        "code": "DMO-AWS-RESULT-01",
        "title": "Demo AWS Practitioner Result 01",
        "exam_type": ExamType.PRACTICE,
        "duration_minutes": 45,
        "timer_mode": TimerMode.GLOBAL,
        "navigation_mode": NavigationMode.FREE_EXAM,
        "attempt_policy": AttemptPolicy.UNLIMITED_PRACTICE,
        "result_publish_mode": ResultPublishMode.IMMEDIATE,
        "review_mode": ReviewMode.SOLUTION_REVIEW,
        "security_mode": SecurityMode.NORMAL,
        "show_result_immediately": True,
        "start_offset_minutes": -60,
        "end_offset_days": 5,
        "seed_attempt": True,
    },
)


class Command(BaseCommand):
    help = (
        "Seed a dedicated AWS certification practice suite with one live practice set and one "
        "published result-ready set for cross-role verification."
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

        certification_family = AssessmentFamily.objects.get(code="certification")
        program, _ = Program.objects.get_or_create(
            institute=institute,
            code="AWS26",
            defaults={
                "assessment_family": certification_family,
                "name": "AWS 2026 Practitioner Prep",
                "category": "certification",
                "description": "Dedicated AWS seeded demo program for practice-first validation.",
                "sort_order": 23,
                "is_active": True,
            },
        )
        program_changed = False
        if program.assessment_family_id != certification_family.id:
            program.assessment_family = certification_family
            program_changed = True
        if program.category != "certification":
            program.category = "certification"
            program_changed = True
        if not program.is_active:
            program.is_active = True
            program_changed = True
        if program_changed:
            program.save(update_fields=["assessment_family", "category", "is_active", "updated_at"])

        cohort, _ = Cohort.objects.get_or_create(
            institute=institute,
            code="AWSA",
            defaults={
                "program": program,
                "academic_year": academic_year,
                "name": "AWS Alpha Batch",
                "capacity": 100,
                "is_active": True,
            },
        )
        if cohort.program_id != program.id or cohort.academic_year_id != academic_year.id or not cohort.is_active:
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
                "specialization": "Cloud certification preparation",
                "is_active": True,
            },
        )
        student, _ = StudentProfile.objects.get_or_create(
            institute=institute,
            admission_no="STU-AWS-001",
            defaults={
                "academic_year": academic_year,
                "program": program,
                "cohort": cohort,
                "first_name": "Ava",
                "last_name": "Shah",
                "email": "ava.aws@example.com",
                "guardian_name": "Demo Guardian",
                "guardian_phone": "8888888885",
                "is_active": True,
            },
        )
        student_changed = False
        if student.program_id != program.id:
            student.program = program
            student_changed = True
        if student.cohort_id != cohort.id:
            student.cohort = cohort
            student_changed = True
        if student.academic_year_id != academic_year.id:
            student.academic_year = academic_year
            student_changed = True
        if not student.is_active:
            student.is_active = True
            student_changed = True
        if student_changed:
            student.save(update_fields=["academic_year", "program", "cohort", "is_active", "updated_at"])

        return {
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
            "teacher": teacher,
            "student": student,
        }

    def _ensure_practice_bundle(self, *, institute, program, teacher, academic_year, cohort):
        subject, _ = Subject.objects.update_or_create(
            institute=institute,
            code="AWSCP",
            defaults={
                "program": program,
                "name": "AWS Cloud Practitioner",
                "description": "AWS certification demo subject.",
                "sort_order": 1,
                "is_active": True,
            },
        )
        topic, _ = Topic.objects.update_or_create(
            subject=subject,
            code="AWS-CC-01",
            defaults={
                "institute": institute,
                "name": "Cloud Concepts",
                "description": "AWS practitioner demo topic.",
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

        questions = []
        for question_order, question_blueprint in enumerate(QUESTION_BLUEPRINTS, start=1):
            question, _ = Question.objects.update_or_create(
                institute=institute,
                program=program,
                subject=subject,
                topic=topic,
                question_text=question_blueprint["question_text"],
                defaults={
                    "created_by_teacher": teacher,
                    "question_type": QuestionType.MCQ_SINGLE,
                    "difficulty_level": TopicDifficulty.INTERMEDIATE,
                    "content_format": ContentFormat.PLAIN_TEXT,
                    "explanation": f"Seeded AWS explanation for question {question_order}.",
                    "default_marks": Decimal("1.00"),
                    "negative_marks": Decimal("0.00"),
                    "is_verified": True,
                    "metadata": {
                        "seed_batch": SEED_BATCH,
                        "exam_family_id": "aws_certification",
                        "question_order": question_order,
                    },
                    "is_active": True,
                },
            )
            QuestionOption.objects.filter(question=question).delete()
            option_rows = [
                (question_blueprint["correct_option"], True),
                *[(option_text, False) for option_text in question_blueprint["wrong_options"]],
            ]
            for option_index, (option_text, is_correct) in enumerate(option_rows, start=1):
                QuestionOption.objects.create(
                    question=question,
                    option_text=option_text,
                    option_order=option_index,
                    is_correct=is_correct,
                    is_active=True,
                )
            questions.append(question)

        return subject, questions

    def _reset_seeded_exams(self, institute):
        seeded_codes = [blueprint["code"] for blueprint in EXAM_BLUEPRINTS]
        Exam.objects.filter(institute=institute, code__in=seeded_codes).delete()

    def _create_exam(self, *, context, subject, questions, blueprint):
        now = timezone.now()
        exam = Exam.objects.create(
            institute=context["institute"],
            academic_year=context["academic_year"],
            program=context["program"],
            cohort=context["cohort"],
            subject=subject,
            title=blueprint["title"],
            code=blueprint["code"],
            description="Seeded AWS practitioner practice set for cross-role validation.",
            exam_type=blueprint["exam_type"],
            delivery_mode=DeliveryMode.ONLINE,
            status="draft",
            duration_minutes=blueprint["duration_minutes"],
            total_marks=Decimal("0.00"),
            passing_marks=Decimal("0.00"),
            start_at=now + timedelta(minutes=blueprint["start_offset_minutes"]),
            end_at=now + timedelta(days=blueprint["end_offset_days"]),
            instructions="Seeded by seed_demo_aws_suite.",
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
            allow_section_switching=True,
            allow_return_to_previous_section=True,
            metadata={
                "seed_batch": SEED_BATCH,
                "suite": "demo_aws",
                "exam_family_id": "aws_certification",
                "preset_pack_code": "aws_practitioner",
                "experience_profile": {
                    "learner_summary": "Certification prep flow optimized for repetition, confidence, and immediate feedback.",
                    "creator_summary": "Use this seeded practice set to validate practice-first immediate result and review behavior.",
                    "recommended_timer_mode": "global",
                    "recommended_navigation_mode": "free_exam",
                },
            },
            is_active=True,
        )

        section = ExamSection.objects.create(
            exam=exam,
            subject=subject,
            name="Cloud Concepts",
            description="AWS practitioner practice section",
            section_order=1,
            instructions="Work through this AWS domain practice set with quick-feedback intent.",
            total_questions=len(questions),
            marks_per_question=Decimal("1.00"),
            negative_marks_per_question=Decimal("0.00"),
            timer_enabled=False,
            duration_minutes=None,
            allow_skip_section=True,
            lock_after_submit=False,
            is_active=True,
        )
        for question_order, question in enumerate(questions, start=1):
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

        sync_total_marks_from_questions(exam)
        exam.refresh_from_db()
        exam.passing_marks = Decimal("0.00")
        exam.save(update_fields=["passing_marks", "updated_at"])
        exam = publish_exam(exam, changed_by=context["teacher"], remarks="Seed AWS practice suite")
        exam = refresh_exam_status(exam, at_time=timezone.now(), changed_by=context["teacher"])
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=context["student"],
            assigned_by=context["teacher"],
            notes="Seeded AWS demo assignment.",
            is_active=True,
        )
        return exam

    def _seed_completed_result_attempt(self, exam, student):
        StudentExamAttempt.objects.filter(exam=exam, student=student).delete()
        ExamResult.objects.filter(exam=exam, student=student).delete()

        attempt = start_attempt(student, exam)
        exam_questions = list(
            exam.exam_questions.filter(is_active=True).select_related("question").order_by("question_order", "created_at")
        )
        for exam_question in exam_questions[:-1]:
            question = exam_question.question
            correct_option = question.options.filter(is_correct=True, is_active=True).order_by("option_order").first()
            if correct_option is not None:
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
            username="demo-aws-student",
            password=DEMO_PASSWORD,
            role=AccountRole.STUDENT,
            institute=context["institute"],
            student_profile=context["student"],
            registration_context={
                "role": "student",
                "exam_interest": "AWS certification",
                "target_lane": "aws_certification",
                "subject_interests": ["AWS Cloud Practitioner"],
                "coaching_name": context["institute"].name,
                "coaching_code": context["institute"].code,
            },
        )

        subject, questions = self._ensure_practice_bundle(
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
                subject=subject,
                questions=questions,
                blueprint=blueprint,
            )
            created_exams.append(exam)
            if blueprint["seed_attempt"]:
                seeded_attempt = self._seed_completed_result_attempt(exam, context["student"])

        self.stdout.write(self.style.SUCCESS("Demo AWS suite is ready"))
        self.stdout.write(f"Institute: {context['institute'].name} ({context['institute'].code})")
        self.stdout.write(f"Teacher login: demo-teacher / {DEMO_PASSWORD}")
        self.stdout.write(f"Student login: demo-aws-student / {DEMO_PASSWORD}")
        self.stdout.write("Seeded family: AWS Certification")
        self.stdout.write("Seeded subject: AWS Cloud Practitioner")
        for exam in created_exams:
            self.stdout.write(f"- {exam.code}: {exam.title}")
        if seeded_attempt is not None:
            self.stdout.write(
                f"Completed result-ready attempt: exam={seeded_attempt.exam.code} attempt_no={seeded_attempt.attempt_no}"
            )
