import { ParentPreferencesPanel } from "@/components/parent/parent-preferences-panel";
import { ParentPageHeader } from "@/components/ui/parent-page-header";
import { fetchParentChildren, fetchParentPreferences, getParentApiState } from "@/lib/api/parent";
import { requireParentSession } from "@/lib/auth/session";

export default async function ParentSettingsPage() {
  const profile = await requireParentSession();
  const apiState = getParentApiState();
  const [children, preferences] = apiState.apiConfigured
    ? await Promise.all([
        fetchParentChildren().catch(() => []),
        fetchParentPreferences().catch(() => null),
      ])
    : [[], null];
  const linkedChildrenCount = profile.parent_context?.linked_children_count ?? children.length;

  return (
    <section className="studentPage studentDashboardModern">
      <ParentPageHeader
        title="Settings"
        description="Control the notification behavior and account-level family preferences that shape the parent workspace experience."
        statusLabel={
          apiState.apiConfigured
            ? `${linkedChildrenCount} linked children`
            : "Backend not configured"
        }
        statusTone={apiState.apiConfigured ? "live" : "warning"}
      />

      <section className="studentInsightHeroCard">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Parent Profile</span>
          <strong>Keep family communication preferences consistent across every linked child</strong>
          <p>
            Parent settings live at the profile layer, while visibility and permissions stay associated
            with each child relationship. That keeps the model scalable without hardcoded exceptions.
          </p>
          <small>{profile.email || profile.username} · {linkedChildrenCount} linked children</small>
        </div>
      </section>

      <section className="resultsSummaryGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Linked Children</span>
          <strong>{linkedChildrenCount}</strong>
          <small>Children available in parent scope</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Progress Links</span>
          <strong>{children.filter((child) => child.permissions.can_view_progress).length}</strong>
          <small>Relationships with progress visibility</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Alert Links</span>
          <strong>{children.filter((child) => child.permissions.can_receive_alerts).length}</strong>
          <small>Relationships with alert delivery enabled</small>
        </article>
      </section>

      <div className="dashboardLowerGrid">
        <article className="dashboardPanel">
          <div className="studentPageTight">
            <span className="eyebrow">Profile scope</span>
            <h2>Parent access is active and relationship-driven</h2>
            <p className="academicSectionDescription">
              Signed in as <strong>{profile.display_name || profile.username}</strong>. Child-level
              visibility remains configurable per relationship, while these settings control how this
              parent profile receives alerts and summaries across the workspace.
            </p>
            <div className="featurePlaceholder">
              <p>
                This settings page is already wired to the backend parent profile. Nothing here is stored
                only in the browser, so the behavior remains stable as institute, teacher, and student
                sections continue to expand.
              </p>
            </div>
          </div>
        </article>

        <article className="dashboardPanel">
          {preferences ? (
            <ParentPreferencesPanel initialPreferences={preferences} />
          ) : (
            <div className="studentPageTight">
              <span className="eyebrow">Notification preferences</span>
              <h3>Preferences are waiting for parent backend connectivity</h3>
              <p className="academicSectionDescription">
                Configure the API base URL and ensure the parent preferences endpoint is available to save settings here.
              </p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
