from django.core.exceptions import ValidationError

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
