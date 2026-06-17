import Link from "next/link";
import { ParentAlertsFeed } from "@/components/parent/parent-alerts-feed";
import { ParentChildSwitcher } from "@/components/parent/parent-child-switcher";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { ParentPageHeader } from "@/components/ui/parent-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  fetchParentAlerts,
  fetchParentChildren,
  getParentApiState,
} from "@/lib/api/parent";
import {
  buildParentAlertsHref,
  parentAlertTypeOptions,
  resolveParentAlertFilters,
} from "@/lib/parent/alerts";
import {
  titleCaseLabel,
} from "@/lib/parent/formatters";

function emptyAlertsPage() {
  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
    summary: {
      total: 0,
      unread: 0,
      read: 0,
      resolved: 0,
      dismissed: 0,
      high: 0,
      warning: 0,
      info: 0,
    },
    available_alert_types: [],
    applied_filters: {
      child_id: null,
      status: "all",
      severity: "all",
      alert_type: "",
      ordering: "latest",
      search: "",
    },
  };
}

async function loadParentAlerts(filters: ReturnType<typeof resolveParentAlertFilters>) {
  const state = getParentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      children: [],
      alerts: emptyAlertsPage(),
    };
  }

  try {
    const [children, alerts] = await Promise.all([
      fetchParentChildren(),
      fetchParentAlerts({
        childId: filters.childId,
        status: filters.status,
        severity: filters.severity,
        alertType: filters.alertType,
        ordering: filters.ordering,
        search: filters.search,
        page: filters.page,
        pageSize: filters.pageSize,
      }),
    ]);

    return {
      source: "live" as const,
      children,
      alerts,
    };
  } catch {
    return {
      source: "error" as const,
      children: [],
      alerts: emptyAlertsPage(),
    };
  }
}

export default async function ParentAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{
    child_id?: string;
    status?: string;
    severity?: string;
    alert_type?: string;
    ordering?: string;
    group?: string;
    search?: string;
    page?: string;
    page_size?: string;
  }>;
}) {
  const filters = resolveParentAlertFilters(await searchParams);
  const { source, children, alerts } = await loadParentAlerts(filters);
  const childId = filters.childId;
  const selectedChild = childId ? children.find((child) => child.student_id === childId) : null;
  const unreadCount = alerts.summary.unread;
  const highCount = alerts.summary.high;
  const warningCount = alerts.summary.warning;
  const alertTypes = parentAlertTypeOptions(alerts.available_alert_types);
  const totalPages = Math.max(Math.ceil(alerts.count / filters.pageSize), 1);
  const resetHref = buildParentAlertsHref("/parent/alerts", {
    ...filters,
    status: "all",
    severity: "all",
    alertType: "all",
    ordering: "latest",
    groupBy: "none",
    search: "",
    page: 1,
  });

  return (
    <div className="studentPage studentDashboardModern">
      <ParentPageHeader
        title="Family Alerts"
        description="Review academic risk, result, inactivity, and milestone alerts generated for the linked children inside the parent relationship scope."
        contextLabel={selectedChild?.student_name}
        statusLabel={
          source === "live"
            ? `${alerts.summary.total} alerts`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load alerts"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for parent alerts"
              : "Parent alerts could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the parent API base URL to load family notifications dynamically."
              : "The parent alerts endpoint did not return successfully for this request."
          }
          bullets={[
            "Parent alerts endpoint",
            "Authenticated parent role",
          ]}
          ctaHref="/parent/dashboard"
          ctaLabel="Open Dashboard"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : children.length === 0 ? (
        <StudentStatePanel
          eyebrow="Family linking"
          title="No linked children are available for alerts"
          description="Alerts appear only after an active parent-child relationship exists and alert delivery is enabled for that child."
          bullets={[
            "Active relationship required",
            "Alert permission is controlled per child",
            "Alert history populates after backend signals are raised",
          ]}
          ctaHref="/parent/children"
          ctaLabel="Open Children"
          statusLabel="Waiting for alert-enabled link"
        />
      ) : (
        <>
          <ParentChildSwitcher
            allLabel="All Alert Scope"
            basePath="/parent/alerts"
            childRecords={children}
            currentChildId={selectedChild?.student_id}
          />

          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Alert Center</span>
              <strong>Family alert queue</strong>
              <small>{unreadCount} unread alerts · {highCount} high severity</small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/parent/settings">
                Alert Preferences
              </Link>
              <Link className="button buttonSecondary" href="/parent/children">
                Switch Child
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Total Alerts</span>
              <strong>{alerts.summary.total}</strong>
              <small>Alert records in the current scope</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Unread</span>
              <strong>{unreadCount}</strong>
              <small>Alerts still marked as new</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>High Severity</span>
              <strong>{highCount}</strong>
              <small>Serious alerts requiring family attention</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Warnings</span>
              <strong>{warningCount}</strong>
              <small>Medium-priority academic signals</small>
            </article>
          </section>

          <section className="contentCard workspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Alert Controls</strong>
              <span>{alerts.count} matching alerts · page {filters.page} of {totalPages}</span>
            </div>
            <form className="workspaceFiltersForm" method="GET">
              {filters.childId ? <input name="child_id" type="hidden" value={filters.childId} /> : null}
              <input name="page" type="hidden" value="1" />
              <label className="workspaceFilterField workspaceFilterFieldWide">
                <span>Search alerts</span>
                <input
                  defaultValue={filters.search}
                  name="search"
                  placeholder="Title, message, learner, or admission no"
                  type="search"
                />
              </label>
              <label className="workspaceFilterField">
                <span>Status</span>
                <select defaultValue={filters.status} name="status">
                  <option value="all">All statuses</option>
                  <option value="new">Unread</option>
                  <option value="read">Read</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Severity</span>
                <select defaultValue={filters.severity} name="severity">
                  <option value="all">All severities</option>
                  <option value="high">High</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Alert type</span>
                <select defaultValue={filters.alertType} name="alert_type">
                  <option value="all">All types</option>
                  {alertTypes.map((type) => (
                    <option key={type} value={type}>
                      {titleCaseLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Sort</span>
                <select defaultValue={filters.ordering} name="ordering">
                  <option value="latest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="severity">Highest severity first</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Group</span>
                <select defaultValue={filters.groupBy} name="group">
                  <option value="none">No grouping</option>
                  <option value="severity">Severity</option>
                  <option value="status">Status</option>
                  <option value="child">Child</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Page size</span>
                <select defaultValue={String(filters.pageSize)} name="page_size">
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="40">40</option>
                </select>
              </label>
              <div className="workspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
                </button>
                <Link className="button buttonSecondary" href={resetHref}>
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="workspaceFilterQuickRow">
              <span className="workspaceFilterQuickLabel">Quick filters</span>
              <div className="workspaceFilterQuickChips">
                {[
                  {
                    label: "Unread",
                    href: buildParentAlertsHref("/parent/alerts", { ...filters, status: "new", page: 1 }),
                    active: filters.status === "new",
                  },
                  {
                    label: "High Severity",
                    href: buildParentAlertsHref("/parent/alerts", { ...filters, severity: "high", page: 1 }),
                    active: filters.severity === "high",
                  },
                  {
                    label: "Exam Risk",
                    href: buildParentAlertsHref("/parent/alerts", { ...filters, alertType: "exam_risk", page: 1 }),
                    active: filters.alertType === "exam_risk",
                  },
                  {
                    label: "Group by Status",
                    href: buildParentAlertsHref("/parent/alerts", { ...filters, groupBy: "status", page: 1 }),
                    active: filters.groupBy === "status",
                  },
                ].map((chip) => (
                  <Link
                    key={chip.label}
                    className={`workspaceQuickChip${chip.active ? " workspaceQuickChipActive" : ""}`}
                    href={chip.href}
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
            <FilterSummaryPills
              items={[
                { label: "Status", value: titleCaseLabel(filters.status) },
                { label: "Severity", value: titleCaseLabel(filters.severity) },
                { label: "Type", value: filters.alertType === "all" ? "All" : titleCaseLabel(filters.alertType) },
                { label: "Sort", value: titleCaseLabel(filters.ordering) },
                { label: "Group", value: titleCaseLabel(filters.groupBy) },
                { label: "Page size", value: filters.pageSize },
                { label: "Search", value: filters.search },
              ]}
            />
          </section>

          <section className="dashboardGrid">
            <article className="dashboardPanel">
              <div className="sectionHeading">
                <strong>Active Child Filters</strong>
                <Link href="/parent/children">Open children</Link>
              </div>
              <div className="weakTopicStack">
                {children.map((child) => (
                  <div className="weakTopicRow" key={child.relationship_id}>
                    <div>
                      <strong>{child.student_name}</strong>
                      <span>{titleCaseLabel(child.relationship_type)}</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{child.permissions.can_receive_alerts ? "Alerts on" : "Alerts off"}</strong>
                      <span>{child.program_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Alert Feed</strong>
                <span>{alerts.results.length} records on this page</span>
              </div>
              <ParentAlertsFeed
                alertType={filters.alertType}
                childId={filters.childId}
                groupBy={filters.groupBy}
                initialAlerts={alerts.results}
                search={filters.search}
                severity={filters.severity}
                statusFilter={filters.status}
              />
              {alerts.count > filters.pageSize ? (
                <div className="workspaceFilterActions">
                  <Link
                    aria-disabled={filters.page <= 1}
                    className="button buttonSecondary"
                    href={
                      filters.page <= 1
                        ? "#"
                        : buildParentAlertsHref("/parent/alerts", { ...filters, page: filters.page - 1 })
                    }
                  >
                    Previous
                  </Link>
                  <Link
                    aria-disabled={filters.page >= totalPages}
                    className="button buttonSecondary"
                    href={
                      filters.page >= totalPages
                        ? "#"
                        : buildParentAlertsHref("/parent/alerts", { ...filters, page: filters.page + 1 })
                    }
                  >
                    Next
                  </Link>
                </div>
              ) : null}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
