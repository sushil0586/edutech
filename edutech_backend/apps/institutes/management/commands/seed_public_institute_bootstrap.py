from django.core.management import BaseCommand, call_command
from django.core.management.base import CommandError
from django.db import transaction

from apps.institutes.models import Institute


DEFAULT_METADATA = {
    "seed_code": "public_institute_bootstrap_v1",
    "is_public_content_hub": True,
    "content_owner_type": "platform",
    "content_scope": "public_shared",
    "source_type": "platform",
    "student_membership_required": False,
    "visibility_rule": "academic_match",
    "exam_query_scope": "same_institute_plus_public_platform",
    "economy_owner": "platform",
}


class Command(BaseCommand):
    help = (
        "Create or update the shared public institute that owns platform exams and, "
        "optionally, bootstrap economy defaults for it."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--code",
            default="PUB001",
            help="Unique institute code for the shared public institute.",
        )
        parser.add_argument(
            "--name",
            default="Nexora Public Institute",
            help="Display name for the shared public institute.",
        )
        parser.add_argument("--email", default="public@nexora.app", help="Institute contact email.")
        parser.add_argument("--phone", default="", help="Institute contact phone.")
        parser.add_argument("--address", default="", help="Institute address.")
        parser.add_argument("--city", default="", help="Institute city.")
        parser.add_argument("--state", default="", help="Institute state.")
        parser.add_argument("--country", default="India", help="Institute country.")
        parser.add_argument("--pincode", default="", help="Institute postal code.")
        parser.add_argument("--website", default="", help="Institute website.")
        parser.add_argument(
            "--description",
            default=(
                "Shared platform-owned institute that stores public exams and premium "
                "exam inventory for cross-institute student access."
            ),
            help="Description stored on the institute profile.",
        )
        parser.add_argument(
            "--skip-economy-seed",
            action="store_true",
            help="Create or update the institute only, without seeding economy defaults.",
        )
        parser.add_argument(
            "--include-future-economy-templates",
            action="store_true",
            help="Pass through advanced economy template seeding to the economy bootstrap.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute, created = self._upsert_public_institute(options)

        action = "created" if created else "updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"Public institute {action}: {institute.name} ({institute.code})"
            )
        )
        self.stdout.write(
            "Metadata flags: "
            "public_content_hub=true, content_owner_type=platform, visibility_rule=academic_match"
        )

        if options["skip_economy_seed"]:
            self.stdout.write("Economy seed skipped for the public institute.")
            return

        self.stdout.write("Bootstrapping platform-owned economy defaults for the public institute...")
        call_command(
            "seed_economy_defaults",
            institute.code,
            include_future_templates=options["include_future_economy_templates"],
            stdout=self.stdout,
        )

    def _upsert_public_institute(self, options):
        code = options["code"].strip()
        self._validate_single_public_institute(code=code)
        metadata = dict(DEFAULT_METADATA)
        metadata["public_institute_code"] = code

        institute, created = Institute.objects.get_or_create(
            code=code,
            defaults={
                "name": options["name"].strip(),
                "email": options["email"].strip(),
                "phone": options["phone"].strip(),
                "address": options["address"].strip(),
                "city": options["city"].strip(),
                "state": options["state"].strip(),
                "country": options["country"].strip(),
                "pincode": options["pincode"].strip(),
                "website": options["website"].strip(),
                "description": options["description"].strip(),
                "is_active": True,
                "metadata": metadata,
            },
        )
        if created:
            return institute, created

        institute.name = options["name"].strip()
        institute.email = options["email"].strip()
        institute.phone = options["phone"].strip()
        institute.address = options["address"].strip()
        institute.city = options["city"].strip()
        institute.state = options["state"].strip()
        institute.country = options["country"].strip()
        institute.pincode = options["pincode"].strip()
        institute.website = options["website"].strip()
        institute.description = options["description"].strip()
        institute.is_active = True
        next_metadata = dict(institute.metadata or {})
        next_metadata.update(metadata)
        institute.metadata = next_metadata
        institute.save()
        return institute, created

    def _validate_single_public_institute(self, *, code):
        existing_public_hub = (
            Institute.objects.filter(metadata__is_public_content_hub=True)
            .exclude(code=code)
            .order_by("created_at")
            .first()
        )
        if existing_public_hub is None:
            return
        raise CommandError(
            "A public institute already exists "
            f"({existing_public_hub.code}). Only one public institute is allowed."
        )
