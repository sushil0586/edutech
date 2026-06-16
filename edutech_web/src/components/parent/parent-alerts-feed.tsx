"use client";

import { useState, useTransition } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ParentAlert } from "@/lib/api/parent";
import { formatDateTime, titleCaseLabel } from "@/lib/parent/formatters";

type AlertActionStatus = "read" | "resolved" | "dismissed";

export function ParentAlertsFeed({
  initialAlerts,
}: {
  initialAlerts: ParentAlert[];
}) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
          current.map((alert) => (alert.id === updatedAlert.id ? updatedAlert : alert)),
        );
        setMessage(`Alert marked as ${titleCaseLabel(status)}.`);
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

  return (
    <div className="weakTopicStack">
      {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

      {alerts.length ? (
        alerts.map((alert) => {
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
        })
      ) : (
        <p className="emptyText">No alerts are currently available for the selected family scope.</p>
      )}
    </div>
  );
}
