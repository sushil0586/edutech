from rest_framework.routers import DefaultRouter

from apps.exams.views import ExamPublishLogViewSet, ExamQuestionViewSet, ExamSectionViewSet, ExamViewSet

app_name = "exams"

router = DefaultRouter()
router.register("sections", ExamSectionViewSet, basename="exam-sections")
router.register("questions", ExamQuestionViewSet, basename="exam-questions")
router.register("publish-logs", ExamPublishLogViewSet, basename="exam-publish-logs")
router.register("", ExamViewSet, basename="exams")

urlpatterns = router.urls
