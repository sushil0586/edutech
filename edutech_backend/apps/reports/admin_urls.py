from django.urls import path

from apps.reports.views import ActivationSummaryView, ExamRuntimeSummaryView


app_name = "reports-admin"

urlpatterns = [
    path("activation-summary/", ActivationSummaryView.as_view(), name="activation-summary"),
    path("admin/activation-summary/", ActivationSummaryView.as_view(), name="admin-activation-summary"),
    path("exam-runtime-summary/", ExamRuntimeSummaryView.as_view(), name="exam-runtime-summary"),
    path("admin/exam-runtime-summary/", ExamRuntimeSummaryView.as_view(), name="admin-exam-runtime-summary"),
]
