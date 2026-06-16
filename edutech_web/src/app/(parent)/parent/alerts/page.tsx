import Link from "next/link";
import { ParentAlertsFeed } from "@/components/parent/parent-alerts-feed";
import { ParentChildSwitcher } from "@/components/parent/parent-child-switcher";
import { ParentPageHeader } from "@/components/ui/parent-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  fetchParentAlerts,
  fetchParentChildren,
  getParentApiState,
} from "@/lib/api/parent";
import {
  titleCaseLabel,
} from "@/lib/parent/formatters";

async function loadParentAlerts(childId?: string) {
  const state = getParentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      children: [],
      alerts: [],
    };
  }

  try {
    const [children, alerts] = await Promise.all([
      fetchParentChildren(),
      fetchParentAlerts(childId),
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
      alerts: [],
    };
  }
}

export default async function ParentAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ child_id?: string }>;
}) {
  const { child_id: childId } = await searchParams;
  const { source, children, alerts } = await loadParentAlerts(childId);
  const selectedChild = childId ? children.find((child) => child.student_id === childId) : null;
  const unreadCount = alerts.filter((alert) => alert.status === "new").length;
  const highCount = alerts.filter((alert) => alert.severity === "high").length;
  const warningCount = alerts.filter((alert) => alert.severity === "warning").length;

  return (
    <div className="studentPage studentDashboardModern">
      <ParentPageHeader
        title="Family Alerts"
        description="Review academic risk, result, inactivity, and milestone alerts generated for the linked children inside the parent relationship scope."
        contextLabel={selectedChild?.student_name}
        statusLabel={
          source === "live"
            ? `${alerts.length} alerts`
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

          <section className="studentInsightHeroCard">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Alert Center</span>
              <strong>Keep risk, results, inactivity, and milestones visible from one family queue</strong>
              <p>
                Alerts stay relationship-aware, so the parent account only receives the academic and
                integrity signals that are explicitly allowed for each linked child.
              </p>
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
              <strong>{alerts.length}</strong>
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
                <span>{alerts.length} records</span>
              </div>
              <ParentAlertsFeed initialAlerts={alerts} />
            </article>
          </section>
        </>
      )}
    </div>
  );
}
