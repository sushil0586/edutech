from django.urls import path

from apps.reports.views import ExamRuntimeSummaryView


app_name = "reports-admin"

urlpatterns = [
    path("exam-runtime-summary/", ExamRuntimeSummaryView.as_view(), name="exam-runtime-summary"),
    path("admin/exam-runtime-summary/", ExamRuntimeSummaryView.as_view(), name="admin-exam-runtime-summary"),
]
