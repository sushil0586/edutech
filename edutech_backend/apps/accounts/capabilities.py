from apps.accounts.models import AccountRole


def get_account_profile(user):
    return getattr(user, "account_profile", None)


def _has_active_role(user, allowed_roles):
    profile = get_account_profile(user)
    return bool(profile and profile.is_active and profile.role in allowed_roles)


def can_manage_academics(user):
    return _has_active_role(
        user,
        {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
        },
    )


def can_view_academics(user):
    return _has_active_role(
        user,
        {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.TEACHER,
        },
    )


def can_manage_students(user):
    return _has_active_role(
        user,
        {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
        },
    )


def can_build_exams(user):
    return _has_active_role(
        user,
        {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.TEACHER,
        },
    )


def can_publish_results(user):
    return _has_active_role(
        user,
        {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.TEACHER,
        },
    )


def can_manage_question_bank(user):
    return _has_active_role(
        user,
        {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.TEACHER,
        },
    )


def can_view_analytics(user):
    return _has_active_role(
        user,
        {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.TEACHER,
            AccountRole.STUDENT,
        },
    )
