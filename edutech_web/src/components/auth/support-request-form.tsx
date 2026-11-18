"use client";

import { useActionState } from "react";
import { PendingButton } from "@/components/ui/pending-button";
import { createSupportRequestAction, initialSupportState } from "@/lib/auth/support-actions";

export function SupportRequestForm() {
  const [state, action] = useActionState(createSupportRequestAction, initialSupportState);
  return <form action={action} className="authForm">
    <label><span>Request type</span><select name="category" defaultValue="account"><option value="account">Account access</option><option value="assessment">Assessment</option><option value="data_export">Data export</option><option value="data_deletion">Data deletion</option><option value="privacy">Privacy</option><option value="other">Other</option></select></label>
    <label><span>Subject</span><input name="subject" maxLength={160} required /></label>
    <label><span>Details</span><textarea name="description" rows={6} required /></label>
    {state.message ? <p className={state.success ? "authSupportText" : "authError"} role="status">{state.message}</p> : null}
    <PendingButton className="button buttonPrimary" idleLabel="Submit Support Request" pendingLabel="Submitting..." />
  </form>;
}
