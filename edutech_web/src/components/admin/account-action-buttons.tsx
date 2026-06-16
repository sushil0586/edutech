"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type ActionResult = {
  user_id?: number;
  username?: string;
  generated_password?: string | null;
  is_active?: boolean;
  detail?: string;
};

type ActionState = {
  message: string;
  result: ActionResult | null;
  loading: boolean;
};

async function postAction(
  resource: "students" | "teachers" | "users",
  entityId: string,
  action: "create-login" | "reset-password" | "enable" | "disable",
  payload: Record<string, unknown> = { auto_generate: true },
) {
  const response = await fetch(
    `/api/admin/account-management/${resource}/${entityId}/${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const responseBody = (await response.json().catch(() => ({}))) as ActionResult;
  if (!response.ok) {
    throw new Error(
      responseBody.detail ?? `Request failed with status ${response.status}`,
    );
  }

  return responseBody;
}

export function AccountActionButtons({
  resource,
  entityId,
  userId,
  hasLogin,
  loginIsActive,
  isCompact = false,
}: {
  resource: "students" | "teachers";
  entityId: string;
  userId: number | null;
  hasLogin: boolean;
  loginIsActive: boolean;
  isCompact?: boolean;
}) {
  const [state, setState] = useState<ActionState>({
    message: "",
    result: null,
    loading: false,
  });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!resetDialogOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setResetDialogOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [resetDialogOpen]);

  async function runAction(
    action: "create-login" | "reset-password" | "enable" | "disable",
    payload?: Record<string, unknown>,
  ) {
    if (state.loading) {
      return;
    }
    setState((current) => ({ ...current, loading: true, message: "" }));
    try {
      const actionResource =
        action === "create-login" ? resource : ("users" as const);
      const actionEntityId =
        action === "create-login" ? entityId : String(userId ?? "");
      if (!actionEntityId) {
        throw new Error("User account id is required for this action.");
      }
      const result = await postAction(
        actionResource,
        actionEntityId,
        action,
        payload,
      );
      setState({
        loading: false,
        message:
          action === "create-login"
            ? `Created login for ${result.username ?? "the selected profile"}.`
            : action === "reset-password"
              ? `Password reset for ${result.username ?? "the selected login"}.`
              : action === "enable"
                ? "Login enabled successfully."
                : "Login disabled successfully.",
        result,
      });
      return true;
    } catch (error) {
      setState({
        loading: false,
        message: error instanceof Error ? error.message : "Action failed.",
        result: null,
      });
      return false;
    }
  }

  async function submitPasswordReset() {
    if (!autoGeneratePassword && (!newPassword || !confirmPassword)) {
      setState((current) => ({
        ...current,
        message: "Enter and confirm the new password, or choose auto-generate.",
      }));
      return;
    }

    const succeeded = await runAction(
      "reset-password",
      autoGeneratePassword
        ? { auto_generate: true }
        : { auto_generate: false, new_password: newPassword, confirm_password: confirmPassword },
    );
    if (succeeded) {
      setResetDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      setAutoGeneratePassword(false);
    }
  }

  return (
    <div className="accountActionStack">
      <div className="accountActionRow">
        {!hasLogin ? (
          <button
            className="appTopbarAction"
            disabled={state.loading}
            onClick={() => void runAction("create-login")}
            type="button"
          >
            <span className="appTopbarActionIcon" aria-hidden="true">
              +
            </span>
            Create login
          </button>
        ) : (
          <>
            <button
              className="appTopbarAction"
              disabled={state.loading}
              onClick={() => setResetDialogOpen(true)}
              type="button"
            >
              <span className="appTopbarActionIcon" aria-hidden="true">
                ↻
              </span>
              Reset password
            </button>
            <button
              className="appTopbarAction"
              disabled={state.loading}
              onClick={() => void runAction(loginIsActive ? "disable" : "enable")}
              type="button"
            >
              <span className="appTopbarActionIcon" aria-hidden="true">
                {loginIsActive ? "⊖" : "⊕"}
              </span>
              {loginIsActive ? "Disable login" : "Enable login"}
            </button>
          </>
        )}
      </div>

      {(state.message || state.result) && (
        <div className={`featurePlaceholder ${isCompact ? "statePanel" : ""}`}>
          {state.message && <p>{state.message}</p>}
          {state.result?.username && (
            <p className="authMeta">
              Username: <strong>{state.result.username}</strong>
            </p>
          )}
          {state.result?.generated_password && (
            <p className="authMeta">
              Generated password:{" "}
              <strong>{state.result.generated_password}</strong>
            </p>
          )}
        </div>
      )}

      {resetDialogOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="rosterImportOverlay" onClick={() => setResetDialogOpen(false)} role="presentation">
              <div
                aria-modal="true"
                className="rosterImportDialog dashboardPanel resetPasswordDialog"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <div className="studentPageTight">
                  <div className="academicSectionHeader">
                    <div>
                      <span className="eyebrow">Reset password</span>
                      <h3>Update login password</h3>
                    </div>
                    <button
                      className="appTopbarAction setupSecondaryAction"
                      onClick={() => setResetDialogOpen(false)}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                  <p className="academicSectionDescription">
                    Reset the password for this login. You can set a custom password or auto-generate one.
                  </p>

                  <div className="setupToggleGrid">
                    <label className="setupToggle setupToggleWide">
                      <input
                        checked={autoGeneratePassword}
                        onChange={(event) => setAutoGeneratePassword(event.target.checked)}
                        type="checkbox"
                      />
                      <span>
                        Auto-generate password
                        <small>Leave this enabled if you want the system to create a temporary password.</small>
                      </span>
                    </label>
                  </div>

                  {!autoGeneratePassword ? (
                    <div className="setupFormGrid setupFormGridDense">
                      <label className="setupField">
                        <span>New password</span>
                        <input
                          onChange={(event) => setNewPassword(event.target.value)}
                          type="password"
                          value={newPassword}
                        />
                      </label>
                      <label className="setupField">
                        <span>Confirm password</span>
                        <input
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          type="password"
                          value={confirmPassword}
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="setupFieldActions">
                    <button className="appTopbarAction" disabled={state.loading} onClick={() => void submitPasswordReset()} type="button">
                      <span className="appTopbarActionIcon" aria-hidden="true">⌘</span>
                      {state.loading ? "Saving..." : "Reset password"}
                    </button>
                    <button
                      className="appTopbarAction setupSecondaryAction"
                      disabled={state.loading}
                      onClick={() => setResetDialogOpen(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
