import json
from time import perf_counter
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from apps.economy.models import AccessPolicyType, RewardRuleType
from apps.economy.serializers import (
    AdminContentAccessPolicySerializer,
    AdminRewardRuleSerializer,
)
from apps.exams.services import invalidate_exam_access_policy_cache
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = (
        "Profile local economy-admin write paths for reward-rule and content-access-policy "
        "create/update flows on disposable data."
    )

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
            "scenario": "disposable_economy_admin_write_path",
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
                "create_reward_rule": self._measure(
                    lambda: self._create_reward_rule_via_serializer(context),
                )
            }
            reward_rule = run["create_reward_rule"].pop("_result")

            run["update_reward_rule"] = self._measure(
                lambda: self._update_reward_rule_via_serializer(reward_rule, context),
            )
            reward_rule = run["update_reward_rule"].pop("_result")

            run["create_content_access_policy"] = self._measure(
                lambda: self._create_content_access_policy_via_serializer(context),
            )
            content_policy = run["create_content_access_policy"].pop("_result")

            run["update_content_access_policy"] = self._measure(
                lambda: self._update_content_access_policy_via_serializer(content_policy, context),
            )
            run["update_content_access_policy"].pop("_result", None)
            reward_rule.refresh_from_db()

            transaction.set_rollback(True)
            return run

    def _create_reward_rule_via_serializer(self, context):
        serializer = AdminRewardRuleSerializer(
            data={
                "institute": context["institute"].pk,
                "subject": context["subject"].pk,
                "name": f"Disposable completion reward {context['suffix']}",
                "rule_type": RewardRuleType.EXAM_COMPLETION,
                "stars_awarded": 25,
                "priority": 10,
                "metadata": {"source": "profile_economy_admin_write_path"},
                "is_active": True,
            }
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _update_reward_rule_via_serializer(self, reward_rule, context):
        serializer = AdminRewardRuleSerializer(
            reward_rule,
            data={
                "name": f"Disposable threshold reward {context['suffix']}",
                "rule_type": RewardRuleType.SCORE_THRESHOLD,
                "stars_awarded": 40,
                "score_threshold_percentage": "70.00",
                "priority": 5,
            },
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _create_content_access_policy_via_serializer(self, context):
        serializer = AdminContentAccessPolicySerializer(
            data={
                "institute": context["institute"].pk,
                "subject": context["subject"].pk,
                "content_type": "exam",
                "content_key": str(context["exam"].id),
                "content_label": f"Disposable exam access {context['suffix']}",
                "policy_type": AccessPolicyType.STARS_OR_ENTITLEMENT,
                "star_cost": "15.00",
                "entitlement_code": f"EXAM_{context['suffix']}",
                "priority": 10,
                "metadata": {"source": "profile_economy_admin_write_path"},
                "is_active": True,
            }
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        if instance.content_type == "exam":
            invalidate_exam_access_policy_cache(institute=instance.institute)
        return instance

    def _update_content_access_policy_via_serializer(self, content_policy, context):
        serializer = AdminContentAccessPolicySerializer(
            content_policy,
            data={
                "content_label": f"Disposable updated exam access {context['suffix']}",
                "star_cost": "20.00",
                "priority": 3,
                "entitlement_code": f"UPDATED_EXAM_{context['suffix']}",
            },
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        if instance.content_type == "exam":
            invalidate_exam_access_policy_cache(institute=instance.institute)
        return instance

    def _build_unique_flow_entities(self, builder):
        suffix = uuid4().hex[:8].upper()
        institute = builder.create_institute(
            name=f"Economy Profiling Institute {suffix}",
            code=f"ECO{suffix}",
            email=f"economy-{suffix.lower()}@demo.edu",
        )
        academic_year = builder.create_academic_year(
            institute,
            name=f"2026-2027-{suffix}",
        )
        program = builder.create_program(
            institute,
            code=f"ECO-PROG-{suffix}",
        )
        cohort = builder.create_cohort(
            institute,
            program,
            academic_year,
            code=f"ECO-COH-{suffix}",
        )
        subject = builder.create_subject(
            institute,
            program,
            code=f"ECO-SUB-{suffix}",
        )
        teacher = builder.create_teacher(
            institute,
            employee_code=f"ECO-TCH-{suffix}",
            email=f"economy-teacher-{suffix.lower()}@example.com",
        )
        platform_admin_user, platform_admin_profile = builder.create_platform_admin_account(
            username=f"economy-admin-{suffix.lower()}",
            email=f"economy-admin-{suffix.lower()}@example.com",
        )
        exam = builder.create_exam(
            institute,
            academic_year,
            program,
            cohort,
            subject,
            code=f"ECO-EXAM-{suffix}",
            title=f"Economy Access Test {suffix}",
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
            "teacher": teacher,
            "platform_admin_user": platform_admin_user,
            "platform_admin_profile": platform_admin_profile,
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
