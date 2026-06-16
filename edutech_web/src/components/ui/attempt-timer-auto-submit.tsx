"use client";

import { useCallback, useEffect, useRef } from "react";

export function AttemptTimerAutoSubmit({
  submitFormId,
  questionFormId,
  initialSeconds,
}: {
  submitFormId: string;
  questionFormId?: string;
  initialSeconds: number | null;
}) {
  const hasSubmittedRef = useRef(false);

  const submitAtExpiry = useCallback(() => {
    const questionForm = questionFormId
      ? (document.getElementById(questionFormId) as HTMLFormElement | null)
      : null;
    const dirtyQuestionForm =
      questionForm && questionForm.classList.contains("attemptFormDirty")
        ? questionForm
        : null;

    if (dirtyQuestionForm) {
      const submitter = dirtyQuestionForm.querySelector(
        '[data-auto-submit-expired="true"]',
      ) as HTMLButtonElement | null;

      if (submitter) {
        hasSubmittedRef.current = true;
        dirtyQuestionForm.requestSubmit(submitter);
        return;
      }
    }

    const submitForm = document.getElementById(submitFormId) as HTMLFormElement | null;
    if (submitForm) {
      const autoSubmitter = submitForm.querySelector(
        '[data-auto-submit-final="true"]',
      ) as HTMLButtonElement | null;
      hasSubmittedRef.current = true;
      submitForm.requestSubmit(autoSubmitter ?? undefined);
    }
  }, [questionFormId, submitFormId]);

  useEffect(() => {
    if (initialSeconds === null || initialSeconds < 0 || hasSubmittedRef.current) {
      return;
    }

    if (initialSeconds === 0) {
      submitAtExpiry();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!hasSubmittedRef.current) {
        submitAtExpiry();
      }
    }, initialSeconds * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [initialSeconds, submitAtExpiry]);

  return null;
}
