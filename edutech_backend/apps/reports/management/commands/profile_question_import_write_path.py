import json
from time import perf_counter
from uuid import uuid4

from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext
from django.core.management.base import BaseCommand

from apps.question_bank.services import (
    import_bulk_question_passages,
    import_bulk_questions,
    preview_bulk_question_import,
    preview_bulk_question_passage_import,
)
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = (
        "Profile question-bank import preview/finalize write paths for disposable "
        "question and comprehension passage imports."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--repeat",
            type=int,
            default=1,
            help="Number of disposable profiling runs to capture.",
        )
        parser.add_argument(
            "--rows",
            type=int,
            default=5,
            help="Number of rows to preview/finalize per scenario.",
        )

    def handle(self, *args, **options):
        repeat = max(int(options["repeat"] or 1), 1)
        row_count = max(int(options["rows"] or 1), 1)
        report = {
            "repeat": repeat,
            "rows": row_count,
            "scenario": "disposable_question_import_write_path",
            "steps": [],
        }

        for _ in range(repeat):
            report["steps"].append(self._profile_disposable_flow(row_count=row_count))

        self.stdout.write(json.dumps(report, indent=2, default=str))

    def _profile_disposable_flow(self, *, row_count):
        with transaction.atomic():
            context = self._build_unique_flow_entities()
            passage_rows = self._build_passage_rows(context, row_count=row_count)
            question_rows = self._build_question_rows(context, row_count=row_count)

            run = {}

            passage_preview_measure = self._measure(
                lambda: preview_bulk_question_passage_import(
                    institute=context["institute"],
                    rows=passage_rows,
                    created_by=context["teacher"],
                )
            )
            passage_preview_payload = passage_preview_measure.pop("_result")
            passage_preview_measure["valid_rows"] = passage_preview_payload["valid_rows"]
            passage_preview_measure["invalid_rows"] = passage_preview_payload["invalid_rows"]
            run["preview_passage_import"] = passage_preview_measure

            passage_finalize_measure = self._measure(
                lambda: import_bulk_question_passages(
                    institute=context["institute"],
                    preview_payload=passage_preview_payload,
                    created_by=context["teacher"],
                )
            )
            passage_finalize_result = passage_finalize_measure.pop("_result")
            passage_finalize_measure["created_count"] = passage_finalize_result["created_count"]
            passage_finalize_measure["failed_count"] = passage_finalize_result["failed_count"]
            run["finalize_passage_import"] = passage_finalize_measure

            question_preview_measure = self._measure(
                lambda: preview_bulk_question_import(
                    institute=context["institute"],
                    rows=question_rows,
                    created_by=context["teacher"],
                )
            )
            question_preview_payload = question_preview_measure.pop("_result")
            question_preview_measure["valid_rows"] = question_preview_payload["valid_rows"]
            question_preview_measure["invalid_rows"] = question_preview_payload["invalid_rows"]
            run["preview_question_import"] = question_preview_measure

            question_finalize_measure = self._measure(
                lambda: import_bulk_questions(
                    institute=context["institute"],
                    preview_payload=question_preview_payload,
                    created_by=context["teacher"],
                )
            )
            question_finalize_result = question_finalize_measure.pop("_result")
            question_finalize_measure["created_count"] = question_finalize_result["created_count"]
            question_finalize_measure["failed_count"] = question_finalize_result["failed_count"]
            run["finalize_question_import"] = question_finalize_measure

            transaction.set_rollback(True)
            return run

    def _build_unique_flow_entities(self):
        builder = AcademicAssessmentBuilder()
        suffix = uuid4().hex[:8].upper()
        institute = builder.create_institute(
            code=f"QIMP{suffix}",
            name=f"Question Import Profiling Institute {suffix}",
            email=f"question-import-{suffix.lower()}@demo.edu",
        )
        academic_year = builder.create_academic_year(
            institute,
            name=f"2026-2027-{suffix}",
        )
        program = builder.create_program(
            institute,
            code=f"QPROG{suffix}",
            name=f"Import Program {suffix}",
        )
        cohort = builder.create_cohort(
            institute,
            program,
            academic_year,
            code=f"QCOH{suffix}",
            name=f"Import Cohort {suffix}",
        )
        subject = builder.create_subject(
            institute,
            program,
            code=f"QSUB{suffix}",
            name=f"Import Subject {suffix}",
        )
        topic = builder.create_topic(
            institute,
            subject,
            code=f"QTOP{suffix}",
            name=f"Import Topic {suffix}",
        )
        teacher = builder.create_teacher(
            institute,
            employee_code=f"TCH{suffix}",
            email=f"import-teacher-{suffix.lower()}@demo.edu",
        )
        return {
            "suffix": suffix,
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
            "subject": subject,
            "topic": topic,
            "teacher": teacher,
        }

    def _build_passage_rows(self, context, *, row_count):
        rows = []
        for index in range(1, row_count + 1):
            rows.append(
                {
                    "subject": context["subject"].code,
                    "topic": context["topic"].code,
                    "title": f"Disposable Passage {index}",
                    "content_format": "plain_text",
                    "passage_text": (
                        f"Disposable comprehension passage {index} for import profiling. "
                        "Students balance both sides of an equation to isolate the unknown."
                    ),
                    "description": "Generated by profile_question_import_write_path.",
                }
            )
        return rows

    def _build_question_rows(self, context, *, row_count):
        rows = []
        for index in range(1, row_count + 1):
            rows.append(
                {
                    "subject": context["subject"].code,
                    "topic": context["topic"].code,
                    "passage_title": "",
                    "passage_order": "",
                    "question_type": "mcq_single",
                    "difficulty_level": "intermediate",
                    "question_text": f"Disposable import question {index} for profiling?",
                    "assertion_text": "",
                    "reason_text": "",
                    "matrix_left_items": "",
                    "matrix_right_items": "",
                    "option_1": "Option A",
                    "option_2": "Option B",
                    "option_3": "Option C",
                    "option_4": "Option D",
                    "correct_answer": "1",
                    "accepted_answers": "",
                    "numeric_tolerance": "",
                    "review_guidance": "",
                    "default_marks": "1.00",
                    "negative_marks": "0.00",
                    "explanation": "Generated by profile_question_import_write_path.",
                    "tags": f"profiling-tag-{index}",
                }
            )
        return rows

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
