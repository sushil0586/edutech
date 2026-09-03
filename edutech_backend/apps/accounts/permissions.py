from rest_framework.permissions import BasePermission

from apps.accounts.capabilities import (
    can_build_exams,
    can_manage_academics,
    can_manage_question_bank,
    can_manage_students,
    can_publish_results,
    can_view_academics,
    can_view_analytics,
)
from apps.accounts.models import AccountRole
from apps.accounts.policies import has_active_role


def _account_profile(user):
    return getattr(user, "account_profile", None)


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return has_active_role(profile, AccountRole.PLATFORM_ADMIN)


class IsInstituteAdmin(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return has_active_role(profile, AccountRole.INSTITUTE_ADMIN)


class IsPlatformOrInstituteAdmin(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return has_active_role(profile, AccountRole.PLATFORM_ADMIN, AccountRole.INSTITUTE_ADMIN)


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return has_active_role(profile, AccountRole.TEACHER)


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return has_active_role(profile, AccountRole.STUDENT)


class IsParent(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return has_active_role(profile, AccountRole.PARENT)


class IsSameInstituteUser(BasePermission):
    def has_object_permission(self, request, view, obj):
        profile = _account_profile(request.user)
        if not profile or not profile.is_active:
            return False
        if profile.role == AccountRole.PLATFORM_ADMIN:
            return True
        institute_id = getattr(profile.institute, "id", None)
        object_institute_id = getattr(getattr(obj, "institute", None), "id", None) or getattr(
            obj, "institute_id", None
        )
        return bool(institute_id and institute_id == object_institute_id)


class IsTeacherOrInstituteAdmin(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return has_active_role(
            profile,
            AccountRole.TEACHER,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.PLATFORM_ADMIN,
        )


class CanManageAcademics(BasePermission):
    def has_permission(self, request, view):
        return can_manage_academics(request.user)


class CanViewAcademics(BasePermission):
    def has_permission(self, request, view):
        return can_view_academics(request.user)


class CanManageStudents(BasePermission):
    def has_permission(self, request, view):
        return can_manage_students(request.user)


class CanBuildExams(BasePermission):
    def has_permission(self, request, view):
        return can_build_exams(request.user)


class CanPublishResults(BasePermission):
    def has_permission(self, request, view):
        return can_publish_results(request.user)


class CanManageQuestionBank(BasePermission):
    def has_permission(self, request, view):
        return can_manage_question_bank(request.user)


class CanViewAnalytics(BasePermission):
    def has_permission(self, request, view):
        return can_view_analytics(request.user)


class IsStudentOwnerOrInstituteAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        profile = _account_profile(request.user)
        if not profile or not profile.is_active:
            return False
        if profile.role in {AccountRole.PLATFORM_ADMIN, AccountRole.INSTITUTE_ADMIN}:
            return True
        if profile.role != AccountRole.STUDENT or profile.student_profile_id is None:
            return False
        object_student_id = getattr(getattr(obj, "student", None), "id", None) or getattr(
            obj, "student_id", None
        )
        return profile.student_profile_id == object_student_id
