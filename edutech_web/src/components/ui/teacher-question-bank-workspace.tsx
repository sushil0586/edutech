"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { formatTopicOptionLabel, sortTopicOptions } from "@/lib/academics/topic-options";
import { buildQuestionTypePresentationProfile } from "@/lib/assessment/question-type-presentation";
import type {
  LookupProgram,
  MasterQuestionLibraryQuestion,
  QuestionTagLite,
  LookupSubject,
  LookupTopic,
  TeacherQuestion,
  TeacherQuestionOption,
  TeacherQuestionSummary,
} from "@/lib/api/teacher-builder";
import type { CatalogSelectOption } from "@/lib/teacher/option-catalog";

type TeacherFilterOption = {
  id: string;
  full_name: string;
  employee_code: string;
};

type ScopedQuestionBankEntitlement = {
  id: string;
  status: string;
  question_bank_package_name: string;
  question_bank_package_code: string;
  question_bank_package_type: string;
  question_bank_package_ownership_type: string;
  question_bank_package_access_mode: string;
  subscription_plan_name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  scope_summary: string[];
  quota_configured?: boolean;
  quota_status?: string;
  quota_watch_state?: string;
  quota_usage_total?: number;
  quota_remaining_min?: number | null;
  quota_scope_summary?: string[];
};

type ScopedQuestionBankFeatureEntitlement = {
  id: string;
  feature_code: string;
  status: string;
  source_package_name?: string | null;
};

function percentage(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : "0%";
}

function questionQualityTone(signal: TeacherQuestionSummary["quality_signal"] | TeacherQuestion["quality_signal"]) {
  if (signal === "ambiguous" || signal === "revision_candidate") return "statusDemo";
  if (signal === "skip_risk" || signal === "hard" || signal === "watch") return "statusWarn";
  if (signal === "healthy") return "statusSuccess";
  return "statusDefault";
}

function distractorTone(signal: TeacherQuestionOption["distractor_signal"]) {
  if (signal === "strong_distractor" || signal === "key_review") return "statusWarn";
  if (signal === "validated_key" || signal === "working_distractor") return "statusSuccess";
  if (signal === "weak_distractor") return "statusDemo";
  return "statusDefault";
}

function normalizeLookupRelationId(
  relation: string | { id?: string | null } | null | undefined,
) {
  if (!relation) {
    return "";
  }

  if (typeof relation === "string") {
    return relation;
  }

  return typeof relation.id === "string" ? relation.id : "";
}

function getStatus(question: TeacherQuestionSummary | TeacherQuestion) {
  if (question.metadata?.is_draft === true) {
    return "draft";
  }
  if (question.is_verified) {
    return "published";
  }
  return question.is_active ? "active" : "inactive";
}

function isReadOnlyLibraryQuestion(question: TeacherQuestionSummary | TeacherQuestion) {
  return (
    question.metadata?.link_mode === "source_materialization" ||
    typeof question.metadata?.linked_from_master === "string"
  );
}

function sharedLibraryAccessTone(question: TeacherQuestionSummary | TeacherQuestion) {
  if (!question.is_shared_library_link) {
    return "statusDefault";
  }
  return question.shared_library_access_active ? "statusSuccess" : "statusWarn";
}

function sharedLibraryAccessLabel(question: TeacherQuestionSummary | TeacherQuestion) {
  if (!question.is_shared_library_link) {
    return "";
  }
  if (question.shared_library_access_active) {
    return "Licensed source active";
  }
  return "Licensed source paused";
}

function questionOwnershipLabel(question: TeacherQuestionSummary | TeacherQuestion) {
  if (question.is_shared_library_link) {
    return isReadOnlyLibraryQuestion(question) ? "Linked licensed copy" : "Licensed platform question";
  }
  if (question.created_by_teacher) {
    return "Teacher private";
  }
  return "Institute private";
}

function questionOwnershipTone(question: TeacherQuestionSummary | TeacherQuestion) {
  if (question.is_shared_library_link) {
    return question.shared_library_access_active ? "statusSuccess" : "statusWarn";
  }
  return "statusDefault";
}

function questionOwnershipNote(question: TeacherQuestionSummary | TeacherQuestion) {
  if (question.is_shared_library_link) {
    if (isReadOnlyLibraryQuestion(question)) {
      return question.shared_library_access_active
        ? "This row came from a licensed platform source and is now a linked read-only local copy. Duplicate it before editing."
        : "This row came from a licensed platform source, but the institute entitlement is currently paused. Existing visibility remains for audit and review."
    }
    return question.shared_library_access_active
      ? "This question stays connected to an active licensed platform source."
      : "This licensed question is still visible locally, but no new shared-library actions should be expected until access is restored."
  }
  if (question.created_by_teacher) {
    const teacherName =
      "created_by_teacher_name" in question && question.created_by_teacher_name
        ? question.created_by_teacher_name
        : "a teacher in this institute";
    return `Private teacher-authored content owned by ${teacherName}.`
  }
  return "Private institute-owned content available only inside this institute."
}

function questionSourceStateLabel(question: TeacherQuestionSummary | TeacherQuestion) {
  if (question.is_shared_library_link) {
    return isReadOnlyLibraryQuestion(question) ? "Linked source" : "Licensed source";
  }
  return question.created_by_teacher ? "Teacher-authored local" : "Institute-authored local";
}

function questionSourceStateTone(question: TeacherQuestionSummary | TeacherQuestion) {
  if (question.is_shared_library_link) {
    return question.shared_library_access_active ? "statusSuccess" : "statusWarn";
  }
  return "statusDefault";
}

function questionEditStateLabel(question: TeacherQuestionSummary | TeacherQuestion) {
  if (isReadOnlyLibraryQuestion(question)) {
    return "Read-only linked";
  }
  if (question.is_shared_library_link && !question.shared_library_access_active) {
    return "Reuse blocked";
  }
  return "Editable local";
}

function questionEditStateTone(question: TeacherQuestionSummary | TeacherQuestion) {
  if (isReadOnlyLibraryQuestion(question)) {
    return "statusDemo";
  }
  if (question.is_shared_library_link && !question.shared_library_access_active) {
    return "statusWarn";
  }
  return "statusSuccess";
}

function sharedLibraryFilterLabel(value: string) {
  if (value === "linked") return "linked licensed";
  if (value === "active") return "licensed active";
  if (value === "inactive") return "licensed paused";
  if (value === "local-only") return "local only";
  return "all";
}

function masterLibraryAccessLabel(question: MasterQuestionLibraryQuestion) {
  if (question.access_availability === "quota_exhausted") {
    return "Quota exhausted";
  }
  if (question.has_access) {
    return question.quota_limited ? "Access available · quota tracked" : "Access available";
  }
  return "Subscription required";
}

function masterLibraryAccessTone(question: MasterQuestionLibraryQuestion) {
  if (question.access_availability === "quota_exhausted") {
    return "statusWarn";
  }
  if (question.has_access) {
    return "statusSuccess";
  }
  return "statusWarn";
}

function masterLibraryAccessStateLabel(question: MasterQuestionLibraryQuestion) {
  const accessState = question.access_status || (question.has_access ? "entitled" : "not_requested");
  return accessState.replaceAll("_", " ");
}

function masterLibraryAvailabilityNote(question: MasterQuestionLibraryQuestion) {
  if (question.access_status === "linked") {
    return "This licensed source is already linked into the local bank.";
  }
  if (question.access_status === "requested") {
    return "An access request is already pending for this licensed source.";
  }
  if (question.access_availability === "quota_exhausted") {
    return question.quota_note || "Matching subscribed packages were found, but their question quota is exhausted.";
  }
  if (question.has_access) {
    return question.quota_note || "The institute can currently link this licensed source into the local bank.";
  }
  if (question.matching_packages.length > 0) {
    return "Matching package lanes exist, but this source is not currently requestable from the active authoring scope.";
  }
  return "No matching subscribed package was found for this local scope.";
}

function masterLibraryActionLabel(question: MasterQuestionLibraryQuestion) {
  if (question.access_status === "linked") {
    return "Already linked";
  }
  if (question.access_status === "requested") {
    return "Request pending";
  }
  if (question.access_availability === "quota_exhausted") {
    return "Quota exhausted";
  }
  if (question.matching_packages.length > 0) {
    return "Scope mismatch";
  }
  return "Subscription required";
}

function getQuestionEditorHref(question: TeacherQuestionSummary | TeacherQuestion, basePath: string) {
  if (isReadOnlyLibraryQuestion(question)) {
    return `${basePath}/new?duplicate=${question.id}`;
  }

  return `${basePath}/${question.id}`;
}

function isQualityReady(question: TeacherQuestionSummary | TeacherQuestion) {
  if ("is_quality_ready" in question) {
    return question.is_quality_ready;
  }

  const presentationProfile = buildQuestionTypePresentationProfile(question.question_type_definition);
  const hasCorrectOption =
    !presentationProfile.supportsOptions || question.options.some((option) => option.is_correct);
  const hasMinimumOptions =
    !presentationProfile.supportsOptions || question.options.length >= 2;
  const hasAcceptedAnswers =
    !presentationProfile.supportsAcceptedAnswers ||
    Boolean(question.accepted_answers?.filter((answer) => answer.trim()).length);

  return hasCorrectOption && hasMinimumOptions && hasAcceptedAnswers && question.has_explanation;
}

function renderQuestionResponsePreview(question: TeacherQuestionSummary | TeacherQuestion) {
  const presentationProfile = buildQuestionTypePresentationProfile(question.question_type_definition);
  const acceptedAnswers =
    question.accepted_answers?.filter((answer) => answer.trim()).map((answer) => answer.trim()) ?? [];
  const optionRows = "options" in question ? question.options : [];

  if (presentationProfile.supportsOptions) {
    return (
      <>
        <strong>Answer options</strong>
        {optionRows.length ? (
          <div className="questionBankOptionsList">
            {optionRows.map((option) => (
              <div className="questionBankOptionRow" key={option.id ?? `${question.id}-${option.option_order}`}>
                <span>{option.is_correct ? "✓" : "○"}</span>
                <p>{option.option_text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="emptyText">
            {presentationProfile.optionsHint || "No options were returned for this question."}
          </p>
        )}
      </>
    );
  }

  if (presentationProfile.supportsAcceptedAnswers) {
    return (
      <>
        <strong>{presentationProfile.acceptedAnswersLabel}</strong>
        {acceptedAnswers.length ? (
          <div className="questionBankTagRow">
            {acceptedAnswers.map((answer) => (
              <span className="questionBankTagChip" key={answer}>
                {answer}
              </span>
            ))}
          </div>
        ) : (
          <p className="emptyText">
            {presentationProfile.acceptedAnswersHelper || "No accepted answers were added yet."}
          </p>
        )}
      </>
    );
  }

  if (presentationProfile.supportsTextAnswer) {
    return (
      <>
        <strong>Student response format</strong>
        <p className="emptyText">
          {presentationProfile.responseInputHelper || "Learners respond in free text for this question type."}
        </p>
      </>
    );
  }

  return null;
}

function renderDistractorAnalytics(question: TeacherQuestion) {
  if (!question.options.length) {
    return null;
  }

  return (
    <section className="questionPreviewSection">
      <strong>Option analytics</strong>
      <div className="questionBankOptionAnalyticsGrid">
        {question.options.map((option) => (
          <article className="questionBankOptionAnalyticsCard" key={option.id ?? `${question.id}-${option.option_order}`}>
            <div className="questionBankOptionAnalyticsHeader">
              <span className={`statusPill ${option.is_correct ? "statusSuccess" : distractorTone(option.distractor_signal)}`}>
                {option.is_correct ? "Correct option" : option.distractor_signal.replaceAll("_", " ")}
              </span>
              <span className="questionBankMetaChip">Option {option.option_order}</span>
            </div>
            <p>{option.option_text}</p>
            <div className="questionBankOptionAnalyticsStats">
              <span>{Math.round(option.selection_rate)}% selected</span>
              <span>{option.selected_count} picks</span>
              <span>{option.selected_wrong_count} wrong picks</span>
            </div>
            <small>{option.distractor_note}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function getPassageTitle(question: TeacherQuestionSummary | TeacherQuestion) {
  if ("passage_detail" in question && question.passage_detail?.title) {
    return question.passage_detail.title;
  }
  if ("passage_title" in question && question.passage_title) {
    return question.passage_title;
  }
  return "";
}

function buildPageHref(
  page: number,
  filters: Record<string, string | undefined>,
  basePath: string,
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    params.set(key, value);
  });
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

function buildWorkspaceStatusHref(
  basePath: string,
  filters: Record<string, string>,
  page: number,
  status: { message?: string; error?: string },
) {
  return buildPageHref(
    page,
    {
      ...filters,
      message: status.message,
      error: status.error,
    },
    basePath,
  );
}

async function readActionError(response: Response) {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const detail = payload.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }

    const firstValue = Object.values(payload).find((value) => {
      if (typeof value === "string" && value.trim()) {
        return true;
      }
      if (Array.isArray(value) && value.length > 0) {
        return true;
      }
      return false;
    });

    if (typeof firstValue === "string" && firstValue.trim()) {
      return firstValue.trim();
    }
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
  } catch {
    return "";
  }

  return "";
}

function summarizeWorkspaceFamilyScoring(scoringDefaults: Record<string, unknown> | null | undefined) {
  if (!scoringDefaults || typeof scoringDefaults !== "object") {
    return "Use the filter set to narrow the bank to the response formats your target exam expects.";
  }

  const negativeMarkingEnabled = Boolean(scoringDefaults.negative_marking_default);
  const supportsNumericEntry = Boolean(scoringDefaults.supports_numeric_entry);

  return [
    negativeMarkingEnabled ? "This family usually attaches to negative-marking exams." : "This family usually attaches to no-penalty exams.",
    supportsNumericEntry ? "Numeric-entry coverage is part of the expected bank shape." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function renderAttachmentPreview(attachment: TeacherQuestion["attachments"][number]) {
  const source = attachment.file_url || attachment.file;

  if (!source) {
    return null;
  }

  if (attachment.attachment_type === "image" || attachment.attachment_type === "diagram") {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={attachment.alt_text || attachment.title || "Question attachment"}
          className="questionPreviewAttachmentMedia"
          src={source}
        />
      </>
    );
  }

  if (attachment.attachment_type === "pdf") {
    return (
      <iframe
        className="questionPreviewAttachmentFrame"
        src={source}
        title={attachment.title || "Attachment preview"}
      />
    );
  }

  if (attachment.attachment_type === "audio") {
    return <audio className="questionPreviewAttachmentAudio" controls src={source} />;
  }

  if (attachment.attachment_type === "video") {
    return <video className="questionPreviewAttachmentVideo" controls src={source} />;
  }

  return null;
}

export function TeacherQuestionBankWorkspace({
  academicsApiBasePath = "/api/teacher/academics",
  attachmentTypeLabelMap,
  bulkAction,
  basePath = "/teacher/question-bank",
  difficultyLabelMap,
  difficultyOptions,
  filters,
  programs,
  questionTypeLabelMap,
  questionTypeOptions,
  subjects,
  storageKeyPrefix = "teacher-question-bank",
  tags,
  teachers = [],
  topics,
  questions,
  totalCount,
  page,
  hasPreviousPage,
  hasNextPage,
  previewThemeClass = "",
  masterLibraryQuestions = [],
  masterLibraryLoadError = "",
  sharedLibraryDisabledMessage = "",
  canLinkSharedLibrary = false,
  questionBankEntitlements = [],
  featureEntitlements = [],
}: {
  academicsApiBasePath?: string;
  attachmentTypeLabelMap: Record<string, string>;
  bulkAction: (formData: FormData) => void | Promise<void>;
  basePath?: string;
  difficultyLabelMap: Record<string, string>;
  difficultyOptions: CatalogSelectOption[];
  filters: Record<string, string>;
  programs: LookupProgram[];
  questionTypeLabelMap: Record<string, string>;
  questionTypeOptions: CatalogSelectOption[];
  subjects: LookupSubject[];
  storageKeyPrefix?: string;
  tags: QuestionTagLite[];
  teachers?: TeacherFilterOption[];
  topics: LookupTopic[];
  questions: TeacherQuestionSummary[];
  totalCount: number;
  page: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  previewThemeClass?: string;
  masterLibraryQuestions?: MasterQuestionLibraryQuestion[];
  masterLibraryLoadError?: string;
  sharedLibraryDisabledMessage?: string;
  canLinkSharedLibrary?: boolean;
  questionBankEntitlements?: ScopedQuestionBankEntitlement[];
  featureEntitlements?: ScopedQuestionBankFeatureEntitlement[];
}) {
  const portalTarget = typeof document === "undefined" ? null : document.body;
  const isBrowser = typeof window !== "undefined";
  const readStoredArray = (key: string) => {
    if (!isBrowser) {
      return [];
    }

    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return [];
    }

    try {
      return JSON.parse(rawValue) as string[];
    } catch {
      return [];
    }
  };
  const [programFilter, setProgramFilter] = useState(filters.program ?? "");
  const [subjectFilter, setSubjectFilter] = useState(filters.subject ?? "");
  const [topicFilter, setTopicFilter] = useState(filters.topic ?? "");
  const [qualitySignalFilter, setQualitySignalFilter] = useState(filters.quality_signal ?? "");
  const [revisionPriorityFilter, setRevisionPriorityFilter] = useState(filters.revision_priority ?? "");
  const [loadedTopicInventory, setLoadedTopicInventory] = useState<LookupTopic[] | null>(null);
  const [recentTopicIds, setRecentTopicIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);
  const [questionDetailsById, setQuestionDetailsById] = useState<Record<string, TeacherQuestion>>({});
  const [loadingQuestionIds, setLoadingQuestionIds] = useState<string[]>([]);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [sharedLibraryFilter, setSharedLibraryFilter] = useState("");
  const [isCompact, setIsCompact] = useState(false);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [pendingMasterQuestionId, setPendingMasterQuestionId] = useState<string | null>(null);
  const [isPendingMasterAction, startMasterActionTransition] = useTransition();
  const topicInventory = loadedTopicInventory ?? topics;
  const activeQuestionBankEntitlements = useMemo(
    () => questionBankEntitlements.filter((entitlement) => entitlement.status === "active"),
    [questionBankEntitlements],
  );
  const activeFeatureEntitlements = useMemo(
    () => featureEntitlements.filter((entitlement) => entitlement.status === "active"),
    [featureEntitlements],
  );

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    setFavoriteIds(readStoredArray(`${storageKeyPrefix}-favorites`));
    setRecentTopicIds(readStoredArray(`${storageKeyPrefix}-recent-topics`));
    setShowFavoritesOnly(
      window.localStorage.getItem(`${storageKeyPrefix}-favorites-only`) === "true",
    );
    setStatusFilter(window.localStorage.getItem(`${storageKeyPrefix}-status`) ?? "");
    setSharedLibraryFilter(window.localStorage.getItem(`${storageKeyPrefix}-shared-library`) ?? "");
    setIsCompact(window.localStorage.getItem(`${storageKeyPrefix}-compact`) === "true");
    setHasLoadedPreferences(true);
  }, [isBrowser, storageKeyPrefix]);

  useEffect(() => {
    if (!isBrowser || !hasLoadedPreferences) {
      return;
    }

    window.localStorage.setItem(
      `${storageKeyPrefix}-favorites`,
      JSON.stringify(favoriteIds),
    );
  }, [favoriteIds, hasLoadedPreferences, isBrowser, storageKeyPrefix]);

  useEffect(() => {
    if (!previewQuestionId) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewQuestionId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewQuestionId]);

  useEffect(() => {
    if (!isBrowser || !hasLoadedPreferences) {
      return;
    }

    window.localStorage.setItem(`${storageKeyPrefix}-compact`, String(isCompact));
  }, [hasLoadedPreferences, isBrowser, isCompact, storageKeyPrefix]);

  useEffect(() => {
    if (!isBrowser || !hasLoadedPreferences) {
      return;
    }

    window.localStorage.setItem(
      `${storageKeyPrefix}-favorites-only`,
      String(showFavoritesOnly),
    );
  }, [hasLoadedPreferences, isBrowser, showFavoritesOnly, storageKeyPrefix]);

  useEffect(() => {
    if (!isBrowser || !hasLoadedPreferences) {
      return;
    }

    window.localStorage.setItem(`${storageKeyPrefix}-status`, statusFilter);
  }, [hasLoadedPreferences, isBrowser, statusFilter, storageKeyPrefix]);

  useEffect(() => {
    if (!isBrowser || !hasLoadedPreferences) {
      return;
    }

    window.localStorage.setItem(`${storageKeyPrefix}-shared-library`, sharedLibraryFilter);
  }, [hasLoadedPreferences, isBrowser, sharedLibraryFilter, storageKeyPrefix]);

  const subjectOptions = useMemo(() => {
    if (!programFilter) {
      return subjects;
    }

    return subjects.filter((subject) => subject.program === programFilter);
  }, [programFilter, subjects]);
  const selectedProgramRecord = useMemo(
    () => programs.find((program) => program.id === programFilter) ?? null,
    [programFilter, programs],
  );
  const selectedProgramFamilyProfile = selectedProgramRecord?.assessment_family_profile ?? null;
  const filteredQuestionTypeOptions = useMemo(() => {
    const allowedTypes = selectedProgramFamilyProfile?.allowed_question_types ?? [];
    if (!allowedTypes.length) {
      return questionTypeOptions;
    }

    const allowedTypeSet = new Set(allowedTypes);
    return questionTypeOptions.filter((option) => option.value && allowedTypeSet.has(option.value));
  }, [questionTypeOptions, selectedProgramFamilyProfile]);

  const selectedSubjectFilter =
    programFilter && subjectFilter && subjectOptions.some((subject) => subject.id === subjectFilter)
      ? subjectFilter
      : "";

  useEffect(() => {
    if (!selectedSubjectFilter) {
      return;
    }

    const controller = new AbortController();

    async function loadTopicsForSubject() {
      const query = new URLSearchParams({
        is_active: "true",
        subject: selectedSubjectFilter,
        page_size: "500",
      });

      try {
        const response = await fetch(
          `${academicsApiBasePath}/topics?${query.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Unable to load topics for subject ${selectedSubjectFilter}.`);
        }

        const payload = (await response.json()) as { results?: LookupTopic[] };
        if (!controller.signal.aborted) {
          setLoadedTopicInventory(Array.isArray(payload.results) ? payload.results : []);
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        const fallbackTopics = topics.filter(
          (topic) =>
            normalizeLookupRelationId(
              topic.subject as string | { id?: string | null } | null | undefined,
            ) === selectedSubjectFilter,
        );
        setLoadedTopicInventory(fallbackTopics);
      }
    }

    void loadTopicsForSubject();

    return () => controller.abort();
  }, [academicsApiBasePath, selectedSubjectFilter, topics]);

  const topicsBySubject = useMemo(() => {
    const groupedTopics = new Map<string, LookupTopic[]>();

    for (const topic of topicInventory) {
      const topicSubjectId = normalizeLookupRelationId(
        topic.subject as string | { id?: string | null } | null | undefined,
      );

      if (!topicSubjectId) {
        continue;
      }

      const existing = groupedTopics.get(topicSubjectId);
      if (existing) {
        existing.push(topic);
        continue;
      }

      groupedTopics.set(topicSubjectId, [topic]);
    }

    return groupedTopics;
  }, [topicInventory]);

  const topicOptions = useMemo(() => {
    if (!selectedSubjectFilter) {
      return [];
    }

    return sortTopicOptions(topicsBySubject.get(selectedSubjectFilter) ?? []);
  }, [selectedSubjectFilter, topicsBySubject]);

  const selectedTopicFilter =
    selectedSubjectFilter && topicFilter && topicOptions.some((topic) => topic.id === topicFilter)
      ? topicFilter
      : "";

  const mergedRecentTopicIds = useMemo(() => {
    if (!selectedTopicFilter) {
      return recentTopicIds;
    }

    return [
      selectedTopicFilter,
      ...recentTopicIds.filter((topicId) => topicId !== selectedTopicFilter),
    ].slice(0, 5);
  }, [recentTopicIds, selectedTopicFilter]);

  useEffect(() => {
    if (!isBrowser || !hasLoadedPreferences) {
      return;
    }

    window.localStorage.setItem(
      `${storageKeyPrefix}-recent-topics`,
      JSON.stringify(mergedRecentTopicIds),
    );
  }, [hasLoadedPreferences, mergedRecentTopicIds, isBrowser, storageKeyPrefix]);

  const visibleQuestions = useMemo(() => {
    return questions.filter((question) => {
      if (showFavoritesOnly && !favoriteIds.includes(question.id)) {
        return false;
      }

      if (sharedLibraryFilter === "linked" && !question.is_shared_library_link) {
        return false;
      }

      if (sharedLibraryFilter === "active") {
        if (!question.is_shared_library_link || !question.shared_library_access_active) {
          return false;
        }
      }

      if (sharedLibraryFilter === "inactive") {
        if (!question.is_shared_library_link || question.shared_library_access_active !== false) {
          return false;
        }
      }

      if (sharedLibraryFilter === "local-only" && question.is_shared_library_link) {
        return false;
      }

      if (!statusFilter) {
        return true;
      }

      return getStatus(question) === statusFilter;
    });
  }, [favoriteIds, questions, sharedLibraryFilter, showFavoritesOnly, statusFilter]);

  const recentTopics = useMemo(
    () =>
      mergedRecentTopicIds
        .map((topicId) => topicInventory.find((topic) => topic.id === topicId))
        .filter((topic): topic is LookupTopic => Boolean(topic)),
    [mergedRecentTopicIds, topicInventory],
  );
  const quickFilterHref = (overrides: Record<string, string>) =>
    buildPageHref(
      1,
      {
        ...filters,
        ...overrides,
      },
      basePath,
    );

  const questionIdsOnPage = questions.map((question) => question.id);
  const selectedIdsOnPage = selectedIds.filter((id) => questionIdsOnPage.includes(id));
  const visibleQuestionIds = visibleQuestions.map((question) => question.id);
  const allVisibleSelected =
    visibleQuestionIds.length > 0 &&
    visibleQuestionIds.every((id) => selectedIdsOnPage.includes(id));
  const previewQuestionSummary = previewQuestionId
    ? questions.find((question) => question.id === previewQuestionId) ?? null
    : null;
  const previewQuestionDetail = previewQuestionId
    ? questionDetailsById[previewQuestionId] ?? null
    : null;
  const previewQuestion = previewQuestionDetail ?? previewQuestionSummary;

  async function ensureQuestionDetail(questionId: string) {
    if (questionDetailsById[questionId]) {
      return questionDetailsById[questionId];
    }

    if (loadingQuestionIds.includes(questionId)) {
      return null;
    }

    setLoadingQuestionIds((current) => [...current, questionId]);
    setDetailErrors((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });

    try {
      const response = await fetch(`/api/teacher/question-bank/questions/${questionId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load full question details right now.");
      }

      const payload = (await response.json()) as TeacherQuestion;
      setQuestionDetailsById((current) => ({
        ...current,
        [questionId]: payload,
      }));
      return payload;
    } catch (error) {
      setDetailErrors((current) => ({
        ...current,
        [questionId]:
          error instanceof Error && error.message
            ? error.message
            : "Unable to load full question details right now.",
      }));
      return null;
    } finally {
      setLoadingQuestionIds((current) => current.filter((id) => id !== questionId));
    }
  }

  function isLoadingQuestionDetail(questionId: string) {
    return loadingQuestionIds.includes(questionId);
  }

  function toggleFavorite(questionId: string) {
    setFavoriteIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  function toggleSelection(questionId: string) {
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  function toggleVisibleSelection() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleQuestionIds.includes(id));
      }

      return [...new Set([...current, ...visibleQuestionIds])];
    });
  }

  function runMasterLibraryAction(
    question: MasterQuestionLibraryQuestion,
    action: "request-access" | "link",
  ) {
    const subject = subjects.find((entry) => entry.id === selectedSubjectFilter) ?? null;
    const topic = topicInventory.find((entry) => entry.id === selectedTopicFilter) ?? null;

    startMasterActionTransition(() => {
      setPendingMasterQuestionId(question.id);

      void fetch(`/api/teacher/question-bank/master-library/${question.id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          local_subject_code: subject?.code ?? question.source_subject_code,
          local_topic_code: topic?.code ?? question.source_topic_code ?? "",
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const message = await readActionError(response);
            window.location.href = buildWorkspaceStatusHref(basePath, filters, page, {
              error: message || "Unable to complete the shared-library action right now.",
            });
            return;
          }

          window.location.href = buildWorkspaceStatusHref(basePath, filters, page, {
            message:
              action === "link"
                ? "Shared question linked into the local bank."
                : "Shared question access request submitted.",
          });
        })
        .catch(() => {
          window.location.href = buildWorkspaceStatusHref(basePath, filters, page, {
            error: "Unable to complete the shared-library action right now.",
          });
        })
        .finally(() => {
          setPendingMasterQuestionId((current) => (current === question.id ? null : current));
        });
    });
  }

  return (
    <div className="questionBankShell">
      <section className="contentCard">
        <div className="sectionHeading">
          <h2>Subscription visibility</h2>
          <span>Licensed package lanes and feature unlocks for this authoring scope</span>
        </div>

        <div className="questionBankChipRow">
          <span className={`statusPill ${activeQuestionBankEntitlements.length ? "statusSuccess" : "statusWarn"}`}>
            {activeQuestionBankEntitlements.length} active package{activeQuestionBankEntitlements.length === 1 ? "" : "s"}
          </span>
          <span className={`statusPill ${activeFeatureEntitlements.length ? "statusSuccess" : "statusDefault"}`}>
            {activeFeatureEntitlements.length} active feature{activeFeatureEntitlements.length === 1 ? "" : "s"}
          </span>
          <span className={`statusPill ${sharedLibraryDisabledMessage ? "statusWarn" : "statusSuccess"}`}>
            {sharedLibraryDisabledMessage ? "Shared library locked" : "Shared library enabled"}
          </span>
        </div>

        {activeQuestionBankEntitlements.length ? (
          <div className="questionBankList">
            {activeQuestionBankEntitlements.slice(0, 4).map((entitlement) => (
              <article className="questionBankCard" key={entitlement.id}>
                <div className="questionBankCardHeader">
                  <div className="questionBankCardCopy">
                    <strong>{entitlement.question_bank_package_name}</strong>
                    <div className="questionBankChipRow">
                      <span className="questionBankMetaChip">{entitlement.question_bank_package_type.replaceAll("_", " ")}</span>
                      <span className="questionBankMetaChip">{entitlement.question_bank_package_access_mode.replaceAll("_", " ")}</span>
                      <span className="questionBankMetaChip">{entitlement.question_bank_package_ownership_type.replaceAll("_", " ")}</span>
                      {entitlement.quota_configured ? (
                        <span className={`questionBankMetaChip ${entitlement.quota_watch_state === "limit_reached" || entitlement.quota_watch_state === "near_limit" ? "statusWarn" : "statusSuccess"}`}>
                          {entitlement.quota_watch_state === "limit_reached"
                            ? "Quota attention"
                            : entitlement.quota_watch_state === "near_limit"
                              ? "Quota watch"
                              : "Quota tracked"}
                        </span>
                      ) : null}
                      {entitlement.subscription_plan_name ? (
                        <span className="questionBankMetaChip">{entitlement.subscription_plan_name}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="questionBankCardFooter">
                  <div className="questionBankCardMetaNote">
                    <span>
                      {entitlement.scope_summary.length
                        ? entitlement.scope_summary.slice(0, 2).join(" · ")
                        : "This package is active, but no readable scope summary was returned."}
                    </span>
                    {entitlement.quota_configured ? (
                      <span>
                        {entitlement.quota_scope_summary?.slice(0, 2).join(" · ") ||
                          `Quota tracking is active for this package. ${entitlement.quota_usage_total ?? 0} linked question actions recorded.`}
                      </span>
                    ) : null}
                    {entitlement.quota_configured && typeof entitlement.quota_remaining_min === "number" ? (
                      <span>Lowest remaining allowance: {entitlement.quota_remaining_min}</span>
                    ) : null}
                    {entitlement.ends_at ? (
                      <span>Valid until {new Date(entitlement.ends_at).toLocaleDateString("en-IN")}</span>
                    ) : (
                      <span>No expiry is currently attached to this entitlement.</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="builderEmptyState">
            <strong>No active package entitlement is visible in this scope</strong>
            <p>Private institute and teacher questions still work, but licensed platform question lanes will stay unavailable until an active package is attached to the institute.</p>
          </div>
        )}

        {activeFeatureEntitlements.length ? (
          <div className="questionBankChipRow">
            {activeFeatureEntitlements.map((entitlement) => (
              <span className="questionBankMetaChip" key={entitlement.id}>
                {entitlement.feature_code}
                {entitlement.source_package_name ? ` · ${entitlement.source_package_name}` : ""}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <h2>Shared platform library</h2>
          <span>{masterLibraryQuestions.length} curated question{masterLibraryQuestions.length === 1 ? "" : "s"} in current lane</span>
        </div>

        {sharedLibraryDisabledMessage ? (
          <p className="feedbackBanner">{sharedLibraryDisabledMessage}</p>
        ) : null}

        {masterLibraryLoadError ? (
          <p className="feedbackBanner feedbackBannerError">{masterLibraryLoadError}</p>
        ) : null}

        {!sharedLibraryDisabledMessage && !masterLibraryLoadError && !masterLibraryQuestions.length ? (
          <div className="builderEmptyState">
            <strong>No shared library questions match this scope</strong>
            <p>Try broadening the subject or topic filters, or publish new platform-owned source questions into the matching package lane.</p>
          </div>
        ) : null}

        {!sharedLibraryDisabledMessage && masterLibraryQuestions.length ? (
          <div className="questionBankList">
            {masterLibraryQuestions.map((question) => {
              const isBusy = isPendingMasterAction && pendingMasterQuestionId === question.id;
              const accessState = question.access_status || (question.has_access ? "entitled" : "not_requested");
              const availabilityState = question.access_availability || "subscription_required";
              const canRequestAccess =
                !canLinkSharedLibrary &&
                question.matching_packages.length > 0 &&
                availabilityState !== "quota_exhausted" &&
                accessState !== "requested" &&
                accessState !== "linked";
              const canLink = canLinkSharedLibrary && question.has_access && accessState !== "linked";

              return (
                <article className="questionBankCard" key={question.id}>
                  <div className="questionBankCardHeader">
                    <div className="questionBankCardCopy">
                      <strong>{question.question_text.replaceAll("\n", " ").trim() || "Untitled shared question"}</strong>
                      <div className="questionBankChipRow">
                        <span className="questionBankMetaChip">{question.source_institute_name}</span>
                        <span className="questionBankMetaChip">{question.source_subject_name}</span>
                        {question.source_topic_name ? (
                          <span className="questionBankMetaChip">{question.source_topic_name}</span>
                        ) : null}
                        <span className="questionBankMetaChip">{question.question_type.replaceAll("_", " ")}</span>
                        <span className="questionBankMetaChip">{question.difficulty_level}</span>
                        <span className={`statusPill ${masterLibraryAccessTone(question)}`}>
                          {masterLibraryAccessLabel(question)}
                        </span>
                        <span className="statusPill statusDemo">{masterLibraryAccessStateLabel(question)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="questionBankCardFooter">
                    <div className="questionBankCardMetaNote">
                      <span>{question.explanation.trim() || "No editorial explanation is visible yet."}</span>
                      <span>{masterLibraryAvailabilityNote(question)}</span>
                      <span>
                        {question.matching_packages.length
                          ? `Matching packages: ${question.matching_packages.map((entry) => entry.name).join(", ")}`
                          : "No matching subscribed package was found for this local scope."}
                      </span>
                      {question.quota_note && question.access_availability !== "quota_exhausted" ? (
                        <span>{question.quota_note}</span>
                      ) : null}
                    </div>

                    <div className="questionBankCardActions">
                      {canRequestAccess ? (
                        <button
                          className="button buttonSecondary"
                          disabled={isBusy}
                          onClick={() => runMasterLibraryAction(question, "request-access")}
                          type="button"
                        >
                          {isBusy ? "Submitting..." : "Request Access"}
                        </button>
                      ) : null}
                      {canLink ? (
                        <button
                          className="button buttonPrimary"
                          disabled={isBusy}
                          onClick={() => runMasterLibraryAction(question, "link")}
                          type="button"
                        >
                          {isBusy ? "Linking..." : "Link to Local Bank"}
                        </button>
                      ) : null}
                      {!canRequestAccess && !canLink ? (
                        <span className="button buttonGhost questionBankButtonDisabled">
                          {masterLibraryActionLabel(question)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="contentCard questionBankFilterSurface">
        <div className="sectionHeading">
          <strong>Find questions faster</strong>
          <span>{visibleQuestions.length} visible · {totalCount} returned by backend filters</span>
        </div>

        <form className="questionBankFilterForm" method="GET">
          <label className="fieldStack questionBankSearchField">
            <span>Search question text</span>
            <input
              defaultValue={filters.search ?? ""}
              name="search"
              placeholder="Search by wording or explanation"
              type="text"
            />
          </label>

          <label className="fieldStack">
            <span>Program</span>
            <select
              name="program"
              onChange={(event) => {
                setProgramFilter(event.target.value);
                setSubjectFilter("");
                setTopicFilter("");
              }}
              value={programFilter}
            >
              <option value="">All programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldStack">
            <span>Subject</span>
            <select
              disabled={!programFilter}
              key={programFilter || "all-programs"}
              name="subject"
              onChange={(event) => {
                setSubjectFilter(event.target.value);
                setTopicFilter("");
              }}
              value={selectedSubjectFilter}
            >
              <option value="">All subjects</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldStack">
            <span>Topic</span>
            <select
              disabled={!selectedSubjectFilter}
              key={selectedSubjectFilter || "all-subjects"}
              name="topic"
              onChange={(event) => setTopicFilter(event.target.value)}
              value={selectedTopicFilter}
            >
              <option value="">All topics</option>
              {topicOptions.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {formatTopicOptionLabel(topic)}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldStack">
            <span>Teacher</span>
            <select defaultValue={filters.teacher ?? ""} name="teacher">
              <option value="">All teachers</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name} ({teacher.employee_code})
                </option>
              ))}
            </select>
          </label>

          <label className="fieldStack">
            <span>Tag</span>
            <select defaultValue={filters.tag ?? ""} name="tag">
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldStack">
            <span>Question type</span>
            <select defaultValue={filters.question_type ?? ""} name="question_type">
              <option value="">All types</option>
              {filteredQuestionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldStack">
            <span>Difficulty</span>
            <select defaultValue={filters.difficulty_level ?? ""} name="difficulty_level">
              <option value="">All difficulty levels</option>
              {difficultyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldStack">
            <span>Sort by</span>
            <select defaultValue={filters.ordering ?? "-created_at"} name="ordering">
              <option value="-created_at">Recently created</option>
              <option value="difficulty_level">Difficulty</option>
              <option value="-usage_count">Usage</option>
              <option value="-wrong_count">Wrong count</option>
              <option value="-skipped_count">Skip count</option>
            </select>
          </label>

          <label className="fieldStack">
            <span>Quality signal</span>
            <select name="quality_signal" value={qualitySignalFilter} onChange={(event) => setQualitySignalFilter(event.target.value)}>
              <option value="">All signals</option>
              <option value="revision_candidate">Revision candidate</option>
              <option value="ambiguous">Ambiguous</option>
              <option value="skip_risk">Skip risk</option>
              <option value="hard">Hard</option>
              <option value="watch">Watch</option>
              <option value="emerging">Emerging</option>
              <option value="healthy">Healthy</option>
            </select>
          </label>

          <label className="fieldStack">
            <span>Revision priority</span>
            <select name="revision_priority" value={revisionPriorityFilter} onChange={(event) => setRevisionPriorityFilter(event.target.value)}>
              <option value="">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="watch">Watch</option>
              <option value="none">None</option>
            </select>
          </label>

          <label className="fieldStack questionBankStatusField">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label className="fieldStack questionBankStatusField">
            <span>Shared library</span>
            <select
              value={sharedLibraryFilter}
              onChange={(event) => setSharedLibraryFilter(event.target.value)}
            >
              <option value="">All source states</option>
              <option value="linked">Linked licensed questions</option>
              <option value="active">Licensed source active</option>
              <option value="inactive">Licensed source paused</option>
              <option value="local-only">Local-only questions</option>
            </select>
          </label>

          <div className="questionBankFilterActions">
            <label className="questionBankToggle">
              <input
                defaultChecked={filters.missing_explanation === "true"}
                name="missing_explanation"
                type="checkbox"
                value="true"
              />
              Missing explanation
            </label>

            <div className="questionBankButtonRow">
              <button className="button buttonPrimary" type="submit">
                Apply Filters
              </button>
              <Link className="button buttonGhost" href={basePath}>
                Reset
              </Link>
            </div>
          </div>
        </form>

        {selectedProgramFamilyProfile ? (
          <div className="builderHintPanel">
            <strong>{selectedProgramFamilyProfile.label} bank lens</strong>
            <p>{selectedProgramFamilyProfile.description}</p>
            <small>{summarizeWorkspaceFamilyScoring(selectedProgramFamilyProfile.scoring_defaults)}</small>
          </div>
        ) : null}

        <div className="builderHintPanel">
          <strong>Mixed-source guidance</strong>
          <p>
            Local questions stay editable inside the institute. Linked licensed copies are visible locally but should be duplicated before editing. Licensed source paused means the old row may still be visible, but new linked reuse should be treated as blocked until the package lane is restored.
          </p>
          <small>
            Use the source-state filters to separate local-only authoring from active licensed reuse and paused licensed follow-up.
          </small>
        </div>

        <div className="workspaceFilterQuickRow">
          <span className="workspaceFilterQuickLabel">Quick filters</span>
          <div className="workspaceFilterQuickChips">
            <Link
              className={`workspaceQuickChip${
                !filters.search &&
                !filters.program &&
                !filters.subject &&
                !filters.topic &&
                !filters.teacher &&
                !filters.tag &&
                !filters.question_type &&
                !filters.difficulty_level &&
                !filters.quality_signal &&
                !filters.revision_priority &&
                filters.ordering === "-created_at" &&
                filters.missing_explanation !== "true"
                  ? " workspaceQuickChipActive"
                  : ""
              }`}
              href={basePath}
            >
              All
            </Link>
            <Link
              className={`workspaceQuickChip${
                filters.missing_explanation === "true" ? " workspaceQuickChipActive" : ""
              }`}
              href={quickFilterHref({ missing_explanation: "true" })}
            >
              Missing Explanation
            </Link>
            <button
              className={`workspaceQuickChip${statusFilter === "draft" ? " workspaceQuickChipActive" : ""}`}
              onClick={() => setStatusFilter("draft")}
              type="button"
            >
              Draft
            </button>
            <button
              className={`workspaceQuickChip${statusFilter === "published" ? " workspaceQuickChipActive" : ""}`}
              onClick={() => setStatusFilter("published")}
              type="button"
            >
              Verified
            </button>
            <button
              className={`workspaceQuickChip${sharedLibraryFilter === "inactive" ? " workspaceQuickChipActive" : ""}`}
              onClick={() => setSharedLibraryFilter("inactive")}
              type="button"
            >
              Licensed Paused
            </button>
            <button
              className={`workspaceQuickChip${sharedLibraryFilter === "active" ? " workspaceQuickChipActive" : ""}`}
              onClick={() => setSharedLibraryFilter("active")}
              type="button"
            >
              Licensed Active
            </button>
            <button
              className={`workspaceQuickChip${sharedLibraryFilter === "linked" ? " workspaceQuickChipActive" : ""}`}
              onClick={() => setSharedLibraryFilter("linked")}
              type="button"
            >
              Linked Licensed
            </button>
            <button
              className={`workspaceQuickChip${sharedLibraryFilter === "local-only" ? " workspaceQuickChipActive" : ""}`}
              onClick={() => setSharedLibraryFilter("local-only")}
              type="button"
            >
              Local Only
            </button>
            <Link
              className={`workspaceQuickChip${
                filters.question_type === "mcq_single" ? " workspaceQuickChipActive" : ""
              }`}
              href={quickFilterHref({ question_type: "mcq_single" })}
            >
              MCQ
            </Link>
            <Link
              className={`workspaceQuickChip${
                filters.question_type === "short_answer" ? " workspaceQuickChipActive" : ""
              }`}
              href={quickFilterHref({ question_type: "short_answer" })}
            >
              Short Answer
            </Link>
            <Link
              className={`workspaceQuickChip${
                filters.difficulty_level === "hard" ? " workspaceQuickChipActive" : ""
              }`}
              href={quickFilterHref({ difficulty_level: "hard" })}
            >
              Hard
            </Link>
            <Link
              className={`workspaceQuickChip${
                filters.revision_priority === "high" ? " workspaceQuickChipActive" : ""
              }`}
              href={quickFilterHref({ revision_priority: "high" })}
            >
              Revision Queue
            </Link>
            <Link
              className={`workspaceQuickChip${
                filters.quality_signal === "skip_risk" ? " workspaceQuickChipActive" : ""
              }`}
              href={quickFilterHref({ quality_signal: "skip_risk" })}
            >
              Skip Risk
            </Link>
            <Link
              className={`workspaceQuickChip${
                filters.quality_signal === "ambiguous" ? " workspaceQuickChipActive" : ""
              }`}
              href={quickFilterHref({ quality_signal: "ambiguous" })}
            >
              Ambiguous
            </Link>
            <Link
              className={`workspaceQuickChip${
                filters.ordering === "-usage_count" ? " workspaceQuickChipActive" : ""
              }`}
              href={quickFilterHref({ ordering: "-usage_count" })}
            >
              Most Used
            </Link>
          </div>
        </div>

        <div className="workspaceFilterChips">
          <span className="statusPill statusDefault">
            Search: {filters.search ? "active" : "all"}
          </span>
          <span className="statusPill statusDefault">
            Teacher: {teachers.find((teacher) => teacher.id === (filters.teacher ?? ""))?.full_name || "all"}
          </span>
          <span className="statusPill statusDefault">
            Type: {filters.question_type || "all"}
          </span>
          <span className="statusPill statusDefault">
            Quality: {filters.quality_signal || "all"}
          </span>
          <span className="statusPill statusDefault">
            Revision: {filters.revision_priority || "all"}
          </span>
          <span className="statusPill statusDefault">
            Difficulty: {filters.difficulty_level || "all"}
          </span>
          <span className="statusPill statusDefault">
            Local status: {statusFilter || "all"}
          </span>
          <span className="statusPill statusDefault">
            Source state: {sharedLibraryFilterLabel(sharedLibraryFilter)}
          </span>
        </div>

        <div className="questionBankInlineControls">
          <div className="questionBankInlineToggles">
            <label className="questionBankToggle">
              <input
                checked={showFavoritesOnly}
                onChange={(event) => setShowFavoritesOnly(event.target.checked)}
                type="checkbox"
              />
              Favorites only
            </label>
            <label className="questionBankToggle">
              <input
                checked={isCompact}
                onChange={(event) => setIsCompact(event.target.checked)}
                type="checkbox"
              />
              Compact view
            </label>
          </div>
          <span className="questionBankInlineHint">
            Local view controls do not change backend filters or pagination.
          </span>
        </div>

        {hasLoadedPreferences && recentTopics.length ? (
          <div className="questionBankRecentTopics">
            <span>Recent topics</span>
            <div className="questionBankTagRow">
              {recentTopics.map((topic) => {
                const href = buildPageHref(
                  1,
                  {
                    ...filters,
                    topic: topic.id,
                  },
                  basePath,
                );

                return (
                  <Link className="questionBankRecentTopicChip" href={href} key={topic.id}>
                    {formatTopicOptionLabel(topic)}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Question inventory</strong>
          <span>
            {visibleQuestions.length} visible
            {visibleQuestions.length !== totalCount ? ` of ${totalCount}` : ""}
            {showFavoritesOnly ? " favorite" : ""} question{visibleQuestions.length === 1 ? "" : "s"}
          </span>
        </div>

        <form action={bulkAction} className="questionBankBulkBar">
          {selectedIdsOnPage.map((id) => (
            <input key={id} name="question_ids" type="hidden" value={id} />
          ))}

          <div className="questionBankBulkMeta">
            <div className="questionBankBulkMetaCopy">
              <strong>Bulk actions</strong>
              <span>
                {selectedIdsOnPage.length === 0
                  ? "Select one or more visible questions to unlock bulk updates."
                  : `${selectedIdsOnPage.length} selected from the current visible list.`}
              </span>
            </div>
            <label className="questionBankSelectAll">
              <input
                checked={allVisibleSelected}
                onChange={toggleVisibleSelection}
                type="checkbox"
              />
              Select visible questions
            </label>
          </div>

          <div className="questionBankBulkWorkspace">
            <div className="questionBankBulkFields">
              <label className="fieldStack">
                <span>Difficulty target</span>
                <select defaultValue="" name="difficulty_level">
                  <option value="">Choose difficulty</option>
                  {difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Topic target</span>
                <select defaultValue="" name="topic">
                  <option value="">Choose topic</option>
                  {topicOptions.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {formatTopicOptionLabel(topic)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Tag target</span>
                <select defaultValue="" name="tag_id">
                  <option value="">Choose tag</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="questionBankBulkControlGroups">
              <div className="questionBankBulkControls">
                <span className="questionBankBulkGroupLabel">Availability</span>
                <div className="questionBankButtonRow">
                  <button className="button buttonSecondary" disabled={!selectedIdsOnPage.length} name="action" type="submit" value="activate">
                    Activate
                  </button>
                  <button className="button buttonGhost" disabled={!selectedIdsOnPage.length} name="action" type="submit" value="deactivate">
                    Deactivate
                  </button>
                </div>
              </div>

              <div className="questionBankBulkControls">
                <span className="questionBankBulkGroupLabel">Classification</span>
                <div className="questionBankButtonRow">
                  <button className="button buttonGhost" disabled={!selectedIdsOnPage.length} name="action" type="submit" value="set_difficulty">
                    Set Difficulty
                  </button>
                  <button className="button buttonGhost" disabled={!selectedIdsOnPage.length} name="action" type="submit" value="set_topic">
                    Change Topic
                  </button>
                </div>
              </div>

              <div className="questionBankBulkControls">
                <span className="questionBankBulkGroupLabel">Tagging</span>
                <div className="questionBankButtonRow">
                  <button className="button buttonGhost" disabled={!selectedIdsOnPage.length} name="action" type="submit" value="attach_tag">
                    Attach Tag
                  </button>
                  <button className="button buttonGhost" disabled={!selectedIdsOnPage.length} name="action" type="submit" value="remove_tag">
                    Remove Tag
                  </button>
                </div>
              </div>

              <div className="questionBankBulkControls questionBankBulkControlsDanger">
                <span className="questionBankBulkGroupLabel">Danger zone</span>
                <div className="questionBankButtonRow">
                  <button className="button buttonPrimary" disabled={!selectedIdsOnPage.length} name="action" type="submit" value="delete">
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {!visibleQuestions.length ? (
          <div className="builderEmptyState">
            <strong>No questions match these filters</strong>
            <p>Broaden the search, adjust the filters, or switch off local favorites and status filters.</p>
          </div>
        ) : (
          <div className="questionBankList">
            {visibleQuestions.map((question) => {
              const programName =
                programs.find((program) => program.id === question.program)?.name ?? null;
              const subjectName =
                subjects.find((subject) => subject.id === question.subject)?.name ?? null;
              const topicName =
                topics.find((topic) => topic.id === question.topic)?.name ?? null;
              const previewText = question.question_text.replaceAll("\n", " ").trim();
              const favorite = favoriteIds.includes(question.id);
              const passageTitle = getPassageTitle(question);

              return (
                <article
                  className={`questionBankCard ${selectedIdsOnPage.includes(question.id) ? "questionBankCardSelected" : ""}`}
                  key={question.id}
                >
                  <div className="questionBankCardHeader">
                    <label className="questionBankCheckbox">
                      <input
                        checked={selectedIdsOnPage.includes(question.id)}
                        onChange={() => toggleSelection(question.id)}
                        type="checkbox"
                      />
                    </label>

                    <div className="questionBankCardCopy">
                      <strong>{previewText || "Untitled question"}</strong>
                      <div className="questionBankChipRow">
                        {programName ? <span className="questionBankMetaChip">{programName}</span> : null}
                        {subjectName ? <span className="questionBankMetaChip">{subjectName}</span> : null}
                        {topicName ? <span className="questionBankMetaChip">{topicName}</span> : null}
                        {passageTitle ? (
                          <span className="questionBankMetaChip">Comprehension: {passageTitle}</span>
                        ) : null}
                        <span className={`statusPill ${questionSourceStateTone(question)}`}>
                          {questionSourceStateLabel(question)}
                        </span>
                        <span className={`statusPill ${questionOwnershipTone(question)}`}>
                          {questionOwnershipLabel(question)}
                        </span>
                        {question.is_shared_library_link ? (
                          <span className={`statusPill ${sharedLibraryAccessTone(question)}`}>
                            {sharedLibraryAccessLabel(question)}
                          </span>
                        ) : null}
                        <span className={`statusPill ${questionEditStateTone(question)}`}>
                          {questionEditStateLabel(question)}
                        </span>
                        <span className="questionBankMetaChip">
                          {questionTypeLabelMap[question.question_type] ?? question.question_type}
                        </span>
                        <span className="questionBankMetaChip">
                          {difficultyLabelMap[question.difficulty_level] ?? question.difficulty_level}
                        </span>
                        <span className={`questionBankQualityPill ${question.has_explanation ? "questionBankQualityPillGood" : "questionBankQualityPillWarn"}`}>
                          {question.has_explanation ? "Has explanation" : "Missing explanation"}
                        </span>
                        <span className={`questionBankQualityPill ${isQualityReady(question) ? "questionBankQualityPillGood" : "questionBankQualityPillWarn"}`}>
                          {isQualityReady(question) ? "Quality ready" : "Needs cleanup"}
                        </span>
                        <span className={`statusPill ${questionQualityTone(question.quality_signal)}`}>
                          {question.quality_signal.replaceAll("_", " ")}
                        </span>
                        <span className={`statusPill ${questionQualityTone(question.quality_signal)}`}>
                          {question.revision_priority} priority
                        </span>
                        {question.attachment_count > 0 ? (
                          <span className="questionBankQualityPill questionBankQualityPillGood">
                            {question.attachment_count} attachment
                            {question.attachment_count === 1 ? "" : "s"}
                          </span>
                        ) : null}
                        <span className="statusPill statusDemo">
                          {getStatus(question)}
                        </span>
                      </div>
                    </div>

                    <button
                      className={`questionBankFavoriteButton ${favorite ? "questionBankFavoriteButtonActive" : ""}`}
                      onClick={() => toggleFavorite(question.id)}
                      type="button"
                    >
                      {favorite ? "★" : "☆"}
                    </button>
                  </div>

                  <div className="questionBankMetrics">
                    <div>
                      <span>Marks</span>
                      <strong>{question.default_marks}</strong>
                    </div>
                    <div>
                      <span>Negative</span>
                      <strong>{question.negative_marks}</strong>
                    </div>
                    <div>
                      <span>Usage</span>
                      <strong>{question.usage_count}x</strong>
                    </div>
                    <div>
                      <span>Wrong</span>
                      <strong>{Math.round(question.wrong_rate)}%</strong>
                    </div>
                    <div>
                      <span>Skip</span>
                      <strong>{Math.round(question.skip_rate)}%</strong>
                    </div>
                  </div>

                  <div className="questionBankCardFooter">
                    <div className="questionBankCardMetaNote">
                      <span>
                        {passageTitle
                          ? `Linked to comprehension set "${passageTitle}"`
                          : "Standalone question"}
                      </span>
                      <span>
                        {question.attachment_count > 0
                          ? `${question.attachment_count} attachment${question.attachment_count === 1 ? "" : "s"} linked`
                          : "No attachments linked"}
                      </span>
                      <span>
                        {question.has_explanation
                          ? "Explanation present"
                          : "Explanation still missing"}
                      </span>
                      <span>
                        Source state: {questionSourceStateLabel(question)} · {questionEditStateLabel(question)}
                      </span>
                      <span>{questionOwnershipNote(question)}</span>
                      <span>
                        {question.quality_note}
                      </span>
                      <span>
                        {question.tag_count > 0
                          ? `${question.tag_count} tag${question.tag_count === 1 ? "" : "s"} attached`
                          : "No tags attached"}
                      </span>
                    </div>

                    <div className="questionBankCardActions">
                      {isReadOnlyLibraryQuestion(question) ? (
                        <span className="questionBankMetaChip">
                          Linked licensed copy · duplicate before editing
                        </span>
                      ) : null}
                      <button
                        className="button buttonPrimary"
                        onClick={() => {
                          setPreviewQuestionId(question.id);
                          void ensureQuestionDetail(question.id);
                        }}
                        type="button"
                      >
                        Preview
                      </button>
                      <Link className="button buttonSecondary" href={getQuestionEditorHref(question, basePath)}>
                        {isReadOnlyLibraryQuestion(question) ? "Duplicate to Edit" : "Edit"}
                      </Link>
                      <Link className="button buttonGhost" href={`${basePath}/new?duplicate=${question.id}`}>
                        Duplicate
                      </Link>
                    </div>
                  </div>

                  {!isCompact ? (
                    <details className="questionBankDetails">
                      <summary
                        onClick={() => {
                          if (!questionDetailsById[question.id] && !isLoadingQuestionDetail(question.id)) {
                            void ensureQuestionDetail(question.id);
                          }
                        }}
                      >
                        Preview details
                      </summary>
                      <div className="questionBankDetailsBody">
                        {isLoadingQuestionDetail(question.id) ? (
                          <p className="emptyText">Loading full question details...</p>
                        ) : questionDetailsById[question.id] ? (
                          <>
                            <div className="questionBankRichBlock">
                              <strong>Explanation</strong>
                              <p>
                                {questionDetailsById[question.id].explanation.trim() || "No teacher explanation added yet."}
                              </p>
                            </div>

                            <div className="questionPreviewSection">
                              {renderQuestionResponsePreview(questionDetailsById[question.id])}
                            </div>

                            {renderDistractorAnalytics(questionDetailsById[question.id])}

                            {questionDetailsById[question.id].attachments.length ? (
                              <div className="questionBankAttachmentNotice">
                                {questionDetailsById[question.id].attachments.length} attachment
                                {questionDetailsById[question.id].attachments.length === 1 ? "" : "s"} linked
                              </div>
                            ) : null}
                          </>
                        ) : detailErrors[question.id] ? (
                          <p className="emptyText">{detailErrors[question.id]}</p>
                        ) : (
                          <p className="emptyText">Open this panel to load full options, tags, and attachment details.</p>
                        )}
                      </div>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <div className="questionBankPagination">
          <span>Page {page}</span>
          <div className="questionBankButtonRow">
            {hasPreviousPage ? (
              <Link className="button buttonGhost" href={buildPageHref(page - 1, filters, basePath)}>
                Previous
              </Link>
            ) : (
              <span className="button buttonGhost questionBankButtonDisabled">Previous</span>
            )}
            {hasNextPage ? (
              <Link className="button buttonSecondary" href={buildPageHref(page + 1, filters, basePath)}>
                Next
              </Link>
            ) : (
              <span className="button buttonSecondary questionBankButtonDisabled">Next</span>
            )}
          </div>
        </div>
      </section>

      {portalTarget && previewQuestion
        ? createPortal(
            <div
              className={`questionPreviewOverlay ${previewThemeClass}`.trim()}
              onClick={() => setPreviewQuestionId(null)}
              role="presentation"
            >
              <div
                className={`questionPreviewDialog ${previewThemeClass}`.trim()}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="question-preview-title"
              >
                <div className="questionPreviewHeader">
                  <div>
                    <span className="eyebrow">Question Preview</span>
                    <h2 id="question-preview-title">
                      {previewQuestion.question_text.replaceAll("\n", " ").trim() || "Untitled question"}
                    </h2>
                  </div>
                  <button
                    className="button buttonGhost"
                    onClick={() => setPreviewQuestionId(null)}
                    type="button"
                  >
                    Close
                  </button>
                </div>

                <div className="questionPreviewBody">
                  <div className="questionBankChipRow">
                    {getPassageTitle(previewQuestion) ? (
                      <span className="questionBankMetaChip">
                        Comprehension: {getPassageTitle(previewQuestion)}
                      </span>
                    ) : null}
                    <span className={`statusPill ${questionSourceStateTone(previewQuestion)}`}>
                      {questionSourceStateLabel(previewQuestion)}
                    </span>
                    <span className={`statusPill ${questionOwnershipTone(previewQuestion)}`}>
                      {questionOwnershipLabel(previewQuestion)}
                    </span>
                    {previewQuestion.is_shared_library_link ? (
                      <span className={`statusPill ${sharedLibraryAccessTone(previewQuestion)}`}>
                        {sharedLibraryAccessLabel(previewQuestion)}
                      </span>
                    ) : null}
                    <span className={`statusPill ${questionEditStateTone(previewQuestion)}`}>
                      {questionEditStateLabel(previewQuestion)}
                    </span>
                    <span className="questionBankMetaChip">
                      {questionTypeLabelMap[previewQuestion.question_type] ?? previewQuestion.question_type}
                    </span>
                    <span className="questionBankMetaChip">
                      {difficultyLabelMap[previewQuestion.difficulty_level] ?? previewQuestion.difficulty_level}
                    </span>
                    <span className="questionBankMetaChip">
                      {previewQuestion.default_marks} marks
                    </span>
                    <span className="questionBankMetaChip">
                      {previewQuestion.negative_marks} negative
                    </span>
                    <span className="statusPill statusDemo">{getStatus(previewQuestion)}</span>
                  </div>

                  {"tag_maps" in previewQuestion && previewQuestion.tag_maps.length ? (
                    <div className="questionBankTagRow">
                      {previewQuestion.tag_maps.map((tagMap) => (
                        <span className="questionBankTagChip" key={tagMap.id}>
                          {tagMap.tag_detail.name}
                        </span>
                      ))}
                    </div>
                  ) : "tag_count" in previewQuestion && previewQuestion.tag_count > 0 ? (
                    <div className="questionBankTagRow">
                      <span className="questionBankTagChip">
                        {previewQuestion.tag_count} tag{previewQuestion.tag_count === 1 ? "" : "s"} attached
                      </span>
                    </div>
                  ) : null}

                  <section className="questionPreviewSection">
                    <strong>Ownership and access</strong>
                    <p>{questionOwnershipNote(previewQuestion)}</p>
                    <p>
                      Source state: {questionSourceStateLabel(previewQuestion)} · Edit posture: {questionEditStateLabel(previewQuestion)}
                    </p>
                  </section>

                  <section className="questionPreviewSection">
                    <strong>Question text</strong>
                    <p>{previewQuestion.question_text.trim() || "No question text was provided."}</p>
                  </section>

                  <section className="questionPreviewSection">
                    <strong>Explanation</strong>
                    <p>
                      {previewQuestion.explanation.trim() || "No teacher explanation has been added yet."}
                    </p>
                  </section>

                  {"options" in previewQuestion ? (
                    <>
                      <section className="questionPreviewSection">
                        {renderQuestionResponsePreview(previewQuestion)}
                      </section>
                      {renderDistractorAnalytics(previewQuestion)}
                    </>
                  ) : isLoadingQuestionDetail(previewQuestion.id) ? (
                    <section className="questionPreviewSection">
                      <strong>Response details</strong>
                      <p className="emptyText">Loading full question details...</p>
                    </section>
                  ) : detailErrors[previewQuestion.id] ? (
                    <section className="questionPreviewSection">
                      <strong>Response details</strong>
                      <p className="emptyText">{detailErrors[previewQuestion.id]}</p>
                    </section>
                  ) : null}

                  {"attachments" in previewQuestion && previewQuestion.attachments.length ? (
                    <section className="questionPreviewSection">
                      <strong>Attachments</strong>
                      <div className="questionPreviewAttachmentGrid">
                        {previewQuestion.attachments.map((attachment) => (
                          <article className="questionPreviewAttachmentCard" key={attachment.id}>
                            <div className="questionPreviewAttachmentCopy">
                              <strong>{attachment.title || "Attachment"}</strong>
                              <div className="questionBankChipRow">
                                <span className="questionBankMetaChip">
                                  {attachmentTypeLabelMap[attachment.attachment_type] ?? attachment.attachment_type}
                                </span>
                                {attachment.is_inline ? (
                                  <span className="questionBankTagChip">Inline enabled</span>
                                ) : null}
                              </div>
                              {renderAttachmentPreview(attachment)}
                              {attachment.alt_text ? <p>{attachment.alt_text}</p> : null}
                              <a
                                className="button buttonGhost"
                                href={attachment.file_url || attachment.file}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Open file
                              </a>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : "attachments" in previewQuestion ? null : isLoadingQuestionDetail(previewQuestion.id) ? (
                    <section className="questionPreviewSection">
                      <strong>Attachments</strong>
                      <p className="emptyText">Loading attachment details...</p>
                    </section>
                  ) : null}
                </div>

                <div className="questionPreviewFooter">
                  <button
                    className="button buttonGhost"
                    onClick={() => {
                      navigator.clipboard.writeText(previewQuestion.question_text).catch(() => undefined);
                    }}
                    type="button"
                  >
                    Copy Question Text
                  </button>
                  <Link className="button buttonPrimary" href={getQuestionEditorHref(previewQuestion, basePath)}>
                    {isReadOnlyLibraryQuestion(previewQuestion) ? "Open as Duplicate" : "Open in Editor"}
                  </Link>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}
