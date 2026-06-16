from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.question_bank.management.curated_authoring_support import (
    authoring_pack_path,
    generate_markdown_from_template_json,
)


class Command(BaseCommand):
    help = (
        "Generate markdown authoring files from the curated JSON templates so content writers "
        "can work in a simpler topic-wise format."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--topic-codes",
            nargs="+",
            default=[],
            help="Specific topic codes to generate markdown files for.",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Overwrite existing markdown authoring files.",
        )

    def handle(self, *args, **options):
        topic_codes = [code.strip().upper() for code in options["topic_codes"] if code.strip()]
        if not topic_codes:
            raise CommandError("Provide at least one topic code with --topic-codes.")

        created = 0
        skipped = 0
        for topic_code in topic_codes:
            out_path = authoring_pack_path(topic_code)
            if out_path.exists() and not options["overwrite"]:
                skipped += 1
                self.stdout.write(f"- skipped existing: {topic_code}")
                continue
            out_path = generate_markdown_from_template_json(topic_code)
            created += 1
            self.stdout.write(f"- generated: {out_path}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Markdown authoring generation complete. created={created} skipped={skipped}"
            )
        )
