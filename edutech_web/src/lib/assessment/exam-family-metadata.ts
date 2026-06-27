export type AssessmentExamFamilyId =
  | "neet"
  | "jee"
  | "gre"
  | "aws_certification"
  | "language_proficiency";

export type AssessmentProgramFamilyCode =
  | "competitive"
  | "certification"
  | "language_proficiency";

export type AssessmentExamFamilyMetadata = {
  id: AssessmentExamFamilyId;
  label: string;
  category: string;
  programFamilyCode: AssessmentProgramFamilyCode;
  recommendedExamType: string;
  recommendedTimingModel: string;
  recommendedSecurityMode: string;
  recommendedReviewPolicy: string;
  recommendedResultVisibility: string;
  recommendedQuestionMixGuidance: string;
  authoringNote: string;
  defaultPresetPackId: string;
};

export const assessmentExamFamilyMetadataById: Record<
  AssessmentExamFamilyId,
  AssessmentExamFamilyMetadata
> = {
  neet: {
    id: "neet",
    label: "NEET",
    category: "Medical Entrance",
    programFamilyCode: "competitive",
    recommendedExamType: "mock_test",
    recommendedTimingModel: "Full-length timed mock with exam-day pacing discipline.",
    recommendedSecurityMode: "strict",
    recommendedReviewPolicy: "Post-submit review after the full attempt closes.",
    recommendedResultVisibility: "Scheduled or controlled publish after submission.",
    recommendedQuestionMixGuidance:
      "Biology-heavy objective mix with chemistry and physics coverage in large batches.",
    authoringNote:
      "Default to full mock structure first and keep section wording aligned to exam-day seriousness.",
    defaultPresetPackId: "neet_mock",
  },
  jee: {
    id: "jee",
    label: "JEE",
    category: "Engineering Entrance",
    programFamilyCode: "competitive",
    recommendedExamType: "mock_test",
    recommendedTimingModel: "Timed multi-section flow with tighter pacing and challenge emphasis.",
    recommendedSecurityMode: "strict",
    recommendedReviewPolicy: "Restrict review until submit so pacing stays realistic.",
    recommendedResultVisibility: "Controlled publish with stronger post-attempt analysis.",
    recommendedQuestionMixGuidance:
      "Objective plus numeric-style challenge mix with math, physics, and chemistry balance.",
    authoringNote:
      "Bias toward harder timed mock behavior and preserve space for numeric-entry expansion.",
    defaultPresetPackId: "jee_mains_math",
  },
  gre: {
    id: "gre",
    label: "GRE",
    category: "Graduate Admission",
    programFamilyCode: "competitive",
    recommendedExamType: "sectional_test",
    recommendedTimingModel: "Formal timed sections with structured pacing and completion cues.",
    recommendedSecurityMode: "moderate",
    recommendedReviewPolicy: "Allow formal post-submit review with section-aware guidance.",
    recommendedResultVisibility: "Publish total outcome with room for sectional expansion.",
    recommendedQuestionMixGuidance:
      "Adaptive-feeling quantitative reasoning mix that stays balanced across difficulty bands.",
    authoringNote:
      "Start with strong timed sectional drafts and keep summary language formal and readiness-oriented.",
    defaultPresetPackId: "gre_quant",
  },
  aws_certification: {
    id: "aws_certification",
    label: "AWS Certification",
    category: "Professional Certification",
    programFamilyCode: "certification",
    recommendedExamType: "practice_test",
    recommendedTimingModel: "Single-session certification practice with steady timed focus.",
    recommendedSecurityMode: "standard",
    recommendedReviewPolicy: "Practice-first review with explanation-friendly post-submit access.",
    recommendedResultVisibility: "Immediate or near-immediate readiness-oriented result visibility.",
    recommendedQuestionMixGuidance:
      "Scenario-based objective mix across service domains with concept and applied reasoning balance.",
    authoringNote:
      "Keep authoring practice-first and use clear domain framing instead of school-style chapter language.",
    defaultPresetPackId: "aws_practitioner",
  },
  language_proficiency: {
    id: "language_proficiency",
    label: "Language Proficiency",
    category: "Study Abroad",
    programFamilyCode: "language_proficiency",
    recommendedExamType: "mock_exam",
    recommendedTimingModel: "Section-led language simulation with guided pacing across reading, listening, writing, and integrated prompts.",
    recommendedSecurityMode: "focus",
    recommendedReviewPolicy: "Hold detailed review until submit so the simulation stays formal and distraction-light.",
    recommendedResultVisibility: "Controlled publish after evaluation, with room for manual review and band-style reporting.",
    recommendedQuestionMixGuidance:
      "Blend reading, listening, writing, and integrated prompt work with skill-aware section structure and rubric-guided manual review where needed.",
    authoringNote:
      "Keep sections skill-specific, rely on prompt-aware timing, and avoid implying production-ready speaking capture unless that workflow is explicitly configured.",
    defaultPresetPackId: "ielts_academic",
  },
};

export const assessmentExamFamilyPresetPackIds: Record<AssessmentExamFamilyId, string> = {
  neet: "neet_mock",
  jee: "jee_mains_math",
  gre: "gre_quant",
  aws_certification: "aws_practitioner",
  language_proficiency: "ielts_academic",
};

export function getAssessmentExamFamilyMetadata(
  familyId: AssessmentExamFamilyId | null | undefined,
) {
  if (!familyId) {
    return null;
  }
  return assessmentExamFamilyMetadataById[familyId] ?? null;
}

export function resolveAssessmentExamFamilyId(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.includes("neet") || normalized.includes("medical entrance")) {
    return "neet" satisfies AssessmentExamFamilyId;
  }
  if (normalized.includes("jee") || normalized.includes("engineering entrance")) {
    return "jee" satisfies AssessmentExamFamilyId;
  }
  if (normalized.includes("gre") || normalized.includes("graduate admission")) {
    return "gre" satisfies AssessmentExamFamilyId;
  }
  if (
    normalized.includes("ielts") ||
    normalized.includes("pte") ||
    normalized.includes("toefl") ||
    normalized.includes("language") ||
    normalized.includes("study abroad")
  ) {
    return "language_proficiency" satisfies AssessmentExamFamilyId;
  }
  if (
    normalized.includes("aws") ||
    normalized.includes("certification") ||
    normalized.includes("professional")
  ) {
    return "aws_certification" satisfies AssessmentExamFamilyId;
  }
  return null;
}
