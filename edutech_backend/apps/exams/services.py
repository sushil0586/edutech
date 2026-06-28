from datetime import datetime, time
from decimal import Decimal
import secrets
import string

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.accounts.models import AccountRole
from apps.academics.assessment_family_contracts import merge_assessment_family_contract


EXAM_PUBLISH_BLOCKER_INVALID_STATUS = "invalid_status"
EXAM_PUBLISH_BLOCKER_MISSING_SCHEDULE = "missing_schedule"
EXAM_PUBLISH_BLOCKER_INVALID_SCHEDULE_WINDOW = "invalid_schedule_window"
EXAM_PUBLISH_BLOCKER_NO_ACTIVE_QUESTIONS = "no_active_questions"
EXAM_PUBLISH_BLOCKER_FOREIGN_INSTITUTE_QUESTION = "foreign_institute_question"
EXAM_PUBLISH_BLOCKER_TOTAL_MARKS_MISMATCH = "total_marks_mismatch"
EXAM_PUBLISH_BLOCKER_INVALID_QUESTION_CONFIGURATION = "invalid_question_configuration"
EXAM_PUBLISH_BLOCKER_INACTIVE_SHARED_LIBRARY_ENTITLEMENT = "inactive_shared_library_entitlement"
EXAM_PUBLISH_BLOCKER_SHARED_LIBRARY_PUBLISH_LIMIT_REACHED = "shared_library_publish_limit_reached"
EXAM_PUBLISH_WARNING_MISSING_EXPLANATION = "missing_explanation"
EXAM_PUBLISH_WARNING_UNVERIFIED_QUESTION = "unverified_question"
EXAM_PUBLISH_WARNING_SHARED_LIBRARY_PUBLISH_LIMIT_NEAR = "shared_library_publish_limit_near"


ATTEMPT_POLICY_UNLIMITED_PRACTICE = "unlimited_practice"
ATTEMPT_POLICY_BEST = "best"
ASSIGNMENT_MODE_SCOPE = "scope"
ASSIGNMENT_MODE_SELECTED_STUDENTS = "selected_students"
RESULT_PUBLISH_MODE_IMMEDIATE = "immediate"
RESULT_PUBLISH_MODE_SCHEDULED = "scheduled"
REVIEW_MODE_NONE = "none"
REVIEW_MODE_ATTEMPTED_ONLY = "attempted_only"
REVIEW_MODE_ALL_QUESTIONS = "all_questions"
REVIEW_MODE_SOLUTION_REVIEW = "solution_review"
RANK_VISIBILITY_MODE_HIDDEN = "hidden"
RANK_VISIBILITY_MODE_PROVISIONAL_AFTER_SUBMIT = "provisional_after_submit"
RANK_VISIBILITY_MODE_FINAL_AFTER_EXAM_CLOSURE = "final_after_exam_closure"
PERCENTILE_VISIBILITY_MODE_HIDDEN = "hidden"
PERCENTILE_VISIBILITY_MODE_PROVISIONAL_AFTER_SUBMIT = "provisional_after_submit"
PERCENTILE_VISIBILITY_MODE_FINAL_AFTER_EXAM_CLOSURE = "final_after_exam_closure"
BENCHMARK_VISIBILITY_MODE_HIDDEN = "hidden"
BENCHMARK_VISIBILITY_MODE_PEER_AVERAGE_ONLY = "peer_average_only"
BENCHMARK_VISIBILITY_MODE_PEER_AVERAGE_PLUS_PERCENTILE = "peer_average_plus_percentile"
RANK_FREEZE_POLICY_ROLLING_UNTIL_EXAM_CLOSURE = "rolling_until_exam_closure"
RANK_FREEZE_POLICY_FREEZE_ON_EXAM_CLOSURE = "freeze_on_exam_closure"

DEFAULT_EXAM_RESULT_VISIBILITY_POLICY = {
    "rank_visibility_mode": RANK_VISIBILITY_MODE_HIDDEN,
    "percentile_visibility_mode": PERCENTILE_VISIBILITY_MODE_HIDDEN,
    "benchmark_visibility_mode": BENCHMARK_VISIBILITY_MODE_PEER_AVERAGE_ONLY,
    "rank_freeze_policy": RANK_FREEZE_POLICY_FREEZE_ON_EXAM_CLOSURE,
}
SECURITY_MODE_NORMAL = "normal"
SECURITY_MODE_FOCUS = "focus"
SECURITY_MODE_FULLSCREEN = "fullscreen"
SECURITY_MODE_VIOLATION_LIMITED = "violation_limited"
SECURITY_MODE_PROCTORED = "proctored"
EXAM_CONTENT_TYPE = "exam"

INSTITUTE_EXAM_DEFAULT_FIELDS = {
    "duration_minutes",
    "instructions",
    "allow_late_submit",
    "randomize_questions",
    "randomize_options",
    "show_result_immediately",
    "allow_review_after_submit",
    "max_attempts",
    "timer_mode",
    "navigation_mode",
    "attempt_policy",
    "result_publish_mode",
    "review_mode",
    "security_mode",
    "allow_resume",
    "allow_section_switching",
    "allow_return_to_previous_section",
}
EXAM_ACCESS_KEY_ALPHABET = string.ascii_uppercase + string.digits
EXAM_ACCESS_KEY_LENGTH = 8
STUDENT_EXAM_SOURCE_FILTERS = {"all", "platform", "institute", "teacher"}
EXAM_SOURCE_PLATFORM = "platform"
EXAM_SOURCE_INSTITUTE = "institute"
EXAM_SOURCE_TEACHER = "teacher"
QUESTION_SELECTION_MODE_STRICT = "strict"
QUESTION_SELECTION_MODE_RELAXED = "relaxed"
QUESTION_SELECTION_MODE_SUBJECT_FALLBACK = "subject_fallback"
ADVANCED_EXAM_SELECTION_MODES = {
    QUESTION_SELECTION_MODE_STRICT,
    QUESTION_SELECTION_MODE_RELAXED,
    QUESTION_SELECTION_MODE_SUBJECT_FALLBACK,
}
EXAM_EXPERIENCE_MEDIA_FLOW_CHOICES = {
    "free_reference": "Free reference media",
    "light_reference": "Light reference media",
    "guided_section_media": "Section-guided media",
    "controlled_exam_media": "Controlled exam media",
}

PRESET_PACK_REPORTING_CONTRACTS = {
    "gre_quant": {
        "family_id": "gre",
        "label": "GRE reporting contract",
        "score_reporting_mode": "total_score_first",
        "sectional_reporting_ready": False,
        "recommended_review_mode": REVIEW_MODE_ATTEMPTED_ONLY,
        "recommended_result_publish_mode": RESULT_PUBLISH_MODE_SCHEDULED,
        "recommended_rank_visibility_mode": RANK_VISIBILITY_MODE_HIDDEN,
        "recommended_percentile_visibility_mode": PERCENTILE_VISIBILITY_MODE_FINAL_AFTER_EXAM_CLOSURE,
        "recommended_benchmark_visibility_mode": BENCHMARK_VISIBILITY_MODE_PEER_AVERAGE_PLUS_PERCENTILE,
        "reporting_note": (
            "GRE currently ships with total-score-first reporting. Section-level score storytelling remains a later-phase expansion."
        ),
    },
}
EXAM_EXPERIENCE_PROFILE_BY_TYPE = {
    "practice": {
        "assessment_family": "skill_builder",
        "assessment_family_label": "Skill Builder",
        "experience_mode": "self_paced_practice",
        "experience_label": "Self-paced practice",
        "recommended_media_flow": "free_reference",
        "recommended_media_flow_label": "Free reference media",
        "recommended_timer_mode": "global",
        "recommended_navigation_mode": "free_exam",
        "section_strategy": "single_block",
        "section_strategy_label": "Single or flexible section flow",
        "delivery_emphasis": "accuracy_building",
        "supports_section_media_guidance": False,
        "learner_summary": "Best for drills, revision loops, and low-pressure concept practice.",
        "creator_summary": "Prefer flexible navigation, light timing, and optional reference media.",
    },
    "quiz": {
        "assessment_family": "checkpoint",
        "assessment_family_label": "Checkpoint",
        "experience_mode": "fast_feedback",
        "experience_label": "Fast feedback",
        "recommended_media_flow": "light_reference",
        "recommended_media_flow_label": "Light reference media",
        "recommended_timer_mode": "global",
        "recommended_navigation_mode": "free_section",
        "section_strategy": "compact_sections",
        "section_strategy_label": "Compact checkpoint sections",
        "delivery_emphasis": "speed_check",
        "supports_section_media_guidance": False,
        "learner_summary": "Short checks designed to confirm recall quickly.",
        "creator_summary": "Keep the flow tight, use shorter sections, and avoid heavy media dependence.",
    },
    "test": {
        "assessment_family": "benchmark",
        "assessment_family_label": "Benchmark",
        "experience_mode": "balanced_assessment",
        "experience_label": "Balanced assessment",
        "recommended_media_flow": "guided_section_media",
        "recommended_media_flow_label": "Section-guided media",
        "recommended_timer_mode": "hybrid",
        "recommended_navigation_mode": "hybrid",
        "section_strategy": "structured_sections",
        "section_strategy_label": "Structured section flow",
        "delivery_emphasis": "coverage_balance",
        "supports_section_media_guidance": True,
        "learner_summary": "Balanced testing flow with enough structure for unit tests and term assessments.",
        "creator_summary": "Use sections to separate topics or skills and introduce media only where needed.",
    },
    "assessment": {
        "assessment_family": "benchmark",
        "assessment_family_label": "Benchmark",
        "experience_mode": "balanced_assessment",
        "experience_label": "Balanced assessment",
        "recommended_media_flow": "guided_section_media",
        "recommended_media_flow_label": "Section-guided media",
        "recommended_timer_mode": "hybrid",
        "recommended_navigation_mode": "hybrid",
        "section_strategy": "structured_sections",
        "section_strategy_label": "Structured section flow",
        "delivery_emphasis": "coverage_balance",
        "supports_section_media_guidance": True,
        "learner_summary": "Designed for broader syllabus checks with clearer section boundaries.",
        "creator_summary": "Blend objective and constructed-response blocks with explicit section instructions.",
    },
    "mock_exam": {
        "assessment_family": "exam_simulation",
        "assessment_family_label": "Exam Simulation",
        "experience_mode": "high_stakes_simulation",
        "experience_label": "High-stakes simulation",
        "recommended_media_flow": "controlled_exam_media",
        "recommended_media_flow_label": "Controlled exam media",
        "recommended_timer_mode": "section",
        "recommended_navigation_mode": "sequential",
        "section_strategy": "timed_sections",
        "section_strategy_label": "Timed sequential sections",
        "delivery_emphasis": "exam_readiness",
        "supports_section_media_guidance": True,
        "learner_summary": "Mirrors an exam-day sequence with stricter pacing and controlled transitions.",
        "creator_summary": "Use sequential sections, stronger timing discipline, and section-specific prompt guidance.",
    },
    "final_exam": {
        "assessment_family": "exam_simulation",
        "assessment_family_label": "Exam Simulation",
        "experience_mode": "formal_evaluation",
        "experience_label": "Formal evaluation",
        "recommended_media_flow": "controlled_exam_media",
        "recommended_media_flow_label": "Controlled exam media",
        "recommended_timer_mode": "section",
        "recommended_navigation_mode": "sequential",
        "section_strategy": "timed_sections",
        "section_strategy_label": "Timed sequential sections",
        "delivery_emphasis": "formal_grading",
        "supports_section_media_guidance": True,
        "learner_summary": "Formal evaluation flow intended for final scoring and stronger policy controls.",
        "creator_summary": "Prefer clear section contracts, locked pacing, and explicit instructions per skill block.",
    },
}

ASSESSMENT_FAMILY_EXPERIENCE_DEFAULTS = {
    "school": {
        "recommended_media_flow": "guided_section_media",
        "recommended_media_flow_label": "Section-guided media",
        "recommended_timer_mode": "hybrid",
        "recommended_navigation_mode": "hybrid",
        "section_strategy": "structured_sections",
        "section_strategy_label": "Structured section flow",
        "delivery_emphasis": "coverage_balance",
        "supports_section_media_guidance": True,
    },
    "competitive": {
        "recommended_media_flow": "controlled_exam_media",
        "recommended_media_flow_label": "Controlled exam media",
        "recommended_timer_mode": "section",
        "recommended_navigation_mode": "sequential",
        "section_strategy": "timed_sections",
        "section_strategy_label": "Timed sequential sections",
        "delivery_emphasis": "exam_readiness",
        "supports_section_media_guidance": True,
    },
    "certification": {
        "recommended_media_flow": "guided_section_media",
        "recommended_media_flow_label": "Section-guided media",
        "recommended_timer_mode": "hybrid",
        "recommended_navigation_mode": "free_section",
        "section_strategy": "structured_sections",
        "section_strategy_label": "Structured section flow",
        "delivery_emphasis": "domain_mastery",
        "supports_section_media_guidance": True,
    },
    "language_proficiency": {
        "recommended_media_flow": "controlled_exam_media",
        "recommended_media_flow_label": "Controlled exam media",
        "recommended_timer_mode": "section",
        "recommended_navigation_mode": "sequential",
        "section_strategy": "skill_block_sections",
        "section_strategy_label": "Skill-block section flow",
        "delivery_emphasis": "skill_band_progression",
        "supports_section_media_guidance": True,
    },
}


def resolve_program_assessment_family_profile(program):
    assessment_family = getattr(program, "assessment_family", None)
    if assessment_family is None:
        return None

    delivery_defaults = (
        assessment_family.delivery_defaults
        if isinstance(getattr(assessment_family, "delivery_defaults", {}), dict)
        else {}
    )
    analytics_preset = (
        assessment_family.analytics_preset
        if isinstance(getattr(assessment_family, "analytics_preset", {}), dict)
        else {}
    )
    authoring_hints = (
        assessment_family.authoring_hints
        if isinstance(getattr(assessment_family, "authoring_hints", {}), dict)
        else {}
    )
    baseline_delivery = ASSESSMENT_FAMILY_EXPERIENCE_DEFAULTS.get(
        assessment_family.code,
        {},
    )
    contract = merge_assessment_family_contract(
        family_code=assessment_family.code,
        allowed_question_types=getattr(assessment_family, "allowed_question_types", []),
        scoring_defaults=getattr(assessment_family, "scoring_defaults", {}),
    )

    return {
        "code": assessment_family.code,
        "label": assessment_family.label,
        "allowed_question_types": contract.get("allowed_question_types", []),
        "scoring_defaults": contract.get("scoring_defaults", {}),
        "delivery_defaults": {
            **baseline_delivery,
            **{
                key: value
                for key, value in delivery_defaults.items()
                if value not in (None, "")
            },
        },
        "analytics_preset": analytics_preset,
        "authoring_hints": authoring_hints,
    }


def validate_exam_scope(exam):
    if exam.academic_year.institute_id != exam.institute_id:
        raise ValidationError({"academic_year": "Academic year must belong to the same institute."})
    if exam.program.institute_id != exam.institute_id:
        raise ValidationError({"program": "Program must belong to the same institute."})

    if exam.cohort_id:
        if exam.cohort.institute_id != exam.institute_id:
            raise ValidationError({"cohort": "Cohort must belong to the same institute."})
        if exam.cohort.program_id != exam.program_id:
            raise ValidationError({"cohort": "Cohort must match the selected program."})
        if exam.cohort.academic_year_id != exam.academic_year_id:
            raise ValidationError({"cohort": "Cohort must match the selected academic year."})

    if exam.subject_id:
        if exam.subject.institute_id != exam.institute_id:
            raise ValidationError({"subject": "Subject must belong to the same institute."})
        if exam.subject.program_id and exam.subject.program_id != exam.program_id:
            raise ValidationError({"subject": "Subject program must match the selected program."})


def calculate_exam_total_marks(exam_questions):
    total = Decimal("0.00")
    for exam_question in exam_questions:
        if exam_question.is_active:
            total += exam_question.marks or Decimal("0.00")
    return total


def allows_unlimited_attempts(exam):
    return exam.attempt_policy == ATTEMPT_POLICY_UNLIMITED_PRACTICE


def remaining_attempts_for_student(exam, attempts_used):
    if allows_unlimited_attempts(exam):
        return 999
    return max(exam.max_attempts - attempts_used, 0)


def is_exam_assigned_to_student(exam, student):
    if exam.assignment_mode != ASSIGNMENT_MODE_SELECTED_STUDENTS:
        return True

    prefetched_assignments = getattr(exam, "_prefetched_student_assignments", None)
    if prefetched_assignments is not None:
        return any(
            assignment.is_active and assignment.student_id == student.id
            for assignment in prefetched_assignments
        )

    return exam.student_assignments.filter(student=student, is_active=True).exists()


def resolve_exam_source_metadata(exam):
    source_type = str(getattr(exam, "source_type", "") or "").strip() or "institute"
    source_teacher = getattr(exam, "source_teacher", None)

    if source_type == "platform":
        return {
            "source_type": "platform",
            "source_label": "Platform",
            "source_name": "Platform",
            "teacher_id": None,
            "teacher_name": None,
        }

    if source_type == "teacher":
        teacher_name = getattr(source_teacher, "full_name", "") if source_teacher is not None else ""
        return {
            "source_type": "teacher",
            "source_label": "Teacher",
            "source_name": teacher_name or "Teacher",
            "teacher_id": str(source_teacher.id) if source_teacher is not None else None,
            "teacher_name": teacher_name or None,
        }

    institute = getattr(exam, "institute", None)
    return {
        "source_type": "institute",
        "source_label": "Institute",
        "source_name": getattr(institute, "name", "") or "Institute",
        "teacher_id": None,
        "teacher_name": None,
    }


def filter_student_visible_exams_by_source(exams, *, source="all", teacher_id=None):
    normalized_source = str(source or "all").strip().lower() or "all"
    normalized_teacher_id = str(teacher_id or "").strip() or None

    if normalized_source not in STUDENT_EXAM_SOURCE_FILTERS:
        return list(exams)

    if normalized_source == "all":
        return list(exams)

    filtered = [
        exam
        for exam in exams
        if resolve_exam_source_metadata(exam)["source_type"] == normalized_source
    ]

    if normalized_source != "teacher" or normalized_teacher_id is None:
        return filtered

    return [
        exam
        for exam in filtered
        if resolve_exam_source_metadata(exam)["teacher_id"] == normalized_teacher_id
    ]


def allowed_exam_sources_for_profile(profile):
    if profile is None or not getattr(profile, "is_active", False):
        return set()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return {EXAM_SOURCE_PLATFORM, EXAM_SOURCE_INSTITUTE}

    if profile.role == AccountRole.INSTITUTE_ADMIN:
        return {EXAM_SOURCE_INSTITUTE}

    if profile.role == AccountRole.TEACHER:
        return {EXAM_SOURCE_INSTITUTE, EXAM_SOURCE_TEACHER}

    return set()


def default_exam_source_for_profile(profile):
    allowed_sources = allowed_exam_sources_for_profile(profile)

    if EXAM_SOURCE_TEACHER in allowed_sources and profile.role == AccountRole.TEACHER:
        return EXAM_SOURCE_TEACHER
    if EXAM_SOURCE_INSTITUTE in allowed_sources and profile.role == AccountRole.INSTITUTE_ADMIN:
        return EXAM_SOURCE_INSTITUTE
    if EXAM_SOURCE_PLATFORM in allowed_sources and profile.role == AccountRole.PLATFORM_ADMIN:
        return EXAM_SOURCE_PLATFORM
    if EXAM_SOURCE_INSTITUTE in allowed_sources:
        return EXAM_SOURCE_INSTITUTE

    return None


def resolve_exam_experience_profile_from_values(
    *,
    exam_type,
    delivery_mode,
    timer_mode,
    navigation_mode,
    program_assessment_family=None,
    overrides=None,
):
    normalized_exam_type = str(exam_type or "").strip().lower() or "test"
    defaults = EXAM_EXPERIENCE_PROFILE_BY_TYPE.get(
        normalized_exam_type,
        EXAM_EXPERIENCE_PROFILE_BY_TYPE["test"],
    )
    family_profile = program_assessment_family if isinstance(program_assessment_family, dict) else None
    family_delivery_defaults = (
        family_profile.get("delivery_defaults", {})
        if family_profile is not None and isinstance(family_profile.get("delivery_defaults", {}), dict)
        else {}
    )
    normalized_overrides = overrides if isinstance(overrides, dict) else {}
    profile = {
        **defaults,
        **{
            key: value
            for key, value in family_delivery_defaults.items()
            if value not in (None, "")
        },
        **{
            key: value
            for key, value in normalized_overrides.items()
            if value not in (None, "")
        },
        "exam_type": normalized_exam_type,
        "delivery_mode": str(delivery_mode or ""),
        "actual_timer_mode": str(timer_mode or ""),
        "actual_navigation_mode": str(navigation_mode or ""),
    }
    if family_profile is not None:
        profile["assessment_family"] = family_profile["code"]
        profile["assessment_family_label"] = family_profile["label"]
        profile["analytics_preset"] = family_profile.get("analytics_preset", {})
        profile["authoring_hints"] = family_profile.get("authoring_hints", {})
        if family_profile["code"] == "language_proficiency":
            if "learner_summary" not in normalized_overrides:
                profile["learner_summary"] = (
                    "Structured language simulation with timed skill blocks, controlled prompt media, "
                    "and rubric-guided written responses where configured."
                )
            if "creator_summary" not in normalized_overrides:
                profile["creator_summary"] = (
                    "Use reading, listening, writing, and integrated skill blocks with clear prompt guidance, "
                    "and only promise speaking or audio-capture workflows when they are explicitly configured."
                )
    profile["runtime_alignment"] = (
        profile["actual_timer_mode"] == profile["recommended_timer_mode"]
        and profile["actual_navigation_mode"] == profile["recommended_navigation_mode"]
    )
    return profile


def resolve_exam_experience_profile(exam):
    metadata = getattr(exam, "metadata", {}) if isinstance(getattr(exam, "metadata", {}), dict) else {}
    overrides = metadata.get("experience_profile", {})
    program_family = resolve_program_assessment_family_profile(getattr(exam, "program", None))
    return resolve_exam_experience_profile_from_values(
        exam_type=getattr(exam, "exam_type", ""),
        delivery_mode=getattr(exam, "delivery_mode", ""),
        timer_mode=getattr(exam, "timer_mode", ""),
        navigation_mode=getattr(exam, "navigation_mode", ""),
        program_assessment_family=program_family,
        overrides=overrides,
    )


def build_exam_content_target(exam):
    return {
        "content_type": EXAM_CONTENT_TYPE,
        "content_key": str(exam.id),
        "subject": getattr(exam, "subject", None),
    }


def resolve_exam_economy_access(student, exam, *, granted_by=None):
    from apps.economy.models import AccessPolicyType, UnlockStateStatus
    from apps.economy.services import (
        evaluate_and_sync_unlock_state,
        resolve_content_access_policy,
    )

    target = build_exam_content_target(exam)
    access_policy = resolve_content_access_policy(
        student=student,
        content_type=target["content_type"],
        content_key=target["content_key"],
        subject=target["subject"],
    )

    unlock_state = None
    if access_policy is not None:
        unlock_state = evaluate_and_sync_unlock_state(
            student=student,
            content_type=target["content_type"],
            content_key=target["content_key"],
            subject=target["subject"],
            granted_by=granted_by,
        )

    requires_unlock = bool(
        access_policy is not None and access_policy.policy_type != AccessPolicyType.FREE
    )
    is_unlocked = not requires_unlock or (
        unlock_state is not None and unlock_state.status == UnlockStateStatus.UNLOCKED
    )
    can_unlock_with_stars = bool(
        access_policy is not None
        and access_policy.policy_type
        in {AccessPolicyType.STARS_ONLY, AccessPolicyType.STARS_OR_ENTITLEMENT}
        and int(access_policy.star_cost or 0) > 0
        and not is_unlocked
    )

    return {
        "content_type": target["content_type"],
        "content_key": target["content_key"],
        "subject_id": str(target["subject"].id) if target["subject"] is not None else None,
        "content_label": (
            access_policy.content_label
            if access_policy is not None and access_policy.content_label
            else exam.title
        ),
        "policy_type": access_policy.policy_type if access_policy is not None else None,
        "star_cost": int(access_policy.star_cost or 0) if access_policy is not None else 0,
        "requires_unlock": requires_unlock,
        "can_unlock_with_stars": can_unlock_with_stars,
        "is_unlocked": is_unlocked,
        "is_locked": requires_unlock and not is_unlocked,
        "lock_reason_code": getattr(unlock_state, "lock_reason_code", ""),
        "lock_reason_message": getattr(unlock_state, "lock_reason_message", ""),
        "unlock_state_status": getattr(unlock_state, "status", ""),
    }


def get_exam_access_policy(exam):
    from apps.economy.models import ContentAccessPolicy

    target = build_exam_content_target(exam)
    base_queryset = ContentAccessPolicy.objects.filter(
        institute=exam.institute,
        content_type=target["content_type"],
        content_key=target["content_key"],
        is_active=True,
    ).order_by("priority", "created_at")

    if target["subject"] is not None:
        subject_policy = base_queryset.filter(subject=target["subject"]).first()
        if subject_policy is not None:
            return subject_policy

    return base_queryset.filter(subject__isnull=True).first()


@transaction.atomic
def sync_exam_access_policy(
    exam,
    *,
    policy_type="",
    star_cost=0,
    entitlement_code="",
    priority=100,
):
    from apps.economy.models import ContentAccessPolicy

    target = build_exam_content_target(exam)
    queryset = ContentAccessPolicy.objects.filter(
        institute=exam.institute,
        content_type=target["content_type"],
        content_key=target["content_key"],
    )

    if target["subject"] is not None:
        queryset = queryset.filter(subject=target["subject"])
    else:
        queryset = queryset.filter(subject__isnull=True)

    queryset.update(is_active=False, updated_at=timezone.now())

    normalized_policy_type = (policy_type or "").strip()
    if not normalized_policy_type:
        return None

    policy = ContentAccessPolicy(
        institute=exam.institute,
        subject=target["subject"],
        content_type=target["content_type"],
        content_key=target["content_key"],
        content_label=exam.title,
        policy_type=normalized_policy_type,
        star_cost=star_cost,
        entitlement_code=(entitlement_code or "").strip(),
        priority=priority,
        is_active=True,
    )
    policy.save()
    return policy


@transaction.atomic
def sync_exam_unlock_rule(
    exam,
    *,
    rule_type="",
    required_star_balance=None,
    required_entitlement_code="",
    required_completion_count=None,
    required_score_percentage=None,
    admin_override_allowed=True,
    priority=100,
):
    from apps.economy.models import UnlockRule

    target = build_exam_content_target(exam)
    queryset = UnlockRule.objects.filter(
        institute=exam.institute,
        content_type=target["content_type"],
        content_key=target["content_key"],
    )

    if target["subject"] is not None:
        queryset = queryset.filter(subject=target["subject"])
    else:
        queryset = queryset.filter(subject__isnull=True)

    queryset.update(is_active=False, updated_at=timezone.now())

    normalized_rule_type = (rule_type or "").strip()
    if not normalized_rule_type:
        return None

    rule = UnlockRule(
        institute=exam.institute,
        subject=target["subject"],
        content_type=target["content_type"],
        content_key=target["content_key"],
        content_label=exam.title,
        rule_type=normalized_rule_type,
        required_star_balance=required_star_balance,
        required_entitlement_code=(required_entitlement_code or "").strip(),
        required_completion_count=required_completion_count,
        required_score_percentage=required_score_percentage,
        admin_override_allowed=admin_override_allowed,
        priority=priority,
        is_active=True,
    )
    rule.save()
    return rule


def _end_of_academic_day(value):
    naive = datetime.combine(value, time(23, 59, 59))
    current_timezone = timezone.get_current_timezone()
    if timezone.is_naive(naive):
        return timezone.make_aware(naive, current_timezone)
    return naive.astimezone(current_timezone)


def _normalize_decimal(value, fallback):
    if value in {None, ""}:
        return Decimal(str(fallback))
    return Decimal(str(value))


def _normalize_difficulty_mix(mix):
    normalized = {
        "foundation": int(mix.get("foundation", 0) or 0),
        "intermediate": int(mix.get("intermediate", 0) or 0),
        "advanced": int(mix.get("advanced", 0) or 0),
    }
    total = sum(normalized.values())
    if total != 100:
        raise ValidationError({"difficulty_mix": "Difficulty mix must add up to 100."})
    return normalized


def _allocate_counts(total, weights):
    if total <= 0:
        return {key: 0 for key in weights}

    raw_values = {}
    allocated = {}
    remainder_rows = []
    running_total = 0
    for key, weight in weights.items():
        exact = total * (Decimal(str(weight)) / Decimal("100"))
        floor_value = int(exact)
        raw_values[key] = exact
        allocated[key] = floor_value
        running_total += floor_value
        remainder_rows.append((exact - floor_value, key))

    remainder_rows.sort(key=lambda row: (-row[0], row[1]))
    for _, key in remainder_rows[: total - running_total]:
        allocated[key] += 1

    return allocated


def _resolve_advanced_exam_scope(actor, scope_payload, exam_payload):
    from apps.academics.models import AcademicYear, Cohort, Program, Subject
    from apps.accounts.scopes import get_account_profile
    from apps.institutes.models import Institute
    from apps.teachers.models import TeacherAssignment, TeacherProfile

    profile = get_account_profile(actor)
    if profile is None or not profile.is_active:
        raise ValidationError({"scope": "An active account profile is required to build exams."})

    institute_code = str(scope_payload.get("institute_code") or "").strip()
    institute = None
    if institute_code:
        institute = Institute.objects.filter(
            code=institute_code,
            is_active=True,
        ).first()
        if institute is None:
            raise ValidationError({"scope": "Institute not found."})
    elif profile.institute_id:
        institute = Institute.objects.filter(
            id=profile.institute_id,
            is_active=True,
        ).first()
        if institute is None:
            raise ValidationError({"scope": "Your institute is not active."})
    else:
        raise ValidationError({"scope": "Institute scope is required to build this exam."})

    if profile.role != AccountRole.PLATFORM_ADMIN and profile.institute_id != institute.id:
        raise ValidationError({"scope": "You can only build exams inside your own institute."})

    academic_year = AcademicYear.objects.filter(
        institute=institute,
        name=scope_payload["academic_year_name"],
        is_active=True,
    ).first()
    if academic_year is None:
        raise ValidationError({"scope": "Academic year not found in the selected institute."})

    program = Program.objects.filter(
        institute=institute,
        code=scope_payload["program_code"],
        is_active=True,
    ).first()
    if program is None:
        raise ValidationError({"scope": "Program not found in the selected institute."})

    subject = None
    subject_code = str(scope_payload.get("subject_code") or "").strip()
    if subject_code:
        subject = Subject.objects.filter(
            institute=institute,
            code=subject_code,
            is_active=True,
        ).first()
        if subject is None:
            raise ValidationError({"scope": "Subject not found in the selected institute."})
        if subject.program_id and subject.program_id != program.id:
            raise ValidationError({"scope": "Subject must belong to the selected program."})

    cohort = None
    cohort_code = (scope_payload.get("cohort_code") or "").strip()
    if cohort_code:
        cohort = Cohort.objects.filter(
            institute=institute,
            code=cohort_code,
            is_active=True,
        ).first()
        if cohort is None:
            raise ValidationError({"scope": "Cohort not found in the selected institute."})
        if cohort.program_id != program.id:
            raise ValidationError({"scope": "Cohort must belong to the selected program."})
        if cohort.academic_year_id != academic_year.id:
            raise ValidationError({"scope": "Cohort must belong to the selected academic year."})

    source_type = exam_payload.get("source_type")
    if not source_type:
        raise ValidationError({"exam": "Exam source type could not be resolved for this account."})
    source_teacher = None
    if source_type == EXAM_SOURCE_TEACHER:
        if profile.role != AccountRole.TEACHER:
            raise ValidationError({"exam": "Only teacher accounts can create teacher-source advanced exams."})
        source_teacher = getattr(profile, "teacher_profile", None)
        if source_teacher is None:
            raise ValidationError({"exam": "Teacher source exams require a linked teacher profile."})
        supplied_employee_code = (scope_payload.get("source_teacher_employee_code") or "").strip()
        if supplied_employee_code and supplied_employee_code != source_teacher.employee_code:
            source_teacher = TeacherProfile.objects.filter(
                institute=institute,
                employee_code=supplied_employee_code,
                is_active=True,
            ).first()
            if source_teacher is None:
                raise ValidationError({"scope": "Teacher not found in the selected institute."})
            if profile.role != AccountRole.PLATFORM_ADMIN:
                raise ValidationError({"scope": "You cannot build a teacher-source exam for another teacher."})
    elif (scope_payload.get("source_teacher_employee_code") or "").strip():
        source_teacher = TeacherProfile.objects.filter(
            institute=institute,
            employee_code=scope_payload["source_teacher_employee_code"],
            is_active=True,
        ).first()
        if source_teacher is None:
            raise ValidationError({"scope": "Teacher not found in the selected institute."})

    if profile.role == AccountRole.TEACHER and subject is not None:
        teacher_profile = getattr(profile, "teacher_profile", None)
        assignment_queryset = TeacherAssignment.objects.filter(
            institute=institute,
            teacher=teacher_profile,
            academic_year=academic_year,
            program=program,
            subject=subject,
            is_active=True,
        )
        if cohort is not None:
            assignment_exists = assignment_queryset.filter(cohort__in=[cohort]).exists() or assignment_queryset.filter(
                cohort__isnull=True
            ).exists()
        else:
            assignment_exists = assignment_queryset.exists()
        if not assignment_exists:
            scope_label = (
                f"{academic_year.name} / {program.code} / {subject.code}"
                + (f" / {cohort.code}" if cohort is not None else " / all cohorts")
            )
            raise ValidationError(
                {
                    "scope": (
                        f"You are not assigned to {scope_label}. "
                        "Choose a year, program, subject, and cohort that match one of your active teacher assignments, "
                        "or ask your institute admin to add this assignment before creating the exam."
                    )
                }
            )

    return {
        "profile": profile,
        "institute": institute,
        "academic_year": academic_year,
        "program": program,
        "cohort": cohort,
        "subject": subject,
        "source_teacher": source_teacher,
    }


def _ensure_teacher_assignment_for_subject(*, scope, subject):
    from apps.teachers.models import TeacherAssignment

    profile = scope["profile"]
    if profile.role != AccountRole.TEACHER:
        return

    teacher_profile = getattr(profile, "teacher_profile", None)
    assignment_queryset = TeacherAssignment.objects.filter(
        institute=scope["institute"],
        teacher=teacher_profile,
        academic_year=scope["academic_year"],
        program=scope["program"],
        subject=subject,
        is_active=True,
    )
    cohort = scope["cohort"]
    if cohort is not None:
        assignment_exists = assignment_queryset.filter(cohort__in=[cohort]).exists() or assignment_queryset.filter(
            cohort__isnull=True
        ).exists()
    else:
        assignment_exists = assignment_queryset.exists()
    if assignment_exists:
        return

    scope_label = (
        f"{scope['academic_year'].name} / {scope['program'].code} / {subject.code}"
        + (f" / {cohort.code}" if cohort is not None else " / all cohorts")
    )
    raise ValidationError(
        {
            "scope": (
                f"You are not assigned to {scope_label}. "
                "Choose section subjects that match one of your active teacher assignments, "
                "or ask your institute admin to add this assignment before creating the exam."
            )
        }
    )


def _resolve_section_subjects(*, scope, sections):
    from apps.academics.models import Subject

    resolved_codes = []
    for section in sections:
        subject_code = str(section.get("subject_code") or "").strip()
        if not subject_code and scope.get("subject") is not None:
            subject_code = scope["subject"].code
            section["subject_code"] = subject_code
        if not subject_code:
            raise ValidationError(
                {
                    "composition": (
                        f"{section.get('name', 'Section')}: subject code is required for each section "
                        "when no exam-scope subject is supplied."
                    )
                }
            )
        resolved_codes.append(subject_code)

    subject_map = {
        subject.code: subject
        for subject in Subject.objects.filter(
            institute=scope["institute"],
            code__in=set(resolved_codes),
            is_active=True,
        )
    }
    missing_codes = sorted(set(resolved_codes) - set(subject_map.keys()))
    if missing_codes:
        raise ValidationError({"composition": f"Unknown subject code(s): {', '.join(missing_codes)}"})

    for subject in subject_map.values():
        if subject.program_id and subject.program_id != scope["program"].id:
            raise ValidationError(
                {"composition": f"Subject {subject.code} must belong to the selected program."}
            )
        _ensure_teacher_assignment_for_subject(scope=scope, subject=subject)

    return {
        int(section["order"]): subject_map[str(section.get("subject_code") or "").strip()]
        for section in sections
    }


def _resolve_exam_schedule(academic_year, exam_payload):
    start_at = exam_payload.get("start_at")
    end_at = exam_payload.get("end_at")
    academic_year_end_at = _end_of_academic_day(academic_year.end_date)

    if end_at is None:
        end_at = academic_year_end_at
    elif end_at > academic_year_end_at:
        raise ValidationError(
            {"exam": "Exam end date cannot go beyond the academic year end date."}
        )

    if start_at and end_at and end_at <= start_at:
        raise ValidationError({"exam": "Exam end time must be after the start time."})

    return start_at, end_at, academic_year_end_at


def _build_question_buckets(*, institute, program, subject, topic_ids):
    from apps.question_bank.models import Question
    from apps.question_bank.services import institute_has_question_authoring_access

    queryset = Question.objects.filter(
        institute=institute,
        is_active=True,
        topic_id__in=topic_ids,
    ).select_related(
        "master_question",
    ).annotate(
        usage_count=Count("student_answers", filter=Q(student_answers__is_active=True), distinct=True),
        correct_count=Count(
            "student_answers",
            filter=Q(
                student_answers__is_active=True,
                student_answers__selected_option__isnull=False,
                student_answers__is_correct=True,
            ),
            distinct=True,
        ),
        wrong_count=Count(
            "student_answers",
            filter=Q(
                student_answers__is_active=True,
                student_answers__selected_option__isnull=False,
                student_answers__is_correct=False,
            ),
            distinct=True,
        ),
        skipped_count=Count(
            "student_answers",
            filter=Q(student_answers__is_active=True, student_answers__selected_option__isnull=True),
            distinct=True,
        ),
    ).order_by("created_at", "id")

    if program is not None:
        queryset = queryset.filter(program=program)
    if subject is not None:
        queryset = queryset.filter(subject=subject)

    def attempt_rate(question, count):
        usage = int(getattr(question, "usage_count", 0) or 0)
        if usage <= 0:
            return 0.0
        return round((int(count or 0) / usage) * 100, 2)

    def quality_signal(question):
        usage_count = int(getattr(question, "usage_count", 0) or 0)
        wrong_rate = attempt_rate(question, getattr(question, "wrong_count", 0) or 0)
        skip_rate = attempt_rate(question, getattr(question, "skipped_count", 0) or 0)
        if usage_count < 3:
            return "emerging", "watch"
        if wrong_rate >= 60 and skip_rate >= 20:
            return "ambiguous", "urgent"
        if wrong_rate >= 70:
            return "revision_candidate", "high"
        if skip_rate >= 45:
            return "skip_risk", "high"
        if wrong_rate >= 45:
            return "hard", "medium"
        if wrong_rate >= 30 or skip_rate >= 25:
            return "watch", "watch"
        return "healthy", "none"

    quality_weight = {
        "healthy": 0,
        "watch": 1,
        "emerging": 2,
        "hard": 3,
        "skip_risk": 4,
        "revision_candidate": 5,
        "ambiguous": 6,
    }
    revision_weight = {
        "none": 0,
        "watch": 1,
        "medium": 2,
        "high": 3,
        "urgent": 4,
    }

    by_topic = {}
    for question in queryset:
        if not institute_has_question_authoring_access(institute, question=question):
            continue
        signal, priority = quality_signal(question)
        question.preview_quality_signal = signal
        question.preview_revision_priority = priority
        topic_bucket = by_topic.setdefault(question.topic_id, {})
        difficulty_bucket = topic_bucket.setdefault(question.difficulty_level, [])
        difficulty_bucket.append(question)

    for topic_bucket in by_topic.values():
        for difficulty_key, difficulty_bucket in topic_bucket.items():
            difficulty_bucket.sort(
                key=lambda question: (
                    quality_weight.get(getattr(question, "preview_quality_signal", "healthy"), 0),
                    revision_weight.get(getattr(question, "preview_revision_priority", "none"), 0),
                    0 if question.is_verified else 1,
                    0 if bool((question.explanation or "").strip()) else 1,
                    question.created_at,
                    question.id,
                )
            )

    return by_topic


def _summarize_question_quality(questions):
    summary = {
        "healthy": 0,
        "watch": 0,
        "hard": 0,
        "skip_risk": 0,
        "ambiguous": 0,
        "revision_candidate": 0,
        "emerging": 0,
        "high_priority": 0,
    }
    for question in questions:
        signal = getattr(question, "preview_quality_signal", "emerging")
        summary[signal] = summary.get(signal, 0) + 1
        if getattr(question, "preview_revision_priority", "watch") in {"urgent", "high"}:
            summary["high_priority"] += 1
    return summary


def _pick_questions_from_pool(
    *,
    section_name,
    topic,
    requested_count,
    difficulty_targets,
    question_buckets,
    used_question_ids,
    selection_mode,
):
    available_for_topic = question_buckets.get(topic.id, {})
    chosen = []
    fallback_messages = []
    shortage_messages = []
    topic_selection = {
        "topic_code": topic.code,
        "topic_name": topic.name,
        "requested": requested_count,
        "resolved": 0,
        "difficulty_breakup": {},
        "quality_breakup": {},
    }

    def consume_exact(difficulty_key, count_needed):
        bucket = available_for_topic.get(difficulty_key, [])
        picked = []
        for question in bucket:
            if question.id in used_question_ids:
                continue
            picked.append(question)
            if len(picked) == count_needed:
                break
        return picked

    difficulty_order = ("foundation", "intermediate", "advanced")
    for difficulty_key in difficulty_order:
        target_count = difficulty_targets.get(difficulty_key, 0)
        if target_count <= 0:
            topic_selection["difficulty_breakup"][difficulty_key] = 0
            continue
        exact_matches = consume_exact(difficulty_key, target_count)
        chosen.extend(exact_matches)
        topic_selection["difficulty_breakup"][difficulty_key] = len(exact_matches)
        remaining = target_count - len(exact_matches)
        if remaining <= 0:
            continue
        if selection_mode == QUESTION_SELECTION_MODE_STRICT:
            shortage_messages.append(
                f"{section_name}: {topic.name} is short by {remaining} {difficulty_key} questions."
            )
            continue
        fallback_difficulties = [key for key in difficulty_order if key != difficulty_key]
        for fallback_key in fallback_difficulties:
            fallback_matches = consume_exact(fallback_key, remaining)
            if fallback_matches:
                chosen.extend(fallback_matches)
                topic_selection["difficulty_breakup"][fallback_key] = (
                    topic_selection["difficulty_breakup"].get(fallback_key, 0) + len(fallback_matches)
                )
                fallback_messages.append(
                    f"{section_name}: {topic.name} used {len(fallback_matches)} {fallback_key} question(s) "
                    f"to cover the {difficulty_key} target."
                )
                remaining -= len(fallback_matches)
            if remaining <= 0:
                break
        if remaining > 0:
            shortage_messages.append(
                f"{section_name}: {topic.name} is short by {remaining} questions after same-topic fallback."
            )

    unique_chosen = []
    for question in chosen:
        if question.id in used_question_ids:
            continue
        used_question_ids.add(question.id)
        unique_chosen.append(question)

    topic_selection["resolved"] = len(unique_chosen)
    topic_selection["quality_breakup"] = _summarize_question_quality(unique_chosen)
    return unique_chosen, topic_selection, fallback_messages, shortage_messages


def _resolve_section_blueprint(
    *,
    section_payload,
    section_subject,
    topic_map,
    question_buckets,
    used_question_ids,
    selection_mode,
    program_assessment_family=None,
):
    difficulty_mix = _normalize_difficulty_mix(section_payload["difficulty_mix"])
    requested_total = int(section_payload["question_count"])
    resolved_topic_rows = []
    section_questions = []
    blockers = []
    warnings = []
    topic_fallbacks = []
    topic_shortages = []
    scoring_defaults = (
        program_assessment_family.get("scoring_defaults", {})
        if isinstance(program_assessment_family, dict)
        else {}
    )
    negative_marking_scope = str(scoring_defaults.get("negative_marking_scope", "") or "").strip()
    negative_marking_default = bool(scoring_defaults.get("negative_marking_default"))
    section_marks = section_payload.get("marks_per_question")
    section_negative_marks = section_payload.get("negative_marks_per_question")

    if (
        section_marks is not None
        and section_negative_marks is not None
        and Decimal(str(section_negative_marks)) >= Decimal(str(section_marks))
    ):
        raise ValidationError(
            {
                "composition": (
                    f"{section_payload['name']}: negative marks per question must stay lower than "
                    "marks per question."
                )
            }
        )
    if (
        negative_marking_scope == "disabled"
        and section_negative_marks is not None
        and Decimal(str(section_negative_marks)) > Decimal("0.00")
    ):
        raise ValidationError(
            {
                "composition": (
                    f"{section_payload['name']}: the {program_assessment_family.get('label', 'selected')} "
                    "family does not allow section-level negative marking."
                )
            }
        )
    if (
        negative_marking_default
        and section_negative_marks is not None
        and Decimal(str(section_negative_marks)) <= Decimal("0.00")
    ):
        warnings.append(
            f"{section_payload['name']}: the {program_assessment_family.get('label', 'selected')} family usually expects negative marking, but this section is configured with no penalty."
        )

    for topic_row in section_payload["topics"]:
        topic = topic_map.get((section_subject.id, topic_row["topic_code"]))
        if topic is None:
            raise ValidationError(
                {"composition": f"Topic {topic_row['topic_code']} does not belong to section subject {section_subject.code}."}
            )
        topic_count = int(topic_row["count"])
        difficulty_targets = _allocate_counts(topic_count, difficulty_mix)
        chosen, selection_summary, fallback_messages, shortage_messages = _pick_questions_from_pool(
            section_name=section_payload["name"],
            topic=topic,
            requested_count=topic_count,
            difficulty_targets=difficulty_targets,
            question_buckets=question_buckets,
            used_question_ids=used_question_ids,
            selection_mode=selection_mode,
        )
        section_questions.extend(chosen)
        resolved_topic_rows.append(selection_summary)
        topic_fallbacks.extend(fallback_messages)
        topic_shortages.extend(shortage_messages)

    if topic_shortages and selection_mode == QUESTION_SELECTION_MODE_STRICT:
        raise ValidationError({"composition": topic_shortages})

    resolved_total = len(section_questions)
    if resolved_total != requested_total:
        if selection_mode == QUESTION_SELECTION_MODE_SUBJECT_FALLBACK:
            shortage = requested_total - resolved_total
            if shortage > 0:
                fallback_pool = []
                for buckets in question_buckets.values():
                    for bucket in buckets.values():
                        for question in bucket:
                            if question.id not in used_question_ids:
                                fallback_pool.append(question)
                fallback_pool = fallback_pool[:shortage]
                for question in fallback_pool:
                    used_question_ids.add(question.id)
                    section_questions.append(question)
                resolved_total = len(section_questions)
                if fallback_pool:
                    warnings.append(
                        f"{section_payload['name']}: backfilled {len(fallback_pool)} question(s) from other subject topics."
                    )

        if resolved_total != requested_total:
            raise ValidationError(
                {
                    "composition": (
                        f"{section_payload['name']} requested {requested_total} question(s) but only "
                        f"{resolved_total} could be resolved."
                    )
                }
            )

    actual_difficulty = {"foundation": 0, "intermediate": 0, "advanced": 0}
    for question in section_questions:
        actual_difficulty[question.difficulty_level] = actual_difficulty.get(question.difficulty_level, 0) + 1
    quality_summary = _summarize_question_quality(section_questions)

    if section_payload.get("marks_per_question") is None:
        warnings.append(
            f"{section_payload['name']}: marks per question is blank, so preview is using each question's default marks."
        )

    if len(section_payload["topics"]) == 1:
        warnings.append(
            f"{section_payload['name']}: all questions come from a single topic. Add another topic if you want broader coverage."
        )

    if quality_summary["high_priority"] > 0:
        warnings.append(
            f"{section_payload['name']}: {quality_summary['high_priority']} resolved question(s) are already in the revision queue."
        )
    if quality_summary["ambiguous"] > 0:
        warnings.append(
            f"{section_payload['name']}: {quality_summary['ambiguous']} question(s) show ambiguous performance patterns."
        )
    if quality_summary["emerging"] == resolved_total and resolved_total > 0:
        warnings.append(
            f"{section_payload['name']}: all resolved questions are still emerging and do not yet have enough live attempt history."
        )

    warnings.extend(topic_fallbacks)

    return {
        "subject": str(section_subject.id),
        "subject_code": section_subject.code,
        "subject_name": section_subject.name,
        "name": section_payload["name"],
        "description": section_payload.get("description", ""),
        "instructions": section_payload.get("instructions", ""),
        "order": int(section_payload["order"]),
        "requested": requested_total,
        "resolved": resolved_total,
        "difficulty_mix": difficulty_mix,
        "actual_difficulty_breakup": actual_difficulty,
        "quality_summary": quality_summary,
        "topic_breakup": resolved_topic_rows,
        "marks_per_question": section_payload.get("marks_per_question"),
        "negative_marks_per_question": section_payload.get("negative_marks_per_question"),
        "timer_enabled": bool(section_payload.get("timer_enabled", False)),
        "duration_minutes": section_payload.get("duration_minutes"),
        "allow_skip_section": bool(section_payload.get("allow_skip_section", True)),
        "lock_after_submit": bool(section_payload.get("lock_after_submit", False)),
        "family_contract": {
            "assessment_family_code": (
                program_assessment_family.get("code")
                if isinstance(program_assessment_family, dict)
                else None
            ),
            "assessment_family_label": (
                program_assessment_family.get("label")
                if isinstance(program_assessment_family, dict)
                else None
            ),
            "negative_marking_scope": negative_marking_scope or None,
            "negative_marking_default": negative_marking_default,
            "negative_marks_per_question": section_negative_marks,
            "marks_per_question": section_marks,
            "negative_marking_allowed": negative_marking_scope != "disabled",
            "negative_marking_recommended": negative_marking_default,
            "negative_marking_aligned": not (
                negative_marking_default
                and section_negative_marks is not None
                and Decimal(str(section_negative_marks)) <= Decimal("0.00")
            ),
        },
        "questions": section_questions,
        "blockers": blockers,
        "warnings": warnings + topic_shortages if selection_mode != QUESTION_SELECTION_MODE_STRICT else warnings,
    }


def _apply_jee_numeric_contract(*, blueprint, section_plans, warnings):
    preset_pack_code = str((blueprint.get("exam") or {}).get("preset_pack_code", "") or "").strip()
    if preset_pack_code != "jee_mains_math":
        return

    total_numeric_questions = 0
    for section_plan in section_plans:
        section_name = str(section_plan["name"] or "")
        numeric_section_named = "numeric" in section_name.lower()
        numeric_questions = [
            question for question in section_plan["questions"] if getattr(question, "question_type", "") == "numeric_answer"
        ]
        numeric_count = len(numeric_questions)
        section_plan["family_contract"]["numeric_entry_supported"] = True
        section_plan["family_contract"]["numeric_entry_present"] = numeric_count > 0
        section_plan["family_contract"]["numeric_entry_count"] = numeric_count
        section_plan["family_contract"]["numeric_entry_recommended"] = True
        section_plan["family_contract"]["numeric_entry_expected"] = numeric_section_named
        total_numeric_questions += numeric_count

        if (numeric_count > 0 or numeric_section_named) and section_plan["negative_marks_per_question"] is not None:
            try:
                negative_marks = Decimal(str(section_plan["negative_marks_per_question"]))
            except Exception:
                negative_marks = Decimal("0.00")
            if negative_marks > Decimal("0.00"):
                raise ValidationError(
                    {
                        "composition": (
                            f"{section_plan['name']}: JEE numeric-entry sections do not support negative marking in the current product contract."
                        )
                    }
                )

    if total_numeric_questions == 0:
        warnings.append(
            "JEE Mains guidance: this blueprint resolved no numeric-entry questions. Add at least one numeric-answer block to stay aligned with the current JEE contract."
        )


def _resolve_preset_reporting_contract(blueprint):
    preset_pack_code = str((blueprint.get("exam") or {}).get("preset_pack_code", "") or "").strip()
    contract = PRESET_PACK_REPORTING_CONTRACTS.get(preset_pack_code)
    return dict(contract) if isinstance(contract, dict) else None


def _apply_gre_reporting_contract(*, blueprint, warnings):
    reporting_contract = _resolve_preset_reporting_contract(blueprint)
    if reporting_contract is None or reporting_contract.get("family_id") != "gre":
        return reporting_contract

    delivery_payload = blueprint.get("delivery") or {}
    review_mode = str(delivery_payload.get("review_mode", "") or "").strip()
    rank_visibility_mode = str(delivery_payload.get("rank_visibility_mode", "") or "").strip()
    percentile_visibility_mode = str(delivery_payload.get("percentile_visibility_mode", "") or "").strip()
    benchmark_visibility_mode = str(delivery_payload.get("benchmark_visibility_mode", "") or "").strip()

    if review_mode == REVIEW_MODE_SOLUTION_REVIEW:
        warnings.append(
            "GRE reporting guidance: keep review in attempted-only mode for now. Full solution-review storytelling is ahead of the current GRE reporting depth."
        )
    if rank_visibility_mode == RANK_VISIBILITY_MODE_PROVISIONAL_AFTER_SUBMIT:
        warnings.append(
            "GRE reporting guidance: avoid provisional rank visibility. Formal GRE comparison should stay hidden until the exam window fully closes."
        )
    if percentile_visibility_mode != PERCENTILE_VISIBILITY_MODE_FINAL_AFTER_EXAM_CLOSURE:
        warnings.append(
            "GRE reporting guidance: percentile visibility works best after exam closure because the current GRE lane is total-score-first, not section-score-first."
        )
    if benchmark_visibility_mode == BENCHMARK_VISIBILITY_MODE_HIDDEN:
        warnings.append(
            "GRE reporting guidance: keep benchmark context visible where possible. It provides better readiness framing than rank-only reporting in the current GRE lane."
        )

    return reporting_contract


def preview_advanced_exam_blueprint(*, actor, blueprint):
    from apps.academics.models import Topic

    scope = _resolve_advanced_exam_scope(actor, blueprint["scope"], blueprint["exam"])
    section_subjects = _resolve_section_subjects(
        scope=scope,
        sections=blueprint["composition"]["sections"],
    )
    program_assessment_family = resolve_program_assessment_family_profile(scope.get("program"))
    start_at, end_at, academic_year_end_at = _resolve_exam_schedule(
        scope["academic_year"],
        blueprint["exam"],
    )
    selection_mode = blueprint["composition"]["selection_mode"]
    if selection_mode not in ADVANCED_EXAM_SELECTION_MODES:
        raise ValidationError({"composition": "Unsupported selection mode."})

    topic_codes = []
    for section in blueprint["composition"]["sections"]:
        for topic_row in section["topics"]:
            topic_codes.append(topic_row["topic_code"])

    topic_map = {
        (topic.subject_id, topic.code): topic
        for topic in Topic.objects.filter(
            institute=scope["institute"],
            subject_id__in={subject.id for subject in section_subjects.values()},
            code__in=topic_codes,
            is_active=True,
        )
    }
    missing = []
    for section_payload in blueprint["composition"]["sections"]:
        section_subject = section_subjects[int(section_payload["order"])]
        for topic_row in section_payload["topics"]:
            if (section_subject.id, topic_row["topic_code"]) not in topic_map:
                missing.append(f"{section_subject.code}:{topic_row['topic_code']}")
    if missing:
        raise ValidationError({"composition": f"Unknown topic code(s): {', '.join(sorted(set(missing)))}"})

    question_buckets = {}
    for subject in {section_subjects[key] for key in section_subjects}:
        question_buckets.update(
            _build_question_buckets(
                institute=scope["institute"],
                program=scope["program"],
                subject=subject,
                topic_ids=[topic.id for (subject_id, _), topic in topic_map.items() if subject_id == subject.id],
            )
        )
    used_question_ids = set()
    blockers = []
    section_plans = []
    warnings = []
    total_marks = Decimal("0.00")
    total_questions = 0
    timed_section_duration_total = 0

    for section_payload in sorted(blueprint["composition"]["sections"], key=lambda row: row["order"]):
        section_subject = section_subjects[int(section_payload["order"])]
        section_plan = _resolve_section_blueprint(
            section_payload=section_payload,
            section_subject=section_subject,
            topic_map=topic_map,
            question_buckets=question_buckets,
            used_question_ids=used_question_ids,
            selection_mode=selection_mode,
            program_assessment_family=program_assessment_family,
        )
        section_plans.append(section_plan)
        blockers.extend(section_plan["blockers"])
        warnings.extend(section_plan["warnings"])
        total_questions += section_plan["resolved"]
        if section_plan["timer_enabled"] and section_plan["duration_minutes"]:
            section_duration = int(section_plan["duration_minutes"])
            timed_section_duration_total += section_duration
            if section_duration > int(blueprint["exam"]["duration_minutes"]):
                blockers.append(
                    f"{section_plan['name']}: section timer ({section_duration} min) is longer than the full exam duration "
                    f"({int(blueprint['exam']['duration_minutes'])} min)."
                )
        for question in section_plan["questions"]:
            section_marks = section_plan["marks_per_question"]
            if section_marks is None:
                total_marks += question.default_marks
            else:
                total_marks += Decimal(str(section_marks))

    preview_quality_summary = _summarize_question_quality(
        [question for section_plan in section_plans for question in section_plan["questions"]]
    )

    if timed_section_duration_total > int(blueprint["exam"]["duration_minutes"]):
        blockers.append(
            f"Timed sections add up to {timed_section_duration_total} min, which is longer than the full exam duration "
            f"of {int(blueprint['exam']['duration_minutes'])} min."
        )

    _apply_jee_numeric_contract(
        blueprint=blueprint,
        section_plans=section_plans,
        warnings=warnings,
    )
    reporting_contract = _apply_gre_reporting_contract(
        blueprint=blueprint,
        warnings=warnings,
    )

    primary_subject = next(iter(section_subjects.values()), scope.get("subject"))

    return {
        "scope": scope,
        "resolved_exam": {
            "title": blueprint["exam"]["title"],
            "code": blueprint["exam"]["code"],
            "source_type": blueprint["exam"]["source_type"],
            "source_teacher_id": str(scope["source_teacher"].id) if scope["source_teacher"] is not None else None,
            "primary_subject": str(primary_subject.id) if primary_subject is not None else None,
            "primary_subject_name": primary_subject.name if primary_subject is not None else None,
            "assessment_family_profile": program_assessment_family,
            "academic_year_end_at": academic_year_end_at,
            "start_at": start_at,
            "end_at": end_at,
            "duration_minutes": int(blueprint["exam"]["duration_minutes"]),
            "total_questions": total_questions,
            "total_marks": total_marks,
            "question_quality": preview_quality_summary,
            "reporting_contract": reporting_contract,
            "experience_profile": resolve_exam_experience_profile_from_values(
                exam_type=blueprint["exam"]["exam_type"],
                delivery_mode=blueprint["exam"]["delivery_mode"],
                timer_mode=(blueprint.get("delivery") or {}).get("timer_mode", "global"),
                navigation_mode=(blueprint.get("delivery") or {}).get(
                    "navigation_mode",
                    "free_exam",
                ),
                program_assessment_family=program_assessment_family,
                overrides=blueprint["exam"].get("experience_profile", {}),
            ),
        },
        "sections": section_plans,
        "blockers": blockers,
        "warnings": warnings,
    }


@transaction.atomic
def create_advanced_exam_from_blueprint(*, actor, blueprint):
    from apps.academics.models import Subject
    from apps.economy.models import InstituteQuestionUsageActionType
    from apps.economy.services import record_exam_question_bank_usage
    from apps.exams.models import Exam, ExamQuestion, ExamSection

    preview = preview_advanced_exam_blueprint(actor=actor, blueprint=blueprint)
    if preview["blockers"]:
        raise ValidationError({"composition": preview["blockers"]})
    scope = preview["scope"]
    resolved_exam = preview["resolved_exam"]
    exam_payload = blueprint["exam"]
    delivery_payload = blueprint.get("delivery") or {}

    exam_queryset = Exam.objects.filter(
        institute=scope["institute"],
        code=exam_payload["code"],
    )
    existing_exam = exam_queryset.first()
    if existing_exam is not None and not exam_payload.get("replace_existing_code", False):
        raise ValidationError({"exam": "An exam with this code already exists in the institute."})
    if existing_exam is not None and existing_exam.exam_questions.filter(is_active=True).exists():
        raise ValidationError({"exam": "Replacement is allowed only when the existing exam has no linked questions."})

    primary_subject = scope["subject"]
    if primary_subject is None:
        primary_subject_id = resolved_exam.get("primary_subject")
        primary_subject = (
            Subject.objects.filter(
                id=primary_subject_id,
                institute=scope["institute"],
                is_active=True,
            ).first()
            if primary_subject_id
            else None
        )

    exam_attrs = {
        "institute": scope["institute"],
        "academic_year": scope["academic_year"],
        "program": scope["program"],
        "cohort": scope["cohort"],
        "subject": primary_subject,
        "title": exam_payload["title"],
        "code": exam_payload["code"],
        "description": exam_payload.get("description", ""),
        "exam_type": exam_payload["exam_type"],
        "delivery_mode": exam_payload["delivery_mode"],
        "status": exam_payload["status"],
        "duration_minutes": int(exam_payload["duration_minutes"]),
        "total_marks": Decimal("0.00"),
        "passing_marks": _normalize_decimal(exam_payload.get("passing_marks"), "0.00"),
        "start_at": resolved_exam["start_at"],
        "end_at": resolved_exam["end_at"],
        "instructions": exam_payload.get("instructions", ""),
        "allow_late_submit": bool(delivery_payload.get("allow_late_submit", False)),
        "randomize_questions": bool(delivery_payload.get("randomize_questions", False)),
        "randomize_options": bool(delivery_payload.get("randomize_options", False)),
        "show_result_immediately": bool(delivery_payload.get("show_result_immediately", False)),
        "allow_review_after_submit": bool(delivery_payload.get("allow_review_after_submit", True)),
        "max_attempts": int(delivery_payload.get("max_attempts", 1)),
        "timer_mode": delivery_payload.get("timer_mode", Exam._meta.get_field("timer_mode").default),
        "navigation_mode": delivery_payload.get(
            "navigation_mode",
            Exam._meta.get_field("navigation_mode").default,
        ),
        "attempt_policy": delivery_payload.get(
            "attempt_policy",
            Exam._meta.get_field("attempt_policy").default,
        ),
        "result_publish_mode": delivery_payload.get(
            "result_publish_mode",
            Exam._meta.get_field("result_publish_mode").default,
        ),
        "review_mode": delivery_payload.get("review_mode", Exam._meta.get_field("review_mode").default),
        "security_mode": delivery_payload.get(
            "security_mode",
            Exam._meta.get_field("security_mode").default,
        ),
        "source_type": exam_payload["source_type"],
        "source_teacher": scope["source_teacher"],
        "assignment_mode": delivery_payload.get(
            "assignment_mode",
            Exam._meta.get_field("assignment_mode").default,
        ),
        "allow_resume": bool(delivery_payload.get("allow_resume", True)),
        "allow_section_switching": bool(delivery_payload.get("allow_section_switching", True)),
        "allow_return_to_previous_section": bool(
            delivery_payload.get("allow_return_to_previous_section", True)
        ),
        "result_publish_at": delivery_payload.get("result_publish_at"),
        "review_available_from": delivery_payload.get("review_available_from"),
        "review_available_until": delivery_payload.get("review_available_until"),
        "metadata": {
            "advanced_builder": {
                "selection_mode": blueprint["composition"]["selection_mode"],
                "subject_code": scope["subject"].code if scope["subject"] is not None else "",
                "section_subject_codes": [section_plan["subject_code"] for section_plan in preview["sections"]],
                "preset_pack_code": exam_payload.get("preset_pack_code", ""),
                "reporting_contract": resolved_exam.get("reporting_contract"),
            },
            "experience_profile": exam_payload.get("experience_profile", {}) or {},
            "result_visibility_policy": {
                "rank_visibility_mode": delivery_payload.get("rank_visibility_mode", "hidden"),
                "percentile_visibility_mode": delivery_payload.get("percentile_visibility_mode", "hidden"),
                "benchmark_visibility_mode": delivery_payload.get(
                    "benchmark_visibility_mode",
                    "peer_average_only",
                ),
                "rank_freeze_policy": delivery_payload.get(
                    "rank_freeze_policy",
                    "freeze_on_exam_closure",
                ),
            },
        },
    }

    if existing_exam is None:
        exam = Exam.objects.create(**exam_attrs)
    else:
        for field_name, value in exam_attrs.items():
            setattr(existing_exam, field_name, value)
        existing_exam.save()
        existing_exam.sections.all().delete()
        existing_exam.exam_questions.all().delete()
        exam = existing_exam

    question_order = 1
    for section_plan in preview["sections"]:
        section = ExamSection.objects.create(
            exam=exam,
            subject_id=section_plan["subject"],
            name=section_plan["name"],
            description=section_plan["description"],
            section_order=section_plan["order"],
            instructions=section_plan["instructions"],
            total_questions=section_plan["resolved"],
            marks_per_question=section_plan["marks_per_question"],
            negative_marks_per_question=section_plan["negative_marks_per_question"],
            timer_enabled=section_plan["timer_enabled"],
            duration_minutes=section_plan["duration_minutes"],
            allow_skip_section=section_plan["allow_skip_section"],
            lock_after_submit=section_plan["lock_after_submit"],
        )
        for question in section_plan["questions"]:
            marks = section_plan["marks_per_question"]
            negative_marks = section_plan["negative_marks_per_question"]
            ExamQuestion.objects.create(
                exam=exam,
                question=question,
                section=section,
                question_order=question_order,
                marks=question.default_marks if marks is None else Decimal(str(marks)),
                negative_marks=question.negative_marks if negative_marks is None else Decimal(str(negative_marks)),
            )
            question_order += 1

    sync_total_marks_from_questions(exam)

    economy_payload = blueprint.get("economy") or {}
    policy = sync_exam_access_policy(
        exam,
        policy_type=economy_payload.get("policy_type", ""),
        star_cost=int(economy_payload.get("star_cost", 0) or 0),
        entitlement_code=economy_payload.get("entitlement_code", ""),
        priority=int(economy_payload.get("priority", 100) or 100),
    )
    unlock_payload = economy_payload.get("unlock_rule") or {}
    unlock_rule = sync_exam_unlock_rule(
        exam,
        rule_type=unlock_payload.get("rule_type", ""),
        required_star_balance=unlock_payload.get("required_star_balance"),
        required_entitlement_code=unlock_payload.get("required_entitlement_code", ""),
        required_completion_count=unlock_payload.get("required_completion_count"),
        required_score_percentage=unlock_payload.get("required_score_percentage"),
        admin_override_allowed=bool(unlock_payload.get("admin_override_allowed", True)),
        priority=int(unlock_payload.get("priority", 100) or 100),
    )
    record_exam_question_bank_usage(
        exam=exam,
        action_type=InstituteQuestionUsageActionType.EXAM_CREATED,
        performed_by=scope["source_teacher"],
        metadata={
            "operation": "advanced_builder_create",
            "source_type": exam.source_type,
            "status": exam.status,
        },
    )
    exam.refresh_from_db()
    return {
        "exam": exam,
        "preview": preview,
        "policy": policy,
        "unlock_rule": unlock_rule,
    }


def resolve_institute_exam_defaults(institute):
    metadata = getattr(institute, "metadata", {}) or {}
    if not isinstance(metadata, dict):
        return {}
    defaults = metadata.get("exam_defaults", {})
    if not isinstance(defaults, dict):
        return {}
    return {
        key: value
        for key, value in defaults.items()
        if key in INSTITUTE_EXAM_DEFAULT_FIELDS
    }


def apply_institute_exam_defaults(institute, attrs, supplied_fields=None):
    supplied = set(supplied_fields or [])
    defaults = resolve_institute_exam_defaults(institute)
    for key, value in defaults.items():
        if key not in supplied and key not in attrs:
            attrs[key] = value
    return attrs


def normalize_exam_access_key(value):
    return "".join(str(value or "").upper().split())


def generate_exam_access_key(length=EXAM_ACCESS_KEY_LENGTH):
    return "".join(secrets.choice(EXAM_ACCESS_KEY_ALPHABET) for _ in range(length))


def regenerate_exam_access_key(exam):
    while True:
        key = generate_exam_access_key()
        if not exam.__class__.objects.filter(
            institute_id=exam.institute_id,
            access_key=key,
        ).exclude(pk=exam.pk).exists():
            exam.access_key = key
            exam.save(update_fields=["access_key", "updated_at"])
            return exam


def resolve_result_publish_mode(exam):
    if exam.show_result_immediately:
        return RESULT_PUBLISH_MODE_IMMEDIATE
    return exam.result_publish_mode


def resolve_exam_result_visibility_policy(exam):
    metadata = getattr(exam, "metadata", {}) or {}
    if not isinstance(metadata, dict):
        metadata = {}
    raw_policy = metadata.get("result_visibility_policy", {})
    if not isinstance(raw_policy, dict):
        raw_policy = {}

    policy = dict(DEFAULT_EXAM_RESULT_VISIBILITY_POLICY)
    for key in policy:
        value = raw_policy.get(key)
        if isinstance(value, str) and value.strip():
            policy[key] = value.strip()
    return policy


def resolve_review_mode(exam):
    if exam.allow_review_after_submit and exam.review_mode == REVIEW_MODE_NONE:
        return REVIEW_MODE_ATTEMPTED_ONLY
    return exam.review_mode


def resolve_security_policy(exam):
    mode = getattr(exam, "security_mode", SECURITY_MODE_NORMAL) or SECURITY_MODE_NORMAL

    if mode == SECURITY_MODE_FOCUS:
        return {
            "mode": mode,
            "student_label": "Focus monitoring",
            "teacher_label": "Focus signal tracking",
            "requires_fullscreen": False,
            "tracks_focus_loss": True,
            "tracks_visibility_change": True,
            "tracks_fullscreen_exit": False,
            "violation_limit_enabled": False,
            "violation_limit": None,
            "violation_action": None,
            "enhanced_monitoring": False,
            "student_warning_copy": (
                "Stay on the attempt screen during the exam. Leaving the tab or switching away may be logged."
            ),
            "teacher_monitoring_copy": (
                "Track focus-loss and tab-visibility changes as light integrity signals."
            ),
        }

    if mode == SECURITY_MODE_FULLSCREEN:
        return {
            "mode": mode,
            "student_label": "Fullscreen required",
            "teacher_label": "Fullscreen monitoring",
            "requires_fullscreen": True,
            "tracks_focus_loss": True,
            "tracks_visibility_change": True,
            "tracks_fullscreen_exit": True,
            "violation_limit_enabled": False,
            "violation_limit": None,
            "violation_action": None,
            "enhanced_monitoring": True,
            "student_warning_copy": (
                "Enter fullscreen before continuing and stay in fullscreen during the attempt. Exits may be logged."
            ),
            "teacher_monitoring_copy": (
                "Track fullscreen exits together with focus and visibility changes during the attempt."
            ),
        }

    if mode == SECURITY_MODE_VIOLATION_LIMITED:
        return {
            "mode": mode,
            "student_label": "Violation-limited monitoring",
            "teacher_label": "Escalating integrity monitoring",
            "requires_fullscreen": True,
            "tracks_focus_loss": True,
            "tracks_visibility_change": True,
            "tracks_fullscreen_exit": True,
            "violation_limit_enabled": True,
            "violation_limit": 3,
            "violation_action": "auto_submit",
            "enhanced_monitoring": True,
            "student_warning_copy": (
                "This attempt tracks integrity warnings. Repeated fullscreen exits or tab switches can trigger auto-submit."
            ),
            "teacher_monitoring_copy": (
                "Track integrity warnings and escalate automatically when the configured violation threshold is reached."
            ),
        }

    if mode == SECURITY_MODE_PROCTORED:
        return {
            "mode": mode,
            "student_label": "Enhanced monitoring",
            "teacher_label": "Enhanced event monitoring",
            "requires_fullscreen": True,
            "tracks_focus_loss": True,
            "tracks_visibility_change": True,
            "tracks_fullscreen_exit": True,
            "violation_limit_enabled": True,
            "violation_limit": 2,
            "violation_action": "auto_submit",
            "enhanced_monitoring": True,
            "student_warning_copy": (
                "This attempt is under enhanced browser monitoring. Keep the exam in fullscreen and avoid leaving the attempt window."
            ),
            "teacher_monitoring_copy": (
                "Prioritize these attempts in live monitoring and review integrity-event patterns closely."
            ),
        }

    return {
        "mode": SECURITY_MODE_NORMAL,
        "student_label": "Standard online",
        "teacher_label": "Standard online",
        "requires_fullscreen": False,
        "tracks_focus_loss": False,
        "tracks_visibility_change": False,
        "tracks_fullscreen_exit": False,
        "violation_limit_enabled": False,
        "violation_limit": None,
        "violation_action": None,
        "enhanced_monitoring": False,
        "student_warning_copy": (
            "Standard exam rules apply. Keep your session stable and submit before the timer ends."
        ),
        "teacher_monitoring_copy": (
            "Use normal attempt monitoring and standard operational alerts."
        ),
    }


def is_result_visible_for_attempt(exam, attempt, result=None, at_time=None):
    from apps.attempts.services import attempt_has_pending_manual_review

    current_time = at_time or timezone.now()
    result = result or getattr(attempt, "result", None)
    mode = resolve_result_publish_mode(exam)

    if attempt_has_pending_manual_review(attempt):
        return False

    if mode == RESULT_PUBLISH_MODE_IMMEDIATE:
        return attempt.status in {"submitted", "auto_submitted"}
    if result is None:
        return False
    if result.is_published:
        return True
    if mode == RESULT_PUBLISH_MODE_SCHEDULED and exam.result_publish_at:
        return current_time >= exam.result_publish_at
    return False


def is_review_available_for_attempt(exam, attempt, result=None, at_time=None):
    current_time = at_time or timezone.now()
    review_mode = resolve_review_mode(exam)
    if review_mode == REVIEW_MODE_NONE:
        return False
    if attempt.status not in {"submitted", "auto_submitted"}:
        return False
    if exam.review_available_from and current_time < exam.review_available_from:
        return False
    if exam.review_available_until and current_time > exam.review_available_until:
        return False
    if exam.allow_review_after_submit and exam.review_mode == REVIEW_MODE_NONE:
        return True
    return is_result_visible_for_attempt(exam, attempt, result=result, at_time=current_time)


def review_visibility_for_attempt(exam, attempt, result=None, at_time=None):
    review_mode = resolve_review_mode(exam)
    review_available = is_review_available_for_attempt(
        exam,
        attempt,
        result=result,
        at_time=at_time,
    )
    if not review_available:
        return {
            "review_available": False,
            "review_mode": review_mode,
            "include_all_questions": False,
            "show_correct_answers": False,
            "show_explanations": False,
        }

    include_all_questions = review_mode in {
        REVIEW_MODE_ALL_QUESTIONS,
        REVIEW_MODE_SOLUTION_REVIEW,
    }
    show_correct_answers = review_mode != REVIEW_MODE_NONE
    show_explanations = review_mode == REVIEW_MODE_SOLUTION_REVIEW
    return {
        "review_available": True,
        "review_mode": review_mode,
        "include_all_questions": include_all_questions,
        "show_correct_answers": show_correct_answers,
        "show_explanations": show_explanations,
    }


def choose_attempt_for_result_policy(exam, attempts):
    attempt_list = list(attempts)
    if not attempt_list:
        return None

    if exam.attempt_policy == ATTEMPT_POLICY_BEST:
        return sorted(
            attempt_list,
            key=lambda attempt: (
                attempt.final_score,
                -attempt.time_taken_seconds,
                attempt.attempt_no,
                attempt.created_at,
            ),
            reverse=True,
        )[0]

    return sorted(
        attempt_list,
        key=lambda attempt: (attempt.attempt_no, attempt.created_at),
        reverse=True,
    )[0]


def validate_exam_questions(exam, exam_questions=None):
    queryset = exam_questions
    if queryset is None:
        queryset = exam.exam_questions.filter(is_active=True).select_related("question", "section", "section__subject")

    question_list = list(queryset)
    if not question_list:
        raise ValidationError({"questions": "Exam must contain at least one active question."})

    for exam_question in question_list:
        if exam_question.question.institute_id != exam.institute_id:
            raise ValidationError(
                {"question": "All exam questions must belong to the same institute as the exam."}
            )
        if exam_question.section_id and getattr(exam_question.section, "subject_id", None):
            if exam_question.question.subject_id != exam_question.section.subject_id:
                raise ValidationError(
                    {
                        "question": (
                            f"Question {exam_question.question_id} must match the subject for section "
                            f"{exam_question.section.name}."
                        )
                    }
                )
        elif exam.subject_id and exam_question.question.subject_id != exam.subject_id:
            raise ValidationError(
                {
                    "question": (
                        f"Question {exam_question.question_id} must match the exam subject when no "
                        "section subject is configured."
                    )
                }
            )

    total_marks = calculate_exam_total_marks(question_list)
    if total_marks != exam.total_marks:
        raise ValidationError(
            {
                "total_marks": (
                    f"Exam total marks ({exam.total_marks}) must match active exam question total "
                    f"({total_marks})."
                )
            }
        )


def _build_exam_publish_issue(*, code, field, message, level):
    return {
        "code": code,
        "field": field,
        "message": message,
        "level": level,
    }


def build_exam_publish_readiness(exam, exam_questions=None):
    from apps.question_bank.services import (
        institute_has_question_authoring_access,
        validate_question_options,
    )
    from apps.economy.services import (
        get_entitlement_exam_publish_policy_summary,
        group_exam_question_bank_usage_buckets,
    )

    queryset = exam_questions
    if queryset is None:
        queryset = exam.exam_questions.filter(is_active=True).select_related("question", "section", "section__subject")

    question_list = list(queryset)
    blockers = []
    warnings = []

    if exam.status not in {"draft", "cancelled"}:
        blockers.append(
            _build_exam_publish_issue(
                code=EXAM_PUBLISH_BLOCKER_INVALID_STATUS,
                field="status",
                message="Only draft or cancelled exams can be scheduled or published.",
                level="blocker",
            )
        )

    if exam.start_at is None or exam.end_at is None:
        blockers.append(
            _build_exam_publish_issue(
                code=EXAM_PUBLISH_BLOCKER_MISSING_SCHEDULE,
                field="start_at",
                message="Scheduled exam must have start and end timestamps defined.",
                level="blocker",
            )
        )
    elif exam.end_at <= exam.start_at:
        blockers.append(
            _build_exam_publish_issue(
                code=EXAM_PUBLISH_BLOCKER_INVALID_SCHEDULE_WINDOW,
                field="end_at",
                message="End time must be after the start time.",
                level="blocker",
            )
        )

    if not question_list:
        blockers.append(
            _build_exam_publish_issue(
                code=EXAM_PUBLISH_BLOCKER_NO_ACTIVE_QUESTIONS,
                field="questions",
                message="Exam must contain at least one active question.",
                level="blocker",
            )
        )
    else:
        total_marks = calculate_exam_total_marks(question_list)
        if total_marks != exam.total_marks:
            blockers.append(
                _build_exam_publish_issue(
                    code=EXAM_PUBLISH_BLOCKER_TOTAL_MARKS_MISMATCH,
                    field="total_marks",
                    message=(
                        f"Exam total marks ({exam.total_marks}) must match active exam question total "
                        f"({total_marks})."
                    ),
                    level="blocker",
                )
            )

        explanation_warning_count = 0
        unverified_warning_count = 0
        invalid_question_count = 0

        for exam_question in question_list:
            question = exam_question.question
            section = getattr(exam_question, "section", None)
            section_subject = getattr(section, "subject", None) if section is not None else None
            if question.institute_id != exam.institute_id:
                blockers.append(
                    _build_exam_publish_issue(
                        code=EXAM_PUBLISH_BLOCKER_FOREIGN_INSTITUTE_QUESTION,
                        field="question",
                        message="All exam questions must belong to the same institute as the exam.",
                        level="blocker",
                    )
                )
                continue

            if not institute_has_question_authoring_access(exam.institute, question=question):
                blockers.append(
                    _build_exam_publish_issue(
                        code=EXAM_PUBLISH_BLOCKER_INACTIVE_SHARED_LIBRARY_ENTITLEMENT,
                        field="question",
                        message=(
                            f"Question '{question.id}' is linked from the shared library but the institute no longer "
                            "has an active entitlement for it."
                        ),
                        level="blocker",
                    )
                )
                continue

            if section_subject is not None and question.subject_id != section_subject.id:
                blockers.append(
                    _build_exam_publish_issue(
                        code=EXAM_PUBLISH_BLOCKER_INVALID_QUESTION_CONFIGURATION,
                        field="question",
                        message=(
                            f"Question '{question.id}' does not match the subject assigned to section "
                            f"'{section.name}'."
                        ),
                        level="blocker",
                    )
                )
                continue
            if section is None and exam.subject_id and question.subject_id != exam.subject_id:
                blockers.append(
                    _build_exam_publish_issue(
                        code=EXAM_PUBLISH_BLOCKER_INVALID_QUESTION_CONFIGURATION,
                        field="question",
                        message=(
                            f"Question '{question.id}' does not match the exam subject for an unsectioned "
                            "question link."
                        ),
                        level="blocker",
                    )
                )
                continue

            try:
                validate_question_options(
                    question.question_type,
                    question.options.filter(is_active=True),
                )
            except ValidationError as exc:
                invalid_question_count += 1
                blockers.append(
                    _build_exam_publish_issue(
                        code=EXAM_PUBLISH_BLOCKER_INVALID_QUESTION_CONFIGURATION,
                        field="question",
                        message=(
                            f"Question '{question.id}' is not publish-ready: "
                            f"{'; '.join(exc.messages)}"
                        ),
                        level="blocker",
                    )
                )

            if not str(question.explanation or "").strip():
                explanation_warning_count += 1
            if not bool(question.is_verified):
                unverified_warning_count += 1

        if explanation_warning_count:
            warnings.append(
                _build_exam_publish_issue(
                    code=EXAM_PUBLISH_WARNING_MISSING_EXPLANATION,
                    field="question",
                    message=(
                        f"{explanation_warning_count} linked question(s) are missing explanation text."
                    ),
                    level="warning",
                )
            )
        if unverified_warning_count:
            warnings.append(
                _build_exam_publish_issue(
                    code=EXAM_PUBLISH_WARNING_UNVERIFIED_QUESTION,
                    field="question",
                    message=(
                        f"{unverified_warning_count} linked question(s) are not marked verified."
                    ),
                    level="warning",
                )
            )

        for usage_bucket in group_exam_question_bank_usage_buckets(exam=exam):
            entitlement = usage_bucket.get("entitlement")
            package = usage_bucket.get("package")
            if entitlement is None or package is None:
                continue

            publish_policy = get_entitlement_exam_publish_policy_summary(
                entitlement,
                current_exam=exam,
            )
            if not publish_policy["publish_limit_configured"]:
                continue

            if publish_policy["publish_watch_state"] == "limit_reached":
                blockers.append(
                    _build_exam_publish_issue(
                        code=EXAM_PUBLISH_BLOCKER_SHARED_LIBRARY_PUBLISH_LIMIT_REACHED,
                        field="question",
                        message=(
                            f"Shared-library package '{package.code}' has already used its configured publish allowance "
                            f"({publish_policy['publish_usage_count']}/{publish_policy['publish_limit_total']})."
                        ),
                        level="blocker",
                    )
                )
                continue

            if publish_policy["publish_watch_state"] == "near_limit":
                warnings.append(
                    _build_exam_publish_issue(
                        code=EXAM_PUBLISH_WARNING_SHARED_LIBRARY_PUBLISH_LIMIT_NEAR,
                        field="question",
                        message=(
                            f"Shared-library package '{package.code}' is close to its publish allowance. "
                            f"{publish_policy['publish_remaining_count']} publish slot(s) remain before the cap "
                            f"of {publish_policy['publish_limit_total']} is reached."
                        ),
                        level="warning",
                    )
                )

    return {
        "ready": not blockers,
        "blocker_count": len(blockers),
        "warning_count": len(warnings),
        "blockers": blockers,
        "warnings": warnings,
    }


def _raise_exam_publish_readiness_errors(readiness):
    if readiness["ready"]:
        return

    field_errors = {}
    for blocker in readiness["blockers"]:
        field_errors.setdefault(blocker["field"], []).append(blocker["message"])
    raise ValidationError(field_errors)


@transaction.atomic
def sync_total_marks_from_questions(exam):
    total_marks = calculate_exam_total_marks(exam.exam_questions.filter(is_active=True))
    exam.total_marks = total_marks
    exam.save(update_fields=["total_marks", "updated_at"])
    return exam


def _record_status_change(exam, *, old_status, new_status, changed_by=None, remarks=""):
    from apps.exams.models import ExamPublishLog

    if old_status == new_status:
        return exam
    exam.status = new_status
    exam.save(update_fields=["status", "updated_at"])
    ExamPublishLog.objects.create(
        exam=exam,
        old_status=old_status,
        new_status=exam.status,
        changed_by=changed_by,
        remarks=remarks,
    )
    return exam


@transaction.atomic
def refresh_exam_status(exam, *, at_time=None, changed_by=None, remarks=""):
    current_time = at_time or timezone.now()
    if exam.status in {"draft", "cancelled"}:
        return exam

    next_status = exam.status
    if exam.start_at and exam.end_at:
        if current_time >= exam.end_at:
            next_status = "completed"
        elif current_time >= exam.start_at:
            next_status = "live"
        else:
            next_status = "scheduled"
    elif exam.status == "live":
        next_status = "scheduled"

    return _record_status_change(
        exam,
        old_status=exam.status,
        new_status=next_status,
        changed_by=changed_by,
        remarks=remarks or "Exam status refreshed from timing window.",
    )


@transaction.atomic
def mark_exam_live(exam, *, changed_by=None, remarks=""):
    if exam.status in {"cancelled", "completed"}:
        raise ValidationError({"status": "Completed or cancelled exams cannot be moved to live."})
    if exam.start_at is None or exam.end_at is None:
        raise ValidationError({"start_at": "Exam must have a valid schedule before going live."})
    if exam.end_at <= timezone.now():
        raise ValidationError({"end_at": "Exam end time has already passed."})
    return _record_status_change(
        exam,
        old_status=exam.status,
        new_status="live",
        changed_by=changed_by,
        remarks=remarks or "Exam marked live manually.",
    )


@transaction.atomic
def mark_exam_completed(exam, *, changed_by=None, remarks=""):
    if exam.status == "cancelled":
        raise ValidationError({"status": "Cancelled exams cannot be completed."})
    return _record_status_change(
        exam,
        old_status=exam.status,
        new_status="completed",
        changed_by=changed_by,
        remarks=remarks or "Exam marked completed manually.",
    )


@transaction.atomic
def publish_exam(exam, changed_by=None, remarks=""):
    from apps.economy.models import InstituteQuestionUsageActionType
    from apps.economy.services import record_exam_question_bank_usage
    from apps.reports.services import notify_exam_published

    _raise_exam_publish_readiness_errors(build_exam_publish_readiness(exam))

    exam = _record_status_change(
        exam,
        old_status=exam.status,
        new_status="scheduled",
        changed_by=changed_by,
        remarks=remarks,
    )
    record_exam_question_bank_usage(
        exam=exam,
        action_type=InstituteQuestionUsageActionType.EXAM_PUBLISHED,
        performed_by=changed_by,
        metadata={
            "operation": "publish_exam",
            "status": exam.status,
        },
    )
    notify_exam_published(exam, changed_by=changed_by)
    return exam


@transaction.atomic
def cancel_exam(exam, changed_by=None, remarks=""):
    if exam.status == "cancelled":
        raise ValidationError({"status": "Exam is already cancelled."})
    return _record_status_change(
        exam,
        old_status=exam.status,
        new_status="cancelled",
        changed_by=changed_by,
        remarks=remarks,
    )
