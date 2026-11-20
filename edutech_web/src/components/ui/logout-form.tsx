"use client";

import { useActionState } from "react";
import {
  logoutAction,
  type LogoutActionState,
} from "@/lib/auth/actions";
import { LogoutButton } from "@/components/ui/logout-button";

type LogoutFormProps = {
  buttonClassName?: string;
  formClassName?: string;
  label?: string;
  pendingLabel?: string;
};

const initialLogoutActionState: LogoutActionState = {
  message: "",
};

export function LogoutForm({
  buttonClassName,
  formClassName = "logoutForm",
  label,
  pendingLabel,
}: LogoutFormProps) {
  const [state, formAction] = useActionState(
    logoutAction,
    initialLogoutActionState,
  );

  return (
    <form action={formAction} className={formClassName}>
      <LogoutButton
        className={buttonClassName}
        label={label}
        pendingLabel={pendingLabel}
      />
      {state.message ? (
        <p aria-live="polite" className="logoutError" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
