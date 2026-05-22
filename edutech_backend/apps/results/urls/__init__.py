from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.results.views import ExamPerformanceSummaryViewSet, ExamResultViewSet, StudentTopicPerformanceViewSet

app_name = "results"

result_router = DefaultRouter()
result_router.register("", ExamResultViewSet, basename="results")

topic_router = DefaultRouter()
topic_router.register("", StudentTopicPerformanceViewSet, basename="topic-performance")

summary_router = DefaultRouter()
summary_router.register("", ExamPerformanceSummaryViewSet, basename="exam-summary")

urlpatterns = [
    path("topic-performance/", include(topic_router.urls)),
    path("exam-summary/", include(summary_router.urls)),
    path("", include(result_router.urls)),
]
