from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.management.seed_presets import PRESETS
from apps.academics.models import Program, Subject, Topic
from apps.institutes.models import Institute
from apps.question_bank.management.curated_topic_seed_support import (
    CURATED_BATCH,
    SUBJECT_CODE_MAP,
    available_topic_codes,
    load_curated_topic_pack,
)
from apps.question_bank.models import Question, QuestionOption
from apps.question_bank.services import sync_master_question_from_institute_question


class Command(BaseCommand):
    help = (
        "Seed curated Class 7 Math and Science questions from JSON topic packs. "
        "This command is intentionally separate from the older curriculum seed generator."
    )

    def add_arguments(self, parser):
        parser.add_argument("institute_code", help="Institute code to seed curated questions into.")
        parser.add_argument(
            "--preset",
            default="class_7_cbse_core",
            choices=sorted(PRESETS.keys()),
            help="Academic preset used to resolve the target program and subjects.",
        )
        parser.add_argument(
            "--subjects",
            nargs="+",
            default=["math", "science"],
            choices=sorted(SUBJECT_CODE_MAP.keys()),
            help="Which subject aliases to seed from the curated pack library.",
        )
        parser.add_argument(
            "--topic-codes",
            nargs="*",
            default=[],
            help="Optional specific leaf topic codes to seed.",
        )
        parser.add_argument(
            "--questions-per-topic",
            type=int,
            default=50,
            help="How many curated questions to feed per topic.",
        )
        parser.add_argument(
            "--replace-existing",
            action="store_true",
            help="Delete only this command's previous batch for the selected scope before reseeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute = self._resolve_institute(options["institute_code"].strip())
        program = self._resolve_program(institute=institute, preset=options["preset"])
        requested_count = options["questions_per_topic"]
        if requested_count <= 0:
            raise CommandError("--questions-per-topic must be greater than zero.")

        selected_topic_codes = {code.strip().upper() for code in options["topic_codes"] if code.strip()}
        discovered_pack_codes = set(available_topic_codes())
        if not discovered_pack_codes:
            raise CommandError(
                "No curated topic pack JSON files were found. "
                "Add pack files under question_blueprints/class_7/curated_seed_packs/math_science_v2/ first."
            )

        summary = {"created": 0, "replaced": 0, "subjects": {}}

        for subject_alias in options["subjects"]:
            subject = self._resolve_subject(institute=institute, code=SUBJECT_CODE_MAP[subject_alias])
            topic_queryset = Topic.objects.filter(
                subject=subject,
                parent_topic__isnull=False,
                is_active=True,
            ).order_by("sort_order", "name")
            if selected_topic_codes:
                topic_queryset = topic_queryset.filter(code__in=selected_topic_codes)

            leaf_topics = list(topic_queryset)
            if not leaf_topics:
                raise CommandError(
                    f"No matching leaf topics found for subject {subject.code}."
                )

            subject_counts = {"topics": 0, "created": 0, "replaced": 0}
            for topic in leaf_topics:
                if topic.code not in discovered_pack_codes:
                    raise CommandError(
                        f"No curated pack exists yet for topic {topic.code}. "
                        "This new command only seeds topics that have an explicit JSON pack."
                    )

                if options["replace_existing"]:
                    deleted_count, _ = Question.objects.filter(
                        institute=institute,
                        subject=subject,
                        topic=topic,
                        metadata__seed_batch=CURATED_BATCH,
                    ).delete()
                    subject_counts["replaced"] += deleted_count
                    summary["replaced"] += deleted_count

                pack_questions = load_curated_topic_pack(topic.code, expected_count=requested_count)
                for sequence_number, payload in enumerate(pack_questions, start=1):
                    self._create_question(
                        institute=institute,
                        program=program,
                        subject=subject,
                        topic=topic,
                        payload=payload,
                        sequence_number=sequence_number,
                    )
                    subject_counts["created"] += 1
                    summary["created"] += 1

                subject_counts["topics"] += 1

            summary["subjects"][subject_alias] = subject_counts

        self.stdout.write(
            self.style.SUCCESS(
                f"Curated Math/Science questions seeded for {institute.code} using batch {CURATED_BATCH}."
            )
        )
        self.stdout.write(f"- created={summary['created']} replaced={summary['replaced']}")
        for subject_alias, counts in summary["subjects"].items():
            self.stdout.write(
                f"- {subject_alias}: topics={counts['topics']} "
                f"created={counts['created']} replaced={counts['replaced']}"
            )

    def _resolve_institute(self, institute_code):
        institute = Institute.objects.filter(code=institute_code).first()
        if institute is None:
            raise CommandError(f"Institute not found: {institute_code}")
        return institute

    def _resolve_program(self, *, institute, preset):
        program_code = PRESETS[preset]["program"]["code"]
        program = Program.objects.filter(institute=institute, code=program_code).first()
        if program is None:
            raise CommandError(
                f"Program {program_code} not found for {institute.code}. Seed academics first."
            )
        return program

    def _resolve_subject(self, *, institute, code):
        subject = Subject.objects.filter(institute=institute, code=code).first()
        if subject is None:
            raise CommandError(f"Subject {code} not found for {institute.code}. Seed academics first.")
        return subject

    def _create_question(
        self,
        *,
        institute,
        program,
        subject,
        topic,
        payload,
        sequence_number,
    ):
        metadata = {
            "seed_batch": CURATED_BATCH,
            "topic_code": topic.code,
            "topic_name": topic.name,
            "seed_sequence": sequence_number,
            **payload["metadata"],
        }
        question = Question.objects.create(
            institute=institute,
            program=program,
            subject=subject,
            topic=topic,
            created_by_teacher=None,
            question_type=payload["question_type"],
            difficulty_level=payload["difficulty_level"],
            content_format="plain_text",
            question_text=payload["question_text"],
            explanation=payload["explanation"],
            default_marks=Decimal(payload["default_marks"]),
            negative_marks=Decimal(payload["negative_marks"]),
            is_verified=True,
            is_active=True,
            metadata=metadata,
        )

        option_records = []
        for option_order, option in enumerate(payload["options"], start=1):
            option_records.append(
                QuestionOption(
                    question=question,
                    content_format="plain_text",
                    option_text=option["option_text"],
                    option_order=option_order,
                    is_correct=option["is_correct"],
                    is_active=True,
                )
            )
        if option_records:
            QuestionOption.objects.bulk_create(option_records)

        sync_master_question_from_institute_question(question)
        return question
