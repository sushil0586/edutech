import { cookies } from "next/headers";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentResultsReport, type StudentResultsReportRow } from "@/components/ui/student-results-report";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StudentWorkspaceLink as Link } from "@/components/ui/student-workspace-link";
import {
  fetchStudentPracticeFollowUpExams,
  fetchStudentResults,
  getStudentApiState,
} from "@/lib/api/student";
import { StudentResult } from "@/features/dashboard/types";
import {
  durationLabel,
  percentageLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import {
  attemptOutcomeHelper,
  attemptOutcomeJourney,
  attemptOutcomeLabel,
  attemptOutcomeProgressLabel,
  attemptOutcomeResultsLabel,
  attemptOutcomeReviewLabel,
  resolveAttemptOutcomeState,
} from "@/lib/student/attempt-outcome";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentExamsBySubject,
  filterStudentRecordsBySource,
  filterStudentRecordsByMetadataSubject,
  getExamSubjectDisplayLabel,
  getMetadataSubjectDisplayLabel,
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
import { resolvePracticeFollowUpAction } from "@/lib/student/practice";
import { buildFilterHref, formatFilterValue } from "@/lib/workspace/filter-utils";

type ResultStatusFilter =
  | "all"
  | "published"
  | "pending"
  | "pass"
  | "fail"
  | "review_ready";
type ResultSortOption = "latest" | "highest" | "lowest" | "fastest" | "rank";
type ResultGroupOption = "none" | "source" | "outcome" | "review";
const RESULT_PAGE_SIZE_VALUES = [6, 12, 18] as const;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resultTone(result: StudentResult) {
  if (!result.is_published) return "statusDemo";
  if (result.result_status === "pass") return "statusLive";
  if (result.result_status === "fail") return "statusWarning";
  return "statusDemo";
}

function resultSourceDescriptor(result: {
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
}) {
  if (result.source_type === "teacher" && result.source_teacher_name) {
    return `${result.source_label} · ${result.source_teacher_name}`;
  }

  if (result.source_name && result.source_name !== result.source_label) {
    return `${result.source_label} · ${result.source_name}`;
  }

  return result.source_label;
}

function looksLikeNeetValue(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.includes("neet") || normalized.includes("medical entrance");
}

function resultStateCopy(result: StudentResult) {
  const outcomeState = resolveAttemptOutcomeState({
    resultVisible: result.is_published,
    reviewAvailable: result.review_available,
  });
  const journey = attemptOutcomeJourney(outcomeState);

  if (outcomeState === "awaiting_publication") {
    return {
      badge: attemptOutcomeLabel(outcomeState),
      helper: `${attemptOutcomeHelper(outcomeState, "exam")} ${journey.laneHelper}`,
      progress: attemptOutcomeProgressLabel(outcomeState),
      summaryCta: journey.summaryCta,
      laneLabel: journey.laneLabel,
      reviewHref: null,
      practiceCta: "Open Practice",
    };
  }

  if (outcomeState === "published_summary_only") {
    return {
      badge: attemptOutcomeLabel(outcomeState),
      helper: `${attemptOutcomeHelper(outcomeState, "exam")} ${journey.laneHelper}`,
      progress: attemptOutcomeProgressLabel(outcomeState),
      summaryCta: journey.summaryCta,
      laneLabel: journey.laneLabel,
      reviewHref: null,
      practiceCta:
        result.result_status === "fail" ? "Practice Weak Areas" : "Open Practice",
    };
  }

  return {
    badge: attemptOutcomeLabel(outcomeState),
    helper: `${attemptOutcomeHelper(outcomeState, "exam")} ${journey.laneHelper}`,
    progress: attemptOutcomeProgressLabel(outcomeState),
    summaryCta: journey.summaryCta,
    laneLabel: journey.laneLabel,
    reviewHref: `/app/attempts/${result.attempt}/review`,
    practiceCta:
      result.result_status === "fail" ? "Practice Weak Areas" : "Practice Again",
  };
}

function compactResultHeadline(result: StudentResult, outcomeState: ReturnType<typeof resolveAttemptOutcomeState>) {
  if (!result.is_published) {
    return `${attemptOutcomeResultsLabel(outcomeState)} · ${attemptOutcomeReviewLabel(outcomeState)}`;
  }

  if (result.result_status === "pass") {
    return result.review_available ? "Passed · Review available" : "Passed · Result published";
  }

  return result.review_available ? "Needs work · Review available" : "Needs work · Result published";
}

function resolveResultStatusFilter(value?: string): ResultStatusFilter {
  switch (value) {
    case "published":
    case "pending":
    case "pass":
    case "fail":
    case "review_ready":
      return value;
    default:
      return "all";
  }
}

function resolveResultSortOption(value?: string): ResultSortOption {
  switch (value) {
    case "highest":
    case "lowest":
    case "fastest":
    case "rank":
      return value;
    default:
      return "latest";
  }
}

function resolveResultGroupOption(value?: string): ResultGroupOption {
  switch (value) {
    case "source":
    case "outcome":
    case "review":
      return value;
    default:
      return "none";
  }
}

function buildResultGroupLabel(result: StudentResult, groupBy: ResultGroupOption) {
  const outcomeState = resolveAttemptOutcomeState({
    resultVisible: result.is_published,
    reviewAvailable: result.review_available,
  });
  if (groupBy === "source") {
    return resultSourceDescriptor(result);
  }
  if (groupBy === "outcome") {
    if (!result.is_published) return attemptOutcomeResultsLabel(outcomeState);
    return `${attemptOutcomeResultsLabel(outcomeState)} · ${titleCaseState(result.result_status)}`;
  }
  if (groupBy === "review") {
    return attemptOutcomeReviewLabel(outcomeState);
  }
  return "Results";
}

function resultStatusLabel(result: StudentResult) {
  if (!result.is_published) {
    return "Pending";
  }
  return titleCaseState(result.result_status);
}

function reviewStatusLabel(result: StudentResult) {
  if (!result.is_published) {
    return "Awaiting result";
  }
  return result.review_available ? "Available" : "Locked";
}

function applyResultStatusFilter(results: StudentResult[], filter: ResultStatusFilter) {
  switch (filter) {
    case "published":
      return results.filter((result) => result.is_published);
    case "pending":
      return results.filter((result) => !result.is_published);
    case "pass":
      return results.filter((result) => result.is_published && result.result_status === "pass");
    case "fail":
      return results.filter((result) => result.is_published && result.result_status === "fail");
    case "review_ready":
      return results.filter((result) => result.is_published && result.review_available);
    default:
      return results;
  }
}

function sortResults(results: StudentResult[], sortBy: ResultSortOption) {
  const sortable = [...results];
  sortable.sort((left, right) => {
    switch (sortBy) {
      case "highest":
        return Number(right.percentage) - Number(left.percentage);
      case "lowest":
        return Number(left.percentage) - Number(right.percentage);
      case "fastest":
        return left.time_taken_seconds - right.time_taken_seconds;
      case "rank":
        return (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
      case "latest":
      default: {
        const leftTime = left.published_at ? Date.parse(left.published_at) : Date.parse(left.created_at);
        const rightTime = right.published_at ? Date.parse(right.published_at) : Date.parse(right.created_at);
        return rightTime - leftTime;
      }
    }
  });
  return sortable;
}

function groupResults(results: StudentResult[], groupBy: ResultGroupOption) {
  if (groupBy === "none") {
    return [{ label: "All results", items: results }];
  }

  const buckets = new Map<string, StudentResult[]>();
  for (const result of results) {
    const label = buildResultGroupLabel(result, groupBy);
    buckets.set(label, [...(buckets.get(label) ?? []), result]);
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

function buildResultsFilterHref(args: {
  status?: ResultStatusFilter;
  sort?: ResultSortOption;
  group?: ResultGroupOption;
  page?: number;
  pageSize?: number;
  subject?: string;
  source?: string;
  teacher?: string;
}) {
  return buildFilterHref("/app/results", [
    ["subject", args.subject],
    ["source", args.source],
    ["teacher", args.teacher],
    ["result_status", args.status, "all"],
    ["result_sort", args.sort, "latest"],
    ["result_group", args.group, "none"],
    ["result_page", args.page ? String(args.page) : undefined, "1"],
    ["result_page_size", args.pageSize ? String(args.pageSize) : undefined, "12"],
  ]);
}

async function loadResults() {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      results: [],
      practiceExams: [],
    };
  }

  try {
    const [results, exams] = await Promise.all([
      fetchStudentResults(),
      fetchStudentPracticeFollowUpExams(),
    ]);
    return {
      source: "live" as const,
      results,
      practiceExams: exams.filter((exam) => exam.exam_type === "practice"),
    };
  } catch {
    return {
      source: "error" as const,
      results: [],
      practiceExams: [],
    };
  }
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    subject?: string;
    source?: string;
    teacher?: string;
    result_status?: string;
    result_sort?: string;
    result_group?: string;
    result_page?: string;
    result_page_size?: string;
  }>;
}) {
  const {
    error,
    subject,
    source: sourceParam,
    teacher: teacherParam,
    result_status,
    result_sort,
    result_group,
    result_page,
    result_page_size,
  } = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const requestedSubject =
    subjectOptions.find((option) => option.value === subject)?.value ?? null;
  const cookieStore = await cookies();
  const requestedSource = resolveSelectedStudentSource(sourceParam ?? ALL_SOURCES_CONTEXT);
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    requestedSubject ??
      cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ??
      ALL_SUBJECTS_CONTEXT,
  );
  const selectedSubjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "Overall";
  const scopedSubjectParam =
    selectedSubject === ALL_SUBJECTS_CONTEXT ? undefined : selectedSubject;

  const { source, results, practiceExams } = await loadResults();
  const { teacherOptions } = getStudentSourceOptions([...results, ...practiceExams]);
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
  const scopedResults = filterStudentRecordsByMetadataSubject(
    filterStudentRecordsBySource(results, selectedSource, selectedTeacherId),
    selectedSubject,
  );
  const scopedPracticeExams = filterStudentExamsBySubject(
    filterStudentRecordsBySource(practiceExams, selectedSource, selectedTeacherId),
    selectedSubject,
  );
  const statusFilter = resolveResultStatusFilter(result_status);
  const sortOption = resolveResultSortOption(result_sort);
  const groupOption = resolveResultGroupOption(result_group);
  const filteredResults = sortResults(
    applyResultStatusFilter(scopedResults, statusFilter),
    sortOption,
  );
  const pageSizeCandidate = parsePositiveInt(result_page_size, 12);
  const pageSize = RESULT_PAGE_SIZE_VALUES.includes(
    pageSizeCandidate as (typeof RESULT_PAGE_SIZE_VALUES)[number],
  )
    ? pageSizeCandidate
    : 12;
  const totalResultPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const currentPage = Math.min(parsePositiveInt(result_page, 1), totalResultPages);
  const visibleResults = filteredResults.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const showingStart = filteredResults.length ? (currentPage - 1) * pageSize + 1 : 0;
  const showingEnd = Math.min(currentPage * pageSize, filteredResults.length);
  const groupedResults = groupResults(visibleResults, groupOption);
  const publishedResults = filteredResults.filter((result) => result.is_published);
  const reviewReadyCount = filteredResults.filter(
    (result) => result.is_published && result.review_available,
  ).length;
  const passCount = filteredResults.filter(
    (result) => result.is_published && result.result_status === "pass",
  ).length;
  const averagePercentage =
    publishedResults.length > 0
      ? Math.round(
          publishedResults.reduce(
            (sum, result) => sum + Number(result.percentage),
            0,
          ) / publishedResults.length,
        )
      : null;
  const latestResult = filteredResults[0] ?? scopedResults[0] ?? null;
  const pendingResults = filteredResults.filter((result) => !result.is_published).length;
  const practiceFollowUp = resolvePracticeFollowUpAction({
    exams: scopedPracticeExams,
    subjectName: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
  });
  const practiceActionHref = practiceFollowUp.action.href;
  const neetLane =
    looksLikeNeetValue(selectedSubjectLabel) ||
    scopedResults.some(
      (result) =>
        looksLikeNeetValue(result.exam_title) ||
        looksLikeNeetValue(result.exam_code) ||
        looksLikeNeetValue(result.source_label) ||
        looksLikeNeetValue(result.source_name),
    ) ||
    scopedPracticeExams.some(
      (exam) =>
        exam.experience_profile.assessment_family === "competitive" &&
        (looksLikeNeetValue(getExamSubjectDisplayLabel(exam)) ||
          looksLikeNeetValue(exam.title) ||
          looksLikeNeetValue(exam.code)),
    );
  const resultsCopy = neetLane
    ? {
        description:
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "Track mock scores, review readiness, and the next practice step."
            : `Track mock scores and review readiness for ${selectedSubjectLabel}.`,
        heroTag: "Mock result overview",
        analyticsLabel: "View Readiness Analytics",
        averageLabel: "Average Mock Result",
        latestLabel: "Latest Visible Mock",
        highestLabel: "Best Mock Score",
        pendingLabel: "Pending Mock Release",
        controlsTitle: "Mock Result Controls",
        needsWorkChip: "Needs Repair",
        premiumTitle: "Practice follow-up",
        premiumDescription:
          "Your next suggested practice may be ready to start, available to unlock, or already open in the library.",
        recoveryTitle: "Next best step",
        recoveryLead:
          "Use each mock result to decide the next topic or practice step.",
        recoverySecond:
          "Check the summary or answer review first, then continue into the matched practice lane.",
      }
    : {
        description:
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "Track scores, review availability, and the next learning step after each result."
            : `Track scores and review availability for ${selectedSubjectLabel}.`,
        heroTag: "Result Overview",
        analyticsLabel: "View Analytics",
        averageLabel: "Average Result",
        latestLabel: "Latest Visible Result",
        highestLabel: "Highest Score",
        pendingLabel: "Pending Publication",
        controlsTitle: "Result Controls",
        needsWorkChip: "Needs Work",
        premiumTitle: "Practice follow-up",
        premiumDescription:
          "Your next suggested practice may be ready to start, available to unlock, or already open in the library.",
        recoveryTitle: "Next best step",
        recoveryLead:
          "Use each result to decide the next topic or practice step.",
        recoverySecond:
          "Check the summary or answer review first, then continue into the matched practice lane.",
      };
  const reportGroups = groupedResults.map((group) => ({
    label: group.label,
    items: group.items.map((result): StudentResultsReportRow => {
      const stateCopy = resultStateCopy(result);
      const resultSubjectLabel = getMetadataSubjectDisplayLabel(result.metadata);
      const summaryHref = buildFilterHref(`/app/attempts/${result.attempt}/summary`, [
        ["subject", scopedSubjectParam],
        ["source", scopedSourceParam],
        ["teacher", selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined],
      ]);
      const reviewHref = stateCopy.reviewHref
        ? buildFilterHref(stateCopy.reviewHref, [
            ["subject", scopedSubjectParam],
            ["source", scopedSourceParam],
            ["teacher", selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined],
          ])
        : null;
      const attemptedCount =
        result.correct_answers + result.incorrect_answers + result.skipped_questions;

      return {
        id: result.id,
        examTitle: result.exam_title,
        examCode: result.exam_code,
        subjectScope: resultSubjectLabel !== "Subject pending" ? resultSubjectLabel : "Multi-subject or pending",
        sourceLabel: resultSourceDescriptor(result),
        scoreLabel: result.is_published ? String(result.final_score) : "Pending",
        percentageLabel: result.is_published ? percentageLabel(result.percentage) : "Pending",
        rankLabel: result.rank !== null ? String(result.rank) : "N/A",
        resultStatusLabel: resultStatusLabel(result),
        reviewLabel: reviewStatusLabel(result),
        nextActionLabel: stateCopy.practiceCta,
        dateLabel: result.published_at
          ? `Published ${studentDateTimeLabel(result.published_at)}`
          : `Updated ${studentDateTimeLabel(result.created_at)}`,
        statusToneClass: resultTone(result),
        statusBadgeLabel: stateCopy.badge,
        summaryHref,
        reviewHref,
        practiceHref: practiceActionHref,
        stats: {
          finalScore: result.is_published ? String(result.final_score) : "Pending",
          percentage: result.is_published ? percentageLabel(result.percentage) : "Pending",
          attemptedCount: result.is_published ? String(attemptedCount) : "Pending",
          correctAnswers: result.correct_answers,
          incorrectAnswers: result.incorrect_answers,
          skippedQuestions: result.skipped_questions,
          timeTaken: durationLabel(result.time_taken_seconds),
          publishedState: result.is_published ? "Published" : "Awaiting publish",
        },
        insight: {
          headline: compactResultHeadline(
            result,
            resolveAttemptOutcomeState({
              resultVisible: result.is_published,
              reviewAvailable: result.review_available,
            }),
          ),
          helper: stateCopy.helper,
          progress: stateCopy.progress,
        },
      };
    }),
  }));

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerResultsPage">
      <StudentPageHeader
        title={
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "Results"
            : `${selectedSubjectLabel} Results`
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
            ? "Track published scores, pending releases, and your next learning action."
            : `Track scores, pending releases, and review readiness for ${selectedSubjectLabel}.`
        }
        statusLabel={
          source === "live"
            ? `${scopedResults.length} results loaded`
            : source === "unconfigured"
              ? "Sign in required"
              : "Unable to load results"
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
              ? "Results are not available yet"
              : "Result history could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Sign in with your student account to load your result history."
              : "We couldn't load your results right now. Please try again shortly."
          }
          bullets={
            source === "unconfigured"
              ? ["Student sign-in", "Results history"]
              : ["Connection check", "Results history"]
          }
          ctaHref="/app/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={
            source === "unconfigured"
              ? "Sign in to continue"
              : "Try again soon"
          }
        />
      ) : scopedResults.length === 0 ? (
        <StudentStatePanel
          eyebrow="No results yet"
          title="Your result history is empty right now"
          description="Results will appear here after your submitted attempts are evaluated and released."
          ctaHref="/app/exams"
          ctaLabel="Open Exams"
          statusLabel="Waiting for published results"
        />
      ) : (
        <>
          <StudentKpiGrid
            className="resultsSummaryGrid studentAttemptsKpiGrid"
            items={[
              {
                label: resultsCopy.averageLabel,
                value: averagePercentage !== null ? `${averagePercentage}%` : "Pending",
                note: `Based on ${publishedResults.length} published${publishedResults.length === 1 ? " result" : " results"}`,
                tone: "primary",
              },
              {
                label: resultsCopy.latestLabel,
                value:
                  latestResult && latestResult.is_published
                    ? percentageLabel(latestResult.percentage)
                    : "Pending",
                note: latestResult
                  ? `${latestResult.exam_code} · ${latestResult.is_published ? "Published" : "Awaiting publish"}`
                  : "No latest result available",
              },
              {
                label: "Review Ready",
                value: reviewReadyCount,
                note: `${passCount} passed${passCount === 1 ? "" : " results"}`,
              },
              {
                label: resultsCopy.pendingLabel,
                value: pendingResults,
                note: "Submitted attempts waiting for published results",
              },
            ]}
          />

          <section className="contentCard studentWorkspaceFiltersCard studentAttemptsFiltersCard">
            <form className="studentWorkspaceFiltersForm" method="GET">
              <label className="studentWorkspaceFilterField">
                <span>Status filter</span>
                <select defaultValue={statusFilter} name="result_status">
                  <option value="all">All results</option>
                  <option value="published">Published only</option>
                  <option value="pending">Pending only</option>
                  <option value="pass">Pass only</option>
                  <option value="fail">Fail only</option>
                  <option value="review_ready">Review ready</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Sort by</span>
                <select defaultValue={sortOption} name="result_sort">
                  <option value="latest">Latest first</option>
                  <option value="highest">Highest score</option>
                  <option value="lowest">Lowest score</option>
                  <option value="fastest">Fastest completion</option>
                  <option value="rank">Best rank</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Group by</span>
                <select defaultValue={groupOption} name="result_group">
                  <option value="none">No grouping</option>
                  <option value="source">Source</option>
                  <option value="outcome">Outcome</option>
                  <option value="review">Review access</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Page size</span>
                <select defaultValue={String(pageSize)} name="result_page_size">
                  {RESULT_PAGE_SIZE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value} per page
                    </option>
                  ))}
                </select>
              </label>
              <div className="studentWorkspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Update view
                </button>
                <Link
                  className="button buttonSecondary"
                  href={buildResultsFilterHref({
                    subject: scopedSubjectParam,
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
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "all" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    sort: sortOption,
                    group: groupOption,
                    pageSize,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                  prefetch={false}
                >
                  All
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "published" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: "published",
                    sort: sortOption,
                    group: groupOption,
                    pageSize,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                  prefetch={false}
                >
                  Published
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "review_ready" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: "review_ready",
                    sort: sortOption,
                    group: groupOption,
                    pageSize,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                  prefetch={false}
                >
                  Review Ready
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "fail" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: "fail",
                    sort: sortOption,
                    group: groupOption,
                    pageSize,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                  prefetch={false}
                >
                  {resultsCopy.needsWorkChip}
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "highest" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: statusFilter,
                    sort: "highest",
                    group: groupOption,
                    pageSize,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                  prefetch={false}
                >
                  Top Score
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "fastest" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: statusFilter,
                    sort: "fastest",
                    group: groupOption,
                    pageSize,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                  prefetch={false}
                >
                  Fastest
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${groupOption === "source" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: statusFilter,
                    sort: sortOption,
                    group: "source",
                    pageSize,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                  prefetch={false}
                >
                  Group by Source
                </Link>
              </div>
            </div>
            <FilterSummaryPills
              className="studentWorkspaceFilterChips"
              items={[
                { label: "Status", value: formatFilterValue(statusFilter) },
                { label: "Sort", value: formatFilterValue(sortOption) },
                { label: "Group", value: formatFilterValue(groupOption) },
                { label: "Page size", value: pageSize !== 12 ? String(pageSize) : null },
              ]}
            />
          </section>

          <section className="studentAttemptsQuickBar">
            {[
              {
                label: "All",
                count: visibleResults.length,
                href: buildResultsFilterHref({
                  sort: sortOption,
                  group: groupOption,
                  pageSize,
                  subject: scopedSubjectParam,
                  source: scopedSourceParam,
                  teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                }),
                active: statusFilter === "all",
              },
              {
                label: "Published",
                count: publishedResults.length,
                href: buildResultsFilterHref({
                  status: "published",
                  sort: sortOption,
                  group: groupOption,
                  pageSize,
                  subject: scopedSubjectParam,
                  source: scopedSourceParam,
                  teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                }),
                active: statusFilter === "published",
              },
              {
                label: "Pending",
                count: pendingResults,
                href: buildResultsFilterHref({
                  status: "pending",
                  sort: sortOption,
                  group: groupOption,
                  pageSize,
                  subject: scopedSubjectParam,
                  source: scopedSourceParam,
                  teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                }),
                active: statusFilter === "pending",
              },
              {
                label: "Review Ready",
                count: reviewReadyCount,
                href: buildResultsFilterHref({
                  status: "review_ready",
                  sort: sortOption,
                  group: groupOption,
                  pageSize,
                  subject: scopedSubjectParam,
                  source: scopedSourceParam,
                  teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                }),
                active: statusFilter === "review_ready",
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

          {visibleResults.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching results"
              title="No results match these filters"
              description="Try broader filters or reset the current result controls."
              ctaHref={buildResultsFilterHref({
                subject: scopedSubjectParam,
                source: scopedSourceParam,
                teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
              })}
              ctaLabel="Reset result filters"
              statusLabel="Filter returned zero results"
            />
          ) : null}

          {visibleResults.length > 0 ? (
            <StudentResultsReport
              groups={reportGroups}
              showGroupHeadings={groupOption !== "none"}
            />
          ) : null}
          {filteredResults.length > 0 && totalResultPages > 1 ? (
            <section className="contentCard studentReviewPaginationCard">
              <div className="studentReviewPaginationBar">
                <div className="studentReviewPaginationSummary">
                  <span>
                    Page {currentPage} of {totalResultPages} · Showing {showingStart}-{showingEnd} of {filteredResults.length} results
                  </span>
                </div>
                <div className="studentReviewPaginationActions">
                  {currentPage > 1 ? (
                    <Link
                      className="button buttonGhost"
                      href={buildResultsFilterHref({
                        status: statusFilter,
                        sort: sortOption,
                        group: groupOption,
                        page: currentPage - 1,
                        pageSize,
                        subject: scopedSubjectParam,
                        source: scopedSourceParam,
                        teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                      })}
                    >
                      Previous page
                    </Link>
                  ) : null}
                  {currentPage < totalResultPages ? (
                    <Link
                      className="button buttonPrimary"
                      href={buildResultsFilterHref({
                        status: statusFilter,
                        sort: sortOption,
                        group: groupOption,
                        page: currentPage + 1,
                        pageSize,
                        subject: scopedSubjectParam,
                        source: scopedSourceParam,
                        teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                      })}
                    >
                      Next page
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
