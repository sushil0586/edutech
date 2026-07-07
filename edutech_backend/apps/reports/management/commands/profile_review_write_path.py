import json
from decimal import Decimal
from time import perf_counter
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from apps.attempts.services import (
    bulk_request_review_recheck_tasks,
    bulk_moderate_review_tasks,
    claim_review_task_for_teacher,
    moderate_review_task,
    request_review_recheck,
    review_manual_answer,
    save_answer,
    start_attempt,
    submit_attempt,
)
from apps.exams.services import publish_exam
from apps.question_bank.models import Question, QuestionType
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = "Profile the local review write path for claim, review, and moderation on disposable data."

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
            "scenario": "disposable_review_write_path",
            "steps": [],
        }

        for _ in range(repeat):
            report["steps"].append(self._profile_disposable_flow())

        self.stdout.write(json.dumps(report, indent=2, default=str))

    def _profile_disposable_flow(self):
        with transaction.atomic():
            builder = AcademicAssessmentBuilder()
            context = self._build_unique_flow_entities(builder, with_second_question=True)
            attempt = self._build_submitted_attempt(context)
            answer = attempt.answers.get(question=context["question"])
            task = answer.review_task

            run = {
                "claim_review_task_for_teacher": self._measure(
                    lambda: claim_review_task_for_teacher(
                        task=task,
                        teacher_profile=context["teacher"],
                        actor_user=getattr(context["teacher"], "user", None),
                    )
                )
            }
            task = run["claim_review_task_for_teacher"].pop("_result")

            run["review_manual_answer"] = self._measure(
                lambda: review_manual_answer(
                    answer=task.answer,
                    reviewed_by_teacher=context["teacher"],
                    marks_awarded=Decimal("4.50"),
                    review_notes="Disposable review write-path evaluation.",
                )
            )
            reviewed_answer = run["review_manual_answer"].pop("_result")
            task.refresh_from_db()

            run["request_review_recheck"] = self._measure(
                lambda: request_review_recheck(
                    task=task,
                    requested_by_user=getattr(context["moderator"], "user", None),
                    requested_by_teacher=context["moderator"],
                    review_notes="Disposable review recheck request.",
                )
            )
            task = run["request_review_recheck"].pop("_result")

            bulk_recheck_attempt = self._build_submitted_attempt(context)
            bulk_recheck_tasks = self._prepare_two_reviewed_tasks(context, bulk_recheck_attempt)
            run["bulk_request_recheck_two_tasks"] = self._measure(
                lambda: self._bulk_request_recheck(context, bulk_recheck_tasks)
            )
            run["bulk_request_recheck_two_tasks"].pop("_result", None)

            bulk_moderate_attempt = self._build_submitted_attempt(context)
            bulk_moderate_tasks = self._prepare_two_reviewed_tasks(context, bulk_moderate_attempt)
            run["bulk_moderate_two_tasks"] = self._measure(
                lambda: self._bulk_moderate(context, bulk_moderate_tasks)
            )
            run["bulk_moderate_two_tasks"].pop("_result", None)

            run["moderate_review_task"] = self._measure(
                lambda: moderate_review_task(
                    task=task,
                    reviewed_by_teacher=context["moderator"],
                    marks_awarded=Decimal("4.00"),
                    review_notes="Disposable review moderation pass.",
                    actor_user=getattr(context["moderator"], "user", None),
                )
            )
            run["moderate_review_task"].pop("_result", None)

            reviewed_answer.refresh_from_db()
            transaction.set_rollback(True)
            return run

    def _build_submitted_attempt(self, context):
        attempt = start_attempt(context["student"], context["exam"])
        save_answer(
            attempt=attempt,
            question=context["question"],
            answer_text="Cost optimization means aligning spend with real usage and removing waste.",
            time_spent_seconds=42,
        )
        if context.get("second_question") is not None:
            save_answer(
                attempt=attempt,
                question=context["second_question"],
                answer_text="High availability uses redundancy and failover to reduce downtime.",
                time_spent_seconds=39,
            )
        return submit_attempt(attempt)

    def _build_unique_flow_entities(self, builder, *, with_second_question=False):
        suffix = uuid4().hex[:8].upper()
        institute = builder.create_institute(
            name=f"Review Profiling Institute {suffix}",
            code=f"RVW{suffix}",
            email=f"review-{suffix.lower()}@demo.edu",
        )
        academic_year = builder.create_academic_year(
            institute,
            name=f"2026-2027-{suffix}",
        )
        program = builder.create_program(
            institute,
            code=f"RVW-PROG-{suffix}",
        )
        cohort = builder.create_cohort(
            institute,
            program,
            academic_year,
            code=f"RVW-COH-{suffix}",
        )
        subject = builder.create_subject(
            institute,
            program,
            code=f"RVW-SUB-{suffix}",
        )
        topic = builder.create_topic(
            institute,
            subject,
            code=f"RVW-TOP-{suffix}",
        )
        student = builder.create_student(
            institute,
            academic_year,
            program,
            cohort,
            admission_no=f"RVW-STU-{suffix}",
            email=f"review-student-{suffix.lower()}@example.com",
        )
        teacher = builder.create_teacher(
            institute,
            employee_code=f"RVW-TCH-{suffix}",
            email=f"review-teacher-{suffix.lower()}@example.com",
        )
        moderator = builder.create_teacher(
            institute,
            employee_code=f"RVW-MOD-{suffix}",
            email=f"review-moderator-{suffix.lower()}@example.com",
        )
        question = Question.objects.create(
            institute=institute,
            program=program,
            subject=subject,
            topic=topic,
            created_by_teacher=teacher,
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text=f"Explain cloud cost optimization [{suffix}]",
            explanation="Disposable review-write-path profiling question.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for rightsizing, reserved capacity, and waste reduction."},
        )
        exam = builder.create_exam(
            institute,
            academic_year,
            program,
            cohort,
            subject,
            code=f"RVW-EXAM-{suffix}",
            title=f"Review Workflow Test {suffix}",
            status="draft",
        )
        builder.create_exam_question(
            exam=exam,
            question=question,
            question_order=1,
            section_name="Section A",
        )
        second_question = None
        if with_second_question:
            second_question = Question.objects.create(
                institute=institute,
                program=program,
                subject=subject,
                topic=topic,
                created_by_teacher=teacher,
                question_type=QuestionType.ESSAY_MANUAL_REVIEW,
                difficulty_level="advanced",
                question_text=f"Explain high availability [{suffix}]",
                explanation="Disposable review-write-path second profiling question.",
                default_marks=Decimal("5.00"),
                negative_marks=Decimal("0.00"),
                is_verified=True,
                is_active=True,
                metadata={"review_guidance": "Look for redundancy, failover, and resilience."},
            )
            builder.create_exam_question(
                exam=exam,
                question=second_question,
                question_order=2,
                section_name="Section A",
            )
        exam = publish_exam(
            exam,
            changed_by=teacher,
            remarks="Disposable review write-path publish",
        )
        exam.max_attempts = 4
        exam.save(update_fields=["max_attempts", "updated_at"])
        return {
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
            "subject": subject,
            "topic": topic,
            "student": student,
            "teacher": teacher,
            "moderator": moderator,
            "question": question,
            "second_question": second_question,
            "exam": exam,
        }

    def _bulk_request_recheck(self, context, tasks):
        return bulk_request_review_recheck_tasks(
            tasks=tasks,
            requested_by_user=getattr(context["moderator"], "user", None),
            requested_by_teacher=context["moderator"],
            review_notes="Disposable bulk recheck request.",
        )

    def _bulk_moderate(self, context, tasks):
        return bulk_moderate_review_tasks(
            tasks=tasks,
            reviewed_by_teacher=context["moderator"],
            review_notes="Disposable bulk moderation pass.",
            actor_user=getattr(context["moderator"], "user", None),
        )

    def _prepare_two_reviewed_tasks(self, context, attempt):
        tasks = []
        for question, marks, note in [
            (context["question"], Decimal("4.50"), "Disposable reviewed answer one."),
            (context["second_question"], Decimal("4.25"), "Disposable reviewed answer two."),
        ]:
            answer = attempt.answers.get(question=question)
            task = answer.review_task
            review_manual_answer(
                answer=answer,
                reviewed_by_teacher=context["teacher"],
                marks_awarded=marks,
                review_notes=note,
            )
            task.refresh_from_db()
            tasks.append(task)
        return tasks

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
