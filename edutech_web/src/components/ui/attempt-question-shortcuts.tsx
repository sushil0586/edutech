"use client";

import { startTransition, useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { confirmAttemptQuestionNavigation } from "@/components/ui/attempt-question-navigation";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "textarea" ||
    tagName === "select" ||
    (tagName === "input" &&
      target.getAttribute("type") !== "radio" &&
      target.getAttribute("type") !== "checkbox")
  );
}

export function AttemptQuestionShortcuts({
  formId,
  questionCardId,
  nextHref,
  previousHref,
}: {
  formId: string;
  questionCardId: string;
  nextHref?: string | null;
  previousHref?: string | null;
}) {
  const router = useRouter();

  const focusQuestion = useEffectEvent(() => {
    const questionCard = document.getElementById(questionCardId);
    if (!(questionCard instanceof HTMLElement)) {
      return;
    }

    questionCard.scrollIntoView({
      block: "start",
      behavior: "auto",
    });
    questionCard.focus({ preventScroll: true });
  });

  const handleKeydown = useEffectEvent((event: KeyboardEvent) => {
    if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) {
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      const optionIndex = Number(event.key) - 1;
      const optionInputs = Array.from(
        form.querySelectorAll<HTMLInputElement>(
          'input[name="selected_option"], input[name="selected_option_ids"]',
        ),
      );
      const targetOption = optionInputs[optionIndex];

      if (targetOption) {
        event.preventDefault();
        targetOption.click();
      }
      return;
    }

    if (event.key.toLowerCase() === "m") {
      const markInput = form.querySelector<HTMLInputElement>(
        'input[name="is_marked_for_review"]',
      );
      if (markInput) {
        event.preventDefault();
        markInput.click();
      }
      return;
    }

    if (event.key.toLowerCase() === "n" && nextHref) {
      event.preventDefault();
      if (!confirmAttemptQuestionNavigation(formId)) {
        return;
      }
      startTransition(() => router.push(nextHref));
      return;
    }

    if (event.key.toLowerCase() === "p" && previousHref) {
      event.preventDefault();
      if (!confirmAttemptQuestionNavigation(formId)) {
        return;
      }
      startTransition(() => router.push(previousHref));
    }
  });

  useEffect(() => {
    focusQuestion();
  }, [questionCardId]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  return null;
}
