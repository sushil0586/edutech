from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.attempts.views import (
    StudentAnswerReviewTaskViewSet,
    StudentAnswerViewSet,
    StudentExamAttemptViewSet,
)

app_name = "attempts"

attempt_router = DefaultRouter()
attempt_router.register("", StudentExamAttemptViewSet, basename="attempts")

answer_router = DefaultRouter()
answer_router.register("", StudentAnswerViewSet, basename="attempt-answers")

review_task_router = DefaultRouter()
review_task_router.register("", StudentAnswerReviewTaskViewSet, basename="attempt-review-tasks")

urlpatterns = [
    path("answers/", include(answer_router.urls)),
    path("review-tasks/", include(review_task_router.urls)),
    path("", include(attempt_router.urls)),
]
