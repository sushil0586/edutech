"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "Not reviewed";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function EconomyInstituteSubscriptionRequestCard({
  initialRequests,
}: {
  initialRequests: InstituteSubscriptionRequest[];
}) {
  const router = useRouter();
  const [queueView, setQueueView] = useState<"pending" | "fulfilled" | "rejected" | "all">("pending");
  const [rowsToShow, setRowsToShow] = useState<"4" | "8" | "12">("8");
  const [requests, setRequests] = useState(initialRequests);
  const [busyRequestId, setBusyRequestId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const fulfilledRequests = requests.filter((request) => request.status === "fulfilled");
  const rejectedRequests = requests.filter((request) => request.status === "rejected");
  const visiblePendingRequests = pendingRequests.slice(0, Number(rowsToShow));
  const visibleFulfilledRequests = fulfilledRequests.slice(0, Number(rowsToShow));
  const visibleRejectedRequests = rejectedRequests.slice(0, Number(rowsToShow));
  const visibleGroupCount =
    queueView === "all"
      ? [pendingRequests.length, fulfilledRequests.length, rejectedRequests.length].filter((count) => count > 0)
          .length
      : 1;
  const visibleRowCount =
    queueView === "pending"
      ? pendingRequests.length
      : queueView === "fulfilled"
        ? fulfilledRequests.length
        : queueView === "rejected"
          ? rejectedRequests.length
          : requests.length;

  function renderRequestRow(request: InstituteSubscriptionRequest) {
    const isBusy = busyRequestId === request.id;
    const isPending = request.status === "pending";
    return (
      <div className="weakTopicRow economySupportRequestRow" key={request.id}>
        <div className="economySupportRequestMain">
          <strong>
            {request.institute_name} ({request.institute_code}) · {request.subscription_plan_name}
          </strong>
          <span>
            {request.subscription_plan_code} · {request.subscription_cycle_label} · {titleCase(request.status)}
          </span>
          <span>
            Requested by {request.requested_by_label || "Unknown operator"} · Grant modes:{" "}
            {request.grant_modes.map(titleCase).join(", ")}
          </span>
          {request.activation_summary.package_codes.length ? (
            <span>Package lanes: {request.activation_summary.package_codes.join(", ")}</span>
          ) : null}
          {request.notes ? <span>Institute notes: {request.notes}</span> : null}
          {request.operator_notes ? <span>Operator notes: {request.operator_notes}</span> : null}
          {request.status === "fulfilled" ? (
            <span>
              Activation result: {request.activation_summary.entitlement_count} entitlement
              {request.activation_summary.entitlement_count === 1 ? "" : "s"} activated
            </span>
          ) : null}
        </div>
        <div className="weakTopicMeta economySupportRequestMeta">
          <strong>{titleCase(request.status)}</strong>
          <span>{formatDateLabel(request.reviewed_at || request.created_at)}</span>
          {isPending ? (
            <div className="resultCardActions economySupportRequestActions">
              <button
                className="button buttonPrimary"
                disabled={isBusy}
                onClick={() => void reviewRequest(request.id, "approve")}
                type="button"
              >
                {isBusy ? "Updating..." : "Approve"}
              </button>
              <button
                className="button buttonSecondary"
                disabled={isBusy}
                onClick={() => void reviewRequest(request.id, "reject")}
                type="button"
              >
                Reject
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderRequestGroup(
    title: string,
    description: string,
    groupRequests: InstituteSubscriptionRequest[],
    emptyLabel: string,
  ) {
    return (
      <section className="economySupportRequestGroup">
        <div className="economyFormSectionHeader">
          <h4>{title}</h4>
          <span>{description}</span>
        </div>
        {groupRequests.length ? (
          <div className="weakTopicStack">{groupRequests.map((request) => renderRequestRow(request))}</div>
        ) : (
          <div className="featurePlaceholder economySupportEmptyState">
            <p>{emptyLabel}</p>
          </div>
        )}
      </section>
    );
  }

  async function reviewRequest(requestId: string, decision: "approve" | "reject") {
    setBusyRequestId(requestId);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/economy/institute-subscription-requests/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          operator_notes:
            decision === "approve"
              ? "Approved from platform economy workflow."
              : "Rejected from platform economy workflow.",
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
        setRequests((current) =>
          current.map((entry) => (entry.id === body.data!.id ? body.data! : entry)),
        );
      }
      setMessage(
        body.message ||
          (decision === "approve"
            ? "Subscription request approved and entitlements applied."
            : "Subscription request rejected."),
      );
      router.refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review the request.");
    } finally {
      setBusyRequestId("");
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Workflow gap closed</span>
        <h3>Institute subscription request queue</h3>
        <p className="academicSectionDescription">
          Institutes can now request package-backed plans, and platform operators can approve or reject those requests here without leaving the economy workspace.
        </p>

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

        <div className="setupFormGrid setupFormGridDense" style={{ marginBottom: 16 }}>
          <label className="setupField">
            <span>Queue view</span>
            <select
              aria-label="Institute subscription request queue view"
              value={queueView}
              onChange={(event) =>
                setQueueView(event.target.value as "pending" | "fulfilled" | "rejected" | "all")
              }
            >
              <option value="pending">Pending only</option>
              <option value="fulfilled">Fulfilled only</option>
              <option value="rejected">Rejected only</option>
              <option value="all">All queues</option>
            </select>
          </label>
          <label className="setupField">
            <span>Rows to show</span>
            <select
              aria-label="Institute subscription request rows to show"
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
            <span>Pending requests</span>
            <strong>{pendingRequests.length}</strong>
            <small>Waiting for platform review.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Fulfilled requests</span>
            <strong>{fulfilledRequests.length}</strong>
            <small>Converted into package entitlements.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Rejected requests</span>
            <strong>{rejectedRequests.length}</strong>
            <small>Closed without activation.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Visible queue groups</span>
            <strong>{visibleGroupCount}</strong>
            <small>How many queues are shown in this view.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Visible rows in current view</span>
            <strong>{visibleRowCount}</strong>
            <small>Before row trimming is applied.</small>
          </article>
        </section>

        <div className="economySupportRequestStack">
          {requests.length ? (
            <>
              {queueView === "pending" || queueView === "all"
                ? renderRequestGroup(
                    "Pending requests",
                    "Requests waiting for platform approval or rejection.",
                    visiblePendingRequests,
                    "No pending requests are visible right now.",
                  )
                : null}
              {queueView === "fulfilled" || queueView === "all"
                ? renderRequestGroup(
                    "Fulfilled requests",
                    "Requests that already converted into package-backed access.",
                    visibleFulfilledRequests,
                    "No fulfilled requests are visible right now.",
                  )
                : null}
              {queueView === "rejected" || queueView === "all"
                ? renderRequestGroup(
                    "Rejected requests",
                    "Requests that were closed without activation.",
                    visibleRejectedRequests,
                    "No rejected requests are visible right now.",
                  )
                : null}
            </>
          ) : (
            <div className="featurePlaceholder">
              <p>No institute subscription requests are visible yet.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
