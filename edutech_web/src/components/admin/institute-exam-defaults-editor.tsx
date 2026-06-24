"use client";

import { useState } from "react";
import type { CatalogSelectOption } from "@/lib/teacher/option-catalog";
import type { AssessmentFamilyRecord } from "@/components/admin/academic-setup-workspace";

type InstituteExamDefaults = {
  duration_minutes: number | null;
  instructions: string;
  allow_late_submit: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_result_immediately: boolean;
  allow_review_after_submit: boolean;
  max_attempts: number;
  timer_mode: string;
  navigation_mode: string;
  attempt_policy: string;
  result_publish_mode: string;
  review_mode: string;
  security_mode: string;
  allow_resume: boolean;
  allow_section_switching: boolean;
  allow_return_to_previous_section: boolean;
};

type InstitutePayload = {
  exam_defaults?: Record<string, unknown>;
};

type ExamDefaultOptionGroups = {
  timerModeOptions: CatalogSelectOption[];
  navigationModeOptions: CatalogSelectOption[];
  attemptPolicyOptions: CatalogSelectOption[];
  resultPublishModeOptions: CatalogSelectOption[];
  reviewModeOptions: CatalogSelectOption[];
  securityModeOptions: CatalogSelectOption[];
};

type ExamDefaultFieldErrors = Partial<Record<keyof InstituteExamDefaults, string>>;

const EXAM_DEFAULT_FAMILY_PRESETS: Record<
  string,
  Partial<InstituteExamDefaults> & { helper: string; duration_minutes: number }
> = {
  school: {
    duration_minutes: 60,
    allow_late_submit: true,
    randomize_questions: false,
    randomize_options: false,
    show_result_immediately: false,
    allow_review_after_submit: true,
    max_attempts: 1,
    timer_mode: "hybrid",
    navigation_mode: "hybrid",
    attempt_policy: "single",
    result_publish_mode: "after_review",
    review_mode: "attempted_only",
    security_mode: "normal",
    allow_resume: true,
    allow_section_switching: true,
    allow_return_to_previous_section: true,
    helper:
      "Balanced classroom-style defaults that keep movement flexible and preserve teacher review before publication.",
  },
  competitive: {
    duration_minutes: 180,
    allow_late_submit: false,
    randomize_questions: true,
    randomize_options: true,
    show_result_immediately: false,
    allow_review_after_submit: false,
    max_attempts: 1,
    timer_mode: "section",
    navigation_mode: "sequential",
    attempt_policy: "single",
    result_publish_mode: "after_review",
    review_mode: "none",
    security_mode: "violation_limited",
    allow_resume: false,
    allow_section_switching: false,
    allow_return_to_previous_section: false,
    helper:
      "Mock-exam defaults tuned for rank pressure, section discipline, and tighter delivery control.",
  },
  certification: {
    duration_minutes: 90,
    allow_late_submit: false,
    randomize_questions: true,
    randomize_options: true,
    show_result_immediately: false,
    allow_review_after_submit: true,
    max_attempts: 1,
    timer_mode: "hybrid",
    navigation_mode: "free_section",
    attempt_policy: "single",
    result_publish_mode: "after_review",
    review_mode: "attempted_only",
    security_mode: "focus",
    allow_resume: true,
    allow_section_switching: true,
    allow_return_to_previous_section: true,
    helper:
      "Certification-ready defaults that preserve domain realism while still allowing section-level navigation.",
  },
  language_proficiency: {
    duration_minutes: 120,
    allow_late_submit: false,
    randomize_questions: false,
    randomize_options: false,
    show_result_immediately: false,
    allow_review_after_submit: false,
    max_attempts: 1,
    timer_mode: "section",
    navigation_mode: "sequential",
    attempt_policy: "single",
    result_publish_mode: "after_review",
    review_mode: "none",
    security_mode: "focus",
    allow_resume: false,
    allow_section_switching: false,
    allow_return_to_previous_section: false,
    helper:
      "Skill-block defaults for reading, listening, writing, and speaking style flows with stronger section control.",
  },
};

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

export function InstituteExamDefaultsEditor({
  instituteId,
  initialDefaults,
  optionGroups,
  assessmentFamilies,
  compact = false,
}: {
  instituteId: string;
  initialDefaults: InstituteExamDefaults;
  optionGroups: ExamDefaultOptionGroups;
  assessmentFamilies: AssessmentFamilyRecord[];
  compact?: boolean;
}) {
  const [form, setForm] = useState<InstituteExamDefaults>(initialDefaults);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ExamDefaultFieldErrors>({});
  const [selectedTemplateCode, setSelectedTemplateCode] = useState("");

  function updateField<K extends keyof InstituteExamDefaults>(
    key: K,
    value: InstituteExamDefaults[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }

  function validOption(
    options: CatalogSelectOption[],
    preferred: string | undefined,
    fallback: string,
  ) {
    if (preferred && options.some((option) => option.value === preferred)) {
      return preferred;
    }
    return fallback;
  }

  function buildTemplateDefaults(family: AssessmentFamilyRecord) {
    const profilePreset = EXAM_DEFAULT_FAMILY_PRESETS[family.code] ?? EXAM_DEFAULT_FAMILY_PRESETS.school;
    const deliveryDefaults =
      family.delivery_defaults && typeof family.delivery_defaults === "object"
        ? family.delivery_defaults
        : {};
    const scoringDefaults =
      family.scoring_defaults && typeof family.scoring_defaults === "object"
        ? family.scoring_defaults
        : {};
    const negativeMarkingDefault = Boolean(
      (scoringDefaults as Record<string, unknown>).negative_marking_default,
    );
    const timerMode = validOption(
      optionGroups.timerModeOptions,
      typeof (deliveryDefaults as Record<string, unknown>).recommended_timer_mode === "string"
        ? String((deliveryDefaults as Record<string, unknown>).recommended_timer_mode)
        : profilePreset.timer_mode,
      form.timer_mode,
    );
    const navigationMode = validOption(
      optionGroups.navigationModeOptions,
      typeof (deliveryDefaults as Record<string, unknown>).recommended_navigation_mode === "string"
        ? String((deliveryDefaults as Record<string, unknown>).recommended_navigation_mode)
        : profilePreset.navigation_mode,
      form.navigation_mode,
    );
    return {
      ...form,
      ...profilePreset,
      timer_mode: timerMode,
      navigation_mode: navigationMode,
      instructions: [
        `${family.label} assessment template.`,
        profilePreset.helper,
        negativeMarkingDefault
          ? "Negative-marking expectations should be reflected clearly in learner instructions."
          : "Marks are intended to follow a standard positive-scoring pattern unless the exam overrides it.",
      ].join(" "),
    };
  }

  function applyFamilyTemplate(templateCode: string) {
    const family = assessmentFamilies.find((item) => item.code === templateCode);
    if (!family) {
      return;
    }
    setForm(buildTemplateDefaults(family));
    setSelectedTemplateCode(templateCode);
    setFieldErrors({});
    setMessage(`${family.label} exam-default template applied. Review and save to keep it for the institute.`);
  }

  async function saveDefaults() {
    const nextFieldErrors: ExamDefaultFieldErrors = {};
    if (form.duration_minutes !== null && form.duration_minutes <= 0) {
      nextFieldErrors.duration_minutes = "Duration must be greater than zero.";
    }
    if (form.max_attempts <= 0) {
      nextFieldErrors.max_attempts = "Max attempts must be greater than zero.";
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setMessage("Correct the highlighted defaults to continue.");
      return;
    }

    setSaving(true);
    setMessage("");
    setFieldErrors({});
    try {
      const payload: InstitutePayload = {
        exam_defaults: {
          ...form,
        },
      };
      const response = await fetch(`/api/admin/institutes/${instituteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        const examDefaultsErrors =
          body.exam_defaults && typeof body.exam_defaults === "object"
            ? (body.exam_defaults as Record<string, unknown>)
            : body;
        const apiFieldErrors: ExamDefaultFieldErrors = {
          duration_minutes: firstError(examDefaultsErrors.duration_minutes),
          instructions: firstError(examDefaultsErrors.instructions),
          allow_late_submit: firstError(examDefaultsErrors.allow_late_submit),
          randomize_questions: firstError(examDefaultsErrors.randomize_questions),
          randomize_options: firstError(examDefaultsErrors.randomize_options),
          show_result_immediately: firstError(examDefaultsErrors.show_result_immediately),
          allow_review_after_submit: firstError(examDefaultsErrors.allow_review_after_submit),
          max_attempts: firstError(examDefaultsErrors.max_attempts),
          timer_mode: firstError(examDefaultsErrors.timer_mode),
          navigation_mode: firstError(examDefaultsErrors.navigation_mode),
          attempt_policy: firstError(examDefaultsErrors.attempt_policy),
          result_publish_mode: firstError(examDefaultsErrors.result_publish_mode),
          review_mode: firstError(examDefaultsErrors.review_mode),
          security_mode: firstError(examDefaultsErrors.security_mode),
          allow_resume: firstError(examDefaultsErrors.allow_resume),
          allow_section_switching: firstError(examDefaultsErrors.allow_section_switching),
          allow_return_to_previous_section: firstError(examDefaultsErrors.allow_return_to_previous_section),
        };
        setFieldErrors(
          Object.fromEntries(
            Object.entries(apiFieldErrors).filter(([, value]) => Boolean(value)),
          ) as ExamDefaultFieldErrors,
        );
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : "Defaults could not be updated. Review the highlighted fields.",
        );
      }
      setMessage("Institute exam defaults updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={compact ? "featurePlaceholder adminAcademicDefaultsPanel" : "featurePlaceholder"}>
      {!compact ? (
        <>
          <span className="eyebrow">Exam defaults</span>
          <h2>Configure institute-wide exam defaults</h2>
          <p>
            New exams inherit these values unless the exam builder overrides them.
          </p>
        </>
      ) : (
        <div className="academicSectionHeader">
          <strong>Exam defaults</strong>
          <span className="setupFieldMeta">Policy</span>
        </div>
      )}

      {assessmentFamilies.length ? (
        <div className="featurePlaceholder adminAcademicDefaultsPanel">
          <div className="sectionHeading">
            <strong>Apply an assessment-family template</strong>
            <span>{assessmentFamilies.length} preset families</span>
          </div>
          <p>
            Start from a family-aware policy pack, then fine-tune the institute defaults before saving.
          </p>
          <div className="questionBankButtonRow">
            {assessmentFamilies.map((family) => (
              <button
                key={family.id}
                className={selectedTemplateCode === family.code ? "button buttonPrimary" : "button buttonSecondary"}
                onClick={() => applyFamilyTemplate(family.code)}
                type="button"
              >
                {family.label}
              </button>
            ))}
          </div>
          {selectedTemplateCode ? (
            <div className="questionBankTagRow">
              <span className="questionBankTagChip">
                Active template: {assessmentFamilies.find((item) => item.code === selectedTemplateCode)?.label ?? "Unknown"}
              </span>
              <span className="questionBankTagChip">
                Review the values below, then save them as institute-wide defaults.
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="setupFormGrid adminAcademicCompactForm">
        <label className="setupField">
          <span>Duration minutes</span>
          <input
            aria-invalid={Boolean(fieldErrors.duration_minutes)}
            className={fieldErrors.duration_minutes ? "setupFieldInvalid" : undefined}
            type="number"
            value={form.duration_minutes ?? ""}
            onChange={(event) =>
              updateField(
                "duration_minutes",
                event.target.value ? Number(event.target.value) : null,
              )
            }
          />
          {fieldErrors.duration_minutes ? (
            <small className="setupFieldError">{fieldErrors.duration_minutes}</small>
          ) : null}
        </label>
        <label className="setupField">
          <span>Max attempts</span>
          <input
            aria-invalid={Boolean(fieldErrors.max_attempts)}
            className={fieldErrors.max_attempts ? "setupFieldInvalid" : undefined}
            type="number"
            value={form.max_attempts}
            onChange={(event) =>
              updateField("max_attempts", Number(event.target.value || 0))
            }
          />
          {fieldErrors.max_attempts ? (
            <small className="setupFieldError">{fieldErrors.max_attempts}</small>
          ) : null}
        </label>
        <label className="setupField">
          <span>Timer mode</span>
          <select
            aria-invalid={Boolean(fieldErrors.timer_mode)}
            className={fieldErrors.timer_mode ? "setupFieldInvalid" : undefined}
            value={form.timer_mode}
            onChange={(event) => updateField("timer_mode", event.target.value)}
          >
            {optionGroups.timerModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.timer_mode ? <small className="setupFieldError">{fieldErrors.timer_mode}</small> : null}
        </label>
        <label className="setupField">
          <span>Navigation mode</span>
          <select
            aria-invalid={Boolean(fieldErrors.navigation_mode)}
            className={fieldErrors.navigation_mode ? "setupFieldInvalid" : undefined}
            value={form.navigation_mode}
            onChange={(event) => updateField("navigation_mode", event.target.value)}
          >
            {optionGroups.navigationModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.navigation_mode ? <small className="setupFieldError">{fieldErrors.navigation_mode}</small> : null}
        </label>
        <label className="setupField">
          <span>Attempt policy</span>
          <select
            aria-invalid={Boolean(fieldErrors.attempt_policy)}
            className={fieldErrors.attempt_policy ? "setupFieldInvalid" : undefined}
            value={form.attempt_policy}
            onChange={(event) => updateField("attempt_policy", event.target.value)}
          >
            {optionGroups.attemptPolicyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.attempt_policy ? <small className="setupFieldError">{fieldErrors.attempt_policy}</small> : null}
        </label>
        <label className="setupField">
          <span>Result publish mode</span>
          <select
            aria-invalid={Boolean(fieldErrors.result_publish_mode)}
            className={fieldErrors.result_publish_mode ? "setupFieldInvalid" : undefined}
            value={form.result_publish_mode}
            onChange={(event) => updateField("result_publish_mode", event.target.value)}
          >
            {optionGroups.resultPublishModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.result_publish_mode ? (
            <small className="setupFieldError">{fieldErrors.result_publish_mode}</small>
          ) : null}
        </label>
        <label className="setupField">
          <span>Review mode</span>
          <select
            aria-invalid={Boolean(fieldErrors.review_mode)}
            className={fieldErrors.review_mode ? "setupFieldInvalid" : undefined}
            value={form.review_mode}
            onChange={(event) => updateField("review_mode", event.target.value)}
          >
            {optionGroups.reviewModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.review_mode ? <small className="setupFieldError">{fieldErrors.review_mode}</small> : null}
        </label>
        <label className="setupField">
          <span>Security mode</span>
          <select
            aria-invalid={Boolean(fieldErrors.security_mode)}
            className={fieldErrors.security_mode ? "setupFieldInvalid" : undefined}
            value={form.security_mode}
            onChange={(event) => updateField("security_mode", event.target.value)}
          >
            {optionGroups.securityModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.security_mode ? <small className="setupFieldError">{fieldErrors.security_mode}</small> : null}
        </label>
      </div>

      <label className="setupTextareaField adminAcademicCompactTextarea">
        <span>Instructions</span>
        <textarea
          aria-invalid={Boolean(fieldErrors.instructions)}
          className={fieldErrors.instructions ? "setupFieldInvalid" : undefined}
          rows={4}
          value={form.instructions}
          onChange={(event) => updateField("instructions", event.target.value)}
        />
        {fieldErrors.instructions ? <small className="setupFieldError">{fieldErrors.instructions}</small> : null}
      </label>

      <div className="setupToggleGrid adminAcademicCompactToggleGrid">
        {[
          ["allow_late_submit", "Allow late submit"],
          ["randomize_questions", "Randomize questions"],
          ["randomize_options", "Randomize options"],
          ["show_result_immediately", "Show result immediately"],
          ["allow_review_after_submit", "Allow review after submit"],
          ["allow_resume", "Allow resume"],
          ["allow_section_switching", "Allow section switching"],
          ["allow_return_to_previous_section", "Allow return to previous section"],
        ].map(([key, label]) => (
          <label key={key} className="setupToggle">
            <input
              type="checkbox"
              checked={form[key as keyof InstituteExamDefaults] as boolean}
              onChange={(event) =>
                updateField(
                  key as keyof InstituteExamDefaults,
                  event.target.checked as InstituteExamDefaults[keyof InstituteExamDefaults],
                )
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="settingsActionRow adminAcademicFieldActions">
        <button className="appTopbarAction" disabled={saving} onClick={() => void saveDefaults()} type="button">
          <span className="appTopbarActionIcon" aria-hidden="true">
            ⌘
          </span>
          {saving ? "Saving..." : "Save defaults"}
        </button>
      </div>

      {message && <p className="authMeta">{message}</p>}
    </div>
  );
}
