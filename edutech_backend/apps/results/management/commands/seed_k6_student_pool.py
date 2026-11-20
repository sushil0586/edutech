import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, call_command
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.academics.models import AcademicYear, Cohort, Program
from apps.accounts.models import AccountProfile, AccountRole, OnboardingStatus
from apps.attempts.models import AttemptStatus, StudentExamAttempt
from apps.exams.models import Exam
from apps.institutes.models import Institute
from apps.results.models import ExamResult, ResultStatus
from apps.students.models import StudentProfile


User = get_user_model()


class Command(BaseCommand):
    help = "Seed deterministic student accounts for local k6 load sanity runs."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=50)
        parser.add_argument("--prefix", default="k6-student")
        parser.add_argument("--password", default="Demo@12345")
        parser.add_argument("--institute-code", default="DLI001")
        parser.add_argument("--academic-year", default="2026-2027")
        parser.add_argument("--program-code", default="CLS10F")
        parser.add_argument("--cohort-code", default="CLS10A")
        parser.add_argument(
            "--with-results",
            action="store_true",
            help="Also seed one submitted attempt and published result per load-test student.",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Print only the k6 credentials JSON array.",
        )
        parser.add_argument(
            "--with-access-tokens",
            action="store_true",
            help="Include pre-issued JWT access tokens in the JSON payload.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = max(1, min(int(options["count"]), 500))
        prefix = str(options["prefix"]).strip() or "k6-student"
        password = str(options["password"])
        institute_code = str(options["institute_code"]).strip()

        if not Institute.objects.filter(code=institute_code).exists():
            call_command("seed_demo_academic_data", stdout=self.stdout)

        institute = Institute.objects.get(code=institute_code)
        academic_year = AcademicYear.objects.get(
            institute=institute,
            name=str(options["academic_year"]).strip(),
        )
        program = Program.objects.get(
            institute=institute,
            code=str(options["program_code"]).strip(),
        )
        cohort = Cohort.objects.filter(
            institute=institute,
            program=program,
            academic_year=academic_year,
            code=str(options["cohort_code"]).strip(),
        ).first()
        exam = None
        total_questions = 0
        if options["with_results"]:
            if not Exam.objects.filter(institute=institute, code="MATH-WT-01").exists():
                call_command("seed_demo_academic_data", stdout=self.stdout)
            exam = Exam.objects.get(institute=institute, code="MATH-WT-01")
            total_questions = max(exam.exam_questions.filter(is_active=True).count(), 1)

        credentials = []
        now = timezone.now()

        for index in range(1, count + 1):
            username = f"{prefix}-{index:03d}"
            admission_no = f"K6-{index:03d}"
            email = f"{username}@demo.edu"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": "K6",
                    "last_name": f"Student {index:03d}",
                    "is_active": True,
                },
            )
            changed_user_fields = []
            for field, value in {
                "email": email,
                "first_name": "K6",
                "last_name": f"Student {index:03d}",
                "is_active": True,
            }.items():
                if getattr(user, field) != value:
                    setattr(user, field, value)
                    changed_user_fields.append(field)
            if created or not user.check_password(password):
                user.set_password(password)
                changed_user_fields.append("password")
            if changed_user_fields:
                user.save(update_fields=sorted(set(changed_user_fields)))

            student, _ = StudentProfile.objects.update_or_create(
                institute=institute,
                admission_no=admission_no,
                defaults={
                    "academic_year": academic_year,
                    "program": program,
                    "cohort": cohort,
                    "first_name": "K6",
                    "last_name": f"Student {index:03d}",
                    "email": email,
                    "joined_at": now.date(),
                    "is_active": True,
                },
            )

            AccountProfile.objects.update_or_create(
                user=user,
                defaults={
                    "role": AccountRole.STUDENT,
                    "institute": institute,
                    "student_profile": student,
                    "teacher_profile": None,
                    "registration_context": {
                        "seed": "k6_student_pool",
                        "institute_code": institute.code,
                    },
                    "onboarding_status": OnboardingStatus.COMPLETED,
                    "profile_completion_required": False,
                    "profile_completion_completed_at": now,
                    "onboarding_role": AccountRole.STUDENT,
                    "onboarding_version": "k6-local-v1",
                    "is_active": True,
                },
            )

            if exam is not None:
                started_at = now - timedelta(minutes=index)
                submitted_at = started_at + timedelta(minutes=1)
                attempt, _ = StudentExamAttempt.objects.update_or_create(
                    exam=exam,
                    student=student,
                    attempt_no=1,
                    defaults={
                        "institute": institute,
                        "status": AttemptStatus.SUBMITTED,
                        "started_at": started_at,
                        "submitted_at": submitted_at,
                        "expires_at": submitted_at,
                        "total_questions": total_questions,
                        "attempted_questions": total_questions,
                        "correct_answers": total_questions,
                        "incorrect_answers": 0,
                        "skipped_questions": 0,
                        "score": exam.total_marks,
                        "negative_score": 0,
                        "final_score": exam.total_marks,
                        "percentage": 100,
                        "time_taken_seconds": 60,
                        "metadata": {
                            "seed": "k6_student_pool",
                            "institute_code": institute.code,
                        },
                        "is_active": True,
                    },
                )
                ExamResult.objects.update_or_create(
                    exam=exam,
                    student=student,
                    attempt=attempt,
                    defaults={
                        "institute": institute,
                        "result_status": ResultStatus.PASS,
                        "rank": index,
                        "total_marks": exam.total_marks,
                        "score": exam.total_marks,
                        "negative_score": 0,
                        "final_score": exam.total_marks,
                        "percentage": 100,
                        "correct_answers": total_questions,
                        "incorrect_answers": 0,
                        "skipped_questions": 0,
                        "time_taken_seconds": 60,
                        "published_at": now,
                        "is_published": True,
                        "metadata": {
                            "seed": "k6_student_pool",
                            "institute_code": institute.code,
                        },
                        "is_active": True,
                    },
                )
            credential = {"username": username, "password": password}
            if options["with_access_tokens"]:
                credential["access"] = str(RefreshToken.for_user(user).access_token)
            credentials.append(credential)

        if options["json"]:
            self.stdout.write(json.dumps(credentials, separators=(",", ":")))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {count} k6 student accounts for {institute.name} ({institute.code})."
            )
        )
        self.stdout.write(f"Username range: {prefix}-001 through {prefix}-{count:03d}")
        if options["with_results"]:
            self.stdout.write(f"Seeded one published result per account on {exam.code}.")
