import { cookies } from "next/headers";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  fetchStudentAvailableExams,
  fetchStudentResults,
  getStudentApiState,
  spendStarsForContent,
  startStudentAttempt,
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
import { buildPracticeHref, resolvePracticeFollowUpAction } from "@/lib/student/practice";
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
      fetchStudentAvailableExams(),
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

async function startPracticeAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!examId || !studentId) return;

  try {
    const response = await startStudentAttempt(examId, studentId);
    redirect(`/app/attempts/${response.data.id}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to start this practice set right now.";
    redirect(`/app/results?error=${message}`);
  }
}

async function unlockPracticeAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const contentType = String(formData.get("content_type") ?? "");
  const contentKey = String(formData.get("content_key") ?? "");
  const subject = String(formData.get("subject_id") ?? "").trim();

  if (!examId || !contentType || !contentKey) return;

  try {
    const response = await spendStarsForContent({
      content_type: contentType,
      content_key: contentKey,
      subject: subject || null,
    });
    redirect(
      `/app/exams/${examId}?message=${encodeURIComponent(
        response.data.message || "Practice set unlocked successfully.",
      )}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to unlock this practice set right now.";
    redirect(`/app/results?error=${message}`);
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
  const visibleResults = sortResults(
    applyResultStatusFilter(scopedResults, statusFilter),
    sortOption,
  );
  const groupedResults = groupResults(visibleResults, groupOption);
  const publishedResults = visibleResults.filter((result) => result.is_published);
  const averagePercentage =
    publishedResults.length > 0
      ? Math.round(
          publishedResults.reduce(
            (sum, result) => sum + Number(result.percentage),
            0,
          ) / publishedResults.length,
        )
      : null;
  const highestScore =
    publishedResults.length > 0
      ? publishedResults.reduce((best, result) =>
          Number(result.percentage) > Number(best.percentage) ? result : best,
        )
      : null;
  const latestResult = visibleResults[0] ?? scopedResults[0] ?? null;
  const pendingResults = visibleResults.filter((result) => !result.is_published).length;
  const practiceFollowUp = resolvePracticeFollowUpAction({
    exams: scopedPracticeExams,
    subjectName: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
  });
  const practiceLaneHref = buildPracticeHref({
    subjectName: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
    source: scopedSourceParam ?? null,
    teacher: selectedSource === "teacher" ? selectedTeacherId : null,
  });
  const resultsRecoverySequence =
    practiceFollowUp.exam && practiceFollowUp.action.mode === "unlock"
      ? [
          {
            label: "Do this first",
            detail: "Open the attempt summary or review for the latest visible result and confirm what actually went wrong.",
          },
          {
            label: "Then next",
            detail: "Unlock the matched practice lane only after you confirm it covers the same weak subject or concept.",
          },
          {
            label: "After that",
            detail: "Return to analytics or weak areas before scheduling another broad mock test.",
          },
        ]
      : [
          {
            label: "Do this first",
            detail: "Open the latest summary or review surface and identify the mistakes you want to repair next.",
          },
          {
            label: "Then next",
            detail: "Move straight into the matched practice lane while that error pattern is still fresh.",
          },
          {
            label: "After that",
            detail: "Return to analytics, weak areas, or results to verify whether the same gap still appears.",
          },
        ];
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
            ? "A live NEET mock-result workspace showing score visibility, review release, and the next exam-day repair lane from real student result data."
            : `A live NEET mock-result workspace focused on ${selectedSubjectLabel}, using matching backend subject records where available.`,
        heroTag: "Mock result overview",
        analyticsLabel: "View Readiness Analytics",
        averageLabel: "Average Mock Result",
        latestLabel: "Latest Visible Mock",
        highestLabel: "Best Mock Score",
        pendingLabel: "Pending Mock Release",
        controlsTitle: "Mock Result Controls",
        needsWorkChip: "Needs Repair",
        premiumTitle: "Premium mock follow-up guidance",
        premiumDescription:
          "After a mock result is visible, the next recommended practice may be free, directly startable, or protected by premium access rules. When stars can unlock it, the exact repair action is shown here.",
        recoveryTitle: "Mock Recovery Loop",
        recoveryLead:
          "Mock history is most useful when it pushes the learner into the next repair action instead of becoming a passive score archive.",
        recoverySecond:
          "Use the summary or answer review to confirm the error pattern first, then continue into the matched practice lane.",
      }
    : {
        description:
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "A live result workspace showing scores, review visibility, and next-step practice opportunities from real student result data."
            : `A live result workspace focused on ${selectedSubjectLabel}, using matching backend subject records where available.`,
        heroTag: "Result Overview",
        analyticsLabel: "View Analytics",
        averageLabel: "Average Result",
        latestLabel: "Latest Visible Result",
        highestLabel: "Highest Score",
        pendingLabel: "Pending Publication",
        controlsTitle: "Result Controls",
        needsWorkChip: "Needs Work",
        premiumTitle: "Premium follow-up guidance",
        premiumDescription:
          "After a result is visible, the next recommended practice may be free, directly startable, or protected by premium access rules. When stars can unlock it, the exact action is shown here.",
        recoveryTitle: "Results Recovery Loop",
        recoveryLead:
          "Result history is most useful when it sends the learner into the next repair action instead of becoming a passive score archive.",
        recoverySecond:
          "Use the summary or answer review to confirm the mistake pattern first, then continue into the matched practice lane.",
      };

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
          resultsCopy.description
        }
        statusLabel={
          source === "live"
            ? `${scopedResults.length} results loaded`
            : source === "unconfigured"
              ? "Backend not configured"
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
              ? "Waiting for authenticated result data"
              : "Result history could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This page only renders real exam results. Configure the API base URL and sign in with an active student account to load published and in-progress result records from the backend."
              : "The results workspace is wired to live backend data, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Student results endpoint", "Active student web session"]
              : ["Backend connectivity", "Student results endpoint"]
          }
          ctaHref="/app/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      ) : scopedResults.length === 0 ? (
        <StudentStatePanel
          eyebrow="No results yet"
          title="Your result history is empty right now"
          description="No student result records were returned. Once submitted attempts are processed and visible to the learner, they will appear here automatically."
          ctaHref="/app/exams"
          ctaLabel="Open Exams"
          statusLabel="Waiting for published results"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">{resultsCopy.heroTag}</span>
              <strong>
                {latestResult?.exam_title ?? "Latest result"}
              </strong>
              <small>
                {latestResult
                  ? `${latestResult.exam_code} · ${resultSourceDescriptor(latestResult)} · ${
                      latestResult.published_at
                        ? studentDateTimeLabel(latestResult.published_at)
                        : "Awaiting publish"
                    }`
                  : "No recent result available"}
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/app/analytics">
                {resultsCopy.analyticsLabel}
              </Link>
              <Link
                className="button buttonSecondary"
                href={buildFilterHref("/app/attempts", [
                  ["subject", scopedSubjectParam],
                  ["source", scopedSourceParam],
                  ["teacher", selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined],
                ])}
              >
                Open Attempts
              </Link>
            </div>
          </section>

          <StudentKpiGrid
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
                label: resultsCopy.highestLabel,
                value: highestScore ? percentageLabel(highestScore.percentage) : "Pending",
                note: highestScore
                  ? highestScore.exam_title
                  : "No published scores to compare",
              },
              {
                label: resultsCopy.pendingLabel,
                value: pendingResults,
                note: "Submitted attempts not yet released to the learner",
              },
            ]}
          />

          <section className="contentCard studentWorkspaceFiltersCard">
            <div className="sectionHeading">
              <strong>{resultsCopy.controlsTitle}</strong>
              <span>
                {visibleResults.length} shown
                {visibleResults.length !== scopedResults.length ? ` of ${scopedResults.length}` : ""}
              </span>
            </div>
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
              <div className="studentWorkspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
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
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  All
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "published" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: "published",
                    sort: sortOption,
                    group: groupOption,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  Published
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "review_ready" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: "review_ready",
                    sort: sortOption,
                    group: groupOption,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  Review Ready
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "fail" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: "fail",
                    sort: sortOption,
                    group: groupOption,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  {resultsCopy.needsWorkChip}
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "highest" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: statusFilter,
                    sort: "highest",
                    group: groupOption,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  Top Score
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "fastest" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: statusFilter,
                    sort: "fastest",
                    group: groupOption,
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  Fastest
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${groupOption === "source" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({
                    status: statusFilter,
                    sort: sortOption,
                    group: "source",
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
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
              ]}
            />
          </section>

          {visibleResults.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching results"
              title="No results match these filters"
              description="Try a broader status filter, a different sort order, or reset the current result controls."
              ctaHref={buildResultsFilterHref({
                subject: scopedSubjectParam,
                source: scopedSourceParam,
                teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
              })}
              ctaLabel="Reset result filters"
              statusLabel="Filter returned zero results"
            />
          ) : null}

          {visibleResults.length > 0 ? groupedResults.map((group) => (
            <section className="studentResultsGroupedSection" key={group.label}>
              {groupOption !== "none" ? (
                <div className="sectionHeading sectionHeadingCompact">
                  <strong>{group.label}</strong>
                  <span>{group.items.length} results</span>
                </div>
              ) : null}
              <div className="studentResultsGrid">
            {group.items.map((result) => {
              const stateCopy = resultStateCopy(result);
              const outcomeState = resolveAttemptOutcomeState({
                resultVisible: result.is_published,
                reviewAvailable: result.review_available,
              });
              const resultSubjectLabel = getMetadataSubjectDisplayLabel(result.metadata);

              return (
                <article className="contentCard studentResultSurface" key={result.id}>
                  <div className="studentResultSurfaceHead">
                    <div>
                      <strong>{result.exam_title}</strong>
                      <span>
                        {result.exam_code}
                        {resultSubjectLabel !== "Subject pending"
                          ? ` · ${resultSubjectLabel}`
                          : ""}
                      </span>
                    </div>
                    <div className="studentResultSurfaceStatus">
                      <span className="statusPill statusDefault">{result.source_label}</span>
                      {result.source_type === "teacher" && result.source_teacher_name ? (
                        <span className="statusPill statusDemo">{result.source_teacher_name}</span>
                      ) : null}
                      <span className={`statusPill ${resultTone(result)}`}>
                        {stateCopy.badge}
                      </span>
                    </div>
                  </div>

                  <div className="studentResultStatGrid">
                    <div className="studentResultStat">
                      <span>Source</span>
                      <strong>{result.source_label}</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Score</span>
                      <strong>
                        {result.is_published ? percentageLabel(result.percentage) : "Pending"}
                      </strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Final Score</span>
                      <strong>{result.is_published ? result.final_score : "Pending"}</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Rank</span>
                      <strong>{result.is_published ? (result.rank ?? "N/A") : "Pending"}</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Time Taken</span>
                      <strong>{durationLabel(result.time_taken_seconds)}</strong>
                    </div>
                  </div>

                  <div className="studentResultBreakdown">
                    <div>
                      <span>Correct</span>
                      <strong>{result.is_published ? result.correct_answers : "Pending"}</strong>
                    </div>
                    <div>
                      <span>Incorrect</span>
                      <strong>{result.is_published ? result.incorrect_answers : "Pending"}</strong>
                    </div>
                    <div>
                      <span>Skipped</span>
                      <strong>{result.is_published ? result.skipped_questions : "Pending"}</strong>
                    </div>
                  </div>

                  <div className="studentResultFooter">
                    <div className="studentResultHelper">
                      <span>Visibility state</span>
                      <strong>
                        {result.published_at
                          ? studentDateTimeLabel(result.published_at)
                          : attemptOutcomeResultsLabel(outcomeState)}
                      </strong>
                      <small>
                        {resultSourceDescriptor(result)}. {stateCopy.helper} {stateCopy.progress}
                      </small>
                    </div>
                    <div className="studentInsightHeroActions">
                      <Link
                        className="button buttonPrimary"
                        href={buildFilterHref(`/app/attempts/${result.attempt}/summary`, [
                          ["subject", scopedSubjectParam],
                          ["source", scopedSourceParam],
                          ["teacher", selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined],
                        ])}
                      >
                        {stateCopy.summaryCta}
                      </Link>
                      {stateCopy.reviewHref ? (
                        <Link
                          className="button buttonSecondary"
                          href={buildFilterHref(stateCopy.reviewHref, [
                            ["subject", scopedSubjectParam],
                            ["source", scopedSourceParam],
                            ["teacher", selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined],
                          ])}
                        >
                          Open Answer Review
                        </Link>
                      ) : null}
                      {practiceFollowUp.exam && practiceFollowUp.action.mode === "start" ? (
                        <form action={startPracticeAction}>
                          <input name="exam_id" type="hidden" value={practiceFollowUp.exam.id} />
                          <input name="student_id" type="hidden" value={result.student} />
                          <ActionSubmitButton
                            className="button buttonGhost"
                            idleLabel={stateCopy.practiceCta}
                            pendingLabel="Starting..."
                          />
                        </form>
                      ) : practiceFollowUp.exam && practiceFollowUp.action.mode === "unlock" ? (
                        <>
                          <form action={unlockPracticeAction}>
                            <input name="exam_id" type="hidden" value={practiceFollowUp.exam.id} />
                            <input
                              name="content_type"
                              type="hidden"
                              value={practiceFollowUp.exam.economy_access.content_type}
                            />
                            <input
                              name="content_key"
                              type="hidden"
                              value={practiceFollowUp.exam.economy_access.content_key}
                            />
                            <input
                              name="subject_id"
                              type="hidden"
                              value={practiceFollowUp.exam.economy_access.subject_id ?? ""}
                            />
                            <ActionSubmitButton
                              className="button buttonGhost"
                              idleLabel={practiceFollowUp.action.label}
                              pendingLabel="Unlocking..."
                            />
                          </form>
                          <Link className="button buttonSecondary" href="/app/wallet">
                            Open Wallet
                          </Link>
                        </>
                      ) : (
                        <Link className="button buttonGhost" href={practiceFollowUp.action.href}>
                          {stateCopy.practiceCta}
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
              </div>
            </section>
          )) : null}

          <section className="contentCard">
            <div className="sectionHeading">
              <strong>{resultsCopy.premiumTitle}</strong>
              <Link href="/app/wallet">Wallet</Link>
            </div>
            <p className="sectionDescription">
              {resultsCopy.premiumDescription}
            </p>
          </section>

          <section className="studentInsightsTwoColumn">
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>{resultsCopy.recoveryTitle}</strong>
                <span>{practiceFollowUp.action.label}</span>
              </div>
              <div className="studentInsightMessageStack">
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>{resultsCopy.recoveryLead}</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>{resultsCopy.recoverySecond}</p>
                </div>
              </div>
              <div className="studentActionSequence" aria-label="Results recovery order">
                {resultsRecoverySequence.map((step) => (
                  <div className="studentActionSequenceCard" key={step.label}>
                    <span>{step.label}</span>
                    <strong>{step.detail}</strong>
                  </div>
                ))}
              </div>
              <div className="studentInsightHeroActions">
                <Link className="button buttonSecondary" href={practiceLaneHref}>
                  Open Practice Lane
                </Link>
                <Link className="button buttonGhost" href="/app/weak-areas">
                  Open Weak Areas
                </Link>
              </div>
            </article>
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>What To Check</strong>
                <span>Before the next mock</span>
              </div>
              <div className="studentInsightMessageStack">
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>Wrong answers usually need concept repair. Skips usually need confidence or pacing repair.</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>If review is already open, clear those errors before another broad test. If review is locked, use summary plus practice as the immediate loop.</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>Compare results only after the targeted practice follow-up, so the next trend reflects a real correction attempt.</p>
                </div>
              </div>
              <div className="studentInsightHeroActions">
                <Link className="button buttonSecondary" href="/app/analytics">
                  View Analytics
                </Link>
                <Link
                  className="button buttonGhost"
                  href={buildResultsFilterHref({
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  Stay In Results
                </Link>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
