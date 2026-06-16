"use client";

import { useEffect } from "react";

const ATTEMPT_ACTIVE_QUESTION_KEY = "nexora-attempt-active-question";

export function AttemptNavigationGuard({
  attemptId,
  activeQuestionId,
  attemptStatus,
}: {
  attemptId: string;
  activeQuestionId?: string | null;
  attemptStatus: string;
}) {
  useEffect(() => {
    if (attemptStatus !== "in_progress") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const historyState = {
      attemptGuard: true,
      attemptId,
    };

    window.history.pushState(historyState, "", window.location.href);

    const handlePopState = () => {
      const shouldLeave = window.confirm(
        "Leave this attempt? Unsaved progress may be lost if you move away right now.",
      );

      if (!shouldLeave) {
        window.history.pushState(historyState, "", window.location.href);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [attemptId, attemptStatus]);

  useEffect(() => {
    if (!activeQuestionId) {
      return;
    }

    window.sessionStorage.setItem(
      `${ATTEMPT_ACTIVE_QUESTION_KEY}:${attemptId}`,
      activeQuestionId,
    );
  }, [activeQuestionId, attemptId]);

  return null;
}

export function AttemptQuestionRestore({
  attemptId,
  currentQuestionId,
}: {
  attemptId: string;
  currentQuestionId?: string | null;
}) {
  useEffect(() => {
    if (currentQuestionId) {
      return;
    }

    const storedQuestionId = window.sessionStorage.getItem(
      `${ATTEMPT_ACTIVE_QUESTION_KEY}:${attemptId}`,
    );

    if (!storedQuestionId) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("question", storedQuestionId);
    window.history.replaceState(window.history.state, "", url.toString());
    window.location.replace(url.toString());
  }, [attemptId, currentQuestionId]);

  return null;
}
