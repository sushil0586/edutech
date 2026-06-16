from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from apps.question_bank.management.commands.generate_curated_topic_pack_templates import (
    iter_leaf_topics,
)
from apps.question_bank.management.curated_authoring_support import authoring_pack_path


class Command(BaseCommand):
    help = (
        "Lint, compile, and seed all curated Class 7 Math topic packs from Markdown "
        "using the Markdown-first authoring workflow."
    )

    def add_arguments(self, parser):
        parser.add_argument("institute_code", help="Institute code to seed curated Math questions into.")
        parser.add_argument(
            "--preset",
            default="class_7_cbse_core",
            help="Academic preset used to discover Class 7 Math leaf topics.",
        )
        parser.add_argument(
            "--topic-codes",
            nargs="*",
            default=[],
            help="Optional specific Math topic codes to process. Defaults to all Class 7 Math leaf topics.",
        )
        parser.add_argument(
            "--expected-count",
            type=int,
            default=50,
            help="Required question count per topic pack.",
        )
        parser.add_argument(
            "--replace-existing",
            action="store_true",
            help="Replace the existing curated seed batch for the selected Math topics.",
        )

    def handle(self, *args, **options):
        topic_codes = self._resolve_topic_codes(
            preset=options["preset"],
            selected_topic_codes=options["topic_codes"],
        )
        markdown_files = [authoring_pack_path(topic_code) for topic_code in topic_codes]

        missing_files = [path for path in markdown_files if not path.exists()]
        if missing_files:
            missing_labels = ", ".join(path.name for path in missing_files)
            raise CommandError(
                f"Missing Markdown authoring packs for these topic codes: {missing_labels}"
            )

        file_args = [str(path.relative_to(path.parents[4])) for path in markdown_files]

        self.stdout.write(f"Step 1/3: linting {len(file_args)} Class 7 Math Markdown pack(s).")
        call_command(
            "lint_curated_topic_authoring_markdown",
            files=file_args,
            expected_count=options["expected_count"],
        )

        self.stdout.write(f"Step 2/3: compiling {len(file_args)} Class 7 Math Markdown pack(s).")
        call_command(
            "compile_curated_topic_authoring_markdown",
            files=file_args,
            expected_count=options["expected_count"],
        )

        self.stdout.write(f"Step 3/3: seeding {len(topic_codes)} Class 7 Math topic pack(s).")
        call_command(
            "seed_curated_math_science_questions",
            options["institute_code"],
            preset=options["preset"],
            subjects=["math"],
            topic_codes=topic_codes,
            questions_per_topic=options["expected_count"],
            replace_existing=options["replace_existing"],
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Completed Markdown-first Class 7 Math seed flow for {len(topic_codes)} topic(s)."
            )
        )

    def _resolve_topic_codes(self, *, preset, selected_topic_codes):
        normalized_codes = [code.strip().upper() for code in selected_topic_codes if code.strip()]
        discovered_topics = list(
            iter_leaf_topics(
                preset,
                subject_aliases=["math"],
                topic_codes=normalized_codes,
            )
        )
        if not discovered_topics:
            raise CommandError("No matching Class 7 Math leaf topics were found.")
        return [topic["topic_code"] for topic in discovered_topics]
