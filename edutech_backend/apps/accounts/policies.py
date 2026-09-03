from django.core.exceptions import ValidationError


def validate_account_profile_role_policy(*, profile, role_constants):
    role = profile.role

    if role == role_constants.PLATFORM_ADMIN:
        return

    if profile.institute_id is None:
        raise ValidationError({"institute": "Institute is required for this role."})

    if role == role_constants.STUDENT:
        if profile.student_profile_id is None and not profile.profile_completion_required:
            raise ValidationError({"student_profile": "Student profile is required for student role."})
        if (
            profile.student_profile_id
            and profile.student_profile is not None
            and profile.student_profile.institute_id != profile.institute_id
        ):
            raise ValidationError(
                {"student_profile": "Student profile must belong to the selected institute."}
            )
        return

    if role == role_constants.TEACHER:
        if profile.teacher_profile_id is None and not profile.profile_completion_required:
            raise ValidationError({"teacher_profile": "Teacher profile is required for teacher role."})
        if (
            profile.teacher_profile_id
            and profile.teacher_profile is not None
            and profile.teacher_profile.institute_id != profile.institute_id
        ):
            raise ValidationError(
                {"teacher_profile": "Teacher profile must belong to the selected institute."}
            )
        return

    if role in {role_constants.INSTITUTE_ADMIN, role_constants.PARENT}:
        if (
            profile.student_profile_id
            and profile.student_profile is not None
            and profile.student_profile.institute_id != profile.institute_id
        ):
            raise ValidationError(
                {"student_profile": "Student profile must belong to the selected institute."}
            )
        if (
            profile.teacher_profile_id
            and profile.teacher_profile is not None
            and profile.teacher_profile.institute_id != profile.institute_id
        ):
            raise ValidationError(
                {"teacher_profile": "Teacher profile must belong to the selected institute."}
            )


def has_active_role(profile, *roles):
    return bool(profile and profile.is_active and profile.role in set(roles))
