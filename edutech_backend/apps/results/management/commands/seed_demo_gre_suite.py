from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.academics.models import AcademicYear, AssessmentFamily, Cohort, Program, Subject, Topic, TopicDifficulty
from apps.accounts.models import AccountProfile, AccountRole
from apps.attempts.models import StudentExamAttempt
from apps.attempts.services import save_answer, start_attempt, submit_attempt, switch_section
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
SEED_BATCH = "demo_gre_suite_v1"

SECTION_BLUEPRINTS = (
    {
        "name": "Quant Section 1",
        "topic_code": "GRE-Q1-ALG",
        "topic_name": "Algebra Foundations",
        "questions": (
            {
                "question_text": "If x + 3 = 11, what is the value of x?",
                "correct_option": "8",
                "wrong_options": ["6", "7", "9"],
            },
            {
                "question_text": "What is 25% of 200?",
                "correct_option": "50",
                "wrong_options": ["25", "40", "75"],
            },
            {
                "question_text": "If the average of 4 and 10 is n, what is n?",
                "correct_option": "7",
                "wrong_options": ["6", "8", "14"],
            },
        ),
    },
    {
        "name": "Quant Section 2",
        "topic_code": "GRE-Q2-AR",
        "topic_name": "Arithmetic Reasoning",
        "questions": (
            {
                "question_text": "A number increases from 80 to 100. What is the percent increase?",
                "correct_option": "25%",
                "wrong_options": ["20%", "15%", "30%"],
            },
            {
                "question_text": "If 3 pencils cost 12 dollars, what is the cost of 5 pencils at the same rate?",
                "correct_option": "20",
                "wrong_options": ["15", "18", "24"],
            },
            {
                "question_text": "The ratio of 2:5 is equivalent to which fraction?",
                "correct_option": "2/5",
                "wrong_options": ["5/2", "3/5", "2/7"],
            },
        ),
    },
)

EXAM_BLUEPRINTS = (
    {
        "code": "DMO-GRE-QUANT-01",
        "title": "Demo GRE Quant Drill 01",
        "exam_type": ExamType.ASSESSMENT,
        "duration_minutes": 70,
        "timer_mode": TimerMode.SECTION,
        "navigation_mode": NavigationMode.SEQUENTIAL,
        "attempt_policy": AttemptPolicy.SINGLE,
        "result_publish_mode": ResultPublishMode.AFTER_REVIEW,
        "review_mode": ReviewMode.ATTEMPTED_ONLY,
        "security_mode": SecurityMode.FULLSCREEN,
        "show_result_immediately": False,
        "start_offset_minutes": -30,
        "end_offset_days": 2,
        "seed_attempt": False,
    },
    {
        "code": "DMO-GRE-RESULT-01",
        "title": "Demo GRE Quant Published Drill 01",
        "exam_type": ExamType.ASSESSMENT,
        "duration_minutes": 70,
        "timer_mode": TimerMode.SECTION,
        "navigation_mode": NavigationMode.SEQUENTIAL,
        "attempt_policy": AttemptPolicy.UNLIMITED_PRACTICE,
        "result_publish_mode": ResultPublishMode.IMMEDIATE,
        "review_mode": ReviewMode.ATTEMPTED_ONLY,
        "security_mode": SecurityMode.FULLSCREEN,
        "show_result_immediately": True,
        "start_offset_minutes": -60,
        "end_offset_days": 5,
        "seed_attempt": True,
    },
)


class Command(BaseCommand):
    help = (
        "Seed a dedicated GRE quant demo suite with one live sectional drill and one "
        "published result-ready drill for cross-role verification."
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

        competitive_family = AssessmentFamily.objects.get(code="competitive")
        program, _ = Program.objects.get_or_create(
            institute=institute,
            code="GRE26",
            defaults={
                "assessment_family": competitive_family,
                "name": "GRE 2026 Quant Prep",
                "category": "competitive",
                "description": "Dedicated GRE seeded demo program for quant drill validation.",
                "sort_order": 22,
                "is_active": True,
            },
        )
        program_changed = False
        if program.assessment_family_id != competitive_family.id:
            program.assessment_family = competitive_family
            program_changed = True
        if program.category != "competitive":
            program.category = "competitive"
            program_changed = True
        if not program.is_active:
            program.is_active = True
            program_changed = True
        if program_changed:
            program.save(update_fields=["assessment_family", "category", "is_active", "updated_at"])

        cohort, _ = Cohort.objects.get_or_create(
            institute=institute,
            code="GREA",
            defaults={
                "program": program,
                "academic_year": academic_year,
                "name": "GRE Alpha Batch",
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
                "specialization": "Graduate quant preparation",
                "is_active": True,
            },
        )
        student, _ = StudentProfile.objects.get_or_create(
            institute=institute,
            admission_no="STU-GRE-001",
            defaults={
                "academic_year": academic_year,
                "program": program,
                "cohort": cohort,
                "first_name": "Mira",
                "last_name": "Patel",
                "email": "mira.gre@example.com",
                "guardian_name": "Rohit Patel",
                "guardian_phone": "8888888886",
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

    def _ensure_quant_bundle(self, *, institute, program, teacher, academic_year, cohort):
        subject, _ = Subject.objects.update_or_create(
            institute=institute,
            code="GREQMATH",
            defaults={
                "program": program,
                "name": "Quantitative Reasoning",
                "description": "GRE quant demo subject.",
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

        questions_by_section = {}
        for section_index, section_blueprint in enumerate(SECTION_BLUEPRINTS, start=1):
            topic, _ = Topic.objects.update_or_create(
                subject=subject,
                code=section_blueprint["topic_code"],
                defaults={
                    "institute": institute,
                    "name": section_blueprint["topic_name"],
                    "description": f"{section_blueprint['name']} GRE demo topic.",
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "sort_order": section_index,
                    "is_active": True,
                },
            )
            section_questions = []
            for question_order, question_blueprint in enumerate(section_blueprint["questions"], start=1):
                question, _ = Question.objects.update_or_create(
                    institute=institute,
                    program=program,
                    subject=subject,
                    topic=topic,
                    question_text=question_blueprint["question_text"],
                    defaults={
                        "created_by_teacher": teacher,
                        "question_type": QuestionType.MCQ_SINGLE,
                        "difficulty_level": TopicDifficulty.ADVANCED,
                        "content_format": ContentFormat.PLAIN_TEXT,
                        "explanation": f"Seeded GRE explanation for {section_blueprint['name']} question {question_order}.",
                        "default_marks": Decimal("1.00"),
                        "negative_marks": Decimal("0.00"),
                        "is_verified": True,
                        "metadata": {
                            "seed_batch": SEED_BATCH,
                            "exam_family_id": "gre",
                            "section_name": section_blueprint["name"],
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
                section_questions.append(question)
            questions_by_section[section_blueprint["name"]] = section_questions

        return subject, questions_by_section

    def _reset_seeded_exams(self, institute):
        seeded_codes = [blueprint["code"] for blueprint in EXAM_BLUEPRINTS]
        Exam.objects.filter(institute=institute, code__in=seeded_codes).delete()

    def _create_exam(self, *, context, subject, questions_by_section, blueprint):
        now = timezone.now()
        exam = Exam.objects.create(
            institute=context["institute"],
            academic_year=context["academic_year"],
            program=context["program"],
            cohort=context["cohort"],
            subject=subject,
            title=blueprint["title"],
            code=blueprint["code"],
            description="Seeded GRE quant drill for cross-role validation.",
            exam_type=blueprint["exam_type"],
            delivery_mode=DeliveryMode.ONLINE,
            status="draft",
            duration_minutes=blueprint["duration_minutes"],
            total_marks=Decimal("0.00"),
            passing_marks=Decimal("0.00"),
            start_at=now + timedelta(minutes=blueprint["start_offset_minutes"]),
            end_at=now + timedelta(days=blueprint["end_offset_days"]),
            instructions="Seeded by seed_demo_gre_suite.",
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
            allow_section_switching=False,
            allow_return_to_previous_section=False,
            metadata={
                "seed_batch": SEED_BATCH,
                "suite": "demo_gre",
                "exam_family_id": "gre",
                "preset_pack_code": "gre_quant",
                "advanced_builder": {
                    "reporting_contract": {
                        "family_id": "gre",
                        "score_reporting_mode": "total_score_first",
                        "sectional_reporting_ready": False,
                        "recommended_review_mode": "attempted_only",
                        "recommended_percentile_visibility_mode": "final_after_exam_closure",
                        "recommended_benchmark_visibility_mode": "peer_average_plus_percentile",
                    }
                },
                "experience_profile": {
                    "learner_summary": "Graduate-level quant simulation with disciplined section pacing and minimal distractions.",
                    "creator_summary": "Use this seeded drill to validate GRE reporting posture and structured quant runtime behavior.",
                    "recommended_timer_mode": "section",
                    "recommended_navigation_mode": "sequential",
                },
            },
            is_active=True,
        )

        question_order = 1
        for section_order, section_blueprint in enumerate(SECTION_BLUEPRINTS, start=1):
            section = ExamSection.objects.create(
                exam=exam,
                subject=subject,
                name=section_blueprint["name"],
                description=f"{section_blueprint['name']} GRE quant section",
                section_order=section_order,
                instructions=f"Complete {section_blueprint['name'].lower()} with formal pacing discipline.",
                total_questions=len(questions_by_section[section_blueprint["name"]]),
                marks_per_question=Decimal("1.00"),
                negative_marks_per_question=Decimal("0.00"),
                timer_enabled=True,
                duration_minutes=35,
                allow_skip_section=False,
                lock_after_submit=True,
                is_active=True,
            )
            for question in questions_by_section[section_blueprint["name"]]:
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
        exam.passing_marks = Decimal("0.00")
        exam.save(update_fields=["passing_marks", "updated_at"])
        exam = publish_exam(exam, changed_by=context["teacher"], remarks="Seed GRE quant suite")
        exam = refresh_exam_status(exam, at_time=timezone.now(), changed_by=context["teacher"])
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=context["student"],
            assigned_by=context["teacher"],
            notes="Seeded GRE demo assignment.",
            is_active=True,
        )
        return exam

    def _seed_completed_result_attempt(self, exam, student):
        StudentExamAttempt.objects.filter(exam=exam, student=student).delete()
        ExamResult.objects.filter(exam=exam, student=student).delete()

        attempt = start_attempt(student, exam)
        sections = list(exam.sections.filter(is_active=True).order_by("section_order", "created_at"))
        for section_index, section in enumerate(sections):
            if section_index > 0:
                attempt = switch_section(attempt, section)
            exam_questions = list(
                exam.exam_questions.filter(is_active=True, section=section)
                .select_related("question")
                .order_by("question_order", "created_at")
            )
            for question_index, exam_question in enumerate(exam_questions, start=1):
                question = exam_question.question
                correct_option = question.options.filter(is_correct=True, is_active=True).order_by("option_order").first()
                if question_index < len(exam_questions) and correct_option is not None:
                    save_answer(
                        attempt=attempt,
                        question=question,
                        selected_option=correct_option,
                        time_spent_seconds=40,
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
            username="demo-gre-student",
            password=DEMO_PASSWORD,
            role=AccountRole.STUDENT,
            institute=context["institute"],
            student_profile=context["student"],
            registration_context={
                "role": "student",
                "exam_interest": "GRE preparation",
                "target_lane": "gre",
                "subject_interests": ["Quantitative Reasoning"],
                "coaching_name": context["institute"].name,
                "coaching_code": context["institute"].code,
            },
        )

        subject, questions_by_section = self._ensure_quant_bundle(
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
                questions_by_section=questions_by_section,
                blueprint=blueprint,
            )
            created_exams.append(exam)
            if blueprint["seed_attempt"]:
                seeded_attempt = self._seed_completed_result_attempt(exam, context["student"])

        self.stdout.write(self.style.SUCCESS("Demo GRE suite is ready"))
        self.stdout.write(f"Institute: {context['institute'].name} ({context['institute'].code})")
        self.stdout.write(f"Teacher login: demo-teacher / {DEMO_PASSWORD}")
        self.stdout.write(f"Student login: demo-gre-student / {DEMO_PASSWORD}")
        self.stdout.write("Seeded family: GRE")
        self.stdout.write("Seeded subject: Quantitative Reasoning")
        for exam in created_exams:
            self.stdout.write(f"- {exam.code}: {exam.title}")
        if seeded_attempt is not None:
            self.stdout.write(
                f"Completed result-ready attempt: exam={seeded_attempt.exam.code} attempt_no={seeded_attempt.attempt_no}"
            )
