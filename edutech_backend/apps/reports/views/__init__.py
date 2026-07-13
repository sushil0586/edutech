from django.db.models import Count, Prefetch, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AccountRole
from apps.accounts.scopes import get_account_profile, scope_exam_queryset
from apps.exams.models import Exam, ExamAccessSlot
from apps.exams.services import resolve_exam_runtime_thresholds
from apps.reports.models import InAppNotification
from apps.reports.serializers import (
    InAppNotificationSerializer,
    NotificationUnreadCountSerializer,
)
from apps.reports.services import (
    create_audit_log,
    mark_all_notifications_as_read,
    mark_notification_as_read,
    notification_list_metadata,
    unread_notification_count,
)
from common.pagination import StandardResultsSetPagination
from common.responses import action_response


def _slot_pressure_state(slot):
    start_capacity = slot.start_capacity
    assignment_capacity = slot.assignment_capacity
    assignment_count = int(getattr(slot, "assignment_count", 0) or 0)
    active_attempt_count = int(getattr(slot, "active_attempt_count", 0) or 0)

    assignment_remaining = (
        None if assignment_capacity is None else max(int(assignment_capacity) - assignment_count, 0)
    )
    start_remaining = (
        None if start_capacity is None else max(int(start_capacity) - active_attempt_count, 0)
    )

    occupancy_state = "healthy"
    if start_capacity is not None and active_attempt_count >= start_capacity:
        occupancy_state = "full"
    elif assignment_capacity is not None and assignment_count >= assignment_capacity:
        occupancy_state = "full"
    elif (
        start_capacity is not None
        and start_remaining is not None
        and start_remaining <= max(1, int(start_capacity * 0.1))
    ):
        occupancy_state = "near_full"
    elif (
        assignment_capacity is not None
        and assignment_remaining is not None
        and assignment_remaining <= max(1, int(assignment_capacity * 0.1))
    ):
        occupancy_state = "near_full"

    return {
        "assignment_count": assignment_count,
        "active_attempt_count": active_attempt_count,
        "occupancy_state": occupancy_state,
    }


class ExamRuntimeSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_account_profile(request.user)
        if profile is None or profile.role not in {
            AccountRole.PLATFORM_ADMIN,
            AccountRole.INSTITUTE_ADMIN,
            AccountRole.TEACHER,
        }:
            return Response(
                {"detail": "You do not have permission to view runtime ops."},
                status=status.HTTP_403_FORBIDDEN,
            )

        status_filter = (request.query_params.get("status") or "active").strip().lower()
        allowed_statuses = {"active", "all", "live", "scheduled"}
        if status_filter not in allowed_statuses:
            status_filter = "active"

        exams_queryset = scope_exam_queryset(
            Exam.objects.select_related("institute").only(
                "id",
                "title",
                "code",
                "status",
                "access_mode",
                "metadata",
                "institute__name",
            ),
            request.user,
        ).filter(is_active=True)

        if status_filter == "live":
            exams_queryset = exams_queryset.filter(status="live")
        elif status_filter == "scheduled":
            exams_queryset = exams_queryset.filter(status="scheduled")
        elif status_filter == "active":
            exams_queryset = exams_queryset.filter(status__in=["scheduled", "live"])

        slot_queryset = (
            ExamAccessSlot.objects.filter(is_active=True)
            .annotate(
                assignment_count=Count(
                    "student_assignments",
                    filter=Q(student_assignments__is_active=True),
                    distinct=True,
                ),
                active_attempt_count=Count(
                    "attempts",
                    filter=Q(attempts__is_active=True, attempts__status="in_progress"),
                    distinct=True,
                ),
            )
            .only(
                "id",
                "exam_id",
                "slot_label",
                "status",
                "assignment_capacity",
                "start_capacity",
                "slot_start_at",
                "slot_end_at",
            )
        )

        exams = list(
            exams_queryset.prefetch_related(
                Prefetch("access_slots", queryset=slot_queryset, to_attr="_runtime_access_slots")
            )
        )

        total_active_slots = 0
        total_full_slots = 0
        total_near_full_slots = 0
        total_live_attempts = 0
        total_assigned_learners = 0
        slot_managed_exams = 0
        threshold_managed_exams = 0
        exams_with_pressure = 0
        exam_rows = []

        for exam in exams:
            access_mode = getattr(exam, "resolved_access_mode", None) or exam.access_mode or "global_window_legacy"
            if access_mode == "slot_managed":
                slot_managed_exams += 1
            runtime_thresholds = resolve_exam_runtime_thresholds(exam)
            if any(
                value is not None
                for value in (
                    runtime_thresholds.get("daily_start_cap"),
                    runtime_thresholds.get("hourly_start_cap"),
                    runtime_thresholds.get("concurrent_active_attempt_cap"),
                )
            ):
                threshold_managed_exams += 1

            active_slots = [slot for slot in getattr(exam, "_runtime_access_slots", []) if slot.status == "active"]
            active_slot_count = len(active_slots)
            full_slot_count = 0
            near_full_slot_count = 0
            live_attempts = 0
            assigned_learners = 0
            slot_labels = []
            for slot in active_slots:
                state = _slot_pressure_state(slot)
                assigned_learners += state["assignment_count"]
                live_attempts += state["active_attempt_count"]
                if state["occupancy_state"] == "full":
                    full_slot_count += 1
                elif state["occupancy_state"] == "near_full":
                    near_full_slot_count += 1
                slot_labels.append(slot.slot_label)

            total_active_slots += active_slot_count
            total_full_slots += full_slot_count
            total_near_full_slots += near_full_slot_count
            total_live_attempts += live_attempts
            total_assigned_learners += assigned_learners

            pressure_score = (full_slot_count * 100) + (near_full_slot_count * 25) + live_attempts
            if pressure_score > 0:
                exams_with_pressure += 1

            configured_caps = [
                cap
                for cap in [
                    f"Daily {runtime_thresholds.get('daily_start_cap')}" if runtime_thresholds.get("daily_start_cap") else None,
                    f"Hourly {runtime_thresholds.get('hourly_start_cap')}" if runtime_thresholds.get("hourly_start_cap") else None,
                    f"Concurrent {runtime_thresholds.get('concurrent_active_attempt_cap')}" if runtime_thresholds.get("concurrent_active_attempt_cap") else None,
                ]
                if cap
            ]

            exam_rows.append(
                {
                    "exam_id": str(exam.id),
                    "title": exam.title,
                    "code": exam.code,
                    "institute_name": getattr(exam.institute, "name", ""),
                    "status": exam.status,
                    "access_mode": access_mode,
                    "active_slots": active_slot_count,
                    "full_slots": full_slot_count,
                    "near_full_slots": near_full_slot_count,
                    "live_attempts": live_attempts,
                    "assigned_learners": assigned_learners,
                    "configured_caps": configured_caps,
                    "pressure_score": pressure_score,
                    "slot_labels": slot_labels[:3],
                }
            )

        exam_rows.sort(
            key=lambda item: (
                -int(item["pressure_score"]),
                -int(item["live_attempts"]),
                item["title"].lower(),
            )
        )

        return Response(
            {
                "summary": {
                    "tracked_exams": len(exams),
                    "slot_managed_exams": slot_managed_exams,
                    "threshold_managed_exams": threshold_managed_exams,
                    "active_slots": total_active_slots,
                    "full_slots": total_full_slots,
                    "near_full_slots": total_near_full_slots,
                    "live_attempts": total_live_attempts,
                    "assigned_learners": total_assigned_learners,
                    "exams_with_pressure": exams_with_pressure,
                    "status_filter": status_filter,
                },
                "top_pressure_exams": exam_rows[:8],
            }
        )


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        base_queryset = (
            InAppNotification.objects.only(
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

        metadata = notification_list_metadata(request.user)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = InAppNotificationSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["summary"] = metadata["summary"]
        response.data["available_notification_types"] = metadata["available_notification_types"]
        response.data["available_related_object_types"] = metadata["available_related_object_types"]
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
            InAppNotification.objects.filter(
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
