from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.core.files import File
from django.db import transaction

from apps.academics.management.seed_presets import PRESETS
from apps.academics.models import Program, Subject, Topic
from apps.institutes.models import Institute
from apps.question_bank.management.seed_guardrails import (
    assert_catalog_scope_is_consistent,
    ensure_subject_seed_scope_is_active,
    ensure_topic_seed_scope_is_active,
)
from apps.question_bank.management.standalone_bank_seed_support import (
    STANDALONE_BATCH,
    build_topic_code,
    parse_standalone_question_bank,
)
from apps.question_bank.models import Question, QuestionAttachment, QuestionOption
from apps.question_bank.services import sync_master_question_from_institute_question


class Command(BaseCommand):
    help = (
        "Seed a standalone Class 7 Math markdown question bank directly into the DB, "
        "creating the target topic if needed."
    )

    def add_arguments(self, parser):
        parser.add_argument("institute_code", help="Institute code to seed questions into.")
        parser.add_argument(
            "--file",
            required=True,
            help="Path to the standalone Class 7 Math markdown bank file.",
        )
        parser.add_argument(
            "--topic-name",
            default="",
            help="Override topic name. Defaults to the Topic header inside the markdown file.",
        )
        parser.add_argument(
            "--topic-code",
            default="",
            help="Optional topic code. Defaults to an auto-generated Class 7 Math code.",
        )
        parser.add_argument(
            "--subject-code",
            default="CLS7-MATH",
            help="Subject code to seed under. Defaults to CLS7-MATH.",
        )
        parser.add_argument(
            "--preset",
            default="class_7_cbse_core",
            choices=sorted(PRESETS.keys()),
            help="Academic preset used to resolve the target program.",
        )
        parser.add_argument(
            "--expected-count",
            type=int,
            default=50,
            help="Required question count in the standalone markdown file.",
        )
        parser.add_argument(
            "--replace-existing",
            action="store_true",
            help="Delete the previous standalone-bank batch for this topic before reseeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute = self._resolve_institute(options["institute_code"].strip())
        program = self._resolve_program(institute=institute, preset=options["preset"])
        subject = self._resolve_subject(institute=institute, code=options["subject_code"].strip())
        assert_catalog_scope_is_consistent(
            institute_code=institute.code,
            subject_code=subject.code,
        )
        ensure_subject_seed_scope_is_active(subject)
        payload = parse_standalone_question_bank(
            options["file"],
            expected_count=options["expected_count"],
        )

        topic_name = options["topic_name"].strip() or payload["topic_name"]
        topic_code = options["topic_code"].strip().upper() or build_topic_code(topic_name)
        topic = self._resolve_or_create_topic(
            institute=institute,
            subject=subject,
            topic_name=topic_name,
            topic_code=topic_code,
        )
        ensure_topic_seed_scope_is_active(topic)

        if options["replace_existing"]:
            deleted_count, _ = Question.objects.filter(
                institute=institute,
                subject=subject,
                topic=topic,
                metadata__seed_batch=STANDALONE_BATCH,
            ).delete()
            self.stdout.write(f"Deleted {deleted_count} existing standalone-bank question(s).")

        created_count = 0
        for sequence_number, question_payload in enumerate(payload["questions"], start=1):
            self._create_question(
                institute=institute,
                program=program,
                subject=subject,
                topic=topic,
                source_file=options["file"],
                payload=question_payload,
                sequence_number=sequence_number,
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created_count} standalone Class 7 Math question(s) into "
                f"{institute.code} / {subject.code} / {topic.code}."
            )
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

    def _resolve_or_create_topic(self, *, institute, subject, topic_name, topic_code):
        topic = Topic.objects.filter(institute=institute, subject=subject, code=topic_code).first()
        if topic is None:
            topic = Topic.objects.filter(institute=institute, subject=subject, name__iexact=topic_name).first()

        if topic is not None:
            changed_fields = []
            if topic.name != topic_name:
                topic.name = topic_name
                changed_fields.append("name")
            if not topic.is_active:
                topic.is_active = True
                changed_fields.append("is_active")
            if changed_fields:
                changed_fields.append("updated_at")
                topic.save(update_fields=changed_fields)
            return topic

        next_sort_order = (
            Topic.objects.filter(institute=institute, subject=subject)
            .order_by("-sort_order")
            .values_list("sort_order", flat=True)
            .first()
            or 0
        )
        return Topic.objects.create(
            institute=institute,
            subject=subject,
            name=topic_name,
            code=topic_code,
            description=f"Standalone seeded Class 7 Math topic for {topic_name}.",
            difficulty_level=payload_default_difficulty(),
            sort_order=next_sort_order + 1,
            is_active=True,
        )

    def _create_question(
        self,
        *,
        institute,
        program,
        subject,
        topic,
        source_file,
        payload,
        sequence_number,
    ):
        metadata = {
            "seed_batch": STANDALONE_BATCH,
            "topic_code": topic.code,
            "topic_name": topic.name,
            "seed_sequence": sequence_number,
            "source_file": source_file,
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

        attachment_records = []
        for display_order, attachment in enumerate(payload.get("attachments", []), start=1):
            attachment_path = self._resolve_attachment_path(
                source_file=source_file,
                attachment_path=attachment["file"],
            )
            with attachment_path.open("rb") as handle:
                attachment_records.append(
                    QuestionAttachment(
                        question=question,
                        file=File(handle, name=attachment_path.name),
                        attachment_type=attachment["attachment_type"],
                        title=attachment["title"],
                        display_order=display_order,
                        alt_text=attachment["alt_text"],
                        is_inline=attachment["is_inline"],
                        is_active=True,
                    )
                )
                attachment_records[-1].save()

        sync_master_question_from_institute_question(question)
        return question

    def _resolve_attachment_path(self, *, source_file, attachment_path):
        raw_path = Path(attachment_path)
        if raw_path.is_absolute():
            candidate = raw_path
        else:
            source_path = Path(source_file)
            candidate = (source_path.parent / raw_path).resolve()
            if not candidate.exists():
                candidate = (Path.cwd() / raw_path).resolve()

        if not candidate.exists():
            raise CommandError(
                f"Attachment file not found for standalone bank: {attachment_path}"
            )
        return candidate


def payload_default_difficulty():
    return "intermediate"
