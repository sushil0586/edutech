from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.management.seed_presets import PRESETS
from apps.academics.models import Program, Subject, Topic, TopicDifficulty
from apps.institutes.models import Institute
from apps.question_bank.management.curriculum_seed_support import (
    DIFFICULTY_SEQUENCE,
    SUBJECT_CODE_MAP,
    build_payload,
)
from apps.question_bank.management.seed_guardrails import (
    assert_catalog_scope_is_consistent,
    ensure_subject_seed_scope_is_active,
    ensure_topic_seed_scope_is_active,
)
from apps.question_bank.models import (
    MasterQuestion,
    MasterQuestionOption,
    MasterQuestionSourceType,
    MasterQuestionVisibility,
)


SEED_BATCH = "master_question_library_v1"


class Command(BaseCommand):
    help = (
        "Seed canonical master-question library entries for the shared public institute "
        "without auto-linking them to private institutes."
    )

    def add_arguments(self, parser):
        parser.add_argument("institute_code", help="Public institute code to seed the master library into.")
        parser.add_argument(
            "--preset",
            default="class_7_cbse_core",
            choices=sorted(PRESETS.keys()),
            help="Academic preset whose subject/topic tree should be used.",
        )
        parser.add_argument(
            "--subjects",
            nargs="+",
            default=["math", "science"],
            choices=sorted(SUBJECT_CODE_MAP.keys()),
            help="One or more subject aliases to seed.",
        )
        parser.add_argument(
            "--questions-per-topic",
            type=int,
            default=100,
            help="How many master questions to generate per leaf topic.",
        )
        parser.add_argument(
            "--visibility",
            default=MasterQuestionVisibility.SHARED_BY_REQUEST,
            choices=[choice[0] for choice in MasterQuestionVisibility.choices],
            help="Visibility to apply to the generated master questions.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute = self._resolve_public_institute(options["institute_code"].strip())
        program = self._resolve_program(institute=institute, preset=options["preset"])
        questions_per_topic = options["questions_per_topic"]
        if questions_per_topic <= 0:
            raise CommandError("--questions-per-topic must be greater than zero.")

        summary = {
            "created": 0,
            "updated": 0,
            "subjects": {},
            "difficulty": {
                TopicDifficulty.FOUNDATION: 0,
                TopicDifficulty.INTERMEDIATE: 0,
                TopicDifficulty.ADVANCED: 0,
            },
        }

        for subject_alias in options["subjects"]:
            subject = self._resolve_subject(institute=institute, code=SUBJECT_CODE_MAP[subject_alias])
            assert_catalog_scope_is_consistent(
                institute_code=institute.code,
                subject_code=subject.code,
            )
            ensure_subject_seed_scope_is_active(subject)
            leaf_topics = list(
                Topic.objects.filter(subject=subject, parent_topic__isnull=False).order_by(
                    "sort_order", "name"
                )
            )
            if not leaf_topics:
                raise CommandError(
                    f"No leaf topics found for subject {subject.code}. Seed academics first."
                )

            subject_counts = {"created": 0, "updated": 0, "topics": len(leaf_topics)}
            for topic in leaf_topics:
                ensure_topic_seed_scope_is_active(topic)
                for sequence_number in range(1, questions_per_topic + 1):
                    difficulty_level = DIFFICULTY_SEQUENCE[(sequence_number - 1) % len(DIFFICULTY_SEQUENCE)]
                    question_type, payload = build_payload(
                        subject_alias=subject_alias,
                        topic=topic,
                        difficulty_level=difficulty_level,
                        sequence_number=sequence_number,
                    )
                    created = self._upsert_master_question(
                        institute=institute,
                        program=program,
                        subject=subject,
                        topic=topic,
                        question_type=question_type,
                        payload=payload,
                        subject_alias=subject_alias,
                        sequence_number=sequence_number,
                        visibility=options["visibility"],
                    )
                    summary["created" if created else "updated"] += 1
                    subject_counts["created" if created else "updated"] += 1
                    summary["difficulty"][difficulty_level] += 1

            summary["subjects"][subject_alias] = subject_counts

        self.stdout.write(
            self.style.SUCCESS(
                f"Master question library seeded for {institute.code} using preset {options['preset']}."
            )
        )
        self.stdout.write(f"- created={summary['created']} updated={summary['updated']}")
        self.stdout.write(
            "- difficulty="
            f"foundation:{summary['difficulty'][TopicDifficulty.FOUNDATION]} "
            f"intermediate:{summary['difficulty'][TopicDifficulty.INTERMEDIATE]} "
            f"advanced:{summary['difficulty'][TopicDifficulty.ADVANCED]}"
        )
        for subject_alias, counts in summary["subjects"].items():
            self.stdout.write(
                f"- {subject_alias}: topics={counts['topics']} created={counts['created']} updated={counts['updated']}"
            )

    def _resolve_public_institute(self, institute_code):
        institute = Institute.objects.filter(code=institute_code).first()
        if institute is None:
            raise CommandError(f"Institute not found: {institute_code}")
        if not (institute.metadata or {}).get("is_public_content_hub"):
            raise CommandError(
                f"Institute {institute_code} is not marked as the public content hub."
            )
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

    def _upsert_master_question(
        self,
        *,
        institute,
        program,
        subject,
        topic,
        question_type,
        payload,
        subject_alias,
        sequence_number,
        visibility,
    ):
        metadata = {
            "seed_batch": SEED_BATCH,
            "subject_alias": subject_alias,
            "topic_code": topic.code,
            "topic_name": topic.name,
            "seed_sequence": sequence_number,
            **(payload.get("metadata") or {}),
        }
        defaults = {
            "source_program": program,
            "source_subject": subject,
            "source_topic": topic,
            "created_by_teacher": None,
            "question_type": question_type,
            "difficulty_level": payload["difficulty_level"],
            "content_format": "plain_text",
            "explanation": payload["explanation"],
            "default_marks": payload["default_marks"],
            "negative_marks": payload["negative_marks"],
            "is_verified": True,
            "source_type": MasterQuestionSourceType.PLATFORM,
            "visibility": visibility,
            "is_active": True,
            "metadata": metadata,
        }
        master_question = MasterQuestion.objects.filter(
            source_institute=institute,
            source_subject=subject,
            source_topic=topic,
            metadata__seed_batch=SEED_BATCH,
            metadata__seed_sequence=sequence_number,
        ).first()
        created = master_question is None
        if master_question is None:
            master_question = MasterQuestion(
                source_institute=institute,
                question_text=payload["question_text"],
                **defaults,
            )
        else:
            master_question.question_text = payload["question_text"]
            for field, value in defaults.items():
                setattr(master_question, field, value)
        master_question.save()

        master_question.options.all().delete()
        for option_order, option in enumerate(payload.get("options", []), start=1):
            MasterQuestionOption.objects.create(
                master_question=master_question,
                option_text=option["option_text"],
                option_order=option_order,
                is_correct=option["is_correct"],
                content_format="plain_text",
                is_active=True,
            )
        return created
