from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.academics.views import (
    AcademicYearViewSet,
    AcademicPresetApplyView,
    AcademicPresetDetailView,
    AcademicPresetListView,
    AcademicPresetPreviewView,
    AssessmentFamilyViewSet,
    CohortViewSet,
    OptionCatalogEntryViewSet,
    ProgramViewSet,
    SubjectViewSet,
    TopicViewSet,
)

app_name = "academics"

router = DefaultRouter()
router.register("assessment-families", AssessmentFamilyViewSet, basename="assessment-families")
router.register("academic-years", AcademicYearViewSet, basename="academic-years")
router.register("programs", ProgramViewSet, basename="programs")
router.register("cohorts", CohortViewSet, basename="cohorts")
router.register("subjects", SubjectViewSet, basename="subjects")
router.register("topics", TopicViewSet, basename="topics")
router.register("option-catalog", OptionCatalogEntryViewSet, basename="option-catalog")

urlpatterns = [
    path("presets/", AcademicPresetListView.as_view(), name="preset-list"),
    path("presets/preview/", AcademicPresetPreviewView.as_view(), name="preset-preview"),
    path("presets/apply/", AcademicPresetApplyView.as_view(), name="preset-apply"),
    path("presets/<str:preset_code>/", AcademicPresetDetailView.as_view(), name="preset-detail"),
] + router.urls
