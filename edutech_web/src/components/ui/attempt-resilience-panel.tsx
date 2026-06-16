"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ATTEMPT_ACTION_EVENT,
  ATTEMPT_ACTION_STATUS_KEY,
} from "@/components/ui/attempt-action-form";
import { StatusPill } from "@/components/ui/status-pill";
type SyncState =
  | "idle"
  | "saving"
  | "switching"
  | "submitting"
  | "saved"
  | "reconnected"
  | "attention";

type PendingActionStatus = {
  attemptId: string;
  actionKind: "save" | "section-switch" | "submit";
  detail: string;
  submittedAt: string;
};

function readPendingActionStatus() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawPendingStatus = window.sessionStorage.getItem(
    ATTEMPT_ACTION_STATUS_KEY,
  );
  if (!rawPendingStatus) {
    return null;
  }

  try {
    return JSON.parse(rawPendingStatus) as PendingActionStatus;
  } catch {
    window.sessionStorage.removeItem(ATTEMPT_ACTION_STATUS_KEY);
    return null;
  }
}

function statusToneForConnection(isOnline: boolean) {
  return isOnline ? ("live" as const) : ("danger" as const);
}

function syncTone(state: SyncState) {
  if (state === "saving" || state === "switching" || state === "submitting") {
    return "warning" as const;
  }
  if (state === "saved") return "live" as const;
  if (state === "reconnected") return "warning" as const;
  if (state === "attention") return "danger" as const;
  return "demo" as const;
}

function formatTime(value: string | null) {
  if (!value) return "No confirmed sync yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No confirmed sync yet";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AttemptResiliencePanel({
  initialAction,
  initialConfirmedAt,
  initialConfirmedSavedAt,
  attemptId,
  initialLastSavedAt,
  initialNotice,
  initialError,
}: {
  initialAction?: string;
  initialConfirmedAt: string | null;
  initialConfirmedSavedAt: string | null;
  attemptId: string;
  initialLastSavedAt: string | null;
  initialNotice?: string;
  initialError?: string;
}) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof window === "undefined" ? true : window.navigator.onLine,
  );
  const [pendingActionDetail, setPendingActionDetail] = useState<string | null>(null);
  const [lastSavedAt] = useState(
    initialConfirmedSavedAt ?? initialLastSavedAt,
  );
  const [lastConfirmedAt] = useState(
    initialNotice
      ? initialConfirmedAt ?? initialConfirmedSavedAt ?? initialLastSavedAt
      : initialConfirmedAt ?? initialConfirmedSavedAt ?? initialLastSavedAt,
  );
  const [lastConfirmedLabel] = useState<string | null>(
    initialNotice
      ? initialAction === "save"
        ? "Response updated successfully"
        : initialAction === "section-switch"
          ? "Section switched successfully"
          : initialNotice
      : null,
  );
  const [syncState, setSyncState] = useState<SyncState>(() => {
    if (initialError) return "attention";
    if (initialNotice) return "saved";
    return initialLastSavedAt ? "saved" : "idle";
  });

  useEffect(() => {
    const pendingStatus = readPendingActionStatus();
    const matchingPendingStatus =
      pendingStatus && pendingStatus.attemptId === attemptId ? pendingStatus : null;

    if (!matchingPendingStatus) {
      return;
    }

    setPendingActionDetail(matchingPendingStatus.detail);

    if (initialError || initialNotice) {
      return;
    }

    const ageMs = Date.now() - new Date(matchingPendingStatus.submittedAt).getTime();
    if (ageMs > 15000) {
      setSyncState("attention");
      return;
    }

    if (matchingPendingStatus.actionKind === "submit") {
      setSyncState("submitting");
      return;
    }

    if (matchingPendingStatus.actionKind === "section-switch") {
      setSyncState("switching");
      return;
    }

    setSyncState("saving");
  }, [attemptId, initialError, initialLastSavedAt, initialNotice]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOffline = () => {
      setIsOnline(false);
      setSyncState("attention");
    };

    const handleOnline = () => {
      setIsOnline(true);
      setSyncState((previous) =>
        previous === "attention" ? "reconnected" : previous,
      );
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handleActionEvent(event: Event) {
      const customEvent = event as CustomEvent<PendingActionStatus>;
      const payload = customEvent.detail;

      if (!payload || payload.attemptId !== attemptId) {
        return;
      }

      setPendingActionDetail(payload.detail);
      if (payload.actionKind === "submit") {
        setSyncState("submitting");
        return;
      }
      if (payload.actionKind === "section-switch") {
        setSyncState("switching");
        return;
      }
      setSyncState("saving");
    }

    window.addEventListener(ATTEMPT_ACTION_EVENT, handleActionEvent);

    return () => {
      window.removeEventListener(ATTEMPT_ACTION_EVENT, handleActionEvent);
    };
  }, [attemptId]);

  const guidance = useMemo(() => {
    if (!isOnline) {
      return "Connection lost. Keep this tab open. Do not close the browser, and wait for connectivity before trying to submit.";
    }
    if (syncState === "submitting") {
      return pendingActionDetail
        ? `${pendingActionDetail} is in progress. Stay on this page until the summary opens.`
        : "Submission is in progress. Stay on this page until the summary opens.";
    }
    if (syncState === "switching") {
      return pendingActionDetail
        ? `${pendingActionDetail} is in progress. Wait for the next section to load before clicking again.`
        : "Section switching is in progress. Wait for the next section to load before clicking again.";
    }
    if (syncState === "saving") {
      return pendingActionDetail
        ? `${pendingActionDetail} is in progress. Keep this tab open while the backend confirms it.`
        : "A response save is in progress. Keep this tab open while the backend confirms it.";
    }
    if (syncState === "reconnected") {
      return "Connection restored. Review the last saved time before continuing or submitting.";
    }
    if (syncState === "attention") {
      return pendingActionDetail
        ? `${pendingActionDetail} may have been interrupted. Review the banner message above, then retry if needed.`
        : "The latest action needs attention. Review the banner messages above before moving on.";
    }
    if (syncState === "saved") {
      return "Your latest confirmed sync reached the backend. Continue steadily and use Save Answer after changes.";
    }
    return "Save regularly during the attempt so the workspace can confirm your latest synced state.";
  }, [isOnline, pendingActionDetail, syncState]);

  const recoveryTitle =
    syncState === "attention"
      ? "Action needs recovery"
      : syncState === "reconnected"
        ? "Connection restored"
        : null;

  const recoveryBody =
    syncState === "attention"
      ? pendingActionDetail
        ? `${pendingActionDetail} has not been confirmed by the backend yet. Review the message above the workspace, then retry the same action once the connection is stable.`
        : "The latest action has not been confirmed by the backend yet. Review the workspace message and retry carefully."
      : syncState === "reconnected"
        ? "Your connection is back. Compare the last confirmed backend response with the answer you were editing before continuing."
        : null;

  const syncLabel =
    syncState === "saving"
      ? "Saving..."
      : syncState === "switching"
        ? "Switching..."
        : syncState === "submitting"
          ? "Submitting..."
          : syncState === "saved"
      ? "Synced"
      : syncState === "reconnected"
        ? "Reconnected"
        : syncState === "attention"
          ? "Needs attention"
          : "Waiting for first save";

  return (
    <section className="dashboardPanel attemptResiliencePanel">
      <div className="attemptResilienceTop">
        <div>
          <strong>Save & Recovery Status</strong>
          <p>{guidance}</p>
        </div>
        <div className="attemptResilienceMeta">
          <StatusPill tone={statusToneForConnection(isOnline)}>
            {isOnline ? "Online" : "Offline"}
          </StatusPill>
          <StatusPill tone={syncTone(syncState)}>{syncLabel}</StatusPill>
        </div>
      </div>

      <div className="attemptStatusGrid">
        <div className="attemptStatusTile">
          <span>Last confirmed backend response</span>
          <strong>{formatTime(lastConfirmedAt)}</strong>
        </div>
        <div className="attemptStatusTile">
          <span>Last saved answer</span>
          <strong>{formatTime(lastSavedAt)}</strong>
        </div>
        <div className="attemptStatusTile">
          <span>Current action</span>
          <strong>{pendingActionDetail ?? "No action currently in flight"}</strong>
        </div>
        <div className="attemptStatusTile">
          <span>Last confirmed action</span>
          <strong>{lastConfirmedLabel ?? "No confirmed action yet"}</strong>
        </div>
        <div className="attemptStatusTile">
          <span>Recovery guidance</span>
          <strong>
            {isOnline
              ? syncState === "attention"
                ? "Retry the last step only after the banner confirms what happened."
                : "You can continue working and save again at any time."
              : "Avoid refreshing or closing the tab until the network returns."}
          </strong>
        </div>
        <div className="attemptStatusTile">
          <span>Submit fallback</span>
          <strong>
            If submit fails, stay on the page and retry after confirming the connection.
          </strong>
        </div>
      </div>

      {recoveryTitle && recoveryBody ? (
        <div className="attemptRecoveryBanner" role="status">
          <strong>{recoveryTitle}</strong>
          <p>{recoveryBody}</p>
        </div>
      ) : null}
    </section>
  );
}
