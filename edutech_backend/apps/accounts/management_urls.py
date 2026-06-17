from django.urls import path

from apps.accounts.views import (
    InstituteCreateLoginView,
    StudentCreateLoginView,
    TeacherCreateLoginView,
    UserDisableView,
    UserEnableView,
    UserResetPasswordView,
)

app_name = "accounts-management"

urlpatterns = [
    path(
        "institutes/<uuid:institute_id>/create-login/",
        InstituteCreateLoginView.as_view(),
        name="create-institute-login",
    ),
    path(
        "students/<uuid:student_id>/create-login/",
        StudentCreateLoginView.as_view(),
        name="create-student-login",
    ),
    path(
        "teachers/<uuid:teacher_id>/create-login/",
        TeacherCreateLoginView.as_view(),
        name="create-teacher-login",
    ),
    path(
        "users/<int:user_id>/reset-password/",
        UserResetPasswordView.as_view(),
        name="reset-user-password",
    ),
    path(
        "users/<int:user_id>/disable/",
        UserDisableView.as_view(),
        name="disable-user-login",
    ),
    path(
        "users/<int:user_id>/enable/",
        UserEnableView.as_view(),
        name="enable-user-login",
    ),
]
