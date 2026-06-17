from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
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
    mark_all_parent_alerts_as_read,
    resolve_parent_child_access,
    update_parent_alert_status,
    update_parent_preferences,
)
from common.pagination import StandardResultsSetPagination


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
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        child_id = request.query_params.get("child_id")
        status_filter = request.query_params.get("status")
        severity_filter = request.query_params.get("severity")
        alert_type = request.query_params.get("alert_type")
        search = (request.query_params.get("search") or "").strip()
        ordering = request.query_params.get("ordering") or "latest"
        parent_profile = get_parent_profile_for_user(request.user)
        student = None
        if child_id:
            relationship = resolve_parent_child_access(request.user, child_id)
            if not relationship.can_receive_alerts:
                paginator = self.pagination_class()
                page = paginator.paginate_queryset([], request, view=self)
                response = paginator.get_paginated_response(page)
                response.data["summary"] = {
                    "total": 0,
                    "unread": 0,
                    "read": 0,
                    "resolved": 0,
                    "dismissed": 0,
                    "high": 0,
                    "warning": 0,
                    "info": 0,
                }
                response.data["available_alert_types"] = []
                response.data["applied_filters"] = {
                    "child_id": child_id,
                    "status": status_filter or "all",
                    "severity": severity_filter or "all",
                    "alert_type": alert_type or "",
                    "ordering": ordering,
                    "search": search,
                }
                return response
            student = relationship.student

        base_queryset = build_parent_alerts(parent_profile, student=student)

        allowed_statuses = {"new", "read", "resolved", "dismissed", None, ""}
        allowed_severities = {"high", "warning", "info", None, ""}
        allowed_ordering = {"latest", "oldest", "severity"}

        if status_filter not in allowed_statuses:
            return Response({"status": ["Unsupported status filter."]}, status=status.HTTP_400_BAD_REQUEST)
        if severity_filter not in allowed_severities:
            return Response({"severity": ["Unsupported severity filter."]}, status=status.HTTP_400_BAD_REQUEST)
        if ordering not in allowed_ordering:
            return Response({"ordering": ["Unsupported ordering option."]}, status=status.HTTP_400_BAD_REQUEST)

        alerts = build_parent_alerts(
            parent_profile,
            student=student,
            status_filter=status_filter or None,
            severity_filter=severity_filter or None,
            alert_type=(alert_type or None),
            search=search or None,
            ordering=ordering,
        )
        summary = base_queryset.aggregate(
            total=Count("id"),
            unread=Count("id", filter=Q(status="new")),
            read=Count("id", filter=Q(status="read")),
            resolved=Count("id", filter=Q(status="resolved")),
            dismissed=Count("id", filter=Q(status="dismissed")),
            high=Count("id", filter=Q(severity="high")),
            warning=Count("id", filter=Q(severity="warning")),
            info=Count("id", filter=Q(severity="info")),
        )
        available_alert_types = list(
            base_queryset.values("alert_type").annotate(count=Count("id")).order_by("-count", "alert_type")
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(alerts, request, view=self)
        serializer = ParentAlertSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["summary"] = {key: value or 0 for key, value in summary.items()}
        response.data["available_alert_types"] = available_alert_types
        response.data["applied_filters"] = {
            "child_id": child_id,
            "status": status_filter or "all",
            "severity": severity_filter or "all",
            "alert_type": alert_type or "",
            "ordering": ordering,
            "search": search,
        }
        return response


class ParentAlertsMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated, IsParent]

    def post(self, request):
        child_id = request.data.get("child_id")
        severity_filter = request.data.get("severity")
        alert_type = request.data.get("alert_type")
        search = (request.data.get("search") or "").strip()
        scope = request.data.get("scope") or "matching"
        alert_ids = request.data.get("alert_ids") or []
        parent_profile = get_parent_profile_for_user(request.user)
        student = None

        if child_id:
            relationship = resolve_parent_child_access(request.user, child_id)
            if not relationship.can_receive_alerts:
                return Response({"updated_count": 0}, status=status.HTTP_200_OK)
            student = relationship.student

        allowed_severities = {"high", "warning", "info", None, "", "all"}
        allowed_scopes = {"matching", "page"}
        if severity_filter not in allowed_severities:
            return Response({"severity": ["Unsupported severity filter."]}, status=status.HTTP_400_BAD_REQUEST)
        if scope not in allowed_scopes:
            return Response({"scope": ["Unsupported bulk action scope."]}, status=status.HTTP_400_BAD_REQUEST)
        if scope == "page" and not isinstance(alert_ids, list):
            return Response({"alert_ids": ["Alert ids must be sent as a list."]}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = mark_all_parent_alerts_as_read(
            parent_profile,
            student=student,
            severity_filter=None if severity_filter in {None, "", "all"} else severity_filter,
            alert_type=None if not alert_type or alert_type == "all" else alert_type,
            search=search or None,
            alert_ids=alert_ids if scope == "page" else None,
        )
        return Response({"updated_count": updated_count}, status=status.HTTP_200_OK)


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
