import json
import re
from pathlib import Path

from django.core.management.base import CommandError

from apps.academics.models import TopicDifficulty
from apps.question_bank.management.curated_topic_seed_support import (
    PLACEHOLDER_PATTERNS,
    QUESTION_TYPES_WITH_OPTIONS,
    VALID_DIFFICULTIES,
    VALID_QUESTION_TYPES,
)
from apps.question_bank.models import QuestionType


AUTHORING_ROOT = (
    Path(__file__).resolve().parents[3]
    / "question_blueprints"
    / "class_7"
    / "curated_authoring"
    / "math_science_v2"
)
COMPILED_ROOT = (
    Path(__file__).resolve().parents[3]
    / "question_blueprints"
    / "class_7"
    / "curated_seed_packs"
    / "math_science_v2"
)
TEMPLATE_ROOT = (
    Path(__file__).resolve().parents[3]
    / "question_blueprints"
    / "class_7"
    / "curated_seed_packs"
    / "math_science_v2_templates"
)

QUESTION_HEADER_RE = re.compile(r"^##\s+Question\s+(\d+)\s*$")
OPTION_RE = re.compile(r"^- \[( |x)\]\s+(.*)$", re.IGNORECASE)
LIST_ITEM_RE = re.compile(r"^- (.+)$")
PLACEHOLDER_MARKER = "[AUTHORING REQUIRED]"


def authoring_pack_path(topic_code):
    return AUTHORING_ROOT / f"{topic_code}.md"


def compiled_pack_path(topic_code):
    return COMPILED_ROOT / f"{topic_code}.json"


def template_pack_path(topic_code):
    return TEMPLATE_ROOT / f"{topic_code}.json"


def available_authoring_topic_codes():
    if not AUTHORING_ROOT.exists():
        return []
    return sorted(path.stem for path in AUTHORING_ROOT.glob("*.md"))


def ensure_authoring_root():
    AUTHORING_ROOT.mkdir(parents=True, exist_ok=True)


def _split_questions(markdown_text):
    current = []
    current_number = None
    blocks = []
    for line in markdown_text.splitlines():
        match = QUESTION_HEADER_RE.match(line.strip())
        if match:
            if current_number is not None:
                blocks.append((current_number, current))
            current_number = int(match.group(1))
            current = []
            continue
        if current_number is not None:
            current.append(line.rstrip("\n"))
    if current_number is not None:
        blocks.append((current_number, current))
    return blocks


def _parse_key_value_line(line):
    if ":" not in line:
        return None, None
    key, value = line.split(":", 1)
    return key.strip().lower(), value.strip()


def parse_authoring_markdown(path):
    try:
        text = Path(path).read_text(encoding="utf-8")
    except OSError as exc:
        raise CommandError(f"Could not read authoring file {path}: {exc}") from exc

    lines = text.splitlines()
    header = {}
    question_start_index = None
    for index, line in enumerate(lines):
        if QUESTION_HEADER_RE.match(line.strip()):
            question_start_index = index
            break
        if line.strip().startswith("#"):
            continue
        key, value = _parse_key_value_line(line)
        if key:
            header[key] = value

    if question_start_index is None:
        raise CommandError(f"Authoring file {path} does not contain any '## Question N' sections.")

    required_header_keys = {"topic_code", "topic_name", "subject_name"}
    missing = sorted(required_header_keys - set(header))
    if missing:
        raise CommandError(f"Authoring file {path} is missing header keys: {', '.join(missing)}")

    question_blocks = _split_questions(text)
    questions = [
        _parse_question_block(path=path, question_number=question_number, lines=block_lines)
        for question_number, block_lines in question_blocks
    ]

    return {
        "topic_code": header["topic_code"],
        "topic_name": header["topic_name"],
        "subject_name": header["subject_name"],
        "subject_alias": header.get("subject_alias", ""),
        "questions": questions,
    }


def _parse_question_block(*, path, question_number, lines):
    metadata = {}
    question_type = None
    difficulty_level = None
    default_marks = "1.00"
    negative_marks = "0.25"
    question_text = []
    explanation = []
    options = []
    accepted_answers = []
    archetype = ""
    state = None

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            if state in {"question_text", "explanation"}:
                if state == "question_text":
                    question_text.append("")
                else:
                    explanation.append("")
            continue

        if stripped in {"Question Text:", "Explanation:", "Options:", "Accepted Answers:"}:
            state = stripped[:-1].lower().replace(" ", "_")
            continue

        if state == "options":
            option_match = OPTION_RE.match(stripped)
            if not option_match:
                raise CommandError(
                    f"{path} question #{question_number} has an invalid option line: {stripped}"
                )
            options.append(
                {
                    "option_text": option_match.group(2).strip(),
                    "is_correct": option_match.group(1).lower() == "x",
                }
            )
            continue

        if state == "accepted_answers":
            answer_match = LIST_ITEM_RE.match(stripped)
            if not answer_match:
                raise CommandError(
                    f"{path} question #{question_number} has an invalid accepted answer line: {stripped}"
                )
            accepted_answers.append(answer_match.group(1).strip())
            continue

        if state == "question_text":
            question_text.append(line)
            continue
        if state == "explanation":
            explanation.append(line)
            continue

        key, value = _parse_key_value_line(stripped)
        if key is None:
            continue
        if key == "question_type":
            question_type = value
        elif key == "difficulty_level":
            difficulty_level = value
        elif key == "default_marks":
            default_marks = value
        elif key == "negative_marks":
            negative_marks = value
        elif key == "archetype":
            archetype = value
        elif key.startswith("meta_"):
            metadata[key[5:]] = value

    if question_type not in VALID_QUESTION_TYPES:
        raise CommandError(f"{path} question #{question_number} has invalid question_type: {question_type}")
    if difficulty_level not in VALID_DIFFICULTIES:
        raise CommandError(
            f"{path} question #{question_number} has invalid difficulty_level: {difficulty_level}"
        )

    normalized_question_text = "\n".join(question_text).strip()
    normalized_explanation = "\n".join(explanation).strip()
    if not normalized_question_text:
        raise CommandError(f"{path} question #{question_number} is missing Question Text.")
    if not normalized_explanation:
        raise CommandError(f"{path} question #{question_number} is missing Explanation.")

    if question_type in QUESTION_TYPES_WITH_OPTIONS and len(options) < 2:
        raise CommandError(f"{path} question #{question_number} must define at least 2 options.")
    if question_type == QuestionType.SHORT_ANSWER and not accepted_answers:
        raise CommandError(
            f"{path} question #{question_number} must define at least 1 accepted answer."
        )

    if question_type in {QuestionType.MCQ_SINGLE, QuestionType.TRUE_FALSE}:
        correct_count = sum(1 for option in options if option["is_correct"])
        if correct_count != 1:
            raise CommandError(
                f"{path} question #{question_number} must have exactly 1 correct option."
            )
    if question_type == QuestionType.MCQ_MULTIPLE:
        correct_count = sum(1 for option in options if option["is_correct"])
        if correct_count < 1:
            raise CommandError(
                f"{path} question #{question_number} must have at least 1 correct option."
            )

    metadata = {
        **metadata,
        "archetype": archetype,
        "source_pack": "class7_curated_v2",
    }
    if question_type == QuestionType.SHORT_ANSWER:
        metadata["accepted_answers"] = accepted_answers

    return {
        "question_type": question_type,
        "difficulty_level": difficulty_level,
        "question_text": normalized_question_text,
        "explanation": normalized_explanation,
        "default_marks": default_marks,
        "negative_marks": negative_marks,
        "options": options if question_type in QUESTION_TYPES_WITH_OPTIONS else [],
        "metadata": metadata,
    }


def compile_authoring_markdown(path, *, expected_count=None):
    payload = parse_authoring_markdown(path)
    questions = payload["questions"]
    if expected_count is not None and len(questions) != expected_count:
        raise CommandError(
            f"{path} contains {len(questions)} questions but expected exactly {expected_count}."
        )
    for index, question in enumerate(questions, start=1):
        _lint_compiled_question(path=path, question=question, index=index)
    _lint_duplicate_stems(path=path, questions=questions)
    return payload


def write_compiled_json(payload):
    topic_code = payload["topic_code"]
    out_path = compiled_pack_path(topic_code)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "topic_code": payload["topic_code"],
        "topic_name": payload["topic_name"],
        "questions": payload["questions"],
    }
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out_path


def generate_markdown_from_template_json(topic_code):
    template_path = template_pack_path(topic_code)
    if not template_path.exists():
        raise CommandError(f"Template pack not found for {topic_code}: {template_path}")
    try:
        payload = json.loads(template_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise CommandError(f"Invalid template JSON for {topic_code}: {exc}") from exc

    ensure_authoring_root()
    out_path = authoring_pack_path(topic_code)
    lines = [
        f"# Curated Authoring Pack: {payload['topic_name']}",
        "",
        f"topic_code: {payload['topic_code']}",
        f"topic_name: {payload['topic_name']}",
        f"subject_name: {payload.get('subject_name', '')}",
        f"subject_alias: {payload.get('subject_alias', '')}",
        "",
        "<!-- Write real authored questions below. The compiler rejects placeholder text. -->",
        "",
    ]

    for entry in payload.get("questions", []):
        archetype = entry.get("metadata", {}).get("archetype", "")
        lines.extend(
            [
                f"## Question {entry.get('question_number')}",
                f"question_type: {entry.get('question_type')}",
                f"difficulty_level: {entry.get('difficulty_level')}",
                f"default_marks: {entry.get('default_marks', '1.00')}",
                f"negative_marks: {entry.get('negative_marks', '0.25')}",
                f"archetype: {archetype}",
                "",
                "Question Text:",
                f"{PLACEHOLDER_MARKER} Replace this with a real question for the given topic and archetype.",
                "",
                "Explanation:",
                f"{PLACEHOLDER_MARKER} Replace this with a real student-friendly explanation.",
                "",
            ]
        )
        if entry.get("question_type") in QUESTION_TYPES_WITH_OPTIONS:
            lines.append("Options:")
            for option_index, _ in enumerate(entry.get("options", []), start=1):
                marker = "x" if option_index == 2 else " "
                lines.append(f"- [{marker}] {PLACEHOLDER_MARKER} Option {option_index}")
            lines.append("")
        else:
            lines.extend(
                [
                    "Accepted Answers:",
                    f"- {PLACEHOLDER_MARKER} answer 1",
                    "",
                ]
            )
        lines.append("")

    out_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return out_path


def lint_authoring_markdown(path, *, expected_count=None):
    payload = compile_authoring_markdown(path, expected_count=expected_count)
    warnings = []
    archetype_counts = {}
    difficulty_counts = {}
    for question in payload["questions"]:
        archetype = question["metadata"].get("archetype", "")
        difficulty = question["difficulty_level"]
        archetype_counts[archetype] = archetype_counts.get(archetype, 0) + 1
        difficulty_counts[difficulty] = difficulty_counts.get(difficulty, 0) + 1

    for archetype, count in sorted(archetype_counts.items()):
        if count > 3:
            warnings.append(f"archetype '{archetype}' appears {count} times")

    return {
        "payload": payload,
        "warnings": warnings,
        "difficulty_counts": difficulty_counts,
        "archetype_counts": archetype_counts,
    }


def _lint_compiled_question(*, path, question, index):
    for field_name in ("question_text", "explanation"):
        _ensure_no_placeholder(
            path=path,
            index=index,
            field_name=field_name,
            value=question[field_name],
        )
    for option_index, option in enumerate(question["options"], start=1):
        _ensure_no_placeholder(
            path=path,
            index=index,
            field_name=f"options[{option_index}].option_text",
            value=option["option_text"],
        )
    for answer_index, accepted_answer in enumerate(
        question["metadata"].get("accepted_answers", []), start=1
    ):
        _ensure_no_placeholder(
            path=path,
            index=index,
            field_name=f"metadata.accepted_answers[{answer_index}]",
            value=accepted_answer,
        )


def _ensure_no_placeholder(*, path, index, field_name, value):
    compact_value = " ".join(str(value).split())
    for pattern in PLACEHOLDER_PATTERNS:
        if pattern.search(compact_value):
            raise CommandError(
                f"{path} question #{index} contains authoring placeholder text in "
                f"{field_name}: {compact_value[:140]}"
            )


def _lint_duplicate_stems(*, path, questions):
    seen = {}
    for index, question in enumerate(questions, start=1):
        normalized = _normalize_stem(question["question_text"])
        if normalized in seen:
            raise CommandError(
                f"{path} has near-duplicate question stems at question #{seen[normalized]} and #{index}."
            )
        seen[normalized] = index


def _normalize_stem(value):
    value = value.lower()
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"[^a-z0-9 ]", "", value)
    return value.strip()
