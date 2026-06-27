import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { AttemptCountdown } from "@/components/ui/attempt-countdown";
import { AttemptFullscreenButton } from "@/components/ui/attempt-fullscreen-button";
import { AttemptActionForm } from "@/components/ui/attempt-action-form";
import {
  AttemptNavigationGuard,
  AttemptQuestionRestore,
} from "@/components/ui/attempt-navigation-guard";
import { AttemptQuestionLink } from "@/components/ui/attempt-question-link";
import { AttemptResiliencePanel } from "@/components/ui/attempt-resilience-panel";
import { AttemptQuestionShortcuts } from "@/components/ui/attempt-question-shortcuts";
import { AttemptSecurityGuard } from "@/components/ui/attempt-security-guard";
import { AttemptTimerAutoSubmit } from "@/components/ui/attempt-timer-auto-submit";
import { StudentQuestionPrompt } from "@/components/ui/student-question-prompt";
import { StudentSectionMediaPanel } from "@/components/ui/student-section-media-panel";
import { StudentExamExperiencePanel } from "@/components/ui/student-exam-experience-panel";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentResponseArtifactPanel } from "@/components/ui/student-response-artifact-panel";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  StudentSecurityPolicy,
} from "@/features/dashboard/types";
import {
  fetchStudentAttemptDetail,
  getStudentApiState,
  saveStudentAnswer,
  submitStudentAttempt,
  switchStudentAttemptSection,
} from "@/lib/api/student";
import {
  questionTypeLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import {
  questionTypeAllowedResponseArtifactKinds,
  questionTypeSupportsMultipleSelection,
  questionTypeSupportsResponseArtifacts,
  questionTypeSupportsTextAnswer,
} from "@/lib/assessment/question-type";
import { buildQuestionTypePresentationProfile } from "@/lib/assessment/question-type-presentation";

const ATTEMPT_QUESTION_ANCHOR_ID = "attempt-current-question";

function feedbackMessage(value: string | undefined) {
  if (!value) return "";
  return decodeURIComponent(value);
}

function encodeFeedbackValue(value: string) {
  return encodeURIComponent(value);
}

function buildAttemptUrl(
  attemptId: string,
  params: Record<string, string | null | undefined>,
  hash?: string,
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return `/app/attempts/${attemptId}${queryString ? `?${queryString}` : ""}${
    hash ? `#${hash}` : ""
  }`;
}

function latestAnswerSyncAt(
  answers: Array<{
    answered_at: string | null;
    updated_at: string;
  }>,
) {
  return (
    answers.reduce<string | null>((latest, answer) => {
      const candidate = answer.answered_at ?? answer.updated_at ?? null;
      if (!candidate) return latest;
      if (!latest) return candidate;
      return new Date(candidate).getTime() > new Date(latest).getTime()
        ? candidate
        : latest;
    }, null) ?? null
  );
}

function secondsRemaining(targetIso: string | null, serverTimeIso: string) {
  if (!targetIso) return null;

  const targetTime = new Date(targetIso).getTime();
  const serverTime = new Date(serverTimeIso).getTime();

  if (Number.isNaN(targetTime) || Number.isNaN(serverTime)) {
    return null;
  }

  return Math.max(Math.floor((targetTime - serverTime) / 1000), 0);
}

function securityTone(policy: StudentSecurityPolicy) {
  if (policy.violation_limit_enabled) return "danger" as const;
  if (policy.requires_fullscreen || policy.enhanced_monitoring) {
    return "warning" as const;
  }
  if (policy.tracks_focus_loss || policy.tracks_visibility_change) {
    return "demo" as const;
  }
  return "live" as const;
}

function timePressureTone(secondsRemaining: number | null) {
  if (secondsRemaining === null) return "default" as const;
  if (secondsRemaining <= 300) return "danger" as const;
  if (secondsRemaining <= 900) return "warning" as const;
  return "live" as const;
}

function attemptSaveStateTone(args: {
  isLockedAttemptState: boolean;
  latestSavedAt: string | null;
  notice: string;
  error: string;
}) {
  if (args.error) return "danger" as const;
  if (args.isLockedAttemptState) return "danger" as const;
  if (args.notice || args.latestSavedAt) return "live" as const;
  return "demo" as const;
}

function looksLikeNeetValue(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.includes("neet") || normalized.includes("medical entrance");
}

function attemptSaveStateLabel(args: {
  isLockedAttemptState: boolean;
  latestSavedAt: string | null;
  notice: string;
  error: string;
}) {
  if (args.error) return "Save needs retry";
  if (args.isLockedAttemptState) return "Attempt locked";
  if (args.notice || args.latestSavedAt) return "Responses saved";
  return "Save pending";
}

function parseResponseArtifacts(value: string) {
  if (!value.trim()) {
    return [] as Array<{
      asset_kind: string;
      upload_token: string;
      file_name?: string;
      mime_type?: string;
      size_bytes?: number;
      duration_seconds?: number;
      storage_status?: string;
      checksum?: string;
      storage_path?: string;
      file_url?: string;
    }>;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasSavedResponse(answer: {
  selected_option: string | null;
  selected_option_ids: string[];
  answer_text: string;
  answer_transcript: string;
  response_artifacts: Array<{ upload_token: string }>;
} | null | undefined) {
  if (!answer) return false;

  return Boolean(
    answer.selected_option ||
      answer.selected_option_ids.length > 0 ||
      answer.answer_text.trim() ||
      answer.answer_transcript.trim() ||
      answer.response_artifacts.length > 0,
  );
}

async function loadAttemptDetail(attemptId: string) {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return { source: "unconfigured" as const, detail: null };
  }

  try {
    const detail = await fetchStudentAttemptDetail(attemptId);
    return { source: "live" as const, detail };
  } catch {
    return { source: "error" as const, detail: null };
  }
}

export default async function AttemptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{
    action?: string;
    confirmedAt?: string;
    error?: string;
    notice?: string;
    question?: string;
    savedAt?: string;
  }>;
}) {
  const { attemptId } = await params;
  const { action, confirmedAt, error, notice, question, savedAt } =
    await searchParams;
  const { source, detail } = await loadAttemptDetail(attemptId);
  const decodedError = feedbackMessage(error);
  const decodedNotice = feedbackMessage(notice);

  if (!detail) {
    return (
      <div className="studentPage">
        <StudentPageHeader
          title="Attempt Workspace"
          description="This route only renders real attempt data from the backend."
          statusLabel={
            source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load attempt"
          }
          statusTone={source === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for live attempt data"
              : "Attempt workspace could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This route only renders real attempt data from the backend. Configure the API base URL and sign in with an active student account to continue the selected attempt."
              : "The attempt workspace is connected to live save-answer and submit endpoints, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Attempt detail endpoint", "Active student web session"]
              : ["Backend connectivity", "Attempt detail endpoint"]
          }
          ctaHref="/app/exams"
          ctaLabel="Back to Exams"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      </div>
    );
  }

  const safeQuestions = detail.questions.filter(
    (
      item,
    ): item is (typeof detail.questions)[number] & {
      id: string;
      question: string;
    } => Boolean(item?.id && item?.question),
  );
  const answerMap = new Map(detail.answers.map((answer) => [answer.question, answer]));
  const currentSectionId = detail.section_runtime.current_section_id ?? null;
  const currentSectionName = detail.section_runtime.current_section_name ?? null;
  const visitedSectionIds = detail.section_runtime.visited_section_ids ?? [];
  const sections = Array.from(
    new Map(
      safeQuestions
        .filter((question) => question.section)
        .map((question) => [
          question.section as string,
          {
            id: question.section as string,
            name: question.section_title ?? question.section_name,
            order: question.section_order ?? 0,
            questionCount: 0,
          },
        ]),
    ).values(),
  )
    .filter(
      (
        section,
      ): section is {
        id: string;
        name: string;
        order: number;
        questionCount: number;
      } => Boolean(section?.id),
    )
    .map((section) => ({
      ...section,
      questionCount: safeQuestions.filter(
        (question) => question.section === section.id,
      ).length,
    }))
    .sort((a, b) => a.order - b.order);
  const visibleQuestions = currentSectionId
    ? safeQuestions.filter((question) => question.section === currentSectionId)
    : safeQuestions;
  const activeQuestionIndex = Math.max(
    visibleQuestions.findIndex(
      (candidate) => candidate.question === question || candidate.id === question,
    ),
    0,
  );
  const activeQuestion = visibleQuestions[activeQuestionIndex] ?? null;
  const answeredCount = safeQuestions.reduce((count, question) => {
    return count + (hasSavedResponse(answerMap.get(question.question)) ? 1 : 0);
  }, 0);
  const markedCount = detail.answers.filter((answer) => answer.is_marked_for_review).length;
  const unansweredCount = Math.max(detail.total_questions - answeredCount, 0);
  const overallTimeRemaining = secondsRemaining(detail.expires_at, detail.server_time);
  const sectionTimeRemaining = secondsRemaining(
    detail.section_runtime.current_section_expires_at ?? null,
    detail.server_time,
  );
  const activeTimeRemaining = sectionTimeRemaining ?? overallTimeRemaining;
  const currentSectionMediaContext = detail.current_section_media_context;
  const latestSavedAt = latestAnswerSyncAt(detail.answers);
  const latestSavedDisplayAt = savedAt
    ? feedbackMessage(savedAt)
    : latestSavedAt;
  const questionCountInSection = visibleQuestions.length;
  const isLockedAttemptState =
    detail.status !== "in_progress" ||
    decodedError.toLowerCase().includes("expired");
  const answeredCountInSection = visibleQuestions.reduce((count, question) => {
    return count + (hasSavedResponse(answerMap.get(question.question)) ? 1 : 0);
  }, 0);
  const markedCountInSection = visibleQuestions.reduce((count, question) => {
    return count + (answerMap.get(question.question)?.is_marked_for_review ? 1 : 0);
  }, 0);
  const completionPercent =
    detail.total_questions > 0
      ? Math.round((answeredCount / detail.total_questions) * 100)
      : 0;
  const sectionCompletionPercent =
    questionCountInSection > 0
      ? Math.round((answeredCountInSection / questionCountInSection) * 100)
      : 0;
  const activeSaveStateTone = attemptSaveStateTone({
    isLockedAttemptState,
    latestSavedAt: latestSavedDisplayAt,
    notice: decodedNotice,
    error: decodedError,
  });
  const activeSaveStateLabel = attemptSaveStateLabel({
    isLockedAttemptState,
    latestSavedAt: latestSavedDisplayAt,
    notice: decodedNotice,
    error: decodedError,
  });
  const currentSectionIndex = currentSectionId
    ? sections.findIndex((section) => section.id === currentSectionId)
    : -1;
  const nextSection =
    currentSectionIndex >= 0 ? sections[currentSectionIndex + 1] ?? null : null;
  const latestSavedLabel = latestSavedDisplayAt
    ? studentDateTimeLabel(latestSavedDisplayAt)
    : "Nothing confirmed yet";
  const unresolvedCount = markedCount + unansweredCount;
  const neetLane =
    detail.experience_profile?.assessment_family === "competitive" &&
    (looksLikeNeetValue(detail.exam_title) || looksLikeNeetValue(detail.exam_code));
  const attemptCopy = neetLane
    ? {
        workspaceTag: isLockedAttemptState ? "Mock locked" : "Mock in progress",
        backLabel: "Back to Mock Tests",
        runtimeTag: "Exam-day focus",
        runtimeStrong:
          activeTimeRemaining === null
            ? "Timer synced from backend"
            : activeTimeRemaining <= 300
              ? "Final 5 minutes"
              : activeTimeRemaining <= 900
                ? "Final 15 minutes"
                : "Discipline time in hand",
        saveConfidence: "Checkpoint confidence",
        currentSection: "Current subject block",
        finalReview: "Final scan",
        finalReviewReady:
          unresolvedCount > 0
            ? `${unresolvedCount} still need a final scan`
            : "Ready for final scan and submit",
        supportText:
          "Latest confirmed save: {latestSavedLabel}. Use this strip as the exam-day check before you jump, switch subjects, or submit.",
        overallProgress: "Overall mock progress",
        sectionProgress: "Subject block progress",
        submitHandoff: "Submit discipline",
        submitHandoffStrong: "Summary opens after final submit",
        lockedTitle:
          detail.status === "submitted" || detail.status === "auto_submitted"
            ? "This mock is no longer editable"
            : "This mock has expired",
        lockedBody:
          detail.status === "auto_submitted"
            ? "The timer ended and the mock was submitted automatically."
            : "The timer ended or the session changed state. Refresh to load the latest backend status.",
        refreshLabel: "Refresh Mock State",
        summaryLabel: "View Mock Summary",
        toolbarAttemptProgress: "Mock progress",
        toolbarSectionProgress: "Subject block progress",
        saveHintSaved: "Latest confirmed checkpoint is visible here.",
        saveHintUnsaved: "Use Save Answer to create the first confirmed checkpoint.",
      }
    : {
        workspaceTag: isLockedAttemptState ? "Attempt locked" : "Test in progress",
        backLabel: "Back to Tests",
        runtimeTag: "Runtime focus",
        runtimeStrong:
          activeTimeRemaining === null
            ? "Timer synced from backend"
            : activeTimeRemaining <= 300
              ? "Final 5 minutes"
              : activeTimeRemaining <= 900
                ? "Final 15 minutes"
                : "Time in hand",
        saveConfidence: "Save confidence",
        currentSection: "Current section",
        finalReview: "Final review",
        finalReviewReady:
          unresolvedCount > 0
            ? `${unresolvedCount} still need a look`
            : "Ready to review and submit",
        supportText:
          "Latest confirmed save: {latestSavedLabel}. Use this strip as the quick check before you jump, switch sections, or submit.",
        overallProgress: "Overall progress",
        sectionProgress: "Current section",
        submitHandoff: "Submit handoff",
        submitHandoffStrong: "Summary opens after submit",
        lockedTitle:
          detail.status === "submitted" || detail.status === "auto_submitted"
            ? "This test is no longer editable"
            : "This attempt has expired",
        lockedBody:
          detail.status === "auto_submitted"
            ? "The timer ended and the test was submitted automatically."
            : "The timer ended or the session changed state. Refresh to load the latest backend status.",
        refreshLabel: "Refresh Attempt State",
        summaryLabel: "View Attempt Summary",
        toolbarAttemptProgress: "Attempt progress",
        toolbarSectionProgress: "Section progress",
        saveHintSaved: "Latest confirmed save is visible here.",
        saveHintUnsaved: "Use Save Answer to create the first confirmed checkpoint.",
      };
  const firstQuestionBySectionId = new Map(
    sections.map((section) => [
      section.id,
      safeQuestions.find((question) => question.section === section.id)?.question ?? null,
    ]),
  );

  async function saveAnswerAction(formData: FormData) {
    "use server";

    const questionId = String(formData.get("question_id") ?? "");
    const questionResponseMode = String(formData.get("question_response_mode") ?? "");
    const actionIntent = String(formData.get("action_intent") ?? "save");
    const returnQuestion = String(formData.get("return_question") ?? "");
    const nextQuestionInSection = String(formData.get("next_question_in_section") ?? "");
    const nextSectionId = String(formData.get("next_section_id") ?? "");
    const nextSectionName = String(formData.get("next_section_name") ?? "");
    const reviewQuestion = String(formData.get("review_question") ?? "");
    const nextSectionFirstQuestion = String(
      formData.get("next_section_first_question") ?? "",
    );

    if (!questionId) return;

    const payload: {
      question: string;
      selected_option?: string | null;
      selected_option_ids?: string[];
      answer_text?: string;
      answer_transcript?: string;
      response_artifacts?: Array<{
        asset_kind: string;
        upload_token: string;
        file_name?: string;
        mime_type?: string;
        size_bytes?: number;
        duration_seconds?: number;
        storage_status?: string;
        checksum?: string;
        storage_path?: string;
        file_url?: string;
      }>;
      is_marked_for_review?: boolean;
      clear_response?: boolean;
      skip?: boolean;
    } = {
      question: questionId,
      is_marked_for_review: formData.get("is_marked_for_review") === "on",
    };

    if (actionIntent === "clear") {
      payload.clear_response = true;
    } else if (actionIntent === "skip") {
      payload.skip = true;
    } else if (questionResponseMode === "multi_choice") {
      payload.selected_option_ids = formData
        .getAll("selected_option_ids")
        .map((value) => String(value))
        .filter(Boolean);
    } else if (questionResponseMode === "text" || questionResponseMode === "numeric") {
      payload.answer_text = String(formData.get("answer_text") ?? "");
      if (formData.has("answer_transcript")) {
        payload.answer_transcript = String(formData.get("answer_transcript") ?? "");
      }
      if (formData.has("response_artifacts_json")) {
        payload.response_artifacts = parseResponseArtifacts(
          String(formData.get("response_artifacts_json") ?? "[]"),
        );
      }
    } else {
      const selectedOption = String(formData.get("selected_option") ?? "");
      payload.selected_option = selectedOption || null;
    }

    try {
      const response = await saveStudentAnswer(attemptId, payload);
      const confirmedSavedAt =
        response.data.answered_at ?? response.data.updated_at ?? null;

      if (actionIntent === "time-expired-submit") {
        const submitResponse = await submitStudentAttempt(attemptId);
        const submittedAt =
          submitResponse.data.submitted_at ?? new Date().toISOString();
        redirect(
          `/app/attempts/${attemptId}/summary?notice=${encodeFeedbackValue("Time expired. Your latest answer was saved and the test was submitted automatically.")}&confirmedAt=${encodeFeedbackValue(
            submittedAt,
          )}`,
        );
      }

      let nextQuestion = returnQuestion || questionId;
      let nextNotice = "Response updated successfully.";

      if (actionIntent === "skip") {
        nextNotice = "Question skipped.";
      } else if (actionIntent === "save-next") {
        nextNotice = "Answer saved. Moving to the next question.";
      }

      if (actionIntent === "save-next" || actionIntent === "skip") {
        if (nextQuestionInSection) {
          nextQuestion = nextQuestionInSection;
        } else if (nextSectionId) {
          const switchResponse = await switchStudentAttemptSection(
            attemptId,
            nextSectionId,
          );
          nextQuestion =
            (
              nextSectionFirstQuestion ||
              switchResponse.data.questions.find(
                (question) => question.section === nextSectionId,
              )?.question
            ) ?? questionId;
          nextNotice =
            actionIntent === "skip"
              ? `Question skipped. Moving to ${nextSectionName || "the next section"}.`
              : `Answer saved. Moving to ${nextSectionName || "the next section"}.`;
        } else {
          nextQuestion = reviewQuestion || questionId;
          nextNotice =
            actionIntent === "skip"
              ? "Question skipped. You have reached the final question. Review your answers or submit the test."
              : "Answer saved. You have reached the final question. Review your answers or submit the test.";
        }
      }

      revalidatePath(`/app/attempts/${attemptId}`);
      redirect(buildAttemptUrl(attemptId, {
        notice: nextNotice,
        action: "save",
        confirmedAt: confirmedSavedAt ?? new Date().toISOString(),
        savedAt: confirmedSavedAt ?? "",
        question: nextQuestion,
      }, ATTEMPT_QUESTION_ANCHOR_ID));
    } catch (error) {
      unstable_rethrow(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to save this response right now.";
      redirect(
        buildAttemptUrl(attemptId, {
          error: message,
          question: returnQuestion || null,
        }, ATTEMPT_QUESTION_ANCHOR_ID),
      );
    }
  }

  async function submitAttemptAction() {
    "use server";

    try {
      const response = await submitStudentAttempt(attemptId);
      const submittedAt = response.data.submitted_at ?? new Date().toISOString();
      redirect(
        `/app/attempts/${attemptId}/summary?notice=${encodeFeedbackValue("Attempt submitted successfully.")}&confirmedAt=${encodeFeedbackValue(
          submittedAt,
        )}`,
      );
    } catch (error) {
      unstable_rethrow(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to submit this attempt right now.";
      redirect(buildAttemptUrl(attemptId, { error: message }));
    }
  }

  async function switchSectionAction(formData: FormData) {
    "use server";

    const sectionId = String(formData.get("section_id") ?? "");
    if (!sectionId) return;

    try {
      const response = await switchStudentAttemptSection(attemptId, sectionId);
      const confirmedSavedAt = latestAnswerSyncAt(response.data.answers);
      const confirmedActionAt =
        response.data.server_time ?? response.data.updated_at ?? new Date().toISOString();

      revalidatePath(`/app/attempts/${attemptId}`);
      redirect(buildAttemptUrl(attemptId, {
        notice: "Section switched successfully.",
        action: "section-switch",
        confirmedAt: confirmedActionAt,
        savedAt: confirmedSavedAt ?? "",
      }, ATTEMPT_QUESTION_ANCHOR_ID));
    } catch (error) {
      unstable_rethrow(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to switch sections right now.";
      redirect(buildAttemptUrl(attemptId, { error: message }, ATTEMPT_QUESTION_ANCHOR_ID));
    }
  }

  return (
    <div className="studentPage studentDashboardModern attemptPageFocusMode studentLearnerPage studentLearnerAttemptPage">
      <AttemptTimerAutoSubmit
        submitFormId="attempt-submit-form"
        questionFormId="attempt-question-form"
        initialSeconds={activeTimeRemaining}
      />
      <AttemptNavigationGuard
        activeQuestionId={activeQuestion?.question ?? null}
        attemptId={attemptId}
        attemptStatus={detail.status}
      />
      <AttemptQuestionRestore
        attemptId={attemptId}
        currentQuestionId={question ?? null}
      />

      <section className="contentCard attemptWorkspaceHeader">
        <div className="attemptWorkspaceHeaderTop">
          <div className="attemptWorkspaceHeaderCopy">
            <span className="studentDashboardTag">
              {attemptCopy.workspaceTag}
            </span>
            <strong>{detail.exam_title}</strong>
            <small>
              {isLockedAttemptState
                ? `${answeredCount} saved · ${markedCount} marked · ${unansweredCount} not answered`
                : `${currentSectionName ? `${currentSectionName} · ` : ""}Question ${activeQuestion ? activeQuestionIndex + 1 : 0} of ${questionCountInSection} · ${answeredCount} saved · ${markedCount} marked`}
            </small>
          </div>
          <div className="attemptWorkspaceHeaderMeta">
            <Link className="button buttonGhost" href="/app/exams">
              {attemptCopy.backLabel}
            </Link>
            <div className="attemptHeroTimerCluster">
              <span className="attemptHeroTimerLabel">
                {isLockedAttemptState ? "Attempt state" : "Time left"}
              </span>
              {isLockedAttemptState ? (
                <StatusPill tone="danger">
                  {detail.is_auto_submitted
                    ? "Submitted by timer"
                    : titleCaseState(detail.status)}
                </StatusPill>
              ) : (
                <AttemptCountdown initialSeconds={activeTimeRemaining} mode="pill" />
              )}
            </div>
            {!isLockedAttemptState ? <AttemptFullscreenButton /> : null}
            {!isLockedAttemptState ? (
              <StatusPill tone={activeSaveStateTone}>
                {activeSaveStateLabel}
              </StatusPill>
            ) : null}
            <StatusPill tone={securityTone(detail.security_policy)}>
              {detail.security_policy.student_label}
            </StatusPill>
            <StatusPill tone={isLockedAttemptState ? "danger" : "live"}>
              {isLockedAttemptState ? "Locked" : titleCaseState(detail.status)}
            </StatusPill>
          </div>
        </div>
        {!isLockedAttemptState ? (
          <>
            <section className="attemptMobileRuntimeStrip" aria-label="Mobile runtime summary">
              <div className="attemptMobileRuntimeHeader">
                <div>
                  <span className="studentDashboardTag">Runtime focus</span>
                  <span className="studentDashboardTag">{attemptCopy.runtimeTag}</span>
                  <strong>{attemptCopy.runtimeStrong}</strong>
                </div>
                <AttemptCountdown initialSeconds={activeTimeRemaining} mode="pill" />
              </div>
              <div className="attemptMobileRuntimeGrid">
                <div className="attemptStatusTile attemptStatusTileSaved">
                  <span>{attemptCopy.saveConfidence}</span>
                  <strong>{activeSaveStateLabel}</strong>
                </div>
                <div className="attemptStatusTile attemptStatusTileMarked">
                  <span>{attemptCopy.currentSection}</span>
                  <strong>
                    {currentSectionName
                      ? `${answeredCountInSection}/${questionCountInSection} saved`
                      : "Single-flow attempt"}
                  </strong>
                </div>
                <div className="attemptStatusTile attemptStatusTileOpen">
                  <span>{attemptCopy.finalReview}</span>
                  <strong>{attemptCopy.finalReviewReady}</strong>
                </div>
              </div>
              <p className="attemptSupportText">
                {attemptCopy.supportText.replace("{latestSavedLabel}", latestSavedLabel)}
              </p>
            </section>

            <div className="attemptStatusGrid">
              <div className="attemptStatusTile attemptStatusTileSaved">
                <span>{attemptCopy.overallProgress}</span>
                <strong>{completionPercent}% complete</strong>
                <div className="attemptProgressBar" aria-hidden="true">
                  <span style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
              <div className="attemptStatusTile attemptStatusTileMarked">
                <span>{attemptCopy.sectionProgress}</span>
                <strong>
                  {currentSectionName
                    ? `${answeredCountInSection}/${questionCountInSection} saved`
                    : "Single-flow attempt"}
                </strong>
                <div className="attemptProgressBar" aria-hidden="true">
                  <span style={{ width: `${sectionCompletionPercent}%` }} />
                </div>
              </div>
              <div className="attemptStatusTile">
                <span>Last confirmed save</span>
                <strong>
                  {latestSavedLabel}
                </strong>
              </div>
              <div className="attemptStatusTile attemptStatusTileOpen">
                <span>{attemptCopy.submitHandoff}</span>
                <strong>{attemptCopy.submitHandoffStrong}</strong>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {error ? <p className="feedbackBanner feedbackBannerError">{decodedError}</p> : null}
      {notice ? <p className="feedbackBanner feedbackBannerSuccess">{decodedNotice}</p> : null}

      {isLockedAttemptState ? (
        <section className="attemptWorkspaceDetails">
          <section className="contentCard attemptLockedStateCard">
            <div className="attemptLockedStateTop">
              <div className="attemptLockedStateCopy">
                <span className="studentDashboardTag">Attempt locked</span>
                <strong>
                  {attemptCopy.lockedTitle}
                </strong>
                <p>
                  {decodedError ||
                    attemptCopy.lockedBody}
                </p>
              </div>
              <div className="attemptLockedStateMeta">
                <StatusPill tone="danger">
                  {detail.status === "auto_submitted"
                    ? "Auto submitted"
                    : titleCaseState(detail.status)}
                </StatusPill>
                {detail.is_auto_submitted ? (
                  <StatusPill tone="warning">Submitted by timer</StatusPill>
                ) : null}
              </div>
            </div>

            <div className="attemptStatusGrid">
              <div className="attemptStatusTile attemptStatusTileSaved">
                <span>Saved</span>
                <strong>{answeredCount}</strong>
              </div>
              <div className="attemptStatusTile attemptStatusTileMarked">
                <span>Marked</span>
                <strong>{markedCount}</strong>
              </div>
              <div className="attemptStatusTile attemptStatusTileOpen">
                <span>Not answered</span>
                <strong>{unansweredCount}</strong>
              </div>
              <div className="attemptStatusTile">
                <span>Current section</span>
                <strong>{currentSectionName ?? "No section active"}</strong>
              </div>
            </div>

            <div className="attemptLockedStateActions">
              <a
                className="button buttonPrimary"
                href={buildAttemptUrl(attemptId, {
                  question: activeQuestion?.question ?? null,
                })}
              >
                {attemptCopy.refreshLabel}
              </a>
              {(detail.status === "submitted" || detail.status === "auto_submitted") &&
              detail.submitted_at ? (
                <a
                  className="button buttonSecondary"
                  href={`/app/attempts/${attemptId}/summary`}
                >
                  {attemptCopy.summaryLabel}
                </a>
              ) : null}
              <Link className="button buttonGhost" href="/app/exams">
                {attemptCopy.backLabel}
              </Link>
            </div>
          </section>

          <AttemptResiliencePanel
            initialAction={action}
            initialConfirmedAt={confirmedAt ? feedbackMessage(confirmedAt) : null}
            initialConfirmedSavedAt={savedAt ? feedbackMessage(savedAt) : null}
            attemptId={attemptId}
            initialLastSavedAt={latestSavedAt}
            initialNotice={notice}
            initialError={error}
          />
        </section>
      ) : (
        <>

      <AttemptSecurityGuard
        attemptId={attemptId}
        attemptStatus={detail.status}
        securityPolicy={detail.security_policy}
        initialIntegritySummary={detail.integrity_summary}
      />

      <section className="attemptConsoleLayout">
        <div className="attemptConsoleMain">
          <section className="contentCard attemptToolbar attemptToolbarConsole">
            <div className="examStateSummary">
              <span>{attemptCopy.toolbarAttemptProgress}</span>
              <strong>
                {completionPercent}% complete
              </strong>
              <small>
                {answeredCount} saved · {markedCount} marked · {unansweredCount} open
              </small>
            </div>
            {currentSectionName ? (
              <div className="examStateSummary">
                <span>Current section</span>
                <strong>{currentSectionName}</strong>
              </div>
            ) : null}
            <div className="examStateSummary">
              <span>{attemptCopy.toolbarSectionProgress}</span>
              <strong>
                {activeQuestion
                  ? `${sectionCompletionPercent}% complete`
                  : "No active section"}
              </strong>
              <small>
                {answeredCountInSection}/{questionCountInSection} saved in this section
              </small>
            </div>
            <div className="examStateSummary">
              <span>Last confirmed save</span>
              <strong>
                {latestSavedDisplayAt
                  ? studentDateTimeLabel(latestSavedDisplayAt)
                  : "No saved response yet"}
              </strong>
            </div>
            <div className="examStateSummary">
              <span>Save confidence</span>
              <strong>{activeSaveStateLabel}</strong>
              <small>
                {latestSavedDisplayAt
                  ? attemptCopy.saveHintSaved
                  : attemptCopy.saveHintUnsaved}
              </small>
            </div>
            <div className="examStateSummary">
              <span>Current question</span>
              <strong>
                {activeQuestion ? `${activeQuestionIndex + 1} of ${questionCountInSection}` : "Unavailable"}
              </strong>
            </div>
          </section>

          <section className="attemptQuestionStack">
        {activeQuestion ? (() => {
          const question = activeQuestion;
          const index = activeQuestionIndex;
          const answer = answerMap.get(question.question);
          const isMarked = answer?.is_marked_for_review ?? false;
          const isAnswered = hasSavedResponse(answer);
          const questionStatusTone = isMarked
            ? "warning"
            : isAnswered
              ? "live"
              : "demo";
          const questionStatusLabel = isMarked
            ? "Marked"
            : isAnswered
              ? "Saved"
              : "Not answered";
          const previousQuestion = index > 0 ? visibleQuestions[index - 1] : null;
          const nextQuestion =
            index < visibleQuestions.length - 1 ? visibleQuestions[index + 1] : null;
          const nextSectionForQuestion =
            !nextQuestion && currentSectionIndex >= 0
              ? sections[currentSectionIndex + 1] ?? null
              : null;
          const saveNextLabel = nextQuestion
            ? "Save & Next"
            : nextSectionForQuestion
              ? "Save & Next Section"
              : "Save & Review";
          const saveNextActionLabel = nextQuestion
            ? `Save answer and move to the next question ${question.question_order}`
            : nextSectionForQuestion
              ? `Save answer and move to ${nextSectionForQuestion.name}`
              : `Save answer for question ${question.question_order} and review the test`;
          const previousHref = previousQuestion
            ? buildAttemptUrl(
                attemptId,
                { question: previousQuestion.question },
                ATTEMPT_QUESTION_ANCHOR_ID,
              )
            : undefined;
          const nextHref = nextQuestion
            ? buildAttemptUrl(
                attemptId,
                { question: nextQuestion.question },
                ATTEMPT_QUESTION_ANCHOR_ID,
              )
            : undefined;
          const passageQuestions = question.passage
            ? visibleQuestions.filter(
                (candidate) => candidate.passage === question.passage,
              )
            : [];
          const passageQuestionIndex = question.passage
            ? passageQuestions.findIndex(
                (candidate) => candidate.question === question.question,
              )
            : -1;
          const reviewQuestion =
            visibleQuestions.find((candidate) => {
              const candidateAnswer = answerMap.get(candidate.question);
              return candidateAnswer?.is_marked_for_review ?? false;
            })?.question ??
            visibleQuestions.find((candidate) => {
              const candidateAnswer = answerMap.get(candidate.question);
              return !hasSavedResponse(candidateAnswer);
            })?.question ??
            visibleQuestions[0]?.question ??
            "";
          const questionTimeLabel =
            activeTimeRemaining === null
              ? "Synced to backend timer"
              : activeTimeRemaining <= 300
                ? "Final 5 minutes"
                : activeTimeRemaining <= 900
                  ? "Final 15 minutes"
                  : "Time available";

          return (
            <article
              className="attemptQuestionCard"
              id={ATTEMPT_QUESTION_ANCHOR_ID}
              key={question.id}
              tabIndex={-1}
            >
              <AttemptQuestionShortcuts
                formId="attempt-question-form"
                nextHref={nextHref}
                previousHref={previousHref}
                questionCardId={ATTEMPT_QUESTION_ANCHOR_ID}
              />
              <div className="attemptQuestionHeader">
                <div>
                  <strong>
                    Question {index + 1}
                  </strong>
                  <span>
                    {question.section_title
                      ? `${question.section_title} · ${questionTypeLabel(question.question_type, question.question_type_definition)}`
                      : questionTypeLabel(question.question_type, question.question_type_definition)}
                  </span>
                  <small className="attemptQuestionMetaLine">
                    {question.passage_detail?.title
                      ? `${questionCountInSection} questions in this section · shared passage linked`
                      : `${questionCountInSection} questions in this section`}
                  </small>
                </div>
                <StatusPill tone={questionStatusTone}>{questionStatusLabel}</StatusPill>
              </div>

              <div className="attemptQuestionStateStrip">
                <div className="attemptQuestionStateCard">
                  <span>Current status</span>
                  <strong>{questionStatusLabel}</strong>
                  <small>
                    {isMarked
                      ? "Return before submit so this does not stay unresolved."
                      : isAnswered
                        ? "A saved response already exists for this question."
                        : "This question still needs a saved response."}
                  </small>
                </div>
                <div className="attemptQuestionStateCard">
                  <span>Last save check</span>
                  <strong>
                    {latestSavedDisplayAt
                      ? studentDateTimeLabel(latestSavedDisplayAt)
                      : "Nothing confirmed yet"}
                  </strong>
                  <small>
                    Palette jumps and section switches do not auto-save edits on this question.
                  </small>
                </div>
                <div className="attemptQuestionStateCard">
                  <span>Active timer</span>
                  <strong>
                    {activeTimeRemaining === null
                      ? "Backend controlled"
                      : `${Math.floor(activeTimeRemaining / 60)}m ${activeTimeRemaining % 60}s`}
                  </strong>
                  <small>{questionTimeLabel}</small>
                </div>
                <div className="attemptQuestionStateCard">
                  <span>What happens next</span>
                  <strong>
                    {nextQuestion
                      ? "Save and continue"
                      : nextSectionForQuestion
                        ? `Save and open ${nextSectionForQuestion.name}`
                        : "Save and review before submit"}
                  </strong>
                  <small>
                    Submit routes to the attempt summary first, where review and result visibility are explained.
                  </small>
                </div>
              </div>

              <section className="attemptLiveCheckpoint" aria-label="Live checkpoint">
                <div className="attemptLiveCheckpointHeader">
                  <div>
                    <span className="studentDashboardTag">Live checkpoint</span>
                    <strong>Confirm save, time, and section movement before you continue</strong>
                  </div>
                  <StatusPill tone={timePressureTone(activeTimeRemaining)}>
                    {activeTimeRemaining === null
                      ? "Timer synced from backend"
                      : activeTimeRemaining <= 300
                        ? "Final 5 minutes"
                        : activeTimeRemaining <= 900
                          ? "Final 15 minutes"
                          : "Time in hand"}
                  </StatusPill>
                </div>
                <div className="attemptQuestionStateStrip">
                  <div className="attemptQuestionStateCard">
                    <span>Save checkpoint</span>
                    <strong>{activeSaveStateLabel}</strong>
                    <small>
                      Latest confirmed save: {latestSavedLabel}. If you changed this answer, save again before opening another question or section.
                    </small>
                  </div>
                  <div className="attemptQuestionStateCard">
                    <span>Section progress</span>
                    <strong>{answeredCountInSection}/{questionCountInSection} saved</strong>
                    <small>
                      {markedCountInSection} marked in this section. Save and move only when this question state looks right.
                    </small>
                  </div>
                  <div className="attemptQuestionStateCard">
                    <span>Next handoff</span>
                    <strong>
                      {nextQuestion
                        ? "Next question"
                        : nextSectionForQuestion
                          ? nextSectionForQuestion.name
                          : "Review before submit"}
                    </strong>
                    <small>
                      Section switching and palette jumps are navigation only. Submission always opens summary first.
                    </small>
                  </div>
                </div>
              </section>

              <StudentExamExperiencePanel
                compact
                profile={detail.experience_profile}
              />

              {currentSectionMediaContext.has_media ? (
                <StudentSectionMediaPanel context={currentSectionMediaContext} />
              ) : null}

              <StudentQuestionPrompt
                passageMetaLabel={
                  passageQuestionIndex >= 0
                    ? `Question ${passageQuestionIndex + 1} of ${passageQuestions.length}`
                    : "Shared context"
                }
                question={question}
                showPassageTrigger={Boolean(question.passage_detail?.passage_text)}
              />

              <AttemptActionForm
                action={saveAnswerAction}
                actionKind="save"
                attemptId={attemptId}
                className="attemptForm"
                formId="attempt-question-form"
                trackDirty
              >
                <input name="question_id" type="hidden" value={question.question} />
                <input name="question_type" type="hidden" value={question.question_type} />
                <input
                  name="question_response_mode"
                  type="hidden"
                  value={question.question_type_definition?.response_mode ?? ""}
                />
                <input name="return_question" type="hidden" value={question.question} />
                <input
                  name="next_question_in_section"
                  type="hidden"
                  value={nextQuestion?.question ?? ""}
                />
                <input name="review_question" type="hidden" value={reviewQuestion} />
                <input name="next_section_id" type="hidden" value={nextSection?.id ?? ""} />
                <input
                  name="next_section_name"
                  type="hidden"
                  value={nextSection?.name ?? ""}
                />
                <input
                  name="next_section_first_question"
                  type="hidden"
                  value={
                    nextSection?.id
                      ? (firstQuestionBySectionId.get(nextSection.id) ?? "")
                      : ""
                  }
                />

                {questionTypeSupportsTextAnswer(question.question_type_definition) ? (
                  (() => {
                    const presentationProfile = buildQuestionTypePresentationProfile(
                      question.question_type_definition,
                    );
                    const supportsResponseArtifacts = questionTypeSupportsResponseArtifacts(
                      question.question_type_definition,
                    );
                    const allowedArtifactKinds = questionTypeAllowedResponseArtifactKinds(
                      question.question_type_definition,
                    ).filter(
                      (value): value is "audio_recording" | "video_recording" | "image_upload" | "document_upload" =>
                        value === "audio_recording" ||
                        value === "video_recording" ||
                        value === "image_upload" ||
                        value === "document_upload",
                    );

                    return (
                      <>
                        <textarea
                          className="attemptTextarea"
                          defaultValue={answer?.answer_text ?? ""}
                          name="answer_text"
                          placeholder={presentationProfile.responseInputPlaceholder}
                          rows={presentationProfile.responseInputRows}
                        />
                        {presentationProfile.responseInputHelper ? (
                          <small className="fieldHint">{presentationProfile.responseInputHelper}</small>
                        ) : null}
                        {question.question_type_definition?.response_mode === "text" &&
                        supportsResponseArtifacts ? (
                          <>
                            <textarea
                              className="attemptTextarea attemptTranscriptTextarea"
                              defaultValue={answer?.answer_transcript ?? ""}
                              name="answer_transcript"
                              placeholder={
                                detail.experience_profile?.assessment_family === "language_proficiency"
                                  ? "Optional transcript or response notes when this prompt explicitly asks for media-backed evidence"
                                  : "Optional transcript or spoken-response notes"
                              }
                              rows={3}
                            />
                            {detail.experience_profile?.assessment_family === "language_proficiency" ? (
                              <small className="fieldHint">
                                Add a transcript or upload media only when the question explicitly requests it. Language-family exams do not imply speaking capture on every prompt.
                              </small>
                            ) : null}
                            <StudentResponseArtifactPanel
                              attemptId={attemptId}
                              assessmentFamilyCode={detail.experience_profile?.assessment_family ?? null}
                              allowedArtifactKinds={allowedArtifactKinds}
                              fieldName="response_artifacts_json"
                              initialArtifacts={answer?.response_artifacts ?? []}
                              questionId={question.question}
                            />
                          </>
                        ) : null}
                      </>
                    );
                  })()
                ) : (
                  <div className="attemptOptionList">
                    {question.options.filter(Boolean).map((option) => {
                      const selected =
                        answer?.selected_option === option.id ||
                        answer?.selected_option_ids.includes(option.id);

                      return (
                        <label
                          className={`attemptOptionRow ${
                            selected ? "attemptOptionSelected" : ""
                          }`}
                          key={option.id}
                        >
                          {questionTypeSupportsMultipleSelection(question.question_type_definition) ? (
                            <input
                              defaultChecked={selected}
                              name="selected_option_ids"
                              type="checkbox"
                              value={option.id}
                            />
                          ) : (
                            <input
                              defaultChecked={selected}
                              name="selected_option"
                              type="radio"
                              value={option.id}
                            />
                          )}
                          <strong>{option.option_order}.</strong>
                          <span>{option.option_text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <label className="attemptReviewToggle">
                  <input
                    defaultChecked={answer?.is_marked_for_review ?? false}
                    name="is_marked_for_review"
                    type="checkbox"
                  />
                  <span>Mark for review</span>
                </label>

                <div className="attemptActions">
                  <ActionSubmitButton
                    actionLabel={`Save answer for question ${question.question_order}`}
                    className="button buttonSecondary"
                    idleLabel="Save Answer"
                    name="action_intent"
                    pendingLabel="Saving..."
                    value="save"
                  />
                  <ActionSubmitButton
                    actionLabel={saveNextActionLabel}
                    className="button buttonPrimary"
                    idleLabel={saveNextLabel}
                    name="action_intent"
                    pendingLabel="Saving..."
                    value="save-next"
                  />
                  <ActionSubmitButton
                    actionLabel={`Clear response for question ${question.question_order}`}
                    className="button buttonGhost"
                    idleLabel="Clear Response"
                    name="action_intent"
                    pendingLabel="Clearing..."
                    value="clear"
                  />
                  <ActionSubmitButton
                    actionLabel={`Skip question ${question.question_order}`}
                    className="button buttonGhost"
                    idleLabel="Skip"
                    name="action_intent"
                    pendingLabel="Skipping..."
                    value="skip"
                  />
                  <button
                    aria-hidden="true"
                    data-auto-submit-expired="true"
                    name="action_intent"
                    tabIndex={-1}
                    type="submit"
                    value="time-expired-submit"
                    hidden
                  >
                    Save and submit on expiry
                  </button>
                </div>
                <div className="attemptQuestionStateStrip">
                  <div className="attemptQuestionStateCard">
                    <span>Save state for this question</span>
                    <strong>{isAnswered ? "Already saved" : "Needs a saved response"}</strong>
                    <small>
                      Use `Save Answer` if you want to stay here, or `{saveNextLabel}` if you are ready to move forward.
                    </small>
                  </div>
                  <div className="attemptQuestionStateCard">
                    <span>Section movement</span>
                    <strong>
                      {nextSectionForQuestion
                        ? `Next section: ${nextSectionForQuestion.name}`
                        : currentSectionName ?? "Single section flow"}
                    </strong>
                    <small>
                      Save first, especially before opening another section. Section movement is navigation, not a save step.
                    </small>
                  </div>
                </div>
                <p className="attemptSupportText">
                  Save this answer before moving on. Mark it for review if you want to revisit it before submission, and use the palette only after the current response state looks right.
                </p>
                <div className="attemptQuestionFooter">
                  <div className="attemptQuestionFooterMeta">
                    <span>
                      {isAnswered ? "Saved" : "Not saved"} ·{" "}
                      {isMarked ? "Marked for review" : "Not marked for review"}
                    </span>
                    <span>
                      Section: {answeredCountInSection}/{questionCountInSection} saved · {markedCountInSection} marked
                    </span>
                    <span>Shortcuts: `1-9` choose, `M` review, `N` next, `P` previous</span>
                  </div>
                  <div className="attemptQuestionJumpRow">
                    {previousQuestion ? (
                      <AttemptQuestionLink
                        className="button buttonGhost"
                        formId="attempt-question-form"
                        href={previousHref ?? ""}
                      >
                        Previous
                      </AttemptQuestionLink>
                    ) : null}
                    {nextQuestion ? (
                      <AttemptQuestionLink
                        className="button buttonSecondary"
                        formId="attempt-question-form"
                        href={nextHref ?? ""}
                      >
                        Next
                      </AttemptQuestionLink>
                    ) : null}
                  </div>
                </div>
              </AttemptActionForm>
            </article>
          );
        })() : (
          <article className="attemptQuestionCard">
            <div className="attemptQuestionHeader">
              <div>
                <strong>No question found</strong>
                <span>The requested question is not available in this section.</span>
              </div>
              <StatusPill tone="warning">Unavailable</StatusPill>
            </div>
          </article>
        )}
          </section>
        </div>

        <aside className="attemptConsoleRail">
          <section className="contentCard attemptConsoleSummaryCard">
            <div className="sectionHeading">
              <strong>Test Summary</strong>
              <StatusPill tone={timePressureTone(activeTimeRemaining)}>
                {activeTimeRemaining === null
                  ? "Timer synced from backend"
                  : activeTimeRemaining <= 300
                    ? "Final 5 minutes"
                    : activeTimeRemaining <= 900
                      ? "Final 15 minutes"
                      : "Time in hand"}
              </StatusPill>
            </div>
            <div className="attemptConsoleTimerWrap">
              <AttemptCountdown initialSeconds={activeTimeRemaining} mode="pill" />
            </div>
            <div className="attemptConsoleSummaryGrid">
              <div className="attemptStatusTile attemptStatusTileSaved">
                <span>Saved</span>
                <strong>{answeredCount}</strong>
                <div className="attemptProgressBar" aria-hidden="true">
                  <span style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
              <div className="attemptStatusTile attemptStatusTileMarked">
                <span>Marked</span>
                <strong>{markedCount}</strong>
              </div>
              <div className="attemptStatusTile attemptStatusTileOpen">
                <span>Not answered</span>
                <strong>{unansweredCount}</strong>
              </div>
            </div>
            <div className="attemptSubmitChecklist">
              <span>
                {latestSavedDisplayAt
                  ? `Latest confirmed save reached the backend at ${latestSavedLabel}.`
                  : "Create a save checkpoint before submitting if you changed the current answer."}
              </span>
              <span>
                {unresolvedCount > 0
                  ? `${unresolvedCount} question${unresolvedCount === 1 ? "" : "s"} still need a final look across marked and unanswered states.`
                  : "No marked or unanswered questions remain in this attempt summary."}
              </span>
              <span>
                Submit opens the attempt summary first, where result and review visibility are explained by policy.
              </span>
            </div>
            <p className="attemptSupportText">
              Review marked and unanswered questions before you submit. After submit, the next stop is the attempt summary where result and review visibility are explained by policy.
            </p>
            <AttemptActionForm
              action={submitAttemptAction}
              actionKind="submit"
              attemptId={attemptId}
              confirmMessage={`Submit this test now?\n\nSaved: ${answeredCount}\nMarked for review: ${markedCount}\nNot answered: ${unansweredCount}\n\nTake a quick breath and confirm only if you are ready. Your next stop will be the attempt summary, where result and review visibility are explained clearly.`}
            >
              <ActionSubmitButton
                actionLabel="Submit test"
                className="button buttonPrimary attemptRailSubmit"
                idleLabel="Submit Test"
                pendingLabel="Submitting..."
              />
              <button
                aria-hidden="true"
                data-auto-submit-final="true"
                data-skip-confirm="true"
                tabIndex={-1}
                type="submit"
                hidden
              >
                Auto submit final
              </button>
            </AttemptActionForm>
          </section>

          <section className="contentCard attemptQuestionNavigator attemptRailPanel">
            <div className="sectionHeading">
              <strong>Question Palette</strong>
              <span>Jump to a question</span>
            </div>
            <div className="attemptPaletteLegend">
              <div className="attemptPaletteLegendCard">
                <span>Current focus</span>
                <strong>
                  {activeQuestion ? `Question ${activeQuestion.question_order}` : "Unavailable"}
                </strong>
                <small>
                  Open another question only after the current save checkpoint looks right.
                </small>
              </div>
              <div className="attemptPaletteLegendCard">
                <span>Saved in this section</span>
                <strong>{answeredCountInSection}</strong>
                <small>
                  {questionCountInSection - answeredCountInSection} still need a saved response in this section.
                </small>
              </div>
              <div className="attemptPaletteLegendCard">
                <span>Marked for review</span>
                <strong>{markedCountInSection}</strong>
                <small>
                  Marked questions stay unresolved until you revisit them before submit.
                </small>
              </div>
            </div>
            <p className="attemptSupportText">
              Palette jumps help you move quickly, but they are navigation only. Unsaved changes stay local to the current question until you save them.
            </p>
            <div className="attemptQuestionNavGrid attemptQuestionNavGridCompact">
              {visibleQuestions.map((question) => {
                const answer = answerMap.get(question.question);
                const isMarked = answer?.is_marked_for_review ?? false;
                const isAnswered = hasSavedResponse(answer);
                const isCurrent = activeQuestion?.question === question.question;
                const tone = isCurrent
                  ? "default"
                  : isMarked
                    ? "warning"
                    : isAnswered
                      ? "live"
                      : "demo";
                const label = isCurrent
                  ? "Current"
                  : isMarked
                    ? "Review"
                    : isAnswered
                      ? "Saved"
                      : "Todo";

                return (
                  <AttemptQuestionLink
                    className={`attemptQuestionNavChip attemptQuestionNavChipCompact ${
                      isCurrent
                        ? "attemptQuestionNavChipCurrent"
                        : isMarked
                          ? "attemptQuestionNavChipReview"
                          : isAnswered
                            ? "attemptQuestionNavChipSaved"
                            : "attemptQuestionNavChipTodo"
                    }`}
                    formId="attempt-question-form"
                    href={buildAttemptUrl(
                      attemptId,
                      { question: question.question },
                      ATTEMPT_QUESTION_ANCHOR_ID,
                    )}
                    key={question.id}
                    >
                      <strong>{question.question_order}</strong>
                      <div className="attemptQuestionNavChipMeta">
                        <StatusPill tone={tone}>{label}</StatusPill>
                        <small>
                          {isCurrent
                            ? "You are here now"
                            : isMarked
                              ? "Return before submit"
                              : isAnswered
                                ? "Saved to backend"
                                : "Needs a save"}
                        </small>
                      </div>
                    </AttemptQuestionLink>
                  );
                })}
            </div>
          </section>

          {sections.length > 1 ? (
            <section className="contentCard attemptSectionPanel attemptRailPanel attemptSectionPanelMuted">
              <div className="sectionHeading">
                <strong>Section Access</strong>
                <span>
                  {detail.section_runtime.current_section_timer_enabled
                    ? "Change carefully in timed flow"
                    : "Move between sections"}
                </span>
              </div>
              <div className="attemptSectionGrid attemptSectionGridCompact">
                {sections.map((section) => {
                  const isCurrent = currentSectionId === section.id;
                  const isVisited = visitedSectionIds.includes(section.id);
                  const sectionQuestionTotal = safeQuestions.filter(
                    (question) => question.section === section.id,
                  ).length;
                  const savedInSection = safeQuestions.reduce((count, question) => {
                    if (question.section !== section.id) return count;
                    return count + (hasSavedResponse(answerMap.get(question.question)) ? 1 : 0);
                  }, 0);

                  return (
                    <article
                      className={`attemptSectionCard ${
                        isCurrent ? "attemptSectionCardActive" : ""
                      }`}
                      key={section.id}
                    >
                      <div className="attemptSectionCardHeader">
                        <div>
                          <strong>{section.name}</strong>
                          <span>{section.questionCount} questions</span>
                        </div>
                        <StatusPill tone={isCurrent ? "live" : isVisited ? "demo" : "warning"}>
                          {isCurrent ? "Current" : isVisited ? "Visited" : "Ready"}
                        </StatusPill>
                      </div>
                      <div className="attemptSectionCardStats">
                        <div>
                          <span>Saved</span>
                          <strong>{savedInSection}/{sectionQuestionTotal}</strong>
                        </div>
                        <div>
                          <span>Move type</span>
                          <strong>
                            {isCurrent
                              ? "Already open"
                              : isVisited
                                ? "Re-open section"
                                : "Open for the first time"}
                          </strong>
                        </div>
                      </div>
                      <p className="attemptSectionCardHint">
                        {isCurrent
                          ? "You are already working in this section."
                          : isVisited
                            ? "Re-opening keeps the same attempt active and does not save the current answer for you."
                            : "Opening this section is navigation only. Save the current answer first if you changed it."}
                      </p>
                      <AttemptActionForm
                        action={switchSectionAction}
                        actionKind="section-switch"
                        attemptId={attemptId}
                      >
                        <input name="section_id" type="hidden" value={section.id} />
                        <ActionSubmitButton
                          actionLabel={`Switch to section ${section.name}`}
                          className={isCurrent ? "button buttonGhost" : "button buttonGhost attemptSectionSwitchButton"}
                          disabled={isCurrent}
                          idleLabel={isCurrent ? "Current Section" : "Open Section"}
                          pendingLabel="Switching..."
                        />
                      </AttemptActionForm>
                    </article>
                  );
                })}
              </div>
              <p className="attemptSupportText">
                Opening another section keeps the same attempt active. Section switching is navigation, not save, so confirm the current answer first if you changed anything.
              </p>
            </section>
          ) : null}
        </aside>
      </section>

      <section className="attemptWorkspaceDetails">
        <AttemptResiliencePanel
          initialAction={action}
          initialConfirmedAt={confirmedAt ? feedbackMessage(confirmedAt) : null}
          initialConfirmedSavedAt={savedAt ? feedbackMessage(savedAt) : null}
          attemptId={attemptId}
          initialLastSavedAt={latestSavedAt}
          initialNotice={notice}
          initialError={error}
        />

        {detail.accommodation_snapshot.has_accommodations ? (
          <section className="contentCard attemptAccommodationPanel">
            <div className="attemptResilienceTop">
              <div>
                <strong>Accommodation support active</strong>
                <p>
                  This attempt includes approved support settings that were locked in when
                  the attempt started.
                </p>
              </div>
              <div className="attemptResilienceMeta">
                {detail.accommodation_snapshot.applied_extra_time_minutes > 0 ? (
                  <StatusPill tone="live">
                    +{detail.accommodation_snapshot.applied_extra_time_minutes} min
                  </StatusPill>
                ) : null}
                {detail.accommodation_snapshot.simplified_warning_copy ? (
                  <StatusPill tone="demo">Simplified guidance</StatusPill>
                ) : null}
                {detail.accommodation_snapshot.additional_violation_allowance > 0 ? (
                  <StatusPill tone="warning">
                    +{detail.accommodation_snapshot.additional_violation_allowance} warning allowance
                  </StatusPill>
                ) : null}
              </div>
            </div>

            <div className="attemptStatusGrid">
              <div className="attemptStatusTile">
                <span>Effective duration</span>
                <strong>
                  {detail.accommodation_snapshot.effective_duration_minutes > 0
                    ? `${detail.accommodation_snapshot.effective_duration_minutes} minutes`
                    : "Standard exam runtime"}
                </strong>
              </div>
              <div className="attemptStatusTile">
                <span>Support instructions</span>
                <strong>
                  {detail.accommodation_snapshot.alternative_instructions ||
                    "Use the standard exam instructions together with this approved support plan."}
                </strong>
              </div>
              <div className="attemptStatusTile">
                <span>Support notes</span>
                <strong>
                  {detail.accommodation_snapshot.notes ||
                    "No additional notes were attached to this accommodation snapshot."}
                </strong>
              </div>
              <div className="attemptStatusTile">
                <span>Integrity allowance</span>
                <strong>
                  {detail.accommodation_snapshot.additional_violation_allowance > 0
                    ? `${detail.accommodation_snapshot.additional_violation_allowance} extra warning before automatic action`
                    : "Standard integrity threshold applies"}
                </strong>
              </div>
            </div>
          </section>
        ) : null}
      </section>
        </>
      )}
    </div>
  );
}
