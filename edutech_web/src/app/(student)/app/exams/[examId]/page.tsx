import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { ComprehensionPassageTrigger } from "@/components/ui/comprehension-passage-trigger";
import { StudentExamExperiencePanel } from "@/components/ui/student-exam-experience-panel";
import { StudentQuestionMediaPanel } from "@/components/ui/student-question-media-panel";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StatusPill } from "@/components/ui/status-pill";
import { StudentSecurityPolicy } from "@/features/dashboard/types";
import {
  fetchStudentExamDetail,
  fetchStudentInsightSummary,
  fetchStudentAttempts,
  getStudentApiState,
  StudentApiError,
  spendStarsForContent,
  startStudentAttempt,
} from "@/lib/api/student";
import {
  questionTypeLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import { getExamSubjectDisplayLabel } from "@/lib/student/subject-context";

function examExperienceLabel(examType: string) {
  if (examType === "practice") return "practice set";
  if (examType === "mock_exam") return "mock test";
  return titleCaseState(examType);
}

function feedbackMessage(value: string | undefined) {
  if (!value) return "";
  return decodeURIComponent(value);
}

function examSourceDescriptor(detail: {
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
}) {
  if (detail.source_type === "teacher" && detail.source_teacher_name) {
    return `${detail.source_label} · ${detail.source_teacher_name}`;
  }

  if (detail.source_name && detail.source_name !== detail.source_label) {
    return `${detail.source_label} · ${detail.source_name}`;
  }

  return detail.source_label;
}

function securityTone(policy: StudentSecurityPolicy) {
  if (policy.violation_limit_enabled) {
    return "danger" as const;
  }
  if (policy.requires_fullscreen || policy.enhanced_monitoring) {
    return "warning" as const;
  }
  if (policy.tracks_focus_loss || policy.tracks_visibility_change) {
    return "demo" as const;
  }
  return "live" as const;
}

function compactText(value: string, limit = 180) {
  const normalized = value.replaceAll("\n", " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

function detailAvailabilityTone(args: {
  canResume: boolean;
  canStart: boolean;
  canOpenSummary: boolean;
  canOpenReview: boolean;
  availabilityState: string;
  isLocked: boolean;
  canUnlockWithStars: boolean;
  remainingAttempts: number;
}) {
  if (args.canResume || args.canStart) return "live" as const;
  if (args.isLocked && args.canUnlockWithStars) return "warning" as const;
  if (args.canOpenReview || args.canOpenSummary) return "demo" as const;
  if (args.availabilityState === "upcoming") return "warning" as const;
  if (args.remainingAttempts === 0 || args.availabilityState === "completed") return "danger" as const;
  return "default" as const;
}

function detailPrimaryActionLabel(args: {
  canResume: boolean;
  canStart: boolean;
  canOpenSummary: boolean;
  canOpenReview: boolean;
  isLocked: boolean;
  canUnlockWithStars: boolean;
  starCost: number;
}) {
  if (args.canResume) return "Resume";
  if (args.canStart) return "Start";
  if (args.isLocked && args.canUnlockWithStars) return `Unlock with ${args.starCost} stars`;
  if (args.canOpenSummary) return "Open summary";
  if (args.canOpenReview) return "Open review";
  return "Not available yet";
}

function detailAvailabilityHeadline(args: {
  examType: string;
  canResume: boolean;
  canStart: boolean;
  canOpenSummary: boolean;
  canOpenReview: boolean;
  availabilityState: string;
  isLocked: boolean;
  canUnlockWithStars: boolean;
  remainingAttempts: number;
}) {
  const experience = examExperienceLabel(args.examType);
  if (args.canResume) return `You already have a live ${experience} in progress`;
  if (args.canStart) return `You can start this ${experience} now`;
  if (args.isLocked && args.canUnlockWithStars) return `Unlock this ${experience} before starting`;
  if (args.isLocked) return `This ${experience} is currently blocked by access policy`;
  if (args.canOpenReview) return `Your completed ${experience} is ready for review`;
  if (args.canOpenSummary) return `Your latest ${experience} can be opened in summary mode`;
  if (args.availabilityState === "upcoming") return `This ${experience} has been assigned, but the window is not open yet`;
  if (args.remainingAttempts === 0) return `You have already used all attempts for this ${experience}`;
  if (args.availabilityState === "completed") return `This ${experience} window has closed`;
  return `This ${experience} is not startable right now`;
}

function detailActionGuidance(args: {
  examType: string;
  canResume: boolean;
  canStart: boolean;
  canOpenSummary: boolean;
  canOpenReview: boolean;
  availabilityState: string;
  isLocked: boolean;
  canUnlockWithStars: boolean;
  starCost: number;
  remainingAttempts: number;
  lockReasonMessage: string;
}) {
  const experience = examExperienceLabel(args.examType);
  if (args.canResume) {
    return `An active attempt already exists for this ${experience}. Re-enter it instead of starting another run.`;
  }
  if (args.canStart) {
    return `This ${experience} is live and ready. Starting it will create a new backend attempt under your student account immediately.`;
  }
  if (args.isLocked && args.canUnlockWithStars) {
    return `${args.starCost} stars are required before this ${experience} can be started. Unlock it once and the start action will become available right away.`;
  }
  if (args.isLocked) {
    return (
      args.lockReasonMessage || `This ${experience} is currently locked by backend access policy.`
    );
  }
  if (args.canOpenReview) {
    return "Your most recent attempt is complete and the backend currently allows answer review.";
  }
  if (args.canOpenSummary) {
    return "Your latest attempt is available in summary form, but answer review is still locked by policy.";
  }
  if (args.availabilityState === "upcoming") {
    return `This ${experience} is assigned to you, but its scheduled start window has not opened yet.`;
  }
  if (args.remainingAttempts === 0) {
    return "No additional attempts remain under the current attempt policy.";
  }
  if (args.availabilityState === "completed") {
    return `The active window for this ${experience} is over. You can only revisit history if the backend still exposes it.`;
  }
  return `Open the exam list again after the backend state changes, or review the availability and policy details below.`;
}

function detailNextStepBullets(args: {
  canResume: boolean;
  canStart: boolean;
  canOpenSummary: boolean;
  canOpenReview: boolean;
  isLocked: boolean;
  canUnlockWithStars: boolean;
  resultPublished: boolean;
  reviewAvailable: boolean;
  remainingAttempts: number;
}) {
  if (args.canResume) {
    return [
      "Resume is always the first action when a live attempt already exists.",
      "No duplicate active attempt will be created from this screen.",
      "After submission, the next stop will be the attempt summary.",
    ];
  }

  if (args.canStart) {
    return [
      `You still have ${args.remainingAttempts} attempt${args.remainingAttempts === 1 ? "" : "s"} available under the current policy.`,
      "Starting now opens the timed attempt workspace immediately.",
      "After submission, score and review still depend on result visibility policy.",
    ];
  }

  if (args.isLocked && args.canUnlockWithStars) {
    return [
      "Unlock happens before any attempt can begin.",
      "Once unlocked, you return to this same detail page with the start action available.",
      "Your current wallet balance and premium access history live in the wallet workspace.",
    ];
  }

  if (args.canOpenSummary || args.canOpenReview) {
    return [
      "Open summary first when you need the clearest post-submit status view.",
      args.reviewAvailable
        ? "Answer review is currently open by backend policy."
        : "Review is still blocked until backend visibility policy changes.",
      args.resultPublished
        ? "Published results are already visible in the results workspace."
        : "Results are still hidden until publication rules are met.",
    ];
  }

  return [
    "Check the availability window before trying again.",
    "Blocked or completed states are controlled by backend assignment and lifecycle rules.",
    "Use the exams list to compare which mock tests are ready, upcoming, or locked.",
  ];
}

function detailStartFlowGuidance(args: {
  examType: string;
  canResume: boolean;
  canStart: boolean;
  allowSectionSwitching: boolean;
  remainingAttempts: number;
}) {
  const experience = examExperienceLabel(args.examType);
  if (args.canResume) {
    return `Resuming takes you back into the live ${experience} workspace immediately, with your saved attempt state and current timer policy restored from the backend.`;
  }
  if (args.canStart) {
    return `Starting creates a fresh backend attempt right away. You will land in the timed workspace, follow the current section policy, and then return to summary after submission. You still have ${args.remainingAttempts} attempt${args.remainingAttempts === 1 ? "" : "s"} available under the current rule set.`;
  }
  return args.allowSectionSwitching
    ? "When this exam becomes available, you will be able to move between sections during the attempt."
    : "When this exam becomes available, the attempt will keep you in a more guided section sequence.";
}

async function startAttemptAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  if (!examId) return;

  try {
    const summary = await fetchStudentInsightSummary();
    const response = await startStudentAttempt(examId, summary.student_id);
    redirect(`/app/attempts/${response.data.id}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to start this attempt right now.";
    redirect(`/app/exams/${examId}?error=${message}`);
  }
}

async function unlockExamAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const contentType = String(formData.get("content_type") ?? "");
  const contentKey = String(formData.get("content_key") ?? "");
  const subject = String(formData.get("subject_id") ?? "").trim();

  if (!examId || !contentType || !contentKey) {
    redirect("/app/exams?error=Unable%20to%20resolve%20the%20selected%20exam.");
  }

  try {
    const response = await spendStarsForContent({
      content_type: contentType,
      content_key: contentKey,
      subject: subject || null,
    });
    redirect(
      `/app/exams/${examId}?message=${encodeURIComponent(
        response.data.message || "Exam unlocked successfully.",
      )}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to unlock this exam right now.";
    redirect(`/app/exams/${examId}?error=${message}`);
  }
}

async function loadExamDetail(examId: string) {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return { source: "unconfigured" as const, detail: null };
  }

  try {
    const detail = await fetchStudentExamDetail(examId);
    return { source: "live" as const, detail };
  } catch (error) {
    const errorStatus =
      error instanceof StudentApiError
        ? error.status
        : typeof error === "object" &&
            error !== null &&
            "status" in error &&
            typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : null;
    const normalizedMessage =
      error instanceof Error && typeof error.message === "string"
        ? error.message.toLowerCase()
        : "";

    if (errorStatus !== null || normalizedMessage.length > 0) {
      const looksLikeVisibilityOrAssignmentBlock =
        errorStatus === 401 ||
        errorStatus === 403 ||
        errorStatus === 404 ||
        normalizedMessage.includes("not assigned") ||
        normalizedMessage.includes("not available") ||
        normalizedMessage.includes("permission") ||
        normalizedMessage.includes("not found");

      if (looksLikeVisibilityOrAssignmentBlock) {
        return { source: "blocked" as const, detail: null };
      }
    }
    return { source: "error" as const, detail: null };
  }
}

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { examId } = await params;
  const { error, message } = await searchParams;
  const { source, detail } = await loadExamDetail(examId);

  if (!detail) {
    return (
      <div className="studentPage">
        <StudentPageHeader
          title="Exam Detail"
          description="This route only renders real exam readiness data from the backend."
          statusLabel={
            source === "unconfigured"
              ? "Backend not configured"
              : source === "blocked"
                ? "Not available to this student"
                : "Unable to load exam detail"
          }
          statusTone={source === "unconfigured" ? "warning" : source === "blocked" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={
            source === "unconfigured"
              ? "Setup required"
              : source === "blocked"
                ? "Access limited"
                : "Load issue"
          }
          title={
            source === "unconfigured"
              ? "Waiting for live exam detail"
              : source === "blocked"
                ? "This exam is not available in your workspace"
                : "Exam detail could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This route only renders real exam readiness data from the backend. Configure the API base URL and sign in with an active student account to load the selected exam."
              : source === "blocked"
                ? "This exam is either not assigned to your student account, belongs to a different access scope, or is no longer visible under the current exam policy."
                : "The exam detail workspace is connected to the backend, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Exam detail endpoint", "Active student web session"]
              : source === "blocked"
                ? ["Student assignment scope", "Exam visibility policy"]
              : ["Backend connectivity", "Exam detail endpoint"]
          }
          ctaHref="/app/exams"
          ctaLabel="Back to Exams"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : source === "blocked"
                ? "Check assigned exams"
              : "Retry after backend check"
          }
        />
      </div>
    );
  }

  const canStart =
    detail.availability_state === "available_now" &&
    !detail.economy_access.is_locked &&
    !detail.active_attempt &&
    detail.remaining_attempts > 0;
  const canResume = Boolean(detail.active_attempt);
  const attempts = await fetchStudentAttempts().catch(() => []);
  const latestAttempt = attempts.find((attempt) => attempt.exam === detail.id) ?? null;
  const canOpenSummary = Boolean(latestAttempt);
  const canOpenReview = Boolean(latestAttempt && detail.review_available);
  const detailSubjectLabel = getExamSubjectDisplayLabel(detail);
  const questionTypeCounts = detail.exam_questions.reduce<Record<string, number>>(
    (accumulator, question) => {
      const key = question.question_type;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    },
    {},
  );
  const questionBlueprint = detail.exam_questions
    .slice()
    .sort((left, right) => {
      const leftSection = left.section_order ?? Number.MAX_SAFE_INTEGER;
      const rightSection = right.section_order ?? Number.MAX_SAFE_INTEGER;
      if (leftSection !== rightSection) {
        return leftSection - rightSection;
      }
      return left.question_order - right.question_order;
    });
  const primaryActionLabel = detailPrimaryActionLabel({
    canResume,
    canStart,
    canOpenSummary,
    canOpenReview,
    isLocked: detail.economy_access.is_locked,
    canUnlockWithStars: detail.economy_access.can_unlock_with_stars,
    starCost: detail.economy_access.star_cost,
  });
  const actionHeadline = detailAvailabilityHeadline({
    examType: detail.exam_type,
    canResume,
    canStart,
    canOpenSummary,
    canOpenReview,
    availabilityState: detail.availability_state,
    isLocked: detail.economy_access.is_locked,
    canUnlockWithStars: detail.economy_access.can_unlock_with_stars,
    remainingAttempts: detail.remaining_attempts,
  });
  const actionGuidance = detailActionGuidance({
    examType: detail.exam_type,
    canResume,
    canStart,
    canOpenSummary,
    canOpenReview,
    availabilityState: detail.availability_state,
    isLocked: detail.economy_access.is_locked,
    canUnlockWithStars: detail.economy_access.can_unlock_with_stars,
    starCost: detail.economy_access.star_cost,
    remainingAttempts: detail.remaining_attempts,
    lockReasonMessage: detail.economy_access.lock_reason_message,
  });
  const nextStepBullets = detailNextStepBullets({
    canResume,
    canStart,
    canOpenSummary,
    canOpenReview,
    isLocked: detail.economy_access.is_locked,
    canUnlockWithStars: detail.economy_access.can_unlock_with_stars,
    resultPublished: detail.result_published,
    reviewAvailable: detail.review_available,
    remainingAttempts: detail.remaining_attempts,
  });
  const startFlowGuidance = detailStartFlowGuidance({
    examType: detail.exam_type,
    canResume,
    canStart,
    allowSectionSwitching: detail.allow_section_switching,
    remainingAttempts: detail.remaining_attempts,
  });

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerExamDetailPage">
      <StudentPageHeader
        title={detail.title}
        description={`${titleCaseState(detail.exam_type)} detail backed by the student exam detail endpoint, with runtime rules and next actions surfaced clearly.`}
        action={
          <div className="studentInsightHeroActions">
            <StatusPill
              tone={detailAvailabilityTone({
                canResume,
                canStart,
                canOpenSummary,
                canOpenReview,
                availabilityState: detail.availability_state,
                isLocked: detail.economy_access.is_locked,
                canUnlockWithStars: detail.economy_access.can_unlock_with_stars,
                remainingAttempts: detail.remaining_attempts,
              })}
            >
              {primaryActionLabel}
            </StatusPill>
            <StatusPill tone="default">{titleCaseState(detail.availability_state)}</StatusPill>
          </div>
        }
      />

      {message ? (
        <p className="feedbackBanner feedbackBannerSuccess">{feedbackMessage(message)}</p>
      ) : null}
      {error ? (
        <p className="feedbackBanner feedbackBannerError">{feedbackMessage(error)}</p>
      ) : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Exam Readiness</span>
          <strong>{actionHeadline}</strong>
          <small>
            {detail.code} · {examSourceDescriptor(detail)} · {detailSubjectLabel} ·{" "}
            {detail.start_at ? studentDateTimeLabel(detail.start_at) : "Backend scheduled"}
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <StatusPill tone="default">{detail.source_label}</StatusPill>
          {detail.source_type === "teacher" && detail.source_teacher_name ? (
            <StatusPill tone="demo">{detail.source_teacher_name}</StatusPill>
          ) : null}
          <Link className="button buttonSecondary" href="/app/exams">
            Back to Exams
          </Link>
        </div>
      </section>

      <StudentKpiGrid
        items={[
          {
            label: "Exam Code",
            value: detail.code,
            note: detailSubjectLabel,
            tone: "primary",
          },
          {
            label: "Source",
            value: detail.source_label,
            note: detail.source_teacher_name || detail.source_name || "Backend source metadata",
          },
          {
            label: "Questions",
            value: detail.exam_questions.length,
            note: `${detail.sections.length} sections · ${Object.keys(questionTypeCounts).length} question formats`,
          },
          {
            label: "Attempts Left",
            value: detail.remaining_attempts,
            note: `${detail.attempts_used} used so far`,
          },
          {
            label: "Security",
            value: detail.security_policy.student_label,
            note: detail.security_policy.requires_fullscreen
              ? "Fullscreen required"
              : "Standard learner guidance",
          },
          {
            label: "Star Access",
            value: detail.economy_access.requires_unlock
              ? detail.economy_access.is_unlocked
                ? "Unlocked"
                : detail.economy_access.can_unlock_with_stars
                  ? `${detail.economy_access.star_cost} stars`
                  : "Policy locked"
              : "Free",
            note: detail.economy_access.lock_reason_message || "Economy policy synced from backend",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Availability and Runtime</strong>
            <StatusPill tone={securityTone(detail.security_policy)}>
              {detail.security_policy.student_label}
            </StatusPill>
          </div>

          <div className="studentResultStatGrid">
            <div className="studentResultStat">
              <span>Available from</span>
              <strong>
                {detail.start_at
                  ? studentDateTimeLabel(detail.start_at)
                  : "Backend scheduled"}
              </strong>
            </div>
            <div className="studentResultStat">
              <span>Available until</span>
              <strong>
                {detail.end_at
                  ? studentDateTimeLabel(detail.end_at)
                  : "Per backend policy"}
              </strong>
            </div>
            <div className="studentResultStat">
              <span>Navigation</span>
              <strong>
                {detail.allow_section_switching ? "Flexible sections" : "Sequential flow"}
              </strong>
            </div>
            <div className="studentResultStat">
              <span>Review state</span>
              <strong>{detail.review_available ? "Open" : "Policy-based"}</strong>
            </div>
            <div className="studentResultStat">
              <span>Star access</span>
              <strong>
                {detail.economy_access.requires_unlock
                  ? detail.economy_access.is_unlocked
                    ? "Unlocked"
                    : detail.economy_access.can_unlock_with_stars
                      ? `${detail.economy_access.star_cost} stars`
                      : "Restricted"
                  : "Free"}
              </strong>
            </div>
          </div>

          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                {detail.instructions ||
                  "No additional exam instructions were provided by the backend."}
              </p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                Results are {detail.result_published ? "already published" : "not published yet"}, and review is{" "}
                {detail.review_available ? "currently open" : "still locked by policy"}.
              </p>
            </div>
            {detail.economy_access.requires_unlock ? (
              <div className="studentInsightMessage">
                <span className="placeholderDot" aria-hidden="true" />
                <p>
                  {detail.economy_access.is_unlocked
                    ? "This exam has already been unlocked for your student account."
                    : detail.economy_access.lock_reason_message ||
                      "This exam is governed by star-based access control."}
                </p>
              </div>
            ) : null}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Primary Action</strong>
            <StatusPill
              tone={detailAvailabilityTone({
                canResume,
                canStart,
                canOpenSummary,
                canOpenReview,
                availabilityState: detail.availability_state,
                isLocked: detail.economy_access.is_locked,
                canUnlockWithStars: detail.economy_access.can_unlock_with_stars,
                remainingAttempts: detail.remaining_attempts,
              })}
            >
              {primaryActionLabel}
            </StatusPill>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>{actionGuidance}</p>
            </div>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>{startFlowGuidance}</p>
            </div>
          </div>
          <div className="studentInsightMessageStack">
            {nextStepBullets.map((bullet) => (
              <div className="studentInsightMessage" key={bullet}>
                <span className="placeholderDot" aria-hidden="true" />
                <p>{bullet}</p>
              </div>
            ))}
          </div>

          <div className="studentInsightHeroActions">
            {canResume && detail.active_attempt ? (
              <Link className="button buttonPrimary" href={`/app/attempts/${detail.active_attempt.id}`}>
                Resume
              </Link>
            ) : null}

            {canStart ? (
              <form action={startAttemptAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <ActionSubmitButton
                  className="button buttonPrimary"
                  idleLabel="Start"
                  pendingLabel="Starting..."
                />
              </form>
            ) : null}

            {!canResume &&
            !canStart &&
            detail.economy_access.is_locked &&
            detail.economy_access.can_unlock_with_stars ? (
              <>
                <form action={unlockExamAction}>
                  <input name="exam_id" type="hidden" value={detail.id} />
                  <input
                    name="content_type"
                    type="hidden"
                    value={detail.economy_access.content_type}
                  />
                  <input
                    name="content_key"
                    type="hidden"
                    value={detail.economy_access.content_key}
                  />
                  <input
                    name="subject_id"
                    type="hidden"
                    value={detail.economy_access.subject_id ?? ""}
                  />
                  <ActionSubmitButton
                    className="button buttonPrimary"
                    idleLabel={`Unlock with ${detail.economy_access.star_cost} stars`}
                    pendingLabel="Unlocking..."
                  />
                </form>
                <Link className="button buttonSecondary" href="/app/wallet">
                  Open Wallet
                </Link>
              </>
            ) : null}

            {!canResume && !canStart && canOpenSummary && latestAttempt ? (
              <>
                <Link className="button buttonPrimary" href={`/app/attempts/${latestAttempt.id}/summary`}>
                  Open Summary
                </Link>
                {canOpenReview ? (
                  <Link className="button buttonSecondary" href={`/app/attempts/${latestAttempt.id}/review`}>
                    Open Review
                  </Link>
                ) : null}
              </>
            ) : null}

            {!canResume && !canStart && !canOpenSummary ? (
              <button className="button buttonSecondary" disabled type="button">
                Not Available Yet
              </button>
            ) : null}
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <StudentExamExperiencePanel profile={detail.experience_profile} />
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Exam Rules</strong>
            <span>Before you begin</span>
          </div>
          <div className="studentTopicStack">
            <div className="studentTopicRow">
              <div>
                <strong>Duration</strong>
                <span>{detail.duration_minutes} minutes</span>
              </div>
              <div className="studentTopicRowMeta">
                <strong>{detail.total_marks}</strong>
                <span>Total marks</span>
              </div>
            </div>
            <div className="studentTopicRow">
              <div>
                <strong>Navigation</strong>
                <span>
                  {detail.allow_section_switching
                    ? "Section switching allowed"
                    : "Sequential sections"}
                </span>
              </div>
              <div className="studentTopicRowMeta">
                <strong>{detail.passing_marks}</strong>
                <span>Passing marks</span>
              </div>
            </div>
            <div className="studentTopicRow">
              <div>
                <strong>Review availability</strong>
                <span>
                  {detail.review_available
                    ? "Review currently available"
                    : "Review depends on result visibility"}
                </span>
              </div>
              <div className="studentTopicRowMeta">
                <strong>{detail.result_published ? "Published" : "Pending"}</strong>
                <span>Result visibility</span>
              </div>
            </div>
            <div className="studentTopicRow">
                <div>
                  <strong>Question mix</strong>
                  <span>
                  {Object.entries(questionTypeCounts)
                    .map(([type, count]) => `${count} ${questionTypeLabel(type).toLowerCase()}`)
                    .join(", ")}
                </span>
              </div>
              <div className="studentTopicRowMeta">
                <StatusPill tone={securityTone(detail.security_policy)}>
                  {detail.security_policy.student_label}
                </StatusPill>
              </div>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Section Overview</strong>
            <span>{detail.sections.length} sections</span>
          </div>
          <div className="studentTopicStack">
            {detail.sections.map((section) => (
              <div className="studentTopicRow" key={section.id}>
                <div>
                  <strong>{section.name}</strong>
                  <span>
                    Section {section.section_order} · {section.linked_questions_count} questions
                  </span>
                </div>
                <div className="studentTopicRowMeta">
                  <strong>
                    {section.timer_enabled ? "Timed section" : "Shared timer"}
                  </strong>
                  <span>
                    {section.allow_skip_section ? "Skip allowed" : "Complete in sequence"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Question Blueprint</strong>
          <span>{questionBlueprint.length} preview items</span>
        </div>
        <div className="studentTopicStack">
          {questionBlueprint.map((question, index) => {
            const previousQuestion = questionBlueprint[index - 1];
            const shouldShowPassageTrigger =
              Boolean(question.passage && question.passage_detail?.passage_text) &&
              previousQuestion?.passage !== question.passage;

            return (
              <article className="attemptQuestionCard" key={question.id}>
                <div className="attemptQuestionHeader">
                  <div>
                    <strong>
                      Q{question.question_order}. {compactText(question.question_text, 120)}
                    </strong>
                    <span>
                      {question.section_title
                        ? `${question.section_title} · ${questionTypeLabel(question.question_type, question.question_type_definition)}`
                        : questionTypeLabel(question.question_type, question.question_type_definition)}
                    </span>
                  </div>
                  <StatusPill tone="demo">
                    {question.marks ?? "Default"} marks
                  </StatusPill>
                </div>

                {shouldShowPassageTrigger ? (
                  <div className="questionBankTagRow">
                    <span className="questionBankTagChip">Shared passage</span>
                    <ComprehensionPassageTrigger
                      buttonClassName="button buttonGhost"
                      buttonLabel="Open Passage"
                      contentFormat={question.passage_detail?.content_format}
                      description={question.passage_detail?.description}
                      metaLabel={question.passage_detail?.title || "Comprehension"}
                      passageText={question.passage_detail?.passage_text || ""}
                      title={question.passage_detail?.title || "Comprehension passage"}
                    />
                  </div>
                ) : null}

                <p className="studentNotificationMessage">
                  {compactText(question.question_text, 260)}
                </p>
                {question.media_context.has_media ? (
                  <StudentQuestionMediaPanel
                    attachments={question.attachments}
                    mediaContext={question.media_context}
                  />
                ) : null}

                <div className="questionBankTagRow">
                  <span className="questionBankTagChip">
                    {question.options.length} option{question.options.length === 1 ? "" : "s"}
                  </span>
                  {question.passage_detail?.title ? (
                    <span className="questionBankTagChip">{question.passage_detail.title}</span>
                  ) : null}
                  {question.attachments.length ? (
                    <span className="questionBankTagChip">
                      {question.attachments.length} attachment{question.attachments.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
