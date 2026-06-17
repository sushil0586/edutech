import hashlib
import random
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, F, Window
from django.db.models.functions import RowNumber
from django.utils import timezone

from apps.attempts.models import (
    AttemptIntegrityEvent,
    IntegrityEventSeverity,
    IntegrityEventType,
)
from apps.exams.services import (
    allows_unlimited_attempts,
    is_exam_assigned_to_student,
    resolve_exam_economy_access,
    resolve_security_policy,
)
from apps.exams.models import ExamQuestion
from apps.question_bank.models import QuestionType


SECTION_TIMER_MODES = {"section", "hybrid"}
INTEGRITY_EVENT_DEDUPE_SECONDS = 5
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


def _question_has_response(answer):
    if answer is None:
        return False
    return bool(
        answer.selected_option_id
        or _normalized_selected_option_ids(getattr(answer, "selected_option_ids", []))
        or (answer.answer_text or "").strip()
    )


def _evaluate_choice_answer(*, question, exam_question, selected_option, selected_option_ids):
    normalized_ids = _normalized_selected_option_ids(selected_option_ids)

    if question.question_type == QuestionType.MCQ_MULTIPLE:
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
    time_spent_seconds=None,
    is_marked_for_review=False,
    clear_response=False,
    skip=False,
):
    from apps.attempts.models import StudentAnswer

    _validate_attempt_is_editable(attempt)

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
    if question.question_type == QuestionType.MCQ_MULTIPLE:
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

    if question.question_type not in {
        QuestionType.MCQ_SINGLE,
        QuestionType.MCQ_MULTIPLE,
        QuestionType.TRUE_FALSE,
        QuestionType.SHORT_ANSWER,
    }:
        raise ValidationError(
            {
                "question": (
                    "Saving answers is currently supported for single choice, multi-select, "
                    "true/false, and short answer questions only."
                )
            }
        )

    if clear_response or skip:
        selected_option = None
        selected_option_ids = []
        answer_text = ""

    answer, _ = StudentAnswer.objects.get_or_create(
        attempt=attempt,
        question=question,
        defaults={
            "selected_option": selected_option,
            "selected_option_ids": selected_option_ids,
            "answer_text": answer_text,
            "time_spent_seconds": time_spent_seconds,
            "is_marked_for_review": is_marked_for_review,
        },
    )

    if question.question_type == QuestionType.MCQ_MULTIPLE:
        answer.selected_option = None
    elif question.question_type == QuestionType.SHORT_ANSWER:
        answer.selected_option = None
    else:
        answer.selected_option = selected_option
    answer.selected_option_ids = selected_option_ids
    answer.answer_text = answer_text
    answer.time_spent_seconds = time_spent_seconds
    answer.is_marked_for_review = is_marked_for_review
    answer.answered_at = timezone.now()

    if question.question_type == QuestionType.SHORT_ANSWER:
        scoring = _evaluate_short_answer(
            question=question,
            exam_question=exam_question,
            answer_text=answer_text,
        )
    else:
        scoring = _evaluate_choice_answer(
            question=question,
            exam_question=exam_question,
            selected_option=selected_option,
            selected_option_ids=selected_option_ids,
        )
    answer.is_correct = scoring["is_correct"]
    answer.marks_awarded = scoring["marks_awarded"]
    answer.negative_marks_applied = scoring["negative_marks_applied"]

    answer.save()
    return answer


def calculate_attempt_score(attempt):
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


@transaction.atomic
def submit_attempt(attempt, *, auto_submitted=False):
    from apps.reports.services import notify_attempt_submitted

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
