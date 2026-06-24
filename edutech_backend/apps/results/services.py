from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg, Count, F, Max, Min, Prefetch, Q, Sum, Window
from django.db.models.functions import RowNumber
from django.utils import timezone

from apps.attempts.models import StudentAnswer
from apps.attempts.services import (
    attempt_has_pending_manual_review,
    attempt_integrity_summary,
    hydrate_attempt_integrity_summaries,
    unresolved_review_tasks_queryset,
)
from apps.exams.services import (
    choose_attempt_for_result_policy,
    is_result_visible_for_attempt,
    resolve_result_publish_mode,
    resolve_exam_experience_profile,
)


def _score_distribution_buckets(results_qs):
    bucket_specs = [
        ("0-24", 0, 25),
        ("25-49", 25, 50),
        ("50-69", 50, 70),
        ("70-84", 70, 85),
        ("85-100", 85, 101),
    ]
    buckets = []
    total = results_qs.count()
    for label, lower, upper in bucket_specs:
        if upper == 101:
            count = results_qs.filter(percentage__gte=lower, percentage__lte=100).count()
        else:
            count = results_qs.filter(percentage__gte=lower, percentage__lt=upper).count()
        buckets.append(
            {
                "label": label,
                "min_percentage": lower,
                "max_percentage": 100 if upper == 101 else upper - 1,
                "count": count,
                "percentage_share": round((count / total) * 100, 2) if total > 0 else 0.0,
            }
        )
    return buckets


def _section_performance_summary(exam):
    exam_questions = list(
        exam.exam_questions.filter(is_active=True)
        .select_related("section", "question")
        .order_by("question_order", "created_at")
    )
    if not exam_questions:
        return []

    question_map = {
        str(item.question_id): item
        for item in exam_questions
    }
    section_stats = {}
    unsectioned_key = "unsectioned"

    def ensure_entry(*, key, label, order):
        return section_stats.setdefault(
            key,
            {
                "section_id": None if key == unsectioned_key else key,
                "section_name": label,
                "section_order": order,
                "total_questions": 0,
                "attempted_answers": 0,
                "correct_answers": 0,
                "wrong_answers": 0,
                "skipped_answers": 0,
                "marks_awarded": Decimal("0.00"),
                "negative_marks_applied": Decimal("0.00"),
                "total_time_seconds": 0,
            },
        )

    for item in exam_questions:
        section_key = str(item.section_id) if item.section_id else unsectioned_key
        section_label = item.section.name if item.section_id else item.section_name or "No section"
        section_order = item.section.section_order if item.section_id else 9999
        entry = ensure_entry(key=section_key, label=section_label, order=section_order)
        entry["total_questions"] += 1

    answers = StudentAnswer.objects.filter(
        attempt__exam=exam,
        attempt__is_active=True,
        is_active=True,
    ).select_related("question")

    for answer in answers:
        exam_question = question_map.get(str(answer.question_id))
        if exam_question is None:
            continue
        section_key = str(exam_question.section_id) if exam_question.section_id else unsectioned_key
        section_label = exam_question.section.name if exam_question.section_id else exam_question.section_name or "No section"
        section_order = exam_question.section.section_order if exam_question.section_id else 9999
        entry = ensure_entry(key=section_key, label=section_label, order=section_order)
        has_response = bool(
            answer.selected_option_id
            or (answer.selected_option_ids or [])
            or (answer.answer_text or "").strip()
        )
        if has_response:
            entry["attempted_answers"] += 1
            if answer.is_correct:
                entry["correct_answers"] += 1
            else:
                entry["wrong_answers"] += 1
        else:
            entry["skipped_answers"] += 1
        entry["marks_awarded"] += answer.marks_awarded or Decimal("0.00")
        entry["negative_marks_applied"] += answer.negative_marks_applied or Decimal("0.00")
        entry["total_time_seconds"] += int(answer.time_spent_seconds or 0)

    payload = []
    for item in sorted(section_stats.values(), key=lambda row: (row["section_order"], row["section_name"])):
        attempts_total = item["correct_answers"] + item["wrong_answers"] + item["skipped_answers"]
        answered_total = item["correct_answers"] + item["wrong_answers"]
        payload.append(
            {
                "section_id": item["section_id"],
                "section_name": item["section_name"],
                "section_order": item["section_order"],
                "total_questions": item["total_questions"],
                "attempted_answers": item["attempted_answers"],
                "correct_answers": item["correct_answers"],
                "wrong_answers": item["wrong_answers"],
                "skipped_answers": item["skipped_answers"],
                "accuracy_percentage": round((item["correct_answers"] / answered_total) * 100, 2)
                if answered_total > 0
                else 0.0,
                "skip_percentage": round((item["skipped_answers"] / attempts_total) * 100, 2)
                if attempts_total > 0
                else 0.0,
                "marks_awarded": _decimal_string(item["marks_awarded"]),
                "negative_marks_applied": _decimal_string(item["negative_marks_applied"]),
                "average_time_seconds": round(item["total_time_seconds"] / attempts_total, 2)
                if attempts_total > 0
                else 0.0,
            }
        )
    return payload


def attempt_monitor_alerts(attempt, *, at_time=None):
    cached = getattr(attempt, "_monitor_alerts_cache", None)
    if cached is not None:
        return cached

    now = at_time or timezone.now()
    alerts = []
    integrity = attempt_integrity_summary(attempt)

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

    if integrity["threshold_reached"]:
        alerts.append(
            {
                "code": "integrity_threshold_reached",
                "label": "Integrity threshold reached",
                "severity": "high",
                "message": (
                    f"The attempt recorded {integrity['violation_count']} integrity violations and reached the escalation threshold."
                ),
            }
        )
    elif integrity["violation_count"] > 0:
        latest_event = integrity["latest_event"]
        latest_label = (
            str(latest_event["event_type"]).replace("_", " ")
            if latest_event and latest_event.get("event_type")
            else "integrity event"
        )
        alerts.append(
            {
                "code": "integrity_warnings",
                "label": "Integrity warnings",
                "severity": "medium" if integrity["violation_count"] < 3 else "high",
                "message": (
                    f"{integrity['violation_count']} integrity warnings recorded. Latest event: {latest_label}."
                ),
            }
        )

    attempt._monitor_alerts_cache = alerts
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
    cached = getattr(attempt, "_force_submit_eligibility_cache", None)
    if cached is not None:
        return cached

    if attempt.status != "in_progress":
        result = {
            "allowed": False,
            "reason": "Only in-progress attempts can be force-submitted.",
        }
        attempt._force_submit_eligibility_cache = result
        return result

    if attempt.exam.status == "draft":
        result = {
            "allowed": False,
            "reason": "Draft exams should not have operational attempt controls yet.",
        }
        attempt._force_submit_eligibility_cache = result
        return result

    if attempt.exam.status == "cancelled":
        result = {
            "allowed": False,
            "reason": "Cancelled exams should not accept new operational attempt actions.",
        }
        attempt._force_submit_eligibility_cache = result
        return result

    result = {
        "allowed": True,
        "reason": None,
    }
    attempt._force_submit_eligibility_cache = result
    return result


def hydrate_teacher_attempt_monitor_payloads(attempts, *, at_time=None):
    attempts = hydrate_attempt_integrity_summaries(attempts)
    now = at_time or timezone.now()

    for attempt in attempts:
        if not hasattr(attempt, "_force_submit_eligibility_cache"):
            attempt._force_submit_eligibility_cache = force_submit_eligibility(attempt)
        if not hasattr(attempt, "_monitor_alerts_cache"):
            attempt._monitor_alerts_cache = attempt_monitor_alerts(attempt, at_time=now)

    return attempts


def attempt_monitor_metadata(attempt):
    cached = getattr(attempt, "_monitor_metadata_cache", None)
    if cached is not None:
        return cached

    alerts = attempt_monitor_alerts(attempt)
    summary = attempt_integrity_summary(attempt)

    if (
        attempt.is_auto_submitted
        or summary["threshold_reached"]
        or any(alert["severity"] == "high" for alert in alerts)
    ):
        health = "critical"
    elif (
        summary["violation_count"] > 0
        or any(alert["severity"] == "medium" for alert in alerts)
        or attempt.status == "in_progress"
    ):
        health = "watch"
    else:
        health = "stable"

    priority_score = 0
    if attempt.is_auto_submitted:
        priority_score += 100
    if summary["threshold_reached"]:
        priority_score += 80
    if any(alert["severity"] == "high" for alert in alerts):
        priority_score += 60
    if any(alert["severity"] == "medium" for alert in alerts):
        priority_score += 30
    priority_score += min(summary["violation_count"], 10) * 5
    if attempt.status == "in_progress":
        priority_score += 10

    cached = {
        "alerts": alerts,
        "integrity_summary": summary,
        "health": health,
        "priority_score": priority_score,
    }
    attempt._monitor_metadata_cache = cached
    return cached


def attempt_monitor_health(attempt):
    return attempt_monitor_metadata(attempt)["health"]


def attempt_monitor_priority_score(attempt):
    return attempt_monitor_metadata(attempt)["priority_score"]


def filter_teacher_attempt_monitor_payloads(attempts, filter_value):
    if filter_value == "low_performers":
        return [attempt for attempt in attempts if float(attempt.percentage or 0) < 40]
    if filter_value == "skipped_heavy":
        return [attempt for attempt in attempts if attempt.skipped_questions >= 3]
    if filter_value == "critical":
        return [attempt for attempt in attempts if attempt_monitor_health(attempt) == "critical"]
    if filter_value == "watch":
        return [attempt for attempt in attempts if attempt_monitor_health(attempt) == "watch"]
    if filter_value == "stable":
        return [attempt for attempt in attempts if attempt_monitor_health(attempt) == "stable"]
    if filter_value == "in_progress":
        return [attempt for attempt in attempts if attempt.status == "in_progress"]
    if filter_value == "auto_submitted":
        return [attempt for attempt in attempts if attempt.is_auto_submitted]
    return list(attempts)


def search_teacher_attempt_monitor_payloads(attempts, search_value):
    query = str(search_value or "").strip().lower()
    if not query:
        return list(attempts)

    def haystack(attempt):
        return " ".join(
            [
                str(attempt.student_name or ""),
                str(attempt.student_admission_no or ""),
                str(attempt.status or ""),
                str(attempt.exam_title or ""),
                " ".join(str(alert.get("label", "")) for alert in attempt_monitor_alerts(attempt)),
            ]
        ).lower()

    return [attempt for attempt in attempts if query in haystack(attempt)]


def summarize_teacher_attempt_monitor_payloads(attempts, *, recent_limit=8):
    attempts = list(attempts)
    summary = {
        "alerted_attempts": 0,
        "high_alert_attempts": 0,
        "medium_alert_attempts": 0,
        "stalled_attempts": 0,
        "integrity_warning_attempts": 0,
        "integrity_warnings_total": 0,
        "threshold_reached_attempts": 0,
        "attempts_by_health": {"critical": 0, "watch": 0, "stable": 0},
        "recent_attempts": [],
    }
    if not attempts:
        return summary

    for attempt in attempts:
        metadata = attempt_monitor_metadata(attempt)
        alerts = metadata["alerts"]
        integrity_summary = metadata["integrity_summary"]
        summary["attempts_by_health"][metadata["health"]] += 1
        if alerts:
            summary["alerted_attempts"] += 1
        if any(alert["code"] == "stalled_activity" for alert in alerts):
            summary["stalled_attempts"] += 1
        if any(alert["severity"] == "high" for alert in alerts):
            summary["high_alert_attempts"] += 1
        elif any(alert["severity"] == "medium" for alert in alerts):
            summary["medium_alert_attempts"] += 1
        if integrity_summary["violation_count"] > 0:
            summary["integrity_warning_attempts"] += 1
            summary["integrity_warnings_total"] += integrity_summary["violation_count"]
        if integrity_summary["threshold_reached"]:
            summary["threshold_reached_attempts"] += 1

    summary["recent_attempts"] = list(
        sorted(
            attempts,
            key=lambda attempt: (
                attempt_monitor_metadata(attempt)["priority_score"],
                attempt.updated_at or attempt.started_at or timezone.now(),
            ),
            reverse=True,
        )[:recent_limit]
    )
    return summary


def sort_teacher_attempt_monitor_payloads(attempts, sort_value):
    attempts = list(attempts)

    def activity_time(attempt):
        return attempt.submitted_at or attempt.started_at or timezone.now()

    if sort_value == "name":
        attempts.sort(
            key=lambda attempt: (
                str(attempt.student_name or "").lower(),
                -attempt_monitor_priority_score(attempt),
                -activity_time(attempt).timestamp(),
            )
        )
        return attempts

    if sort_value == "alerts_high":
        attempts.sort(
            key=lambda attempt: (
                -len(attempt_monitor_alerts(attempt)),
                -attempt_monitor_priority_score(attempt),
                -activity_time(attempt).timestamp(),
            )
        )
        return attempts

    if sort_value == "score_low":
        attempts.sort(
            key=lambda attempt: (
                float(attempt.percentage or 0),
                -attempt_monitor_priority_score(attempt),
                -activity_time(attempt).timestamp(),
            )
        )
        return attempts

    if sort_value in {"warnings_high", "risk_high"}:
        attempts.sort(
            key=lambda attempt: (
                -attempt_integrity_summary(attempt)["violation_count"],
                -attempt_monitor_priority_score(attempt),
                -activity_time(attempt).timestamp(),
            )
        )
        return attempts

    if sort_value == "time_long":
        attempts.sort(
            key=lambda attempt: (
                -(attempt.time_taken_seconds or 0),
                -attempt_monitor_priority_score(attempt),
                -activity_time(attempt).timestamp(),
            )
        )
        return attempts

    attempts.sort(
        key=lambda attempt: (
            -activity_time(attempt).timestamp(),
            -attempt_monitor_priority_score(attempt),
        )
    )
    return attempts


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
    from apps.economy.services import process_exam_result_rewards
    from apps.results.models import ExamResult

    if attempt.status not in {"submitted", "auto_submitted"}:
        raise ValidationError({"attempt": "Attempt must be submitted or auto-submitted."})
    if attempt_has_pending_manual_review(attempt):
        raise ValidationError({"attempt": "Result cannot be generated until all manual-review answers are graded."})

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
    process_exam_result_rewards(result=result)

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
    unresolved_review_count = unresolved_review_tasks_queryset(exam=exam).count()
    if unresolved_review_count:
        raise ValidationError(
            {
                "exam": (
                    "Results cannot be published while review tasks are unresolved. "
                    f"{unresolved_review_count} review task(s) still need attention."
                )
            }
        )

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
    metadata = {
        "score_distribution": _score_distribution_buckets(results_qs),
        "section_performance": _section_performance_summary(exam),
        "experience_profile": resolve_exam_experience_profile(exam),
    }

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
            "metadata": metadata,
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
    summary.metadata = metadata
    summary.save()

    return summary


def _decimal_string(value):
    if value is None:
        return "0.00"
    if not isinstance(value, Decimal):
        value = Decimal(value)
    return str(value.quantize(Decimal("0.01")))


def _answered_filter():
    return (
        Q(selected_option__isnull=False)
        | ~Q(answer_text="")
        | ~Q(selected_option_ids=[])
    )


def _response_flags(answer):
    selected_option_ids = getattr(answer, "selected_option_ids", []) or []
    answer_text = (getattr(answer, "answer_text", "") or "").strip()
    has_response = bool(answer.selected_option_id or selected_option_ids or answer_text)
    if not has_response:
        return {
            "has_response": False,
            "result_status": "skipped",
        }
    return {
        "has_response": True,
        "result_status": "correct" if answer.is_correct else "wrong",
    }


def _category_label_for_question(question):
    tag_maps = getattr(question, "tag_maps", None)
    if tag_maps is not None:
        active_tags = [
            getattr(item.tag, "name", "").strip()
            for item in tag_maps.all()
            if item.is_active and getattr(item, "tag", None) is not None and item.tag.is_active
        ]
        if active_tags:
            return active_tags[0]

    metadata = question.metadata if isinstance(getattr(question, "metadata", {}), dict) else {}
    for key in ("question_category", "question_pattern", "authored_question_type", "source_pack"):
        value = metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip().replace("_", " ").title()
    return "General"


def _attachment_payloads(question):
    payload = []
    attachments = getattr(question, "attachments", None)
    if attachments is None:
        return payload
    for item in attachments.all():
        if not item.is_active:
            continue
        try:
            file_url = item.file.url if item.file else ""
        except ValueError:
            file_url = ""
        payload.append(
            {
                "id": str(item.id),
                "title": item.title,
                "attachment_type": item.attachment_type,
                "file_url": file_url,
                "alt_text": item.alt_text,
                "is_inline": item.is_inline,
            }
        )
    payload.sort(key=lambda item: (0 if item["is_inline"] else 1, item["title"] or ""))
    return payload


def _tag_labels(question):
    labels = []
    tag_maps = getattr(question, "tag_maps", None)
    if tag_maps is None:
        return labels
    for item in tag_maps.all():
        if item.is_active and getattr(item, "tag", None) is not None and item.tag.is_active:
            tag_name = (item.tag.name or "").strip()
            if tag_name:
                labels.append(tag_name)
    return labels


def _aggregate_answer_benchmark(queryset):
    total = queryset.count()
    if total <= 0:
        return None

    answered_filter = _answered_filter()
    correct_count = queryset.filter(answered_filter, is_correct=True).count()
    skipped_count = queryset.exclude(answered_filter).count()
    wrong_count = max(total - correct_count - skipped_count, 0)
    accuracy = (
        (Decimal(correct_count) / Decimal(total)) * Decimal("100.00")
        if total
        else Decimal("0.00")
    )
    return {
        "participant_count": total,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "skipped_count": skipped_count,
        "correct_percentage": _decimal_string(accuracy),
    }


def _peer_result_benchmark(queryset):
    participant_count = queryset.count()
    if participant_count <= 0:
        return None

    aggregates = queryset.aggregate(
        average_percentage=Avg("percentage"),
        correct_answers=Sum("correct_answers"),
        incorrect_answers=Sum("incorrect_answers"),
    )
    correct_answers = int(aggregates["correct_answers"] or 0)
    incorrect_answers = int(aggregates["incorrect_answers"] or 0)
    attempted_total = correct_answers + incorrect_answers
    accuracy = (
        (Decimal(correct_answers) / Decimal(attempted_total)) * Decimal("100.00")
        if attempted_total
        else Decimal("0.00")
    )
    return {
        "participant_count": participant_count,
        "average_percentage": _decimal_string(aggregates["average_percentage"] or Decimal("0.00")),
        "accuracy_percentage": _decimal_string(accuracy),
    }


def _student_benchmark_dimensions(student):
    from apps.results.models import ExamResult

    base = ExamResult.objects.filter(
        is_active=True,
        is_published=True,
        student__program_id=student.program_id,
    ).select_related("student", "student__institute")

    institute = getattr(student, "institute", None)
    city = (getattr(institute, "city", "") or "").strip()
    state = (getattr(institute, "state", "") or "").strip()

    dimensions = [
        (
            "school",
            "School",
            base.filter(student__institute_id=student.institute_id).exclude(student_id=student.id),
        ),
        (
            "program",
            "Class Level",
            base.exclude(student_id=student.id),
        ),
    ]
    if city:
        dimensions.append(
            (
                "city",
                "City",
                base.filter(student__institute__city__iexact=city).exclude(student_id=student.id),
            )
        )
    if state:
        dimensions.append(
            (
                "state",
                "State",
                base.filter(student__institute__state__iexact=state).exclude(student_id=student.id),
            )
        )

    benchmark_overview = []
    for code, label, queryset in dimensions:
        payload = _peer_result_benchmark(queryset)
        if payload is None:
            continue
        benchmark_overview.append(
            {
                "scope": code,
                "label": label,
                **payload,
            }
        )
    return benchmark_overview


def build_student_question_analytics(
    student,
    *,
    subject=None,
    topic=None,
    question_type=None,
    source=None,
    teacher=None,
):
    from apps.attempts.models import StudentAnswer
    from apps.question_bank.models import QuestionAttachment, QuestionTagMap

    normalized_subject = (subject or "").strip()
    normalized_question_type = (question_type or "").strip()
    normalized_source = (source or "").strip()
    normalized_teacher = (teacher or "").strip()

    latest_answers_qs = (
        StudentAnswer.objects.filter(
            attempt__student=student,
            attempt__status__in=["submitted", "auto_submitted"],
            is_active=True,
        )
        .annotate(
            _latest_rank=Window(
                expression=RowNumber(),
                partition_by=[F("question_id")],
                order_by=[
                    F("answered_at").desc(nulls_last=True),
                    F("created_at").desc(),
                    F("id").desc(),
                ],
            )
        )
        .filter(_latest_rank=1)
        .select_related(
            "question",
            "question__subject",
            "question__topic",
        )
        .prefetch_related(
            Prefetch(
                "question__attachments",
                queryset=QuestionAttachment.objects.filter(is_active=True).only(
                    "id",
                    "question_id",
                    "file",
                    "attachment_type",
                    "title",
                    "alt_text",
                    "is_inline",
                    "display_order",
                    "is_active",
                ),
            ),
            Prefetch(
                "question__tag_maps",
                queryset=QuestionTagMap.objects.filter(is_active=True, tag__is_active=True)
                .select_related("tag")
                .only(
                    "id",
                    "question_id",
                    "tag_id",
                    "is_active",
                    "tag__name",
                    "tag__is_active",
                ),
            ),
        )
        .only(
            "id",
            "question_id",
            "selected_option_id",
            "selected_option_ids",
            "answer_text",
            "is_correct",
            "marks_awarded",
            "negative_marks_applied",
            "time_spent_seconds",
            "question__id",
            "question__question_text",
            "question__question_type",
            "question__difficulty_level",
            "question__metadata",
            "question__explanation",
            "question__subject_id",
            "question__subject__name",
            "question__topic_id",
            "question__topic__name",
        )
    )
    if normalized_subject:
        latest_answers_qs = latest_answers_qs.filter(question__subject__name__iexact=normalized_subject)
    if topic:
        latest_answers_qs = latest_answers_qs.filter(question__topic_id=topic)
    if normalized_question_type:
        latest_answers_qs = latest_answers_qs.filter(question__question_type=normalized_question_type)
    if normalized_source and normalized_source in {"platform", "institute", "teacher"}:
        latest_answers_qs = latest_answers_qs.filter(attempt__exam__source_type=normalized_source)
        if normalized_source == "teacher" and normalized_teacher:
            latest_answers_qs = latest_answers_qs.filter(
                attempt__exam__source_teacher_id=normalized_teacher
            )

    latest_answers = list(latest_answers_qs)
    question_ids = [answer.question_id for answer in latest_answers]
    if not question_ids:
        return {
            "overview": {
                "question_count": 0,
                "attempted_count": 0,
                "correct_count": 0,
                "wrong_count": 0,
                "skipped_count": 0,
            },
            "benchmark_overview": _student_benchmark_dimensions(student),
            "questions": [],
        }

    peer_base = StudentAnswer.objects.filter(
        question_id__in=question_ids,
        attempt__status__in=["submitted", "auto_submitted"],
        is_active=True,
    ).exclude(
        attempt__student_id=student.id,
    )
    if normalized_source and normalized_source in {"platform", "institute", "teacher"}:
        peer_base = peer_base.filter(attempt__exam__source_type=normalized_source)
        if normalized_source == "teacher" and normalized_teacher:
            peer_base = peer_base.filter(attempt__exam__source_teacher_id=normalized_teacher)

    city = (getattr(student.institute, "city", "") or "").strip()
    state = (getattr(student.institute, "state", "") or "").strip()

    dimension_querysets = {
        "school": peer_base.filter(attempt__student__institute_id=student.institute_id),
        "program": peer_base.filter(attempt__student__program_id=student.program_id),
    }
    if city:
        dimension_querysets["city"] = peer_base.filter(attempt__student__institute__city__iexact=city)
    if state:
        dimension_querysets["state"] = peer_base.filter(attempt__student__institute__state__iexact=state)

    benchmark_maps = {}
    answered_filter = _answered_filter()
    for scope, queryset in dimension_querysets.items():
        benchmark_rows = (
            queryset.values("question_id")
            .annotate(
                total=Count("id"),
                correct_count=Count("id", filter=answered_filter & Q(is_correct=True)),
                skipped_count=Count("id", filter=~answered_filter),
            )
        )
        scope_map = {}
        for row in benchmark_rows:
            total = row["total"] or 0
            correct_count = row["correct_count"] or 0
            skipped_count = row["skipped_count"] or 0
            wrong_count = max(total - correct_count - skipped_count, 0)
            scope_map[row["question_id"]] = {
                "participant_count": total,
                "correct_count": correct_count,
                "wrong_count": wrong_count,
                "skipped_count": skipped_count,
                "correct_percentage": _decimal_string(
                    (Decimal(correct_count) / Decimal(total)) * Decimal("100.00")
                    if total
                    else Decimal("0.00")
                ),
            }
        benchmark_maps[scope] = scope_map

    rows = []
    attempted_count = 0
    correct_count = 0
    wrong_count = 0
    skipped_count = 0
    for answer in latest_answers:
        question = answer.question
        flags = _response_flags(answer)
        if flags["has_response"]:
            attempted_count += 1
            if answer.is_correct:
                correct_count += 1
            else:
                wrong_count += 1
        else:
            skipped_count += 1

        rows.append(
            {
                "question_id": str(question.id),
                "question_text": question.question_text,
                "question_text_summary": question.question_text[:180]
                + ("..." if len(question.question_text) > 180 else ""),
                "subject_name": question.subject.name if question.subject_id else None,
                "topic_id": str(question.topic_id) if question.topic_id else None,
                "topic_name": question.topic.name if question.topic_id else None,
                "question_type": question.question_type,
                "difficulty_level": question.difficulty_level,
                "category_label": _category_label_for_question(question),
                "tag_labels": _tag_labels(question),
                "has_image": any(item.is_active for item in question.attachments.all()),
                "attachments": _attachment_payloads(question),
                "explanation": question.explanation,
                "attempted_by_you": flags["has_response"],
                "your_result": flags["result_status"],
                "your_time_spent_seconds": answer.time_spent_seconds or 0,
                "your_marks_awarded": _decimal_string(answer.marks_awarded),
                "your_negative_marks": _decimal_string(answer.negative_marks_applied),
                "school_benchmark": benchmark_maps.get("school", {}).get(question.id),
                "city_benchmark": benchmark_maps.get("city", {}).get(question.id),
                "state_benchmark": benchmark_maps.get("state", {}).get(question.id),
                "program_benchmark": benchmark_maps.get("program", {}).get(question.id),
            }
        )

    rows.sort(
        key=lambda item: (
            0 if item["your_result"] == "wrong" else 1 if item["your_result"] == "skipped" else 2,
            item["topic_name"] or "",
            item["question_text_summary"],
        )
    )

    return {
        "overview": {
            "question_count": len(rows),
            "attempted_count": attempted_count,
            "correct_count": correct_count,
            "wrong_count": wrong_count,
            "skipped_count": skipped_count,
        },
        "benchmark_overview": _student_benchmark_dimensions(student),
        "questions": rows,
    }


def build_student_insight_summary(student):
    from apps.attempts.models import StudentAnswer, StudentExamAttempt
    from apps.results.models import ExamResult, StudentTopicPerformance
    from apps.exams.services import resolve_exam_source_metadata

    results_qs = (
        ExamResult.objects.filter(student=student, is_active=True)
        .select_related("exam", "exam__subject", "exam__source_teacher")
        .order_by("-published_at", "-created_at")
    )
    topic_qs = StudentTopicPerformance.objects.filter(student=student, is_active=True)
    attempts_qs = StudentExamAttempt.objects.filter(student=student, is_active=True).order_by(
        "-started_at"
    )
    answers_qs = StudentAnswer.objects.filter(
        attempt__student=student,
        attempt__status__in=["submitted", "auto_submitted"],
        is_active=True,
    )

    results = list(results_qs)
    attempts = list(attempts_qs)
    result_aggregates = results_qs.aggregate(
        average_percentage=Avg("percentage"),
        total_correct=Sum("correct_answers"),
        total_incorrect=Sum("incorrect_answers"),
        total_skipped=Sum("skipped_questions"),
    )
    average_percentage = result_aggregates["average_percentage"] or Decimal("0.00")
    total_correct = result_aggregates["total_correct"] or 0
    total_incorrect = result_aggregates["total_incorrect"] or 0
    total_skipped = result_aggregates["total_skipped"] or 0
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

    subject_rows = [
        {
            "subject_id": str(item["subject_id"]),
            "subject_name": item["subject__name"],
            "average_percentage": item["average_percentage"] or Decimal("0.00"),
            "attempted_questions": item["attempted_questions"] or 0,
            "skipped_questions": item["skipped_questions"] or 0,
        }
        for item in topic_qs.values("subject_id", "subject__name").annotate(
            average_percentage=Avg("percentage"),
            attempted_questions=Sum("attempted_questions"),
            skipped_questions=Sum("skipped_questions"),
        )
    ]
    strongest_subjects = sorted(
        subject_rows,
        key=lambda item: (-item["average_percentage"], item["subject_name"]),
    )[:3]
    weakest_subjects = sorted(
        subject_rows,
        key=lambda item: (item["average_percentage"], item["subject_name"]),
    )[:3]
    weak_topics = sorted(
        [
            {
                "topic_id": str(item["topic_id"]),
                "topic_name": item["topic__name"],
                "subject_name": item["subject__name"],
                "average_percentage": item["average_percentage"] or Decimal("0.00"),
                "attempted_questions": item["attempted_questions"] or 0,
                "skipped_questions": item["skipped_questions"] or 0,
            }
            for item in topic_qs.filter(topic_id__isnull=False)
            .values("topic_id", "topic__name", "subject__name")
            .annotate(
                average_percentage=Avg("percentage"),
                attempted_questions=Sum("attempted_questions"),
                skipped_questions=Sum("skipped_questions"),
            )
        ],
        key=lambda item: (item["average_percentage"], -item["skipped_questions"]),
    )[:5]

    source_rollups = {}
    source_subject_rollups = {}
    source_metadata_map = {}
    for result in results:
        source_meta = source_metadata_map.setdefault(
            result.exam_id, resolve_exam_source_metadata(result.exam)
        )
        source_key = source_meta["source_type"]
        source_bucket = source_rollups.setdefault(
            source_key,
            {
                "source_type": source_meta["source_type"],
                "source_label": source_meta["source_label"],
                "source_name": source_meta["source_name"],
                "source_teacher_id": source_meta["teacher_id"],
                "source_teacher_name": source_meta["teacher_name"],
                "total_percentage": Decimal("0.00"),
                "count": 0,
                "attempted_questions": 0,
                "skipped_questions": 0,
            },
        )
        source_bucket["total_percentage"] += Decimal(result.percentage)
        source_bucket["count"] += 1
        source_bucket["attempted_questions"] += result.correct_answers + result.incorrect_answers
        source_bucket["skipped_questions"] += result.skipped_questions

        subject_name = getattr(getattr(result.exam, "subject", None), "name", "") or "Unmapped"
        source_subject_key = (source_meta["source_type"], subject_name)
        source_subject_bucket = source_subject_rollups.setdefault(
            source_subject_key,
            {
                "source_type": source_meta["source_type"],
                "source_label": source_meta["source_label"],
                "source_name": source_meta["source_name"],
                "source_teacher_id": source_meta["teacher_id"],
                "source_teacher_name": source_meta["teacher_name"],
                "subject_name": subject_name,
                "total_percentage": Decimal("0.00"),
                "count": 0,
                "attempted_questions": 0,
                "skipped_questions": 0,
            },
        )
        source_subject_bucket["total_percentage"] += Decimal(result.percentage)
        source_subject_bucket["count"] += 1
        source_subject_bucket["attempted_questions"] += (
            result.correct_answers + result.incorrect_answers
        )
        source_subject_bucket["skipped_questions"] += result.skipped_questions

    source_breakdown = sorted(
        [
            {
                **item,
                "average_percentage": item["total_percentage"] / Decimal(item["count"] or 1),
            }
            for item in source_rollups.values()
        ],
        key=lambda item: (-item["count"], item["source_label"], item["source_name"]),
    )
    source_subject_breakdown = sorted(
        [
            {
                **item,
                "average_percentage": item["total_percentage"] / Decimal(item["count"] or 1),
            }
            for item in source_subject_rollups.values()
        ],
        key=lambda item: (
            item["subject_name"],
            -item["count"],
            item["source_label"],
            item["source_name"],
        ),
    )

    answered_filter = _answered_filter()
    weak_question_types = []
    for bucket in answers_qs.values("question__question_type").annotate(
        total=Count("id"),
        wrong=Count("id", filter=answered_filter & Q(is_correct=False)),
        skipped=Count("id", filter=~answered_filter),
    ):
        total = bucket["total"] or 1
        weak_question_types.append(
            {
                "question_type": bucket["question__question_type"],
                "wrong_percentage": _decimal_string(
                    (Decimal(bucket["wrong"] or 0) / Decimal(total)) * Decimal("100.00")
                ),
                "skip_percentage": _decimal_string(
                    (Decimal(bucket["skipped"] or 0) / Decimal(total)) * Decimal("100.00")
                ),
                "wrong_count": bucket["wrong"] or 0,
                "skipped_count": bucket["skipped"] or 0,
                "total": bucket["total"] or 0,
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
                "subject_name": getattr(getattr(result.exam, "subject", None), "name", None),
                "source_type": source_metadata_map.setdefault(
                    result.exam_id, resolve_exam_source_metadata(result.exam)
                )["source_type"],
                "source_label": source_metadata_map[result.exam_id]["source_label"],
                "source_name": source_metadata_map[result.exam_id]["source_name"],
                "source_teacher_id": source_metadata_map[result.exam_id]["teacher_id"],
                "source_teacher_name": source_metadata_map[result.exam_id]["teacher_name"],
                "percentage": _decimal_string(result.percentage),
                "final_score": _decimal_string(result.final_score),
                "result_status": result.result_status,
                "published_at": result.published_at.isoformat() if result.published_at else None,
            }
            for result in results[:5]
        ],
        "source_breakdown": [
            {**item, "average_percentage": _decimal_string(item["average_percentage"])}
            for item in source_breakdown
        ],
        "source_subject_breakdown": [
            {**item, "average_percentage": _decimal_string(item["average_percentage"])}
            for item in source_subject_breakdown
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
        "benchmark_overview": _student_benchmark_dimensions(student),
    }


def build_teacher_insight_summary(user):
    from apps.accounts.scopes import get_account_profile, scope_teacher_queryset
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

    result_aggregates = result_qs.aggregate(
        average_percentage=Avg("percentage"),
        correct_answers=Sum("correct_answers"),
        incorrect_answers=Sum("incorrect_answers"),
    )
    total_attempts = attempt_qs.count()
    avg_percentage = result_aggregates["average_percentage"] or Decimal("0.00")
    total_correct = result_aggregates["correct_answers"] or 0
    total_incorrect = result_aggregates["incorrect_answers"] or 0
    attempted_total = total_correct + total_incorrect
    accuracy_percentage = (
        (Decimal(total_correct) / Decimal(attempted_total)) * Decimal("100.00")
        if attempted_total
        else Decimal("0.00")
    )
    avg_time = attempt_qs.aggregate(value=Avg("time_taken_seconds"))["value"] or 0

    high_students = list(
        result_qs.values(
            "student_id",
            "student__full_name",
            "student__admission_no",
        ).annotate(
            average_percentage=Avg("percentage"),
        ).order_by("-average_percentage", "student__full_name")[:5]
    )
    low_students = list(
        result_qs.values(
            "student_id",
            "student__full_name",
            "student__admission_no",
        ).annotate(
            average_percentage=Avg("percentage"),
        ).order_by("average_percentage", "student__full_name")[:5]
    )
    normalized_high_students = [
        {
            "student_id": str(item["student_id"]),
            "student_name": item["student__full_name"],
            "admission_no": item["student__admission_no"],
            "average_percentage": item["average_percentage"] or Decimal("0.00"),
        }
        for item in high_students
    ]
    normalized_low_students = [
        {
            "student_id": str(item["student_id"]),
            "student_name": item["student__full_name"],
            "admission_no": item["student__admission_no"],
            "average_percentage": item["average_percentage"] or Decimal("0.00"),
        }
        for item in low_students
    ]

    weak_topics = [
        {
            "subject_name": item["subject__name"],
            "topic_name": item["topic__name"],
            "average_percentage": item["average_percentage"] or Decimal("0.00"),
            "attempted_questions": item["attempted_questions"] or 0,
        }
        for item in topic_qs.values(
            "subject_id",
            "subject__name",
            "topic_id",
            "topic__name",
        ).annotate(
            average_percentage=Avg("percentage"),
            attempted_questions=Sum("attempted_questions"),
        ).order_by("average_percentage", "-attempted_questions", "subject__name", "topic__name")[:5]
    ]

    answer_rows = (
        StudentAnswer.objects.filter(attempt__in=attempt_qs, is_active=True)
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
    most_wrong = list(answer_rows.order_by("-wrong_count", "-total_attempts", "question_id")[:5])
    most_skipped = list(answer_rows.order_by("-skipped_count", "-total_attempts", "question_id")[:5])
    profile = get_account_profile(user)
    review_task_qs = unresolved_review_tasks_queryset(
        institute=getattr(profile, "institute", None),
        teacher=getattr(profile, "teacher_profile", None),
    )
    review_summary = {
        "pending_tasks": review_task_qs.count(),
        "assigned_tasks": review_task_qs.filter(status="assigned").count(),
        "in_review_tasks": review_task_qs.filter(status="in_review").count(),
        "recheck_requested_tasks": review_task_qs.filter(status="recheck_requested").count(),
        "blocked_exams": review_task_qs.values("exam_id").distinct().count(),
    }

    return {
        "overview": {
            "tracked_exams": summary_qs.count(),
            "total_attempts": total_attempts,
            "average_percentage": _decimal_string(avg_percentage),
            "accuracy_percentage": _decimal_string(accuracy_percentage),
            "average_time_taken_seconds": int(avg_time or 0),
            "pending_review_tasks": review_summary["pending_tasks"],
        },
        "review_summary": review_summary,
        "exam_overview": [
            {
                "exam_id": str(summary.exam_id),
                "exam_title": summary.exam.title,
                "exam_code": summary.exam.code,
                "experience_profile": resolve_exam_experience_profile(summary.exam),
                "score_distribution": (
                    summary.metadata.get("score_distribution", [])
                    if isinstance(getattr(summary, "metadata", {}), dict)
                    else []
                ),
                "section_performance": (
                    summary.metadata.get("section_performance", [])
                    if isinstance(getattr(summary, "metadata", {}), dict)
                    else []
                ),
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
            for item in normalized_high_students
        ],
        "low_performing_students": [
            {**item, "average_percentage": _decimal_string(item["average_percentage"])}
            for item in normalized_low_students
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
    from apps.attempts.models import StudentExamAttempt
    from apps.question_bank.models import Question

    attempt_qs = scope_teacher_queryset(
        StudentExamAttempt.objects.select_related("exam", "student"),
        user,
    ).filter(is_active=True)
    question_answer_scope = Q(student_answers__attempt__in=attempt_qs, student_answers__is_active=True)
    answered_filter = (
        Q(student_answers__selected_option__isnull=False)
        | ~Q(student_answers__answer_text="")
        | ~Q(student_answers__selected_option_ids=[])
    )
    questions = (
        scope_question_queryset(
            Question.objects.select_related("subject", "topic"),
            user,
        )
        .filter(is_active=True)
        .only(
            "id",
            "question_text",
            "question_type",
            "difficulty_level",
            "explanation",
            "is_verified",
            "subject_id",
            "topic_id",
        )
        .annotate(
            usage_count=Count(
                "student_answers",
                filter=question_answer_scope,
            ),
            correct_count=Count(
                "student_answers",
                filter=question_answer_scope & answered_filter & Q(student_answers__is_correct=True),
            ),
            wrong_count=Count(
                "student_answers",
                filter=question_answer_scope & answered_filter & Q(student_answers__is_correct=False),
            ),
            skipped_count=Count(
                "student_answers",
                filter=question_answer_scope & ~answered_filter,
            ),
        )
        .order_by("-wrong_count", "-skipped_count", "id")
    )
    payload = []
    for question in questions:
        usage_count = question.usage_count or 0
        correct_count = question.correct_count or 0
        wrong_count = question.wrong_count or 0
        skipped_count = question.skipped_count or 0
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
    return payload
