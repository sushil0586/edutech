"use client";

import { PendingButton } from "@/components/ui/pending-button";

type LogoutButtonProps = {
  className?: string;
  label?: string;
  pendingLabel?: string;
};

export function LogoutButton({
  className = "button buttonGhost",
  label = "Logout",
  pendingLabel = "Logging out...",
}: LogoutButtonProps) {
  return (
    <PendingButton
      className={className}
      idleLabel={label}
      pendingLabel={pendingLabel}
    />
  );
}
