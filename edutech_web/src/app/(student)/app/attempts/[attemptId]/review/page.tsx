import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPassiveNavLink } from "@/components/ui/student-passive-nav-link";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import {
  getStudentQuestionPromptTitle,
  StudentQuestionPrompt,
} from "@/components/ui/student-question-prompt";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StudentWorkspaceLink as Link } from "@/components/ui/student-workspace-link";
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

type ReviewOutcomeFilter = "all" | "wrong" | "skipped" | "correct";
const REVIEW_PAGE_SIZE_VALUES = [5, 10, 20] as const;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveReviewOutcomeFilter(value?: string): ReviewOutcomeFilter {
  switch (value) {
    case "wrong":
    case "skipped":
    case "correct":
      return value;
    default:
      return "all";
  }
}

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
        "Correct answers and explanations are visible. Use this review to understand mistakes before the next practice round.",
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
        "Correct answers are visible here, but detailed explanations are not.",
      progress: attemptOutcomeProgressLabel(outcomeState),
      summaryCta: journey.summaryCta,
      resultsCta: journey.resultsCta,
      laneLabel: journey.laneLabel,
    };
  }

  return {
    nextStep: "Review structure only",
    helper: "This review is limited. Full answer guidance is not available here.",
    progress: attemptOutcomeProgressLabel(outcomeState),
    summaryCta: journey.summaryCta,
    resultsCta: journey.resultsCta,
    laneLabel: journey.laneLabel,
  };
}

function reviewOptionText(value: string) {
  return value.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

function buildReviewFilterHref(args: {
  attemptId: string;
  subject?: string;
  source?: string;
  teacher?: string;
  outcome?: ReviewOutcomeFilter;
  questionType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return buildFilterHref(`/app/attempts/${args.attemptId}/review`, [
    ["subject", args.subject],
    ["source", args.source],
    ["teacher", args.teacher],
    ["review_filter", args.outcome, "all"],
    ["review_question_type", args.questionType],
    ["review_search", args.search?.trim() || undefined],
    ["review_page", args.page ? String(args.page) : undefined, "1"],
    ["review_page_size", args.pageSize ? String(args.pageSize) : undefined, "10"],
  ]);
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
  searchParams: Promise<{
    error?: string;
    subject?: string;
    source?: string;
    teacher?: string;
    review_filter?: string;
    review_question_type?: string;
    review_search?: string;
    review_page?: string;
    review_page_size?: string;
  }>;
}) {
  const { attemptId } = await params;
  const {
    error,
    subject,
    source: sourceParam,
    teacher,
    review_filter,
    review_question_type,
    review_search,
    review_page,
    review_page_size,
  } = await searchParams;
  const { source: reviewSource, review, practiceExams } = await loadAttemptReview(attemptId);
  const scopedSubjectQueryParam = subject?.trim() || undefined;
  const scopedSourceQueryParam = sourceParam?.trim() || undefined;
  const scopedTeacherQueryParam = teacher?.trim() || undefined;

  if (!review) {
    return (
      <div className="studentPage">
        <StudentPageHeader
          title="Attempt Review"
          description="Open answer review when this attempt allows it."
          statusLabel={
            reviewSource === "unconfigured"
              ? "Sign in required"
              : "Review not available"
          }
          statusTone={reviewSource === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={reviewSource === "unconfigured" ? "Setup required" : "Review unavailable"}
          title={
            reviewSource === "unconfigured"
              ? "Review is not available yet"
              : "Attempt review is not available right now"
          }
          description={
            reviewSource === "unconfigured"
              ? "Sign in with your student account to open answer review for this attempt."
              : "Answer review isn't available for this attempt right now."
          }
          bullets={
            reviewSource === "unconfigured"
              ? ["Student sign-in", "Answer review"]
              : ["Review access", "Attempt review"]
          }
          ctaHref={buildFilterHref("/app/results", [
            ["subject", scopedSubjectQueryParam],
            ["source", scopedSourceQueryParam],
            ["teacher", scopedTeacherQueryParam],
          ])}
          ctaLabel="Open Results"
          statusLabel={
            reviewSource === "unconfigured"
              ? "Sign in to continue"
              : "Open results"
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
  const outcomeFilter = resolveReviewOutcomeFilter(review_filter);
  const questionTypeFilter = (review_question_type ?? "").trim();
  const searchQuery = (review_search ?? "").trim();
  const pageSizeCandidate = parsePositiveInt(review_page_size, 10);
  const pageSize = REVIEW_PAGE_SIZE_VALUES.includes(
    pageSizeCandidate as (typeof REVIEW_PAGE_SIZE_VALUES)[number],
  )
    ? pageSizeCandidate
    : 10;
  const questionTypeOptions = Array.from(
    new Map(
      review.review_questions.map((question) => [
        question.question_type,
        questionTypeLabel(question.question_type, question.question_type_definition),
      ]),
    ).entries(),
  ).map(([value, label]) => ({ value, label }));
  const filteredReviewQuestions = review.review_questions.filter((question) => {
    if (outcomeFilter !== "all" && question.result_status !== outcomeFilter) {
      return false;
    }

    if (questionTypeFilter && question.question_type !== questionTypeFilter) {
      return false;
    }

    if (!searchQuery) {
      return true;
    }

    const searchable = [
      getStudentQuestionPromptTitle(question),
      question.section_title,
      question.explanation,
      ...question.options.map((option) => option.option_text),
      ...question.accepted_answers,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(searchQuery.toLowerCase());
  });
  const totalReviewPages = Math.max(1, Math.ceil(filteredReviewQuestions.length / pageSize));
  const currentPage = Math.min(parsePositiveInt(review_page, 1), totalReviewPages);
  const pagedQuestions = filteredReviewQuestions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const wrongCount = review.review_questions.filter((question) => question.result_status === "wrong").length;
  const skippedCount = review.review_questions.filter((question) => question.result_status === "skipped").length;
  const correctCount = review.review_questions.filter((question) => question.result_status === "correct").length;
  const showingStart = filteredReviewQuestions.length ? (currentPage - 1) * pageSize + 1 : 0;
  const showingEnd = Math.min(currentPage * pageSize, filteredReviewQuestions.length);
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
            detail: "Use review to confirm the wrong or skipped pattern before spending stars.",
          },
          {
            label: "Then next",
            detail: "Unlock the matched practice set only if it covers the same subject or topic cluster.",
          },
          {
            label: "After that",
            detail: "Return to analytics or results to see whether the same gap still appears.",
          },
        ]
      : [
          {
            label: "Do this first",
            detail: "Use review to confirm the wrong or skipped pattern while the attempt is still fresh.",
          },
          {
            label: "Then next",
            detail: "Move into the matched practice lane for the topic or subject most exposed by this review.",
          },
          {
            label: "After that",
            detail: "Return to analytics, results, or summary to verify whether the same pattern still needs work.",
          },
        ];

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerAttemptReviewPage">
      <StudentPageHeader
        title={`${review.exam_title} Review`}
        description="Review answers, explanations, and the best next learning step."
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
            · {stateCopy.laneLabel}
          </small>
        </div>
        <div className="studentInsightHeroActions studentSummaryHeroActions">
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
          <StudentPassiveNavLink
            className="button buttonSecondary"
            href={buildFilterHref("/app/results", [
              ["subject", scopedSubjectParam],
              ["source", scopedSourceQueryParam],
              ["teacher", scopedTeacherQueryParam],
            ])}
          >
            {stateCopy.resultsCta}
          </StudentPassiveNavLink>
          <StudentPassiveNavLink
            className="button buttonGhost"
            href={buildFilterHref("/app/attempts", [
              ["subject", scopedSubjectParam],
              ["source", scopedSourceQueryParam],
              ["teacher", scopedTeacherQueryParam],
            ])}
          >
            Attempt History
          </StudentPassiveNavLink>
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
            <strong>Next Learning Step</strong>
            <StatusPill tone="default">{practiceFocus.label}</StatusPill>
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
          </div>
          <div className="studentActionSequence" aria-label="Review recovery order">
            {reviewRecoverySequence.map((step) => (
              <div className="studentActionSequenceCard" key={step.label}>
                <span>{step.label}</span>
                <strong>{step.detail}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Use This Review</strong>
          <span>{titleCaseState(review.review_mode)}</span>
        </div>
        <div className="studentInsightHeroActions">
          <StudentPassiveNavLink className="button buttonSecondary" href="/app/analytics">
            View Analytics
          </StudentPassiveNavLink>
          <StudentPassiveNavLink
            className="button buttonGhost"
            href={buildFilterHref("/app/results", [
              ["subject", scopedSubjectParam],
              ["source", scopedSourceQueryParam],
              ["teacher", scopedTeacherQueryParam],
            ])}
          >
            View Results
          </StudentPassiveNavLink>
          <Link
            className="button buttonGhost"
            href={buildFilterHref(`/app/attempts/${review.id}/summary`, [
              ["subject", scopedSubjectParam],
              ["source", scopedSourceQueryParam],
              ["teacher", scopedTeacherQueryParam],
            ])}
          >
            Return To Summary
          </Link>
        </div>
      </section>

      <section className="contentCard studentWorkspaceFiltersCard studentAttemptsFiltersCard">
        <form className="studentWorkspaceFiltersForm" method="GET">
          {scopedSubjectQueryParam ? <input name="subject" type="hidden" value={scopedSubjectQueryParam} /> : null}
          {scopedSourceQueryParam ? <input name="source" type="hidden" value={scopedSourceQueryParam} /> : null}
          {scopedTeacherQueryParam ? <input name="teacher" type="hidden" value={scopedTeacherQueryParam} /> : null}
          <label className="studentWorkspaceFilterField">
            <span>Outcome</span>
            <select defaultValue={outcomeFilter} name="review_filter">
              <option value="all">All questions</option>
              <option value="wrong">Wrong only</option>
              <option value="skipped">Skipped only</option>
              <option value="correct">Correct only</option>
            </select>
          </label>
          <label className="studentWorkspaceFilterField">
            <span>Question type</span>
            <select defaultValue={questionTypeFilter} name="review_question_type">
              <option value="">All types</option>
              {questionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="studentWorkspaceFilterField studentWorkspaceFilterFieldWide">
            <span>Search</span>
            <input
              defaultValue={searchQuery}
              name="review_search"
              placeholder="Search question wording, options, or explanation"
              type="search"
            />
          </label>
          <label className="studentWorkspaceFilterField">
            <span>Page size</span>
            <select defaultValue={String(pageSize)} name="review_page_size">
              {REVIEW_PAGE_SIZE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value} per page
                </option>
              ))}
            </select>
          </label>
          <div className="studentWorkspaceFilterActions">
            <button className="button buttonPrimary" type="submit">
              Update view
            </button>
            <Link
              className="button buttonSecondary"
              href={buildReviewFilterHref({
                attemptId: review.id,
                subject: scopedSubjectQueryParam,
                source: scopedSourceQueryParam,
                teacher: scopedTeacherQueryParam,
              })}
            >
              Reset filters
            </Link>
          </div>
        </form>

        <div className="studentWorkspaceFilterQuickRow">
          <span className="studentWorkspaceFilterQuickLabel">Quick review</span>
          <div className="studentWorkspaceFilterQuickChips">
            {[
              { label: `All (${review.review_questions.length})`, outcome: "all" as const, active: outcomeFilter === "all" },
              { label: `Wrong (${wrongCount})`, outcome: "wrong" as const, active: outcomeFilter === "wrong" },
              { label: `Skipped (${skippedCount})`, outcome: "skipped" as const, active: outcomeFilter === "skipped" },
              { label: `Correct (${correctCount})`, outcome: "correct" as const, active: outcomeFilter === "correct" },
            ].map((chip) => (
              <Link
                key={chip.label}
                className={`studentWorkspaceQuickChip${chip.active ? " studentWorkspaceQuickChipActive" : ""}`}
                href={buildReviewFilterHref({
                  attemptId: review.id,
                  subject: scopedSubjectQueryParam,
                  source: scopedSourceQueryParam,
                  teacher: scopedTeacherQueryParam,
                  outcome: chip.outcome,
                  questionType: questionTypeFilter || undefined,
                  search: searchQuery || undefined,
                  page: 1,
                  pageSize,
                })}
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>

        <FilterSummaryPills
          className="studentWorkspaceFilterChips"
          items={[
            { label: "Outcome", value: outcomeFilter !== "all" ? titleCaseState(outcomeFilter) : null },
            {
              label: "Question type",
              value: questionTypeFilter
                ? questionTypeOptions.find((option) => option.value === questionTypeFilter)?.label ?? questionTypeFilter
                : null,
            },
            { label: "Search", value: searchQuery || null },
            { label: "Page size", value: pageSize !== 10 ? String(pageSize) : null },
          ]}
        />
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Review Questions</strong>
          <span>
            Showing {showingStart}-{showingEnd} of {filteredReviewQuestions.length}
          </span>
        </div>
        {totalReviewPages > 1 ? (
          <div className="studentReviewPageStateRow">
            <StatusPill tone="default">
              Page {currentPage} of {totalReviewPages}
            </StatusPill>
          </div>
        ) : null}
      </section>

      <section className="attemptQuestionStack">
        {pagedQuestions.length === 0 ? (
          <StudentStatePanel
            eyebrow="No matching questions"
            title="No questions match these review filters"
            description="Try a broader outcome filter, remove the search text, or reset the review controls."
            ctaHref={buildReviewFilterHref({
              attemptId: review.id,
              subject: scopedSubjectQueryParam,
              source: scopedSourceQueryParam,
              teacher: scopedTeacherQueryParam,
            })}
            ctaLabel="Reset review filters"
            statusLabel="Filter returned zero questions"
          />
        ) : null}
        {pagedQuestions.map((question, index) => {
          const previousQuestion = pagedQuestions[index - 1];
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

      {pagedQuestions.length > 0 && totalReviewPages > 1 ? (
        <section className="contentCard studentReviewPaginationCard">
          <div className="studentReviewPaginationBar">
            <div className="studentReviewPaginationSummary">
              <span>
                Page {currentPage} of {totalReviewPages} · Showing {showingStart}-{showingEnd} of {filteredReviewQuestions.length} questions
              </span>
            </div>
            <div className="studentReviewPaginationActions">
              {currentPage > 1 ? (
                <Link
                  className="button buttonGhost"
                  href={buildReviewFilterHref({
                    attemptId: review.id,
                    subject: scopedSubjectQueryParam,
                    source: scopedSourceQueryParam,
                    teacher: scopedTeacherQueryParam,
                    outcome: outcomeFilter,
                    questionType: questionTypeFilter || undefined,
                    search: searchQuery || undefined,
                    page: currentPage - 1,
                    pageSize,
                  })}
                >
                  Previous page
                </Link>
              ) : null}
              {currentPage < totalReviewPages ? (
                <Link
                  className="button buttonPrimary"
                  href={buildReviewFilterHref({
                    attemptId: review.id,
                    subject: scopedSubjectQueryParam,
                    source: scopedSourceQueryParam,
                    teacher: scopedTeacherQueryParam,
                    outcome: outcomeFilter,
                    questionType: questionTypeFilter || undefined,
                    search: searchQuery || undefined,
                    page: currentPage + 1,
                    pageSize,
                  })}
                >
                  Next page
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
