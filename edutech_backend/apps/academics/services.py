from django.core.exceptions import ValidationError
from django.db.models import Count, F, Q

EXAM_TYPE_NAMESPACE = "exam_type"
EXAM_DELIVERY_MODE_NAMESPACE = "exam_delivery_mode"
EXAM_TIMER_MODE_NAMESPACE = "exam_timer_mode"
EXAM_NAVIGATION_MODE_NAMESPACE = "exam_navigation_mode"
EXAM_ATTEMPT_POLICY_NAMESPACE = "exam_attempt_policy"
EXAM_RESULT_PUBLISH_MODE_NAMESPACE = "exam_result_publish_mode"
EXAM_REVIEW_MODE_NAMESPACE = "exam_review_mode"
EXAM_SECURITY_MODE_NAMESPACE = "exam_security_mode"
EXAM_ASSIGNMENT_MODE_NAMESPACE = "exam_assignment_mode"
EXAM_ECONOMY_ACCESS_POLICY_NAMESPACE = "exam_economy_access_policy"
QUESTION_TYPE_NAMESPACE = "question_type"
QUESTION_DIFFICULTY_NAMESPACE = "question_difficulty"
QUESTION_CONTENT_FORMAT_NAMESPACE = "question_content_format"
QUESTION_ATTACHMENT_TYPE_NAMESPACE = "question_attachment_type"


def normalize_academic_code(value):
    return (value or "").strip().upper()


def normalize_academic_name(value):
    return (value or "").strip()


def validate_academic_year_overlap(instance):
    overlapping_years = instance.__class__.objects.filter(
        institute=instance.institute,
        start_date__lte=instance.end_date,
        end_date__gte=instance.start_date,
    ).exclude(pk=instance.pk)

    if overlapping_years.exists():
        raise ValidationError(
            {"end_date": "Academic year dates overlap with an existing academic year."}
        )


def _option_catalog_queryset(namespace, *, active_only=True):
    from apps.academics.models import OptionCatalogEntry

    queryset = OptionCatalogEntry.objects.filter(namespace=(namespace or "").strip().lower())
    if active_only:
        queryset = queryset.filter(is_active=True)
    return queryset.order_by("sort_order", "label")


def get_option_catalog_entries(namespace, *, active_only=True):
    return list(_option_catalog_queryset(namespace, active_only=active_only))


def get_option_catalog_codes(namespace, *, active_only=True):
    return set(
        _option_catalog_queryset(namespace, active_only=active_only).values_list("code", flat=True)
    )


def get_option_catalog_default(namespace, *, active_only=True):
    return _option_catalog_queryset(namespace, active_only=active_only).filter(is_default=True).first()


def get_option_catalog_default_code(namespace, *, active_only=True):
    option = get_option_catalog_default(namespace, active_only=active_only)
    if option is not None:
        return option.code
    first_option = _option_catalog_queryset(namespace, active_only=active_only).first()
    return first_option.code if first_option is not None else ""


def normalize_option_catalog_code(namespace, value, *, fallback_to_default=False):
    normalized = (value or "").strip().lower()
    if normalized:
        return normalized
    if fallback_to_default:
        return get_option_catalog_default_code(namespace)
    return ""


def validate_option_catalog_code(namespace, value, field_name):
    normalized = normalize_option_catalog_code(namespace, value)
    available_codes = get_option_catalog_codes(namespace)
    if normalized not in available_codes:
        raise ValidationError(
            {
                field_name: (
                    f"'{value}' is not an active option for {namespace.replace('_', ' ')}."
                )
            }
        )
    return normalized


def audit_academic_catalog(
    *,
    institute_code=None,
    subject_code=None,
    fail_on_empty_active_topics=False,
):
    from apps.academics.models import Subject, Topic
    from apps.question_bank.models import Question

    subject_filters = Q()
    if institute_code:
        subject_filters &= Q(institute__code=normalize_academic_code(institute_code))
    if subject_code:
        subject_filters &= Q(code=normalize_academic_code(subject_code))

    findings = []

    duplicate_subjects = list(
        Subject.objects.filter(subject_filters)
        .values("institute__code", "program__code", "code")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
        .order_by("institute__code", "program__code", "code")
    )
    if duplicate_subjects:
        findings.append({"code": "duplicate_subject_codes", "records": duplicate_subjects})

    duplicate_topics = list(
        Topic.objects.filter(subject__in=Subject.objects.filter(subject_filters))
        .values("subject__code", "subject__institute__code", "code")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
        .order_by("subject__institute__code", "subject__code", "code")
    )
    if duplicate_topics:
        findings.append({"code": "duplicate_topic_codes", "records": duplicate_topics})

    invalid_subject_program_links = list(
        Subject.objects.filter(subject_filters, program__isnull=False)
        .exclude(program__institute_id=F("institute_id"))
        .values("id", "code", "institute__code", "program__code")
    )
    if invalid_subject_program_links:
        findings.append(
            {"code": "invalid_subject_program_links", "records": invalid_subject_program_links}
        )

    scoped_topics = Topic.objects.filter(subject__in=Subject.objects.filter(subject_filters))

    invalid_topic_subject_links = list(
        scoped_topics.exclude(subject__institute_id=F("institute_id")).values(
            "id",
            "code",
            "institute__code",
            "subject__code",
            "subject__institute__code",
        )
    )
    if invalid_topic_subject_links:
        findings.append(
            {"code": "invalid_topic_subject_links", "records": invalid_topic_subject_links}
        )

    invalid_parent_topic_links = list(
        scoped_topics.filter(parent_topic__isnull=False)
        .exclude(parent_topic__subject_id=F("subject_id"))
        .values("id", "code", "subject__code", "parent_topic__code", "parent_topic__subject__code")
    )
    if invalid_parent_topic_links:
        findings.append(
            {"code": "invalid_parent_topic_links", "records": invalid_parent_topic_links}
        )

    mismatched_questions = list(
        Question.objects.filter(subject__in=Subject.objects.filter(subject_filters), topic__isnull=False)
        .exclude(topic__subject_id=F("subject_id"))
        .values("id", "subject__code", "topic__code", "topic__subject__code")
    )
    if mismatched_questions:
        findings.append({"code": "mismatched_question_topics", "records": mismatched_questions})

    if fail_on_empty_active_topics:
        empty_active_topics = list(
            scoped_topics.filter(is_active=True)
            .annotate(active_question_count=Count("questions", filter=Q(questions__is_active=True)))
            .filter(active_question_count=0)
            .values("id", "code", "name", "subject__code", "subject__institute__code")
            .order_by("subject__institute__code", "subject__code", "code")
        )
        if empty_active_topics:
            findings.append({"code": "empty_active_topics", "records": empty_active_topics})

    return findings
