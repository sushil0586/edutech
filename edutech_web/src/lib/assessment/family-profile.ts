import type { AssessmentExamFamilyId } from "@/lib/assessment/exam-family-metadata";

type FamilyScoringDefaults = Record<string, unknown> | null | undefined;

type FamilyScoringSummaryTone = "authoring" | "builder" | "question_bank";

export type FamilyProgramLike = {
  name?: string | null;
  code?: string | null;
  assessment_family?: string | null;
  assessment_family_code?: string | null;
  assessment_family_label?: string | null;
  assessment_family_profile?: {
    code?: string | null;
    label?: string | null;
  } | null;
} | null | undefined;

export function normalizeAssessmentProgramFamilyCode(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (
    normalized.includes("language") ||
    normalized.includes("ielts") ||
    normalized.includes("toefl") ||
    normalized.includes("pte")
  ) {
    return "language_proficiency";
  }
  if (
    normalized.includes("competitive") ||
    normalized.includes("entrance") ||
    normalized.includes("graduate admission") ||
    normalized.includes("medical") ||
    normalized.includes("engineering") ||
    normalized.includes("neet") ||
    normalized.includes("jee") ||
    normalized.includes("gre")
  ) {
    return "competitive";
  }
  if (
    normalized.includes("certification") ||
    normalized.includes("professional") ||
    normalized.includes("aws")
  ) {
    return "certification";
  }
  if (normalized.includes("school")) {
    return "school";
  }
  return normalized.replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
}

export function getFamilyAllowedQuestionTypes(
  familyProfile: { allowed_question_types?: string[] | null } | null | undefined,
) {
  return familyProfile?.allowed_question_types ?? [];
}

export function resolveAssessmentFamilyIdFromProgramLike(
  program: FamilyProgramLike,
  resolveAssessmentExamFamilyId: (
    value: string | null | undefined,
  ) => AssessmentExamFamilyId | null,
) {
  const candidates = [
    program?.name,
    program?.code,
    program?.assessment_family_profile?.label,
    program?.assessment_family_profile?.code,
    program?.assessment_family_label,
    program?.assessment_family_code,
    program?.assessment_family,
  ];

  for (const candidate of candidates) {
    const resolved = resolveAssessmentExamFamilyId(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

export function buildAssessmentFamilyExecutionChecklist(
  familyId: string | null | undefined,
  questionMixGuidance = "",
) {
  switch (familyId) {
    case "neet":
      return [
        "Keep the exam mock-first: full-length pacing, one serious attempt posture, and controlled post-submit release.",
        "Use large Biology, Chemistry, and Physics blocks instead of chapter-sized micro checks.",
        questionMixGuidance ||
          "Preserve a Biology-heavy objective mix with Chemistry and Physics support in each section plan.",
      ];
    case "jee":
      return [
        "Bias toward challenge-heavy timed sections and keep section contracts explicit before previewing.",
        "Include a numeric-answer lane when the paper is meant to mirror JEE-style solving depth.",
        "Do not pair numeric-entry sections with negative marking in the current JEE contract.",
      ];
    case "gre":
      return [
        "Prefer formal timed sections and graduate-readiness wording over school-style chapter-test framing.",
        "Keep result and review settings aligned to total-score-first reporting; avoid implying deep sectional score storytelling.",
        questionMixGuidance ||
          "Balance quant reasoning coverage across difficulty bands instead of clustering only easy or only advanced prompts.",
      ];
    case "aws_certification":
      return [
        "Organize sections around AWS domains or objectives, not school chapters.",
        "Favor scenario-driven single-best-answer practice with explanation-friendly review after submit.",
        questionMixGuidance ||
          "Keep service-domain coverage broad enough that readiness feels certification-oriented rather than chapter-oriented.",
      ];
    case "language_proficiency":
      return [
        "Keep sections skill-specific and preserve formal section pacing across reading, listening, writing, or integrated prompts.",
        "Avoid implying production-ready speaking capture unless that workflow is explicitly configured.",
        questionMixGuidance ||
          "Use rubric-aware prompt mixes that reflect real skill demonstration rather than recall-only drills.",
      ];
    default:
      return [];
  }
}

export function getFamilyRecommendedAttemptPolicy(
  scoringDefaults: FamilyScoringDefaults,
) {
  if (!scoringDefaults || typeof scoringDefaults !== "object") {
    return "";
  }
  return typeof scoringDefaults.recommended_attempt_policy === "string"
    ? String(scoringDefaults.recommended_attempt_policy)
    : "";
}

export function summarizeFamilyScoringDefaults(
  scoringDefaults: FamilyScoringDefaults,
  tone: FamilyScoringSummaryTone,
) {
  if (!scoringDefaults || typeof scoringDefaults !== "object") {
    if (tone === "authoring") {
      return "Standard positive scoring is assumed unless the program defines a stronger exam-family contract.";
    }
    if (tone === "builder") {
      return "Standard positive scoring is assumed unless the exam overrides it.";
    }
    return "Standard positive scoring is assumed unless the linked family profile says otherwise.";
  }

  const negativeMarkingEnabled = Boolean(scoringDefaults.negative_marking_default);
  const supportsNumericEntry = Boolean(scoringDefaults.supports_numeric_entry);
  const supportsPartialScoring = Boolean(scoringDefaults.supports_partial_scoring);
  const attemptPolicy = getFamilyRecommendedAttemptPolicy(scoringDefaults).replaceAll("_", " ");

  if (tone === "authoring") {
    return [
      negativeMarkingEnabled
        ? "Negative marking is part of the default scoring posture."
        : "Negative marking is usually off for this family.",
      supportsNumericEntry ? "Numeric-entry authoring is expected where the syllabus needs it." : "",
      supportsPartialScoring ? "Partial scoring can be relevant for supported question types." : "",
      attemptPolicy ? `Most linked exams will lean toward ${attemptPolicy} attempts.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (tone === "builder") {
    return [
      negativeMarkingEnabled ? "Negative marking default is on." : "Negative marking default is off.",
      supportsNumericEntry ? "Numeric-entry support is expected." : "Numeric-entry support is not primary.",
      supportsPartialScoring ? "Partial scoring is available where question types allow it." : "Partial scoring is limited.",
      attemptPolicy ? `Recommended attempt posture: ${attemptPolicy}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    negativeMarkingEnabled
      ? "This family usually attaches to negative-marking exams."
      : "This family usually attaches to no-penalty exams.",
    supportsNumericEntry ? "Numeric-entry coverage is part of the expected bank shape." : "",
    supportsPartialScoring ? "Partial scoring may matter for some linked question types." : "",
    attemptPolicy ? `The usual attempt posture is ${attemptPolicy}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
