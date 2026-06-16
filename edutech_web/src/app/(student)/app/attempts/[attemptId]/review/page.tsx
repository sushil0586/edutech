import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
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
  derivePracticeFocusFromReviewQuestions,
  resolvePracticeFollowUpAction,
} from "@/lib/student/practice";

function reviewStateCopy(review: {
  show_explanations: boolean;
  show_correct_answers: boolean;
  review_mode: string;
}) {
  if (review.show_explanations) {
    return {
      nextStep: "Learn from explanations",
      helper:
        "This review mode includes correctness and explanation visibility, so the student can use it as a learning pass after submission.",
      summaryCta: "Back to Summary",
      resultsCta: "Open Results",
    };
  }

  if (review.show_correct_answers) {
    return {
      nextStep: "Inspect answer outcomes",
      helper:
        "Correctness is visible here, but detailed explanations are hidden by the current review policy.",
      summaryCta: "Back to Summary",
      resultsCta: "Open Results",
    };
  }

  return {
    nextStep: "Review structure only",
    helper:
      "This review mode is limited. The student can revisit the attempt structure, but full solution visibility is not enabled.",
    summaryCta: "Back to Summary",
    resultsCta: "Check Result Status",
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
  searchParams: Promise<{ error?: string }>;
}) {
  const { attemptId } = await params;
  const { error } = await searchParams;
  const { source, review, practiceExams } = await loadAttemptReview(attemptId);

  if (!review) {
    return (
      <div className="studentPage">
        <StudentPageHeader
          title="Attempt Review"
          description="Review content is only available when the backend allows it for the submitted attempt."
          statusLabel={
            source === "unconfigured"
              ? "Backend not configured"
              : "Review not available"
          }
          statusTone={source === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Review unavailable"}
          title={
            source === "unconfigured"
              ? "Waiting for review access"
              : "Attempt review is not available right now"
          }
          description={
            source === "unconfigured"
              ? "Review content is only available when the backend allows it for the submitted attempt and the app has a valid student session."
              : "The backend did not return review content for this attempt. Review availability may depend on result visibility or exam policy."
          }
          bullets={
            source === "unconfigured"
              ? ["Attempt review endpoint", "Active student web session"]
              : ["Review availability rules", "Attempt review endpoint"]
          }
          ctaHref="/app/results"
          ctaLabel="Check Result Status"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Check result visibility"
          }
        />
      </div>
    );
  }

  const stateCopy = reviewStateCopy(review);
  const practiceFocus = derivePracticeFocusFromReviewQuestions(review.review_questions);
  const practiceFollowUp = resolvePracticeFollowUpAction({
    exams: practiceExams,
    subjectName: practiceFocus.subjectName,
  });

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        title={`${review.exam_title} Review`}
        description="Post-attempt review powered by the backend review endpoint."
        action={<StatusPill tone="live">{titleCaseState(review.review_mode)}</StatusPill>}
      />

      {error ? (
        <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p>
      ) : null}

      <section className="studentInsightHeroCard">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Review Mode</span>
          <strong>{stateCopy.nextStep}</strong>
          <p>{stateCopy.helper}</p>
          <small>
            {review.show_explanations
              ? "Explanations visible"
              : review.show_correct_answers
                ? "Answers visible"
                : "Limited review"}
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href={`/app/attempts/${review.id}/summary`}>
            {stateCopy.summaryCta}
          </Link>
          <Link className="button buttonSecondary" href="/app/results">
            {stateCopy.resultsCta}
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
            <StatusPill tone={review.show_explanations ? "live" : review.show_correct_answers ? "warning" : "demo"}>
              {review.show_explanations
                ? "Solutions visible"
                : review.show_correct_answers
                  ? "Answers visible"
                  : "Limited review"}
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
              <p>Use this review as a learning pass, not just a score check.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Move into practice with a focused topic path after inspecting weak responses.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Analytics becomes more useful after review when you turn patterns into follow-up action.</p>
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
              <Link className="button buttonSecondary" href={practiceFollowUp.action.href}>
                {practiceFollowUp.action.mode === "link"
                  ? practiceFocus.label
                  : practiceFollowUp.action.label}
              </Link>
            )}
            <Link className="button buttonGhost" href="/app/analytics">
              View Analytics
            </Link>
          </div>
        </article>
      </section>

      <section className="attemptQuestionStack">
        {review.review_questions.map((question) => (
          <article className="attemptQuestionCard" key={question.exam_question_id}>
            <div className="attemptQuestionHeader">
              <div>
                <strong>
                  Q{question.question_order}. {question.question_text}
                </strong>
                <span>
                  {question.section_title
                    ? `${question.section_title} · ${questionTypeLabel(question.question_type)}`
                    : questionTypeLabel(question.question_type)}
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

            {question.question_type === "short_answer" ? (
              <div className="attemptOptionList">
                <div className="attemptOptionRow attemptOptionReviewRow attemptOptionSelected">
                  <strong>Your answer</strong>
                  <span>{reviewOptionText(question.answer_text || "No answer submitted")}</span>
                </div>
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

            {review.show_explanations && question.explanation ? (
              <p className="studentNotificationMessage">{question.explanation}</p>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
