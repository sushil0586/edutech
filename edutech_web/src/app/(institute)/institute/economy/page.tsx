import Link from "next/link";
import { EconomySeedScreen } from "@/components/admin/economy-seed-screen";
import { InstituteEconomyWorkspace } from "@/components/admin/institute-economy-workspace";
import { InstituteSubscriptionRequestWorkspace } from "@/components/ui/institute-subscription-request-workspace";
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

type InstituteQuestionBankEntitlement = {
  id: string;
  institute: string;
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
  subscription_plan_name: string | null;
  subscription_plan_code: string | null;
  subscription_cycle_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  notes: string;
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
};

type InstituteQuestionBankUsageEntry = {
  id: string;
  institute: string;
  question_bank_package_name: string;
  question_bank_package_code: string;
  entitlement_status: string | null;
  action_type: string;
  master_question_text: string;
  question_text: string;
  exam_title: string;
  quantity: number;
  performed_by_label: string | null;
  effective_at: string;
  metadata: Record<string, unknown>;
};

type InstituteQuestionBankFeatureEntitlement = {
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

type RequestableSubscriptionPlan = {
  id: string;
  institute: string;
  institute_name: string;
  name: string;
  code: string;
  description: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  cycles: Array<{
    id: string;
    billing_interval: string;
    interval_count: number;
    price_amount: string;
    currency: string;
    metadata: Record<string, unknown>;
    is_active: boolean;
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

type InstituteSubscriptionRequest = {
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

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function parseDateValue(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function quotaWatchLabel(entitlement: InstituteQuestionBankEntitlement) {
  if (!entitlement.quota_configured) return "Quota not applicable";
  if (entitlement.quota_watch_state === "limit_reached") return "Quota limit reached";
  if (entitlement.quota_watch_state === "near_limit") return "Quota near limit";
  return "Quota healthy";
}

function getEntitlementLifecycleLabel(entitlement: InstituteQuestionBankEntitlement) {
  const normalizedStatus = String(entitlement.status || "").toLowerCase();
  const now = Date.now();
  const endsAt = parseDateValue(entitlement.ends_at);

  if (normalizedStatus === "revoked") {
    return "Revoked";
  }
  if (normalizedStatus === "paused") {
    return "Paused";
  }
  if (endsAt && endsAt.getTime() < now) {
    return "Expired";
  }
  if (normalizedStatus === "active" && endsAt) {
    const daysUntilExpiry = (endsAt.getTime() - now) / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry <= 14) {
      return "Active · Expiring soon";
    }
  }
  return titleCase(entitlement.status) || "Unknown";
}

function getEntitlementLifecycleHelper(entitlement: InstituteQuestionBankEntitlement) {
  const normalizedStatus = String(entitlement.status || "").toLowerCase();
  const now = Date.now();
  const startsAt = parseDateValue(entitlement.starts_at);
  const endsAt = parseDateValue(entitlement.ends_at);

  if (normalizedStatus === "revoked") {
    return "Revoked by operator. This package is no longer available for institute use.";
  }
  if (normalizedStatus === "paused") {
    return "Paused by operator. Shared-library authoring and licensed usage stay blocked until reactivated.";
  }
  if (endsAt && endsAt.getTime() < now) {
    return `Expired on ${formatDateLabel(entitlement.ends_at)}. Renew or replace the entitlement to restore access.`;
  }
  if (endsAt) {
    return `Access remains active until ${formatDateLabel(entitlement.ends_at)}.`;
  }
  if (startsAt) {
    return `Access started on ${formatDateLabel(entitlement.starts_at)}.`;
  }
  return "No lifecycle window is configured for this package entitlement yet.";
}

function isExpiringSoon(value: string | null | undefined) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  const daysUntilExpiry = (parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry >= 0 && daysUntilExpiry <= 14;
}

function uniqueLabels(values: Array<string | null | undefined>) {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const label = String(value || "").trim();
    const normalized = label.toLowerCase();
    if (!label || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    labels.push(label);
  }

  return labels;
}

function getEntitlementRenewalLabel(entitlement: InstituteQuestionBankEntitlement) {
  const lifecycle = getEntitlementLifecycleLabel(entitlement).toLowerCase();
  if (lifecycle === "revoked") {
    return "Renewal blocked until the operator reissues or replaces this package.";
  }
  if (lifecycle === "paused") {
    return "Paused packages keep their history, but authoring access stays blocked until reactivated.";
  }
  if (lifecycle === "expired") {
    return "Renewal required now. Shared-library authoring should be treated as unavailable until renewed.";
  }
  if (isExpiringSoon(entitlement.ends_at)) {
    return "Renew soon. Local authoring teams may lose this lane in the next 14 days.";
  }
  if (entitlement.subscription_plan_name) {
    return `Currently backed by ${entitlement.subscription_plan_name}${entitlement.subscription_cycle_label ? ` · ${entitlement.subscription_cycle_label}` : ""}.`;
  }
  return "No renewal posture is attached to this package yet.";
}

function getCoverageHighlights(entitlements: InstituteQuestionBankEntitlement[]) {
  return {
    programs: uniqueLabels(entitlements.flatMap((item) => item.scope_program_labels)),
    subjects: uniqueLabels(entitlements.flatMap((item) => item.scope_subject_labels)),
    topics: uniqueLabels(entitlements.flatMap((item) => item.scope_topic_labels)),
  };
}

function getPlanRelationshipRows(
  requestablePlans: RequestableSubscriptionPlan[],
  packageEntitlements: InstituteQuestionBankEntitlement[],
  subscriptionRequests: InstituteSubscriptionRequest[],
) {
  const liveStatuses = new Set(["active", "paused"]);

  return requestablePlans.map((plan) => {
    const packageCodes = uniqueLabels(plan.question_bank_package_links.map((link) => link.question_bank_package_code));
    const matchingEntitlements = packageEntitlements.filter(
      (entitlement) =>
        packageCodes.includes(entitlement.question_bank_package_code) &&
        liveStatuses.has(String(entitlement.status || "").toLowerCase()),
    );
    const pendingRequests = subscriptionRequests.filter(
      (request) =>
        request.subscription_plan_code === plan.code &&
        String(request.status || "").toLowerCase() === "pending",
    );
    const activePackageCodes = uniqueLabels(
      matchingEntitlements
        .filter((entitlement) => String(entitlement.status || "").toLowerCase() === "active")
        .map((entitlement) => entitlement.question_bank_package_code),
    );
    const pausedPackageCodes = uniqueLabels(
      matchingEntitlements
        .filter((entitlement) => String(entitlement.status || "").toLowerCase() === "paused")
        .map((entitlement) => entitlement.question_bank_package_code),
    );
    const missingPackageCodes = packageCodes.filter((code) => !activePackageCodes.includes(code));

    return {
      plan,
      packageCodes,
      activePackageCodes,
      pausedPackageCodes,
      missingPackageCodes,
      pendingRequests,
    };
  });
}

function buildUsageBreakdown(entries: InstituteQuestionBankUsageEntry[]) {
  return entries.reduce<Record<string, Record<string, number>>>((acc, entry) => {
    const packageCode = entry.question_bank_package_code || "UNKNOWN";
    const actionType = String(entry.action_type || "").trim() || "unknown";
    if (!acc[packageCode]) {
      acc[packageCode] = {};
    }
    acc[packageCode][actionType] = (acc[packageCode][actionType] ?? 0) + (entry.quantity || 0);
    return acc;
  }, {});
}

function describeUsageMix(usage: Record<string, number> | undefined) {
  if (!usage) return "No recorded usage mix yet.";
  const linked = usage.question_linked ?? 0;
  const created = usage.exam_created ?? 0;
  const published = usage.exam_published ?? 0;
  const override = usage.entitlement_override ?? 0;
  return `Usage mix: linked ${linked} · exam created ${created} · exam published ${published} · entitlement events ${override}`;
}

export default async function InstituteEconomyPage() {
  const profile = await requireInstituteAdminSession();
  const instituteQuery = profile.institute
    ? `?institute=${profile.institute}&page_size=100`
    : "?page_size=100";
  const [
    { source, gatedExams, starLockedCount, entitlementCount, totalStarCost },
    students,
    packageEntitlements,
    questionBankUsage,
    featureEntitlements,
    requestablePlans,
    subscriptionRequests,
  ] = await Promise.all([
    loadInstituteExams(),
    fetchPortalList<StudentRecord>(`/api/v1/students/${instituteQuery}`),
    fetchPortalList<InstituteQuestionBankEntitlement>(
      "/api/v1/economy/admin/institute-question-bank-entitlements/",
    ).catch(() => []),
    fetchPortalList<InstituteQuestionBankUsageEntry>(
      "/api/v1/economy/admin/institute-question-bank-usage/",
    ).catch(() => []),
    fetchPortalList<InstituteQuestionBankFeatureEntitlement>(
      "/api/v1/economy/admin/institute-question-bank-feature-entitlements/",
    ).catch(() => []),
    fetchPortalList<RequestableSubscriptionPlan>(
      "/api/v1/economy/admin/institute-requestable-subscription-plans/",
    ).catch(() => []),
    fetchPortalList<InstituteSubscriptionRequest>(
      "/api/v1/economy/admin/institute-subscription-requests/",
    ).catch(() => []),
  ]);

  const activePackageEntitlements = packageEntitlements.filter((item) => item.status === "active");
  const pausedPackageEntitlements = packageEntitlements.filter((item) => item.status === "paused");
  const revokedPackageEntitlements = packageEntitlements.filter((item) => item.status === "revoked");
  const expiredPackageEntitlements = packageEntitlements.filter(
    (item) => String(getEntitlementLifecycleLabel(item)).toLowerCase() === "expired",
  );
  const expiringSoonPackageEntitlements = packageEntitlements.filter((item) => isExpiringSoon(item.ends_at));
  const nearLimitPackageEntitlements = packageEntitlements.filter(
    (item) => item.quota_watch_state === "near_limit",
  );
  const activeFeatureEntitlements = featureEntitlements.filter((item) => item.status === "active");
  const pausedFeatureEntitlements = featureEntitlements.filter((item) => item.status === "paused");
  const packageUsageByCode = questionBankUsage.reduce<Record<string, number>>((acc, entry) => {
    const code = entry.question_bank_package_code || "UNKNOWN";
    acc[code] = (acc[code] ?? 0) + (entry.quantity || 0);
    return acc;
  }, {});
  const packageUsageBreakdown = buildUsageBreakdown(questionBankUsage);
  const linkedQuestionUsageCount = questionBankUsage.filter((entry) => entry.action_type === "question_linked").length;
  const entitlementGrantCount = questionBankUsage.filter((entry) => entry.action_type === "entitlement_override").length;
  const examCreatedUsageCount = questionBankUsage
    .filter((entry) => entry.action_type === "exam_created")
    .reduce((total, entry) => total + (entry.quantity || 0), 0);
  const examPublishedUsageCount = questionBankUsage
    .filter((entry) => entry.action_type === "exam_published")
    .reduce((total, entry) => total + (entry.quantity || 0), 0);
  const activeCoverage = getCoverageHighlights(activePackageEntitlements);
  const liveCoverage = getCoverageHighlights(
    packageEntitlements.filter((item) => item.status === "active" || item.status === "paused"),
  );
  const planRelationshipRows = getPlanRelationshipRows(requestablePlans, packageEntitlements, subscriptionRequests);

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
            system in the frontend. Pack, plan, referral, and unlock catalog governance remain platform-owned, even
            though the platform governance lanes themselves are already live.
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
            <article className="metricCard dashboardHeroCard">
              <span>Licensed packages</span>
              <strong>{activePackageEntitlements.length}</strong>
              <small>Question-bank packages currently active for this institute.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Linked shared questions</span>
              <strong>{linkedQuestionUsageCount}</strong>
              <small>Shared-library questions linked into the local bank so far.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Usage events</span>
              <strong>{questionBankUsage.length}</strong>
              <small>Auditable package-usage records currently visible to this institute.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Expiring soon</span>
              <strong>{expiringSoonPackageEntitlements.length}</strong>
              <small>Packages needing renewal attention inside the next 14 days.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Feature lanes active</span>
              <strong>{activeFeatureEntitlements.length}</strong>
              <small>Shared-library or template features currently usable by local teams.</small>
            </article>
          </section>

          <section className="dashboardLowerGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Licensed access summary</span>
                <h3>What is active, blocked, and approaching renewal</h3>
                <div className="weakTopicStack">
                  <div className="weakTopicRow">
                    <div>
                      <strong>Active packages</strong>
                      <span>These packages can currently power shared-library authoring and licensed question reuse.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{activePackageEntitlements.length}</strong>
                      <span>Live now</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Paused or revoked packages</strong>
                      <span>These lanes remain visible for audit purposes, but their licensed usage path is blocked.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{pausedPackageEntitlements.length + revokedPackageEntitlements.length}</strong>
                      <span>{pausedPackageEntitlements.length} paused · {revokedPackageEntitlements.length} revoked</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Renewal attention</strong>
                      <span>Expiring packages should be renewed before teachers depend on them for live exam creation.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{expiringSoonPackageEntitlements.length + expiredPackageEntitlements.length}</strong>
                      <span>{expiringSoonPackageEntitlements.length} soon · {expiredPackageEntitlements.length} expired</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Feature entitlements</strong>
                      <span>Feature grants control higher-level authoring capabilities beyond simple package visibility.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{activeFeatureEntitlements.length}</strong>
                      <span>{pausedFeatureEntitlements.length} paused</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Coverage snapshot</span>
                <h3>What the current licensed packages actually cover</h3>
                <div className="weakTopicStack">
                  <div className="weakTopicRow">
                    <div>
                      <strong>Programs in active coverage</strong>
                      <span>These program lanes currently have at least one active package behind them.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{activeCoverage.programs.length}</strong>
                      <span>{activeCoverage.programs.slice(0, 2).join(", ") || "No program scope"}</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Subjects in active coverage</strong>
                      <span>Use this as the quickest answer to which subjects teachers can currently source from licensed content.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{activeCoverage.subjects.length}</strong>
                      <span>{activeCoverage.subjects.slice(0, 3).join(", ") || "No subject scope"}</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Topics in active coverage</strong>
                      <span>Topic-level limits matter most when shared-library curation is sold more granularly than a full subject lane.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{activeCoverage.topics.length}</strong>
                      <span>{activeCoverage.topics.slice(0, 2).join(", ") || "No topic scope"}</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Blocked or watch-only coverage</strong>
                      <span>Paused, revoked, or expiring lanes still matter because local teams may already depend on them in authoring workflows.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{pausedPackageEntitlements.length + revokedPackageEntitlements.length + expiringSoonPackageEntitlements.length + nearLimitPackageEntitlements.length}</strong>
                      <span>{pausedPackageEntitlements.length} paused · {expiringSoonPackageEntitlements.length} expiring soon · {nearLimitPackageEntitlements.length} near limit</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

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
                      <span>Pack, subscription, referral, unlock-rule, and economy support-policy configuration remain platform-managed rather than institute-managed.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>Platform-owned</strong>
                      <span>Support-only here</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Plan relationships</span>
                <h3>Which subscription plans back which package lanes</h3>
                {planRelationshipRows.length === 0 ? (
                  <div className="featurePlaceholder">
                    <p>No requestable package-bearing subscription plans are currently visible for this institute.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {planRelationshipRows.slice(0, 8).map((row) => (
                      <div className="weakTopicRow" key={row.plan.id}>
                        <div>
                          <strong>
                            {row.plan.name} ({row.plan.code})
                          </strong>
                          <span>
                            Linked packages: {row.packageCodes.join(", ") || "No package mapping returned"}
                          </span>
                          <span>
                            {row.activePackageCodes.length > 0
                              ? `Active now: ${row.activePackageCodes.join(", ")}`
                              : "No linked package from this plan is currently active."}
                          </span>
                          {row.pausedPackageCodes.length > 0 ? (
                            <span>Paused: {row.pausedPackageCodes.join(", ")}</span>
                          ) : null}
                          {row.missingPackageCodes.length > 0 ? (
                            <span>Still blocked or not yet activated: {row.missingPackageCodes.join(", ")}</span>
                          ) : null}
                          {row.pendingRequests.length > 0 ? (
                            <span>{row.pendingRequests.length} pending request{row.pendingRequests.length === 1 ? "" : "s"} already waiting for operator review.</span>
                          ) : null}
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{row.plan.cycles.length}</strong>
                          <span>{row.pendingRequests.length} pending</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Licensed question bank access</span>
                <h3>Packages currently available to this institute</h3>
                {packageEntitlements.length === 0 ? (
                  <div className="featurePlaceholder">
                    <p>No question-bank package entitlements are currently visible for this institute.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {packageEntitlements.slice(0, 8).map((entitlement) => (
                      <div className="weakTopicRow" key={entitlement.id}>
                        <div>
                          <strong>
                            {entitlement.question_bank_package_name} ({entitlement.question_bank_package_code})
                          </strong>
                          <span>
                            Status: {getEntitlementLifecycleLabel(entitlement)} · {titleCase(entitlement.question_bank_package_type)} ·{" "}
                            {titleCase(entitlement.question_bank_package_access_mode)}
                          </span>
                          <span>{getEntitlementLifecycleHelper(entitlement)}</span>
                          <span>
                            {entitlement.scope_subject_labels.length > 0
                              ? `Subjects: ${entitlement.scope_subject_labels.join(", ")}`
                              : entitlement.scope_program_labels.length > 0
                                ? `Programs: ${entitlement.scope_program_labels.join(", ")}`
                                : "General package scope"}
                          </span>
                          {entitlement.scope_topic_labels.length > 0 ? (
                            <span>Topics: {entitlement.scope_topic_labels.slice(0, 4).join(", ")}</span>
                          ) : null}
                          {entitlement.quota_configured ? (
                            <span>
                              Quota status: {titleCase(entitlement.quota_status)} · {entitlement.quota_usage_total} linked
                              usage recorded · {quotaWatchLabel(entitlement)}
                            </span>
                          ) : null}
                          {entitlement.quota_configured && entitlement.quota_remaining_min !== null ? (
                            <span>Lowest remaining allowance across scoped limits: {entitlement.quota_remaining_min}</span>
                          ) : null}
                          {entitlement.quota_scope_summary.length > 0 ? (
                            <span>{entitlement.quota_scope_summary.slice(0, 2).join(" · ")}</span>
                          ) : null}
                          {entitlement.subscription_plan_name ? (
                            <span>
                              Plan: {entitlement.subscription_plan_name}
                              {entitlement.subscription_cycle_label
                                ? ` · ${entitlement.subscription_cycle_label}`
                                : ""}
                            </span>
                          ) : null}
                          <span>Renewal posture: {getEntitlementRenewalLabel(entitlement)}</span>
                          <span>
                            Access source: {titleCase(entitlement.granted_via)}
                            {entitlement.subscription_plan_code
                              ? ` · plan code ${entitlement.subscription_plan_code}`
                              : ""}
                          </span>
                          <span>
                            Owner: {entitlement.package_owner_institute_name} ({entitlement.package_owner_institute_code}) ·{" "}
                            {entitlement.question_bank_package_is_public_catalog ? "Catalog package" : "Private package"}
                          </span>
                          {entitlement.notes ? <span>Notes: {entitlement.notes}</span> : null}
                          {packageUsageByCode[entitlement.question_bank_package_code] ? (
                            <span>
                              Usage recorded: {packageUsageByCode[entitlement.question_bank_package_code]} action
                              {packageUsageByCode[entitlement.question_bank_package_code] === 1 ? "" : "s"}
                            </span>
                          ) : null}
                          <span>{describeUsageMix(packageUsageBreakdown[entitlement.question_bank_package_code])}</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{entitlement.scope_count} scope rows</strong>
                          <span>
                            {entitlement.starts_at
                              ? `Starts ${formatDateLabel(entitlement.starts_at)}`
                              : "Start date not set"}
                          </span>
                          <span>
                            {entitlement.ends_at
                              ? `Ends ${formatDateLabel(entitlement.ends_at)}`
                              : "No expiry set"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Feature access</span>
                <h3>Higher-level authoring capabilities currently granted</h3>
                {featureEntitlements.length === 0 ? (
                  <div className="featurePlaceholder">
                    <p>No institute-level feature entitlements are currently visible.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {featureEntitlements.slice(0, 8).map((entitlement) => (
                      <div className="weakTopicRow" key={entitlement.id}>
                        <div>
                          <strong>{titleCase(entitlement.feature_code)}</strong>
                          <span>Status: {titleCase(entitlement.status)}</span>
                          <span>
                            {entitlement.source_package_code
                              ? `Source package: ${entitlement.source_package_name} (${entitlement.source_package_code})`
                              : "No source package recorded"}
                          </span>
                          <span>
                            {entitlement.source_subscription_plan_name
                              ? `Plan: ${entitlement.source_subscription_plan_name}`
                              : "No source plan recorded"}
                          </span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{entitlement.status === "active" ? "Usable" : titleCase(entitlement.status)}</strong>
                          <span>
                            {entitlement.starts_at
                              ? `Starts ${formatDateLabel(entitlement.starts_at)}`
                              : "No start date"}
                          </span>
                          <span>
                            {entitlement.ends_at
                              ? `Ends ${formatDateLabel(entitlement.ends_at)}`
                              : "No expiry set"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Question bank usage evidence</span>
                <h3>Recent licensed-content activity in this institute</h3>
                {questionBankUsage.length === 0 ? (
                  <div className="featurePlaceholder">
                    <p>No package usage entries are visible yet for this institute.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {questionBankUsage.slice(0, 8).map((entry) => (
                      <div className="weakTopicRow" key={entry.id}>
                        <div>
                          <strong>
                            {titleCase(entry.action_type)} · {entry.question_bank_package_name}
                          </strong>
                          <span>
                            Package: {entry.question_bank_package_code}
                            {entry.entitlement_status ? ` · Entitlement ${titleCase(entry.entitlement_status)}` : ""}
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
                          <span>{formatDateLabel(entry.effective_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Operational reading</span>
                <h3>How package activity is behaving right now</h3>
                <div className="weakTopicStack">
                  <div className="weakTopicRow">
                    <div>
                      <strong>Entitlement grants recorded</strong>
                      <span>Every direct package activation leaves a visible institute usage entry for support and audit review.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{entitlementGrantCount}</strong>
                      <span>Grant events</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Shared-library linking footprint</strong>
                      <span>Linked-question usage is the clearest signal that licensed platform content is actually being consumed by local authoring teams.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{linkedQuestionUsageCount}</strong>
                      <span>Link events</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Exam build usage</strong>
                      <span>These counters show how often licensed questions progressed from local linking into draft exam creation and final publishing.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{examCreatedUsageCount}</strong>
                      <span>Draft build events</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Exam publish usage</strong>
                      <span>Published-exam usage is the clearest consumption signal for commercial package value and quota pressure.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{examPublishedUsageCount}</strong>
                      <span>Publish events</span>
                    </div>
                  </div>
                  <div className="weakTopicRow">
                    <div>
                      <strong>Package activity concentration</strong>
                      <span>Packages with repeated usage entries are the ones shaping real authoring behavior and should be watched first when quotas or renewals matter.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{Object.keys(packageUsageByCode).length}</strong>
                      <span>Active package lanes</span>
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
          <InstituteSubscriptionRequestWorkspace
            plans={requestablePlans}
            requests={subscriptionRequests}
          />
        </>
      )}
    </section>
  );
}
