"use client";

import { useEffect } from "react";

const ATTEMPT_ACTIVE_QUESTION_KEY = "nexora-attempt-active-question";
const ATTEMPT_VIEWPORT_KEY = "nexora-attempt-viewport";

export function rememberAttemptViewport(attemptId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    `${ATTEMPT_VIEWPORT_KEY}:${attemptId}`,
    JSON.stringify({
      y: window.scrollY,
      capturedAt: Date.now(),
    }),
  );
}

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

export function AttemptViewportRestore({
  attemptId,
}: {
  attemptId: string;
}) {
  useEffect(() => {
    const payload = window.sessionStorage.getItem(`${ATTEMPT_VIEWPORT_KEY}:${attemptId}`);
    if (!payload) {
      return;
    }

    window.sessionStorage.removeItem(`${ATTEMPT_VIEWPORT_KEY}:${attemptId}`);

    try {
      const parsed = JSON.parse(payload) as { y?: number };
      const y = typeof parsed.y === "number" ? parsed.y : null;
      if (y === null) {
        return;
      }

      const restore = () => window.scrollTo({ top: y, behavior: "auto" });
      restore();
      window.requestAnimationFrame(restore);
    } catch {
      return;
    }
  }, [attemptId]);

  return null;
}

export function AttemptPostActionQuestionFocus({
  action,
  questionCardId,
}: {
  action?: string | null;
  questionCardId: string;
}) {
  useEffect(() => {
    if (action !== "save" && action !== "section-switch") {
      return;
    }

    const focusQuestion = () => {
      const questionCard = document.getElementById(questionCardId);
      if (!(questionCard instanceof HTMLElement)) {
        return;
      }

      const top = window.scrollY + questionCard.getBoundingClientRect().top - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      questionCard.focus({ preventScroll: true });
    };

    focusQuestion();
    window.requestAnimationFrame(focusQuestion);
  }, [action, questionCardId]);

  return null;
}
