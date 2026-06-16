"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type ActionSubmitButtonProps = {
  className: string;
  idleLabel: string;
  pendingLabel: string;
  disabled?: boolean;
  actionLabel?: string;
  name?: string;
  value?: string;
};

export function ActionSubmitButton({
  className,
  idleLabel,
  pendingLabel,
  disabled = false,
  actionLabel,
  name,
  value,
}: ActionSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [wasClicked, setWasClicked] = useState(false);

  return (
    <button
      className={className}
      data-action-label={actionLabel ?? idleLabel}
      disabled={disabled || pending}
      name={name}
      onClick={() => setWasClicked(true)}
      type="submit"
      value={value}
    >
      {pending && wasClicked ? pendingLabel : idleLabel}
    </button>
  );
}
