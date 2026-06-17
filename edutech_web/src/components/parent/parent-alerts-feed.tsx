"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import type { ParentAlert } from "@/lib/api/parent";
import type { ParentAlertGroup, ParentAlertStatusFilter } from "@/lib/parent/alerts";
import { groupParentAlerts } from "@/lib/parent/alerts";
import { formatDateTime, titleCaseLabel } from "@/lib/parent/formatters";

type AlertActionStatus = "read" | "resolved" | "dismissed";
type BulkActionScope = "page" | "matching";

export function ParentAlertsFeed({
  initialAlerts,
  statusFilter,
  groupBy,
  childId,
  severity,
  alertType,
  search,
}: {
  initialAlerts: ParentAlert[];
  statusFilter: ParentAlertStatusFilter;
  groupBy: ParentAlertGroup;
  childId?: string;
  severity: string;
  alertType: string;
  search: string;
}) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const groupedAlerts = useMemo(() => groupParentAlerts(alerts, groupBy), [alerts, groupBy]);

  function updateAlertStatus(alertId: string, status: AlertActionStatus) {
    setError("");
    setMessage("");
    setPendingAlertId(alertId);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/parent/alerts/${alertId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        const payload = (await response.json().catch(() => ({}))) as
          | ParentAlert
          | { detail?: string };

        if (!response.ok) {
          throw new Error(
            "detail" in payload && typeof payload.detail === "string"
              ? payload.detail
              : "Unable to update this alert right now.",
          );
        }

        const updatedAlert = payload as ParentAlert;
        setAlerts((current) =>
          current
            .map((alert) => (alert.id === updatedAlert.id ? updatedAlert : alert))
            .filter((alert) => statusFilter === "all" || alert.status === statusFilter),
        );
        setMessage(`Alert marked as ${titleCaseLabel(status)}.`);
        router.refresh();
      } catch (updateError) {
        setError(
          updateError instanceof Error && updateError.message
            ? updateError.message
            : "Unable to update this alert right now.",
        );
      } finally {
        setPendingAlertId(null);
      }
    });
  }

  function markAllRead(scope: BulkActionScope) {
    if (!alerts.some((alert) => alert.status === "new")) {
      return;
    }

    const snapshot = alerts;
    setError("");
    setMessage("");
    setPendingAlertId("all");
    setAlerts((current) =>
      current
        .map((alert) =>
          alert.status === "new"
            ? {
                ...alert,
                status: "read",
                read_at: alert.read_at ?? new Date().toISOString(),
              }
            : alert,
        )
        .filter((alert) => statusFilter === "all" || alert.status === statusFilter),
    );

    startTransition(async () => {
      try {
        const response = await fetch("/api/parent/alerts/mark-all-read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            child_id: childId,
            severity,
            alert_type: alertType,
            search,
            scope,
            alert_ids: scope === "page" ? alerts.map((alert) => alert.id) : undefined,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          updated_count?: number;
          detail?: string;
        };

        if (!response.ok) {
          throw new Error(payload.detail || "Unable to mark all visible alerts as read.");
        }

        setMessage(
          `${payload.updated_count ?? 0} alerts marked as read ${scope === "page" ? "on this page" : "in this result set"}.`,
        );
        router.refresh();
      } catch (updateError) {
        setAlerts(snapshot);
        setError(
          updateError instanceof Error && updateError.message
            ? updateError.message
            : "Unable to mark all visible alerts as read.",
        );
      } finally {
        setPendingAlertId(null);
      }
    });
  }

  return (
    <div className="weakTopicStack">
      {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}
      <div className="workspaceFilterActions">
        <button
          className="button buttonPrimary"
          disabled={isPending || !alerts.some((alert) => alert.status === "new")}
          onClick={() => markAllRead("page")}
          type="button"
        >
          Mark Page Read
        </button>
        <button
          className="button buttonSecondary"
          disabled={isPending || !alerts.some((alert) => alert.status === "new")}
          onClick={() => markAllRead("matching")}
          type="button"
        >
          Mark Matching Read
        </button>
      </div>

      {alerts.length ? (
        groupedAlerts.map((group) => (
          <section className="workspaceResultsGroup" key={group.label}>
            {groupBy !== "none" ? (
              <div className="sectionHeading">
                <strong>{titleCaseLabel(group.label)}</strong>
                <span>{group.items.length} alerts</span>
              </div>
            ) : null}
            <div className="weakTopicStack">
              {group.items.map((alert) => {
                const disabled = isPending && pendingAlertId === alert.id;

                return (
                  <div className="weakTopicRow" key={alert.id}>
                    <div>
                      <strong>{alert.title}</strong>
                      <span>
                        {alert.student_name} · {titleCaseLabel(alert.alert_type)} · {titleCaseLabel(alert.relationship_type)}
                      </span>
                      <span>{alert.message}</span>
                      <span>
                        Status: {titleCaseLabel(alert.status)} · Created {formatDateTime(alert.created_at)}
                      </span>
                    </div>
                    <div className="weakTopicMeta">
                      <StatusPill
                        tone={
                          alert.severity === "high"
                            ? "danger"
                            : alert.severity === "warning"
                              ? "warning"
                              : "default"
                        }
                      >
                        {titleCaseLabel(alert.severity)}
                      </StatusPill>
                      <div className="resultCardActions">
                        {alert.status === "new" ? (
                          <button
                            className="button buttonGhost"
                            disabled={disabled}
                            onClick={() => updateAlertStatus(alert.id, "read")}
                            type="button"
                          >
                            Mark Read
                          </button>
                        ) : null}
                        {alert.status !== "resolved" ? (
                          <button
                            className="button buttonSecondary"
                            disabled={disabled}
                            onClick={() => updateAlertStatus(alert.id, "resolved")}
                            type="button"
                          >
                            Resolve
                          </button>
                        ) : null}
                        {alert.status !== "dismissed" ? (
                          <button
                            className="button buttonGhost"
                            disabled={disabled}
                            onClick={() => updateAlertStatus(alert.id, "dismissed")}
                            type="button"
                          >
                            Dismiss
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <p className="emptyText">No alerts are currently available for the selected family scope.</p>
      )}
    </div>
  );
}
