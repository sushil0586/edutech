"use client";

import { useMemo, useState } from "react";

type RequestableSubscriptionPlan = {
  id: string;
  institute: string;
  institute_name: string;
  name: string;
  code: string;
  description: string;
  cycles: Array<{
    id: string;
    billing_interval: string;
    interval_count: number;
    price_amount: string;
    currency: string;
    is_active: boolean;
  }>;
  question_bank_package_links: Array<{
    id: string;
    question_bank_package_name: string;
    question_bank_package_code: string;
    question_bank_package_display_name: string;
    question_bank_package_family_label: string | null;
    question_bank_package_recommended_for_labels: string[];
    question_bank_package_commercial_labels: string[];
    question_bank_package_coverage_summary: string;
    grant_mode: string;
    is_default: boolean;
    is_active: boolean;
  }>;
};

type InstituteSubscriptionRequest = {
  id: string;
  subscription_plan_name: string;
  subscription_plan_code: string;
  subscription_cycle_label: string;
  status: string;
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
  reviewed_at: string | null;
  created_at: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not reviewed";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function describeGrantModeSummary(plan: RequestableSubscriptionPlan) {
  const counts = plan.question_bank_package_links
    .filter((link) => link.is_active)
    .reduce<Record<string, number>>((acc, link) => {
      const key = String(link.grant_mode || "included");
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  if (Object.keys(counts).length === 0) {
    return "No package lanes mapped yet.";
  }

  return Object.entries(counts)
    .map(([mode, count]) => `${titleCase(mode)} ${count}`)
    .join(" · ");
}

function describePackagePreview(plan: RequestableSubscriptionPlan) {
  const activeLinks = plan.question_bank_package_links.filter((link) => link.is_active);
  if (activeLinks.length === 0) {
    return "No package links";
  }
  return activeLinks
    .map((link) => `${link.question_bank_package_code} (${titleCase(link.grant_mode)}${link.is_default ? " · Default" : ""})`)
    .join(" · ");
}

function describeCyclePreview(plan: RequestableSubscriptionPlan) {
  const activeCycles = plan.cycles.filter((cycle) => cycle.is_active);
  if (activeCycles.length === 0) {
    return "No active cycle";
  }
  return activeCycles
    .map((cycle) => `${titleCase(cycle.billing_interval)} x ${cycle.interval_count} · ${cycle.currency} ${cycle.price_amount}`)
    .join(" · ");
}

function groupPlansByFamily(plans: RequestableSubscriptionPlan[]) {
  const grouped = new Map<string, RequestableSubscriptionPlan[]>();
  for (const plan of plans) {
    const families = [
      ...new Set(
        plan.question_bank_package_links
          .filter((link) => link.is_active)
          .map((link) => link.question_bank_package_family_label || "General")
      ),
    ];
    const familyLabel = families[0] || "General";
    const current = grouped.get(familyLabel) ?? [];
    current.push(plan);
    grouped.set(familyLabel, current);
  }
  return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right));
}

export function InstituteSubscriptionRequestWorkspace({
  plans,
  requests: initialRequests,
}: {
  plans: RequestableSubscriptionPlan[];
  requests: InstituteSubscriptionRequest[];
}) {
  const [workspaceView, setWorkspaceView] = useState<"all" | "plans" | "request" | "history">("request");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "pending" | "fulfilled" | "rejected">("all");
  const [rowsToShow, setRowsToShow] = useState<"4" | "8" | "12">("4");
  const [requests, setRequests] = useState(initialRequests);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedPlan = plans.find((plan) => plan.cycles.some((cycle) => cycle.id === selectedCycleId)) ?? null;
  const pendingRequests = requests.filter((request) => request.status === "pending");
  const fulfilledRequests = requests.filter((request) => request.status === "fulfilled");
  const rejectedRequests = requests.filter((request) => request.status === "rejected");
  const planFamilyGroups = useMemo(() => groupPlansByFamily(plans), [plans]);
  const filteredPlanFamilyGroups = useMemo(() => {
    if (familyFilter === "all") {
      return planFamilyGroups;
    }
    return planFamilyGroups.filter(([familyLabel]) => familyLabel === familyFilter);
  }, [familyFilter, planFamilyGroups]);
  const visibleRequests = useMemo(() => {
    const filtered =
      requestStatusFilter === "all"
        ? requests
        : requests.filter((request) => request.status === requestStatusFilter);
    return filtered.slice(0, Number(rowsToShow));
  }, [requestStatusFilter, requests, rowsToShow]);
  const visibleRequestCount =
    requestStatusFilter === "all"
      ? requests.length
      : requests.filter((request) => request.status === requestStatusFilter).length;
  const visiblePlanCount = filteredPlanFamilyGroups.reduce((sum, [, familyPlans]) => sum + familyPlans.length, 0);

  const cycleOptions = useMemo(
    () =>
      plans
        .filter((plan) => {
          if (familyFilter === "all") {
            return true;
          }
          return plan.question_bank_package_links.some(
            (link) => (link.question_bank_package_family_label || "General") === familyFilter,
          );
        })
        .flatMap((plan) =>
        plan.cycles
          .filter((cycle) => cycle.is_active)
          .map((cycle) => ({
            id: cycle.id,
            label: `${plan.name} · ${titleCase(cycle.billing_interval)} x ${cycle.interval_count} · ${cycle.currency} ${cycle.price_amount}`,
            packageSummary: describePackagePreview(plan),
            packageLaneSummary: describeGrantModeSummary(plan),
            cycleSummary: describeCyclePreview(plan),
          })),
      ),
    [familyFilter, plans],
  );

  async function handleSubmit() {
    if (!selectedCycleId) {
      setError("Select a subscription cycle before submitting the request.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/economy/institute-subscription-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription_plan_cycle: selectedCycleId,
          grant_modes: ["included", "trial"],
          notes,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        detail?: string;
        message?: string;
        data?: InstituteSubscriptionRequest;
      };
      if (!response.ok) {
        throw new Error(body.detail || `Request failed with status ${response.status}`);
      }
      if (body.data) {
        setRequests((current) => {
          const exists = current.some((entry) => entry.id === body.data!.id);
          return exists ? current.map((entry) => (entry.id === body.data!.id ? body.data! : entry)) : [body.data!, ...current];
        });
      }
      setMessage(body.message || "Subscription request submitted successfully.");
      setNotes("");
      setSelectedCycleId("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit the request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Package request workflow</span>
        <h3>Request question-bank subscription activation</h3>
        <p className="academicSectionDescription">
          This is the institute-to-platform handoff for paid or operator-approved package activation. Submit the plan request here, then track whether it was fulfilled or rejected.
        </p>

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

        <div className="setupFormGrid setupFormGridDense" style={{ marginBottom: 16 }}>
          <label className="setupField">
            <span>Workspace view</span>
            <select
              aria-label="Institute subscription workspace view"
              value={workspaceView}
              onChange={(event) =>
                setWorkspaceView(event.target.value as "all" | "plans" | "request" | "history")
              }
            >
              <option value="all">All sections</option>
              <option value="plans">Plan catalog only</option>
              <option value="request">Request form only</option>
              <option value="history">Request history only</option>
            </select>
          </label>
          <label className="setupField">
            <span>Plan family filter</span>
            <select
              aria-label="Plan family filter"
              value={familyFilter}
              onChange={(event) => setFamilyFilter(event.target.value)}
            >
              <option value="all">All families</option>
              {planFamilyGroups.map(([familyLabel]) => (
                <option key={familyLabel} value={familyLabel}>
                  {familyLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="setupField">
            <span>Request status filter</span>
            <select
              aria-label="Request status filter"
              value={requestStatusFilter}
              onChange={(event) =>
                setRequestStatusFilter(
                  event.target.value as "all" | "pending" | "fulfilled" | "rejected",
                )
              }
            >
              <option value="all">All requests</option>
              <option value="pending">Pending only</option>
              <option value="fulfilled">Fulfilled only</option>
              <option value="rejected">Rejected only</option>
            </select>
          </label>
          <label className="setupField">
            <span>Rows to show</span>
            <select
              aria-label="Request rows to show"
              value={rowsToShow}
              onChange={(event) => setRowsToShow(event.target.value as "4" | "8" | "12")}
            >
              <option value="4">4 rows</option>
              <option value="8">8 rows</option>
              <option value="12">12 rows</option>
            </select>
          </label>
        </div>

        <section className="resultsSummaryGrid" style={{ marginBottom: 16 }}>
          <article className="metricCard dashboardHeroCard">
            <span>Requestable plans</span>
            <strong>{cycleOptions.length}</strong>
            <small>Active requestable cycles in the current filter.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Pending requests</span>
            <strong>{pendingRequests.length}</strong>
            <small>Waiting for platform review.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Fulfilled requests</span>
            <strong>{fulfilledRequests.length}</strong>
            <small>Already converted into entitlements.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Rejected requests</span>
            <strong>{rejectedRequests.length}</strong>
            <small>Need a revised request or different plan.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Visible plan rows</span>
            <strong>{visiblePlanCount}</strong>
            <small>Requestable plans in the current family lens.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Visible request rows</span>
            <strong>{visibleRequestCount}</strong>
            <small>Requests matching the current status filter.</small>
          </article>
        </section>

        {plans.length > 0 && (workspaceView === "all" || workspaceView === "plans") ? (
          <div style={{ marginBottom: 16 }}>
            {filteredPlanFamilyGroups.slice(0, Number(rowsToShow)).map(([familyLabel, familyPlans]) => (
              <section className="featurePlaceholder" key={familyLabel} style={{ marginBottom: 12 }}>
                <strong>{familyLabel} plan family</strong>
                <p>{familyPlans.length} requestable plan{familyPlans.length === 1 ? "" : "s"} currently grouped here.</p>
                <div className="weakTopicStack">
                  {familyPlans.slice(0, Number(rowsToShow)).map((plan) => (
                    <div className="weakTopicRow" key={plan.id}>
                      <div>
                        <strong>{plan.name}</strong>
                        <span>{plan.code} · {describeCyclePreview(plan)}</span>
                        <span>What this plan unlocks: {describePackagePreview(plan)}</span>
                        <span>Commercial lanes: {describeGrantModeSummary(plan)}</span>
                        <span>
                          Recommendations: {[
                            ...new Set(
                              plan.question_bank_package_links
                                .flatMap((link) => link.question_bank_package_recommended_for_labels)
                                .filter(Boolean),
                            ),
                          ].slice(0, 4).join(", ") || "No recommendation tags configured"}
                        </span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{plan.cycles.filter((cycle) => cycle.is_active).length}</strong>
                        <span>{plan.question_bank_package_links.filter((link) => link.is_active).length} package lanes</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {workspaceView === "all" || workspaceView === "request" ? (
          <section className="featurePlaceholder economySubscriptionEditorPanel" style={{ marginBottom: 16 }}>
            <strong>Submit package activation request</strong>
            <p className="academicSectionDescription">
              Pick the exact commercial cycle first, then add a short operator-facing note so the platform team knows
              why this institute needs the package lane.
            </p>

            <div className="economyCompactStats">
              <span>{cycleOptions.length} requestable cycles in scope</span>
              <span>{selectedCycleId ? "Cycle selected" : "No cycle selected yet"}</span>
            </div>

            <div className="economyWorkspaceSplitGrid">
              <div className="economyFormSection">
                <div className="economyFormSectionHeader">
                  <strong>Request details</strong>
                  <span>Choose the cycle and capture the short commercial or academic reason for the request.</span>
                </div>
                <div className="setupFormGrid setupFormGridDense">
                  <label className="setupField">
                    <span>Requestable plan cycle</span>
                    <select
                      aria-label="Institute requestable plan cycle"
                      value={selectedCycleId}
                      onChange={(event) => setSelectedCycleId(event.target.value)}
                    >
                      <option value="">Select a plan cycle</option>
                      {cycleOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="setupField">
                    <span>Notes</span>
                    <input
                      aria-label="Institute subscription request notes"
                      placeholder="Why this institute needs the package lane"
                      type="text"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              {selectedCycleId ? (
                <div className="economyFormSection">
                  <div className="economyFormSectionHeader">
                    <strong>Selected plan preview</strong>
                    <span>Review exactly which package lanes, grant modes, and coverage you are requesting.</span>
                  </div>
                  <div className="featurePlaceholder" style={{ marginBottom: 0 }}>
                    <strong>What this plan unlocks</strong>
                    <p>{cycleOptions.find((option) => option.id === selectedCycleId)?.packageSummary}</p>
                    <p>{cycleOptions.find((option) => option.id === selectedCycleId)?.packageLaneSummary}</p>
                    <p>{cycleOptions.find((option) => option.id === selectedCycleId)?.cycleSummary}</p>
                    {selectedPlan?.description ? <p>{selectedPlan.description}</p> : null}
                    {selectedPlan?.question_bank_package_links.filter((link) => link.is_active).length ? (
                      <div className="weakTopicStack" style={{ marginTop: 12 }}>
                        {selectedPlan.question_bank_package_links
                          .filter((link) => link.is_active)
                          .slice(0, 6)
                          .map((link) => (
                            <div className="weakTopicRow" key={link.id}>
                              <div>
                                <strong>{link.question_bank_package_display_name || link.question_bank_package_name}</strong>
                                <span>{link.question_bank_package_commercial_labels.join(" · ")}</span>
                                <span>{link.question_bank_package_coverage_summary}</span>
                                {link.question_bank_package_family_label ? (
                                  <span>Family: {link.question_bank_package_family_label}</span>
                                ) : null}
                                {link.question_bank_package_recommended_for_labels.length > 0 ? (
                                  <span>Recommended for: {link.question_bank_package_recommended_for_labels.join(", ")}</span>
                                ) : null}
                              </div>
                              <div className="weakTopicMeta">
                                <strong>{titleCase(link.grant_mode)}</strong>
                                <span>{link.is_default ? "Default lane" : "Secondary lane"}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="economyEditorActionBar">
              <button
                className="button buttonPrimary"
                disabled={submitting || !selectedCycleId}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {submitting ? "Submitting..." : "Submit Subscription Request"}
              </button>
            </div>
          </section>
        ) : null}

        {workspaceView === "all" || workspaceView === "history" ? (
          <section className="featurePlaceholder" style={{ marginBottom: 0 }}>
            <strong>Request history</strong>
            <p>
              Track what was submitted, what was approved, and what still needs a revised request.
            </p>
            <div className="weakTopicStack" style={{ marginTop: 16 }}>
              {visibleRequests.length ? (
                visibleRequests.map((request) => (
                  <div className="weakTopicRow" key={request.id}>
                    <div>
                      <strong>{request.subscription_plan_name}</strong>
                      <span>
                        {request.subscription_plan_code} · {request.subscription_cycle_label}
                      </span>
                      <span>
                        Status: {titleCase(request.status)} · Grant modes: {request.grant_modes.map(titleCase).join(", ")}
                      </span>
                      {request.activation_summary.package_codes.length ? (
                        <span>
                          Package lanes: {request.activation_summary.package_codes.join(", ")}
                        </span>
                      ) : null}
                      {request.status === "fulfilled" ? (
                        <span>
                          Activation result: {request.activation_summary.entitlement_count} entitlement
                          {request.activation_summary.entitlement_count === 1 ? "" : "s"} activated
                        </span>
                      ) : null}
                      {request.status === "pending" ? (
                        <span>Pending approval: package access will appear after platform review is completed.</span>
                      ) : null}
                      {request.status === "rejected" ? (
                        <span>Rejected: review operator notes and resubmit with a clearer package or commercial requirement.</span>
                      ) : null}
                      {request.notes ? <span>Institute notes: {request.notes}</span> : null}
                      {request.operator_notes ? <span>Operator notes: {request.operator_notes}</span> : null}
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{titleCase(request.status)}</strong>
                      <span>{formatDate(request.reviewed_at || request.created_at)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="featurePlaceholder">
                  <p>No subscription requests match the current filter.</p>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
