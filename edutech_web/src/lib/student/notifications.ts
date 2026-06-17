import type { StudentNotification } from "@/features/dashboard/types";
import { buildFilterHref } from "@/lib/workspace/filter-utils";

export const STUDENT_NOTIFICATIONS_BASE_PATH = "/app/notifications";
export const NOTIFICATION_STATUS_VALUES = ["all", "unread", "read"] as const;
export const NOTIFICATION_ORDERING_VALUES = [
  "newest",
  "oldest",
  "unread_first",
  "type",
] as const;
export const NOTIFICATION_GROUP_VALUES = [
  "day",
  "type",
  "status",
  "object",
  "none",
] as const;
export const NOTIFICATION_PAGE_SIZE_VALUES = [12, 24, 48, 96] as const;

export function notificationTone(type: string) {
  if (type.includes("result")) return "statusLive";
  if (type.includes("starting") || type.includes("live")) return "statusWarning";
  return "statusDemo";
}

export function formatNotificationType(value: string) {
  return value
    .replaceAll("_", " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function notificationHref(notification: {
  related_object_type: string;
  related_object_id: string;
  metadata: Record<string, unknown>;
}) {
  const route =
    typeof notification.metadata.route === "string" ? notification.metadata.route : "";
  const examId =
    typeof notification.metadata.exam_id === "string"
      ? notification.metadata.exam_id
      : "";
  const attemptId =
    typeof notification.metadata.attempt_id === "string"
      ? notification.metadata.attempt_id
      : "";

  if (route === "student_exam_detail" && examId) {
    return `/app/exams/${examId}`;
  }

  if (route === "student_attempt_summary" && attemptId) {
    return `/app/attempts/${attemptId}/summary`;
  }

  if (notification.related_object_type === "exam" && notification.related_object_id) {
    return `/app/exams/${notification.related_object_id}`;
  }

  if (notification.related_object_type === "attempt" && notification.related_object_id) {
    return `/app/attempts/${notification.related_object_id}/summary`;
  }

  return STUDENT_NOTIFICATIONS_BASE_PATH;
}

export function relativeTimeLabel(isoDate: string) {
  const createdAt = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(Math.round((now - createdAt) / 60000), 0);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function dateGroupLabel(isoDate: string) {
  const value = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfValue = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  ).getTime();
  const dayDiff = Math.round((startOfToday - startOfValue) / 86400000);

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: value.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(value);
}

export function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildNotificationsHref(filters: {
  page?: number;
  pageSize: number;
  status: string;
  notificationType: string;
  relatedObjectType: string;
  ordering: string;
  groupBy: string;
  search: string;
}) {
  return buildFilterHref(STUDENT_NOTIFICATIONS_BASE_PATH, [
    ["page", filters.page && filters.page > 1 ? String(filters.page) : null],
    ["page_size", String(filters.pageSize), "24"],
    ["status", filters.status, "all"],
    ["notification_type", filters.notificationType],
    ["related_object_type", filters.relatedObjectType],
    ["ordering", filters.ordering, "newest"],
    ["group_by", filters.groupBy, "day"],
    ["search", filters.search],
  ]);
}

export function groupNotifications(
  notifications: StudentNotification[],
  groupBy: string,
) {
  if (groupBy === "none") {
    return [
      {
        key: "all",
        label: "All notifications",
        items: notifications,
      },
    ];
  }

  const groups = new Map<string, { label: string; items: StudentNotification[] }>();
  for (const notification of notifications) {
    let key = "general";
    let label = "General";

    if (groupBy === "day") {
      key = notification.created_at.slice(0, 10);
      label = dateGroupLabel(notification.created_at);
    } else if (groupBy === "type") {
      key = notification.notification_type || "general";
      label = formatNotificationType(notification.notification_type || "general");
    } else if (groupBy === "status") {
      key = notification.is_read ? "read" : "unread";
      label = notification.is_read ? "Read notifications" : "Unread notifications";
    } else if (groupBy === "object") {
      key = notification.related_object_type || "general";
      label = formatNotificationType(notification.related_object_type || "general");
    }

    const current = groups.get(key);
    if (current) {
      current.items.push(notification);
      continue;
    }
    groups.set(key, { label, items: [notification] });
  }

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    items: value.items,
  }));
}
