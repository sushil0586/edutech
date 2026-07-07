import json
from decimal import Decimal
from time import perf_counter
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from apps.economy.models import (
    BillingInterval,
    InstituteSubscriptionRequest,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageGrantMode,
    QuestionBankPackageType,
    SubscriptionPlan,
    SubscriptionPlanCycle,
    SubscriptionPlanQuestionBankPackage,
)
from apps.economy.services import (
    create_institute_subscription_request,
    review_institute_subscription_request,
)
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = (
        "Profile local subscription-request write paths for institute request creation and "
        "platform-admin review flows on disposable data."
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
            "scenario": "disposable_subscription_request_write_path",
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
                "create_subscription_request": self._measure(
                    lambda: create_institute_subscription_request(
                        institute=context["target_institute"],
                        subscription_plan_cycle=context["plan_cycle"],
                        requested_by=context["institute_admin_user"],
                        grant_modes=[QuestionBankPackageGrantMode.INCLUDED],
                        notes="Disposable subscription request profiling.",
                        metadata={"source": "profile_subscription_request_write_path"},
                    )
                )
            }
            subscription_request, _created = run["create_subscription_request"].pop("_result")

            run["approve_subscription_request"] = self._measure(
                lambda: review_institute_subscription_request(
                    subscription_request=subscription_request,
                    decision="approve",
                    reviewed_by=context["platform_admin_user"],
                    operator_notes="Disposable approval profiling.",
                )
            )
            run["approve_subscription_request"].pop("_result", None)

            reject_request = InstituteSubscriptionRequest.objects.create(
                institute=context["target_institute"],
                subscription_plan_cycle=context["plan_cycle"],
                status="pending",
                requested_by=context["institute_admin_user"],
                grant_modes=[QuestionBankPackageGrantMode.INCLUDED],
                notes="Disposable rejection profiling.",
                metadata={"source": "profile_subscription_request_write_path_reject"},
            )
            run["reject_subscription_request"] = self._measure(
                lambda: review_institute_subscription_request(
                    subscription_request=reject_request,
                    decision="reject",
                    reviewed_by=context["platform_admin_user"],
                    operator_notes="Disposable rejection profiling.",
                )
            )
            run["reject_subscription_request"].pop("_result", None)

            transaction.set_rollback(True)
            return run

    def _build_unique_flow_entities(self, builder):
        suffix = uuid4().hex[:8].upper()
        public_hub = builder.create_institute(
            code=f"SUBPUB{suffix}",
            name=f"Subscription Public Hub {suffix}",
            email=f"subscription-public-{suffix.lower()}@example.com",
            metadata={"is_public_content_hub": True},
        )
        target_institute = builder.create_institute(
            code=f"SUBSCH{suffix}",
            name=f"Subscription School {suffix}",
            email=f"subscription-school-{suffix.lower()}@example.com",
        )
        platform_admin_user, platform_admin_profile = builder.create_platform_admin_account(
            username=f"subscription-platform-admin-{suffix.lower()}",
            email=f"subscription-platform-admin-{suffix.lower()}@example.com",
        )
        institute_admin_user, institute_admin_profile = builder.create_institute_admin_account(
            target_institute,
            username=f"subscription-institute-admin-{suffix.lower()}",
            email=f"subscription-institute-admin-{suffix.lower()}@example.com",
        )
        included_package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name=f"Included Package {suffix}",
            code=f"INCLUDED_{suffix}",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        addon_package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name=f"Addon Package {suffix}",
            code=f"ADDON_{suffix}",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        plan = SubscriptionPlan.objects.create(
            institute=public_hub,
            name=f"Subscription Plan {suffix}",
            code=f"PLAN_{suffix}",
        )
        plan_cycle = SubscriptionPlanCycle.objects.create(
            institute=public_hub,
            plan=plan,
            billing_interval=BillingInterval.MONTHLY,
            interval_count=1,
            price_amount=Decimal("499.00"),
        )
        SubscriptionPlanQuestionBankPackage.objects.create(
            institute=public_hub,
            subscription_plan=plan,
            question_bank_package=included_package,
            grant_mode=QuestionBankPackageGrantMode.INCLUDED,
            is_default=True,
        )
        SubscriptionPlanQuestionBankPackage.objects.create(
            institute=public_hub,
            subscription_plan=plan,
            question_bank_package=addon_package,
            grant_mode=QuestionBankPackageGrantMode.OPTIONAL_ADDON,
            is_default=False,
        )
        return {
            "suffix": suffix,
            "builder": builder,
            "public_hub": public_hub,
            "target_institute": target_institute,
            "platform_admin_user": platform_admin_user,
            "platform_admin_profile": platform_admin_profile,
            "institute_admin_user": institute_admin_user,
            "institute_admin_profile": institute_admin_profile,
            "included_package": included_package,
            "addon_package": addon_package,
            "plan": plan,
            "plan_cycle": plan_cycle,
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
