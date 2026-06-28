"use client";

import { useState } from "react";
import { EconomyQuestionBankPackageManagementCard } from "@/components/admin/economy-question-bank-package-management-card";
import { EconomyQuestionBankVisibilityCard } from "@/components/admin/economy-question-bank-visibility-card";
import { EconomySubscriptionPlanManagementCard } from "@/components/admin/economy-subscription-plan-management-card";

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type ProgramRecord = {
  id: string;
  institute: string;
  name: string;
  code: string;
  is_active: boolean;
};

type SubjectRecord = {
  id: string;
  institute: string;
  program?: string | null;
  name: string;
  code?: string;
  is_active: boolean;
};

type TopicRecord = {
  id: string;
  institute: string;
  subject?: string | null;
  name: string;
  code?: string;
  is_active: boolean;
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
  question_bank_package: string | null;
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
    question_bank_package_institute_name: string;
    question_bank_package_institute_code: string;
    grant_mode: string;
    is_default: boolean;
    metadata: Record<string, unknown>;
    is_active: boolean;
  }>;
};

export function EconomyQuestionBankAdminWorkspace({
  initialPackages,
  entitlements,
  featureEntitlements,
  usageEntries,
  subscriptionPlans,
  institutes,
  programs,
  subjects,
  topics,
}: {
  initialPackages: AdminQuestionBankPackage[];
  entitlements: AdminInstituteQuestionEntitlement[];
  featureEntitlements: AdminInstituteQuestionFeatureEntitlement[];
  usageEntries: AdminInstituteQuestionUsageEntry[];
  subscriptionPlans: AdminSubscriptionPlan[];
  institutes: InstituteRecord[];
  programs: ProgramRecord[];
  subjects: SubjectRecord[];
  topics: TopicRecord[];
}) {
  const [packages, setPackages] = useState(initialPackages);

  return (
    <>
      <EconomyQuestionBankPackageManagementCard
        packages={packages}
        institutes={institutes}
        programs={programs}
        subjects={subjects}
        topics={topics}
        onPackagesChange={setPackages}
      />
      <EconomyQuestionBankVisibilityCard
        packages={packages}
        entitlements={entitlements}
        featureEntitlements={featureEntitlements}
        usageEntries={usageEntries}
      />
      <EconomySubscriptionPlanManagementCard
        initialPlans={subscriptionPlans}
        institutes={institutes}
        questionBankPackages={packages}
        entitlements={entitlements}
      />
    </>
  );
}
