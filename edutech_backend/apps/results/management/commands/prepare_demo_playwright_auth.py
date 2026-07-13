from django.db import OperationalError, ProgrammingError
from django.core.cache import cache
from django.core.management import BaseCommand, call_command
from rest_framework.throttling import SimpleRateThrottle


class Command(BaseCommand):
    help = "Seed demo accounts and clear local login throttle keys for Playwright runs."

    default_idents = ("127.0.0.1", "::1", "localhost", "testserver")

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-seed",
            action="store_true",
            help="Skip reseeding demo academic data before clearing throttle keys.",
        )
        parser.add_argument(
            "--strict-seed",
            action="store_true",
            help="Fail instead of warning when demo reseeding cannot run on the local database schema.",
        )
        parser.add_argument(
            "--ident",
            action="append",
            dest="idents",
            default=[],
            help="Additional throttle identifiers to clear. Can be passed multiple times.",
        )

    def handle(self, *args, **options):
        if not options["skip_seed"]:
            try:
                call_command("seed_demo_academic_data", stdout=self.stdout)
            except (ProgrammingError, OperationalError) as exc:
                if options["strict_seed"]:
                    raise
                self.stdout.write(
                    self.style.WARNING(
                        "Skipping demo reseed because the local database schema is behind the current code: "
                        f"{exc}"
                    )
                )

        cache_format = SimpleRateThrottle.cache_format
        idents = []
        for ident in [*self.default_idents, *options["idents"]]:
            normalized = str(ident).strip()
            if normalized and normalized not in idents:
                idents.append(normalized)

        keys = [
            cache_format % {
                "scope": "login",
                "ident": ident,
            }
            for ident in idents
        ]
        if keys:
            cache.delete_many(keys)

        self.stdout.write(self.style.SUCCESS("Playwright demo auth is prepared."))
        self.stdout.write(
            "Cleared login throttle keys for: " + ", ".join(idents)
        )
