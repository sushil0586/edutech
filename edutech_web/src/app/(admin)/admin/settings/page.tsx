import Link from "next/link";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { fetchPortalCount, fetchPortalList } from "@/lib/api/portal";
import { requirePlatformAdminSession } from "@/lib/auth/session";

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  is_active: boolean;
  exam_defaults: Record<string, unknown>;
};

async function loadCount(path: string) {
  try {
    return await fetchPortalCount(path);
  } catch {
    return 0;
  }
}

export default async function AdminSettingsPage() {
  const profile = await requirePlatformAdminSession();
  const institutes = await fetchPortalList<InstituteRecord>("/api/v1/institutes/?page_size=50").catch(() => []);
  const activeInstituteCount = institutes.filter((institute) => institute.is_active).length;
  const configuredExamDefaultsCount = institutes.filter(
    (institute) => Object.keys(institute.exam_defaults ?? {}).length > 0,
  ).length;
  const [studentCount, teacherCount, academicYearCount, subjectCount] = await Promise.all([
    loadCount("/api/v1/students/"),
    loadCount("/api/v1/teachers/"),
    loadCount("/api/v1/academics/academic-years/"),
    loadCount("/api/v1/academics/subjects/"),
  ]);

  return (
    <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid">
      <PlatformAdminPageHeader
        title="Settings"
        description="Review the current platform-governance scope, confirm what is already configurable, and keep the admin role aligned with truthful backend-backed controls."
        statusLabel={`${activeInstituteCount} active institutes`}
        statusTone={activeInstituteCount > 0 ? "live" : "warning"}
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Governance Workspace</span>
          <strong>Use this route to understand the current global control surface before deeper settings layers are added</strong>
          <p>
            Platform-admin settings should stay truthful. This page summarizes what is already controllable
            today through the live admin workspaces and what still remains intentionally pending.
          </p>
          <small>
            Signed in as {profile.display_name || profile.username} · {institutes.length} institutes in platform scope
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href="/admin/people">
            Open People
          </Link>
          <Link className="button buttonSecondary" href="/admin/academic-setup">
            Open Academic Setup
          </Link>
        </div>
      </section>

      <section className="resultsSummaryGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Institutes</span>
          <strong>{institutes.length}</strong>
          <small>{activeInstituteCount} active institute records</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>People in Scope</span>
          <strong>{studentCount + teacherCount}</strong>
          <small>{studentCount} students and {teacherCount} teachers</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Configured Defaults</span>
          <strong>{configuredExamDefaultsCount}</strong>
          <small>Institutes already carrying exam-default data</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Academic Backbone</span>
          <strong>{academicYearCount + subjectCount}</strong>
          <small>{academicYearCount} academic years and {subjectCount} subjects</small>
        </article>
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Configurable Today</span>
            <h3>Current live control lanes</h3>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>People and account actions</strong>
                  <span>Student and teacher provisioning, login visibility, and account-action support live in the People workspace.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Live</strong>
                  <span>/admin/people</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Academic governance</strong>
                  <span>Institute-scoped years, programs, cohorts, subjects, topics, assignments, and exam defaults are already wired.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Live</strong>
                  <span>/admin/academic-setup</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Economy support actions</strong>
                  <span>Controlled student economy inspection and grant helpers are available through current admin proxy routes.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Partial</strong>
                  <span>Route-level support</span>
                </div>
              </div>
            </div>
            <div className="resultCardActions">
              <Link className="button buttonPrimary" href="/admin/people">
                Manage People
              </Link>
              <Link className="button buttonGhost" href="/admin/academic-setup">
                Manage Academics
              </Link>
            </div>
          </div>
        </article>

        <article className="dashboardPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Backend-first layers</span>
            <h3>What still needs dedicated contracts before it becomes configurable here</h3>
            <div className="featurePlaceholder">
              <p>
                Dedicated platform settings for security, reports, audit, institute management, and broader
                economy governance should only be added when the backend contracts and operational rules are
                ready. This page should not fake persistence just to look complete.
              </p>
            </div>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>Security and audit policy</strong>
                  <span>Requires dedicated backend support and a clear platform-governance workflow.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Next integration</strong>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Reports and institute governance</strong>
                  <span>Should graduate into dedicated admin routes once the operating model is approved.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Route expansion</strong>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboardLowerGrid">
        <article className="dashboardPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Platform Scope Snapshot</span>
            <h3>Current institute footprint</h3>
            <div className="weakTopicStack">
              {institutes.length ? (
                institutes.slice(0, 5).map((institute) => (
                  <div className="weakTopicRow" key={institute.id}>
                    <div>
                      <strong>{institute.name}</strong>
                      <span>{institute.code}</span>
                      <span>
                        {institute.city}, {institute.state}, {institute.country}
                      </span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{institute.is_active ? "Active" : "Inactive"}</strong>
                      <span>
                        {Object.keys(institute.exam_defaults ?? {}).length} default fields
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="emptyText">No institute records are currently available to this platform-admin session.</p>
              )}
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
