"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PendingButton } from "@/components/ui/pending-button";
import { confirmPasswordResetAction, initialPasswordResetState, requestPasswordResetAction } from "@/lib/auth/password-reset-actions";

export function PasswordResetRequestForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialPasswordResetState);
  return <form action={action} className="authForm" noValidate>
    <label><span>Username or email</span><input autoComplete="username" name="identifier" required /></label>
    {state.message ? <p className={state.success ? "authSupportText" : "authError"} role="status">{state.message}</p> : null}
    <PendingButton className="button buttonPrimary" idleLabel="Send Reset Instructions" pendingLabel="Sending..." />
    <p className="authSupportText"><Link href="/login">Return to login</Link></p>
  </form>;
}

export function PasswordResetConfirmForm({ request, token }: { request: string; token: string }) {
  const [state, action] = useActionState(confirmPasswordResetAction, initialPasswordResetState);
  return <form action={action} className="authForm" noValidate>
    <input name="request" type="hidden" value={request} /><input name="token" type="hidden" value={token} />
    <label><span>New password</span><input autoComplete="new-password" name="new_password" required type="password" /></label>
    <label><span>Confirm new password</span><input autoComplete="new-password" name="confirm_password" required type="password" /></label>
    {state.message ? <p className={state.success ? "authSupportText" : "authError"} role="status">{state.message}</p> : null}
    {state.success ? <Link className="button buttonPrimary" href="/login">Sign in</Link> : <PendingButton className="button buttonPrimary" idleLabel="Update Password" pendingLabel="Updating..." />}
  </form>;
}
