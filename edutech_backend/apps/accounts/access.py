"""Live account state and the narrow finish-existing-attempt suspension policy."""
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from apps.accounts.models import AccountProfile, AccountRole


def account_profile_for_access(user):
    if user is None or not user.is_active:
        raise AuthenticationFailed("User account is inactive.", code="account_inactive")
    profile = AccountProfile.objects.select_related(
        "institute", "student_profile", "teacher_profile", "parent_profile"
    ).filter(user=user).first()
    if profile is None or not profile.is_active:
        raise AuthenticationFailed("Account profile is inactive or missing.", code="account_inactive")
    for field in ("student_profile", "teacher_profile", "parent_profile"):
        linked = getattr(profile, field, None)
        if linked is not None and not linked.is_active:
            raise AuthenticationFailed("Linked role profile is inactive.", code="account_inactive")
    if profile.role != AccountRole.PLATFORM_ADMIN and profile.institute_id is None:
        raise AuthenticationFailed("Institute is missing.", code="account_inactive")
    required_link = {
        AccountRole.STUDENT: "student_profile_id",
        AccountRole.TEACHER: "teacher_profile_id",
    }.get(profile.role)
    if required_link and not getattr(profile, required_link) and not profile.profile_completion_required:
        raise AuthenticationFailed("Linked role profile is missing.", code="account_inactive")
    user.account_profile = profile
    return profile


def suspension_attempts(profile):
    from apps.attempts.models import StudentExamAttempt

    if profile.role != AccountRole.STUDENT or not profile.student_profile_id:
        return StudentExamAttempt.objects.none()
    if profile.institute.suspended_at is None:
        return StudentExamAttempt.objects.none()
    return StudentExamAttempt.objects.filter(
        institute_id=profile.institute_id,
        student_id=profile.student_profile_id,
        is_active=True,
        started_at__lte=profile.institute.suspended_at,
    )


def ensure_account_access(user, *, request=None):
    profile = account_profile_for_access(user)
    if profile.role == AccountRole.PLATFORM_ADMIN or not profile.institute.is_suspended:
        return profile

    attempts = suspension_attempts(profile)
    if request is None:
        # Login/refresh may recover a still-running attempt, never a new one.
        if attempts.filter(status="in_progress").exists():
            return profile
    else:
        match = request.resolver_match
        if match and profile.role == AccountRole.STUDENT:
            # Session hydration contains identity/academic context, not a grant
            # to other resources. It keeps the attempt and completion UI usable.
            if match.url_name == "me" and request.method == "GET":
                return profile
            view = getattr(match.func, "cls", None)
            action = getattr(match.func, "actions", {}).get(request.method.lower())
            if (view is not None and view.__module__ == "apps.attempts.views"
                    and view.__name__ == "StudentExamAttemptViewSet"):
                attempt = attempts.filter(pk=match.kwargs.get("pk"))
                if action == "summary" and request.method == "GET" and attempt.exists():
                    return profile
                allowed = {
                    "retrieve", "detail_action", "save_answer_action", "submit",
                    "switch_section_action", "integrity_event_action", "upload_response_artifact_action",
                }
                if action in allowed and attempt.filter(status="in_progress").exists():
                    return profile
    raise PermissionDenied(
        "Institute access is suspended. Only attempts already in progress may finish.",
        code="institute_suspended",
    )
