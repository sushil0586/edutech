import Link from "next/link";
import { ParentPageHeader } from "@/components/ui/parent-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { fetchParentChildren, getParentApiState } from "@/lib/api/parent";
import { titleCaseLabel } from "@/lib/parent/formatters";

async function loadParentChildren() {
  const state = getParentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      children: [],
    };
  }

  try {
    return {
      source: "live" as const,
      children: await fetchParentChildren(),
    };
  } catch {
    return {
      source: "error" as const,
      children: [],
    };
  }
}

export default async function ParentChildrenPage() {
  const { source, children } = await loadParentChildren();
  const primaryContacts = children.filter((child) => child.is_primary_contact).length;
  const progressVisible = children.filter((child) => child.permissions.can_view_progress).length;
  const alertsEnabled = children.filter((child) => child.permissions.can_receive_alerts).length;

  return (
    <div className="studentPage studentDashboardModern">
      <ParentPageHeader
        title="Linked Children"
        description="Review the child relationships available to this parent account, confirm visibility permissions, and jump directly into each child's academic views."
        statusLabel={
          source === "live"
            ? `${children.length} linked children`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load child links"
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
              ? "Waiting for linked-child data"
              : "Linked-child data could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the parent API base URL to load family relationships dynamically."
              : "The parent children endpoint did not return successfully for this request."
          }
          bullets={[
            "Parent children endpoint",
            "Authenticated parent role",
          ]}
          ctaHref="/parent/dashboard"
          ctaLabel="Open Dashboard"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : children.length === 0 ? (
        <StudentStatePanel
          eyebrow="Family linking"
          title="No child relationships are active yet"
          description="Once an institute links this parent profile to one or more students, the children will appear here with their current visibility permissions."
          bullets={[
            "Active relationship required",
            "Progress and alert permissions are configured per child",
            "Dashboard and alerts pages activate automatically after linking",
          ]}
          ctaHref="/parent/settings"
          ctaLabel="Open Settings"
          statusLabel="Waiting for active links"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Family Relationship Scope</span>
              <strong>Child access and visibility</strong>
              <small>{primaryContacts} primary contacts · {progressVisible} progress-enabled links</small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/parent/dashboard">
                Open Dashboard
              </Link>
              <Link className="button buttonSecondary" href="/parent/alerts">
                Review Alerts
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Linked Children</span>
              <strong>{children.length}</strong>
              <small>Active relationships in parent scope</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Primary Contacts</span>
              <strong>{primaryContacts}</strong>
              <small>Links marked as primary family contact</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Progress Access</span>
              <strong>{progressVisible}</strong>
              <small>Children with progress visibility enabled</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Alert Access</span>
              <strong>{alertsEnabled}</strong>
              <small>Children with parent alert delivery enabled</small>
            </article>
          </section>

          <section className="dashboardGrid">
            {children.map((child) => (
              <article className="dashboardHeroCard" key={child.relationship_id}>
                <div className="studentPageTight">
                  <span className="studentDashboardTag">{titleCaseLabel(child.relationship_type)}</span>
                  <h2>{child.student_name}</h2>
                  <p className="sectionDescription">
                    {child.program_name} · {child.academic_year_name}
                    {child.cohort_name ? ` · ${child.cohort_name}` : ""}
                  </p>
                  <div className="resultsSummaryGrid">
                    <article className="metricCard">
                      <span>Admission No</span>
                      <strong>{child.admission_no}</strong>
                      <small>Student identifier</small>
                    </article>
                    <article className="metricCard">
                      <span>Status</span>
                      <strong>{titleCaseLabel(child.status)}</strong>
                      <small>{child.is_primary_contact ? "Primary contact" : "Linked contact"}</small>
                    </article>
                  </div>
                  <div className="weakTopicStack">
                    <div className="weakTopicRow">
                      <div>
                        <strong>Progress visibility</strong>
                        <span>Can view academic progression and result movement</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{child.permissions.can_view_progress ? "Yes" : "No"}</strong>
                      </div>
                    </div>
                    <div className="weakTopicRow">
                      <div>
                        <strong>Results visibility</strong>
                        <span>Can view published exam outcomes</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{child.permissions.can_view_results ? "Yes" : "No"}</strong>
                      </div>
                    </div>
                    <div className="weakTopicRow">
                      <div>
                        <strong>Alerts enabled</strong>
                        <span>Can receive family notifications for this child</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{child.permissions.can_receive_alerts ? "Yes" : "No"}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="resultCardActions">
                    <Link className="button buttonPrimary" href={`/parent/progress?child_id=${child.student_id}`}>
                      View Progress
                    </Link>
                    <Link className="button buttonGhost" href={`/parent/alerts?child_id=${child.student_id}`}>
                      View Alerts
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
