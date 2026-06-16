"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/lib/auth/actions";
import { initialLoginActionState } from "@/lib/auth/login-state";
import { PendingButton } from "@/components/ui/pending-button";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialLoginActionState);
  const [showPassword, setShowPassword] = useState(false);
  const resolvedState = {
    message:
      typeof state?.message === "string"
        ? state.message
        : initialLoginActionState.message,
    username:
      typeof state?.username === "string"
        ? state.username
        : initialLoginActionState.username,
    fieldErrors: {
      username:
        typeof state?.fieldErrors?.username === "string"
          ? state.fieldErrors.username
          : undefined,
      password:
        typeof state?.fieldErrors?.password === "string"
          ? state.fieldErrors.password
          : undefined,
    },
  };

  return (
    <form action={formAction} className="authForm" noValidate>
      <label>
        <span>Username or email</span>
        <input
          aria-describedby={resolvedState.fieldErrors.username ? "login-username-error" : undefined}
          aria-invalid={Boolean(resolvedState.fieldErrors.username)}
          autoComplete="username"
          defaultValue={resolvedState.username}
          name="username"
          placeholder="Enter your username"
          required
          type="text"
        />
        {resolvedState.fieldErrors.username ? (
          <small className="authFieldError" id="login-username-error">
            {resolvedState.fieldErrors.username}
          </small>
        ) : null}
      </label>

      <label>
        <span>Password</span>
        <div className="passwordField">
          <input
            aria-describedby={resolvedState.fieldErrors.password ? "login-password-error" : undefined}
            aria-invalid={Boolean(resolvedState.fieldErrors.password)}
            autoComplete="current-password"
            name="password"
            placeholder="Enter your password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="passwordToggle"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {resolvedState.fieldErrors.password ? (
          <small className="authFieldError" id="login-password-error">
            {resolvedState.fieldErrors.password}
          </small>
        ) : null}
      </label>

      {resolvedState.message ? <p className="authError">{resolvedState.message}</p> : null}

      <PendingButton
        className="button buttonPrimary"
        idleLabel="Continue to Workspace"
        pendingLabel="Signing in..."
      />

      <p className="authSupportText">
        Your session is stored in secure server cookies and refreshed through the
        backend auth service.
      </p>
    </form>
  );
}
