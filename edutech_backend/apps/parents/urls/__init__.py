from django.urls import path

from apps.parents.views import (
    ParentAlertStatusView,
    ParentAlertsMarkAllReadView,
    ParentAlertsView,
    ParentChildDetailView,
    ParentChildrenListView,
    ParentDashboardSummaryView,
    ParentPreferencesView,
    ParentProgressView,
)


app_name = "parents"

urlpatterns = [
    path("children/", ParentChildrenListView.as_view(), name="children-list"),
    path("children/<uuid:child_id>/", ParentChildDetailView.as_view(), name="children-detail"),
    path("dashboard/summary/", ParentDashboardSummaryView.as_view(), name="dashboard-summary"),
    path("progress/", ParentProgressView.as_view(), name="progress"),
    path("alerts/", ParentAlertsView.as_view(), name="alerts"),
    path("alerts/mark-all-read/", ParentAlertsMarkAllReadView.as_view(), name="alerts-mark-all-read"),
    path("alerts/<uuid:alert_id>/status/", ParentAlertStatusView.as_view(), name="alert-status"),
    path("preferences/", ParentPreferencesView.as_view(), name="preferences"),
]
