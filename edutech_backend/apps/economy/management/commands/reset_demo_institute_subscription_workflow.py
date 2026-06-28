from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.economy.models import (
    InstituteQuestionEntitlement,
    InstituteQuestionEntitlementStatus,
    InstituteSubscriptionRequest,
)
from apps.economy.services import (
    list_requestable_subscription_plans_for_institute,
    update_institute_question_bank_entitlement_status,
)
from apps.institutes.models import Institute


class Command(BaseCommand):
    help = (
        "Reset demo institute subscription workflow state by deleting prior request rows and "
        "revoking live entitlements for requestable package lanes."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--target-institute-code",
            default="DLI001",
            help="Institute code to reset. Defaults to the demo institute.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute_code = str(options["target_institute_code"] or "").strip()
        if not institute_code:
            raise CommandError("--target-institute-code is required.")

        institute = Institute.objects.filter(code=institute_code).first()
        if institute is None:
            raise CommandError(f"Institute not found: {institute_code}")

        requestable_plans = list_requestable_subscription_plans_for_institute(institute=institute)
        if not requestable_plans:
            self.stdout.write(
                self.style.WARNING(
                    f"No requestable subscription plans were found for institute {institute.code}. Nothing to reset."
                )
            )
            return

        cycle_ids = set()
        package_ids = set()
        package_codes = set()
        for plan in requestable_plans:
            for cycle in plan.cycles.filter(is_active=True):
                cycle_ids.add(cycle.id)
            for link in plan.question_bank_package_links.filter(is_active=True):
                package_ids.add(link.question_bank_package_id)
                package_codes.add(link.question_bank_package.code)

        deleted_requests, _ = InstituteSubscriptionRequest.objects.filter(
            institute=institute,
            subscription_plan_cycle_id__in=cycle_ids,
        ).delete()

        live_entitlements = list(
            InstituteQuestionEntitlement.objects.select_related("question_bank_package").filter(
                institute=institute,
                question_bank_package_id__in=package_ids,
                status__in=[
                    InstituteQuestionEntitlementStatus.DRAFT,
                    InstituteQuestionEntitlementStatus.ACTIVE,
                    InstituteQuestionEntitlementStatus.PAUSED,
                ],
            )
        )

        revoked_count = 0
        for entitlement in live_entitlements:
            entitlement.ends_at = entitlement.ends_at or timezone.now()
            entitlement.save(update_fields=["ends_at", "updated_at"])
            update_institute_question_bank_entitlement_status(
                entitlement=entitlement,
                status=InstituteQuestionEntitlementStatus.REVOKED,
                changed_by=None,
                notes="Reset by reset_demo_institute_subscription_workflow command.",
            )
            revoked_count += 1

        self.stdout.write(self.style.SUCCESS("Demo institute subscription workflow reset complete."))
        self.stdout.write(f"- institute={institute.code}")
        self.stdout.write(f"- requestable_plan_count={len(requestable_plans)}")
        self.stdout.write(f"- deleted_subscription_requests={deleted_requests}")
        self.stdout.write(f"- revoked_entitlements={revoked_count}")
        self.stdout.write(
            f"- package_codes={', '.join(sorted(package_codes)) if package_codes else 'none'}"
        )
