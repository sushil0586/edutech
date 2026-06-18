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
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StatusPill } from "@/components/ui/status-pill";
import { StudentSecurityPolicy } from "@/features/dashboard/types";
import {
  fetchStudentAttemptDetail,
  getStudentApiState,
  saveStudentAnswer,
  submitStudentAttempt,
  switchStudentAttemptSection,
} from "@/lib/api/student";
import {
  questionTypeLabel,
  titleCaseState,
} from "@/lib/student/formatters";

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

function hasSavedResponse(answer: {
  selected_option: string | null;
  selected_option_ids: string[];
  answer_text: string;
} | null | undefined) {
  if (!answer) return false;

  return Boolean(
    answer.selected_option ||
      answer.selected_option_ids.length > 0 ||
      answer.answer_text.trim(),
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
  const latestSavedAt = latestAnswerSyncAt(detail.answers);
  const questionCountInSection = visibleQuestions.length;
  const isLockedAttemptState =
    detail.status !== "in_progress" ||
    decodedError.toLowerCase().includes("expired");
  const currentSectionIndex = currentSectionId
    ? sections.findIndex((section) => section.id === currentSectionId)
    : -1;
  const nextSection =
    currentSectionIndex >= 0 ? sections[currentSectionIndex + 1] ?? null : null;
  const firstQuestionBySectionId = new Map(
    sections.map((section) => [
      section.id,
      safeQuestions.find((question) => question.section === section.id)?.question ?? null,
    ]),
  );

  async function saveAnswerAction(formData: FormData) {
    "use server";

    const questionId = String(formData.get("question_id") ?? "");
    const questionType = String(formData.get("question_type") ?? "");
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
    } else if (questionType === "mcq_multiple") {
      payload.selected_option_ids = formData
        .getAll("selected_option_ids")
        .map((value) => String(value))
        .filter(Boolean);
    } else if (questionType === "short_answer") {
      payload.answer_text = String(formData.get("answer_text") ?? "");
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
              {isLockedAttemptState ? "Attempt locked" : "Test in progress"}
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
              Back to Tests
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
            <StatusPill tone={securityTone(detail.security_policy)}>
              {detail.security_policy.student_label}
            </StatusPill>
            <StatusPill tone={isLockedAttemptState ? "danger" : "live"}>
              {isLockedAttemptState ? "Locked" : titleCaseState(detail.status)}
            </StatusPill>
          </div>
        </div>
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
                  {detail.status === "submitted" || detail.status === "auto_submitted"
                    ? "This test is no longer editable"
                    : "This attempt has expired"}
                </strong>
                <p>
                  {decodedError ||
                    (detail.status === "auto_submitted"
                      ? "The timer ended and the test was submitted automatically."
                      : "The timer ended or the session changed state. Refresh to load the latest backend status.")}
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
                Refresh Attempt State
              </a>
              {(detail.status === "submitted" || detail.status === "auto_submitted") &&
              detail.submitted_at ? (
                <a
                  className="button buttonSecondary"
                  href={`/app/attempts/${attemptId}/summary`}
                >
                  View Attempt Summary
                </a>
              ) : null}
              <Link className="button buttonGhost" href="/app/exams">
                Back to Tests
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
              <span>Progress</span>
              <strong>
                {answeredCount} saved, {markedCount} marked for review
              </strong>
            </div>
            {currentSectionName ? (
              <div className="examStateSummary">
                <span>Current section</span>
                <strong>{currentSectionName}</strong>
              </div>
            ) : null}
            <div className="examStateSummary">
              <span>Question flow</span>
              <strong>{activeQuestion ? "One question at a time" : "No questions available"}</strong>
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
                      ? `${question.section_title} · ${questionTypeLabel(question.question_type)}`
                      : questionTypeLabel(question.question_type)}
                  </span>
                  <small className="attemptQuestionMetaLine">
                    {questionCountInSection} questions in this section
                  </small>
                </div>
                <StatusPill tone={questionStatusTone}>{questionStatusLabel}</StatusPill>
              </div>

              <div className="attemptQuestionPrompt">
                <p className="studentNotificationMessage">{question.question_text}</p>
              </div>

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

                {question.question_type === "short_answer" ? (
                  <textarea
                    className="attemptTextarea"
                    defaultValue={answer?.answer_text ?? ""}
                    name="answer_text"
                    placeholder="Write your answer here"
                    rows={5}
                  />
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
                          {question.question_type === "mcq_multiple" ? (
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
                <p className="attemptSupportText">
                  Save this answer before moving on. Mark the question for review if you want to revisit it before submission.
                </p>
                <div className="attemptQuestionFooter">
                  <div className="attemptQuestionFooterMeta">
                    <span>
                      {isAnswered ? "Saved" : "Not saved"} ·{" "}
                      {isMarked ? "Marked for review" : "Not marked for review"}
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
              <AttemptCountdown initialSeconds={activeTimeRemaining} mode="pill" />
            </div>
            <div className="attemptConsoleSummaryGrid">
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
            </div>
            <p className="attemptSupportText">
              Review marked and unanswered questions before you submit.
            </p>
            <AttemptActionForm
              action={submitAttemptAction}
              actionKind="submit"
              attemptId={attemptId}
              confirmMessage={`Submit this test now?\n\nSaved: ${answeredCount}\nMarked for review: ${markedCount}\nNot answered: ${unansweredCount}\n\nYou will be taken to the attempt summary after submission.`}
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
                    <StatusPill tone={tone}>{label}</StatusPill>
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
            </section>
          ) : null}
        </aside>
      </section>

      <section className="attemptWorkspaceDetails">
        {(error || notice || action || savedAt) ? (
          <AttemptResiliencePanel
            initialAction={action}
            initialConfirmedAt={confirmedAt ? feedbackMessage(confirmedAt) : null}
            initialConfirmedSavedAt={savedAt ? feedbackMessage(savedAt) : null}
            attemptId={attemptId}
            initialLastSavedAt={latestSavedAt}
            initialNotice={notice}
            initialError={error}
          />
        ) : null}

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
