import json
from time import perf_counter
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from apps.economy.models import (
    InstituteQuestionEntitlementStatus,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageType,
)
from apps.economy.services import (
    grant_institute_feature_entitlement,
    grant_institute_question_bank_entitlement,
    update_institute_question_bank_entitlement_status,
    update_institute_question_feature_entitlement_status,
)
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = (
        "Profile local question-bank entitlement write paths for package and feature entitlement "
        "grant/update flows on disposable data."
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
            "scenario": "disposable_question_bank_entitlement_write_path",
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
                "grant_question_bank_entitlement": self._measure(
                    lambda: grant_institute_question_bank_entitlement(
                        institute=context["public_hub"],
                        question_bank_package=context["package"],
                        notes="Disposable entitlement grant profiling.",
                        metadata={"source": "profile_question_bank_entitlement_write_path"},
                    )
                )
            }
            entitlement, _created = run["grant_question_bank_entitlement"].pop("_result")

            run["update_question_bank_entitlement_status"] = self._measure(
                lambda: update_institute_question_bank_entitlement_status(
                    entitlement=entitlement,
                    status=InstituteQuestionEntitlementStatus.REVOKED,
                    changed_by=context["platform_admin_user"],
                    notes="Disposable entitlement revoke profiling.",
                )
            )
            entitlement = run["update_question_bank_entitlement_status"].pop("_result")

            run["grant_feature_entitlement"] = self._measure(
                lambda: grant_institute_feature_entitlement(
                    institute=context["public_hub"],
                    feature_code="exam_blueprint_export",
                    source_package=context["package"],
                    metadata={"source": "profile_question_bank_entitlement_write_path"},
                )
            )
            feature_entitlement, _created = run["grant_feature_entitlement"].pop("_result")

            run["update_feature_entitlement_status"] = self._measure(
                lambda: update_institute_question_feature_entitlement_status(
                    entitlement=feature_entitlement,
                    status=InstituteQuestionEntitlementStatus.REVOKED,
                )
            )
            run["update_feature_entitlement_status"].pop("_result", None)
            entitlement.refresh_from_db()

            transaction.set_rollback(True)
            return run

    def _build_unique_flow_entities(self, builder):
        suffix = uuid4().hex[:8].upper()
        public_hub = builder.create_institute(
            code=f"PUB{suffix}",
            name=f"Public Hub {suffix}",
            email=f"public-hub-{suffix.lower()}@example.com",
            metadata={"is_public_content_hub": True},
        )
        platform_admin_user, platform_admin_profile = builder.create_platform_admin_account(
            username=f"entitlement-admin-{suffix.lower()}",
            email=f"entitlement-admin-{suffix.lower()}@example.com",
        )
        package = QuestionBankPackage.objects.create(
            institute=public_hub,
            name=f"Disposable Package {suffix}",
            code=f"PKG_{suffix}",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        return {
            "suffix": suffix,
            "builder": builder,
            "public_hub": public_hub,
            "platform_admin_user": platform_admin_user,
            "platform_admin_profile": platform_admin_profile,
            "package": package,
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
