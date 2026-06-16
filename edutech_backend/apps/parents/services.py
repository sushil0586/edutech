from decimal import Decimal
from django.utils import timezone

from django.core.exceptions import PermissionDenied, ValidationError
from django.db.models import Count

from apps.accounts.models import AccountRole
from apps.results.services import build_student_insight_summary
from apps.students.models import StudentProfile
from apps.parents.models import (
    ParentAlert,
    ParentAlertStatus,
    ParentChildRelationship,
    ParentProfile,
    ParentRelationshipStatus,
    default_notification_preferences,
)


PARENT_PREFERENCE_KEYS = set(default_notification_preferences().keys())


def get_parent_profile_for_user(user):
    account_profile = getattr(user, "account_profile", None)
    if account_profile is None or not account_profile.is_active or account_profile.role != AccountRole.PARENT:
        raise PermissionDenied("Parent profile is not available for this user.")

    try:
        return account_profile.parent_profile
    except ParentProfile.DoesNotExist:
        first_name = (user.first_name or "").strip() or account_profile.user.username
        last_name = (user.last_name or "").strip()
        return ParentProfile.objects.create(
            institute=account_profile.institute,
            account_profile=account_profile,
            first_name=first_name,
            last_name=last_name,
            phone="",
            email=user.email or "",
            notification_preferences=default_notification_preferences(),
            metadata={
                "source": "lazy_parent_profile_bootstrap",
                "registration_context": account_profile.registration_context or {},
            },
            is_active=True,
        )


def get_active_parent_relationships(user):
    parent_profile = get_parent_profile_for_user(user)
    return (
        ParentChildRelationship.objects.select_related(
            "student",
            "student__program",
            "student__academic_year",
            "student__cohort",
            "parent_profile",
        )
        .filter(
            parent_profile=parent_profile,
            status=ParentRelationshipStatus.ACTIVE,
            is_active=True,
            student__is_active=True,
        )
        .order_by("-is_primary_contact", "student__full_name")
    )


def get_parent_visible_students(user):
    relationship_ids = get_active_parent_relationships(user).values_list("student_id", flat=True)
    return StudentProfile.objects.filter(id__in=relationship_ids, is_active=True).select_related(
        "program",
        "academic_year",
        "cohort",
    )


def resolve_parent_child_access(user, child_id, *, permission_flag=None):
    relationships = get_active_parent_relationships(user)
    relationship = relationships.filter(student_id=child_id).first()
    if relationship is None:
        raise PermissionDenied("Child not found in your active parent scope.")

    if permission_flag and not getattr(relationship, permission_flag):
        raise PermissionDenied("This relationship does not allow the requested visibility.")

    return relationship


def build_parent_child_record(relationship):
    student = relationship.student
    return {
        "relationship_id": str(relationship.id),
        "student_id": str(student.id),
        "student_name": student.full_name,
        "admission_no": student.admission_no,
        "program_name": student.program.name,
        "academic_year_name": student.academic_year.name,
        "cohort_name": student.cohort.name if student.cohort_id else "",
        "relationship_type": relationship.relationship_type,
        "relationship_label": relationship.relationship_label,
        "is_primary_contact": relationship.is_primary_contact,
        "permissions": {
            "can_view_progress": relationship.can_view_progress,
            "can_view_results": relationship.can_view_results,
            "can_view_wallet": relationship.can_view_wallet,
            "can_receive_alerts": relationship.can_receive_alerts,
            "can_receive_weekly_summary": relationship.can_receive_weekly_summary,
        },
        "status": relationship.status,
        "is_active": relationship.is_active,
    }


def _recent_result_rows(student, *, limit=5):
    from apps.results.models import ExamResult

    results = (
        ExamResult.objects.filter(student=student, is_active=True)
        .select_related("exam")
        .order_by("-published_at", "-created_at")[:limit]
    )
    return [
        {
            "exam_id": str(result.exam_id),
            "exam_title": result.exam.title,
            "exam_code": result.exam.code,
            "percentage": str(result.percentage),
            "final_score": str(result.final_score),
            "result_status": result.result_status,
            "published_at": result.published_at.isoformat() if result.published_at else None,
        }
        for result in results
    ]


def _parent_alert_summary(parent_profile, student):
    queryset = ParentAlert.objects.filter(
        parent_profile=parent_profile,
        is_active=True,
    )
    if student is not None:
        queryset = queryset.filter(student=student)

    counts = queryset.aggregate(
        total=Count("id"),
        new_count=Count("id", filter=None),
    )
    unread_count = queryset.filter(status="new").count()
    high_count = queryset.filter(severity="high").count()
    warning_count = queryset.filter(severity="warning").count()
    return {
        "total": counts["total"] or 0,
        "unread": unread_count,
        "high": high_count,
        "warning": warning_count,
    }


def build_parent_dashboard_summary(parent_profile, student):
    summary = build_student_insight_summary(student)
    return {
        "child": {
            "student_id": str(student.id),
            "student_name": student.full_name,
            "admission_no": student.admission_no,
            "program_name": student.program.name,
            "academic_year_name": student.academic_year.name,
            "cohort_name": student.cohort.name if student.cohort_id else "",
        },
        "progress_summary": {
            "average_percentage": summary["average_percentage"],
            "accuracy_percentage": summary["accuracy_percentage"],
            "attempted_questions": summary["attempted_questions"],
            "skipped_questions": summary["skipped_questions"],
            "improvement_trend": summary["improvement_trend"],
        },
        "recent_results": summary["recent_exams"],
        "weak_subjects": summary["weakest_subjects"],
        "weak_topics": summary["weak_topics"],
        "alert_summary": _parent_alert_summary(parent_profile, student),
        "insight_messages": summary["insight_messages"],
    }


def build_parent_progress_summary(parent_profile, student):
    summary = build_student_insight_summary(student)
    return {
        "child": {
            "student_id": str(student.id),
            "student_name": student.full_name,
            "admission_no": student.admission_no,
        },
        "average_percentage": summary["average_percentage"],
        "accuracy_percentage": summary["accuracy_percentage"],
        "strongest_subjects": summary["strongest_subjects"],
        "weakest_subjects": summary["weakest_subjects"],
        "weak_topics": summary["weak_topics"],
        "recent_results": _recent_result_rows(student, limit=8),
        "attempt_behavior": summary["attempt_behavior"],
        "improvement_trend": summary["improvement_trend"],
    }


def build_parent_alerts(parent_profile, *, student=None):
    queryset = ParentAlert.objects.select_related("student", "relationship").filter(
        parent_profile=parent_profile,
        is_active=True,
    )
    if student is not None:
        queryset = queryset.filter(student=student)
    return queryset.order_by("-created_at")


def update_parent_preferences(parent_profile, payload):
    current = {
        **default_notification_preferences(),
        **(parent_profile.notification_preferences or {}),
    }
    for key, value in payload.items():
        if key not in PARENT_PREFERENCE_KEYS:
            raise ValidationError({key: "Unsupported preference key."})
        current[key] = bool(value)
    parent_profile.notification_preferences = current
    parent_profile.save(update_fields=["notification_preferences", "updated_at"])
    return parent_profile.notification_preferences


def update_parent_alert_status(user, alert_id, status):
    parent_profile = get_parent_profile_for_user(user)
    alert = (
        ParentAlert.objects.select_related("student", "relationship")
        .filter(parent_profile=parent_profile, id=alert_id, is_active=True)
        .first()
    )
    if alert is None:
        raise PermissionDenied("Alert not found in your parent scope.")

    allowed_statuses = {
        ParentAlertStatus.READ,
        ParentAlertStatus.RESOLVED,
        ParentAlertStatus.DISMISSED,
    }
    if status not in allowed_statuses:
        raise ValidationError({"status": "Unsupported alert status transition."})

    now = timezone.now()
    alert.status = status
    if status in {ParentAlertStatus.READ, ParentAlertStatus.RESOLVED, ParentAlertStatus.DISMISSED}:
        alert.read_at = alert.read_at or now
    if status == ParentAlertStatus.RESOLVED:
        alert.resolved_at = now
    elif status == ParentAlertStatus.DISMISSED:
        alert.resolved_at = alert.resolved_at or now
    else:
        alert.resolved_at = None

    alert.save(update_fields=["status", "read_at", "resolved_at", "updated_at"])
    return alert
