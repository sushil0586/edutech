from django.core.management import BaseCommand, call_command
from django.core.management.base import CommandError


class Command(BaseCommand):
    help = "Run the platform-level master economy seed flow."

    def add_arguments(self, parser):
        parser.add_argument(
            "institute_codes",
            nargs="*",
            help="One or more institute codes to seed.",
        )
        parser.add_argument(
            "--all-active",
            action="store_true",
            help="Seed all active institutes.",
        )
        parser.add_argument(
            "--skip-option-catalog",
            action="store_true",
            help="Skip the option catalog prerequisite seed.",
        )
        parser.add_argument(
            "--include-future-templates",
            action="store_true",
            help="Also seed optional advanced economy templates.",
        )

    def handle(self, *args, **options):
        institute_codes = options["institute_codes"] or []
        seed_all_active = options["all_active"]
        skip_option_catalog = options["skip_option_catalog"]
        include_future_templates = options["include_future_templates"]

        if not seed_all_active and not institute_codes:
            raise CommandError("Provide institute code(s) or use --all-active.")

        self.stdout.write(self.style.SUCCESS("Starting master economy seed flow..."))

        if not skip_option_catalog:
            self.stdout.write("1. Refreshing academic option catalog...")
            call_command("seed_option_catalog", stdout=self.stdout)
        else:
            self.stdout.write("1. Skipping academic option catalog refresh.")

        self.stdout.write("2. Seeding platform-owned economy defaults...")
        if seed_all_active:
            call_command(
                "seed_economy_defaults",
                all_active=True,
                include_future_templates=include_future_templates,
                stdout=self.stdout,
            )
        else:
            call_command(
                "seed_economy_defaults",
                *institute_codes,
                include_future_templates=include_future_templates,
                stdout=self.stdout,
            )

        self.stdout.write(self.style.SUCCESS("Master economy seed flow completed successfully."))
