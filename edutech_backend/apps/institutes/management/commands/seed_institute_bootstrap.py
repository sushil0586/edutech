from django.core.management import BaseCommand, call_command
from django.db import transaction

from apps.institutes.models import Institute


DEFAULT_METADATA = {
    "seed_code": "institute_bootstrap_v1",
    "content_owner_type": "tenant",
    "content_scope": "institute_private",
    "source_type": "institute",
    "is_public_content_hub": False,
    "economy_owner": "institute",
}


class Command(BaseCommand):
    help = (
        "Create or update a regular institute and optionally bootstrap economy and "
        "academic defaults for faster onboarding."
    )

    def add_arguments(self, parser):
        parser.add_argument("code", help="Unique institute code.")
        parser.add_argument("--name", required=True, help="Display name for the institute.")
        parser.add_argument("--email", default="", help="Institute contact email.")
        parser.add_argument("--phone", default="", help="Institute contact phone.")
        parser.add_argument("--address", default="", help="Institute address.")
        parser.add_argument("--city", default="", help="Institute city.")
        parser.add_argument("--state", default="", help="Institute state.")
        parser.add_argument("--country", default="India", help="Institute country.")
        parser.add_argument("--pincode", default="", help="Institute postal code.")
        parser.add_argument("--website", default="", help="Institute website.")
        parser.add_argument("--description", default="", help="Description stored on the institute profile.")
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
        parser.add_argument(
            "--seed-academics",
            action="store_true",
            help="Also seed the default academic structure for the institute.",
        )
        parser.add_argument(
            "--academic-preset",
            default="class_7_cbse_core",
            help="Academic preset to use when --seed-academics is enabled.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute, created = self._upsert_institute(options)

        action = "created" if created else "updated"
        self.stdout.write(
            self.style.SUCCESS(f"Institute {action}: {institute.name} ({institute.code})")
        )
        self.stdout.write(
            "Metadata flags: public_content_hub=false, content_owner_type=tenant, source_type=institute"
        )

        if not options["skip_economy_seed"]:
            self.stdout.write("Bootstrapping institute-owned economy defaults...")
            call_command(
                "seed_economy_defaults",
                institute.code,
                include_future_templates=options["include_future_economy_templates"],
                stdout=self.stdout,
            )
        else:
            self.stdout.write("Economy seed skipped for the institute.")

        if options["seed_academics"]:
            self.stdout.write("Bootstrapping institute academic defaults...")
            call_command(
                "seed_institute_academics",
                institute.code,
                preset=options["academic_preset"],
                stdout=self.stdout,
            )
        else:
            self.stdout.write(
                f"Next: python manage.py seed_institute_academics {institute.code}"
            )

    def _upsert_institute(self, options):
        code = options["code"].strip()
        metadata = dict(DEFAULT_METADATA)
        metadata["institute_code"] = code

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
