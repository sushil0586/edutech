from django.core.management.base import BaseCommand
from django.db import transaction

from apps.economy.models import InstituteQuestionUsageLedger, QuestionBankPackage, SubscriptionPlan
from apps.institutes.models import Institute
from apps.question_bank.models import InstituteQuestionAccess, MasterQuestion, Question


SEED_BATCH = "demo_shared_library_access_v2"
TEMP_PLAN_PREFIXES = ("PW-SAB-", "PW-ISAB-")
TEMP_PACKAGE_PREFIXES = ("PW-TSPKG-", "PW-ISPKG-")


class Command(BaseCommand):
    help = (
        "Reset temporary shared-library workflow artifacts and remove legacy demo package drift "
        "so Playwright and manual QA can start from a known-good state."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--target-institute-code",
            default="DLI001",
            help="Institute code whose shared-library workflow state should be reset.",
        )
        parser.add_argument(
            "--public-hub-code",
            default="PUBDLI1",
            help="Public content hub institute code used for canonical shared-library demo packages.",
        )
        parser.add_argument(
            "--package-code",
            default="DEMO_SHARED_LIBRARY_ACCESS",
            help="Canonical shared-library access package code.",
        )
        parser.add_argument(
            "--quota-package-code",
            default="DEMO_SHARED_LIBRARY_QUOTA",
            help="Canonical quota demo package code.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        target_institute = Institute.objects.filter(code=options["target_institute_code"].strip()).first()
        public_hub = Institute.objects.filter(code=options["public_hub_code"].strip()).first()

        if target_institute is None:
            self.stdout.write(self.style.WARNING("Target institute not found; nothing to reset."))
            return

        self._reset_seeded_shared_library_access(target_institute=target_institute, public_hub=public_hub)
        removed_legacy = self._remove_legacy_duplicate_packages(
            public_hub=public_hub,
            canonical_codes=[
                options["package_code"].strip(),
                options["quota_package_code"].strip(),
            ],
        )
        removed_temp_plans = self._remove_temporary_subscription_plans()
        removed_temp_packages = self._remove_temporary_packages()

        self.stdout.write(self.style.SUCCESS("Shared-library workflow state reset complete."))
        self.stdout.write(f"- target_institute={target_institute.code}")
        self.stdout.write(f"- removed_legacy_packages={removed_legacy}")
        self.stdout.write(f"- removed_temporary_plans={removed_temp_plans}")
        self.stdout.write(f"- removed_temporary_packages={removed_temp_packages}")

    def _reset_seeded_shared_library_access(self, *, target_institute, public_hub):
        if public_hub is None:
            return

        seeded_master_questions = list(
            MasterQuestion.objects.filter(
                source_institute=public_hub,
                metadata__seed_batch=SEED_BATCH,
                is_active=True,
            ).values_list("id", flat=True)
        )
        if not seeded_master_questions:
            return

        access_rows = list(
            InstituteQuestionAccess.objects.filter(
                institute=target_institute,
                master_question_id__in=seeded_master_questions,
                is_active=True,
            ).select_related("linked_question")
        )
        linked_question_ids = [row.linked_question_id for row in access_rows if row.linked_question_id]

        InstituteQuestionUsageLedger.objects.filter(
            institute=target_institute,
            master_question_id__in=seeded_master_questions,
            is_active=True,
        ).delete()

        if linked_question_ids:
            Question.objects.filter(
                institute=target_institute,
                id__in=linked_question_ids,
                is_active=True,
            ).delete()

        if access_rows:
            InstituteQuestionAccess.objects.filter(id__in=[row.id for row in access_rows]).delete()

    def _remove_legacy_duplicate_packages(self, *, public_hub, canonical_codes):
        normalized_codes = [str(code or "").strip().upper() for code in canonical_codes if str(code or "").strip()]
        if public_hub is None or not normalized_codes:
            return 0

        legacy_packages = list(
            QuestionBankPackage.objects.filter(code__in=normalized_codes)
            .exclude(institute=public_hub)
        )
        if not legacy_packages:
            return 0

        legacy_package_ids = [package.id for package in legacy_packages]
        QuestionBankPackage.objects.filter(id__in=legacy_package_ids).delete()
        return len(legacy_package_ids)

    def _remove_temporary_subscription_plans(self):
        temp_plan_queryset = SubscriptionPlan.objects.none()
        for prefix in TEMP_PLAN_PREFIXES:
            temp_plan_queryset = temp_plan_queryset | SubscriptionPlan.objects.filter(code__startswith=prefix)
        temp_plan_ids = list(temp_plan_queryset.values_list("id", flat=True))
        if temp_plan_ids:
            SubscriptionPlan.objects.filter(id__in=temp_plan_ids).delete()
        return len(temp_plan_ids)

    def _remove_temporary_packages(self):
        temp_package_queryset = QuestionBankPackage.objects.none()
        for prefix in TEMP_PACKAGE_PREFIXES:
            temp_package_queryset = temp_package_queryset | QuestionBankPackage.objects.filter(code__startswith=prefix)
        temp_package_ids = list(temp_package_queryset.values_list("id", flat=True))
        if temp_package_ids:
            QuestionBankPackage.objects.filter(id__in=temp_package_ids).delete()
        return len(temp_package_ids)
