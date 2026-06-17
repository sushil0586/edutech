from django.core.exceptions import PermissionDenied
from django.db.models import Q

from apps.accounts.models import AccountRole


def get_account_profile(user):
    return getattr(user, "account_profile", None)


def scope_queryset_for_institute(queryset, user):
    profile = get_account_profile(user)
    if profile is None or not profile.is_active:
        return queryset.none()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return queryset

    if profile.role in {
        AccountRole.INSTITUTE_ADMIN,
        AccountRole.TEACHER,
        AccountRole.STUDENT,
        AccountRole.PARENT,
    } and profile.institute_id:
        model_field_names = {field.name for field in queryset.model._meta.get_fields()}
        if "institute" in model_field_names:
            return queryset.filter(institute_id=profile.institute_id)
        return queryset.filter(pk=profile.institute_id)

    return queryset.none()


def scope_institute_queryset(queryset, user):
    return scope_queryset_for_institute(queryset, user)


def scope_student_queryset(queryset, user):
    profile = get_account_profile(user)
    if profile is None or not profile.is_active:
        return queryset.none()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return queryset
    if profile.role in {AccountRole.INSTITUTE_ADMIN, AccountRole.TEACHER} and profile.institute_id:
        return queryset.filter(institute_id=profile.institute_id)
    if profile.role == AccountRole.STUDENT and profile.student_profile_id:
        return queryset.filter(student_id=profile.student_profile_id)

    return queryset.none()


def scope_student_profile_queryset(queryset, user):
    profile = get_account_profile(user)
    if profile is None or not profile.is_active:
        return queryset.none()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return queryset
    if profile.role in {AccountRole.INSTITUTE_ADMIN, AccountRole.TEACHER} and profile.institute_id:
        return queryset.filter(institute_id=profile.institute_id)
    if profile.role == AccountRole.STUDENT and profile.student_profile_id:
        return queryset.filter(pk=profile.student_profile_id)
    return queryset.none()


def scope_teacher_queryset(queryset, user):
    profile = get_account_profile(user)
    if profile is None or not profile.is_active:
        return queryset.none()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return queryset
    if profile.role == AccountRole.INSTITUTE_ADMIN and profile.institute_id:
        return queryset.filter(institute_id=profile.institute_id)
    if profile.role == AccountRole.TEACHER and profile.institute_id:
        return queryset.filter(institute_id=profile.institute_id)

    return queryset.none()


def scope_teacher_academic_queryset(queryset, user):
    profile = get_account_profile(user)
    if profile is None or not profile.is_active:
        return queryset.none()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return queryset
    if profile.role == AccountRole.INSTITUTE_ADMIN and profile.institute_id:
        return queryset.filter(institute_id=profile.institute_id).distinct()
    if profile.role != AccountRole.TEACHER or not profile.institute_id or not profile.teacher_profile_id:
        return queryset.none()

    from apps.academics.models import AcademicYear, Cohort, Program, Subject, Topic
    from apps.teachers.models import TeacherAssignment

    assignments = TeacherAssignment.objects.filter(
        institute_id=profile.institute_id,
        teacher_id=profile.teacher_profile_id,
        is_active=True,
    )

    model = queryset.model

    if model is AcademicYear:
        return queryset.filter(
            institute_id=profile.institute_id,
            teacher_assignments__teacher_id=profile.teacher_profile_id,
            teacher_assignments__is_active=True,
        ).distinct()

    if model is Program:
        return queryset.filter(
            institute_id=profile.institute_id,
            teacher_assignments__teacher_id=profile.teacher_profile_id,
            teacher_assignments__is_active=True,
        ).distinct()

    if model is Subject:
        return queryset.filter(
            institute_id=profile.institute_id,
            teacher_assignments__teacher_id=profile.teacher_profile_id,
            teacher_assignments__is_active=True,
        ).distinct()

    if model is Topic:
        assigned_subject_ids = list(assignments.values_list("subject_id", flat=True).distinct())
        return queryset.filter(
            institute_id=profile.institute_id,
            subject_id__in=assigned_subject_ids,
        ).distinct()

    if model is Cohort:
        specific_cohort_ids = list(
            assignments.exclude(cohort_id__isnull=True).values_list("cohort_id", flat=True).distinct()
        )
        open_scope_pairs = list(
            assignments.filter(cohort_id__isnull=True)
            .values_list("program_id", "academic_year_id")
            .distinct()
        )

        filters = Q(institute_id=profile.institute_id, id__in=specific_cohort_ids)
        for program_id, academic_year_id in open_scope_pairs:
            filters |= Q(
                institute_id=profile.institute_id,
                program_id=program_id,
                academic_year_id=academic_year_id,
            )
        return queryset.filter(filters).distinct()

    return queryset.filter(institute_id=profile.institute_id).distinct()


def scope_question_queryset(queryset, user):
    profile = get_account_profile(user)
    if profile is None or not profile.is_active:
        return queryset.none()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return queryset
    if profile.role in {AccountRole.INSTITUTE_ADMIN, AccountRole.TEACHER} and profile.institute_id:
        return queryset.filter(institute_id=profile.institute_id)

    return queryset.none()


def scope_exam_queryset(queryset, user):
    profile = get_account_profile(user)
    if profile is None or not profile.is_active:
        return queryset.none()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return queryset
    if profile.role in {AccountRole.INSTITUTE_ADMIN, AccountRole.TEACHER} and profile.institute_id:
        return queryset.filter(institute_id=profile.institute_id)
    if profile.role == AccountRole.STUDENT and profile.student_profile_id:
        student = profile.student_profile
        queryset = queryset.filter(institute_id=profile.institute_id, is_active=True)
        queryset = queryset.filter(program_id=student.program_id)
        if student.cohort_id:
            queryset = queryset.filter(
                Q(cohort_id=student.cohort_id) | Q(cohort__isnull=True)
            )
        return queryset

    return queryset.none()


def scope_attempt_workspace_queryset(queryset, user):
    profile = get_account_profile(user)
    if profile is None or not profile.is_active:
        return queryset.none()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return queryset
    if profile.role == AccountRole.INSTITUTE_ADMIN and profile.institute_id:
        return queryset.filter(institute_id=profile.institute_id)
    if profile.role == AccountRole.STUDENT and profile.student_profile_id:
        return queryset.filter(student_id=profile.student_profile_id)
    return queryset.none()


def scope_result_queryset(queryset, user):
    profile = get_account_profile(user)
    if profile is None or not profile.is_active:
        return queryset.none()

    if profile.role == AccountRole.PLATFORM_ADMIN:
        return queryset
    if profile.role in {AccountRole.INSTITUTE_ADMIN, AccountRole.TEACHER} and profile.institute_id:
        return queryset.filter(institute_id=profile.institute_id)
    if profile.role == AccountRole.STUDENT and profile.student_profile_id:
        return queryset.filter(student_id=profile.student_profile_id)
    return queryset.none()


def scope_exam_publish_log_queryset(queryset, user):
    return scope_exam_queryset(queryset, user)


def get_scoped_object(queryset, *, user, lookup="pk", value):
    return queryset.filter(**{lookup: value}).first()


def get_scoped_object_or_403(queryset, *, user, lookup="pk", value, not_found_message="Not found."):
    obj = get_scoped_object(queryset, user=user, lookup=lookup, value=value)
    if obj is None:
        raise PermissionDenied(not_found_message)
    return obj
