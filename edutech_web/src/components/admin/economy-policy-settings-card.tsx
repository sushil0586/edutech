"use client";

import { useState } from "react";

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

export function EconomyPolicySettingsCard({
  initialConfig,
  initialAuditHistory,
}: {
  initialConfig: EconomyPolicyConfig | null;
  initialAuditHistory: EconomyPolicyAuditEntry[];
}) {
  const [canGrantStars, setCanGrantStars] = useState(initialConfig?.institute_admin_can_grant_stars ?? true);
  const [maxGrantStars, setMaxGrantStars] = useState(
    String(initialConfig?.institute_admin_max_grant_stars ?? 250),
  );
  const [canConfirmOrders, setCanConfirmOrders] = useState(
    initialConfig?.institute_admin_can_confirm_orders ?? true,
  );
  const [maxConfirmAmount, setMaxConfirmAmount] = useState(
    initialConfig?.institute_admin_max_confirm_order_amount ?? "5000.00",
  );
  const [currency] = useState(initialConfig?.institute_admin_confirm_order_currency ?? "INR");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [latestAudit, setLatestAudit] = useState(initialConfig?.latest_audit ?? null);
  const [auditHistory, setAuditHistory] = useState<EconomyPolicyAuditEntry[]>(initialAuditHistory);

  function formatDateTime(value: string | null) {
    if (!value) return "Not available";
    try {
      return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/economy/policy-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute_admin_can_grant_stars: canGrantStars,
          institute_admin_max_grant_stars: Number(maxGrantStars),
          institute_admin_can_confirm_orders: canConfirmOrders,
          institute_admin_max_confirm_order_amount: maxConfirmAmount,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: EconomyPolicyConfig;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Policy save failed with status ${response.status}`,
        );
      }

      setMessage(body.message ?? "Economy operator policy updated successfully.");
      const latestAuditEntry = body.data?.latest_audit;
      if (latestAuditEntry !== undefined) {
        setLatestAudit(latestAuditEntry ?? null);
        if (latestAuditEntry) {
          setAuditHistory((current) => {
            const changedFields = (latestAuditEntry.metadata?.changed_fields ??
              {}) as Record<string, { before: unknown; after: unknown }>;
            const nextEntry: EconomyPolicyAuditEntry = {
              id: latestAuditEntry.id,
              user: latestAuditEntry.user,
              user_label: latestAuditEntry.user_label,
              action: latestAuditEntry.action,
              entity_type: "economy_operator_policy_config",
              entity_id: initialConfig?.id ?? "",
              message: latestAuditEntry.message,
              metadata: { changed_fields: changedFields },
              created_at: latestAuditEntry.created_at,
            };
            const withoutCurrent = current.filter((entry) => entry.id !== nextEntry.id);
            return [nextEntry, ...withoutCurrent].slice(0, 20);
          });
        }
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save economy policy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Economy Policy</span>
        <h3>Institute-admin support limits</h3>
        <p className="academicSectionDescription">
          Use this platform-owned control to decide how much institute admins can do in the economy support lane
          without giving them catalog governance powers.
        </p>

        {latestAudit ? (
          <div className="featurePlaceholder">
            <p>
              Last updated by {latestAudit.user_label || "Unknown user"} on {formatDateTime(latestAudit.created_at)}.
            </p>
          </div>
        ) : null}

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

        <div className="setupFormGrid setupFormGridDense">
          <label className="setupField">
            <span>Institute admin can grant stars</span>
            <select
              value={canGrantStars ? "yes" : "no"}
              onChange={(event) => setCanGrantStars(event.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="setupField">
            <span>Max stars per grant</span>
            <input
              min="1"
              type="number"
              value={maxGrantStars}
              onChange={(event) => setMaxGrantStars(event.target.value)}
            />
          </label>
          <label className="setupField">
            <span>Institute admin can confirm orders</span>
            <select
              value={canConfirmOrders ? "yes" : "no"}
              onChange={(event) => setCanConfirmOrders(event.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="setupField">
            <span>Max order amount ({currency})</span>
            <input
              min="0.01"
              step="0.01"
              type="number"
              value={maxConfirmAmount}
              onChange={(event) => setMaxConfirmAmount(event.target.value)}
            />
          </label>
        </div>

        <div className="resultCardActions">
          <button className="button buttonPrimary" disabled={saving} onClick={() => void handleSave()} type="button">
            {saving ? "Saving..." : "Save Economy Policy"}
          </button>
        </div>

        <div className="featurePlaceholder">
          <strong>Policy history</strong>
          {auditHistory.length > 0 ? (
            <div className="weakTopicStack">
              {auditHistory.slice(0, 5).map((entry) => {
                const changedFieldNames = Object.keys(entry.metadata?.changed_fields ?? {});
                return (
                  <div className="weakTopicRow" key={entry.id}>
                    <div>
                      <strong>{entry.user_label || "Unknown user"}</strong>
                      <span>{entry.message}</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{formatDateTime(entry.created_at)}</strong>
                      <span>
                        {changedFieldNames.length > 0
                          ? `Changed: ${changedFieldNames.join(", ")}`
                          : "No field delta captured"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No policy changes have been recorded yet.</p>
          )}
        </div>
      </div>
    </article>
  );
}
