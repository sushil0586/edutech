"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StudentIntegritySummary,
  StudentSecurityPolicy,
} from "@/features/dashboard/types";
import { StatusPill } from "@/components/ui/status-pill";

type IntegrityEventResponse = {
  success?: boolean;
  message?: string;
  data?: {
    event: {
      event_type: string;
      severity: string;
      counts_as_violation: boolean;
      event_at: string;
      metadata: Record<string, unknown>;
    };
    integrity_summary: StudentIntegritySummary;
    attempt_status: string;
    auto_submitted: boolean;
    duplicate: boolean;
  };
  error?: string;
};

function toneForPolicy(policy: StudentSecurityPolicy) {
  if (policy.violation_limit_enabled) return "danger" as const;
  if (policy.requires_fullscreen || policy.enhanced_monitoring) {
    return "warning" as const;
  }
  if (policy.tracks_focus_loss || policy.tracks_visibility_change) {
    return "demo" as const;
  }
  return "live" as const;
}

function labelForEvent(eventType: string | null | undefined) {
  if (!eventType) return "No integrity events yet";
  return eventType.replaceAll("_", " ");
}

function browserSupportsFullscreen() {
  if (typeof document === "undefined") return false;

  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  return Boolean(
    document.fullscreenEnabled ||
      root.requestFullscreen ||
      root.webkitRequestFullscreen,
  );
}

export function AttemptSecurityGuard({
  attemptId,
  attemptStatus,
  securityPolicy,
  initialIntegritySummary,
}: {
  attemptId: string;
  attemptStatus: string;
  securityPolicy: StudentSecurityPolicy;
  initialIntegritySummary: StudentIntegritySummary;
}) {
  const [integritySummary, setIntegritySummary] = useState(initialIntegritySummary);
  const [fullscreenPromptOpen, setFullscreenPromptOpen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const recentEventTimes = useRef<Record<string, number>>({});
  const lastFullscreenState = useRef(false);

  const monitoringEnabled = useMemo(
    () =>
      securityPolicy.requires_fullscreen ||
      securityPolicy.tracks_focus_loss ||
      securityPolicy.tracks_visibility_change ||
      securityPolicy.tracks_fullscreen_exit ||
      securityPolicy.violation_limit_enabled ||
      securityPolicy.enhanced_monitoring,
    [securityPolicy],
  );

  useEffect(() => {
    setFullscreenSupported(browserSupportsFullscreen());

    if (
      attemptStatus === "in_progress" &&
      securityPolicy.requires_fullscreen &&
      !document.fullscreenElement
    ) {
      setFullscreenPromptOpen(true);
      setNotice(
        "This attempt is paused at a security checkpoint until fullscreen mode is active.",
      );
      return;
    }

    setFullscreenPromptOpen(false);
  }, [attemptStatus, securityPolicy.requires_fullscreen]);

  const reportEvent = useCallback(async (
    eventType: string,
    metadata: Record<string, unknown> = {},
  ) => {
    const now = Date.now();
    const previous = recentEventTimes.current[eventType] ?? 0;
    if (now - previous < 2500) {
      return;
    }
    recentEventTimes.current[eventType] = now;

    try {
      const response = await fetch(
        `/api/student/attempts/${attemptId}/integrity-event`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_type: eventType,
            event_at: new Date().toISOString(),
            metadata,
          }),
        },
      );
      const payload = (await response.json()) as IntegrityEventResponse;
      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Integrity event rejected.");
      }

      if (payload.data?.integrity_summary) {
        setIntegritySummary(payload.data.integrity_summary);
      }

      if (payload.data?.auto_submitted || payload.data?.attempt_status !== "in_progress") {
        window.location.assign(
          `/app/attempts/${attemptId}/summary?notice=${encodeURIComponent("Attempt auto-submitted after integrity warning threshold was reached.")}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to sync integrity status right now.";
      setNotice(message);
    }
  }, [attemptId]);

  async function enterFullscreen() {
    try {
      const root = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      };

      if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      } else {
        throw new Error("Fullscreen API is unavailable.");
      }

      setFullscreenPromptOpen(false);
      setNotice(null);
    } catch {
      setNotice(
        "Fullscreen could not be entered automatically. Use your browser controls and try again.",
      );
    }
  }

  useEffect(() => {
    if (!monitoringEnabled || attemptStatus !== "in_progress") {
      return;
    }

    lastFullscreenState.current = Boolean(document.fullscreenElement);

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        securityPolicy.tracks_visibility_change
      ) {
        setNotice("Tab switch detected. Stay on the attempt screen to avoid integrity warnings.");
        reportEvent("visibility_hidden", {
          visibility_state: document.visibilityState,
        });
      }
    };

    const handleWindowBlur = () => {
      if (
        securityPolicy.tracks_focus_loss &&
        document.visibilityState === "visible"
      ) {
        setNotice("Focus loss detected. Return to the attempt screen and continue.");
        reportEvent("focus_lost", {
          visibility_state: document.visibilityState,
        });
      }
    };

    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      if (
        !inFullscreen &&
        lastFullscreenState.current &&
        securityPolicy.tracks_fullscreen_exit
      ) {
        setNotice("Fullscreen exited. Re-enter fullscreen to continue safely.");
        setFullscreenPromptOpen(true);
        reportEvent("fullscreen_exited", {
          had_fullscreen: true,
        });
      }
      if (inFullscreen && securityPolicy.requires_fullscreen) {
        setFullscreenPromptOpen(false);
        setNotice("Fullscreen active. You can continue the attempt.");
        if (!lastFullscreenState.current) {
          reportEvent("fullscreen_restored", {
            restored: true,
          });
        }
      }
      lastFullscreenState.current = inFullscreen;
    };

    const handleOffline = () => {
      if (securityPolicy.enhanced_monitoring) {
        setNotice("Connection lost. Keep this tab open while the session reconnects.");
        reportEvent("connection_lost", {
          online: false,
        });
      }
    };

    const handleOnline = () => {
      if (securityPolicy.enhanced_monitoring) {
        setNotice("Connection restored. Monitoring is active again.");
        reportEvent("connection_restored", {
          online: true,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [attemptStatus, monitoringEnabled, reportEvent, securityPolicy]);

  if (!monitoringEnabled || attemptStatus !== "in_progress") {
    return null;
  }

  return (
    <>
      <section className="dashboardPanel attemptSecurityBanner">
        <div className="attemptSecurityBannerText">
          <strong>{securityPolicy.student_label}</strong>
          <p>{notice ?? securityPolicy.student_warning_copy}</p>
          <small>
            Latest signal: {labelForEvent(integritySummary.latest_event?.event_type)}
          </small>
        </div>
        <div className="attemptSecurityBannerMeta">
          <StatusPill tone={toneForPolicy(securityPolicy)}>
            {securityPolicy.mode.replaceAll("_", " ")}
          </StatusPill>
          {integritySummary.violation_limit !== null ? (
            <StatusPill tone={integritySummary.threshold_reached ? "danger" : "warning"}>
              {integritySummary.violation_count} / {integritySummary.violation_limit} warnings
            </StatusPill>
          ) : null}
          {integritySummary.remaining_before_action !== null ? (
            <span className="attemptSecurityHint">
              {integritySummary.remaining_before_action} warnings remaining before action
            </span>
          ) : null}
          {securityPolicy.requires_fullscreen ? (
            <button className="button buttonSecondary" onClick={enterFullscreen} type="button">
              Enter Fullscreen
            </button>
          ) : null}
        </div>
      </section>

      {securityPolicy.requires_fullscreen && fullscreenPromptOpen ? (
        <div className="attemptSecurityOverlay" role="alertdialog" aria-modal="true">
          <div className="attemptSecurityOverlayCard">
            <div className="attemptSecurityOverlayEyebrow">Security checkpoint</div>
            <strong>Fullscreen required to continue</strong>
            <p>
              This attempt uses a fullscreen security policy. The workspace is
              intentionally paused until fullscreen mode is active so the session
              can resume safely.
            </p>
            <div className="attemptSecurityOverlayChecklist">
              <span>Stay on this tab while resuming the attempt.</span>
              <span>Avoid switching windows until the question screen is active.</span>
              <span>Warnings already recorded: {integritySummary.violation_count}</span>
            </div>
            <div className="attemptSecurityOverlayActions">
              <div className="attemptSecurityOverlayButtons">
                <button className="button buttonPrimary" onClick={enterFullscreen} type="button">
                  Enter Fullscreen
                </button>
                <Link className="button buttonSecondary" href="/app/exams">
                  Back to Exams
                </Link>
              </div>
              <span className="attemptSecurityHint">
                {fullscreenSupported
                  ? "If nothing happens, use the browser fullscreen control and return here."
                  : "This browser did not expose fullscreen controls for the app. Try Chrome, Edge, or Safari with fullscreen enabled."}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
