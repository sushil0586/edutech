import json
from time import perf_counter
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from apps.attempts.services import save_answer, start_attempt, submit_attempt
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = "Profile the local attempt write path for start, save-answer, and submit on disposable data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--repeat",
            type=int,
            default=2,
            help="Number of disposable profiling runs to capture.",
        )

    def handle(self, *args, **options):
        repeat = max(int(options["repeat"] or 1), 1)
        report = {
            "repeat": repeat,
            "scenario": "disposable_attempt_write_path",
            "steps": [],
        }

        for _ in range(repeat):
            report["steps"].append(self._profile_disposable_flow())

        self.stdout.write(json.dumps(report, indent=2, default=str))

    def _profile_disposable_flow(self):
        with transaction.atomic():
            builder = AcademicAssessmentBuilder()
            context = self._build_unique_flow_entities(builder)
            exam = context["exam"]
            question = context["question"]
            correct_option = next(option for option in context["options"] if option.is_correct)

            run = {
                "start_attempt": self._measure(
                    lambda: start_attempt(context["student"], exam),
                )
            }
            attempt = run["start_attempt"].pop("_result")

            run["save_answer"] = self._measure(
                lambda: save_answer(
                    attempt=attempt,
                    question=question,
                    selected_option=correct_option,
                    time_spent_seconds=18,
                )
            )
            run["save_answer"].pop("_result", None)

            run["submit_attempt"] = self._measure(
                lambda: submit_attempt(attempt),
            )
            run["submit_attempt"].pop("_result", None)

            transaction.set_rollback(True)
            return run

    def _build_unique_flow_entities(self, builder):
        suffix = uuid4().hex[:8].upper()
        institute = builder.create_institute(
            name=f"Demo Learning Institute {suffix}",
            code=f"DLI{suffix}",
            email=f"hello-{suffix.lower()}@demo.edu",
        )
        academic_year = builder.create_academic_year(
            institute,
            name=f"2026-2027-{suffix}",
        )
        program = builder.create_program(
            institute,
            code=f"CLS10F-{suffix}",
        )
        cohort = builder.create_cohort(
            institute,
            program,
            academic_year,
            code=f"CLS10A-{suffix}",
        )
        subject = builder.create_subject(
            institute,
            program,
            code=f"MATH-{suffix}",
        )
        topic = builder.create_topic(
            institute,
            subject,
            code=f"ALG-{suffix}",
        )
        student = builder.create_student(
            institute,
            academic_year,
            program,
            cohort,
            admission_no=f"STU-{suffix}",
            email=f"student-{suffix.lower()}@example.com",
        )
        teacher = builder.create_teacher(
            institute,
            employee_code=f"TCH-{suffix}",
            email=f"teacher-{suffix.lower()}@example.com",
        )
        question, options = builder.create_question_with_options(
            institute,
            program,
            subject,
            topic,
            teacher,
            question_text=f"What is 2 + 2? [{suffix}]",
        )
        exam = builder.create_exam(
            institute,
            academic_year,
            program,
            cohort,
            subject,
            code=f"MATH-WT-{suffix}",
            title=f"Mathematics Weekly Test {suffix}",
            status="scheduled",
        )
        exam_question = builder.add_question_to_exam(exam, question)
        return {
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

    def _measure(self, callback):
        started = perf_counter()
        with CaptureQueriesContext(connection) as query_context:
            result = callback()
        elapsed_ms = round((perf_counter() - started) * 1000, 2)
        return {
            "elapsed_ms": elapsed_ms,
            "query_count": len(query_context),
            "query_sql_samples": self._query_sql_samples(query_context),
            "_result": result,
        }

    def _query_sql_samples(self, query_context, *, limit=5, max_length=240):
        samples = []
        for query in query_context.captured_queries[:limit]:
            sql = " ".join(str(query.get("sql", "")).split())
            if len(sql) > max_length:
                sql = f"{sql[: max_length - 3]}..."
            samples.append(sql)
        return samples
