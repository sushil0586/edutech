from django.db.models import Count, Q
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
from common.pagination import StandardResultsSetPagination
from common.responses import action_response


def _notification_type_label(value):
    return str(value).replace("_", " ").strip().title()


def _notification_group_options(queryset, field_name):
    rows = queryset.values(field_name).annotate(count=Count("id")).order_by("-count", field_name)
    options = []
    for row in rows:
        value = row[field_name]
        if not value:
            continue
        options.append(
            {
                "value": value,
                "label": _notification_type_label(value),
                "count": row["count"],
            }
        )
    return options


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        base_queryset = (
            InAppNotification.objects.select_related("institute", "recipient_user")
            .only(
                "id",
                "institute_id",
                "recipient_user_id",
                "notification_type",
                "title",
                "message",
                "related_object_type",
                "related_object_id",
                "is_read",
                "read_at",
                "metadata",
                "created_at",
                "is_active",
            )
            .filter(recipient_user=request.user, is_active=True)
        )
        queryset = base_queryset

        status_filter = (request.query_params.get("status") or "all").strip().lower()
        if status_filter == "read":
            queryset = queryset.filter(is_read=True)
        elif status_filter == "unread":
            queryset = queryset.filter(is_read=False)
        else:
            status_filter = "all"

        notification_type = (request.query_params.get("notification_type") or "").strip()
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        related_object_type = (request.query_params.get("related_object_type") or "").strip()
        if related_object_type:
            queryset = queryset.filter(related_object_type=related_object_type)

        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(message__icontains=search)
                | Q(notification_type__icontains=search)
                | Q(related_object_type__icontains=search)
            )

        ordering = (request.query_params.get("ordering") or "newest").strip().lower()
        if ordering == "oldest":
            queryset = queryset.order_by("created_at", "id")
        elif ordering == "unread_first":
            queryset = queryset.order_by("is_read", "-created_at", "-id")
        elif ordering == "type":
            queryset = queryset.order_by("notification_type", "is_read", "-created_at", "-id")
        else:
            ordering = "newest"
            queryset = queryset.order_by("-created_at", "-id")

        summary = base_queryset.aggregate(
            total=Count("id"),
            unread=Count("id", filter=Q(is_read=False)),
            read=Count("id", filter=Q(is_read=True)),
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = InAppNotificationSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["summary"] = {
            "total": summary["total"] or 0,
            "unread": summary["unread"] or 0,
            "read": summary["read"] or 0,
        }
        response.data["available_notification_types"] = _notification_group_options(
            base_queryset,
            "notification_type",
        )
        response.data["available_related_object_types"] = _notification_group_options(
            base_queryset,
            "related_object_type",
        )
        response.data["applied_filters"] = {
            "status": status_filter,
            "notification_type": notification_type,
            "related_object_type": related_object_type,
            "ordering": ordering,
            "search": search,
        }
        return response


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
