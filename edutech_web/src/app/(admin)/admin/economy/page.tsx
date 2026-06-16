import Link from "next/link";
import { EconomySeedScreen } from "@/components/admin/economy-seed-screen";
import { InstituteEconomyWorkspace } from "@/components/admin/institute-economy-workspace";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { fetchPortalList } from "@/lib/api/portal";
import { fetchTeacherExams, getTeacherApiState } from "@/lib/api/teacher";
import type { TeacherExam } from "@/features/dashboard/types";

type StudentRecord = {
  id: string;
  full_name: string;
  admission_no: string;
  is_active: boolean;
};

async function loadPlatformEconomy() {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      exams: [] as TeacherExam[],
    };
  }

  try {
    return {
      source: "live" as const,
      exams: await fetchTeacherExams(),
    };
  } catch {
    return {
      source: "error" as const,
      exams: [] as TeacherExam[],
    };
  }
}

function policyLabel(value: string | null | undefined) {
  if (!value) return "No direct policy";
  return value.replaceAll("_", " ");
}

export default async function AdminEconomyPage() {
  const [{ source, exams }, students] = await Promise.all([
    loadPlatformEconomy(),
    fetchPortalList<StudentRecord>("/api/v1/students/?page_size=100"),
  ]);

  const gatedExams = exams.filter((exam) => exam.economy_policy !== null);
  const starLockedExams = gatedExams.filter((exam) =>
    ["stars_only", "stars_or_entitlement"].includes(exam.economy_policy?.policy_type ?? ""),
  );
  const entitlementExams = gatedExams.filter((exam) =>
    ["entitlement_only", "stars_or_entitlement"].includes(exam.economy_policy?.policy_type ?? ""),
  );
  const totalStarCost = starLockedExams.reduce(
    (sum, exam) => sum + (exam.economy_policy?.star_cost ?? 0),
    0,
  );

  return (
    <section className="studentPage studentPageTight studentDashboardModern">
      <PlatformAdminPageHeader
        title="Economy"
        description="Review platform-visible exam access policy coverage and use controlled admin actions for student wallet support without hardcoded pricing assumptions."
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
          <span className="studentDashboardTag">Economy Governance</span>
          <strong>Keep access policy visibility and student support actions inside one platform-admin control lane</strong>
          <p>
            This workspace stays grounded in the backend contracts that already exist today. It surfaces
            economy-policy coverage and reuses the controlled wallet-support actions already exposed through
            admin proxy routes.
          </p>
          <small>
            {students.length} students in scope · {starLockedExams.length} star-gated exams
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href="/admin/institutes">
            Open Institutes
          </Link>
          <Link className="button buttonSecondary" href="/admin/settings">
            Open Settings
          </Link>
        </div>
      </section>

      <EconomySeedScreen audience="platform" />

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for platform economy visibility"
              : "Economy visibility could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active platform-admin account to inspect economy policy coverage and student wallet state."
              : "The platform-admin economy page is wired to live exam and admin economy endpoints, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Exam API access", "Economy admin endpoints"]
              : ["Backend connectivity", "Economy route permissions"]
          }
          ctaHref="/admin"
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
              <strong>{starLockedExams.length}</strong>
              <small>Policies requiring stars directly or conditionally.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Entitlement-linked exams</span>
              <strong>{entitlementExams.length}</strong>
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
                    <p>No exams currently expose an explicit economy policy in the visible platform-admin scope.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {gatedExams.slice(0, 10).map((exam) => (
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
                <h3>What platform admin can control here today</h3>
                <div className="weakTopicStack">
                  <div className="weakTopicRow">
                    <div>
                      <strong>Exam-level access policy visibility</strong>
                      <span>Economy policy setup still flows from exam creation and exam detail configuration.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{gatedExams.length}</strong>
                      <span>Policies in scope</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Student support actions</strong>
                      <span>Wallet inspection, reward review, controlled star grants, and unlock recalculation are supported.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{students.length}</strong>
                      <span>Students available</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Future catalog governance</strong>
                      <span>Pack and subscription configuration should remain backend-led until dedicated admin endpoints are added.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>Backend-led</strong>
                      <span>No fake UI</span>
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
