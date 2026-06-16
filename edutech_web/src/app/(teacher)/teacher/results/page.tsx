import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveMonitorRefresh } from "@/components/ui/live-monitor-refresh";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import type { TeacherResultSummary } from "@/features/dashboard/types";
import {
  createTeacherAttemptInterventionNote,
  calculateTeacherExamRanks,
  fetchTeacherAttemptInterventions,
  fetchTeacherExams,
  fetchTeacherExamAttempts,
  fetchTeacherExamLeaderboard,
  fetchTeacherLiveExamMonitor,
  fetchTeacherQuestionAnalysis,
  fetchTeacherResultSummary,
  fetchTeacherTopicPerformance,
  forceSubmitTeacherAttempt,
  generateTeacherResultsForExam,
  publishTeacherExamResults,
  runTeacherExamAction,
} from "@/lib/api/teacher";
import { requireTeacherSession } from "@/lib/auth/session";

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function percentage(value: string | number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : "0%";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatDuration(totalSeconds: number | null) {
  if (!totalSeconds || totalSeconds <= 0) {
    return "N/A";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function latestIntegrityLabel(eventType: string | null | undefined) {
  if (!eventType) {
    return "No integrity events";
  }
  return eventType.replaceAll("_", " ");
}

function attemptTone(alertSeverity: string | undefined) {
  if (alertSeverity === "high") return "statusWarning";
  if (alertSeverity === "medium") return "statusDemo";
  return "statusLive";
}

type AttemptHealth = "critical" | "watch" | "stable";

function attemptHealth(attempt: {
  status: string;
  is_auto_submitted: boolean;
  integrity_summary: {
    threshold_reached: boolean;
    violation_count: number;
  };
  alerts: Array<{ severity: string }>;
}) {
  if (
    attempt.is_auto_submitted ||
    attempt.integrity_summary.threshold_reached ||
    attempt.alerts.some((alert) => alert.severity === "high")
  ) {
    return "critical" as const;
  }

  if (
    attempt.integrity_summary.violation_count > 0 ||
    attempt.alerts.some((alert) => alert.severity === "medium") ||
    attempt.status === "in_progress"
  ) {
    return "watch" as const;
  }

  return "stable" as const;
}

function healthLabel(health: AttemptHealth) {
  if (health === "critical") return "Intervene now";
  if (health === "watch") return "Watch closely";
  return "Stable";
}

function healthTone(health: AttemptHealth) {
  if (health === "critical") return "statusWarning";
  if (health === "watch") return "statusDemo";
  return "statusLive";
}

function healthReason(attempt: {
  status: string;
  is_auto_submitted: boolean;
  integrity_summary: {
    threshold_reached: boolean;
    violation_count: number;
    latest_event: { event_type?: string | null } | null;
  };
  alerts: Array<{ severity: string; label: string }>;
}) {
  if (attempt.is_auto_submitted) {
    return "Attempt was auto-submitted after enforcement.";
  }
  if (attempt.integrity_summary.threshold_reached) {
    return "Integrity threshold has been reached.";
  }
  const highAlert = attempt.alerts.find((alert) => alert.severity === "high");
  if (highAlert) {
    return highAlert.label;
  }
  if (attempt.integrity_summary.violation_count > 0) {
    return `Warnings recorded: ${attempt.integrity_summary.violation_count}. Latest: ${latestIntegrityLabel(
      attempt.integrity_summary.latest_event?.event_type,
    )}.`;
  }
  if (attempt.status === "in_progress") {
    return "Attempt is still in progress and should remain visible.";
  }
  return "No active risk signals returned from monitoring.";
}

function healthPriorityScore(attempt: {
  status: string;
  is_auto_submitted: boolean;
  integrity_summary: {
    threshold_reached: boolean;
    violation_count: number;
  };
  alerts: Array<{ severity: string }>;
}) {
  let score = 0;
  if (attempt.is_auto_submitted) score += 100;
  if (attempt.integrity_summary.threshold_reached) score += 80;
  if (attempt.alerts.some((alert) => alert.severity === "high")) score += 60;
  if (attempt.alerts.some((alert) => alert.severity === "medium")) score += 30;
  score += Math.min(attempt.integrity_summary.violation_count, 10) * 5;
  if (attempt.status === "in_progress") score += 10;
  return score;
}

function recommendedTeacherAction(attempt: {
  status: string;
  can_force_submit: boolean;
  is_auto_submitted: boolean;
  integrity_summary: {
    threshold_reached: boolean;
    violation_count: number;
    remaining_before_action: number | null;
  };
  alerts: Array<{ severity: string }>;
}) {
  if (attempt.is_auto_submitted) {
    return "Review the auto-submitted attempt and record whether the integrity action was expected.";
  }
  if (attempt.integrity_summary.threshold_reached) {
    return attempt.can_force_submit
      ? "Inspect immediately and decide whether to force-submit before the student continues."
      : "Inspect immediately and review why the attempt is still active despite threshold pressure.";
  }
  if (attempt.alerts.some((alert) => alert.severity === "high")) {
    return attempt.can_force_submit
      ? "Contact or inspect the student now. Force-submit is available if the exam policy must be enforced."
      : "Inspect the attempt now and verify whether the student can continue safely.";
  }
  if (attempt.integrity_summary.violation_count > 0) {
    return `Monitor closely. ${
      attempt.integrity_summary.remaining_before_action ?? 0
    } warning slots remain before automatic action.`;
  }
  if (attempt.status === "in_progress") {
    return "Keep this attempt visible in routine monitoring until it is submitted.";
  }
  return "No urgent teacher action is suggested from the current live signals.";
}

function followUpLabel(attempt: {
  can_force_submit: boolean;
  is_auto_submitted: boolean;
  integrity_summary: { threshold_reached: boolean };
}) {
  if (attempt.is_auto_submitted) return "Post-event review";
  if (attempt.integrity_summary.threshold_reached) return "Immediate intervention";
  if (attempt.can_force_submit) return "Force-submit available";
  return "Observe and document";
}

function accommodationLabel(attempt: {
  accommodation_snapshot: {
    has_accommodations: boolean;
    applied_extra_time_minutes: number;
    additional_violation_allowance: number;
    simplified_warning_copy: boolean;
    alternative_instructions: string;
  };
}) {
  if (!attempt.accommodation_snapshot.has_accommodations) {
    return "Standard rules";
  }

  if (attempt.accommodation_snapshot.applied_extra_time_minutes > 0) {
    return `+${attempt.accommodation_snapshot.applied_extra_time_minutes} min support`;
  }

  if (attempt.accommodation_snapshot.additional_violation_allowance > 0) {
    return `+${attempt.accommodation_snapshot.additional_violation_allowance} warning allowance`;
  }

  if (attempt.accommodation_snapshot.simplified_warning_copy) {
    return "Simplified warning copy";
  }

  if (attempt.accommodation_snapshot.alternative_instructions) {
    return "Alternative instructions";
  }

  return "Accommodation active";
}

function evaluatedCount(totalPassed: number, totalFailed: number) {
  return totalPassed + totalFailed;
}

function pendingCount(totalAttempted: number, totalPassed: number, totalFailed: number) {
  return Math.max(totalAttempted - evaluatedCount(totalPassed, totalFailed), 0);
}

function resultReadinessState(args: {
  selectedSummary: TeacherResultSummary | null;
  resultsPublished: boolean;
  canPublishResults: boolean;
}) {
  if (!args.selectedSummary) {
    return {
      label: "No summary",
      note: "Generate results after learner submissions exist.",
      tone: "statusDemo",
    };
  }

  if (args.resultsPublished) {
    return {
      label: "Published",
      note: "Student-visible result state is already active.",
      tone: "statusLive",
    };
  }

  if (!args.canPublishResults) {
    return {
      label: "Awaiting exam completion",
      note: "Summary exists, but the exam lifecycle must be completed before publication.",
      tone: "statusWarning",
    };
  }

  return {
    label: "Ready to publish",
    note: "Summary and lifecycle state are aligned for publication.",
    tone: "statusLive",
  };
}

function examPublicationState(summary: TeacherResultSummary | null) {
  if (!summary) {
    return {
      label: "No summary",
      tone: "statusWarning",
    };
  }

  if (summary.results_published) {
    return {
      label: "Published",
      tone: "statusLive",
    };
  }

  if (summary.published_results_count > 0) {
    return {
      label: "Partially published",
      tone: "statusDemo",
    };
  }

  return {
    label: "Summary ready",
    tone: "statusDemo",
  };
}

type WorkflowTone = "statusLive" | "statusDemo" | "statusWarning";

type ResultWorkflowStep = {
  id: "lifecycle" | "generate" | "ranks" | "publish";
  title: string;
  statusLabel: string;
  tone: WorkflowTone;
  detail: string;
  helper: string;
  action:
    | {
        kind: "form";
        label: string;
        actionName: "mark-completed" | "generate" | "calculate_ranks" | "publish";
        variant: "buttonPrimary" | "buttonSecondary" | "buttonGhost";
        formAction: typeof runExamLifecycleAction | typeof runSummaryAction;
      }
    | {
        kind: "link";
        label: string;
        href: string;
        variant: "buttonPrimary" | "buttonSecondary" | "buttonGhost";
      }
    | null;
  completed: boolean;
  blocked: boolean;
};

function buildResultWorkflow(args: {
  selectedExamId: string;
  selectedSummary: TeacherResultSummary | null;
  examLifecycleStatus: string;
  canMarkCompleted: boolean;
  canPublishResults: boolean;
  resultsPublished: boolean;
  attemptsCount: number;
  evaluatedResults: number;
  rankedLeaderboardReady: boolean;
}) {
  const {
    selectedExamId,
    selectedSummary,
    examLifecycleStatus,
    canMarkCompleted,
    canPublishResults,
    resultsPublished,
    attemptsCount,
    evaluatedResults,
    rankedLeaderboardReady,
  } = args;

  const lifecycleStep: ResultWorkflowStep = canPublishResults
    ? {
        id: "lifecycle",
        title: "Finish exam lifecycle",
        statusLabel: "Completed",
        tone: "statusLive",
        detail: "The exam is already in completed state, so publication rules can proceed from this screen.",
        helper: "No lifecycle blocker remains for result publishing.",
        action: null,
        completed: true,
        blocked: false,
      }
    : canMarkCompleted
      ? {
          id: "lifecycle",
          title: "Finish exam lifecycle",
          statusLabel: "Ready now",
          tone: "statusWarning",
          detail: `The exam is currently ${examLifecycleStatus.replaceAll("_", " ")}. Mark it completed once learner activity is finished.`,
          helper: "Publication will stay blocked until this step is done.",
          action: {
            kind: "form",
            label: "Mark Exam Completed",
            actionName: "mark-completed",
            variant: "buttonPrimary",
            formAction: runExamLifecycleAction,
          },
          completed: false,
          blocked: false,
        }
      : {
          id: "lifecycle",
          title: "Finish exam lifecycle",
          statusLabel: "Review in exam page",
          tone: "statusDemo",
          detail: `The exam is currently ${examLifecycleStatus.replaceAll("_", " ")}. Move the lifecycle forward from the exam workspace before publishing results.`,
          helper: "This screen cannot complete the lifecycle from the current state.",
          action: {
            kind: "link",
            label: "Open Exam Lifecycle",
            href: `/teacher/exams/${selectedExamId}`,
            variant: "buttonSecondary",
          },
          completed: false,
          blocked: true,
        };

  const generateStep: ResultWorkflowStep = selectedSummary
    ? {
        id: "generate",
        title: "Generate result summary",
        statusLabel: "Summary ready",
        tone: "statusLive",
        detail: "A result summary already exists for this exam and is powering the metrics on this page.",
        helper: "Run generation again only when new submissions or score changes need a refresh.",
        action: {
          kind: "form",
          label: "Regenerate Summary",
          actionName: "generate",
          variant: "buttonGhost",
          formAction: runSummaryAction,
        },
        completed: true,
        blocked: false,
      }
    : attemptsCount > 0
      ? {
          id: "generate",
          title: "Generate result summary",
          statusLabel: "Ready now",
          tone: "statusWarning",
          detail: `${attemptsCount} submitted attempt${attemptsCount === 1 ? "" : "s"} found. Generate the summary to populate result metrics and downstream actions.`,
          helper: "This is the first required result step once submissions exist.",
          action: {
            kind: "form",
            label: "Generate Results",
            actionName: "generate",
            variant: "buttonPrimary",
            formAction: runSummaryAction,
          },
          completed: false,
          blocked: false,
        }
      : {
          id: "generate",
          title: "Generate result summary",
          statusLabel: "Waiting for submissions",
          tone: "statusDemo",
          detail: "No attempt records were returned for this exam yet, so there is nothing meaningful to summarize.",
          helper: "Ask learners to submit attempts first, then return here to generate results.",
          action: {
            kind: "link",
            label: "Open Exam",
            href: `/teacher/exams/${selectedExamId}`,
            variant: "buttonSecondary",
          },
          completed: false,
          blocked: true,
        };

  const ranksStep: ResultWorkflowStep = !selectedSummary
    ? {
        id: "ranks",
        title: "Calculate ranks",
        statusLabel: "Blocked",
        tone: "statusDemo",
        detail: "Ranks depend on the result summary. Generate results first so ranked comparisons have source data.",
        helper: "This step unlocks after summary generation.",
        action: null,
        completed: false,
        blocked: true,
      }
    : rankedLeaderboardReady
      ? {
          id: "ranks",
          title: "Calculate ranks",
          statusLabel: "Ranks ready",
          tone: "statusLive",
          detail: "Leaderboard rows already contain rank values for the current exam scope.",
          helper: "Recalculate only after new summary data or score updates are introduced.",
          action: {
            kind: "form",
            label: "Recalculate Ranks",
            actionName: "calculate_ranks",
            variant: "buttonGhost",
            formAction: runSummaryAction,
          },
          completed: true,
          blocked: false,
        }
      : evaluatedResults > 0
        ? {
            id: "ranks",
            title: "Calculate ranks",
            statusLabel: "Ready now",
            tone: "statusWarning",
            detail: `${evaluatedResults} evaluated result${evaluatedResults === 1 ? "" : "s"} available. Calculate ranks to prepare leaderboard ordering before publication.`,
            helper: "Do this after summary generation and before final publication.",
            action: {
              kind: "form",
              label: "Calculate Ranks",
              actionName: "calculate_ranks",
              variant: "buttonSecondary",
              formAction: runSummaryAction,
            },
            completed: false,
            blocked: false,
          }
        : {
            id: "ranks",
            title: "Calculate ranks",
            statusLabel: "Waiting for evaluated results",
            tone: "statusDemo",
            detail: "A summary exists, but no evaluated results are visible yet for reliable ranking output.",
            helper: "Review summary generation or student attempt state before ranking.",
            action: null,
            completed: false,
            blocked: true,
          };

  const publishStep: ResultWorkflowStep = resultsPublished
    ? {
        id: "publish",
        title: "Publish results",
        statusLabel: "Published",
        tone: "statusLive",
        detail: "Results are already student-visible for this exam.",
        helper: "Use refresh or regeneration only if post-publication correction workflows are required.",
        action: null,
        completed: true,
        blocked: false,
      }
    : !selectedSummary
      ? {
          id: "publish",
          title: "Publish results",
          statusLabel: "Blocked",
          tone: "statusDemo",
          detail: "Publication is unavailable because no result summary exists yet.",
          helper: "Generate the result summary first.",
          action: null,
          completed: false,
          blocked: true,
        }
      : !canPublishResults
        ? {
            id: "publish",
            title: "Publish results",
            statusLabel: "Blocked by lifecycle",
            tone: "statusWarning",
            detail: "The summary exists, but the exam itself is not completed yet, so publication remains intentionally locked.",
            helper: "Finish the exam lifecycle first, then publish from this screen.",
            action: {
              kind: "link",
              label: "Finish Lifecycle",
              href: `/teacher/exams/${selectedExamId}`,
              variant: "buttonSecondary",
            },
            completed: false,
            blocked: true,
          }
        : evaluatedResults > 0
          ? {
              id: "publish",
              title: "Publish results",
              statusLabel: "Ready now",
              tone: "statusWarning",
              detail: "Summary data and completed lifecycle state are aligned. You can now publish student-visible results.",
              helper: "Make this the final step after checking summary and ranking readiness.",
              action: {
                kind: "form",
                label: "Publish Results",
                actionName: "publish",
                variant: "buttonPrimary",
                formAction: runSummaryAction,
              },
              completed: false,
              blocked: false,
            }
          : {
              id: "publish",
              title: "Publish results",
              statusLabel: "Waiting for evaluated results",
              tone: "statusDemo",
              detail: "The exam is completed, but there are still no evaluated results visible for publication.",
              helper: "Check summary generation and attempt readiness before publishing.",
              action: null,
              completed: false,
              blocked: true,
            };

  return [lifecycleStep, generateStep, ranksStep, publishStep];
}

function nextWorkflowStep(steps: ResultWorkflowStep[]) {
  return (
    steps.find((step) => !step.completed && !step.blocked) ??
    steps.find((step) => !step.completed) ??
    null
  );
}

async function runSummaryAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();

  if (!examId || !action) {
    redirect("/teacher/results?error=Exam%20action%20context%20is%20missing.");
  }

  try {
    if (action === "generate") {
      await generateTeacherResultsForExam(examId);
    } else if (action === "calculate_ranks") {
      await calculateTeacherExamRanks(examId);
    } else if (action === "publish") {
      await publishTeacherExamResults(examId);
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to complete the selected teacher results action.";
    redirect(`/teacher/results?exam=${encodeURIComponent(examId)}&error=${encodeURIComponent(message)}`);
  }

  const successMessage =
    action === "generate"
      ? "Results generated successfully."
      : action === "calculate_ranks"
        ? "Ranks calculated successfully."
        : "Results published successfully.";

  redirect(
    `/teacher/results?exam=${encodeURIComponent(examId)}&message=${encodeURIComponent(
      successMessage,
    )}`,
  );
}

async function runForceSubmitAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  const attemptId = String(formData.get("attempt_id") ?? "").trim();

  if (!examId || !attemptId) {
    redirect("/teacher/results?error=Attempt%20action%20context%20is%20missing.");
  }

  try {
    await forceSubmitTeacherAttempt(attemptId);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to force-submit the selected attempt.";
    redirect(`/teacher/results?exam=${encodeURIComponent(examId)}&error=${encodeURIComponent(message)}`);
  }

  redirect(
    `/teacher/results?exam=${encodeURIComponent(examId)}&message=${encodeURIComponent(
      "Attempt force-submitted successfully.",
    )}`,
  );
}

async function runAttemptInterventionNoteAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  const attemptId = String(formData.get("attempt_id") ?? "").trim();
  const attemptFilter = String(formData.get("attempt_filter") ?? "all").trim();
  const questionFilter = String(formData.get("question_filter") ?? "all").trim();
  const note = String(formData.get("note") ?? "").trim();
  const followUp = String(formData.get("follow_up") ?? "monitoring").trim() as
    | "monitoring"
    | "contacted"
    | "force_submit_considered"
    | "resolved";

  if (!examId || !attemptId || !note) {
    redirect(
      `/teacher/results?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
        attemptId,
      )}&attempt_filter=${encodeURIComponent(attemptFilter)}&question_filter=${encodeURIComponent(
        questionFilter,
      )}&error=${encodeURIComponent("Attempt note context is missing.")}`,
    );
  }

  try {
    await createTeacherAttemptInterventionNote({
      attempt: attemptId,
      note,
      follow_up: followUp,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to save the intervention note.";
    redirect(
      `/teacher/results?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
        attemptId,
      )}&attempt_filter=${encodeURIComponent(attemptFilter)}&question_filter=${encodeURIComponent(
        questionFilter,
      )}&error=${encodeURIComponent(message)}`,
    );
  }

  redirect(
    `/teacher/results?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
      attemptId,
    )}&attempt_filter=${encodeURIComponent(attemptFilter)}&question_filter=${encodeURIComponent(
      questionFilter,
    )}&message=${encodeURIComponent("Intervention note saved successfully.")}`,
  );
}

async function runExamLifecycleAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim() as
    | "refresh-status"
    | "mark-completed";

  if (!examId || !action) {
    redirect("/teacher/results?error=Exam%20lifecycle%20action%20context%20is%20missing.");
  }

  try {
    await runTeacherExamAction(examId, action);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to complete the selected exam lifecycle action.";
    redirect(`/teacher/results?exam=${encodeURIComponent(examId)}&error=${encodeURIComponent(message)}`);
  }

  redirect(
    `/teacher/results?exam=${encodeURIComponent(examId)}&message=${encodeURIComponent(
      action === "mark-completed"
        ? "Exam marked completed successfully."
        : "Exam status refreshed successfully.",
    )}`,
  );
}

export default async function TeacherResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireTeacherSession();
  const resolvedSearchParams = await searchParams;
  const selectedExamId = readSingle(resolvedSearchParams.exam);
  const selectedAttemptId = readSingle(resolvedSearchParams.attempt);
  const attemptFilter = readSingle(resolvedSearchParams.attempt_filter) || "all";
  const questionFilter = readSingle(resolvedSearchParams.question_filter) || "all";
  const error = readSingle(resolvedSearchParams.error);
  const message = readSingle(resolvedSearchParams.message);

  const [summaries, teacherExams] = await Promise.all([
    fetchTeacherResultSummary().catch(() => null),
    fetchTeacherExams().catch(() => null),
  ]);

  if (!summaries || !teacherExams) {
    return (
      <div className="studentPage">
        <TeacherPageHeader
          title="Results"
          description="This route depends on the live teacher results summary and analytics endpoints."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Teacher results workspace could not be loaded"
          description="The teacher results area depends on live summary, leaderboard, attempts, and monitoring endpoints, and the current request did not complete successfully."
          bullets={[
            "Teacher results summary endpoint",
            "Exam leaderboard and attempts endpoints",
            "Live monitor and publish actions",
          ]}
          ctaHref="/teacher/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  if (teacherExams.length === 0) {
    return (
      <div className="studentPage">
        <TeacherPageHeader
          title="Results"
          description="Track exam outcome readiness, live attempt behavior, and result publication from one teacher-scoped workspace."
        />
        <StudentStatePanel
          eyebrow="No teacher exams yet"
          title="Results will appear once exams exist in your scope"
          description="The teacher results workspace can only render exams that exist in your scope. Create or publish exams first, then generate results after students submit attempts."
          ctaHref="/teacher/exams"
          ctaLabel="Open Exams"
          statusLabel="Waiting for exam setup"
        />
      </div>
    );
  }

  const summaryByExamId = new Map(summaries.map((summary) => [summary.exam, summary]));
  const resultExamCards = teacherExams.map((exam) => ({
    exam,
    summary: summaryByExamId.get(exam.id) ?? null,
  }));

  const currentExamId = selectedExamId || resultExamCards[0]?.exam.id || "";
  const selectedExamCard =
    resultExamCards.find((item) => item.exam.id === currentExamId) ?? resultExamCards[0];
  const selectedExam = selectedExamCard.exam;
  const selectedSummary = selectedExamCard.summary;

  const detailData = selectedExam
    ? await Promise.allSettled([
        fetchTeacherLiveExamMonitor(selectedExam.id),
        fetchTeacherExamLeaderboard(selectedExam.id),
        fetchTeacherExamAttempts(selectedExam.id),
        fetchTeacherQuestionAnalysis(selectedExam.id),
        fetchTeacherTopicPerformance(selectedExam.id),
      ])
    : [];

  const monitor =
    detailData[0]?.status === "fulfilled" ? detailData[0].value : null;
  const leaderboard =
    detailData[1]?.status === "fulfilled" ? detailData[1].value : [];
  const attempts =
    detailData[2]?.status === "fulfilled" ? detailData[2].value : [];
  const questionAnalysis =
    detailData[3]?.status === "fulfilled" ? detailData[3].value : [];
  const topicPerformance =
    detailData[4]?.status === "fulfilled" ? detailData[4].value.results : [];

  const totalAttempts = summaries.reduce((sum, item) => sum + item.total_attempted, 0);
  const totalPassed = summaries.reduce((sum, item) => sum + item.total_passed, 0);
  const totalFailed = summaries.reduce((sum, item) => sum + item.total_failed, 0);
  const averageAcrossExams =
    summaries.length > 0
      ? Math.round(
          summaries.reduce((sum, item) => sum + Number(item.average_percentage), 0) /
            summaries.length,
        )
      : 0;
  const selectedPendingCount = selectedSummary
    ? pendingCount(
        selectedSummary.total_attempted,
        selectedSummary.total_passed,
        selectedSummary.total_failed,
      )
    : 0;
  const filteredAttempts = attempts.filter((attempt) => {
    if (attemptFilter === "low_performers") {
      return Number(attempt.percentage) < 40;
    }

    if (attemptFilter === "skipped_heavy") {
      return attempt.skipped_questions >= 2;
    }

    return true;
  });
  const filteredQuestionAnalysis = questionAnalysis.filter((row) => {
    if (questionFilter === "hard_questions") {
      return row.total_attempts > 0 && (row.wrong_count / row.total_attempts) * 100 >= 50;
    }

    if (questionFilter === "skipped_often") {
      return row.skipped_count >= 2;
    }

    return true;
  });
  const examLifecycleStatus = selectedExam.status || monitor?.exam_status || "unknown";
  const canPublishResults = examLifecycleStatus === "completed";
  const canRefreshLifecycle =
    examLifecycleStatus !== "completed" && examLifecycleStatus !== "cancelled";
  const canMarkCompleted = examLifecycleStatus === "live" || examLifecycleStatus === "scheduled";
  const resultsPublished =
    selectedSummary?.results_published ??
    (leaderboard.length > 0 && leaderboard.every((row) => row.is_published));
  const evaluatedResults = selectedSummary
    ? evaluatedCount(selectedSummary.total_passed, selectedSummary.total_failed)
    : 0;
  const rankedLeaderboardReady =
    leaderboard.length > 0 && leaderboard.every((row) => row.rank !== null);
  const readiness = resultReadinessState({
    selectedSummary,
    resultsPublished,
    canPublishResults,
  });
  const workflowSteps = buildResultWorkflow({
    selectedExamId: selectedExam.id,
    selectedSummary,
    examLifecycleStatus,
    canMarkCompleted,
    canPublishResults,
    resultsPublished,
    attemptsCount: attempts.length,
    evaluatedResults,
    rankedLeaderboardReady,
  });
  const recommendedWorkflowStep = nextWorkflowStep(workflowSteps);
  const latestPublishLog = selectedExam.publish_logs[0] ?? null;
  const integrityWarningAttempts = attempts.filter(
    (attempt) => attempt.integrity_summary.violation_count > 0,
  ).length;
  const integrityWarningsTotal = attempts.reduce(
    (sum, attempt) => sum + attempt.integrity_summary.violation_count,
    0,
  );
  const thresholdReachedAttempts = attempts.filter(
    (attempt) => attempt.integrity_summary.threshold_reached,
  ).length;
  const attemptsByHealth = attempts.reduce(
    (counts, attempt) => {
      const health = attemptHealth(attempt);
      counts[health] += 1;
      return counts;
    },
    { critical: 0, watch: 0, stable: 0 } as Record<AttemptHealth, number>,
  );
  const interventionQueue = [...attempts]
    .sort((left, right) => healthPriorityScore(right) - healthPriorityScore(left))
    .filter((attempt) => attemptHealth(attempt) !== "stable")
    .slice(0, 5);
  const criticalAttempts = interventionQueue.filter(
    (attempt) => attemptHealth(attempt) === "critical",
  );
  const watchAttempts = interventionQueue.filter(
    (attempt) => attemptHealth(attempt) === "watch",
  );
  const selectedAttempt =
    attempts.find((attempt) => attempt.id === selectedAttemptId) ??
    filteredAttempts[0] ??
    attempts[0] ??
    null;
  const selectedAttemptInterventions = selectedAttempt
    ? await fetchTeacherAttemptInterventions(selectedAttempt.id).catch(() => [])
    : [];

  return (
    <div className="studentPage studentPageTight studentDashboardModern">
      <TeacherPageHeader
        title="Results"
        description="Monitor live attempt behavior, generate summaries, publish ranks, and review leaderboard outcomes across teacher-scoped exams."
        statusLabel={`${teacherExams.length} exam${teacherExams.length === 1 ? "" : "s"} visible`}
        statusTone="live"
      />

      {message ? <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Outcome Control</span>
          <strong>Handle result generation, publication, and live intervention from one teacher workspace</strong>
          <p>
            This surface combines exam-level result lifecycle work with live attempt monitoring so teachers can move
            from summary generation into intervention decisions without losing operational context.
          </p>
          <small>
            {totalAttempts} attempts · {attemptsByHealth.critical} critical · {attemptsByHealth.watch} watch-list
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href={`/teacher/exams/${selectedExam.id}`}>
            Open Exam
          </Link>
          <Link className="button buttonSecondary" href={`/teacher/exams/${selectedExam.id}/builder`}>
            Open Builder
          </Link>
        </div>
      </section>

      <section className="resultsSummaryGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Visible Exams</span>
          <strong>{teacherExams.length}</strong>
          <small>Teacher-scoped exams available in this results workspace</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Total Attempts</span>
          <strong>{totalAttempts}</strong>
          <small>{totalPassed} passed and {totalFailed} failed so far</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Average Performance</span>
          <strong>{averageAcrossExams}%</strong>
          <small>Average percentage across all returned exam summaries</small>
        </article>
      </section>

      <section className="resultsList teacherResultsLayout">
        <article className="contentCard teacherResultsSidebar">
          <div className="sectionHeading">
            <strong>Exams</strong>
            <span>{teacherExams.length} available</span>
          </div>

          <div className="resultsList">
            {resultExamCards.map(({ exam, summary }) => {
              const isActive = exam.id === selectedExam.id;
              const publication = examPublicationState(summary);
              return (
                <Link
                  className={`resultCard ${isActive ? "teacherResultsCardActive" : ""}`}
                  href={`/teacher/results?exam=${exam.id}`}
                  key={exam.id}
                >
                  <div className="resultCardTop">
                    <div>
                      <strong>{exam.title}</strong>
                      <span>{exam.code}</span>
                    </div>
                    <span className={`statusPill ${publication.tone}`}>{publication.label}</span>
                  </div>

                  <div className="resultKpiGrid">
                    <div>
                      <span>Attempts</span>
                      <strong>{summary?.total_attempted ?? 0}</strong>
                    </div>
                    <div>
                      <span>Passed</span>
                      <strong>{summary?.total_passed ?? 0}</strong>
                    </div>
                    <div>
                      <span>Failed</span>
                      <strong>{summary?.total_failed ?? 0}</strong>
                    </div>
                    <div>
                      <span>Highest</span>
                      <strong>{summary?.highest_score ?? "N/A"}</strong>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </article>

        <div className="teacherResultsMain">
          <section className="contentCard">
            <div className="resultCardTop">
              <div>
                <strong>{selectedExam.title}</strong>
                <span>{selectedExam.code}</span>
              </div>
              <div className="resultStatusGroup">
                {resultsPublished ? (
                  <span className="statusPill statusLive">Results published</span>
                ) : (
                  <span className="statusPill statusDemo">Results not published</span>
                )}
                <span className={`statusPill ${
                  examLifecycleStatus === "completed"
                    ? "statusLive"
                    : examLifecycleStatus === "live"
                      ? "statusWarning"
                      : "statusDemo"
                }`}>
                  Exam {examLifecycleStatus.replaceAll("_", " ")}
                </span>
                <span className="statusPill statusLive">
                  Updated {formatDateTime(selectedSummary?.last_calculated_at ?? selectedExam.updated_at)}
                </span>
              </div>
            </div>

            <div className="teacherWorkflowSummary">
              <div>
                <span className="studentDashboardTag">Guided workflow</span>
                <strong>
                  {recommendedWorkflowStep
                    ? `Next recommended step: ${recommendedWorkflowStep.title}`
                    : "All result workflow steps are complete"}
                </strong>
                <p>
                  {recommendedWorkflowStep
                    ? recommendedWorkflowStep.detail
                    : "This exam already has completed lifecycle, generated summary, ranking readiness, and published results."}
                </p>
              </div>
              <div className="resultStatusGroup">
                <span className={`statusPill ${readiness.tone}`}>{readiness.label}</span>
                <span className="statusPill statusDemo">{attempts.length} attempts returned</span>
                <span className="statusPill statusLive">{evaluatedResults} evaluated</span>
              </div>
            </div>

            <div className="teacherWorkflowGrid">
              {workflowSteps.map((step, index) => (
                <article
                  className={`teacherWorkflowCard ${
                    step.completed
                      ? "teacherWorkflowCardDone"
                      : step.blocked
                        ? "teacherWorkflowCardBlocked"
                        : "teacherWorkflowCardReady"
                  }`}
                  key={step.id}
                >
                  <div className="teacherWorkflowHeader">
                    <div className="teacherWorkflowStepNo">Step {index + 1}</div>
                    <span className={`statusPill ${step.tone}`}>{step.statusLabel}</span>
                  </div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                  <small>{step.helper}</small>
                  <div className="teacherWorkflowActionArea">
                    {step.action?.kind === "form" ? (
                      <form action={step.action.formAction}>
                        <input name="exam_id" type="hidden" value={selectedExam.id} />
                        <button
                          className={`button ${step.action.variant}`}
                          name="action"
                          type="submit"
                          value={step.action.actionName}
                        >
                          {step.action.label}
                        </button>
                      </form>
                    ) : null}
                    {step.action?.kind === "link" ? (
                      <Link className={`button ${step.action.variant}`} href={step.action.href}>
                        {step.action.label}
                      </Link>
                    ) : null}
                    {step.completed ? <span className="statusPill statusLive">Done</span> : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="resultCardActions">
              {canRefreshLifecycle ? (
                <form action={runExamLifecycleAction}>
                  <input name="exam_id" type="hidden" value={selectedExam.id} />
                  <button className="button buttonGhost" name="action" type="submit" value="refresh-status">
                    Refresh Exam Status
                  </button>
                </form>
              ) : null}
              <Link className="button buttonGhost" href={`/teacher/exams/${selectedExam.id}`}>
                Open Exam
              </Link>
              <Link className="button buttonGhost" href={`/teacher/exams/${selectedExam.id}/builder`}>
                Open Builder
              </Link>
              <Link className="button buttonGhost" href="/teacher/question-bank">
                Inspect Question Bank
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Lifecycle readiness</span>
              <strong>{readiness.label}</strong>
              <small>{readiness.note}</small>
            </article>
            <article className="metricCard">
              <span>Submitted</span>
              <strong>{selectedSummary?.total_attempted ?? 0}</strong>
              <small>Attempt records found for this exam summary</small>
            </article>
            <article className="metricCard">
              <span>Evaluated</span>
              <strong>{evaluatedResults}</strong>
              <small>Passed plus failed results ready for review</small>
            </article>
            <article className="metricCard">
              <span>Pending</span>
              <strong>{selectedPendingCount}</strong>
              <small>
                {selectedPendingCount > 0
                  ? "Submissions still need evaluation or publication work"
                  : "No pending result work for this exam"}
              </small>
            </article>
            <article className="metricCard">
              <span>Latest lifecycle event</span>
              <strong>
                {latestPublishLog
                  ? `${latestPublishLog.old_status.replaceAll("_", " ")} to ${latestPublishLog.new_status.replaceAll("_", " ")}`
                  : "No history"}
              </strong>
              <small>
                {latestPublishLog
                  ? formatDateTime(latestPublishLog.created_at)
                  : "No lifecycle actions recorded yet"}
              </small>
            </article>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard">
              <span>Average</span>
              <strong>{selectedSummary ? percentage(selectedSummary.average_percentage) : "N/A"}</strong>
              <small>Average backend percentage for this exam summary</small>
            </article>
            <article className="metricCard">
              <span>Highest</span>
              <strong>{selectedSummary?.highest_score ?? "N/A"}</strong>
              <small>Best final score recorded for this exam</small>
            </article>
            <article className="metricCard">
              <span>Lowest</span>
              <strong>{selectedSummary?.lowest_score ?? "N/A"}</strong>
              <small>Lowest final score recorded for this exam</small>
            </article>
            <article className="metricCard">
              <span>Completion</span>
              <strong>{monitor ? `${Math.round(monitor.completion_percentage)}%` : "N/A"}</strong>
              <small>Based on live monitor completion coverage</small>
            </article>
          </section>

          {monitor ? (
            <section className="contentCard">
              <div className="sectionHeading">
                <strong>Live monitor</strong>
                <span>{monitor.exam_status.replaceAll("_", " ")}</span>
              </div>

              <LiveMonitorRefresh intervalSeconds={20} />

              <div className="resultKpiGrid teacherResultsKpiGrid">
                <div>
                  <span>Total students</span>
                  <strong>{monitor.total_students}</strong>
                </div>
                <div>
                  <span>Started</span>
                  <strong>{monitor.started_students}</strong>
                </div>
                <div>
                  <span>In progress</span>
                  <strong>{monitor.in_progress_students}</strong>
                </div>
                <div>
                  <span>Completed</span>
                  <strong>{monitor.completed_students}</strong>
                </div>
                <div>
                  <span>High alerts</span>
                  <strong>{monitor.high_alert_attempts}</strong>
                </div>
                <div>
                  <span>Warning attempts</span>
                  <strong>{integrityWarningAttempts}</strong>
                </div>
                <div>
                  <span>Total warnings</span>
                  <strong>{integrityWarningsTotal}</strong>
                </div>
                <div>
                  <span>Threshold reached</span>
                  <strong>{thresholdReachedAttempts}</strong>
                </div>
                <div>
                  <span>Last activity</span>
                  <strong>{formatDateTime(monitor.last_activity_at)}</strong>
                </div>
              </div>

              <div className="teacherMonitorHealthGrid">
                <article className="teacherMonitorHealthCard teacherMonitorHealthCritical">
                  <span>Intervene now</span>
                  <strong>{attemptsByHealth.critical}</strong>
                  <small>Auto-submitted, threshold-reached, or high-alert attempts</small>
                </article>
                <article className="teacherMonitorHealthCard teacherMonitorHealthWatch">
                  <span>Watch closely</span>
                  <strong>{attemptsByHealth.watch}</strong>
                  <small>Warnings present or in-progress attempts worth tracking</small>
                </article>
                <article className="teacherMonitorHealthCard teacherMonitorHealthStable">
                  <span>Stable</span>
                  <strong>{attemptsByHealth.stable}</strong>
                  <small>No active warning pressure returned from live monitoring</small>
                </article>
              </div>

              {interventionQueue.length ? (
                <div className="teacherInterventionPanel">
                  <div className="sectionHeading">
                    <strong>Intervention queue</strong>
                    <span>Highest-priority attempts first</span>
                  </div>
                  <div className="teacherInterventionList">
                    {interventionQueue.map((attempt) => {
                      const health = attemptHealth(attempt);
                      return (
                        <article className="teacherInterventionCard" key={`queue-${attempt.id}`}>
                          <div className="resultCardTop">
                            <div>
                              <strong>{attempt.student_name}</strong>
                              <span>
                                {attempt.student_admission_no} · Attempt {attempt.attempt_no}
                              </span>
                            </div>
                            <span className={`statusPill ${healthTone(health)}`}>
                              {healthLabel(health)}
                            </span>
                          </div>
                          <p>{healthReason(attempt)}</p>
                          <div className="teacherDecisionSummary">
                            <span>Recommended next step</span>
                            <strong>{recommendedTeacherAction(attempt)}</strong>
                          </div>
                          {attempt.accommodation_snapshot.has_accommodations ? (
                            <div className="questionBankTagRow">
                              <span className="questionBankTagChip">
                                {accommodationLabel(attempt)}
                              </span>
                            </div>
                          ) : null}
                          <div className="resultCardActions">
                            <Link
                              className="button buttonSecondary"
                              href={`/teacher/results?exam=${selectedExam.id}&attempt=${attempt.id}&attempt_filter=${attemptFilter}&question_filter=${questionFilter}`}
                            >
                              Inspect Attempt
                            </Link>
                            {attempt.can_force_submit ? (
                              <form action={runForceSubmitAction}>
                                <input name="exam_id" type="hidden" value={selectedExam.id} />
                                <input name="attempt_id" type="hidden" value={attempt.id} />
                                <button className="button buttonGhost" type="submit">
                                  Force Submit
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="emptyText">
                  No attempts currently need intervention beyond routine monitoring.
                </p>
              )}

              {(criticalAttempts.length || watchAttempts.length) ? (
                <div className="teacherLaneGrid">
                  <article className="teacherLaneCard">
                    <div className="sectionHeading">
                      <strong>High-alert lane</strong>
                      <span>{criticalAttempts.length} attempts</span>
                    </div>
                    {criticalAttempts.length ? (
                      <div className="teacherLaneList">
                        {criticalAttempts.slice(0, 4).map((attempt) => (
                          <div className="teacherLaneRow" key={`critical-${attempt.id}`}>
                            <div>
                              <strong>{attempt.student_name}</strong>
                              <span>{healthReason(attempt)}</span>
                            </div>
                            <Link
                              className="button buttonGhost"
                              href={`/teacher/results?exam=${selectedExam.id}&attempt=${attempt.id}&attempt_filter=${attemptFilter}&question_filter=${questionFilter}`}
                            >
                              Review
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="emptyText">No critical attempts are waiting right now.</p>
                    )}
                  </article>

                  <article className="teacherLaneCard">
                    <div className="sectionHeading">
                      <strong>Watch lane</strong>
                      <span>{watchAttempts.length} attempts</span>
                    </div>
                    {watchAttempts.length ? (
                      <div className="teacherLaneList">
                        {watchAttempts.slice(0, 4).map((attempt) => (
                          <div className="teacherLaneRow" key={`watch-${attempt.id}`}>
                            <div>
                              <strong>{attempt.student_name}</strong>
                              <span>{recommendedTeacherAction(attempt)}</span>
                            </div>
                            <Link
                              className="button buttonGhost"
                              href={`/teacher/results?exam=${selectedExam.id}&attempt=${attempt.id}&attempt_filter=${attemptFilter}&question_filter=${questionFilter}`}
                            >
                              Inspect
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="emptyText">No watch-list attempts are pending beyond routine monitoring.</p>
                    )}
                  </article>
                </div>
              ) : null}
            </section>
          ) : (
            <StudentStatePanel
              eyebrow="Live monitor unavailable"
              title="Live attempt monitoring could not be loaded"
              description="The selected exam loaded, but the live monitor endpoint did not complete successfully for this exam."
              ctaHref={`/teacher/exams/${selectedExam.id}`}
              ctaLabel="Open Exam"
              statusLabel="Partial analytics available"
            />
          )}

          {selectedAttempt ? (
            <section className="contentCard teacherAttemptDetailPanel">
              <div className="sectionHeading">
                <strong>Attempt detail</strong>
                <span>
                  {selectedAttempt.student_name} · Attempt {selectedAttempt.attempt_no}
                </span>
              </div>

              <div className="resultCardTop">
                <div>
                  <strong>{selectedAttempt.student_name}</strong>
                  <span>
                    {selectedAttempt.student_admission_no} · {selectedAttempt.status.replaceAll("_", " ")}
                  </span>
                </div>
                <span className={`statusPill ${healthTone(attemptHealth(selectedAttempt))}`}>
                  {healthLabel(attemptHealth(selectedAttempt))}
                </span>
              </div>

              <div className="resultKpiGrid teacherResultsKpiGrid">
                <div>
                  <span>Final score</span>
                  <strong>{selectedAttempt.final_score}</strong>
                </div>
                <div>
                  <span>Percentage</span>
                  <strong>{percentage(selectedAttempt.percentage)}</strong>
                </div>
                <div>
                  <span>Attempted</span>
                  <strong>{selectedAttempt.attempted_questions}</strong>
                </div>
                <div>
                  <span>Correct</span>
                  <strong>{selectedAttempt.correct_answers}</strong>
                </div>
                <div>
                  <span>Incorrect</span>
                  <strong>{selectedAttempt.incorrect_answers}</strong>
                </div>
                <div>
                  <span>Skipped</span>
                  <strong>{selectedAttempt.skipped_questions}</strong>
                </div>
                <div>
                  <span>Started</span>
                  <strong>{formatDateTime(selectedAttempt.started_at)}</strong>
                </div>
                <div>
                  <span>Submitted</span>
                  <strong>{formatDateTime(selectedAttempt.submitted_at)}</strong>
                </div>
                <div>
                  <span>Time taken</span>
                  <strong>{formatDuration(selectedAttempt.time_taken_seconds)}</strong>
                </div>
                <div>
                  <span>Auto submitted</span>
                  <strong>{selectedAttempt.is_auto_submitted ? "Yes" : "No"}</strong>
                </div>
                <div>
                  <span>Integrity warnings</span>
                  <strong>{selectedAttempt.integrity_summary.violation_count}</strong>
                </div>
                <div>
                  <span>Latest signal</span>
                  <strong>
                    {latestIntegrityLabel(
                      selectedAttempt.integrity_summary.latest_event?.event_type,
                    )}
                  </strong>
                </div>
                <div>
                  <span>Latest event time</span>
                  <strong>
                    {formatDateTime(
                      selectedAttempt.integrity_summary.latest_event?.event_at ?? null,
                    )}
                  </strong>
                </div>
                <div>
                  <span>Threshold state</span>
                  <strong>
                    {selectedAttempt.integrity_summary.threshold_reached
                      ? "Reached"
                      : selectedAttempt.integrity_summary.violation_limit !== null
                        ? `${selectedAttempt.integrity_summary.remaining_before_action ?? 0} left`
                        : "Not used"}
                  </strong>
                </div>
                <div>
                  <span>Teacher health</span>
                  <strong>{healthLabel(attemptHealth(selectedAttempt))}</strong>
                </div>
                <div>
                  <span>Teacher action cue</span>
                  <strong>{healthReason(selectedAttempt)}</strong>
                </div>
                <div>
                  <span>Accommodation</span>
                  <strong>{accommodationLabel(selectedAttempt)}</strong>
                </div>
              </div>

              <div className="teacherDecisionCard">
                <div className="resultCardTop">
                  <div>
                    <strong>Decision support</strong>
                    <span>{followUpLabel(selectedAttempt)}</span>
                  </div>
                  <span className={`statusPill ${healthTone(attemptHealth(selectedAttempt))}`}>
                    {healthLabel(attemptHealth(selectedAttempt))}
                  </span>
                </div>
                <p>{recommendedTeacherAction(selectedAttempt)}</p>
              </div>

              <article className="teacherAttemptTimelineCard">
                <div className="sectionHeading">
                  <strong>Intervention notes</strong>
                  <span>{selectedAttemptInterventions.length} logged actions</span>
                </div>
                <form action={runAttemptInterventionNoteAction} className="teacherInterventionForm">
                  <input name="exam_id" type="hidden" value={selectedExam.id} />
                  <input name="attempt_id" type="hidden" value={selectedAttempt.id} />
                  <input name="attempt_filter" type="hidden" value={attemptFilter} />
                  <input name="question_filter" type="hidden" value={questionFilter} />

                  <div className="builderComposerGrid">
                    <label className="fieldStack">
                      <span>Follow-up state</span>
                      <select defaultValue="monitoring" name="follow_up">
                        <option value="monitoring">Monitoring</option>
                        <option value="contacted">Contacted</option>
                        <option value="force_submit_considered">Force Submit Considered</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </label>
                    <label className="fieldStack">
                      <span>Teacher note</span>
                      <textarea
                        className="builderTextarea"
                        name="note"
                        placeholder="Record what you observed, what action you took, or what should happen next."
                        rows={3}
                      />
                    </label>
                  </div>

                  <div className="settingsActionRow">
                    <button className="button buttonSecondary" type="submit">
                      Save Intervention Note
                    </button>
                  </div>
                </form>

                {selectedAttemptInterventions.length ? (
                  <div className="teacherTimelineList">
                    {selectedAttemptInterventions.map((item) => (
                      <div className="teacherTimelineRow" key={`intervention-${item.id}`}>
                        <div className="teacherTimelineMarker" />
                        <div>
                          <strong>{item.user_label}</strong>
                          <span>
                            {formatDateTime(item.created_at)}
                            {item.metadata.follow_up
                              ? ` · ${item.metadata.follow_up.replaceAll("_", " ")}`
                              : ""}
                          </span>
                          <small>{item.message}</small>
                        </div>
                        <span className="statusPill statusDemo">
                          {item.action.replaceAll("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="emptyText">
                    No intervention notes have been recorded for this attempt yet.
                  </p>
                )}
              </article>

              {selectedAttempt.accommodation_snapshot.has_accommodations ? (
                <article className="teacherAttemptAlertCard">
                  <div className="resultCardTop">
                    <div>
                      <strong>Active accommodation snapshot</strong>
                      <span>{accommodationLabel(selectedAttempt)}</span>
                    </div>
                    <span className="statusPill statusLive">Supported</span>
                  </div>
                  <p>
                    {selectedAttempt.accommodation_snapshot.alternative_instructions ||
                      "This attempt was launched with approved accommodation support."}
                  </p>
                </article>
              ) : null}

              {selectedAttempt.integrity_summary.latest_event ? (
                <article className="teacherAttemptAlertCard">
                  <div className="resultCardTop">
                    <div>
                      <strong>Latest integrity event</strong>
                      <span>
                        {latestIntegrityLabel(
                          selectedAttempt.integrity_summary.latest_event.event_type,
                        )}
                      </span>
                    </div>
                    <span
                      className={`statusPill ${attemptTone(
                        selectedAttempt.integrity_summary.latest_event.severity,
                      )}`}
                    >
                      {selectedAttempt.integrity_summary.latest_event.severity}
                    </span>
                  </div>
                  <p>
                    Recorded at{" "}
                    {formatDateTime(
                      selectedAttempt.integrity_summary.latest_event.event_at,
                    )}
                    {selectedAttempt.integrity_summary.latest_event.counts_as_violation
                      ? " and counted toward the warning threshold."
                      : "."}
                  </p>
                </article>
              ) : null}

              {selectedAttempt.integrity_summary.recent_events.length ? (
                <article className="teacherAttemptTimelineCard">
                  <div className="sectionHeading">
                    <strong>Recent integrity timeline</strong>
                    <span>
                      {selectedAttempt.integrity_summary.recent_events.length} recent signals
                    </span>
                  </div>
                  <div className="teacherTimelineList">
                    {selectedAttempt.integrity_summary.recent_events.map((event, index) => (
                      <div
                        className="teacherTimelineRow"
                        key={`${selectedAttempt.id}-${event.event_type}-${event.event_at}-${index}`}
                      >
                        <div className="teacherTimelineMarker" />
                        <div>
                          <strong>{latestIntegrityLabel(event.event_type)}</strong>
                          <span>{formatDateTime(event.event_at)}</span>
                        </div>
                        <span className={`statusPill ${attemptTone(event.severity)}`}>
                          {event.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}

              {selectedAttempt.alerts.length ? (
                <div className="teacherAttemptAlertStack">
                  {selectedAttempt.alerts.map((alert) => (
                    <article className="teacherAttemptAlertCard" key={`${selectedAttempt.id}-${alert.code}`}>
                      <div className="resultCardTop">
                        <div>
                          <strong>{alert.label}</strong>
                          <span>{alert.code.replaceAll("_", " ")}</span>
                        </div>
                        <span className={`statusPill ${attemptTone(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p>{alert.message}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="emptyText">
                  No live attempt alerts were returned for this attempt.
                </p>
              )}
            </section>
          ) : null}

          <section className="contentCard">
            <div className="sectionHeading">
              <strong>Recent attempts</strong>
              <span>{filteredAttempts.length} shown</span>
            </div>

            <div className="questionBankButtonRow">
              <Link className={`button ${attemptFilter === "all" ? "buttonPrimary" : "buttonGhost"}`} href={`/teacher/results?exam=${selectedExam.id}&attempt_filter=all&question_filter=${questionFilter}`}>
                All
              </Link>
              <Link className={`button ${attemptFilter === "low_performers" ? "buttonPrimary" : "buttonGhost"}`} href={`/teacher/results?exam=${selectedExam.id}&attempt_filter=low_performers&question_filter=${questionFilter}`}>
                Low Performers
              </Link>
              <Link className={`button ${attemptFilter === "skipped_heavy" ? "buttonPrimary" : "buttonGhost"}`} href={`/teacher/results?exam=${selectedExam.id}&attempt_filter=skipped_heavy&question_filter=${questionFilter}`}>
                Skipped Heavy
              </Link>
            </div>

            {!attempts.length ? (
              <p className="emptyText">No attempt records were returned for the selected exam.</p>
            ) : !filteredAttempts.length ? (
              <p className="emptyText">No students match this review filter right now.</p>
            ) : (
              <div className="resultsList">
                {filteredAttempts.slice(0, 8).map((attempt) => {
                  const topAlert = attempt.alerts[0];
                  const health = attemptHealth(attempt);
                  return (
                    <article className="resultCard" key={attempt.id}>
                      <div className="resultCardTop">
                        <div>
                          <strong>{attempt.student_name}</strong>
                          <span>
                            {attempt.student_admission_no} · Attempt {attempt.attempt_no}
                          </span>
                        </div>
                        <span className={`statusPill ${healthTone(health)}`}>
                          {healthLabel(health)}
                        </span>
                      </div>

                      <div className="resultKpiGrid">
                        <div>
                          <span>Score</span>
                          <strong>{attempt.final_score}</strong>
                        </div>
                        <div>
                          <span>Percentage</span>
                          <strong>{percentage(attempt.percentage)}</strong>
                        </div>
                        <div>
                          <span>Started</span>
                          <strong>{formatDateTime(attempt.started_at)}</strong>
                        </div>
                        <div>
                          <span>Time taken</span>
                          <strong>{formatDuration(attempt.time_taken_seconds)}</strong>
                        </div>
                        <div>
                          <span>Health reason</span>
                          <strong>{healthReason(attempt)}</strong>
                        </div>
                        <div>
                          <span>Accommodation</span>
                          <strong>{accommodationLabel(attempt)}</strong>
                        </div>
                        <div>
                          <span>Warnings</span>
                          <strong>{attempt.integrity_summary.violation_count}</strong>
                        </div>
                        <div>
                          <span>Latest signal</span>
                          <strong>
                            {latestIntegrityLabel(
                              attempt.integrity_summary.latest_event?.event_type,
                            )}
                          </strong>
                        </div>
                      </div>

                      {attempt.alerts.length ? (
                        <div className="questionBankTagRow">
                          {topAlert ? (
                            <span className="questionBankTagChip">{topAlert.label}</span>
                          ) : null}
                          {attempt.accommodation_snapshot.has_accommodations ? (
                            <span className="questionBankTagChip">
                              {accommodationLabel(attempt)}
                            </span>
                          ) : null}
                          {attempt.alerts.map((alert) => (
                          <span className="questionBankTagChip" key={`${attempt.id}-${alert.code}`}>
                              {alert.label}
                            </span>
                          ))}
                          {attempt.integrity_summary.threshold_reached ? (
                            <span className="questionBankTagChip">
                              Integrity threshold reached
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="resultCardFooter">
                        <div className="examStateSummary">
                          <span>Status</span>
                          <strong>{attempt.status.replaceAll("_", " ")}</strong>
                        </div>
                        <div className="resultCardActions">
                          <Link
                            className="button buttonSecondary"
                            href={`/teacher/results?exam=${selectedExam.id}&attempt=${attempt.id}&attempt_filter=${attemptFilter}&question_filter=${questionFilter}`}
                          >
                            Inspect Attempt
                          </Link>
                        {attempt.can_force_submit ? (
                          <form action={runForceSubmitAction}>
                            <input name="exam_id" type="hidden" value={selectedExam.id} />
                            <input name="attempt_id" type="hidden" value={attempt.id} />
                            <button className="button buttonGhost" type="submit">
                              Force Submit
                            </button>
                          </form>
                        ) : attempt.force_submit_block_reason ? (
                          <span className="statusPill statusDemo">{attempt.force_submit_block_reason}</span>
                        ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="resultsList teacherResultsSplit">
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Leaderboard</strong>
                <span>{leaderboard.length} ranked entries</span>
              </div>

              {!leaderboard.length ? (
                <p className="emptyText">No leaderboard rows are available yet for this exam.</p>
              ) : (
                <div className="resultsList">
                  {leaderboard.slice(0, 6).map((row) => (
                    <article className="resultCard" key={row.id}>
                      <div className="resultCardTop">
                        <div>
                          <strong>{row.student_name}</strong>
                          <span>{row.student_admission_no}</span>
                        </div>
                        <span className="statusPill statusLive">Rank {row.rank ?? "N/A"}</span>
                      </div>

                      <div className="resultBreakdown">
                        <div>
                          <span>Final score</span>
                          <strong>{row.final_score}</strong>
                        </div>
                        <div>
                          <span>Percentage</span>
                          <strong>{percentage(row.percentage)}</strong>
                        </div>
                        <div>
                          <span>Time taken</span>
                          <strong>{formatDuration(row.time_taken_seconds)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Topic performance</strong>
                <span>{topicPerformance.length} topic rows</span>
              </div>

              {!topicPerformance.length ? (
                <p className="emptyText">No topic performance rows are available for this exam.</p>
              ) : (
                <div className="resultsList">
                  {topicPerformance.slice(0, 6).map((row) => (
                    <article className="resultCard" key={row.id}>
                      <div className="resultCardTop">
                        <div>
                          <strong>{row.topic_name || "Unmapped topic"}</strong>
                          <span>{row.subject_name}</span>
                        </div>
                        <span className="statusPill statusDemo">
                          {percentage(row.percentage)}
                        </span>
                      </div>

                      <div className="resultBreakdown">
                        <div>
                          <span>Attempted</span>
                          <strong>{row.attempted_questions}</strong>
                        </div>
                        <div>
                          <span>Correct</span>
                          <strong>{row.correct_answers}</strong>
                        </div>
                        <div>
                          <span>Skipped</span>
                          <strong>{row.skipped_questions}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Question analysis</strong>
                <span>{filteredQuestionAnalysis.length} shown</span>
              </div>

              <div className="questionBankButtonRow">
                <Link className={`button ${questionFilter === "all" ? "buttonPrimary" : "buttonGhost"}`} href={`/teacher/results?exam=${selectedExam.id}&attempt_filter=${attemptFilter}&question_filter=all`}>
                  All
                </Link>
                <Link className={`button ${questionFilter === "hard_questions" ? "buttonPrimary" : "buttonGhost"}`} href={`/teacher/results?exam=${selectedExam.id}&attempt_filter=${attemptFilter}&question_filter=hard_questions`}>
                  Hard
                </Link>
                <Link className={`button ${questionFilter === "skipped_often" ? "buttonPrimary" : "buttonGhost"}`} href={`/teacher/results?exam=${selectedExam.id}&attempt_filter=${attemptFilter}&question_filter=skipped_often`}>
                  Skipped Often
                </Link>
              </div>

              {!questionAnalysis.length ? (
                <p className="emptyText">No question analysis records are available for this exam yet.</p>
              ) : !filteredQuestionAnalysis.length ? (
                <p className="emptyText">No question insights match this filter right now.</p>
              ) : (
                <div className="resultsList">
                  {filteredQuestionAnalysis.slice(0, 6).map((row) => (
                    <article className="resultCard" key={row.question_id}>
                      <div className="resultCardTop">
                        <div>
                          <strong>{row.question_text_summary}</strong>
                          <span>
                            {row.subject_name || "No subject"}
                            {row.topic_name ? ` · ${row.topic_name}` : ""}
                          </span>
                        </div>
                        <span className="statusPill statusWarning">
                          {row.wrong_count} wrong
                        </span>
                      </div>

                      <div className="resultBreakdown">
                        <div>
                          <span>Total attempts</span>
                          <strong>{row.total_attempts}</strong>
                        </div>
                        <div>
                          <span>Correct</span>
                          <strong>{row.correct_count}</strong>
                        </div>
                        <div>
                          <span>Skipped</span>
                          <strong>{row.skipped_count}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>
      </section>
    </div>
  );
}
