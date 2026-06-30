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

type EconomyTabKey =
  | "overview"
  | "catalog"
  | "access-control"
  | "question-bank"
  | "support-ops"
  | "bootstrap";

type EconomyLaneFocus =
  | "all"
  | "policy"
  | "usage"
  | "boundary"
  | "governance"
  | "star-packs"
  | "referrals"
  | "rewards"
  | "policies"
  | "unlocks"
  | "settings"
  | "packages"
  | "visibility"
  | "plans"
  | "requests"
  | "student-support";

const ECONOMY_TAB_KEYS: EconomyTabKey[] = [
  "overview",
  "catalog",
  "access-control",
  "question-bank",
  "support-ops",
  "bootstrap",
];

function resolveEconomyTab(tab: string | undefined): EconomyTabKey {
  return ECONOMY_TAB_KEYS.includes(tab as EconomyTabKey) ? (tab as EconomyTabKey) : "overview";
}

function resolveInstituteScope(
  requestedInstituteId: string | undefined,
  institutes: InstituteRecord[],
) {
  if (!requestedInstituteId?.trim()) return "";
  return institutes.some((institute) => institute.id === requestedInstituteId) ? requestedInstituteId : "";
}

function allowedFocusesForTab(tab: EconomyTabKey): EconomyLaneFocus[] {
  switch (tab) {
    case "overview":
      return ["all", "policy", "usage", "boundary"];
    case "catalog":
      return ["all", "governance", "star-packs", "referrals", "rewards"];
    case "access-control":
      return ["all", "policies", "unlocks", "settings"];
    case "question-bank":
      return ["all", "packages", "visibility", "plans"];
    case "support-ops":
      return ["all", "requests", "student-support"];
    case "bootstrap":
      return ["all"];
    default:
      return ["all"];
  }
}

function resolveEconomyFocus(tab: EconomyTabKey, focus: string | undefined): EconomyLaneFocus {
  const allowed = allowedFocusesForTab(tab);
  return allowed.includes(focus as EconomyLaneFocus) ? (focus as EconomyLaneFocus) : "all";
}

function economyScopedHref(
  tab: EconomyTabKey,
  focus: EconomyLaneFocus,
  instituteId: string,
) {
  const query = new URLSearchParams();
  query.set("tab", tab);
  if (focus !== "all") {
    query.set("focus", focus);
  }
  if (instituteId) {
    query.set("institute", instituteId);
  }
  return `/admin/economy?${query.toString()}`;
}

function filterCatalogOverviewByInstitute(
  overview: EconomyCatalogOverview | null,
  instituteId: string,
): EconomyCatalogOverview | null {
  if (!overview || !instituteId) {
    return overview;
  }

  const scopedEntries = Object.entries(overview).map(([key, group]) => {
    const items = group.items.filter((item) => item.institute === instituteId);
    const active = items.filter((item) => item.is_active).length;
    return [
      key,
      {
        ...group,
        total: items.length,
        active,
        inactive: items.length - active,
        items,
      },
    ];
  });

  return Object.fromEntries(scopedEntries) as EconomyCatalogOverview;
}

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

function renderLaneSummaryCards(activeTab: EconomyTabKey, values: {
  gatedExams: number;
  starLockedCount: number;
  entitlementCount: number;
  totalStarCost: number;
  activeSubscriptionPlans: number;
  starPackCount: number;
  referralProgramCount: number;
  rewardRuleCount: number;
  accessPolicyCount: number;
  unlockRuleCount: number;
  auditCount: number;
  activeQuestionBankPackages: number;
  activeEntitlements: number;
  questionBankUsageEntries: number;
  pendingSubscriptionRequests: number;
  students: number;
  institutes: number;
  bootstrapGroups: number;
}) {
  const cardsByTab: Record<EconomyTabKey, Array<{ label: string; value: string | number; note: string }>> = {
    overview: [
      { label: "Policy-covered exams", value: values.gatedExams, note: "Visible economy-enabled assessments." },
      { label: "Star-gated lanes", value: values.starLockedCount, note: "Direct star-based runtime controls." },
      { label: "Configured star cost", value: values.totalStarCost, note: "Total explicit star charges in visible scope." },
    ],
    catalog: [
      { label: "Active subscription plans", value: values.activeSubscriptionPlans, note: "Recurring commercial offers currently enabled." },
      { label: "Star packs", value: values.starPackCount, note: "Wallet purchase offers visible to operators." },
      { label: "Referral + reward rules", value: `${values.referralProgramCount + values.rewardRuleCount}`, note: "Campaign and incentive logic under management." },
    ],
    "access-control": [
      { label: "Access policies", value: values.accessPolicyCount, note: "Premium access rules by content target." },
      { label: "Unlock rules", value: values.unlockRuleCount, note: "Runtime unlock logic and threshold controls." },
      { label: "Policy audit entries", value: values.auditCount, note: "Recent governance changes and support limits." },
    ],
    "question-bank": [
      { label: "Active packages", value: values.activeQuestionBankPackages, note: "Commercial question-bank packages in catalog." },
      { label: "Active entitlements", value: values.activeEntitlements, note: "Institute package access currently usable." },
      { label: "Usage entries", value: values.questionBankUsageEntries, note: "Consumption evidence across licensed content." },
    ],
    "support-ops": [
      { label: "Pending requests", value: values.pendingSubscriptionRequests, note: "Institute approvals awaiting action." },
      { label: "Students in scope", value: values.students, note: "Selectable student support profiles." },
      { label: "Institutes in scope", value: values.institutes, note: "Active operator footprint for support." },
    ],
    bootstrap: [
      { label: "Seed groups", value: values.bootstrapGroups, note: "Grouped rollout tracks documented for the platform lane." },
      { label: "Entitlement-gated exams", value: values.entitlementCount, note: "Useful when validating post-seed access effects." },
      { label: "Configured institutes", value: values.institutes, note: "Available targets for platform rollout work." },
    ],
  };

  return cardsByTab[activeTab];
}

export default async function AdminEconomyPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; focus?: string; institute?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const activeTab = resolveEconomyTab(params.tab);
  const activeFocus = resolveEconomyFocus(activeTab, params.focus);
  const requestedInstituteId = params.institute?.trim() ?? "";
  const scopedStudentQuery = requestedInstituteId
    ? `/api/v1/students/?page_size=100&institute=${requestedInstituteId}`
    : "/api/v1/students/?page_size=100";
  const scopedProgramQuery = requestedInstituteId
    ? `/api/v1/academics/programs/?page_size=200&institute=${requestedInstituteId}`
    : "/api/v1/academics/programs/?page_size=200";
  const scopedSubjectQuery = requestedInstituteId
    ? `/api/v1/academics/subjects/?page_size=200&institute=${requestedInstituteId}`
    : "/api/v1/academics/subjects/?page_size=200";
  const scopedTopicQuery = requestedInstituteId
    ? `/api/v1/academics/topics/?page_size=400&institute=${requestedInstituteId}`
    : "/api/v1/academics/topics/?page_size=400";
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
    fetchPortalList<StudentRecord>(scopedStudentQuery),
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
    fetchPortalList<ProgramRecord>(scopedProgramQuery).catch(() => []),
    fetchPortalList<SubjectRecord>(scopedSubjectQuery).catch(() => []),
    fetchPortalList<TopicRecord>(scopedTopicQuery).catch(() => []),
    fetchPortalRecord<EconomyPolicyConfig>("/api/v1/economy/admin/policy-config/").catch(() => null),
    fetchPortalList<EconomyPolicyAuditEntry>("/api/v1/economy/admin/policy-audit/").catch(() => []),
    ]);

  const selectedInstituteId = resolveInstituteScope(requestedInstituteId, institutes);
  const scopedInstitutes = selectedInstituteId
    ? institutes.filter((institute) => institute.id === selectedInstituteId)
    : institutes;
  const scopedStarPacks = selectedInstituteId
    ? starPacks.filter((item) => item.institute === selectedInstituteId)
    : starPacks;
  const scopedSubscriptionPlans = selectedInstituteId
    ? subscriptionPlans.filter((item) => item.institute === selectedInstituteId)
    : subscriptionPlans;
  const scopedReferralPrograms = selectedInstituteId
    ? referralPrograms.filter((item) => item.institute === selectedInstituteId)
    : referralPrograms;
  const scopedRewardRules = selectedInstituteId
    ? rewardRules.filter((item) => item.institute === selectedInstituteId)
    : rewardRules;
  const scopedContentAccessPolicies = selectedInstituteId
    ? contentAccessPolicies.filter((item) => item.institute === selectedInstituteId)
    : contentAccessPolicies;
  const scopedUnlockRules = selectedInstituteId
    ? unlockRules.filter((item) => item.institute === selectedInstituteId)
    : unlockRules;
  const scopedQuestionBankPackages = selectedInstituteId
    ? questionBankPackages.filter((item) => item.institute === selectedInstituteId)
    : questionBankPackages;
  const scopedQuestionBankEntitlements = selectedInstituteId
    ? questionBankEntitlements.filter((item) => item.institute === selectedInstituteId)
    : questionBankEntitlements;
  const scopedQuestionBankFeatureEntitlements = selectedInstituteId
    ? questionBankFeatureEntitlements.filter((item) => item.institute === selectedInstituteId)
    : questionBankFeatureEntitlements;
  const scopedQuestionBankUsageEntries = selectedInstituteId
    ? questionBankUsageEntries.filter((item) => item.institute === selectedInstituteId)
    : questionBankUsageEntries;
  const scopedInstituteSubscriptionRequests = selectedInstituteId
    ? instituteSubscriptionRequests.filter((item) => item.institute === selectedInstituteId)
    : instituteSubscriptionRequests;
  const scopedCatalogOverview = filterCatalogOverviewByInstitute(catalogOverview, selectedInstituteId);

  const questionBankUsageByPackageCode = scopedQuestionBankUsageEntries.reduce<Record<string, number>>((acc, entry) => {
    const code = entry.question_bank_package_code || "UNKNOWN";
    acc[code] = (acc[code] ?? 0) + (entry.quantity || 0);
    return acc;
  }, {});
  const usageByInstituteCode = scopedQuestionBankUsageEntries.reduce<Record<string, number>>((acc, entry) => {
    const code = entry.institute_code || "UNKNOWN";
    acc[code] = (acc[code] ?? 0) + (entry.quantity || 0);
    return acc;
  }, {});
  const linkedQuestionUsageCount = scopedQuestionBankUsageEntries.filter((entry) => entry.action_type === "question_linked").length;
  const entitlementOverrideCount = scopedQuestionBankUsageEntries.filter((entry) => entry.action_type === "entitlement_override").length;
  const activeQuestionBankPackages = scopedQuestionBankPackages.filter((pkg) => pkg.is_active).length;
  const activeSubscriptionPlans = scopedSubscriptionPlans.filter((plan) => plan.is_active).length;
  const pendingSubscriptionRequests = scopedInstituteSubscriptionRequests.filter((request) => request.status === "pending").length;
  const activeEntitlements = scopedQuestionBankEntitlements.filter((entry) => entry.status === "active").length;
  const laneSummaryCards = renderLaneSummaryCards(activeTab, {
    gatedExams: gatedExams.length,
    starLockedCount,
    entitlementCount,
    totalStarCost,
    activeSubscriptionPlans,
    starPackCount: scopedStarPacks.filter((pack) => pack.is_active).length,
    referralProgramCount: scopedReferralPrograms.filter((program) => program.is_active).length,
    rewardRuleCount: scopedRewardRules.filter((rule) => rule.is_active).length,
    accessPolicyCount: scopedContentAccessPolicies.filter((policy) => policy.is_active).length,
    unlockRuleCount: scopedUnlockRules.filter((rule) => rule.is_active).length,
    auditCount: economyPolicyAuditHistory.length,
    activeQuestionBankPackages,
    activeEntitlements,
    questionBankUsageEntries: scopedQuestionBankUsageEntries.length,
    pendingSubscriptionRequests,
    students: students.length,
    institutes: scopedInstitutes.length,
    bootstrapGroups: 4,
  });
  const economyTabs: Array<{
    key: EconomyTabKey;
    label: string;
    count?: number;
    description: string;
  }> = [
    {
      key: "overview",
      label: "Overview",
      count: gatedExams.length,
      description: "Command view for policy coverage, usage concentration, and current operational boundaries.",
    },
    {
      key: "catalog",
      label: "Catalog",
      count: activeSubscriptionPlans + starPacks.filter((pack) => pack.is_active).length,
      description: "Govern referral programs, reward rules, star packs, subscription plans, and commercial catalog signals.",
    },
    {
      key: "access-control",
      label: "Access Control",
      count: contentAccessPolicies.length + unlockRules.length,
      description: "Control policy settings, unlock logic, and institute-admin governance boundaries.",
    },
    {
      key: "question-bank",
      label: "Question Bank Commerce",
      count: activeQuestionBankPackages + activeEntitlements,
      description: "Operate package catalog, entitlement visibility, quota consumption, and package-linked subscription coverage.",
    },
    {
      key: "support-ops",
      label: "Support Ops",
      count: pendingSubscriptionRequests + students.length,
      description: "Handle institute subscription requests and student wallet and unlock support from one lane.",
    },
    {
      key: "bootstrap",
      label: "Bootstrap",
      description: "Run seeds, rollout helpers, and environment bootstrap actions outside the main operator path.",
    },
  ];
  const activeTabMeta = economyTabs.find((tab) => tab.key === activeTab) ?? economyTabs[0];
  const laneFocusOptions: Record<EconomyTabKey, Array<{ key: EconomyLaneFocus; label: string }>> = {
    overview: [
      { key: "all", label: "All" },
      { key: "policy", label: "Policy Coverage" },
      { key: "usage", label: "Usage" },
      { key: "boundary", label: "Boundary" },
    ],
    catalog: [
      { key: "all", label: "All" },
      { key: "governance", label: "Governance" },
      { key: "star-packs", label: "Star Packs" },
      { key: "referrals", label: "Referrals" },
      { key: "rewards", label: "Rewards" },
    ],
    "access-control": [
      { key: "all", label: "All" },
      { key: "policies", label: "Access Policies" },
      { key: "unlocks", label: "Unlock Rules" },
      { key: "settings", label: "Policy Settings" },
    ],
    "question-bank": [
      { key: "all", label: "All" },
      { key: "packages", label: "Packages" },
      { key: "visibility", label: "Visibility" },
      { key: "plans", label: "Plans" },
    ],
    "support-ops": [
      { key: "all", label: "All" },
      { key: "requests", label: "Requests" },
      { key: "student-support", label: "Student Support" },
    ],
    bootstrap: [{ key: "all", label: "All" }],
  };

  return (
    <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid adminEconomyPage">
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
            {selectedInstituteId
              ? `${scopedInstitutes[0]?.name ?? "Selected institute"} scope · ${students.length} students loaded`
              : `${students.length} students in scope · ${starLockedCount} star-gated exams`}
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

      <section className="workspaceTabsShell">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Workspace filters</span>
            <h3>Scope the page before reviewing data</h3>
            <p>
              Keep the visible dataset small by choosing one institute and one subsection at a time before scanning
              package, entitlement, or support records.
            </p>
            <form action="/admin/economy" className="economyVisibilityFilterStack" method="get">
              <input type="hidden" name="tab" value={activeTab} />
              <div className="economyVisibilityFilterRow">
                <label className="economyVisibilityFilterField">
                  <span>Institute scope</span>
                  <select aria-label="Institute scope" defaultValue={selectedInstituteId} name="institute">
                    <option value="">All institutes</option>
                    {institutes.map((institute) => (
                      <option key={institute.id} value={institute.id}>
                        {institute.name}
                      </option>
                    ))}
                  </select>
                </label>
                {laneFocusOptions[activeTab].length > 1 ? (
                  <label className="economyVisibilityFilterField">
                    <span>Subsection</span>
                    <select aria-label="Economy subsection" defaultValue={activeFocus} name="focus">
                      {laneFocusOptions[activeTab].map((focus) => (
                        <option key={focus.key} value={focus.key}>
                          {focus.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <input type="hidden" name="focus" value={activeFocus} />
                )}
              </div>
              <div className="economyVisibilityActions">
                <div className="buttonRow">
                  <button className="button buttonPrimary" type="submit">
                    Apply Filters
                  </button>
                  <Link className="button buttonSecondary" href={`/admin/economy?tab=${activeTab}`}>
                    Reset Scope
                  </Link>
                </div>
              </div>
            </form>
            <small>
              {selectedInstituteId
                ? `${scopedInstitutes[0]?.name ?? "Selected institute"} currently scoped in this lane.`
                : "All institutes are currently in scope."}
            </small>
          </div>
        </article>

        <div className="workspaceTabsList workspaceTabsListSticky workspaceTabsListPrimarySticky" role="navigation" aria-label="Economy workspace sections">
          {economyTabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Link
                key={tab.key}
                href={economyScopedHref(tab.key, "all", selectedInstituteId)}
                className={`workspaceTabButton ${isActive ? "workspaceTabButtonActive" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" ? <strong>{tab.count}</strong> : null}
              </Link>
            );
          })}
        </div>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Current workspace lane</span>
            <h3>{activeTabMeta.label}</h3>
            <p>{activeTabMeta.description}</p>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href={economyScopedHref(activeTab, activeFocus, selectedInstituteId)}>
                Reload This Lane
              </Link>
              <Link
                className="button buttonSecondary"
                href={
                  activeTab === "overview"
                    ? economyScopedHref("support-ops", "all", selectedInstituteId)
                    : activeTab === "catalog"
                      ? economyScopedHref("question-bank", "all", selectedInstituteId)
                      : activeTab === "access-control"
                        ? economyScopedHref("support-ops", "all", selectedInstituteId)
                        : activeTab === "question-bank"
                          ? economyScopedHref("catalog", "all", selectedInstituteId)
                          : activeTab === "support-ops"
                            ? economyScopedHref("overview", "all", selectedInstituteId)
                            : economyScopedHref("overview", "all", selectedInstituteId)
                }
              >
                {activeTab === "overview"
                  ? "Open Support Ops"
                  : activeTab === "catalog"
                    ? "Open Question Bank Commerce"
                    : activeTab === "access-control"
                      ? "Open Support Ops"
                      : activeTab === "question-bank"
                        ? "Open Catalog"
                        : activeTab === "support-ops"
                          ? "Open Overview"
                          : "Open Overview"}
              </Link>
            </div>
          </div>
        </article>

        <section className="resultsSummaryGrid">
          {laneSummaryCards.map((card) => (
            <article className="metricCard dashboardHeroCard" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </article>
          ))}
        </section>

        <section className="dashboardLowerGrid">
          <article className="dashboardPanel weakTopicsPanel">
            <div className="studentPageTight">
              <span className="studentDashboardTag">Operator intent</span>
              <h3>What this lane is meant to manage</h3>
              <details className="economyDisclosureCard">
                <summary>View lane guidance</summary>
                <div className="weakTopicStack economyDisclosureContent">
                  {activeTab === "overview" ? (
                    <>
                      <div className="weakTopicRow"><div><strong>Scan platform posture</strong><span>Use this lane to understand economy coverage, not to execute every operator action.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Spot abnormal concentration</strong><span>Check which institutes and packages are carrying most licensed activity.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Jump to an execution lane</strong><span>Move next to Support Ops, Catalog, or Question Bank Commerce once the issue is identified.</span></div></div>
                    </>
                  ) : null}
                  {activeTab === "catalog" ? (
                    <>
                      <div className="weakTopicRow"><div><strong>Shape the commercial offer</strong><span>Manage plans, packs, referral campaigns, and incentive logic from one lane.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Keep catalog state readable</strong><span>Pause or activate commercial lanes without hunting through support tools.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Hand off to package operations</strong><span>Move to Question Bank Commerce when plan/package linkage is the real task.</span></div></div>
                    </>
                  ) : null}
                  {activeTab === "access-control" ? (
                    <>
                      <div className="weakTopicRow"><div><strong>Define runtime guardrails</strong><span>Configure unlock logic, access policy, and support limits in one place.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Review governance changes</strong><span>Use audit visibility before making another operator-level rule change.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Support through policy, not exceptions</strong><span>This lane should reduce ad hoc manual fixes elsewhere.</span></div></div>
                    </>
                  ) : null}
                  {activeTab === "question-bank" ? (
                    <>
                      <div className="weakTopicRow"><div><strong>Operate the sellable library</strong><span>Packages, entitlement visibility, usage, and plan linkage belong here.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Check package reality before approval</strong><span>Inspect scope and quota posture before approving or applying new access.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Keep monetization explainable</strong><span>This lane should make it obvious what an institute bought and what it actually unlocked.</span></div></div>
                    </>
                  ) : null}
                  {activeTab === "support-ops" ? (
                    <>
                      <div className="weakTopicRow"><div><strong>Resolve active operator queues</strong><span>Subscription requests and student wallet issues should be handled here first.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Keep support reversible</strong><span>Work from policy and evidence, not guesswork, before granting or confirming actions.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Feed back into governance lanes</strong><span>Repeated support pain should be corrected in Access Control or Catalog, not left manual forever.</span></div></div>
                    </>
                  ) : null}
                  {activeTab === "bootstrap" ? (
                    <>
                      <div className="weakTopicRow"><div><strong>Prepare environment state</strong><span>Use this lane for setup, rollout interpretation, and seed command guidance.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Keep bootstrap out of daily ops</strong><span>Operators should not have to scroll through rollout content during normal support work.</span></div></div>
                      <div className="weakTopicRow"><div><strong>Return to overview after setup</strong><span>Once bootstrap is complete, switch back to operational lanes for real work.</span></div></div>
                    </>
                  ) : null}
                </div>
              </details>
            </div>
          </article>
        </section>
      </section>

      <>
        {activeTab === "overview" ? (
          source !== "live" ? (
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
                {(activeFocus === "all" || activeFocus === "policy") ? (
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
                ) : null}

                {(activeFocus === "all" || activeFocus === "boundary") ? (
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
                ) : null}

                {(activeFocus === "all" || activeFocus === "usage") ? (
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
                ) : null}

                {(activeFocus === "all" || activeFocus === "usage") ? (
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
                ) : null}
              </section>
            </>
          )
        ) : null}

        {activeTab === "catalog" ? (
          <>
            {activeFocus === "all" || activeFocus === "governance" ? (
            <EconomyCatalogGovernanceCard initialOverview={scopedCatalogOverview} />
            ) : null}
            {activeFocus === "all" || activeFocus === "star-packs" ? (
              <EconomyStarPackManagementCard initialStarPacks={scopedStarPacks} institutes={scopedInstitutes} />
            ) : null}
            {activeFocus === "all" || activeFocus === "referrals" ? (
              <EconomyReferralProgramManagementCard initialPrograms={scopedReferralPrograms} institutes={scopedInstitutes} />
            ) : null}
            {activeFocus === "all" || activeFocus === "rewards" ? (
              <EconomyRewardRuleManagementCard initialRules={scopedRewardRules} institutes={scopedInstitutes} subjects={subjects} />
            ) : null}
          </>
        ) : null}

        {activeTab === "access-control" ? (
          <>
            {activeFocus === "all" || activeFocus === "policies" ? (
              <EconomyContentAccessPolicyManagementCard
                initialPolicies={scopedContentAccessPolicies}
                institutes={scopedInstitutes}
                subjects={subjects}
              />
            ) : null}
            {activeFocus === "all" || activeFocus === "unlocks" ? (
              <EconomyUnlockRuleManagementCard
                initialRules={scopedUnlockRules}
                institutes={scopedInstitutes}
                subjects={subjects}
              />
            ) : null}
            {activeFocus === "all" || activeFocus === "settings" ? (
              <EconomyPolicySettingsCard
                initialAuditHistory={economyPolicyAuditHistory}
                initialConfig={economyPolicy}
              />
            ) : null}
          </>
        ) : null}

        {activeTab === "question-bank" ? (
          <>
              <EconomyQuestionBankAdminWorkspace
                initialPackages={scopedQuestionBankPackages}
                entitlements={scopedQuestionBankEntitlements}
                featureEntitlements={scopedQuestionBankFeatureEntitlements}
                usageEntries={scopedQuestionBankUsageEntries}
                subscriptionPlans={scopedSubscriptionPlans}
                institutes={scopedInstitutes}
                programs={programs}
                subjects={subjects}
                topics={topics}
                activeSection={
                  activeFocus === "packages" || activeFocus === "visibility" || activeFocus === "plans"
                    ? activeFocus
                    : "all"
                }
              />
          </>
        ) : null}

        {activeTab === "support-ops" ? (
          <>
            {activeFocus === "all" || activeFocus === "requests" ? (
              <EconomyInstituteSubscriptionRequestCard initialRequests={scopedInstituteSubscriptionRequests} />
            ) : null}
            {activeFocus === "all" || activeFocus === "student-support" ? (
              <InstituteEconomyWorkspace
                initialStudentId={students[0]?.id ?? null}
                students={students}
              />
            ) : null}
          </>
        ) : null}

        {activeTab === "bootstrap" ? <EconomySeedScreen audience="platform" /> : null}
      </>
    </section>
  );
}
