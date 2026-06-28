from rest_framework.routers import DefaultRouter

from apps.question_bank.views import (
    MasterQuestionLibraryViewSet,
    QuestionAttachmentViewSet,
    QuestionOptionViewSet,
    QuestionPassageViewSet,
    QuestionTagMapViewSet,
    QuestionTagViewSet,
    QuestionViewSet,
)

app_name = "question_bank"

router = DefaultRouter()
router.register("master-library", MasterQuestionLibraryViewSet, basename="master-question-library")
router.register("questions", QuestionViewSet, basename="questions")
router.register("passages", QuestionPassageViewSet, basename="question-passages")
router.register("options", QuestionOptionViewSet, basename="question-options")
router.register("tags", QuestionTagViewSet, basename="question-tags")
router.register("tag-maps", QuestionTagMapViewSet, basename="question-tag-maps")
router.register("attachments", QuestionAttachmentViewSet, basename="question-attachments")

urlpatterns = router.urls
