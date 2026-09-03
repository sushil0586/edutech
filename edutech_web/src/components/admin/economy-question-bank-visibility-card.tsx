"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  scopes?: Array<{
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

type EntitlementVisibilityAudit = {
  expected_master_question_total: number;
  linked_master_question_total: number;
  missing_linked_master_question_total: number;
  subject_breakdown: Array<{
    subject_id: string;
    subject_code: string;
    subject_name: string;
    expected_master_question_total: number;
    linked_master_question_total: number;
    missing_linked_master_question_total: number;
    topic_count: number;
    topic_labels: string[];
  }>;
};

function prettify(value: string) {
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

function formatDateTimeLocalValue(value: string | null | undefined) {
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function parseDateValue(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEntitlementLifecycleLabel(
  entitlement: AdminInstituteQuestionEntitlement,
  nowMs: number,
) {
  const normalizedStatus = String(entitlement.status || "").toLowerCase();
  const endsAt = parseDateValue(entitlement.ends_at);

  if (normalizedStatus === "revoked") {
    return "Revoked";
  }
  if (normalizedStatus === "paused") {
    return "Paused";
  }
  if (endsAt && endsAt.getTime() < nowMs) {
    return "Expired";
  }
  if (normalizedStatus === "active" && endsAt) {
    const daysUntilExpiry = (endsAt.getTime() - nowMs) / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry <= 14) {
      return "Active · Expiring soon";
    }
  }
  return titleCase(entitlement.status) || "Unknown";
}

function getEntitlementLifecycleHelper(
  entitlement: AdminInstituteQuestionEntitlement,
  nowMs: number,
) {
  const normalizedStatus = String(entitlement.status || "").toLowerCase();
  const startsAt = parseDateValue(entitlement.starts_at);
  const endsAt = parseDateValue(entitlement.ends_at);

  if (normalizedStatus === "revoked") {
    return "Revoked by operator. Institute access has been withdrawn from this package.";
  }
  if (normalizedStatus === "paused") {
    return "Paused by operator. Shared-library usage is blocked until the entitlement is reactivated.";
  }
  if (endsAt && endsAt.getTime() < nowMs) {
    return `Expired on ${formatDateLabel(entitlement.ends_at)}. Renewal or a replacement grant is required.`;
  }
  if (endsAt) {
    return `Access remains valid until ${formatDateLabel(entitlement.ends_at)}.`;
  }
  if (startsAt) {
    return `Access started on ${formatDateLabel(entitlement.starts_at)}.`;
  }
  return "No lifecycle window is configured for this entitlement yet.";
}

function getEntitlementStateBanner(entitlement: AdminInstituteQuestionEntitlement) {
  const normalizedStatus = String(entitlement.status || "").toLowerCase();
  if (normalizedStatus === "revoked") {
    return {
      tone: "danger",
      eyebrow: "Historical row",
      title: "This row no longer grants institute access",
      summary:
        "The entitlement still appears for audit history, but runtime question-bank access is no longer controlled by this row.",
    };
  }
  if (normalizedStatus === "paused") {
    return {
      tone: "warning",
      eyebrow: "Temporarily stopped",
      title: "This row is configured but currently paused",
      summary:
        "The entitlement can be resumed without rebuilding package scope, but institutes cannot use this package until reactivated.",
    };
  }
  return {
    tone: "success",
    eyebrow: "Governing access",
    title: "This row currently controls institute package access",
    summary:
      "If the institute can see and use licensed question-bank content, this active entitlement row is part of the governing access chain.",
  };
}

function describeScope(
  scope: NonNullable<AdminQuestionBankPackage["scopes"]>[number],
) {
  return [
    scope.program_name,
    scope.subject_name,
    scope.topic_name,
  ]
    .filter(Boolean)
    .join(" -> ");
}

function ownershipTone(value: string) {
  if (value === "platform") return "success";
  if (value === "institute") return "warning";
  return "neutral";
}

function lifecycleTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("revoked") || normalized.includes("expired")) return "danger";
  if (normalized.includes("paused") || normalized.includes("expiring")) return "warning";
  return "success";
}

function quotaWatchLabel(entitlement: AdminInstituteQuestionEntitlement) {
  if (!entitlement.quota_configured) return "Quota not applicable";
  if (entitlement.quota_watch_state === "limit_reached") return "Quota limit reached";
  if (entitlement.quota_watch_state === "near_limit") return "Quota near limit";
  return "Quota healthy";
}

function buildUsageBreakdown(entries: AdminInstituteQuestionUsageEntry[]) {
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

const SHARED_LIBRARY_FEATURE_CODE = "QUESTION_BANK_SHARED_LIBRARY";

function describeEntitlementCoverage(
  entitlement: AdminInstituteQuestionEntitlement,
  pkg?: AdminQuestionBankPackage,
) {
  if (entitlement.scope_subject_labels.length > 0) {
    return `Current subject coverage: ${entitlement.scope_subject_labels.join(", ")}.`;
  }
  if (entitlement.scope_program_labels.length > 0) {
    return `Current program coverage: ${entitlement.scope_program_labels.join(", ")}.`;
  }
  if (pkg?.coverage_subject_labels?.length) {
    return `Package currently covers: ${pkg.coverage_subject_labels.join(", ")}.`;
  }
  if (pkg?.coverage_program_labels?.length) {
    return `Package currently covers: ${pkg.coverage_program_labels.join(", ")}.`;
  }
  return "Package scope is configured, but the academic coverage summary is limited.";
}

function describePackageCoverage(pkg: AdminQuestionBankPackage) {
  if (pkg.coverage_subject_labels.length > 0) {
    return `Subjects in package: ${pkg.coverage_subject_labels.join(", ")}.`;
  }
  if (pkg.coverage_program_labels.length > 0) {
    return `Programs in package: ${pkg.coverage_program_labels.join(", ")}.`;
  }
  if ((pkg.scopes ?? []).length > 0) {
    return `Package scope rows exist, but only low-detail scope labels are available right now.`;
  }
  return "No academic scope rows are configured yet.";
}

function describePackageCoverageBreakdown(pkg: AdminQuestionBankPackage) {
  const parts = [
    `${pkg.program_count} program${pkg.program_count === 1 ? "" : "s"}`,
    `${pkg.subject_count} subject${pkg.subject_count === 1 ? "" : "s"}`,
    `${pkg.topic_count} topic${pkg.topic_count === 1 ? "" : "s"}`,
  ];
  return parts.join(" · ");
}

function buildAccessChecklist(
  entitlement: AdminInstituteQuestionEntitlement,
  pkg: AdminQuestionBankPackage | undefined,
  sharedLibraryFeature: AdminInstituteQuestionFeatureEntitlement | undefined,
) {
  const entitlementStatus = String(entitlement.status || "").toLowerCase();
  const featureStatus = String(sharedLibraryFeature?.status || "").toLowerCase();
  const diagnosis = buildEntitlementDiagnosis(entitlement, pkg, sharedLibraryFeature);

  return [
    {
      label: "1. Package coverage",
      title:
        pkg && pkg.scope_count > 0
          ? pkg.coverage_subject_labels.length > 0
            ? `${pkg.coverage_subject_labels.length} subject${pkg.coverage_subject_labels.length === 1 ? "" : "s"} covered`
            : "Coverage rows configured"
          : "Coverage missing",
      state:
        pkg && pkg.scope_count > 0
          ? "ready"
          : "attention",
      detail:
        pkg && pkg.scope_count > 0
          ? describePackageCoverage(pkg)
          : "This package has no usable academic scope rows yet.",
    },
    {
      label: "2. Institute entitlement",
      title:
        entitlementStatus === "active"
          ? "Access row active"
          : entitlementStatus === "paused"
            ? "Access row paused"
            : "Access row revoked",
      state:
        entitlementStatus === "active"
          ? "ready"
          : entitlementStatus === "paused"
            ? "attention"
            : "blocked",
      detail:
        entitlementStatus === "active"
          ? "This institute currently has access through this row."
          : entitlementStatus === "paused"
            ? "This institute access row exists but is paused."
            : "This institute access row is revoked, so the package is not usable right now.",
    },
    {
      label: "3. Shared-library runtime",
      title:
        !sharedLibraryFeature
          ? "Runtime grant missing"
          : featureStatus === "active"
            ? "Runtime grant active"
            : `Runtime ${featureStatus}`,
      state:
        !sharedLibraryFeature
          ? "attention"
          : featureStatus === "active"
            ? "ready"
            : "blocked",
      detail:
        !sharedLibraryFeature
          ? "The runtime unlock is still missing."
          : featureStatus === "active"
            ? "Institute users should be able to open the licensed shared-library workflow."
            : `The runtime unlock exists but is ${featureStatus}.`,
    },
    {
      label: "4. Operator verdict",
      title: diagnosis.title,
      state:
        diagnosis.tone === "success"
          ? "ready"
          : diagnosis.tone === "danger"
            ? "blocked"
            : "attention",
      detail: diagnosis.nextStep,
    },
  ];
}

function buildEntitlementDiagnosis(
  entitlement: AdminInstituteQuestionEntitlement,
  pkg: AdminQuestionBankPackage | undefined,
  sharedLibraryFeature: AdminInstituteQuestionFeatureEntitlement | undefined,
) {
  const entitlementStatus = String(entitlement.status || "").toLowerCase();
  const featureStatus = String(sharedLibraryFeature?.status || "").toLowerCase();
  const coverageSummary = describeEntitlementCoverage(entitlement, pkg);

  if (entitlementStatus === "revoked") {
    return {
      tone: "danger",
      title: "Institute access is currently blocked",
      summary: `${coverageSummary} The institute access row was revoked, so the institute cannot use this package even if the master content already exists.`,
      nextStep: "Use Restore Governing Access to reactivate institute access, then verify the shared-library feature remains active.",
    };
  }

  if (entitlementStatus === "paused") {
    return {
      tone: "warning",
      title: "Institute access is temporarily paused",
      summary: `${coverageSummary} The package remains defined, but shared-library use is blocked until the entitlement is reactivated.`,
      nextStep: "Use Reactivate Entitlement when the institute should resume using this licensed package.",
    };
  }

  if (!sharedLibraryFeature) {
    return {
      tone: "warning",
      title: "Package access exists, but runtime unlock is missing",
      summary: `${coverageSummary} The institute has package access, but the shared-library runtime unlock has not been granted yet.`,
      nextStep: "Use Grant Shared Library so institute users can browse and link licensed questions.",
    };
  }

  if (featureStatus === "paused" || featureStatus === "revoked") {
    return {
      tone: "warning",
      title: "Shared-library runtime is not active",
      summary: `${coverageSummary} The package access row is active, but the shared-library runtime unlock is ${featureStatus}.`,
      nextStep: "Reactivate the shared-library feature row so the licensed question workflow becomes usable again.",
    };
  }

  return {
    tone: "success",
    title: "Institute access path is ready",
    summary: `${coverageSummary} Package coverage, institute access, and shared-library runtime unlock are all active for this row.`,
    nextStep: "If users still cannot find content, review whether the needed subject/topic is inside this package coverage and whether institute-side filters are narrowing the visible rows.",
  };
}

function getEntitlementPrimaryActionLabel(status: string) {
  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus === "revoked") {
    return "Restore governing access";
  }
  if (normalizedStatus === "paused") {
    return "Reactivate institute access";
  }
  return "Keep institute access active";
}

function getEntitlementVerificationHint(
  entitlement: AdminInstituteQuestionEntitlement,
  pkg: AdminQuestionBankPackage | undefined,
) {
  if (!pkg) {
    return "Verify the package row still exists before checking institute-side linked questions.";
  }
  if (entitlement.scope_subject_labels.length > 0) {
    return `After saving, verify institute-side linked questions using subject filters for ${entitlement.scope_subject_labels.join(", ")}.`;
  }
  if (pkg.coverage_subject_labels.length > 0) {
    return `After saving, verify institute-side linked questions using subject filters for ${pkg.coverage_subject_labels.join(", ")}.`;
  }
  return "After saving, verify institute-side linked questions using the exact program, subject, and topic filters expected by the package.";
}

function describeDatasetPurpose(panel: "packages" | "entitlements" | "features" | "usage") {
  if (panel === "packages") {
    return "Use Package Catalog when you first need to confirm which class, subject, and topic content is being offered before giving it to any institute or coaching center.";
  }
  if (panel === "features") {
    return "Use Shared-Library Switches when package access exists but institute users still cannot open the licensed platform-question workflow.";
  }
  if (panel === "usage") {
    return "Use Usage History when you need proof of what an institute has already linked or consumed from licensed content.";
  }
  return "Use Institute Access when you need to answer: which institute has access right now, is that access active, and what should I restore, pause, or revoke?";
}

function describeDatasetAction(panel: "packages" | "entitlements" | "features" | "usage") {
  if (panel === "packages") {
    return "Choose a package first, then review class, subject, and topic coverage before granting it.";
  }
  if (panel === "features") {
    return "Activate or restore the shared-library switch only after institute package access already exists.";
  }
  if (panel === "usage") {
    return "Compare usage with package coverage and quota to explain why institutes see the counts they do.";
  }
  return "Restore for full reactivation, Pause for a temporary stop, Revoke for full withdrawal.";
}

function getFeaturePrimaryActionLabel(status: string) {
  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus === "revoked") {
    return "Restore shared-library switch";
  }
  if (normalizedStatus === "paused") {
    return "Reactivate shared-library switch";
  }
  return "Keep shared-library switch active";
}

function describeFeatureRuntimeState(entitlement: AdminInstituteQuestionFeatureEntitlement) {
  const normalizedStatus = String(entitlement.status || "").toLowerCase();
  if (normalizedStatus === "revoked") {
    return {
      title: "This runtime switch is fully withdrawn",
      summary:
        "The institute may still have package access on paper, but users should not be able to open the licensed shared-library workflow from this row until it is restored.",
      nextStep: "Restore the shared-library switch when institute staff should regain the licensed intake workflow on the same governing row.",
    };
  }
  if (normalizedStatus === "paused") {
    return {
      title: "This runtime switch is temporarily stopped",
      summary:
        "The package assignment may still exist, but institute users should treat the shared-library intake lane as unavailable until the switch is reactivated.",
      nextStep: "Reactivate the shared-library switch when the stop was temporary and the same source package should resume powering the workflow.",
    };
  }
  return {
    title: "This runtime switch should make institute intake usable",
    summary:
      "When the matching institute access row is also active, institute users should be able to browse and link licensed platform questions through the shared-library lane.",
    nextStep: "If users still report missing content, review package coverage and institute-side subject/topic filters before changing this switch.",
  };
}

function describeInstituteRuntimeExpectation(
  entitlement: AdminInstituteQuestionEntitlement,
  pkg: AdminQuestionBankPackage | undefined,
  sharedLibraryFeature: AdminInstituteQuestionFeatureEntitlement | undefined,
) {
  const entitlementStatus = String(entitlement.status || "").toLowerCase();
  const featureStatus = String(sharedLibraryFeature?.status || "").toLowerCase();
  const subjectLabels =
    entitlement.scope_subject_labels.length > 0
      ? entitlement.scope_subject_labels
      : pkg?.coverage_subject_labels ?? [];
  const topicLabels =
    entitlement.scope_topic_labels.length > 0
      ? entitlement.scope_topic_labels
      : pkg?.coverage_topic_labels ?? [];

  if (entitlementStatus === "revoked") {
    return {
      title: "Institute should not be able to use this package now",
      summary:
        "The package row still exists for history, but this institute should not be able to browse or link licensed content from it until access is restored.",
    };
  }
  if (entitlementStatus === "paused") {
    return {
      title: "Institute access should appear stopped",
      summary:
        "Existing history may still be visible, but institute staff should not expect active licensed linking or fresh shared-library intake from this package until it is resumed.",
    };
  }
  if (!sharedLibraryFeature || featureStatus !== "active") {
    return {
      title: "Package exists, but runtime access is incomplete",
      summary:
        "Operators should expect support tickets here: the package is assigned, but institute users still cannot use the licensed shared-library workflow until the runtime feature is active.",
    };
  }

  const subjectSummary =
    subjectLabels.length > 0
      ? `Subject coverage expected now: ${subjectLabels.join(", ")}.`
      : pkg?.coverage_program_labels.length
        ? `Program coverage expected now: ${pkg.coverage_program_labels.join(", ")}.`
        : "Coverage is broad, so operators should confirm the exact program and subject filters on the institute side.";
  const topicSummary =
    topicLabels.length > 0
      ? `Topic narrowing still applies: ${topicLabels.slice(0, 6).join(", ")}.`
      : "No topic-level narrowing is visible on this row.";

  return {
    title: "Institute should be able to use this package now",
    summary: `${subjectSummary} ${topicSummary}`,
  };
}

function describeLikelyMissingContentReason(
  entitlement: AdminInstituteQuestionEntitlement,
  pkg: AdminQuestionBankPackage | undefined,
) {
  const subjectLabels =
    entitlement.scope_subject_labels.length > 0
      ? entitlement.scope_subject_labels
      : pkg?.coverage_subject_labels ?? [];
  const topicLabels =
    entitlement.scope_topic_labels.length > 0
      ? entitlement.scope_topic_labels
      : pkg?.coverage_topic_labels ?? [];

  if (subjectLabels.length === 0 && topicLabels.length === 0) {
    return "If staff say a subject is missing, first verify whether the package is intentionally broad or whether the commercial scope still needs a subject-specific row.";
  }

  if (subjectLabels.length > 0) {
    return `If staff say another subject is missing, the most likely cause is scope design: this row currently exposes ${subjectLabels.join(", ")} only. Add a separate package scope row for the missing subject instead of assuming linking is broken.`;
  }

  return `If staff say another topic is missing, check whether this row is intentionally narrowed to ${topicLabels.slice(0, 6).join(", ")}.`;
}

function buildVisibilityAuditSnapshot(
  entitlement: AdminInstituteQuestionEntitlement,
  pkg: AdminQuestionBankPackage | undefined,
  sharedLibraryFeature: AdminInstituteQuestionFeatureEntitlement | undefined,
) {
  const subjectLabels =
    entitlement.scope_subject_labels.length > 0
      ? entitlement.scope_subject_labels
      : pkg?.coverage_subject_labels ?? [];
  const topicLabels =
    entitlement.scope_topic_labels.length > 0
      ? entitlement.scope_topic_labels
      : pkg?.coverage_topic_labels ?? [];
  const programLabels =
    entitlement.scope_program_labels.length > 0
      ? entitlement.scope_program_labels
      : pkg?.coverage_program_labels ?? [];
  const featureActive = String(sharedLibraryFeature?.status || "").toLowerCase() === "active";
  const entitlementActive = String(entitlement.status || "").toLowerCase() === "active";

  return {
    instituteLabel: `${entitlement.institute_name} (${entitlement.institute_code})`,
    packageLabel: `${entitlement.question_bank_package_name} (${entitlement.question_bank_package_code})`,
    coverageLabel:
      subjectLabels.length > 0
        ? `Subjects: ${subjectLabels.join(", ")}`
        : programLabels.length > 0
          ? `Programs: ${programLabels.join(", ")}`
          : "Broad package coverage",
    topicLabel:
      topicLabels.length > 0
        ? `Topics narrowed to: ${topicLabels.slice(0, 6).join(", ")}`
        : "No topic-level narrowing on this row",
    runtimeLabel:
      entitlementActive && featureActive
        ? "Institute runtime should be usable now"
        : entitlementActive
          ? "Package assigned, but runtime still incomplete"
          : "Institute runtime should not be usable from this row",
  };
}

function describeAccessChainHealth(
  selectedPackageRecord: AdminQuestionBankPackage | null,
  filteredEntitlements: AdminInstituteQuestionEntitlement[],
  activeEntitlements: AdminInstituteQuestionEntitlement[],
  filteredFeatureEntitlements: AdminInstituteQuestionFeatureEntitlement[],
  activeFeatureEntitlements: AdminInstituteQuestionFeatureEntitlement[],
) {
  const packageReady = Boolean(selectedPackageRecord);
  const entitlementReady = activeEntitlements.length > 0;
  const featureReady = activeFeatureEntitlements.length > 0;
  const fullyReady = packageReady && entitlementReady && featureReady;
  const stalledRows =
    filteredEntitlements.length +
    filteredFeatureEntitlements.length -
    activeEntitlements.length -
    activeFeatureEntitlements.length;

  return [
    {
      label: "1. Package coverage",
      title: selectedPackageRecord
        ? `${selectedPackageRecord.display_name || selectedPackageRecord.name} is selected`
        : "Pick one package to troubleshoot",
      detail: selectedPackageRecord
        ? describePackageCoverage(selectedPackageRecord)
        : "Start with the package that should expose the missing subject or topic.",
      state: packageReady ? "ready" : "attention",
    },
    {
      label: "2. Institute entitlement",
      title: entitlementReady
        ? `${activeEntitlements.length} active entitlement${activeEntitlements.length === 1 ? "" : "s"}`
        : "No active entitlement in this filter",
      detail: entitlementReady
        ? "This package is actively assigned to at least one institute row in the current filter."
        : "If package scope looks correct but institutes still cannot access it, restore or reactivate the entitlement next.",
      state: entitlementReady ? "ready" : "blocked",
    },
    {
      label: "3. Shared-library runtime",
      title: featureReady
        ? `${activeFeatureEntitlements.length} active runtime unlock${activeFeatureEntitlements.length === 1 ? "" : "s"}`
        : "Runtime unlock still missing",
      detail: featureReady
        ? "Institute users should be able to browse and link platform questions when the matching entitlement row is also active."
        : "Package assignment alone is not enough. Shared-library runtime access must also be active.",
      state: featureReady ? "ready" : "blocked",
    },
    {
      label: "4. Operator verdict",
      title: fullyReady ? "Access chain looks complete" : "Access chain still has a gap",
      detail: fullyReady
        ? "If questions still look missing, the next check belongs on institute-side subject/topic filters or linked visibility, not package assignment."
        : stalledRows > 0
          ? `${stalledRows} filtered row${stalledRows === 1 ? "" : "s"} still need attention before this package can be trusted as fully usable.`
          : "Select a package first, then confirm entitlement state and runtime unlock.",
      state: fullyReady ? "ready" : "attention",
    },
  ] as const;
}

export function EconomyQuestionBankVisibilityCard({
  packages,
  entitlements: initialEntitlements,
  featureEntitlements: initialFeatureEntitlements,
  usageEntries,
}: {
  packages: AdminQuestionBankPackage[];
  entitlements: AdminInstituteQuestionEntitlement[];
  featureEntitlements: AdminInstituteQuestionFeatureEntitlement[];
  usageEntries: AdminInstituteQuestionUsageEntry[];
}) {
  const [currentTimeMs] = useState(() => Date.now());
  const [entitlements, setEntitlements] = useState(initialEntitlements);
  const [featureEntitlements, setFeatureEntitlements] = useState(initialFeatureEntitlements);
  const [entitlementDrafts, setEntitlementDrafts] = useState<
    Record<string, { starts_at: string; ends_at: string; notes: string }>
  >(() =>
    Object.fromEntries(
      initialEntitlements.map((entitlement) => [
        entitlement.id,
        {
          starts_at: formatDateTimeLocalValue(entitlement.starts_at),
          ends_at: formatDateTimeLocalValue(entitlement.ends_at),
          notes: entitlement.notes || "",
        },
      ]),
    ),
  );
  const [updatingEntitlementId, setUpdatingEntitlementId] = useState("");
  const [updatingFeatureEntitlementId, setUpdatingFeatureEntitlementId] = useState("");
  const [creatingFeatureEntitlementKey, setCreatingFeatureEntitlementKey] = useState("");
  const [selectedPanel, setSelectedPanel] = useState<"packages" | "entitlements" | "features" | "usage">(
    "entitlements",
  );
  const [selectedPackage, setSelectedPackage] = useState("all");
  const [selectedFamily, setSelectedFamily] = useState("all");
  const [selectedOwnership, setSelectedOwnership] = useState("all");
  const [selectedAccessMode, setSelectedAccessMode] = useState("all");
  const [selectedPackageStatus, setSelectedPackageStatus] = useState("all");
  const [selectedEntitlementStatus, setSelectedEntitlementStatus] = useState("all");
  const [selectedGrantMode, setSelectedGrantMode] = useState("all");
  const [selectedFeatureStatus, setSelectedFeatureStatus] = useState("all");
  const [selectedUsageAction, setSelectedUsageAction] = useState("all");
  const [resultLimit, setResultLimit] = useState("10");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [focusedVisibilityAuditDetail, setFocusedVisibilityAuditDetail] =
    useState<EntitlementVisibilityAudit | null>(null);
  const [focusedVisibilityAuditLoading, setFocusedVisibilityAuditLoading] = useState(false);
  const [focusedVisibilityAuditError, setFocusedVisibilityAuditError] = useState("");

  const packageOptions = packages
    .map((pkg) => ({
      id: pkg.id,
      label: `${pkg.name} (${pkg.code})`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const familyOptions = Array.from(
    new Set(packages.map((pkg) => pkg.package_family_label).filter((value): value is string => Boolean(value))),
  ).sort((left, right) => left.localeCompare(right));
  const ownershipOptions = Array.from(new Set(packages.map((pkg) => pkg.ownership_type))).sort();
  const accessModeOptions = Array.from(new Set(packages.map((pkg) => pkg.access_mode))).sort();
  const entitlementStatusOptions = Array.from(new Set(entitlements.map((entitlement) => entitlement.status))).sort();
  const grantModeOptions = Array.from(new Set(entitlements.map((entitlement) => entitlement.granted_via))).sort();
  const featureStatusOptions = Array.from(
    new Set(featureEntitlements.map((entitlement) => entitlement.status)),
  ).sort();
  const usageActionOptions = Array.from(new Set(usageEntries.map((entry) => entry.action_type))).sort();
  const resultLimitNumber = Number(resultLimit) || 10;
  const packageById = Object.fromEntries(packages.map((pkg) => [pkg.id, pkg])) as Record<
    string,
    AdminQuestionBankPackage
  >;

  const filteredEntitlements = entitlements.filter((entitlement) => {
    if (selectedPackage !== "all" && entitlement.question_bank_package !== selectedPackage) return false;
    if (selectedEntitlementStatus !== "all" && entitlement.status !== selectedEntitlementStatus) return false;
    if (selectedGrantMode !== "all" && entitlement.granted_via !== selectedGrantMode) return false;
    return true;
  });

  const filteredFeatureEntitlements = featureEntitlements.filter((entitlement) => {
    if (
      selectedPackage !== "all" &&
      entitlement.source_package &&
      entitlement.source_package !== selectedPackage
    ) {
      return false;
    }
    if (selectedPackage !== "all" && !entitlement.source_package) {
      return false;
    }
    if (selectedFeatureStatus !== "all" && entitlement.status !== selectedFeatureStatus) return false;
    return true;
  });

  const filteredUsageEntries = usageEntries.filter((entry) => {
    if (selectedPackage !== "all" && entry.question_bank_package !== selectedPackage) return false;
    if (selectedUsageAction !== "all" && entry.action_type !== selectedUsageAction) return false;
    return true;
  });

  const usageByPackageId = filteredUsageEntries.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.question_bank_package || "unscoped";
    acc[key] = (acc[key] ?? 0) + (entry.quantity || 0);
    return acc;
  }, {});

  const usageByEntitlementId = filteredUsageEntries.reduce<Record<string, number>>((acc, entry) => {
    if (!entry.entitlement) return acc;
    acc[entry.entitlement] = (acc[entry.entitlement] ?? 0) + (entry.quantity || 0);
    return acc;
  }, {});

  const sharedLibraryFeatureByInstituteId = featureEntitlements.reduce<Record<string, AdminInstituteQuestionFeatureEntitlement>>(
    (acc, entitlement) => {
      if (String(entitlement.feature_code || "").toUpperCase() !== SHARED_LIBRARY_FEATURE_CODE) {
        return acc;
      }
      acc[entitlement.institute] = entitlement;
      return acc;
    },
    {},
  );

  const activeEntitlements = filteredEntitlements.filter((entitlement) => entitlement.status === "active");
  const pausedEntitlements = filteredEntitlements.filter((entitlement) => entitlement.status === "paused");
  const revokedEntitlements = filteredEntitlements.filter((entitlement) => entitlement.status === "revoked");
  const nearLimitEntitlements = filteredEntitlements.filter(
    (entitlement) => entitlement.quota_watch_state === "near_limit",
  );
  const activeFeatureEntitlements = filteredFeatureEntitlements.filter(
    (entitlement) => entitlement.status === "active",
  );
  const linkedQuestionEvents = filteredUsageEntries.filter((entry) => entry.action_type === "question_linked");
  const usageByPackageCode = buildUsageBreakdown(filteredUsageEntries);

  const packageCards = packages
    .filter((pkg) => selectedPackage === "all" || pkg.id === selectedPackage)
    .filter((pkg) => selectedFamily === "all" || pkg.package_family_label === selectedFamily)
    .filter((pkg) => selectedOwnership === "all" || pkg.ownership_type === selectedOwnership)
    .filter((pkg) => selectedAccessMode === "all" || pkg.access_mode === selectedAccessMode)
    .filter((pkg) =>
      selectedPackageStatus === "all"
        ? true
        : selectedPackageStatus === "active"
          ? pkg.is_active
          : !pkg.is_active,
    )
    .map((pkg) => {
      const scopedEntitlements = filteredEntitlements.filter(
        (entitlement) => entitlement.question_bank_package === pkg.id,
      );
      const activeScopedEntitlements = scopedEntitlements.filter(
        (entitlement) => entitlement.status === "active",
      );

      return {
        pkg,
        scopedEntitlements,
        activeScopedEntitlements,
        usageCount: usageByPackageId[pkg.id] ?? 0,
      };
    });
  const visiblePackageCards = packageCards.slice(0, resultLimitNumber);
  const visibleEntitlements = filteredEntitlements.slice(0, resultLimitNumber);
  const visibleCurrentEntitlements = visibleEntitlements.filter((entitlement) => entitlement.status !== "revoked");
  const visibleHistoricalEntitlements = visibleEntitlements.filter((entitlement) => entitlement.status === "revoked");
  const visibleFeatureEntitlements = filteredFeatureEntitlements.slice(0, resultLimitNumber);
  const visibleUsageEntries = filteredUsageEntries.slice(0, resultLimitNumber);
  const selectedPackageRecord =
    selectedPackage !== "all" ? packages.find((pkg) => pkg.id === selectedPackage) ?? null : null;
  const focusedEntitlement =
    selectedPanel === "entitlements" && filteredEntitlements.length === 1 ? filteredEntitlements[0] : null;
  const focusedEntitlementPackage = focusedEntitlement
    ? packageById[focusedEntitlement.question_bank_package]
    : undefined;
  const focusedSharedLibraryFeature = focusedEntitlement
    ? sharedLibraryFeatureByInstituteId[focusedEntitlement.institute]
    : undefined;
  const focusedVisibilityAudit = focusedEntitlement
    ? buildVisibilityAuditSnapshot(
        focusedEntitlement,
        focusedEntitlementPackage,
        focusedSharedLibraryFeature,
      )
    : null;
  const selectedPackageLabel = selectedPackageRecord
    ? selectedPackageRecord.display_name || selectedPackageRecord.name
    : "No package selected yet";
  const operatorDiagnosisTitle = !selectedPackageRecord
    ? "Start with one package before diagnosing access"
    : selectedPanel === "packages"
      ? `Coverage review in progress for ${selectedPackageLabel}`
      : selectedPanel === "entitlements" && filteredEntitlements.length === 0
        ? `No institute access rows are visible for ${selectedPackageLabel}`
        : selectedPanel === "entitlements" && activeEntitlements.length === 0
          ? `Institute access exists for ${selectedPackageLabel}, but none of it is active`
          : selectedPanel === "features" && activeFeatureEntitlements.length === 0
            ? `Shared-library switches are the current gap for ${selectedPackageLabel}`
            : selectedPanel === "usage"
              ? `Usage history is open for ${selectedPackageLabel}`
              : `Access chain looks healthy for ${selectedPackageLabel}`;
  const operatorDiagnosisSummary = !selectedPackageRecord
    ? "Choose the package that should expose the missing subject or topic. Everything else becomes easier to explain after that."
    : selectedPanel === "packages"
      ? "Use the catalog rows to confirm what academic coverage is actually included before you talk about institute visibility."
      : selectedPanel === "entitlements" && filteredEntitlements.length === 0
        ? "The package may exist in the catalog, but no institute access row in the current filter is assigning it to a visible institute yet."
        : selectedPanel === "entitlements" && activeEntitlements.length === 0
          ? "Historical or paused institute access rows are visible, but they are not currently granting usable licensed access."
          : selectedPanel === "features" && activeFeatureEntitlements.length === 0
            ? "Package coverage and institute access can both exist while the shared-library workflow still stays blocked for institute staff."
            : selectedPanel === "usage"
              ? "Use usage history only after package coverage, institute access, and shared-library switch state already look healthy."
              : "Coverage, institute access, and shared-library switch state all look active in this filtered view. If content still feels missing, the next check belongs on institute-side filters or linking state.";
  const operatorDiagnosisNextAction = !selectedPackageRecord
    ? "Next action: pick a package, then verify coverage before looking at institute rows."
    : selectedPanel === "packages"
      ? "Next action: confirm the subject/topic coverage here, then switch to Institute Access to check who can use it."
      : selectedPanel === "entitlements" && filteredEntitlements.length === 0
        ? "Next action: create or restore an institute access row for the package and the intended institute."
        : selectedPanel === "entitlements" && activeEntitlements.length === 0
          ? "Next action: restore or reactivate the correct institute access row, then verify the shared-library switch."
          : selectedPanel === "features" && activeFeatureEntitlements.length === 0
            ? "Next action: grant or reactivate the shared-library switch after confirming the institute access row is already correct."
            : selectedPanel === "usage"
              ? "Next action: use the counts here to explain what has already been consumed, not whether access should exist."
              : "Next action: if the institute still reports missing questions, compare institute-side class/subject filters and linked-stock totals instead of editing package coverage again.";
  const accessChainHealth = describeAccessChainHealth(
    selectedPackageRecord,
    filteredEntitlements,
    activeEntitlements,
    filteredFeatureEntitlements,
    activeFeatureEntitlements,
  );

  useEffect(() => {
    if (!focusedEntitlement) {
      return;
    }
    const focusedEntitlementId = focusedEntitlement.id;

    let cancelled = false;

    async function loadFocusedVisibilityAudit() {
      setFocusedVisibilityAuditLoading(true);
      setFocusedVisibilityAuditError("");

      try {
        const response = await fetch(
          `/api/admin/economy/question-bank-entitlements/${focusedEntitlementId}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const body = (await response.json().catch(() => ({}))) as {
          detail?: string;
          visibility_audit?: EntitlementVisibilityAudit;
        };

        if (!response.ok) {
          throw new Error(
            typeof body.detail === "string"
              ? body.detail
              : `Visibility audit load failed with status ${response.status}`,
          );
        }

        if (!cancelled) {
          setFocusedVisibilityAuditDetail(body.visibility_audit ?? null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setFocusedVisibilityAuditDetail(null);
          setFocusedVisibilityAuditError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the entitlement visibility audit.",
          );
        }
      } finally {
        if (!cancelled) {
          setFocusedVisibilityAuditLoading(false);
        }
      }
    }

    void loadFocusedVisibilityAudit();
    return () => {
      cancelled = true;
    };
  }, [focusedEntitlement]);

  async function handleEntitlementStatusChange(
    entitlement: AdminInstituteQuestionEntitlement,
    status: "active" | "paused" | "revoked",
  ) {
    setUpdatingEntitlementId(entitlement.id);
    setMessage("");
    setError("");

    try {
      const draft = entitlementDrafts[entitlement.id] ?? {
        starts_at: formatDateTimeLocalValue(entitlement.starts_at),
        ends_at: formatDateTimeLocalValue(entitlement.ends_at),
        notes: entitlement.notes || "",
      };
      const response = await fetch(`/api/admin/economy/question-bank-entitlements/${entitlement.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          notes: draft.notes,
          starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
          ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminInstituteQuestionEntitlement;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Entitlement update failed with status ${response.status}`,
        );
      }

      if (body.data) {
        setEntitlements((current) =>
          current.map((row) => (row.id === body.data!.id ? body.data! : row)),
        );
        setEntitlementDrafts((current) => ({
          ...current,
          [body.data!.id]: {
            starts_at: formatDateTimeLocalValue(body.data!.starts_at),
            ends_at: formatDateTimeLocalValue(body.data!.ends_at),
            notes: body.data!.notes || "",
          },
        }));
      }
      setMessage(body.message ?? "Question bank entitlement updated successfully.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update question bank entitlement.",
      );
    } finally {
      setUpdatingEntitlementId("");
    }
  }

  function updateEntitlementDraft(
    entitlementId: string,
    field: "starts_at" | "ends_at" | "notes",
    value: string,
  ) {
    setEntitlementDrafts((current) => ({
      ...current,
      [entitlementId]: {
        starts_at: current[entitlementId]?.starts_at ?? "",
        ends_at: current[entitlementId]?.ends_at ?? "",
        notes: current[entitlementId]?.notes ?? "",
        [field]: value,
      },
    }));
  }

  function renderEntitlementRow(entitlement: AdminInstituteQuestionEntitlement) {
    const sharedLibraryFeature = sharedLibraryFeatureByInstituteId[entitlement.institute];
    const linkedPackage = packageById[entitlement.question_bank_package];
    const diagnosis = buildEntitlementDiagnosis(
      entitlement,
      linkedPackage,
      sharedLibraryFeature,
    );
    const accessChecklist = buildAccessChecklist(
      entitlement,
      linkedPackage,
      sharedLibraryFeature,
    );
    const primaryActionLabel = getEntitlementPrimaryActionLabel(entitlement.status);
    const verificationHint = getEntitlementVerificationHint(entitlement, linkedPackage);
    const stateBanner = getEntitlementStateBanner(entitlement);
    const runtimeExpectation = describeInstituteRuntimeExpectation(
      entitlement,
      linkedPackage,
      sharedLibraryFeature,
    );
    const missingContentReason = describeLikelyMissingContentReason(entitlement, linkedPackage);
    const isRevoked = String(entitlement.status || "").toLowerCase() === "revoked";
    const isPaused = String(entitlement.status || "").toLowerCase() === "paused";
    const rowModeLabel = isRevoked ? "History only" : entitlement.is_active ? "Current governing row" : "Inactive row";
    const rowModeSummary = isRevoked
      ? "This row is kept for audit and restore actions. It does not govern current institute access."
      : isPaused
        ? "This row is still the institute access record, but it is temporarily stopped until reactivated."
        : "This is the row operators should review first when confirming current institute package access.";
    const rowModeEyebrow = isRevoked ? "Audit trail" : entitlement.is_active ? "Live access source" : "Inactive access record";
    const entitlementActionRule =
      entitlement.status === "revoked"
        ? "Use Restore when the institute should get this package back without creating a new entitlement row. Restoring this row makes it the live governing access again."
        : entitlement.status === "paused"
          ? "Use Reactivate when the stop was temporary and you want the same entitlement row to resume."
          : "Use Pause for a temporary stop. Use Revoke only when institute access should be fully withdrawn.";

    return (
      <div
        className={`weakTopicRow economyEntitlementRow economyEntitlementRow${titleCase(stateBanner.tone)} ${
          isRevoked ? "economyEntitlementRowHistorical" : "economyEntitlementRowGoverning"
        }`}
        key={entitlement.id}
        data-testid={`entitlement-row-${entitlement.id}`}
      >
        <div className="economyEntitlementMain">
          <div
            className={`economyEntitlementModeBanner ${
              isRevoked ? "economyEntitlementModeBannerHistorical" : "economyEntitlementModeBannerGoverning"
            }`}
          >
            <span>{rowModeEyebrow}</span>
            <strong>{isRevoked ? "Do not treat this as live access" : "Use this row as the live access reference"}</strong>
            <em>{rowModeLabel}</em>
            <small>{rowModeSummary}</small>
          </div>
          <div className={`economyEntitlementStateBanner economyEntitlementStateBanner${titleCase(stateBanner.tone)}`}>
            <span>{stateBanner.eyebrow}</span>
            <strong>{stateBanner.title}</strong>
            <small>{stateBanner.summary}</small>
          </div>
          <strong>{entitlement.institute_name}</strong>
          <span>
            {entitlement.question_bank_package_code} · owner {entitlement.package_owner_institute_code}
          </span>
          <span>
            Status: {getEntitlementLifecycleLabel(entitlement, currentTimeMs)} · {titleCase(entitlement.question_bank_package_type)} ·{" "}
            {titleCase(entitlement.question_bank_package_access_mode)} · via {prettify(entitlement.granted_via)}
          </span>
          <span>{getEntitlementLifecycleHelper(entitlement, currentTimeMs)}</span>
          <span>
            {entitlement.subscription_plan_name
              ? `${entitlement.subscription_plan_name}${entitlement.subscription_cycle_label ? ` · ${entitlement.subscription_cycle_label}` : ""}`
              : "No linked subscription plan"}
          </span>
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
              Quota status: {titleCase(entitlement.quota_status)} · {entitlement.quota_usage_total} linked usage
              recorded · {quotaWatchLabel(entitlement)}
            </span>
          ) : null}
          {entitlement.quota_configured && entitlement.quota_remaining_min !== null ? (
            <span>Lowest remaining allowance across scoped limits: {entitlement.quota_remaining_min}</span>
          ) : null}
          {entitlement.quota_scope_summary.length > 0 ? (
            <span>{entitlement.quota_scope_summary.slice(0, 2).join(" · ")}</span>
          ) : null}
          <span>{describeUsageMix(usageByPackageCode[entitlement.question_bank_package_code])}</span>
          {entitlement.notes ? <span>Operator notes: {entitlement.notes}</span> : null}
          <div className={`builderHintPanel economyAccessHintPanel economyAccessHintPanel${titleCase(diagnosis.tone)}`}>
            <strong>{diagnosis.title}</strong>
            <p>{diagnosis.summary}</p>
            <small>{diagnosis.nextStep}</small>
          </div>
          <div className="economyAccessChecklist" data-testid={`entitlement-access-chain-${entitlement.id}`}>
            {accessChecklist.map((item) => (
              <div
                className={`economyAccessChecklistCard economyAccessChecklistCard${titleCase(item.state)}`}
                key={`${entitlement.id}-${item.label}`}
              >
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
          <div className="economyAccessChecklist">
            <div className="economyAccessChecklistCard economyAccessChecklistCardReady">
              <span>Recommended operator action</span>
              <strong>{primaryActionLabel}</strong>
              <small>{diagnosis.nextStep}</small>
            </div>
            <div className="economyAccessChecklistCard economyAccessChecklistCardAttention">
              <span>Verification path</span>
              <strong>Check institute question bank</strong>
              <small>{verificationHint}</small>
            </div>
            <div className="economyAccessChecklistCard economyAccessChecklistCardNeutral">
              <span>Status rule</span>
              <strong>What this status means</strong>
              <small>{entitlementActionRule}</small>
            </div>
            <div className="economyAccessChecklistCard economyAccessChecklistCardNeutral">
              <span>Expected institute behavior</span>
              <strong>{runtimeExpectation.title}</strong>
              <small>{runtimeExpectation.summary}</small>
            </div>
            <div className="economyAccessChecklistCard economyAccessChecklistCardAttention">
              <span>If staff still report missing content</span>
              <strong>Check scope before blaming linking</strong>
              <small>{missingContentReason}</small>
            </div>
          </div>
          <div className="economyEntitlementDraftGrid">
            <label className="setupField">
              <span>Starts at</span>
              <input
                type="datetime-local"
                value={entitlementDrafts[entitlement.id]?.starts_at ?? ""}
                onChange={(event) =>
                  updateEntitlementDraft(entitlement.id, "starts_at", event.target.value)
                }
              />
            </label>
            <label className="setupField">
              <span>Ends at</span>
              <input
                type="datetime-local"
                value={entitlementDrafts[entitlement.id]?.ends_at ?? ""}
                onChange={(event) =>
                  updateEntitlementDraft(entitlement.id, "ends_at", event.target.value)
                }
              />
            </label>
            <label className="setupField economyEntitlementNotesField">
              <span>Operator notes</span>
              <input
                type="text"
                value={entitlementDrafts[entitlement.id]?.notes ?? ""}
                onChange={(event) =>
                  updateEntitlementDraft(entitlement.id, "notes", event.target.value)
                }
                placeholder="Operator reason or renewal note"
              />
            </label>
          </div>
        </div>
        <div className={`weakTopicMeta economyEntitlementMeta ${isRevoked ? "economyEntitlementMetaHistorical" : "economyEntitlementMetaGoverning"}`}>
          <strong>{entitlement.status === "revoked" ? "Historical row" : entitlement.is_active ? "Governing row" : "Inactive row"}</strong>
          <span className={`statusTag ${isRevoked ? "statusTagDanger" : isPaused ? "statusTagWarning" : "statusTagSuccess"}`}>
            {rowModeLabel}
          </span>
          <span>{entitlement.institute_code}</span>
          <span>{entitlement.question_bank_package_name}</span>
          <span>{entitlement.scope_count} scope rows</span>
          <span>{linkedPackage ? describePackageCoverageBreakdown(linkedPackage) : "Package coverage unavailable"}</span>
          <span>{usageByEntitlementId[entitlement.id] ?? 0} usage units</span>
          {entitlement.quota_configured ? <span>{quotaWatchLabel(entitlement)}</span> : null}
          <span>
            Lifecycle window:{" "}
            {entitlement.ends_at
              ? `${formatDateLabel(entitlement.starts_at)} -> ${formatDateLabel(entitlement.ends_at)}`
              : entitlement.starts_at
                ? `Starts ${formatDateLabel(entitlement.starts_at)}`
                : "Not scheduled"}
          </span>
          <span className={`statusTag statusTag${titleCase(lifecycleTone(getEntitlementLifecycleLabel(entitlement, currentTimeMs)))}`}>
            {getEntitlementLifecycleLabel(entitlement, currentTimeMs)}
          </span>
          <span className={`statusTag statusTag${titleCase(diagnosis.tone)}`}>
            {diagnosis.title}
          </span>
          <span className={`statusTag statusTag${titleCase(stateBanner.tone)}`}>
            {stateBanner.eyebrow}
          </span>
          <div className="economyEntitlementActionStack">
            {(() => {
              const hasSharedLibraryFeature = Boolean(
                sharedLibraryFeature &&
                  String(sharedLibraryFeature.status || "").toLowerCase() === "active",
              );
              const featureOperationKey = `${entitlement.institute}:${entitlement.question_bank_package}`;
              if (hasSharedLibraryFeature) {
                return null;
              }
              return (
                <button
                  className="button buttonGhost"
                  disabled={creatingFeatureEntitlementKey === featureOperationKey}
                  onClick={() => void handleGrantSharedLibraryFeature(entitlement)}
                  type="button"
                >
                  {creatingFeatureEntitlementKey === featureOperationKey
                    ? "Granting..."
                    : "Grant Shared Library"}
                </button>
              );
            })()}
            <button
              className="button buttonGhost"
              disabled={updatingEntitlementId === entitlement.id}
              onClick={() =>
                void handleEntitlementStatusChange(
                  entitlement,
                  entitlement.status as "active" | "paused" | "revoked",
                )
              }
              type="button"
            >
              {updatingEntitlementId === entitlement.id ? "Updating..." : "Save Notes / Window"}
            </button>

            {entitlement.status === "active" ? (
              <button
                className="button buttonGhost"
                disabled={updatingEntitlementId === entitlement.id}
                onClick={() => void handleEntitlementStatusChange(entitlement, "paused")}
                type="button"
              >
                Pause Entitlement
              </button>
            ) : (
              <button
                className={`button ${entitlement.status === "revoked" ? "" : "buttonGhost"}`}
                disabled={updatingEntitlementId === entitlement.id}
                onClick={() => void handleEntitlementStatusChange(entitlement, "active")}
                type="button"
              >
                {entitlement.status === "revoked" ? "Restore Governing Access" : "Reactivate Entitlement"}
              </button>
            )}

            {entitlement.status !== "revoked" ? (
              <button
                className="button buttonDanger"
                disabled={updatingEntitlementId === entitlement.id}
                onClick={() => void handleEntitlementStatusChange(entitlement, "revoked")}
                type="button"
              >
                Revoke Entitlement
              </button>
            ) : null}
            {entitlement.status === "revoked" ? (
              <small className="economyInlineHelper">
                Restore brings this historical row back into live use. You do not need to create a second entitlement row for the same institute and package.
              </small>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  async function handleFeatureEntitlementStatusChange(
    entitlement: AdminInstituteQuestionFeatureEntitlement,
    status: "active" | "paused" | "revoked",
  ) {
    setUpdatingFeatureEntitlementId(entitlement.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/economy/question-bank-feature-entitlements/${entitlement.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminInstituteQuestionFeatureEntitlement;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Feature entitlement update failed with status ${response.status}`,
        );
      }

      if (body.data) {
        setFeatureEntitlements((current) =>
          current.map((row) => (row.id === body.data!.id ? body.data! : row)),
        );
      }
      setMessage(body.message ?? "Question bank feature entitlement updated successfully.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update question bank feature entitlement.",
      );
    } finally {
      setUpdatingFeatureEntitlementId("");
    }
  }

  async function handleGrantSharedLibraryFeature(entitlement: AdminInstituteQuestionEntitlement) {
    const operationKey = `${entitlement.institute}:${entitlement.question_bank_package}`;
    setCreatingFeatureEntitlementKey(operationKey);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/economy/question-bank-feature-entitlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute: entitlement.institute,
          feature_code: SHARED_LIBRARY_FEATURE_CODE,
          source_package: entitlement.question_bank_package,
          metadata: {
            source: "economy-question-bank-visibility-card",
            institute_code: entitlement.institute_code,
            package_code: entitlement.question_bank_package_code,
          },
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminInstituteQuestionFeatureEntitlement;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Feature entitlement grant failed with status ${response.status}`,
        );
      }

      if (body.data) {
        setFeatureEntitlements((current) => {
          const existingIndex = current.findIndex((row) => row.id === body.data!.id);
          if (existingIndex >= 0) {
            return current.map((row) => (row.id === body.data!.id ? body.data! : row));
          }
          return [body.data!, ...current];
        });
      }
      setMessage(body.message ?? "Shared-library feature granted successfully.");
    } catch (grantError) {
      setError(
        grantError instanceof Error
          ? grantError.message
          : "Unable to grant shared-library feature.",
      );
    } finally {
      setCreatingFeatureEntitlementKey("");
    }
  }

  async function downloadPackageReport() {
    setDownloadingReport(true);
    setMessage("");
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("export", "csv");
      if (selectedPackage !== "all") {
        params.set("question_bank_package", selectedPackage);
      }

      const response = await fetch(`/api/admin/economy/question-bank-package-report?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Package report export is not available on the current backend deployment yet.");
        }
        throw new Error(`Package report export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "question-bank-package-report.csv";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      setMessage("Question-bank package report downloaded.");
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the question-bank package report.",
      );
    } finally {
      setDownloadingReport(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Question-Bank Visibility</span>
        <h3>Check package coverage and institute access before changing live access</h3>
        <p className="academicSectionDescription">
          This is the operator control view for platform question access. It shows which packages exist, what academic
          coverage they carry, and which institutes currently have live, paused, or historical access.
        </p>

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

        <section className="featurePlaceholder">
          <strong>Operational summary</strong>
          <p>Review one dataset at a time and keep the visible result set intentionally small.</p>
          <div className="economyVisibilitySummaryGrid">
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Packages</span>
              <strong>{packageCards.length}</strong>
              <small>{packageCards.filter(({ pkg }) => pkg.is_active).length} active after filters</small>
            </div>
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Institute access rows</span>
              <strong>{filteredEntitlements.length}</strong>
              <small>{activeEntitlements.length} active · {pausedEntitlements.length} paused</small>
            </div>
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Shared-library switches</span>
              <strong>{filteredFeatureEntitlements.length}</strong>
              <small>{activeFeatureEntitlements.length} active runtime rows</small>
            </div>
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Usage history</span>
              <strong>{filteredUsageEntries.length}</strong>
              <small>{linkedQuestionEvents.length} shared-question link events</small>
            </div>
          </div>

          <div className="builderHintPanel">
            <strong>How platform question access works</strong>
            <p>
              First, a package decides which class, subject, and topic content can be sold. Next, an institute access
              row assigns that package to one institute. Then, the shared-library switch unlocks the actual platform
              browsing and linking workflow. If access is revoked, the institute loses use of that package even if the
              package itself still exists in the catalog.
            </p>
            <small>
              Practical rule: package = what content is included, institute access row = who can use it,
              shared-library switch = whether staff can open the intake lane, usage history = what has already been consumed.
            </small>
          </div>

          <div className="economyOperatorGuideGrid" data-testid="economy-operator-glossary">
            <article className="economyOperatorGuideCard">
              <span>Package</span>
              <strong>Defines what content is being offered</strong>
              <small>
                Package scope answers the commercial question: which class, subject, and topic content is inside this offer.
              </small>
            </article>
            <article className="economyOperatorGuideCard">
              <span>Institute access row</span>
              <strong>Decides who currently has the right to use it</strong>
              <small>
                This is the governing institute assignment. If it is revoked or paused, the package is not usable for that institute.
              </small>
            </article>
            <article className="economyOperatorGuideCard">
              <span>Shared-library switch</span>
              <strong>Decides whether institute staff can open the licensed intake lane</strong>
              <small>
                Package access alone is not enough. The shared-library runtime switch must also be active for platform-question intake.
              </small>
            </article>
            <article className="economyOperatorGuideCard">
              <span>Linked or visible questions</span>
              <strong>Shows what the institute can actually work with right now</strong>
              <small>
                Linked counts depend on onboarding, auto-linking, or manual linking. They are evidence of usable inventory, not the same thing as package coverage.
              </small>
            </article>
          </div>

          <div className="economyAccessChecklist" data-testid="economy-access-chain-health">
            {accessChainHealth.map((item) => (
              <div
                className={`economyAccessChecklistCard economyAccessChecklistCard${titleCase(item.state)}`}
                key={item.label}
              >
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>

          <div
            className="builderHintPanel"
            data-testid="economy-operator-diagnosis"
            style={{ marginTop: 16 }}
          >
            <strong>{operatorDiagnosisTitle}</strong>
            <p>{operatorDiagnosisSummary}</p>
            <small>{operatorDiagnosisNextAction}</small>
          </div>

          {selectedPackageRecord ? (
            <div className="economyAccessChecklist" style={{ marginTop: 16 }}>
              <div className="economyAccessChecklistCard economyAccessChecklistCardReady">
                <span>Selected package</span>
                <strong>{selectedPackageRecord.display_name || selectedPackageRecord.name}</strong>
                <small>{describePackageCoverage(selectedPackageRecord)}</small>
              </div>
              <div className="economyAccessChecklistCard economyAccessChecklistCardNeutral">
                <span>Coverage summary</span>
                <strong>{describePackageCoverageBreakdown(selectedPackageRecord)}</strong>
                <small>
                  {selectedPackageRecord.scope_count} coverage row{selectedPackageRecord.scope_count === 1 ? "" : "s"} ·{" "}
                  {selectedPackageRecord.active_entitlement_count} active institute access row
                  {selectedPackageRecord.active_entitlement_count === 1 ? "" : "s"}
                </small>
              </div>
              <div className="economyAccessChecklistCard economyAccessChecklistCardAttention">
                <span>Operator reminder</span>
                <strong>Package coverage is only the promise</strong>
                <small>
                  Institutes still need an active access row and an active shared-library switch before staff can actually use licensed content from this package.
                </small>
              </div>
            </div>
          ) : null}

          <div className="economyOperatorGuideGrid">
            <article className="economyOperatorGuideCard">
              <span>What to review first</span>
              <strong>
                {selectedPanel === "entitlements"
                  ? "Institute access state"
                  : selectedPanel === "features"
                    ? "Shared-library switch state"
                    : selectedPanel === "usage"
                      ? "Usage history"
                      : "Package catalog"}
              </strong>
              <small>{describeDatasetPurpose(selectedPanel)}</small>
            </article>
            <article className="economyOperatorGuideCard">
              <span>Recommended action</span>
              <strong>
                {selectedPanel === "entitlements"
                  ? "Restore, pause, or revoke carefully"
                  : selectedPanel === "packages"
                    ? "Check coverage before granting"
                    : selectedPanel === "features"
                      ? "Repair shared-library switches"
                      : "Verify what was actually consumed"}
              </strong>
              <small>{describeDatasetAction(selectedPanel)}</small>
            </article>
            <article className="economyOperatorGuideCard">
              <span>Common confusion</span>
              <strong>Package coverage is not the same as linked questions</strong>
              <small>
                A package can cover Science or Math, but institute-side linked counts only grow after shared-library linking or auto-link onboarding has happened.
              </small>
            </article>
            <article className="economyOperatorGuideCard">
              <span>Best troubleshooting order</span>
              <strong>Coverage first, then institute access, then shared-library switch</strong>
              <small>
                When staff report missing questions, do not start with linked counts. First verify package coverage, then institute access state, then the shared-library switch.
              </small>
            </article>
          </div>

          <div className="economyVisibilityFilterStack">
            <div className="economyVisibilityFilterRow">
              <label className="setupField economyVisibilityFilterField">
                <span>Show dataset</span>
                <select value={selectedPanel} onChange={(event) => setSelectedPanel(event.target.value as typeof selectedPanel)}>
                  <option value="entitlements">Institute Access</option>
                  <option value="packages">Package Catalog</option>
                  <option value="features">Shared-Library Switches</option>
                  <option value="usage">Usage History</option>
                </select>
              </label>
              <label className="setupField economyVisibilityFilterField">
                <span>Package</span>
                <select value={selectedPackage} onChange={(event) => setSelectedPackage(event.target.value)}>
                  <option value="all">All packages</option>
                  {packageOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="setupField economyVisibilityFilterField">
                <span>Rows to show</span>
                <select value={resultLimit} onChange={(event) => setResultLimit(event.target.value)}>
                  <option value="10">10 rows</option>
                  <option value="25">25 rows</option>
                  <option value="50">50 rows</option>
                </select>
              </label>
            </div>

            {selectedPanel === "packages" ? (
              <div className="economyVisibilityFilterRow">
                <label className="setupField economyVisibilityFilterField">
                  <span>Package family</span>
                  <select value={selectedFamily} onChange={(event) => setSelectedFamily(event.target.value)}>
                    <option value="all">All families</option>
                    {familyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="setupField economyVisibilityFilterField">
                  <span>Ownership</span>
                  <select value={selectedOwnership} onChange={(event) => setSelectedOwnership(event.target.value)}>
                    <option value="all">All ownership types</option>
                    {ownershipOptions.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="setupField economyVisibilityFilterField">
                  <span>Access mode</span>
                  <select value={selectedAccessMode} onChange={(event) => setSelectedAccessMode(event.target.value)}>
                    <option value="all">All access modes</option>
                    {accessModeOptions.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="setupField economyVisibilityFilterField">
                  <span>Package status</span>
                  <select value={selectedPackageStatus} onChange={(event) => setSelectedPackageStatus(event.target.value)}>
                    <option value="all">Active and paused</option>
                    <option value="active">Active only</option>
                    <option value="paused">Paused only</option>
                  </select>
                </label>
              </div>
            ) : null}

            {selectedPanel === "entitlements" ? (
              <div className="economyVisibilityFilterRow">
                <label className="setupField economyVisibilityFilterField">
                  <span>Institute access status</span>
                  <select value={selectedEntitlementStatus} onChange={(event) => setSelectedEntitlementStatus(event.target.value)}>
                    <option value="all">All statuses</option>
                    {entitlementStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="setupField economyVisibilityFilterField">
                  <span>Granted via</span>
                  <select value={selectedGrantMode} onChange={(event) => setSelectedGrantMode(event.target.value)}>
                    <option value="all">All grant paths</option>
                    {grantModeOptions.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {selectedPanel === "features" ? (
              <div className="economyVisibilityFilterRow">
                <label className="setupField economyVisibilityFilterField">
                  <span>Feature status</span>
                  <select value={selectedFeatureStatus} onChange={(event) => setSelectedFeatureStatus(event.target.value)}>
                    <option value="all">All feature statuses</option>
                    {featureStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {selectedPanel === "usage" ? (
              <div className="economyVisibilityFilterRow">
                <label className="setupField economyVisibilityFilterField">
                  <span>Usage action</span>
                  <select value={selectedUsageAction} onChange={(event) => setSelectedUsageAction(event.target.value)}>
                    <option value="all">All usage actions</option>
                    {usageActionOptions.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          <div className="economyVisibilityActions">
            <button
              className="button buttonSecondary"
              disabled={downloadingReport}
              onClick={() => void downloadPackageReport()}
              type="button"
            >
              {downloadingReport ? "Downloading..." : "Export Package Report"}
            </button>
            <button
              className="button buttonGhost"
              onClick={() => {
                setSelectedPanel("entitlements");
                setSelectedPackage("all");
                setSelectedFamily("all");
                setSelectedOwnership("all");
                setSelectedAccessMode("all");
                setSelectedPackageStatus("all");
                setSelectedEntitlementStatus("all");
                setSelectedGrantMode("all");
                setSelectedFeatureStatus("all");
                setSelectedUsageAction("all");
                setResultLimit("10");
              }}
              type="button"
            >
              Reset Filters
            </button>
          </div>
        </section>

        {selectedPanel === "packages" ? (
          <section className="featurePlaceholder">
            <strong>Question-bank packages</strong>
            <p>{packageCards.length} packages match the current filters. Showing the first {visiblePackageCards.length} rows.</p>
            <div className="weakTopicStack">
              {visiblePackageCards.length > 0 ? (
                visiblePackageCards.map(({ pkg, activeScopedEntitlements, usageCount }) => (
                  <div className="weakTopicRow" key={pkg.id}>
                    <div>
                      <strong>{pkg.display_name || pkg.name}</strong>
                      <span>
                        {pkg.code} · {pkg.institute_code} · {prettify(pkg.ownership_type)}
                      </span>
                      <span>
                        {pkg.commercial_labels.length > 0
                          ? pkg.commercial_labels.join(" · ")
                          : `${prettify(pkg.package_type)} · ${prettify(pkg.access_mode)} · ${pkg.is_public_catalog ? "Public catalog" : "Hidden catalog"}`}
                      </span>
                      <span>{pkg.coverage_summary}</span>
                      <span>{describePackageCoverage(pkg)}</span>
                      <span>{describePackageCoverageBreakdown(pkg)}</span>
                      <span>{describeUsageMix(usageByPackageCode[pkg.code])}</span>
                      <details className="economyCatalogDetailDisclosure">
                        <summary>View package scope details</summary>
                        <div className="economyCatalogDetailStack">
                          {pkg.coverage_subject_labels.length > 0 ? (
                            <span>Subjects: {pkg.coverage_subject_labels.slice(0, 6).join(", ")}</span>
                          ) : pkg.coverage_program_labels.length > 0 ? (
                            <span>Programs: {pkg.coverage_program_labels.slice(0, 6).join(", ")}</span>
                          ) : (pkg.scopes ?? []).length > 0 ? (
                            <span>{describeScope((pkg.scopes ?? [])[0]) || "Scope configured"}</span>
                          ) : (
                            <span>No scope rows configured</span>
                          )}
                          {pkg.coverage_topic_labels.length > 0 ? (
                            <span>Topics: {pkg.coverage_topic_labels.slice(0, 6).join(", ")}</span>
                          ) : null}
                          {pkg.package_family_label ? <span>Family: {pkg.package_family_label}</span> : null}
                          {pkg.recommended_for_labels.length > 0 ? (
                            <span>Recommended for: {pkg.recommended_for_labels.slice(0, 6).join(", ")}</span>
                          ) : null}
                        </div>
                      </details>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{pkg.is_active ? "Active" : "Paused"}</strong>
                      <span>{pkg.scope_count} coverage rows</span>
                      <span>{pkg.subject_count} subjects</span>
                      <span>{pkg.topic_count} topics</span>
                      <span>{activeScopedEntitlements.length} active institute access rows</span>
                      <span>{pkg.default_plan_count}/{pkg.linked_plan_count} default/linked plans</span>
                      <span>{usageCount} usage units</span>
                      <span className={`statusTag statusTag${titleCase(ownershipTone(pkg.ownership_type))}`}>
                        {titleCase(pkg.ownership_type)} owner
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p>No question-bank packages are currently visible.</p>
              )}
            </div>
          </section>
        ) : null}

        {selectedPanel === "entitlements" ? (
          <section className="featurePlaceholder">
            <strong>Institute question access</strong>
            <p>
              {filteredEntitlements.length} institute access rows match the current filters. {revokedEntitlements.length} revoked and {nearLimitEntitlements.length} near-limit rows remain visible.
            </p>
            <div className="builderHintPanel">
              <strong>How to diagnose missing institute access</strong>
              <p>
                Read these rows in order: confirm the package covers the expected subject or topic, confirm the institute access row is active, then confirm the shared-library switch is active. If all three are healthy, the next check belongs on the institute question-bank filters rather than in platform admin.
              </p>
              <small>
                Safe rule: coverage gap = edit package coverage, institute access gap = restore or reactivate access, shared-library switch gap = grant or reactivate the switch.
              </small>
            </div>
            <div className="economyOperatorGuideGrid" style={{ marginTop: 16 }}>
              <article className="economyOperatorGuideCard">
                <span>Package coverage problem</span>
                <strong>The wrong subject or topic was never sold to this institute</strong>
                <small>
                  Fix this in the package scope, not by re-granting access. Coverage problems are commercial-scope issues.
                </small>
              </article>
              <article className="economyOperatorGuideCard">
                <span>Institute access problem</span>
                <strong>The package is correct, but this institute does not currently hold live access</strong>
                <small>
                  Fix this by restoring or reactivating the governing institute access row.
                </small>
              </article>
              <article className="economyOperatorGuideCard">
                <span>Shared-library switch problem</span>
                <strong>The package is assigned, but institute staff still cannot open intake</strong>
                <small>
                  Fix this by granting or restoring the shared-library switch after confirming package access is already correct.
                </small>
              </article>
              <article className="economyOperatorGuideCard">
                <span>Linked question problem</span>
                <strong>Coverage exists, but institute-side usable counts are still low</strong>
                <small>
                  Do not edit package coverage first. Check onboarding mode, auto-link behavior, and institute-side filters before expanding package scope.
                </small>
              </article>
            </div>
            {focusedVisibilityAudit ? (
              <div className="economyAccessChecklist" style={{ marginTop: 16, marginBottom: 16 }}>
                <div className="economyAccessChecklistCard economyAccessChecklistCardReady">
                  <span>Visibility audit</span>
                  <strong>{focusedVisibilityAudit.instituteLabel}</strong>
                  <small>{focusedVisibilityAudit.runtimeLabel}</small>
                </div>
                <div className="economyAccessChecklistCard economyAccessChecklistCardNeutral">
                  <span>Governing package</span>
                  <strong>{focusedVisibilityAudit.packageLabel}</strong>
                  <small>{focusedVisibilityAudit.coverageLabel}</small>
                </div>
                <div className="economyAccessChecklistCard economyAccessChecklistCardAttention">
                  <span>Expected institute filter result</span>
                  <strong>{focusedVisibilityAudit.topicLabel}</strong>
                  <small>
                    If the institute does not see this coverage, first compare the institute-side subject/topic filters with the package scope on this row before assuming platform content is missing.
                  </small>
                </div>
                <div className="economyAccessChecklistCard economyAccessChecklistCardNeutral">
                  <span>Expected licensed question count</span>
                  <strong>
                    {focusedVisibilityAuditLoading
                      ? "Loading..."
                      : focusedVisibilityAuditDetail
                        ? `${focusedVisibilityAuditDetail.expected_master_question_total} expected`
                        : "Audit unavailable"}
                  </strong>
                  <small>
                    {focusedVisibilityAuditDetail
                      ? `${focusedVisibilityAuditDetail.linked_master_question_total} already linked · ${focusedVisibilityAuditDetail.missing_linked_master_question_total} still missing`
                      : focusedVisibilityAuditError || "Counts are loaded from the live package scope and master library rules."}
                  </small>
                </div>
              </div>
            ) : null}
            {focusedVisibilityAuditDetail?.subject_breakdown?.length ? (
              <div className="economyGuidanceList" style={{ marginBottom: 16 }}>
                <strong>Subject-wise expected coverage</strong>
                {focusedVisibilityAuditDetail.subject_breakdown.map((subject) => (
                  <div key={subject.subject_id} className="economyGuidanceItem">
                    <strong>
                      {subject.subject_name} ({subject.subject_code})
                    </strong>
                    <span>
                      Expected {subject.expected_master_question_total} · Linked {subject.linked_master_question_total} · Missing {subject.missing_linked_master_question_total}
                    </span>
                    <small>
                      {subject.topic_count} topic{subject.topic_count === 1 ? "" : "s"} covered
                      {subject.topic_labels.length > 0
                        ? ` · ${subject.topic_labels.slice(0, 6).join(", ")}`
                        : ""}
                    </small>
                  </div>
                ))}
              </div>
            ) : null}
            {visibleEntitlements.length > 0 ? (
              <>
                {visibleCurrentEntitlements.length > 0 ? (
                  <div
                    className="economyEntitlementGroup economyEntitlementGroupCurrent"
                    data-testid="economy-current-entitlement-group"
                  >
                    <div className="sectionHeading">
                      <strong>Current governing access rows</strong>
                      <span>
                        These rows currently decide whether institutes can use licensed question-bank access.
                      </span>
                    </div>
                    <div className="weakTopicStack">
                      {visibleCurrentEntitlements.map((entitlement) => renderEntitlementRow(entitlement))}
                    </div>
                  </div>
                ) : null}

                {visibleHistoricalEntitlements.length > 0 ? (
                  <div
                    className="economyEntitlementGroup economyEntitlementGroupHistorical"
                    data-testid="economy-historical-entitlement-group"
                  >
                    <div className="sectionHeading">
                      <strong>Historical revoked rows</strong>
                      <span>
                        These rows remain visible for audit history only. They do not govern current institute access unless restored.
                      </span>
                    </div>
                    <div className="economyAccessChecklist" style={{ marginBottom: 16 }}>
                      <div className="economyAccessChecklistCard economyAccessChecklistCardDanger">
                        <span>Operator reminder</span>
                        <strong>Historical rows are not live access</strong>
                        <small>
                          If support asks whether an institute can use a package right now, do not answer from this section alone. Either restore the row or switch back to current governing rows.
                        </small>
                      </div>
                      <div className="economyAccessChecklistCard economyAccessChecklistCardAttention">
                        <span>Fast recovery</span>
                        <strong>Filter back to active rows</strong>
                        <small>
                          Use the button below when you want to return to the rows that currently decide live institute access.
                        </small>
                      </div>
                    </div>
                    <div className="economyEntitlementActionStack" style={{ marginBottom: 16 }}>
                      <button
                        className="button buttonGhost"
                        onClick={() => {
                          setSelectedEntitlementStatus("active");
                          setSelectedPanel("entitlements");
                        }}
                        type="button"
                      >
                        Show Current Governing Rows
                      </button>
                      <button
                        className="button buttonGhost"
                        onClick={() => {
                          setSelectedEntitlementStatus("all");
                          setSelectedPanel("entitlements");
                        }}
                        type="button"
                      >
                        Show All Entitlement States
                      </button>
                    </div>
                    <div className="weakTopicStack">
                      {visibleHistoricalEntitlements.map((entitlement) => renderEntitlementRow(entitlement))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p>No institute entitlements are currently visible.</p>
            )}
          </section>
        ) : null}

        {selectedPanel === "features" ? (
          <section className="featurePlaceholder">
            <strong>Institute shared-library switches</strong>
            <p>{filteredFeatureEntitlements.length} shared-library switch rows match the current filters.</p>
            <div className="weakTopicStack">
              {visibleFeatureEntitlements.length > 0 ? (
                visibleFeatureEntitlements.map((entitlement) => (
                <div className="weakTopicRow economyFeatureRow" key={entitlement.id}>
                  {(() => {
                    const featureState = describeFeatureRuntimeState(entitlement);
                    const primaryActionLabel = getFeaturePrimaryActionLabel(entitlement.status);
                    return (
                      <>
                  <div className="economyFeatureMain">
                    <strong>{entitlement.institute_name}</strong>
                    <span>
                      Feature: {titleCase(entitlement.feature_code)}
                    </span>
                    <span>
                      Status: {titleCase(entitlement.status)}
                    </span>
                    <span>
                      {entitlement.source_package_code
                        ? `Source package: ${entitlement.source_package_code}${entitlement.source_package_type ? ` · ${titleCase(entitlement.source_package_type)}` : ""}`
                        : "No source package linked"}
                    </span>
                    <span>
                      {entitlement.source_subscription_plan_code
                        ? `Source plan: ${entitlement.source_subscription_plan_code}`
                        : "No source subscription plan linked"}
                    </span>
                    <details className="economyCatalogDetailDisclosure">
                      <summary>View feature grant details</summary>
                      <div className="economyCatalogDetailStack">
                        {entitlement.source_package_name ? <span>Source package name: {entitlement.source_package_name}</span> : null}
                        {entitlement.source_subscription_plan_name ? (
                          <span>Source plan name: {entitlement.source_subscription_plan_name}</span>
                        ) : null}
                        <span>
                          {entitlement.ends_at
                            ? `Ends ${formatDateLabel(entitlement.ends_at)}`
                            : entitlement.starts_at
                              ? `Starts ${formatDateLabel(entitlement.starts_at)}`
                              : "No lifecycle window"}
                        </span>
                      </div>
                    </details>
                    <div className="builderHintPanel economyAccessHintPanel" style={{ marginTop: 12 }}>
                      <strong>{featureState.title}</strong>
                      <p>{featureState.summary}</p>
                      <small>{featureState.nextStep}</small>
                    </div>
                  </div>
                  <div className="weakTopicMeta economyFeatureMeta">
                    <strong>{entitlement.institute_code}</strong>
                    <span>{primaryActionLabel}</span>
                    <span>
                      {entitlement.ends_at
                        ? `Ends ${formatDateLabel(entitlement.ends_at)}`
                        : entitlement.starts_at
                          ? `Starts ${formatDateLabel(entitlement.starts_at)}`
                          : "No lifecycle window"}
                    </span>
                    <div className="economyEntitlementActionStack">
                    {entitlement.status === "active" ? (
                      <button
                        className="button buttonGhost"
                        disabled={updatingFeatureEntitlementId === entitlement.id}
                        onClick={() => void handleFeatureEntitlementStatusChange(entitlement, "paused")}
                        type="button"
                      >
                        {updatingFeatureEntitlementId === entitlement.id ? "Updating..." : "Pause Feature"}
                      </button>
                    ) : null}
                    {entitlement.status === "paused" ? (
                      <button
                        className="button buttonGhost"
                        disabled={updatingFeatureEntitlementId === entitlement.id}
                        onClick={() => void handleFeatureEntitlementStatusChange(entitlement, "active")}
                        type="button"
                      >
                        {updatingFeatureEntitlementId === entitlement.id ? "Updating..." : "Reactivate Feature"}
                      </button>
                    ) : null}
                    {entitlement.status === "revoked" ? (
                      <button
                        className="button buttonGhost"
                        disabled={updatingFeatureEntitlementId === entitlement.id}
                        onClick={() => void handleFeatureEntitlementStatusChange(entitlement, "active")}
                        type="button"
                      >
                        {updatingFeatureEntitlementId === entitlement.id ? "Updating..." : "Restore Shared-Library Switch"}
                      </button>
                    ) : null}
                    {entitlement.status !== "revoked" ? (
                      <button
                        className="button buttonDanger"
                        disabled={updatingFeatureEntitlementId === entitlement.id}
                        onClick={() => void handleFeatureEntitlementStatusChange(entitlement, "revoked")}
                        type="button"
                      >
                        {updatingFeatureEntitlementId === entitlement.id ? "Updating..." : "Revoke Feature"}
                      </button>
                    ) : null}
                    <small className="economyInlineHelper">
                      {entitlement.status === "revoked"
                        ? "Restore brings back the same feature row so institute staff can use the licensed intake lane again."
                        : "Revoke this only when institute staff should lose the licensed intake lane even if package access is still assigned."}
                    </small>
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))
            ) : (
              <p>No institute feature entitlements are currently visible.</p>
            )}
          </div>
          </section>
        ) : null}

        {selectedPanel === "usage" ? (
          <section className="featurePlaceholder">
            <strong>Recent package consumption evidence</strong>
            <p>
              {filteredUsageEntries.length} usage rows match the current filters. Use this panel only when you need proof of actual package consumption.
            </p>
            <div className="weakTopicStack">
              {visibleUsageEntries.length > 0 ? (
                visibleUsageEntries.map((entry) => (
                <div className="weakTopicRow economyUsageRow" key={entry.id}>
                  <div className="economyUsageMain">
                    <strong>{entry.institute_name}</strong>
                    <span>
                      {entry.question_bank_package_code || "No package"} · {titleCase(entry.action_type)}
                    </span>
                    <span>
                      {entry.exam_title
                        ? `Exam: ${entry.exam_title}`
                        : entry.question_text
                          ? `Question: ${entry.question_text.slice(0, 96)}`
                          : entry.master_question_text
                            ? `Master question: ${entry.master_question_text.slice(0, 96)}`
                            : "No question snapshot"}
                    </span>
                    <span>
                      {entry.performed_by_label
                        ? `Performed by ${entry.performed_by_label}`
                        : "No actor captured"}{" "}
                      · {formatDateLabel(entry.effective_at)}
                    </span>
                    <details className="economyCatalogDetailDisclosure">
                      <summary>View evidence detail</summary>
                      <div className="economyCatalogDetailStack">
                        {entry.exam_title ? <span>Exam title: {entry.exam_title}</span> : null}
                        {entry.question_text ? <span>Question snapshot: {entry.question_text}</span> : null}
                        {!entry.question_text && entry.master_question_text ? (
                          <span>Master question snapshot: {entry.master_question_text}</span>
                        ) : null}
                      </div>
                    </details>
                  </div>
                  <div className="weakTopicMeta economyUsageMeta">
                    <strong>{entry.quantity}</strong>
                    <span>{entry.institute_code}</span>
                    <span>{entry.entitlement_status ? titleCase(entry.entitlement_status) : "No entitlement row"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p>No package usage rows match the current filters.</p>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <Link className="button buttonSecondary" href="/admin/institutes">
              Review institute subscriptions
            </Link>
          </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
