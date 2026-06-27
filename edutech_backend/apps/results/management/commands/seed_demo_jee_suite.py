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
SEED_BATCH = "demo_jee_suite_v1"

SUBJECT_BLUEPRINTS = (
    {
        "code": "JEEPHY",
        "name": "Physics",
        "sort_order": 1,
        "topic_code": "JEE-PHY-MEC",
        "topic_name": "Mechanics",
        "objective_questions": (
            {
                "question_text": "The dimensional formula of impulse is:",
                "correct_option": "MLT^-1",
                "wrong_options": ["ML^2T^-2", "ML^-1T^-2", "MT^-2"],
            },
            {
                "question_text": "In projectile motion, the horizontal acceleration is:",
                "correct_option": "Zero",
                "wrong_options": ["g", "g/2", "Depends on the mass"],
            },
        ),
        "numeric_question": {
            "question_text": "A body moving at 4 m/s has mass 2 kg. Enter the momentum in kg m/s.",
            "accepted_answers": ["8"],
            "numeric_tolerance": "0.00",
        },
    },
    {
        "code": "JEECHEM",
        "name": "Chemistry",
        "sort_order": 2,
        "topic_code": "JEE-CHEM-MOL",
        "topic_name": "Mole Concept",
        "objective_questions": (
            {
                "question_text": "Avogadro number is approximately:",
                "correct_option": "6.022 x 10^23",
                "wrong_options": ["3.011 x 10^23", "9.81 x 10^23", "1.602 x 10^23"],
            },
            {
                "question_text": "The molar mass of water is:",
                "correct_option": "18 g/mol",
                "wrong_options": ["16 g/mol", "20 g/mol", "2 g/mol"],
            },
        ),
        "numeric_question": {
            "question_text": "Enter the total number of atoms in one molecule of H2SO4.",
            "accepted_answers": ["7"],
            "numeric_tolerance": "0.00",
        },
    },
    {
        "code": "JEEMATH",
        "name": "Mathematics",
        "sort_order": 3,
        "topic_code": "JEE-MATH-ALG",
        "topic_name": "Algebra",
        "objective_questions": (
            {
                "question_text": "The value of sin^2 theta + cos^2 theta is:",
                "correct_option": "1",
                "wrong_options": ["0", "2", "Depends on theta"],
            },
            {
                "question_text": "If x^2 - 5x + 6 = 0, one root is:",
                "correct_option": "2",
                "wrong_options": ["1", "4", "5"],
            },
        ),
        "numeric_question": {
            "question_text": "If 2x + 3 = 11, enter the value of x.",
            "accepted_answers": ["4"],
            "numeric_tolerance": "0.00",
        },
    },
)

EXAM_BLUEPRINTS = (
    {
        "code": "DMO-JEE-FULL-01",
        "title": "Demo JEE Full Mock 01",
        "exam_type": ExamType.MOCK_EXAM,
        "duration_minutes": 180,
        "timer_mode": TimerMode.HYBRID,
        "navigation_mode": NavigationMode.HYBRID,
        "attempt_policy": AttemptPolicy.SINGLE,
        "result_publish_mode": ResultPublishMode.AFTER_REVIEW,
        "review_mode": ReviewMode.ATTEMPTED_ONLY,
        "security_mode": SecurityMode.FULLSCREEN,
        "show_result_immediately": False,
        "allow_section_switching": True,
        "allow_return_to_previous_section": False,
        "start_offset_minutes": -30,
        "end_offset_days": 2,
        "seed_attempt": False,
    },
    {
        "code": "DMO-JEE-RESULT-01",
        "title": "Demo JEE Published Mock 01",
        "exam_type": ExamType.MOCK_EXAM,
        "duration_minutes": 180,
        "timer_mode": TimerMode.HYBRID,
        "navigation_mode": NavigationMode.HYBRID,
        "attempt_policy": AttemptPolicy.UNLIMITED_PRACTICE,
        "result_publish_mode": ResultPublishMode.IMMEDIATE,
        "review_mode": ReviewMode.ALL_QUESTIONS,
        "security_mode": SecurityMode.FULLSCREEN,
        "show_result_immediately": True,
        "allow_section_switching": True,
        "allow_return_to_previous_section": False,
        "start_offset_minutes": -60,
        "end_offset_days": 5,
        "seed_attempt": True,
    },
)


class Command(BaseCommand):
    help = (
        "Seed a dedicated JEE full-mock demo suite with objective and numeric subject sections "
        "for cross-role verification."
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
            code="JEE26",
            defaults={
                "assessment_family": competitive_family,
                "name": "JEE 2026 Foundation",
                "category": "competitive",
                "description": "Dedicated JEE seeded demo program for hybrid full-mock validation.",
                "sort_order": 21,
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
            code="JEEA",
            defaults={
                "program": program,
                "academic_year": academic_year,
                "name": "JEE Alpha Batch",
                "capacity": 200,
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
                "specialization": "Competitive science preparation",
                "is_active": True,
            },
        )
        student, _ = StudentProfile.objects.get_or_create(
            institute=institute,
            admission_no="STU-JEE-001",
            defaults={
                "academic_year": academic_year,
                "program": program,
                "cohort": cohort,
                "first_name": "Ishaan",
                "last_name": "Verma",
                "email": "ishaan.jee@example.com",
                "guardian_name": "Ritu Verma",
                "guardian_phone": "8888888887",
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

    def _ensure_subject_bundle(self, *, institute, program, teacher, academic_year, cohort):
        subjects = {}
        questions = {}

        for subject_blueprint in SUBJECT_BLUEPRINTS:
            subject, _ = Subject.objects.update_or_create(
                institute=institute,
                code=subject_blueprint["code"],
                defaults={
                    "program": program,
                    "name": subject_blueprint["name"],
                    "description": f"{subject_blueprint['name']} JEE demo subject.",
                    "sort_order": subject_blueprint["sort_order"],
                    "is_active": True,
                },
            )
            topic, _ = Topic.objects.update_or_create(
                subject=subject,
                code=subject_blueprint["topic_code"],
                defaults={
                    "institute": institute,
                    "name": subject_blueprint["topic_name"],
                    "description": f"{subject_blueprint['name']} JEE demo topic.",
                    "difficulty_level": TopicDifficulty.ADVANCED,
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

            objective_questions = []
            for question_order, question_blueprint in enumerate(subject_blueprint["objective_questions"], start=1):
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
                        "explanation": f"Seeded JEE explanation for {subject.name} objective question {question_order}.",
                        "default_marks": Decimal("4.00"),
                        "negative_marks": Decimal("1.00"),
                        "is_verified": True,
                        "metadata": {
                            "seed_batch": SEED_BATCH,
                            "exam_family_id": "jee",
                            "question_pattern": "objective",
                            "subject_code": subject_blueprint["code"],
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
                objective_questions.append(question)

            numeric_blueprint = subject_blueprint["numeric_question"]
            numeric_question, _ = Question.objects.update_or_create(
                institute=institute,
                program=program,
                subject=subject,
                topic=topic,
                question_text=numeric_blueprint["question_text"],
                defaults={
                    "created_by_teacher": teacher,
                    "question_type": QuestionType.NUMERIC_ANSWER,
                    "difficulty_level": TopicDifficulty.ADVANCED,
                    "content_format": ContentFormat.PLAIN_TEXT,
                    "explanation": f"Seeded JEE explanation for {subject.name} numeric question.",
                    "default_marks": Decimal("4.00"),
                    "negative_marks": Decimal("0.00"),
                    "is_verified": True,
                    "metadata": {
                        "seed_batch": SEED_BATCH,
                        "exam_family_id": "jee",
                        "question_pattern": "numeric",
                        "subject_code": subject_blueprint["code"],
                        "accepted_answers": numeric_blueprint["accepted_answers"],
                        "numeric_validation": {"tolerance": numeric_blueprint["numeric_tolerance"]},
                    },
                    "is_active": True,
                },
            )

            subjects[subject.code] = subject
            questions[subject.code] = {
                "objective": objective_questions,
                "numeric": numeric_question,
            }

        return subjects, questions

    def _reset_seeded_exams(self, institute):
        seeded_codes = [blueprint["code"] for blueprint in EXAM_BLUEPRINTS]
        Exam.objects.filter(institute=institute, code__in=seeded_codes).delete()

    def _create_exam(self, *, context, subjects, questions, blueprint):
        now = timezone.now()
        primary_subject = subjects["JEEMATH"]
        exam = Exam.objects.create(
            institute=context["institute"],
            academic_year=context["academic_year"],
            program=context["program"],
            cohort=context["cohort"],
            subject=primary_subject,
            title=blueprint["title"],
            code=blueprint["code"],
            description="Seeded JEE full-mock exam for cross-role validation.",
            exam_type=blueprint["exam_type"],
            delivery_mode=DeliveryMode.ONLINE,
            status="draft",
            duration_minutes=blueprint["duration_minutes"],
            total_marks=Decimal("0.00"),
            passing_marks=Decimal("0.00"),
            start_at=now + timedelta(minutes=blueprint["start_offset_minutes"]),
            end_at=now + timedelta(days=blueprint["end_offset_days"]),
            instructions="Seeded by seed_demo_jee_suite.",
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
            allow_section_switching=blueprint["allow_section_switching"],
            allow_return_to_previous_section=blueprint["allow_return_to_previous_section"],
            metadata={
                "seed_batch": SEED_BATCH,
                "suite": "demo_jee",
                "exam_family_id": "jee",
                "preset_pack_code": "jee_mains_math",
                "experience_profile": {
                    "learner_summary": "Hybrid JEE-style mock with subject-wise objective and numeric solving blocks.",
                    "creator_summary": "Use this seeded mock to validate JEE seriousness, numeric-entry posture, and multi-subject runtime shape.",
                    "recommended_timer_mode": "hybrid",
                    "recommended_navigation_mode": "hybrid",
                },
            },
            is_active=True,
        )

        question_order = 1
        section_duration = int(blueprint["duration_minutes"] / (len(SUBJECT_BLUEPRINTS) * 2))
        for subject_blueprint in SUBJECT_BLUEPRINTS:
            subject = subjects[subject_blueprint["code"]]
            subject_questions = questions[subject.code]

            objective_section = ExamSection.objects.create(
                exam=exam,
                subject=subject,
                name=f"{subject.name} Objective",
                description=f"{subject.name} JEE objective block",
                section_order=(subject_blueprint["sort_order"] * 2) - 1,
                instructions=f"Finish the {subject.name.lower()} objective block with careful time discipline.",
                total_questions=len(subject_questions["objective"]),
                marks_per_question=Decimal("4.00"),
                negative_marks_per_question=Decimal("1.00"),
                timer_enabled=True,
                duration_minutes=section_duration,
                allow_skip_section=True,
                lock_after_submit=False,
                is_active=True,
            )
            for question in subject_questions["objective"]:
                ExamQuestion.objects.create(
                    exam=exam,
                    question=question,
                    section=objective_section,
                    section_name=objective_section.name,
                    question_order=question_order,
                    marks=question.default_marks,
                    negative_marks=question.negative_marks,
                    is_mandatory=True,
                    is_active=True,
                )
                question_order += 1

            numeric_question = subject_questions["numeric"]
            numeric_section = ExamSection.objects.create(
                exam=exam,
                subject=subject,
                name=f"{subject.name} Numeric",
                description=f"{subject.name} JEE numeric block",
                section_order=subject_blueprint["sort_order"] * 2,
                instructions=f"Answer the {subject.name.lower()} numeric block without negative marking.",
                total_questions=1,
                marks_per_question=Decimal("4.00"),
                negative_marks_per_question=Decimal("0.00"),
                timer_enabled=True,
                duration_minutes=section_duration,
                allow_skip_section=True,
                lock_after_submit=False,
                is_active=True,
            )
            ExamQuestion.objects.create(
                exam=exam,
                question=numeric_question,
                section=numeric_section,
                section_name=numeric_section.name,
                question_order=question_order,
                marks=numeric_question.default_marks,
                negative_marks=numeric_question.negative_marks,
                is_mandatory=True,
                is_active=True,
            )
            question_order += 1

        sync_total_marks_from_questions(exam)
        exam.refresh_from_db()
        exam.passing_marks = Decimal("0.00")
        exam.save(update_fields=["passing_marks", "updated_at"])
        exam = publish_exam(exam, changed_by=context["teacher"], remarks="Seed JEE full mock suite")
        exam = refresh_exam_status(exam, at_time=timezone.now(), changed_by=context["teacher"])
        ExamStudentAssignment.objects.create(
            exam=exam,
            student=context["student"],
            assigned_by=context["teacher"],
            notes="Seeded JEE demo assignment.",
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
            for exam_question in exam_questions:
                question = exam_question.question
                if question.question_type == QuestionType.NUMERIC_ANSWER:
                    answer_text = str((question.metadata or {}).get("accepted_answers", [""])[0] or "")
                    save_answer(
                        attempt=attempt,
                        question=question,
                        answer_text=answer_text,
                        time_spent_seconds=45,
                    )
                    continue

                correct_option = question.options.filter(is_correct=True, is_active=True).order_by("option_order").first()
                if correct_option is not None:
                    save_answer(
                        attempt=attempt,
                        question=question,
                        selected_option=correct_option,
                        time_spent_seconds=35,
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
            username="demo-jee-student",
            password=DEMO_PASSWORD,
            role=AccountRole.STUDENT,
            institute=context["institute"],
            student_profile=context["student"],
            registration_context={
                "role": "student",
                "exam_interest": "JEE preparation",
                "target_lane": "jee",
                "subject_interests": [blueprint["name"] for blueprint in SUBJECT_BLUEPRINTS],
                "coaching_name": context["institute"].name,
                "coaching_code": context["institute"].code,
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
                seeded_attempt = self._seed_completed_result_attempt(exam, context["student"])

        self.stdout.write(self.style.SUCCESS("Demo JEE suite is ready"))
        self.stdout.write(f"Institute: {context['institute'].name} ({context['institute'].code})")
        self.stdout.write(f"Teacher login: demo-teacher / {DEMO_PASSWORD}")
        self.stdout.write(f"Student login: demo-jee-student / {DEMO_PASSWORD}")
        self.stdout.write("Seeded family: JEE")
        self.stdout.write("Seeded subjects: Physics, Chemistry, Mathematics")
        for exam in created_exams:
            self.stdout.write(f"- {exam.code}: {exam.title}")
        if seeded_attempt is not None:
            self.stdout.write(
                f"Completed result-ready attempt: exam={seeded_attempt.exam.code} attempt_no={seeded_attempt.attempt_no}"
            )
