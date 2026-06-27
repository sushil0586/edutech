import hashlib
import random
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, F, Window
from django.db.models.functions import RowNumber
from django.utils import timezone

from apps.attempts.models import (
    AttemptIntegrityEvent,
    IntegrityEventSeverity,
    IntegrityEventType,
    ReviewEventType,
    ReviewTaskStatus,
    StudentAnswerReviewEvent,
    StudentAnswerReviewTask,
)
from apps.exams.services import (
    allows_unlimited_attempts,
    is_exam_assigned_to_student,
    resolve_exam_economy_access,
    resolve_security_policy,
)
from apps.exams.models import ExamQuestion
from apps.question_bank.registry import (
    question_type_is_auto_scorable,
    get_question_type_definition,
    question_type_requires_manual_review,
    question_type_supports_multiple_selection,
)
from apps.teachers.models import TeacherProfile


SECTION_TIMER_MODES = {"section", "hybrid"}
INTEGRITY_EVENT_DEDUPE_SECONDS = 5
REVIEW_TASK_UNRESOLVED_STATUSES = {
    ReviewTaskStatus.PENDING,
    ReviewTaskStatus.ASSIGNED,
    ReviewTaskStatus.IN_REVIEW,
    ReviewTaskStatus.RECHECK_REQUESTED,
}
MAX_ATTEMPT_EXTRA_TIME_MINUTES = 180
INTEGRITY_EVENT_CONFIG = {
    IntegrityEventType.FOCUS_LOST: {
        "severity": IntegrityEventSeverity.MEDIUM,
        "counts_as_violation": True,
        "label": "Focus lost",
    },
    IntegrityEventType.VISIBILITY_HIDDEN: {
        "severity": IntegrityEventSeverity.MEDIUM,
        "counts_as_violation": True,
        "label": "Tab hidden",
    },
    IntegrityEventType.FULLSCREEN_EXITED: {
        "severity": IntegrityEventSeverity.HIGH,
        "counts_as_violation": True,
        "label": "Fullscreen exited",
    },
    IntegrityEventType.FULLSCREEN_RESTORED: {
        "severity": IntegrityEventSeverity.LOW,
        "counts_as_violation": False,
        "label": "Fullscreen restored",
    },
    IntegrityEventType.CONNECTION_LOST: {
        "severity": IntegrityEventSeverity.MEDIUM,
        "counts_as_violation": False,
        "label": "Connection lost",
    },
    IntegrityEventType.CONNECTION_RESTORED: {
        "severity": IntegrityEventSeverity.LOW,
        "counts_as_violation": False,
        "label": "Connection restored",
    },
    IntegrityEventType.WARNING_THRESHOLD_REACHED: {
        "severity": IntegrityEventSeverity.HIGH,
        "counts_as_violation": False,
        "label": "Warning threshold reached",
    },
}


def normalized_accommodation_profile(student):
    raw_profile = (
        student.accommodation_profile
        if isinstance(getattr(student, "accommodation_profile", {}), dict)
        else {}
    )

    def integer_value(key):
        value = raw_profile.get(key, 0)
        try:
            numeric = int(value)
        except (TypeError, ValueError):
            return 0
        return max(numeric, 0)

    def string_value(key):
        value = raw_profile.get(key, "")
        return value.strip() if isinstance(value, str) else ""

    extra_time_minutes = min(
        integer_value("extra_time_minutes"),
        MAX_ATTEMPT_EXTRA_TIME_MINUTES,
    )
    extra_time_percentage = min(integer_value("extra_time_percentage"), 300)
    additional_violation_allowance = min(
        integer_value("additional_violation_allowance"),
        2,
    )
    simplified_warning_copy = bool(raw_profile.get("simplified_warning_copy", False))
    alternative_instructions = string_value("alternative_instructions")
    notes = string_value("notes")

    has_accommodations = any(
        [
            extra_time_minutes > 0,
            extra_time_percentage > 0,
            additional_violation_allowance > 0,
            simplified_warning_copy,
            bool(alternative_instructions),
            bool(notes),
        ]
    )

    return {
        "has_accommodations": has_accommodations,
        "extra_time_minutes": extra_time_minutes,
        "extra_time_percentage": extra_time_percentage,
        "additional_violation_allowance": additional_violation_allowance,
        "simplified_warning_copy": simplified_warning_copy,
        "alternative_instructions": alternative_instructions,
        "notes": notes,
        "source": "student_profile" if has_accommodations else "none",
    }


def build_attempt_accommodation_snapshot(student, exam):
    profile = normalized_accommodation_profile(student)
    base_duration_minutes = int(getattr(exam, "duration_minutes", 0) or 0)
    percentage_extra_minutes = 0
    if profile["extra_time_percentage"] > 0 and base_duration_minutes > 0:
        percentage_extra_minutes = max(
            int(round(base_duration_minutes * (profile["extra_time_percentage"] / 100))),
            0,
        )

    applied_extra_time_minutes = min(
        profile["extra_time_minutes"] + percentage_extra_minutes,
        MAX_ATTEMPT_EXTRA_TIME_MINUTES,
    )
    effective_duration_minutes = base_duration_minutes + applied_extra_time_minutes

    return {
        **profile,
        "base_duration_minutes": base_duration_minutes,
        "applied_extra_time_minutes": applied_extra_time_minutes,
        "effective_duration_minutes": effective_duration_minutes,
    }


def resolve_attempt_security_policy(attempt):
    policy = resolve_security_policy(attempt.exam)
    metadata = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    snapshot = metadata.get("accommodation_snapshot", {})
    if not isinstance(snapshot, dict):
        snapshot = {}

    adjusted_policy = dict(policy)
    allowance = max(int(snapshot.get("additional_violation_allowance", 0) or 0), 0)
    if adjusted_policy.get("violation_limit_enabled") and adjusted_policy.get("violation_limit") is not None:
        adjusted_policy["violation_limit"] = adjusted_policy["violation_limit"] + allowance

    if snapshot.get("simplified_warning_copy"):
        adjusted_policy["student_warning_copy"] = (
            "Follow the exam steps shown on this page. If something goes wrong, stay here and ask for help before retrying."
        )

    if allowance > 0 and adjusted_policy.get("violation_limit_enabled"):
        adjusted_policy["student_warning_copy"] = (
            f"{adjusted_policy['student_warning_copy']} "
            f"This approved support plan allows {allowance} extra warning"
            f"{'' if allowance == 1 else 's'} before automatic action."
        )
        adjusted_policy["teacher_monitoring_copy"] = (
            f"{adjusted_policy['teacher_monitoring_copy']} "
            f"This attempt includes an accommodation allowance of {allowance} extra warning"
            f"{'' if allowance == 1 else 's'}."
        )

    adjusted_policy["accommodation_adjusted"] = allowance > 0 or snapshot.get("simplified_warning_copy", False)
    return adjusted_policy


def validate_student_exam_scope(student, exam):
    if student.institute_id != exam.institute_id:
        raise ValidationError({"student": "Student and exam must belong to the same institute."})
    if student.academic_year_id != exam.academic_year_id:
        raise ValidationError({"student": "Student academic year must match the exam."})
    if student.program_id != exam.program_id:
        raise ValidationError({"student": "Student program must match the exam."})
    if exam.cohort_id and student.cohort_id != exam.cohort_id:
        raise ValidationError({"student": "Student cohort must match the exam cohort."})


def validate_attempt_window(exam, at_time=None):
    current_time = at_time or timezone.now()

    if not exam.is_active:
        raise ValidationError({"exam": "Exam is inactive."})
    if exam.status not in {"scheduled", "live"}:
        raise ValidationError({"exam": "Attempt can only start for scheduled or live exams."})
    if exam.start_at and current_time < exam.start_at:
        raise ValidationError({"exam": "Exam has not started yet."})
    if exam.end_at and current_time > exam.end_at:
        raise ValidationError({"exam": "Exam is no longer available for attempts."})


def _integrity_event_config(event_type):
    if event_type not in INTEGRITY_EVENT_CONFIG:
        raise ValidationError({"event_type": "Unsupported integrity event type."})
    return INTEGRITY_EVENT_CONFIG[event_type]


def _get_next_attempt_number(student, exam):
    latest_attempt = (
        exam.attempts.select_for_update()
        .filter(student=student)
        .order_by("-attempt_no")
        .first()
    )
    max_attempt = latest_attempt.attempt_no if latest_attempt else 0
    next_attempt_no = max_attempt + 1
    if not allows_unlimited_attempts(exam) and next_attempt_no > exam.max_attempts:
        raise ValidationError({"attempt_no": "Maximum attempts reached for this exam."})
    return next_attempt_no


def _build_runtime_config_snapshot(exam):
    sections = []
    for section in exam.sections.filter(is_active=True).order_by("section_order", "created_at"):
        sections.append(
            {
                "id": str(section.id),
                "name": section.name,
                "section_order": section.section_order,
                "timer_enabled": section.timer_enabled,
                "duration_minutes": section.duration_minutes,
                "allow_skip_section": section.allow_skip_section,
                "lock_after_submit": section.lock_after_submit,
            }
        )

    return {
        "timer_mode": exam.timer_mode,
        "navigation_mode": exam.navigation_mode,
        "attempt_policy": exam.attempt_policy,
        "result_publish_mode": exam.result_publish_mode,
        "review_mode": exam.review_mode,
        "security_mode": exam.security_mode,
        "allow_resume": exam.allow_resume,
        "allow_section_switching": exam.allow_section_switching,
        "allow_return_to_previous_section": exam.allow_return_to_previous_section,
        "randomize_questions": exam.randomize_questions,
        "randomize_options": exam.randomize_options,
        "allow_review_after_submit": exam.allow_review_after_submit,
        "show_result_immediately": exam.show_result_immediately,
        "allow_late_submit": exam.allow_late_submit,
        "max_attempts": exam.max_attempts,
        "sections": sections,
    }


def _serialize_datetime(value):
    return value.isoformat() if value is not None else None


def _parse_datetime(value):
    if not value:
        return None
    if hasattr(value, "tzinfo"):
        return value
    try:
        return timezone.datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def _calculate_attempt_expires_at(exam, started_at, *, extra_time_minutes=0):
    duration_minutes = exam.duration_minutes
    if exam.timer_mode == "section":
        section_durations = [
            section.duration_minutes
            for section in exam.sections.filter(is_active=True).order_by(
                "section_order",
                "created_at",
            )
            if section.duration_minutes
        ]
        if section_durations:
            duration_minutes = sum(section_durations)

    duration_minutes = (duration_minutes or 0) + max(int(extra_time_minutes or 0), 0)
    expires_at = started_at + timedelta(minutes=duration_minutes)
    if exam.end_at and expires_at > exam.end_at:
        expires_at = exam.end_at
    return expires_at


def _build_section_runtime_snapshot(exam, started_at):
    active_sections = list(
        exam.sections.filter(is_active=True).order_by("section_order", "created_at")
    )
    first_section = active_sections[0] if active_sections else None
    section_states = []
    for section in active_sections:
        timer_enabled = exam.timer_mode in SECTION_TIMER_MODES and bool(
            section.duration_minutes
        ) and (exam.timer_mode == "section" or section.timer_enabled)
        section_states.append(
            {
                "section_id": str(section.id),
                "section_name": section.name,
                "section_order": section.section_order,
                "timer_enabled": timer_enabled,
                "duration_minutes": section.duration_minutes,
                "started_at": None,
                "expires_at": None,
                "completed_at": None,
            }
        )

    runtime = {
        "current_section_id": str(first_section.id) if first_section else None,
        "current_section_name": first_section.name if first_section else None,
        "current_section_order": first_section.section_order if first_section else None,
        "current_section_started_at": None,
        "current_section_expires_at": None,
        "current_section_timer_enabled": False,
        "visited_section_ids": [str(first_section.id)] if first_section else [],
        "highest_section_order_reached": first_section.section_order if first_section else None,
        "section_states": section_states,
    }
    if first_section:
        state = next(
            (
                item
                for item in section_states
                if item["section_id"] == str(first_section.id)
            ),
            None,
        )
        if state is not None:
            _activate_section_state(runtime, state, started_at)
    return runtime


def _activate_section_state(section_runtime, section_state, activated_at):
    if section_state.get("started_at") is None:
        section_state["started_at"] = _serialize_datetime(activated_at)
        if section_state.get("timer_enabled") and section_state.get("duration_minutes"):
            expires_at = activated_at + timedelta(
                minutes=section_state["duration_minutes"]
            )
            section_state["expires_at"] = _serialize_datetime(expires_at)
    section_runtime["current_section_id"] = section_state.get("section_id")
    section_runtime["current_section_name"] = section_state.get("section_name")
    section_runtime["current_section_order"] = section_state.get("section_order")
    section_runtime["current_section_started_at"] = section_state.get("started_at")
    section_runtime["current_section_expires_at"] = section_state.get("expires_at")
    section_runtime["current_section_timer_enabled"] = bool(
        section_state.get("timer_enabled") and section_state.get("expires_at")
    )


def _section_state_map(section_runtime):
    states = section_runtime.get("section_states", [])
    return {
        state.get("section_id"): state
        for state in states
        if isinstance(state, dict) and state.get("section_id")
    }


def _runtime_config(attempt):
    metadata = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    runtime_config = metadata.get("runtime_config", {})
    return runtime_config if isinstance(runtime_config, dict) else {}


def _delivery_snapshot(attempt):
    metadata = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    delivery_snapshot = metadata.get("delivery_snapshot", {})
    return delivery_snapshot if isinstance(delivery_snapshot, dict) else {}


def _serialize_integrity_summary(*, violation_count, policy, events):
    violation_limit = policy.get("violation_limit")
    remaining_before_action = None
    threshold_reached = False
    if policy.get("violation_limit_enabled") and violation_limit is not None:
        remaining_before_action = max(violation_limit - violation_count, 0)
        threshold_reached = violation_count >= violation_limit

    latest_event = events[0] if events else None
    return {
        "violation_count": violation_count,
        "violation_limit": violation_limit,
        "remaining_before_action": remaining_before_action,
        "threshold_reached": threshold_reached,
        "latest_event": (
            {
                "event_type": latest_event.event_type,
                "severity": latest_event.severity,
                "counts_as_violation": latest_event.counts_as_violation,
                "event_at": _serialize_datetime(latest_event.event_at),
                "metadata": latest_event.metadata,
            }
            if latest_event
            else None
        ),
        "recent_events": [
            {
                "event_type": event.event_type,
                "severity": event.severity,
                "counts_as_violation": event.counts_as_violation,
                "event_at": _serialize_datetime(event.event_at),
                "metadata": event.metadata,
            }
            for event in events
        ],
    }


def hydrate_attempt_integrity_summaries(attempts):
    attempts = list(attempts)
    if not attempts:
        return attempts

    attempt_ids = [attempt.id for attempt in attempts]
    violation_counts = {
        row["attempt_id"]: row["violation_count"]
        for row in AttemptIntegrityEvent.objects.filter(
            attempt_id__in=attempt_ids,
            is_active=True,
            counts_as_violation=True,
        )
        .values("attempt_id")
        .annotate(violation_count=Count("id"))
    }
    recent_events = (
        AttemptIntegrityEvent.objects.filter(
            attempt_id__in=attempt_ids,
            is_active=True,
        )
        .annotate(
            event_rank=Window(
                expression=RowNumber(),
                partition_by=[F("attempt_id")],
                order_by=[F("event_at").desc(), F("created_at").desc()],
            )
        )
        .filter(event_rank__lte=5)
        .order_by("attempt_id", "-event_at", "-created_at")
    )

    events_by_attempt = {}
    for event in recent_events:
        events_by_attempt.setdefault(event.attempt_id, []).append(event)

    for attempt in attempts:
        if hasattr(attempt, "_integrity_summary_cache"):
            continue
        policy = resolve_attempt_security_policy(attempt)
        attempt._integrity_summary_cache = _serialize_integrity_summary(
            violation_count=violation_counts.get(attempt.id, 0),
            policy=policy,
            events=events_by_attempt.get(attempt.id, []),
        )

    return attempts


def attempt_integrity_summary(attempt):
    cached = getattr(attempt, "_integrity_summary_cache", None)
    if cached is not None:
        return cached

    policy = resolve_attempt_security_policy(attempt)
    events = list(
        attempt.integrity_events.filter(is_active=True).order_by("-event_at", "-created_at")[:5]
    )
    violation_count = attempt.integrity_events.filter(
        is_active=True,
        counts_as_violation=True,
    ).count()
    summary = _serialize_integrity_summary(
        violation_count=violation_count,
        policy=policy,
        events=events,
    )
    attempt._integrity_summary_cache = summary
    return summary


@transaction.atomic
def log_integrity_event(attempt, *, event_type, metadata=None, event_at=None):
    if attempt.status != "in_progress":
        raise ValidationError({"attempt": "Integrity events can only be recorded for in-progress attempts."})

    config = _integrity_event_config(event_type)
    now = event_at or timezone.now()
    metadata = metadata if isinstance(metadata, dict) else {}
    latest_similar = (
        attempt.integrity_events.filter(
            is_active=True,
            event_type=event_type,
        )
        .order_by("-event_at", "-created_at")
        .first()
    )
    if latest_similar is not None:
        delta_seconds = abs((now - latest_similar.event_at).total_seconds())
        if delta_seconds < INTEGRITY_EVENT_DEDUPE_SECONDS:
            return {
                "event": latest_similar,
                "summary": attempt_integrity_summary(attempt),
                "duplicate": True,
                "auto_submitted": False,
                "status_changed": False,
            }

    event = AttemptIntegrityEvent.objects.create(
        institute=attempt.institute,
        attempt=attempt,
        exam=attempt.exam,
        student=attempt.student,
        event_type=event_type,
        severity=config["severity"],
        counts_as_violation=config["counts_as_violation"],
        event_at=now,
        metadata=metadata,
    )

    auto_submitted = False
    status_changed = False
    policy = resolve_attempt_security_policy(attempt)
    summary = attempt_integrity_summary(attempt)
    if (
        event.counts_as_violation
        and policy.get("violation_limit_enabled")
        and summary["threshold_reached"]
    ):
        AttemptIntegrityEvent.objects.create(
            institute=attempt.institute,
            attempt=attempt,
            exam=attempt.exam,
            student=attempt.student,
            event_type=IntegrityEventType.WARNING_THRESHOLD_REACHED,
            severity=IntegrityEventSeverity.HIGH,
            counts_as_violation=False,
            event_at=now,
            metadata={
                "violation_count": summary["violation_count"],
                "violation_limit": summary["violation_limit"],
                "violation_action": policy.get("violation_action"),
            },
        )
        if policy.get("violation_action") == "auto_submit":
            attempt = submit_attempt(attempt, auto_submitted=True)
            auto_submitted = True
            status_changed = True
        summary = attempt_integrity_summary(attempt)

    return {
        "event": event,
        "summary": summary,
        "duplicate": False,
        "auto_submitted": auto_submitted,
        "status_changed": status_changed,
    }


def _stable_random(seed_value):
    digest = hashlib.sha256(seed_value.encode("utf-8")).hexdigest()
    return random.Random(int(digest[:16], 16))


def _build_delivery_snapshot(attempt):
    exam_questions = list(
        attempt.exam.exam_questions.filter(is_active=True)
        .select_related("question")
        .prefetch_related("question__options")
        .order_by("question_order", "created_at")
    )
    runtime_config = _runtime_config(attempt)
    question_ids = [str(exam_question.id) for exam_question in exam_questions]

    if runtime_config.get("randomize_questions"):
        rng = _stable_random(f"{attempt.id}:questions")
        rng.shuffle(question_ids)

    option_order = {}
    for exam_question in exam_questions:
        option_ids = [
            str(option.id)
            for option in sorted(
                [item for item in exam_question.question.options.all() if item.is_active],
                key=lambda item: (item.option_order, item.created_at),
            )
        ]
        if runtime_config.get("randomize_options"):
            rng = _stable_random(f"{attempt.id}:question:{exam_question.question_id}:options")
            rng.shuffle(option_ids)
        option_order[str(exam_question.question_id)] = option_ids

    return {
        "question_order": question_ids,
        "option_order": option_order,
    }


def ensure_delivery_snapshot(attempt, *, persist=True):
    metadata = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    snapshot = _delivery_snapshot(attempt)
    if snapshot.get("question_order") and snapshot.get("option_order") is not None:
        return snapshot

    snapshot = _build_delivery_snapshot(attempt)
    metadata["delivery_snapshot"] = snapshot
    attempt.metadata = metadata
    if persist:
        attempt.save(update_fields=["metadata", "updated_at"])
    return snapshot


def ordered_exam_questions_for_attempt(attempt, exam_questions):
    snapshot = ensure_delivery_snapshot(attempt)
    order_ids = snapshot.get("question_order", [])
    by_id = {str(exam_question.id): exam_question for exam_question in exam_questions}
    ordered = [by_id[item_id] for item_id in order_ids if item_id in by_id]
    remaining = [
        exam_question
        for exam_question in exam_questions
        if str(exam_question.id) not in order_ids
    ]
    remaining.sort(key=lambda item: (item.question_order, item.created_at))
    ordered.extend(remaining)
    return ordered


def question_order_map_for_attempt(attempt, exam_questions):
    ordered = ordered_exam_questions_for_attempt(attempt, exam_questions)
    return {
        str(exam_question.id): index + 1
        for index, exam_question in enumerate(ordered)
    }


def ordered_options_for_attempt(attempt, question, options):
    snapshot = ensure_delivery_snapshot(attempt)
    order_ids = (
        snapshot.get("option_order", {}).get(str(question.id), [])
        if isinstance(snapshot.get("option_order"), dict)
        else []
    )
    by_id = {str(option.id): option for option in options}
    ordered = [by_id[item_id] for item_id in order_ids if item_id in by_id]
    remaining = [option for option in options if str(option.id) not in order_ids]
    remaining.sort(key=lambda item: (item.option_order, item.created_at))
    ordered.extend(remaining)
    return ordered


@transaction.atomic
def start_attempt(student, exam):
    from apps.attempts.models import StudentExamAttempt

    validate_student_exam_scope(student, exam)
    if not is_exam_assigned_to_student(exam, student):
        raise ValidationError(
            {"exam": "This exam is not assigned to the selected student."}
        )
    economy_access = resolve_exam_economy_access(student, exam)
    if economy_access["is_locked"]:
        raise ValidationError(
            {
                "exam": (
                    economy_access["lock_reason_message"]
                    or "This exam must be unlocked before you can start it."
                )
            }
        )
    validate_attempt_window(exam)

    if exam.attempts.filter(student=student, status="in_progress", is_active=True).exists():
        raise ValidationError(
            {"attempt": "Student already has an in-progress attempt for this exam."}
        )

    next_attempt_no = _get_next_attempt_number(student, exam)
    started_at = timezone.now()
    accommodation_snapshot = build_attempt_accommodation_snapshot(student, exam)
    expires_at = _calculate_attempt_expires_at(
        exam,
        started_at,
        extra_time_minutes=accommodation_snapshot["applied_extra_time_minutes"],
    )

    total_questions = exam.exam_questions.filter(is_active=True).count()
    if total_questions == 0:
        raise ValidationError({"exam": "Exam must have active questions before attempts can start."})

    attempt = StudentExamAttempt.objects.create(
        institute=exam.institute,
        exam=exam,
        student=student,
        attempt_no=next_attempt_no,
        status="in_progress",
        started_at=started_at,
        expires_at=expires_at,
        total_questions=total_questions,
        metadata={
            "accommodation_snapshot": accommodation_snapshot,
            "runtime_config": _build_runtime_config_snapshot(exam),
            "section_runtime": _build_section_runtime_snapshot(exam, started_at),
        },
    )
    ensure_delivery_snapshot(attempt)
    return attempt


def _section_runtime(attempt):
    metadata = attempt.metadata or {}
    section_runtime = metadata.get("section_runtime")
    if isinstance(section_runtime, dict) and section_runtime.get("section_states") is not None:
        return section_runtime
    section_runtime = _build_section_runtime_snapshot(attempt.exam, attempt.started_at)
    metadata["section_runtime"] = section_runtime
    attempt.metadata = metadata
    return section_runtime


def _section_lookup(exam):
    sections = list(exam.sections.filter(is_active=True).order_by("section_order", "created_at"))
    by_id = {str(section.id): section for section in sections}
    return sections, by_id


def _question_section_id(exam_question):
    if exam_question.section_id:
        return str(exam_question.section_id)
    return None


def refresh_attempt_runtime_state(attempt, *, at_time=None, persist=True):
    if attempt.status != "in_progress":
        return attempt

    current_time = at_time or timezone.now()
    metadata = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    section_runtime = _section_runtime(attempt)
    runtime_config = _runtime_config(attempt)
    timer_mode = runtime_config.get("timer_mode") or getattr(
        attempt.exam,
        "timer_mode",
        "global",
    )
    states_by_id = _section_state_map(section_runtime)
    changed = False
    attempt_changed = False

    if timer_mode not in SECTION_TIMER_MODES or not states_by_id:
        return attempt

    current_section_id = section_runtime.get("current_section_id")
    current_state = states_by_id.get(current_section_id)
    if current_state is None and states_by_id:
        current_state = next(iter(states_by_id.values()))
        _activate_section_state(section_runtime, current_state, attempt.started_at)
        changed = True

    while current_state is not None:
        if current_state.get("started_at") is None:
            _activate_section_state(section_runtime, current_state, current_time)
            changed = True

        expires_at = _parse_datetime(current_state.get("expires_at"))
        if expires_at is None or current_time < expires_at:
            _activate_section_state(
                section_runtime,
                current_state,
                _parse_datetime(current_state.get("started_at")) or current_time,
            )
            break

        if current_state.get("completed_at") is None:
            current_state["completed_at"] = _serialize_datetime(expires_at)
            changed = True

        next_state = next(
            (
                state
                for state in section_runtime.get("section_states", [])
                if state.get("section_order", 0) > current_state.get("section_order", 0)
            ),
            None,
        )
        if next_state is None:
            section_runtime["current_section_id"] = None
            section_runtime["current_section_name"] = None
            section_runtime["current_section_order"] = None
            section_runtime["current_section_started_at"] = None
            section_runtime["current_section_expires_at"] = None
            section_runtime["current_section_timer_enabled"] = False
            if attempt.expires_at is None or attempt.expires_at > expires_at:
                attempt.expires_at = expires_at
                attempt_changed = True
            changed = True
            break

        visited = set(section_runtime.get("visited_section_ids") or [])
        visited.add(str(next_state["section_id"]))
        section_runtime["visited_section_ids"] = list(visited)
        previous_highest = section_runtime.get(
            "highest_section_order_reached"
        ) or next_state.get("section_order")
        section_runtime["highest_section_order_reached"] = max(
            previous_highest,
            next_state.get("section_order") or previous_highest,
        )
        activation_time = max(expires_at, current_time)
        _activate_section_state(section_runtime, next_state, activation_time)
        changed = True
        current_state = next_state

    if changed:
        metadata["section_runtime"] = section_runtime
        attempt.metadata = metadata
        if persist:
            update_fields = ["metadata", "updated_at"]
            if attempt_changed:
                update_fields.append("expires_at")
            attempt.save(update_fields=update_fields)
    elif attempt_changed and persist:
        attempt.save(update_fields=["expires_at", "updated_at"])

    return attempt


def sync_attempt_access_state(attempt, *, at_time=None, persist=True):
    current_time = at_time or timezone.now()
    refresh_attempt_runtime_state(attempt, at_time=current_time, persist=persist)

    if (
        attempt.status == "in_progress"
        and attempt.expires_at is not None
        and current_time >= attempt.expires_at
    ):
        return _auto_submit_expired_attempt(attempt)

    return attempt


def _ensure_question_accessible_for_attempt(attempt, exam_question):
    refresh_attempt_runtime_state(attempt)
    config = _runtime_config(attempt)
    navigation_mode = config.get("navigation_mode") or getattr(attempt.exam, "navigation_mode", "free_exam")
    allow_section_switching = config.get("allow_section_switching", True)
    current_section_id = _section_runtime(attempt).get("current_section_id")
    question_section_id = _question_section_id(exam_question)

    if navigation_mode == "free_exam":
        return
    if question_section_id is None:
        return
    if current_section_id is None:
        return
    if question_section_id == current_section_id:
        return
    if navigation_mode == "hybrid" and allow_section_switching:
        return
    raise ValidationError(
        {"question": "This question is outside the currently active section."}
    )


@transaction.atomic
def switch_section(attempt, target_section):
    refresh_attempt_runtime_state(attempt)
    _validate_attempt_is_editable(attempt)

    if target_section.exam_id != attempt.exam_id:
        raise ValidationError({"section": "Section must belong to the same exam."})

    metadata = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    runtime_config = _runtime_config(attempt)
    section_runtime = _section_runtime(attempt)
    navigation_mode = runtime_config.get("navigation_mode") or attempt.exam.navigation_mode
    allow_section_switching = runtime_config.get(
        "allow_section_switching",
        attempt.exam.allow_section_switching,
    )
    allow_return = runtime_config.get(
        "allow_return_to_previous_section",
        attempt.exam.allow_return_to_previous_section,
    )

    current_section_id = section_runtime.get("current_section_id")
    if current_section_id == str(target_section.id):
        return attempt

    sections, by_id = _section_lookup(attempt.exam)
    if str(target_section.id) not in by_id:
        raise ValidationError({"section": "Section is not active for this exam."})

    target_state = _section_state_map(section_runtime).get(str(target_section.id))
    target_expires_at = _parse_datetime(target_state.get("expires_at")) if target_state else None
    if target_expires_at and timezone.now() >= target_expires_at:
        raise ValidationError({"section": "The timer for this section has already expired."})

    current_section = by_id.get(str(current_section_id)) if current_section_id else None
    highest_reached = section_runtime.get("highest_section_order_reached")

    if navigation_mode == "free_section" and not allow_section_switching:
        raise ValidationError({"section": "Switching sections is not allowed for this exam."})

    if navigation_mode == "sequential":
        if current_section and target_section.section_order < current_section.section_order and not allow_return:
            raise ValidationError({"section": "Returning to previous sections is not allowed."})
        if current_section and target_section.section_order > current_section.section_order + 1:
            raise ValidationError({"section": "Sections must be opened in sequence."})
        if highest_reached and target_section.section_order > highest_reached + 1:
            raise ValidationError({"section": "You cannot jump ahead to that section yet."})

    if navigation_mode == "hybrid":
        if not allow_section_switching:
            raise ValidationError({"section": "Switching sections is not allowed for this exam."})
        if current_section and target_section.section_order < current_section.section_order and not allow_return:
            raise ValidationError({"section": "Returning to previous sections is not allowed."})

    visited = set(section_runtime.get("visited_section_ids") or [])
    visited.add(str(target_section.id))
    section_runtime["visited_section_ids"] = list(visited)
    previous_highest = highest_reached or target_section.section_order
    section_runtime["highest_section_order_reached"] = max(
        previous_highest,
        target_section.section_order,
    )
    if target_state is not None:
        _activate_section_state(section_runtime, target_state, timezone.now())
    metadata["section_runtime"] = section_runtime
    attempt.metadata = metadata
    attempt.save(update_fields=["metadata", "updated_at"])
    return attempt


def _validate_attempt_is_editable(attempt):
    refresh_attempt_runtime_state(attempt)
    if attempt.expires_at and timezone.now() > attempt.expires_at:
        raise ValidationError({"attempt": ["Attempt has expired. Refresh the attempt state."]})
    if attempt.status != "in_progress":
        raise ValidationError({"attempt": ["Answers cannot be changed after the attempt is submitted."]})


def _normalized_selected_option_ids(selected_option_ids):
    if not selected_option_ids:
        return []
    return [str(option_id) for option_id in selected_option_ids if str(option_id).strip()]


def _normalized_answer_text(answer_text):
    return " ".join(str(answer_text or "").strip().lower().split())


def _accepted_answers_for_question(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    accepted_answers = metadata.get("accepted_answers")
    if isinstance(accepted_answers, list):
        return [
            _normalized_answer_text(value)
            for value in accepted_answers
            if _normalized_answer_text(value)
        ]

    single_answer = metadata.get("accepted_answer") or metadata.get("answer_key")
    normalized = _normalized_answer_text(single_answer)
    return [normalized] if normalized else []


def _fill_in_blanks_answer_parts(answer_text):
    raw_text = str(answer_text or "").strip()
    if not raw_text:
        return []

    if "|" in raw_text:
        parts = raw_text.split("|")
    else:
        parts = raw_text.splitlines()

    return [
        _normalized_answer_text(part)
        for part in parts
        if _normalized_answer_text(part)
    ]


def _accepted_numeric_answers_for_question(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    values = metadata.get("accepted_answers")
    if not isinstance(values, list):
        single_value = metadata.get("accepted_answer") or metadata.get("answer_key")
        values = [single_value] if single_value not in (None, "") else []

    normalized = []
    for value in values:
        text = str(value or "").strip().replace(",", "")
        if not text:
            continue
        try:
            decimal_value = Decimal(text)
        except (InvalidOperation, TypeError, ValueError):
            continue
        normalized.append(decimal_value)
    return normalized


def _numeric_tolerance_for_question(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    numeric_validation = metadata.get("numeric_validation", {})
    if not isinstance(numeric_validation, dict):
        return Decimal("0")
    raw_tolerance = numeric_validation.get("tolerance")
    if raw_tolerance in (None, ""):
        return Decimal("0")
    try:
        tolerance = Decimal(str(raw_tolerance).replace(",", ""))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")
    return tolerance if tolerance >= 0 else Decimal("0")


def _question_has_response(answer):
    if answer is None:
        return False
    return bool(
        answer.selected_option_id
        or _normalized_selected_option_ids(getattr(answer, "selected_option_ids", []))
        or (answer.answer_text or "").strip()
        or (answer.answer_transcript or "").strip()
        or bool(getattr(answer, "response_artifacts", []) or [])
    )


def ensure_review_task_for_answer(answer):
    task, created = StudentAnswerReviewTask.objects.get_or_create(
        answer=answer,
        defaults={
            "institute": answer.attempt.institute,
            "attempt": answer.attempt,
            "exam": answer.attempt.exam,
            "student": answer.attempt.student,
            "question": answer.question,
            "status": ReviewTaskStatus.PENDING,
            "opened_at": timezone.now(),
        },
    )
    if created:
        StudentAnswerReviewEvent.objects.create(
            review_task=task,
            answer=answer,
            attempt=answer.attempt,
            exam=answer.attempt.exam,
            student=answer.attempt.student,
            question=answer.question,
            event_type=ReviewEventType.TASK_OPENED,
            from_status="",
            to_status=task.status,
            marks_awarded=answer.marks_awarded,
            notes="Manual review task opened.",
        )
    return task


def sync_review_task_for_answer(answer):
    question_type_definition = get_question_type_definition(answer.question.question_type)
    if question_type_definition is None or not question_type_requires_manual_review(answer.question.question_type):
        return None

    has_response = _question_has_response(answer)
    existing_task = getattr(answer, "review_task", None)

    if not has_response:
        if existing_task and existing_task.is_active:
            existing_task.is_active = False
            existing_task.status = ReviewTaskStatus.CANCELLED
            existing_task.resolved_at = timezone.now()
            existing_task.save(update_fields=["is_active", "status", "resolved_at", "updated_at"])
        return None

    task = ensure_review_task_for_answer(answer)
    updates = []
    if not task.is_active:
        task.is_active = True
        updates.append("is_active")
    if task.status in {
        ReviewTaskStatus.REVIEWED,
        ReviewTaskStatus.MODERATED,
        ReviewTaskStatus.CANCELLED,
    }:
        task.status = ReviewTaskStatus.PENDING
        task.resolved_at = None
        updates.extend(["status", "resolved_at"])
    if task.attempt_id != answer.attempt_id:
        task.attempt = answer.attempt
        updates.append("attempt")
    if task.exam_id != answer.attempt.exam_id:
        task.exam = answer.attempt.exam
        updates.append("exam")
    if task.student_id != answer.attempt.student_id:
        task.student = answer.attempt.student
        updates.append("student")
    if task.question_id != answer.question_id:
        task.question = answer.question
        updates.append("question")
    if task.institute_id != answer.attempt.institute_id:
        task.institute = answer.attempt.institute
        updates.append("institute")
    if updates:
        updates.append("updated_at")
        task.save(update_fields=updates)
    return task


def _evaluate_choice_answer(*, question, exam_question, selected_option, selected_option_ids):
    normalized_ids = _normalized_selected_option_ids(selected_option_ids)

    if question_type_supports_multiple_selection(question.question_type):
        correct_option_ids = {
            str(option.id)
            for option in question.options.filter(is_active=True, is_correct=True)
        }
        selected_ids = set(normalized_ids)
        if selected_ids and selected_ids == correct_option_ids:
            return {
                "is_correct": True,
                "marks_awarded": exam_question.marks,
                "negative_marks_applied": Decimal("0.00"),
            }
        if selected_ids:
            return {
                "is_correct": False,
                "marks_awarded": Decimal("0.00"),
                "negative_marks_applied": exam_question.negative_marks or Decimal("0.00"),
            }
        return {
            "is_correct": False,
            "marks_awarded": Decimal("0.00"),
            "negative_marks_applied": Decimal("0.00"),
        }

    if selected_option:
        if selected_option.is_correct:
            return {
                "is_correct": True,
                "marks_awarded": exam_question.marks,
                "negative_marks_applied": Decimal("0.00"),
            }
        return {
            "is_correct": False,
            "marks_awarded": Decimal("0.00"),
            "negative_marks_applied": exam_question.negative_marks or Decimal("0.00"),
        }
    return {
        "is_correct": False,
        "marks_awarded": Decimal("0.00"),
        "negative_marks_applied": Decimal("0.00"),
    }


def _evaluate_short_answer(*, question, exam_question, answer_text):
    normalized_answer = _normalized_answer_text(answer_text)
    if not normalized_answer:
        return {
            "is_correct": False,
            "marks_awarded": Decimal("0.00"),
            "negative_marks_applied": Decimal("0.00"),
        }

    accepted_answers = _accepted_answers_for_question(question)
    if normalized_answer in accepted_answers:
        return {
            "is_correct": True,
            "marks_awarded": exam_question.marks,
            "negative_marks_applied": Decimal("0.00"),
        }

    return {
        "is_correct": False,
        "marks_awarded": Decimal("0.00"),
        "negative_marks_applied": exam_question.negative_marks or Decimal("0.00"),
    }


def _evaluate_fill_in_blanks_answer(*, question, exam_question, answer_text):
    submitted_parts = _fill_in_blanks_answer_parts(answer_text)
    if not submitted_parts:
        return {
            "is_correct": False,
            "marks_awarded": Decimal("0.00"),
            "negative_marks_applied": Decimal("0.00"),
        }

    accepted_answers = _accepted_answers_for_question(question)
    if len(submitted_parts) != len(accepted_answers):
        return {
            "is_correct": False,
            "marks_awarded": Decimal("0.00"),
            "negative_marks_applied": exam_question.negative_marks or Decimal("0.00"),
        }

    if all(submitted == expected for submitted, expected in zip(submitted_parts, accepted_answers)):
        return {
            "is_correct": True,
            "marks_awarded": exam_question.marks,
            "negative_marks_applied": Decimal("0.00"),
        }

    return {
        "is_correct": False,
        "marks_awarded": Decimal("0.00"),
        "negative_marks_applied": exam_question.negative_marks or Decimal("0.00"),
    }


def _evaluate_numeric_answer(*, question, exam_question, answer_text):
    raw_answer = str(answer_text or "").strip().replace(",", "")
    if not raw_answer:
        return {
            "is_correct": False,
            "marks_awarded": Decimal("0.00"),
            "negative_marks_applied": Decimal("0.00"),
        }

    try:
        submitted_value = Decimal(raw_answer)
    except (InvalidOperation, TypeError, ValueError):
        return {
            "is_correct": False,
            "marks_awarded": Decimal("0.00"),
            "negative_marks_applied": exam_question.negative_marks or Decimal("0.00"),
        }

    accepted_answers = _accepted_numeric_answers_for_question(question)
    tolerance = _numeric_tolerance_for_question(question)

    for accepted_value in accepted_answers:
        if abs(submitted_value - accepted_value) <= tolerance:
            return {
                "is_correct": True,
                "marks_awarded": exam_question.marks,
                "negative_marks_applied": Decimal("0.00"),
            }

    return {
        "is_correct": False,
        "marks_awarded": Decimal("0.00"),
        "negative_marks_applied": exam_question.negative_marks or Decimal("0.00"),
    }


def _manual_review_pending_scoring():
    return {
        "is_correct": False,
        "marks_awarded": Decimal("0.00"),
        "negative_marks_applied": Decimal("0.00"),
    }


def _evaluation_mode_for_question(question):
    definition = get_question_type_definition(question.question_type)
    return definition.evaluation_mode if definition is not None else ""


def _response_mode_for_question(question):
    definition = get_question_type_definition(question.question_type)
    return definition.response_mode if definition is not None else ""


def _authoring_variant_for_question(question):
    definition = get_question_type_definition(question.question_type)
    return definition.authoring_variant if definition is not None else ""


def _normalized_response_artifacts(response_artifacts):
    if not response_artifacts:
        return []
    normalized = []
    for artifact in response_artifacts:
        if not isinstance(artifact, dict):
            continue
        normalized_artifact = {}
        for key in (
            "asset_kind",
            "upload_token",
            "file_name",
            "mime_type",
            "storage_status",
            "checksum",
            "storage_path",
            "file_url",
        ):
            value = str(artifact.get(key, "") or "").strip()
            if value:
                normalized_artifact[key] = value
        for key in ("size_bytes", "duration_seconds"):
            value = artifact.get(key)
            if value in (None, ""):
                continue
            try:
                numeric_value = int(value)
            except (TypeError, ValueError):
                continue
            if numeric_value >= 0:
                normalized_artifact[key] = numeric_value
        if normalized_artifact.get("asset_kind") and normalized_artifact.get("upload_token"):
            normalized.append(normalized_artifact)
    return normalized


def _assign_answer_response_fields(
    *,
    answer,
    question,
    selected_option,
    selected_option_ids,
    answer_text,
    answer_transcript="",
    response_artifacts=None,
):
    response_mode = _response_mode_for_question(question)
    if response_mode in {"multi_choice", "text", "numeric"}:
        answer.selected_option = None
    else:
        answer.selected_option = selected_option
    answer.selected_option_ids = selected_option_ids
    answer.answer_text = answer_text
    if answer_transcript is not None:
        answer.answer_transcript = str(answer_transcript or "").strip()
    if response_artifacts is not None:
        answer.response_artifacts = _normalized_response_artifacts(response_artifacts)


def _question_rubric_definition(question):
    metadata = question.metadata if isinstance(question.metadata, dict) else {}
    rubric = metadata.get("rubric", {})
    if not isinstance(rubric, dict):
        return None

    criteria = rubric.get("criteria", [])
    if not isinstance(criteria, list) or not criteria:
        return None

    normalized = []
    for index, criterion in enumerate(criteria):
        if not isinstance(criterion, dict):
            continue
        key = str(criterion.get("key", "") or "").strip()
        label = str(criterion.get("label", "") or "").strip()
        max_score_raw = criterion.get("max_score")
        if not key or not label or max_score_raw in (None, ""):
            continue
        try:
            max_score = Decimal(str(max_score_raw))
        except (InvalidOperation, TypeError, ValueError):
            continue
        if max_score <= 0:
            continue
        normalized.append(
            {
                "key": key,
                "label": label,
                "max_score": max_score,
                "display_order": int(criterion.get("display_order", index + 1) or (index + 1)),
                "reviewer_hint": str(criterion.get("reviewer_hint", "") or "").strip(),
            }
        )

    if not normalized:
        return None
    return sorted(normalized, key=lambda item: (item["display_order"], item["label"]))


def _normalize_rubric_review_scores(*, question, exam_question, rubric_scores, awarded_marks):
    rubric_definition = _question_rubric_definition(question)
    if rubric_definition is None:
        if rubric_scores:
            raise ValidationError({"rubric_scores": "Rubric scores are only supported for rubric-backed questions."})
        return [], None

    if not isinstance(rubric_scores, list) or not rubric_scores:
        raise ValidationError({"rubric_scores": "Submit criterion-level rubric scores for this question."})

    rubric_by_key = {criterion["key"]: criterion for criterion in rubric_definition}
    normalized_scores = []
    seen_keys = set()
    derived_total = Decimal("0.00")

    for index, score in enumerate(rubric_scores):
        if not isinstance(score, dict):
            raise ValidationError({"rubric_scores": f"Criterion score {index + 1} must be an object."})

        criterion_key = str(score.get("criterion_key", "") or "").strip()
        if not criterion_key:
            raise ValidationError({"rubric_scores": f"Criterion score {index + 1} must include criterion_key."})
        if criterion_key not in rubric_by_key:
            raise ValidationError({"rubric_scores": f"Criterion '{criterion_key}' is not part of this rubric."})
        if criterion_key in seen_keys:
            raise ValidationError({"rubric_scores": f"Criterion '{criterion_key}' is duplicated."})

        criterion = rubric_by_key[criterion_key]
        try:
            criterion_score = Decimal(str(score.get("awarded_score", "") or ""))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValidationError(
                {"rubric_scores": f"Criterion '{criterion['label']}' score must be a valid number."}
            ) from exc

        if criterion_score < 0:
            raise ValidationError({"rubric_scores": f"Criterion '{criterion['label']}' score cannot be negative."})
        if criterion_score > criterion["max_score"]:
            raise ValidationError(
                {
                    "rubric_scores": (
                        f"Criterion '{criterion['label']}' score cannot exceed "
                        f"{format(criterion['max_score'].quantize(Decimal('0.01')), 'f')}."
                    )
                }
            )

        normalized_scores.append(
            {
                "criterion_key": criterion_key,
                "criterion_label": criterion["label"],
                "max_score": format(criterion["max_score"].quantize(Decimal("0.01")), "f"),
                "awarded_score": format(criterion_score.quantize(Decimal("0.01")), "f"),
                "note": str(score.get("note", "") or "").strip(),
            }
        )
        seen_keys.add(criterion_key)
        derived_total += criterion_score

    missing_keys = [criterion["label"] for criterion in rubric_definition if criterion["key"] not in seen_keys]
    if missing_keys:
        raise ValidationError(
            {"rubric_scores": f"Submit scores for every rubric criterion. Missing: {', '.join(missing_keys)}."}
        )

    maximum_marks = exam_question.marks or Decimal("0.00")
    if derived_total > maximum_marks:
        raise ValidationError({"rubric_scores": "Rubric total cannot exceed the configured question marks."})
    if awarded_marks != derived_total:
        raise ValidationError(
            {
                "marks_awarded": (
                    "Marks awarded must match the rubric total "
                    f"({format(derived_total.quantize(Decimal('0.01')), 'f')})."
                )
            }
        )

    return normalized_scores, derived_total


def _score_submitted_answer(
    *,
    question,
    exam_question,
    selected_option,
    selected_option_ids,
    answer_text,
):
    evaluation_mode = _evaluation_mode_for_question(question)
    response_mode = _response_mode_for_question(question)

    if evaluation_mode == "manual_rubric_review":
        return _manual_review_pending_scoring(), "manual_pending"

    if response_mode == "numeric":
        return (
            _evaluate_numeric_answer(
                question=question,
                exam_question=exam_question,
                answer_text=answer_text,
            ),
            "auto_evaluated",
        )

    if response_mode == "text":
        if _authoring_variant_for_question(question) == "fill_in_blanks":
            return (
                _evaluate_fill_in_blanks_answer(
                    question=question,
                    exam_question=exam_question,
                    answer_text=answer_text,
                ),
                "auto_evaluated",
            )
        return (
            _evaluate_short_answer(
                question=question,
                exam_question=exam_question,
                answer_text=answer_text,
            ),
            "auto_evaluated",
        )

    return (
        _evaluate_choice_answer(
            question=question,
            exam_question=exam_question,
            selected_option=selected_option,
            selected_option_ids=selected_option_ids,
        ),
        "auto_evaluated",
    )


def _auto_submit_expired_attempt(attempt):
    if attempt.status != "in_progress":
        return attempt

    scoring = calculate_attempt_score(attempt)
    submitted_at = attempt.expires_at or timezone.now()
    if submitted_at < attempt.started_at:
        submitted_at = timezone.now()
        if submitted_at < attempt.started_at:
            submitted_at = attempt.started_at
    time_taken = max(int((submitted_at - attempt.started_at).total_seconds()), 0)

    attempt.status = "auto_submitted"
    attempt.submitted_at = submitted_at
    attempt.time_taken_seconds = time_taken
    attempt.is_auto_submitted = True

    for field, value in scoring.items():
        setattr(attempt, field, value)

    attempt.save()
    return attempt


@transaction.atomic
def save_answer(
    *,
    attempt,
    question,
    selected_option=None,
    selected_option_ids=None,
    answer_text="",
    answer_transcript="",
    response_artifacts=None,
    time_spent_seconds=None,
    is_marked_for_review=False,
    clear_response=False,
    skip=False,
):
    from apps.attempts.models import StudentAnswer

    _validate_attempt_is_editable(attempt)
    question_type_definition = get_question_type_definition(question.question_type)
    if question_type_definition is None:
        raise ValidationError({"question": "Unsupported question type."})

    try:
        exam_question = attempt.exam.exam_questions.select_related("question").get(
            question=question,
            is_active=True,
        )
    except ExamQuestion.DoesNotExist as exc:
        raise ValidationError({"question": "Question is not part of this exam."}) from exc

    if selected_option and selected_option.question_id != question.id:
        raise ValidationError({"selected_option": "Selected option must belong to the same question."})
    if selected_option and not selected_option.is_active:
        raise ValidationError({"selected_option": "Selected option must be active."})

    selected_option_ids = _normalized_selected_option_ids(selected_option_ids)
    if question_type_supports_multiple_selection(question.question_type):
        valid_option_ids = {
            str(option.id)
            for option in question.options.filter(is_active=True).only("id")
        }
        invalid_ids = sorted(set(selected_option_ids) - valid_option_ids)
        if invalid_ids:
            raise ValidationError(
                {"selected_option_ids": "Selected options must belong to the same active question."}
            )
    elif selected_option_ids:
        raise ValidationError(
            {"selected_option_ids": "Multiple selected options are only supported for multi-select MCQs."}
        )

    _ensure_question_accessible_for_attempt(attempt, exam_question)

    if (
        not question_type_is_auto_scorable(question.question_type)
        and not question_type_requires_manual_review(question.question_type)
    ):
        raise ValidationError(
            {
                "question": (
                    f"Saving answers is not yet enabled for {question_type_definition.label} questions."
                )
            }
        )

    if clear_response or skip:
        selected_option = None
        selected_option_ids = []
        answer_text = ""
        answer_transcript = ""
        response_artifacts = []

    answer, _ = StudentAnswer.objects.get_or_create(
        attempt=attempt,
        question=question,
        defaults={
            "selected_option": selected_option,
            "selected_option_ids": selected_option_ids,
            "answer_text": answer_text,
            "answer_transcript": str(answer_transcript or ""),
            "response_artifacts": _normalized_response_artifacts(response_artifacts),
            "time_spent_seconds": time_spent_seconds,
            "is_marked_for_review": is_marked_for_review,
        },
    )

    _assign_answer_response_fields(
        answer=answer,
        question=question,
        selected_option=selected_option,
        selected_option_ids=selected_option_ids,
        answer_text=answer_text,
        answer_transcript=answer_transcript,
        response_artifacts=response_artifacts,
    )
    answer.time_spent_seconds = time_spent_seconds
    answer.is_marked_for_review = is_marked_for_review
    answer.answered_at = timezone.now()
    answer.reviewed_by_teacher = None
    answer.reviewed_at = None
    answer.review_notes = ""

    scoring, evaluation_status = _score_submitted_answer(
        question=question,
        exam_question=exam_question,
        selected_option=selected_option,
        selected_option_ids=selected_option_ids,
        answer_text=answer_text,
    )
    answer.evaluation_status = (
        StudentAnswer.EvaluationStatus.MANUAL_PENDING
        if evaluation_status == "manual_pending"
        else StudentAnswer.EvaluationStatus.AUTO_EVALUATED
    )
    answer.is_correct = scoring["is_correct"]
    answer.marks_awarded = scoring["marks_awarded"]
    answer.negative_marks_applied = scoring["negative_marks_applied"]

    answer.save()
    sync_review_task_for_answer(answer)
    return answer


@transaction.atomic
def review_manual_answer(*, answer, reviewed_by_teacher, marks_awarded, review_notes="", rubric_scores=None):
    from apps.results.services import generate_result_from_attempt

    question_type_definition = get_question_type_definition(answer.question.question_type)
    if question_type_definition is None or not question_type_requires_manual_review(answer.question.question_type):
        raise ValidationError({"answer": "This answer does not require manual review."})

    try:
        awarded_marks = Decimal(str(marks_awarded))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({"marks_awarded": "Marks awarded must be a valid number."}) from exc

    exam_question = answer.attempt.exam.exam_questions.select_related("question").get(
        question=answer.question,
        is_active=True,
    )
    maximum_marks = exam_question.marks or Decimal("0.00")
    if awarded_marks < 0:
        raise ValidationError({"marks_awarded": "Marks awarded cannot be negative."})
    if awarded_marks > maximum_marks:
        raise ValidationError({"marks_awarded": "Marks awarded cannot exceed the configured question marks."})

    normalized_rubric_scores, rubric_total = _normalize_rubric_review_scores(
        question=answer.question,
        exam_question=exam_question,
        rubric_scores=rubric_scores,
        awarded_marks=awarded_marks,
    )

    task = ensure_review_task_for_answer(answer)
    previous_status = task.status
    note_text = str(review_notes or "").strip()
    reviewed_at = timezone.now()

    answer.evaluation_status = answer.EvaluationStatus.MANUAL_REVIEWED
    answer.marks_awarded = awarded_marks
    answer.negative_marks_applied = Decimal("0.00")
    answer.is_correct = awarded_marks >= maximum_marks and maximum_marks > 0
    answer.reviewed_by_teacher = reviewed_by_teacher
    answer.reviewed_at = reviewed_at
    answer.review_notes = note_text
    answer.save()

    task.status = ReviewTaskStatus.REVIEWED
    task.last_reviewed_by_teacher = reviewed_by_teacher
    task.last_reviewed_at = reviewed_at
    task.latest_marks_awarded = awarded_marks
    task.latest_review_summary = note_text
    task.review_started_at = task.review_started_at or reviewed_at
    task.resolved_at = reviewed_at
    task.is_active = True
    task_metadata = dict(task.metadata or {})
    if normalized_rubric_scores:
        task_metadata["rubric_scores"] = normalized_rubric_scores
        task_metadata["rubric_total"] = format(rubric_total.quantize(Decimal("0.01")), "f")
    else:
        task_metadata.pop("rubric_scores", None)
        task_metadata.pop("rubric_total", None)
    task.metadata = task_metadata
    task.save(
        update_fields=[
            "status",
            "last_reviewed_by_teacher",
            "last_reviewed_at",
            "latest_marks_awarded",
            "latest_review_summary",
            "review_started_at",
            "resolved_at",
            "metadata",
            "is_active",
            "updated_at",
        ]
    )

    StudentAnswerReviewEvent.objects.create(
        review_task=task,
        answer=answer,
        attempt=answer.attempt,
        exam=answer.attempt.exam,
        student=answer.attempt.student,
        question=answer.question,
        actor_teacher=reviewed_by_teacher,
        event_type=ReviewEventType.REVIEW_UPDATED if previous_status == ReviewTaskStatus.REVIEWED else ReviewEventType.REVIEW_SAVED,
        from_status=previous_status,
        to_status=task.status,
        marks_awarded=awarded_marks,
        notes=note_text,
        metadata=(
            {
                "rubric_scores": normalized_rubric_scores,
                "rubric_total": format(rubric_total.quantize(Decimal("0.01")), "f"),
            }
            if normalized_rubric_scores
            else {}
        ),
    )

    scoring = calculate_attempt_score(answer.attempt)
    for field, value in scoring.items():
        setattr(answer.attempt, field, value)
    answer.attempt.save()

    if answer.attempt.status in {"submitted", "auto_submitted"}:
        try:
            generate_result_from_attempt(answer.attempt)
        except ValidationError:
            pass

    return answer


def review_queue_summary(*, queryset):
    tasks = list(queryset)
    pending = 0
    reviewed = 0
    in_review = 0
    assigned = 0
    total = len(tasks)
    unassigned = 0
    reviewer_summary = {}
    exam_summary = {}
    reviewed_turnaround_hours = []
    now = timezone.now()
    oldest_open_hours = 0.0
    recheck_requested = 0
    backlog_age_buckets = {
        "under_4h": 0,
        "under_24h": 0,
        "under_72h": 0,
        "over_72h": 0,
    }
    trend_windows = [
        {"key": "24h", "label": "24 hours", "hours": 24},
        {"key": "72h", "label": "3 days", "hours": 72},
        {"key": "168h", "label": "7 days", "hours": 168},
    ]
    throughput_windows = {
        item["key"]: {
            "label": item["label"],
            "hours": item["hours"],
            "opened": 0,
            "resolved": 0,
            "net_queue_change": 0,
        }
        for item in trend_windows
    }
    window_24h_start = now - timedelta(hours=24)
    previous_window_start = now - timedelta(hours=48)
    opened_last_24h = 0
    opened_previous_24h = 0
    resolved_last_24h = 0
    resolved_previous_24h = 0

    def _task_opened_at(task):
        return task.opened_at or task.created_at

    def _task_age_hours(task):
        opened_at = _task_opened_at(task)
        return max((now - opened_at).total_seconds() / 3600, 0.0) if opened_at else 0.0

    def _task_turnaround_hours(task):
        opened_at = _task_opened_at(task)
        resolved_at = task.resolved_at or task.last_reviewed_at
        if not opened_at or not resolved_at:
            return None
        return max((resolved_at - opened_at).total_seconds() / 3600, 0.0)

    for task in tasks:
        if task.status == ReviewTaskStatus.PENDING:
            pending += 1
        if task.status == ReviewTaskStatus.REVIEWED:
            reviewed += 1
        if task.status == ReviewTaskStatus.IN_REVIEW:
            in_review += 1
        if task.status == ReviewTaskStatus.ASSIGNED:
            assigned += 1
        if task.status == ReviewTaskStatus.RECHECK_REQUESTED:
            recheck_requested += 1
        if not task.assigned_to_teacher_id:
            unassigned += 1

        unresolved = task.status in REVIEW_TASK_UNRESOLVED_STATUSES
        task_age_hours = _task_age_hours(task)
        opened_at = _task_opened_at(task)
        if opened_at:
            if opened_at >= window_24h_start:
                opened_last_24h += 1
            elif opened_at >= previous_window_start:
                opened_previous_24h += 1
            for window in trend_windows:
                if opened_at >= now - timedelta(hours=window["hours"]):
                    throughput_windows[window["key"]]["opened"] += 1
        if unresolved:
            oldest_open_hours = max(oldest_open_hours, task_age_hours)
            if task_age_hours < 4:
                backlog_age_buckets["under_4h"] += 1
            elif task_age_hours < 24:
                backlog_age_buckets["under_24h"] += 1
            elif task_age_hours < 72:
                backlog_age_buckets["under_72h"] += 1
            else:
                backlog_age_buckets["over_72h"] += 1
        turnaround_hours = _task_turnaround_hours(task)
        resolved_at = task.resolved_at or task.last_reviewed_at
        if resolved_at:
            if resolved_at >= window_24h_start:
                resolved_last_24h += 1
            elif resolved_at >= previous_window_start:
                resolved_previous_24h += 1
            for window in trend_windows:
                if resolved_at >= now - timedelta(hours=window["hours"]):
                    throughput_windows[window["key"]]["resolved"] += 1
        if turnaround_hours is not None:
            reviewed_turnaround_hours.append(turnaround_hours)

        teacher_key = str(task.assigned_to_teacher_id) if task.assigned_to_teacher_id else "unassigned"
        teacher_bucket = reviewer_summary.setdefault(
            teacher_key,
            {
                "teacher_id": str(task.assigned_to_teacher_id) if task.assigned_to_teacher_id else None,
                "teacher_name": task.assigned_to_teacher.full_name if task.assigned_to_teacher_id else "Unassigned",
                "task_count": 0,
                "pending_count": 0,
                "assigned_count": 0,
                "in_review_count": 0,
                "reviewed_count": 0,
                "recheck_requested_count": 0,
                "unresolved_count": 0,
                "oldest_open_hours": 0.0,
                "resolved_turnaround_hours_total": 0.0,
                "resolved_turnaround_count": 0,
            },
        )
        teacher_bucket["task_count"] += 1
        if task.status == ReviewTaskStatus.PENDING:
            teacher_bucket["pending_count"] += 1
        if task.status == ReviewTaskStatus.ASSIGNED:
            teacher_bucket["assigned_count"] += 1
        if task.status == ReviewTaskStatus.IN_REVIEW:
            teacher_bucket["in_review_count"] += 1
        if task.status == ReviewTaskStatus.REVIEWED:
            teacher_bucket["reviewed_count"] += 1
        if task.status == ReviewTaskStatus.RECHECK_REQUESTED:
            teacher_bucket["recheck_requested_count"] += 1
        if unresolved:
            teacher_bucket["unresolved_count"] += 1
            teacher_bucket["oldest_open_hours"] = max(
                teacher_bucket["oldest_open_hours"],
                task_age_hours,
            )
        if turnaround_hours is not None:
            teacher_bucket["resolved_turnaround_hours_total"] += turnaround_hours
            teacher_bucket["resolved_turnaround_count"] += 1

        exam_key = str(task.exam_id)
        exam_bucket = exam_summary.setdefault(
            exam_key,
            {
                "exam_id": exam_key,
                "exam_title": task.exam.title,
                "task_count": 0,
                "pending_count": 0,
                "assigned_count": 0,
                "in_review_count": 0,
                "reviewed_count": 0,
                "unassigned_count": 0,
                "recheck_requested_count": 0,
                "oldest_open_hours": 0.0,
            },
        )
        exam_bucket["task_count"] += 1
        if task.status == ReviewTaskStatus.PENDING:
            exam_bucket["pending_count"] += 1
        if task.status == ReviewTaskStatus.ASSIGNED:
            exam_bucket["assigned_count"] += 1
        if task.status == ReviewTaskStatus.IN_REVIEW:
            exam_bucket["in_review_count"] += 1
        if task.status == ReviewTaskStatus.REVIEWED:
            exam_bucket["reviewed_count"] += 1
        if not task.assigned_to_teacher_id:
            exam_bucket["unassigned_count"] += 1
        if task.status == ReviewTaskStatus.RECHECK_REQUESTED:
            exam_bucket["recheck_requested_count"] += 1
        if unresolved:
            exam_bucket["oldest_open_hours"] = max(exam_bucket["oldest_open_hours"], task_age_hours)

    for bucket in reviewer_summary.values():
        resolved_count = bucket.pop("resolved_turnaround_count")
        resolved_total = bucket.pop("resolved_turnaround_hours_total")
        bucket["average_turnaround_hours"] = round(resolved_total / resolved_count, 2) if resolved_count else 0.0

    for bucket in exam_summary.values():
        if bucket["pending_count"] >= 8 or bucket["oldest_open_hours"] >= 72 or bucket["recheck_requested_count"] >= 3:
            risk_level = "high"
        elif bucket["pending_count"] >= 3 or bucket["oldest_open_hours"] >= 24 or bucket["recheck_requested_count"] >= 1:
            risk_level = "medium"
        else:
            risk_level = "low"
        bucket["release_risk_level"] = risk_level

    reviewer_rows = sorted(
        reviewer_summary.values(),
        key=lambda item: (
            -item["unresolved_count"],
            -item["recheck_requested_count"],
            -item["task_count"],
            item["teacher_name"].lower(),
        ),
    )[:6]
    exam_rows = sorted(
        exam_summary.values(),
        key=lambda item: (
            -(
                3
                if item["release_risk_level"] == "high"
                else 2
                if item["release_risk_level"] == "medium"
                else 1
            ),
            -item["pending_count"],
            -item["recheck_requested_count"],
            -item["task_count"],
            item["exam_title"].lower(),
        ),
    )[:6]
    oldest_pending_rows = [
        {
            "task_id": str(task.id),
            "exam_id": str(task.exam_id),
            "exam_title": task.exam.title,
            "student_name": task.student.full_name,
            "question_text_summary": (task.question.question_text or "").strip()[:120]
            + ("..." if len((task.question.question_text or "").strip()) > 120 else ""),
            "assigned_to_teacher_name": task.assigned_to_teacher.full_name if task.assigned_to_teacher_id else "",
            "status": task.status,
            "opened_at": task.opened_at.isoformat() if task.opened_at else None,
        }
        for task in sorted(
            [
                item
                for item in tasks
                if item.status in {
                    ReviewTaskStatus.PENDING,
                    ReviewTaskStatus.ASSIGNED,
                    ReviewTaskStatus.IN_REVIEW,
                    ReviewTaskStatus.RECHECK_REQUESTED,
                }
            ],
            key=lambda item: (item.opened_at or item.created_at, item.created_at),
        )[:6]
    ]

    risk_counts = {"high": 0, "medium": 0, "low": 0}
    for bucket in exam_summary.values():
        risk_counts[bucket["release_risk_level"]] += 1

    previous_net = opened_previous_24h - resolved_previous_24h
    current_net = opened_last_24h - resolved_last_24h
    if current_net < previous_net:
        trend_direction = "improving"
    elif current_net > previous_net:
        trend_direction = "worsening"
    else:
        trend_direction = "steady"
    for bucket in throughput_windows.values():
        bucket["net_queue_change"] = bucket["opened"] - bucket["resolved"]

    return {
        "total": total,
        "pending": pending,
        "assigned": assigned,
        "in_review": in_review,
        "reviewed": reviewed,
        "unassigned": unassigned,
        "recheck_requested": recheck_requested,
        "blocked_exams": len(
            {
                str(task.exam_id)
                for task in tasks
                if task.status in REVIEW_TASK_UNRESOLVED_STATUSES
            }
        ),
        "average_turnaround_hours": round(
            sum(reviewed_turnaround_hours) / len(reviewed_turnaround_hours),
            2,
        )
        if reviewed_turnaround_hours
        else 0.0,
        "slowest_turnaround_hours": round(max(reviewed_turnaround_hours), 2)
        if reviewed_turnaround_hours
        else 0.0,
        "oldest_open_hours": round(oldest_open_hours, 2),
        "backlog_age_buckets": backlog_age_buckets,
        "throughput_trend": {
            "opened_last_24h": opened_last_24h,
            "opened_previous_24h": opened_previous_24h,
            "resolved_last_24h": resolved_last_24h,
            "resolved_previous_24h": resolved_previous_24h,
            "net_queue_change_last_24h": current_net,
            "net_queue_change_previous_24h": previous_net,
            "direction": trend_direction,
        },
        "throughput_windows": list(throughput_windows.values()),
        "release_risk_summary": {
            "high_risk_exams": risk_counts["high"],
            "medium_risk_exams": risk_counts["medium"],
            "low_risk_exams": risk_counts["low"],
        },
        "reviewers": reviewer_rows,
        "exams": exam_rows,
        "oldest_pending_tasks": oldest_pending_rows,
    }


@transaction.atomic
def assign_review_task(*, task, assigned_to_teacher=None, assigned_by_user=None):
    previous_status = task.status
    now = timezone.now()

    if assigned_to_teacher is not None and assigned_to_teacher.institute_id != task.institute_id:
        raise ValidationError({"assigned_to_teacher": "Assigned teacher must belong to the same institute."})

    task.assigned_to_teacher = assigned_to_teacher
    task.assigned_by_user = assigned_by_user
    task.assigned_at = now if assigned_to_teacher is not None else None
    task.status = ReviewTaskStatus.ASSIGNED if assigned_to_teacher is not None else ReviewTaskStatus.PENDING
    if task.status == ReviewTaskStatus.PENDING:
        task.review_started_at = None
    task.save(
        update_fields=[
            "assigned_to_teacher",
            "assigned_by_user",
            "assigned_at",
            "status",
            "review_started_at",
            "updated_at",
        ]
    )

    StudentAnswerReviewEvent.objects.create(
        review_task=task,
        answer=task.answer,
        attempt=task.attempt,
        exam=task.exam,
        student=task.student,
        question=task.question,
        actor_user=assigned_by_user,
        actor_teacher=assigned_to_teacher if assigned_to_teacher is not None else None,
        event_type=ReviewEventType.ASSIGNED if assigned_to_teacher is not None else ReviewEventType.UNASSIGNED,
        from_status=previous_status,
        to_status=task.status,
        marks_awarded=task.latest_marks_awarded,
        notes=(
            f"Assigned to {assigned_to_teacher.full_name}."
            if assigned_to_teacher is not None
            else "Task returned to the unassigned queue."
        ),
    )
    return task


@transaction.atomic
def claim_review_task_for_teacher(*, task, teacher_profile, actor_user=None):
    previous_status = task.status
    now = timezone.now()

    if teacher_profile.institute_id != task.institute_id:
        raise ValidationError({"assigned_to_teacher": "Assigned teacher must belong to the same institute."})

    if task.assigned_to_teacher_id and task.assigned_to_teacher_id != teacher_profile.id:
        raise ValidationError({"detail": "This review task is already assigned to another teacher."})

    task.assigned_to_teacher = teacher_profile
    task.assigned_by_user = actor_user
    task.assigned_at = task.assigned_at or now
    task.status = ReviewTaskStatus.IN_REVIEW
    task.review_started_at = task.review_started_at or now
    task.save(
        update_fields=[
            "assigned_to_teacher",
            "assigned_by_user",
            "assigned_at",
            "status",
            "review_started_at",
            "updated_at",
        ]
    )

    StudentAnswerReviewEvent.objects.create(
        review_task=task,
        answer=task.answer,
        attempt=task.attempt,
        exam=task.exam,
        student=task.student,
        question=task.question,
        actor_user=actor_user,
        actor_teacher=teacher_profile,
        event_type=ReviewEventType.TASK_OPENED,
        from_status=previous_status,
        to_status=task.status,
        marks_awarded=task.latest_marks_awarded,
        notes=(
            "Teacher resumed the assigned review task."
            if previous_status in {ReviewTaskStatus.ASSIGNED, ReviewTaskStatus.IN_REVIEW, ReviewTaskStatus.RECHECK_REQUESTED}
            and task.assigned_to_teacher_id == teacher_profile.id
            else "Teacher claimed the next available review task."
        ),
    )
    return task


@transaction.atomic
def request_review_recheck(*, task, requested_by_user=None, requested_by_teacher=None, review_notes=""):
    previous_status = task.status
    now = timezone.now()
    note_text = str(review_notes or "").strip()
    answer = task.answer

    answer.evaluation_status = answer.EvaluationStatus.MANUAL_PENDING
    answer.is_correct = False
    answer.marks_awarded = Decimal("0.00")
    answer.negative_marks_applied = Decimal("0.00")
    answer.reviewed_by_teacher = None
    answer.reviewed_at = None
    answer.review_notes = note_text
    answer.save()

    task.status = ReviewTaskStatus.RECHECK_REQUESTED
    task.resolved_at = None
    task.last_reviewed_at = None
    task.latest_marks_awarded = Decimal("0.00")
    task.latest_review_summary = note_text
    if requested_by_teacher is not None:
        task.assigned_to_teacher = requested_by_teacher
        task.assigned_at = now
    task.save(
        update_fields=[
            "status",
            "resolved_at",
            "last_reviewed_at",
            "latest_marks_awarded",
            "latest_review_summary",
            "assigned_to_teacher",
            "assigned_at",
            "updated_at",
        ]
    )

    StudentAnswerReviewEvent.objects.create(
        review_task=task,
        answer=task.answer,
        attempt=task.attempt,
        exam=task.exam,
        student=task.student,
        question=task.question,
        actor_user=requested_by_user,
        actor_teacher=requested_by_teacher,
        event_type=ReviewEventType.RECHECK_REQUESTED,
        from_status=previous_status,
        to_status=task.status,
        marks_awarded=Decimal("0.00"),
        notes=note_text or "Review returned for recheck.",
    )
    return task


@transaction.atomic
def moderate_review_task(*, task, reviewed_by_teacher, marks_awarded, review_notes="", actor_user=None, rubric_scores=None):
    from apps.results.services import generate_result_from_attempt

    try:
        awarded_marks = Decimal(str(marks_awarded))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({"marks_awarded": "Marks awarded must be a valid number."}) from exc

    exam_question = task.attempt.exam.exam_questions.select_related("question").get(
        question=task.question,
        is_active=True,
    )
    maximum_marks = exam_question.marks or Decimal("0.00")
    if awarded_marks < 0:
        raise ValidationError({"marks_awarded": "Marks awarded cannot be negative."})
    if awarded_marks > maximum_marks:
        raise ValidationError({"marks_awarded": "Marks awarded cannot exceed the configured question marks."})

    normalized_rubric_scores, rubric_total = _normalize_rubric_review_scores(
        question=task.question,
        exam_question=exam_question,
        rubric_scores=rubric_scores,
        awarded_marks=awarded_marks,
    )

    previous_status = task.status
    reviewed_at = timezone.now()
    note_text = str(review_notes or "").strip()
    answer = task.answer

    answer.evaluation_status = answer.EvaluationStatus.MANUAL_REVIEWED
    answer.marks_awarded = awarded_marks
    answer.negative_marks_applied = Decimal("0.00")
    answer.is_correct = awarded_marks >= maximum_marks and maximum_marks > 0
    answer.reviewed_by_teacher = reviewed_by_teacher
    answer.reviewed_at = reviewed_at
    answer.review_notes = note_text
    answer.save()

    task.status = ReviewTaskStatus.MODERATED
    task.last_reviewed_by_teacher = reviewed_by_teacher
    task.last_reviewed_at = reviewed_at
    task.latest_marks_awarded = awarded_marks
    task.latest_review_summary = note_text
    task.review_started_at = task.review_started_at or reviewed_at
    task.resolved_at = reviewed_at
    task.is_active = True
    task_metadata = dict(task.metadata or {})
    previous_rubric_scores = task_metadata.get("rubric_scores", [])
    previous_rubric_total = task_metadata.get("rubric_total")
    if normalized_rubric_scores:
        task_metadata["rubric_scores"] = normalized_rubric_scores
        task_metadata["rubric_total"] = format(rubric_total.quantize(Decimal("0.01")), "f")
        task_metadata["moderation_rubric_scores"] = normalized_rubric_scores
        task_metadata["moderation_rubric_total"] = format(rubric_total.quantize(Decimal("0.01")), "f")
    else:
        task_metadata.pop("moderation_rubric_scores", None)
        task_metadata.pop("moderation_rubric_total", None)
    task.metadata = task_metadata
    task.save(
        update_fields=[
            "status",
            "last_reviewed_by_teacher",
            "last_reviewed_at",
            "latest_marks_awarded",
            "latest_review_summary",
            "review_started_at",
            "resolved_at",
            "metadata",
            "is_active",
            "updated_at",
        ]
    )

    StudentAnswerReviewEvent.objects.create(
        review_task=task,
        answer=answer,
        attempt=answer.attempt,
        exam=answer.attempt.exam,
        student=answer.attempt.student,
        question=answer.question,
        actor_user=actor_user,
        actor_teacher=reviewed_by_teacher,
        event_type=ReviewEventType.MODERATED,
        from_status=previous_status,
        to_status=task.status,
        marks_awarded=awarded_marks,
        notes=note_text or "Review moderated.",
        metadata=(
            {
                "previous_rubric_scores": previous_rubric_scores,
                "previous_rubric_total": str(previous_rubric_total or ""),
                "rubric_scores": normalized_rubric_scores,
                "rubric_total": format(rubric_total.quantize(Decimal("0.01")), "f"),
            }
            if normalized_rubric_scores
            else {}
        ),
    )

    scoring = calculate_attempt_score(answer.attempt)
    for field, value in scoring.items():
        setattr(answer.attempt, field, value)
    answer.attempt.save()

    if answer.attempt.status in {"submitted", "auto_submitted"}:
        try:
            generate_result_from_attempt(answer.attempt)
        except ValidationError:
            pass

    return task


def calculate_attempt_score(attempt):
    from apps.attempts.models import StudentAnswer

    answers = list(
        attempt.answers.select_related("question", "selected_option").filter(is_active=True)
    )
    exam_questions = list(
        attempt.exam.exam_questions.filter(is_active=True).select_related("question")
    )

    answer_map = {answer.question_id: answer for answer in answers}

    total_questions = len(exam_questions)
    attempted_questions = 0
    correct_answers = 0
    incorrect_answers = 0
    skipped_questions = 0
    score = Decimal("0.00")
    negative_score = Decimal("0.00")

    for exam_question in exam_questions:
        answer = answer_map.get(exam_question.question_id)
        if _question_has_response(answer):
            attempted_questions += 1
            if answer.evaluation_status == StudentAnswer.EvaluationStatus.MANUAL_PENDING:
                continue
            if answer.is_correct:
                correct_answers += 1
                score += answer.marks_awarded or Decimal("0.00")
            else:
                incorrect_answers += 1
                negative_score += answer.negative_marks_applied or Decimal("0.00")
        else:
            skipped_questions += 1

    final_score = score - negative_score
    percentage = Decimal("0.00")
    if attempt.exam.total_marks > 0:
        percentage = (final_score / attempt.exam.total_marks) * Decimal("100.00")

    return {
        "total_questions": total_questions,
        "attempted_questions": attempted_questions,
        "correct_answers": correct_answers,
        "incorrect_answers": incorrect_answers,
        "skipped_questions": skipped_questions,
        "score": score,
        "negative_score": negative_score,
        "final_score": final_score,
        "percentage": percentage.quantize(Decimal("0.01")),
    }


def attempt_has_pending_manual_review(attempt):
    return StudentAnswerReviewTask.objects.filter(
        attempt=attempt,
        is_active=True,
        status__in=REVIEW_TASK_UNRESOLVED_STATUSES,
    ).exists()


def unresolved_review_tasks_queryset(*, exam=None, institute=None, institute_id=None, teacher=None):
    queryset = StudentAnswerReviewTask.objects.filter(
        is_active=True,
        status__in=REVIEW_TASK_UNRESOLVED_STATUSES,
    )
    if exam is not None:
        queryset = queryset.filter(exam=exam)
    if institute is not None:
        queryset = queryset.filter(institute=institute)
    if institute_id is not None:
        queryset = queryset.filter(institute_id=institute_id)
    if teacher is not None:
        queryset = queryset.filter(assigned_to_teacher=teacher)
    return queryset


@transaction.atomic
def submit_attempt(attempt, *, auto_submitted=False):
    from apps.reports.services import notify_attempt_submitted
    from apps.results.services import (
        calculate_exam_performance_summary,
        calculate_exam_ranks,
        calculate_student_topic_performance,
        generate_result_from_attempt,
    )

    _validate_attempt_is_editable(attempt)

    scoring = calculate_attempt_score(attempt)
    submitted_at = timezone.now()
    time_taken = max(int((submitted_at - attempt.started_at).total_seconds()), 0)

    attempt.status = "auto_submitted" if auto_submitted else "submitted"
    attempt.submitted_at = submitted_at
    attempt.time_taken_seconds = time_taken
    attempt.is_auto_submitted = auto_submitted

    for field, value in scoring.items():
        setattr(attempt, field, value)

    attempt.save()
    runtime_config = _runtime_config(attempt)
    if runtime_config.get("result_publish_mode") == "immediate":
        generate_result_from_attempt(attempt)
        calculate_student_topic_performance(attempt.exam, attempt.student, attempt)
        calculate_exam_ranks(attempt.exam)
        calculate_exam_performance_summary(attempt.exam)
    notify_attempt_submitted(attempt)
    return attempt


@transaction.atomic
def auto_submit_expired_attempts():
    from apps.attempts.models import StudentExamAttempt

    now = timezone.now()
    attempts = list(
        StudentExamAttempt.objects.select_related("exam", "student")
        .filter(status="in_progress", expires_at__isnull=False, expires_at__lte=now)
    )

    updated_attempts = []
    for attempt in attempts:
        updated_attempts.append(_auto_submit_expired_attempt(attempt))

    return updated_attempts
