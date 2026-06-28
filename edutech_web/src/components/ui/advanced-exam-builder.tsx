"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  examPresetPacks as defaultExamPresetPacks,
  type ExamPresetPackBuilderDefaults,
  type ExamPresetPackDefinition,
  type ExamPresetPackSectionTemplate,
  type ExamPresetPackTopicPool,
} from "@/lib/assessment/exam-preset-packs";
import {
  getAssessmentExamFamilyMetadata,
  resolveAssessmentExamFamilyId,
} from "@/lib/assessment/exam-family-metadata";
import { formatTopicOptionLabel, sortTopicOptions } from "@/lib/academics/topic-options";
import type { TeacherAssessmentRegistryResponse } from "@/lib/api/teacher-builder";

type Option = {
  value: string;
  label: string;
};

type TemplateAudience = "teacher" | "institute";

type AcademicYearOption = {
  id: string;
  name: string;
};

type ProgramOption = {
  id: string;
  name: string;
  code: string;
  assessment_family?: string | null;
  assessment_family_code?: string | null;
  assessment_family_label?: string | null;
  assessment_family_profile?: {
    code: string;
    label: string;
    description: string;
    allowed_question_types: string[];
    scoring_defaults: Record<string, unknown>;
    delivery_defaults: Record<string, unknown>;
    analytics_preset: Record<string, unknown>;
    authoring_hints: Record<string, unknown>;
  } | null;
};

type ScopeOption = {
  id: string;
  name: string;
  code: string;
};

type TopicOption = {
  id: string;
  subject: string;
  name: string;
  code: string;
  difficulty_level: string;
  sort_order: number;
};

type DifficultyMix = {
  foundation: number;
  intermediate: number;
  advanced: number;
};

type QuestionQualitySummary = {
  healthy: number;
  watch: number;
  hard: number;
  skip_risk: number;
  ambiguous: number;
  revision_candidate: number;
  emerging: number;
  high_priority: number;
};

type TopicRow = {
  id: string;
  topicCode: string;
  count: number;
};

type SectionDraft = {
  id: string;
  name: string;
  order: number;
  subjectId: string;
  description: string;
  instructions: string;
  questionCount: number;
  marksPerQuestion: string;
  negativeMarksPerQuestion: string;
  timerEnabled: boolean;
  durationMinutes: string;
  allowSkipSection: boolean;
  lockAfterSubmit: boolean;
  difficultyMix: DifficultyMix;
  topics: TopicRow[];
};

type ExperienceOverrideDraft = {
  recommendedTimerMode: string;
  recommendedNavigationMode: string;
  recommendedMediaFlow: string;
  supportsSectionMediaGuidance: boolean;
  learnerSummary: string;
  creatorSummary: string;
};

type ExamPreview = {
  valid: boolean;
  blockers: string[];
  warnings: string[];
  resolved_exam: {
    title: string;
    code: string;
    source_type: string;
    source_teacher_id: string | null;
    start_at: string | null;
    end_at: string;
    academic_year_end_at: string;
    duration_minutes: number;
    total_questions: number;
    total_marks: string;
    question_quality: QuestionQualitySummary;
    experience_profile: {
      assessment_family_label: string;
      experience_label: string;
      recommended_media_flow_label: string;
      recommended_timer_mode: string;
      recommended_navigation_mode: string;
      learner_summary: string;
      runtime_alignment: boolean;
    };
  };
  sections: Array<{
    name: string;
    order: number;
    requested: number;
    resolved: number;
    difficulty_mix: DifficultyMix;
    actual_difficulty_breakup: DifficultyMix;
    quality_summary: QuestionQualitySummary;
    topic_breakup: Array<{
      topic_code: string;
      topic_name: string;
      requested: number;
      resolved: number;
      difficulty_breakup: Record<string, number>;
      quality_breakup: QuestionQualitySummary;
    }>;
    blockers: string[];
    warnings: string[];
  }>;
};

type AdvancedExamBuilderProps = {
  audience: TemplateAudience;
  instituteCode: string;
  templateInstituteId?: string;
  scopeInstituteId?: string;
  hasTemplateLibraryAccess?: boolean;
  templateLibraryDisabledMessage?: string;
  scopeLabel: string;
  successBasePath: string;
  academicYears: AcademicYearOption[];
  programs: ProgramOption[];
  initialCohorts: ScopeOption[];
  initialSubjects: ScopeOption[];
  initialTopics: TopicOption[];
  assessmentRegistry: TeacherAssessmentRegistryResponse;
  examTypeOptions: Option[];
  deliveryModeOptions: Option[];
  statusOptions: Option[];
  sourceOptions: Option[];
  timerModeOptions: Option[];
  navigationModeOptions: Option[];
  attemptPolicyOptions: Option[];
  resultPublishModeOptions: Option[];
  reviewModeOptions: Option[];
  securityModeOptions: Option[];
  assignmentModeOptions: Option[];
  economyPolicyOptions: Option[];
  defaultSource: string;
};

type BuilderTemplateId =
  | "quick_practice"
  | "chapter_test"
  | "premium_mock";

type PresetPackId = string;

type BuilderTemplateDefinition = {
  id: BuilderTemplateId;
  label: string;
  note: string;
  chip: string;
  familyCodes: string[];
};

const examDurationSuggestions = ["20", "30", "45", "60", "75", "90", "120"];
const passingMarksSuggestions = ["0.00", "10.00", "20.00", "30.00", "40.00", "50.00"];
const sectionQuestionCountSuggestions = ["5", "10", "15", "20", "25", "30"];
const marksPerQuestionSuggestions = ["1.00", "2.00", "3.00", "4.00"];
const negativeMarksSuggestions = ["0.00", "0.25", "0.50", "1.00"];
const maxAttemptSuggestions = ["1", "2", "3", "5"];
const starCostSuggestions = ["0", "25", "50", "100", "120", "200"];
const prioritySuggestions = ["10", "20", "50", "100"];
const unlockPrioritySuggestions = ["10", "20", "50", "100"];
const unlockCountSuggestions = ["1", "2", "3", "5", "10"];
const unlockScoreSuggestions = ["40.00", "50.00", "60.00", "70.00", "80.00"];
const experienceMediaFlowOptions: Option[] = [
  { value: "free_reference", label: "Free reference media" },
  { value: "light_reference", label: "Light reference media" },
  { value: "guided_section_media", label: "Section-guided media" },
  { value: "controlled_exam_media", label: "Controlled exam media" },
];

type SavedBuilderTemplate = {
  id: string;
  name: string;
  audience_context: TemplateAudience;
  description: string;
  can_manage?: boolean;
  blueprint: {
    exam: AdvancedExamBuilderProps extends never ? never : {
      title: string;
      code: string;
      description: string;
      presetPackCode?: string;
      examType: string;
      deliveryMode: string;
      status: string;
      sourceType: string;
      durationMinutes: string;
      passingMarks: string;
      startAt: string;
      endAt: string;
      instructions: string;
      assessmentFamilyCode?: string;
      assessmentFamilyLabel?: string;
      experienceProfile?: ExperienceOverrideDraft;
    };
    delivery: {
      timerMode: string;
      navigationMode: string;
      attemptPolicy: string;
      resultPublishMode: string;
      reviewMode: string;
      securityMode: string;
      assignmentMode: string;
      maxAttempts: string;
      randomizeQuestions: boolean;
      randomizeOptions: boolean;
      allowLateSubmit: boolean;
      showResultImmediately: boolean;
      allowReviewAfterSubmit: boolean;
      allowResume: boolean;
      allowSectionSwitching: boolean;
      allowReturnToPreviousSection: boolean;
      resultPublishAt: string;
      reviewAvailableFrom: string;
      reviewAvailableUntil: string;
    };
    economy: {
      policyType: string;
      starCost: string;
      entitlementCode: string;
      priority: string;
      unlockRuleType: string;
      requiredStarBalance: string;
      requiredEntitlementCode: string;
      requiredCompletionCount: string;
      requiredScorePercentage: string;
      unlockPriority: string;
      adminOverrideAllowed: boolean;
    };
    selectionMode: string;
    sections: Array<{
      name: string;
      order: number;
      subjectCode?: string;
      description: string;
      instructions: string;
      questionCount: number;
      marksPerQuestion: string;
      negativeMarksPerQuestion: string;
      timerEnabled: boolean;
      durationMinutes: string;
      allowSkipSection: boolean;
      lockAfterSubmit: boolean;
      difficultyMix: DifficultyMix;
      topics: Array<{
        topicCode: string;
        count: number;
      }>;
    }>;
  };
  created_at?: string;
  updated_at?: string;
  created_by_teacher_name?: string | null;
};

type ManagedPresetPackDraft = {
  label: string;
  code: string;
  family: string;
  note: string;
  chip: string;
  scopeType: "platform" | "institute";
};

type TemplateExportBundle = {
  exportedAt: string;
  exportedFromAudience: TemplateAudience;
  templates: Array<{
    name: string;
    description: string;
    audience_context: TemplateAudience;
    blueprint: SavedBuilderTemplate["blueprint"];
  }>;
  version: 1;
};

const stages = [
  { id: "basics", label: "Basics", note: "Scope, identity, and schedule" },
  { id: "composition", label: "Composition", note: "Sections, topics, and counts" },
  { id: "delivery", label: "Delivery", note: "Attempt, navigation, and review" },
  { id: "access", label: "Access", note: "Economy and unlock behavior" },
] as const;

const builderTemplates: BuilderTemplateDefinition[] = [
  {
    id: "quick_practice",
    label: "Quick Practice",
    note: "One clean section for a fast topic-wise drill with generous review settings.",
    chip: "Free and repeatable",
    familyCodes: ["school", "certification"],
  },
  {
    id: "chapter_test",
    label: "Chapter Test",
    note: "Two sections with a calm core-to-challenge structure for regular academic delivery.",
    chip: "Teacher-friendly",
    familyCodes: ["school"],
  },
  {
    id: "premium_mock",
    label: "Premium Mock",
    note: "A harder three-section mock with premium access defaults and stronger runtime control.",
    chip: "Monetization-ready",
    familyCodes: ["competitive", "certification", "language_proficiency"],
  },
];

function normalizeAssessmentFamilyCode(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized.includes("language") || normalized.includes("ielts") || normalized.includes("toefl") || normalized.includes("pte")) {
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

function createManagedPresetPackDraft(
  scopeType: ManagedPresetPackDraft["scopeType"],
): ManagedPresetPackDraft {
  return {
    label: "",
    code: "",
    family: "",
    note: "",
    chip: "",
    scopeType,
  };
}

function getTemplateAssessmentFamilyCode(template: SavedBuilderTemplate) {
  return normalizeAssessmentFamilyCode(template.blueprint.exam.assessmentFamilyCode);
}

function getTemplateAssessmentFamilyLabel(template: SavedBuilderTemplate) {
  return template.blueprint.exam.assessmentFamilyLabel?.trim() || "";
}

function getPresetPackProgramFamilyCode(pack: ExamPresetPackDefinition) {
  if (pack.familyId) {
    return getAssessmentExamFamilyMetadata(pack.familyId)?.programFamilyCode ?? "";
  }
  if (pack.programFamilyCode) {
    return pack.programFamilyCode;
  }
  return normalizeAssessmentFamilyCode(pack.family || pack.chip || pack.id);
}

function resolvePresetPackTopicCodes(
  topicPool: ExamPresetPackTopicPool,
  topicGroups: {
    firstTwo: string[];
    firstThree: string[];
    all: string[];
  },
) {
  switch (topicPool) {
    case "firstTwo":
      return topicGroups.firstTwo;
    case "firstThree":
      return topicGroups.firstThree;
    case "all":
      return topicGroups.all;
    case "allOrFirstThree":
      return topicGroups.all.length ? topicGroups.all : topicGroups.firstThree;
    default:
      return topicGroups.firstThree;
  }
}

function createSectionsFromPresetPackDefaults(
  sectionTemplates: ExamPresetPackSectionTemplate[],
  topicGroups: {
    firstTwo: string[];
    firstThree: string[];
    all: string[];
  },
  subjectId: string,
) {
  return sectionTemplates.map((section, index) =>
    createSectionFromTemplate({
      index,
      subjectId,
      name: section.name,
      questionCount: section.questionCount,
      topicCodes: resolvePresetPackTopicCodes(section.topicPool, topicGroups),
      difficultyMix: section.difficultyMix,
      marksPerQuestion: section.marksPerQuestion,
      negativeMarksPerQuestion: section.negativeMarksPerQuestion,
      timerEnabled: section.timerEnabled,
      durationMinutes: section.durationMinutes,
      allowSkipSection: section.allowSkipSection,
      lockAfterSubmit: section.lockAfterSubmit,
    }),
  );
}

function buildTopicCodeGroups(topics: TopicOption[]) {
  const sortedTopics = sortTopicOptions(topics);
  const firstTwo = sortedTopics.slice(0, Math.min(2, sortedTopics.length)).map((topic) => topic.code);
  const firstThree = sortedTopics.slice(0, Math.min(3, sortedTopics.length)).map((topic) => topic.code);
  const all = sortedTopics.map((topic) => topic.code);

  return {
    firstTwo: firstTwo.length > 0 ? firstTwo : all,
    firstThree: firstThree.length > 0 ? firstThree : all,
    all,
  };
}

function resolveExamFamilyIdForProgram(program: ProgramOption | null) {
  const candidates = [
    program?.name,
    program?.code,
    program?.assessment_family_profile?.label,
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

function summarizePresetPackSections(pack: ExamPresetPackDefinition | null) {
  const sections = pack?.builderDefaults?.sections ?? [];
  if (sections.length === 0) {
    return "No structured section guidance is mapped yet.";
  }
  return sections
    .map((section) => `${section.name} (${section.questionCount})`)
    .join(" | ");
}

function scoringDefaultsSummary(scoringDefaults: Record<string, unknown> | null | undefined) {
  if (!scoringDefaults || typeof scoringDefaults !== "object") {
    return "Standard positive scoring is assumed unless the exam overrides it.";
  }
  const negativeMarkingEnabled = Boolean(scoringDefaults.negative_marking_default);
  const supportsNumericEntry = Boolean(scoringDefaults.supports_numeric_entry);
  const supportsPartialScoring = Boolean(scoringDefaults.supports_partial_scoring);
  const attemptPolicy =
    typeof scoringDefaults.recommended_attempt_policy === "string"
      ? String(scoringDefaults.recommended_attempt_policy).replaceAll("_", " ")
      : "";

  return [
    negativeMarkingEnabled ? "Negative marking default is on." : "Negative marking default is off.",
    supportsNumericEntry ? "Numeric-entry support is expected." : "Numeric-entry support is not primary.",
    supportsPartialScoring ? "Partial scoring is available where question types allow it." : "Partial scoring is limited.",
    attemptPolicy ? `Recommended attempt posture: ${attemptPolicy}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildFamilyExecutionChecklist(
  familyId: ReturnType<typeof resolveAssessmentExamFamilyId>,
  presetPack: ExamPresetPackDefinition | null,
) {
  const questionMix = presetPack?.recommendations?.questionMixGuidance ?? "";
  switch (familyId) {
    case "neet":
      return [
        "Keep the exam mock-first: full-length pacing, one serious attempt posture, and controlled post-submit release.",
        "Use large Biology, Chemistry, and Physics blocks instead of chapter-sized micro checks.",
        questionMix || "Preserve a Biology-heavy objective mix with Chemistry and Physics support in each section plan.",
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
        questionMix || "Balance quant reasoning coverage across difficulty bands instead of clustering only easy or only advanced prompts.",
      ];
    case "aws_certification":
      return [
        "Organize sections around AWS domains or objectives, not school chapters.",
        "Favor scenario-driven single-best-answer practice with explanation-friendly review after submit.",
        questionMix || "Keep service-domain coverage broad enough that readiness feels certification-oriented rather than chapter-oriented.",
      ];
    case "language_proficiency":
      return [
        "Keep sections skill-specific and preserve formal section pacing across reading, listening, writing, or integrated prompts.",
        "Avoid implying production-ready speaking capture unless that workflow is explicitly configured.",
        questionMix || "Use rubric-aware prompt mixes that reflect real skill demonstration rather than recall-only drills.",
      ];
    default:
      return [];
  }
}

function hydrateSectionsFromBlueprint(
  sectionRows: SavedBuilderTemplate["blueprint"]["sections"],
  availableTopicCodes: Set<string>,
  fallbackTopicCode: string,
  fallbackSubjectId: string,
  subjectOptions: ScopeOption[],
) {
  const subjectByCode = new Map(subjectOptions.map((item) => [item.code, item.id]));
  return sectionRows.map((section, sectionIndex) => ({
    id: uid("section"),
    name: section.name,
    order: sectionIndex + 1,
    subjectId: section.subjectCode ? (subjectByCode.get(section.subjectCode) ?? fallbackSubjectId) : fallbackSubjectId,
    description: section.description,
    instructions: section.instructions,
    questionCount: section.questionCount,
    marksPerQuestion: section.marksPerQuestion,
    negativeMarksPerQuestion: section.negativeMarksPerQuestion,
    timerEnabled: section.timerEnabled,
    durationMinutes: section.durationMinutes,
    allowSkipSection: section.allowSkipSection,
    lockAfterSubmit: section.lockAfterSubmit,
    difficultyMix: { ...section.difficultyMix },
    topics: section.topics.map((topicRow, topicIndex) => ({
      id: uid("topic"),
      topicCode:
        topicRow.topicCode && (availableTopicCodes.has(topicRow.topicCode) || Boolean(section.subjectCode))
          ? topicRow.topicCode
          : sectionIndex === 0 && topicIndex === 0
            ? fallbackTopicCode
            : "",
      count: topicRow.count,
    })),
  }));
}

function getRecommendedAttemptPolicy(scoringDefaults: Record<string, unknown> | null | undefined) {
  if (!scoringDefaults || typeof scoringDefaults !== "object") {
    return "";
  }
  return typeof scoringDefaults.recommended_attempt_policy === "string"
    ? String(scoringDefaults.recommended_attempt_policy)
    : "";
}

function getSectionScoringAlerts(
  section: SectionDraft,
  index: number,
  familyProfile?: ProgramOption["assessment_family_profile"] | null,
) {
  const alerts: string[] = [];
  const scoringDefaults = familyProfile?.scoring_defaults;
  const negativeMarkingEnabled = Boolean(scoringDefaults?.negative_marking_default);
  const negativeMarks = Number(section.negativeMarksPerQuestion || 0);
  const marksPerQuestion = Number(section.marksPerQuestion || 0);
  const sectionLabel = resolveSectionLabel(section, index);

  if (negativeMarkingEnabled && negativeMarks <= 0 && section.questionCount > 0) {
    alerts.push(
      `${sectionLabel} has no negative marks even though ${familyProfile?.label ?? "this family"} usually expects them for objective scoring.`,
    );
  }

  if (!negativeMarkingEnabled && negativeMarks > 0) {
    alerts.push(
      `${sectionLabel} adds negative marks even though ${familyProfile?.label ?? "this family"} usually runs without them.`,
    );
  }

  if (negativeMarks > 0 && marksPerQuestion > 0 && negativeMarks >= marksPerQuestion) {
    alerts.push(
      `${sectionLabel} has negative marks equal to or higher than the positive marks per question. Double-check the scoring ratio.`,
    );
  }

  return alerts;
}

const deliverySelectConfig: Array<{
  label: string;
  key:
    | "timerMode"
    | "navigationMode"
    | "attemptPolicy"
    | "resultPublishMode"
    | "reviewMode"
    | "securityMode"
    | "assignmentMode";
}> = [
  { label: "Timer mode", key: "timerMode" },
  { label: "Navigation mode", key: "navigationMode" },
  { label: "Attempt policy", key: "attemptPolicy" },
  { label: "Result publish mode", key: "resultPublishMode" },
  { label: "Review mode", key: "reviewMode" },
  { label: "Security mode", key: "securityMode" },
  { label: "Assignment mode", key: "assignmentMode" },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createSectionDraft(index: number, subjectId = "", topicCode = ""): SectionDraft {
  return {
    id: uid("section"),
    name: `Section ${String.fromCharCode(65 + index)}`,
    order: index + 1,
    subjectId,
    description: "",
    instructions: "",
    questionCount: 10,
    marksPerQuestion: "1.00",
    negativeMarksPerQuestion: "0.00",
    timerEnabled: false,
    durationMinutes: "",
    allowSkipSection: true,
    lockAfterSubmit: false,
    difficultyMix: {
      foundation: 30,
      intermediate: 50,
      advanced: 20,
    },
    topics: [
      {
        id: uid("topic"),
        topicCode,
        count: 10,
      },
    ],
  };
}

function distributeTopicCounts(total: number, topicCodes: string[]) {
  if (topicCodes.length === 0) {
    return [];
  }

  const base = Math.floor(total / topicCodes.length);
  const remainder = total % topicCodes.length;

  return topicCodes.map((topicCode, index) => ({
    id: uid("topic"),
    topicCode,
    count: base + (index < remainder ? 1 : 0),
  }));
}

function createSectionFromTemplate({
  index,
  subjectId,
  name,
  questionCount,
  topicCodes,
  difficultyMix,
  marksPerQuestion,
  negativeMarksPerQuestion,
  timerEnabled = false,
  durationMinutes = "",
  allowSkipSection = true,
  lockAfterSubmit = false,
}: {
  index: number;
  subjectId: string;
  name: string;
  questionCount: number;
  topicCodes: string[];
  difficultyMix: DifficultyMix;
  marksPerQuestion: string;
  negativeMarksPerQuestion: string;
  timerEnabled?: boolean;
  durationMinutes?: string;
  allowSkipSection?: boolean;
  lockAfterSubmit?: boolean;
}) {
  return {
    id: uid("section"),
    name,
    order: index + 1,
    subjectId,
    description: "",
    instructions: "",
    questionCount,
    marksPerQuestion,
    negativeMarksPerQuestion,
    timerEnabled,
    durationMinutes,
    allowSkipSection,
    lockAfterSubmit,
    difficultyMix,
    topics: distributeTopicCounts(questionCount, topicCodes),
  } satisfies SectionDraft;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function qualityTone(signal: keyof QuestionQualitySummary) {
  if (signal === "ambiguous" || signal === "revision_candidate") return "statusDemo";
  if (signal === "skip_risk" || signal === "hard" || signal === "watch") return "statusWarning";
  if (signal === "healthy") return "statusLive";
  return "statusNeutral";
}

function qualitySummaryRows(summary: QuestionQualitySummary) {
  return [
    { key: "healthy", label: "Healthy", value: summary.healthy },
    { key: "high_priority", label: "Revision queue", value: summary.high_priority },
    { key: "ambiguous", label: "Ambiguous", value: summary.ambiguous },
    { key: "emerging", label: "Emerging", value: summary.emerging },
  ] as const;
}

function resolveSectionLabel(section: Pick<SectionDraft, "name">, index: number) {
  return section.name.trim() || `Section ${String.fromCharCode(65 + index)}`;
}

function getAssignedTopicCount(section: Pick<SectionDraft, "topics">) {
  return section.topics
    .filter((topicRow) => topicRow.topicCode)
    .reduce((total, topicRow) => total + Number(topicRow.count || 0), 0);
}

function getSectionTopicCountError(section: SectionDraft, index: number) {
  const requestedQuestionCount = Number(section.questionCount || 0);
  const assignedTopicCount = getAssignedTopicCount(section);

  if (assignedTopicCount === requestedQuestionCount) {
    return "";
  }

  return `${resolveSectionLabel(section, index)} has ${assignedTopicCount} topic slot(s), but needs ${requestedQuestionCount} question(s). Adjust the topic counts so they match the section question count.`;
}

function getTopicOptionsForSection(
  section: Pick<SectionDraft, "subjectId">,
  topicOptionsBySubject: Record<string, TopicOption[]>,
) {
  return sortTopicOptions(topicOptionsBySubject[section.subjectId] ?? []);
}

function getBuilderCompositionError(sections: SectionDraft[]) {
  for (const [index, section] of sections.entries()) {
    const sectionError = getSectionTopicCountError(section, index);
    if (sectionError) {
      return sectionError;
    }
  }

  return "";
}

function parseApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Something went wrong while talking to the builder.";
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
  }

  const composition = record.composition;
  if (composition && typeof composition === "object") {
    const compositionRecord = composition as Record<string, unknown>;
    if (Array.isArray(compositionRecord.sections)) {
      for (const sectionEntry of compositionRecord.sections) {
        if (!sectionEntry || typeof sectionEntry !== "object") {
          continue;
        }
        const sectionRecord = sectionEntry as Record<string, unknown>;
        if (Array.isArray(sectionRecord.topics) && sectionRecord.topics.length > 0) {
          return String(sectionRecord.topics[0]);
        }
        if (Array.isArray(sectionRecord.duration_minutes) && sectionRecord.duration_minutes.length > 0) {
          return String(sectionRecord.duration_minutes[0]);
        }
      }
    }
  }

  for (const value of Object.values(record)) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
  }

  return "Something went wrong while talking to the builder.";
}

async function fetchLookup<T>(path: string) {
  const response = await fetch(path, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to refresh builder scope right now.");
  }

  const payload = (await response.json()) as { results: T[] };
  return payload.results;
}

async function fetchSavedTemplates() {
  const response = await fetch("/api/exams/advanced-templates?is_active=true&page_size=100", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(parseApiError(payload));
  }
  const payload = (await response.json()) as { results?: SavedBuilderTemplate[] };
  return Array.isArray(payload.results) ? payload.results : [];
}

async function fetchPresetPacks() {
  const response = await fetch("/api/exams/preset-packs", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(parseApiError(payload));
  }
  const payload = (await response.json()) as { results?: ExamPresetPackDefinition[] };
  return Array.isArray(payload.results) ? payload.results : defaultExamPresetPacks;
}

function audienceLabel(audienceValue: TemplateAudience) {
  return audienceValue === "teacher" ? "Teacher" : "Institute";
}

function codeSlug(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function presetPackCodeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function abbreviation(value: string, fallback: string) {
  const compact = codeSlug(value).replace(/-/g, "");
  if (!compact) {
    return fallback;
  }
  return compact.slice(0, Math.min(4, compact.length));
}

function recommendedDurationForExamType(examType: string) {
  switch (examType) {
    case "practice":
      return "20";
    case "quiz":
      return "30";
    case "test":
      return "45";
    case "assessment":
      return "60";
    case "mock_exam":
      return "75";
    case "final_exam":
      return "120";
    default:
      return "60";
  }
}

function recommendedDurationForProgramFamily(examType: string, familyCode?: string | null) {
  switch (familyCode) {
    case "competitive":
      switch (examType) {
        case "practice":
          return "45";
        case "quiz":
          return "60";
        case "test":
          return "90";
        case "assessment":
          return "120";
        case "mock_exam":
        case "final_exam":
          return "180";
        default:
          return "90";
      }
    case "certification":
      switch (examType) {
        case "practice":
          return "30";
        case "quiz":
          return "45";
        case "test":
          return "60";
        case "assessment":
          return "75";
        case "mock_exam":
          return "90";
        case "final_exam":
          return "120";
        default:
          return "60";
      }
    case "language_proficiency":
      switch (examType) {
        case "practice":
          return "30";
        case "quiz":
          return "40";
        case "test":
          return "60";
        case "assessment":
          return "90";
        case "mock_exam":
          return "150";
        case "final_exam":
          return "180";
        default:
          return "60";
      }
    default:
      return recommendedDurationForExamType(examType);
  }
}

function recommendedPassingMarksForExamType(examType: string) {
  switch (examType) {
    case "practice":
      return "0.00";
    case "quiz":
      return "10.00";
    case "test":
      return "20.00";
    case "assessment":
      return "30.00";
    case "mock_exam":
      return "40.00";
    case "final_exam":
      return "50.00";
    default:
      return "0.00";
  }
}

function recommendedPassingMarksForProgramFamily(examType: string, familyCode?: string | null) {
  switch (familyCode) {
    case "competitive":
    case "language_proficiency":
      return "0.00";
    case "certification":
      switch (examType) {
        case "practice":
          return "0.00";
        case "quiz":
          return "30.00";
        case "test":
          return "50.00";
        case "assessment":
          return "60.00";
        case "mock_exam":
        case "final_exam":
          return "70.00";
        default:
          return "50.00";
      }
    default:
      return recommendedPassingMarksForExamType(examType);
  }
}

function defaultExperienceOverridesForExamType(examType: string): ExperienceOverrideDraft {
  switch (examType) {
    case "practice":
      return {
        recommendedTimerMode: "global",
        recommendedNavigationMode: "free_exam",
        recommendedMediaFlow: "free_reference",
        supportsSectionMediaGuidance: false,
        learnerSummary: "Best for drills, revision loops, and low-pressure concept practice.",
        creatorSummary: "Prefer flexible navigation, light timing, and optional reference media.",
      };
    case "quiz":
      return {
        recommendedTimerMode: "global",
        recommendedNavigationMode: "free_section",
        recommendedMediaFlow: "light_reference",
        supportsSectionMediaGuidance: false,
        learnerSummary: "Short checks designed to confirm recall quickly.",
        creatorSummary: "Keep the flow tight, use shorter sections, and avoid heavy media dependence.",
      };
    case "mock_exam":
    case "final_exam":
      return {
        recommendedTimerMode: "section",
        recommendedNavigationMode: "sequential",
        recommendedMediaFlow: "controlled_exam_media",
        supportsSectionMediaGuidance: true,
        learnerSummary: "Mirrors an exam-day sequence with stricter pacing and controlled transitions.",
        creatorSummary: "Prefer clear section contracts, locked pacing, and explicit instructions per skill block.",
      };
    case "assessment":
    case "test":
    default:
      return {
        recommendedTimerMode: "hybrid",
        recommendedNavigationMode: "hybrid",
        recommendedMediaFlow: "guided_section_media",
        supportsSectionMediaGuidance: true,
        learnerSummary: "Balanced testing flow with enough structure for unit tests and term assessments.",
        creatorSummary: "Use sections to separate topics or skills and introduce media only where needed.",
      };
  }
}

function familyAwareExperienceOverrides(
  examType: string,
  familyProfile?: ProgramOption["assessment_family_profile"] | null,
): ExperienceOverrideDraft {
  const base = defaultExperienceOverridesForExamType(examType);
  if (!familyProfile) {
    return base;
  }

  const deliveryDefaults = familyProfile.delivery_defaults ?? {};
  const authoringHints = familyProfile.authoring_hints ?? {};

  return {
    recommendedTimerMode:
      typeof deliveryDefaults.recommended_timer_mode === "string"
        ? deliveryDefaults.recommended_timer_mode
        : base.recommendedTimerMode,
    recommendedNavigationMode:
      typeof deliveryDefaults.recommended_navigation_mode === "string"
        ? deliveryDefaults.recommended_navigation_mode
        : base.recommendedNavigationMode,
    recommendedMediaFlow:
      typeof deliveryDefaults.recommended_media_flow === "string"
        ? deliveryDefaults.recommended_media_flow
        : base.recommendedMediaFlow,
    supportsSectionMediaGuidance:
      typeof deliveryDefaults.supports_section_media_guidance === "boolean"
        ? deliveryDefaults.supports_section_media_guidance
        : base.supportsSectionMediaGuidance,
    learnerSummary: `${base.learnerSummary} Tuned for the ${familyProfile.label} family.`,
    creatorSummary:
      typeof authoringHints.recommended_section_shape === "string"
        ? `${base.creatorSummary} Suggested structure: ${String(authoringHints.recommended_section_shape).replaceAll("_", " ")}.`
        : `${base.creatorSummary} Tuned for the ${familyProfile.label} family.`,
  };
}

function templateAccessCopy(template: SavedBuilderTemplate) {
  if (template.can_manage) {
    return template.audience_context === "teacher" ? "Personal template" : "Shared template";
  }
  return template.audience_context === "institute" ? "Shared read-only" : "Read-only";
}

function buildDuplicateTemplateName(
  sourceName: string,
  existingNames: string[],
) {
  const normalizedExistingNames = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  const baseName = `${sourceName.trim()} Copy`;
  if (!normalizedExistingNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  let counter = 2;
  while (normalizedExistingNames.has(`${baseName} ${counter}`.toLowerCase())) {
    counter += 1;
  }
  return `${baseName} ${counter}`;
}

export function AdvancedExamBuilder({
  audience,
  instituteCode,
  templateInstituteId = "",
  scopeInstituteId = "",
  hasTemplateLibraryAccess = true,
  templateLibraryDisabledMessage = "",
  scopeLabel,
  successBasePath,
  academicYears,
  programs,
  initialCohorts,
  initialSubjects,
  initialTopics,
  assessmentRegistry,
  examTypeOptions,
  deliveryModeOptions,
  statusOptions,
  sourceOptions,
  timerModeOptions,
  navigationModeOptions,
  attemptPolicyOptions,
  resultPublishModeOptions,
  reviewModeOptions,
  securityModeOptions,
  assignmentModeOptions,
  economyPolicyOptions,
  defaultSource,
}: AdvancedExamBuilderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProgramRecord = programs[0] ?? null;
  const initialProgramFamilyId = resolveExamFamilyIdForProgram(initialProgramRecord);
  const initialProgramPresetPack =
    defaultExamPresetPacks.find((pack) => pack.familyId === initialProgramFamilyId && pack.builderDefaults) ?? null;
  const initialTopicGroups = buildTopicCodeGroups(initialTopics);
  const initialExamDefaults = initialProgramPresetPack?.builderDefaults?.exam;
  const initialDeliveryDefaults = initialProgramPresetPack?.builderDefaults?.delivery;
  const initialEconomyDefaults = initialProgramPresetPack?.builderDefaults?.economy;
  const initialExperienceDefaults = initialProgramPresetPack?.builderDefaults?.experience;
  const initialSelectionMode = initialProgramPresetPack?.builderDefaults?.selectionMode ?? "strict";
  const initialSections =
    initialProgramPresetPack?.builderDefaults?.sections?.length
      ? createSectionsFromPresetPackDefaults(
          initialProgramPresetPack.builderDefaults.sections,
          initialTopicGroups,
          initialSubjects[0]?.id ?? "",
        )
      : [createSectionDraft(0, initialSubjects[0]?.id ?? "", initialTopics[0]?.code ?? "")];
  const templateImportInputRef = useRef<HTMLInputElement | null>(null);
  const requestedPresetPackAppliedRef = useRef("");
  const [activeStage, setActiveStage] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateDescription, setEditingTemplateDescription] = useState("");
  const [allSavedTemplates, setAllSavedTemplates] = useState<SavedBuilderTemplate[]>([]);
  const [presetPackLibrary, setPresetPackLibrary] = useState<ExamPresetPackDefinition[]>(
    defaultExamPresetPacks,
  );
  const [presetPackSearch, setPresetPackSearch] = useState("");
  const [editingPresetPackId, setEditingPresetPackId] = useState("");
  const [managedPresetPackDraft, setManagedPresetPackDraft] = useState<ManagedPresetPackDraft>(
    createManagedPresetPackDraft(defaultSource === "platform" ? "platform" : "institute"),
  );
  const [templateAudience, setTemplateAudience] = useState<TemplateAudience>(audience);
  const [templateLibraryAudience, setTemplateLibraryAudience] = useState<TemplateAudience>(audience);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const [isPreviewPending, setIsPreviewPending] = useState(false);
  const [isCreatePending, setIsCreatePending] = useState(false);
  const [preview, setPreview] = useState<ExamPreview | null>(null);

  const [selectedAcademicYear, setSelectedAcademicYear] = useState(academicYears[0]?.id ?? "");
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.id ?? "");
  const [selectedCohort, setSelectedCohort] = useState(
    initialCohorts.length === 1 ? initialCohorts[0]?.id ?? "" : "",
  );
  const [selectedSubject, setSelectedSubject] = useState(initialSubjects[0]?.id ?? "");
  const [cohortOptions, setCohortOptions] = useState(initialCohorts);
  const [subjectOptions, setSubjectOptions] = useState(initialSubjects);
  const [topicOptionsBySubject, setTopicOptionsBySubject] = useState<Record<string, TopicOption[]>>(
    initialSubjects[0]?.id
      ? { [initialSubjects[0].id]: sortTopicOptions(initialTopics) }
      : {},
  );

  const [exam, setExam] = useState({
    title: "",
    code: "",
    description: "",
    presetPackCode: initialProgramPresetPack?.id ?? "",
    examType: initialExamDefaults?.examType ?? examTypeOptions[0]?.value ?? "test",
    deliveryMode: initialExamDefaults?.deliveryMode ?? deliveryModeOptions[0]?.value ?? "online",
    status: initialExamDefaults?.status ?? statusOptions[0]?.value ?? "draft",
    sourceType: defaultSource,
    durationMinutes: initialExamDefaults?.durationMinutes ?? "60",
    passingMarks: initialExamDefaults?.passingMarks ?? "0.00",
    startAt: "",
    endAt: "",
    instructions: "",
  });

  const [delivery, setDelivery] = useState({
    timerMode: initialDeliveryDefaults?.timerMode ?? timerModeOptions[0]?.value ?? "global",
    navigationMode: initialDeliveryDefaults?.navigationMode ?? navigationModeOptions[0]?.value ?? "free_exam",
    attemptPolicy: initialDeliveryDefaults?.attemptPolicy ?? attemptPolicyOptions[0]?.value ?? "single",
    resultPublishMode:
      initialDeliveryDefaults?.resultPublishMode ?? resultPublishModeOptions[0]?.value ?? "after_review",
    reviewMode: initialDeliveryDefaults?.reviewMode ?? reviewModeOptions[0]?.value ?? "attempted_only",
    securityMode: initialDeliveryDefaults?.securityMode ?? securityModeOptions[0]?.value ?? "normal",
    assignmentMode: initialDeliveryDefaults?.assignmentMode ?? assignmentModeOptions[0]?.value ?? "scope",
    maxAttempts: initialDeliveryDefaults?.maxAttempts ?? "1",
    randomizeQuestions: initialDeliveryDefaults?.randomizeQuestions ?? true,
    randomizeOptions: initialDeliveryDefaults?.randomizeOptions ?? true,
    allowLateSubmit: false,
    showResultImmediately: initialDeliveryDefaults?.resultPublishMode === "immediate",
    allowReviewAfterSubmit: !["disabled", "none"].includes(initialDeliveryDefaults?.reviewMode ?? ""),
    allowResume: initialDeliveryDefaults?.allowResume ?? true,
    allowSectionSwitching: initialDeliveryDefaults?.allowSectionSwitching ?? true,
    allowReturnToPreviousSection: initialDeliveryDefaults?.allowReturnToPreviousSection ?? true,
    resultPublishAt: "",
    reviewAvailableFrom: "",
    reviewAvailableUntil: "",
  });

  const [experienceOverride, setExperienceOverride] = useState<ExperienceOverrideDraft>(
    initialExperienceDefaults ??
      familyAwareExperienceOverrides(
        initialExamDefaults?.examType ?? examTypeOptions[0]?.value ?? "test",
        programs[0]?.assessment_family_profile ?? null,
      ),
  );

  const [economy, setEconomy] = useState({
    policyType: initialEconomyDefaults?.policyType ?? economyPolicyOptions[0]?.value ?? "",
    starCost: initialEconomyDefaults?.starCost ?? "0",
    entitlementCode: initialEconomyDefaults?.entitlementCode ?? "",
    priority: "100",
    unlockRuleType: initialEconomyDefaults?.unlockRuleType ?? "",
    requiredStarBalance: "",
    requiredEntitlementCode: "",
    requiredCompletionCount: "",
    requiredScorePercentage: "",
    unlockPriority: "100",
    adminOverrideAllowed: true,
  });

  const [selectionMode, setSelectionMode] = useState(initialSelectionMode);
  const [sections, setSections] = useState<SectionDraft[]>(initialSections);
  const deferredSections = useDeferredValue(sections);
  const topicOptions = useMemo(
    () => topicOptionsBySubject[selectedSubject] ?? [],
    [selectedSubject, topicOptionsBySubject],
  );
  const sortedTopicOptions = useMemo(() => sortTopicOptions(topicOptions), [topicOptions]);
  const deliveryOptionsByKey = {
    timerMode: timerModeOptions,
    navigationMode: navigationModeOptions,
    attemptPolicy: attemptPolicyOptions,
    resultPublishMode: resultPublishModeOptions,
    reviewMode: reviewModeOptions,
    securityMode: securityModeOptions,
    assignmentMode: assignmentModeOptions,
  } as const;
  const saveAudienceOptions = useMemo<TemplateAudience[]>(
    () => (audience === "teacher" ? ["teacher"] : ["institute"]),
    [audience],
  );
  const libraryAudienceOptions = useMemo<TemplateAudience[]>(
    () => (audience === "teacher" ? ["teacher", "institute"] : ["institute"]),
    [audience],
  );
  const effectiveTemplateAudience = saveAudienceOptions.includes(templateAudience)
    ? templateAudience
    : saveAudienceOptions[0];
  const effectiveTemplateLibraryAudience = libraryAudienceOptions.includes(templateLibraryAudience)
    ? templateLibraryAudience
    : libraryAudienceOptions[0];
  const selectedProgramRecord = useMemo(
    () => programs.find((item) => item.id === selectedProgram) ?? null,
    [programs, selectedProgram],
  );
  const selectedProgramFamilyProfile = selectedProgramRecord?.assessment_family_profile ?? null;
  const selectedProgramFamilyCode = useMemo(
    () => normalizeAssessmentFamilyCode(selectedProgramRecord?.assessment_family_code),
    [selectedProgramRecord?.assessment_family_code],
  );
  const selectedProgramFamilyId = useMemo(
    () => resolveExamFamilyIdForProgram(selectedProgramRecord),
    [selectedProgramRecord],
  );
  const selectedPresetPack = useMemo(
    () => presetPackLibrary.find((pack) => pack.id === exam.presetPackCode) ?? null,
    [exam.presetPackCode, presetPackLibrary],
  );
  const effectiveFamilyId = useMemo(
    () => selectedPresetPack?.familyId ?? selectedProgramFamilyId,
    [selectedPresetPack?.familyId, selectedProgramFamilyId],
  );
  const selectedProgramFamilyMetadata = useMemo(
    () => getAssessmentExamFamilyMetadata(effectiveFamilyId),
    [effectiveFamilyId],
  );
  const selectedProgramPresetPack = useMemo(() => {
    const activePresetPack =
      selectedPresetPack?.builderDefaults ? selectedPresetPack : null;
    if (
      activePresetPack &&
      ((effectiveFamilyId && activePresetPack.familyId === effectiveFamilyId) ||
        (selectedProgramFamilyCode &&
          activePresetPack.programFamilyCode === selectedProgramFamilyCode) ||
        !selectedProgramFamilyId)
    ) {
      return activePresetPack;
    }

    return (
      presetPackLibrary.find(
        (pack) =>
          pack.builderDefaults &&
          ((effectiveFamilyId && pack.familyId === effectiveFamilyId) ||
            (selectedProgramFamilyCode && pack.programFamilyCode === selectedProgramFamilyCode)),
      ) ?? null
    );
  }, [effectiveFamilyId, selectedPresetPack, presetPackLibrary, selectedProgramFamilyCode, selectedProgramFamilyId]);
  const familyExecutionChecklist = useMemo(
    () => buildFamilyExecutionChecklist(effectiveFamilyId, selectedProgramPresetPack),
    [effectiveFamilyId, selectedProgramPresetPack],
  );
  const normalizedTemplateSearch = templateSearch.trim().toLowerCase();
  const savedTemplates = useMemo(
    () =>
      allSavedTemplates
        .filter((template) => template.audience_context === effectiveTemplateLibraryAudience)
        .filter((template) => {
          if (!normalizedTemplateSearch) {
            return true;
          }
          const searchable = [
            template.name,
            template.description,
            template.created_by_teacher_name ?? "",
            audienceLabel(template.audience_context),
          ]
            .join(" ")
            .toLowerCase();
          return searchable.includes(normalizedTemplateSearch);
        })
        .sort((left, right) => {
          const leftFamilyMatch =
            selectedProgramFamilyCode && getTemplateAssessmentFamilyCode(left) === selectedProgramFamilyCode;
          const rightFamilyMatch =
            selectedProgramFamilyCode && getTemplateAssessmentFamilyCode(right) === selectedProgramFamilyCode;
          const familyDelta = Number(Boolean(rightFamilyMatch)) - Number(Boolean(leftFamilyMatch));
          if (familyDelta !== 0) {
            return familyDelta;
          }
          const manageDelta = Number(Boolean(right.can_manage)) - Number(Boolean(left.can_manage));
          if (manageDelta !== 0) {
            return manageDelta;
          }
          return left.name.localeCompare(right.name);
        }),
    [
      allSavedTemplates,
      effectiveTemplateLibraryAudience,
      normalizedTemplateSearch,
      selectedProgramFamilyCode,
    ],
  );
  const manageableTemplateIdsInView = useMemo(
    () => savedTemplates.filter((template) => template.can_manage).map((template) => template.id),
    [savedTemplates],
  );
  const selectedManageableTemplateIds = useMemo(
    () => selectedTemplateIds.filter((id) => manageableTemplateIdsInView.includes(id)),
    [selectedTemplateIds, manageableTemplateIdsInView],
  );
  const allManageableTemplatesSelected =
    manageableTemplateIdsInView.length > 0 &&
    manageableTemplateIdsInView.every((id) => selectedTemplateIds.includes(id));
  const normalizedPresetPackSearch = presetPackSearch.trim().toLowerCase();
  const managedPresetPacks = useMemo(
    () =>
      presetPackLibrary
        .filter((pack) => Boolean(pack.scope_type))
        .filter((pack) => {
          if (!normalizedPresetPackSearch) {
            return true;
          }
          const searchable = [pack.label, pack.family, pack.note, pack.chip, pack.id]
            .join(" ")
            .toLowerCase();
          return searchable.includes(normalizedPresetPackSearch);
        })
        .sort((left, right) => {
          const manageDelta = Number(Boolean(right.can_manage)) - Number(Boolean(left.can_manage));
          if (manageDelta !== 0) {
            return manageDelta;
          }
          return left.label.localeCompare(right.label);
        }),
    [normalizedPresetPackSearch, presetPackLibrary],
  );
  const editableManagedPresetCount = useMemo(
    () => managedPresetPacks.filter((pack) => pack.can_manage).length,
    [managedPresetPacks],
  );

  useEffect(() => {
    let ignore = false;

    async function loadBuilderAssets() {
      try {
        const [templates, presetPackResults] = await Promise.all([
          hasTemplateLibraryAccess ? fetchSavedTemplates() : Promise.resolve([]),
          fetchPresetPacks(),
        ]);
        if (!ignore) {
          setAllSavedTemplates(templates);
          setPresetPackLibrary(presetPackResults);
        }
      } catch (templateError) {
        if (!ignore) {
          setError(
            templateError instanceof Error
              ? templateError.message
              : "Unable to load saved templates right now.",
          );
        }
      }
    }

    void loadBuilderAssets();

    return () => {
      ignore = true;
    };
  }, [audience, hasTemplateLibraryAccess, instituteCode]);

  useEffect(() => {
    let ignore = false;

    async function refreshScope() {
      if (!selectedProgram) {
        setCohortOptions([]);
        setSubjectOptions([]);
        setSelectedCohort("");
        setSelectedSubject("");
        setTopicOptionsBySubject({});
        return;
      }

      setIsScopeLoading(true);
      setError("");

      try {
        const cohortQuery = new URLSearchParams({
          is_active: "true",
          program: selectedProgram,
        });
        if (scopeInstituteId) {
          cohortQuery.set("institute", scopeInstituteId);
        }
        if (selectedAcademicYear) {
          cohortQuery.set("academic_year", selectedAcademicYear);
        }

        const subjectQuery = new URLSearchParams({
          is_active: "true",
          program: selectedProgram,
        });
        if (scopeInstituteId) {
          subjectQuery.set("institute", scopeInstituteId);
        }

        const [nextCohorts, nextSubjects] = await Promise.all([
          fetchLookup<ScopeOption>(`/api/teacher/academics/cohorts?${cohortQuery.toString()}`),
          fetchLookup<ScopeOption>(`/api/teacher/academics/subjects?${subjectQuery.toString()}`),
        ]);

        if (ignore) {
          return;
        }

        setCohortOptions(nextCohorts);
        setSubjectOptions(nextSubjects);
        setSelectedCohort((current) =>
          current && nextCohorts.some((cohort) => cohort.id === current)
            ? current
            : nextCohorts.length === 1
              ? nextCohorts[0]?.id ?? ""
              : "",
        );
        setSelectedSubject((current) =>
          current && nextSubjects.some((subject) => subject.id === current)
            ? current
            : (nextSubjects[0]?.id ?? ""),
        );
      } catch (scopeError) {
        if (!ignore) {
          setError(scopeError instanceof Error ? scopeError.message : "Unable to refresh scope right now.");
        }
      } finally {
        if (!ignore) {
          setIsScopeLoading(false);
        }
      }
    }

    void refreshScope();

    return () => {
      ignore = true;
    };
  }, [scopeInstituteId, selectedAcademicYear, selectedProgram]);

  useEffect(() => {
    let ignore = false;

    async function refreshTopics() {
      const subjectIdsToLoad = Array.from(
        new Set(
          [selectedSubject, ...sections.map((section) => section.subjectId)]
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ).filter((subjectId) => !(subjectId in topicOptionsBySubject));

      if (subjectIdsToLoad.length === 0) {
        return;
      }

      try {
        const loadedTopicPairs = await Promise.all(
          subjectIdsToLoad.map(async (subjectId) => {
            const query = new URLSearchParams({
              is_active: "true",
              subject: subjectId,
            });
            if (scopeInstituteId) {
              query.set("institute", scopeInstituteId);
            }
            const nextTopics = await fetchLookup<TopicOption>(
              `/api/teacher/academics/topics?${query.toString()}`,
            );
            return [subjectId, sortTopicOptions(nextTopics)] as const;
          }),
        );

        if (ignore) {
          return;
        }

        setTopicOptionsBySubject((current) => {
          const next = { ...current };
          for (const [subjectId, topics] of loadedTopicPairs) {
            next[subjectId] = topics;
          }
          return next;
        });
        setSections((currentSections) =>
          currentSections.map((section, sectionIndex) => ({
            ...section,
            subjectId:
              section.subjectId && subjectOptions.some((subject) => subject.id === section.subjectId)
                ? section.subjectId
                : (selectedSubject || subjectOptions[0]?.id || ""),
            topics: section.topics.map((topicRow, topicIndex) => {
              const sectionTopics =
                loadedTopicPairs.find(([subjectId]) => subjectId === section.subjectId)?.[1]
                ?? topicOptionsBySubject[section.subjectId]
                ?? [];
              const allowedCodes = new Set(sectionTopics.map((topic) => topic.code));
              const fallbackCode = sectionTopics[0]?.code ?? "";
              return {
                ...topicRow,
                topicCode:
                  topicRow.topicCode && allowedCodes.has(topicRow.topicCode)
                    ? topicRow.topicCode
                    : sectionIndex === 0 && topicIndex === 0
                      ? fallbackCode
                      : "",
              };
            }),
          })),
        );
      } catch (scopeError) {
        if (!ignore) {
          setError(scopeError instanceof Error ? scopeError.message : "Unable to refresh topics right now.");
        }
      }
    }

    void refreshTopics();

    return () => {
      ignore = true;
    };
  }, [scopeInstituteId, sections, selectedSubject, subjectOptions, topicOptionsBySubject]);

  const selectedAcademicYearRecord = useMemo(
    () => academicYears.find((item) => item.id === selectedAcademicYear) ?? null,
    [academicYears, selectedAcademicYear],
  );
  const selectedCohortRecord = useMemo(
    () => cohortOptions.find((item) => item.id === selectedCohort) ?? null,
    [cohortOptions, selectedCohort],
  );
  const selectedSubjectRecord = useMemo(
    () => subjectOptions.find((item) => item.id === selectedSubject) ?? null,
    [subjectOptions, selectedSubject],
  );

  useEffect(() => {
    if (subjectOptions.length === 0) {
      return;
    }

    const fallbackSubjectId = selectedSubject || subjectOptions[0]?.id || "";
    setSections((currentSections) =>
      currentSections.map((section) =>
        section.subjectId && subjectOptions.some((subject) => subject.id === section.subjectId)
          ? section
          : {
              ...section,
              subjectId: fallbackSubjectId,
              topics: section.topics.map((topicRow) => ({
                ...topicRow,
                topicCode: "",
              })),
            },
      ),
    );
  }, [selectedSubject, subjectOptions]);
  const selectedExamTypeLabel = useMemo(
    () => examTypeOptions.find((item) => item.value === exam.examType)?.label ?? titleCase(exam.examType),
    [exam.examType, examTypeOptions],
  );
  const recommendedBuilderTemplates = useMemo(() => {
    if (!selectedProgramFamilyCode) {
      return builderTemplates;
    }
    return [...builderTemplates].sort((left, right) => {
      const leftMatch = left.familyCodes.includes(selectedProgramFamilyCode);
      const rightMatch = right.familyCodes.includes(selectedProgramFamilyCode);
      return Number(rightMatch) - Number(leftMatch);
    });
  }, [selectedProgramFamilyCode]);
  const recommendedPresetPacks = useMemo(() => {
    if (!selectedProgramFamilyCode) {
      return presetPackLibrary;
    }
    return [...presetPackLibrary].sort((left, right) => {
      const leftMatch = getPresetPackProgramFamilyCode(left) === selectedProgramFamilyCode;
      const rightMatch = getPresetPackProgramFamilyCode(right) === selectedProgramFamilyCode;
      return Number(rightMatch) - Number(leftMatch);
    });
  }, [presetPackLibrary, selectedProgramFamilyCode]);
  const allowedQuestionTypeDefinitions = useMemo(() => {
    const allowedCodes = selectedProgramFamilyProfile?.allowed_question_types ?? [];
    if (!allowedCodes.length) {
      return [] as TeacherAssessmentRegistryResponse["question_types"];
    }
    return assessmentRegistry.question_types.filter((definition) => allowedCodes.includes(definition.code));
  }, [assessmentRegistry.question_types, selectedProgramFamilyProfile]);
  const recommendedExamMetadata = useMemo(() => {
    const subjectLabel = selectedSubjectRecord?.name ?? "Subject";
    const subjectCode = selectedSubjectRecord?.code ?? "SUB";
    const programLabel = selectedProgramRecord?.name ?? "Program";
    const programCode = selectedProgramRecord?.code ?? "PRG";
    const cohortLabel = selectedCohortRecord?.name ?? "All Cohorts";
    const cohortCode = selectedCohortRecord?.code ?? "ALL";
    const recommendedPackDefaults = selectedProgramPresetPack?.builderDefaults?.exam;
    const recommendedPackLabel = selectedProgramPresetPack?.label ?? selectedProgramFamilyProfile?.label ?? "";

    return {
      code: [
        abbreviation(programCode, "PRG"),
        abbreviation(subjectCode, "SUB"),
        abbreviation(cohortCode, "ALL"),
        abbreviation(recommendedPackDefaults?.codeSuffix ?? selectedExamTypeLabel, "EXAM"),
        "01",
      ]
        .filter(Boolean)
        .join("-"),
      description:
        recommendedPackDefaults?.description ??
        `${selectedExamTypeLabel} for ${cohortLabel} in ${subjectLabel} under ${programLabel}.`,
      durationMinutes:
        selectedProgramPresetPack?.recommendations?.suggestedDurationMinutes ??
        recommendedPackDefaults?.durationMinutes ??
        recommendedDurationForProgramFamily(
          exam.examType,
          selectedProgramFamilyCode,
        ),
      passingMarks:
        recommendedPackDefaults?.passingMarks ??
        recommendedPassingMarksForProgramFamily(
          exam.examType,
          selectedProgramFamilyCode,
        ),
      templateName: `${subjectLabel} ${recommendedPackLabel || selectedExamTypeLabel} Template`,
      title: `${subjectLabel} ${recommendedPackDefaults?.titleSuffix ?? selectedExamTypeLabel}`,
    };
  }, [
    exam.examType,
    selectedCohortRecord,
    selectedExamTypeLabel,
    selectedProgramFamilyCode,
    selectedProgramFamilyProfile?.label,
    selectedProgramPresetPack,
    selectedProgramRecord,
    selectedSubjectRecord,
  ]);
  const requestedPresetPack = searchParams.get("preset_pack")?.trim() ?? "";
  const selectedTemplateTopicCodes = useMemo(() => {
    return buildTopicCodeGroups(sortedTopicOptions);
  }, [sortedTopicOptions]);

  const requestedQuestionCount = deferredSections.reduce(
    (total, section) => total + Number(section.questionCount || 0),
    0,
  );
  const estimatedMarks = deferredSections.reduce(
    (total, section) =>
      total + Number(section.questionCount || 0) * Number(section.marksPerQuestion || 0),
    0,
  );
  const previewSectionsWithWarnings = preview?.sections.filter((section) => section.warnings.length > 0) ?? [];
  const previewSectionsWithBlockers = preview?.sections.filter((section) => section.blockers.length > 0) ?? [];
  const previewSectionWarningCount = previewSectionsWithWarnings.reduce(
    (total, section) => total + section.warnings.length,
    0,
  );
  const previewBlockerCount = preview?.blockers.length ?? 0;
  const sectionScoringAlerts = useMemo(
    () =>
      sections.flatMap((section, index) =>
        getSectionScoringAlerts(section, index, selectedProgramFamilyProfile).map((message) => ({
          sectionId: section.id,
          message,
        })),
      ),
    [sections, selectedProgramFamilyProfile],
  );
  const recommendedAttemptPolicy = useMemo(
    () => getRecommendedAttemptPolicy(selectedProgramFamilyProfile?.scoring_defaults),
    [selectedProgramFamilyProfile?.scoring_defaults],
  );
  const deliveryContractAlerts = useMemo(() => {
    const alerts: string[] = [];
    if (!selectedProgramFamilyProfile) {
      return alerts;
    }

    if (recommendedAttemptPolicy && delivery.attemptPolicy !== recommendedAttemptPolicy) {
      alerts.push(
        `${selectedProgramFamilyProfile.label} recommends "${titleCase(recommendedAttemptPolicy)}" attempts, but this exam is set to "${titleCase(delivery.attemptPolicy)}".`,
      );
    }

    if (recommendedAttemptPolicy === "single" && Number(delivery.maxAttempts || 1) > 1) {
      alerts.push(
        `${selectedProgramFamilyProfile.label} typically runs with one attempt, but max attempts is set to ${delivery.maxAttempts}.`,
      );
    }

    if (Boolean(selectedProgramFamilyProfile.scoring_defaults?.supports_numeric_entry)) {
      alerts.push(
        "Numeric-entry questions are part of this family contract. Keep at least one numeric-answer lane available in the linked question bank when relevant.",
      );
    }

    return alerts;
  }, [delivery.attemptPolicy, delivery.maxAttempts, recommendedAttemptPolicy, selectedProgramFamilyProfile]);

  function autoFillExamDetails(force = false) {
    setExam((current) => ({
      ...current,
      title: force || !current.title.trim() ? recommendedExamMetadata.title : current.title,
      code: force || !current.code.trim() ? recommendedExamMetadata.code : current.code,
      description:
        force || !current.description.trim()
          ? recommendedExamMetadata.description
          : current.description,
      durationMinutes:
        force || !current.durationMinutes.trim()
          ? recommendedExamMetadata.durationMinutes
          : current.durationMinutes,
      passingMarks:
        force || !current.passingMarks.trim()
          ? recommendedExamMetadata.passingMarks
          : current.passingMarks,
    }));
    setTemplateName((current) =>
      force || !current.trim()
        ? recommendedExamMetadata.templateName
        : current,
    );
  }

  function applyExperiencePreset(examType: string) {
    const preset = familyAwareExperienceOverrides(examType, selectedProgramFamilyProfile);
    setExperienceOverride(preset);
    setMessage(
      selectedProgramFamilyProfile
        ? `Experience profile reset to the ${selectedProgramFamilyProfile.label} family preset.`
        : `Experience profile reset to the ${titleCase(examType)} preset.`,
    );
  }

  function applyProgramFamilyDefaults() {
    if (!selectedProgramFamilyProfile && !selectedProgramPresetPack?.builderDefaults) {
      setMessage("This program does not have an assessment family profile yet.");
      return;
    }

    if (selectedProgramPresetPack?.builderDefaults) {
      const defaults = selectedProgramPresetPack.builderDefaults;
      setExam((current) => ({
        ...current,
        presetPackCode: selectedProgramPresetPack.id,
        examType: defaults.exam.examType,
        deliveryMode: defaults.exam.deliveryMode,
        status: defaults.exam.status,
        durationMinutes: defaults.exam.durationMinutes,
        passingMarks: defaults.exam.passingMarks,
        title:
          current.title.trim() ||
          `${selectedSubjectRecord?.name ?? "Subject"} ${defaults.exam.titleSuffix}`,
        description: current.description.trim() || defaults.exam.description,
      }));
      setDelivery((current) => ({
        ...current,
        ...defaults.delivery,
        showResultImmediately: defaults.delivery.resultPublishMode === "immediate",
        allowReviewAfterSubmit: !["disabled", "none"].includes(defaults.delivery.reviewMode),
      }));
      setEconomy((current) => ({
        ...current,
        policyType: defaults.economy.policyType,
        starCost: defaults.economy.starCost,
        entitlementCode: defaults.economy.entitlementCode,
        unlockRuleType: defaults.economy.unlockRuleType,
      }));
      setExperienceOverride(defaults.experience);
      setSelectionMode(defaults.selectionMode);
      if (defaults.sections.length > 0) {
        setSections(
          createSectionsFromPresetPackDefaults(defaults.sections, selectedTemplateTopicCodes, selectedSubject),
        );
      }
      setMessage(
        `Builder defaults aligned to ${selectedProgramPresetPack.label} for the ${selectedProgramFamilyProfile?.label ?? "selected"} family.`,
      );
      return;
    }

    setDelivery((current) => ({
      ...current,
      timerMode:
        typeof selectedProgramFamilyProfile?.delivery_defaults?.recommended_timer_mode === "string"
          ? String(selectedProgramFamilyProfile.delivery_defaults.recommended_timer_mode)
          : current.timerMode,
      navigationMode:
        typeof selectedProgramFamilyProfile?.delivery_defaults?.recommended_navigation_mode === "string"
          ? String(selectedProgramFamilyProfile.delivery_defaults.recommended_navigation_mode)
          : current.navigationMode,
    }));
    setExam((current) => ({
      ...current,
      durationMinutes: recommendedDurationForProgramFamily(
        current.examType,
        selectedProgramFamilyCode,
      ),
      passingMarks: recommendedPassingMarksForProgramFamily(
        current.examType,
        selectedProgramFamilyCode,
      ),
    }));
    setExperienceOverride(
      familyAwareExperienceOverrides(exam.examType, selectedProgramFamilyProfile),
    );
    setMessage(
      `Builder defaults aligned to the ${selectedProgramFamilyProfile?.label ?? "selected"} family.`,
    );
  }

  function isManagedPresetPackBlueprint(
    value: unknown,
  ): value is SavedBuilderTemplate["blueprint"] {
    if (!value || typeof value !== "object") {
      return false;
    }
    const record = value as Record<string, unknown>;
    return Boolean(
      record.exam &&
        typeof record.exam === "object" &&
        record.delivery &&
        typeof record.delivery === "object" &&
        record.economy &&
        typeof record.economy === "object" &&
        Array.isArray(record.sections),
    );
  }

  const applyManagedPresetPack = useCallback((pack: ExamPresetPackDefinition) => {
    if (!isManagedPresetPackBlueprint(pack.config)) {
      setError(`Preset pack "${pack.label}" does not have a valid builder configuration yet.`);
      return false;
    }

    const blueprint = pack.config;
    const availableTopicCodes = new Set(sortedTopicOptions.map((topic) => topic.code));
    const { experienceProfile, ...examBlueprint } = blueprint.exam;
    setExam({
      ...examBlueprint,
      presetPackCode: pack.id,
    });
    setExperienceOverride(
      experienceProfile ??
        familyAwareExperienceOverrides(
          blueprint.exam.examType,
          selectedProgramFamilyProfile,
        ),
    );
    setDelivery({ ...blueprint.delivery });
    setEconomy({ ...blueprint.economy });
    setSelectionMode(blueprint.selectionMode);
    setSections(
      hydrateSectionsFromBlueprint(
        blueprint.sections,
        availableTopicCodes,
        topicOptions[0]?.code ?? "",
        selectedSubject,
        subjectOptions,
      ),
    );
    setPreview(null);
    setError("");
    setMessage(`${pack.label} preset pack applied from managed configuration.`);
    setActiveStage(1);
    return true;
  }, [selectedProgramFamilyProfile, selectedSubject, sortedTopicOptions, subjectOptions, topicOptions]);

  const applyPresetPack = useCallback((presetId: PresetPackId) => {
    if (topicOptions.length === 0 || !selectedSubjectRecord) {
      setError("Choose a subject with active topics before applying a preset pack.");
      return;
    }

    const presetDefinition =
      presetPackLibrary.find((pack) => pack.id === presetId) ?? null;
    if (
      presetDefinition &&
      presetDefinition.config &&
      Object.keys(presetDefinition.config).length > 0
    ) {
      if (applyManagedPresetPack(presetDefinition)) {
        return;
      }
    }

    const subjectCode = selectedSubjectRecord.code.toUpperCase();
    const subjectLabel = selectedSubjectRecord.name;
    const subjectSlug = subjectCode.replace(/[^A-Z0-9]+/g, "-");
    const firstTwoTopics = selectedTemplateTopicCodes.firstTwo;
    const firstThreeTopics = selectedTemplateTopicCodes.firstThree;
    const allTopics = selectedTemplateTopicCodes.all;

    setPreview(null);
    setError("");

    const assignPack = (
      nextExam: Partial<typeof exam>,
      nextDelivery: Partial<typeof delivery>,
      nextEconomy: Partial<typeof economy>,
      nextSections: SectionDraft[],
      nextExperience: ExperienceOverrideDraft,
      nextSelectionMode = "strict",
      messageLabel: string,
    ) => {
      setExam((current) => ({
        ...current,
        ...nextExam,
        presetPackCode: presetId,
      }));
      setDelivery((current) => ({ ...current, ...nextDelivery }));
      setEconomy((current) => ({ ...current, ...nextEconomy }));
      setSections(nextSections);
      setExperienceOverride(nextExperience);
      setSelectionMode(nextSelectionMode);
      setMessage(`${messageLabel} preset pack applied. Fine-tune counts, instructions, or access before preview.`);
      setActiveStage(1);
    };

    const applyStructuredStarterPack = (
      defaults: ExamPresetPackBuilderDefaults,
      messageLabel: string,
    ) => {
      assignPack(
        {
          title: `${subjectLabel} ${defaults.exam.titleSuffix}`,
          code: `${subjectSlug}-${defaults.exam.codeSuffix}`,
          description: defaults.exam.description,
          examType: defaults.exam.examType,
          deliveryMode: defaults.exam.deliveryMode,
          status: defaults.exam.status,
          durationMinutes: defaults.exam.durationMinutes,
          passingMarks: defaults.exam.passingMarks,
        },
        defaults.delivery,
        defaults.economy,
        createSectionsFromPresetPackDefaults(
          defaults.sections,
          {
            firstTwo: firstTwoTopics,
            firstThree: firstThreeTopics,
            all: allTopics,
          },
          selectedSubject,
        ),
        defaults.experience,
        defaults.selectionMode,
        messageLabel,
      );
    };

    if (presetDefinition?.builderDefaults) {
      applyStructuredStarterPack(
        presetDefinition.builderDefaults,
        presetDefinition.label,
      );
      return;
    }

    setError(`Preset pack "${presetDefinition?.label ?? presetId}" is not configured for automatic application yet.`);
  }, [
    applyManagedPresetPack,
    presetPackLibrary,
    selectedSubjectRecord,
    selectedTemplateTopicCodes,
    topicOptions.length,
  ]);

  useEffect(() => {
    if (!requestedPresetPack) {
      requestedPresetPackAppliedRef.current = "";
      return;
    }
    if (requestedPresetPackAppliedRef.current === requestedPresetPack) {
      return;
    }
    if (topicOptions.length === 0 || !selectedSubjectRecord || presetPackLibrary.length === 0) {
      return;
    }

    const presetId = requestedPresetPack;
    queueMicrotask(() => {
      startTransition(() => {
        applyPresetPack(presetId);
        requestedPresetPackAppliedRef.current = presetId;
      });
    });
  }, [
    applyPresetPack,
    presetPackLibrary.length,
    requestedPresetPack,
    selectedSubjectRecord,
    topicOptions.length,
  ]);

  function updateSection(sectionId: string, updater: (section: SectionDraft) => SectionDraft) {
    setSections((current) =>
      current.map((section) => (section.id === sectionId ? updater(section) : section)),
    );
  }

  function addSection() {
    setSections((current) => [
      ...current,
      createSectionDraft(current.length, selectedSubject, sortedTopicOptions[0]?.code ?? ""),
    ]);
  }

  function removeSection(sectionId: string) {
    setSections((current) =>
      current
        .filter((section) => section.id !== sectionId)
        .map((section, index) => ({
          ...section,
          order: index + 1,
          name: section.name || `Section ${String.fromCharCode(65 + index)}`,
        })),
    );
  }

  function addTopicRow(sectionId: string) {
    updateSection(sectionId, (section) => ({
      ...section,
      topics: [
        ...section.topics,
        {
          id: uid("topic"),
          topicCode: "",
          count: 1,
        },
      ],
    }));
  }

  function removeTopicRow(sectionId: string, topicRowId: string) {
    updateSection(sectionId, (section) => ({
      ...section,
      topics: section.topics.filter((topicRow) => topicRow.id !== topicRowId),
    }));
  }

  function applyTemplate(templateId: BuilderTemplateId) {
    if (topicOptions.length === 0 || !selectedSubjectRecord) {
      setError("Choose a subject with active topics before applying a template.");
      return;
    }

    const subjectCode = selectedSubjectRecord.code.toUpperCase();
    const subjectLabel = selectedSubjectRecord.name;
    const subjectSlug = subjectCode.replace(/[^A-Z0-9]+/g, "-");

    setPreview(null);
    setError("");

    if (templateId === "quick_practice") {
      setExam((current) => ({
        ...current,
        title: `${subjectLabel} Quick Practice`,
        code: `${subjectSlug}-QP-01`,
        description:
          "A short practice set meant for fast repetition, confidence-building, and immediate review.",
        examType: "practice",
        deliveryMode: "online",
        status: "draft",
        durationMinutes: "20",
      }));
      setDelivery((current) => ({
        ...current,
        timerMode: "global",
        navigationMode: "free_exam",
        attemptPolicy: "unlimited_practice",
        resultPublishMode: "immediate",
        reviewMode: "solution_review",
        securityMode: "normal",
        assignmentMode: "scope",
        maxAttempts: "1",
        randomizeQuestions: true,
        randomizeOptions: true,
        showResultImmediately: true,
        allowReviewAfterSubmit: true,
        allowResume: true,
        allowSectionSwitching: true,
        allowReturnToPreviousSection: true,
      }));
      setEconomy((current) => ({
        ...current,
        policyType: "free",
        starCost: "0",
        entitlementCode: "",
        unlockRuleType: "",
      }));
      setExperienceOverride(familyAwareExperienceOverrides("practice", selectedProgramFamilyProfile));
      setSelectionMode("strict");
      setSections([
        createSectionFromTemplate({
          index: 0,
          subjectId: selectedSubject,
          name: "Practice Set",
          questionCount: 15,
          topicCodes: selectedTemplateTopicCodes.firstTwo,
          difficultyMix: { foundation: 40, intermediate: 40, advanced: 20 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
        }),
      ]);
      setMessage("Quick Practice template applied. You can fine-tune counts, topics, and policies before preview.");
      setActiveStage(1);
      return;
    }

    if (templateId === "chapter_test") {
      setExam((current) => ({
        ...current,
        title: `${subjectLabel} Chapter Test`,
        code: `${subjectSlug}-CT-01`,
        description:
          "A balanced chapter-wise test with a clear split between core understanding and harder application.",
        examType: "test",
        deliveryMode: "online",
        status: "draft",
        durationMinutes: "45",
      }));
      setDelivery((current) => ({
        ...current,
        timerMode: "global",
        navigationMode: "free_section",
        attemptPolicy: "single",
        resultPublishMode: "after_review",
        reviewMode: "attempted_only",
        securityMode: "normal",
        assignmentMode: "scope",
        maxAttempts: "1",
        randomizeQuestions: true,
        randomizeOptions: true,
        showResultImmediately: false,
        allowReviewAfterSubmit: true,
        allowResume: true,
        allowSectionSwitching: true,
        allowReturnToPreviousSection: true,
      }));
      setEconomy((current) => ({
        ...current,
        policyType: "free",
        starCost: "0",
        entitlementCode: "",
        unlockRuleType: "",
      }));
      setExperienceOverride(familyAwareExperienceOverrides("test", selectedProgramFamilyProfile));
      setSelectionMode("strict");
      setSections([
        createSectionFromTemplate({
          index: 0,
          subjectId: selectedSubject,
          name: "Core Concepts",
          questionCount: 18,
          topicCodes: selectedTemplateTopicCodes.firstTwo,
          difficultyMix: { foundation: 35, intermediate: 45, advanced: 20 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
        }),
        createSectionFromTemplate({
          index: 1,
          subjectId: selectedSubject,
          name: "Application and Challenge",
          questionCount: 12,
          topicCodes: selectedTemplateTopicCodes.firstThree,
          difficultyMix: { foundation: 15, intermediate: 45, advanced: 40 },
          marksPerQuestion: "2.00",
          negativeMarksPerQuestion: "0.25",
          allowSkipSection: true,
          lockAfterSubmit: false,
        }),
      ]);
      setMessage("Chapter Test template applied. Edit sections or topics if this chapter needs a different emphasis.");
      setActiveStage(1);
      return;
    }

    setExam((current) => ({
      ...current,
      title: `${subjectLabel} Premium Mock`,
      code: `${subjectSlug}-PM-01`,
      description:
        "A premium mock structured for serious readiness checks, harder later sections, and flexible monetization.",
      examType: "mock_exam",
      deliveryMode: "online",
      status: "draft",
      durationMinutes: "75",
    }));
    setDelivery((current) => ({
      ...current,
      timerMode: "global",
      navigationMode: "hybrid",
      attemptPolicy: "single",
      resultPublishMode: "after_review",
      reviewMode: "attempted_only",
      securityMode: "focus",
      assignmentMode: "scope",
      maxAttempts: "1",
      randomizeQuestions: true,
      randomizeOptions: true,
      showResultImmediately: false,
      allowReviewAfterSubmit: true,
      allowResume: true,
      allowSectionSwitching: true,
      allowReturnToPreviousSection: true,
    }));
    setEconomy((current) => ({
      ...current,
      policyType: "stars_or_entitlement",
      starCost: "120",
      entitlementCode: `bundle:${subjectCode.toLowerCase()}-premium`,
      priority: "20",
      unlockRuleType: "",
    }));
    setSelectionMode("strict");
    setSections([
      createSectionFromTemplate({
        index: 0,
        subjectId: selectedSubject,
        name: "Foundation Sweep",
        questionCount: 15,
        topicCodes: selectedTemplateTopicCodes.all,
        difficultyMix: { foundation: 35, intermediate: 45, advanced: 20 },
        marksPerQuestion: "1.00",
        negativeMarksPerQuestion: "0.00",
      }),
      createSectionFromTemplate({
        index: 1,
        subjectId: selectedSubject,
        name: "Applied Pressure",
        questionCount: 15,
        topicCodes: selectedTemplateTopicCodes.all,
        difficultyMix: { foundation: 15, intermediate: 45, advanced: 40 },
        marksPerQuestion: "2.00",
        negativeMarksPerQuestion: "0.25",
      }),
      createSectionFromTemplate({
        index: 2,
        subjectId: selectedSubject,
        name: "Ranker Finish",
        questionCount: 15,
        topicCodes: selectedTemplateTopicCodes.firstThree,
        difficultyMix: { foundation: 10, intermediate: 30, advanced: 60 },
        marksPerQuestion: "2.00",
        negativeMarksPerQuestion: "0.25",
      }),
    ]);
    setMessage("Premium Mock template applied. Preview it after adjusting counts to match your actual topic pool.");
    setExperienceOverride(familyAwareExperienceOverrides("mock_exam", selectedProgramFamilyProfile));
    setActiveStage(1);
  }

  function buildPayload() {
    return {
      scope: {
        institute_code: instituteCode,
        academic_year_name: selectedAcademicYearRecord?.name ?? "",
        program_code: selectedProgramRecord?.code ?? "",
        cohort_code: selectedCohortRecord?.code ?? "",
        subject_code: selectedSubjectRecord?.code ?? "",
      },
      exam: {
        title: (exam.title.trim() || recommendedExamMetadata.title).trim(),
        code: (exam.code.trim() || recommendedExamMetadata.code).trim(),
        description: (exam.description.trim() || recommendedExamMetadata.description).trim(),
        preset_pack_code: exam.presetPackCode,
        exam_type: exam.examType,
        delivery_mode: exam.deliveryMode,
        status: exam.status,
        duration_minutes: Number(exam.durationMinutes || recommendedExamMetadata.durationMinutes || 0),
        passing_marks: exam.passingMarks || recommendedExamMetadata.passingMarks,
        start_at: exam.startAt ? new Date(exam.startAt).toISOString() : null,
        end_at: exam.endAt ? new Date(exam.endAt).toISOString() : null,
        instructions: exam.instructions.trim(),
        source_type: exam.sourceType,
        experience_profile: {
          recommended_timer_mode: experienceOverride.recommendedTimerMode,
          recommended_navigation_mode: experienceOverride.recommendedNavigationMode,
          recommended_media_flow: experienceOverride.recommendedMediaFlow,
          supports_section_media_guidance: experienceOverride.supportsSectionMediaGuidance,
          learner_summary: experienceOverride.learnerSummary.trim(),
          creator_summary: experienceOverride.creatorSummary.trim(),
        },
      },
      composition: {
        selection_mode: selectionMode,
        sections: sections.map((section, index) => ({
          name: section.name.trim() || `Section ${String.fromCharCode(65 + index)}`,
          order: index + 1,
          subject_code: subjectOptions.find((item) => item.id === section.subjectId)?.code ?? "",
          description: section.description.trim(),
          instructions: section.instructions.trim(),
          question_count: Number(section.questionCount || 0),
          marks_per_question: section.marksPerQuestion ? section.marksPerQuestion : null,
          negative_marks_per_question: section.negativeMarksPerQuestion
            ? section.negativeMarksPerQuestion
            : null,
          timer_enabled: section.timerEnabled,
          duration_minutes: section.durationMinutes ? Number(section.durationMinutes) : null,
          allow_skip_section: section.allowSkipSection,
          lock_after_submit: section.lockAfterSubmit,
          difficulty_mix: section.difficultyMix,
          topics: section.topics
            .filter((topicRow) => topicRow.topicCode)
            .map((topicRow) => ({
              topic_code: topicRow.topicCode,
              count: Number(topicRow.count || 0),
            })),
        })),
      },
      delivery: {
        timer_mode: delivery.timerMode,
        navigation_mode: delivery.navigationMode,
        attempt_policy: delivery.attemptPolicy,
        max_attempts: Number(delivery.maxAttempts || 1),
        result_publish_mode: delivery.resultPublishMode,
        review_mode: delivery.reviewMode,
        security_mode: delivery.securityMode,
        assignment_mode: delivery.assignmentMode,
        allow_late_submit: delivery.allowLateSubmit,
        randomize_questions: delivery.randomizeQuestions,
        randomize_options: delivery.randomizeOptions,
        show_result_immediately: delivery.showResultImmediately,
        allow_review_after_submit: delivery.allowReviewAfterSubmit,
        allow_resume: delivery.allowResume,
        allow_section_switching: delivery.allowSectionSwitching,
        allow_return_to_previous_section: delivery.allowReturnToPreviousSection,
        result_publish_at: delivery.resultPublishAt ? new Date(delivery.resultPublishAt).toISOString() : null,
        review_available_from: delivery.reviewAvailableFrom
          ? new Date(delivery.reviewAvailableFrom).toISOString()
          : null,
        review_available_until: delivery.reviewAvailableUntil
          ? new Date(delivery.reviewAvailableUntil).toISOString()
          : null,
      },
      economy: {
        policy_type: economy.policyType,
        star_cost: Number(economy.starCost || 0),
        entitlement_code: economy.entitlementCode.trim(),
        priority: Number(economy.priority || 100),
        unlock_rule: {
          rule_type: economy.unlockRuleType,
          required_star_balance: economy.requiredStarBalance ? Number(economy.requiredStarBalance) : null,
          required_entitlement_code: economy.requiredEntitlementCode.trim(),
          required_completion_count: economy.requiredCompletionCount
            ? Number(economy.requiredCompletionCount)
            : null,
          required_score_percentage: economy.requiredScorePercentage || null,
          priority: Number(economy.unlockPriority || 100),
          admin_override_allowed: economy.adminOverrideAllowed,
        },
      },
    };
  }

  function snapshotCurrentBlueprint() {
    return {
      exam: {
        ...exam,
        assessmentFamilyCode: selectedProgramFamilyCode || undefined,
        assessmentFamilyLabel: selectedProgramFamilyProfile?.label || undefined,
        experienceProfile: { ...experienceOverride },
      },
      delivery: { ...delivery },
      economy: { ...economy },
      selectionMode,
      sections: sections.map((section, index) => ({
        name: section.name.trim() || `Section ${String.fromCharCode(65 + index)}`,
        order: index + 1,
        subjectCode: subjectOptions.find((item) => item.id === section.subjectId)?.code ?? "",
        description: section.description,
        instructions: section.instructions,
        questionCount: section.questionCount,
        marksPerQuestion: section.marksPerQuestion,
        negativeMarksPerQuestion: section.negativeMarksPerQuestion,
        timerEnabled: section.timerEnabled,
        durationMinutes: section.durationMinutes,
        allowSkipSection: section.allowSkipSection,
        lockAfterSubmit: section.lockAfterSubmit,
        difficultyMix: { ...section.difficultyMix },
        topics: section.topics.map((topicRow) => ({
          topicCode: topicRow.topicCode,
          count: topicRow.count,
        })),
      })),
    };
  }

  function resetManagedPresetPackDraft() {
    setEditingPresetPackId("");
    setManagedPresetPackDraft(
      createManagedPresetPackDraft(defaultSource === "platform" ? "platform" : "institute"),
    );
  }

  function seedManagedPresetPackDraftFromBuilder() {
    const suggestedLabel = exam.title.trim() || recommendedExamMetadata.title || selectedPresetPack?.label || "";
    const suggestedFamily =
      selectedPresetPack?.family ||
      selectedProgramFamilyProfile?.label ||
      "Custom";
    const suggestedChip = selectedPresetPack?.chip || "Managed";
    const suggestedNote =
      exam.description.trim() || selectedPresetPack?.note || `${scopeLabel} managed preset pack`;
    setManagedPresetPackDraft((current) => ({
      ...current,
      label: current.label || suggestedLabel,
      code: current.code || presetPackCodeSlug(suggestedLabel),
      family: current.family || suggestedFamily,
      chip: current.chip || suggestedChip,
      note: current.note || suggestedNote,
    }));
  }

  function startEditingPresetPack(pack: ExamPresetPackDefinition) {
    if (!pack.can_manage) {
      return;
    }
    setEditingPresetPackId(pack.id);
    setManagedPresetPackDraft({
      label: pack.label,
      code: pack.id,
      family: pack.family,
      note: pack.note,
      chip: pack.chip,
      scopeType: pack.scope_type === "platform" ? "platform" : "institute",
    });
  }

  async function refreshPresetPackLibrary() {
    const presetPackResults = await fetchPresetPacks();
    setPresetPackLibrary(presetPackResults);
  }

  async function saveManagedPresetPack() {
    const normalizedLabel = managedPresetPackDraft.label.trim();
    const normalizedCode = presetPackCodeSlug(
      managedPresetPackDraft.code.trim() || managedPresetPackDraft.label,
    );
    if (!normalizedLabel) {
      setError("Preset pack label is required.");
      return;
    }
    if (!normalizedCode) {
      setError("Preset pack code is required.");
      return;
    }
    if (!managedPresetPackDraft.family.trim()) {
      setError("Preset pack family is required.");
      return;
    }

    try {
      const targetPack =
        editingPresetPackId
          ? managedPresetPacks.find((pack) => pack.id === editingPresetPackId) ?? null
          : null;
      const method = editingPresetPackId ? "PATCH" : "POST";
      const endpoint =
        editingPresetPackId && targetPack?.resourceId
          ? `/api/exams/preset-packs/${targetPack.resourceId}`
          : "/api/exams/preset-packs";
      if (editingPresetPackId && !targetPack?.resourceId) {
        throw new Error("This preset pack cannot be edited because its managed record is unavailable.");
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope_type: managedPresetPackDraft.scopeType,
          code: normalizedCode,
          label: normalizedLabel,
          family: managedPresetPackDraft.family.trim(),
          note: managedPresetPackDraft.note.trim(),
          chip: managedPresetPackDraft.chip.trim() || "Managed",
          config: snapshotCurrentBlueprint(),
          is_active: true,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(parseApiError(payload));
      }

      await refreshPresetPackLibrary();
      setExam((current) => ({ ...current, presetPackCode: normalizedCode }));
      resetManagedPresetPackDraft();
      setError("");
      setMessage(
        editingPresetPackId
          ? `Updated managed preset pack "${normalizedLabel}".`
          : `Saved "${normalizedLabel}" as a managed preset pack for ${scopeLabel}.`,
      );
    } catch (presetPackError) {
      setError(
        presetPackError instanceof Error
          ? presetPackError.message
          : "Unable to save this preset pack right now.",
      );
    }
  }

  async function deleteManagedPresetPack(pack: ExamPresetPackDefinition) {
    if (!pack.can_manage || !pack.resourceId) {
      setError("This preset pack is read-only here.");
      return;
    }
    try {
      const response = await fetch(`/api/exams/preset-packs/${pack.resourceId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error(parseApiError(payload));
      }

      await refreshPresetPackLibrary();
      if (editingPresetPackId === pack.id) {
        resetManagedPresetPackDraft();
      }
      if (exam.presetPackCode === pack.id) {
        setExam((current) => ({ ...current, presetPackCode: "" }));
      }
      setError("");
      setMessage(`Archived preset pack "${pack.label}".`);
    } catch (presetPackError) {
      setError(
        presetPackError instanceof Error
          ? presetPackError.message
          : "Unable to archive this preset pack right now.",
      );
    }
  }

  async function saveCurrentTemplate() {
    if (!hasTemplateLibraryAccess) {
      setError(templateLibraryDisabledMessage || "Template library access is not enabled.");
      return;
    }
    const normalizedName = templateName.trim();
    const resolvedTemplateName = normalizedName || recommendedExamMetadata.templateName;
    if (!resolvedTemplateName) {
      setError("Give the template a clear name before saving it.");
      return;
    }

    try {
      const response = await fetch("/api/exams/advanced-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: resolvedTemplateName,
          description: `${audienceLabel(effectiveTemplateAudience)} advanced exam blueprint`,
          audience_context: effectiveTemplateAudience,
          blueprint: snapshotCurrentBlueprint(),
          is_active: true,
          ...(templateInstituteId ? { institute_id: templateInstituteId } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        | SavedBuilderTemplate
        | Record<string, unknown>;
      if (!response.ok) {
        throw new Error(parseApiError(payload));
      }

      const template = payload as SavedBuilderTemplate;
      setAllSavedTemplates((current) => {
        const filtered = current.filter((row) => row.id !== template.id && row.name !== template.name);
        return [template, ...filtered];
      });
      setTemplateName("");
      setTemplateLibraryAudience(template.audience_context);
      setMessage(
        `Saved "${resolvedTemplateName}" as a reusable ${audienceLabel(template.audience_context).toLowerCase()} template for this ${scopeLabel}.`,
      );
      setError("");
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "Unable to save this template right now.",
      );
    }
  }

  function loadSavedTemplate(template: SavedBuilderTemplate) {
    const availableTopicCodes = new Set(sortedTopicOptions.map((topic) => topic.code));
    const examBlueprintSource = { ...template.blueprint.exam };
    const experienceProfile = examBlueprintSource.experienceProfile;
    delete examBlueprintSource.experienceProfile;
    delete examBlueprintSource.assessmentFamilyCode;
    delete examBlueprintSource.assessmentFamilyLabel;
    const examBlueprint = examBlueprintSource;
    setExam({
      ...examBlueprint,
      presetPackCode: examBlueprint.presetPackCode ?? "",
    });
    setExperienceOverride(
      experienceProfile ??
        familyAwareExperienceOverrides(
          template.blueprint.exam.examType,
          selectedProgramFamilyProfile,
        ),
    );
    setDelivery({ ...template.blueprint.delivery });
    setEconomy({ ...template.blueprint.economy });
    setSelectionMode(template.blueprint.selectionMode);
    setSections(
      hydrateSectionsFromBlueprint(
        template.blueprint.sections,
        availableTopicCodes,
        topicOptions[0]?.code ?? "",
        selectedSubject,
        subjectOptions,
      ),
    );
    setPreview(null);
    setMessage(`Loaded saved template "${template.name}". You can adjust anything before preview or create.`);
    setError("");
    setActiveStage(1);
  }

  async function deleteSavedTemplate(templateId: string) {
    if (!hasTemplateLibraryAccess) {
      setError(templateLibraryDisabledMessage || "Template library access is not enabled.");
      return;
    }
    try {
      const response = await fetch(`/api/exams/advanced-templates/${templateId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error(parseApiError(payload));
      }
      setAllSavedTemplates((current) => current.filter((template) => template.id !== templateId));
      setMessage("Saved template removed from shared template storage.");
      setError("");
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "Unable to remove this template right now.",
      );
    }
  }

  function startEditingTemplate(template: SavedBuilderTemplate) {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
    setEditingTemplateDescription(template.description ?? "");
    setMessage("");
    setError("");
  }

  function stopEditingTemplate() {
    setEditingTemplateId("");
    setEditingTemplateName("");
    setEditingTemplateDescription("");
  }

  async function updateSavedTemplate(template: SavedBuilderTemplate) {
    if (!hasTemplateLibraryAccess) {
      setError(templateLibraryDisabledMessage || "Template library access is not enabled.");
      return;
    }
    const normalizedName = editingTemplateName.trim();
    if (!normalizedName) {
      setError("Template name is required.");
      return;
    }

    try {
      const response = await fetch(`/api/exams/advanced-templates/${template.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          description: editingTemplateDescription.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        | SavedBuilderTemplate
        | Record<string, unknown>;
      if (!response.ok) {
        throw new Error(parseApiError(payload));
      }

      const updatedTemplate = payload as SavedBuilderTemplate;
      setAllSavedTemplates((current) =>
        current.map((row) => (row.id === updatedTemplate.id ? updatedTemplate : row)),
      );
      stopEditingTemplate();
      setMessage(`Updated template "${updatedTemplate.name}".`);
      setError("");
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "Unable to update this template right now.",
      );
    }
  }

  async function duplicateSavedTemplate(template: SavedBuilderTemplate) {
    if (!hasTemplateLibraryAccess) {
      setError(templateLibraryDisabledMessage || "Template library access is not enabled.");
      return;
    }
    const duplicateAudience = audience === "teacher" ? "teacher" : "institute";
    const duplicateName = buildDuplicateTemplateName(
      template.name,
      allSavedTemplates.map((item) => item.name),
    );

    try {
      const response = await fetch("/api/exams/advanced-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: duplicateName,
          description:
            template.description ||
            `${audienceLabel(duplicateAudience)} advanced exam blueprint`,
          audience_context: duplicateAudience,
          blueprint: template.blueprint,
          is_active: true,
          ...(templateInstituteId ? { institute_id: templateInstituteId } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        | SavedBuilderTemplate
        | Record<string, unknown>;
      if (!response.ok) {
        throw new Error(parseApiError(payload));
      }

      const duplicatedTemplate = payload as SavedBuilderTemplate;
      setAllSavedTemplates((current) => [duplicatedTemplate, ...current.filter((row) => row.id !== duplicatedTemplate.id)]);
      setTemplateLibraryAudience(duplicatedTemplate.audience_context);
      setTemplateSearch("");
      setMessage(
        `Created "${duplicatedTemplate.name}" as an editable ${audienceLabel(
          duplicatedTemplate.audience_context,
        ).toLowerCase()} template.`,
      );
      setError("");
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "Unable to duplicate this template right now.",
      );
    }
  }

  function toggleTemplateSelection(templateId: string) {
    setSelectedTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  }

  function toggleSelectAllManageableTemplates() {
    setSelectedTemplateIds((current) => {
      if (allManageableTemplatesSelected) {
        return current.filter((id) => !manageableTemplateIdsInView.includes(id));
      }
      const merged = new Set([...current, ...manageableTemplateIdsInView]);
      return Array.from(merged);
    });
  }

  function clearTemplateSelection() {
    setSelectedTemplateIds([]);
  }

  function exportSelectedTemplates() {
    if (!hasTemplateLibraryAccess) {
      setError(templateLibraryDisabledMessage || "Template library access is not enabled.");
      return;
    }
    const templatesToExport = savedTemplates.filter((template) =>
      selectedManageableTemplateIds.includes(template.id),
    );
    if (templatesToExport.length === 0) {
      setError("Select at least one editable template first.");
      return;
    }

    const bundle: TemplateExportBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedFromAudience: effectiveTemplateLibraryAudience,
      templates: templatesToExport.map((template) => ({
        name: template.name,
        description: template.description,
        audience_context: template.audience_context,
        blueprint: template.blueprint,
      })),
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `advanced-exam-templates-${effectiveTemplateLibraryAudience}-${templatesToExport.length}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    setMessage(`Exported ${templatesToExport.length} template(s) as a reusable JSON bundle.`);
    setError("");
  }

  async function importTemplateBundle(file: File) {
    if (!hasTemplateLibraryAccess) {
      setError(templateLibraryDisabledMessage || "Template library access is not enabled.");
      return;
    }
    try {
      const raw = await file.text();
      const payload = JSON.parse(raw) as Partial<TemplateExportBundle> | { templates?: unknown };
      const importedTemplates = Array.isArray(payload.templates) ? payload.templates : [];
      if (importedTemplates.length === 0) {
        throw new Error("This file does not contain any templates to import.");
      }

      const createdTemplates: SavedBuilderTemplate[] = [];
      for (const candidate of importedTemplates) {
        if (!candidate || typeof candidate !== "object") {
          continue;
        }
        const template = candidate as TemplateExportBundle["templates"][number];
        if (!template.name || !template.blueprint) {
          continue;
        }

        const writableAudience = audience === "teacher" ? "teacher" : "institute";
        const importedName = buildDuplicateTemplateName(
          template.name,
          [
            ...allSavedTemplates.map((item) => item.name),
            ...createdTemplates.map((item) => item.name),
          ],
        );
        const response = await fetch("/api/exams/advanced-templates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: importedName,
            description:
              typeof template.description === "string" && template.description.trim()
                ? template.description
                : `${audienceLabel(writableAudience)} advanced exam blueprint`,
            audience_context: writableAudience,
            blueprint: template.blueprint,
            is_active: true,
            ...(templateInstituteId ? { institute_id: templateInstituteId } : {}),
          }),
        });
        const createdPayload = (await response.json().catch(() => ({}))) as
          | SavedBuilderTemplate
          | Record<string, unknown>;
        if (!response.ok) {
          throw new Error(parseApiError(createdPayload));
        }
        createdTemplates.push(createdPayload as SavedBuilderTemplate);
      }

      if (createdTemplates.length === 0) {
        throw new Error("No valid templates were found in the selected JSON file.");
      }

      setAllSavedTemplates((current) => [...createdTemplates, ...current]);
      setTemplateLibraryAudience(audience === "teacher" ? "teacher" : "institute");
      clearTemplateSelection();
      setMessage(`Imported ${createdTemplates.length} template(s) into your editable library.`);
      setError("");
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "Unable to import templates from this JSON file right now.",
      );
    }
  }

  async function duplicateSelectedTemplates() {
    if (!hasTemplateLibraryAccess) {
      setError(templateLibraryDisabledMessage || "Template library access is not enabled.");
      return;
    }
    const templatesToDuplicate = savedTemplates.filter((template) =>
      selectedManageableTemplateIds.includes(template.id),
    );
    if (templatesToDuplicate.length === 0) {
      setError("Select at least one editable template first.");
      return;
    }

    try {
      const createdTemplates: SavedBuilderTemplate[] = [];
      for (const template of templatesToDuplicate) {
        const duplicateAudience = audience === "teacher" ? "teacher" : "institute";
        const duplicateName = buildDuplicateTemplateName(
          template.name,
          [
            ...allSavedTemplates.map((item) => item.name),
            ...createdTemplates.map((item) => item.name),
          ],
        );
        const response = await fetch("/api/exams/advanced-templates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: duplicateName,
            description:
              template.description ||
              `${audienceLabel(duplicateAudience)} advanced exam blueprint`,
            audience_context: duplicateAudience,
            blueprint: template.blueprint,
            is_active: true,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as
          | SavedBuilderTemplate
          | Record<string, unknown>;
        if (!response.ok) {
          throw new Error(parseApiError(payload));
        }
        createdTemplates.push(payload as SavedBuilderTemplate);
      }

      setAllSavedTemplates((current) => [...createdTemplates, ...current]);
      setTemplateLibraryAudience(audience === "teacher" ? "teacher" : "institute");
      clearTemplateSelection();
      setMessage(`Duplicated ${createdTemplates.length} template(s) into your editable library.`);
      setError("");
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "Unable to duplicate the selected templates right now.",
      );
    }
  }

  async function archiveSelectedTemplates() {
    if (!hasTemplateLibraryAccess) {
      setError(templateLibraryDisabledMessage || "Template library access is not enabled.");
      return;
    }
    const templateIdsToArchive = [...selectedManageableTemplateIds];
    if (templateIdsToArchive.length === 0) {
      setError("Select at least one editable template first.");
      return;
    }

    try {
      for (const templateId of templateIdsToArchive) {
        const response = await fetch(`/api/exams/advanced-templates/${templateId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
          throw new Error(parseApiError(payload));
        }
      }

      setAllSavedTemplates((current) =>
        current.filter((template) => !templateIdsToArchive.includes(template.id)),
      );
      clearTemplateSelection();
      setMessage(`Archived ${templateIdsToArchive.length} template(s) from the shared library.`);
      setError("");
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "Unable to archive the selected templates right now.",
      );
    }
  }

  async function runPreview() {
    const compositionError = getBuilderCompositionError(sections);
    if (compositionError) {
      setPreview(null);
      setError(compositionError);
      setMessage("");
      return;
    }

    setIsPreviewPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/exams/advanced-builder/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });
      const payload = (await response.json().catch(() => ({}))) as ExamPreview | Record<string, unknown>;
      if (!response.ok) {
        throw new Error(parseApiError(payload));
      }
      setPreview(payload as ExamPreview);
      setMessage("Preview refreshed. The right summary now reflects the latest exam resolution.");
    } catch (previewError) {
      setPreview(null);
      setError(previewError instanceof Error ? previewError.message : "Unable to preview this exam right now.");
    } finally {
      setIsPreviewPending(false);
    }
  }

  async function runCreate() {
    const compositionError = getBuilderCompositionError(sections);
    if (compositionError) {
      setError(compositionError);
      setMessage("");
      return;
    }

    setIsCreatePending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/exams/advanced-builder/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });
      const payload = (await response.json().catch(() => ({}))) as
        | { data?: { id?: string } }
        | Record<string, unknown>;
      if (!response.ok) {
        throw new Error(parseApiError(payload));
      }

      const examId =
        "data" in payload && payload.data && typeof payload.data === "object" && "id" in payload.data
          ? String(payload.data.id ?? "")
          : "";

      if (!examId) {
        throw new Error("The exam was created, but the response did not include an id.");
      }

      router.push(
        `${successBasePath}/${examId}/builder?message=${encodeURIComponent(
          "Advanced exam created successfully.",
        )}`,
      );
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create this exam right now.");
    } finally {
      setIsCreatePending(false);
    }
  }

  return (
    <section className="advancedBuilderShell">
      <datalist id="advanced-builder-duration-options">
        {examDurationSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-passing-marks-options">
        {passingMarksSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-question-count-options">
        {sectionQuestionCountSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-marks-options">
        {marksPerQuestionSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-negative-marks-options">
        {negativeMarksSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-max-attempt-options">
        {maxAttemptSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-star-cost-options">
        {starCostSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-priority-options">
        {prioritySuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-unlock-priority-options">
        {unlockPrioritySuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-unlock-count-options">
        {unlockCountSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="advanced-builder-unlock-score-options">
        {unlockScoreSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <div className="advancedBuilderMain">
        <div className="advancedBuilderStageRail" role="tablist" aria-label="Advanced builder stages">
          {stages.map((stage, index) => (
            <button
              key={stage.id}
              className={`advancedBuilderStageChip ${index === activeStage ? "advancedBuilderStageChipActive" : ""}`}
              onClick={() => setActiveStage(index)}
              role="tab"
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stage.label}</strong>
              <small>{stage.note}</small>
            </button>
          ))}
        </div>

        <div className="advancedBuilderPanels">
          <section className="advancedBuilderPanel advancedBuilderPanelHero">
            <div>
              <span className="studentDashboardTag">Advanced exam builder</span>
              <h2>Build a sober, highly configurable exam without leaving {scopeLabel}</h2>
              <p>
                Start with live academic scope, compose sections topic by topic, then preview the exact question
                resolution before you create the exam.
              </p>
            </div>
            <div className="advancedBuilderHeroStats">
              <div>
                <span>Sections</span>
                <strong>{sections.length}</strong>
              </div>
              <div>
                <span>Requested questions</span>
                <strong>{requestedQuestionCount}</strong>
              </div>
              <div>
                <span>Estimated marks</span>
                <strong>{estimatedMarks}</strong>
              </div>
            </div>
          </section>

          {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}
          {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}

          <div className="advancedBuilderWorkspace">
            <div className="advancedBuilderFormColumn">
              <section
                className={`advancedBuilderPanel ${activeStage === 0 ? "" : "advancedBuilderPanelMuted"}`}
                hidden={activeStage !== 0}
              >
                <div className="advancedBuilderSectionHeader">
                  <div>
                    <span className="studentDashboardTag">Scope and basics</span>
                    <h3>Choose the academic lane and exam identity</h3>
                  </div>
                  <div className="advancedBuilderInlineActions">
                    <button
                      className="button buttonGhost"
                      onClick={() => autoFillExamDetails(true)}
                      type="button"
                    >
                      Auto Fill Basics
                    </button>
                    {isScopeLoading ? <span className="advancedBuilderInlineStatus">Refreshing scope...</span> : null}
                  </div>
                </div>

                <div className="advancedBuilderTemplateStrip">
                  {recommendedBuilderTemplates.map((template) => (
                    <button
                      key={template.id}
                      className="advancedBuilderTemplateCard"
                      onClick={() => applyTemplate(template.id)}
                      type="button"
                    >
                      <span className="advancedBuilderTemplateChip">
                        {template.chip}
                        {selectedProgramFamilyCode && template.familyCodes.includes(selectedProgramFamilyCode)
                          ? " · Recommended"
                          : ""}
                      </span>
                      <strong>{template.label}</strong>
                      <small>{template.note}</small>
                    </button>
                  ))}
                </div>

                <div className="advancedBuilderSectionHeader advancedBuilderSectionHeaderNested">
                  <div>
                    <span className="studentDashboardTag">Preset packs</span>
                    <h3>Start from a real exam product shape</h3>
                    {selectedProgramFamilyProfile ? (
                      <p>
                        Family-aware recommendations are prioritized for the {selectedProgramFamilyProfile.label} profile.
                      </p>
                    ) : null}
                  </div>
                  {selectedPresetPack ? (
                    <span className="advancedBuilderInlineStatus">
                      Active pack: {selectedPresetPack.label}
                    </span>
                  ) : null}
                </div>

                <div className="advancedBuilderTemplateStrip">
                  {recommendedPresetPacks.map((preset) => (
                    <button
                      key={preset.id}
                      className={`advancedBuilderTemplateCard ${
                        exam.presetPackCode === preset.id ? "advancedBuilderTemplateCardActive" : ""
                      }`}
                      onClick={() => applyPresetPack(preset.id)}
                      type="button"
                    >
                      <span className="advancedBuilderTemplateChip">
                        {preset.chip}
                        {selectedProgramFamilyCode &&
                        getPresetPackProgramFamilyCode(preset) === selectedProgramFamilyCode
                          ? " · Recommended"
                          : ""}
                      </span>
                      <strong>{preset.label}</strong>
                      <small>{preset.family} · {preset.note}</small>
                    </button>
                  ))}
                </div>

                <div className="advancedBuilderSectionHeader advancedBuilderSectionHeaderNested">
                  <div>
                    <span className="studentDashboardTag">Managed preset library</span>
                    <h3>Save the current builder setup as a reusable governed pack</h3>
                  </div>
                  <div className="advancedBuilderInlineActions">
                    <button
                      className="button buttonGhost"
                      onClick={seedManagedPresetPackDraftFromBuilder}
                      type="button"
                    >
                      Fill From Current Builder
                    </button>
                    {editingPresetPackId ? (
                      <button
                        className="button buttonGhost"
                        onClick={resetManagedPresetPackDraft}
                        type="button"
                      >
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="advancedBuilderPresetManagerPanel">
                  <div className="advancedBuilderGrid advancedBuilderGridTwo">
                    <label className="advancedBuilderField">
                      <span>Preset label</span>
                      <input
                        placeholder="IELTS Academic Reading Master"
                        value={managedPresetPackDraft.label}
                        onChange={(event) =>
                          setManagedPresetPackDraft((current) => ({
                            ...current,
                            label: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="advancedBuilderField">
                      <span>Preset code</span>
                      <input
                        placeholder="ielts_academic_reading_master"
                        value={managedPresetPackDraft.code}
                        onChange={(event) =>
                          setManagedPresetPackDraft((current) => ({
                            ...current,
                            code: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="advancedBuilderField">
                      <span>Family</span>
                      <input
                        placeholder="Study Abroad"
                        value={managedPresetPackDraft.family}
                        onChange={(event) =>
                          setManagedPresetPackDraft((current) => ({
                            ...current,
                            family: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="advancedBuilderField">
                      <span>Chip</span>
                      <input
                        placeholder="Language test"
                        value={managedPresetPackDraft.chip}
                        onChange={(event) =>
                          setManagedPresetPackDraft((current) => ({
                            ...current,
                            chip: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="advancedBuilderField advancedBuilderFieldWide">
                      <span>Pack note</span>
                      <textarea
                        placeholder="Describe when teams should use this runtime pack."
                        value={managedPresetPackDraft.note}
                        onChange={(event) =>
                          setManagedPresetPackDraft((current) => ({
                            ...current,
                            note: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="advancedBuilderPresetManagerFooter">
                    <div className="advancedBuilderSavedTemplateLibrarySummary">
                      <strong>{editableManagedPresetCount}</strong>
                      <span>editable managed pack(s)</span>
                    </div>
                    <button
                      className="button buttonSecondary"
                      onClick={() => startTransition(() => void saveManagedPresetPack())}
                      type="button"
                    >
                      {editingPresetPackId ? "Update Managed Pack" : "Save As Managed Pack"}
                    </button>
                  </div>
                </div>

                {managedPresetPacks.length > 0 ? (
                  <div className="advancedBuilderSavedTemplateList">
                    <div className="advancedBuilderSavedTemplateLibraryBar">
                      <label className="advancedBuilderField advancedBuilderSavedTemplateField">
                        <span>Search managed preset packs</span>
                        <input
                          placeholder="Search by label, family, or chip"
                          value={presetPackSearch}
                          onChange={(event) => setPresetPackSearch(event.target.value)}
                        />
                      </label>
                      <div className="advancedBuilderSavedTemplateLibrarySummary">
                        <strong>{managedPresetPacks.length}</strong>
                        <span>managed pack(s) in view</span>
                      </div>
                    </div>
                    {managedPresetPacks.map((pack) => (
                      <article className="advancedBuilderSavedTemplateCard" key={`managed-${pack.id}`}>
                        <div>
                          <div className="advancedBuilderSavedTemplateMetaRow">
                            <span
                              className={`advancedBuilderSavedTemplateBadge ${
                                pack.can_manage
                                  ? "advancedBuilderSavedTemplateBadgeManage"
                                  : "advancedBuilderSavedTemplateBadgeReadonly"
                              }`}
                            >
                              {pack.can_manage ? "Editable" : "Read only"}
                            </span>
                            <span className="advancedBuilderSavedTemplateMetaText">
                              {(pack.scope_type ?? "managed").replace(/_/g, " ")} · {pack.family}
                            </span>
                          </div>
                          <strong>{pack.label}</strong>
                          <small>
                            {pack.chip} · {pack.id}
                          </small>
                          {pack.note ? <small>{pack.note}</small> : null}
                        </div>
                        <div className="advancedBuilderSavedTemplateActions">
                          <button
                            className="button buttonGhost"
                            onClick={() => applyPresetPack(pack.id)}
                            type="button"
                          >
                            Use Pack
                          </button>
                          {pack.can_manage ? (
                            <button
                              className="button buttonGhost"
                              onClick={() => startEditingPresetPack(pack)}
                              type="button"
                            >
                              Edit
                            </button>
                          ) : null}
                          {pack.can_manage ? (
                            <button
                              className="button buttonGhost"
                              onClick={() => startTransition(() => void deleteManagedPresetPack(pack))}
                              type="button"
                            >
                              Archive
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}

                {hasTemplateLibraryAccess ? (
                  <div className="advancedBuilderSavedTemplateBar">
                    <label className="advancedBuilderField advancedBuilderSavedTemplateField">
                      <span>Save current setup as a template</span>
                      <input
                        placeholder="Class 7 Math weekly mock"
                        value={templateName || recommendedExamMetadata.templateName}
                        onChange={(event) => setTemplateName(event.target.value)}
                      />
                    </label>
                    <label className="advancedBuilderField advancedBuilderSavedTemplateScope">
                      <span>Save for</span>
                      <select
                        value={effectiveTemplateAudience}
                        onChange={(event) => setTemplateAudience(event.target.value as TemplateAudience)}
                      >
                        {saveAudienceOptions.map((option) => (
                          <option key={option} value={option}>
                            {audienceLabel(option)} templates
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="button buttonSecondary"
                      onClick={() => startTransition(() => void saveCurrentTemplate())}
                      type="button"
                    >
                      Save Template
                    </button>
                  </div>
                ) : (
                  <p className="advancedBuilderInlineStatus">
                    {templateLibraryDisabledMessage ||
                      "Template library access is not enabled for this institute subscription."}
                  </p>
                )}

                {hasTemplateLibraryAccess && allSavedTemplates.length > 0 ? (
                  <div className="advancedBuilderSavedTemplateList">
                    <div className="advancedBuilderSavedTemplateLibraryBar">
                      <label className="advancedBuilderField advancedBuilderSavedTemplateField">
                        <span>Search saved templates</span>
                        <input
                          placeholder="Search by name, owner, or note"
                          value={templateSearch}
                          onChange={(event) => setTemplateSearch(event.target.value)}
                        />
                      </label>
                      <div className="advancedBuilderSavedTemplateLibrarySummary">
                        <strong>{savedTemplates.length}</strong>
                        <span>template(s) in view</span>
                      </div>
                    </div>
                    {selectedProgramFamilyProfile ? (
                      <div className="advancedBuilderSavedTemplateLibrarySummary">
                        <strong>{selectedProgramFamilyProfile.label}</strong>
                        <span>matching templates are ranked first for this program</span>
                      </div>
                    ) : null}
                    {manageableTemplateIdsInView.length > 0 ? (
                      <div className="advancedBuilderSavedTemplateBulkBar">
                        <label className="advancedBuilderSavedTemplateBulkToggle">
                          <input
                            checked={allManageableTemplatesSelected}
                            onChange={toggleSelectAllManageableTemplates}
                            type="checkbox"
                          />
                          <span>Select all editable in view</span>
                        </label>
                        <div className="advancedBuilderSavedTemplateBulkActions">
                          <span className="advancedBuilderSavedTemplateBulkCount">
                            {selectedManageableTemplateIds.length} selected
                          </span>
                          <button
                            className="button buttonGhost"
                            onClick={() => startTransition(() => void duplicateSelectedTemplates())}
                            type="button"
                          >
                            Duplicate Selected
                          </button>
                          <button
                            className="button buttonGhost"
                            onClick={exportSelectedTemplates}
                            type="button"
                          >
                            Export Selected
                          </button>
                          <button
                            className="button buttonGhost"
                            onClick={() => templateImportInputRef.current?.click()}
                            type="button"
                          >
                            Import JSON
                          </button>
                          <button
                            className="button buttonGhost"
                            onClick={() => startTransition(() => void archiveSelectedTemplates())}
                            type="button"
                          >
                            Archive Selected
                          </button>
                          <button
                            className="button buttonGhost"
                            onClick={clearTemplateSelection}
                            type="button"
                          >
                            Clear
                          </button>
                        </div>
                        <input
                          ref={templateImportInputRef}
                          accept="application/json"
                          className="advancedBuilderHiddenInput"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              startTransition(() => void importTemplateBundle(file));
                            }
                            event.currentTarget.value = "";
                          }}
                          type="file"
                        />
                      </div>
                    ) : null}
                    {libraryAudienceOptions.length > 1 ? (
                      <div className="advancedBuilderSavedTemplateFilter">
                        {libraryAudienceOptions.map((option) => (
                          <button
                            key={option}
                            className={`advancedBuilderSavedTemplateFilterChip ${
                              effectiveTemplateLibraryAudience === option
                                ? "advancedBuilderSavedTemplateFilterChipActive"
                                : ""
                            }`}
                            onClick={() => setTemplateLibraryAudience(option)}
                            type="button"
                          >
                            {audienceLabel(option)} templates
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {savedTemplates.length > 0 ? (
                      savedTemplates.map((template) => (
                        <article className="advancedBuilderSavedTemplateCard" key={template.id}>
                          {template.can_manage ? (
                            <label className="advancedBuilderSavedTemplateCheckbox">
                              <input
                                checked={selectedTemplateIds.includes(template.id)}
                                onChange={() => toggleTemplateSelection(template.id)}
                                type="checkbox"
                              />
                            </label>
                          ) : null}
                          <div>
                            <div className="advancedBuilderSavedTemplateMetaRow">
                              <span
                                className={`advancedBuilderSavedTemplateBadge ${
                                  template.can_manage
                                    ? "advancedBuilderSavedTemplateBadgeManage"
                                    : "advancedBuilderSavedTemplateBadgeReadonly"
                                }`}
                              >
                                {template.can_manage ? "Editable" : "Read only"}
                              </span>
                              {selectedProgramFamilyCode &&
                              getTemplateAssessmentFamilyCode(template) === selectedProgramFamilyCode ? (
                                <span className="advancedBuilderSavedTemplateBadge advancedBuilderSavedTemplateBadgeManage">
                                  Recommended
                                </span>
                              ) : null}
                              <span className="advancedBuilderSavedTemplateMetaText">
                                {templateAccessCopy(template)}
                              </span>
                            </div>
                            {editingTemplateId === template.id ? (
                              <div className="advancedBuilderSavedTemplateEditor">
                                <label className="advancedBuilderField">
                                  <span>Template name</span>
                                  <input
                                    value={editingTemplateName}
                                    onChange={(event) => setEditingTemplateName(event.target.value)}
                                  />
                                </label>
                                <label className="advancedBuilderField">
                                  <span>Note</span>
                                  <textarea
                                    rows={3}
                                    value={editingTemplateDescription}
                                    onChange={(event) => setEditingTemplateDescription(event.target.value)}
                                  />
                                </label>
                              </div>
                            ) : (
                              <strong>{template.name}</strong>
                            )}
                            <small>{audienceLabel(template.audience_context)} template</small>
                            {getTemplateAssessmentFamilyLabel(template) ? (
                              <small>{getTemplateAssessmentFamilyLabel(template)} family</small>
                            ) : null}
                            <small>
                              {template.blueprint.sections.length} section(s)
                              {template.created_at || template.updated_at
                                ? ` · saved ${new Date(
                                    template.created_at ?? template.updated_at ?? "",
                                  ).toLocaleDateString("en-IN")}`
                                : ""}
                            </small>
                            {template.created_by_teacher_name ? (
                              <small>Shared by {template.created_by_teacher_name}</small>
                            ) : null}
                            {editingTemplateId === template.id ? null : template.description ? (
                              <small>{template.description}</small>
                            ) : null}
                            {!template.can_manage ? (
                              <small>
                                This template can be loaded and used, but only its owner can change or remove it.
                              </small>
                            ) : null}
                          </div>
                          <div className="advancedBuilderSavedTemplateActions">
                            <button
                              className="button buttonGhost"
                              onClick={() => loadSavedTemplate(template)}
                              type="button"
                            >
                              Use Template
                            </button>
                            <button
                              className="button buttonGhost"
                              onClick={() => startTransition(() => void duplicateSavedTemplate(template))}
                              type="button"
                            >
                              Duplicate
                            </button>
                            {template.can_manage ? (
                              <>
                                {editingTemplateId === template.id ? (
                                  <>
                                    <button
                                      className="button buttonSecondary"
                                      onClick={() => startTransition(() => void updateSavedTemplate(template))}
                                      type="button"
                                    >
                                      Save Changes
                                    </button>
                                    <button
                                      className="button buttonGhost"
                                      onClick={stopEditingTemplate}
                                      type="button"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="button buttonGhost"
                                    onClick={() => startEditingTemplate(template)}
                                    type="button"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  className="button buttonGhost"
                                  onClick={() => startTransition(() => void deleteSavedTemplate(template.id))}
                                  type="button"
                                >
                                  Delete
                                </button>
                              </>
                            ) : null}
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="advancedBuilderInlineStatus">
                        No matching {audienceLabel(effectiveTemplateLibraryAudience).toLowerCase()} templates found for this institute.
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="advancedBuilderGrid advancedBuilderGridTwo">
                  <label className="advancedBuilderField">
                    <span>Academic year</span>
                    <select value={selectedAcademicYear} onChange={(event) => setSelectedAcademicYear(event.target.value)}>
                      {academicYears.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Program</span>
                    <select value={selectedProgram} onChange={(event) => setSelectedProgram(event.target.value)}>
                      {programs.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <small>
                      {selectedProgramRecord?.assessment_family_label
                        ? `Assessment family: ${selectedProgramRecord.assessment_family_label}. Builder defaults and experience guidance can adapt from this profile.`
                        : "Attach a family profile later if this program should inherit exam-category defaults."}
                    </small>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Cohort</span>
                    <select value={selectedCohort} onChange={(event) => setSelectedCohort(event.target.value)}>
                      <option value="">All eligible cohorts</option>
                      {cohortOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Primary subject</span>
                    <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}>
                      {subjectOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <small>
                      Sets the default or lead subject for the exam. Each section can still carry its own subject below.
                    </small>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Source</span>
                    <select
                      value={exam.sourceType}
                      onChange={(event) => setExam((current) => ({ ...current, sourceType: event.target.value }))}
                    >
                      {sourceOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Status</span>
                    <select
                      value={exam.status}
                      onChange={(event) => setExam((current) => ({ ...current, status: event.target.value }))}
                    >
                      {statusOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderField advancedBuilderFieldWide">
                    <span>Exam title</span>
                    <input
                      placeholder="Class 7 Math Algebra and Number System Test"
                      value={exam.title || recommendedExamMetadata.title}
                      onChange={(event) => setExam((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label className="advancedBuilderField">
                    <span>Exam code</span>
                    <input
                      placeholder="CLS7-MATH-ADV-01"
                      value={exam.code || recommendedExamMetadata.code}
                      onChange={(event) => setExam((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                    />
                  </label>
                  <label className="advancedBuilderField">
                    <span>Exam type</span>
                    <select
                      value={exam.examType}
                      onChange={(event) => {
                        const nextExamType = event.target.value;
                        setExam((current) => ({ ...current, examType: nextExamType }));
                        setExperienceOverride(
                          familyAwareExperienceOverrides(nextExamType, selectedProgramFamilyProfile),
                        );
                      }}
                    >
                      {examTypeOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Delivery mode</span>
                    <select
                      value={exam.deliveryMode}
                      onChange={(event) => setExam((current) => ({ ...current, deliveryMode: event.target.value }))}
                    >
                      {deliveryModeOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Duration in minutes</span>
                    <input
                      list="advanced-builder-duration-options"
                      min={1}
                      type="number"
                      value={exam.durationMinutes || recommendedExamMetadata.durationMinutes}
                      onChange={(event) => setExam((current) => ({ ...current, durationMinutes: event.target.value }))}
                    />
                  </label>
                  <label className="advancedBuilderField">
                    <span>Passing marks</span>
                    <input
                      list="advanced-builder-passing-marks-options"
                      min={0}
                      step="0.01"
                      type="number"
                      value={exam.passingMarks || recommendedExamMetadata.passingMarks}
                      onChange={(event) => setExam((current) => ({ ...current, passingMarks: event.target.value }))}
                    />
                  </label>
                  <label className="advancedBuilderField">
                    <span>Start at</span>
                    <input
                      type="datetime-local"
                      value={exam.startAt}
                      onChange={(event) => setExam((current) => ({ ...current, startAt: event.target.value }))}
                    />
                  </label>
                  <label className="advancedBuilderField">
                    <span>End at</span>
                    <input
                      type="datetime-local"
                      value={exam.endAt}
                      onChange={(event) => setExam((current) => ({ ...current, endAt: event.target.value }))}
                    />
                  </label>
                  <label className="advancedBuilderField advancedBuilderFieldWide">
                    <span>Description</span>
                    <textarea
                      rows={3}
                      placeholder="Summarize what this exam covers and why it exists."
                      value={exam.description || recommendedExamMetadata.description}
                      onChange={(event) => setExam((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>
                </div>

                {selectedProgramFamilyProfile ? (
                  <section className="advancedBuilderCallout">
                    <div className="advancedBuilderSectionHeader advancedBuilderSectionHeaderNested">
                      <div>
                        <span className="studentDashboardTag">Family profile</span>
                        <h3>{selectedProgramFamilyProfile.label} defaults</h3>
                        <p>{selectedProgramFamilyProfile.description}</p>
                      </div>
                      <button className="button buttonGhost" type="button" onClick={applyProgramFamilyDefaults}>
                        Apply family defaults
                      </button>
                    </div>
                    {allowedQuestionTypeDefinitions.length ? (
                      <div className="questionBankTagRow">
                        {allowedQuestionTypeDefinitions.map((definition) => (
                          <span className="questionBankTag" key={definition.code}>
                            {definition.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {selectedProgramPresetPack ? (
                      <div className="builderHintPanel">
                        <strong>Authoring lane</strong>
                        <p>
                          {selectedProgramPresetPack.recommendations?.authoringNote ??
                            selectedProgramPresetPack.note}
                        </p>
                        <small>
                          {selectedProgramPresetPack.recommendations?.questionMixGuidance}
                          {" · "}
                          Section shape: {summarizePresetPackSections(selectedProgramPresetPack)}
                        </small>
                      </div>
                    ) : null}
                    {familyExecutionChecklist.length ? (
                      <div className="builderHintPanel">
                        <strong>Execution checklist</strong>
                        <p>
                          Use this as the minimum quality bar before moving into full preview and publish checks.
                        </p>
                        <ul className="builderHintPanelList">
                          {familyExecutionChecklist.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                        <small>
                          {selectedProgramFamilyMetadata?.authoringNote ??
                            "Keep the exam shell aligned to the selected family contract unless you intentionally need a variant."}
                        </small>
                      </div>
                    ) : null}
                    {selectedProgramFamilyProfile?.scoring_defaults ? (
                      <div className="builderHintPanel">
                        <strong>Scoring contract</strong>
                        <p>{scoringDefaultsSummary(selectedProgramFamilyProfile.scoring_defaults)}</p>
                        <small>
                          Keep marks, negative marks, and attempt policy aligned to this contract unless the specific exam intentionally diverges.
                        </small>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </section>

              <section
                className={`advancedBuilderPanel ${activeStage === 1 ? "" : "advancedBuilderPanelMuted"}`}
                hidden={activeStage !== 1}
              >
                <div className="advancedBuilderSectionHeader">
                  <div>
                    <span className="studentDashboardTag">Question composition</span>
                    <h3>Build sections that teachers and admins can reason about quickly</h3>
                  </div>
                  <button className="button buttonSecondary" onClick={addSection} type="button">
                    Add Section
                  </button>
                </div>

                <label className="advancedBuilderField advancedBuilderFieldSlim">
                  <span>Selection mode</span>
                  <select value={selectionMode} onChange={(event) => setSelectionMode(event.target.value)}>
                    <option value="strict">Strict</option>
                    <option value="relaxed">Relaxed</option>
                    <option value="subject_fallback">Use primary subject as fallback</option>
                  </select>
                </label>

                {selectedProgramPresetPack ? (
                  <div className="builderHintPanel">
                    <strong>Composition guidance</strong>
                    <p>Recommended sections: {summarizePresetPackSections(selectedProgramPresetPack)}</p>
                    <small>
                      {selectedProgramPresetPack.recommendations?.suggestedQuestionCountBand ??
                        "Question count band not mapped yet."}
                      {" · "}
                      {selectedProgramPresetPack.recommendations?.timingExpectation}
                    </small>
                  </div>
                ) : null}

                {sectionScoringAlerts.length ? (
                  <div className="builderHintPanel">
                    <strong>Family alignment checks</strong>
                    <p>
                      Review these scoring differences before you preview or publish this exam.
                    </p>
                    <small>{sectionScoringAlerts.map((item) => item.message).join(" ")}</small>
                  </div>
                ) : null}

                <div className="advancedBuilderSectionStack">
                  {sections.map((section, sectionIndex) => (
                    <article className="advancedBuilderSectionCard" key={section.id}>
                      <div className="advancedBuilderSectionCardTop">
                        <div>
                          <strong>{resolveSectionLabel(section, sectionIndex)}</strong>
                          <span>{section.questionCount} requested question(s)</span>
                        </div>
                        {sections.length > 1 ? (
                          <button
                            className="button buttonGhost"
                            onClick={() => removeSection(section.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <div className="advancedBuilderGrid advancedBuilderGridTwo">
                        <label className="advancedBuilderField">
                          <span>Section name</span>
                          <input
                            value={section.name}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="advancedBuilderField">
                          <span>Question count</span>
                          <input
                            list="advanced-builder-question-count-options"
                            min={1}
                            type="number"
                            value={section.questionCount}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                questionCount: Number(event.target.value || 0),
                              }))
                            }
                          />
                        </label>
                        <label className="advancedBuilderField">
                          <span>Section subject</span>
                          <select
                            value={section.subjectId}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                subjectId: event.target.value,
                                topics: current.topics.map((row) => ({
                                  ...row,
                                  topicCode: "",
                                })),
                              }))
                            }
                          >
                            <option value="">Choose subject</option>
                            {subjectOptions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <small>
                            The section subject is the real content mapping used for mixed-subject exams.
                          </small>
                        </label>
                        <label className="advancedBuilderField">
                          <span>Marks per question</span>
                          <input
                            list="advanced-builder-marks-options"
                            min={0}
                            step="0.01"
                            type="number"
                            value={section.marksPerQuestion}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                marksPerQuestion: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="advancedBuilderField">
                          <span>Negative marks</span>
                          <input
                            list="advanced-builder-negative-marks-options"
                            min={0}
                            step="0.01"
                            type="number"
                            value={section.negativeMarksPerQuestion}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                negativeMarksPerQuestion: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div className="advancedBuilderDifficultyRow">
                        {(["foundation", "intermediate", "advanced"] as const).map((key) => (
                          <label className="advancedBuilderField" key={key}>
                            <span>{titleCase(key)}</span>
                            <input
                              min={0}
                              max={100}
                              type="number"
                              value={section.difficultyMix[key]}
                              onChange={(event) =>
                                updateSection(section.id, (current) => ({
                                  ...current,
                                  difficultyMix: {
                                    ...current.difficultyMix,
                                    [key]: Number(event.target.value || 0),
                                  },
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>

                      {sectionScoringAlerts.some((item) => item.sectionId === section.id) ? (
                        <div className="builderHintPanel">
                          <strong>Section scoring review</strong>
                          <small>
                            {sectionScoringAlerts
                              .filter((item) => item.sectionId === section.id)
                              .map((item) => item.message)
                              .join(" ")}
                          </small>
                        </div>
                      ) : null}

                      <div className="advancedBuilderTopicBlock">
                        <div className="advancedBuilderTopicHeader">
                          <strong>Topics</strong>
                          <span>
                            {getAssignedTopicCount(section)} of {section.questionCount} question slot(s) assigned
                          </span>
                          <button className="button buttonGhost" onClick={() => addTopicRow(section.id)} type="button">
                            Add Topic
                          </button>
                        </div>

                        {section.topics.map((topicRow) => (
                          <div className="advancedBuilderTopicRow" key={topicRow.id}>
                            <select
                              value={topicRow.topicCode}
                              onChange={(event) =>
                                updateSection(section.id, (current) => ({
                                  ...current,
                                  topics: current.topics.map((row) =>
                                    row.id === topicRow.id
                                      ? { ...row, topicCode: event.target.value }
                                      : row,
                                  ),
                                }))
                              }
                            >
                              <option value="">Choose topic</option>
                              {getTopicOptionsForSection(section, topicOptionsBySubject).map((topic) => (
                                <option key={topic.id} value={topic.code}>
                                  {formatTopicOptionLabel(topic)}
                                </option>
                              ))}
                            </select>
                            <input
                              min={1}
                              type="number"
                              value={topicRow.count}
                              onChange={(event) =>
                                updateSection(section.id, (current) => ({
                                  ...current,
                                  topics: current.topics.map((row) =>
                                    row.id === topicRow.id
                                      ? { ...row, count: Number(event.target.value || 0) }
                                      : row,
                                  ),
                                }))
                              }
                            />
                            {section.topics.length > 1 ? (
                              <button
                                className="button buttonGhost"
                                onClick={() => removeTopicRow(section.id, topicRow.id)}
                                type="button"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        ))}

                        {getSectionTopicCountError(section, sectionIndex) ? (
                          <p className="feedbackBanner feedbackBannerError">
                            {getSectionTopicCountError(section, sectionIndex)}
                          </p>
                        ) : null}
                      </div>

                      <div className="advancedBuilderToggleGrid">
                        <label className="advancedBuilderToggleCard">
                          <input
                            checked={section.timerEnabled}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                timerEnabled: event.target.checked,
                              }))
                            }
                            type="checkbox"
                          />
                          <div>
                            <strong>Section timer</strong>
                            <span>Run this section on its own countdown.</span>
                          </div>
                        </label>
                        <label className="advancedBuilderToggleCard">
                          <input
                            checked={section.allowSkipSection}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                allowSkipSection: event.target.checked,
                              }))
                            }
                            type="checkbox"
                          />
                          <div>
                            <strong>Allow skip</strong>
                            <span>Let learners move past this section.</span>
                          </div>
                        </label>
                        <label className="advancedBuilderToggleCard">
                          <input
                            checked={section.lockAfterSubmit}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                lockAfterSubmit: event.target.checked,
                              }))
                            }
                            type="checkbox"
                          />
                          <div>
                            <strong>Lock after submit</strong>
                            <span>Close the section once it is submitted.</span>
                          </div>
                        </label>
                      </div>

                      {section.timerEnabled ? (
                        <label className="advancedBuilderField advancedBuilderFieldSlim">
                          <span>Section duration in minutes</span>
                          <input
                            list="advanced-builder-duration-options"
                            min={1}
                            type="number"
                            value={section.durationMinutes}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                durationMinutes: event.target.value,
                              }))
                            }
                          />
                        </label>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>

              <section
                className={`advancedBuilderPanel ${activeStage === 2 ? "" : "advancedBuilderPanelMuted"}`}
                hidden={activeStage !== 2}
              >
                <div className="advancedBuilderSectionHeader">
                  <div>
                    <span className="studentDashboardTag">Runtime delivery</span>
                    <h3>Keep attempt rules clear and operationally predictable</h3>
                  </div>
                </div>

                <div className="advancedBuilderGrid advancedBuilderGridTwo">
                  {deliverySelectConfig.map(({ label, key }) => (
                    <label className="advancedBuilderField" key={key}>
                      <span>{label}</span>
                      <select
                        value={delivery[key]}
                        onChange={(event) =>
                          setDelivery((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                      >
                        {deliveryOptionsByKey[key].map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="advancedBuilderField">
                    <span>Max attempts</span>
                    <input
                      list="advanced-builder-max-attempt-options"
                      min={1}
                      type="number"
                      value={delivery.maxAttempts}
                      onChange={(event) =>
                        setDelivery((current) => ({ ...current, maxAttempts: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="advancedBuilderSectionHeader advancedBuilderSectionHeaderNested">
                  <div>
                    <span className="studentDashboardTag">Experience tuning</span>
                    <h3>Shape how this exam family should feel for learners</h3>
                  </div>
                  <button
                    className="button buttonGhost"
                    type="button"
                    onClick={() => applyExperiencePreset(exam.examType)}
                  >
                    Reset to family-aware preset
                  </button>
                </div>

                {selectedProgramPresetPack ? (
                  <div className="builderHintPanel">
                    <strong>Delivery posture</strong>
                    <p>
                      {selectedProgramPresetPack.recommendations?.securitySuggestion}
                    </p>
                    <small>
                      {selectedProgramPresetPack.recommendations?.reviewPolicy}
                      {" · "}
                      {selectedProgramPresetPack.recommendations?.resultVisibility}
                    </small>
                  </div>
                ) : null}

                {deliveryContractAlerts.length ? (
                  <div className="builderHintPanel">
                    <strong>Attempt contract checks</strong>
                    <p>These runtime settings currently diverge from the selected family contract.</p>
                    <small>{deliveryContractAlerts.join(" ")}</small>
                  </div>
                ) : null}

                <div className="advancedBuilderGrid advancedBuilderGridTwo">
                  <label className="advancedBuilderField">
                    <span>Recommended timer profile</span>
                    <select
                      value={experienceOverride.recommendedTimerMode}
                      onChange={(event) =>
                        setExperienceOverride((current) => ({
                          ...current,
                          recommendedTimerMode: event.target.value,
                        }))
                      }
                    >
                      {timerModeOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Recommended navigation profile</span>
                    <select
                      value={experienceOverride.recommendedNavigationMode}
                      onChange={(event) =>
                        setExperienceOverride((current) => ({
                          ...current,
                          recommendedNavigationMode: event.target.value,
                        }))
                      }
                    >
                      {navigationModeOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Media flow guidance</span>
                    <select
                      value={experienceOverride.recommendedMediaFlow}
                      onChange={(event) =>
                        setExperienceOverride((current) => ({
                          ...current,
                          recommendedMediaFlow: event.target.value,
                        }))
                      }
                    >
                      {experienceMediaFlowOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderToggleCard">
                    <input
                      checked={experienceOverride.supportsSectionMediaGuidance}
                      onChange={(event) =>
                        setExperienceOverride((current) => ({
                          ...current,
                          supportsSectionMediaGuidance: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <div>
                      <strong>Enable section media guidance</strong>
                      <span>Show extra runtime guidance when sections contain prompt media.</span>
                    </div>
                  </label>
                  <label className="advancedBuilderField advancedBuilderFieldWide">
                    <span>Learner summary</span>
                    <textarea
                      rows={3}
                      value={experienceOverride.learnerSummary}
                      onChange={(event) =>
                        setExperienceOverride((current) => ({
                          ...current,
                          learnerSummary: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="advancedBuilderField advancedBuilderFieldWide">
                    <span>Creator summary</span>
                    <textarea
                      rows={3}
                      value={experienceOverride.creatorSummary}
                      onChange={(event) =>
                        setExperienceOverride((current) => ({
                          ...current,
                          creatorSummary: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="advancedBuilderToggleGrid">
                  {[
                    ["Randomize questions", "randomizeQuestions"],
                    ["Randomize options", "randomizeOptions"],
                    ["Allow late submit", "allowLateSubmit"],
                    ["Show result immediately", "showResultImmediately"],
                    ["Allow review after submit", "allowReviewAfterSubmit"],
                    ["Allow resume", "allowResume"],
                    ["Allow section switching", "allowSectionSwitching"],
                    ["Allow return to previous section", "allowReturnToPreviousSection"],
                  ].map(([label, key]) => (
                    <label className="advancedBuilderToggleCard" key={key}>
                      <input
                        checked={Boolean(delivery[key as keyof typeof delivery])}
                        onChange={(event) =>
                          setDelivery((current) => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <div>
                        <strong>{label}</strong>
                        <span>{audience === "teacher" ? "Teacher" : "Institute"} runtime preference.</span>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              <section
                className={`advancedBuilderPanel ${activeStage === 3 ? "" : "advancedBuilderPanelMuted"}`}
                hidden={activeStage !== 3}
              >
                <div className="advancedBuilderSectionHeader">
                  <div>
                    <span className="studentDashboardTag">Access policy</span>
                    <h3>Decide whether this exam is open, premium, or gated</h3>
                  </div>
                </div>

                <div className="advancedBuilderGrid advancedBuilderGridTwo">
                  <label className="advancedBuilderField">
                    <span>Economy policy</span>
                    <select
                      value={economy.policyType}
                      onChange={(event) =>
                        setEconomy((current) => ({ ...current, policyType: event.target.value }))
                      }
                    >
                      {economyPolicyOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Policy priority</span>
                    <input
                      list="advanced-builder-priority-options"
                      min={1}
                      type="number"
                      value={economy.priority}
                      onChange={(event) =>
                        setEconomy((current) => ({ ...current, priority: event.target.value }))
                      }
                    />
                  </label>
                  <label className="advancedBuilderField">
                    <span>Star cost</span>
                    <input
                      list="advanced-builder-star-cost-options"
                      min={0}
                      type="number"
                      value={economy.starCost}
                      onChange={(event) =>
                        setEconomy((current) => ({ ...current, starCost: event.target.value }))
                      }
                    />
                  </label>
                  <label className="advancedBuilderField">
                    <span>Entitlement code</span>
                    <input
                      placeholder="bundle:math-premium"
                      value={economy.entitlementCode}
                      onChange={(event) =>
                        setEconomy((current) => ({ ...current, entitlementCode: event.target.value }))
                      }
                    />
                  </label>
                  <label className="advancedBuilderField">
                    <span>Unlock rule</span>
                    <select
                      value={economy.unlockRuleType}
                      onChange={(event) =>
                        setEconomy((current) => ({ ...current, unlockRuleType: event.target.value }))
                      }
                    >
                      <option value="">No extra unlock rule</option>
                      <option value="stars_balance">Stars balance</option>
                      <option value="entitlement">Entitlement</option>
                      <option value="exam_completion">Exam completion</option>
                      <option value="score_threshold">Score threshold</option>
                      <option value="admin_approval">Admin approval</option>
                    </select>
                  </label>
                  <label className="advancedBuilderField">
                    <span>Unlock priority</span>
                    <input
                      list="advanced-builder-unlock-priority-options"
                      min={1}
                      type="number"
                      value={economy.unlockPriority}
                      onChange={(event) =>
                        setEconomy((current) => ({ ...current, unlockPriority: event.target.value }))
                      }
                    />
                  </label>
                  {economy.unlockRuleType === "stars_balance" ? (
                    <label className="advancedBuilderField">
                      <span>Required star balance</span>
                      <input
                        list="advanced-builder-star-cost-options"
                        min={1}
                        type="number"
                        value={economy.requiredStarBalance}
                        onChange={(event) =>
                          setEconomy((current) => ({
                            ...current,
                            requiredStarBalance: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ) : null}
                  {economy.unlockRuleType === "entitlement" ? (
                    <label className="advancedBuilderField">
                      <span>Required entitlement code</span>
                      <input
                        value={economy.requiredEntitlementCode}
                        onChange={(event) =>
                          setEconomy((current) => ({
                            ...current,
                            requiredEntitlementCode: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ) : null}
                  {economy.unlockRuleType === "exam_completion" ? (
                    <label className="advancedBuilderField">
                      <span>Required completion count</span>
                      <input
                        list="advanced-builder-unlock-count-options"
                        min={1}
                        type="number"
                        value={economy.requiredCompletionCount}
                        onChange={(event) =>
                          setEconomy((current) => ({
                            ...current,
                            requiredCompletionCount: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ) : null}
                  {economy.unlockRuleType === "score_threshold" ? (
                    <label className="advancedBuilderField">
                      <span>Required score percentage</span>
                      <input
                        list="advanced-builder-unlock-score-options"
                        min={0}
                        max={100}
                        step="0.01"
                        type="number"
                        value={economy.requiredScorePercentage}
                        onChange={(event) =>
                          setEconomy((current) => ({
                            ...current,
                            requiredScorePercentage: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ) : null}
                  {economy.unlockRuleType ? (
                    <label className="advancedBuilderToggleCard advancedBuilderToggleCardInline">
                      <input
                        checked={economy.adminOverrideAllowed}
                        onChange={(event) =>
                          setEconomy((current) => ({
                            ...current,
                            adminOverrideAllowed: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <div>
                        <strong>Admin override allowed</strong>
                        <span>Permit manual support overrides when this unlock rule blocks access.</span>
                      </div>
                    </label>
                  ) : null}
                </div>
              </section>

              <div className="advancedBuilderFooterBar">
                <div className="advancedBuilderFooterNav">
                  <button
                    className="button buttonGhost"
                    disabled={activeStage === 0}
                    onClick={() => setActiveStage((current) => Math.max(0, current - 1))}
                    type="button"
                  >
                    Back
                  </button>
                  <button
                    className="button buttonSecondary"
                    disabled={activeStage === stages.length - 1}
                    onClick={() => setActiveStage((current) => Math.min(stages.length - 1, current + 1))}
                    type="button"
                  >
                    Next
                  </button>
                </div>
                <div className="advancedBuilderFooterActions">
                  <button
                    className="button buttonSecondary"
                    disabled={isPreviewPending || isCreatePending}
                    onClick={() => startTransition(() => void runPreview())}
                    type="button"
                  >
                    {isPreviewPending ? "Refreshing Preview..." : "Preview Exam"}
                  </button>
                  <button
                    className={`button ${previewBlockerCount > 0 ? "buttonDisabled" : "buttonPrimary"}`}
                    disabled={isCreatePending || isPreviewPending || previewBlockerCount > 0}
                    onClick={() => startTransition(() => void runCreate())}
                    type="button"
                  >
                    {isCreatePending ? "Creating Exam..." : "Create Advanced Exam"}
                  </button>
                </div>
              </div>
            </div>

            <aside className="advancedBuilderSummaryColumn">
              <section className="advancedBuilderPanel advancedBuilderSummaryPanel">
                <div className="advancedBuilderSectionHeader">
                  <div>
                    <span className="studentDashboardTag">Live summary</span>
                    <h3>What this exam looks like right now</h3>
                  </div>
                </div>

                <div className="advancedBuilderSummaryStats">
                  <div>
                    <span>Audience</span>
                    <strong>{titleCase(audience)}</strong>
                  </div>
                  <div>
                    <span>Preset pack</span>
                    <strong>{selectedPresetPack?.label ?? "Custom"}</strong>
                  </div>
                  <div>
                    <span>Program</span>
                    <strong>{selectedProgramRecord?.name ?? "Pending"}</strong>
                  </div>
                  <div>
                    <span>Primary subject</span>
                    <strong>{selectedSubjectRecord?.name ?? "Pending"}</strong>
                  </div>
                  <div>
                    <span>Requested</span>
                    <strong>{requestedQuestionCount}</strong>
                  </div>
                </div>

                <div className="advancedBuilderSummaryBlock">
                  <strong>Current composition</strong>
                  <ul>
                    {deferredSections.map((section) => (
                      <li key={section.id}>
                        <span>{section.name || "Untitled section"}</span>
                        <small>
                          {section.questionCount} question(s) · {section.topics.length} topic lane(s)
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedProgramPresetPack ? (
                  <div className="advancedBuilderSummaryBlock">
                    <strong>Family recommendation</strong>
                    <ul>
                      <li>
                        <span>Recommended pack</span>
                        <small>{selectedProgramPresetPack.label}</small>
                      </li>
                      <li>
                        <span>Timing posture</span>
                        <small>{selectedProgramPresetPack.recommendations?.timingExpectation}</small>
                      </li>
                      <li>
                        <span>Security and review</span>
                        <small>
                          {selectedProgramPresetPack.recommendations?.securitySuggestion} ·{" "}
                          {selectedProgramPresetPack.recommendations?.reviewPolicy}
                        </small>
                      </li>
                    </ul>
                    <p className="advancedBuilderSummaryNote">
                      {selectedProgramPresetPack.recommendations?.authoringNote ??
                        selectedProgramPresetPack.note}
                    </p>
                  </div>
                ) : null}

                {preview ? (
                  <>
                    <div className="advancedBuilderSummaryBlock">
                      <strong>Experience profile</strong>
                      <ul>
                        <li>
                          <span>Assessment family</span>
                          <small>{preview.resolved_exam.experience_profile.assessment_family_label}</small>
                        </li>
                        <li>
                          <span>Runtime guidance</span>
                          <small>{preview.resolved_exam.experience_profile.experience_label}</small>
                        </li>
                        <li>
                          <span>Media flow</span>
                          <small>{preview.resolved_exam.experience_profile.recommended_media_flow_label}</small>
                        </li>
                        <li>
                          <span>Suggested timer / navigation</span>
                          <small>
                            {titleCase(preview.resolved_exam.experience_profile.recommended_timer_mode)} /{" "}
                            {titleCase(preview.resolved_exam.experience_profile.recommended_navigation_mode)}
                          </small>
                        </li>
                      </ul>
                      <p className="advancedBuilderSummaryNote">
                        {preview.resolved_exam.experience_profile.learner_summary}
                      </p>
                    </div>

                    <div className="advancedBuilderSummaryBlock">
                      <strong>Preview resolution</strong>
                      <ul>
                        <li>
                          <span>Total resolved questions</span>
                          <small>{preview.resolved_exam.total_questions}</small>
                        </li>
                        <li>
                          <span>Total marks</span>
                          <small>{preview.resolved_exam.total_marks}</small>
                        </li>
                        <li>
                          <span>End date</span>
                          <small>{new Date(preview.resolved_exam.end_at).toLocaleString("en-IN")}</small>
                        </li>
                        <li>
                          <span>Sections with caution</span>
                          <small>{previewSectionsWithWarnings.length}</small>
                        </li>
                        <li>
                          <span>Hard-stop blockers</span>
                          <small>{previewBlockerCount}</small>
                        </li>
                      </ul>
                      <div className="advancedBuilderQualityChips">
                        {qualitySummaryRows(preview.resolved_exam.question_quality).map((item) => (
                          <span className={`statusPill ${qualityTone(item.key)}`} key={item.key}>
                            {item.label}: {item.value}
                          </span>
                        ))}
                      </div>
                    </div>

                    {preview.blockers.length > 0 ? (
                      <div className="advancedBuilderSummaryBlock advancedBuilderSummaryBlocker">
                        <strong>Hard-stop blockers</strong>
                        <p className="advancedBuilderSummaryNote">
                          Fix these before the builder can create the exam.
                        </p>
                        <ul>
                          {preview.blockers.map((blocker) => (
                            <li key={blocker}>
                              <span>{blocker}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="advancedBuilderSummaryBlock">
                      <strong>Section resolution</strong>
                      <ul>
                        {preview.sections.map((section) => (
                          <li key={`${section.name}-${section.order}`}>
                            <div className="advancedBuilderSummaryListText">
                              <span>{section.name}</span>
                              {section.blockers.length > 0 ? (
                                <small>{section.blockers.length} hard-stop blocker(s)</small>
                              ) : null}
                              {section.warnings.length > 0 ? (
                                <small>{section.warnings.length} caution point(s)</small>
                              ) : null}
                            </div>
                            <small>
                              {section.resolved}/{section.requested} resolved · hard{" "}
                              {section.actual_difficulty_breakup.advanced}
                            </small>
                            <div className="advancedBuilderInlineQuality">
                              {qualitySummaryRows(section.quality_summary).map((item) => (
                                <span className={`statusPill ${qualityTone(item.key)}`} key={`${section.name}-${item.key}`}>
                                  {item.label}: {item.value}
                                </span>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {preview.warnings.length > 0 ? (
                      <div className="advancedBuilderSummaryBlock advancedBuilderSummaryWarning">
                        <strong>Builder cautions</strong>
                        <ul>
                          {preview.warnings.map((warning) => (
                            <li key={warning}>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {previewSectionsWithBlockers.length > 0 ? (
                      <div className="advancedBuilderSummaryBlock advancedBuilderSummaryBlocker">
                        <strong>Blocked sections</strong>
                        <div className="advancedBuilderSectionWarningStack">
                          {previewSectionsWithBlockers.map((section) => (
                            <article
                              className="advancedBuilderSectionWarningCard advancedBuilderSectionBlockerCard"
                              key={`${section.name}-${section.order}-blockers`}
                            >
                              <div className="advancedBuilderSectionWarningCardTop">
                                <strong>{section.name}</strong>
                                <small>
                                  {section.resolved}/{section.requested} resolved
                                </small>
                              </div>
                              <div className="advancedBuilderInlineQuality">
                                {qualitySummaryRows(section.quality_summary).map((item) => (
                                  <span className={`statusPill ${qualityTone(item.key)}`} key={`${section.name}-blocker-${item.key}`}>
                                    {item.label}: {item.value}
                                  </span>
                                ))}
                              </div>
                              <ul>
                                {section.blockers.map((blocker) => (
                                  <li key={`${section.name}-${blocker}`}>
                                    <span>{blocker}</span>
                                  </li>
                                ))}
                              </ul>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {previewSectionsWithWarnings.length > 0 ? (
                      <div className="advancedBuilderSummaryBlock advancedBuilderSummaryWarning">
                        <strong>Section-by-section watchlist</strong>
                        <p className="advancedBuilderSummaryNote">
                          {previewSectionWarningCount} caution point(s) across {previewSectionsWithWarnings.length} section(s)
                        </p>
                        <div className="advancedBuilderSectionWarningStack">
                          {previewSectionsWithWarnings.map((section) => (
                            <article
                              className="advancedBuilderSectionWarningCard"
                              key={`${section.name}-${section.order}-warnings`}
                            >
                              <div className="advancedBuilderSectionWarningCardTop">
                                <strong>{section.name}</strong>
                                <small>
                                  {section.resolved}/{section.requested} resolved
                                </small>
                              </div>
                              <div className="advancedBuilderInlineQuality">
                                {qualitySummaryRows(section.quality_summary).map((item) => (
                                  <span className={`statusPill ${qualityTone(item.key)}`} key={`${section.name}-warning-${item.key}`}>
                                    {item.label}: {item.value}
                                  </span>
                                ))}
                              </div>
                              <div className="advancedBuilderTopicQualityList">
                                {section.topic_breakup.map((topic) => (
                                  <div className="advancedBuilderTopicQualityCard" key={`${section.name}-${topic.topic_code}`}>
                                    <strong>{topic.topic_name}</strong>
                                    <small>
                                      {topic.resolved}/{topic.requested} resolved
                                    </small>
                                    <div className="advancedBuilderInlineQuality">
                                      {qualitySummaryRows(topic.quality_breakup).map((item) => (
                                        <span
                                          className={`statusPill ${qualityTone(item.key)}`}
                                          key={`${section.name}-${topic.topic_code}-${item.key}`}
                                        >
                                          {item.label}: {item.value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <ul>
                                {section.warnings.map((warning) => (
                                  <li key={`${section.name}-${warning}`}>
                                    <span>{warning}</span>
                                  </li>
                                ))}
                              </ul>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="advancedBuilderSummaryEmpty">
                    <strong>Run preview when you are ready</strong>
                    <p>
                      Preview will validate topic counts, difficulty mix, academic-year end date handling, and final
                      question resolution before anything is created.
                    </p>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
