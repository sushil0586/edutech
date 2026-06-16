import Link from "next/link";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { fetchPortalRecord } from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";

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

export default async function InstituteSettingsPage() {
  const profile = await requireInstituteAdminSession();
  const institute = profile.institute
    ? await fetchPortalRecord<InstituteRecord>(`/api/v1/institutes/${profile.institute}/`).catch(() => null)
    : null;
  const examDefaultCount = institute?.exam_defaults ? Object.keys(institute.exam_defaults).length : 0;

  return (
    <section className="studentPage studentPageTight studentDashboardModern">
      <InstitutePageHeader
        title="Settings"
        description="Review institute identity, exam defaults, and the control lanes that are already backed by institute data."
        statusLabel={institute ? `${institute.code} settings` : "Institute settings"}
        statusTone={institute ? "live" : "warning"}
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Policy Workspace</span>
          <strong>Review institute identity, defaults, and the next operational policy layers</strong>
          <p>
            This route is the policy and preferences layer for institute admins. It should summarize what is already
            configurable today and prepare cleanly for security, economy, and workflow controls next.
          </p>
          <small>
            Signed in as {profile.username} · {examDefaultCount} exam default fields configured
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href="/institute/academic-setup">
            Open Academic Setup
          </Link>
        </div>
      </section>

      <section className="resultsSummaryGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Institute</span>
          <strong>{institute?.name ?? "Not linked"}</strong>
          <small>{institute ? institute.code : "No institute scope available"}</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Exam defaults</span>
          <strong>{examDefaultCount}</strong>
          <small>Current institute-wide exam behavior fields</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Status</span>
          <strong>{institute?.is_active ? "Active" : institute ? "Inactive" : "Not linked"}</strong>
          <small>{institute ? `${institute.city}, ${institute.state}` : "Awaiting institute record"}</small>
        </article>
      </section>

      <section className="dashboardLowerGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Current state</span>
            <h3>Settings foundation is live</h3>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>Editable now</strong>
                  <span>Institute exam defaults are already managed through academic setup.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{examDefaultCount}</strong>
                  <span>Default fields</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Next settings layers</strong>
                  <span>Security defaults, economy defaults, and institute workflow preferences.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Next integration</strong>
                  <span>Backend-driven rollout</span>
                </div>
              </div>
            </div>
            <div className="resultCardActions">
              <Link className="button buttonPrimary" href="/institute/academic-setup">
                Manage Exam Defaults
              </Link>
              <Link className="button buttonGhost" href="/institute/dashboard">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
