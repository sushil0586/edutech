import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import {
  getStudentQuestionPromptTitle,
  StudentQuestionPrompt,
} from "@/components/ui/student-question-prompt";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  fetchStudentAvailableExams,
  fetchStudentAttemptReview,
  getStudentApiState,
  spendStarsForContent,
  startStudentAttempt,
} from "@/lib/api/student";
import {
  percentageLabel,
  questionTypeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import {
  attemptOutcomeJourney,
  attemptOutcomeProgressLabel,
  attemptOutcomeResultsLabel,
  attemptOutcomeReviewLabel,
  reviewVisibilityLabel,
  reviewVisibilityTone,
  resolveAttemptOutcomeState,
} from "@/lib/student/attempt-outcome";
import { questionTypeSupportsTextAnswer } from "@/lib/assessment/question-type";
import {
  buildPracticeHref,
  derivePracticeFocusFromReviewQuestions,
  resolvePracticeFollowUpAction,
} from "@/lib/student/practice";
import { buildFilterHref } from "@/lib/workspace/filter-utils";

function reviewStateCopy(review: {
  show_explanations: boolean;
  show_correct_answers: boolean;
  review_mode: string;
}) {
  const outcomeState = resolveAttemptOutcomeState({
    resultVisible: true,
    reviewAvailable: true,
  });
  const journey = attemptOutcomeJourney(outcomeState);

  if (review.show_explanations) {
    return {
      nextStep: "Learn from explanations",
      helper:
        `This review mode includes correctness and explanation visibility, so the student can use it as a learning pass after submission. ${journey.laneHelper}`,
      progress: attemptOutcomeProgressLabel(outcomeState),
      summaryCta: journey.summaryCta,
      resultsCta: journey.resultsCta,
      laneLabel: journey.laneLabel,
    };
  }

  if (review.show_correct_answers) {
    return {
      nextStep: "Inspect answer outcomes",
      helper:
        `Correctness is visible here, but detailed explanations are hidden by the current review policy. ${journey.laneHelper}`,
      progress: attemptOutcomeProgressLabel(outcomeState),
      summaryCta: journey.summaryCta,
      resultsCta: journey.resultsCta,
      laneLabel: journey.laneLabel,
    };
  }

    return {
      nextStep: "Review structure only",
      helper:
        `This review mode is limited. The student can revisit the attempt structure, but full solution visibility is not enabled. ${journey.laneHelper}`,
      progress: attemptOutcomeProgressLabel(outcomeState),
      summaryCta: journey.summaryCta,
      resultsCta: journey.resultsCta,
      laneLabel: journey.laneLabel,
  };
}

function reviewOptionText(value: string) {
  return value.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

async function loadAttemptReview(attemptId: string) {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return { source: "unconfigured" as const, review: null, practiceExams: [] };
  }

  try {
    const [review, exams] = await Promise.all([
      fetchStudentAttemptReview(attemptId),
      fetchStudentAvailableExams(),
    ]);
    return {
      source: "live" as const,
      review,
      practiceExams: exams.filter((exam) => exam.exam_type === "practice"),
    };
  } catch {
    return { source: "error" as const, review: null, practiceExams: [] };
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
    redirect(`/app/attempts/${formData.get("attempt_id")}/review?error=${message}`);
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
    redirect(`/app/attempts/${attemptId}/review?error=${message}`);
  }
}

export default async function AttemptReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ error?: string; subject?: string; source?: string; teacher?: string }>;
}) {
  const { attemptId } = await params;
  const { error, subject, source: sourceParam, teacher } = await searchParams;
  const { source: reviewSource, review, practiceExams } = await loadAttemptReview(attemptId);
  const scopedSubjectQueryParam = subject?.trim() || undefined;
  const scopedSourceQueryParam = sourceParam?.trim() || undefined;
  const scopedTeacherQueryParam = teacher?.trim() || undefined;

  if (!review) {
    return (
      <div className="studentPage">
        <StudentPageHeader
          title="Attempt Review"
          description="Review content is only available when the backend allows it for the submitted attempt."
          statusLabel={
            reviewSource === "unconfigured"
              ? "Backend not configured"
              : "Review not available"
          }
          statusTone={reviewSource === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={reviewSource === "unconfigured" ? "Setup required" : "Review unavailable"}
          title={
            reviewSource === "unconfigured"
              ? "Waiting for review access"
              : "Attempt review is not available right now"
          }
          description={
            reviewSource === "unconfigured"
              ? "Review content is only available when the backend allows it for the submitted attempt and the app has a valid student session."
              : "The backend did not return review content for this attempt. Review availability may depend on result visibility or exam policy."
          }
          bullets={
            reviewSource === "unconfigured"
              ? ["Attempt review endpoint", "Active student web session"]
              : ["Review availability rules", "Attempt review endpoint"]
          }
          ctaHref={buildFilterHref("/app/results", [
            ["subject", scopedSubjectQueryParam],
            ["source", scopedSourceQueryParam],
            ["teacher", scopedTeacherQueryParam],
          ])}
          ctaLabel="Check Result Status"
          statusLabel={
            reviewSource === "unconfigured"
              ? "Configuration required"
              : "Check result visibility"
          }
        />
      </div>
    );
  }

  const stateCopy = reviewStateCopy(review);
  const outcomeState = resolveAttemptOutcomeState({
    resultVisible: true,
    reviewAvailable: true,
  });
  const practiceFocus = derivePracticeFocusFromReviewQuestions(review.review_questions);
  const practiceFollowUp = resolvePracticeFollowUpAction({
    exams: practiceExams,
    subjectName: practiceFocus.subjectName,
  });
  const scopedSubjectParam =
    scopedSubjectQueryParam || practiceFocus.subjectName?.trim() || undefined;
  const scopedPracticeHref = buildPracticeHref({
    subjectName: scopedSubjectParam ?? null,
    topicName: practiceFocus.topicName ?? null,
    source: scopedSourceQueryParam ?? null,
    teacher: scopedTeacherQueryParam ?? null,
  });
  const reviewRecoverySequence =
    practiceFollowUp.exam && practiceFollowUp.action.mode === "unlock"
      ? [
          {
            label: "Do this first",
            detail: "Use review to confirm the exact wrong or skipped pattern before spending stars on the next practice lane.",
          },
          {
            label: "Then next",
            detail: "Unlock the matched practice set only if it covers the same subject or topic cluster surfaced in this review.",
          },
          {
            label: "After that",
            detail: "Return to analytics or results to compare whether the same gap still appears after the repair pass.",
          },
        ]
      : [
          {
            label: "Do this first",
            detail: "Use review to confirm the exact wrong or skipped pattern while the attempt is still fresh.",
          },
          {
            label: "Then next",
            detail: "Move straight into the matched practice lane for the topic or subject most exposed by this review.",
          },
          {
            label: "After that",
            detail: "Return to analytics, results, or summary to verify whether the same error pattern still needs work.",
          },
        ];

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerAttemptReviewPage">
      <StudentPageHeader
        title={`${review.exam_title} Review`}
        description="Post-attempt review powered by the backend review endpoint."
        action={<StatusPill tone="live">{titleCaseState(review.review_mode)}</StatusPill>}
      />

      {error ? (
        <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p>
      ) : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Review Mode</span>
          <strong>{stateCopy.nextStep}</strong>
          <small>
            {attemptOutcomeResultsLabel(outcomeState)} ·{" "}
            {attemptOutcomeReviewLabel(outcomeState)} ·{" "}
            {reviewVisibilityLabel({
              showExplanations: review.show_explanations,
              showCorrectAnswers: review.show_correct_answers,
            })}{" "}
            · Returned by backend review policy · {stateCopy.laneLabel}
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link
            className="button buttonPrimary"
            href={buildFilterHref(`/app/attempts/${review.id}/summary`, [
              ["subject", scopedSubjectParam],
              ["source", scopedSourceQueryParam],
              ["teacher", scopedTeacherQueryParam],
            ])}
          >
            {stateCopy.summaryCta}
          </Link>
          <Link
            className="button buttonSecondary"
            href={buildFilterHref("/app/results", [
              ["subject", scopedSubjectParam],
              ["source", scopedSourceQueryParam],
              ["teacher", scopedTeacherQueryParam],
            ])}
          >
            {stateCopy.resultsCta}
          </Link>
          <Link
            className="button buttonGhost"
            href={buildFilterHref("/app/attempts", [
              ["subject", scopedSubjectParam],
              ["source", scopedSourceQueryParam],
              ["teacher", scopedTeacherQueryParam],
            ])}
          >
            Open Attempts
          </Link>
        </div>
      </section>

      <StudentKpiGrid
        items={[
          {
            label: "Score",
            value: percentageLabel(review.percentage),
            note: `${review.final_score} final score`,
            tone: "primary",
          },
          {
            label: "Correct Answers",
            value: review.correct_answers,
            note: `${review.incorrect_answers} incorrect`,
          },
          {
            label: "Review Scope",
            value: review.review_questions.length,
            note: review.show_explanations
              ? "Explanations visible"
              : "Explanations hidden",
          },
          {
            label: "Practice Follow-Up",
            value: practiceFocus.label,
            note: "Derived from review question patterns",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Review State</strong>
            <StatusPill
              tone={reviewVisibilityTone({
                showExplanations: review.show_explanations,
                showCorrectAnswers: review.show_correct_answers,
              })}
            >
              {reviewVisibilityLabel({
                showExplanations: review.show_explanations,
                showCorrectAnswers: review.show_correct_answers,
              })}
            </StatusPill>
          </div>

          <div className="studentResultBreakdown">
            <div>
              <span>Correct answers</span>
              <strong>{review.show_correct_answers ? "Visible" : "Hidden"}</strong>
            </div>
            <div>
              <span>Explanations</span>
              <strong>{review.show_explanations ? "Visible" : "Hidden"}</strong>
            </div>
            <div>
              <span>Questions in review</span>
              <strong>{review.review_questions.length}</strong>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recommended Actions</strong>
            <span>{titleCaseState(review.review_mode)}</span>
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
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>This route is the final student-release stage: the attempt was submitted, the result was published, and review is now available under backend policy.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Use summary to confirm release state, results to compare score reporting, and attempts history to reopen this journey from the broader timeline later.</p>
            </div>
          </div>
          <div className="studentInsightHeroActions">
            {practiceFollowUp.exam && practiceFollowUp.action.mode === "start" ? (
              <form action={startPracticeAction}>
                <input name="exam_id" type="hidden" value={practiceFollowUp.exam.id} />
                <input name="student_id" type="hidden" value={review.student} />
                <input name="attempt_id" type="hidden" value={review.id} />
                <ActionSubmitButton
                  className="button buttonSecondary"
                  idleLabel={practiceFocus.label}
                  pendingLabel="Starting..."
                />
              </form>
            ) : practiceFollowUp.exam && practiceFollowUp.action.mode === "unlock" ? (
              <form action={unlockPracticeAction}>
                <input name="exam_id" type="hidden" value={practiceFollowUp.exam.id} />
                <input name="attempt_id" type="hidden" value={review.id} />
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
                  ? practiceFocus.label
                  : practiceFollowUp.action.label}
              </Link>
            )}
            <Link
              className="button buttonGhost"
              href={buildFilterHref("/app/attempts", [
                ["subject", scopedSubjectParam],
                ["source", scopedSourceQueryParam],
                ["teacher", scopedTeacherQueryParam],
              ])}
            >
              Open Attempts
            </Link>
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Review Recovery Loop</strong>
            <span>{practiceFocus.label}</span>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                Answer review is most useful when it turns visible mistakes into one immediate correction lane instead of ending at inspection alone.
              </p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                The matched practice label is derived from wrong and skipped questions, so the next step stays anchored to what this review actually exposed.
              </p>
            </div>
          </div>
          <div className="studentActionSequence" aria-label="Review recovery order">
            {reviewRecoverySequence.map((step) => (
              <div className="studentActionSequenceCard" key={step.label}>
                <span>{step.label}</span>
                <strong>{step.detail}</strong>
              </div>
            ))}
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/app/analytics">
              View Analytics
            </Link>
            <Link
              className="button buttonGhost"
              href={buildFilterHref("/app/results", [
                ["subject", scopedSubjectParam],
                ["source", scopedSourceQueryParam],
                ["teacher", scopedTeacherQueryParam],
              ])}
            >
              Open Results
            </Link>
          </div>
        </article>
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>What To Repair</strong>
            <span>Before another mock</span>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Wrong answers usually indicate concept repair. Skips usually indicate confidence, pacing, or decision friction.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>If explanations are visible, treat this screen as the learning pass. If not, use the visible correctness pattern plus summary/results to decide the next practice lane.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Another broad mock should usually come after the targeted practice follow-up, not before it.</p>
            </div>
          </div>
          <div className="studentInsightHeroActions">
            <Link
              className="button buttonSecondary"
              href={buildFilterHref(`/app/attempts/${review.id}/summary`, [
                ["subject", scopedSubjectParam],
                ["source", scopedSourceQueryParam],
                ["teacher", scopedTeacherQueryParam],
              ])}
            >
              Back To Summary
            </Link>
            <Link
              className="button buttonGhost"
              href={buildFilterHref("/app/attempts", [
                ["subject", scopedSubjectParam],
                ["source", scopedSourceQueryParam],
                ["teacher", scopedTeacherQueryParam],
              ])}
            >
              Stay In Attempts
            </Link>
          </div>
        </article>
      </section>

      <section className="attemptQuestionStack">
        {review.review_questions.map((question, index) => {
          const previousQuestion = review.review_questions[index - 1];
          const shouldShowPassageTrigger =
            Boolean(question.passage && question.passage_detail?.passage_text) &&
            previousQuestion?.passage !== question.passage;

          return (
          <article className="attemptQuestionCard" key={question.exam_question_id}>
            <div className="attemptQuestionHeader">
              <div>
                <strong>
                  Q{question.question_order}. {getStudentQuestionPromptTitle(question)}
                </strong>
                <span>
                  {question.section_title
                    ? `${question.section_title} · ${questionTypeLabel(question.question_type, question.question_type_definition)}`
                    : questionTypeLabel(question.question_type, question.question_type_definition)}
                </span>
              </div>
              <span
                className={`statusPill ${
                  question.result_status === "correct"
                    ? "statusLive"
                    : question.result_status === "wrong"
                      ? "statusDanger"
                      : "statusWarning"
                }`}
              >
                {titleCaseState(question.result_status)}
              </span>
            </div>

            <StudentQuestionPrompt
              passageBadgeLabel="Shared passage"
              passageButtonLabel="Open Passage"
              passageMetaLabel={question.passage_detail?.title || "Comprehension"}
              question={question}
              showPassageTrigger={shouldShowPassageTrigger}
            />

            {questionTypeSupportsTextAnswer(question.question_type_definition) ? (
              <div className="attemptOptionList">
                <div className="attemptOptionRow attemptOptionReviewRow attemptOptionSelected">
                  <strong>Your answer</strong>
                  <span>{reviewOptionText(question.answer_text || "No answer submitted")}</span>
                </div>
                {question.answer_transcript ? (
                  <div className="attemptOptionRow attemptOptionReviewRow">
                    <strong>Transcript</strong>
                    <span>{reviewOptionText(question.answer_transcript)}</span>
                  </div>
                ) : null}
                {review.show_correct_answers && question.accepted_answers.length ? (
                  <div className="attemptOptionRow attemptOptionReviewRow">
                    <strong>Accepted answer</strong>
                    <span>{question.accepted_answers.map(reviewOptionText).join(" / ")}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="attemptOptionList">
                {question.options.map((option) => (
                  <div
                    className={`attemptOptionRow attemptOptionReviewRow ${
                      option.is_selected ? "attemptOptionSelected" : ""
                    }`}
                    key={option.id}
                  >
                    <strong>{option.option_order}.</strong>
                    <span>
                      {reviewOptionText(option.option_text)}
                      {option.is_correct && review.show_correct_answers ? " (Correct)" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {question.response_artifacts.length ? (
              <div className="attemptArtifactList">
                {question.response_artifacts.map((artifact) => (
                  <div className="attemptArtifactRow" key={artifact.upload_token}>
                    <div>
                      <strong>{artifact.file_name || titleCaseState(artifact.asset_kind)}</strong>
                      <span>
                        {titleCaseState(artifact.asset_kind)}
                        {artifact.storage_status ? ` · ${artifact.storage_status}` : ""}
                      </span>
                    </div>
                    {artifact.file_url ? (
                      <Link
                        className="button buttonGhost"
                        href={artifact.file_url}
                        target="_blank"
                      >
                        Open
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {review.show_explanations && question.explanation ? (
              <p className="studentNotificationMessage">{question.explanation}</p>
            ) : null}
          </article>
        );
        })}
      </section>
    </div>
  );
}
