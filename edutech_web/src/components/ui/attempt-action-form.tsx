"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

const ATTEMPT_ACTION_STATUS_KEY = "nexora-attempt-action-status";
const ATTEMPT_ACTION_EVENT = "nexora:attempt-action-status";

type AttemptActionKind = "save" | "section-switch" | "submit";

type AttemptActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  attemptId: string;
  actionKind: AttemptActionKind;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  formId?: string;
  trackDirty?: boolean;
};

type AttemptActionStatus = {
  attemptId: string;
  actionKind: AttemptActionKind;
  detail: string;
  submittedAt: string;
};

function readSubmitterLabel(submitter: HTMLElement | null, fallback: string) {
  if (!submitter) return fallback;

  const actionLabel = submitter.getAttribute("data-action-label");
  if (actionLabel) {
    return actionLabel;
  }

  const text = submitter.textContent?.trim();
  return text || fallback;
}

function defaultDetailForAction(actionKind: AttemptActionKind) {
  if (actionKind === "submit") return "Submitting attempt";
  if (actionKind === "section-switch") return "Switching section";
  return "Saving response";
}

export function AttemptActionForm({
  action,
  attemptId,
  actionKind,
  children,
  className,
  confirmMessage,
  formId,
  trackDirty = false,
}: AttemptActionFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!trackDirty || !formRef.current) {
      return;
    }

    const form = formRef.current;

    const handleFieldInteraction = () => {
      setIsDirty(true);
    };

    form.addEventListener("input", handleFieldInteraction);
    form.addEventListener("change", handleFieldInteraction);

    return () => {
      form.removeEventListener("input", handleFieldInteraction);
      form.removeEventListener("change", handleFieldInteraction);
    };
  }, [trackDirty]);

  useEffect(() => {
    if (!trackDirty || !isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, trackDirty]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (typeof window === "undefined") {
      return;
    }

    const submitEvent = event.nativeEvent as SubmitEvent;
    const submitter =
      submitEvent.submitter instanceof HTMLElement ? submitEvent.submitter : null;

    if (
      confirmMessage &&
      submitter?.getAttribute("data-skip-confirm") !== "true" &&
      !window.confirm(confirmMessage)
    ) {
      event.preventDefault();
      return;
    }

    const detail = readSubmitterLabel(submitter, defaultDetailForAction(actionKind));

    const payload: AttemptActionStatus = {
      attemptId,
      actionKind,
      detail,
      submittedAt: new Date().toISOString(),
    };

    window.sessionStorage.setItem(
      ATTEMPT_ACTION_STATUS_KEY,
      JSON.stringify(payload),
    );
    window.dispatchEvent(
      new CustomEvent(ATTEMPT_ACTION_EVENT, {
        detail: payload,
      }),
    );

    if (trackDirty) {
      setIsDirty(false);
    }
  }

  return (
    <form
      action={action}
      className={`${className ?? ""}${trackDirty && isDirty ? " attemptFormDirty" : ""}`}
      id={formId}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {children}
      {trackDirty && isDirty ? (
        <p
          aria-live="polite"
          className={`attemptDraftNotice ${isDirty ? "attemptDraftNoticeVisible" : ""}`}
        >
          You have unsaved changes on this question.
        </p>
      ) : null}
    </form>
  );
}

export { ATTEMPT_ACTION_EVENT, ATTEMPT_ACTION_STATUS_KEY };
