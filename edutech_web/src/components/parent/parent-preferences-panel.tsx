"use client";

import { useState, useTransition } from "react";
import type { ParentPreferences } from "@/lib/api/parent";

const PREFERENCE_FIELDS: Array<{
  key: keyof ParentPreferences;
  label: string;
  description: string;
}> = [
  {
    key: "score_drops",
    label: "Score drop alerts",
    description: "Notify me when a child's recent score dips below the prior pattern.",
  },
  {
    key: "inactivity",
    label: "Inactivity alerts",
    description: "Notify me when a child stops attempting tests for a meaningful period.",
  },
  {
    key: "milestones",
    label: "Improvement milestones",
    description: "Notify me when a child crosses positive academic milestones.",
  },
  {
    key: "weekly_summary",
    label: "Weekly summary digest",
    description: "Send one compact weekly academic summary.",
  },
  {
    key: "result_published",
    label: "Result published",
    description: "Notify me when a new result becomes visible to the family.",
  },
  {
    key: "high_risk_exam_integrity",
    label: "High risk exam integrity",
    description: "Notify me only when serious exam-risk alerts are raised.",
  },
];

export function ParentPreferencesPanel({
  initialPreferences,
}: {
  initialPreferences: ParentPreferences;
}) {
  const [preferences, setPreferences] = useState<ParentPreferences>(initialPreferences);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function updatePreference(key: keyof ParentPreferences, value: boolean) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function savePreferences() {
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/parent/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(preferences),
        });

        const payload = (await response.json().catch(() => ({}))) as
          | ParentPreferences
          | { detail?: string };

        if (!response.ok) {
          throw new Error(
            "detail" in payload && typeof payload.detail === "string"
              ? payload.detail
              : "Unable to save parent preferences right now.",
          );
        }

        setPreferences(payload as ParentPreferences);
        setMessage("Parent preferences updated successfully.");
      } catch (saveError) {
        setError(
          saveError instanceof Error && saveError.message
            ? saveError.message
            : "Unable to save parent preferences right now.",
        );
      }
    });
  }

  return (
    <div className="studentPageTight">
      <span className="eyebrow">Notification preferences</span>
      <h3>Choose how the family workspace should alert you</h3>
      <p className="academicSectionDescription">
        These preferences are stored against the parent profile, so the same notification behavior
        stays consistent across the parent workspace.
      </p>

      {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

      <div className="setupToggleGrid">
        {PREFERENCE_FIELDS.map((field) => (
          <label className="setupToggle setupToggleWide" key={field.key}>
            <input
              checked={preferences[field.key]}
              disabled={isPending}
              onChange={(event) => updatePreference(field.key, event.target.checked)}
              type="checkbox"
            />
            <span>{field.label}</span>
            <small>{field.description}</small>
          </label>
        ))}
      </div>

      <div className="resultCardActions">
        <button
          className="button buttonPrimary"
          disabled={isPending}
          onClick={savePreferences}
          type="button"
        >
          {isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
