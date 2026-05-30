import hashlib
import random
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.exams.services import allows_unlimited_attempts, is_exam_assigned_to_student
from apps.exams.models import ExamQuestion
from apps.question_bank.models import QuestionType


SECTION_TIMER_MODES = {"section", "hybrid"}


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


def _calculate_attempt_expires_at(exam, started_at):
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
    validate_attempt_window(exam)

    if exam.attempts.filter(student=student, status="in_progress", is_active=True).exists():
        raise ValidationError(
            {"attempt": "Student already has an in-progress attempt for this exam."}
        )

    next_attempt_no = _get_next_attempt_number(student, exam)
    started_at = timezone.now()
    expires_at = _calculate_attempt_expires_at(exam, started_at)

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
    }:
        raise ValidationError(
            {
                "question": (
                    "Saving answers is currently supported for single choice, multi-select, "
                    "and true/false questions only."
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
    else:
        answer.selected_option = selected_option
    answer.selected_option_ids = selected_option_ids
    answer.answer_text = answer_text
    answer.time_spent_seconds = time_spent_seconds
    answer.is_marked_for_review = is_marked_for_review
    answer.answered_at = timezone.now()

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
