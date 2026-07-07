import json
from time import perf_counter
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.services import mark_exam_completed, publish_exam
from apps.results.services import (
    calculate_exam_ranks,
    generate_results_for_exam,
    publish_exam_results,
)
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = "Profile the local result write path for generate, rank, and publish on disposable data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--repeat",
            type=int,
            default=1,
            help="Number of disposable profiling runs to capture.",
        )

    def handle(self, *args, **options):
        repeat = max(int(options["repeat"] or 1), 1)
        report = {
            "repeat": repeat,
            "scenario": "disposable_result_write_path",
            "steps": [],
        }

        for _ in range(repeat):
            report["steps"].append(self._profile_disposable_flow())

        self.stdout.write(json.dumps(report, indent=2, default=str))

    def _profile_disposable_flow(self):
        with transaction.atomic():
            builder = AcademicAssessmentBuilder()
            context = self._build_unique_flow_entities(builder)
            attempt = self._build_submitted_attempt(context)

            run = {
                "generate_results_for_exam": self._measure(
                    lambda: generate_results_for_exam(context["exam"]),
                )
            }
            run["generate_results_for_exam"].pop("_result", None)

            run["calculate_exam_ranks"] = self._measure(
                lambda: calculate_exam_ranks(context["exam"]),
            )
            run["calculate_exam_ranks"].pop("_result", None)

            context["exam"] = mark_exam_completed(
                context["exam"],
                changed_by=context["teacher"],
                remarks="Disposable result write-path completion",
            )

            run["publish_exam_results"] = self._measure(
                lambda: publish_exam_results(context["exam"]),
            )
            run["publish_exam_results"].pop("_result", None)

            transaction.set_rollback(True)
            return run

    def _build_submitted_attempt(self, context):
        attempt = start_attempt(context["student"], context["exam"])
        save_answer(
            attempt=attempt,
            question=context["question"],
            selected_option=context["correct_option"],
            time_spent_seconds=24,
        )
        return submit_attempt(attempt)

    def _build_unique_flow_entities(self, builder):
        suffix = uuid4().hex[:8].upper()
        institute = builder.create_institute(
            name=f"Result Profiling Institute {suffix}",
            code=f"RPI{suffix}",
            email=f"result-{suffix.lower()}@demo.edu",
        )
        academic_year = builder.create_academic_year(
            institute,
            name=f"2026-2027-{suffix}",
        )
        program = builder.create_program(
            institute,
            code=f"RSLT-{suffix}",
        )
        cohort = builder.create_cohort(
            institute,
            program,
            academic_year,
            code=f"COH-{suffix}",
        )
        subject = builder.create_subject(
            institute,
            program,
            code=f"SUB-{suffix}",
        )
        topic = builder.create_topic(
            institute,
            subject,
            code=f"TOP-{suffix}",
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
            question_text=f"What is 5 + 6? [{suffix}]",
        )
        correct_option = next(option for option in options if option.is_correct)
        exam = builder.create_exam(
            institute,
            academic_year,
            program,
            cohort,
            subject,
            code=f"RSLT-WT-{suffix}",
            title=f"Result Workflow Test {suffix}",
            status="draft",
        )
        builder.add_question_to_exam(exam, question)
        exam.passing_marks = "1.00"
        exam.save(update_fields=["passing_marks", "updated_at"])
        exam = publish_exam(
            exam,
            changed_by=teacher,
            remarks="Disposable result write-path publish",
        )
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
            "correct_option": correct_option,
            "exam": exam,
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
