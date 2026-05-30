from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AccountProfile, AccountRole
from apps.exams.services import is_review_available_for_attempt
from apps.reports.models import AuditLog, InAppNotification, NotificationType
from apps.teachers.models import TeacherAssignment


User = get_user_model()


def _request_ip(request):
    if request is None:
        return None
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def create_audit_log(
    *,
    action,
    entity_type,
    entity_id,
    user=None,
    institute=None,
    message="",
    metadata=None,
    request=None,
):
    metadata = metadata or {}
    if institute is None:
        profile = getattr(user, "account_profile", None) if user is not None else None
        institute = getattr(profile, "institute", None)
    return AuditLog.objects.create(
        user=user,
        institute=institute,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        message=message,
        metadata=metadata,
        ip_address=_request_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
    )


def _create_notification_if_missing(
    *,
    institute,
    recipient_user,
    notification_type,
    title,
    message,
    related_object_type="",
    related_object_id="",
    metadata=None,
):
    metadata = metadata or {}
    notification = InAppNotification.objects.filter(
        recipient_user=recipient_user,
        notification_type=notification_type,
        related_object_type=related_object_type,
        related_object_id=str(related_object_id or ""),
        is_active=True,
    ).first()
    if notification:
        return notification

    return InAppNotification.objects.create(
        institute=institute,
        recipient_user=recipient_user,
        notification_type=notification_type,
        title=title,
        message=message,
        related_object_type=related_object_type,
        related_object_id=str(related_object_id or ""),
        metadata=metadata,
    )


@transaction.atomic
def mark_notification_as_read(notification):
    if notification.is_read:
        return notification
    notification.is_read = True
    notification.read_at = timezone.now()
    notification.save(update_fields=["is_read", "read_at", "updated_at"])
    return notification


@transaction.atomic
def mark_all_notifications_as_read(user):
    now = timezone.now()
    queryset = InAppNotification.objects.filter(
        recipient_user=user,
        is_read=False,
        is_active=True,
    )
    queryset.update(is_read=True, read_at=now, updated_at=now)
    return queryset.count()


def unread_notification_count(user):
    return InAppNotification.objects.filter(
        recipient_user=user,
        is_read=False,
        is_active=True,
    ).count()


def _student_user_queryset_for_exam(exam):
    queryset = User.objects.filter(
        account_profile__role=AccountRole.STUDENT,
        account_profile__is_active=True,
        account_profile__institute=exam.institute,
        account_profile__student_profile__academic_year=exam.academic_year,
        account_profile__student_profile__program=exam.program,
        account_profile__student_profile__is_active=True,
    )
    if exam.cohort_id:
        queryset = queryset.filter(account_profile__student_profile__cohort=exam.cohort)
    return queryset.distinct()


def _teacher_users_for_exam(exam):
    assignments = TeacherAssignment.objects.filter(
        institute=exam.institute,
        academic_year=exam.academic_year,
        program=exam.program,
        subject=exam.subject,
        is_active=True,
        teacher__account_profile__is_active=True,
    )
    if exam.cohort_id:
        assignments = assignments.filter(cohort__in=[exam.cohort, None])
    users = [
        assignment.teacher.account_profile.user
        for assignment in assignments.select_related("teacher__account_profile__user")
        if getattr(assignment.teacher, "account_profile", None)
    ]
    return users


@transaction.atomic
def notify_exam_published(exam, changed_by=None):
    title = f"{exam.title} has been scheduled"
    message = (
        f"{exam.title} is now scheduled. Check the instructions and be ready before "
        f"the exam window opens."
    )
    metadata = {
        "exam_id": str(exam.id),
        "route": "student_exam_detail",
    }
    for user in _student_user_queryset_for_exam(exam):
        _create_notification_if_missing(
            institute=exam.institute,
            recipient_user=user,
            notification_type=NotificationType.EXAM_SCHEDULED,
            title=title,
            message=message,
            related_object_type="exam",
            related_object_id=exam.id,
            metadata=metadata,
        )

    teacher_profile = changed_by
    if teacher_profile and getattr(teacher_profile, "account_profile", None):
        _create_notification_if_missing(
            institute=exam.institute,
            recipient_user=teacher_profile.account_profile.user,
            notification_type=NotificationType.EXAM_SCHEDULED,
            title="Exam published successfully",
            message=f"{exam.title} is now visible to eligible students during the scheduled window.",
            related_object_type="exam",
            related_object_id=exam.id,
            metadata={"exam_id": str(exam.id), "route": "exams"},
        )


@transaction.atomic
def ensure_exam_window_notifications(student, exams):
    profile = getattr(student, "account_profile", None)
    if profile is None:
        return
    user = profile.user
    now = timezone.now()
    for exam in exams:
        if not exam.is_active:
            continue
        if exam.start_at and now < exam.start_at:
            delta = exam.start_at - now
            if delta <= timedelta(minutes=30):
                _create_notification_if_missing(
                    institute=exam.institute,
                    recipient_user=user,
                    notification_type=NotificationType.EXAM_STARTING_SOON,
                    title=f"{exam.title} starts soon",
                    message=f"Your {exam.title} starts in {max(int(delta.total_seconds() // 60), 0)} minutes.",
                    related_object_type="exam",
                    related_object_id=exam.id,
                    metadata={"exam_id": str(exam.id), "route": "student_exam_detail"},
                )
        elif exam.status in {"scheduled", "live"} and (
            exam.end_at is None or now <= exam.end_at
        ):
            _create_notification_if_missing(
                institute=exam.institute,
                recipient_user=user,
                notification_type=NotificationType.EXAM_LIVE,
                title=f"{exam.title} is live",
                message=f"{exam.title} is currently available. Start when you are ready within the exam window.",
                related_object_type="exam",
                related_object_id=exam.id,
                metadata={"exam_id": str(exam.id), "route": "student_exam_detail"},
            )


@transaction.atomic
def notify_attempt_submitted(attempt):
    student_profile = attempt.student
    exam = attempt.exam
    student_account = getattr(student_profile, "account_profile", None)
    if student_account:
        _create_notification_if_missing(
            institute=attempt.institute,
            recipient_user=student_account.user,
            notification_type=NotificationType.EXAM_SUBMITTED,
            title=f"{exam.title} submitted",
            message="Your attempt has been submitted successfully. Results will appear once published.",
            related_object_type="attempt",
            related_object_id=attempt.id,
            metadata={
                "exam_id": str(exam.id),
                "attempt_id": str(attempt.id),
                "route": "student_attempt_summary",
            },
        )

    teacher_users = _teacher_users_for_exam(exam)
    for user in teacher_users:
        _create_notification_if_missing(
            institute=attempt.institute,
            recipient_user=user,
            notification_type=NotificationType.TEACHER_REVIEW_NEEDED,
            title="New student submission received",
            message=f"{student_profile.full_name} submitted {exam.title}. Review analytics and pending results when ready.",
            related_object_type="attempt",
            related_object_id=attempt.id,
            metadata={"exam_id": str(exam.id), "route": "results"},
        )


@transaction.atomic
def notify_results_published(exam, results):
    for result in results:
        student_account = getattr(result.student, "account_profile", None)
        if student_account is None:
            continue
        review_available = is_review_available_for_attempt(
            exam,
            result.attempt,
            result=result,
        )
        review_copy = " Review is now available." if review_available else ""
        _create_notification_if_missing(
            institute=exam.institute,
            recipient_user=student_account.user,
            notification_type=NotificationType.RESULT_PUBLISHED,
            title=f"Result published for {exam.title}",
            message=f"Your result for {exam.title} is now published.{review_copy}",
            related_object_type="result",
            related_object_id=result.id,
            metadata={
                "exam_id": str(exam.id),
                "attempt_id": str(result.attempt_id),
                "result_id": str(result.id),
                "route": "results",
                "review_available": review_available,
            },
        )


@transaction.atomic
def notify_question_missing_explanation(question):
    teacher = question.created_by_teacher
    if teacher is None:
        return None
    account_profile = getattr(teacher, "account_profile", None)
    if account_profile is None:
        return None
    if question.explanation.strip():
        return None

    return _create_notification_if_missing(
        institute=question.institute,
        recipient_user=account_profile.user,
        notification_type=NotificationType.QUESTION_MISSING_EXPLANATION,
        title="Question explanation recommended",
        message=(
            "This question is missing an explanation. Add one to improve post-exam learning value."
        ),
        related_object_type="question",
        related_object_id=question.id,
        metadata={"question_id": str(question.id), "route": "question_bank"},
    )
