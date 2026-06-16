from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.question_bank.management.curated_authoring_support import lint_authoring_markdown


class Command(BaseCommand):
    help = "Lint markdown authoring packs before compiling them into final curated JSON."

    def add_arguments(self, parser):
        parser.add_argument(
            "--files",
            nargs="+",
            default=[],
            help="One or more markdown authoring files to lint.",
        )
        parser.add_argument(
            "--expected-count",
            type=int,
            default=None,
            help="Require an exact question count.",
        )

    def handle(self, *args, **options):
        files = [Path(item) for item in options["files"] if item.strip()]
        if not files:
            raise CommandError("Provide at least one markdown file with --files.")

        for file_path in files:
            result = lint_authoring_markdown(file_path, expected_count=options["expected_count"])
            payload = result["payload"]
            self.stdout.write(
                self.style.SUCCESS(
                    f"{file_path} OK: questions={len(payload['questions'])} "
                    f"difficulty={result['difficulty_counts']}"
                )
            )
            if result["warnings"]:
                for warning in result["warnings"]:
                    self.stdout.write(self.style.WARNING(f"  warning: {warning}"))
