from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone


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


def resolve_result_publish_mode(exam):
    if exam.show_result_immediately:
        return RESULT_PUBLISH_MODE_IMMEDIATE
    return exam.result_publish_mode


def resolve_review_mode(exam):
    if exam.allow_review_after_submit and exam.review_mode == REVIEW_MODE_NONE:
        return REVIEW_MODE_ATTEMPTED_ONLY
    return exam.review_mode


def is_result_visible_for_attempt(exam, attempt, result=None, at_time=None):
    current_time = at_time or timezone.now()
    result = result or getattr(attempt, "result", None)
    mode = resolve_result_publish_mode(exam)

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
        queryset = exam.exam_questions.filter(is_active=True).select_related("question")

    question_list = list(queryset)
    if not question_list:
        raise ValidationError({"questions": "Exam must contain at least one active question."})

    for exam_question in question_list:
        if exam_question.question.institute_id != exam.institute_id:
            raise ValidationError(
                {"question": "All exam questions must belong to the same institute as the exam."}
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
    from apps.reports.services import notify_exam_published

    if exam.status not in {"draft", "cancelled"}:
        raise ValidationError({"status": "Only draft or cancelled exams can be scheduled/published."})

    if exam.start_at is None or exam.end_at is None:
        raise ValidationError(
            {"start_at": "Scheduled exam must have start and end timestamps defined."}
        )
    if exam.end_at <= exam.start_at:
        raise ValidationError({"end_at": "End time must be after the start time."})

    validate_exam_questions(exam)

    exam = _record_status_change(
        exam,
        old_status=exam.status,
        new_status="scheduled",
        changed_by=changed_by,
        remarks=remarks,
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
