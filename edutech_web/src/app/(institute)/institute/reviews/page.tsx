import { redirect, unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { ReviewGuidancePanel } from "@/components/ui/review-guidance-panel";
import { ReviewRubricHistory } from "@/components/ui/review-rubric-history";
import { ReviewResponseArtifacts } from "@/components/ui/review-response-artifacts";
import { ReviewTaskBulkSelectionControls } from "@/components/ui/review-task-bulk-selection-controls";
import {
  getStudentQuestionPromptTitle,
  StudentQuestionPrompt,
} from "@/components/ui/student-question-prompt";
import { TeacherRubricReviewFields } from "@/components/ui/teacher-rubric-review-fields";
import {
  assignPortalReviewTask,
  bulkAssignPortalReviewTasks,
  bulkModeratePortalReviewTasks,
  bulkRequestPortalReviewTasksRecheck,
  fetchPortalList,
  fetchPortalReviewTaskDetail,
  fetchPortalReviewTaskPage,
  fetchPortalReviewTaskSummary,
  moderatePortalReviewTask,
  requestPortalReviewTaskRecheck,
  type PortalReviewTask,
} from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";

type TeacherRecord = {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
};

type AssignmentScope = "all" | "unassigned" | "assigned";

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function asPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampReviewPageSize(value: string | undefined, fallback = 12) {
  const parsed = asPositiveInteger(value, fallback);
  if ([12, 24, 48].includes(parsed)) return parsed;
  return fallback;
}

function normalizeTeacherFilter(value: string | undefined, teachers: TeacherRecord[]) {
  if (!value) return "";
  return teachers.some((teacher) => teacher.id === value) ? value : "";
}

function normalizeAssignmentScope(value: string | undefined): AssignmentScope {
  if (value === "unassigned" || value === "assigned") return value;
  return "all";
}

function statusTone(status: string) {
  if (status === "reviewed") return "statusLive";
  if (status === "assigned" || status === "in_review") return "statusDemo";
  return "statusWarning";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatHoursCompact(hours: number) {
  if (!hours || hours <= 0) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function riskTone(level: "high" | "medium" | "low") {
  if (level === "high") return "statusWarning";
  if (level === "medium") return "statusDemo";
  return "statusLive";
}

function reviewerPressureTone(args: {
  unresolvedCount: number;
  recheckCount: number;
  oldestOpenHours: number;
}) {
  if (args.unresolvedCount >= 8 || args.recheckCount >= 3 || args.oldestOpenHours >= 72) {
    return "statusWarning";
  }
  if (args.unresolvedCount >= 3 || args.recheckCount >= 1 || args.oldestOpenHours >= 24) {
    return "statusDemo";
  }
  return "statusLive";
}

function buildReviewQueueHref(options: {
  exam?: string;
  reviewer?: string;
  status?: string;
  search?: string;
  task?: string;
  page?: number | string;
  pageSize?: number | string;
  assignmentScope?: AssignmentScope;
}) {
  const params = new URLSearchParams();
  if (options.exam) params.set("exam", options.exam);
  if (options.reviewer) params.set("reviewer", options.reviewer);
  if (options.status && options.status !== "all") params.set("status", options.status);
  if (options.search) params.set("search", options.search);
  if (options.task) params.set("task", options.task);
  if (options.page && String(options.page) !== "1") params.set("page", String(options.page));
  if (options.pageSize && String(options.pageSize) !== "12") params.set("page_size", String(options.pageSize));
  if (options.assignmentScope && options.assignmentScope !== "all") {
    params.set("assignment_scope", options.assignmentScope);
  }
  return `/institute/reviews${params.size ? `?${params.toString()}` : ""}`;
}

async function runAssignReviewTaskAction(formData: FormData) {
  "use server";

  const profile = await requireInstituteAdminSession();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const assignedToTeacher = String(formData.get("assigned_to_teacher") ?? "").trim();
  const status = String(formData.get("status") ?? "all").trim() || "all";
  const search = String(formData.get("search") ?? "").trim();
  const exam = String(formData.get("exam") ?? "").trim();
  const reviewer = String(formData.get("reviewer") ?? "").trim();
  const assignmentScope = normalizeAssignmentScope(String(formData.get("assignment_scope") ?? "").trim());
  const page = String(formData.get("page") ?? "1").trim() || "1";
  const pageSize = String(formData.get("page_size") ?? "12").trim() || "12";

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  if (exam) params.set("exam", exam);
  if (reviewer) params.set("reviewer", reviewer);
  if (assignmentScope !== "all") params.set("assignment_scope", assignmentScope);
  params.set("page", page);
  params.set("page_size", pageSize);
  if (taskId) params.set("task", taskId);

  if (!taskId) {
    params.set("error", "Select a review task before updating assignment.");
    redirect(`/institute/reviews?${params.toString()}`);
  }

  try {
    await assignPortalReviewTask(taskId, {
      assigned_to_teacher: assignedToTeacher || null,
    });
    params.set(
      "message",
      assignedToTeacher ? "Reviewer assigned successfully." : "Reviewer cleared and task returned to queue.",
    );
    redirect(`/institute/reviews?${params.toString()}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update reviewer assignment right now.";
    params.set("error", message);
    redirect(`/institute/reviews?${params.toString()}`);
  }
}

async function runRequestRecheckAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const reviewNotes = String(formData.get("review_notes") ?? "").trim();
  const status = String(formData.get("status") ?? "all").trim() || "all";
  const search = String(formData.get("search") ?? "").trim();
  const exam = String(formData.get("exam") ?? "").trim();
  const reviewer = String(formData.get("reviewer") ?? "").trim();
  const assignmentScope = normalizeAssignmentScope(String(formData.get("assignment_scope") ?? "").trim());
  const page = String(formData.get("page") ?? "1").trim() || "1";
  const pageSize = String(formData.get("page_size") ?? "12").trim() || "12";

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  if (exam) params.set("exam", exam);
  if (reviewer) params.set("reviewer", reviewer);
  if (assignmentScope !== "all") params.set("assignment_scope", assignmentScope);
  params.set("page", page);
  params.set("page_size", pageSize);
  if (taskId) params.set("task", taskId);

  try {
    await requestPortalReviewTaskRecheck(taskId, { review_notes: reviewNotes });
    params.set("message", "Task returned for recheck.");
    redirect(`/institute/reviews?${params.toString()}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to request recheck right now.";
    params.set("error", message);
    redirect(`/institute/reviews?${params.toString()}`);
  }
}

async function runModerateReviewTaskAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const marksAwarded = String(formData.get("marks_awarded") ?? "").trim();
  const reviewNotes = String(formData.get("review_notes") ?? "").trim();
  const rubricScoresRaw = String(formData.get("rubric_scores_json") ?? "").trim();
  const status = String(formData.get("status") ?? "all").trim() || "all";
  const search = String(formData.get("search") ?? "").trim();
  const exam = String(formData.get("exam") ?? "").trim();
  const reviewer = String(formData.get("reviewer") ?? "").trim();
  const assignmentScope = normalizeAssignmentScope(String(formData.get("assignment_scope") ?? "").trim());
  const page = String(formData.get("page") ?? "1").trim() || "1";
  const pageSize = String(formData.get("page_size") ?? "12").trim() || "12";

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  if (exam) params.set("exam", exam);
  if (reviewer) params.set("reviewer", reviewer);
  if (assignmentScope !== "all") params.set("assignment_scope", assignmentScope);
  params.set("page", page);
  params.set("page_size", pageSize);
  if (taskId) params.set("task", taskId);

  let rubricScores:
    | Array<{
        criterion_key: string;
        awarded_score: string;
        note?: string;
      }>
    | undefined;
  if (rubricScoresRaw) {
    try {
      const parsed = JSON.parse(rubricScoresRaw) as Array<Record<string, unknown>>;
      if (Array.isArray(parsed) && parsed.length) {
        rubricScores = parsed.map((item) => ({
          criterion_key: String(item.criterion_key ?? "").trim(),
          awarded_score: String(item.awarded_score ?? "").trim(),
          note: String(item.note ?? "").trim(),
        }));
      }
    } catch {
      params.set("error", "Rubric scoring data could not be parsed. Please try again.");
      redirect(`/institute/reviews?${params.toString()}`);
    }
  }

  try {
    await moderatePortalReviewTask(taskId, {
      marks_awarded: marksAwarded,
      review_notes: reviewNotes,
      rubric_scores: rubricScores,
    });
    params.set("message", "Task moderated successfully.");
    redirect(`/institute/reviews?${params.toString()}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to moderate this review task right now.";
    params.set("error", message);
    redirect(`/institute/reviews?${params.toString()}`);
  }
}

async function runBulkAssignReviewTasksAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();
  const taskIds = formData
    .getAll("task_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const assignedToTeacher = String(formData.get("assigned_to_teacher") ?? "").trim();
  const status = String(formData.get("status") ?? "all").trim() || "all";
  const search = String(formData.get("search") ?? "").trim();
  const exam = String(formData.get("exam") ?? "").trim();
  const reviewer = String(formData.get("reviewer") ?? "").trim();
  const assignmentScope = normalizeAssignmentScope(String(formData.get("assignment_scope") ?? "").trim());
  const page = String(formData.get("page") ?? "1").trim() || "1";
  const pageSize = String(formData.get("page_size") ?? "12").trim() || "12";

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  if (exam) params.set("exam", exam);
  if (reviewer) params.set("reviewer", reviewer);
  if (assignmentScope !== "all") params.set("assignment_scope", assignmentScope);
  params.set("page", page);
  params.set("page_size", pageSize);

  if (!taskIds.length) {
    params.set("error", "Select at least one review task for bulk assignment.");
    redirect(`/institute/reviews?${params.toString()}`);
  }

  try {
    await bulkAssignPortalReviewTasks({
      task_ids: taskIds,
      assigned_to_teacher: assignedToTeacher || null,
    });
    params.set(
      "message",
      assignedToTeacher
        ? `${taskIds.length} review task(s) assigned successfully.`
        : `${taskIds.length} review task(s) returned to the unassigned queue.`,
    );
    redirect(`/institute/reviews?${params.toString()}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to run bulk assignment right now.";
    params.set("error", message);
    redirect(`/institute/reviews?${params.toString()}`);
  }
}

async function runBulkRequestRecheckAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();
  const taskIds = formData
    .getAll("task_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const reviewNotes = String(formData.get("review_notes") ?? "").trim();
  const status = String(formData.get("status") ?? "all").trim() || "all";
  const search = String(formData.get("search") ?? "").trim();
  const exam = String(formData.get("exam") ?? "").trim();
  const reviewer = String(formData.get("reviewer") ?? "").trim();
  const assignmentScope = normalizeAssignmentScope(String(formData.get("assignment_scope") ?? "").trim());
  const page = String(formData.get("page") ?? "1").trim() || "1";
  const pageSize = String(formData.get("page_size") ?? "12").trim() || "12";

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  if (exam) params.set("exam", exam);
  if (reviewer) params.set("reviewer", reviewer);
  if (assignmentScope !== "all") params.set("assignment_scope", assignmentScope);
  params.set("page", page);
  params.set("page_size", pageSize);

  if (!taskIds.length) {
    params.set("error", "Select at least one review task for bulk recheck.");
    redirect(`/institute/reviews?${params.toString()}`);
  }

  try {
    await bulkRequestPortalReviewTasksRecheck({
      task_ids: taskIds,
      review_notes: reviewNotes,
    });
    params.set("message", `${taskIds.length} review task(s) returned for recheck.`);
    redirect(`/institute/reviews?${params.toString()}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to return the selected review tasks for recheck right now.";
    params.set("error", message);
    redirect(`/institute/reviews?${params.toString()}`);
  }
}

async function runBulkModerateAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();
  const taskIds = formData
    .getAll("task_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const reviewNotes = String(formData.get("review_notes") ?? "").trim();
  const status = String(formData.get("status") ?? "all").trim() || "all";
  const search = String(formData.get("search") ?? "").trim();
  const exam = String(formData.get("exam") ?? "").trim();
  const reviewer = String(formData.get("reviewer") ?? "").trim();
  const assignmentScope = normalizeAssignmentScope(String(formData.get("assignment_scope") ?? "").trim());
  const page = String(formData.get("page") ?? "1").trim() || "1";
  const pageSize = String(formData.get("page_size") ?? "12").trim() || "12";

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  if (exam) params.set("exam", exam);
  if (reviewer) params.set("reviewer", reviewer);
  if (assignmentScope !== "all") params.set("assignment_scope", assignmentScope);
  params.set("page", page);
  params.set("page_size", pageSize);

  if (!taskIds.length) {
    params.set("error", "Select at least one reviewed task for bulk moderation.");
    redirect(`/institute/reviews?${params.toString()}`);
  }

  try {
    await bulkModeratePortalReviewTasks({
      task_ids: taskIds,
      review_notes: reviewNotes,
    });
    params.set("message", `${taskIds.length} review task(s) moderated successfully.`);
    redirect(`/institute/reviews?${params.toString()}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to bulk moderate the selected tasks right now.";
    params.set("error", message);
    redirect(`/institute/reviews?${params.toString()}`);
  }
}

export default async function InstituteReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireInstituteAdminSession();
  const resolvedSearchParams = await searchParams;
  const page = asPositiveInteger(readSingle(resolvedSearchParams.page), 1);
  const status = readSingle(resolvedSearchParams.status) || "all";
  const search = readSingle(resolvedSearchParams.search);
  const exam = readSingle(resolvedSearchParams.exam);
  const reviewer = readSingle(resolvedSearchParams.reviewer);
  const assignmentScope = normalizeAssignmentScope(readSingle(resolvedSearchParams.assignment_scope));
  const pageSize = clampReviewPageSize(readSingle(resolvedSearchParams.page_size));
  const selectedTaskId = readSingle(resolvedSearchParams.task);
  const error = readSingle(resolvedSearchParams.error);
  const message = readSingle(resolvedSearchParams.message);

  const instituteQuery = profile.institute ? `?institute=${profile.institute}&page_size=100` : "?page_size=100";

  const teachers = await fetchPortalList<TeacherRecord>(`/api/v1/teachers/${instituteQuery}`).catch(() => []);
  const reviewerFilter = normalizeTeacherFilter(reviewer, teachers);
  const selectedReviewer = teachers.find((teacher) => teacher.id === reviewerFilter) ?? null;

  const [summary, taskPage] = await Promise.all([
    fetchPortalReviewTaskSummary({
      status,
      search,
      exam,
      assignedToTeacher: reviewerFilter || undefined,
      assignmentScope,
    }).catch(() => null),
    fetchPortalReviewTaskPage({
      page,
      pageSize,
      status,
      search,
      exam,
      assignedToTeacher: reviewerFilter || undefined,
      assignmentScope,
    }).catch(() => null),
  ]);

  if (!summary || !taskPage) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid">
        <InstitutePageHeader
          title="Review Queue"
          description="Reviewer management needs the live review-task endpoints and a valid institute session."
          statusLabel="Queue unavailable"
          statusTone="warning"
        />
      </section>
    );
  }

  const activeTeachers = teachers.filter((teacher) => teacher.is_active);
  const busiestReviewer =
    [...summary.reviewers].sort(
      (left, right) =>
        right.unresolved_count - left.unresolved_count ||
        right.recheck_requested_count - left.recheck_requested_count ||
        right.task_count - left.task_count,
    )[0] ?? null;
  const slowestReviewer =
    [...summary.reviewers].sort(
      (left, right) =>
        right.oldest_open_hours - left.oldest_open_hours ||
        right.average_turnaround_hours - left.average_turnaround_hours,
    )[0] ?? null;
  const fastestReviewer =
    summary.reviewers
      .filter((reviewer) => reviewer.reviewed_count > 0)
      .sort(
        (left, right) =>
          left.average_turnaround_hours - right.average_turnaround_hours ||
          right.reviewed_count - left.reviewed_count,
      )[0] ?? null;
  const recheckHeaviestReviewer =
    [...summary.reviewers].sort(
      (left, right) =>
        right.recheck_requested_count - left.recheck_requested_count ||
        right.unresolved_count - left.unresolved_count,
    )[0] ?? null;
  const unassignedReviewerLane =
    summary.reviewers.find((reviewer) => reviewer.teacher_id === null) ?? null;
  const totalPages = Math.max(1, Math.ceil(taskPage.count / pageSize));
  const pageStart = taskPage.count === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(taskPage.count, page * pageSize);
  const selectedTask =
    selectedTaskId && taskPage.results.some((task) => task.id === selectedTaskId)
      ? await fetchPortalReviewTaskDetail(selectedTaskId).catch(() => null)
      : taskPage.results[0]
        ? await fetchPortalReviewTaskDetail(taskPage.results[0].id).catch(() => null)
        : null;

  return (
    <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid">
      <InstitutePageHeader
        title="Review Queue"
        description="Assign descriptive and essay responses to the right teachers before results are delayed."
        statusLabel={`${summary.pending} pending`}
        statusTone={summary.pending > 0 ? "warning" : "live"}
      />

      {error ? <div className="formNotice formNoticeError">{error}</div> : null}
      {message ? <div className="formNotice formNoticeSuccess">{message}</div> : null}
      {exam ? (
        <section className="contentCard workspaceFiltersCard">
          <div className="sectionHeading">
            <strong>Exam-scoped review queue</strong>
            <span>Stay in the same publication workflow</span>
          </div>
          <div className="resultCardActions">
            <Link className="button buttonPrimary" href={`/institute/exams/${encodeURIComponent(exam)}`}>
              Back to Exam
            </Link>
            <Link className="button buttonSecondary" href={`/institute/results?exam=${encodeURIComponent(exam)}`}>
              Open Results
            </Link>
            <Link
              className="button buttonGhost"
              href={buildReviewQueueHref({ reviewer: reviewerFilter, assignmentScope })}
            >
              Clear Scope
            </Link>
          </div>
        </section>
      ) : null}

      <section className="resultsSummaryGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Total tasks</span>
          <strong>{summary.total}</strong>
          <small>All review tasks in institute scope.</small>
          <div className="resultCardActions">
            <Link
              className="button buttonGhost"
              href={buildReviewQueueHref({
                exam,
                reviewer: reviewerFilter,
                search,
                assignmentScope,
                pageSize,
              })}
            >
              Open all
            </Link>
          </div>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Pending</span>
          <strong>{summary.pending}</strong>
          <small>Still waiting for reviewer attention.</small>
          <div className="resultCardActions">
            <Link
              className="button buttonGhost"
              href={buildReviewQueueHref({
                exam,
                reviewer: reviewerFilter,
                status: "pending",
                search,
                assignmentScope,
                pageSize,
              })}
            >
              View pending
            </Link>
          </div>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Assigned</span>
          <strong>{summary.assigned}</strong>
          <small>Already routed to a teacher.</small>
          <div className="resultCardActions">
            <Link
              className="button buttonGhost"
              href={buildReviewQueueHref({
                exam,
                reviewer: reviewerFilter,
                status: "assigned",
                search,
                assignmentScope: "assigned",
                pageSize,
              })}
            >
              View assigned
            </Link>
          </div>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Unassigned</span>
          <strong>{summary.unassigned}</strong>
          <small>Operational risk for delayed publication.</small>
          <div className="resultCardActions">
            <Link
              className="button buttonGhost"
              href={buildReviewQueueHref({
                exam,
                search,
                status: "pending",
                assignmentScope: "unassigned",
                pageSize,
              })}
            >
              Fix routing
            </Link>
          </div>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>In review</span>
          <strong>{summary.in_review}</strong>
          <small>Already opened by teachers but not resolved yet.</small>
          <div className="resultCardActions">
            <Link
              className="button buttonGhost"
              href={buildReviewQueueHref({
                exam,
                reviewer: reviewerFilter,
                status: "in_review",
                search,
                assignmentScope,
                pageSize,
              })}
            >
              Track progress
            </Link>
          </div>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Recheck pressure</span>
          <strong>{summary.recheck_requested}</strong>
          <small>Tasks sent back into the review queue.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Avg turnaround</span>
          <strong>{formatHoursCompact(summary.average_turnaround_hours)}</strong>
          <small>Average time from queue entry to completed review.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Oldest open</span>
          <strong>{formatHoursCompact(summary.oldest_open_hours)}</strong>
          <small>Longest unresolved wait currently in this queue view.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>24h queue trend</span>
          <strong>{summary.throughput_trend.direction}</strong>
          <small>
            {summary.throughput_trend.opened_last_24h} opened vs {summary.throughput_trend.resolved_last_24h} resolved
            in the last day.
          </small>
        </article>
      </section>

      <section className="contentCard workspaceFiltersCard">
        <div className="sectionHeading">
          <strong>Quick triage</strong>
          <span>One-click queue views for daily operations</span>
        </div>
        <div className="questionBankTagRow">
          <Link
            className="button buttonGhost"
            href={buildReviewQueueHref({ exam, reviewer: reviewerFilter, search, assignmentScope, pageSize })}
          >
            All tasks
          </Link>
          <Link
            className="button buttonGhost"
            href={buildReviewQueueHref({
              exam,
              reviewer: reviewerFilter,
              status: "pending",
              search,
              assignmentScope,
              pageSize,
            })}
          >
            Pending
          </Link>
          <Link
            className="button buttonGhost"
            href={buildReviewQueueHref({
              exam,
              search,
              status: "pending",
              assignmentScope: "unassigned",
              pageSize,
            })}
          >
            Unassigned
          </Link>
          <Link
            className="button buttonGhost"
            href={buildReviewQueueHref({
              exam,
              reviewer: reviewerFilter,
              status: "assigned",
              search,
              assignmentScope: "assigned",
              pageSize,
            })}
          >
            Assigned
          </Link>
          <Link
            className="button buttonGhost"
            href={buildReviewQueueHref({
              exam,
              reviewer: reviewerFilter,
              status: "in_review",
              search,
              assignmentScope,
              pageSize,
            })}
          >
            In review
          </Link>
          <Link
            className="button buttonGhost"
            href={buildReviewQueueHref({
              exam,
              reviewer: reviewerFilter,
              status: "reviewed",
              search,
              assignmentScope,
              pageSize,
            })}
          >
            Reviewed
          </Link>
        </div>
      </section>

      <section className="contentCard workspaceFiltersCard">
        <div className="sectionHeading">
          <strong>Queue filters</strong>
          <span>
            Showing {pageStart}-{pageEnd} of {taskPage.count}
          </span>
        </div>
        <form className="teacherExamFilters" method="GET">
          {exam ? <input name="exam" type="hidden" value={exam} /> : null}
          <label className="fieldStack">
            <span>Status</span>
            <select defaultValue={status} name="status">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_review">In review</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </label>
          <label className="fieldStack">
            <span>Search</span>
            <input defaultValue={search} name="search" placeholder="Student, exam, or question" />
          </label>
          <label className="fieldStack">
            <span>Reviewer</span>
            <select defaultValue={reviewerFilter} name="reviewer">
              <option value="">All reviewers</option>
              {activeTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="fieldStack">
            <span>Assignment</span>
            <select defaultValue={assignmentScope} name="assignment_scope">
              <option value="all">All tasks</option>
              <option value="unassigned">Unassigned only</option>
              <option value="assigned">Assigned only</option>
            </select>
          </label>
          <label className="fieldStack">
            <span>Page size</span>
            <select defaultValue={String(pageSize)} name="page_size">
              <option value="12">12 tasks</option>
              <option value="24">24 tasks</option>
              <option value="48">48 tasks</option>
            </select>
          </label>
          <div className="resultCardActions">
            <button className="buttonPrimary" type="submit">
              Apply filters
            </button>
            <Link className="button buttonGhost" href={buildReviewQueueHref({ exam, reviewer: reviewerFilter })}>
              Reset
            </Link>
          </div>
        </form>
        {exam || reviewerFilter || assignmentScope !== "all" ? (
          <div className="questionBankTagRow">
            {exam ? <span className="questionBankTagChip">Scoped to selected exam</span> : null}
            {selectedReviewer ? <span className="questionBankTagChip">Reviewer: {selectedReviewer.full_name}</span> : null}
            {assignmentScope === "unassigned" ? <span className="questionBankTagChip">Assignment: Unassigned only</span> : null}
            {assignmentScope === "assigned" ? <span className="questionBankTagChip">Assignment: Assigned only</span> : null}
            <Link className="button buttonGhost" href="/institute/reviews">
              Clear filters
            </Link>
          </div>
        ) : null}
      </section>

      <section className="dashboardLowerGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Release risk</span>
            <h3>See which exams are closest to publication delay</h3>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>High risk</strong>
                  <span>Heavy backlog, old unresolved work, or repeated rechecks.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.release_risk_summary.high_risk_exams}</strong>
                  <span>Exams</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Medium risk</strong>
                  <span>Needs attention before it turns into a release blocker.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.release_risk_summary.medium_risk_exams}</strong>
                  <span>Exams</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Low risk</strong>
                  <span>Queue exists, but current pressure is still manageable.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.release_risk_summary.low_risk_exams}</strong>
                  <span>Exams</span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Assignment readiness</span>
            <h3>Route reviews before result publication stalls</h3>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>Teacher capacity</strong>
                  <span>Active teachers available to absorb review load.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{activeTeachers.length}</strong>
                  <span>Active teachers</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Assignment coverage</strong>
                  <span>Tasks already routed into reviewer hands.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.assigned}</strong>
                  <span>Assigned tasks</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Blocked exam pressure</strong>
                  <span>Distinct exams still carrying unresolved review blockers.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.blocked_exams}</strong>
                  <span>Blocked exams</span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Reviewer workload</span>
            <h3>See who is carrying the review queue</h3>
            <div className="weakTopicStack">
              {summary.reviewers.length ? (
                summary.reviewers.map((reviewer) => (
                  <div className="weakTopicRow" key={reviewer.teacher_id ?? "unassigned"}>
                    <div>
                      <strong>{reviewer.teacher_name}</strong>
                      <span>
                        {reviewer.unresolved_count} unresolved · {reviewer.recheck_requested_count} recheck · {reviewer.reviewed_count} reviewed
                      </span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{reviewer.task_count}</strong>
                      <span>
                        Oldest {formatHoursCompact(reviewer.oldest_open_hours)} · Avg {formatHoursCompact(reviewer.average_turnaround_hours)}
                      </span>
                      {reviewer.teacher_id ? (
                        <Link
                          className="button buttonGhost"
                          href={buildReviewQueueHref({ reviewer: reviewer.teacher_id })}
                        >
                          View queue
                        </Link>
                      ) : (
                        <Link
                          className="button buttonGhost"
                          href={buildReviewQueueHref({ assignmentScope: "unassigned", status: "pending" })}
                        >
                          View queue
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="emptyText">No reviewer workload signals yet.</p>
              )}
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Reviewer focus board</span>
            <h3>Act on reviewer hotspots before backlog spreads</h3>
            <div className="weakTopicStack">
              {busiestReviewer ? (
                <div className="weakTopicRow">
                  <div>
                    <strong>Highest active load</strong>
                    <span>
                      {busiestReviewer.teacher_name} is carrying {busiestReviewer.unresolved_count} unresolved task(s).
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <span className={`statusPill ${reviewerPressureTone({
                      unresolvedCount: busiestReviewer.unresolved_count,
                      recheckCount: busiestReviewer.recheck_requested_count,
                      oldestOpenHours: busiestReviewer.oldest_open_hours,
                    })}`}>
                      {busiestReviewer.task_count} total
                    </span>
                  </div>
                </div>
              ) : null}
              {slowestReviewer ? (
                <div className="weakTopicRow">
                  <div>
                    <strong>Oldest reviewer backlog</strong>
                    <span>
                      {slowestReviewer.teacher_name} has the oldest open item at {formatHoursCompact(slowestReviewer.oldest_open_hours)}.
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <span className={`statusPill ${reviewerPressureTone({
                      unresolvedCount: slowestReviewer.unresolved_count,
                      recheckCount: slowestReviewer.recheck_requested_count,
                      oldestOpenHours: slowestReviewer.oldest_open_hours,
                    })}`}>
                      Avg {formatHoursCompact(slowestReviewer.average_turnaround_hours)}
                    </span>
                  </div>
                </div>
              ) : null}
              {recheckHeaviestReviewer ? (
                <div className="weakTopicRow">
                  <div>
                    <strong>Most recheck pressure</strong>
                    <span>
                      {recheckHeaviestReviewer.teacher_name} is currently holding {recheckHeaviestReviewer.recheck_requested_count} recheck task(s).
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <span className={`statusPill ${recheckHeaviestReviewer.recheck_requested_count > 0 ? "statusWarning" : "statusLive"}`}>
                      {recheckHeaviestReviewer.recheck_requested_count} recheck
                    </span>
                  </div>
                </div>
              ) : null}
              {fastestReviewer ? (
                <div className="weakTopicRow">
                  <div>
                    <strong>Fastest completed pace</strong>
                    <span>
                      {fastestReviewer.teacher_name} is closing reviewed work in about {formatHoursCompact(fastestReviewer.average_turnaround_hours)} on average.
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <span className="statusPill statusLive">{fastestReviewer.reviewed_count} reviewed</span>
                  </div>
                </div>
              ) : null}
              {unassignedReviewerLane ? (
                <div className="weakTopicRow">
                  <div>
                    <strong>Unassigned lane</strong>
                    <span>
                      {unassignedReviewerLane.unresolved_count} task(s) still need reviewer routing from the institute side.
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <Link
                      className="button buttonGhost"
                      href={buildReviewQueueHref({ assignmentScope: "unassigned", status: "pending" })}
                    >
                      Route now
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Exam hotspots</span>
            <h3>Find which exams are blocking publication most</h3>
            <div className="weakTopicStack">
              {summary.exams.length ? (
                summary.exams.map((examSummary) => (
                  <div className="weakTopicRow" key={examSummary.exam_id}>
                    <div>
                      <strong>{examSummary.exam_title}</strong>
                      <span>
                        {examSummary.pending_count} pending · {examSummary.recheck_requested_count} recheck · {examSummary.unassigned_count} unassigned
                      </span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{examSummary.task_count}</strong>
                      <span>Oldest {formatHoursCompact(examSummary.oldest_open_hours)}</span>
                      <span className={`statusPill ${riskTone(examSummary.release_risk_level)}`}>
                        {examSummary.release_risk_level} risk
                      </span>
                      <Link
                        className="button buttonGhost"
                        href={buildReviewQueueHref({
                          exam: examSummary.exam_id,
                          assignmentScope,
                          status,
                          reviewer: reviewerFilter,
                        })}
                      >
                        Open queue
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="emptyText">No exam review hotspots detected yet.</p>
              )}
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Backlog aging</span>
            <h3>See whether the queue is fresh or slipping</h3>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>Under 4 hours</strong>
                  <span>Fresh queue items that can still be cleared quickly.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.backlog_age_buckets.under_4h}</strong>
                  <span>Tasks</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>4 to 24 hours</strong>
                  <span>Needs same-day attention to avoid publication drift.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.backlog_age_buckets.under_24h}</strong>
                  <span>Tasks</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>1 to 3 days</strong>
                  <span>Backlog is starting to become operationally visible.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.backlog_age_buckets.under_72h}</strong>
                  <span>Tasks</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Over 3 days</strong>
                  <span>Highest urgency for institute-level intervention.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.backlog_age_buckets.over_72h}</strong>
                  <span>Tasks</span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Throughput trend</span>
            <h3>Compare the last day to the day before</h3>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>Opened in last 24h</strong>
                  <span>New tasks entering the review queue.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.throughput_trend.opened_last_24h}</strong>
                  <span>Prev {summary.throughput_trend.opened_previous_24h}</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Resolved in last 24h</strong>
                  <span>Tasks closed through review or moderation.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.throughput_trend.resolved_last_24h}</strong>
                  <span>Prev {summary.throughput_trend.resolved_previous_24h}</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Net queue change</strong>
                  <span>Positive means backlog grew. Negative means backlog shrank.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{summary.throughput_trend.net_queue_change_last_24h}</strong>
                  <span>Prev {summary.throughput_trend.net_queue_change_previous_24h}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Multi-window history</span>
            <h3>Compare short, medium, and weekly queue pressure</h3>
            <div className="weakTopicStack">
              {summary.throughput_windows.map((window) => (
                <div className="weakTopicRow" key={window.label}>
                  <div>
                    <strong>{window.label}</strong>
                    <span>
                      {window.opened} opened · {window.resolved} resolved
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{window.net_queue_change}</strong>
                    <span>net queue change</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Oldest pending</span>
            <h3>Clear the longest-waiting answers first</h3>
            <div className="weakTopicStack">
              {summary.oldest_pending_tasks.length ? (
                summary.oldest_pending_tasks.map((task) => {
                  return (
                    <div className="weakTopicRow" key={task.task_id}>
                      <div>
                        <strong>{task.student_name}</strong>
                        <span>
                          {task.exam_title} · {task.assigned_to_teacher_name || "Unassigned"} · {formatDateTime(task.opened_at)}
                        </span>
                        <p>{task.question_text_summary}</p>
                      </div>
                      <div className="weakTopicMeta">
                        <span className={`statusPill ${statusTone(task.status)}`}>{task.status.replaceAll("_", " ")}</span>
                        <Link
                          className="button buttonGhost"
                          href={buildReviewQueueHref({
                            exam,
                            reviewer: reviewerFilter,
                            status,
                            search,
                            page,
                            pageSize,
                            task: task.task_id,
                            assignmentScope,
                          })}
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="emptyText">No aging review tasks right now.</p>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="dashboardGrid">
        <section className="contentCard teacherResultsAttemptsCard">
          <div className="sectionHeading">
            <strong>Review tasks</strong>
            <span>
              Page {page} of {totalPages}
            </span>
          </div>
          <div className="resultCardActions">
            <Link
              aria-disabled={page <= 1}
              className={`button ${page <= 1 ? "buttonDisabled" : "buttonGhost"}`}
              href={
                page <= 1
                  ? "#"
                  : buildReviewQueueHref({
                      exam,
                      reviewer: reviewerFilter,
                      status,
                      search,
                      page: page - 1,
                      pageSize,
                      assignmentScope,
                    })
              }
              tabIndex={page <= 1 ? -1 : undefined}
            >
              Previous page
            </Link>
            <Link
              aria-disabled={page >= totalPages}
              className={`button ${page >= totalPages ? "buttonDisabled" : "buttonGhost"}`}
              href={
                page >= totalPages
                  ? "#"
                  : buildReviewQueueHref({
                      exam,
                      reviewer: reviewerFilter,
                      status,
                      search,
                      page: page + 1,
                      pageSize,
                      assignmentScope,
                    })
              }
              tabIndex={page >= totalPages ? -1 : undefined}
            >
              Next page
            </Link>
          </div>
          <form action={runBulkAssignReviewTasksAction} className="workspaceFiltersCard" id="institute-review-bulk-form">
            <input name="status" type="hidden" value={status} />
            <input name="search" type="hidden" value={search} />
            <input name="exam" type="hidden" value={exam} />
            <input name="reviewer" type="hidden" value={reviewerFilter} />
            <input name="assignment_scope" type="hidden" value={assignmentScope} />
            <input name="page" type="hidden" value={String(page)} />
            <input name="page_size" type="hidden" value={String(pageSize)} />
            <div className="sectionHeading">
              <strong>Bulk assign visible tasks</strong>
              <span>Choose tasks from this page, then route, recheck, or close them together</span>
            </div>
            <ReviewTaskBulkSelectionControls
              checkboxName="task_ids"
              formId="institute-review-bulk-form"
              itemCount={taskPage.results.length}
            />
            <div className="teacherExamFilters">
              <label className="fieldStack">
                <span>Reviewer</span>
                <select defaultValue="" name="assigned_to_teacher">
                  <option value="">Return selected tasks to unassigned queue</option>
                  {activeTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fieldStack fieldStackFull">
                <span>Bulk recheck notes</span>
                <textarea
                  name="review_notes"
                  placeholder="Explain why the selected tasks should go back for another grading pass."
                  rows={3}
                />
              </label>
              <div className="resultCardActions">
                <button className="buttonPrimary" type="submit">
                  Apply to selected tasks
                </button>
                <button className="button buttonSecondary" formAction={runBulkRequestRecheckAction} type="submit">
                  Return selected for recheck
                </button>
                <button className="button buttonGhost" formAction={runBulkModerateAction} type="submit">
                  Moderate selected reviewed tasks
                </button>
              </div>
            </div>
          {taskPage.results.length ? (
            <div className="teacherAttemptList">
              {taskPage.results.map((task: PortalReviewTask) => {
                return (
                  <article className="teacherAttemptListCard" key={task.id}>
                    <div className="sectionHeading">
                      <label className="questionBankTagRow" htmlFor={`bulk-task-${task.id}`}>
                        <input id={`bulk-task-${task.id}`} name="task_ids" type="checkbox" value={task.id} />
                        <strong>{task.student_name}</strong>
                      </label>
                      <span className={`statusPill ${statusTone(task.status)}`}>{task.status.replaceAll("_", " ")}</span>
                    </div>
                    <p>{getStudentQuestionPromptTitle(task)}</p>
                    <div className="questionBankTagRow">
                      <span className="questionBankTagChip">{task.exam_title}</span>
                      <span className="questionBankTagChip">{task.question_type.replaceAll("_", " ")}</span>
                      {task.assigned_to_teacher_name ? (
                        <span className="questionBankTagChip">Assigned: {task.assigned_to_teacher_name}</span>
                      ) : (
                        <span className="questionBankTagChip">Unassigned</span>
                      )}
                    </div>
                    <small>Opened {formatDateTime(task.opened_at)}</small>
                    <div className="resultCardActions">
                      <Link
                        className="button buttonSecondary"
                        href={buildReviewQueueHref({
                          exam,
                          reviewer: reviewerFilter,
                          status,
                          search,
                          page,
                          pageSize,
                          task: task.id,
                          assignmentScope,
                        })}
                      >
                        Manage task
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="emptyText">No review tasks match the current filters.</p>
          )}
          </form>
        </section>

        <section className="contentCard teacherAttemptDetailPanel">
          <div className="sectionHeading">
            <strong>{selectedTask ? "Assignment detail" : "No task selected"}</strong>
            {selectedTask ? (
              <span className={`statusPill ${statusTone(selectedTask.status)}`}>
                {selectedTask.status.replaceAll("_", " ")}
              </span>
            ) : null}
          </div>

          {selectedTask ? (
            <>
              <p>{getStudentQuestionPromptTitle(selectedTask)}</p>
              <div className="questionBankTagRow">
                <span className="questionBankTagChip">{selectedTask.student_name}</span>
                <span className="questionBankTagChip">{selectedTask.exam_title}</span>
                <span className="questionBankTagChip">{selectedTask.question_marks} max marks</span>
              </div>

              <StudentQuestionPrompt
                passageBadgeLabel="Shared passage"
                passageButtonLabel="Open Passage"
                passageMetaLabel={selectedTask.passage_detail?.title || "Comprehension"}
                question={selectedTask}
                showPassageTrigger={Boolean(selectedTask.passage_detail?.passage_text)}
              />

              <ReviewGuidancePanel
                questionMarks={selectedTask.question_marks}
                questionText={selectedTask.question_text}
                questionType={selectedTask.question_type}
                questionTypeLabelOverride={selectedTask.question_type_definition?.label ?? null}
                reviewGuidance={selectedTask.review_guidance}
                rubricChecklist={selectedTask.rubric_checklist}
              />

              <ReviewResponseArtifacts
                answerText={selectedTask.answer_text}
                answerTranscript={selectedTask.answer_transcript}
                openedAtLabel={formatDateTime(selectedTask.opened_at)}
                responseArtifacts={selectedTask.response_artifacts}
              />

              <form action={runAssignReviewTaskAction} className="analyticsResultReviewForm">
                <input name="task_id" type="hidden" value={selectedTask.id} />
                <input name="status" type="hidden" value={status} />
                <input name="search" type="hidden" value={search} />
                <input name="exam" type="hidden" value={exam} />
                <input name="reviewer" type="hidden" value={reviewerFilter} />
                <input name="assignment_scope" type="hidden" value={assignmentScope} />
                <input name="page" type="hidden" value={String(page)} />
                <input name="page_size" type="hidden" value={String(pageSize)} />

                <label className="fieldStack">
                  <span>Assign reviewer</span>
                  <select defaultValue={selectedTask.assigned_to_teacher ?? ""} name="assigned_to_teacher">
                    <option value="">No reviewer assigned</option>
                    {activeTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="resultCardActions">
                  <button className="buttonPrimary" type="submit">
                    Save assignment
                  </button>
                </div>
              </form>

              <form action={runRequestRecheckAction} className="analyticsResultReviewForm">
                <input name="task_id" type="hidden" value={selectedTask.id} />
                <input name="status" type="hidden" value={status} />
                <input name="search" type="hidden" value={search} />
                <input name="exam" type="hidden" value={exam} />
                <input name="reviewer" type="hidden" value={reviewerFilter} />
                <input name="assignment_scope" type="hidden" value={assignmentScope} />
                <input name="page" type="hidden" value={String(page)} />
                <input name="page_size" type="hidden" value={String(pageSize)} />
                <label className="fieldStack fieldStackFull">
                  <span>Recheck notes</span>
                  <textarea
                    name="review_notes"
                    placeholder="Explain why this answer should be reviewed again."
                    rows={3}
                  />
                </label>
                <div className="resultCardActions">
                  <button className="button buttonGhost" type="submit">
                    Request Recheck
                  </button>
                </div>
              </form>

              <form action={runModerateReviewTaskAction} className="analyticsResultReviewForm">
                <input name="task_id" type="hidden" value={selectedTask.id} />
                <input name="status" type="hidden" value={status} />
                <input name="search" type="hidden" value={search} />
                <input name="exam" type="hidden" value={exam} />
                <input name="reviewer" type="hidden" value={reviewerFilter} />
                <input name="assignment_scope" type="hidden" value={assignmentScope} />
                <input name="page" type="hidden" value={String(page)} />
                <input name="page_size" type="hidden" value={String(pageSize)} />
                {selectedTask.has_rubric && selectedTask.rubric ? (
                  <div className="fieldStack fieldStackFull">
                    <span>Moderation rubric</span>
                    <TeacherRubricReviewFields
                      criteria={selectedTask.rubric.criteria}
                      initialScores={selectedTask.rubric_scores}
                    />
                  </div>
                ) : (
                  <label className="fieldStack">
                    <span>Moderation marks</span>
                    <input
                      defaultValue={selectedTask.latest_marks_awarded}
                      max={selectedTask.question_marks}
                      min="0"
                      name="marks_awarded"
                      required
                      step="0.01"
                      type="number"
                    />
                  </label>
                )}
                <label className="fieldStack fieldStackFull">
                  <span>Moderation notes</span>
                  <textarea
                    defaultValue={selectedTask.latest_review_summary}
                    name="review_notes"
                    placeholder="Capture the final moderation decision."
                    rows={4}
                  />
                </label>
                <div className="resultCardActions">
                  <button className="button buttonSecondary" type="submit">
                    Moderate Task
                  </button>
                </div>
              </form>

              <div className="sectionHeading">
                <strong>Activity trail</strong>
                <span>{selectedTask.events.length} events</span>
              </div>
              {selectedTask.events.length ? (
                <div className="teacherAttemptList">
                  {selectedTask.events.map((event) => (
                    <article className="teacherAttemptListCard" key={event.id}>
                      <div className="sectionHeading">
                        <strong>{event.event_type.replaceAll("_", " ")}</strong>
                        <span>{formatDateTime(event.created_at)}</span>
                      </div>
                      <div className="questionBankTagRow">
                        {event.from_status ? <span className="questionBankTagChip">From: {event.from_status}</span> : null}
                        {event.to_status ? <span className="questionBankTagChip">To: {event.to_status}</span> : null}
                        {event.actor_teacher_name ? <span className="questionBankTagChip">{event.actor_teacher_name}</span> : null}
                        {event.actor_user_name ? <span className="questionBankTagChip">{event.actor_user_name}</span> : null}
                        {event.marks_awarded ? <span className="questionBankTagChip">Marks: {event.marks_awarded}</span> : null}
                      </div>
                      {event.notes ? <p>{event.notes}</p> : null}
                      <ReviewRubricHistory metadata={event.metadata} />
                    </article>
                  ))}
                </div>
              ) : (
                <p className="emptyText">No task activity recorded yet.</p>
              )}
            </>
          ) : (
            <p className="emptyText">Select a task from the left to manage reviewer assignment.</p>
          )}
        </section>
      </section>
    </section>
  );
}
