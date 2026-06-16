"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";

type AttemptCountdownProps = {
  initialSeconds: number | null;
  mode?: "text" | "pill";
};

function remainingTimeLabel(totalSeconds: number | null) {
  if (totalSeconds === null) return "Open-ended";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s left`;
  }

  return `${seconds}s left`;
}

function remainingTimeTone(totalSeconds: number | null) {
  if (totalSeconds === null) return "demo" as const;
  if (totalSeconds <= 300) return "danger" as const;
  if (totalSeconds <= 900) return "warning" as const;
  return "live" as const;
}

export function AttemptCountdown({
  initialSeconds,
  mode = "text",
}: AttemptCountdownProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [secondsRemaining]);

  const label = remainingTimeLabel(secondsRemaining);

  if (mode === "pill") {
    return <StatusPill tone={remainingTimeTone(secondsRemaining)}>{label}</StatusPill>;
  }

  return <>{label}</>;
}
