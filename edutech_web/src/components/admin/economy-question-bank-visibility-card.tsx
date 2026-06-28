"use client";

import Link from "next/link";
import { useState } from "react";

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

function getEntitlementLifecycleLabel(entitlement: AdminInstituteQuestionEntitlement) {
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

function getEntitlementLifecycleHelper(entitlement: AdminInstituteQuestionEntitlement) {
  const normalizedStatus = String(entitlement.status || "").toLowerCase();
  const startsAt = parseDateValue(entitlement.starts_at);
  const endsAt = parseDateValue(entitlement.ends_at);

  if (normalizedStatus === "revoked") {
    return "Revoked by operator. Institute access has been withdrawn from this package.";
  }
  if (normalizedStatus === "paused") {
    return "Paused by operator. Shared-library usage is blocked until the entitlement is reactivated.";
  }
  if (endsAt && endsAt.getTime() < Date.now()) {
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

function describeScope(
  scope: AdminQuestionBankPackage["scopes"][number],
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

function groupPackageCardsByFamily<
  T extends {
    pkg: AdminQuestionBankPackage;
  },
>(items: T[]) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const family = item.pkg.package_family_label || "General";
    const current = grouped.get(family) ?? [];
    current.push(item);
    grouped.set(family, current);
  }
  return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right));
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
  const [selectedInstitute, setSelectedInstitute] = useState("all");
  const [selectedPackage, setSelectedPackage] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [downloadingReport, setDownloadingReport] = useState(false);

  const instituteOptions = Array.from(
    new Map(
      entitlements.map((entitlement) => [
        entitlement.institute,
        {
          id: entitlement.institute,
          label: `${entitlement.institute_name} (${entitlement.institute_code})`,
        },
      ]),
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label));

  const packageOptions = packages
    .map((pkg) => ({
      id: pkg.id,
      label: `${pkg.name} (${pkg.code})`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const filteredEntitlements = entitlements.filter((entitlement) => {
    if (selectedInstitute !== "all" && entitlement.institute !== selectedInstitute) return false;
    if (selectedPackage !== "all" && entitlement.question_bank_package !== selectedPackage) return false;
    return true;
  });

  const filteredFeatureEntitlements = featureEntitlements.filter((entitlement) => {
    if (selectedInstitute !== "all" && entitlement.institute !== selectedInstitute) return false;
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
    return true;
  });

  const filteredUsageEntries = usageEntries.filter((entry) => {
    if (selectedInstitute !== "all" && entry.institute !== selectedInstitute) return false;
    if (selectedPackage !== "all" && entry.question_bank_package !== selectedPackage) return false;
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

  const activeEntitlements = filteredEntitlements.filter((entitlement) => entitlement.status === "active");
  const expiringEntitlements = filteredEntitlements.filter((entitlement) =>
    getEntitlementLifecycleLabel(entitlement).toLowerCase().includes("expiring"),
  );
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
  const examCreatedUsageCount = filteredUsageEntries
    .filter((entry) => entry.action_type === "exam_created")
    .reduce((total, entry) => total + (entry.quantity || 0), 0);
  const examPublishedUsageCount = filteredUsageEntries
    .filter((entry) => entry.action_type === "exam_published")
    .reduce((total, entry) => total + (entry.quantity || 0), 0);

  const packageCards = packages
    .filter((pkg) => selectedPackage === "all" || pkg.id === selectedPackage)
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
  const packageCardsByFamily = groupPackageCardsByFamily(packageCards);

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

  async function downloadPackageReport() {
    setDownloadingReport(true);
    setMessage("");
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("export", "csv");
      if (selectedInstitute !== "all") {
        params.set("institute", selectedInstitute);
      }
      if (selectedPackage !== "all") {
        params.set("question_bank_package", selectedPackage);
      }

      const response = await fetch(`/api/admin/economy/question-bank-package-report?${params.toString()}`);
      if (!response.ok) {
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
        <h3>Inspect package scope and institute access before changing subscription controls</h3>
        <p className="academicSectionDescription">
          This is the safe operator lens for shared library rollout. It shows which packages exist, where they live,
          how much scope they carry, and which institutes currently hold active or draft access.
        </p>

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

        <section className="featurePlaceholder">
          <strong>Operational summary</strong>
          <p>Use this lens to verify catalog readiness, institute access posture, and actual package consumption.</p>
          <div className="studentMetricsGrid">
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Active packages</span>
              <strong>{packageCards.filter(({ pkg }) => pkg.is_active).length}</strong>
              <small>{packageCards.length} currently in filtered scope</small>
            </div>
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Active entitlements</span>
              <strong>{activeEntitlements.length}</strong>
              <small>{expiringEntitlements.length} expiring soon</small>
            </div>
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Feature grants</span>
              <strong>{activeFeatureEntitlements.length}</strong>
              <small>{filteredFeatureEntitlements.length} visible feature rows</small>
            </div>
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Usage events</span>
              <strong>{filteredUsageEntries.length}</strong>
              <small>{linkedQuestionEvents.length} shared-question link events</small>
            </div>
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Exam creation usage</span>
              <strong>{examCreatedUsageCount}</strong>
              <small>Licensed questions materialized into draft exams</small>
            </div>
            <div className="studentMetricCard">
              <span className="studentMetricLabel">Exam publish usage</span>
              <strong>{examPublishedUsageCount}</strong>
              <small>Licensed package usage that reached publish flow</small>
            </div>
          </div>
          <div className="formGrid formGrid2" style={{ marginTop: 16 }}>
            <label className="fieldLabel">
              <span>Filter by institute</span>
              <select value={selectedInstitute} onChange={(event) => setSelectedInstitute(event.target.value)}>
                <option value="all">All institutes</option>
                {instituteOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="fieldLabel">
              <span>Filter by package</span>
              <select value={selectedPackage} onChange={(event) => setSelectedPackage(event.target.value)}>
                <option value="all">All packages</option>
                {packageOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="buttonRow" style={{ marginTop: 16 }}>
            <button
              className="button buttonSecondary"
              disabled={downloadingReport}
              onClick={() => void downloadPackageReport()}
              type="button"
            >
              {downloadingReport ? "Downloading..." : "Export Package Report"}
            </button>
          </div>
        </section>

        <section className="featurePlaceholder">
          <strong>Question-bank packages</strong>
          <p>{packageCards.length} packages currently visible in the active operator filter.</p>
          <div>
            {packageCardsByFamily.length > 0 ? (
              packageCardsByFamily.slice(0, 4).map(([familyLabel, familyCards]) => (
                <section className="featurePlaceholder" key={familyLabel} style={{ marginBottom: 12 }}>
                  <strong>{familyLabel} package family</strong>
                  <p>{familyCards.length} package lane{familyCards.length === 1 ? "" : "s"} currently visible in the active operator filter.</p>
                  <div className="weakTopicStack">
                    {familyCards.slice(0, 6).map(({ pkg, activeScopedEntitlements, usageCount }) => (
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
                          {pkg.coverage_subject_labels.length > 0 ? (
                            <span>Subjects: {pkg.coverage_subject_labels.slice(0, 4).join(", ")}</span>
                          ) : pkg.coverage_program_labels.length > 0 ? (
                            <span>Programs: {pkg.coverage_program_labels.slice(0, 4).join(", ")}</span>
                          ) : pkg.scopes.length > 0 ? (
                            <span>{describeScope(pkg.scopes[0]) || "Scope configured"}</span>
                          ) : (
                            <span>No scope rows configured</span>
                          )}
                          {pkg.coverage_topic_labels.length > 0 ? (
                            <span>Topics: {pkg.coverage_topic_labels.slice(0, 4).join(", ")}</span>
                          ) : null}
                          {pkg.package_family_label ? <span>Family: {pkg.package_family_label}</span> : null}
                          {pkg.recommended_for_labels.length > 0 ? (
                            <span>Recommended for: {pkg.recommended_for_labels.slice(0, 4).join(", ")}</span>
                          ) : null}
                          {pkg.scopes.length > 1 ? (
                            <span>Top scopes: {pkg.scopes.slice(0, 3).map((scope) => describeScope(scope) || "Scoped segment").join(" · ")}</span>
                          ) : null}
                          <span>{describeUsageMix(usageByPackageCode[pkg.code])}</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{pkg.is_active ? "Active" : "Paused"}</strong>
                          <span>{pkg.scope_count} scopes</span>
                          <span>{pkg.subject_count} subjects</span>
                          <span>{pkg.topic_count} topics</span>
                          <span>{activeScopedEntitlements.length} active entitlements</span>
                          <span>{pkg.default_plan_count}/{pkg.linked_plan_count} default/linked plans</span>
                          <span>{usageCount} usage units</span>
                          <span className={`statusTag statusTag${titleCase(ownershipTone(pkg.ownership_type))}`}>
                            {titleCase(pkg.ownership_type)} owner
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <p>No question-bank packages are currently visible.</p>
            )}
          </div>
        </section>

        <section className="featurePlaceholder">
          <strong>Institute question entitlements</strong>
          <p>
            {filteredEntitlements.length} entitlement rows visible. {pausedEntitlements.length} paused and{" "}
            {revokedEntitlements.length} revoked rows remain in operator scope. {nearLimitEntitlements.length} active
            rows are near quota limit.
          </p>
          <div className="weakTopicStack">
            {filteredEntitlements.length > 0 ? (
              filteredEntitlements.slice(0, 12).map((entitlement) => (
                <div className="weakTopicRow" key={entitlement.id} data-testid={`entitlement-row-${entitlement.id}`}>
                  <div>
                    <strong>{entitlement.institute_name}</strong>
                    <span>
                      {entitlement.question_bank_package_code} · owner {entitlement.package_owner_institute_code}
                    </span>
                    <span>
                      Status: {getEntitlementLifecycleLabel(entitlement)} · {titleCase(entitlement.question_bank_package_type)} ·{" "}
                      {titleCase(entitlement.question_bank_package_access_mode)} · via {prettify(entitlement.granted_via)}
                    </span>
                    <span>{getEntitlementLifecycleHelper(entitlement)}</span>
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
                    <div className="formGrid formGrid3" style={{ marginTop: 12 }}>
                      <label className="fieldLabel">
                        <span>Starts at</span>
                        <input
                          type="datetime-local"
                          value={entitlementDrafts[entitlement.id]?.starts_at ?? ""}
                          onChange={(event) =>
                            updateEntitlementDraft(entitlement.id, "starts_at", event.target.value)
                          }
                        />
                      </label>
                      <label className="fieldLabel">
                        <span>Ends at</span>
                        <input
                          type="datetime-local"
                          value={entitlementDrafts[entitlement.id]?.ends_at ?? ""}
                          onChange={(event) =>
                            updateEntitlementDraft(entitlement.id, "ends_at", event.target.value)
                          }
                        />
                      </label>
                      <label className="fieldLabel">
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
                  <div className="weakTopicMeta">
                    <strong>{entitlement.is_active ? "Row active" : "Row inactive"}</strong>
                    <span>{entitlement.institute_code}</span>
                    <span>{entitlement.question_bank_package_name}</span>
                    <span>{entitlement.scope_count} scope rows</span>
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
                    <span className={`statusTag statusTag${titleCase(lifecycleTone(getEntitlementLifecycleLabel(entitlement)))}`}>
                      {getEntitlementLifecycleLabel(entitlement)}
                    </span>
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
                      {updatingEntitlementId === entitlement.id ? "Updating..." : "Save Lifecycle"}
                    </button>
                    {entitlement.status === "active" ? (
                      <button
                        className="button buttonGhost"
                        disabled={updatingEntitlementId === entitlement.id}
                        onClick={() => void handleEntitlementStatusChange(entitlement, "paused")}
                        type="button"
                      >
                        {updatingEntitlementId === entitlement.id ? "Updating..." : "Pause Entitlement"}
                      </button>
                    ) : null}
                    {entitlement.status === "paused" ? (
                      <button
                        className="button buttonGhost"
                        disabled={updatingEntitlementId === entitlement.id}
                        onClick={() => void handleEntitlementStatusChange(entitlement, "active")}
                        type="button"
                      >
                        {updatingEntitlementId === entitlement.id ? "Updating..." : "Reactivate Entitlement"}
                      </button>
                    ) : null}
                    {entitlement.status !== "revoked" ? (
                      <button
                        className="button buttonDanger"
                        disabled={updatingEntitlementId === entitlement.id}
                        onClick={() => void handleEntitlementStatusChange(entitlement, "revoked")}
                        type="button"
                      >
                        {updatingEntitlementId === entitlement.id ? "Updating..." : "Revoke Entitlement"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p>No institute entitlements are currently visible.</p>
            )}
          </div>
        </section>

        <section className="featurePlaceholder">
          <strong>Institute feature entitlements</strong>
          <p>{filteredFeatureEntitlements.length} feature entitlement rows currently visible to platform admin.</p>
          <div className="weakTopicStack">
            {filteredFeatureEntitlements.length > 0 ? (
              filteredFeatureEntitlements.slice(0, 12).map((entitlement) => (
                <div className="weakTopicRow" key={entitlement.id}>
                  <div>
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
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{entitlement.institute_code}</strong>
                    <span>
                      {entitlement.ends_at
                        ? `Ends ${formatDateLabel(entitlement.ends_at)}`
                        : entitlement.starts_at
                          ? `Starts ${formatDateLabel(entitlement.starts_at)}`
                          : "No lifecycle window"}
                    </span>
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
                  </div>
                </div>
              ))
            ) : (
              <p>No institute feature entitlements are currently visible.</p>
            )}
          </div>
        </section>

        <section className="featurePlaceholder">
          <strong>Recent package consumption evidence</strong>
          <p>
            {filteredUsageEntries.length} usage rows currently visible. This is the quickest way to prove whether a
            package is only configured or is actually being consumed.
          </p>
          <div className="weakTopicStack">
            {filteredUsageEntries.length > 0 ? (
              filteredUsageEntries.slice(0, 15).map((entry) => (
                <div className="weakTopicRow" key={entry.id}>
                  <div>
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
                  </div>
                  <div className="weakTopicMeta">
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
      </div>
    </article>
  );
}
