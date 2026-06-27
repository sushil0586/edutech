import Link from "next/link";
import { EconomyCatalogGovernanceCard } from "@/components/admin/economy-catalog-governance-card";
import { EconomyContentAccessPolicyManagementCard } from "@/components/admin/economy-content-access-policy-management-card";
import { EconomyReferralProgramManagementCard } from "@/components/admin/economy-referral-program-management-card";
import { EconomyRewardRuleManagementCard } from "@/components/admin/economy-reward-rule-management-card";
import { EconomySeedScreen } from "@/components/admin/economy-seed-screen";
import { EconomyStarPackManagementCard } from "@/components/admin/economy-star-pack-management-card";
import { EconomySubscriptionPlanManagementCard } from "@/components/admin/economy-subscription-plan-management-card";
import { EconomyUnlockRuleManagementCard } from "@/components/admin/economy-unlock-rule-management-card";
import { InstituteEconomyWorkspace } from "@/components/admin/institute-economy-workspace";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type { TeacherExamListItem } from "@/features/dashboard/types";
import { fetchPortalList, fetchPortalRecord } from "@/lib/api/portal";
import { fetchTeacherExamPage, getTeacherApiState } from "@/lib/api/teacher";

type StudentRecord = {
  id: string;
  full_name: string;
  admission_no: string;
  is_active: boolean;
};

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type SubjectRecord = {
  id: string;
  institute: string;
  name: string;
  is_active: boolean;
};

type EconomyCatalogItem = {
  id: string;
  item_type: string;
  name: string;
  is_active: boolean;
  updated_at: string;
  institute: string | null;
  institute_name: string;
  code: string;
  secondary_label: string;
  metric_label: string;
};

type EconomyCatalogGroup = {
  item_type: string;
  total: number;
  active: number;
  inactive: number;
  items: EconomyCatalogItem[];
};

type EconomyCatalogOverview = {
  reward_rules: EconomyCatalogGroup;
  referral_programs: EconomyCatalogGroup;
  star_packs: EconomyCatalogGroup;
  subscription_plans: EconomyCatalogGroup;
};

type AdminStarPack = {
  id: string;
  institute: string;
  institute_name: string;
  name: string;
  code: string;
  stars_credited: number;
  price_amount: string;
  currency: string;
  sort_order: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AdminSubscriptionPlan = {
  id: string;
  institute: string;
  institute_name: string;
  name: string;
  code: string;
  description: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cycles: Array<{
    id?: string;
    billing_interval: string;
    interval_count: number;
    price_amount: string;
    currency: string;
    metadata: Record<string, unknown>;
    is_active: boolean;
    star_credit_rules: Array<{
      id?: string;
      stars_credited: number;
      credit_on_activation: boolean;
      credit_on_renewal: boolean;
      metadata: Record<string, unknown>;
      is_active: boolean;
    }>;
  }>;
};

type AdminReferralProgram = {
  id: string;
  institute: string;
  institute_name: string;
  name: string;
  referrer_stars: number;
  referee_stars: number;
  reward_side: string;
  valid_from: string | null;
  valid_until: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AdminRewardRule = {
  id: string;
  institute: string;
  institute_name: string;
  subject: string | null;
  subject_name: string | null;
  name: string;
  rule_type: string;
  stars_awarded: number;
  score_threshold_percentage: string | null;
  completion_count_threshold: number | null;
  streak_count_threshold: number | null;
  priority: number;
  valid_from: string | null;
  valid_until: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AdminContentAccessPolicy = {
  id: string;
  institute: string;
  institute_name: string;
  subject: string | null;
  subject_name: string | null;
  content_type: string;
  content_key: string;
  content_label: string;
  policy_type: string;
  star_cost: number;
  entitlement_code: string;
  priority: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AdminUnlockRule = {
  id: string;
  institute: string;
  institute_name: string;
  subject: string | null;
  subject_name: string | null;
  content_type: string;
  content_key: string;
  content_label: string;
  rule_type: string;
  required_star_balance: number | null;
  required_entitlement_code: string;
  required_completion_count: number | null;
  required_score_percentage: string | null;
  admin_override_allowed: boolean;
  priority: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function loadPlatformEconomy() {
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
      fetchTeacherExamPage({ page: 1, pageSize: 10, filter: "economy_gated", sort: "recommended" }),
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

function examSubjectDisplayLabel(
  exam: Pick<TeacherExamListItem, "subject_name" | "subject_summary">,
) {
  return exam.subject_summary?.display_label || exam.subject_name || "Unassigned subject";
}

export default async function AdminEconomyPage() {
  const [
    { source, gatedExams, starLockedCount, entitlementCount, totalStarCost },
    students,
    catalogOverview,
    starPacks,
    subscriptionPlans,
    referralPrograms,
    rewardRules,
    contentAccessPolicies,
    unlockRules,
    institutes,
    subjects,
  ] =
    await Promise.all([
    loadPlatformEconomy(),
    fetchPortalList<StudentRecord>("/api/v1/students/?page_size=100"),
    fetchPortalRecord<EconomyCatalogOverview>("/api/v1/economy/admin/catalog-overview/").catch(() => null),
    fetchPortalList<AdminStarPack>("/api/v1/economy/admin/star-packs/").catch(() => []),
    fetchPortalList<AdminSubscriptionPlan>("/api/v1/economy/admin/subscription-plans/").catch(() => []),
    fetchPortalList<AdminReferralProgram>("/api/v1/economy/admin/referral-programs/").catch(() => []),
    fetchPortalList<AdminRewardRule>("/api/v1/economy/admin/reward-rules/").catch(() => []),
    fetchPortalList<AdminContentAccessPolicy>("/api/v1/economy/admin/content-access-policies/").catch(() => []),
    fetchPortalList<AdminUnlockRule>("/api/v1/economy/admin/unlock-rules/").catch(() => []),
    fetchPortalList<InstituteRecord>("/api/v1/institutes/?page_size=100").catch(() => []),
    fetchPortalList<SubjectRecord>("/api/v1/academics/subjects/?page_size=200").catch(() => []),
    ]);

  return (
    <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid">
      <PlatformAdminPageHeader
        title="Economy"
        description="Review platform-visible economy coverage, operate student support actions, and keep catalog governance tied to platform-owned policy rather than hardcoded pricing assumptions."
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
          <strong>Economy and access overview</strong>
          <p>
            Platform admin owns cross-institute economy design, seed rollout, and catalog governance. This workspace
            also remains the highest-scope operator lane for student wallet support and settlement review.
          </p>
          <small>
            {students.length} students in scope · {starLockedCount} star-gated exams
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
      <EconomyCatalogGovernanceCard initialOverview={catalogOverview} />
      <EconomyStarPackManagementCard initialStarPacks={starPacks} institutes={institutes} />
      <EconomySubscriptionPlanManagementCard initialPlans={subscriptionPlans} institutes={institutes} />
      <EconomyReferralProgramManagementCard initialPrograms={referralPrograms} institutes={institutes} />
      <EconomyRewardRuleManagementCard initialRules={rewardRules} institutes={institutes} subjects={subjects} />
      <EconomyContentAccessPolicyManagementCard
        initialPolicies={contentAccessPolicies}
        institutes={institutes}
        subjects={subjects}
      />
      <EconomyUnlockRuleManagementCard
        initialRules={unlockRules}
        institutes={institutes}
        subjects={subjects}
      />

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
                            {` · ${examSubjectDisplayLabel(exam)}`}
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
                      <span>Wallet inspection, reward review, controlled star grants, unlock recalculation, and pending order confirmation are supported.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{students.length}</strong>
                      <span>Students available</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Catalog and policy governance</strong>
                      <span>Pack, subscription, referral, and unlock-rule governance should remain platform-owned and backend-led until dedicated governance endpoints are added.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>Platform-owned</strong>
                      <span>Command-led today</span>
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
