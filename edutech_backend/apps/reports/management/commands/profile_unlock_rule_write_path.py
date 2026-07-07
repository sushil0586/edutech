import json
from time import perf_counter
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from apps.economy.models import UnlockRuleType
from apps.economy.serializers import AdminUnlockRuleSerializer
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = "Profile local unlock-rule write paths for create and update on disposable data."

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
            "scenario": "disposable_unlock_rule_write_path",
            "steps": [],
        }

        for _ in range(repeat):
            report["steps"].append(self._profile_disposable_flow())

        self.stdout.write(json.dumps(report, indent=2, default=str))

    def _profile_disposable_flow(self):
        with transaction.atomic():
            builder = AcademicAssessmentBuilder()
            context = self._build_unique_flow_entities(builder)

            run = {
                "create_unlock_rule": self._measure(
                    lambda: self._create_unlock_rule_via_serializer(context),
                )
            }
            unlock_rule = run["create_unlock_rule"].pop("_result")

            run["update_unlock_rule"] = self._measure(
                lambda: self._update_unlock_rule_via_serializer(unlock_rule, context),
            )
            run["update_unlock_rule"].pop("_result", None)

            transaction.set_rollback(True)
            return run

    def _create_unlock_rule_via_serializer(self, context):
        serializer = AdminUnlockRuleSerializer(
            data={
                "institute": context["institute"].pk,
                "subject": context["subject"].pk,
                "content_type": "exam",
                "content_key": str(context["exam"].id),
                "content_label": f"Disposable unlock target {context['suffix']}",
                "rule_type": UnlockRuleType.STARS_BALANCE,
                "required_star_balance": 25,
                "required_entitlement_code": "",
                "required_completion_count": None,
                "required_score_percentage": None,
                "admin_override_allowed": True,
                "priority": 10,
                "metadata": {"source": "profile_unlock_rule_write_path"},
                "is_active": True,
            }
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _update_unlock_rule_via_serializer(self, unlock_rule, context):
        serializer = AdminUnlockRuleSerializer(
            unlock_rule,
            data={
                "rule_type": UnlockRuleType.ENTITLEMENT,
                "required_star_balance": None,
                "required_entitlement_code": f"UNLOCK_{context['suffix']}",
                "priority": 3,
                "content_label": f"Disposable unlock target updated {context['suffix']}",
            },
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _build_unique_flow_entities(self, builder):
        suffix = uuid4().hex[:8].upper()
        institute = builder.create_institute(
            name=f"Unlock Profiling Institute {suffix}",
            code=f"UNL{suffix}",
            email=f"unlock-{suffix.lower()}@demo.edu",
        )
        academic_year = builder.create_academic_year(
            institute,
            name=f"2026-2027-{suffix}",
        )
        program = builder.create_program(
            institute,
            code=f"UNL-PROG-{suffix}",
        )
        cohort = builder.create_cohort(
            institute,
            program,
            academic_year,
            code=f"UNL-COH-{suffix}",
        )
        subject = builder.create_subject(
            institute,
            program,
            code=f"UNL-SUB-{suffix}",
        )
        exam = builder.create_exam(
            institute,
            academic_year,
            program,
            cohort,
            subject,
            code=f"UNL-EXAM-{suffix}",
            title=f"Unlock Target {suffix}",
            status="draft",
        )
        return {
            "suffix": suffix,
            "builder": builder,
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
            "subject": subject,
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
