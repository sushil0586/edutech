"use client";

function getTrackedAttemptForm(formId?: string | null) {
  if (typeof document === "undefined") {
    return null;
  }

  if (!formId) {
    return document.querySelector<HTMLFormElement>("form.attemptFormDirty");
  }

  const form = document.getElementById(formId);
  return form instanceof HTMLFormElement ? form : null;
}

export function confirmAttemptQuestionNavigation(formId?: string | null) {
  const form = getTrackedAttemptForm(formId);
  if (!form || !form.classList.contains("attemptFormDirty")) {
    return true;
  }

  return window.confirm(
    "You have unsaved changes on this question. Move anyway and discard them?",
  );
}
