import json
import re
from pathlib import Path

from django.core.management.base import CommandError

from apps.academics.models import TopicDifficulty
from apps.question_bank.models import QuestionType


SUBJECT_CODE_MAP = {
    "math": "CLS7-MATH",
    "science": "CLS7-SCI",
}

CURATED_BATCH = "curated_math_science_v2"
PACK_ROOT = (
    Path(__file__).resolve().parents[3]
    / "question_blueprints"
    / "class_7"
    / "curated_seed_packs"
    / "math_science_v2"
)

VALID_QUESTION_TYPES = {
    QuestionType.MCQ_SINGLE,
    QuestionType.MCQ_MULTIPLE,
    QuestionType.TRUE_FALSE,
    QuestionType.SHORT_ANSWER,
}
VALID_DIFFICULTIES = {
    TopicDifficulty.FOUNDATION,
    TopicDifficulty.INTERMEDIATE,
    TopicDifficulty.ADVANCED,
}
QUESTION_TYPES_WITH_OPTIONS = {
    QuestionType.MCQ_SINGLE,
    QuestionType.MCQ_MULTIPLE,
    QuestionType.TRUE_FALSE,
}
PLACEHOLDER_PATTERNS = (
    re.compile(r"\[authoring required\]", re.IGNORECASE),
    re.compile(r"\bplaceholder\b", re.IGNORECASE),
    re.compile(r"\btodo\b", re.IGNORECASE),
    re.compile(r"^\s*create\s+(an?|the)\b", re.IGNORECASE),
    re.compile(r"\buse a fresh stem\b", re.IGNORECASE),
    re.compile(r"\bkeep the question distinct\b", re.IGNORECASE),
)


def topic_pack_path(topic_code):
    return PACK_ROOT / f"{topic_code}.json"


def available_topic_codes():
    if not PACK_ROOT.exists():
        return []
    return sorted(path.stem for path in PACK_ROOT.glob("*.json"))


def load_curated_topic_pack(topic_code, *, expected_count):
    pack_path = topic_pack_path(topic_code)
    if not pack_path.exists():
        raise CommandError(
            f"No curated topic pack found for {topic_code}. "
            f"Expected file: {pack_path}"
        )

    try:
        payload = json.loads(pack_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise CommandError(f"Invalid JSON in curated pack {pack_path}: {exc}") from exc

    if not isinstance(payload, dict):
        raise CommandError(f"Curated pack {pack_path} must contain a JSON object.")

    questions = payload.get("questions")
    if not isinstance(questions, list):
        raise CommandError(f"Curated pack {pack_path} must contain a 'questions' list.")

    if len(questions) < expected_count:
        raise CommandError(
            f"Curated pack {topic_code} has only {len(questions)} questions, "
            f"but {expected_count} were requested."
        )

    validated = []
    for index, entry in enumerate(questions[:expected_count], start=1):
        validated.append(_validate_question_entry(topic_code=topic_code, entry=entry, index=index))

    return validated


def _validate_question_entry(*, topic_code, entry, index):
    if not isinstance(entry, dict):
        raise CommandError(f"{topic_code} question #{index} must be a JSON object.")

    question_type = entry.get("question_type")
    if question_type not in VALID_QUESTION_TYPES:
        raise CommandError(
            f"{topic_code} question #{index} has invalid question_type: {question_type}"
        )

    difficulty_level = entry.get("difficulty_level")
    if difficulty_level not in VALID_DIFFICULTIES:
        raise CommandError(
            f"{topic_code} question #{index} has invalid difficulty_level: {difficulty_level}"
        )

    question_text = str(entry.get("question_text", "")).strip()
    if not question_text:
        raise CommandError(f"{topic_code} question #{index} is missing question_text.")
    _ensure_final_authored_text(
        topic_code=topic_code,
        index=index,
        field_name="question_text",
        value=question_text,
    )

    explanation = str(entry.get("explanation", "")).strip()
    if not explanation:
        raise CommandError(f"{topic_code} question #{index} is missing explanation.")
    _ensure_final_authored_text(
        topic_code=topic_code,
        index=index,
        field_name="explanation",
        value=explanation,
    )

    default_marks = str(entry.get("default_marks", "1.00")).strip() or "1.00"
    negative_marks = str(entry.get("negative_marks", "0.00")).strip() or "0.00"
    metadata = entry.get("metadata")
    if metadata is None:
        metadata = {}
    if not isinstance(metadata, dict):
        raise CommandError(f"{topic_code} question #{index} metadata must be an object.")

    options = entry.get("options") or []
    if question_type in QUESTION_TYPES_WITH_OPTIONS:
        if not isinstance(options, list) or len(options) < 2:
            raise CommandError(
                f"{topic_code} question #{index} must have at least 2 options."
            )

        normalized_options = []
        correct_count = 0
        for option_index, option in enumerate(options, start=1):
            if not isinstance(option, dict):
                raise CommandError(
                    f"{topic_code} question #{index} option #{option_index} must be an object."
                )
            option_text = str(option.get("option_text", "")).strip()
            if not option_text:
                raise CommandError(
                    f"{topic_code} question #{index} option #{option_index} is missing option_text."
                )
            _ensure_final_authored_text(
                topic_code=topic_code,
                index=index,
                field_name=f"options[{option_index}].option_text",
                value=option_text,
            )
            is_correct = bool(option.get("is_correct", False))
            correct_count += int(is_correct)
            normalized_options.append(
                {
                    "option_text": option_text,
                    "is_correct": is_correct,
                }
            )

        if question_type in {QuestionType.MCQ_SINGLE, QuestionType.TRUE_FALSE} and correct_count != 1:
            raise CommandError(
                f"{topic_code} question #{index} must have exactly 1 correct option."
            )
        if question_type == QuestionType.MCQ_MULTIPLE and correct_count < 1:
            raise CommandError(
                f"{topic_code} question #{index} must have at least 1 correct option."
            )
    else:
        normalized_options = []
        accepted_answers = metadata.get("accepted_answers")
        if not isinstance(accepted_answers, list) or not accepted_answers:
            raise CommandError(
                f"{topic_code} short-answer question #{index} must define metadata.accepted_answers."
            )
        for answer_index, accepted_answer in enumerate(accepted_answers, start=1):
            normalized_answer = str(accepted_answer).strip()
            if not normalized_answer:
                raise CommandError(
                    f"{topic_code} short-answer question #{index} has an empty accepted answer."
                )
            _ensure_final_authored_text(
                topic_code=topic_code,
                index=index,
                field_name=f"metadata.accepted_answers[{answer_index}]",
                value=normalized_answer,
            )

    return {
        "question_type": question_type,
        "difficulty_level": difficulty_level,
        "question_text": question_text,
        "explanation": explanation,
        "default_marks": default_marks,
        "negative_marks": negative_marks,
        "options": normalized_options,
        "metadata": metadata,
    }


def _ensure_final_authored_text(*, topic_code, index, field_name, value):
    compact_value = " ".join(str(value).split())
    for pattern in PLACEHOLDER_PATTERNS:
        if pattern.search(compact_value):
            raise CommandError(
                f"{topic_code} question #{index} contains authoring placeholder text in "
                f"{field_name}: {compact_value[:140]}"
            )
