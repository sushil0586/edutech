import Link from "next/link";
import { EconomyCatalogGovernanceCard } from "@/components/admin/economy-catalog-governance-card";
import { EconomyContentAccessPolicyManagementCard } from "@/components/admin/economy-content-access-policy-management-card";
import { EconomyInstituteSubscriptionRequestCard } from "@/components/admin/economy-institute-subscription-request-card";
import { EconomyPolicySettingsCard } from "@/components/admin/economy-policy-settings-card";
import { EconomyQuestionBankAdminWorkspace } from "@/components/admin/economy-question-bank-admin-workspace";
import { EconomyReferralProgramManagementCard } from "@/components/admin/economy-referral-program-management-card";
import { EconomyRewardRuleManagementCard } from "@/components/admin/economy-reward-rule-management-card";
import { EconomySeedScreen } from "@/components/admin/economy-seed-screen";
import { EconomyStarPackManagementCard } from "@/components/admin/economy-star-pack-management-card";
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
  program?: string | null;
  name: string;
  is_active: boolean;
};

type ProgramRecord = {
  id: string;
  institute: string;
  name: string;
  code: string;
  is_active: boolean;
};

type TopicRecord = {
  id: string;
  institute: string;
  subject: string | null;
  name: string;
  code: string;
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

type EconomyPolicyAuditEntry = {
  id: string;
  user: number | null;
  user_label: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  message: string;
  metadata: {
    changed_fields?: Record<string, { before: unknown; after: unknown }>;
  };
  created_at: string;
};

type EconomyPolicyConfig = {
  id: string;
  singleton_key: string;
  institute_admin_can_confirm_orders: boolean;
  institute_admin_max_confirm_order_amount: string;
  institute_admin_confirm_order_currency: string;
  institute_admin_can_grant_stars: boolean;
  institute_admin_max_grant_stars: number;
  latest_audit: {
    id: string;
    action: string;
    message: string;
    user: number | null;
    user_label: string | null;
    created_at: string;
    metadata: Record<string, unknown>;
  } | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
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
  question_bank_package_links: Array<{
    id: string;
    question_bank_package: string;
    question_bank_package_name: string;
    question_bank_package_code: string;
    question_bank_package_display_name: string;
    question_bank_package_institute_name: string;
    question_bank_package_institute_code: string;
    question_bank_package_family_label: string | null;
    question_bank_package_recommended_for_labels: string[];
    question_bank_package_commercial_labels: string[];
    question_bank_package_coverage_summary: string;
    grant_mode: string;
    is_default: boolean;
    metadata: Record<string, unknown>;
    is_active: boolean;
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

type AdminQuestionBankPackage = {
  id: string;
  institute: string;
  institute_name: string;
  institute_code: string;
  name: string;
  code: string;
  description: string;
  display_name: string;
  package_type: string;
  package_family_label: string | null;
  ownership_type: string;
  access_mode: string;
  is_public_catalog: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  commercial_labels: string[];
  recommended_for_labels: string[];
  coverage_program_labels: string[];
  coverage_subject_labels: string[];
  coverage_topic_labels: string[];
  program_count: number;
  subject_count: number;
  topic_count: number;
  coverage_summary: string;
  scope_count: number;
  active_entitlement_count: number;
  linked_plan_count: number;
  default_plan_count: number;
  scopes: Array<{
    id: string;
    program: string | null;
    program_name: string | null;
    subject: string | null;
    subject_name: string | null;
    topic: string | null;
    topic_name: string | null;
    question_source_type: string;
    difficulty_level: string;
    question_type: string;
    master_visibility: string;
    max_questions_total: number | null;
    max_questions_per_topic: number | null;
    metadata: Record<string, unknown>;
    is_active: boolean;
  }>;
};

type AdminInstituteQuestionEntitlement = {
  id: string;
  institute: string;
  institute_name: string;
  institute_code: string;
  question_bank_package: string;
  question_bank_package_name: string;
  question_bank_package_code: string;
  question_bank_package_type: string;
  question_bank_package_ownership_type: string;
  question_bank_package_access_mode: string;
  question_bank_package_is_public_catalog: boolean;
  package_owner_institute_name: string;
  package_owner_institute_code: string;
  status: string;
  granted_via: string;
  subscription_plan: string | null;
  subscription_plan_name: string | null;
  subscription_plan_code: string | null;
  subscription_plan_cycle: string | null;
  subscription_cycle_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  granted_by: number | null;
  granted_by_label: string | null;
  revoked_by: number | null;
  revoked_by_label: string | null;
  scope_count: number;
  scope_program_labels: string[];
  scope_subject_labels: string[];
  scope_topic_labels: string[];
  scope_summary: string[];
  quota_configured: boolean;
  quota_status: string;
  quota_watch_state: string;
  quota_usage_total: number;
  quota_remaining_min: number | null;
  quota_scope_summary: string[];
  notes: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

type AdminInstituteQuestionFeatureEntitlement = {
  id: string;
  institute: string;
  institute_name: string;
  institute_code: string;
  feature_code: string;
  status: string;
  source_package: string | null;
  source_package_name: string | null;
  source_package_code: string | null;
  source_package_type: string | null;
  source_subscription_plan: string | null;
  source_subscription_plan_name: string | null;
  source_subscription_plan_code: string | null;
  starts_at: string | null;
  ends_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

type AdminInstituteQuestionUsageEntry = {
  id: string;
  institute: string;
  institute_name: string;
  institute_code: string;
  question_bank_package: string;
  question_bank_package_name: string;
  question_bank_package_code: string;
  entitlement: string | null;
  entitlement_status: string | null;
  action_type: string;
  master_question: string | null;
  master_question_text: string;
  question: string | null;
  question_text: string;
  exam: string | null;
  exam_title: string;
  quantity: number;
  performed_by: number | null;
  performed_by_label: string | null;
  effective_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

type AdminInstituteSubscriptionRequest = {
  id: string;
  institute: string;
  institute_name: string;
  institute_code: string;
  subscription_plan_cycle: string;
  subscription_plan_name: string;
  subscription_plan_code: string;
  subscription_cycle_label: string;
  status: string;
  requested_by: number | null;
  requested_by_label: string | null;
  reviewed_by: number | null;
  reviewed_by_label: string | null;
  reviewed_at: string | null;
  grant_modes: string[];
  notes: string;
  operator_notes: string;
  activation_summary: {
    decision: string | null;
    requested_package_count: number;
    package_codes: string[];
    package_names: string[];
    entitlement_count: number;
    entitlement_ids: string[];
  };
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
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
    questionBankPackages,
    questionBankEntitlements,
    questionBankFeatureEntitlements,
    questionBankUsageEntries,
    instituteSubscriptionRequests,
    institutes,
    programs,
    subjects,
    topics,
    economyPolicy,
    economyPolicyAuditHistory,
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
    fetchPortalList<AdminQuestionBankPackage>("/api/v1/economy/admin/question-bank-packages/").catch(() => []),
    fetchPortalList<AdminInstituteQuestionEntitlement>("/api/v1/economy/admin/question-bank-entitlements/").catch(() => []),
    fetchPortalList<AdminInstituteQuestionFeatureEntitlement>("/api/v1/economy/admin/question-bank-feature-entitlements/").catch(() => []),
    fetchPortalList<AdminInstituteQuestionUsageEntry>("/api/v1/economy/admin/question-bank-usage/").catch(() => []),
    fetchPortalList<AdminInstituteSubscriptionRequest>("/api/v1/economy/admin/institute-subscription-requests/").catch(() => []),
    fetchPortalList<InstituteRecord>("/api/v1/institutes/?page_size=100").catch(() => []),
    fetchPortalList<ProgramRecord>("/api/v1/academics/programs/?page_size=200").catch(() => []),
    fetchPortalList<SubjectRecord>("/api/v1/academics/subjects/?page_size=200").catch(() => []),
    fetchPortalList<TopicRecord>("/api/v1/academics/topics/?page_size=400").catch(() => []),
    fetchPortalRecord<EconomyPolicyConfig>("/api/v1/economy/admin/policy-config/").catch(() => null),
    fetchPortalList<EconomyPolicyAuditEntry>("/api/v1/economy/admin/policy-audit/").catch(() => []),
    ]);

  const questionBankUsageByPackageCode = questionBankUsageEntries.reduce<Record<string, number>>((acc, entry) => {
    const code = entry.question_bank_package_code || "UNKNOWN";
    acc[code] = (acc[code] ?? 0) + (entry.quantity || 0);
    return acc;
  }, {});
  const usageByInstituteCode = questionBankUsageEntries.reduce<Record<string, number>>((acc, entry) => {
    const code = entry.institute_code || "UNKNOWN";
    acc[code] = (acc[code] ?? 0) + (entry.quantity || 0);
    return acc;
  }, {});
  const linkedQuestionUsageCount = questionBankUsageEntries.filter((entry) => entry.action_type === "question_linked").length;
  const entitlementOverrideCount = questionBankUsageEntries.filter((entry) => entry.action_type === "entitlement_override").length;

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
      <EconomyQuestionBankAdminWorkspace
        initialPackages={questionBankPackages}
        entitlements={questionBankEntitlements}
        featureEntitlements={questionBankFeatureEntitlements}
        usageEntries={questionBankUsageEntries}
        subscriptionPlans={subscriptionPlans}
        institutes={institutes}
        programs={programs}
        subjects={subjects}
        topics={topics}
      />
      <EconomyStarPackManagementCard initialStarPacks={starPacks} institutes={institutes} />
      <EconomyInstituteSubscriptionRequestCard initialRequests={instituteSubscriptionRequests} />
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
      <EconomyPolicySettingsCard
        initialAuditHistory={economyPolicyAuditHistory}
        initialConfig={economyPolicy}
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
            <article className="metricCard dashboardHeroCard">
              <span>Question-bank usage events</span>
              <strong>{questionBankUsageEntries.length}</strong>
              <small>Package consumption records visible across the platform scope.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Shared links created</span>
              <strong>{linkedQuestionUsageCount}</strong>
              <small>Licensed shared-library questions linked into institute-local banks.</small>
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
                      <span>Pack, subscription, referral, unlock-rule, and institute-admin support policy controls now live here as platform-owned governance lanes.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>Platform-owned</strong>
                      <span>Live CRUD and policy config</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Question bank operations</span>
                <h3>Recent package-consumption evidence</h3>
                {questionBankUsageEntries.length === 0 ? (
                  <div className="featurePlaceholder">
                    <p>No question-bank usage entries are currently visible.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {questionBankUsageEntries.slice(0, 10).map((entry) => (
                      <div className="weakTopicRow" key={entry.id}>
                        <div>
                          <strong>
                            {entry.institute_name} · {entry.question_bank_package_name}
                          </strong>
                          <span>
                            {entry.question_bank_package_code} · {entry.action_type.replaceAll("_", " ")}
                            {entry.entitlement_status ? ` · entitlement ${entry.entitlement_status}` : ""}
                          </span>
                          <span>
                            {entry.exam_title
                              ? `Exam: ${entry.exam_title}`
                              : entry.question_text
                                ? `Question: ${entry.question_text.replace(/\s+/g, " ").trim().slice(0, 120)}`
                                : entry.master_question_text
                                  ? `Master question: ${entry.master_question_text.replace(/\s+/g, " ").trim().slice(0, 120)}`
                                  : "No linked content snapshot was recorded."}
                          </span>
                          <span>
                            {entry.performed_by_label
                              ? `Performed by ${entry.performed_by_label}`
                              : "Performed by a system or operator flow"}
                          </span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{entry.quantity}</strong>
                          <span>{entry.effective_at ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.effective_at)) : "No date"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Usage concentration</span>
                <h3>Where licensed content is actually being consumed</h3>
                <div className="weakTopicStack">
                  <div className="weakTopicRow">
                    <div>
                      <strong>Institutes with visible usage</strong>
                      <span>These are the institutes generating package-usage evidence right now.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{Object.keys(usageByInstituteCode).length}</strong>
                      <span>Institute lanes</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Packages with visible activity</strong>
                      <span>Usage is concentrated in packages that have link, entitlement, or other operational entries.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{Object.keys(questionBankUsageByPackageCode).length}</strong>
                      <span>Active packages</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Entitlement grants recorded</strong>
                      <span>Direct entitlement materialization remains visible as a usage/audit trail for support and governance review.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{entitlementOverrideCount}</strong>
                      <span>Grant events</span>
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
