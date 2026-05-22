from rest_framework.routers import DefaultRouter

from apps.academics.views import (
    AcademicYearViewSet,
    CohortViewSet,
    ProgramViewSet,
    SubjectViewSet,
    TopicViewSet,
)

app_name = "academics"

router = DefaultRouter()
router.register("academic-years", AcademicYearViewSet, basename="academic-years")
router.register("programs", ProgramViewSet, basename="programs")
router.register("cohorts", CohortViewSet, basename="cohorts")
router.register("subjects", SubjectViewSet, basename="subjects")
router.register("topics", TopicViewSet, basename="topics")

urlpatterns = router.urls
