import csv
import io
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.academics.models import Subject, Topic
from apps.academics.models import Program
from apps.question_bank.models import Question, QuestionOption, QuestionTag, QuestionTagMap


QUESTION_TYPES_WITH_OPTIONS = {"mcq_single", "mcq_multiple", "true_false"}
IMPORT_TEMPLATE_COLUMNS = [
    "subject",
    "topic",
    "question_type",
    "difficulty_level",
    "question_text",
    "option_1",
    "option_2",
    "option_3",
    "option_4",
    "correct_answer",
    "default_marks",
    "negative_marks",
    "explanation",
    "tags",
]


def validate_question_relationships(question):
    if question.subject.institute_id != question.institute_id:
        raise ValidationError({"subject": "Subject must belong to the same institute."})

    if question.program_id:
        if question.program.institute_id != question.institute_id:
            raise ValidationError({"program": "Program must belong to the same institute."})
        if question.subject.program_id and question.subject.program_id != question.program_id:
            raise ValidationError({"program": "Program must match the subject program."})

    if question.topic_id:
        if question.topic.institute_id != question.institute_id:
            raise ValidationError({"topic": "Topic must belong to the same institute."})
        if question.topic.subject_id != question.subject_id:
            raise ValidationError({"topic": "Topic must belong to the selected subject."})

    if question.created_by_teacher_id and question.created_by_teacher.institute_id != question.institute_id:
        raise ValidationError(
            {"created_by_teacher": "Teacher must belong to the same institute."}
        )


def _normalize_options(options):
    normalized = []
    for option in options:
        if hasattr(option, "option_text"):
            normalized.append(
                {
                    "option_text": option.option_text,
                    "option_order": option.option_order,
                    "is_correct": option.is_correct,
                    "is_active": option.is_active,
                }
            )
        else:
            normalized.append(
                {
                    "option_text": option.get("option_text", ""),
                    "option_order": option.get("option_order"),
                    "is_correct": option.get("is_correct", False),
                    "is_active": option.get("is_active", True),
                }
            )
    return normalized


def calculate_correct_option_rules(question_type, options):
    normalized = _normalize_options(options)
    active_options = [option for option in normalized if option.get("is_active", True)]
    correct_options = [option for option in active_options if option.get("is_correct")]

    return {
        "active_count": len(active_options),
        "correct_count": len(correct_options),
    }


def validate_question_options(question_type, options):
    if question_type not in QUESTION_TYPES_WITH_OPTIONS:
        if any(option.get("is_active", True) for option in _normalize_options(options)):
            raise ValidationError(
                {"options": "Short answer questions should not have active options."}
            )
        return

    normalized = _normalize_options(options)
    active_options = [option for option in normalized if option.get("is_active", True)]
    active_count = len(active_options)
    correct_count = len([option for option in active_options if option.get("is_correct")])

    if active_count < 2:
        raise ValidationError({"options": "At least two active options are required."})

    if question_type == "mcq_single":
        if correct_count != 1:
            raise ValidationError(
                {"options": "Single choice MCQ must have exactly one correct active option."}
            )
    elif question_type == "mcq_multiple":
        if correct_count < 1:
            raise ValidationError(
                {"options": "Multiple choice MCQ must have at least one correct active option."}
            )
    elif question_type == "true_false":
        if active_count != 2:
            raise ValidationError(
                {"options": "True/False questions must have exactly two active options."}
            )
        if correct_count != 1:
            raise ValidationError(
                {"options": "True/False questions must have exactly one correct active option."}
            )


def validate_tag_mapping(question, tag):
    if question.institute_id != tag.institute_id:
        raise ValidationError({"tag": "Tag must belong to the same institute as the question."})


def notify_question_saved(question):
    from apps.reports.services import notify_question_missing_explanation

    notify_question_missing_explanation(question)


def question_import_template_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(IMPORT_TEMPLATE_COLUMNS)
    writer.writerow(
        [
            "Mathematics",
            "Algebra",
            "mcq_single",
            "intermediate",
            "What is 2 + 2?",
            "3",
            "4",
            "",
            "",
            "2",
            "1.00",
            "0.00",
            "4 is the correct answer because 2 plus 2 equals 4.",
            "arithmetic|foundation",
        ]
    )
    return output.getvalue()


def parse_question_import_file(uploaded_file):
    try:
        content = uploaded_file.read().decode("utf-8-sig")
    finally:
        uploaded_file.seek(0)
    if not content.strip():
        raise ValidationError({"file": "The uploaded file is empty."})
    reader = csv.DictReader(io.StringIO(content))
    missing_columns = [column for column in IMPORT_TEMPLATE_COLUMNS if column not in reader.fieldnames]
    if missing_columns:
        raise ValidationError(
            {"file": f"Missing required columns: {', '.join(missing_columns)}."}
        )
    return list(reader)


def _normalize_question_type(value):
    return (value or "mcq_single").strip().lower()


def _normalize_difficulty(value):
    return (value or "intermediate").strip().lower()


def _resolve_subject(institute, subject_value):
    value = (subject_value or "").strip()
    if not value:
        raise ValidationError({"subject": "Subject is required."})
    subject = (
        Subject.objects.filter(institute=institute, is_active=True)
        .filter(code__iexact=value)
        .first()
    )
    if subject:
        return subject
    subject = (
        Subject.objects.filter(institute=institute, is_active=True)
        .filter(name__iexact=value)
        .first()
    )
    if subject:
        return subject
    raise ValidationError({"subject": f"Subject '{value}' was not found."})


def _resolve_topic(institute, subject, topic_value):
    value = (topic_value or "").strip()
    if not value:
        return None
    topic = (
        Topic.objects.filter(institute=institute, subject=subject, is_active=True)
        .filter(code__iexact=value)
        .first()
    )
    if topic:
        return topic
    topic = (
        Topic.objects.filter(institute=institute, subject=subject, is_active=True)
        .filter(name__iexact=value)
        .first()
    )
    if topic:
        return topic
    raise ValidationError({"topic": f"Topic '{value}' was not found under {subject.name}."})


def _build_options_from_row(question_type, row):
    option_values = []
    for index in range(1, 5):
        option_text = (row.get(f"option_{index}") or "").strip()
        if option_text:
            option_values.append(option_text)
    correct_value = (row.get("correct_answer") or "").strip()

    if question_type == "true_false" and not option_values:
        option_values = ["True", "False"]

    if question_type in QUESTION_TYPES_WITH_OPTIONS and len(option_values) < 2:
        raise ValidationError({"options": "At least two options are required."})

    normalized_options = []
    if question_type in QUESTION_TYPES_WITH_OPTIONS:
        if correct_value.isdigit():
            correct_index = int(correct_value) - 1
            if correct_index < 0 or correct_index >= len(option_values):
                raise ValidationError(
                    {"correct_answer": "Correct answer index does not match the option list."}
                )
        else:
            correct_index = next(
                (
                    idx
                    for idx, value in enumerate(option_values)
                    if value.strip().lower() == correct_value.lower()
                ),
                None,
            )
            if correct_index is None:
                raise ValidationError(
                    {"correct_answer": "Correct answer must match an option number or text."}
                )
        for index, option_text in enumerate(option_values, start=1):
            normalized_options.append(
                {
                    "option_text": option_text,
                    "option_order": index,
                    "is_correct": index - 1 == correct_index,
                    "is_active": True,
                }
            )
        validate_question_options(question_type, normalized_options)
    return normalized_options


def _decimal_from_row(row, key, default):
    raw = (row.get(key) or str(default)).strip()
    try:
        return Decimal(raw)
    except (InvalidOperation, TypeError):
        raise ValidationError({key: f"{key.replace('_', ' ').title()} must be a valid decimal."})


def preview_bulk_question_import(*, institute, rows, created_by=None):
    preview_rows = []
    valid_rows = []
    subject_cache = {}
    topic_cache = {}

    for index, row in enumerate(rows, start=2):
        errors = {}
        try:
            subject_key = (row.get("subject") or "").strip().lower()
            subject = subject_cache.get(subject_key)
            if subject is None:
                subject = _resolve_subject(institute, row.get("subject"))
                subject_cache[subject_key] = subject

            topic_key = (subject.id, (row.get("topic") or "").strip().lower())
            topic = topic_cache.get(topic_key)
            if topic is None:
                topic = _resolve_topic(institute, subject, row.get("topic"))
                topic_cache[topic_key] = topic

            question_type = _normalize_question_type(row.get("question_type"))
            difficulty_level = _normalize_difficulty(row.get("difficulty_level"))
            question_text = (row.get("question_text") or "").strip()
            if not question_text:
                raise ValidationError({"question_text": "Question text is required."})
            options = _build_options_from_row(question_type, row)
            default_marks = _decimal_from_row(row, "default_marks", "1.00")
            negative_marks = _decimal_from_row(row, "negative_marks", "0.00")
            if default_marks < 0 or negative_marks < 0:
                raise ValidationError({"marks": "Marks values cannot be negative."})

            tag_values = [
                item.strip()
                for item in (row.get("tags") or "").replace(",", "|").split("|")
                if item.strip()
            ]
            payload = {
                "institute": institute,
                "program": subject.program,
                "subject": subject,
                "topic": topic,
                "created_by_teacher": created_by,
                "question_type": question_type,
                "difficulty_level": difficulty_level,
                "question_text": question_text,
                "explanation": (row.get("explanation") or "").strip(),
                "default_marks": default_marks,
                "negative_marks": negative_marks,
                "is_active": True,
                "is_verified": False,
                "metadata": {"import_source": "bulk_csv"},
                "options": options,
                "tags": tag_values,
            }
            question = Question(
                institute=institute,
                program=payload["program"],
                subject=subject,
                topic=topic,
                created_by_teacher=created_by,
                question_type=question_type,
                difficulty_level=difficulty_level,
                question_text=question_text,
                explanation=payload["explanation"],
                default_marks=default_marks,
                negative_marks=negative_marks,
                is_active=True,
                is_verified=False,
                metadata=payload["metadata"],
            )
            question.clean()
            preview_rows.append(
                {
                    "row_number": index,
                    "status": "valid",
                    "question_text": question_text,
                    "subject_name": subject.name,
                    "topic_name": topic.name if topic else "",
                    "question_type": question_type,
                    "difficulty_level": difficulty_level,
                    "tag_values": tag_values,
                    "errors": errors,
                }
            )
            valid_rows.append(payload)
        except ValidationError as exc:
            if getattr(exc, "message_dict", None):
                errors = exc.message_dict
            else:
                errors = {"detail": exc.messages}
            preview_rows.append(
                {
                    "row_number": index,
                    "status": "invalid",
                    "question_text": (row.get("question_text") or "").strip(),
                    "subject_name": (row.get("subject") or "").strip(),
                    "topic_name": (row.get("topic") or "").strip(),
                    "question_type": _normalize_question_type(row.get("question_type")),
                    "difficulty_level": _normalize_difficulty(row.get("difficulty_level")),
                    "tag_values": [
                        item.strip()
                        for item in (row.get("tags") or "").replace(",", "|").split("|")
                        if item.strip()
                    ],
                    "errors": errors,
                }
            )

    return {
        "total_rows": len(rows),
        "valid_rows": len(valid_rows),
        "invalid_rows": len(rows) - len(valid_rows),
        "rows": preview_rows,
        "valid_payloads": valid_rows,
    }


@transaction.atomic
def import_bulk_questions(*, institute, preview_payload, created_by=None):
    created_questions = []
    failures = []
    preview_rows = preview_payload.get("rows") or preview_payload.get("preview_rows", [])
    for row in preview_rows:
        if row.get("status") != "valid":
            failures.append(row)
    for payload in preview_payload.get("valid_payloads", []):
        try:
            program = payload["program"]
            if program and not hasattr(program, "pk"):
                program = Program.objects.filter(pk=program).first()
            subject = payload["subject"]
            if not hasattr(subject, "pk"):
                subject = Subject.objects.get(pk=subject)
            topic = payload["topic"]
            if topic and not hasattr(topic, "pk"):
                topic = Topic.objects.get(pk=topic)
            question = Question.objects.create(
                institute=institute,
                program=program,
                subject=subject,
                topic=topic,
                created_by_teacher=created_by,
                question_type=payload["question_type"],
                difficulty_level=payload["difficulty_level"],
                question_text=payload["question_text"],
                explanation=payload["explanation"],
                default_marks=payload["default_marks"],
                negative_marks=payload["negative_marks"],
                is_active=payload["is_active"],
                is_verified=payload["is_verified"],
                metadata=payload["metadata"],
            )
            QuestionOption.objects.bulk_create(
                [QuestionOption(question=question, **option) for option in payload["options"]]
            )
            for tag_value in payload.get("tags", []):
                tag, _ = QuestionTag.objects.get_or_create(
                    institute=institute,
                    code=tag_value.lower().replace(" ", "_")[:50],
                    defaults={"name": tag_value, "is_active": True},
                )
                QuestionTagMap.objects.get_or_create(question=question, tag=tag)
            notify_question_saved(question)
            created_questions.append(question)
        except Exception as exc:  # pragma: no cover - defensive partial import path
            failures.append(
                {
                    "row_number": None,
                    "status": "invalid",
                    "question_text": payload["question_text"],
                    "errors": {"detail": [str(exc)]},
                }
            )
    return {
        "created_count": len(created_questions),
        "failed_count": len(failures),
        "created_ids": [str(question.id) for question in created_questions],
        "failures": failures,
    }


@transaction.atomic
def perform_bulk_question_action(*, action_name, questions, value=None):
    questions = list(questions)
    if action_name == "delete":
        count = len(questions)
        for question in questions:
            question.is_active = False
            question.save(update_fields=["is_active", "updated_at"])
        return {"updated_count": count}
    if action_name == "activate":
        return {"updated_count": Question.objects.filter(id__in=[q.id for q in questions]).update(is_active=True)}
    if action_name == "deactivate":
        return {"updated_count": Question.objects.filter(id__in=[q.id for q in questions]).update(is_active=False)}
    if action_name == "set_topic":
        return {
            "updated_count": Question.objects.filter(id__in=[q.id for q in questions]).update(topic=value)
        }
    if action_name == "set_difficulty":
        return {
            "updated_count": Question.objects.filter(id__in=[q.id for q in questions]).update(
                difficulty_level=value
            )
        }
    if action_name == "assign_tag":
        created = 0
        for question in questions:
            _, was_created = QuestionTagMap.objects.get_or_create(question=question, tag=value)
            if was_created:
                created += 1
        return {"updated_count": created}
    raise ValidationError({"action": "Unsupported bulk action."})
