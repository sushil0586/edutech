import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.question_bank.management.commands.generate_curated_topic_pack_templates import (
    DEFAULT_TEMPLATE_BATCH,
    DEFAULT_OUTPUT_ROOT,
    MATH_ARCHETYPES,
    SCIENCE_ARCHETYPES,
    SUBJECT_CODE_MAP,
    build_option_stub,
    build_focus_hint,
    choose_question_type,
    default_marks_for,
    iter_leaf_topics,
    negative_marks_for,
)


VARIANT_PLANS = {
    "a": ["foundation"] * 5 + ["intermediate"] * 8 + ["advanced"] * 12,
    "b": [
        "foundation",
        "intermediate",
        "foundation",
        "intermediate",
        "advanced",
        "foundation",
        "intermediate",
        "advanced",
        "foundation",
        "intermediate",
        "advanced",
        "foundation",
        "intermediate",
        "advanced",
        "intermediate",
        "advanced",
        "intermediate",
        "advanced",
        "advanced",
        "intermediate",
        "advanced",
        "advanced",
        "advanced",
        "advanced",
        "advanced",
    ],
    "c": [
        "advanced",
        "intermediate",
        "foundation",
        "advanced",
        "intermediate",
        "foundation",
        "advanced",
        "intermediate",
        "foundation",
        "advanced",
        "intermediate",
        "foundation",
        "advanced",
        "intermediate",
        "foundation",
        "advanced",
        "intermediate",
        "advanced",
        "intermediate",
        "advanced",
        "advanced",
        "intermediate",
        "advanced",
        "advanced",
        "advanced",
    ],
}

ARCHETYPE_ROTATION = {
    "a": {"foundation": 0, "intermediate": 0, "advanced": 0},
    "b": {"foundation": 2, "intermediate": 3, "advanced": 4},
    "c": {"foundation": 4, "intermediate": 5, "advanced": 7},
}

QUESTION_TYPE_OVERRIDES = {
    "b": {
        "short_answer_reasoning": "short_answer",
        "concept_explanation": "short_answer",
        "cross_system_conversion": "short_answer",
        "misconception_correction": "mcq_single",
        "assertion_reason": "mcq_single",
        "compare_and_choose": "mcq_multiple",
    },
    "c": {
        "short_answer_reasoning": "short_answer",
        "concept_explanation": "short_answer",
        "cross_system_conversion": "short_answer",
        "rule_application": "short_answer",
        "worked_step_analysis": "mcq_single",
        "error_detection": "mcq_single",
        "best_next_step": "mcq_multiple",
    },
}

DEFAULT_VARIANT_ROOT = DEFAULT_OUTPUT_ROOT.parent / "math_science_v2_variants"


def rotated(sequence, shift):
    if not sequence:
        return sequence
    shift = shift % len(sequence)
    return sequence[shift:] + sequence[:shift]


def question_type_for_variant(*, variant_id, archetype, difficulty, subject_alias):
    override = QUESTION_TYPE_OVERRIDES.get(variant_id, {}).get(archetype)
    if override:
        return override
    return choose_question_type(
        archetype=archetype,
        difficulty=difficulty,
        subject_alias=subject_alias,
    )


def build_variant_questions(*, topic_name, subject_name, subject_alias, variant_id, batch_name):
    plan = VARIANT_PLANS[variant_id]
    archetype_bank = MATH_ARCHETYPES if subject_alias == "math" else SCIENCE_ARCHETYPES
    rotation = ARCHETYPE_ROTATION[variant_id]
    counters = {"foundation": 0, "intermediate": 0, "advanced": 0}
    questions = []

    for index, difficulty in enumerate(plan, start=1):
        base_archetypes = list(archetype_bank[difficulty])
        ordered_archetypes = rotated(base_archetypes, rotation[difficulty])
        archetype = ordered_archetypes[counters[difficulty] % len(ordered_archetypes)]
        counters[difficulty] += 1

        question_type = question_type_for_variant(
            variant_id=variant_id,
            archetype=archetype,
            difficulty=difficulty,
            subject_alias=subject_alias,
        )
        focus = (
            build_focus_hint(
                topic_name=topic_name,
                subject_name=subject_name,
                archetype=archetype,
                difficulty=difficulty,
            )
            + f" Variant='{variant_id}'. Avoid using the same visible stem family as variant 'a' for the same topic."
        )
        prompt = (
            f"[AUTHORING REQUIRED][VARIANT {variant_id.upper()}] Create a {difficulty} "
            f"{question_type.replace('_', ' ')} {archetype.replace('_', ' ')} question for "
            f"Class 7 {subject_name} on '{topic_name}'. Focus: {focus}"
        )
        explanation = (
            "[AUTHORING REQUIRED] Write a fresh explanation that teaches the method, mentions the "
            "main misconception risk, and does not mirror variant A wording."
        )
        metadata = {
            "template_status": "authoring_required",
            "variant_id": variant_id,
            "archetype": archetype,
            "authoring_focus": focus,
            "source_template_batch": batch_name,
            "review_required": True,
            "avoid_variants": [existing for existing in ["a", "b", "c"] if existing != variant_id],
        }
        if question_type == "short_answer":
            metadata["accepted_answers"] = ["[AUTHORING REQUIRED] Add one or more accepted answers."]

        questions.append(
            {
                "question_number": index,
                "question_type": question_type,
                "difficulty_level": difficulty,
                "question_text": prompt,
                "explanation": explanation,
                "default_marks": default_marks_for(question_type, difficulty),
                "negative_marks": negative_marks_for(question_type),
                "options": build_option_stub(question_type),
                "metadata": metadata,
            }
        )

    return questions


class Command(BaseCommand):
    help = (
        "Generate variant-aware 25-question authoring templates for Class 7 Math/Science topics. "
        "Use this when the second run should intentionally differ from the first."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--preset",
            default="class_7_cbse_core",
            choices=["class_7_cbse_core"],
            help="Academic preset used to discover leaf topics.",
        )
        parser.add_argument(
            "--subjects",
            nargs="+",
            default=["math", "science"],
            choices=sorted(SUBJECT_CODE_MAP.keys()),
            help="Which subject aliases to scaffold.",
        )
        parser.add_argument(
            "--topic-codes",
            nargs="*",
            default=[],
            help="Optional specific leaf topic codes to scaffold.",
        )
        parser.add_argument(
            "--variant",
            default="b",
            choices=sorted(VARIANT_PLANS.keys()),
            help="Variant id to generate. Use 'a' only if you want a baseline variant in this folder.",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Overwrite existing variant template JSON files.",
        )
        parser.add_argument(
            "--output-dir",
            default="",
            help="Optional custom output directory.",
        )
        parser.add_argument(
            "--batch-name",
            default=f"{DEFAULT_TEMPLATE_BATCH}_variants",
            help="Metadata batch label written into each variant template file.",
        )

    def handle(self, *args, **options):
        variant_id = options["variant"]
        output_root = (
            Path(options["output_dir"]).expanduser().resolve()
            if options["output_dir"]
            else DEFAULT_VARIANT_ROOT / variant_id
        )
        output_root.mkdir(parents=True, exist_ok=True)

        topics = list(
            iter_leaf_topics(
                options["preset"],
                subject_aliases=options["subjects"],
                topic_codes=options["topic_codes"],
            )
        )
        if not topics:
            raise CommandError("No matching Class 7 Math/Science leaf topics were found.")

        created = 0
        skipped = 0
        for topic in topics:
            path = output_root / f"{topic['topic_code']}.{variant_id}.json"
            if path.exists() and not options["overwrite"]:
                skipped += 1
                continue

            payload = {
                "topic_code": topic["topic_code"],
                "topic_name": topic["topic_name"],
                "subject_name": topic["subject_name"],
                "subject_alias": topic["subject_alias"],
                "parent_topic_name": topic["parent_topic_name"],
                "template_only": True,
                "template_batch": options["batch_name"],
                "variant_id": variant_id,
                "questions": build_variant_questions(
                    topic_name=topic["topic_name"],
                    subject_name=topic["subject_name"],
                    subject_alias=topic["subject_alias"],
                    variant_id=variant_id,
                    batch_name=options["batch_name"],
                ),
            }
            path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Generated curated variant templates under {output_root}"
            )
        )
        self.stdout.write(f"- variant={variant_id}")
        self.stdout.write(f"- created={created}")
        self.stdout.write(f"- skipped_existing={skipped}")
