from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.academics.models import AcademicYear, AssessmentFamily, Cohort, Program, Subject, Topic, TopicDifficulty
from apps.accounts.models import AccountProfile, AccountRole
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
from apps.students.models import StudentProfile
from apps.teachers.models import AssignmentRole, TeacherAssignment, TeacherProfile


User = get_user_model()

DEMO_PASSWORD = "Demo@12345"
SEED_BATCH = "demo_exam_family_scope_v1"
DEMO_INSTITUTE_CODE = "DLI001"
DEMO_ACADEMIC_YEAR = "2026-2027"

FAMILY_BLUEPRINTS = (
    {
        "family_code": "competitive",
        "program_name": "Demo NEET Track",
        "program_code": "DM-NEET",
        "program_category": "Competitive",
        "cohort_name": "Demo NEET Cohort",
        "cohort_code": "DM-NEET-A",
        "subject_name": "NEET Biology",
        "subject_code": "DM-NEET-BIO",
        "topic_name": "Human Physiology",
        "topic_code": "DM-NEET-BIO-01",
        "student_username": "demo-competitive-student",
        "student_admission_no": "DM-NEET-STU-01",
        "student_first_name": "Nia",
        "student_last_name": "Competitive",
        "student_email": "demo-competitive-student@demo.edu",
        "question_type": QuestionType.NUMERIC_ANSWER,
        "question_text": "Demo competitive family question: number of chambers in the human heart?",
        "exam_title": "Demo Competitive Family Mock",
        "exam_code": "DM-COMP-EXAM-01",
        "exam_type": ExamType.MOCK_EXAM,
        "duration_minutes": 180,
        "timer_mode": TimerMode.SECTION,
        "navigation_mode": NavigationMode.SEQUENTIAL,
        "attempt_policy": AttemptPolicy.SINGLE,
        "result_publish_mode": ResultPublishMode.AFTER_REVIEW,
        "review_mode": ReviewMode.ATTEMPTED_ONLY,
        "security_mode": SecurityMode.FULLSCREEN,
        "negative_marks": Decimal("1.00"),
    },
    {
        "family_code": "certification",
        "program_name": "Demo AWS Track",
        "program_code": "DM-AWS",
        "program_category": "Certification",
        "cohort_name": "Demo AWS Cohort",
        "cohort_code": "DM-AWS-A",
        "subject_name": "AWS Cloud Practitioner",
        "subject_code": "DM-AWS-CP",
        "topic_name": "Cloud Concepts",
        "topic_code": "DM-AWS-CP-01",
        "student_username": "demo-certification-student",
        "student_admission_no": "DM-AWS-STU-01",
        "student_first_name": "Ava",
        "student_last_name": "Certification",
        "student_email": "demo-certification-student@demo.edu",
        "question_type": QuestionType.SHORT_ANSWER,
        "question_text": "Demo certification family question: what does AWS stand for?",
        "exam_title": "Demo Certification Family Practice",
        "exam_code": "DM-CERT-EXAM-01",
        "exam_type": ExamType.PRACTICE,
        "duration_minutes": 90,
        "timer_mode": TimerMode.GLOBAL,
        "navigation_mode": NavigationMode.FREE_EXAM,
        "attempt_policy": AttemptPolicy.UNLIMITED_PRACTICE,
        "result_publish_mode": ResultPublishMode.IMMEDIATE,
        "review_mode": ReviewMode.SOLUTION_REVIEW,
        "security_mode": SecurityMode.NORMAL,
        "negative_marks": Decimal("0.00"),
    },
    {
        "family_code": "language_proficiency",
        "program_name": "Demo IELTS Track",
        "program_code": "DM-IELTS",
        "program_category": "Study Abroad",
        "cohort_name": "Demo IELTS Cohort",
        "cohort_code": "DM-IELTS-A",
        "subject_name": "IELTS Academic Skills",
        "subject_code": "DM-IELTS-AS",
        "topic_name": "Reading and Writing Skills",
        "topic_code": "DM-IELTS-AS-01",
        "student_username": "demo-language-student",
        "student_admission_no": "DM-IELTS-STU-01",
        "student_first_name": "Lina",
        "student_last_name": "Language",
        "student_email": "demo-language-student@demo.edu",
        "question_type": QuestionType.SHORT_ANSWER,
        "question_text": "Demo language family question: name one IELTS writing scoring criterion.",
        "accepted_answers": [
            "coherence and cohesion",
            "task achievement",
            "lexical resource",
            "grammatical range and accuracy",
        ],
        "exam_title": "Demo Language Family Mock",
        "exam_code": "DM-LANG-EXAM-01",
        "exam_type": ExamType.MOCK_EXAM,
        "duration_minutes": 120,
        "timer_mode": TimerMode.SECTION,
        "navigation_mode": NavigationMode.SEQUENTIAL,
        "attempt_policy": AttemptPolicy.SINGLE,
        "result_publish_mode": ResultPublishMode.AFTER_REVIEW,
        "review_mode": ReviewMode.ATTEMPTED_ONLY,
        "security_mode": SecurityMode.FOCUS,
        "negative_marks": Decimal("0.00"),
    },
)


class Command(BaseCommand):
    help = (
        "Seed competitive, certification, and language proficiency demo scope under Demo Learning Institute "
        "for Playwright family-lane validation."
    )

    def _ensure_demo_user(
        self,
        *,
        username,
        password,
        role,
        institute,
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

        if student_profile and user.email != student_profile.email:
            user.email = student_profile.email
            user.save(update_fields=["email"])

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

    def _ensure_program(self, institute, family, blueprint):
        sort_order_by_family = {
            "competitive": 200,
            "certification": 210,
            "language_proficiency": 220,
        }
        program, _ = Program.objects.update_or_create(
            institute=institute,
            code=blueprint["program_code"],
            defaults={
                "assessment_family": family,
                "name": blueprint["program_name"],
                "category": blueprint["program_category"],
                "description": f"{family.label} demo scope for Playwright family validation.",
                "sort_order": sort_order_by_family.get(family.code, 230),
                "is_active": True,
            },
        )
        return program

    def _ensure_cohort(self, institute, academic_year, program, blueprint):
        cohort, _ = Cohort.objects.update_or_create(
            institute=institute,
            code=blueprint["cohort_code"],
            defaults={
                "program": program,
                "academic_year": academic_year,
                "name": blueprint["cohort_name"],
                "capacity": 50,
                "is_active": True,
            },
        )
        return cohort

    def _ensure_subject(self, institute, program, blueprint):
        subject, _ = Subject.objects.update_or_create(
            institute=institute,
            code=blueprint["subject_code"],
            defaults={
                "program": program,
                "name": blueprint["subject_name"],
                "description": f"{blueprint['program_name']} demo subject.",
                "sort_order": 1,
                "is_active": True,
            },
        )
        return subject

    def _ensure_topic(self, institute, subject, blueprint):
        topic, _ = Topic.objects.update_or_create(
            subject=subject,
            code=blueprint["topic_code"],
            defaults={
                "institute": institute,
                "name": blueprint["topic_name"],
                "description": f"{blueprint['program_name']} demo topic.",
                "difficulty_level": TopicDifficulty.INTERMEDIATE,
                "sort_order": 1,
                "is_active": True,
            },
        )
        return topic

    def _ensure_student(self, institute, academic_year, program, cohort, blueprint):
        student, _ = StudentProfile.objects.update_or_create(
            institute=institute,
            admission_no=blueprint["student_admission_no"],
            defaults={
                "academic_year": academic_year,
                "program": program,
                "cohort": cohort,
                "first_name": blueprint["student_first_name"],
                "last_name": blueprint["student_last_name"],
                "email": blueprint["student_email"],
                "guardian_name": "Demo Guardian",
                "guardian_phone": "9999999999",
                "is_active": True,
            },
        )
        return student

    def _ensure_teacher_assignment(self, institute, teacher, academic_year, program, cohort, subject):
        TeacherAssignment.objects.update_or_create(
            institute=institute,
            teacher=teacher,
            academic_year=academic_year,
            program=program,
            cohort=cohort,
            subject=subject,
            assignment_role=AssignmentRole.MAIN_TEACHER,
            defaults={
                "is_primary": True,
                "is_active": True,
            },
        )

    def _ensure_question(self, institute, teacher, program, subject, topic, blueprint):
        question, _ = Question.objects.update_or_create(
            institute=institute,
            subject=subject,
            program=program,
            topic=topic,
            question_text=blueprint["question_text"],
            defaults={
                "created_by_teacher": teacher,
                "question_type": blueprint["question_type"],
                "difficulty_level": (
                    TopicDifficulty.ADVANCED
                    if blueprint["family_code"] == "competitive"
                    else TopicDifficulty.INTERMEDIATE
                ),
                "content_format": ContentFormat.PLAIN_TEXT,
                "explanation": "Demo seeded family validation question.",
                "default_marks": Decimal("4.00") if blueprint["family_code"] == "competitive" else Decimal("1.00"),
                "negative_marks": blueprint["negative_marks"],
                "is_verified": False,
                "metadata": {
                    "seed_batch": SEED_BATCH,
                    "accepted_answers": blueprint.get("accepted_answers")
                    or (
                        ["AWS", "Amazon Web Services"]
                        if blueprint["family_code"] == "certification"
                        else ["4", "four"]
                    ),
                    "numeric_tolerance": "0.01" if blueprint["family_code"] == "competitive" else None,
                },
                "is_active": True,
            },
        )

        if blueprint["question_type"] == QuestionType.NUMERIC_ANSWER:
            QuestionOption.objects.filter(question=question).delete()
        elif blueprint["question_type"] == QuestionType.SHORT_ANSWER:
            QuestionOption.objects.filter(question=question).delete()

        return question

    def _ensure_exam(self, institute, academic_year, program, cohort, subject, teacher, student, question, blueprint):
        now = timezone.now()
        start_at = now - timedelta(hours=2)
        end_at = now + timedelta(days=14)

        exam, _ = Exam.objects.update_or_create(
            institute=institute,
            code=blueprint["exam_code"],
            defaults={
                "academic_year": academic_year,
                "program": program,
                "cohort": cohort,
                "subject": subject,
                "title": blueprint["exam_title"],
                "description": f"{blueprint['program_name']} demo exam for family-aware Playwright validation.",
                "exam_type": blueprint["exam_type"],
                "delivery_mode": DeliveryMode.ONLINE,
                "status": "draft",
                "duration_minutes": blueprint["duration_minutes"],
                "passing_marks": Decimal("0.00"),
                "start_at": start_at,
                "end_at": end_at,
                "instructions": "Seeded demo family exam.",
                "allow_late_submit": False,
                "randomize_questions": False,
                "randomize_options": False,
                "show_result_immediately": blueprint["result_publish_mode"] == ResultPublishMode.IMMEDIATE,
                "allow_review_after_submit": True,
                "max_attempts": 1,
                "timer_mode": blueprint["timer_mode"],
                "navigation_mode": blueprint["navigation_mode"],
                "attempt_policy": blueprint["attempt_policy"],
                "result_publish_mode": blueprint["result_publish_mode"],
                "review_mode": blueprint["review_mode"],
                "security_mode": blueprint["security_mode"],
                "source_type": ExamSourceType.TEACHER,
                "source_teacher": teacher,
                "assignment_mode": AssignmentMode.SELECTED_STUDENTS,
                "allow_resume": True,
                "allow_section_switching": blueprint["navigation_mode"] != NavigationMode.SEQUENTIAL,
                "allow_return_to_previous_section": blueprint["navigation_mode"] != NavigationMode.SEQUENTIAL,
                "metadata": {
                    "seed_batch": SEED_BATCH,
                    "family_code": blueprint["family_code"],
                },
                "is_active": True,
            },
        )

        section, _ = ExamSection.objects.update_or_create(
            exam=exam,
            section_order=1,
            defaults={
                "name": "Core Section",
                "description": "Seeded demo family section.",
                "instructions": "Answer carefully.",
                "total_questions": 1,
                "marks_per_question": question.default_marks,
                "negative_marks_per_question": question.negative_marks,
                "timer_enabled": blueprint["timer_mode"] == TimerMode.SECTION,
                "duration_minutes": blueprint["duration_minutes"] if blueprint["timer_mode"] == TimerMode.SECTION else None,
                "allow_skip_section": blueprint["navigation_mode"] != NavigationMode.SEQUENTIAL,
                "lock_after_submit": blueprint["navigation_mode"] == NavigationMode.SEQUENTIAL,
                "is_active": True,
            },
        )

        ExamQuestion.objects.update_or_create(
            exam=exam,
            question=question,
            defaults={
                "section": section,
                "section_name": section.name,
                "question_order": 1,
                "marks": question.default_marks,
                "negative_marks": question.negative_marks,
                "is_mandatory": True,
                "is_active": True,
            },
        )

        sync_total_marks_from_questions(exam)
        exam.refresh_from_db()
        if exam.status == "draft":
            exam.passing_marks = Decimal("0.00")
            exam.save(update_fields=["passing_marks", "updated_at"])
            exam = publish_exam(exam, changed_by=teacher, remarks="Seed demo family scope")

        exam = refresh_exam_status(exam, at_time=timezone.now(), changed_by=teacher)
        ExamStudentAssignment.objects.update_or_create(
            exam=exam,
            student=student,
            defaults={
                "assigned_by": teacher,
                "notes": "Seeded demo family assignment.",
                "is_active": True,
            },
        )
        return exam

    @transaction.atomic
    def handle(self, *args, **options):
        institute = Institute.objects.get(code=DEMO_INSTITUTE_CODE)
        academic_year = AcademicYear.objects.filter(
            institute=institute,
            name=DEMO_ACADEMIC_YEAR,
            is_active=True,
        ).first()
        if academic_year is None:
            academic_year = AcademicYear.objects.filter(institute=institute, is_current=True, is_active=True).first()
        if academic_year is None:
            raise ValueError("Demo Learning Institute academic year was not found.")

        teacher_profile = TeacherProfile.objects.filter(
            institute=institute,
            employee_code="TCH001",
            is_active=True,
        ).first()
        if teacher_profile is None:
            raise ValueError("Demo teacher TCH001 was not found. Run seed_demo_academic_data first.")

        seeded_messages = []

        for blueprint in FAMILY_BLUEPRINTS:
            family = AssessmentFamily.objects.get(code=blueprint["family_code"])
            program = self._ensure_program(institute, family, blueprint)
            cohort = self._ensure_cohort(institute, academic_year, program, blueprint)
            subject = self._ensure_subject(institute, program, blueprint)
            topic = self._ensure_topic(institute, subject, blueprint)
            self._ensure_teacher_assignment(institute, teacher_profile, academic_year, program, cohort, subject)
            student = self._ensure_student(institute, academic_year, program, cohort, blueprint)
            self._ensure_demo_user(
                username=blueprint["student_username"],
                password=DEMO_PASSWORD,
                role=AccountRole.STUDENT,
                institute=institute,
                student_profile=student,
                registration_context={
                    "role": "student",
                    "exam_interest": blueprint["program_name"],
                    "program_code": blueprint["program_code"],
                    "assessment_family": blueprint["family_code"],
                },
            )
            question = self._ensure_question(institute, teacher_profile, program, subject, topic, blueprint)
            exam = self._ensure_exam(
                institute,
                academic_year,
                program,
                cohort,
                subject,
                teacher_profile,
                student,
                question,
                blueprint,
            )
            seeded_messages.append(
                f"{family.label}: program={program.code} student={blueprint['student_username']} exam={exam.code}"
            )

        self.stdout.write(self.style.SUCCESS("Demo exam family scope is ready"))
        self.stdout.write("\n".join(seeded_messages))
