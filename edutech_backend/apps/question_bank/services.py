import csv
import hashlib
import io
import json
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.economy.services import (
    institute_has_master_question_access,
    record_master_question_link_usage,
    validate_institute_question_quota_access,
)
from apps.academics.services import (
    QUESTION_CONTENT_FORMAT_NAMESPACE,
    QUESTION_DIFFICULTY_NAMESPACE,
    QUESTION_TYPE_NAMESPACE,
    get_option_catalog_default_code,
    validate_option_catalog_code,
)
from apps.academics.models import Program, Subject, Topic
from apps.question_bank.models import (
    InstituteQuestionAccess,
    InstituteQuestionAccessStatus,
    MasterQuestion,
    MasterQuestionOption,
    MasterQuestionSourceType,
    MasterQuestionVisibility,
    Question,
    QuestionOption,
    QuestionPassage,
    QuestionTag,
    QuestionTagMap,
    QuestionType,
)
from apps.question_bank.registry import (
    get_question_type_definition,
    question_type_supports_text_answer,
    question_type_supports_options,
)
from apps.question_bank.rich_text import sanitize_content_by_format


QUESTION_TYPES_WITH_OPTIONS = {
    definition.code
    for definition in (
        get_question_type_definition("mcq_single"),
        get_question_type_definition("mcq_multiple"),
        get_question_type_definition("true_false"),
        get_question_type_definition("assertion_reason"),
        get_question_type_definition("matrix_match"),
    )
    if definition is not None and question_type_supports_options(definition.code)
}
IMPORT_TEMPLATE_COLUMNS = [
    "subject",
    "topic",
    "passage_title",
    "passage_order",
    "question_type",
    "difficulty_level",
    "question_text",
    "assertion_text",
    "reason_text",
    "matrix_left_items",
    "matrix_right_items",
    "option_1",
    "option_2",
    "option_3",
    "option_4",
    "correct_answer",
    "accepted_answers",
    "numeric_tolerance",
    "review_guidance",
    "default_marks",
    "negative_marks",
    "explanation",
    "tags",
]
IMPORT_TEMPLATE_REQUIRED_COLUMNS = [
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
    "accepted_answers",
    "numeric_tolerance",
    "review_guidance",
    "default_marks",
    "negative_marks",
    "explanation",
    "tags",
]
FILL_IN_BLANKS_MARKER = "[[blank]]"
ASSERTION_REASON_DEFAULT_OPTIONS = [
    "Both Assertion and Reason are true, and Reason is the correct explanation of Assertion.",
    "Both Assertion and Reason are true, but Reason is not the correct explanation of Assertion.",
    "Assertion is true, but Reason is false.",
    "Assertion is false, but Reason is true.",
]
IMPORT_PASSAGE_TEMPLATE_COLUMNS = [
    "subject",
    "topic",
    "title",
    "content_format",
    "passage_text",
    "description",
]
IMPORT_PREVIEW_SCHEMA_VERSION = 1
IMPORT_PASSAGE_PREVIEW_SCHEMA_VERSION = 1


def validate_academic_mapping(
    *,
    institute,
    subject,
    program=None,
    topic=None,
    created_by_teacher=None,
):
    if subject.institute_id != institute.id:
        raise ValidationError({"subject": "Subject must belong to the same institute."})

    subject_program_id = getattr(subject, "program_id", None)
    institute_code = getattr(institute, "code", "the selected institute")

    if subject_program_id is None:
        raise ValidationError(
            {
                "program": (
                    f"Subject '{subject.name}' is not linked to a program in institute '{institute_code}'. "
                    "Assign a program in Academic Setup > Subjects before question authoring or bulk import."
                )
            }
        )

    if program is None:
        raise ValidationError({"program": "Program is required and must match the selected subject program."})

    if program.institute_id != institute.id:
        raise ValidationError({"program": "Program must belong to the same institute."})

    if program.id != subject_program_id:
        raise ValidationError({"program": "Program must match the subject program."})

    if topic is not None:
        if topic.institute_id != institute.id:
            raise ValidationError({"topic": "Topic must belong to the same institute."})
        if topic.subject_id != subject.id:
            raise ValidationError({"topic": "Topic must belong to the selected subject."})

    if created_by_teacher is not None and created_by_teacher.institute_id != institute.id:
        raise ValidationError({"created_by_teacher": "Teacher must belong to the same institute."})


def validate_question_relationships(question):
    validate_academic_mapping(
        institute=question.institute,
        subject=question.subject,
        program=question.program,
        topic=question.topic,
        created_by_teacher=question.created_by_teacher,
    )


def validate_question_passage_relationships(passage):
    validate_academic_mapping(
        institute=passage.institute,
        subject=passage.subject,
        program=passage.program,
        topic=passage.topic,
        created_by_teacher=passage.created_by_teacher,
    )


def validate_question_passage_assignment(
    *,
    institute,
    subject,
    program,
    topic,
    passage,
):
    if passage is None:
        return

    if passage.institute_id != institute.id:
        raise ValidationError({"passage": "Comprehension set must belong to the same institute."})

    if passage.subject_id != subject.id:
        raise ValidationError({"passage": "Comprehension set subject must match the question subject."})

    if passage.program_id != program.id:
        raise ValidationError({"program": "Program must match the selected comprehension set program."})

    if topic is None and passage.topic_id is not None:
        raise ValidationError({"topic": "Topic must match the selected comprehension set topic."})

    if topic is not None and passage.topic_id != topic.id:
        raise ValidationError({"topic": "Topic must match the selected comprehension set topic."})


def institute_has_question_authoring_access(institute, *, question):
    if institute is None or question is None:
        return False

    master_question = getattr(question, "master_question", None)
    if master_question is None:
        return True

    if getattr(master_question, "source_type", "") != MasterQuestionSourceType.PLATFORM:
        return True

    return institute_has_master_question_access(institute, master_question=master_question)


def validate_institute_question_authoring_access(*, institute, question):
    if institute_has_question_authoring_access(institute, question=question):
        return

    raise ValidationError(
        {
            "question": (
                "This linked shared-library question is no longer covered by the institute's active "
                "question-bank entitlements."
            )
        }
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
    definition = get_question_type_definition(question_type)
    if definition is None:
        raise ValidationError({"question_type": "Unsupported question type."})

    if not question_type_supports_options(question_type):
        if any(option.get("is_active", True) for option in _normalize_options(options)):
            raise ValidationError(
                {"options": f"{definition.label} questions should not have active options."}
            )
        return

    normalized = _normalize_options(options)
    active_options = [option for option in normalized if option.get("is_active", True)]
    active_count = len(active_options)
    correct_count = len([option for option in active_options if option.get("is_correct")])

    if active_count < definition.min_active_options:
        raise ValidationError(
            {"options": f"At least {definition.min_active_options} active options are required."}
        )

    if definition.max_active_options is not None and active_count > definition.max_active_options:
        raise ValidationError(
            {"options": f"{definition.label} questions can have at most {definition.max_active_options} active options."}
        )

    if correct_count < definition.min_correct_options:
        raise ValidationError(
            {"options": f"{definition.label} requires at least {definition.min_correct_options} correct active option(s)."}
        )

    if definition.max_correct_options is not None and correct_count > definition.max_correct_options:
        raise ValidationError(
            {"options": f"{definition.label} allows at most {definition.max_correct_options} correct active option(s)."}
        )


def validate_tag_mapping(question, tag):
    if question.institute_id != tag.institute_id:
        raise ValidationError({"tag": "Tag must belong to the same institute as the question."})


def _derive_master_source_type(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    if (question.institute.metadata or {}).get("is_public_content_hub"):
        return MasterQuestionSourceType.PLATFORM
    if question.created_by_teacher_id:
        return MasterQuestionSourceType.TEACHER
    return MasterQuestionSourceType.INSTITUTE


def _derive_master_visibility(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    if not (question.institute.metadata or {}).get("is_public_content_hub"):
        return MasterQuestionVisibility.PRIVATE
    if metadata.get("question_visibility") in {
        MasterQuestionVisibility.PRIVATE,
        MasterQuestionVisibility.SHARED_BY_REQUEST,
        MasterQuestionVisibility.PUBLIC,
    }:
        return metadata["question_visibility"]
    if (question.institute.metadata or {}).get("is_public_content_hub"):
        return MasterQuestionVisibility.SHARED_BY_REQUEST
    return MasterQuestionVisibility.PRIVATE


@transaction.atomic
def sync_master_question_from_institute_question(question):
    master_defaults = {
        "source_institute": question.institute,
        "source_program": question.program,
        "source_subject": question.subject,
        "source_topic": question.topic,
        "created_by_teacher": question.created_by_teacher,
        "question_type": question.question_type,
        "difficulty_level": question.difficulty_level,
        "content_format": question.content_format,
        "question_text": question.question_text,
        "explanation": question.explanation,
        "default_marks": question.default_marks,
        "negative_marks": question.negative_marks,
        "is_verified": question.is_verified,
        "source_type": _derive_master_source_type(question),
        "visibility": _derive_master_visibility(question),
        "metadata": {
            "origin_question_id": str(question.id),
            **(question.metadata if isinstance(question.metadata, dict) else {}),
        },
        "is_active": question.is_active,
    }
    if question.master_question_id:
        master = question.master_question
        for field_name, value in master_defaults.items():
            setattr(master, field_name, value)
        master.save()
    else:
        master = MasterQuestion.objects.create(**master_defaults)
        question.master_question = master
        question.save(update_fields=["master_question", "updated_at"])

    master.options.all().delete()
    option_payloads = [
        MasterQuestionOption(
            master_question=master,
            content_format=option.content_format,
            option_text=option.option_text,
            option_order=option.option_order,
            is_correct=option.is_correct,
            is_active=option.is_active,
        )
        for option in question.options.all().order_by("option_order")
    ]
    if option_payloads:
        MasterQuestionOption.objects.bulk_create(option_payloads)
    return master


@transaction.atomic
def request_master_question_access(
    *,
    master_question,
    institute,
    requested_by_teacher=None,
    local_program=None,
    local_subject=None,
    local_topic=None,
    notes="",
):
    if not institute_has_master_question_access(institute, master_question=master_question):
        raise ValidationError(
            {
                "master_question": (
                    "This platform question is outside the institute's active subscribed question-bank packages."
                )
            }
        )
    access, _ = InstituteQuestionAccess.objects.update_or_create(
        institute=institute,
        master_question=master_question,
        defaults={
            "requested_by_teacher": requested_by_teacher,
            "local_program": local_program,
            "local_subject": local_subject,
            "local_topic": local_topic,
            "status": InstituteQuestionAccessStatus.REQUESTED,
            "notes": notes,
            "is_active": True,
        },
    )
    return access


@transaction.atomic
def link_master_question_to_institute(
    *,
    master_question,
    institute,
    approved_by=None,
    requested_by_teacher=None,
    local_program=None,
    local_subject=None,
    local_topic=None,
    notes="",
):
    if not institute_has_master_question_access(institute, master_question=master_question):
        raise ValidationError(
            {
                "master_question": (
                    "This platform question is outside the institute's active subscribed question-bank packages."
                )
            }
        )
    existing_access = (
        InstituteQuestionAccess.objects.filter(
            institute=institute,
            master_question=master_question,
            is_active=True,
            status=InstituteQuestionAccessStatus.LINKED,
            linked_question__isnull=False,
        )
        .select_related("linked_question")
        .first()
    )
    if existing_access is None:
        validate_institute_question_quota_access(
            institute=institute,
            master_question=master_question,
        )
    subject = local_subject or master_question.source_subject
    topic = local_topic or master_question.source_topic
    program = local_program or master_question.source_program or getattr(subject, "program", None)
    question, _ = Question.objects.update_or_create(
        institute=institute,
        master_question=master_question,
        question_text=master_question.question_text,
        defaults={
            "program": program,
            "subject": subject,
            "topic": topic,
            "created_by_teacher": requested_by_teacher,
            "question_type": master_question.question_type,
            "difficulty_level": master_question.difficulty_level,
            "content_format": master_question.content_format,
            "explanation": master_question.explanation,
            "default_marks": master_question.default_marks,
            "negative_marks": master_question.negative_marks,
            "is_verified": master_question.is_verified,
            "is_active": True,
            "metadata": {
                "linked_from_master": str(master_question.id),
                "link_mode": "approved_request",
                **(master_question.metadata if isinstance(master_question.metadata, dict) else {}),
            },
        },
    )
    question.options.all().delete()
    option_payloads = [
        QuestionOption(
            question=question,
            content_format=option.content_format,
            option_text=option.option_text,
            option_order=option.option_order,
            is_correct=option.is_correct,
            is_active=option.is_active,
        )
        for option in master_question.options.all().order_by("option_order")
    ]
    if option_payloads:
        QuestionOption.objects.bulk_create(option_payloads)

    access, _ = InstituteQuestionAccess.objects.update_or_create(
        institute=institute,
        master_question=master_question,
        defaults={
            "requested_by_teacher": requested_by_teacher,
            "approved_by": approved_by,
            "linked_question": question,
            "local_program": program,
            "local_subject": subject,
            "local_topic": topic,
            "status": InstituteQuestionAccessStatus.LINKED,
            "notes": notes,
            "is_active": True,
        },
    )
    record_master_question_link_usage(
        institute=institute,
        master_question=master_question,
        question=question,
        performed_by=approved_by,
        metadata={
            "access_status": access.status,
            "requested_by_teacher_id": str(requested_by_teacher.id) if requested_by_teacher else "",
        },
    )
    return access


@transaction.atomic
def materialize_master_question_for_source_institute(
    *,
    master_question,
    notes="",
):
    institute = master_question.source_institute
    subject = master_question.source_subject
    topic = master_question.source_topic
    program = master_question.source_program or getattr(subject, "program", None)

    defaults = {
        "program": program,
        "subject": subject,
        "topic": topic,
        "created_by_teacher": master_question.created_by_teacher,
        "question_type": master_question.question_type,
        "difficulty_level": master_question.difficulty_level,
        "content_format": master_question.content_format,
        "explanation": master_question.explanation,
        "default_marks": master_question.default_marks,
        "negative_marks": master_question.negative_marks,
        "is_verified": master_question.is_verified,
        "is_active": True,
        "metadata": {
            "linked_from_master": str(master_question.id),
            "link_mode": "source_materialization",
            "materialization_notes": notes,
            **(master_question.metadata if isinstance(master_question.metadata, dict) else {}),
        },
    }
    question = Question.objects.filter(
        institute=institute,
        master_question=master_question,
    ).first()
    if question is None:
        question = Question(
            institute=institute,
            master_question=master_question,
            question_text=master_question.question_text,
            **defaults,
        )
    else:
        question.question_text = master_question.question_text
        for field, value in defaults.items():
            setattr(question, field, value)
    question.save()
    question.options.all().delete()
    option_payloads = [
        QuestionOption(
            question=question,
            content_format=option.content_format,
            option_text=option.option_text,
            option_order=option.option_order,
            is_correct=option.is_correct,
            is_active=option.is_active,
        )
        for option in master_question.options.all().order_by("option_order")
    ]
    if option_payloads:
        QuestionOption.objects.bulk_create(option_payloads)
    return question


def notify_question_saved(question):
    from apps.reports.services import notify_question_missing_explanation

    notify_question_missing_explanation(question)


def question_import_template_csv():
    default_question_type = get_option_catalog_default_code(QUESTION_TYPE_NAMESPACE)
    default_difficulty = get_option_catalog_default_code(QUESTION_DIFFICULTY_NAMESPACE)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(IMPORT_TEMPLATE_COLUMNS)
    writer.writerow(
        [
            "Mathematics",
            "Algebra",
            "",
            "",
            default_question_type,
            default_difficulty,
            "What is 2 + 2?",
            "3",
            "4",
            "",
            "",
            "2",
            "",
            "",
            "",
            "1.00",
            "0.00",
            "4 is the correct answer because 2 plus 2 equals 4.",
            "arithmetic|foundation",
        ]
    )
    return output.getvalue()


def question_passage_import_template_csv():
    default_content_format = get_option_catalog_default_code(QUESTION_CONTENT_FORMAT_NAMESPACE)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(IMPORT_PASSAGE_TEMPLATE_COLUMNS)
    writer.writerow(
        [
            "Mathematics",
            "Algebra",
            "Linear Equations Reading Set",
            default_content_format,
            "A student balances both sides of an equation to isolate the unknown value.",
            "Optional teacher note about the comprehension focus.",
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
    missing_columns = [column for column in IMPORT_TEMPLATE_REQUIRED_COLUMNS if column not in reader.fieldnames]
    if missing_columns:
        raise ValidationError(
            {"file": f"Missing required columns: {', '.join(missing_columns)}."}
        )
    return list(reader)


def parse_question_passage_import_file(uploaded_file):
    try:
        content = uploaded_file.read().decode("utf-8-sig")
    finally:
        uploaded_file.seek(0)
    if not content.strip():
        raise ValidationError({"file": "The uploaded file is empty."})
    reader = csv.DictReader(io.StringIO(content))
    missing_columns = [column for column in IMPORT_PASSAGE_TEMPLATE_COLUMNS if column not in reader.fieldnames]
    if missing_columns:
        raise ValidationError(
            {"file": f"Missing required columns: {', '.join(missing_columns)}."}
        )
    return list(reader)


def _normalize_question_type(value):
    return validate_option_catalog_code(
        QUESTION_TYPE_NAMESPACE,
        value or get_option_catalog_default_code(QUESTION_TYPE_NAMESPACE),
        "question_type",
    )


def _normalize_difficulty(value):
    return validate_option_catalog_code(
        QUESTION_DIFFICULTY_NAMESPACE,
        value or get_option_catalog_default_code(QUESTION_DIFFICULTY_NAMESPACE),
        "difficulty_level",
    )


def _normalize_content_format(value):
    return validate_option_catalog_code(
        QUESTION_CONTENT_FORMAT_NAMESPACE,
        value or get_option_catalog_default_code(QUESTION_CONTENT_FORMAT_NAMESPACE),
        "content_format",
    )


def _resolve_program_for_import(institute, program_value):
    if not program_value:
        return None

    if hasattr(program_value, "pk"):
        if program_value.institute_id != institute.id:
            raise ValidationError({"program": "Program must belong to the selected institute."})
        return program_value

    program = Program.objects.filter(institute=institute, pk=program_value).first()
    if program is None:
        raise ValidationError({"program": "Program must belong to the selected institute."})
    return program


def _resolve_subject_for_import(institute, subject_value):
    if hasattr(subject_value, "pk"):
        if subject_value.institute_id != institute.id:
            raise ValidationError({"subject": "Subject must belong to the selected institute."})
        return subject_value

    try:
        return Subject.objects.get(institute=institute, pk=subject_value)
    except Subject.DoesNotExist as exc:
        raise ValidationError({"subject": "Subject must belong to the selected institute."}) from exc


def _resolve_topic_for_import(institute, subject, topic_value):
    if not topic_value:
        return None

    if hasattr(topic_value, "pk"):
        if topic_value.institute_id != institute.id:
            raise ValidationError({"topic": "Topic must belong to the selected institute."})
        if topic_value.subject_id != subject.id:
            raise ValidationError({"topic": "Topic must belong to the selected subject."})
        return topic_value

    try:
        return Topic.objects.get(institute=institute, subject=subject, pk=topic_value)
    except Topic.DoesNotExist as exc:
        raise ValidationError({"topic": "Topic must belong to the selected subject."}) from exc


def _resolve_passage(institute, subject, topic, passage_title):
    value = str(passage_title or "").strip()
    if not value:
        return None

    queryset = QuestionPassage.objects.filter(
        institute=institute,
        subject=subject,
        is_active=True,
        title__iexact=value,
    )
    if topic is None:
        queryset = queryset.filter(topic__isnull=True)
    else:
        queryset = queryset.filter(topic=topic)

    passage = queryset.first()
    if passage:
        return passage

    raise ValidationError(
        {
            "passage_title": (
                f"Comprehension set '{value}' was not found for subject '{subject.name}'. "
                "Import the passage first or leave passage_title blank for a standalone question."
            )
        }
    )


def _resolve_passage_for_import(institute, subject, topic, passage_value, passage_title=None):
    if not passage_value and not passage_title:
        return None

    if hasattr(passage_value, "pk"):
        if passage_value.institute_id != institute.id:
            raise ValidationError({"passage": "Comprehension set must belong to the selected institute."})
        if passage_value.subject_id != subject.id:
            raise ValidationError({"passage": "Comprehension set must belong to the selected subject."})
        if topic is None and passage_value.topic_id is not None:
            raise ValidationError({"passage": "Comprehension set topic must match the selected topic."})
        if topic is not None and passage_value.topic_id != topic.id:
            raise ValidationError({"passage": "Comprehension set topic must match the selected topic."})
        return passage_value

    if passage_value:
        queryset = QuestionPassage.objects.filter(
            institute=institute,
            subject=subject,
            is_active=True,
            pk=passage_value,
        )
        if topic is None:
            queryset = queryset.filter(topic__isnull=True)
        else:
            queryset = queryset.filter(topic=topic)
        passage = queryset.first()
        if passage:
            return passage
        raise ValidationError({"passage": "Comprehension set must belong to the selected subject and topic."})

    return _resolve_passage(institute, subject, topic, passage_title)


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
    raise ValidationError(
        {
            "subject": (
                f"Subject '{value}' was not found in institute '{institute.code}'. "
                "Create it in Academic Setup > Subjects, or use an existing active subject name/code."
            )
        }
    )


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
    raise ValidationError(
        {
            "topic": (
                f"Topic '{value}' was not found under subject '{subject.name}' in institute '{institute.code}'. "
                "Create it in Academic Setup > Topics, or leave the topic column blank."
            )
        }
    )


def _flatten_import_errors(error_dict):
    flattened = []
    for key, value in (error_dict or {}).items():
        if isinstance(value, (list, tuple)):
            messages = [str(item) for item in value if str(item).strip()]
        else:
            messages = [str(value)] if str(value).strip() else []
        label = key.replace("_", " ").title()
        for message in messages:
            flattened.append(f"{label}: {message}")
    return flattened


def _question_duplicate_queryset(*, institute, subject, topic, question_type, question_text, passage):
    queryset = Question.objects.filter(
        institute=institute,
        subject=subject,
        question_type=question_type,
        question_text__iexact=str(question_text or "").strip(),
        is_active=True,
    )
    if topic is None:
        queryset = queryset.filter(topic__isnull=True)
    else:
        queryset = queryset.filter(topic=topic)
    if passage is None:
        queryset = queryset.filter(passage__isnull=True)
    else:
        queryset = queryset.filter(passage=passage)
    return queryset


def _ensure_no_duplicate_question_import(
    *,
    institute,
    subject,
    topic,
    question_type,
    question_text,
    passage,
    source_row_number,
    seen_fingerprints,
):
    fingerprint = (
        str(subject.id),
        str(topic.id) if topic else "",
        question_type,
        str(passage.id) if passage else "",
        str(question_text or "").strip().casefold(),
    )
    prior_row_number = seen_fingerprints.get(fingerprint)
    if prior_row_number is not None:
        raise ValidationError(
            {
                "question_text": (
                    f"Duplicate question text detected in this import file. "
                    f"Row {source_row_number} matches row {prior_row_number} for the same academic scope."
                )
            }
        )

    if _question_duplicate_queryset(
        institute=institute,
        subject=subject,
        topic=topic,
        question_type=question_type,
        question_text=question_text,
        passage=passage,
    ).exists():
        raise ValidationError(
            {
                "question_text": (
                    "An active question with the same text, type, and academic scope already exists. "
                    "Edit the existing question or change this row before importing."
                )
            }
        )

    seen_fingerprints[fingerprint] = source_row_number


def _ensure_no_duplicate_passage_order_import(
    *,
    passage,
    passage_order,
    source_row_number,
    seen_orders,
):
    if passage is None or passage_order is None:
        return

    order_key = (str(passage.id), int(passage_order))
    prior_row_number = seen_orders.get(order_key)
    if prior_row_number is not None:
        raise ValidationError(
            {
                "passage_order": (
                    f"Duplicate comprehension order detected in this import file. "
                    f"Row {source_row_number} reuses order {passage_order}, already used by row {prior_row_number}."
                )
            }
        )

    if Question.objects.filter(
        passage=passage,
        passage_order=passage_order,
        is_active=True,
    ).exists():
        raise ValidationError(
            {
                "passage_order": (
                    f"Comprehension order {passage_order} is already used in set '{passage.title}'. "
                    "Choose a new order for this imported question."
                )
            }
        )

    seen_orders[order_key] = source_row_number


def _passage_duplicate_queryset(*, institute, subject, topic, title):
    queryset = QuestionPassage.objects.filter(
        institute=institute,
        subject=subject,
        title__iexact=str(title or "").strip(),
        is_active=True,
    )
    if topic is None:
        queryset = queryset.filter(topic__isnull=True)
    else:
        queryset = queryset.filter(topic=topic)
    return queryset


def _ensure_no_duplicate_passage_import(
    *,
    institute,
    subject,
    topic,
    title,
    source_row_number,
    seen_fingerprints,
):
    fingerprint = (
        str(subject.id),
        str(topic.id) if topic else "",
        str(title or "").strip().casefold(),
    )
    prior_row_number = seen_fingerprints.get(fingerprint)
    if prior_row_number is not None:
        raise ValidationError(
            {
                "title": (
                    f"Duplicate comprehension set title detected in this import file. "
                    f"Row {source_row_number} matches row {prior_row_number} for the same academic scope."
                )
            }
        )

    if _passage_duplicate_queryset(
        institute=institute,
        subject=subject,
        topic=topic,
        title=title,
    ).exists():
        raise ValidationError(
            {
                "title": (
                    "An active comprehension set with the same title already exists in this academic scope. "
                    "Edit the existing set or rename this import row."
                )
            }
        )

    seen_fingerprints[fingerprint] = source_row_number


def _preview_row_expectations(question_type):
    definition = get_question_type_definition(question_type)
    if definition is None:
        return []

    expectations = []
    if question_type_supports_options(question_type):
        if question_type == QuestionType.ASSERTION_REASON:
            expectations.append("Use correct_answer as 1 to 4. Fixed assertion/reason options are generated automatically.")
        elif question_type == QuestionType.MATRIX_MATCH:
            expectations.append("Provide matrix_left_items and matrix_right_items as pipe-separated values, then use option_1 to option_4 with correct_answer.")
        else:
            expectations.append("Use option_1 to option_4 with correct_answer.")
    expectations.append("Use passage_title and passage_order only when the row belongs to an imported comprehension set.")
    if question_type_supports_text_answer(question_type):
        expectations.append("Provide accepted_answers as pipe-separated values.")
    if question_type == "numeric_answer":
        expectations.append("Use numeric_tolerance only when numeric matching needs a tolerance range.")
    if question_type == "essay_manual_review":
        expectations.append("Use review_guidance to describe how reviewers should score the answer.")
    if not expectations:
        expectations.append(f"{definition.label} follows the standard import structure.")
    return expectations


def _json_safe_preview_value(value):
    if isinstance(value, Decimal):
        return str(value)
    if hasattr(value, "pk"):
        return str(value.pk)
    if isinstance(value, dict):
        return {str(key): _json_safe_preview_value(item) for key, item in sorted(value.items(), key=lambda entry: str(entry[0]))}
    if isinstance(value, (list, tuple)):
        return [_json_safe_preview_value(item) for item in value]
    return value


def build_import_preview_signature(*, rows, valid_payloads, schema_version=IMPORT_PREVIEW_SCHEMA_VERSION):
    canonical_payload = {
        "schema_version": schema_version,
        "rows": _json_safe_preview_value(rows),
        "valid_payloads": _json_safe_preview_value(valid_payloads),
    }
    encoded = json.dumps(canonical_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _safe_preview_question_type(value):
    try:
        return _normalize_question_type(value)
    except ValidationError:
        return str(value or "").strip() or "unknown"


def _safe_preview_content_format(value):
    try:
        return _normalize_content_format(value)
    except ValidationError:
        return str(value or "").strip() or "unknown"


def _build_options_from_row(question_type, row):
    if question_type == QuestionType.ASSERTION_REASON:
        option_values = ASSERTION_REASON_DEFAULT_OPTIONS[:]
    else:
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


def _split_import_values(raw_value):
    normalized = str(raw_value or "").replace(",", "|")
    return [item.strip() for item in normalized.split("|") if item.strip()]


def _fill_in_blanks_marker_count(question_text):
    return str(question_text or "").lower().count(FILL_IN_BLANKS_MARKER)


def _build_type_specific_import_metadata(question_type, row):
    metadata = {}
    accepted_answers = _split_import_values(row.get("accepted_answers"))
    correct_answer_value = str(row.get("correct_answer") or "").strip()
    numeric_tolerance = str(row.get("numeric_tolerance") or "").strip()
    review_guidance = str(row.get("review_guidance") or "").strip()
    question_text = str(row.get("question_text") or "").strip()
    assertion_text = str(row.get("assertion_text") or "").strip()
    reason_text = str(row.get("reason_text") or "").strip()
    matrix_left_items = _split_import_values(row.get("matrix_left_items"))
    matrix_right_items = _split_import_values(row.get("matrix_right_items"))

    if question_type == QuestionType.ASSERTION_REASON:
        if not assertion_text:
            raise ValidationError({"assertion_text": "Provide assertion_text for assertion/reason rows."})
        if not reason_text:
            raise ValidationError({"reason_text": "Provide reason_text for assertion/reason rows."})
        if accepted_answers:
            raise ValidationError({"accepted_answers": "Assertion / Reason rows do not use accepted_answers."})
        if numeric_tolerance:
            raise ValidationError(
                {"numeric_tolerance": "Numeric tolerance is only supported for numeric-answer rows."}
            )
        if review_guidance:
            raise ValidationError(
                {"review_guidance": "Review guidance is only supported for essay manual-review rows."}
            )
        if not question_text:
            row["question_text"] = (
                "Assertion:\n"
                f"{assertion_text}\n\n"
                "Reason:\n"
                f"{reason_text}"
            )
        metadata["assertion_reason"] = {
            "assertion_text": assertion_text,
            "reason_text": reason_text,
        }
        return metadata

    if question_type == QuestionType.MATRIX_MATCH:
        if len(matrix_left_items) < 2:
            raise ValidationError({"matrix_left_items": "Provide at least two matrix_left_items values."})
        if len(matrix_right_items) < 2:
            raise ValidationError({"matrix_right_items": "Provide at least two matrix_right_items values."})
        if accepted_answers:
            raise ValidationError({"accepted_answers": "Matrix match rows do not use accepted_answers."})
        if numeric_tolerance:
            raise ValidationError(
                {"numeric_tolerance": "Numeric tolerance is only supported for numeric-answer rows."}
            )
        if review_guidance:
            raise ValidationError(
                {"review_guidance": "Review guidance is only supported for essay manual-review rows."}
            )
        metadata["matrix_match"] = {
            "left_items": matrix_left_items,
            "right_items": matrix_right_items,
        }
        return metadata

    if question_type == "essay_manual_review":
        if accepted_answers:
            raise ValidationError(
                {"accepted_answers": "Essay manual-review rows do not use accepted answers."}
            )
        if correct_answer_value:
            raise ValidationError(
                {"correct_answer": "Essay manual-review rows do not use the correct_answer column."}
            )
        if numeric_tolerance:
            raise ValidationError(
                {"numeric_tolerance": "Numeric tolerance is only supported for numeric-answer rows."}
            )
        if review_guidance:
            metadata["review_guidance"] = review_guidance
        return metadata

    if question_type == "numeric_answer":
        if not accepted_answers and correct_answer_value:
            accepted_answers = [correct_answer_value]
        if not accepted_answers:
            raise ValidationError(
                {"accepted_answers": "Provide at least one accepted answer for numeric-answer rows."}
            )

        normalized_answers = []
        for answer in accepted_answers:
            try:
                numeric_value = Decimal(answer.replace(",", ""))
            except (InvalidOperation, AttributeError):
                raise ValidationError(
                    {"accepted_answers": f"'{answer}' is not a valid numeric answer."}
                )
            normalized_value = format(numeric_value.normalize(), "f")
            if normalized_value not in normalized_answers:
                normalized_answers.append(normalized_value)
        metadata["accepted_answers"] = normalized_answers

        if numeric_tolerance:
            try:
                tolerance_decimal = Decimal(numeric_tolerance.replace(",", ""))
            except (InvalidOperation, AttributeError):
                raise ValidationError(
                    {"numeric_tolerance": "Numeric tolerance must be a valid number."}
                )
            if tolerance_decimal < 0:
                raise ValidationError(
                    {"numeric_tolerance": "Numeric tolerance cannot be negative."}
                )
            metadata["numeric_validation"] = {"tolerance": format(tolerance_decimal.normalize(), "f")}

        if review_guidance:
            raise ValidationError(
                {"review_guidance": "Review guidance is only supported for essay manual-review rows."}
            )
        return metadata

    if question_type == QuestionType.FILL_IN_BLANKS:
        blank_count = _fill_in_blanks_marker_count(question_text)
        if blank_count < 1:
            raise ValidationError(
                {"question_text": "Fill in the blanks rows must include at least one [[blank]] marker in the prompt."}
            )
        if not accepted_answers and correct_answer_value:
            accepted_answers = [correct_answer_value]
        if len(accepted_answers) != blank_count:
            raise ValidationError(
                {
                    "accepted_answers": (
                        f"Provide exactly {blank_count} accepted answer entr"
                        f"{'y' if blank_count == 1 else 'ies'} in blank order."
                    )
                }
            )
        metadata["accepted_answers"] = accepted_answers
        metadata["fill_in_blanks"] = {"blank_count": blank_count}
        if numeric_tolerance:
            raise ValidationError(
                {"numeric_tolerance": "Numeric tolerance is only supported for numeric-answer rows."}
            )
        if review_guidance:
            raise ValidationError(
                {"review_guidance": "Review guidance is only supported for essay manual-review rows."}
            )
        return metadata

    if question_type_supports_text_answer(question_type):
        if not accepted_answers and correct_answer_value:
            accepted_answers = [correct_answer_value]
        if not accepted_answers:
            raise ValidationError(
                {"accepted_answers": "Provide at least one accepted answer for text-based rows."}
            )
        metadata["accepted_answers"] = accepted_answers

        if numeric_tolerance:
            raise ValidationError(
                {"numeric_tolerance": "Numeric tolerance is only supported for numeric-answer rows."}
            )
        if review_guidance:
            raise ValidationError(
                {"review_guidance": "Review guidance is only supported for essay manual-review rows."}
            )
        return metadata

    if accepted_answers:
        raise ValidationError(
            {"accepted_answers": f"{question_type} rows do not use accepted_answers."}
        )
    if numeric_tolerance:
        raise ValidationError(
            {"numeric_tolerance": "Numeric tolerance is only supported for numeric-answer rows."}
        )
    if review_guidance:
        raise ValidationError(
            {"review_guidance": "Review guidance is only supported for essay manual-review rows."}
        )

    return metadata


def preview_bulk_question_import(*, institute, rows, created_by=None):
    preview_rows = []
    valid_rows = []
    subject_cache = {}
    topic_cache = {}
    duplicate_question_fingerprints = {}
    duplicate_passage_orders = {}

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
            passage = _resolve_passage(institute, subject, topic, row.get("passage_title"))

            validate_academic_mapping(
                institute=institute,
                subject=subject,
                program=subject.program,
                topic=topic,
                created_by_teacher=created_by,
            )

            question_type = _normalize_question_type(row.get("question_type"))
            difficulty_level = _normalize_difficulty(row.get("difficulty_level"))
            question_text = (row.get("question_text") or "").strip()
            if not question_text:
                raise ValidationError({"question_text": "Question text is required."})
            options = _build_options_from_row(question_type, row)
            metadata = {
                "import_source": "bulk_csv",
                **_build_type_specific_import_metadata(question_type, row),
            }
            default_marks = _decimal_from_row(row, "default_marks", "1.00")
            negative_marks = _decimal_from_row(row, "negative_marks", "0.00")
            raw_passage_order = str(row.get("passage_order") or "").strip()
            passage_order = None
            if raw_passage_order:
                try:
                    passage_order = int(raw_passage_order)
                except ValueError:
                    raise ValidationError({"passage_order": "Comprehension order must be a whole number."})
                if passage_order < 1:
                    raise ValidationError({"passage_order": "Comprehension order must be positive."})
            if passage is None and passage_order is not None:
                raise ValidationError(
                    {"passage_order": "Passage order can only be used when passage_title is provided."}
                )
            if default_marks < 0 or negative_marks < 0:
                raise ValidationError({"marks": "Marks values cannot be negative."})

            _ensure_no_duplicate_question_import(
                institute=institute,
                subject=subject,
                topic=topic,
                question_type=question_type,
                question_text=question_text,
                passage=passage,
                source_row_number=index,
                seen_fingerprints=duplicate_question_fingerprints,
            )
            _ensure_no_duplicate_passage_order_import(
                passage=passage,
                passage_order=passage_order,
                source_row_number=index,
                seen_orders=duplicate_passage_orders,
            )

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
                "passage": passage,
                "passage_order": passage_order,
                "question_type": question_type,
                "difficulty_level": difficulty_level,
                "question_text": question_text,
                "explanation": (row.get("explanation") or "").strip(),
                "default_marks": default_marks,
                "negative_marks": negative_marks,
                "is_active": True,
                "is_verified": False,
                "metadata": metadata,
                "options": options,
                "tags": tag_values,
                "source_row_number": index,
            }
            question = Question(
                institute=institute,
                program=payload["program"],
                subject=subject,
                topic=topic,
                created_by_teacher=created_by,
                passage=passage,
                passage_order=passage_order,
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
                    "is_valid": True,
                    "question_text": question_text,
                    "subject_code": subject.name,
                    "subject_name": subject.name,
                    "topic_code": topic.name if topic else "",
                    "topic_name": topic.name if topic else "",
                    "passage_title": passage.title if passage else "",
                    "passage_order": passage_order if passage_order is not None else "",
                    "question_type": question_type,
                    "difficulty_level": difficulty_level,
                    "tag_values": tag_values,
                    "errors": [],
                    "error_fields": [],
                    "expectations": _preview_row_expectations(question_type),
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
                    "is_valid": False,
                    "question_text": (row.get("question_text") or "").strip(),
                    "subject_code": (row.get("subject") or "").strip(),
                    "subject_name": (row.get("subject") or "").strip(),
                    "topic_code": (row.get("topic") or "").strip(),
                    "topic_name": (row.get("topic") or "").strip(),
                    "passage_title": (row.get("passage_title") or "").strip(),
                    "passage_order": (row.get("passage_order") or "").strip(),
                    "question_type": _safe_preview_question_type(row.get("question_type")),
                    "difficulty_level": _normalize_difficulty(row.get("difficulty_level")),
                    "tag_values": [
                        item.strip()
                        for item in (row.get("tags") or "").replace(",", "|").split("|")
                        if item.strip()
                    ],
                    "errors": _flatten_import_errors(errors),
                    "error_fields": list(errors.keys()),
                    "expectations": _preview_row_expectations(_safe_preview_question_type(row.get("question_type"))),
                    "error_map": errors,
                }
            )

    return {
        "preview_schema_version": IMPORT_PREVIEW_SCHEMA_VERSION,
        "preview_signature": build_import_preview_signature(
            rows=preview_rows,
            valid_payloads=valid_rows,
            schema_version=IMPORT_PREVIEW_SCHEMA_VERSION,
        ),
        "total_rows": len(rows),
        "valid_rows": len(valid_rows),
        "invalid_rows": len(rows) - len(valid_rows),
        "rows": preview_rows,
        "valid_payloads": valid_rows,
    }


def preview_bulk_question_passage_import(*, institute, rows, created_by=None):
    preview_rows = []
    valid_rows = []
    subject_cache = {}
    topic_cache = {}
    duplicate_passage_fingerprints = {}

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

            validate_academic_mapping(
                institute=institute,
                subject=subject,
                program=subject.program,
                topic=topic,
                created_by_teacher=created_by,
            )

            title = str(row.get("title") or "").strip()
            if not title:
                raise ValidationError({"title": "Set title is required."})

            _ensure_no_duplicate_passage_import(
                institute=institute,
                subject=subject,
                topic=topic,
                title=title,
                source_row_number=index,
                seen_fingerprints=duplicate_passage_fingerprints,
            )

            content_format = _normalize_content_format(row.get("content_format"))
            passage_text = sanitize_content_by_format(content_format, str(row.get("passage_text") or "").strip())
            description = sanitize_content_by_format(content_format, str(row.get("description") or "").strip())
            if not passage_text:
                raise ValidationError({"passage_text": "Passage text is required."})

            payload = {
                "institute": institute,
                "program": subject.program,
                "subject": subject,
                "topic": topic,
                "created_by_teacher": created_by,
                "title": title,
                "content_format": content_format,
                "passage_text": passage_text,
                "description": description,
                "metadata": {"import_source": "bulk_csv_passage"},
                "is_active": True,
                "source_row_number": index,
            }
            passage = QuestionPassage(
                institute=institute,
                program=payload["program"],
                subject=subject,
                topic=topic,
                created_by_teacher=created_by,
                title=title,
                content_format=content_format,
                passage_text=passage_text,
                description=description,
                metadata=payload["metadata"],
                is_active=True,
            )
            passage.clean()
            preview_rows.append(
                {
                    "row_number": index,
                    "status": "valid",
                    "is_valid": True,
                    "title": title,
                    "subject_code": subject.name,
                    "subject_name": subject.name,
                    "topic_code": topic.name if topic else "",
                    "topic_name": topic.name if topic else "",
                    "content_format": content_format,
                    "errors": [],
                    "error_fields": [],
                    "expectations": [
                        "Provide one shared set title plus the full passage text.",
                        "Use a valid subject and optional topic from Academic Setup.",
                    ],
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
                    "is_valid": False,
                    "title": str(row.get("title") or "").strip(),
                    "subject_code": (row.get("subject") or "").strip(),
                    "subject_name": (row.get("subject") or "").strip(),
                    "topic_code": (row.get("topic") or "").strip(),
                    "topic_name": (row.get("topic") or "").strip(),
                    "content_format": _safe_preview_content_format(row.get("content_format")),
                    "errors": _flatten_import_errors(errors),
                    "error_fields": list(errors.keys()),
                    "expectations": [
                        "Provide one shared set title plus the full passage text.",
                        "Use a valid subject and optional topic from Academic Setup.",
                    ],
                    "error_map": errors,
                }
            )

    return {
        "preview_schema_version": IMPORT_PASSAGE_PREVIEW_SCHEMA_VERSION,
        "preview_signature": build_import_preview_signature(
            rows=preview_rows,
            valid_payloads=valid_rows,
            schema_version=IMPORT_PASSAGE_PREVIEW_SCHEMA_VERSION,
        ),
        "total_rows": len(rows),
        "valid_rows": len(valid_rows),
        "invalid_rows": len(rows) - len(valid_rows),
        "rows": preview_rows,
        "valid_payloads": valid_rows,
    }


@transaction.atomic
def import_bulk_questions(*, institute, preview_payload, created_by=None):
    preview_rows = preview_payload.get("rows") or preview_payload.get("preview_rows", [])
    valid_payloads = preview_payload.get("valid_payloads", [])
    preview_schema_version = preview_payload.get("preview_schema_version")
    preview_signature = str(preview_payload.get("preview_signature") or "").strip()

    if preview_schema_version != IMPORT_PREVIEW_SCHEMA_VERSION:
        raise ValidationError(
            {
                "preview_schema_version": (
                    "The import preview is outdated. Generate a fresh preview before finalizing."
                )
            }
        )

    expected_signature = build_import_preview_signature(
        rows=preview_rows,
        valid_payloads=valid_payloads,
        schema_version=preview_schema_version,
    )
    if not preview_signature or preview_signature != expected_signature:
        raise ValidationError(
            {"preview_signature": "The import preview no longer matches the current payload. Preview the file again before finalizing."}
        )

    created_questions = []
    failures = []
    finalize_seen_question_fingerprints = {}
    finalize_seen_passage_orders = {}
    for row in preview_rows:
        if row.get("status") != "valid":
            failures.append(row)
    for payload in valid_payloads:
        try:
            program = _resolve_program_for_import(institute, payload.get("program"))
            subject = _resolve_subject_for_import(institute, payload["subject"])
            topic = _resolve_topic_for_import(institute, subject, payload.get("topic"))
            passage = _resolve_passage_for_import(
                institute,
                subject,
                topic,
                payload.get("passage"),
                payload.get("passage_title"),
            )
            _ensure_no_duplicate_question_import(
                institute=institute,
                subject=subject,
                topic=topic,
                question_type=payload["question_type"],
                question_text=payload["question_text"],
                passage=passage,
                source_row_number=payload.get("source_row_number") or 0,
                seen_fingerprints=finalize_seen_question_fingerprints,
            )
            _ensure_no_duplicate_passage_order_import(
                passage=passage,
                passage_order=payload.get("passage_order"),
                source_row_number=payload.get("source_row_number") or 0,
                seen_orders=finalize_seen_passage_orders,
            )
            question = Question.objects.create(
                institute=institute,
                program=program,
                subject=subject,
                topic=topic,
                created_by_teacher=created_by,
                passage=passage,
                passage_order=payload.get("passage_order"),
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
            sync_master_question_from_institute_question(question)
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
                    "row_number": payload.get("source_row_number"),
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
def import_bulk_question_passages(*, institute, preview_payload, created_by=None):
    preview_rows = preview_payload.get("rows") or preview_payload.get("preview_rows", [])
    valid_payloads = preview_payload.get("valid_payloads", [])
    preview_schema_version = preview_payload.get("preview_schema_version")
    preview_signature = str(preview_payload.get("preview_signature") or "").strip()

    if preview_schema_version != IMPORT_PASSAGE_PREVIEW_SCHEMA_VERSION:
        raise ValidationError(
            {
                "preview_schema_version": (
                    "The comprehension import preview is outdated. Generate a fresh preview before finalizing."
                )
            }
        )

    expected_signature = build_import_preview_signature(
        rows=preview_rows,
        valid_payloads=valid_payloads,
        schema_version=preview_schema_version,
    )
    if not preview_signature or preview_signature != expected_signature:
        raise ValidationError(
            {
                "preview_signature": (
                    "The comprehension import preview no longer matches the current payload. Preview the file again before finalizing."
                )
            }
        )

    created_passages = []
    failures = []
    finalize_seen_passage_fingerprints = {}
    for row in preview_rows:
        if row.get("status") != "valid":
            failures.append(row)
    for payload in valid_payloads:
        try:
            program = _resolve_program_for_import(institute, payload.get("program"))
            subject = _resolve_subject_for_import(institute, payload["subject"])
            topic = _resolve_topic_for_import(institute, subject, payload.get("topic"))
            _ensure_no_duplicate_passage_import(
                institute=institute,
                subject=subject,
                topic=topic,
                title=payload["title"],
                source_row_number=payload.get("source_row_number") or 0,
                seen_fingerprints=finalize_seen_passage_fingerprints,
            )
            passage = QuestionPassage.objects.create(
                institute=institute,
                program=program,
                subject=subject,
                topic=topic,
                created_by_teacher=created_by,
                title=payload["title"],
                content_format=payload["content_format"],
                passage_text=payload["passage_text"],
                description=payload["description"],
                metadata=payload.get("metadata") or {},
                is_active=payload.get("is_active", True),
            )
            created_passages.append(passage)
        except Exception as exc:  # pragma: no cover - defensive partial import path
            failures.append(
                {
                    "row_number": payload.get("source_row_number"),
                    "status": "invalid",
                    "title": payload["title"],
                    "errors": {"detail": [str(exc)]},
                }
            )
    return {
        "created_count": len(created_passages),
        "failed_count": len(failures),
        "created_ids": [str(passage.id) for passage in created_passages],
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
