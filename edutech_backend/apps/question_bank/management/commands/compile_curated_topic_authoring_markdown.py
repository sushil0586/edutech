from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.question_bank.management.curated_authoring_support import (
    compile_authoring_markdown,
    write_compiled_json,
)


class Command(BaseCommand):
    help = (
        "Compile markdown authoring packs into final curated JSON packs under "
        "question_blueprints/class_7/curated_seed_packs/math_science_v2/."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--files",
            nargs="+",
            default=[],
            help="One or more markdown authoring files to compile.",
        )
        parser.add_argument(
            "--expected-count",
            type=int,
            default=None,
            help="Require an exact question count before compile succeeds.",
        )

    def handle(self, *args, **options):
        files = [Path(item) for item in options["files"] if item.strip()]
        if not files:
            raise CommandError("Provide at least one markdown file with --files.")

        compiled = 0
        for file_path in files:
            payload = compile_authoring_markdown(file_path, expected_count=options["expected_count"])
            out_path = write_compiled_json(payload)
            compiled += 1
            self.stdout.write(f"- compiled {file_path} -> {out_path}")

        self.stdout.write(self.style.SUCCESS(f"Compiled {compiled} markdown pack(s)."))
