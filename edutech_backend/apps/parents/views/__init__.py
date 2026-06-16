from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsParent
from apps.parents.serializers import (
    ParentAlertSerializer,
    ParentChildListSerializer,
    ParentPreferencesSerializer,
)
from apps.parents.services import (
    build_parent_alerts,
    build_parent_child_record,
    build_parent_dashboard_summary,
    build_parent_progress_summary,
    get_active_parent_relationships,
    get_parent_profile_for_user,
    resolve_parent_child_access,
    update_parent_alert_status,
    update_parent_preferences,
)


def _selected_relationship(user, child_id=None, *, permission_flag=None):
    if child_id:
      return resolve_parent_child_access(user, child_id, permission_flag=permission_flag)

    relationships = get_active_parent_relationships(user)
    relationship = relationships.first()
    if relationship is None:
        return None
    if permission_flag and not getattr(relationship, permission_flag):
        relationship = relationships.filter(**{permission_flag: True}).first()
    return relationship


class ParentChildrenListView(APIView):
    permission_classes = [IsAuthenticated, IsParent]

    def get(self, request):
        relationships = get_active_parent_relationships(request.user)
        payload = [build_parent_child_record(relationship) for relationship in relationships]
        return Response(ParentChildListSerializer(payload, many=True).data, status=status.HTTP_200_OK)


class ParentChildDetailView(APIView):
    permission_classes = [IsAuthenticated, IsParent]

    def get(self, request, child_id):
        relationship = resolve_parent_child_access(request.user, child_id)
        payload = build_parent_child_record(relationship)
        return Response(ParentChildListSerializer(payload).data, status=status.HTTP_200_OK)


class ParentDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsParent]

    def get(self, request):
        child_id = request.query_params.get("child_id")
        relationship = _selected_relationship(request.user, child_id, permission_flag="can_view_progress")
        parent_profile = get_parent_profile_for_user(request.user)

        if relationship is None:
            return Response(
                {
                    "child": None,
                    "progress_summary": None,
                    "recent_results": [],
                    "weak_subjects": [],
                    "weak_topics": [],
                    "alert_summary": {"total": 0, "unread": 0, "high": 0, "warning": 0},
                    "insight_messages": [],
                },
                status=status.HTTP_200_OK,
            )

        payload = build_parent_dashboard_summary(parent_profile, relationship.student)
        return Response(payload, status=status.HTTP_200_OK)


class ParentProgressView(APIView):
    permission_classes = [IsAuthenticated, IsParent]

    def get(self, request):
        child_id = request.query_params.get("child_id")
        relationship = _selected_relationship(request.user, child_id, permission_flag="can_view_progress")
        parent_profile = get_parent_profile_for_user(request.user)

        if relationship is None:
            return Response(
                {
                    "child": None,
                    "average_percentage": "0.00",
                    "accuracy_percentage": "0.00",
                    "strongest_subjects": [],
                    "weakest_subjects": [],
                    "weak_topics": [],
                    "recent_results": [],
                    "attempt_behavior": {"attempt_count": 0, "attempted_questions": 0, "skipped_questions": 0},
                    "improvement_trend": {"direction": "stable", "change_percentage": "0.00"},
                },
                status=status.HTTP_200_OK,
            )

        payload = build_parent_progress_summary(parent_profile, relationship.student)
        return Response(payload, status=status.HTTP_200_OK)


class ParentPreferencesView(APIView):
    permission_classes = [IsAuthenticated, IsParent]

    def get(self, request):
        parent_profile = get_parent_profile_for_user(request.user)
        serializer = ParentPreferencesSerializer(parent_profile.notification_preferences or {})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = ParentPreferencesSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        parent_profile = get_parent_profile_for_user(request.user)
        try:
            preferences = update_parent_preferences(parent_profile, serializer.validated_data)
        except DjangoValidationError as exc:
            detail = getattr(exc, "message_dict", None) or {"detail": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)
        return Response(ParentPreferencesSerializer(preferences).data, status=status.HTTP_200_OK)


class ParentAlertsView(APIView):
    permission_classes = [IsAuthenticated, IsParent]

    def get(self, request):
        child_id = request.query_params.get("child_id")
        parent_profile = get_parent_profile_for_user(request.user)
        student = None
        if child_id:
            relationship = resolve_parent_child_access(request.user, child_id)
            if not relationship.can_receive_alerts:
                return Response([], status=status.HTTP_200_OK)
            student = relationship.student
        alerts = build_parent_alerts(parent_profile, student=student)
        return Response(ParentAlertSerializer(alerts, many=True).data, status=status.HTTP_200_OK)


class ParentAlertStatusView(APIView):
    permission_classes = [IsAuthenticated, IsParent]

    def patch(self, request, alert_id):
        next_status = request.data.get("status")
        try:
            alert = update_parent_alert_status(request.user, alert_id, next_status)
        except DjangoValidationError as exc:
            detail = getattr(exc, "message_dict", None) or {"detail": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        return Response(ParentAlertSerializer(alert).data, status=status.HTTP_200_OK)
