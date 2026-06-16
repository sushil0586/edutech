"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LiveMonitorRefresh({
  intervalSeconds = 20,
}: {
  intervalSeconds?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const refreshNow = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastRefreshedAt(new Date());
    });
  }, [router]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      refreshNow();
    }, intervalSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [autoRefreshEnabled, intervalSeconds, refreshNow]);

  return (
    <div className="liveMonitorRefreshBar">
      <div>
        <strong>Live monitor refresh</strong>
        <p>
          {autoRefreshEnabled
            ? `Auto-refreshing every ${intervalSeconds} seconds for live invigilation updates.`
            : "Auto-refresh is paused. Refresh manually when you want the latest attempt state."}
        </p>
        <small>
          {lastRefreshedAt
            ? `Last refreshed at ${lastRefreshedAt.toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}`
            : "Waiting for first refresh cycle."}
        </small>
      </div>
      <div className="resultCardActions">
        <button
          className="button buttonGhost"
          onClick={() => setAutoRefreshEnabled((value) => !value)}
          type="button"
        >
          {autoRefreshEnabled ? "Pause Auto Refresh" : "Resume Auto Refresh"}
        </button>
        <button
          className="button buttonSecondary"
          disabled={isPending}
          onClick={refreshNow}
          type="button"
        >
          {isPending ? "Refreshing..." : "Refresh Now"}
        </button>
      </div>
    </div>
  );
}
