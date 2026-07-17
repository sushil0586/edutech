import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPassiveNavLink } from "@/components/ui/student-passive-nav-link";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StudentWorkspaceLink as Link } from "@/components/ui/student-workspace-link";
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
import {
  attemptOutcomeHelper,
  attemptOutcomeJourney,
  attemptOutcomeLabel,
  attemptOutcomeProgressLabel,
  attemptOutcomeResultsLabel,
  attemptOutcomeReviewLabel,
  attemptOutcomeTone,
  resolveAttemptOutcomeState,
} from "@/lib/student/attempt-outcome";
import { buildPracticeHref, resolvePracticeFollowUpAction } from "@/lib/student/practice";
import { buildFilterHref } from "@/lib/workspace/filter-utils";

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
  const outcomeState = resolveAttemptOutcomeState({
    resultVisible: summary.result_visible,
    reviewAvailable: summary.review_available,
  });

  if (summary.exam_type === "practice" && outcomeState === "review_ready") {
    const journey = attemptOutcomeJourney(outcomeState);
    return {
      nextStep: "Review feedback",
      helper: "This practice set is ready for feedback.",
      progress: attemptOutcomeProgressLabel(outcomeState),
      resultsCta: journey.resultsCta,
      reviewCta: journey.reviewCta,
      practiceCta: "Practice Again",
      reviewTone: attemptOutcomeTone(outcomeState),
      reviewLabel: "Instant feedback ready",
      laneLabel: journey.laneLabel,
      laneHelper: journey.laneHelper,
    };
  }

  if (outcomeState === "review_ready") {
    const journey = attemptOutcomeJourney(outcomeState);
    return {
      nextStep: "Review answers",
      helper: "Your result is ready and answer review is available.",
      progress: attemptOutcomeProgressLabel(outcomeState),
      resultsCta: journey.resultsCta,
      reviewCta: journey.reviewCta,
      practiceCta: "Open Practice",
      reviewTone: attemptOutcomeTone(outcomeState),
      reviewLabel: attemptOutcomeLabel(outcomeState),
      laneLabel: journey.laneLabel,
      laneHelper: journey.laneHelper,
    };
  }

  if (outcomeState === "published_summary_only") {
    const journey = attemptOutcomeJourney(outcomeState);
    return {
      nextStep: "Open results",
      helper: "Your result is available now. Answer review is still locked.",
      progress: attemptOutcomeProgressLabel(outcomeState),
      resultsCta: journey.resultsCta,
      reviewCta: journey.reviewCta,
      practiceCta: "Practice Weak Areas",
      reviewTone: attemptOutcomeTone(outcomeState),
      reviewLabel: "Review locked",
      laneLabel: journey.laneLabel,
      laneHelper: journey.laneHelper,
    };
  }

  const journey = attemptOutcomeJourney(outcomeState);
  return {
    nextStep: "Wait for publication",
    helper: "Your attempt was submitted successfully. Results will appear after evaluation.",
    progress: attemptOutcomeProgressLabel(outcomeState),
    resultsCta: journey.resultsCta,
    reviewCta: journey.reviewCta,
    practiceCta: "Open Practice",
    reviewTone: attemptOutcomeTone(outcomeState),
    reviewLabel: attemptOutcomeLabel(outcomeState),
    laneLabel: journey.laneLabel,
    laneHelper: journey.laneHelper,
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
  searchParams: Promise<{ notice?: string; subject?: string; source?: string; teacher?: string }>;
}) {
  const { attemptId } = await params;
  const { notice, subject, source: sourceParam, teacher } = await searchParams;
  const { source: summarySource, summary, practiceExams } = await loadAttemptSummary(attemptId);

  if (!summary) {
    return (
      <div className="studentPage">
        <StudentPageHeader
      title="Attempt Summary"
      description="View the latest summary for this submitted attempt."
          statusLabel={
            summarySource === "unconfigured"
              ? "Sign in required"
              : "Unable to load summary"
          }
          statusTone={summarySource === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={summarySource === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            summarySource === "unconfigured"
              ? "Summary is not available yet"
              : "Attempt summary could not be loaded"
          }
          description={
            summarySource === "unconfigured"
              ? "Sign in with your student account to load the summary for this attempt."
              : "We couldn't load this attempt summary right now."
          }
          bullets={
            summarySource === "unconfigured"
              ? ["Student sign-in", "Attempt summary"]
              : ["Connection check", "Attempt summary"]
          }
          ctaHref="/app/results"
          ctaLabel="Open Results"
          statusLabel={
            summarySource === "unconfigured"
              ? "Sign in to continue"
              : "Try again soon"
          }
        />
      </div>
    );
  }

  const stateCopy = summaryStateCopy(summary);
  const outcomeState = resolveAttemptOutcomeState({
    resultVisible: summary.result_visible,
    reviewAvailable: summary.review_available,
  });
  const practiceFollowUp = resolvePracticeFollowUpAction({
    exams: practiceExams,
  });
  const scopedSubjectParam = subject?.trim() ? subject.trim() : undefined;
  const scopedPracticeHref = buildPracticeHref({
    subjectName: scopedSubjectParam ?? null,
    source: sourceParam?.trim() ?? null,
    teacher: teacher?.trim() ?? null,
  });

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerAttemptSummaryPage">
      <StudentPageHeader
        title={`${summary.exam_title} Summary`}
        description={`Check your ${attemptExperienceLabel(summary.exam_type)} status, score, and next step.`}
        action={<StatusPill tone="live">{titleCaseState(summary.status)}</StatusPill>}
      />

      {notice ? (
        <p className="feedbackBanner feedbackBannerSuccess">{feedbackMessage(notice)}</p>
      ) : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Attempt Summary</span>
          <strong>{stateCopy.nextStep}</strong>
          <small>
            {examSourceDescriptor(summary)} · {attemptOutcomeResultsLabel(outcomeState)} ·{" "}
            {attemptOutcomeReviewLabel(outcomeState)} ·{" "}
            {stateCopy.laneLabel}
          </small>
          <div className="studentInsightHeroActions studentSummaryHeroMeta">
            <StatusPill tone="default">{summary.source_label}</StatusPill>
            {summary.source_type === "teacher" && summary.source_teacher_name ? (
              <StatusPill tone="demo">{summary.source_teacher_name}</StatusPill>
            ) : null}
          </div>
        </div>
        <div className="studentInsightHeroActions studentSummaryHeroActions">
          {summary.review_available ? (
            <Link
              className="button buttonPrimary"
              href={buildFilterHref(`/app/attempts/${summary.id}/review`, [
                ["subject", scopedSubjectParam],
                ["source", sourceParam?.trim()],
                ["teacher", teacher?.trim()],
              ])}
            >
              {stateCopy.reviewCta}
            </Link>
          ) : null}
          <StudentPassiveNavLink
            className="button buttonSecondary"
            href={buildFilterHref("/app/results", [
              ["subject", scopedSubjectParam],
              ["source", sourceParam?.trim()],
              ["teacher", teacher?.trim()],
            ])}
          >
            {stateCopy.resultsCta}
          </StudentPassiveNavLink>
        </div>
      </section>

      <div className="studentSummaryUtilityRow">
        <StudentPassiveNavLink
          className="studentDashboardTextLink"
          href={buildFilterHref("/app/attempts", [
            ["subject", scopedSubjectParam],
            ["source", sourceParam?.trim()],
            ["teacher", teacher?.trim()],
          ])}
        >
          View Attempt History
        </StudentPassiveNavLink>
      </div>

      <StudentKpiGrid
        items={[
          {
            label: "Attempt Number",
            value: summary.attempt_no,
            note: `${attemptOutcomeResultsLabel(outcomeState)} · ${attemptOutcomeReviewLabel(outcomeState)}`,
            tone: "primary",
          },
          {
            label: "Source",
            value: summary.source_label,
            note: summary.source_teacher_name || summary.source_name || "Source details",
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
              : "Scoring will appear once the result is released.",
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
            <StatusPill tone={stateCopy.reviewTone}>{stateCopy.reviewLabel}</StatusPill>
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
            <strong>What To Do Next</strong>
            <span>{attemptExperienceLabel(summary.exam_type)}</span>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>{stateCopy.helper}</p>
              </div>
              <div className="studentInsightMessage">
                <span className="placeholderDot" aria-hidden="true" />
                <p>{stateCopy.progress}</p>
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
              <Link
                className="button buttonSecondary"
                href={
                  practiceFollowUp.action.mode === "link" &&
                  practiceFollowUp.action.href === "/app/practice"
                    ? scopedPracticeHref
                    : practiceFollowUp.action.href
                }
              >
                {practiceFollowUp.action.mode === "link"
                  ? stateCopy.practiceCta
                  : practiceFollowUp.action.label}
              </Link>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
