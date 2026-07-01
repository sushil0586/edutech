from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.institutes.views import (
    InstituteOnboardingProfileListView,
    InstituteOnboardingRunDetailView,
    InstituteOnboardingRunListView,
    InstituteOnboardingTaskRunListView,
    InstituteViewSet,
)

app_name = "institutes"

router = DefaultRouter()
router.register("", InstituteViewSet, basename="institutes")

urlpatterns = [
    path("onboarding-profiles/", InstituteOnboardingProfileListView.as_view(), name="institute-onboarding-profiles"),
    path("<uuid:institute_id>/onboarding-runs/", InstituteOnboardingRunListView.as_view(), name="institute-onboarding-runs"),
    path(
        "<uuid:institute_id>/onboarding-runs/<uuid:run_id>/",
        InstituteOnboardingRunDetailView.as_view(),
        name="institute-onboarding-run-detail",
    ),
    path(
        "<uuid:institute_id>/onboarding-runs/<uuid:run_id>/tasks/",
        InstituteOnboardingTaskRunListView.as_view(),
        name="institute-onboarding-run-tasks",
    ),
    *router.urls,
]
