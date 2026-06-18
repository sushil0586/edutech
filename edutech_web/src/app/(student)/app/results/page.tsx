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
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentExamsBySubject,
  filterStudentRecordsBySource,
  filterStudentRecordsByMetadataSubject,
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

function resultStateCopy(result: StudentResult) {
  if (!result.is_published) {
    return {
      badge: "Awaiting publication",
      helper:
        "This attempt is submitted, but the backend has not yet published the student-visible result.",
      summaryCta: "Check attempt",
      reviewHref: null,
      practiceCta: "Open Practice",
    };
  }

  if (!result.review_available) {
    return {
      badge: titleCaseState(result.result_status),
      helper:
        "This result is visible, but answer review is still restricted by the current review setting for this exam.",
      summaryCta: "Attempt Summary",
      reviewHref: null,
      practiceCta:
        result.result_status === "fail" ? "Practice Weak Areas" : "Open Practice",
    };
  }

  return {
    badge: titleCaseState(result.result_status),
      helper:
        "This result is fully visible here, including summary access and answer review.",
    summaryCta: "Attempt Summary",
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
  if (groupBy === "source") {
    return resultSourceDescriptor(result);
  }
  if (groupBy === "outcome") {
    if (!result.is_published) return "Awaiting publication";
    return titleCaseState(result.result_status);
  }
  if (groupBy === "review") {
    if (!result.is_published) return "Pending release";
    return result.review_available ? "Review ready" : "Summary only";
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
}) {
  return buildFilterHref("/app/results", [
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
    result_status?: string;
    result_sort?: string;
    result_group?: string;
  }>;
}) {
  const { error, result_status, result_sort, result_group } = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const selectedSource = resolveSelectedStudentSource(
    cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSubjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "Overall";

  const { source, results, practiceExams } = await loadResults();
  const { teacherOptions } = getStudentSourceOptions([...results, ...practiceExams]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ?? null,
  );
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
            ? "A live result workspace showing scores, review visibility, and next-step practice opportunities from real student result data."
            : `A live result workspace focused on ${selectedSubjectLabel}, using matching backend subject records where available.`
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
              <span className="studentDashboardTag">Result Overview</span>
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
                View Analytics
              </Link>
              <Link className="button buttonSecondary" href="/app/attempts">
                Open Attempts
              </Link>
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Average Result",
                value: averagePercentage !== null ? `${averagePercentage}%` : "Pending",
                note: `Based on ${publishedResults.length} published${publishedResults.length === 1 ? " result" : " results"}`,
                tone: "primary",
              },
              {
                label: "Latest Visible Result",
                value:
                  latestResult && latestResult.is_published
                    ? percentageLabel(latestResult.percentage)
                    : "Pending",
                note: latestResult
                  ? `${latestResult.exam_code} · ${latestResult.is_published ? "Published" : "Awaiting publish"}`
                  : "No latest result available",
              },
              {
                label: "Highest Score",
                value: highestScore ? percentageLabel(highestScore.percentage) : "Pending",
                note: highestScore
                  ? highestScore.exam_title
                  : "No published scores to compare",
              },
              {
                label: "Pending Publication",
                value: pendingResults,
                note: "Submitted attempts not yet released to the learner",
              },
            ]}
          />

          <section className="contentCard studentWorkspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Result Controls</strong>
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
                <Link className="button buttonSecondary" href="/app/results">
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="studentWorkspaceFilterQuickRow">
              <span className="studentWorkspaceFilterQuickLabel">Quick filters</span>
              <div className="studentWorkspaceFilterQuickChips">
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "all" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({ sort: sortOption, group: groupOption })}
                >
                  All
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "published" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({ status: "published", sort: sortOption, group: groupOption })}
                >
                  Published
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "review_ready" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({ status: "review_ready", sort: sortOption, group: groupOption })}
                >
                  Review Ready
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${statusFilter === "fail" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({ status: "fail", sort: sortOption, group: groupOption })}
                >
                  Needs Work
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "highest" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({ status: statusFilter, sort: "highest", group: groupOption })}
                >
                  Top Score
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "fastest" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({ status: statusFilter, sort: "fastest", group: groupOption })}
                >
                  Fastest
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${groupOption === "source" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildResultsFilterHref({ status: statusFilter, sort: sortOption, group: "source" })}
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
              ctaHref="/app/results"
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

              return (
                <article className="contentCard studentResultSurface" key={result.id}>
                  <div className="studentResultSurfaceHead">
                    <div>
                      <strong>{result.exam_title}</strong>
                      <span>{result.exam_code}</span>
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
                          : "Pending release"}
                      </strong>
                      <small>
                        {resultSourceDescriptor(result)}. {stateCopy.helper}
                      </small>
                    </div>
                    <div className="studentInsightHeroActions">
                      <Link
                        className="button buttonPrimary"
                        href={`/app/attempts/${result.attempt}/summary`}
                      >
                        {stateCopy.summaryCta}
                      </Link>
                      {stateCopy.reviewHref ? (
                        <Link className="button buttonSecondary" href={stateCopy.reviewHref}>
                          Review Attempt
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
              <strong>Premium follow-up guidance</strong>
              <Link href="/app/wallet">Wallet</Link>
            </div>
            <p className="sectionDescription">
              After a result is visible, the next recommended practice may be free, directly startable,
              or protected by premium access rules. When stars can unlock it, the exact action is shown here.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
