import Link from "next/link";
import { EconomySeedScreen } from "@/components/admin/economy-seed-screen";
import { InstituteEconomyWorkspace } from "@/components/admin/institute-economy-workspace";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type { TeacherExamListItem } from "@/features/dashboard/types";
import { fetchPortalList } from "@/lib/api/portal";
import { fetchTeacherExamPage, getTeacherApiState } from "@/lib/api/teacher";
import { requireInstituteAdminSession } from "@/lib/auth/session";

type StudentRecord = {
  id: string;
  full_name: string;
  admission_no: string;
  is_active: boolean;
};

async function loadInstituteExams() {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      gatedExams: [] as TeacherExamListItem[],
      starLockedCount: 0,
      entitlementCount: 0,
      totalStarCost: 0,
    };
  }

  try {
    const [gatedExamsPage, starLockedPage, entitlementPage] = await Promise.all([
      fetchTeacherExamPage({ page: 1, pageSize: 8, filter: "economy_gated", sort: "recommended" }),
      fetchTeacherExamPage({ page: 1, pageSize: 1, filter: "stars_gated", sort: "recommended" }),
      fetchTeacherExamPage({ page: 1, pageSize: 1, filter: "entitlement_gated", sort: "recommended" }),
    ]);
    return {
      source: "live" as const,
      gatedExams: gatedExamsPage.results,
      starLockedCount: starLockedPage.count,
      entitlementCount: entitlementPage.count,
      totalStarCost: gatedExamsPage.summary?.total_star_cost ?? 0,
    };
  } catch {
    return {
      source: "error" as const,
      gatedExams: [] as TeacherExamListItem[],
      starLockedCount: 0,
      entitlementCount: 0,
      totalStarCost: 0,
    };
  }
}

function policyLabel(value: string | null | undefined) {
  if (!value) return "No direct policy";
  return value.replaceAll("_", " ");
}

export default async function InstituteEconomyPage() {
  const profile = await requireInstituteAdminSession();
  const instituteQuery = profile.institute
    ? `?institute=${profile.institute}&page_size=100`
    : "?page_size=100";
  const [{ source, gatedExams, starLockedCount, entitlementCount, totalStarCost }, students] =
    await Promise.all([
    loadInstituteExams(),
    fetchPortalList<StudentRecord>(`/api/v1/students/${instituteQuery}`),
    ]);

  return (
    <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid">
      <InstitutePageHeader
        title="Economy Oversight"
        description="Review how star-based access is attached to institute exams and support institute-scoped student wallets with controlled administrative actions."
        statusLabel={
          source === "live"
            ? `${gatedExams.length} exams with economy policy`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Economy visibility unavailable"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Economy operations</span>
          <strong>Keep access policy visibility and student support actions inside the same institute control plane</strong>
          <p>
            This workspace is intentionally grounded in the backend contracts that exist today. It tracks exam-level
            economy policies and provides institute-scoped wallet support actions without inventing a separate pricing
            system in the frontend. Pack, plan, referral, and unlock catalog governance still remain platform-owned.
          </p>
          <small>
            {students.length} students in scope · {starLockedCount} star-gated exams
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href="/institute/exams">
            Open Exams
          </Link>
          <Link className="button buttonSecondary" href="/institute/results">
            Open Results
          </Link>
        </div>
      </section>

      <EconomySeedScreen audience="institute" />

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for institute economy visibility"
              : "Economy visibility could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active institute admin account to inspect exam access policies and student economy state."
              : "The institute economy page is wired to live exam and admin economy endpoints, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Institute exam API access", "Economy admin endpoints"]
              : ["Backend connectivity", "Institute economy permissions"]
          }
          ctaHref="/institute/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : (
        <>
          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Exams with economy policy</span>
              <strong>{gatedExams.length}</strong>
              <small>Exams carrying an explicit access rule.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Star-gated exams</span>
              <strong>{starLockedCount}</strong>
              <small>Policies requiring stars directly or conditionally.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Entitlement-linked exams</span>
              <strong>{entitlementCount}</strong>
              <small>Policies using entitlement-based bypass or gating.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Total configured star cost</span>
              <strong>{totalStarCost}</strong>
              <small>Sum of explicit star costs across scoped exams.</small>
            </article>
          </section>

          <section className="dashboardLowerGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Policy coverage</span>
                <h3>Exam access rules currently in effect</h3>
                {gatedExams.length === 0 ? (
                  <div className="featurePlaceholder">
                    <p>No institute exams currently expose an explicit economy policy.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {gatedExams.slice(0, 8).map((exam) => (
                      <div className="weakTopicRow" key={exam.id}>
                        <div>
                          <strong>{exam.title}</strong>
                          <span>
                            {policyLabel(exam.economy_policy?.policy_type)}
                            {exam.subject_name ? ` · ${exam.subject_name}` : ""}
                          </span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>
                            {exam.economy_policy?.star_cost
                              ? `${exam.economy_policy.star_cost} stars`
                              : exam.economy_policy?.entitlement_code || "No star cost"}
                          </strong>
                          <span>{exam.code}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Current boundary</span>
                <h3>What institute admins can control here today</h3>
                <div className="weakTopicStack">
                  <div className="weakTopicRow">
                    <div>
                      <strong>Exam-level access policy visibility</strong>
                      <span>Economy policy setup flows from exam creation and exam detail configuration.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{gatedExams.length}</strong>
                      <span>Policies in scope</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Student support actions</strong>
                      <span>Wallet inspection, reward review, controlled star grants, unlock recalculation, and pending order confirmation are supported for institute-scoped learners.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{students.length}</strong>
                      <span>Students available</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Catalog governance stays centralized</strong>
                      <span>Pack, subscription, referral, and unlock-rule configuration remain platform/backend-command-led rather than institute-managed.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>Platform-owned</strong>
                      <span>Support-only here</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <InstituteEconomyWorkspace
            initialStudentId={students[0]?.id ?? null}
            students={students}
          />
        </>
      )}
    </section>
  );
}
