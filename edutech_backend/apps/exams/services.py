from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction


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


@transaction.atomic
def publish_exam(exam, changed_by=None, remarks=""):
    from apps.exams.models import ExamPublishLog
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

    old_status = exam.status
    exam.status = "scheduled"
    exam.save(update_fields=["status", "updated_at"])
    ExamPublishLog.objects.create(
        exam=exam,
        old_status=old_status,
        new_status=exam.status,
        changed_by=changed_by,
        remarks=remarks,
    )
    notify_exam_published(exam, changed_by=changed_by)
    return exam


@transaction.atomic
def cancel_exam(exam, changed_by=None, remarks=""):
    from apps.exams.models import ExamPublishLog

    if exam.status == "cancelled":
        raise ValidationError({"status": "Exam is already cancelled."})

    old_status = exam.status
    exam.status = "cancelled"
    exam.save(update_fields=["status", "updated_at"])
    ExamPublishLog.objects.create(
        exam=exam,
        old_status=old_status,
        new_status=exam.status,
        changed_by=changed_by,
        remarks=remarks,
    )
    return exam
