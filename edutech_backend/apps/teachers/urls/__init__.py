from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.teachers.views import TeacherAssignmentViewSet, TeacherProfileViewSet

app_name = "teachers"

teacher_router = DefaultRouter()
teacher_router.register("", TeacherProfileViewSet, basename="teachers")

assignment_router = DefaultRouter()
assignment_router.register("", TeacherAssignmentViewSet, basename="teacher-assignments")

urlpatterns = [
    path("assignments/", include(assignment_router.urls)),
    path("", include(teacher_router.urls)),
]
