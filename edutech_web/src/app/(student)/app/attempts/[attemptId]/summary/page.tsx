import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  fetchStudentAvailableExams,
  fetchStudentAttemptSummary,
  getStudentApiState,
  spendStarsForContent,
  startStudentAttempt,
} from "@/lib/api/student";
import {
  durationMinutesLabel,
  percentageLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import { resolvePracticeFollowUpAction } from "@/lib/student/practice";

function attemptExperienceLabel(examType: string) {
  if (examType === "practice") return "practice";
  if (examType === "mock_exam") return "mock test";
  return titleCaseState(examType);
}

function percentage(value: string | null) {
  if (value === null) return "Pending";
  return percentageLabel(value);
}

function feedbackMessage(value: string | undefined) {
  if (!value) return "";
  return decodeURIComponent(value);
}

function examSourceDescriptor(summary: {
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
}) {
  if (summary.source_type === "teacher" && summary.source_teacher_name) {
    return `${summary.source_label} · ${summary.source_teacher_name}`;
  }

  if (summary.source_name && summary.source_name !== summary.source_label) {
    return `${summary.source_label} · ${summary.source_name}`;
  }

  return summary.source_label;
}

function summaryStateCopy(summary: {
  exam_type: string;
  result_visible: boolean;
  review_available: boolean;
}) {
  if (summary.exam_type === "practice" && summary.review_available) {
    return {
      nextStep: "Review feedback",
      helper:
        "This practice set is designed for immediate learning. Open the review now to inspect answers, accepted responses, and explanations.",
      resultsCta: "Open Results",
      practiceCta: "Practice Again",
      reviewTone: "statusLive",
      reviewLabel: "Instant feedback ready",
    };
  }

  if (summary.review_available) {
    return {
      nextStep: "Review answers",
      helper:
        "Your attempt has moved beyond submission. You can now inspect answers and explanations allowed by policy.",
      resultsCta: "Open Results",
      practiceCta: "Open Practice",
      reviewTone: "statusLive",
      reviewLabel: "Review available",
    };
  }

  if (summary.result_visible) {
    return {
      nextStep: "Open results",
      helper:
        "Your result is now visible, but detailed answer review is still locked by the current exam policy.",
      resultsCta: "Open Results",
      practiceCta: "Practice Weak Areas",
      reviewTone: "statusWarning",
      reviewLabel: "Review locked",
    };
  }

  return {
    nextStep: "Wait for publication",
    helper:
      "Your attempt was submitted successfully. Scores and review will appear only after backend result visibility rules are met.",
    resultsCta: "Check Result Status",
    practiceCta: "Open Practice",
    reviewTone: "statusDemo",
    reviewLabel: "Waiting for publication",
  };
}

async function loadAttemptSummary(attemptId: string) {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return { source: "unconfigured" as const, summary: null, practiceExams: [] };
  }

  try {
    const [summary, exams] = await Promise.all([
      fetchStudentAttemptSummary(attemptId),
      fetchStudentAvailableExams(),
    ]);
    return {
      source: "live" as const,
      summary,
      practiceExams: exams.filter((exam) => exam.exam_type === "practice"),
    };
  } catch {
    return { source: "error" as const, summary: null, practiceExams: [] };
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
    redirect(`/app/attempts/${formData.get("attempt_id")}/summary?notice=${message}`);
  }
}

async function unlockPracticeAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const attemptId = String(formData.get("attempt_id") ?? "");
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
    redirect(`/app/attempts/${attemptId}/summary?notice=${message}`);
  }
}

export default async function AttemptSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { attemptId } = await params;
  const { notice } = await searchParams;
  const { source, summary, practiceExams } = await loadAttemptSummary(attemptId);

  if (!summary) {
    return (
      <div className="studentPage">
        <StudentPageHeader
          title="Attempt Summary"
          description="This route only renders real post-submit summary data from the backend."
          statusLabel={
            source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load summary"
          }
          statusTone={source === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for post-submit summary data"
              : "Attempt summary could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This route only renders real post-submit summary data from the backend. Configure the API base URL and sign in with an active student account to load the selected attempt summary."
              : "The post-submit summary view is connected to the backend, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Attempt summary endpoint", "Active student web session"]
              : ["Backend connectivity", "Attempt summary endpoint"]
          }
          ctaHref="/app/results"
          ctaLabel="Open Results"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      </div>
    );
  }

  const stateCopy = summaryStateCopy(summary);
  const practiceFollowUp = resolvePracticeFollowUpAction({
    exams: practiceExams,
  });

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        title={`${summary.exam_title} Summary`}
        description={`Post-submit ${attemptExperienceLabel(summary.exam_type)} summary powered by the backend attempt summary endpoint.`}
        action={<StatusPill tone="live">{titleCaseState(summary.status)}</StatusPill>}
      />

      {notice ? (
        <p className="feedbackBanner feedbackBannerSuccess">{feedbackMessage(notice)}</p>
      ) : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Post-Submit State</span>
          <strong>{stateCopy.nextStep}</strong>
          <small>
            {examSourceDescriptor(summary)} · {summary.result_visible ? "Result visible" : "Result pending"} ·{" "}
            {summary.review_available ? "Review available" : "Review locked"}
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <StatusPill tone="default">{summary.source_label}</StatusPill>
          {summary.source_type === "teacher" && summary.source_teacher_name ? (
            <StatusPill tone="demo">{summary.source_teacher_name}</StatusPill>
          ) : null}
          {summary.review_available ? (
            <Link className="button buttonPrimary" href={`/app/attempts/${summary.id}/review`}>
              Review Attempt
            </Link>
          ) : null}
          <Link className="button buttonSecondary" href="/app/results">
            {stateCopy.resultsCta}
          </Link>
        </div>
      </section>

      <StudentKpiGrid
        items={[
          {
            label: "Attempt Number",
            value: summary.attempt_no,
            note: summary.result_visible ? "Result visible" : "Result pending",
            tone: "primary",
          },
          {
            label: "Source",
            value: summary.source_label,
            note: summary.source_teacher_name || summary.source_name || "Backend source metadata",
          },
          {
            label: "Attempted Questions",
            value: summary.attempted_questions,
            note: `${summary.total_questions} total questions`,
          },
          {
            label: "Current Score",
            value: percentage(summary.percentage),
            note: summary.result_visible
              ? "Scoring details are now visible."
              : "Scoring is hidden until result visibility rules are met.",
          },
          {
            label: "Time Taken",
            value: durationMinutesLabel(summary.time_taken_seconds),
            note: "Captured from the submitted attempt",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Attempt Status</strong>
            <span className={`statusPill ${stateCopy.reviewTone}`}>{stateCopy.reviewLabel}</span>
          </div>

          <div className="studentResultBreakdown">
            <div>
              <span>Correct</span>
              <strong>{summary.correct_answers ?? "Pending"}</strong>
            </div>
            <div>
              <span>Incorrect</span>
              <strong>{summary.incorrect_answers ?? "Pending"}</strong>
            </div>
            <div>
              <span>Skipped</span>
              <strong>{summary.skipped_questions ?? "Pending"}</strong>
            </div>
          </div>

          <div className="studentResultFooter">
            <div className="studentResultHelper">
              <span>Next step</span>
              <strong>{stateCopy.nextStep}</strong>
              <small>{stateCopy.helper}</small>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recommended Actions</strong>
            <span>{attemptExperienceLabel(summary.exam_type)}</span>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Use summary first, then move into review or results.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Review and result visibility still depend on backend policy.</p>
            </div>
          </div>
          <div className="studentInsightHeroActions">
            {practiceFollowUp.exam && practiceFollowUp.action.mode === "start" ? (
              <form action={startPracticeAction}>
                <input name="exam_id" type="hidden" value={practiceFollowUp.exam.id} />
                <input name="student_id" type="hidden" value={summary.student} />
                <input name="attempt_id" type="hidden" value={summary.id} />
                <ActionSubmitButton
                  className="button buttonSecondary"
                  idleLabel={stateCopy.practiceCta}
                  pendingLabel="Starting..."
                />
              </form>
            ) : practiceFollowUp.exam && practiceFollowUp.action.mode === "unlock" ? (
              <form action={unlockPracticeAction}>
                <input name="exam_id" type="hidden" value={practiceFollowUp.exam.id} />
                <input name="attempt_id" type="hidden" value={summary.id} />
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
                  className="button buttonSecondary"
                  idleLabel={practiceFollowUp.action.label}
                  pendingLabel="Unlocking..."
                />
              </form>
            ) : (
              <Link className="button buttonSecondary" href={practiceFollowUp.action.href}>
                {practiceFollowUp.action.mode === "link"
                  ? stateCopy.practiceCta
                  : practiceFollowUp.action.label}
              </Link>
            )}
            <Link className="button buttonGhost" href="/app/dashboard">
              Back to Dashboard
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
