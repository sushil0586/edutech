import { redirect, unstable_rethrow } from "next/navigation";
import { OperatorWorkspaceLink as Link } from "@/components/ui/operator-workspace-link";
import { ReviewGuidancePanel } from "@/components/ui/review-guidance-panel";
import { ReviewRubricHistory } from "@/components/ui/review-rubric-history";
import { ReviewResponseArtifacts } from "@/components/ui/review-response-artifacts";
import {
  getStudentQuestionPromptTitle,
  StudentQuestionPrompt,
} from "@/components/ui/student-question-prompt";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { TeacherRubricReviewFields } from "@/components/ui/teacher-rubric-review-fields";
import {
  claimNextTeacherReviewTask,
  assignTeacherReviewTaskToMe,
  fetchTeacherReviewTaskDetail,
  fetchTeacherReviewTaskPage,
  fetchTeacherReviewTaskSummary,
  submitTeacherReviewTask,
} from "@/lib/api/teacher";
import { requireTeacherSession } from "@/lib/auth/session";

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

function statusTone(status: string) {
  if (status === "reviewed") return "statusLive";
  if (status === "in_review" || status === "assigned") return "statusDemo";
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

function buildTeacherReviewQueueHref(options: {
  exam?: string;
  status?: string;
  search?: string;
  task?: string;
  page?: number | string;
  pageSize?: number | string;
}) {
  const params = new URLSearchParams();
  if (options.exam) params.set("exam", options.exam);
  if (options.status && options.status !== "all") params.set("status", options.status);
  if (options.search) params.set("search", options.search);
  if (options.task) params.set("task", options.task);
  if (options.page && String(options.page) !== "1") params.set("page", String(options.page));
  if (options.pageSize && String(options.pageSize) !== "12") params.set("page_size", String(options.pageSize));
  return `/teacher/reviews${params.size ? `?${params.toString()}` : ""}`;
}

function buildActiveTeacherReviewControlSummary(args: {
  exam?: string;
  status: string;
  search?: string;
  pageSize: number;
}) {
  const items: string[] = [];

  if (args.exam) items.push("scoped to one exam");
  if (args.status !== "all") items.push(`status: ${args.status.replaceAll("_", " ")}`);
  if (args.search) items.push(`search: ${args.search}`);
  if (args.pageSize !== 12) items.push(`page size: ${args.pageSize} tasks`);

  return items;
}

function renderTeacherReviewPagerControl(args: {
  disabled: boolean;
  href: string;
  label: string;
}) {
  if (args.disabled) {
    return (
      <span aria-disabled="true" className="button buttonDisabled">
        {args.label}
      </span>
    );
  }

  return (
    <Link className="button buttonGhost" href={args.href}>
      {args.label}
    </Link>
  );
}

async function runReviewTaskSubmitAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const taskId = String(formData.get("task_id") ?? "").trim();
  const marksAwarded = String(formData.get("marks_awarded") ?? "").trim();
  const reviewNotes = String(formData.get("review_notes") ?? "").trim();
  const rubricScoresRaw = String(formData.get("rubric_scores_json") ?? "").trim();
  const status = String(formData.get("status") ?? "all").trim() || "all";
  const search = String(formData.get("search") ?? "").trim();
  const exam = String(formData.get("exam") ?? "").trim();
  const page = String(formData.get("page") ?? "1").trim() || "1";
  const pageSize = String(formData.get("page_size") ?? "12").trim() || "12";
  const postSubmitAction = String(formData.get("post_submit_action") ?? "stay").trim() || "stay";

  const params = new URLSearchParams();
  params.set("status", status);
  if (search) params.set("search", search);
  if (exam) params.set("exam", exam);
  params.set("page", page);
  params.set("page_size", pageSize);
  if (taskId) params.set("task", taskId);

  if (!taskId || !marksAwarded) {
    params.set("error", "Select a review task and enter awarded marks.");
    redirect(`/teacher/reviews?${params.toString()}`);
  }

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
      redirect(`/teacher/reviews?${params.toString()}`);
    }
  }

  try {
    const response = await submitTeacherReviewTask(taskId, {
      marks_awarded: marksAwarded,
      review_notes: reviewNotes,
      rubric_scores: rubricScores,
    });
    if (postSubmitAction === "next") {
      try {
        const nextResponse = await claimNextTeacherReviewTask();
        const claimedTaskId = nextResponse.data?.id;
        if (claimedTaskId) {
          params.set("task", claimedTaskId);
        } else {
          params.delete("task");
        }
        params.set(
          "message",
          claimedTaskId
            ? "Review saved and next task is ready."
            : response.message ?? "Review saved successfully.",
        );
      } catch (claimError) {
        unstable_rethrow(claimError);
        params.set("message", "Review saved. No next task could be claimed right now.");
      }
    } else {
      params.set("message", response.message ?? "Review saved successfully.");
    }
    redirect(`/teacher/reviews?${params.toString()}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to save the review right now.";
    params.set("error", message);
    redirect(`/teacher/reviews?${params.toString()}`);
  }
}

async function runAssignToMeAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const taskId = String(formData.get("task_id") ?? "").trim();
  const status = String(formData.get("status") ?? "all").trim() || "all";
  const search = String(formData.get("search") ?? "").trim();
  const exam = String(formData.get("exam") ?? "").trim();
  const page = String(formData.get("page") ?? "1").trim() || "1";
  const pageSize = String(formData.get("page_size") ?? "12").trim() || "12";

  const params = new URLSearchParams();
  params.set("status", status);
  if (search) params.set("search", search);
  if (exam) params.set("exam", exam);
  params.set("page", page);
  params.set("page_size", pageSize);
  if (taskId) params.set("task", taskId);

  if (!taskId) {
    params.set("error", "Select a review task before assigning it.");
    redirect(`/teacher/reviews?${params.toString()}`);
  }

  try {
    await assignTeacherReviewTaskToMe(taskId);
    params.set("message", "Review task assigned to you.");
    redirect(`/teacher/reviews?${params.toString()}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to assign this review task right now.";
    params.set("error", message);
    redirect(`/teacher/reviews?${params.toString()}`);
  }
}

async function runClaimNextAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const status = String(formData.get("status") ?? "all").trim() || "all";
  const search = String(formData.get("search") ?? "").trim();
  const exam = String(formData.get("exam") ?? "").trim();
  const page = String(formData.get("page") ?? "1").trim() || "1";
  const pageSize = String(formData.get("page_size") ?? "12").trim() || "12";

  const params = new URLSearchParams();
  params.set("status", status);
  if (search) params.set("search", search);
  if (exam) params.set("exam", exam);
  params.set("page", page);
  params.set("page_size", pageSize);

  try {
    const response = await claimNextTeacherReviewTask();
    const claimedTaskId = response.data?.id;
    if (claimedTaskId) {
      params.set("task", claimedTaskId);
    }
    params.set("message", response.message ?? "Next review task claimed successfully.");
    redirect(`/teacher/reviews?${params.toString()}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to claim the next review task right now.";
    params.set("error", message);
    redirect(`/teacher/reviews?${params.toString()}`);
  }
}

export default async function TeacherReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireTeacherSession();
  const resolvedSearchParams = await searchParams;
  const page = asPositiveInteger(readSingle(resolvedSearchParams.page), 1);
  const pageSize = clampReviewPageSize(readSingle(resolvedSearchParams.page_size));
  const status = readSingle(resolvedSearchParams.status) || "all";
  const search = readSingle(resolvedSearchParams.search);
  const exam = readSingle(resolvedSearchParams.exam);
  const selectedTaskId = readSingle(resolvedSearchParams.task);
  const error = readSingle(resolvedSearchParams.error);
  const message = readSingle(resolvedSearchParams.message);

  const [summaryResult, taskPageResult] = await Promise.allSettled([
    fetchTeacherReviewTaskSummary({ status, search, exam }),
    fetchTeacherReviewTaskPage({ page, pageSize, status, search, exam }),
  ]);

  if (summaryResult.status !== "fulfilled" || taskPageResult.status !== "fulfilled") {
    return (
      <div className="teacherConsolePage">
        <StudentStatePanel
          eyebrow="Reviewer workflow"
          title="Review queue is not available yet"
          description="Sign in with your teacher account to load review tasks."
          bullets={[
            "Teacher sign-in",
            "Review task summary",
            "Review task list",
          ]}
          ctaHref="/teacher/results"
          ctaLabel="Open Results"
        />
      </div>
    );
  }

  const summary = summaryResult.value;
  const taskPage = taskPageResult.value;
  const myReviewerSummary =
    summary.reviewers.find((reviewer) => reviewer.teacher_id === profile.teacher_profile) ?? null;
  const teacherTaskInView =
    taskPage.results.find(
      (task) =>
        task.assigned_to_teacher === profile.teacher_profile &&
        ["assigned", "in_review", "recheck_requested"].includes(task.status),
    ) ?? null;
  const claimableTaskInView =
    teacherTaskInView ?? taskPage.results.find((task) => !task.assigned_to_teacher && task.status === "pending") ?? null;
  const totalPages = Math.max(1, Math.ceil(taskPage.count / pageSize));
  const pageStart = taskPage.count === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(taskPage.count, page * pageSize);
  const selectedTask =
    selectedTaskId && taskPage.results.some((task) => task.id === selectedTaskId)
      ? await fetchTeacherReviewTaskDetail(selectedTaskId).catch(() => null)
      : taskPage.results[0]
        ? await fetchTeacherReviewTaskDetail(taskPage.results[0].id).catch(() => null)
        : null;
  const hasActiveQueueControls = Boolean(exam || status !== "all" || search || pageSize !== 12);
  const activeTeacherReviewControlSummary = buildActiveTeacherReviewControlSummary({
    exam,
    status,
    search,
    pageSize,
  });
  const isTrueReviewQueueEmpty = summary.total === 0 && !hasActiveQueueControls;
  const isFilteredReviewQueueEmpty = taskPage.results.length === 0 && hasActiveQueueControls;

  return (
    <div className="teacherConsolePage">
      <TeacherPageHeader
        title="Review Queue"
        description="Score descriptive and essay responses before publication slows down."
        contextLabel="Teacher review workspace"
        statusLabel={`${summary.pending} pending`}
        statusTone={summary.pending > 0 ? "warning" : "live"}
        action={
          <div className="resultCardActions">
            <form action={runClaimNextAction}>
              <input name="status" type="hidden" value={status} />
              <input name="search" type="hidden" value={search} />
              <input name="exam" type="hidden" value={exam} />
              <input name="page" type="hidden" value={String(page)} />
              <input name="page_size" type="hidden" value={String(pageSize)} />
              <button className="button buttonPrimary" type="submit">
                {teacherTaskInView ? "Resume My Next Task" : "Claim Next Task"}
              </button>
            </form>
            <Link className="button buttonSecondary" href={exam ? `/teacher/results?exam=${encodeURIComponent(exam)}` : "/teacher/results"}>
              View Results
            </Link>
          </div>
        }
      />

      {error ? <div className="formNotice formNoticeError">{error}</div> : null}
      {message ? <div className="formNotice formNoticeSuccess">{message}</div> : null}
      {exam ? (
        <section className="contentCard workspaceFiltersCard">
          <div className="sectionHeading">
            <strong>Exam-scoped review queue</strong>
            <span>Stay inside the same release workflow</span>
          </div>
          <div className="resultCardActions">
            <Link className="button buttonPrimary" href={`/teacher/exams/${encodeURIComponent(exam)}`}>
              View Exam
            </Link>
            <Link className="button buttonSecondary" href={`/teacher/results?exam=${encodeURIComponent(exam)}`}>
              View Results
            </Link>
            <Link className="button buttonGhost" href={buildTeacherReviewQueueHref({})}>
              Clear Scope
            </Link>
          </div>
        </section>
      ) : null}

      <section className="dashboardGrid">
        <article className="contentCard teacherResultsOverviewCard">
          <div className="sectionHeading">
            <strong>Pending</strong>
            <span className="statusPill statusWarning">{summary.pending}</span>
          </div>
          <p>Answers still waiting for grading.</p>
          <div className="resultCardActions">
            <Link
              className="button buttonGhost"
              href={buildTeacherReviewQueueHref({ exam, status: "pending", search, pageSize })}
            >
              View pending
            </Link>
          </div>
        </article>
        <article className="contentCard teacherResultsOverviewCard">
          <div className="sectionHeading">
            <strong>Reviewed</strong>
            <span className="statusPill statusLive">{summary.reviewed}</span>
          </div>
          <p>Tasks already resolved and synced into scoring.</p>
          <div className="resultCardActions">
            <Link
              className="button buttonGhost"
              href={buildTeacherReviewQueueHref({ exam, status: "reviewed", search, pageSize })}
            >
              View reviewed
            </Link>
          </div>
        </article>
        <article className="contentCard teacherResultsOverviewCard">
          <div className="sectionHeading">
            <strong>Unassigned</strong>
            <span className="statusPill statusDemo">{summary.unassigned}</span>
          </div>
          <p>Tasks that still need an owner.</p>
          <div className="resultCardActions">
            <form action={runClaimNextAction}>
              <input name="status" type="hidden" value={status} />
              <input name="search" type="hidden" value={search} />
              <input name="exam" type="hidden" value={exam} />
              <input name="page" type="hidden" value={String(page)} />
              <input name="page_size" type="hidden" value={String(pageSize)} />
              <button className="button buttonGhost" type="submit">
                Claim next
              </button>
            </form>
          </div>
        </article>
        <article className="contentCard teacherResultsOverviewCard">
          <div className="sectionHeading">
            <strong>Recheck</strong>
            <span className="statusPill statusWarning">{summary.recheck_requested}</span>
          </div>
          <p>Tasks returned for another scoring pass.</p>
        </article>
        <article className="contentCard teacherResultsOverviewCard">
          <div className="sectionHeading">
            <strong>Avg turnaround</strong>
            <span className="statusPill statusLive">{formatHoursCompact(summary.average_turnaround_hours)}</span>
          </div>
          <p>Average time from task creation to completed grading.</p>
        </article>
        <article className="contentCard teacherResultsOverviewCard">
          <div className="sectionHeading">
            <strong>Oldest open</strong>
            <span className="statusPill statusDemo">{formatHoursCompact(summary.oldest_open_hours)}</span>
          </div>
          <p>Longest unresolved task still in the queue.</p>
        </article>
        <article className="contentCard teacherResultsOverviewCard">
          <div className="sectionHeading">
            <strong>24h queue trend</strong>
            <span className={`statusPill ${summary.throughput_trend.direction === "worsening" ? "statusWarning" : summary.throughput_trend.direction === "improving" ? "statusLive" : "statusDemo"}`}>
              {summary.throughput_trend.direction}
            </span>
          </div>
          <p>
            {summary.throughput_trend.opened_last_24h} opened vs {summary.throughput_trend.resolved_last_24h} resolved in
            the last day.
          </p>
        </article>
        <article className="contentCard teacherResultsOverviewCard">
          <div className="sectionHeading">
            <strong>My queue load</strong>
            <span
              className={`statusPill ${
                reviewerPressureTone({
                  unresolvedCount: myReviewerSummary?.unresolved_count ?? 0,
                  recheckCount: myReviewerSummary?.recheck_requested_count ?? 0,
                  oldestOpenHours: myReviewerSummary?.oldest_open_hours ?? 0,
                })
              }`}
            >
              {myReviewerSummary?.unresolved_count ?? 0} unresolved
            </span>
          </div>
          <p>
            {myReviewerSummary
              ? `${myReviewerSummary.recheck_requested_count} recheck task(s), oldest open ${formatHoursCompact(
                  myReviewerSummary.oldest_open_hours,
                )}.`
              : "No reviewer-specific queue metrics are available yet for your account."}
          </p>
        </article>
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>My review focus</strong>
            <span>{myReviewerSummary ? "Personal pace board" : "Waiting on reviewed work"}</span>
          </div>
          <div className="weakTopicStack">
            <div className="weakTopicRow">
              <div>
                <strong>Current unresolved work</strong>
                <span>Answers still sitting in your live review lane.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{myReviewerSummary?.unresolved_count ?? 0}</strong>
                <span>Tasks</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Average turnaround</strong>
                <span>Your average time from task opening to completed review.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{formatHoursCompact(myReviewerSummary?.average_turnaround_hours ?? 0)}</strong>
                <span>{myReviewerSummary?.reviewed_count ?? 0} reviewed</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Recheck pressure</strong>
                <span>Tasks returned for another scoring pass or moderation follow-up.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{myReviewerSummary?.recheck_requested_count ?? 0}</strong>
                <span>Recheck</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Oldest open item</strong>
                <span>The task that most needs your next review action.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{formatHoursCompact(myReviewerSummary?.oldest_open_hours ?? 0)}</strong>
                <span>Oldest</span>
              </div>
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Release risk</strong>
            <span>{summary.blocked_exams} blocked exam(s)</span>
          </div>
          <div className="weakTopicStack">
            <div className="weakTopicRow">
              <div>
                <strong>High risk</strong>
                <span>Needs immediate closure before publication windows slip.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.release_risk_summary.high_risk_exams}</strong>
                <span>Exams</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Medium risk</strong>
                <span>Watch closely before backlog becomes severe.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.release_risk_summary.medium_risk_exams}</strong>
                <span>Exams</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Low risk</strong>
                <span>Queue exists but is still manageable right now.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.release_risk_summary.low_risk_exams}</strong>
                <span>Exams</span>
              </div>
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Backlog aging</strong>
            <span>{summary.blocked_exams} blocked exam(s)</span>
          </div>
          <div className="weakTopicStack">
            <div className="weakTopicRow">
              <div>
                <strong>Under 4 hours</strong>
                <span>Fresh tasks that can usually be cleared in the same review cycle.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.backlog_age_buckets.under_4h}</strong>
                <span>Tasks</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>4 to 24 hours</strong>
                <span>Tasks that need attention before they become visible backlog.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.backlog_age_buckets.under_24h}</strong>
                <span>Tasks</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>1 to 3 days</strong>
                <span>Queue pressure is building and may affect publication timelines.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.backlog_age_buckets.under_72h}</strong>
                <span>Tasks</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Over 3 days</strong>
                <span>Highest urgency items for direct follow-through.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.backlog_age_buckets.over_72h}</strong>
                <span>Tasks</span>
              </div>
            </div>
          </div>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Exam hotspots</strong>
            <span>{summary.exams.length} exams in view</span>
          </div>
          <div className="weakTopicStack">
            {summary.exams.length ? (
              summary.exams.map((examSummary) => (
                <div className="weakTopicRow" key={examSummary.exam_id}>
                  <div>
                    <strong>{examSummary.exam_title}</strong>
                    <span>
                      {examSummary.pending_count} pending · {examSummary.recheck_requested_count} recheck · {examSummary.in_review_count} in review
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{examSummary.task_count}</strong>
                    <span>Oldest {formatHoursCompact(examSummary.oldest_open_hours)}</span>
                    <span className={`statusPill ${riskTone(examSummary.release_risk_level)}`}>
                      {examSummary.release_risk_level} risk
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">No exam review hotspots are visible right now.</p>
            )}
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Throughput trend</strong>
            <span>{summary.throughput_trend.direction}</span>
          </div>
          <div className="weakTopicStack">
            <div className="weakTopicRow">
              <div>
                <strong>Opened in last 24h</strong>
                <span>New tasks entering this review queue.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.throughput_trend.opened_last_24h}</strong>
                <span>Prev {summary.throughput_trend.opened_previous_24h}</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Resolved in last 24h</strong>
                <span>Tasks closed through review completion.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.throughput_trend.resolved_last_24h}</strong>
                <span>Prev {summary.throughput_trend.resolved_previous_24h}</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Net queue change</strong>
                <span>Positive means the backlog grew. Negative means you caught up.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{summary.throughput_trend.net_queue_change_last_24h}</strong>
                <span>Prev {summary.throughput_trend.net_queue_change_previous_24h}</span>
              </div>
            </div>
          </div>
        </article>
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Multi-window history</strong>
            <span>{summary.throughput_windows.length} windows</span>
          </div>
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
        </article>
      </section>

      <section className="contentCard workspaceFiltersCard">
        <div className="sectionHeading">
          <strong>Quick triage</strong>
          <span>One-click grading views</span>
        </div>
        <div className="questionBankTagRow">
          <Link className="button buttonGhost" href={buildTeacherReviewQueueHref({ exam, search, pageSize })}>
            All tasks
          </Link>
          <Link
            className="button buttonGhost"
            href={buildTeacherReviewQueueHref({ exam, status: "pending", search, pageSize })}
          >
            Pending
          </Link>
          <Link
            className="button buttonGhost"
            href={buildTeacherReviewQueueHref({ exam, status: "assigned", search, pageSize })}
          >
            Assigned
          </Link>
          <Link
            className="button buttonGhost"
            href={buildTeacherReviewQueueHref({ exam, status: "in_review", search, pageSize })}
          >
            In review
          </Link>
          <Link
            className="button buttonGhost"
            href={buildTeacherReviewQueueHref({ exam, status: "reviewed", search, pageSize })}
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
        <div className="teacherResultsReadinessCard">
          <div className="teacherResultsReadinessCardTop">
            <strong>How to work this queue</strong>
            <span className="statusPill statusDemo">Reviewer flow</span>
          </div>
          <ul>
            <li>Start with `Pending` when you want fresh review work.</li>
            <li>Use `In review` to return to answers you already opened but did not close.</li>
            <li>Use exam scope when one exam needs focused publication support.</li>
          </ul>
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
            <span>Page size</span>
            <select defaultValue={String(pageSize)} name="page_size">
              <option value="12">12 tasks</option>
              <option value="24">24 tasks</option>
              <option value="48">48 tasks</option>
            </select>
          </label>
          <div className="resultCardActions">
            <button className="buttonPrimary" type="submit">
              Update view
            </button>
            <Link className="button buttonGhost" href={buildTeacherReviewQueueHref({ exam })}>
              Reset
            </Link>
          </div>
        </form>
        {exam || status !== "all" || search || pageSize !== 12 ? (
          <div className="questionBankTagRow">
            {exam ? <span className="questionBankTagChip">Scoped to selected exam</span> : null}
            {status !== "all" ? <span className="questionBankTagChip">Status: {status.replaceAll("_", " ")}</span> : null}
            {search ? <span className="questionBankTagChip">Search: {search}</span> : null}
            {pageSize !== 12 ? <span className="questionBankTagChip">Page size: {pageSize} tasks</span> : null}
            {exam ? (
              <Link className="button buttonGhost" href={buildTeacherReviewQueueHref({})}>
                Clear exam scope
              </Link>
            ) : null}
            <Link className="button buttonGhost" href={buildTeacherReviewQueueHref({ exam })}>
              Clear filters
            </Link>
          </div>
        ) : null}
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
            {claimableTaskInView ? (
              <form action={runClaimNextAction}>
                <input name="status" type="hidden" value={status} />
                <input name="search" type="hidden" value={search} />
                <input name="exam" type="hidden" value={exam} />
                <input name="page" type="hidden" value={String(page)} />
                <input name="page_size" type="hidden" value={String(pageSize)} />
                <button className="button buttonSecondary" type="submit">
                  {teacherTaskInView ? "Resume my next task" : "Claim next visible task"}
                </button>
              </form>
            ) : null}
            {renderTeacherReviewPagerControl({
              disabled: page <= 1,
              href: buildTeacherReviewQueueHref({
                exam,
                status,
                search,
                page: page - 1,
                pageSize,
              }),
              label: "Previous page",
            })}
            {renderTeacherReviewPagerControl({
              disabled: page >= totalPages,
              href: buildTeacherReviewQueueHref({
                exam,
                status,
                search,
                page: page + 1,
                pageSize,
              }),
              label: "Next page",
            })}
          </div>
          {taskPage.results.length ? (
            <div className="teacherAttemptList">
              {taskPage.results.map((task) => {
                return (
                  <article className="teacherAttemptListCard" key={task.id}>
                    <div className="sectionHeading">
                      <strong>{task.student_name}</strong>
                      <span className={`statusPill ${statusTone(task.status)}`}>{task.status.replaceAll("_", " ")}</span>
                    </div>
                    <p>{getStudentQuestionPromptTitle(task)}</p>
                    <div className="questionBankTagRow">
                      <span className="questionBankTagChip">{task.exam_title}</span>
                      <span className="questionBankTagChip">{task.question_type.replaceAll("_", " ")}</span>
                      <span className="questionBankTagChip">{task.question_marks} marks</span>
                    </div>
                    <small>Opened {formatDateTime(task.opened_at)}</small>
                    <div className="resultCardActions">
                      <Link
                        className="button buttonSecondary"
                        href={buildTeacherReviewQueueHref({
                          exam,
                          status,
                          search,
                          page,
                          pageSize,
                          task: task.id,
                        })}
                      >
                        Review task
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : isFilteredReviewQueueEmpty ? (
            <div className="builderHintPanel">
              <strong>No review tasks match these filters.</strong>
              <p>
                Active controls are shaping this empty state. This is a filtered queue view, not a missing-data problem.
              </p>
              {activeTeacherReviewControlSummary.length ? (
                <div className="questionBankTagRow">
                  {activeTeacherReviewControlSummary.map((item) => (
                    <span className="questionBankTagChip" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="resultCardActions" style={{ marginTop: 12 }}>
                <Link className="button buttonSecondary" href={buildTeacherReviewQueueHref({ exam })}>
                  Reset Filters And Show Full Queue
                </Link>
              </div>
            </div>
          ) : isTrueReviewQueueEmpty ? (
            <div className="builderHintPanel">
              <strong>Your review queue is empty right now.</strong>
              <p>
                Descriptive or rubric-based responses will appear here after students submit answers that need teacher
                review.
              </p>
              <div className="resultCardActions" style={{ marginTop: 12 }}>
                <Link className="button buttonSecondary" href="/teacher/exams">
                  View Exams
                </Link>
                <Link className="button buttonGhost" href="/teacher/results">
                  View Results
                </Link>
              </div>
            </div>
          ) : (
            <p className="emptyText">No review tasks match the current filters.</p>
          )}
        </section>

        <section className="contentCard teacherAttemptDetailPanel">
          <div className="sectionHeading">
            <strong>{selectedTask ? "Task detail" : "No task selected"}</strong>
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
                {selectedTask.assigned_to_teacher_name ? (
                  <span className="questionBankTagChip">Assigned: {selectedTask.assigned_to_teacher_name}</span>
                ) : (
                  <span className="questionBankTagChip">Unassigned</span>
                )}
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

              <form action={runReviewTaskSubmitAction} className="analyticsResultReviewForm">
                <input name="task_id" type="hidden" value={selectedTask.id} />
                <input name="status" type="hidden" value={status} />
                <input name="search" type="hidden" value={search} />
                <input name="exam" type="hidden" value={exam} />
                <input name="page" type="hidden" value={String(page)} />
                <input name="page_size" type="hidden" value={String(pageSize)} />

                {selectedTask.has_rubric && selectedTask.rubric ? (
                  <div className="fieldStack fieldStackFull">
                    <span>Criterion scoring</span>
                    <TeacherRubricReviewFields
                      criteria={selectedTask.rubric.criteria}
                      initialScores={selectedTask.rubric_scores}
                    />
                  </div>
                ) : (
                  <label className="fieldStack">
                    <span>Marks awarded</span>
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
                  <span>Review notes</span>
                  <textarea
                    defaultValue={selectedTask.latest_review_summary}
                    name="review_notes"
                    placeholder="Capture reviewer notes, rubric observations, or improvement advice."
                    rows={5}
                  />
                </label>

                <div className="resultCardActions">
                  <button className="buttonPrimary" name="post_submit_action" type="submit" value="stay">
                    {selectedTask.status === "reviewed" ? "Update review" : "Save review"}
                  </button>
                  <button className="button buttonSecondary" name="post_submit_action" type="submit" value="next">
                    Save and open next
                  </button>
                </div>
              </form>

              {!selectedTask.assigned_to_teacher ? (
                <form action={runAssignToMeAction} className="resultCardActions">
                  <input name="task_id" type="hidden" value={selectedTask.id} />
                  <input name="status" type="hidden" value={status} />
                  <input name="search" type="hidden" value={search} />
                  <input name="exam" type="hidden" value={exam} />
                  <input name="page" type="hidden" value={String(page)} />
                  <input name="page_size" type="hidden" value={String(pageSize)} />
                  <button className="button buttonSecondary" type="submit">
                    Assign To Me
                  </button>
                </form>
              ) : null}

              <div className="sectionHeading">
                <strong>Review history</strong>
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
                        {event.marks_awarded ? <span className="questionBankTagChip">Marks: {event.marks_awarded}</span> : null}
                        {event.actor_teacher_name ? <span className="questionBankTagChip">{event.actor_teacher_name}</span> : null}
                        {event.actor_user_name ? <span className="questionBankTagChip">{event.actor_user_name}</span> : null}
                      </div>
                      {event.notes ? <p>{event.notes}</p> : null}
                      <ReviewRubricHistory metadata={event.metadata} />
                    </article>
                  ))}
                </div>
              ) : (
                <p className="emptyText">No review history recorded yet.</p>
              )}
            </>
          ) : isFilteredReviewQueueEmpty ? (
            <div className="builderHintPanel">
              <strong>No task detail is available in this filtered view.</strong>
              <p>Clear or widen the current review controls to bring one or more tasks back into the queue.</p>
            </div>
          ) : (
            <p className="emptyText">Select a review task from the left to start grading.</p>
          )}
        </section>
      </section>
    </div>
  );
}
