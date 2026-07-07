import json
from time import perf_counter
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from apps.economy.models import (
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageScope,
    QuestionBankPackageType,
)
from apps.economy.services import grant_institute_question_bank_entitlement
from apps.question_bank.models import Question, QuestionOption
from apps.question_bank.services import (
    link_master_question_to_institute,
    request_master_question_access,
    sync_master_question_from_institute_question,
)
from common.tests.builders import AcademicAssessmentBuilder


User = get_user_model()


class Command(BaseCommand):
    help = "Profile shared master-library request and link write paths on disposable data."

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
            "scenario": "disposable_master_library_write_path",
            "steps": [],
        }

        for _ in range(repeat):
            report["steps"].append(self._profile_disposable_flow())

        self.stdout.write(json.dumps(report, indent=2, default=str))

    def _profile_disposable_flow(self):
        with transaction.atomic():
            context = self._build_unique_flow_entities()
            self._grant_public_question_package(context)
            master_question = self._create_master_question(context)

            run = {
                "request_master_question_access": self._measure(
                    lambda: request_master_question_access(
                        master_question=master_question,
                        institute=context["private_institute"],
                        requested_by_teacher=context["private_teacher"],
                        local_program=context["private_program"],
                        local_subject=context["private_subject"],
                        local_topic=context["private_topic"],
                    )
                )
            }
            run["request_master_question_access"].pop("_result", None)

            run["link_master_question_to_institute"] = self._measure(
                lambda: link_master_question_to_institute(
                    master_question=master_question,
                    institute=context["private_institute"],
                    approved_by=context["platform_user"],
                    requested_by_teacher=context["private_teacher"],
                    local_program=context["private_program"],
                    local_subject=context["private_subject"],
                    local_topic=context["private_topic"],
                )
            )
            linked_access = run["link_master_question_to_institute"].pop("_result")

            master_question.question_text = f"Updated linked prompt {context['suffix']}?"
            master_question.explanation = "Updated explanation for relink profiling."
            master_question.save(update_fields=["question_text", "explanation", "updated_at"])

            run["relink_master_question_to_institute"] = self._measure(
                lambda: link_master_question_to_institute(
                    master_question=master_question,
                    institute=context["private_institute"],
                    approved_by=context["platform_user"],
                    requested_by_teacher=context["private_teacher"],
                    local_program=context["private_program"],
                    local_subject=context["private_subject"],
                    local_topic=context["private_topic"],
                )
            )
            relinked_access = run["relink_master_question_to_institute"].pop("_result")
            run["relink_master_question_to_institute"]["linked_question_reused"] = (
                linked_access.linked_question_id == relinked_access.linked_question_id
            )

            transaction.set_rollback(True)
            return run

    def _build_unique_flow_entities(self):
        builder = AcademicAssessmentBuilder()
        suffix = uuid4().hex[:8].upper()
        public_institute = builder.create_institute(
            code=f"PUB{suffix}",
            name=f"Public Hub {suffix}",
            metadata={"is_public_content_hub": True},
        )
        private_institute = builder.create_institute(
            code=f"PVT{suffix}",
            name=f"Private School {suffix}",
            email=f"private-{suffix.lower()}@demo.edu",
        )
        builder.create_academic_year(public_institute, name=f"2026-2027-PUB-{suffix}")
        public_program = builder.create_program(public_institute, code=f"C7P{suffix}", name=f"Class 7 {suffix}")
        public_subject = builder.create_subject(
            public_institute,
            public_program,
            code=f"SCI{suffix}",
            name=f"Science {suffix}",
        )
        public_topic = builder.create_topic(
            public_institute,
            public_subject,
            code=f"TOP{suffix}",
            name=f"Plants {suffix}",
        )
        public_teacher = builder.create_teacher(public_institute, employee_code=f"TP{suffix}")

        builder.create_academic_year(private_institute, name=f"2026-2027-PVT-{suffix}")
        private_program = builder.create_program(private_institute, code=f"C7R{suffix}", name=f"Class 7 {suffix}")
        private_subject = builder.create_subject(
            private_institute,
            private_program,
            code=f"SCP{suffix}",
            name=f"Science {suffix}",
        )
        private_topic = builder.create_topic(
            private_institute,
            private_subject,
            code=f"TOPP{suffix}",
            name=f"Plants {suffix}",
        )
        private_teacher = builder.create_teacher(private_institute, employee_code=f"TV{suffix}")
        platform_user = User.objects.create_user(
            username=f"platform-admin-{suffix.lower()}",
            password="password123",
            email=f"platform-{suffix.lower()}@demo.edu",
        )
        return {
            "suffix": suffix,
            "public_institute": public_institute,
            "private_institute": private_institute,
            "public_program": public_program,
            "public_subject": public_subject,
            "public_topic": public_topic,
            "public_teacher": public_teacher,
            "private_program": private_program,
            "private_subject": private_subject,
            "private_topic": private_topic,
            "private_teacher": private_teacher,
            "platform_user": platform_user,
        }

    def _grant_public_question_package(self, context):
        package = QuestionBankPackage.objects.create(
            institute=context["public_institute"],
            name=f"Shared Science Library {context['suffix']}",
            code=f"SCI_LIBRARY_{context['suffix']}",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        QuestionBankPackageScope.objects.create(
            institute=context["public_institute"],
            package=package,
            program=context["public_program"],
            subject=context["public_subject"],
            topic=context["public_topic"],
            question_source_type="platform_only",
            question_type="mcq_single",
            difficulty_level="intermediate",
            master_visibility="shared_by_request",
        )
        grant_institute_question_bank_entitlement(
            institute=context["private_institute"],
            question_bank_package=package,
        )

    def _create_master_question(self, context):
        question = Question.objects.create(
            institute=context["public_institute"],
            program=context["public_program"],
            subject=context["public_subject"],
            topic=context["public_topic"],
            created_by_teacher=context["public_teacher"],
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text=f"Which gas is released during photosynthesis {context['suffix']}?",
            explanation="Oxygen is released during photosynthesis.",
            default_marks="1.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.bulk_create(
            [
                QuestionOption(
                    question=question,
                    option_text="Oxygen",
                    option_order=1,
                    is_correct=True,
                ),
                QuestionOption(
                    question=question,
                    option_text="Carbon dioxide",
                    option_order=2,
                    is_correct=False,
                ),
            ]
        )
        return sync_master_question_from_institute_question(question)

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
