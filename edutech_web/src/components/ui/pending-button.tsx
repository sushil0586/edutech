"use client";

import { useFormStatus } from "react-dom";

type PendingButtonProps = {
  className: string;
  idleLabel: string;
  pendingLabel: string;
  disabled?: boolean;
};

export function PendingButton({
  className,
  idleLabel,
  pendingLabel,
  disabled = false,
}: PendingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={disabled || pending} type="submit">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
