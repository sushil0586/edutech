import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.academics.management.seed_presets import PRESETS
from apps.question_bank.management.curated_topic_seed_support import SUBJECT_CODE_MAP


DEFAULT_TEMPLATE_BATCH = "curated_template_batch_v1"
DEFAULT_OUTPUT_ROOT = (
    Path(__file__).resolve().parents[4]
    / "question_blueprints"
    / "class_7"
    / "curated_seed_packs"
    / "math_science_v2_templates"
)


MATH_ARCHETYPES = {
    "foundation": [
        "direct_concept_check",
        "reading_check",
        "simple_conversion",
        "symbol_or_form_identification",
        "basic_classification",
    ],
    "intermediate": [
        "error_detection",
        "compare_and_choose",
        "words_to_figures",
        "representation_selection",
        "place_value_inference",
        "expanded_form",
        "ordering_reasoning",
        "misconception_correction",
    ],
    "advanced": [
        "case_based_interpretation",
        "best_explanation",
        "assertion_reason",
        "multi_select_truth_evaluation",
        "short_answer_reasoning",
        "elimination_based_reasoning",
        "cross_system_conversion",
        "data_interpretation",
        "worked_step_analysis",
        "what_went_wrong",
        "comparison_justification",
        "rule_application",
    ],
}

SCIENCE_ARCHETYPES = {
    "foundation": [
        "classification",
        "indicator_result",
        "direct_concept_check",
        "true_false_concept",
        "familiar_example_identification",
    ],
    "intermediate": [
        "observation_based_inference",
        "daily_life_application",
        "misconception_correction",
        "compare_and_classify",
        "concept_explanation",
        "simple_experiment_reasoning",
        "best_next_step",
        "indicator_interpretation",
    ],
    "advanced": [
        "experiment_interpretation",
        "safety_reasoning",
        "neutralization_application",
        "assertion_reason",
        "case_based_reasoning",
        "best_explanation",
        "multi_select_truth_evaluation",
        "observation_chain_inference",
        "evidence_based_choice",
        "what_can_be_concluded",
        "why_this_happens",
        "decision_under_uncertainty",
    ],
}


DIFFICULTY_DISTRIBUTIONS = {
    25: ["foundation"] * 5 + ["intermediate"] * 10 + ["advanced"] * 10,
    50: ["foundation"] * 10 + ["intermediate"] * 20 + ["advanced"] * 20,
}


def iter_leaf_topics(preset_name, *, subject_aliases, topic_codes):
    preset = PRESETS[preset_name]
    subject_code_set = {SUBJECT_CODE_MAP[alias] for alias in subject_aliases}
    wanted_topic_codes = {code.upper() for code in topic_codes}
    for subject in preset["subjects"]:
        if subject["code"] not in subject_code_set:
            continue
        alias = next(alias for alias, code in SUBJECT_CODE_MAP.items() if code == subject["code"])
        for parent_topic in subject["topics"]:
            for child_name, child_code, _sort_order in parent_topic.get("children", []):
                if wanted_topic_codes and child_code.upper() not in wanted_topic_codes:
                    continue
                yield {
                    "subject_alias": alias,
                    "subject_name": subject["name"],
                    "topic_code": child_code,
                    "topic_name": child_name,
                    "parent_topic_name": parent_topic["name"],
                }


def build_template_questions(*, topic_name, subject_name, subject_alias, count, batch_name):
    if count not in DIFFICULTY_DISTRIBUTIONS:
        supported = ", ".join(str(size) for size in sorted(DIFFICULTY_DISTRIBUTIONS))
        raise CommandError(
            f"This template generator currently supports only these question counts per topic: {supported}."
        )

    archetype_bank = MATH_ARCHETYPES if subject_alias == "math" else SCIENCE_ARCHETYPES
    questions = []
    difficulty_plan = DIFFICULTY_DISTRIBUTIONS[count]
    for index, difficulty in enumerate(difficulty_plan, start=1):
        archetypes = archetype_bank[difficulty]
        archetype = archetypes[(index - 1) % len(archetypes)]
        question_type = choose_question_type(archetype=archetype, difficulty=difficulty, subject_alias=subject_alias)
        focus = build_focus_hint(topic_name=topic_name, subject_name=subject_name, archetype=archetype, difficulty=difficulty)
        prompt = (
            f"[AUTHORING REQUIRED] Create a {difficulty} {question_type.replace('_', ' ')} "
            f"{archetype.replace('_', ' ')} question for Class 7 {subject_name} on '{topic_name}'. "
            f"Focus: {focus}. Keep the question distinct from all other items in this pack."
        )
        explanation = (
            "[AUTHORING REQUIRED] Write a student-friendly explanation that shows the method, "
            "not just the final answer. Mention why the correct answer works and why a common mistake may happen."
        )
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
                "metadata": {
                    "template_status": "authoring_required",
                    "archetype": archetype,
                    "authoring_focus": focus,
                    "source_template_batch": batch_name,
                    "review_required": True,
                    "accepted_answers": ["[AUTHORING REQUIRED] Add one or more accepted answers."]
                    if question_type == "short_answer"
                    else [],
                },
            }
        )
    return questions


def choose_question_type(*, archetype, difficulty, subject_alias):
    if archetype in {"short_answer_reasoning", "concept_explanation", "cross_system_conversion"}:
        return "short_answer"
    if archetype in {"multi_select_truth_evaluation"}:
        return "mcq_multiple"
    if archetype in {"true_false_concept"}:
        return "true_false"
    return "mcq_single"


def default_marks_for(question_type, difficulty):
    if question_type in {"mcq_multiple", "short_answer"} or difficulty == "advanced":
        return "2.00"
    return "1.00"


def negative_marks_for(question_type):
    if question_type == "short_answer":
        return "0.00"
    if question_type == "mcq_multiple":
        return "0.50"
    if question_type == "true_false":
        return "0.00"
    return "0.25"


def build_option_stub(question_type):
    if question_type == "short_answer":
        return []
    if question_type == "true_false":
        return [
            {"option_text": "[AUTHORING REQUIRED] True", "is_correct": True},
            {"option_text": "[AUTHORING REQUIRED] False", "is_correct": False},
        ]
    return [
        {"option_text": "[AUTHORING REQUIRED] Option A", "is_correct": False},
        {"option_text": "[AUTHORING REQUIRED] Option B", "is_correct": True},
        {"option_text": "[AUTHORING REQUIRED] Option C", "is_correct": False},
        {"option_text": "[AUTHORING REQUIRED] Option D", "is_correct": False},
    ]


def build_focus_hint(*, topic_name, subject_name, archetype, difficulty):
    return (
        f"topic='{topic_name}', subject='{subject_name}', difficulty='{difficulty}', "
        f"archetype='{archetype}'. Use a fresh stem, realistic distractors, and avoid near-duplicate patterns."
    )


class Command(BaseCommand):
    help = (
        "Generate 25-question curated authoring templates for every Class 7 Math/Science leaf topic. "
        "This is a separate template path, not the old seed generator."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--preset",
            default="class_7_cbse_core",
            choices=sorted(PRESETS.keys()),
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
            "--overwrite",
            action="store_true",
            help="Overwrite existing template JSON files.",
        )
        parser.add_argument(
            "--output-dir",
            default="",
            help="Optional custom output directory for the generated template packs.",
        )
        parser.add_argument(
            "--batch-name",
            default=DEFAULT_TEMPLATE_BATCH,
            help="Metadata batch label written into each template file.",
        )
        parser.add_argument(
            "--question-count",
            type=int,
            default=25,
            choices=sorted(DIFFICULTY_DISTRIBUTIONS.keys()),
            help="How many template questions to scaffold per topic.",
        )

    def handle(self, *args, **options):
        output_root = Path(options["output_dir"]).expanduser().resolve() if options["output_dir"] else DEFAULT_OUTPUT_ROOT
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
            path = output_root / f"{topic['topic_code']}.json"
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
                "questions": build_template_questions(
                    topic_name=topic["topic_name"],
                    subject_name=topic["subject_name"],
                    subject_alias=topic["subject_alias"],
                    count=options["question_count"],
                    batch_name=options["batch_name"],
                ),
            }
            path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Generated curated {options['question_count']}-question templates under {output_root}"
            )
        )
        self.stdout.write(f"- created={created}")
        self.stdout.write(f"- skipped_existing={skipped}")
