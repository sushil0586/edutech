from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.institutes.models import Institute
from apps.question_bank.models import MasterQuestion, MasterQuestionVisibility
from apps.question_bank.services import materialize_master_question_for_source_institute


class Command(BaseCommand):
    help = (
        "Create or refresh operational Question rows from MasterQuestion rows for the same "
        "source institute. Use this for the public content hub so its teachers can search and "
        "use the full master library in normal question flows."
    )

    def add_arguments(self, parser):
        parser.add_argument("institute_code", help="Source institute code that owns the master questions.")
        parser.add_argument(
            "--subject-code",
            default="",
            help="Optional source subject code filter.",
        )
        parser.add_argument(
            "--topic-code",
            default="",
            help="Optional source topic code filter.",
        )
        parser.add_argument(
            "--question-ids",
            nargs="*",
            default=[],
            help="Optional specific master question ids to materialize.",
        )
        parser.add_argument(
            "--visibility",
            default="",
            choices=["", *[choice[0] for choice in MasterQuestionVisibility.choices]],
            help="Optional master question visibility filter.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute = self._resolve_institute(options["institute_code"].strip())
        master_questions = self._resolve_master_questions(
            institute=institute,
            subject_code=options["subject_code"].strip(),
            topic_code=options["topic_code"].strip(),
            question_ids=options["question_ids"],
            visibility=options["visibility"],
        )
        if not master_questions:
            raise CommandError("No master questions matched the provided filters.")

        materialized_count = 0
        for master_question in master_questions:
            materialize_master_question_for_source_institute(
                master_question=master_question,
                notes="Created by materialize_master_questions_for_source_institute command.",
            )
            materialized_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Materialized source master questions for {institute.code} into operational institute questions."
            )
        )
        self.stdout.write(f"- matched_master_questions={len(master_questions)}")
        self.stdout.write(f"- materialized={materialized_count}")

    def _resolve_institute(self, institute_code):
        institute = Institute.objects.filter(code=institute_code).first()
        if institute is None:
            raise CommandError(f"Institute not found: {institute_code}")
        return institute

    def _resolve_master_questions(self, *, institute, subject_code, topic_code, question_ids, visibility):
        queryset = MasterQuestion.objects.filter(
            source_institute=institute,
            is_active=True,
        ).select_related(
            "source_program",
            "source_subject",
            "source_topic",
            "created_by_teacher",
        ).prefetch_related("options")

        if subject_code:
            queryset = queryset.filter(source_subject__code=subject_code)
        if topic_code:
            queryset = queryset.filter(source_topic__code=topic_code)
        if visibility:
            queryset = queryset.filter(visibility=visibility)
        if question_ids:
            queryset = queryset.filter(id__in=question_ids)

        return list(queryset.order_by("source_subject__code", "source_topic__code", "created_at"))
