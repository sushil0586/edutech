from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reports.models import InAppNotification
from apps.reports.serializers import (
    InAppNotificationSerializer,
    NotificationUnreadCountSerializer,
)
from apps.reports.services import (
    create_audit_log,
    mark_all_notifications_as_read,
    mark_notification_as_read,
    unread_notification_count,
)
from common.responses import action_response


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            InAppNotification.objects.select_related("institute", "recipient_user")
            .filter(recipient_user=request.user, is_active=True)
            .order_by("-created_at")
        )
        data = InAppNotificationSerializer(queryset, many=True).data
        return Response({"count": len(data), "results": data}, status=status.HTTP_200_OK)


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = (
            InAppNotification.objects.select_related("institute", "recipient_user")
            .filter(
                pk=notification_id,
                recipient_user=request.user,
                is_active=True,
            )
            .first()
        )
        if notification is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        notification = mark_notification_as_read(notification)
        create_audit_log(
            user=request.user,
            institute=notification.institute,
            action="notification_mark_read",
            entity_type="notification",
            entity_id=notification.id,
            message="Notification marked as read.",
            metadata={"notification_type": notification.notification_type},
            request=request,
        )
        return action_response(
            data=InAppNotificationSerializer(notification).data,
            message="Notification marked as read.",
            status_code=status.HTTP_200_OK,
        )


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated_count = mark_all_notifications_as_read(request.user)
        create_audit_log(
            user=request.user,
            action="notification_mark_all_read",
            entity_type="notification",
            entity_id=request.user.id,
            message="All notifications marked as read.",
            metadata={"updated_count": updated_count},
            request=request,
        )
        return action_response(
            data={"updated_count": updated_count},
            message="All notifications marked as read.",
            status_code=status.HTTP_200_OK,
        )


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = NotificationUnreadCountSerializer(
            {"unread_count": unread_notification_count(request.user)}
        )
        return Response(serializer.data)
