import re
from pathlib import Path
from uuid import uuid4

from django.core.management.base import CommandError
from django.utils.text import slugify

from apps.academics.models import TopicDifficulty
from apps.question_bank.models import AttachmentType, QuestionType


STANDALONE_BATCH = "class7_math_standalone_markdown_v1"
QUESTION_HEADER_RE = re.compile(r"^##\s+Question\s+(\d+)\s*$")
OPTION_LINE_RE = re.compile(r"^-\s*([A-Z])\.\s+(.*)$")
HEADER_LINE_RE = re.compile(r"^([^:]+):\s*(.*)$")
ATTACHMENT_ITEM_RE = re.compile(r"^-\s*([a-zA-Z_]+):\s*(.*)$")
ATTACHMENT_DETAIL_RE = re.compile(r"^([a-zA-Z_]+):\s*(.*)$")

QUESTION_TYPE_MAP = {
    "direct concept": QuestionType.MCQ_SINGLE,
    "reading and interpretation": QuestionType.MCQ_SINGLE,
    "error detection": QuestionType.MCQ_SINGLE,
    "application based": QuestionType.MCQ_SINGLE,
    "real life scenario": QuestionType.MCQ_SINGLE,
    "logic based": QuestionType.MCQ_SINGLE,
    "assertion reason": QuestionType.MCQ_SINGLE,
    "case study": QuestionType.MCQ_SINGLE,
    "olympiad style": QuestionType.MCQ_SINGLE,
    "multi-step reasoning": QuestionType.MCQ_SINGLE,
    "multi-select": QuestionType.MCQ_MULTIPLE,
    "short answer": QuestionType.SHORT_ANSWER,
}

DIFFICULTY_MAP = {
    "foundation": TopicDifficulty.FOUNDATION,
    "intermediate": TopicDifficulty.INTERMEDIATE,
    "advanced": TopicDifficulty.ADVANCED,
    "advanced/olympiad": TopicDifficulty.ADVANCED,
}

VALID_ATTACHMENT_TYPES = {choice for choice, _ in AttachmentType.choices}

STANDALONE_PLACEHOLDER_PATTERNS = (
    re.compile(r"\[authoring required\]", re.IGNORECASE),
    re.compile(r"\btodo\b", re.IGNORECASE),
    re.compile(r"^\s*create\s+(an?|the)\b", re.IGNORECASE),
    re.compile(r"\buse a fresh stem\b", re.IGNORECASE),
    re.compile(r"\bkeep the question distinct\b", re.IGNORECASE),
)


def parse_standalone_question_bank(path, *, expected_count=None):
    source_path = Path(path)
    try:
        text = source_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise CommandError(f"Could not read standalone bank file {path}: {exc}") from exc

    topic_name = _extract_header_value(text, "Topic")
    target_class = _extract_header_value(text, "Target Class", required=False)
    question_count = _extract_header_value(text, "Question Count", required=False)

    blocks = _split_question_blocks(text)
    if not blocks:
        raise CommandError(f"{path} does not contain any '## Question N' sections.")

    if expected_count is not None and len(blocks) != expected_count:
        raise CommandError(
            f"{path} contains {len(blocks)} questions but expected exactly {expected_count}."
        )

    parsed_questions = []
    for question_number, lines in blocks:
        parsed_questions.append(
            _parse_question_block(
                path=source_path,
                question_number=question_number,
                lines=lines,
            )
        )

    _lint_duplicate_stems(path=source_path, questions=parsed_questions)

    return {
        "topic_name": topic_name,
        "target_class": target_class,
        "question_count": question_count,
        "questions": parsed_questions,
    }


def build_topic_code(topic_name):
    slug = slugify(topic_name).replace("-", "_").upper()
    return f"CLS7-MATH-{slug}"


def _extract_header_value(text, label, *, required=True):
    pattern = re.compile(rf"^{re.escape(label)}:\s*(.+?)\s*$", re.MULTILINE)
    match = pattern.search(text)
    if match:
        return match.group(1).strip()
    if required:
        raise CommandError(f"Standalone bank is missing required header: {label}")
    return ""


def _split_question_blocks(text):
    blocks = []
    current_lines = []
    current_number = None
    for line in text.splitlines():
        match = QUESTION_HEADER_RE.match(line.strip())
        if match:
            if current_number is not None:
                blocks.append((current_number, current_lines))
            current_number = int(match.group(1))
            current_lines = []
            continue
        if current_number is not None:
            current_lines.append(line.rstrip("\n"))
    if current_number is not None:
        blocks.append((current_number, current_lines))
    return blocks


def _parse_question_block(*, path, question_number, lines):
    fields = {}
    current_key = None
    multiline_values = {
        "question text": [],
        "explanation": [],
    }
    options = []
    attachments = []
    current_attachment = None

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            if current_key in multiline_values:
                multiline_values[current_key].append("")
            continue

        header_match = HEADER_LINE_RE.match(stripped)
        if header_match:
            key = header_match.group(1).strip().lower()
            value = header_match.group(2).strip()
            if key in {"question type", "difficulty level", "correct answer", "common mistake", "learning objective"}:
                fields[key] = value
                current_key = None
                continue
            if key in {"question text", "explanation"}:
                current_key = key
                if value:
                    multiline_values[key].append(value)
                continue
            if key == "options":
                current_key = "options"
                continue
            if key == "attachments":
                current_key = "attachments"
                continue

        if current_key == "options":
            option_match = OPTION_LINE_RE.match(stripped)
            if not option_match:
                raise CommandError(f"{path} question #{question_number} has invalid option line: {stripped}")
            options.append(
                {
                    "label": option_match.group(1).strip(),
                    "option_text": option_match.group(2).strip(),
                }
            )
            continue

        if current_key == "attachments":
            attachment_item_match = ATTACHMENT_ITEM_RE.match(stripped)
            if attachment_item_match:
                if current_attachment:
                    attachments.append(current_attachment)
                current_attachment = {
                    attachment_item_match.group(1).strip().lower(): attachment_item_match.group(2).strip()
                }
                continue
            attachment_detail_match = ATTACHMENT_DETAIL_RE.match(stripped)
            if attachment_detail_match and current_attachment is not None:
                current_attachment[attachment_detail_match.group(1).strip().lower()] = (
                    attachment_detail_match.group(2).strip()
                )
                continue
            raise CommandError(f"{path} question #{question_number} has invalid attachment line: {stripped}")

        if current_key in multiline_values:
            multiline_values[current_key].append(line)
            continue

    if current_attachment:
        attachments.append(current_attachment)

    author_type = fields.get("question type", "").strip()
    if not author_type:
        raise CommandError(f"{path} question #{question_number} is missing Question Type.")
    question_type = QUESTION_TYPE_MAP.get(author_type.lower())
    if question_type is None:
        raise CommandError(f"{path} question #{question_number} has unsupported Question Type: {author_type}")

    difficulty_label = fields.get("difficulty level", "").strip()
    difficulty_level = DIFFICULTY_MAP.get(difficulty_label.lower())
    if difficulty_level is None:
        raise CommandError(
            f"{path} question #{question_number} has unsupported Difficulty Level: {difficulty_label}"
        )

    question_text = "\n".join(multiline_values["question text"]).strip()
    explanation_text = "\n".join(multiline_values["explanation"]).strip()
    common_mistake = fields.get("common mistake", "").strip()
    learning_objective = fields.get("learning objective", "").strip()
    correct_answer_raw = fields.get("correct answer", "").strip()

    if not question_text:
        raise CommandError(f"{path} question #{question_number} is missing Question Text.")
    if not explanation_text:
        raise CommandError(f"{path} question #{question_number} is missing Explanation.")

    _ensure_final_authored_text(path=path, question_number=question_number, field_name="question_text", value=question_text)
    _ensure_final_authored_text(path=path, question_number=question_number, field_name="explanation", value=explanation_text)
    if common_mistake:
        _ensure_final_authored_text(
            path=path,
            question_number=question_number,
            field_name="common_mistake",
            value=common_mistake,
        )
    if learning_objective:
        _ensure_final_authored_text(
            path=path,
            question_number=question_number,
            field_name="learning_objective",
            value=learning_objective,
        )

    metadata = {
        "source_pack": STANDALONE_BATCH,
        "authored_question_type": author_type,
        "common_mistake": common_mistake,
        "learning_objective": learning_objective,
        "source_question_number": question_number,
    }

    explanation = explanation_text
    if common_mistake:
        explanation += f"\n\nCommon Mistake: {common_mistake}"
    if learning_objective:
        explanation += f"\n\nLearning Objective: {learning_objective}"

    if question_type == QuestionType.SHORT_ANSWER:
        if options:
            raise CommandError(f"{path} question #{question_number} is Short Answer and should not define options.")
        if not correct_answer_raw:
            raise CommandError(f"{path} question #{question_number} is missing Correct Answer.")
        accepted_answers = [part.strip() for part in correct_answer_raw.split("||") if part.strip()]
        if not accepted_answers:
            raise CommandError(f"{path} question #{question_number} must define at least one accepted answer.")
        metadata["accepted_answers"] = accepted_answers
        normalized_options = []
    else:
        if len(options) < 2:
            raise CommandError(f"{path} question #{question_number} must define at least 2 options.")
        if not correct_answer_raw:
            raise CommandError(f"{path} question #{question_number} is missing Correct Answer.")

        correct_labels = _parse_correct_option_labels(correct_answer_raw)
        normalized_options = []
        for option in options:
            normalized_options.append(
                {
                    "option_text": option["option_text"],
                    "is_correct": option["label"] in correct_labels,
                }
            )
            _ensure_final_authored_text(
                path=path,
                question_number=question_number,
                field_name=f"option_{option['label']}",
                value=option["option_text"],
            )

        correct_count = sum(1 for option in normalized_options if option["is_correct"])
        if question_type == QuestionType.MCQ_SINGLE and correct_count != 1:
            raise CommandError(f"{path} question #{question_number} must have exactly 1 correct option.")
        if question_type == QuestionType.MCQ_MULTIPLE and correct_count < 1:
            raise CommandError(f"{path} question #{question_number} must have at least 1 correct option.")

    normalized_attachments = [
        _normalize_attachment(
            path=path,
            question_number=question_number,
            attachment=attachment,
        )
        for attachment in attachments
    ]

    return {
        "question_type": question_type,
        "difficulty_level": difficulty_level,
        "question_text": question_text,
        "explanation": explanation,
        "default_marks": "1.00",
        "negative_marks": "0.00",
        "options": normalized_options,
        "attachments": normalized_attachments,
        "metadata": metadata,
    }


def _parse_correct_option_labels(raw_value):
    labels = {
        part.strip().upper().rstrip(".")
        for part in re.split(r"[,\s]+", raw_value)
        if part.strip()
    }
    normalized = {label for label in labels if re.fullmatch(r"[A-Z]", label)}
    if not normalized:
        raise CommandError(
            "Correct Answer for MCQ questions must use option labels like 'A' or 'A, B'."
        )
    return normalized


def _ensure_final_authored_text(*, path, question_number, field_name, value):
    compact_value = " ".join(str(value).split())
    for pattern in STANDALONE_PLACEHOLDER_PATTERNS:
        if pattern.search(compact_value):
            raise CommandError(
                f"{path} question #{question_number} contains placeholder text in "
                f"{field_name}: {compact_value[:140]}"
            )


def _normalize_attachment(*, path, question_number, attachment):
    file_value = str(attachment.get("file", "")).strip()
    attachment_type = str(
        attachment.get("attachment_type") or attachment.get("type") or ""
    ).strip().lower()
    title = str(attachment.get("title", "")).strip()
    alt_text = str(attachment.get("alt_text", "")).strip()
    is_inline_raw = str(attachment.get("is_inline", "false")).strip().lower()

    if not file_value:
        raise CommandError(f"{path} question #{question_number} attachment is missing file.")
    if not attachment_type:
        raise CommandError(f"{path} question #{question_number} attachment is missing attachment_type.")
    if attachment_type not in VALID_ATTACHMENT_TYPES:
        raise CommandError(
            f"{path} question #{question_number} attachment has invalid type: {attachment_type}"
        )

    _ensure_final_authored_text(
        path=path,
        question_number=question_number,
        field_name="attachment.file",
        value=file_value,
    )
    if title:
        _ensure_final_authored_text(
            path=path,
            question_number=question_number,
            field_name="attachment.title",
            value=title,
        )
    if alt_text:
        _ensure_final_authored_text(
            path=path,
            question_number=question_number,
            field_name="attachment.alt_text",
            value=alt_text,
        )

    return {
        "file": file_value,
        "attachment_type": attachment_type,
        "title": title,
        "alt_text": alt_text,
        "is_inline": is_inline_raw in {"1", "true", "yes"},
    }


def _lint_duplicate_stems(*, path, questions):
    seen = {}
    for index, question in enumerate(questions, start=1):
        normalized = _normalize_stem(question["question_text"])
        if normalized in seen:
            first_index = seen[normalized]
            raise CommandError(
                f"{path} has duplicate or near-identical question stems at question #{first_index} "
                f"and question #{index}."
            )
        seen[normalized] = index


def _normalize_stem(value):
    normalized = value.lower()
    normalized = re.sub(r"[^a-z0-9`\.\-\+\*/=\(\)\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized or f"blank-{uuid4()}"
