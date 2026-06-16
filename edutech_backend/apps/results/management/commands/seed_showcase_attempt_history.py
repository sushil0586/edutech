from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.academics.models import AcademicYear, Cohort, Program, Subject
from apps.attempts.services import (
    log_integrity_event,
    save_answer,
    start_attempt,
    submit_attempt,
)
from apps.exams.models import Exam, ExamQuestion
from apps.exams.services import mark_exam_completed, publish_exam, sync_total_marks_from_questions
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
from apps.teachers.models import TeacherProfile


QUESTION_BATCH = "showcase_100_v1"
HISTORY_BATCH = "showcase_history_v1"

HISTORY_EXAMS = [
    {
        "code": "MATH-HISTORY-01",
        "title": "Foundation Skills Check",
        "description": "Archived baseline assessment for arithmetic and algebra readiness.",
        "exam_type": "quiz",
        "duration_minutes": 25,
        "question_count": 15,
        "days_ago": 24,
        "security_mode": "normal",
        "review_mode": "solution_review",
        "show_result_immediately": False,
    },
    {
        "code": "MATH-HISTORY-02",
        "title": "Mock Test Archive 01",
        "description": "Archived full mock showing balanced topic performance and ranking.",
        "exam_type": "mock_exam",
        "duration_minutes": 45,
        "question_count": 20,
        "days_ago": 15,
        "security_mode": "focus",
        "review_mode": "attempted_only",
        "show_result_immediately": False,
    },
    {
        "code": "MATH-HISTORY-03",
        "title": "Secure Assessment Archive",
        "description": "Archived secure exam with integrity events and an auto-submit example.",
        "exam_type": "assessment",
        "duration_minutes": 35,
        "question_count": 18,
        "days_ago": 7,
        "security_mode": "violation_limited",
        "review_mode": "none",
        "show_result_immediately": False,
    },
]

STUDENT_PROFILES = [
    {
        "admission_no": "STU001",
        "first_name": "Aarav",
        "last_name": "Sharma",
        "email": "aarav@example.com",
        "guardian_name": "Raj Sharma",
        "guardian_phone": "8888888888",
    },
    {
        "admission_no": "STU002",
        "first_name": "Vihaan",
        "last_name": "Gupta",
        "email": "vihaan@example.com",
        "guardian_name": "Pooja Gupta",
        "guardian_phone": "9000000002",
    },
    {
        "admission_no": "STU003",
        "first_name": "Anaya",
        "last_name": "Reddy",
        "email": "anaya@example.com",
        "guardian_name": "Mohan Reddy",
        "guardian_phone": "9000000003",
    },
    {
        "admission_no": "STU004",
        "first_name": "Kabir",
        "last_name": "Mehta",
        "email": "kabir@example.com",
        "guardian_name": "Sneha Mehta",
        "guardian_phone": "9000000004",
    },
]

ATTEMPT_PLANS = {
    "MATH-HISTORY-01": {
        "STU001": {"correct": 9, "wrong": 3, "skip": 3, "minutes_taken": 18},
        "STU002": {"correct": 11, "wrong": 2, "skip": 2, "minutes_taken": 16},
        "STU003": {"correct": 7, "wrong": 4, "skip": 4, "minutes_taken": 19},
        "STU004": {"correct": 5, "wrong": 6, "skip": 4, "minutes_taken": 22},
    },
    "MATH-HISTORY-02": {
        "STU001": {"correct": 12, "wrong": 4, "skip": 4, "minutes_taken": 31},
        "STU002": {"correct": 15, "wrong": 3, "skip": 2, "minutes_taken": 29},
        "STU003": {"correct": 10, "wrong": 5, "skip": 5, "minutes_taken": 34},
        "STU004": {"correct": 8, "wrong": 7, "skip": 5, "minutes_taken": 36},
    },
    "MATH-HISTORY-03": {
        "STU001": {"correct": 10, "wrong": 4, "skip": 4, "minutes_taken": 24},
        "STU002": {
            "correct": 11,
            "wrong": 3,
            "skip": 4,
            "minutes_taken": 22,
            "integrity_auto_submit": True,
        },
        "STU003": {"correct": 8, "wrong": 5, "skip": 5, "minutes_taken": 25},
        "STU004": {"correct": 6, "wrong": 7, "skip": 5, "minutes_taken": 27},
    },
}


class Command(BaseCommand):
    help = "Seed completed historical attempts and published results for realistic student analytics."

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

    def _ensure_students(self, institute, academic_year, program, cohort):
        students = {}
        for item in STUDENT_PROFILES:
            student, _ = StudentProfile.objects.get_or_create(
                institute=institute,
                admission_no=item["admission_no"],
                defaults={
                    "academic_year": academic_year,
                    "program": program,
                    "cohort": cohort,
                    "first_name": item["first_name"],
                    "last_name": item["last_name"],
                    "email": item["email"],
                    "guardian_name": item["guardian_name"],
                    "guardian_phone": item["guardian_phone"],
                    "is_active": True,
                },
            )
            students[item["admission_no"]] = student
        return students

    def _choice_question_pool(self, subject):
        return list(
            Question.objects.filter(
                subject=subject,
                is_active=True,
                metadata__seed_batch=QUESTION_BATCH,
                question_type__in=[
                    QuestionType.MCQ_SINGLE,
                    QuestionType.MCQ_MULTIPLE,
                    QuestionType.TRUE_FALSE,
                ],
            )
            .select_related("topic")
            .prefetch_related("options")
            .order_by("metadata__seed_sequence", "created_at")
        )

    def _build_exam(self, *, institute, academic_year, program, cohort, subject, teacher, spec, questions):
        Exam.objects.filter(institute=institute, code=spec["code"]).delete()
        now = timezone.now()
        start_at = now - timedelta(minutes=20)
        end_at = now + timedelta(hours=2)
        exam = Exam.objects.create(
            institute=institute,
            academic_year=academic_year,
            program=program,
            cohort=cohort,
            subject=subject,
            title=spec["title"],
            code=spec["code"],
            description=spec["description"],
            exam_type=spec["exam_type"],
            delivery_mode="online",
            status="draft",
            duration_minutes=spec["duration_minutes"],
            total_marks=Decimal("0.00"),
            passing_marks=Decimal("0.00"),
            start_at=start_at,
            end_at=end_at,
            instructions="Archived demo exam for analytics and progress history.",
            allow_late_submit=False,
            randomize_questions=True,
            randomize_options=True,
            show_result_immediately=spec["show_result_immediately"],
            allow_review_after_submit=spec["review_mode"] != "none",
            max_attempts=1,
            timer_mode="global",
            navigation_mode="free_exam",
            attempt_policy="single",
            result_publish_mode="after_review",
            review_mode=spec["review_mode"],
            security_mode=spec["security_mode"],
            assignment_mode="scope",
            allow_resume=True,
            allow_section_switching=True,
            allow_return_to_previous_section=True,
            metadata={
                "seed_batch": HISTORY_BATCH,
                "source_question_batch": QUESTION_BATCH,
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
        exam.save(update_fields=["total_marks", "passing_marks", "updated_at"])
        return publish_exam(exam, changed_by=teacher, remarks="Showcase history seed publish")

    def _correct_option(self, question):
        return next(option for option in question.options.all() if option.is_active and option.is_correct)

    def _wrong_option(self, question):
        wrong = next(
            (
                option
                for option in question.options.all()
                if option.is_active and not option.is_correct
            ),
            None,
        )
        return wrong or self._correct_option(question)

    def _correct_option_ids(self, question):
        return [
            str(option.id)
            for option in question.options.all()
            if option.is_active and option.is_correct
        ]

    def _wrong_option_ids(self, question):
        wrong = [
            str(option.id)
            for option in question.options.all()
            if option.is_active and not option.is_correct
        ]
        if wrong:
            return wrong[:1]
        correct = self._correct_option_ids(question)
        return correct[:1]

    def _submit_planned_attempt(self, *, exam, student, questions, plan, started_at):
        attempt = start_attempt(student, exam)
        ordered_questions = list(questions)
        correct_count = plan["correct"]
        wrong_count = plan["wrong"]

        for index, question in enumerate(ordered_questions):
            time_spent_seconds = 50 + (index % 4) * 10
            if index < correct_count:
                if question.question_type == QuestionType.MCQ_MULTIPLE:
                    save_answer(
                        attempt=attempt,
                        question=question,
                        selected_option_ids=self._correct_option_ids(question),
                        time_spent_seconds=time_spent_seconds,
                    )
                else:
                    save_answer(
                        attempt=attempt,
                        question=question,
                        selected_option=self._correct_option(question),
                        time_spent_seconds=time_spent_seconds,
                    )
            elif index < correct_count + wrong_count:
                if question.question_type == QuestionType.MCQ_MULTIPLE:
                    save_answer(
                        attempt=attempt,
                        question=question,
                        selected_option_ids=self._wrong_option_ids(question),
                        time_spent_seconds=time_spent_seconds,
                    )
                else:
                    save_answer(
                        attempt=attempt,
                        question=question,
                        selected_option=self._wrong_option(question),
                        time_spent_seconds=time_spent_seconds,
                    )

        if plan.get("integrity_auto_submit"):
            base_time = started_at + timedelta(minutes=10)
            for offset, event_type in enumerate(
                ["focus_lost", "visibility_hidden", "fullscreen_exited"],
                start=1,
            ):
                result = log_integrity_event(
                    attempt,
                    event_type=event_type,
                    event_at=base_time + timedelta(seconds=offset * 7),
                    metadata={"seeded": True, "reason": "showcase_history"},
                )
                attempt = result["event"].attempt
                if result["auto_submitted"]:
                    break
        else:
            attempt = submit_attempt(attempt)

        submitted_at = started_at + timedelta(minutes=plan["minutes_taken"])
        if submitted_at <= started_at:
            submitted_at = started_at + timedelta(minutes=1)
        attempt.started_at = started_at
        attempt.submitted_at = submitted_at
        attempt.time_taken_seconds = int((submitted_at - started_at).total_seconds())
        attempt.save(update_fields=["started_at", "submitted_at", "time_taken_seconds", "updated_at"])
        return attempt

    @transaction.atomic
    def handle(self, *args, **options):
        institute = self._ensure_institute()
        academic_year = self._ensure_academic_year(institute)
        program = self._ensure_program(institute)
        cohort = self._ensure_cohort(institute, program, academic_year)
        subject = self._ensure_subject(institute, program)
        teacher = self._ensure_teacher(institute)
        students = self._ensure_students(institute, academic_year, program, cohort)

        question_pool = self._choice_question_pool(subject)
        required_questions = sum(item["question_count"] for item in HISTORY_EXAMS)
        if len(question_pool) < required_questions:
            raise ValueError(
                "Not enough choice-based showcase questions found. Run `python manage.py seed_showcase_questions` first."
            )

        offset = 0
        seeded_attempts = []
        for spec in HISTORY_EXAMS:
            exam_questions = question_pool[offset : offset + spec["question_count"]]
            offset += spec["question_count"]
            exam = self._build_exam(
                institute=institute,
                academic_year=academic_year,
                program=program,
                cohort=cohort,
                subject=subject,
                teacher=teacher,
                spec=spec,
                questions=exam_questions,
            )

            base_started_at = timezone.now() - timedelta(days=spec["days_ago"], hours=2)
            for student_index, (admission_no, student) in enumerate(students.items()):
                plan = ATTEMPT_PLANS[spec["code"]][admission_no]
                started_at = base_started_at + timedelta(minutes=student_index * 5)
                attempt = self._submit_planned_attempt(
                    exam=exam,
                    student=student,
                    questions=exam_questions,
                    plan=plan,
                    started_at=started_at,
                )
                result = generate_result_from_attempt(attempt)
                calculate_student_topic_performance(exam, student, attempt)
                seeded_attempts.append((exam.code, student.admission_no, attempt.status, result.percentage))

            exam.end_at = timezone.now() - timedelta(days=max(spec["days_ago"] - 1, 1))
            exam.start_at = exam.end_at - timedelta(minutes=spec["duration_minutes"] + 10)
            exam.save(update_fields=["start_at", "end_at", "updated_at"])
            mark_exam_completed(exam, changed_by=teacher, remarks="Showcase history completion")
            calculate_exam_ranks(exam)
            publish_exam_results(exam)
            calculate_exam_performance_summary(exam)

        self.stdout.write(self.style.SUCCESS("Showcase attempt history and analytics data are ready."))
        for exam_code, admission_no, status, percentage in seeded_attempts:
            self.stdout.write(
                f"{exam_code} | {admission_no} | {status} | {percentage}%"
            )
