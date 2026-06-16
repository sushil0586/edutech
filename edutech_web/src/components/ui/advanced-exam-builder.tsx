"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
};

type ScopeOption = {
  id: string;
  name: string;
  code: string;
};

type TopicOption = {
  id: string;
  name: string;
  code: string;
  difficulty_level: string;
};

type DifficultyMix = {
  foundation: number;
  intermediate: number;
  advanced: number;
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

type ExamPreview = {
  valid: boolean;
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
  };
  sections: Array<{
    name: string;
    order: number;
    requested: number;
    resolved: number;
    difficulty_mix: DifficultyMix;
    actual_difficulty_breakup: DifficultyMix;
    topic_breakup: Array<{
      topic_code: string;
      topic_name: string;
      requested: number;
      resolved: number;
      difficulty_breakup: Record<string, number>;
    }>;
    warnings: string[];
  }>;
};

type AdvancedExamBuilderProps = {
  audience: TemplateAudience;
  instituteCode: string;
  scopeLabel: string;
  successBasePath: string;
  academicYears: AcademicYearOption[];
  programs: ProgramOption[];
  initialCohorts: ScopeOption[];
  initialSubjects: ScopeOption[];
  initialTopics: TopicOption[];
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

type BuilderTemplateDefinition = {
  id: BuilderTemplateId;
  label: string;
  note: string;
  chip: string;
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
      examType: string;
      deliveryMode: string;
      status: string;
      sourceType: string;
      durationMinutes: string;
      passingMarks: string;
      startAt: string;
      endAt: string;
      instructions: string;
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
  },
  {
    id: "chapter_test",
    label: "Chapter Test",
    note: "Two sections with a calm core-to-challenge structure for regular academic delivery.",
    chip: "Teacher-friendly",
  },
  {
    id: "premium_mock",
    label: "Premium Mock",
    note: "A harder three-section mock with premium access defaults and stronger runtime control.",
    chip: "Monetization-ready",
  },
];


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

function createSectionDraft(index: number, topicCode = ""): SectionDraft {
  return {
    id: uid("section"),
    name: `Section ${String.fromCharCode(65 + index)}`,
    order: index + 1,
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

function parseApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Something went wrong while talking to the builder.";
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
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
  scopeLabel,
  successBasePath,
  academicYears,
  programs,
  initialCohorts,
  initialSubjects,
  initialTopics,
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
  const templateImportInputRef = useRef<HTMLInputElement | null>(null);
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
  const [templateAudience, setTemplateAudience] = useState<TemplateAudience>(audience);
  const [templateLibraryAudience, setTemplateLibraryAudience] = useState<TemplateAudience>(audience);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const [isPreviewPending, setIsPreviewPending] = useState(false);
  const [isCreatePending, setIsCreatePending] = useState(false);
  const [preview, setPreview] = useState<ExamPreview | null>(null);

  const [selectedAcademicYear, setSelectedAcademicYear] = useState(academicYears[0]?.id ?? "");
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.id ?? "");
  const [selectedCohort, setSelectedCohort] = useState(initialCohorts[0]?.id ?? "");
  const [selectedSubject, setSelectedSubject] = useState(initialSubjects[0]?.id ?? "");
  const [cohortOptions, setCohortOptions] = useState(initialCohorts);
  const [subjectOptions, setSubjectOptions] = useState(initialSubjects);
  const [topicOptions, setTopicOptions] = useState(initialTopics);

  const [exam, setExam] = useState({
    title: "",
    code: "",
    description: "",
    examType: examTypeOptions[0]?.value ?? "test",
    deliveryMode: deliveryModeOptions[0]?.value ?? "online",
    status: statusOptions[0]?.value ?? "draft",
    sourceType: defaultSource,
    durationMinutes: "60",
    passingMarks: "0.00",
    startAt: "",
    endAt: "",
    instructions: "",
  });

  const [delivery, setDelivery] = useState({
    timerMode: timerModeOptions[0]?.value ?? "global",
    navigationMode: navigationModeOptions[0]?.value ?? "free_exam",
    attemptPolicy: attemptPolicyOptions[0]?.value ?? "single",
    resultPublishMode: resultPublishModeOptions[0]?.value ?? "after_review",
    reviewMode: reviewModeOptions[0]?.value ?? "attempted_only",
    securityMode: securityModeOptions[0]?.value ?? "normal",
    assignmentMode: assignmentModeOptions[0]?.value ?? "scope",
    maxAttempts: "1",
    randomizeQuestions: true,
    randomizeOptions: true,
    allowLateSubmit: false,
    showResultImmediately: false,
    allowReviewAfterSubmit: true,
    allowResume: true,
    allowSectionSwitching: true,
    allowReturnToPreviousSection: true,
    resultPublishAt: "",
    reviewAvailableFrom: "",
    reviewAvailableUntil: "",
  });

  const [economy, setEconomy] = useState({
    policyType: economyPolicyOptions[0]?.value ?? "",
    starCost: "0",
    entitlementCode: "",
    priority: "100",
    unlockRuleType: "",
    requiredStarBalance: "",
    requiredEntitlementCode: "",
    requiredCompletionCount: "",
    requiredScorePercentage: "",
    unlockPriority: "100",
    adminOverrideAllowed: true,
  });

  const [selectionMode, setSelectionMode] = useState("strict");
  const [sections, setSections] = useState<SectionDraft[]>([
    createSectionDraft(0, initialTopics[0]?.code ?? ""),
  ]);
  const deferredSections = useDeferredValue(sections);
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
          const manageDelta = Number(Boolean(right.can_manage)) - Number(Boolean(left.can_manage));
          if (manageDelta !== 0) {
            return manageDelta;
          }
          return left.name.localeCompare(right.name);
        }),
    [allSavedTemplates, effectiveTemplateLibraryAudience, normalizedTemplateSearch],
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

  useEffect(() => {
    let ignore = false;

    async function loadTemplates() {
      try {
        const templates = await fetchSavedTemplates();
        if (!ignore) {
          setAllSavedTemplates(templates);
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

    void loadTemplates();

    return () => {
      ignore = true;
    };
  }, [audience, instituteCode]);

  useEffect(() => {
    let ignore = false;

    async function refreshScope() {
      if (!selectedProgram) {
        setCohortOptions([]);
        setSubjectOptions([]);
        setSelectedCohort("");
        setSelectedSubject("");
        setTopicOptions([]);
        return;
      }

      setIsScopeLoading(true);
      setError("");

      try {
        const cohortQuery = new URLSearchParams({
          is_active: "true",
          program: selectedProgram,
        });
        if (selectedAcademicYear) {
          cohortQuery.set("academic_year", selectedAcademicYear);
        }

        const subjectQuery = new URLSearchParams({
          is_active: "true",
          program: selectedProgram,
        });

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
          current && nextCohorts.some((cohort) => cohort.id === current) ? current : "",
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
  }, [selectedAcademicYear, selectedProgram]);

  useEffect(() => {
    let ignore = false;

    async function refreshTopics() {
      if (!selectedSubject) {
        setTopicOptions([]);
        return;
      }

      try {
        const query = new URLSearchParams({
          is_active: "true",
          subject: selectedSubject,
        });
        const nextTopics = await fetchLookup<TopicOption>(
          `/api/teacher/academics/topics?${query.toString()}`,
        );

        if (ignore) {
          return;
        }

        setTopicOptions(nextTopics);
        const allowedCodes = new Set(nextTopics.map((topic) => topic.code));
        setSections((currentSections) =>
          currentSections.map((section, sectionIndex) => ({
            ...section,
            topics: section.topics.map((topicRow, topicIndex) => {
              const fallbackCode = nextTopics[0]?.code ?? "";
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
  }, [selectedSubject]);

  const selectedAcademicYearRecord = useMemo(
    () => academicYears.find((item) => item.id === selectedAcademicYear) ?? null,
    [academicYears, selectedAcademicYear],
  );
  const selectedProgramRecord = useMemo(
    () => programs.find((item) => item.id === selectedProgram) ?? null,
    [programs, selectedProgram],
  );
  const selectedCohortRecord = useMemo(
    () => cohortOptions.find((item) => item.id === selectedCohort) ?? null,
    [cohortOptions, selectedCohort],
  );
  const selectedSubjectRecord = useMemo(
    () => subjectOptions.find((item) => item.id === selectedSubject) ?? null,
    [subjectOptions, selectedSubject],
  );
  const selectedExamTypeLabel = useMemo(
    () => examTypeOptions.find((item) => item.value === exam.examType)?.label ?? titleCase(exam.examType),
    [exam.examType, examTypeOptions],
  );
  const recommendedExamMetadata = useMemo(() => {
    const subjectLabel = selectedSubjectRecord?.name ?? "Subject";
    const subjectCode = selectedSubjectRecord?.code ?? "SUB";
    const programLabel = selectedProgramRecord?.name ?? "Program";
    const programCode = selectedProgramRecord?.code ?? "PRG";
    const cohortLabel = selectedCohortRecord?.name ?? "All Cohorts";
    const cohortCode = selectedCohortRecord?.code ?? "ALL";

    return {
      code: [
        abbreviation(programCode, "PRG"),
        abbreviation(subjectCode, "SUB"),
        abbreviation(cohortCode, "ALL"),
        abbreviation(selectedExamTypeLabel, "EXAM"),
        "01",
      ]
        .filter(Boolean)
        .join("-"),
      description: `${selectedExamTypeLabel} for ${cohortLabel} in ${subjectLabel} under ${programLabel}.`,
      durationMinutes: recommendedDurationForExamType(exam.examType),
      passingMarks: recommendedPassingMarksForExamType(exam.examType),
      templateName: `${subjectLabel} ${selectedExamTypeLabel} Template`,
      title: `${subjectLabel} ${selectedExamTypeLabel}`,
    };
  }, [
    exam.examType,
    selectedCohortRecord,
    selectedExamTypeLabel,
    selectedProgramRecord,
    selectedSubjectRecord,
  ]);
  const selectedTemplateTopicCodes = useMemo(() => {
    const firstTwo = topicOptions.slice(0, Math.min(2, topicOptions.length)).map((topic) => topic.code);
    const firstThree = topicOptions.slice(0, Math.min(3, topicOptions.length)).map((topic) => topic.code);
    const allTopicCodes = topicOptions.map((topic) => topic.code);

    return {
      firstTwo: firstTwo.length > 0 ? firstTwo : allTopicCodes,
      firstThree: firstThree.length > 0 ? firstThree : allTopicCodes,
      all: allTopicCodes,
    };
  }, [topicOptions]);

  const requestedQuestionCount = deferredSections.reduce(
    (total, section) => total + Number(section.questionCount || 0),
    0,
  );
  const estimatedMarks = deferredSections.reduce(
    (total, section) =>
      total + Number(section.questionCount || 0) * Number(section.marksPerQuestion || 0),
    0,
  );

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

  function updateSection(sectionId: string, updater: (section: SectionDraft) => SectionDraft) {
    setSections((current) =>
      current.map((section) => (section.id === sectionId ? updater(section) : section)),
    );
  }

  function addSection() {
    setSections((current) => [...current, createSectionDraft(current.length, topicOptions[0]?.code ?? "")]);
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
      setSelectionMode("strict");
      setSections([
        createSectionFromTemplate({
          index: 0,
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
      setSelectionMode("strict");
      setSections([
        createSectionFromTemplate({
          index: 0,
          name: "Core Concepts",
          questionCount: 18,
          topicCodes: selectedTemplateTopicCodes.firstTwo,
          difficultyMix: { foundation: 35, intermediate: 45, advanced: 20 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
        }),
        createSectionFromTemplate({
          index: 1,
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
        name: "Foundation Sweep",
        questionCount: 15,
        topicCodes: selectedTemplateTopicCodes.all,
        difficultyMix: { foundation: 35, intermediate: 45, advanced: 20 },
        marksPerQuestion: "1.00",
        negativeMarksPerQuestion: "0.00",
      }),
      createSectionFromTemplate({
        index: 1,
        name: "Applied Pressure",
        questionCount: 15,
        topicCodes: selectedTemplateTopicCodes.all,
        difficultyMix: { foundation: 15, intermediate: 45, advanced: 40 },
        marksPerQuestion: "2.00",
        negativeMarksPerQuestion: "0.25",
      }),
      createSectionFromTemplate({
        index: 2,
        name: "Ranker Finish",
        questionCount: 15,
        topicCodes: selectedTemplateTopicCodes.firstThree,
        difficultyMix: { foundation: 10, intermediate: 30, advanced: 60 },
        marksPerQuestion: "2.00",
        negativeMarksPerQuestion: "0.25",
      }),
    ]);
    setMessage("Premium Mock template applied. Preview it after adjusting counts to match your actual topic pool.");
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
        exam_type: exam.examType,
        delivery_mode: exam.deliveryMode,
        status: exam.status,
        duration_minutes: Number(exam.durationMinutes || recommendedExamMetadata.durationMinutes || 0),
        passing_marks: exam.passingMarks || recommendedExamMetadata.passingMarks,
        start_at: exam.startAt ? new Date(exam.startAt).toISOString() : null,
        end_at: exam.endAt ? new Date(exam.endAt).toISOString() : null,
        instructions: exam.instructions.trim(),
        source_type: exam.sourceType,
      },
      composition: {
        selection_mode: selectionMode,
        sections: sections.map((section, index) => ({
          name: section.name.trim() || `Section ${String.fromCharCode(65 + index)}`,
          order: index + 1,
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
      exam: { ...exam },
      delivery: { ...delivery },
      economy: { ...economy },
      selectionMode,
      sections: sections.map((section, index) => ({
        name: section.name.trim() || `Section ${String.fromCharCode(65 + index)}`,
        order: index + 1,
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

  function hydrateSectionsFromBlueprint(
    sectionRows: SavedBuilderTemplate["blueprint"]["sections"],
    availableTopicCodes: Set<string>,
  ) {
    return sectionRows.map((section, sectionIndex) => ({
      id: uid("section"),
      name: section.name,
      order: sectionIndex + 1,
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
          topicRow.topicCode && availableTopicCodes.has(topicRow.topicCode)
            ? topicRow.topicCode
            : sectionIndex === 0 && topicIndex === 0
              ? topicOptions[0]?.code ?? ""
              : "",
        count: topicRow.count,
      })),
    }));
  }

  async function saveCurrentTemplate() {
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
    const availableTopicCodes = new Set(topicOptions.map((topic) => topic.code));
    setExam({ ...template.blueprint.exam });
    setDelivery({ ...template.blueprint.delivery });
    setEconomy({ ...template.blueprint.economy });
    setSelectionMode(template.blueprint.selectionMode);
    setSections(hydrateSectionsFromBlueprint(template.blueprint.sections, availableTopicCodes));
    setPreview(null);
    setMessage(`Loaded saved template "${template.name}". You can adjust anything before preview or create.`);
    setError("");
    setActiveStage(1);
  }

  async function deleteSavedTemplate(templateId: string) {
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
                  {builderTemplates.map((template) => (
                    <button
                      key={template.id}
                      className="advancedBuilderTemplateCard"
                      onClick={() => applyTemplate(template.id)}
                      type="button"
                    >
                      <span className="advancedBuilderTemplateChip">{template.chip}</span>
                      <strong>{template.label}</strong>
                      <small>{template.note}</small>
                    </button>
                  ))}
                </div>

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

                {allSavedTemplates.length > 0 ? (
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
                    <span>Subject</span>
                    <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}>
                      {subjectOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
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
                      onChange={(event) => setExam((current) => ({ ...current, examType: event.target.value }))}
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
                    <option value="subject_fallback">Subject fallback</option>
                  </select>
                </label>

                <div className="advancedBuilderSectionStack">
                  {sections.map((section, sectionIndex) => (
                    <article className="advancedBuilderSectionCard" key={section.id}>
                      <div className="advancedBuilderSectionCardTop">
                        <div>
                          <strong>{section.name || `Section ${sectionIndex + 1}`}</strong>
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

                      <div className="advancedBuilderTopicBlock">
                        <div className="advancedBuilderTopicHeader">
                          <strong>Topics</strong>
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
                              {topicOptions.map((topic) => (
                                <option key={topic.id} value={topic.code}>
                                  {topic.name}
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
                    className="button buttonPrimary"
                    disabled={isCreatePending || isPreviewPending}
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
                    <span>Program</span>
                    <strong>{selectedProgramRecord?.name ?? "Pending"}</strong>
                  </div>
                  <div>
                    <span>Subject</span>
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

                {preview ? (
                  <>
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
                      </ul>
                    </div>

                    <div className="advancedBuilderSummaryBlock">
                      <strong>Section resolution</strong>
                      <ul>
                        {preview.sections.map((section) => (
                          <li key={`${section.name}-${section.order}`}>
                            <span>{section.name}</span>
                            <small>
                              {section.resolved}/{section.requested} resolved · hard{" "}
                              {section.actual_difficulty_breakup.advanced}
                            </small>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {preview.warnings.length > 0 ? (
                      <div className="advancedBuilderSummaryBlock advancedBuilderSummaryWarning">
                        <strong>Warnings</strong>
                        <ul>
                          {preview.warnings.map((warning) => (
                            <li key={warning}>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
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
