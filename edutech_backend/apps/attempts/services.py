from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.exams.models import ExamQuestion
from apps.question_bank.models import QuestionType


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
    if next_attempt_no > exam.max_attempts:
        raise ValidationError({"attempt_no": "Maximum attempts reached for this exam."})
    return next_attempt_no


@transaction.atomic
def start_attempt(student, exam):
    from apps.attempts.models import StudentExamAttempt

    validate_student_exam_scope(student, exam)
    validate_attempt_window(exam)

    if exam.attempts.filter(student=student, status="in_progress", is_active=True).exists():
        raise ValidationError(
            {"attempt": "Student already has an in-progress attempt for this exam."}
        )

    next_attempt_no = _get_next_attempt_number(student, exam)
    started_at = timezone.now()
    expires_at = started_at + timedelta(minutes=exam.duration_minutes)
    if exam.end_at and expires_at > exam.end_at:
        expires_at = exam.end_at

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
    )
    return attempt


def _validate_attempt_is_editable(attempt):
    if attempt.expires_at and timezone.now() > attempt.expires_at:
        raise ValidationError({"attempt": ["Attempt has expired. Refresh the attempt state."]})
    if attempt.status != "in_progress":
        raise ValidationError({"attempt": ["Answers cannot be changed after the attempt is submitted."]})


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

    if question.question_type not in {QuestionType.MCQ_SINGLE, QuestionType.TRUE_FALSE}:
        raise ValidationError(
            {"question": "Saving answers is currently supported for single choice and true/false only."}
        )

    if clear_response or skip:
        selected_option = None
        answer_text = ""

    answer, _ = StudentAnswer.objects.get_or_create(
        attempt=attempt,
        question=question,
        defaults={
            "selected_option": selected_option,
            "answer_text": answer_text,
            "time_spent_seconds": time_spent_seconds,
            "is_marked_for_review": is_marked_for_review,
        },
    )

    answer.selected_option = selected_option
    answer.answer_text = answer_text
    answer.time_spent_seconds = time_spent_seconds
    answer.is_marked_for_review = is_marked_for_review
    answer.answered_at = timezone.now()

    if selected_option:
        if selected_option.is_correct:
            answer.is_correct = True
            answer.marks_awarded = exam_question.marks
            answer.negative_marks_applied = Decimal("0.00")
        else:
            answer.is_correct = False
            answer.marks_awarded = Decimal("0.00")
            answer.negative_marks_applied = exam_question.negative_marks or Decimal("0.00")
    else:
        answer.is_correct = False
        answer.marks_awarded = Decimal("0.00")
        answer.negative_marks_applied = Decimal("0.00")

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
        if answer and (answer.selected_option_id or (answer.answer_text or "").strip()):
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
