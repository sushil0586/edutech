from django.urls import path

from apps.reports.views import (
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationUnreadCountView,
)


app_name = "reports"
urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("<uuid:notification_id>/mark-read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("mark-all-read/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
]
