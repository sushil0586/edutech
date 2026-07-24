import Link from "next/link";
import { cookies } from "next/headers";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentPracticeRecommendationReport, type StudentPracticeRecommendationRow } from "@/components/ui/student-practice-recommendation-report";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  fetchStudentAttempts,
  fetchStudentAvailableExams,
  fetchStudentInsightSummary,
  getStudentApiState,
} from "@/lib/api/student";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import {
  percentageLabel,
  signedPercentageLabel,
  studentDateTimeLabel,
  titleCaseState,
  trendDirectionLabel,
} from "@/lib/student/formatters";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentExamsBySubject,
  filterStudentRecordsBySource,
  filterStudentSummaryBySource,
  filterStudentSummaryBySubject,
  getExamSubjectDisplayLabel,
  getExamSubjectNames,
  getStudentSourceOptions,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  selectedStudentSourceLabel,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";
import type {
  StudentAttemptListItem,
  StudentAvailableExam,
} from "@/features/dashboard/types";
import { buildFilterHref, formatFilterValue } from "@/lib/workspace/filter-utils";
import { resolvePracticeFocusRecommendation } from "@/lib/student/practice";

type PracticeAvailabilityFilter =
  | "all"
  | "ready"
  | "resume"
  | "review"
  | "upcoming"
  | "locked";
type PracticeSortOption = "recommended" | "shortest" | "longest" | "title";
type PracticeGroupOption = "none" | "availability" | "subject" | "access";
const PRACTICE_PAGE_SIZE_VALUES = [6, 12, 18] as const;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isPracticeAttemptInProgress(status: string | null | undefined) {
  return status === "in_progress";
}

function hasPracticeAttemptsRemaining(exam: StudentAvailableExam) {
  return (
    exam.attempt_policy === "unlimited_practice" || exam.remaining_attempts > 0
  );
}

function latestAttemptForExam(
  attempts: StudentAttemptListItem[],
  examId: string,
) {
  return (
    attempts
      .filter((attempt) => attempt.exam === examId)
      .sort(
        (left, right) =>
          new Date(right.started_at || right.created_at).getTime() -
          new Date(left.started_at || left.created_at).getTime(),
      )[0] ?? null
  );
}

function resolvePracticeUiState(
  exam: StudentAvailableExam,
  latestAttemptId: string | null,
) {
  const activeAttemptId = isPracticeAttemptInProgress(exam.active_attempt?.status)
    ? exam.active_attempt?.id ?? null
    : null;
  const canResume = Boolean(activeAttemptId) && exam.can_resume;
  const canStart =
    exam.can_start &&
    hasPracticeAttemptsRemaining(exam) &&
    !canResume;
  const hasAttemptHistory = Boolean(latestAttemptId);

  return {
    activeAttemptId,
    canResume,
    canStart,
    hasAttemptHistory,
  };
}

function practiceActionLabel(args: {
  canResume: boolean;
  canStart: boolean;
  hasAttemptHistory: boolean;
  reviewAvailable: boolean;
}) {
  if (args.canResume) return "Resume Practice";
  if (args.canStart) return "Start Practice";
  if (args.reviewAvailable && args.hasAttemptHistory) return "Review Practice";
  if (args.hasAttemptHistory) return "Open Summary";
  return "View Details";
}

function compactPracticeDateTime(value: string | null) {
  if (!value) return "Ready now";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function practiceAvailabilityValue(exam: StudentAvailableExam) {
  if (exam.availability_state === "available_now") return "Ready now";
  if (exam.availability_state === "completed") return "Completed";
  if (exam.availability_state === "missed") return "Missed";
  if (exam.availability_state === "locked") return "Locked";
  if (exam.start_at) return compactPracticeDateTime(exam.start_at);
  return titleCaseState(exam.availability_state);
}

function practiceSupportNote(exam: StudentAvailableExam, uiState: ReturnType<typeof resolvePracticeUiState>) {
  if (uiState.canResume) {
    return "Continue your latest in-progress practice attempt.";
  }
  if (uiState.canStart) {
    return exam.attempt_policy === "unlimited_practice"
      ? "Start another focused run whenever you are ready."
      : "Start now for a fresh practice run.";
  }
  if (exam.review_available && uiState.hasAttemptHistory) {
    return "Open the latest attempt while feedback is still fresh.";
  }
  if (uiState.hasAttemptHistory) {
    return "Open the latest summary to check the most recent outcome.";
  }
  if (exam.availability_state === "upcoming") {
    return "Check back when the practice window opens.";
  }
  if (exam.availability_state === "missed") {
    return "This practice window has passed. Open details to review what is still available.";
  }
  return "Open details to review availability and next steps.";
}

function practiceActionHref(args: {
  examId: string;
  canResume: boolean;
  activeAttemptId: string | null;
  latestAttemptId: string | null;
  reviewAvailable: boolean;
}) {
  if (args.canResume && args.activeAttemptId) {
    return `/app/attempts/${args.activeAttemptId}`;
  }
  if (args.reviewAvailable && args.latestAttemptId) {
    return `/app/attempts/${args.latestAttemptId}/review`;
  }
  if (args.latestAttemptId) {
    return `/app/attempts/${args.latestAttemptId}/summary`;
  }
  return `/app/exams/${args.examId}`;
}

function practiceGuidance(exam: {
  can_resume: boolean;
  can_start: boolean;
  review_available: boolean;
  availability_state: string;
  remaining_attempts: number;
  attempt_policy: string;
  economy_access: {
    is_locked: boolean;
    can_unlock_with_stars: boolean;
    star_cost: number;
    lock_reason_message: string;
  };
}) {
  if (exam.can_resume) {
    return "A live practice attempt is already in progress.";
  }
  if (exam.economy_access.is_locked && exam.economy_access.can_unlock_with_stars) {
    return `${exam.economy_access.star_cost} stars are required before this practice set can start.`;
  }
  if (exam.economy_access.is_locked) {
    return (
      exam.economy_access.lock_reason_message ||
      "This practice set is currently locked."
    );
  }
  if (exam.can_start) {
    return exam.attempt_policy === "unlimited_practice"
      ? "This practice set is ready now and supports repeat work."
      : "This practice set is ready now for a fresh attempt.";
  }
  if (exam.review_available) {
    return "Your latest practice run is complete and feedback is ready.";
  }
  if (exam.remaining_attempts === 0) {
    return "All attempts for this practice set have been used.";
  }
  if (exam.availability_state === "upcoming") {
    return "This practice set is assigned, but not open yet.";
  }
  if (exam.availability_state === "missed") {
    return "This practice window has passed.";
  }
  return "Open the detail page to review availability and the next action.";
}

function compactPracticeHeadline(args: {
  canResume: boolean;
  canStart: boolean;
  hasAttemptHistory: boolean;
  reviewAvailable: boolean;
}) {
  if (args.canResume) return "Resume available";
  if (args.canStart) return "Ready to start";
  if (args.reviewAvailable && args.hasAttemptHistory) return "Review available";
  if (args.hasAttemptHistory) return "Summary available";
  return "View details";
}

function resolvePracticeAvailabilityFilter(value?: string): PracticeAvailabilityFilter {
  switch (value) {
    case "ready":
    case "resume":
    case "review":
    case "upcoming":
    case "locked":
      return value;
    default:
      return "all";
  }
}

function resolvePracticeSortOption(value?: string): PracticeSortOption {
  switch (value) {
    case "shortest":
    case "longest":
    case "title":
      return value;
    default:
      return "recommended";
  }
}

function resolvePracticeGroupOption(value?: string): PracticeGroupOption {
  switch (value) {
    case "availability":
    case "subject":
    case "access":
      return value;
    default:
      return "none";
  }
}

function applyPracticeAvailabilityFilter(
  exams: StudentAvailableExam[],
  filter: PracticeAvailabilityFilter,
) {
  switch (filter) {
    case "ready":
      return exams.filter((exam) => exam.can_start && !exam.can_resume);
    case "resume":
      return exams.filter((exam) => exam.can_resume);
    case "review":
      return exams.filter((exam) => exam.review_available);
    case "upcoming":
      return exams.filter((exam) => exam.availability_state === "upcoming");
    case "locked":
      return exams.filter(
        (exam) => exam.economy_access.is_locked || exam.availability_state === "locked",
      );
    default:
      return exams;
  }
}

function sortPracticeExams(exams: StudentAvailableExam[], sortBy: PracticeSortOption) {
  const sortable = [...exams];
  const recommendedRank = (exam: StudentAvailableExam) => {
    if (exam.can_resume) return 0;
    if (exam.can_start) return 1;
    if (exam.review_available) return 2;
    if (exam.availability_state === "upcoming") return 3;
    return 4;
  };

  sortable.sort((left, right) => {
    switch (sortBy) {
      case "shortest":
        return left.duration_minutes - right.duration_minutes;
      case "longest":
        return right.duration_minutes - left.duration_minutes;
      case "title":
        return left.title.localeCompare(right.title);
      case "recommended":
      default: {
        const rankDelta = recommendedRank(left) - recommendedRank(right);
        if (rankDelta !== 0) return rankDelta;
        return left.title.localeCompare(right.title);
      }
    }
  });

  return sortable;
}

function buildPracticeFilterHref(args: {
  availability?: PracticeAvailabilityFilter;
  sort?: PracticeSortOption;
  group?: PracticeGroupOption;
  page?: number;
  pageSize?: number;
  subject?: string;
  topic?: string;
  source?: string;
  teacher?: string;
}) {
  return buildFilterHref("/app/practice", [
    ["subject", args.subject],
    ["topic", args.topic],
    ["source", args.source],
    ["teacher", args.teacher],
    ["practice_filter", args.availability, "all"],
    ["practice_sort", args.sort, "recommended"],
    ["practice_group", args.group, "none"],
    ["practice_page", args.page ? String(args.page) : undefined, "1"],
    ["practice_page_size", args.pageSize ? String(args.pageSize) : undefined, "12"],
  ]);
}

async function loadPracticeWorkspace() {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      exams: [],
      attempts: [],
      summary: null,
    };
  }

  try {
    const [summary, exams, attempts] = await Promise.all([
      fetchStudentInsightSummary(),
      fetchStudentAvailableExams(),
      fetchStudentAttempts(),
    ]);

    return {
      source: "live" as const,
      exams,
      attempts,
      summary,
    };
  } catch {
    return {
      source: "error" as const,
      exams: [],
      attempts: [],
      summary: null,
    };
  }
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    subject?: string;
    topic?: string;
    source?: string;
    teacher?: string;
    practice_filter?: string;
    practice_sort?: string;
    practice_group?: string;
    practice_page?: string;
    practice_page_size?: string;
  }>;
}) {
  const {
    error,
    subject,
    topic,
    source: sourceParam,
    teacher: teacherParam,
    practice_filter,
    practice_sort,
    practice_group,
    practice_page,
    practice_page_size,
  } = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const requestedSource = resolveSelectedStudentSource(sourceParam ?? ALL_SOURCES_CONTEXT);
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSubjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "Overall";
  const focusSubject = subject
    ? decodeURIComponent(subject)
    : selectedSubject === ALL_SUBJECTS_CONTEXT
      ? ""
      : selectedSubject;
  const focusTopic = topic ? decodeURIComponent(topic) : "";
  const { source, exams, attempts, summary } = await loadPracticeWorkspace();
  const { teacherOptions } = getStudentSourceOptions([
    ...exams,
    ...attempts,
    ...(summary?.source_breakdown ?? []),
    ...(summary?.recent_exams ?? []),
  ]);
  const selectedSource =
    sourceParam !== undefined
      ? requestedSource
      : resolveSelectedStudentSource(
          cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
        );
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    teacherParam ?? cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ?? null,
  );
  const scopedSourceParam =
    selectedSource === ALL_SOURCES_CONTEXT ? undefined : selectedSource;
  const scopedSummary = summary
    ? filterStudentSummaryBySubject(
        filterStudentSummaryBySource(summary, selectedSource, selectedTeacherId),
        selectedSubject,
      )
    : null;
  const availabilityFilter = resolvePracticeAvailabilityFilter(practice_filter);
  const sortOption = resolvePracticeSortOption(practice_sort);
  const groupOption = resolvePracticeGroupOption(practice_group);

  const practiceExams = filterStudentExamsBySubject(
    filterStudentRecordsBySource(
      exams.filter((exam) => exam.exam_type === "practice"),
      selectedSource,
      selectedTeacherId,
    ),
    selectedSubject,
  ).sort((left, right) => {
    const leftPriority = focusSubject && getExamSubjectNames(left).includes(focusSubject) ? 0 : 1;
    const rightPriority = focusSubject && getExamSubjectNames(right).includes(focusSubject) ? 0 : 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    if (left.can_resume !== right.can_resume) return left.can_resume ? -1 : 1;
    if (left.can_start !== right.can_start) return left.can_start ? -1 : 1;
    return left.title.localeCompare(right.title);
  });
  const filteredPracticeExams = sortPracticeExams(
    applyPracticeAvailabilityFilter(practiceExams, availabilityFilter),
    sortOption,
  );
  const pageSizeCandidate = parsePositiveInt(practice_page_size, 12);
  const pageSize = PRACTICE_PAGE_SIZE_VALUES.includes(
    pageSizeCandidate as (typeof PRACTICE_PAGE_SIZE_VALUES)[number],
  )
    ? pageSizeCandidate
    : 12;
  const totalPracticePages = Math.max(1, Math.ceil(filteredPracticeExams.length / pageSize));
  const currentPage = Math.min(parsePositiveInt(practice_page, 1), totalPracticePages);
  const pagedPracticeExams = filteredPracticeExams.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const showingStart = filteredPracticeExams.length ? (currentPage - 1) * pageSize + 1 : 0;
  const showingEnd = Math.min(currentPage * pageSize, filteredPracticeExams.length);

  const focusedWeakTopic = scopedSummary?.weak_topics.find(
    (weakTopic) =>
      weakTopic.topic_name === focusTopic && weakTopic.subject_name === focusSubject,
  );
  const focusedTopicLabel = focusedWeakTopic?.topic_name ?? focusTopic ?? "General revision";
  const practiceFocus = resolvePracticeFocusRecommendation({
    exams: practiceExams,
    subjectName: focusSubject || focusedWeakTopic?.subject_name || null,
    topicName: focusTopic || focusedWeakTopic?.topic_name || null,
  });
  const readyNowCount = filteredPracticeExams.filter(
    (exam) => exam.can_start && !exam.can_resume,
  ).length;
  const resumeCount = filteredPracticeExams.filter((exam) => exam.can_resume).length;
  const reviewReadyCount = filteredPracticeExams.filter((exam) => exam.review_available).length;
  const practiceReportRows: StudentPracticeRecommendationRow[] = pagedPracticeExams.map((exam) => {
    const latestAttemptId = latestAttemptForExam(attempts, exam.id)?.id ?? null;
    const examUiState = resolvePracticeUiState(exam, latestAttemptId);
    const accessLabel = exam.economy_access.requires_unlock
      ? exam.economy_access.is_unlocked
        ? "Unlocked"
        : exam.economy_access.can_unlock_with_stars
          ? `${exam.economy_access.star_cost} stars`
          : "Restricted"
      : "Free";
    const toneClass =
      exam.availability_state === "available_now"
        ? "statusLive"
        : exam.availability_state === "locked" || exam.availability_state === "upcoming"
          ? "statusWarning"
          : exam.availability_state === "missed"
            ? "statusDanger"
            : "statusDemo";

    return {
      id: exam.id,
      title: exam.title,
      code: exam.code,
      subjectLabel: getExamSubjectDisplayLabel(exam) || "General",
      recommendationReason: compactPracticeHeadline({
        canResume: examUiState.canResume,
        canStart: examUiState.canStart,
        hasAttemptHistory: examUiState.hasAttemptHistory,
        reviewAvailable: exam.review_available,
      }),
      durationLabel: `${exam.duration_minutes}m`,
      availabilityLabel: practiceAvailabilityValue(exam),
      accessLabel,
      actionLabel: practiceActionLabel({
        canResume: examUiState.canResume,
        canStart: examUiState.canStart,
        hasAttemptHistory: examUiState.hasAttemptHistory,
        reviewAvailable: exam.review_available,
      }),
      toneClass,
      sourceLabel: exam.security_policy.student_label || practiceFocus.helper,
      supportNote: practiceSupportNote(exam, examUiState),
      guidance: practiceGuidance({
        ...exam,
        can_resume: examUiState.canResume,
        can_start: examUiState.canStart,
      }),
      primaryHref: practiceActionHref({
        examId: exam.id,
        canResume: examUiState.canResume,
        activeAttemptId: examUiState.activeAttemptId,
        latestAttemptId,
        reviewAvailable: exam.review_available,
      }),
      detailHref: `/app/exams/${exam.id}`,
      weakAreasHref: buildFilterHref("/app/weak-areas", [
        ["subject", focusSubject || undefined],
        ["topic", focusTopic || undefined],
        ["source", scopedSourceParam],
        ["teacher", selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined],
      ]),
      resultsHref: buildFilterHref("/app/results", [
        ["subject", focusSubject || undefined],
        ["source", scopedSourceParam],
        ["teacher", selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined],
      ]),
    };
  });

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerPracticePage">
      <StudentPageHeader
        title={
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "Practice"
            : `${selectedSubjectLabel} Practice`
        }
        contextLabel={
          [
            selectedSource === ALL_SOURCES_CONTEXT
              ? null
              : `Source view · ${selectedStudentSourceLabel(selectedSource)}`,
            selectedSubject === ALL_SUBJECTS_CONTEXT
              ? null
              : `Subject view · ${selectedSubjectLabel}`,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        description={
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "Focused revision, repeat work, and quick feedback live here."
            : `Focused revision and repeat work for ${selectedSubjectLabel} live here.`
        }
        statusLabel={
          source === "live"
            ? `${filteredPracticeExams.length} practice sets ready`
            : source === "unconfigured"
              ? "Sign in required"
              : "Unable to load practice"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {error ? (
        <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p>
      ) : null}

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Practice is not available yet"
              : "Practice workspace could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Sign in with your student account to load your practice sets."
              : "We couldn't load your practice workspace right now. Please try again shortly."
          }
          bullets={
            source === "unconfigured"
              ? ["Student sign-in", "Practice sets"]
              : ["Connection check", "Practice availability"]
          }
          ctaHref="/app/exams"
          ctaLabel="Open Exams"
          statusLabel={
            source === "unconfigured"
              ? "Sign in to continue"
              : "Try again soon"
          }
        />
      ) : practiceExams.length === 0 ? (
        <StudentStatePanel
          eyebrow="No practice sets yet"
          title="Your practice workspace is empty right now"
          description="No practice sets are available for this student right now."
          ctaHref="/app/weak-areas"
          ctaLabel="Open Weak Areas"
          statusLabel="Waiting for practice content"
        />
      ) : (
        <>
          <section className="contentCard studentWorkspaceFiltersCard studentAttemptsFiltersCard">
            <form className="studentWorkspaceFiltersForm" method="GET">
              {focusSubject ? <input name="subject" type="hidden" value={focusSubject} /> : null}
              {focusTopic ? <input name="topic" type="hidden" value={focusTopic} /> : null}
              <label className="studentWorkspaceFilterField">
                <span>Availability</span>
                <select defaultValue={availabilityFilter} name="practice_filter">
                  <option value="all">All practice sets</option>
                  <option value="ready">Ready now</option>
                  <option value="resume">Resume in-progress</option>
                  <option value="review">Review ready</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="locked">Locked</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Sort by</span>
                <select defaultValue={sortOption} name="practice_sort">
                  <option value="recommended">Recommended order</option>
                  <option value="shortest">Shortest first</option>
                  <option value="longest">Longest first</option>
                  <option value="title">Title A-Z</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Group by</span>
                <select defaultValue={groupOption} name="practice_group">
                  <option value="none">No grouping</option>
                  <option value="availability">Availability state</option>
                  <option value="subject">Subject</option>
                  <option value="access">Access type</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Page size</span>
                <select defaultValue={String(pageSize)} name="practice_page_size">
                  {PRACTICE_PAGE_SIZE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value} per page
                    </option>
                  ))}
                </select>
              </label>
              <div className="studentWorkspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
                </button>
                <Link
                  className="button buttonSecondary"
                  href={buildPracticeFilterHref({
                    subject: focusSubject || undefined,
                    topic: focusTopic || undefined,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="studentWorkspaceFilterQuickRow">
              <span className="studentWorkspaceFilterQuickLabel">Quick filters</span>
              <div className="studentWorkspaceFilterQuickChips">
                {[
                  { label: "All", href: buildPracticeFilterHref({ pageSize, subject: focusSubject || undefined, topic: focusTopic || undefined, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: availabilityFilter === "all" && sortOption === "recommended" && groupOption === "none" },
                  { label: "Ready Now", href: buildPracticeFilterHref({ availability: "ready", sort: sortOption, group: groupOption, pageSize, subject: focusSubject || undefined, topic: focusTopic || undefined, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: availabilityFilter === "ready" },
                  { label: "Resume", href: buildPracticeFilterHref({ availability: "resume", sort: sortOption, group: groupOption, pageSize, subject: focusSubject || undefined, topic: focusTopic || undefined, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: availabilityFilter === "resume" },
                  { label: "Review Ready", href: buildPracticeFilterHref({ availability: "review", sort: sortOption, group: groupOption, pageSize, subject: focusSubject || undefined, topic: focusTopic || undefined, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: availabilityFilter === "review" },
                  { label: "Locked", href: buildPracticeFilterHref({ availability: "locked", sort: sortOption, group: groupOption, pageSize, subject: focusSubject || undefined, topic: focusTopic || undefined, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: availabilityFilter === "locked" },
                  { label: "Shortest", href: buildPracticeFilterHref({ availability: availabilityFilter, sort: "shortest", group: groupOption, pageSize, subject: focusSubject || undefined, topic: focusTopic || undefined, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: sortOption === "shortest" },
                  { label: "Group by Subject", href: buildPracticeFilterHref({ availability: availabilityFilter, sort: sortOption, group: "subject", pageSize, subject: focusSubject || undefined, topic: focusTopic || undefined, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: groupOption === "subject" },
                ].map((chip) => (
                  <Link
                    key={chip.label}
                    className={`studentWorkspaceQuickChip${
                      chip.active ? " studentWorkspaceQuickChipActive" : ""
                    }`}
                    href={chip.href}
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
            <FilterSummaryPills
              className="studentWorkspaceFilterChips"
              items={[
                { label: "Availability", value: formatFilterValue(availabilityFilter) },
                { label: "Sort", value: formatFilterValue(sortOption) },
                { label: "Group", value: formatFilterValue(groupOption) },
                { label: "Page size", value: pageSize !== 12 ? String(pageSize) : null },
              ]}
            />
          </section>

          {filteredPracticeExams.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching practice sets"
              title="No practice sets match these controls"
              description="Broaden the filters or reset the controls to return to the full practice list."
              ctaHref={buildPracticeFilterHref({
                subject: focusSubject || undefined,
                topic: focusTopic || undefined,
                source: scopedSourceParam,
                teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
              })}
              ctaLabel="Reset practice filters"
              statusLabel="Filter returned zero practice sets"
            />
          ) : null}

          {filteredPracticeExams.length > 0 ? (
            <>
          <StudentKpiGrid
            className="resultsSummaryGrid studentAttemptsKpiGrid"
            items={[
              {
                label: "Practice Sets",
                value: filteredPracticeExams.length,
                note: "Visible in the current scope",
                tone: "primary",
              },
              {
                label: "Ready Now",
                value: readyNowCount,
                note: `${resumeCount} resumable`,
              },
              {
                label: "Review Ready",
                value: reviewReadyCount,
                note: focusedTopicLabel || "General revision",
              },
              {
                label: "Trend Signal",
                value: scopedSummary
                  ? trendDirectionLabel(scopedSummary.improvement_trend.direction)
                  : "Pending",
                note: scopedSummary
                  ? `${signedPercentageLabel(scopedSummary.improvement_trend.change_percentage)} across recent scored attempts`
                  : "Insight summary unavailable",
              },
            ]}
          />

          <section className="studentAttemptsQuickBar">
            {[
              {
                label: "All",
                count: filteredPracticeExams.length,
                href: buildPracticeFilterHref({
                  subject: focusSubject || undefined,
                  topic: focusTopic || undefined,
                  source: scopedSourceParam,
                  teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                }),
                active: availabilityFilter === "all",
              },
              {
                label: "Ready Now",
                count: readyNowCount,
                href: buildPracticeFilterHref({
                  availability: "ready",
                  sort: sortOption,
                  group: groupOption,
                  subject: focusSubject || undefined,
                  topic: focusTopic || undefined,
                  source: scopedSourceParam,
                  teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                }),
                active: availabilityFilter === "ready",
              },
              {
                label: "Resume",
                count: resumeCount,
                href: buildPracticeFilterHref({
                  availability: "resume",
                  sort: sortOption,
                  group: groupOption,
                  subject: focusSubject || undefined,
                  topic: focusTopic || undefined,
                  source: scopedSourceParam,
                  teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                }),
                active: availabilityFilter === "resume",
              },
              {
                label: "Review Ready",
                count: reviewReadyCount,
                href: buildPracticeFilterHref({
                  availability: "review",
                  sort: sortOption,
                  group: groupOption,
                  subject: focusSubject || undefined,
                  topic: focusTopic || undefined,
                  source: scopedSourceParam,
                  teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                }),
                active: availabilityFilter === "review",
              },
            ].map((tab) => (
              <Link
                key={tab.label}
                className={`studentAttemptsQuickTab${tab.active ? " studentAttemptsQuickTabActive" : ""}`}
                href={tab.href}
              >
                <span>{tab.label}</span>
                <strong>{tab.count}</strong>
              </Link>
            ))}
          </section>

          <section className="studentResultsGroupedSection">
            <div className="sectionHeading">
              <strong id="recommended-practice">Practice Recommendation Report</strong>
              <span>
                {focusedWeakTopic
                  ? `${percentageLabel(focusedWeakTopic.average_percentage)} in ${focusedWeakTopic.subject_name}`
                  : practiceFocus.helper}
              </span>
            </div>
            <StudentPracticeRecommendationReport
              groupLabel={
                groupOption === "none"
                  ? `${practiceReportRows.length} practice sets on this page`
                  : `Grouped by ${formatFilterValue(groupOption)}`
              }
              rows={practiceReportRows}
            />
          </section>

          {filteredPracticeExams.length > 0 ? (
            <section className="contentCard studentCatalogPaginationCard">
              <div className="studentCatalogPaginationSummary">
                <span>{`Page ${currentPage} of ${totalPracticePages}`}</span>
                <strong>{`Showing ${showingStart}-${showingEnd} of ${filteredPracticeExams.length} practice sets`}</strong>
              </div>
              <div className="studentCatalogPaginationActions">
                <Link
                  className="button buttonSecondary"
                  href={buildPracticeFilterHref({
                    availability: availabilityFilter,
                    sort: sortOption,
                    group: groupOption,
                    page: Math.max(1, currentPage - 1),
                    pageSize,
                    subject: focusSubject || undefined,
                    topic: focusTopic || undefined,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  Previous page
                </Link>
                <Link
                  className="button buttonPrimary"
                  href={buildPracticeFilterHref({
                    availability: availabilityFilter,
                    sort: sortOption,
                    group: groupOption,
                    page: Math.min(totalPracticePages, currentPage + 1),
                    pageSize,
                    subject: focusSubject || undefined,
                    topic: focusTopic || undefined,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  Next page
                </Link>
              </div>
            </section>
          ) : null}
          </>
          ) : null}
        </>
      )}
    </div>
  );
}
