from rest_framework import serializers

from apps.reports.models import AuditLog, InAppNotification


class InAppNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InAppNotification
        fields = (
            "id",
            "institute",
            "recipient_user",
            "notification_type",
            "title",
            "message",
            "related_object_type",
            "related_object_id",
            "is_read",
            "read_at",
            "metadata",
            "created_at",
        )
        read_only_fields = fields


class NotificationUnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = (
            "id",
            "institute",
            "user",
            "action",
            "entity_type",
            "entity_id",
            "message",
            "metadata",
            "ip_address",
            "user_agent",
            "created_at",
        )
        read_only_fields = fields
