"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatTopicOptionLabel, sortTopicOptions } from "@/lib/academics/topic-options";
import { buildQuestionTypePresentationProfile } from "@/lib/assessment/question-type-presentation";
import type {
  LookupProgram,
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
  filters: Record<string, string>,
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
  const [isCompact, setIsCompact] = useState(false);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const topicInventory = loadedTopicInventory ?? topics;

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

  const subjectOptions = useMemo(() => {
    if (!programFilter) {
      return subjects;
    }

    return subjects.filter((subject) => subject.program === programFilter);
  }, [programFilter, subjects]);

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

      if (!statusFilter) {
        return true;
      }

      return getStatus(question) === statusFilter;
    });
  }, [favoriteIds, questions, showFavoritesOnly, statusFilter]);

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

  return (
    <div className="questionBankShell">
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
              {questionTypeOptions.map((option) => (
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
            Local view controls do not change backend filters.
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
                        {question.quality_note}
                      </span>
                      <span>
                        {question.tag_count > 0
                          ? `${question.tag_count} tag${question.tag_count === 1 ? "" : "s"} attached`
                          : "No tags attached"}
                      </span>
                    </div>

                    <div className="questionBankCardActions">
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
