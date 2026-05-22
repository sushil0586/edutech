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


def _account_profile(user):
    return getattr(user, "account_profile", None)


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return bool(profile and profile.role == "platform_admin" and profile.is_active)


class IsInstituteAdmin(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return bool(profile and profile.role == "institute_admin" and profile.is_active)


class IsPlatformOrInstituteAdmin(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return bool(
            profile
            and profile.is_active
            and profile.role in {"platform_admin", "institute_admin"}
        )


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return bool(profile and profile.role == "teacher" and profile.is_active)


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return bool(profile and profile.role == "student" and profile.is_active)


class IsParent(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return bool(profile and profile.role == "parent" and profile.is_active)


class IsSameInstituteUser(BasePermission):
    def has_object_permission(self, request, view, obj):
        profile = _account_profile(request.user)
        if not profile or not profile.is_active:
            return False
        if profile.role == "platform_admin":
            return True
        institute_id = getattr(profile.institute, "id", None)
        object_institute_id = getattr(getattr(obj, "institute", None), "id", None) or getattr(
            obj, "institute_id", None
        )
        return bool(institute_id and institute_id == object_institute_id)


class IsTeacherOrInstituteAdmin(BasePermission):
    def has_permission(self, request, view):
        profile = _account_profile(request.user)
        return bool(
            profile
            and profile.is_active
            and profile.role in {"teacher", "institute_admin", "platform_admin"}
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
        if profile.role in {"platform_admin", "institute_admin"}:
            return True
        if profile.role != "student" or profile.student_profile_id is None:
            return False
        object_student_id = getattr(getattr(obj, "student", None), "id", None) or getattr(
            obj, "student_id", None
        )
        return profile.student_profile_id == object_student_id
