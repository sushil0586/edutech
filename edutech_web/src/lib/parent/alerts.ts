import type { ParentAlert } from "@/lib/api/parent";
import { buildFilterHref, resolveFilterValue } from "@/lib/workspace/filter-utils";

export const PARENT_ALERT_STATUS_OPTIONS = ["all", "new", "read", "resolved", "dismissed"] as const;
export const PARENT_ALERT_SEVERITY_OPTIONS = ["all", "high", "warning", "info"] as const;
export const PARENT_ALERT_ORDER_OPTIONS = ["latest", "oldest", "severity"] as const;
export const PARENT_ALERT_GROUP_OPTIONS = ["none", "severity", "status", "child"] as const;

export type ParentAlertStatusFilter = (typeof PARENT_ALERT_STATUS_OPTIONS)[number];
export type ParentAlertSeverityFilter = (typeof PARENT_ALERT_SEVERITY_OPTIONS)[number];
export type ParentAlertOrder = (typeof PARENT_ALERT_ORDER_OPTIONS)[number];
export type ParentAlertGroup = (typeof PARENT_ALERT_GROUP_OPTIONS)[number];

export type ParentAlertFilters = {
  childId?: string;
  status: ParentAlertStatusFilter;
  severity: ParentAlertSeverityFilter;
  alertType: string;
  ordering: ParentAlertOrder;
  groupBy: ParentAlertGroup;
  search: string;
  page: number;
  pageSize: number;
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveParentAlertFilters(searchParams: {
  child_id?: string;
  status?: string;
  severity?: string;
  alert_type?: string;
  ordering?: string;
  group?: string;
  search?: string;
  page?: string;
  page_size?: string;
}) {
  return {
    childId: searchParams.child_id,
    status: resolveFilterValue(searchParams.status, PARENT_ALERT_STATUS_OPTIONS, "all"),
    severity: resolveFilterValue(searchParams.severity, PARENT_ALERT_SEVERITY_OPTIONS, "all"),
    alertType: searchParams.alert_type?.trim() ?? "all",
    ordering: resolveFilterValue(searchParams.ordering, PARENT_ALERT_ORDER_OPTIONS, "latest"),
    groupBy: resolveFilterValue(searchParams.group, PARENT_ALERT_GROUP_OPTIONS, "none"),
    search: searchParams.search?.trim() ?? "",
    page: parsePositiveInt(searchParams.page, 1),
    pageSize: parsePositiveInt(searchParams.page_size, 20),
  } satisfies ParentAlertFilters;
}

export function parentAlertTypeOptions(
  alertTypes: ParentAlert[] | Array<{ alert_type: string; count: number }>,
) {
  const firstItem = alertTypes[0];
  const values =
    firstItem && "alert_type" in firstItem
      ? (alertTypes as Array<{ alert_type: string; count: number }>).map((item) => item.alert_type)
      : (alertTypes as ParentAlert[]).map((alert) => alert.alert_type);

  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

export function groupParentAlerts(alerts: ParentAlert[], groupBy: ParentAlertGroup) {
  if (groupBy === "none") {
    return [{ label: "All alerts", items: alerts }];
  }

  const groups = new Map<string, ParentAlert[]>();

  for (const alert of alerts) {
    const label =
      groupBy === "severity"
        ? alert.severity
        : groupBy === "status"
          ? alert.status
          : alert.student_name || "Unknown student";
    const current = groups.get(label);
    if (current) {
      current.push(alert);
    } else {
      groups.set(label, [alert]);
    }
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function buildParentAlertsHref(basePath: string, filters: ParentAlertFilters) {
  return buildFilterHref(basePath, [
    ["child_id", filters.childId],
    ["status", filters.status, "all"],
    ["severity", filters.severity, "all"],
    ["alert_type", filters.alertType, "all"],
    ["ordering", filters.ordering, "latest"],
    ["group", filters.groupBy, "none"],
    ["search", filters.search],
    ["page", String(filters.page), "1"],
    ["page_size", String(filters.pageSize), "20"],
  ]);
}
