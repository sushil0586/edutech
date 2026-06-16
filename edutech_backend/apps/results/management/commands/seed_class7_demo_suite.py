from datetime import date, timedelta
from decimal import Decimal
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.academics.models import AcademicYear, Cohort, Program, Subject
from apps.accounts.models import AccountProfile, AccountRole
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.models import Exam, ExamQuestion, ExamType
from apps.exams.services import mark_exam_completed, publish_exam, refresh_exam_status, sync_total_marks_from_questions
from apps.institutes.models import Institute
from apps.question_bank.models import Question, QuestionType
from apps.results.services import (
    calculate_exam_performance_summary,
    calculate_exam_ranks,
    calculate_student_topic_performance,
    generate_result_from_attempt,
    publish_exam_results,
)
from apps.students.models import StudentProfile
from apps.teachers.models import AssignmentRole, TeacherAssignment, TeacherProfile


User = get_user_model()

DEMO_BATCH = "class7_demo_suite_v1"
DEMO_INSTITUTE_CODE = "C7DEMO"
DEMO_ACADEMIC_YEAR = "2026-2027"
DEMO_PROGRAM_CODE = "CLS7"
DEMO_COHORT_CODE = "CLS7A"
DEMO_SUBJECT_CODE = "CLS7-MATH"
DEMO_PASSWORD = "Demo@12345"
ACTIVE_EXAM_END_DAYS = 10
QUESTIONS_PER_EXAM = 12

QUESTION_BANK_FILES = [
    "question_blueprints/class_7/CLASS_7_LINES_AND_ANGLES_50_QUESTION_BANK.md",
    "question_blueprints/class_7/CLASS_7_CONGRUENCE_OF_TRIANGLES_50_QUESTION_BANK.md",
    "question_blueprints/class_7/CLASS_7_PRACTICAL_GEOMETRY_50_QUESTION_BANK.md",
    "question_blueprints/class_7/CLASS_7_VISUALISING_SOLID_SHAPES_50_QUESTION_BANK.md",
    "question_blueprints/class_7/CLASS_7_SYMMETRY_50_QUESTION_BANK.md",
]

STUDENT_BLUEPRINTS = [
    {
        "admission_no": "CLS7-001",
        "username": "class7-student-1",
        "first_name": "Aanya",
        "last_name": "Sharma",
        "email": "class7.student1@demo.edu",
        "guardian_name": "Rohit Sharma",
        "guardian_phone": "9000001001",
    },
    {
        "admission_no": "CLS7-002",
        "username": "class7-student-2",
        "first_name": "Vivaan",
        "last_name": "Patel",
        "email": "class7.student2@demo.edu",
        "guardian_name": "Kavita Patel",
        "guardian_phone": "9000001002",
    },
    {
        "admission_no": "CLS7-003",
        "username": "class7-student-3",
        "first_name": "Ishita",
        "last_name": "Rao",
        "email": "class7.student3@demo.edu",
        "guardian_name": "Sandeep Rao",
        "guardian_phone": "9000001003",
    },
    {
        "admission_no": "CLS7-004",
        "username": "class7-student-4",
        "first_name": "Arjun",
        "last_name": "Nair",
        "email": "class7.student4@demo.edu",
        "guardian_name": "Divya Nair",
        "guardian_phone": "9000001004",
    },
    {
        "admission_no": "CLS7-005",
        "username": "class7-student-5",
        "first_name": "Diya",
        "last_name": "Singh",
        "email": "class7.student5@demo.edu",
        "guardian_name": "Amit Singh",
        "guardian_phone": "9000001005",
    },
]

EXAM_BLUEPRINTS = [
    {
        "code": "CLS7-PR-01",
        "title": "Class 7 Practice Drill 01",
        "exam_type": ExamType.PRACTICE,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 25,
        "mode": "active",
        "review_mode": "solution_review",
        "security_mode": "normal",
        "show_result_immediately": True,
    },
    {
        "code": "CLS7-QZ-01",
        "title": "Class 7 Quiz Challenge 01",
        "exam_type": ExamType.QUIZ,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 20,
        "mode": "active",
        "review_mode": "attempted_only",
        "security_mode": "focus",
        "show_result_immediately": True,
    },
    {
        "code": "CLS7-TS-01",
        "title": "Class 7 Topic Test 01",
        "exam_type": ExamType.TEST,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 30,
        "mode": "active",
        "review_mode": "attempted_only",
        "security_mode": "normal",
        "show_result_immediately": False,
    },
    {
        "code": "CLS7-AS-01",
        "title": "Class 7 Guided Assessment 01",
        "exam_type": ExamType.ASSESSMENT,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 35,
        "mode": "active",
        "review_mode": "all_questions",
        "security_mode": "violation_limited",
        "show_result_immediately": False,
    },
    {
        "code": "CLS7-PR-02",
        "title": "Class 7 Practice Drill 02",
        "exam_type": ExamType.PRACTICE,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 20,
        "mode": "completed",
        "review_mode": "solution_review",
        "security_mode": "normal",
        "show_result_immediately": True,
    },
    {
        "code": "CLS7-QZ-02",
        "title": "Class 7 Quiz Challenge 02",
        "exam_type": ExamType.QUIZ,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 20,
        "mode": "completed",
        "review_mode": "attempted_only",
        "security_mode": "focus",
        "show_result_immediately": False,
    },
    {
        "code": "CLS7-TS-02",
        "title": "Class 7 Topic Test 02",
        "exam_type": ExamType.TEST,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 30,
        "mode": "completed",
        "review_mode": "attempted_only",
        "security_mode": "normal",
        "show_result_immediately": False,
    },
    {
        "code": "CLS7-AS-02",
        "title": "Class 7 Guided Assessment 02",
        "exam_type": ExamType.ASSESSMENT,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 35,
        "mode": "completed",
        "review_mode": "all_questions",
        "security_mode": "violation_limited",
        "show_result_immediately": False,
    },
    {
        "code": "CLS7-MK-01",
        "title": "Class 7 Mock Exam 01",
        "exam_type": ExamType.MOCK_EXAM,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 40,
        "mode": "completed",
        "review_mode": "solution_review",
        "security_mode": "fullscreen",
        "show_result_immediately": False,
    },
    {
        "code": "CLS7-FN-01",
        "title": "Class 7 Final Exam Demo 01",
        "exam_type": ExamType.FINAL_EXAM,
        "question_count": QUESTIONS_PER_EXAM,
        "duration_minutes": 45,
        "mode": "completed",
        "review_mode": "none",
        "security_mode": "proctored",
        "show_result_immediately": False,
    },
]


class Command(BaseCommand):
    help = (
        "Seed a complete Class 7 demo suite with attachment-backed questions, "
        "10 exams, 5 student logins, and published analytics history."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        institute = self._ensure_institute()
        self._delete_previous_demo_exams(institute)
        self._seed_academics(institute)

        academic_year = AcademicYear.objects.get(institute=institute, name=DEMO_ACADEMIC_YEAR)
        program = Program.objects.get(institute=institute, code=DEMO_PROGRAM_CODE)
        cohort = self._ensure_cohort(institute, program, academic_year)
        subject = Subject.objects.get(institute=institute, code=DEMO_SUBJECT_CODE)
        teacher = self._ensure_teacher(institute)
        self._ensure_teacher_assignment(institute, academic_year, program, cohort, subject, teacher)
        students = self._ensure_students(institute, academic_year, program, cohort)
        self._seed_question_banks(institute)
        question_pool = self._question_pool(institute, subject)

        required_questions = sum(spec["question_count"] for spec in EXAM_BLUEPRINTS)
        if len(question_pool) < required_questions:
            raise ValueError(
                f"Only {len(question_pool)} seeded Class 7 Math questions are available, "
                f"but {required_questions} are required for the demo exam suite."
            )

        created_exams = []
        offset = 0
        for exam_index, spec in enumerate(EXAM_BLUEPRINTS):
            questions = question_pool[offset : offset + spec["question_count"]]
            offset += spec["question_count"]
            exam = self._build_exam(
                institute=institute,
                academic_year=academic_year,
                program=program,
                cohort=cohort,
                subject=subject,
                teacher=teacher,
                spec=spec,
                exam_index=exam_index,
                questions=questions,
            )
            created_exams.append(exam)

            if spec["mode"] == "completed":
                self._seed_completed_attempts(exam=exam, teacher=teacher, students=students, questions=questions)

        self._print_summary(institute=institute, teacher=teacher, students=students, exams=created_exams)

    def _ensure_institute(self):
        institute, _ = Institute.objects.get_or_create(
            code=DEMO_INSTITUTE_CODE,
            defaults={
                "name": "Class 7 Demo School",
                "email": "class7.demo@demo.edu",
                "phone": "9999997000",
                "city": "Bengaluru",
                "state": "Karnataka",
                "country": "India",
                "description": "Dedicated Class 7 exam and analytics demo institute.",
                "metadata": {
                    "seed_batch": DEMO_BATCH,
                    "is_demo": True,
                },
                "is_active": True,
            },
        )
        if not institute.is_active:
            institute.is_active = True
            institute.save(update_fields=["is_active", "updated_at"])
        return institute

    def _delete_previous_demo_exams(self, institute):
        Exam.objects.filter(institute=institute, metadata__seed_batch=DEMO_BATCH).delete()

    def _seed_academics(self, institute):
        sink = StringIO()
        call_command(
            "seed_institute_academics",
            institute.code,
            preset="class_7_cbse_core",
            academic_year_name=DEMO_ACADEMIC_YEAR,
            academic_year_start="2026-04-01",
            academic_year_end="2027-03-31",
            stdout=sink,
        )

    def _ensure_cohort(self, institute, program, academic_year):
        cohort, _ = Cohort.objects.update_or_create(
            institute=institute,
            code=DEMO_COHORT_CODE,
            defaults={
                "program": program,
                "academic_year": academic_year,
                "name": "Class 7-A",
                "capacity": 40,
                "is_active": True,
            },
        )
        return cohort

    def _ensure_teacher(self, institute):
        teacher, _ = TeacherProfile.objects.update_or_create(
            institute=institute,
            employee_code="CLS7-TCH-01",
            defaults={
                "first_name": "Neha",
                "last_name": "Kapoor",
                "email": "class7.teacher@demo.edu",
                "phone": "9000007001",
                "qualification": "M.Sc Mathematics",
                "specialization": "Middle School Mathematics",
                "is_active": True,
            },
        )
        self._ensure_user_profile(
            username="class7-teacher",
            email="class7.teacher@demo.edu",
            role=AccountRole.TEACHER,
            institute=institute,
            teacher_profile=teacher,
        )
        self._ensure_user_profile(
            username="class7-admin",
            email="class7.admin@demo.edu",
            role=AccountRole.INSTITUTE_ADMIN,
            institute=institute,
        )
        return teacher

    def _ensure_teacher_assignment(self, institute, academic_year, program, cohort, subject, teacher):
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

    def _ensure_students(self, institute, academic_year, program, cohort):
        students = []
        for blueprint in STUDENT_BLUEPRINTS:
            student, _ = StudentProfile.objects.update_or_create(
                institute=institute,
                admission_no=blueprint["admission_no"],
                defaults={
                    "academic_year": academic_year,
                    "program": program,
                    "cohort": cohort,
                    "first_name": blueprint["first_name"],
                    "last_name": blueprint["last_name"],
                    "email": blueprint["email"],
                    "guardian_name": blueprint["guardian_name"],
                    "guardian_phone": blueprint["guardian_phone"],
                    "date_of_birth": date(2013, 1, 1) + timedelta(days=len(students) * 90),
                    "is_active": True,
                },
            )
            self._ensure_user_profile(
                username=blueprint["username"],
                email=blueprint["email"],
                role=AccountRole.STUDENT,
                institute=institute,
                student_profile=student,
                registration_context={
                    "role": "student",
                    "class_level": "7",
                    "board": "CBSE",
                    "exam_interest": "School exams",
                    "subject_interests": ["Math", "Science", "Computer"],
                    "school_name": institute.name,
                    "school_code": institute.code,
                },
            )
            students.append(student)
        return students

    def _ensure_user_profile(
        self,
        *,
        username,
        email,
        role,
        institute=None,
        student_profile=None,
        teacher_profile=None,
        registration_context=None,
    ):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "is_active": True},
        )
        changed_fields = []
        if created or user.email != email:
            user.email = email
            changed_fields.append("email")
        if created or not user.check_password(DEMO_PASSWORD):
            user.set_password(DEMO_PASSWORD)
            changed_fields.append("password")
        if not user.is_active:
            user.is_active = True
            changed_fields.append("is_active")
        if changed_fields:
            user.save(update_fields=changed_fields)

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

    def _seed_question_banks(self, institute):
        sink = StringIO()
        for relative_path in QUESTION_BANK_FILES:
            call_command(
                "seed_class7_math_standalone_bank",
                institute.code,
                file=str((Path.cwd() / relative_path).resolve()),
                expected_count=50,
                replace_existing=True,
                stdout=sink,
            )

    def _question_pool(self, institute, subject):
        attachment_questions = list(
            Question.objects.filter(
                institute=institute,
                subject=subject,
                metadata__seed_batch="class7_math_standalone_markdown_v1",
                attachments__isnull=False,
                is_active=True,
            )
            .distinct()
            .prefetch_related("options", "attachments")
            .order_by("topic__sort_order", "metadata__seed_sequence", "created_at")
        )
        other_questions = list(
            Question.objects.filter(
                institute=institute,
                subject=subject,
                metadata__seed_batch="class7_math_standalone_markdown_v1",
                is_active=True,
            )
            .exclude(id__in=[question.id for question in attachment_questions])
            .prefetch_related("options", "attachments")
            .order_by("topic__sort_order", "metadata__seed_sequence", "created_at")
        )
        return attachment_questions + other_questions

    def _build_exam(
        self,
        *,
        institute,
        academic_year,
        program,
        cohort,
        subject,
        teacher,
        spec,
        exam_index,
        questions,
    ):
        now = timezone.now()
        if spec["mode"] == "active":
            start_at = now - timedelta(hours=2 + exam_index)
            end_at = now + timedelta(days=ACTIVE_EXAM_END_DAYS)
        else:
            start_at = now - timedelta(hours=3 + exam_index)
            end_at = now + timedelta(hours=12 + exam_index)

        exam = Exam.objects.create(
            institute=institute,
            academic_year=academic_year,
            program=program,
            cohort=cohort,
            subject=subject,
            title=spec["title"],
            code=spec["code"],
            description=(
                f"Seeded Class 7 demo exam for {spec['exam_type'].replace('_', ' ')} flows. "
                "Questions include geometry and visual reasoning attachments."
            ),
            exam_type=spec["exam_type"],
            delivery_mode="online",
            status="draft",
            duration_minutes=spec["duration_minutes"],
            total_marks=Decimal("0.00"),
            passing_marks=Decimal("0.00"),
            start_at=start_at,
            end_at=end_at,
            instructions=(
                "This is seeded demo content for QA. Some questions include diagrams/images, "
                "and the exam is safe to use for end-to-end testing."
            ),
            allow_late_submit=False,
            randomize_questions=True,
            randomize_options=True,
            show_result_immediately=spec["show_result_immediately"],
            allow_review_after_submit=spec["review_mode"] != "none",
            max_attempts=1,
            timer_mode="global",
            navigation_mode="free_exam",
            attempt_policy="single",
            result_publish_mode="immediate" if spec["show_result_immediately"] else "after_review",
            review_mode=spec["review_mode"],
            security_mode=spec["security_mode"],
            assignment_mode="scope",
            allow_resume=True,
            allow_section_switching=True,
            allow_return_to_previous_section=True,
            metadata={
                "seed_batch": DEMO_BATCH,
                "mode": spec["mode"],
                "has_visual_questions": True,
            },
            is_active=True,
        )

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
        exam.save(update_fields=["passing_marks", "updated_at"])
        exam = publish_exam(exam, changed_by=teacher, remarks="Class 7 demo suite seed publish")

        if spec["mode"] == "active":
            exam = refresh_exam_status(exam, changed_by=teacher, remarks="Class 7 demo suite go live")
        else:
            exam = refresh_exam_status(exam, at_time=start_at + timedelta(minutes=1), changed_by=teacher)
        return exam

    def _seed_completed_attempts(self, *, exam, teacher, students, questions):
        base_started_at = timezone.now() - timedelta(days=3)
        for student_index, student in enumerate(students):
            attempt = start_attempt(student, exam)
            plan = self._attempt_plan(student_index=student_index, question_count=len(questions))

            for question_index, question in enumerate(questions):
                state = plan[question_index]
                if state == "skip":
                    continue
                if state == "correct":
                    self._save_correct_answer(attempt=attempt, question=question, question_index=question_index)
                else:
                    self._save_wrong_answer(attempt=attempt, question=question, question_index=question_index)

            attempt = submit_attempt(attempt)
            attempt.started_at = base_started_at + timedelta(minutes=student_index * 7)
            attempt.submitted_at = attempt.started_at + timedelta(minutes=12 + student_index * 3)
            attempt.time_taken_seconds = int((attempt.submitted_at - attempt.started_at).total_seconds())
            attempt.save(update_fields=["started_at", "submitted_at", "time_taken_seconds", "updated_at"])

            generate_result_from_attempt(attempt)
            calculate_student_topic_performance(exam, student, attempt)

        exam.end_at = timezone.now() - timedelta(days=1)
        exam.start_at = exam.end_at - timedelta(minutes=exam.duration_minutes + 20)
        exam.save(update_fields=["start_at", "end_at", "updated_at"])
        mark_exam_completed(exam, changed_by=teacher, remarks="Class 7 demo suite completion")
        calculate_exam_ranks(exam)
        publish_exam_results(exam)
        calculate_exam_performance_summary(exam)

    def _attempt_plan(self, *, student_index, question_count):
        score_maps = [
            (8, 2),
            (7, 3),
            (6, 3),
            (5, 4),
            (4, 4),
        ]
        correct_count, wrong_count = score_maps[min(student_index, len(score_maps) - 1)]
        plan = ["skip"] * question_count
        for index in range(min(correct_count, question_count)):
            plan[index] = "correct"
        for index in range(correct_count, min(correct_count + wrong_count, question_count)):
            plan[index] = "wrong"
        return plan

    def _save_correct_answer(self, *, attempt, question, question_index):
        time_spent_seconds = 45 + (question_index % 4) * 10
        if question.question_type == QuestionType.MCQ_MULTIPLE:
            save_answer(
                attempt=attempt,
                question=question,
                selected_option_ids=self._correct_option_ids(question),
                time_spent_seconds=time_spent_seconds,
            )
            return
        if question.question_type == QuestionType.SHORT_ANSWER:
            save_answer(
                attempt=attempt,
                question=question,
                answer_text=self._correct_short_answer(question),
                time_spent_seconds=time_spent_seconds,
            )
            return
        save_answer(
            attempt=attempt,
            question=question,
            selected_option=self._correct_option(question),
            time_spent_seconds=time_spent_seconds,
        )

    def _save_wrong_answer(self, *, attempt, question, question_index):
        time_spent_seconds = 55 + (question_index % 3) * 10
        if question.question_type == QuestionType.MCQ_MULTIPLE:
            wrong_ids = self._wrong_option_ids(question)
            if wrong_ids:
                save_answer(
                    attempt=attempt,
                    question=question,
                    selected_option_ids=wrong_ids,
                    time_spent_seconds=time_spent_seconds,
                )
            return
        if question.question_type == QuestionType.SHORT_ANSWER:
            save_answer(
                attempt=attempt,
                question=question,
                answer_text="demo-wrong-answer",
                time_spent_seconds=time_spent_seconds,
            )
            return
        wrong_option = self._wrong_option(question)
        if wrong_option is not None:
            save_answer(
                attempt=attempt,
                question=question,
                selected_option=wrong_option,
                time_spent_seconds=time_spent_seconds,
            )

    def _correct_option(self, question):
        return next(option for option in question.options.all() if option.is_active and option.is_correct)

    def _wrong_option(self, question):
        return next((option for option in question.options.all() if option.is_active and not option.is_correct), None)

    def _correct_option_ids(self, question):
        return [str(option.id) for option in question.options.all() if option.is_active and option.is_correct]

    def _wrong_option_ids(self, question):
        wrong_ids = [str(option.id) for option in question.options.all() if option.is_active and not option.is_correct]
        if wrong_ids:
            return wrong_ids[:1]
        correct_ids = self._correct_option_ids(question)
        if not correct_ids:
            return []
        return correct_ids[1:] or []

    def _correct_short_answer(self, question):
        metadata = question.metadata if isinstance(question.metadata, dict) else {}
        accepted_answers = metadata.get("accepted_answers")
        if isinstance(accepted_answers, list) and accepted_answers:
            return str(accepted_answers[0])
        return "42"

    def _print_summary(self, *, institute, teacher, students, exams):
        active_exams = [exam for exam in exams if exam.metadata.get("mode") == "active"]
        completed_exams = [exam for exam in exams if exam.metadata.get("mode") == "completed"]
        self.stdout.write(self.style.SUCCESS("Class 7 demo exam suite is ready."))
        self.stdout.write(f"Institute: {institute.name} ({institute.code})")
        self.stdout.write(f"Teacher login: username=class7-teacher password={DEMO_PASSWORD}")
        self.stdout.write(f"Admin login: username=class7-admin password={DEMO_PASSWORD}")
        self.stdout.write("Student logins:")
        for blueprint in STUDENT_BLUEPRINTS:
            self.stdout.write(
                f"- {blueprint['first_name']} {blueprint['last_name']} | "
                f"{blueprint['admission_no']} | username={blueprint['username']} password={DEMO_PASSWORD}"
            )
        self.stdout.write(f"Students created: {len(students)}")
        self.stdout.write(f"Active exams ready to take now: {len(active_exams)}")
        self.stdout.write(f"Completed exams with analytics history: {len(completed_exams)}")
        self.stdout.write("Exam codes:")
        for exam in exams:
            self.stdout.write(
                f"- {exam.code} | {exam.exam_type} | {exam.status} | ends "
                f"{timezone.localtime(exam.end_at).strftime('%Y-%m-%d %H:%M')}"
            )
