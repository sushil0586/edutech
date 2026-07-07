import json
from time import perf_counter
from datetime import timedelta
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIRequestFactory

from apps.exams.serializers import ExamWriteSerializer
from apps.exams.services import publish_exam
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = "Profile the local exam write path for create, update, and publish on disposable data."

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
            "scenario": "disposable_exam_write_path",
            "steps": [],
        }

        for _ in range(repeat):
            report["steps"].append(self._profile_disposable_flow())

        self.stdout.write(json.dumps(report, indent=2, default=str))

    def _profile_disposable_flow(self):
        with transaction.atomic():
            builder = AcademicAssessmentBuilder()
            context = self._build_unique_flow_entities(builder)
            request = self._build_request(context["teacher_user"])

            run = {
                "create_exam": self._measure(
                    lambda: self._create_exam_via_serializer(context, request),
                )
            }
            exam = run["create_exam"].pop("_result")

            builder.add_question_to_exam(exam, context["question"], question_order=1)

            run["update_exam"] = self._measure(
                lambda: self._update_exam_via_serializer(exam, request),
            )
            exam = run["update_exam"].pop("_result")

            run["publish_exam"] = self._measure(
                lambda: publish_exam(
                    exam,
                    changed_by=context["teacher"],
                    remarks="Disposable exam write-path publish",
                ),
            )
            run["publish_exam"].pop("_result", None)

            transaction.set_rollback(True)
            return run

    def _build_request(self, user):
        request = APIRequestFactory().post("/api/v1/exams/")
        request.user = user
        return request

    def _create_exam_via_serializer(self, context, request):
        suffix = context["suffix"]
        serializer = ExamWriteSerializer(
            data={
                "institute": context["institute"].pk,
                "academic_year": context["academic_year"].pk,
                "program": context["program"].pk,
                "cohort": context["cohort"].pk,
                "subject": context["subject"].pk,
                "source_teacher": context["teacher"].pk,
                "source_type": "teacher",
                "title": f"Disposable Algebra Drill {suffix}",
                "code": f"PRF-EXAM-{suffix}",
                "description": "Disposable exam create profiling payload.",
                "exam_type": "test",
                "delivery_mode": "online",
                "status": "draft",
                "duration_minutes": 35,
                "total_marks": "0.00",
                "passing_marks": "0.00",
                "start_at": context["builder"].now.isoformat(),
                "end_at": (context["builder"].now + timedelta(hours=1)).isoformat(),
                "instructions": "Answer all questions.",
                "allow_late_submit": False,
                "randomize_questions": False,
                "randomize_options": False,
                "show_result_immediately": False,
                "allow_review_after_submit": True,
                "max_attempts": 1,
                "is_active": True,
            },
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _update_exam_via_serializer(self, exam, request):
        serializer = ExamWriteSerializer(
            exam,
            data={
                "title": f"{exam.title} Updated",
                "instructions": "Updated instructions for disposable profiling.",
                "duration_minutes": 40,
                "max_attempts": 2,
            },
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _build_unique_flow_entities(self, builder):
        suffix = uuid4().hex[:8].upper()
        institute = builder.create_institute(
            name=f"Disposable Institute {suffix}",
            code=f"DIP{suffix}",
            email=f"disposable-{suffix.lower()}@demo.edu",
        )
        academic_year = builder.create_academic_year(
            institute,
            name=f"2026-2027-{suffix}",
        )
        program = builder.create_program(
            institute,
            code=f"PRG-{suffix}",
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
        teacher = builder.create_teacher(
            institute,
            employee_code=f"TCH-{suffix}",
            email=f"teacher-{suffix.lower()}@example.com",
        )
        teacher_user, teacher_profile = builder.create_teacher_account(
            institute,
            teacher,
            username=f"teacher-{suffix.lower()}",
            email=f"teacher-user-{suffix.lower()}@example.com",
        )
        question, _options = builder.create_question_with_options(
            institute,
            program,
            subject,
            topic,
            teacher,
            question_text=f"What is 3 + 4? [{suffix}]",
        )
        return {
            "suffix": suffix,
            "builder": builder,
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
            "subject": subject,
            "topic": topic,
            "teacher": teacher,
            "teacher_user": teacher_user,
            "teacher_account_profile": teacher_profile,
            "question": question,
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
