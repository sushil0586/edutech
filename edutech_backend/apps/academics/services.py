from datetime import date

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, F, Q

ADVANCED_BUILDER_FEATURE_CODE = "ADVANCED_EXAM_BUILDER"

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


def _load_academic_presets():
    from apps.academics.management.seed_presets import PRESETS

    return PRESETS


def _normalize_subject_code_list(subject_codes):
    return [normalize_academic_code(code) for code in (subject_codes or []) if str(code).strip()]


def _normalize_topic_code_list(topic_codes):
    return [normalize_academic_code(code) for code in (topic_codes or []) if str(code).strip()]


def _resolve_regular_institute_for_preset_apply(institute_id):
    from apps.institutes.models import Institute

    institute = Institute.objects.filter(id=institute_id).first()
    if institute is None:
        raise ValidationError({"institute": "Institute not found."})
    if (institute.metadata or {}).get("is_public_content_hub"):
        raise ValidationError(
            {"institute": "Public content hub is not supported in this workflow yet."}
        )
    return institute


def _resolve_preset(preset_code):
    preset_map = _load_academic_presets()
    preset = preset_map.get((preset_code or "").strip())
    if preset is None:
        raise ValidationError({"preset_code": "Academic preset not found."})
    return preset


def _resolve_master_default_question_bank_package(package_code):
    from apps.economy.models import QuestionBankOwnershipType, QuestionBankPackage

    normalized_code = normalize_academic_code(package_code)
    if not normalized_code:
        raise ValidationError({"question_bank_package_code": "Question-bank package code is required."})

    package = (
        QuestionBankPackage.objects.select_related("institute")
        .filter(
            code=normalized_code,
            is_active=True,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
            institute__metadata__is_public_content_hub=True,
        )
        .order_by("created_at")
        .first()
    )
    if package is None:
        raise ValidationError(
            {
                "question_bank_package_code": (
                    "Selected question-bank package must resolve to an active platform-managed "
                    "package from a public content hub."
                )
            }
        )

    return package


def _build_access_preview(
    *,
    package_enabled,
    package,
    advanced_builder_enabled,
):
    return {
        "question_bank_package": {
            "enabled": bool(package_enabled),
            "package_code": package.code if package is not None else None,
            "package_name": package.name if package is not None else None,
            "action": "grant" if package_enabled and package is not None else "none",
        },
        "advanced_builder": {
            "enabled": bool(advanced_builder_enabled),
            "feature_code": ADVANCED_BUILDER_FEATURE_CODE,
            "action": "grant" if advanced_builder_enabled else "none",
            "source_package_code": package.code if advanced_builder_enabled and package is not None else None,
        },
    }


def _apply_master_default_access(
    *,
    institute,
    question_bank_package_enabled=False,
    question_bank_package_code="",
    advanced_builder_enabled=False,
):
    from apps.economy.models import (
        InstituteQuestionEntitlement,
        InstituteQuestionEntitlementStatus,
        InstituteQuestionFeatureEntitlement,
    )
    from apps.economy.services import (
        grant_institute_feature_entitlement,
        grant_institute_question_bank_entitlement,
        update_institute_question_bank_entitlement_status,
        update_institute_question_feature_entitlement_status,
    )

    package = None
    package_result = {
        "enabled": bool(question_bank_package_enabled),
        "package_code": None,
        "package_name": None,
        "status": "not_requested",
        "entitlement_id": None,
    }
    if question_bank_package_enabled or str(question_bank_package_code or "").strip():
        package = _resolve_master_default_question_bank_package(question_bank_package_code)
        package_result["package_code"] = package.code
        package_result["package_name"] = package.name

    if question_bank_package_enabled and package is not None:
        entitlement, created = grant_institute_question_bank_entitlement(
            institute=institute,
            question_bank_package=package,
            notes="Applied from master academic defaults.",
            metadata={"source": "academic_master_defaults"},
        )
        package_result["status"] = "granted" if created else "reactivated"
        package_result["entitlement_id"] = str(entitlement.id)
    elif package is not None:
        live_statuses = [
            InstituteQuestionEntitlementStatus.DRAFT,
            InstituteQuestionEntitlementStatus.ACTIVE,
            InstituteQuestionEntitlementStatus.PAUSED,
        ]
        entitlement = InstituteQuestionEntitlement.objects.filter(
            institute=institute,
            question_bank_package=package,
            status__in=live_statuses,
        ).first()
        if entitlement is not None:
            update_institute_question_bank_entitlement_status(
                entitlement=entitlement,
                status=InstituteQuestionEntitlementStatus.REVOKED,
                notes="Disabled from master academic defaults.",
            )
            package_result["status"] = "revoked"
            package_result["entitlement_id"] = str(entitlement.id)
        else:
            package_result["status"] = "already_disabled"

    feature_result = {
        "enabled": bool(advanced_builder_enabled),
        "feature_code": ADVANCED_BUILDER_FEATURE_CODE,
        "status": "not_requested",
        "entitlement_id": None,
        "source_package_code": package.code if package is not None else None,
    }
    if advanced_builder_enabled:
        feature_entitlement, created = grant_institute_feature_entitlement(
            institute=institute,
            feature_code=ADVANCED_BUILDER_FEATURE_CODE,
            source_package=package,
            metadata={"source": "academic_master_defaults"},
        )
        feature_result["status"] = "granted" if created else "reactivated"
        feature_result["entitlement_id"] = str(feature_entitlement.id)
    else:
        live_statuses = [
            InstituteQuestionEntitlementStatus.DRAFT,
            InstituteQuestionEntitlementStatus.ACTIVE,
            InstituteQuestionEntitlementStatus.PAUSED,
        ]
        feature_entitlement = InstituteQuestionFeatureEntitlement.objects.filter(
            institute=institute,
            feature_code=ADVANCED_BUILDER_FEATURE_CODE,
            status__in=live_statuses,
        ).first()
        if feature_entitlement is not None:
            update_institute_question_feature_entitlement_status(
                entitlement=feature_entitlement,
                status=InstituteQuestionEntitlementStatus.REVOKED,
            )
            feature_result["status"] = "revoked"
            feature_result["entitlement_id"] = str(feature_entitlement.id)
        else:
            feature_result["status"] = "already_disabled"

    return {
        "question_bank_package": package_result,
        "advanced_builder": feature_result,
    }


def _leaf_topic_count(subject_payload):
    return sum(max(1, len(topic.get("children", []))) for topic in subject_payload.get("topics", []))


def _build_preset_metadata(preset_code, preset):
    subjects = preset.get("subjects", [])
    program = preset.get("program", {})
    return {
        "code": preset_code,
        "label": str(program.get("name") or preset_code).strip(),
        "category": str(program.get("category") or "").strip(),
        "program_code": str(program.get("code") or "").strip(),
        "description": str(program.get("description") or "").strip(),
        "subject_count": len(subjects),
        "topic_group_count": sum(len(subject.get("topics", [])) for subject in subjects),
        "leaf_topic_count": sum(_leaf_topic_count(subject) for subject in subjects),
        "subject_codes": [str(subject.get("code") or "").strip() for subject in subjects],
    }


def list_academic_presets():
    preset_map = _load_academic_presets()
    return [
        _build_preset_metadata(code, preset)
        for code, preset in sorted(preset_map.items(), key=lambda item: item[0])
    ]


def _serialize_topic_payload(topic_payload):
    children = topic_payload.get("children", [])
    return {
        "name": str(topic_payload.get("name") or "").strip(),
        "code": str(topic_payload.get("code") or "").strip(),
        "description": str(topic_payload.get("description") or "").strip(),
        "sort_order": int(topic_payload.get("sort_order") or 0),
        "children": [
            {
                "name": str(child_name).strip(),
                "code": str(child_code).strip(),
                "sort_order": int(child_sort_order),
            }
            for child_name, child_code, child_sort_order in children
        ],
    }


def get_academic_preset_detail(preset_code):
    preset = _resolve_preset(preset_code)
    metadata = _build_preset_metadata(preset_code, preset)
    return {
        **metadata,
        "program": {
            "name": str(preset["program"].get("name") or "").strip(),
            "code": str(preset["program"].get("code") or "").strip(),
            "category": str(preset["program"].get("category") or "").strip(),
            "description": str(preset["program"].get("description") or "").strip(),
            "sort_order": int(preset["program"].get("sort_order") or 0),
        },
        "subjects": [
            {
                "name": str(subject.get("name") or "").strip(),
                "code": str(subject.get("code") or "").strip(),
                "description": str(subject.get("description") or "").strip(),
                "sort_order": int(subject.get("sort_order") or 0),
                "topic_group_count": len(subject.get("topics", [])),
                "leaf_topic_count": _leaf_topic_count(subject),
                "topics": [_serialize_topic_payload(topic) for topic in subject.get("topics", [])],
            }
            for subject in preset.get("subjects", [])
        ],
    }


def _filter_subject_payloads(preset, *, mode="full", subject_codes=None, topic_codes=None):
    subject_payloads = preset.get("subjects", [])
    normalized_codes = set(_normalize_subject_code_list(subject_codes))
    normalized_topic_codes = set(_normalize_topic_code_list(topic_codes))
    if mode == "selected_subjects":
        if not normalized_codes:
            raise ValidationError({"subject_codes": "Select at least one subject for selective apply."})
        filtered = [
            subject for subject in subject_payloads if normalize_academic_code(subject.get("code")) in normalized_codes
        ]
        if not filtered:
            raise ValidationError({"subject_codes": "None of the selected subject codes exist in the preset."})
        return filtered
    if mode == "selected_topic_groups":
        if not normalized_topic_codes:
            raise ValidationError({"topic_codes": "Select at least one topic group for selective apply."})
        filtered_subjects = []
        for subject in subject_payloads:
            filtered_topics = [
                topic
                for topic in subject.get("topics", [])
                if normalize_academic_code(topic.get("code")) in normalized_topic_codes
            ]
            if filtered_topics:
                next_subject = dict(subject)
                next_subject["topics"] = filtered_topics
                filtered_subjects.append(next_subject)
        if not filtered_subjects:
            raise ValidationError({"topic_codes": "None of the selected topic groups exist in the preset."})
        return filtered_subjects
    return subject_payloads


def _build_apply_summary():
    return {
        "academic_years": {"created": 0, "updated": 0},
        "programs": {"created": 0, "updated": 0},
        "subjects": {"created": 0, "updated": 0},
        "topics": {"created": 0, "updated": 0},
    }


def _upsert_academic_year(*, institute, name, start_date, end_date, summary):
    from apps.academics.models import AcademicYear

    AcademicYear.objects.filter(institute=institute, is_current=True).exclude(name=name).update(
        is_current=False
    )
    academic_year, created = AcademicYear.objects.update_or_create(
        institute=institute,
        name=name,
        defaults={
            "start_date": start_date,
            "end_date": end_date,
            "is_current": True,
            "is_active": True,
        },
    )
    summary["created" if created else "updated"] += 1
    AcademicYear.objects.filter(institute=institute).exclude(pk=academic_year.pk).update(
        is_current=False
    )
    return academic_year


def _upsert_program(*, institute, payload, summary):
    from apps.academics.models import Program

    program, created = Program.objects.update_or_create(
        institute=institute,
        code=payload["code"],
        defaults={
            "name": payload["name"],
            "category": payload["category"],
            "description": payload["description"],
            "sort_order": payload["sort_order"],
            "is_active": True,
        },
    )
    summary["created" if created else "updated"] += 1
    return program


def _upsert_subject(*, institute, program, payload, summary):
    from apps.academics.models import Subject

    subject, created = Subject.objects.update_or_create(
        institute=institute,
        code=payload["code"],
        defaults={
            "program": program,
            "name": payload["name"],
            "description": payload["description"],
            "sort_order": payload["sort_order"],
            "is_active": True,
        },
    )
    summary["created" if created else "updated"] += 1
    return subject


def _upsert_topic(*, institute, subject, parent_topic, payload, summary):
    from apps.academics.models import Topic

    topic, created = Topic.objects.update_or_create(
        subject=subject,
        code=payload["code"],
        defaults={
            "institute": institute,
            "parent_topic": parent_topic,
            "name": payload["name"],
            "description": payload.get("description", ""),
            "difficulty_level": "intermediate",
            "sort_order": payload["sort_order"],
            "is_active": True,
        },
    )
    summary["created" if created else "updated"] += 1
    return topic


def preview_academic_preset_application(
    *,
    institute_id,
    preset_code,
    mode="full",
    subject_codes=None,
    topic_codes=None,
    academic_year_name="2026-2027",
    academic_year_start="2026-04-01",
    academic_year_end="2027-03-31",
    question_bank_package_enabled=False,
    question_bank_package_code="",
    advanced_builder_enabled=False,
):
    from apps.academics.models import AcademicYear, Program, Subject, Topic

    institute = _resolve_regular_institute_for_preset_apply(institute_id)
    preset = _resolve_preset(preset_code)
    subject_payloads = _filter_subject_payloads(
        preset,
        mode=mode,
        subject_codes=subject_codes,
        topic_codes=topic_codes,
    )
    program_payload = preset["program"]
    start_date = date.fromisoformat(academic_year_start)
    end_date = date.fromisoformat(academic_year_end)
    package = None
    if question_bank_package_enabled or str(question_bank_package_code or "").strip():
        package = _resolve_master_default_question_bank_package(question_bank_package_code)

    academic_year_action = (
        "update"
        if AcademicYear.objects.filter(institute=institute, name=academic_year_name.strip()).exists()
        else "create"
    )
    program_action = (
        "update"
        if Program.objects.filter(institute=institute, code=program_payload["code"]).exists()
        else "create"
    )

    subject_breakdown = []
    topic_create_count = 0
    topic_update_count = 0
    for subject_payload in subject_payloads:
        subject_exists = Subject.objects.filter(
            institute=institute,
            code=subject_payload["code"],
        ).first()
        topic_group_summaries = []
        for topic_payload in subject_payload.get("topics", []):
            parent_action = (
                "update"
                if Topic.objects.filter(
                    institute=institute,
                    subject__code=subject_payload["code"],
                    code=topic_payload["code"],
                ).exists()
                else "create"
            )
            if parent_action == "create":
                topic_create_count += 1
            else:
                topic_update_count += 1
            child_summaries = []
            for child_name, child_code, child_sort_order in topic_payload.get("children", []):
                child_action = (
                    "update"
                    if Topic.objects.filter(
                        institute=institute,
                        subject__code=subject_payload["code"],
                        code=child_code,
                    ).exists()
                    else "create"
                )
                if child_action == "create":
                    topic_create_count += 1
                else:
                    topic_update_count += 1
                child_summaries.append(
                    {
                        "name": child_name,
                        "code": child_code,
                        "sort_order": child_sort_order,
                        "action": child_action,
                    }
                )
            topic_group_summaries.append(
                {
                    "name": topic_payload["name"],
                    "code": topic_payload["code"],
                    "action": parent_action,
                    "children": child_summaries,
                }
            )

        subject_breakdown.append(
            {
                "name": subject_payload["name"],
                "code": subject_payload["code"],
                "action": "update" if subject_exists else "create",
                "topic_groups": topic_group_summaries,
                "leaf_topic_count": _leaf_topic_count(subject_payload),
            }
        )

    return {
        "preset": _build_preset_metadata(preset_code, preset),
        "mode": mode,
        "institute": {
            "id": str(institute.id),
            "name": institute.name,
            "code": institute.code,
        },
        "academic_year": {
            "name": academic_year_name.strip(),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "action": academic_year_action,
        },
        "program": {
            "name": program_payload["name"],
            "code": program_payload["code"],
            "action": program_action,
        },
        "subjects": subject_breakdown,
        "summary": {
            "subjects_to_apply": len(subject_breakdown),
            "topic_groups_to_apply": sum(len(subject["topic_groups"]) for subject in subject_breakdown),
            "leaf_topics_to_create": topic_create_count,
            "leaf_topics_to_update": topic_update_count,
        },
        "access_plan": _build_access_preview(
            package_enabled=question_bank_package_enabled,
            package=package,
            advanced_builder_enabled=advanced_builder_enabled,
        ),
    }


@transaction.atomic
def apply_academic_preset_to_institute(
    *,
    institute_id,
    preset_code,
    mode="full",
    subject_codes=None,
    topic_codes=None,
    academic_year_name="2026-2027",
    academic_year_start="2026-04-01",
    academic_year_end="2027-03-31",
    question_bank_package_enabled=False,
    question_bank_package_code="",
    advanced_builder_enabled=False,
    onboarding_run_id=None,
):
    institute = _resolve_regular_institute_for_preset_apply(institute_id)
    preset = _resolve_preset(preset_code)
    subject_payloads = _filter_subject_payloads(
        preset,
        mode=mode,
        subject_codes=subject_codes,
        topic_codes=topic_codes,
    )
    start_date = date.fromisoformat(academic_year_start)
    end_date = date.fromisoformat(academic_year_end)
    summary = _build_apply_summary()

    _upsert_academic_year(
        institute=institute,
        name=academic_year_name.strip(),
        start_date=start_date,
        end_date=end_date,
        summary=summary["academic_years"],
    )
    program = _upsert_program(
        institute=institute,
        payload=preset["program"],
        summary=summary["programs"],
    )

    applied_subjects = []
    for subject_payload in subject_payloads:
        subject = _upsert_subject(
            institute=institute,
            program=program,
            payload=subject_payload,
            summary=summary["subjects"],
        )
        topic_groups_applied = 0
        leaf_topics_applied = 0
        for topic_payload in subject_payload.get("topics", []):
            parent_topic = _upsert_topic(
                institute=institute,
                subject=subject,
                parent_topic=None,
                payload=topic_payload,
                summary=summary["topics"],
            )
            topic_groups_applied += 1
            leaf_topics_applied += 1
            for child_name, child_code, child_sort_order in topic_payload.get("children", []):
                _upsert_topic(
                    institute=institute,
                    subject=subject,
                    parent_topic=parent_topic,
                    payload={
                        "name": child_name,
                        "code": child_code,
                        "description": "",
                        "sort_order": child_sort_order,
                    },
                    summary=summary["topics"],
                )
                leaf_topics_applied += 1

        applied_subjects.append(
            {
                "name": subject_payload["name"],
                "code": subject_payload["code"],
                "topic_group_count": topic_groups_applied,
                "leaf_topic_count": leaf_topics_applied,
            }
        )

    findings = audit_academic_catalog(
        institute_code=institute.code,
        fail_on_empty_active_topics=False,
    )
    access_results = _apply_master_default_access(
        institute=institute,
        question_bank_package_enabled=question_bank_package_enabled,
        question_bank_package_code=question_bank_package_code,
        advanced_builder_enabled=advanced_builder_enabled,
    )
    onboarding_run = None
    if onboarding_run_id is not None:
        from apps.institutes.models import (
            InstituteOnboardingRun,
            InstituteOnboardingTaskStatus,
        )
        from apps.institutes.services import record_institute_onboarding_task

        onboarding_run = InstituteOnboardingRun.objects.filter(
            id=onboarding_run_id,
            institute=institute,
        ).first()
        if onboarding_run is not None:
            record_institute_onboarding_task(
                run=onboarding_run,
                task_code="academic_preset_apply",
                label="Academic preset apply",
                status=InstituteOnboardingTaskStatus.COMPLETED,
                message=f"Applied preset {preset_code} in mode {mode}.",
                result_json={
                    "preset_code": preset_code,
                    "mode": mode,
                    "summary": summary,
                    "applied_subject_count": len(applied_subjects),
                },
            )
            record_institute_onboarding_task(
                run=onboarding_run,
                task_code="question_bank_package_access",
                label="Question-bank package access",
                status=InstituteOnboardingTaskStatus.COMPLETED
                if access_results["question_bank_package"]["status"] not in {"not_requested", "already_disabled"}
                else InstituteOnboardingTaskStatus.SKIPPED,
                message=access_results["question_bank_package"]["status"],
                result_json=access_results["question_bank_package"],
            )
            record_institute_onboarding_task(
                run=onboarding_run,
                task_code="advanced_builder_access",
                label="Advanced builder access",
                status=InstituteOnboardingTaskStatus.COMPLETED
                if access_results["advanced_builder"]["status"] not in {"not_requested", "already_disabled"}
                else InstituteOnboardingTaskStatus.SKIPPED,
                message=access_results["advanced_builder"]["status"],
                result_json=access_results["advanced_builder"],
            )
            record_institute_onboarding_task(
                run=onboarding_run,
                task_code="academic_catalog_audit",
                label="Academic catalog audit",
                status=InstituteOnboardingTaskStatus.COMPLETED,
                message=f"{len(findings)} finding groups returned.",
                result_json={"finding_count": len(findings), "finding_codes": [item["code"] for item in findings]},
            )

    return {
        "preset": _build_preset_metadata(preset_code, preset),
        "institute": {
            "id": str(institute.id),
            "name": institute.name,
            "code": institute.code,
        },
        "mode": mode,
        "applied_subjects": applied_subjects,
        "summary": summary,
        "audit_findings": findings,
        "access_results": access_results,
        "onboarding_run": {
            "id": str(onboarding_run.id),
            "status": onboarding_run.status,
            "profile_code": onboarding_run.profile_code,
            "task_count": onboarding_run.tasks.count(),
        }
        if onboarding_run is not None
        else None,
    }
