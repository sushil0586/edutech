"use client";

import { useState } from "react";

type InstituteOption = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type QuestionBankPackageOption = {
  id: string;
  institute: string;
  institute_name: string;
  institute_code: string;
  name: string;
  code: string;
  display_name: string;
  package_family_label: string | null;
  ownership_type: string;
  access_mode: string;
  is_public_catalog: boolean;
  commercial_labels: string[];
  recommended_for_labels: string[];
  coverage_program_labels: string[];
  coverage_subject_labels: string[];
  coverage_topic_labels: string[];
  program_count: number;
  subject_count: number;
  topic_count: number;
  coverage_summary: string;
  is_active: boolean;
};

type SubscriptionCreditRule = {
  id?: string;
  stars_credited: number;
  credit_on_activation: boolean;
  credit_on_renewal: boolean;
  metadata: Record<string, unknown>;
  is_active: boolean;
};

type SubscriptionCycle = {
  id?: string;
  billing_interval: string;
  interval_count: number;
  price_amount: string;
  currency: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  star_credit_rules: SubscriptionCreditRule[];
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
  cycles: SubscriptionCycle[];
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

type ApplyAccessResult = {
  entitlementCount: number;
  questionBankPackageCodes: string[];
  targetInstituteCode: string;
  planCode: string;
  appliedAt: string;
};

type InstituteQuestionEntitlement = {
  id: string;
  institute: string;
  institute_code: string;
  question_bank_package: string;
  question_bank_package_code: string;
  status: string;
  is_active: boolean;
};

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function describeRenewalPosture(plan: AdminSubscriptionPlan) {
  const rules = plan.cycles.flatMap((cycle) => cycle.star_credit_rules.filter((rule) => rule.is_active));
  if (rules.length === 0) {
    return "No active credit rules configured.";
  }

  const activationRuleCount = rules.filter((rule) => rule.credit_on_activation).length;
  const renewalRuleCount = rules.filter((rule) => rule.credit_on_renewal).length;

  if (renewalRuleCount === 0) {
    return "Renewal credit is disabled across active rules.";
  }
  if (activationRuleCount === 0) {
    return "Credit starts only on renewal across active rules.";
  }
  return `${renewalRuleCount} active renewal credit rule${renewalRuleCount === 1 ? "" : "s"} configured.`;
}

function describeLinkedPackages(plan: AdminSubscriptionPlan) {
  if (plan.question_bank_package_links.length === 0) {
    return "No question-bank packages attached yet.";
  }

  return plan.question_bank_package_links
    .map((link) => {
      const defaultLabel = link.is_default ? "default" : "secondary";
      return `${link.question_bank_package_code} (${titleCase(link.grant_mode)} · ${defaultLabel})`;
    })
    .join(" · ");
}

function buildGrantModeSummary(plan: AdminSubscriptionPlan) {
  const counts = plan.question_bank_package_links
    .filter((link) => link.is_active)
    .reduce<Record<string, number>>((acc, link) => {
      const key = String(link.grant_mode || "included");
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  if (Object.keys(counts).length === 0) {
    return "No active package lanes attached.";
  }

  return Object.entries(counts)
    .map(([mode, count]) => `${titleCase(mode)} ${count}`)
    .join(" · ");
}

function buildCycleSummary(plan: AdminSubscriptionPlan) {
  const activeCycles = plan.cycles.filter((cycle) => cycle.is_active);
  if (activeCycles.length === 0) {
    return "No active billing cycles configured.";
  }
  return activeCycles
    .map(
      (cycle) =>
        `${titleCase(cycle.billing_interval)} x ${cycle.interval_count} · ${cycle.currency} ${cycle.price_amount}`,
    )
    .join(" · ");
}

function describeCoverageLabels(pkg: QuestionBankPackageOption) {
  if (pkg.coverage_subject_labels.length > 0) {
    return `Subjects: ${pkg.coverage_subject_labels.slice(0, 4).join(", ")}`;
  }
  if (pkg.coverage_program_labels.length > 0) {
    return `Programs: ${pkg.coverage_program_labels.slice(0, 4).join(", ")}`;
  }
  if (pkg.coverage_topic_labels.length > 0) {
    return `Topics: ${pkg.coverage_topic_labels.slice(0, 4).join(", ")}`;
  }
  return "Coverage labels are not configured yet.";
}

function summarizePlanCommercialFraming(
  plan: AdminSubscriptionPlan,
  packagesById: Map<string, QuestionBankPackageOption>,
) {
  const linkedPackages = plan.question_bank_package_links
    .filter((link) => link.is_active)
    .map((link) => packagesById.get(link.question_bank_package))
    .filter((pkg): pkg is QuestionBankPackageOption => Boolean(pkg));

  const scopeLabels = [...new Set(linkedPackages.map((pkg) => titleCase(pkg.access_mode)))];
  const familyLabels = [...new Set(linkedPackages.map((pkg) => pkg.package_family_label).filter(Boolean))];
  const recommendedLabels = [
    ...new Set(linkedPackages.flatMap((pkg) => pkg.recommended_for_labels || []).filter(Boolean)),
  ];

  return {
    scopeSummary:
      scopeLabels.length > 0 ? scopeLabels.join(" · ") : "No commercial scope framing available yet.",
    familySummary:
      familyLabels.length > 0 ? familyLabels.join(", ") : "No package family grouping configured yet.",
    recommendedSummary:
      recommendedLabels.length > 0
        ? recommendedLabels.slice(0, 4).join(", ")
        : "No audience recommendation labels configured yet.",
  };
}

function groupPackagesByFamily<T extends { pkg: QuestionBankPackageOption }>(items: T[]) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const family = item.pkg.package_family_label || "General";
    const current = grouped.get(family) ?? [];
    current.push(item);
    grouped.set(family, current);
  }
  return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right));
}

function describeReconciliationSummary({
  matchedCount,
  linkedCount,
}: {
  matchedCount: number;
  linkedCount: number;
}) {
  if (linkedCount === 0) {
    return "No linked packages to reconcile.";
  }
  if (matchedCount === linkedCount) {
    return `All ${linkedCount} linked package entitlement${linkedCount === 1 ? "" : "s"} are active.`;
  }
  if (matchedCount === 0) {
    return "No active institute entitlements currently match this plan.";
  }
  return `${matchedCount} of ${linkedCount} linked packages currently have active institute entitlements.`;
}

function describeRemediationGuidance({
  matchedCount,
  linkedCount,
  instituteCode,
}: {
  matchedCount: number;
  linkedCount: number;
  instituteCode: string;
}) {
  if (linkedCount === 0) {
    return "Attach at least one package before applying institute access.";
  }
  if (matchedCount === linkedCount) {
    return `No remediation needed for ${instituteCode}. Re-apply access only if package links or target scope change.`;
  }
  if (matchedCount === 0) {
    return `Re-apply access for ${instituteCode} to materialize the full linked package set.`;
  }
  return `Re-apply access for ${instituteCode} to restore the missing package entitlements.`;
}

function defaultRule(): SubscriptionCreditRule {
  return {
    stars_credited: 500,
    credit_on_activation: true,
    credit_on_renewal: true,
    metadata: {},
    is_active: true,
  };
}

function defaultCycle(): SubscriptionCycle {
  return {
    billing_interval: "monthly",
    interval_count: 1,
    price_amount: "299.00",
    currency: "INR",
    metadata: {},
    is_active: true,
    star_credit_rules: [defaultRule()],
  };
}

export function EconomySubscriptionPlanManagementCard({
  initialPlans,
  institutes,
  questionBankPackages,
  entitlements,
}: {
  initialPlans: AdminSubscriptionPlan[];
  institutes: InstituteOption[];
  questionBankPackages: QuestionBankPackageOption[];
  entitlements: InstituteQuestionEntitlement[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [editingId, setEditingId] = useState("");
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [cycles, setCycles] = useState<SubscriptionCycle[]>([defaultCycle()]);
  const [questionBankPackageLinks, setQuestionBankPackageLinks] = useState<
    AdminSubscriptionPlan["question_bank_package_links"]
  >([]);
  const [lastApplyResult, setLastApplyResult] = useState<ApplyAccessResult | null>(null);
  const [applyTargetInstituteByPlanId, setApplyTargetInstituteByPlanId] = useState<Record<string, string>>({});
  const [applyingPlanId, setApplyingPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const availableQuestionBankPackages = questionBankPackages.filter(
    (pkg) => pkg.institute === instituteId && pkg.is_active,
  );
  const questionBankPackagesById = new Map(questionBankPackages.map((pkg) => [pkg.id, pkg]));
  const availablePackagesByFamily = groupPackagesByFamily(
    availableQuestionBankPackages.map((pkg) => ({ pkg })),
  );

  function resetForm() {
    setEditingId("");
    setInstituteId(institutes[0]?.id ?? "");
    setName("");
    setCode("");
    setDescription("");
    setIsActive(true);
    setCycles([defaultCycle()]);
    setQuestionBankPackageLinks([]);
  }

  function loadForEdit(plan: AdminSubscriptionPlan) {
    setEditingId(plan.id);
    setInstituteId(plan.institute);
    setName(plan.name);
    setCode(plan.code);
    setDescription(plan.description);
    setIsActive(plan.is_active);
    setCycles(
      plan.cycles.length > 0
        ? plan.cycles.map((cycle) => ({
            ...cycle,
            star_credit_rules:
              cycle.star_credit_rules.length > 0 ? cycle.star_credit_rules : [defaultRule()],
          }))
        : [defaultCycle()],
    );
    setQuestionBankPackageLinks(plan.question_bank_package_links);
    setMessage("");
    setError("");
  }

  function updateCycle(index: number, patch: Partial<SubscriptionCycle>) {
    setCycles((current) => current.map((cycle, cycleIndex) => (cycleIndex === index ? { ...cycle, ...patch } : cycle)));
  }

  function updateRule(cycleIndex: number, ruleIndex: number, patch: Partial<SubscriptionCreditRule>) {
    setCycles((current) =>
      current.map((cycle, currentCycleIndex) => {
        if (currentCycleIndex !== cycleIndex) return cycle;
        return {
          ...cycle,
          star_credit_rules: cycle.star_credit_rules.map((rule, currentRuleIndex) =>
            currentRuleIndex === ruleIndex ? { ...rule, ...patch } : rule,
          ),
        };
      }),
    );
  }

  function addCycle() {
    setCycles((current) => [...current, defaultCycle()]);
  }

  function addRule(cycleIndex: number) {
    setCycles((current) =>
      current.map((cycle, currentCycleIndex) =>
        currentCycleIndex === cycleIndex
          ? { ...cycle, star_credit_rules: [...cycle.star_credit_rules, defaultRule()] }
          : cycle,
      ),
    );
  }

  function toggleQuestionBankPackageLink(pkg: QuestionBankPackageOption, checked: boolean) {
    setQuestionBankPackageLinks((current) => {
      if (checked) {
        if (current.some((link) => link.question_bank_package === pkg.id)) {
          return current;
        }
        return [
          ...current,
          {
            id: "",
            question_bank_package: pkg.id,
            question_bank_package_name: pkg.name,
            question_bank_package_code: pkg.code,
            question_bank_package_institute_name: pkg.institute_name,
            question_bank_package_institute_code: pkg.institute_code,
            grant_mode: "included",
            is_default: current.length === 0,
            metadata: {},
            is_active: true,
          },
        ];
      }

      const next = current.filter((link) => link.question_bank_package !== pkg.id);
      if (next.length === 1 && !next[0]?.is_default) {
        return [{ ...next[0], is_default: true }];
      }
      return next;
    });
  }

  function updateQuestionBankPackageLink(packageId: string, patch: Partial<AdminSubscriptionPlan["question_bank_package_links"][number]>) {
    setQuestionBankPackageLinks((current) =>
      current.map((link) =>
        link.question_bank_package === packageId
          ? { ...link, ...patch }
          : patch.is_default
            ? { ...link, is_default: false }
            : link,
      ),
    );
  }

  function getApplyInstituteId(plan: AdminSubscriptionPlan) {
    return applyTargetInstituteByPlanId[plan.id] ?? plan.institute;
  }

  function getPlanEntitlementReconciliation(plan: AdminSubscriptionPlan) {
    const targetInstituteId = getApplyInstituteId(plan);
    const linkedPackageCodes = plan.question_bank_package_links
      .filter((link) => link.is_active)
      .map((link) => link.question_bank_package_code);
    const matchedEntitlements = entitlements.filter(
      (entitlement) =>
        entitlement.institute === targetInstituteId &&
        entitlement.is_active &&
        entitlement.status === "active" &&
        linkedPackageCodes.includes(entitlement.question_bank_package_code),
    );
    const matchedPackageCodes = [...new Set(matchedEntitlements.map((item) => item.question_bank_package_code))];
    const missingPackageCodes = linkedPackageCodes.filter((code) => !matchedPackageCodes.includes(code));
    const instituteCode =
      institutes.find((item) => item.id === targetInstituteId)?.code ??
      matchedEntitlements[0]?.institute_code ??
      "Unknown institute";

    return {
      instituteCode,
      linkedCount: linkedPackageCodes.length,
      matchedCount: matchedPackageCodes.length,
      missingPackageCodes,
    };
  }

  async function handleApplyPlanToInstitute(plan: AdminSubscriptionPlan) {
    const targetInstituteId = getApplyInstituteId(plan);
    if (!targetInstituteId) {
      setError("Select a target institute before applying package access.");
      return;
    }

    setApplyingPlanId(plan.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/economy/subscription-plans/${plan.id}/apply-to-institute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute: targetInstituteId,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: {
          entitlement_count?: number;
          target_institute_code?: string;
          question_bank_package_codes?: string[];
        };
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Subscription plan apply failed with status ${response.status}`,
        );
      }

      const packageCount = body.data?.question_bank_package_codes?.length ?? body.data?.entitlement_count ?? 0;
      const instituteCode = body.data?.target_institute_code ?? institutes.find((item) => item.id === targetInstituteId)?.code;
      setLastApplyResult({
        entitlementCount: body.data?.entitlement_count ?? packageCount,
        questionBankPackageCodes: body.data?.question_bank_package_codes ?? [],
        targetInstituteCode: instituteCode ?? "Unknown institute",
        planCode: plan.code,
        appliedAt: new Date().toISOString(),
      });
      setMessage(
        body.message ??
          `Applied ${plan.code} to ${instituteCode ?? "selected institute"} and materialized ${packageCount} package entitlement${packageCount === 1 ? "" : "s"}.`,
      );
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Unable to apply subscription plan to institute.");
    } finally {
      setApplyingPlanId("");
    }
  }

  async function handleSubmit() {
    if (!instituteId || !name.trim() || !code.trim()) {
      setError("Institute, plan name, and plan code are required.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        institute: instituteId,
        name: name.trim(),
        code: code.trim(),
        description: description.trim(),
        metadata: {},
        is_active: isActive,
        cycles: cycles.map((cycle) => ({
          ...(cycle.id ? { id: cycle.id } : {}),
          billing_interval: cycle.billing_interval,
          interval_count: Number(cycle.interval_count),
          price_amount: cycle.price_amount,
          currency: cycle.currency,
          metadata: cycle.metadata ?? {},
          is_active: cycle.is_active,
          star_credit_rules: cycle.star_credit_rules.map((rule) => ({
            ...(rule.id ? { id: rule.id } : {}),
            stars_credited: Number(rule.stars_credited),
            credit_on_activation: rule.credit_on_activation,
            credit_on_renewal: rule.credit_on_renewal,
            metadata: rule.metadata ?? {},
            is_active: rule.is_active,
          })),
        })),
        question_bank_package_links: questionBankPackageLinks.map((link) => ({
          ...(link.id ? { id: link.id } : {}),
          question_bank_package: link.question_bank_package,
          grant_mode: link.grant_mode,
          is_default: link.is_default,
          metadata: link.metadata ?? {},
          is_active: link.is_active,
        })),
      };

      const response = await fetch(
        editingId ? `/api/admin/economy/subscription-plans/${editingId}` : "/api/admin/economy/subscription-plans",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminSubscriptionPlan;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Subscription plan save failed with status ${response.status}`,
        );
      }

      if (body.data) {
        setPlans((current) => {
          const next = editingId
            ? current.map((item) => (item.id === body.data!.id ? body.data! : item))
            : [body.data!, ...current];
          return next.sort((a, b) => {
            if (a.institute_name !== b.institute_name) {
              return a.institute_name.localeCompare(b.institute_name);
            }
            return a.name.localeCompare(b.name);
          });
        });
      }

      setMessage(
        body.message ??
          (editingId ? "Subscription plan updated successfully." : "Subscription plan created successfully."),
      );
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save subscription plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Subscription Governance</span>
        <h3>Create and edit recurring plans, cycles, and credit rules</h3>
        <p className="academicSectionDescription">
          This governance lane controls the recurring-value path students see on the subscriptions surface, including
          cycle pricing and the star-credit rules that activate after truthful settlement.
        </p>

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}
        {lastApplyResult ? (
          <div className="featurePlaceholder">
            <strong>Last apply result</strong>
            <p>
              Plan {lastApplyResult.planCode} was last applied to {lastApplyResult.targetInstituteCode} on{" "}
              {formatDateTime(lastApplyResult.appliedAt)}.
            </p>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>Materialized entitlements</strong>
                  <span>
                    {lastApplyResult.entitlementCount} entitlement
                    {lastApplyResult.entitlementCount === 1 ? "" : "s"} created or refreshed from this apply action.
                  </span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{lastApplyResult.targetInstituteCode}</strong>
                  <span>Target institute</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Linked package codes</strong>
                  <span>
                    {lastApplyResult.questionBankPackageCodes.length > 0
                      ? lastApplyResult.questionBankPackageCodes.join(", ")
                      : "No package codes were returned by the apply response."}
                  </span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{lastApplyResult.planCode}</strong>
                  <span>Source plan</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="setupFormGrid setupFormGridDense">
          <label className="setupField">
            <span>Institute</span>
            <select value={instituteId} onChange={(event) => setInstituteId(event.target.value)}>
              {institutes.map((institute) => (
                <option key={institute.id} value={institute.id}>
                  {institute.name} ({institute.code}){institute.is_active ? "" : " - inactive"}
                </option>
              ))}
            </select>
          </label>
          <label className="setupField">
            <span>Plan name</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Plan code</span>
            <input type="text" value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <label className="setupField">
            <span>Active status</span>
            <select value={isActive ? "yes" : "no"} onChange={(event) => setIsActive(event.target.value === "yes")}>
              <option value="yes">Active</option>
              <option value="no">Paused</option>
            </select>
          </label>
        </div>

        <label className="setupField">
          <span>Description</span>
          <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>

        <div className="featurePlaceholder">
          <strong>Question-bank package access</strong>
          <p>Attach same-institute packages that should activate with this plan.</p>
          {questionBankPackageLinks.length > 0 ? (
            <p className="academicSectionDescription">
              Linked summary:{" "}
              {questionBankPackageLinks
                .map((link) => `${link.question_bank_package_code} (${titleCase(link.grant_mode)}${link.is_default ? " · default" : ""})`)
                .join(" · ")}
            </p>
          ) : null}
          <div className="weakTopicStack">
            {availablePackagesByFamily.length > 0 ? (
              availablePackagesByFamily.map(([familyLabel, familyPackages]) => (
                <section className="featurePlaceholder" key={familyLabel}>
                  <strong>{familyLabel} package family</strong>
                  <p>{familyPackages.length} active package lane{familyPackages.length === 1 ? "" : "s"} currently available for linking.</p>
                  <div className="weakTopicStack">
                    {familyPackages.map(({ pkg }) => {
                      const linkedPackage =
                        questionBankPackageLinks.find((link) => link.question_bank_package === pkg.id) ?? null;
                      return (
                        <div className="weakTopicRow" key={pkg.id}>
                          <div>
                            <label className="selectionRow">
                              <input
                                checked={Boolean(linkedPackage)}
                                onChange={(event) => toggleQuestionBankPackageLink(pkg, event.target.checked)}
                                type="checkbox"
                              />
                              <div>
                                <strong>{pkg.display_name || pkg.name}</strong>
                                <span>
                                  {pkg.code} · {pkg.institute_code}
                                </span>
                                <span>
                                  {pkg.commercial_labels.length > 0
                                    ? pkg.commercial_labels.join(" · ")
                                    : `${pkg.ownership_type.replaceAll("_", " ")} · ${pkg.access_mode.replaceAll("_", " ")}`}
                                </span>
                                <span>{pkg.coverage_summary}</span>
                                <span>{describeCoverageLabels(pkg)}</span>
                                {pkg.package_family_label ? <span>Family: {pkg.package_family_label}</span> : null}
                                {pkg.recommended_for_labels.length > 0 ? (
                                  <span>Recommended for: {pkg.recommended_for_labels.slice(0, 4).join(", ")}</span>
                                ) : null}
                              </div>
                            </label>
                          </div>
                          {linkedPackage ? (
                            <div className="setupFormGrid setupFormGridDense">
                              <label className="setupField">
                                <span>Grant mode</span>
                                <select
                                  value={linkedPackage.grant_mode}
                                  onChange={(event) =>
                                    updateQuestionBankPackageLink(pkg.id, { grant_mode: event.target.value })
                                  }
                                >
                                  <option value="included">Included</option>
                                  <option value="optional_addon">Optional Addon</option>
                                  <option value="trial">Trial</option>
                                </select>
                              </label>
                              <label className="setupField">
                                <span>Default link</span>
                                <select
                                  value={linkedPackage.is_default ? "yes" : "no"}
                                  onChange={(event) =>
                                    updateQuestionBankPackageLink(pkg.id, { is_default: event.target.value === "yes" })
                                  }
                                >
                                  <option value="yes">Yes</option>
                                  <option value="no">No</option>
                                </select>
                              </label>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              <p>No active question-bank packages are available for the selected institute yet.</p>
            )}
          </div>
        </div>

        <div className="weakTopicStack">
          {cycles.map((cycle, cycleIndex) => (
            <div className="featurePlaceholder" key={cycle.id ?? `cycle-${cycleIndex}`}>
              <strong>Cycle {cycleIndex + 1}</strong>
              <div className="setupFormGrid setupFormGridDense">
                <label className="setupField">
                  <span>Billing interval</span>
                  <select
                    value={cycle.billing_interval}
                    onChange={(event) => updateCycle(cycleIndex, { billing_interval: event.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label className="setupField">
                  <span>Interval count</span>
                  <input
                    min="1"
                    type="number"
                    value={cycle.interval_count}
                    onChange={(event) => updateCycle(cycleIndex, { interval_count: Number(event.target.value) })}
                  />
                </label>
                <label className="setupField">
                  <span>Price amount</span>
                  <input
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={cycle.price_amount}
                    onChange={(event) => updateCycle(cycleIndex, { price_amount: event.target.value })}
                  />
                </label>
                <label className="setupField">
                  <span>Currency</span>
                  <input
                    type="text"
                    value={cycle.currency}
                    onChange={(event) => updateCycle(cycleIndex, { currency: event.target.value.toUpperCase() })}
                  />
                </label>
                <label className="setupField">
                  <span>Cycle status</span>
                  <select
                    value={cycle.is_active ? "yes" : "no"}
                    onChange={(event) => updateCycle(cycleIndex, { is_active: event.target.value === "yes" })}
                  >
                    <option value="yes">Active</option>
                    <option value="no">Paused</option>
                  </select>
                </label>
              </div>

              <div className="weakTopicStack">
                {cycle.star_credit_rules.map((rule, ruleIndex) => (
                  <div className="weakTopicRow" key={rule.id ?? `rule-${cycleIndex}-${ruleIndex}`}>
                    <div className="setupFormGrid setupFormGridDense">
                      <label className="setupField">
                        <span>Stars credited</span>
                        <input
                          min="1"
                          type="number"
                          value={rule.stars_credited}
                          onChange={(event) =>
                            updateRule(cycleIndex, ruleIndex, { stars_credited: Number(event.target.value) })
                          }
                        />
                      </label>
                      <label className="setupField">
                        <span>Credit on activation</span>
                        <select
                          value={rule.credit_on_activation ? "yes" : "no"}
                          onChange={(event) =>
                            updateRule(cycleIndex, ruleIndex, { credit_on_activation: event.target.value === "yes" })
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </label>
                      <label className="setupField">
                        <span>Credit on renewal</span>
                        <select
                          value={rule.credit_on_renewal ? "yes" : "no"}
                          onChange={(event) =>
                            updateRule(cycleIndex, ruleIndex, { credit_on_renewal: event.target.value === "yes" })
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </label>
                      <label className="setupField">
                        <span>Rule status</span>
                        <select
                          value={rule.is_active ? "yes" : "no"}
                          onChange={(event) => updateRule(cycleIndex, ruleIndex, { is_active: event.target.value === "yes" })}
                        >
                          <option value="yes">Active</option>
                          <option value="no">Paused</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="resultCardActions">
                <button className="button buttonGhost" onClick={() => addRule(cycleIndex)} type="button">
                  Add Credit Rule
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="resultCardActions">
          <button className="button buttonGhost" onClick={addCycle} type="button">
            Add Cycle
          </button>
          <button className="button buttonPrimary" disabled={saving} onClick={() => void handleSubmit()} type="button">
            {saving ? "Saving..." : editingId ? "Update Subscription Plan" : "Create Subscription Plan"}
          </button>
          <button className="button buttonGhost" disabled={saving} onClick={resetForm} type="button">
            Clear Form
          </button>
        </div>

        <div className="weakTopicStack">
          {plans.map((plan) => (
            <div className="weakTopicRow" key={plan.id}>
              <div>
                <strong>{plan.name}</strong>
                <span>
                  {plan.institute_name} · {plan.code}
                </span>
                <span>
                  {plan.cycles.length} cycle{plan.cycles.length === 1 ? "" : "s"} · {plan.description || "No description"}
                </span>
                <span>
                  {plan.question_bank_package_links.length} question-bank package link
                  {plan.question_bank_package_links.length === 1 ? "" : "s"}
                </span>
                <span>Commercial lanes: {buildGrantModeSummary(plan)}</span>
                <span>Billing posture: {buildCycleSummary(plan)}</span>
                <span>
                  {(() => {
                    const framing = summarizePlanCommercialFraming(plan, questionBankPackagesById);
                    return `Package scope: ${framing.scopeSummary}`;
                  })()}
                </span>
                <span>
                  {(() => {
                    const framing = summarizePlanCommercialFraming(plan, questionBankPackagesById);
                    return `Families: ${framing.familySummary}`;
                  })()}
                </span>
                <span>
                  {(() => {
                    const framing = summarizePlanCommercialFraming(plan, questionBankPackagesById);
                    return `Recommended for: ${framing.recommendedSummary}`;
                  })()}
                </span>
                <span>Linked packages: {describeLinkedPackages(plan)}</span>
                {plan.question_bank_package_links.length > 0 ? (
                  <span>
                    Package coverage:{" "}
                    {plan.question_bank_package_links
                      .filter((link) => link.is_active)
                      .map((link) => {
                        const pkg = questionBankPackagesById.get(link.question_bank_package);
                        return pkg
                          ? `${pkg.code} - ${pkg.coverage_summary}`
                          : `${link.question_bank_package_code} - Coverage unavailable`;
                      })
                      .join(" · ")}
                  </span>
                ) : null}
                <span>Renewal posture: {describeRenewalPosture(plan)}</span>
                <span>
                  {(() => {
                    const reconciliation = getPlanEntitlementReconciliation(plan);
                    return `Entitlement reconciliation: ${describeReconciliationSummary(reconciliation)} (${reconciliation.instituteCode})`;
                  })()}
                </span>
                {(() => {
                  const reconciliation = getPlanEntitlementReconciliation(plan);
                  return reconciliation.missingPackageCodes.length > 0 ? (
                    <span>Missing active entitlements: {reconciliation.missingPackageCodes.join(", ")}</span>
                  ) : null;
                })()}
                {(() => {
                  const reconciliation = getPlanEntitlementReconciliation(plan);
                  return (
                    <span>
                      Remediation:{" "}
                      {describeRemediationGuidance(reconciliation)}
                    </span>
                  );
                })()}
                <span>Updated {formatDateTime(plan.updated_at)}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{plan.is_active ? "Active" : "Paused"}</strong>
                <label className="setupField">
                  <span>Apply to institute</span>
                  <select
                    aria-label={`Apply ${plan.name} to institute`}
                    value={getApplyInstituteId(plan)}
                    onChange={(event) =>
                      setApplyTargetInstituteByPlanId((current) => ({
                        ...current,
                        [plan.id]: event.target.value,
                      }))
                    }
                  >
                    {institutes
                      .filter((institute) => institute.is_active)
                      .map((institute) => (
                        <option key={institute.id} value={institute.id}>
                          {institute.name} ({institute.code})
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="button buttonGhost"
                  disabled={applyingPlanId === plan.id || plan.question_bank_package_links.length === 0}
                  onClick={() => void handleApplyPlanToInstitute(plan)}
                  type="button"
                >
                  {applyingPlanId === plan.id ? "Applying..." : "Apply Access"}
                </button>
                <button className="button buttonGhost" onClick={() => loadForEdit(plan)} type="button">
                  Edit
                </button>
              </div>
            </div>
          ))}
          {plans.length === 0 ? <p>No subscription plans exist yet.</p> : null}
        </div>
      </div>
    </article>
  );
}
