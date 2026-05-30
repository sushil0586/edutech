from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg, Count, Max, Min, Q, Sum
from django.utils import timezone

from apps.exams.services import (
    choose_attempt_for_result_policy,
    is_result_visible_for_attempt,
    resolve_result_publish_mode,
)


def attempt_monitor_alerts(attempt, *, at_time=None):
    now = at_time or timezone.now()
    alerts = []

    if attempt.status == "auto_submitted":
        alerts.append(
            {
                "code": "auto_submitted",
                "label": "Auto-submitted",
                "severity": "medium",
                "message": "The attempt was auto-submitted by the system.",
            }
        )

    if attempt.status == "in_progress" and attempt.started_at:
        elapsed_minutes = max(int((now - attempt.started_at).total_seconds() // 60), 0)
        if elapsed_minutes >= 20:
            alerts.append(
                {
                    "code": "stalled_activity",
                    "label": "Stalled activity",
                    "severity": "high",
                    "message": "This attempt has remained in progress for at least 20 minutes.",
                }
            )
        if elapsed_minutes >= 10 and attempt.attempted_questions == 0:
            alerts.append(
                {
                    "code": "no_progress",
                    "label": "No progress yet",
                    "severity": "medium",
                    "message": "The attempt is active but still has no answered questions.",
                }
            )
        if attempt.total_questions > 0:
            unanswered_ratio = 1 - (attempt.attempted_questions / attempt.total_questions)
            if elapsed_minutes >= 20 and unanswered_ratio >= 0.75:
                alerts.append(
                    {
                        "code": "low_progress",
                        "label": "Low progress",
                        "severity": "medium",
                        "message": "Most questions are still unanswered for this stage of the exam.",
                    }
                )

    return alerts


def _ensure_exam_status_allows_result_generation(exam):
    if exam.status in {"draft", "cancelled"}:
        raise ValidationError(
            {"exam": "Results cannot be generated while the exam is draft or cancelled."}
        )


def _ensure_exam_status_allows_result_publishing(exam):
    if exam.status in {"draft", "cancelled"}:
        raise ValidationError(
            {"exam": "Results cannot be published while the exam is draft or cancelled."}
        )
    if exam.status != "completed":
        raise ValidationError(
            {"exam": "Complete the exam before publishing results."}
        )
    if exam.attempts.filter(status="in_progress", is_active=True).exists():
        raise ValidationError(
            {"exam": "Results cannot be published while active attempts are still in progress."}
        )


def force_submit_eligibility(attempt):
    if attempt.status != "in_progress":
        return {
            "allowed": False,
            "reason": "Only in-progress attempts can be force-submitted.",
        }

    if attempt.exam.status == "draft":
        return {
            "allowed": False,
            "reason": "Draft exams should not have operational attempt controls yet.",
        }

    if attempt.exam.status == "cancelled":
        return {
            "allowed": False,
            "reason": "Cancelled exams should not accept new operational attempt actions.",
        }

    return {
        "allowed": True,
        "reason": None,
    }


def ensure_attempt_can_be_force_submitted(attempt):
    eligibility = force_submit_eligibility(attempt)
    if not eligibility["allowed"]:
        raise ValidationError({"attempt": eligibility["reason"]})
    return eligibility


def _result_status_for_attempt(attempt):
    if attempt.status not in {"submitted", "auto_submitted"}:
        raise ValidationError({"attempt": "Results can only be generated from submitted attempts."})
    if attempt.final_score >= attempt.exam.passing_marks:
        return "pass"
    return "fail"


@transaction.atomic
def generate_result_from_attempt(attempt):
    from apps.results.models import ExamResult

    if attempt.status not in {"submitted", "auto_submitted"}:
        raise ValidationError({"attempt": "Attempt must be submitted or auto-submitted."})

    result, created = ExamResult.objects.get_or_create(
        exam=attempt.exam,
        student=attempt.student,
        attempt=attempt,
        defaults={
            "institute": attempt.institute,
            "result_status": _result_status_for_attempt(attempt),
            "total_marks": attempt.exam.total_marks,
            "score": attempt.score,
            "negative_score": attempt.negative_score,
            "final_score": attempt.final_score,
            "percentage": attempt.percentage,
            "correct_answers": attempt.correct_answers,
            "incorrect_answers": attempt.incorrect_answers,
            "skipped_questions": attempt.skipped_questions,
            "time_taken_seconds": attempt.time_taken_seconds,
        },
    )

    if not created:
        result.result_status = _result_status_for_attempt(attempt)
        result.total_marks = attempt.exam.total_marks
        result.score = attempt.score
        result.negative_score = attempt.negative_score
        result.final_score = attempt.final_score
        result.percentage = attempt.percentage
        result.correct_answers = attempt.correct_answers
        result.incorrect_answers = attempt.incorrect_answers
        result.skipped_questions = attempt.skipped_questions
        result.time_taken_seconds = attempt.time_taken_seconds
    result.is_active = True
    if resolve_result_publish_mode(attempt.exam) == "immediate":
        result.is_published = True
        result.published_at = timezone.now()
    else:
        result.is_published = False
        result.published_at = None
    result.save()

    return result


@transaction.atomic
def generate_results_for_exam(exam):
    from apps.results.models import ExamResult

    _ensure_exam_status_allows_result_generation(exam)

    attempts = list(
        exam.attempts.select_related("student")
        .filter(status__in=["submitted", "auto_submitted"], is_active=True)
        .order_by("student_id", "-attempt_no", "-created_at")
    )

    attempts_by_student = {}
    for attempt in attempts:
        attempts_by_student.setdefault(attempt.student_id, []).append(attempt)

    results = []
    selected_attempt_ids = set()
    for student_attempts in attempts_by_student.values():
        attempt = choose_attempt_for_result_policy(exam, student_attempts)
        if attempt is None:
            continue
        selected_attempt_ids.add(attempt.id)
        results.append(generate_result_from_attempt(attempt))
        calculate_student_topic_performance(attempt.exam, attempt.student, attempt)

    if selected_attempt_ids:
        ExamResult.objects.filter(exam=exam).exclude(
            attempt_id__in=selected_attempt_ids
        ).update(is_active=False)

    calculate_exam_performance_summary(exam)
    return results


@transaction.atomic
def calculate_exam_ranks(exam):
    from apps.results.models import ExamResult

    _ensure_exam_status_allows_result_generation(exam)

    results = list(
        ExamResult.objects.filter(exam=exam, is_active=True)
        .order_by("-final_score", "time_taken_seconds", "created_at")
    )
    if not results:
        raise ValidationError({"exam": "No generated results found for this exam."})

    current_rank = 0
    previous_score = None
    previous_time_taken = None

    for index, result in enumerate(results, start=1):
        if result.final_score != previous_score or result.time_taken_seconds != previous_time_taken:
            current_rank = index
            previous_score = result.final_score
            previous_time_taken = result.time_taken_seconds
        result.rank = current_rank
        result.save(update_fields=["rank"])

    return results


@transaction.atomic
def publish_exam_results(exam):
    from apps.results.models import ExamResult
    from apps.reports.services import notify_results_published

    _ensure_exam_status_allows_result_publishing(exam)

    results = list(ExamResult.objects.filter(exam=exam, is_active=True))
    if not results:
        raise ValidationError({"exam": "No generated results found for this exam."})

    published_at = timezone.now()
    for result in results:
        result.is_published = True
        result.published_at = published_at
        result.save(update_fields=["is_published", "published_at"])

    notify_results_published(exam, results)
    calculate_exam_performance_summary(exam)
    return results


@transaction.atomic
def calculate_student_topic_performance(exam, student, attempt=None):
    from apps.results.models import StudentTopicPerformance

    attempt = attempt or exam.attempts.filter(
        student=student,
        status__in=["submitted", "auto_submitted"],
        is_active=True,
    ).order_by("-attempt_no").first()

    if attempt is None:
        raise ValidationError({"attempt": "No submitted attempt found for this student and exam."})

    StudentTopicPerformance.objects.filter(exam=exam, student=student).delete()

    exam_questions = list(
        exam.exam_questions.filter(is_active=True)
        .select_related("question", "question__subject", "question__topic")
    )
    answers = {answer.question_id: answer for answer in attempt.answers.filter(is_active=True)}

    grouped = {}
    for exam_question in exam_questions:
        question = exam_question.question
        key = (question.subject_id, question.topic_id)
        grouped.setdefault(
            key,
            {
                "subject": question.subject,
                "topic": question.topic,
                "total_questions": 0,
                "attempted_questions": 0,
                "correct_answers": 0,
                "incorrect_answers": 0,
                "skipped_questions": 0,
                "available_marks": Decimal("0.00"),
                "score": Decimal("0.00"),
                "negative_score": Decimal("0.00"),
            },
        )
        bucket = grouped[key]
        bucket["total_questions"] += 1
        bucket["available_marks"] += exam_question.marks or Decimal("0.00")

        answer = answers.get(question.id)
        if answer and (answer.selected_option_id or (answer.answer_text or "").strip()):
            bucket["attempted_questions"] += 1
            if answer.is_correct:
                bucket["correct_answers"] += 1
                bucket["score"] += answer.marks_awarded
            else:
                bucket["incorrect_answers"] += 1
                bucket["negative_score"] += answer.negative_marks_applied
        else:
            bucket["skipped_questions"] += 1

    performances = []
    for bucket in grouped.values():
        final_score = bucket["score"] - bucket["negative_score"]
        percentage = Decimal("0.00")
        if bucket["available_marks"] > 0:
            percentage = (final_score / bucket["available_marks"]) * Decimal("100.00")

        performances.append(
            StudentTopicPerformance.objects.create(
                institute=exam.institute,
                exam=exam,
                student=student,
                subject=bucket["subject"],
                topic=bucket["topic"],
                total_questions=bucket["total_questions"],
                attempted_questions=bucket["attempted_questions"],
                correct_answers=bucket["correct_answers"],
                incorrect_answers=bucket["incorrect_answers"],
                skipped_questions=bucket["skipped_questions"],
                score=bucket["score"],
                negative_score=bucket["negative_score"],
                final_score=final_score,
                percentage=percentage.quantize(Decimal("0.01")),
            )
        )

    return performances


@transaction.atomic
def calculate_exam_performance_summary(exam):
    from apps.results.models import ExamPerformanceSummary, ExamResult

    results_qs = ExamResult.objects.filter(exam=exam, is_active=True)
    aggregates = results_qs.aggregate(
        average_score=Avg("final_score"),
        highest_score=Max("final_score"),
        lowest_score=Min("final_score"),
        average_percentage=Avg("percentage"),
    )

    total_results = results_qs.count()
    total_passed = results_qs.filter(result_status="pass").count()
    total_failed = results_qs.filter(result_status="fail").count()

    summary, _ = ExamPerformanceSummary.objects.get_or_create(
        institute=exam.institute,
        exam=exam,
        defaults={
            "total_students": total_results,
            "total_attempted": total_results,
            "total_passed": total_passed,
            "total_failed": total_failed,
            "average_score": aggregates["average_score"] or Decimal("0.00"),
            "highest_score": aggregates["highest_score"] or Decimal("0.00"),
            "lowest_score": aggregates["lowest_score"] or Decimal("0.00"),
            "average_percentage": aggregates["average_percentage"] or Decimal("0.00"),
            "last_calculated_at": timezone.now(),
        },
    )

    summary.total_students = total_results
    summary.total_attempted = total_results
    summary.total_passed = total_passed
    summary.total_failed = total_failed
    summary.average_score = aggregates["average_score"] or Decimal("0.00")
    summary.highest_score = aggregates["highest_score"] or Decimal("0.00")
    summary.lowest_score = aggregates["lowest_score"] or Decimal("0.00")
    summary.average_percentage = aggregates["average_percentage"] or Decimal("0.00")
    summary.last_calculated_at = timezone.now()
    summary.save()

    return summary


def _decimal_string(value):
    if value is None:
        return "0.00"
    if not isinstance(value, Decimal):
        value = Decimal(value)
    return str(value.quantize(Decimal("0.01")))


def build_student_insight_summary(student):
    from apps.attempts.models import StudentAnswer, StudentExamAttempt
    from apps.results.models import ExamResult, StudentTopicPerformance

    results = list(
        ExamResult.objects.filter(student=student, is_active=True)
        .select_related("exam")
        .order_by("-published_at", "-created_at")
    )
    topic_rows = list(
        StudentTopicPerformance.objects.filter(student=student, is_active=True)
        .select_related("subject", "topic")
        .order_by("subject__name", "topic__name")
    )
    attempts = list(
        StudentExamAttempt.objects.filter(student=student, is_active=True)
        .order_by("-started_at")
    )
    answers = list(
        StudentAnswer.objects.filter(
            attempt__student=student,
            attempt__status__in=["submitted", "auto_submitted"],
            is_active=True,
        )
        .select_related("question")
        .all()
    )

    average_percentage = (
        sum(Decimal(result.percentage) for result in results) / Decimal(len(results))
        if results
        else Decimal("0.00")
    )
    total_correct = sum(result.correct_answers for result in results)
    total_incorrect = sum(result.incorrect_answers for result in results)
    total_skipped = sum(result.skipped_questions for result in results)
    attempted_total = total_correct + total_incorrect
    accuracy_percentage = (
        (Decimal(total_correct) / Decimal(attempted_total)) * Decimal("100.00")
        if attempted_total
        else Decimal("0.00")
    )

    midpoint = len(results) // 2
    recent_slice = results[: midpoint or len(results)]
    previous_slice = results[midpoint:] if midpoint else []
    recent_average = (
        sum(Decimal(item.percentage) for item in recent_slice) / Decimal(len(recent_slice))
        if recent_slice
        else Decimal("0.00")
    )
    previous_average = (
        sum(Decimal(item.percentage) for item in previous_slice) / Decimal(len(previous_slice))
        if previous_slice
        else recent_average
    )
    trend_change = recent_average - previous_average
    if trend_change >= Decimal("3.00"):
        trend_direction = "improving"
    elif trend_change <= Decimal("-3.00"):
        trend_direction = "declining"
    else:
        trend_direction = "stable"

    subject_buckets = {}
    topic_buckets = []
    for row in topic_rows:
        subject_key = row.subject_id
        bucket = subject_buckets.setdefault(
            subject_key,
            {
                "subject_id": str(row.subject_id),
                "subject_name": row.subject.name,
                "total_percentage": Decimal("0.00"),
                "count": 0,
                "attempted_questions": 0,
                "skipped_questions": 0,
            },
        )
        bucket["total_percentage"] += Decimal(row.percentage)
        bucket["count"] += 1
        bucket["attempted_questions"] += row.attempted_questions
        bucket["skipped_questions"] += row.skipped_questions
        if row.topic_id:
            topic_buckets.append(
                {
                    "topic_id": str(row.topic_id),
                    "topic_name": row.topic.name,
                    "subject_name": row.subject.name,
                    "average_percentage": Decimal(row.percentage),
                    "attempted_questions": row.attempted_questions,
                    "skipped_questions": row.skipped_questions,
                }
            )

    subject_rows = []
    for bucket in subject_buckets.values():
        count = bucket["count"] or 1
        subject_rows.append(
            {
                "subject_id": bucket["subject_id"],
                "subject_name": bucket["subject_name"],
                "average_percentage": bucket["total_percentage"] / Decimal(count),
                "attempted_questions": bucket["attempted_questions"],
                "skipped_questions": bucket["skipped_questions"],
            }
        )
    strongest_subjects = sorted(
        subject_rows,
        key=lambda item: (-item["average_percentage"], item["subject_name"]),
    )[:3]
    weakest_subjects = sorted(
        subject_rows,
        key=lambda item: (item["average_percentage"], item["subject_name"]),
    )[:3]
    weak_topics = sorted(
        topic_buckets,
        key=lambda item: (item["average_percentage"], -item["skipped_questions"]),
    )[:5]

    question_type_buckets = {}
    for answer in answers:
        question_type = answer.question.question_type
        bucket = question_type_buckets.setdefault(
            question_type,
            {"question_type": question_type, "wrong": 0, "skipped": 0, "total": 0},
        )
        bucket["total"] += 1
        if answer.selected_option_id:
            if not answer.is_correct:
                bucket["wrong"] += 1
        else:
            bucket["skipped"] += 1

    weak_question_types = []
    for bucket in question_type_buckets.values():
        total = bucket["total"] or 1
        weak_question_types.append(
            {
                "question_type": bucket["question_type"],
                "wrong_percentage": _decimal_string(
                    (Decimal(bucket["wrong"]) / Decimal(total)) * Decimal("100.00")
                ),
                "skip_percentage": _decimal_string(
                    (Decimal(bucket["skipped"]) / Decimal(total)) * Decimal("100.00")
                ),
                "wrong_count": bucket["wrong"],
                "skipped_count": bucket["skipped"],
                "total": bucket["total"],
            }
        )
    weak_question_types.sort(
        key=lambda item: (Decimal(item["wrong_percentage"]), Decimal(item["skip_percentage"])),
        reverse=True,
    )

    insight_messages = []
    if strongest_subjects:
        insight_messages.append(
            f"You perform strongly in {strongest_subjects[0]['subject_name']}."
        )
    if weakest_subjects and Decimal(weakest_subjects[0]["average_percentage"]) < average_percentage:
        insight_messages.append(
            f"{weakest_subjects[0]['subject_name']} accuracy is below your overall average."
        )
    if weak_topics:
        insight_messages.append(
            f"Focus next on {weak_topics[0]['topic_name']} in {weak_topics[0]['subject_name']}."
        )
    if total_skipped >= max(3, len(results)):
        insight_messages.append("You are skipping too many questions. Build confidence on first-pass attempts.")
    if trend_direction == "improving":
        insight_messages.append("Your recent exam scores show a positive improvement trend.")
    elif trend_direction == "declining":
        insight_messages.append("Your recent scores dipped slightly. Review weak topics before the next test.")

    return {
        "student_id": str(student.id),
        "average_percentage": _decimal_string(average_percentage),
        "accuracy_percentage": _decimal_string(accuracy_percentage),
        "attempted_questions": attempted_total,
        "skipped_questions": total_skipped,
        "recent_exams": [
            {
                "exam_id": str(result.exam_id),
                "exam_title": result.exam.title,
                "exam_code": result.exam.code,
                "percentage": _decimal_string(result.percentage),
                "final_score": _decimal_string(result.final_score),
                "result_status": result.result_status,
                "published_at": result.published_at.isoformat() if result.published_at else None,
            }
            for result in results[:5]
        ],
        "strongest_subjects": [
            {**item, "average_percentage": _decimal_string(item["average_percentage"])}
            for item in strongest_subjects
        ],
        "weakest_subjects": [
            {**item, "average_percentage": _decimal_string(item["average_percentage"])}
            for item in weakest_subjects
        ],
        "weak_topics": [
            {**item, "average_percentage": _decimal_string(item["average_percentage"])}
            for item in weak_topics
        ],
        "improvement_trend": {
            "direction": trend_direction,
            "change_percentage": _decimal_string(trend_change),
        },
        "weak_question_types": weak_question_types[:3],
        "insight_messages": insight_messages,
        "attempt_behavior": {
            "attempt_count": len(attempts),
            "attempted_questions": attempted_total,
            "skipped_questions": total_skipped,
        },
    }


def build_teacher_insight_summary(user):
    from apps.accounts.scopes import scope_teacher_queryset
    from apps.attempts.models import StudentAnswer, StudentExamAttempt
    from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance

    summary_qs = scope_teacher_queryset(
        ExamPerformanceSummary.objects.select_related("exam", "institute"),
        user,
    ).filter(is_active=True)
    result_qs = scope_teacher_queryset(
        ExamResult.objects.select_related("exam", "student"),
        user,
    ).filter(is_active=True)
    attempt_qs = scope_teacher_queryset(
        StudentExamAttempt.objects.select_related("exam", "student"),
        user,
    ).filter(is_active=True)
    topic_qs = scope_teacher_queryset(
        StudentTopicPerformance.objects.select_related("subject", "topic", "student", "exam"),
        user,
    ).filter(is_active=True)

    total_attempts = attempt_qs.count()
    avg_percentage = result_qs.aggregate(value=Avg("percentage"))["value"] or Decimal("0.00")
    total_correct = result_qs.aggregate(value=Sum("correct_answers"))["value"] or 0
    total_incorrect = result_qs.aggregate(value=Sum("incorrect_answers"))["value"] or 0
    attempted_total = total_correct + total_incorrect
    accuracy_percentage = (
        (Decimal(total_correct) / Decimal(attempted_total)) * Decimal("100.00")
        if attempted_total
        else Decimal("0.00")
    )
    avg_time = attempt_qs.aggregate(value=Avg("time_taken_seconds"))["value"] or 0

    student_rollups = {}
    for result in result_qs.order_by("student__full_name"):
        bucket = student_rollups.setdefault(
            result.student_id,
            {
                "student_id": str(result.student_id),
                "student_name": result.student.full_name,
                "admission_no": result.student.admission_no,
                "total_percentage": Decimal("0.00"),
                "count": 0,
            },
        )
        bucket["total_percentage"] += Decimal(result.percentage)
        bucket["count"] += 1
    student_summary = [
        {
            **item,
            "average_percentage": item["total_percentage"] / Decimal(item["count"] or 1),
        }
        for item in student_rollups.values()
    ]
    high_students = sorted(
        student_summary,
        key=lambda item: (-item["average_percentage"], item["student_name"]),
    )[:5]
    low_students = sorted(
        student_summary,
        key=lambda item: (item["average_percentage"], item["student_name"]),
    )[:5]

    weak_topic_rows = {}
    for row in topic_qs:
        key = (row.subject_id, row.topic_id)
        bucket = weak_topic_rows.setdefault(
            key,
            {
                "subject_name": row.subject.name,
                "topic_name": row.topic.name if row.topic_id else None,
                "total_percentage": Decimal("0.00"),
                "count": 0,
                "attempted_questions": 0,
            },
        )
        bucket["total_percentage"] += Decimal(row.percentage)
        bucket["count"] += 1
        bucket["attempted_questions"] += row.attempted_questions
    weak_topics = [
        {
            **item,
            "average_percentage": item["total_percentage"] / Decimal(item["count"] or 1),
        }
        for item in weak_topic_rows.values()
    ]
    weak_topics = sorted(
        weak_topics,
        key=lambda item: (item["average_percentage"], -item["attempted_questions"]),
    )[:5]

    answer_rows = (
        StudentAnswer.objects.filter(attempt__in=attempt_qs, is_active=True)
        .select_related("question", "question__subject", "question__topic")
        .values(
            "question_id",
            "question__question_text",
            "question__subject__name",
            "question__topic__name",
        )
        .annotate(
            total_attempts=Count("id"),
            wrong_count=Count("id", filter=Q(selected_option__isnull=False, is_correct=False)),
            skipped_count=Count("id", filter=Q(selected_option__isnull=True)),
        )
    )
    most_wrong = sorted(answer_rows, key=lambda item: item["wrong_count"], reverse=True)[:5]
    most_skipped = sorted(answer_rows, key=lambda item: item["skipped_count"], reverse=True)[:5]

    return {
        "overview": {
            "tracked_exams": summary_qs.count(),
            "total_attempts": total_attempts,
            "average_percentage": _decimal_string(avg_percentage),
            "accuracy_percentage": _decimal_string(accuracy_percentage),
            "average_time_taken_seconds": int(avg_time or 0),
        },
        "exam_overview": [
            {
                "exam_id": str(summary.exam_id),
                "exam_title": summary.exam.title,
                "exam_code": summary.exam.code,
                "total_attempted": summary.total_attempted,
                "total_passed": summary.total_passed,
                "total_failed": summary.total_failed,
                "average_percentage": _decimal_string(summary.average_percentage),
                "highest_score": _decimal_string(summary.highest_score),
                "lowest_score": _decimal_string(summary.lowest_score),
            }
            for summary in summary_qs.order_by("-last_calculated_at")[:6]
        ],
        "high_performing_students": [
            {**item, "average_percentage": _decimal_string(item["average_percentage"])}
            for item in high_students
        ],
        "low_performing_students": [
            {**item, "average_percentage": _decimal_string(item["average_percentage"])}
            for item in low_students
        ],
        "weak_topics": [
            {**item, "average_percentage": _decimal_string(item["average_percentage"])}
            for item in weak_topics
        ],
        "most_wrong_questions": [
            {
                "question_id": str(item["question_id"]),
                "question_text_summary": item["question__question_text"][:120]
                + ("..." if len(item["question__question_text"]) > 120 else ""),
                "subject_name": item["question__subject__name"],
                "topic_name": item["question__topic__name"],
                "wrong_count": item["wrong_count"],
                "total_attempts": item["total_attempts"],
            }
            for item in most_wrong
        ],
        "most_skipped_questions": [
            {
                "question_id": str(item["question_id"]),
                "question_text_summary": item["question__question_text"][:120]
                + ("..." if len(item["question__question_text"]) > 120 else ""),
                "subject_name": item["question__subject__name"],
                "topic_name": item["question__topic__name"],
                "skipped_count": item["skipped_count"],
                "total_attempts": item["total_attempts"],
            }
            for item in most_skipped
        ],
    }


def build_teacher_question_performance_summary(user):
    from apps.accounts.scopes import scope_question_queryset, scope_teacher_queryset
    from apps.attempts.models import StudentAnswer, StudentExamAttempt
    from apps.question_bank.models import Question

    questions = list(
        scope_question_queryset(
            Question.objects.select_related("subject", "topic", "created_by_teacher"),
            user,
        ).filter(is_active=True)
    )
    attempt_qs = scope_teacher_queryset(
        StudentExamAttempt.objects.select_related("exam", "student"),
        user,
    ).filter(is_active=True)
    performance_rows = (
        StudentAnswer.objects.filter(attempt__in=attempt_qs, is_active=True)
        .values("question_id")
        .annotate(
            usage_count=Count("id"),
            correct_count=Count("id", filter=Q(selected_option__isnull=False, is_correct=True)),
            wrong_count=Count("id", filter=Q(selected_option__isnull=False, is_correct=False)),
            skipped_count=Count("id", filter=Q(selected_option__isnull=True)),
        )
    )
    performance_map = {row["question_id"]: row for row in performance_rows}
    payload = []
    for question in questions:
        stats = performance_map.get(question.id, {})
        usage_count = stats.get("usage_count", 0)
        correct_count = stats.get("correct_count", 0)
        wrong_count = stats.get("wrong_count", 0)
        skipped_count = stats.get("skipped_count", 0)
        payload.append(
            {
                "question_id": str(question.id),
                "question_text_summary": question.question_text[:120]
                + ("..." if len(question.question_text) > 120 else ""),
                "question_type": question.question_type,
                "difficulty_level": question.difficulty_level,
                "subject_name": question.subject.name if question.subject_id else None,
                "topic_name": question.topic.name if question.topic_id else None,
                "has_explanation": bool(question.explanation.strip()),
                "is_verified": question.is_verified,
                "usage_count": usage_count,
                "correct_attempt_percentage": _decimal_string(
                    (Decimal(correct_count) / Decimal(usage_count)) * Decimal("100.00")
                    if usage_count
                    else Decimal("0.00")
                ),
                "wrong_attempt_percentage": _decimal_string(
                    (Decimal(wrong_count) / Decimal(usage_count)) * Decimal("100.00")
                    if usage_count
                    else Decimal("0.00")
                ),
                "skip_percentage": _decimal_string(
                    (Decimal(skipped_count) / Decimal(usage_count)) * Decimal("100.00")
                    if usage_count
                    else Decimal("0.00")
                ),
                "correct_count": correct_count,
                "wrong_count": wrong_count,
                "skipped_count": skipped_count,
            }
        )
    payload.sort(
        key=lambda item: (Decimal(item["wrong_attempt_percentage"]), Decimal(item["skip_percentage"])),
        reverse=True,
    )
    return payload
