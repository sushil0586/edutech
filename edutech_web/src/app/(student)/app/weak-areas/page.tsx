import { cookies } from "next/headers";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import {
  fetchStudentAvailableExams,
  fetchStudentInsightSummary,
  fetchStudentTopicPerformance,
  getStudentApiState,
  spendStarsForContent,
  startStudentAttempt,
} from "@/lib/api/student";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsResultsCompareHref,
  buildAnalyticsTopicHref,
  buildQuestionAnalyticsHref,
} from "@/lib/student/analytics";
import {
  percentageLabel,
  questionTypeLabel,
  signedPercentageLabel,
  studentDateTimeLabel,
  trendDirectionLabel,
} from "@/lib/student/formatters";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentExamsBySubject,
  filterStudentRecordsBySource,
  filterStudentSummaryBySource,
  filterStudentSummaryBySubject,
  getStudentSourceOptions,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  selectedStudentSourceLabel,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

function severityLabel(score: number) {
  if (score < 35) return "Critical";
  if (score < 50) return "High";
  if (score < 65) return "Moderate";
  return "Watch";
}

function severityClass(score: number) {
  if (score < 35) return "statusDanger";
  if (score < 50) return "statusWarning";
  if (score < 65) return "statusDemo";
  return "statusLive";
}

function scoreBarTone(score: number) {
  if (score >= 75) return "good";
  if (score >= 55) return "mid";
  if (score >= 40) return "warn";
  return "risk";
}

function topicEvidenceLabel(attemptedQuestions: number) {
  if (attemptedQuestions >= 12) return "Strong evidence";
  if (attemptedQuestions >= 6) return "Medium evidence";
  return "Early signal";
}

function topicCauseTags(topic: {
  percentage: string;
  attempted_questions: number;
  skipped_questions: number;
  incorrect_answers: number;
}) {
  const attempted = Math.max(topic.attempted_questions, 0);
  const skipped = Math.max(topic.skipped_questions, 0);
  const incorrect = Math.max(topic.incorrect_answers, 0);
  const score = Number(topic.percentage);
  const tags: string[] = [];

  if (skipped > 0 && skipped >= Math.max(1, Math.ceil(attempted * 0.35))) {
    tags.push("Skip-heavy");
  }

  if (incorrect > 0 && incorrect >= Math.max(1, Math.ceil(attempted * 0.45))) {
    tags.push("Accuracy drop");
  }

  if (attempted <= 4) {
    tags.push("Low evidence");
  }

  if (score < 40) {
    tags.push("Immediate recovery");
  } else if (score < 55) {
    tags.push("Needs repetition");
  }

  return tags.slice(0, 3);
}

function scoreComposition(topic: {
  attempted_questions: number;
  skipped_questions: number;
  incorrect_answers: number;
}) {
  const attempted = Math.max(topic.attempted_questions, 0);
  const skipped = Math.min(Math.max(topic.skipped_questions, 0), attempted);
  const incorrect = Math.min(Math.max(topic.incorrect_answers, 0), attempted);
  const correct = Math.max(attempted - skipped - incorrect, 0);
  const total = Math.max(correct + incorrect + skipped, 1);

  return {
    correct,
    incorrect,
    skipped,
    correctWidth: (correct / total) * 100,
    incorrectWidth: (incorrect / total) * 100,
    skippedWidth: (skipped / total) * 100,
  };
}

function recoveryHeadline(direction: string, changePercentage: string) {
  const trend = trendDirectionLabel(direction);
  const change = signedPercentageLabel(changePercentage);

  if (direction === "declining") {
    return `${trend} · ${change} across recent scored exams`;
  }
  if (direction === "improving") {
    return `${trend} · ${change} recovery signal`;
  }
  return `${trend} · ${change} movement`;
}

function weakTopicSignal(topic: {
  percentage: string;
  attempted_questions: number;
  skipped_questions: number;
  incorrect_answers: number;
}) {
  const score = Number(topic.percentage);
  const attempted = Math.max(topic.attempted_questions, 1);
  const skippedRate = Math.min(topic.skipped_questions / attempted, 1);
  const incorrectRate = Math.min(topic.incorrect_answers / attempted, 1);
  const evidenceRate = Math.min(attempted / 12, 1);

  const values = [
    Math.max(18, score * 0.72),
    Math.max(14, score - incorrectRate * 22),
    Math.max(12, score - skippedRate * 28),
    Math.max(16, score - (incorrectRate + skippedRate) * 14 + evidenceRate * 10),
    Math.max(18, score + evidenceRate * 12 - skippedRate * 10),
  ];

  const points = values
    .map((value, index) => {
      const x = index * 22;
      const y = 40 - Math.min(Math.max(value, 0), 100) * 0.3;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");

  const direction =
    skippedRate > 0.34 ? "volatile" : score < 40 ? "downward" : score < 60 ? "recovering" : "steady";

  return {
    points,
    direction,
  };
}

async function loadWeakAreas() {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      summary: null,
      topicPerformance: [],
      exams: [],
    };
  }

  try {
    const summary = await fetchStudentInsightSummary();
    const [topicPerformanceResponse, exams] = await Promise.all([
      fetchStudentTopicPerformance(summary.student_id),
      fetchStudentAvailableExams(),
    ]);

    return {
      source: "live" as const,
      summary,
      topicPerformance: topicPerformanceResponse.results,
      exams,
    };
  } catch {
    return {
      source: "error" as const,
      summary: null,
      topicPerformance: [],
      exams: [],
    };
  }
}

function recommendedPracticeAction(exam: {
  id: string;
  can_resume: boolean;
  can_start: boolean;
  active_attempt: { id: string } | null;
  review_available: boolean;
  economy_access: {
    is_locked: boolean;
    can_unlock_with_stars: boolean;
    star_cost: number;
  };
}) {
  if (exam.can_resume && exam.active_attempt?.id) {
    return {
      mode: "link" as const,
      href: `/app/attempts/${exam.active_attempt.id}`,
      label: "Resume Practice",
    };
  }
  if (exam.can_start) {
    return {
      mode: "start" as const,
      href: "",
      label: "Start Practice",
    };
  }
  if (exam.economy_access.is_locked && exam.economy_access.can_unlock_with_stars) {
    return {
      mode: "unlock" as const,
      href: "",
      label: `Unlock with ${exam.economy_access.star_cost} Stars`,
    };
  }
  return {
    mode: "link" as const,
    href: `/app/exams/${exam.id}`,
    label: "View Practice Detail",
  };
}

async function startPracticeAction(formData: FormData) {
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
        : "Unable to start this practice set right now.";
    redirect(`/app/weak-areas?error=${message}`);
  }
}

async function unlockPracticeAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const contentType = String(formData.get("content_type") ?? "");
  const contentKey = String(formData.get("content_key") ?? "");
  const subject = String(formData.get("subject_id") ?? "").trim();

  if (!examId || !contentType || !contentKey) {
    redirect("/app/weak-areas?error=Unable%20to%20resolve%20the%20selected%20practice%20set.");
  }

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
    redirect(`/app/weak-areas?error=${message}`);
  }
}

export default async function WeakAreasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const selectedSource = resolveSelectedStudentSource(
    cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSubjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "Overall";

  const { source, summary, topicPerformance, exams } = await loadWeakAreas();
  const { teacherOptions } = getStudentSourceOptions([
    ...exams,
    ...(summary?.source_breakdown ?? []),
    ...(summary?.recent_exams ?? []),
  ]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ?? null,
  );
  const scopedSummary = summary
    ? filterStudentSummaryBySubject(
        filterStudentSummaryBySource(summary, selectedSource, selectedTeacherId),
        selectedSubject,
      )
    : null;
  const scopedTopicPerformance = topicPerformance.filter((topic) =>
    selectedSubject === ALL_SUBJECTS_CONTEXT ? true : topic.subject_name === selectedSubject,
  );
  const weakTopics = [...scopedTopicPerformance]
    .sort((a, b) => {
      if (Number(a.percentage) !== Number(b.percentage)) {
        return Number(a.percentage) - Number(b.percentage);
      }

      return b.skipped_questions - a.skipped_questions;
    })
    .slice(0, 8);
  const topWeakTopic = weakTopics[0] ?? null;
  const scopedPracticeExams = filterStudentExamsBySubject(
    filterStudentRecordsBySource(
      exams.filter((exam) => exam.exam_type === "practice"),
      selectedSource,
      selectedTeacherId,
    ),
    selectedSubject,
  );
  const recommendedPracticeExam =
    (topWeakTopic
      ? scopedPracticeExams.find((exam) => exam.subject_name === topWeakTopic.subject_name)
      : null) ??
    scopedPracticeExams.find((exam) => !exam.economy_access.is_locked) ??
    scopedPracticeExams[0] ??
    null;
  const recommendedPracticeActionState = recommendedPracticeExam
    ? recommendedPracticeAction(recommendedPracticeExam)
    : null;
  const criticalTopics = weakTopics.filter((topic) => Number(topic.percentage) < 35).length;
  const topWeakQuestionType = scopedSummary?.weak_question_types[0] ?? null;
  const biggestCause = weakTopics.reduce(
    (state, topic) => ({
      skipped: state.skipped + Math.max(topic.skipped_questions, 0),
      incorrect: state.incorrect + Math.max(topic.incorrect_answers, 0),
    }),
    { skipped: 0, incorrect: 0 },
  );
  const biggestCauseLabel =
    biggestCause.skipped > biggestCause.incorrect ? "Skipping" : "Accuracy";
  const biggestCauseNote =
    biggestCause.skipped > biggestCause.incorrect
      ? `${biggestCause.skipped} skipped across the weakest topics`
      : `${biggestCause.incorrect} incorrect across the weakest topics`;
  const topWeakTopicComposition = topWeakTopic ? scoreComposition(topWeakTopic) : null;
  const behaviorSignal =
    biggestCause.skipped > biggestCause.incorrect
      ? "You are skipping too many first-pass questions in your weakest topics."
      : "Wrong answers are accumulating faster than skips in your weakest topics.";
  const riskSignal = topWeakQuestionType
    ? `${questionTypeLabel(topWeakQuestionType.question_type)} is your riskiest format right now.`
    : "Question-type risk will appear once enough evidence is available.";
  const actionSignal = topWeakTopic
    ? `Start with ${topWeakTopic.topic_name} in ${topWeakTopic.subject_name} before taking another mock.`
    : "Build more completed attempts so the workspace can rank topic recovery priorities.";
  const analyticsFilters = {
    subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
    source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
    teacher: selectedTeacherId,
  };

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerWeakAreasPage">
      <StudentPageHeader
        title={
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "Weak Areas"
            : `${selectedSubjectLabel} Weak Areas`
        }
        contextLabel={
          [
            selectedSource === ALL_SOURCES_CONTEXT
              ? null
              : `Source view · ${selectedStudentSourceLabel(selectedSource)}`,
            selectedSubject === ALL_SUBJECTS_CONTEXT
              ? null
              : `Subject view · ${selectedSubjectLabel}`,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        description={
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "A live improvement workspace ranking weak topics and guiding the next best practice action from backend analytics."
            : `A live improvement workspace focused on ${selectedSubjectLabel}, ranking only matching backend subject records.`
        }
        statusLabel={
          source === "live"
            ? `${weakTopics.length} weak topics ranked`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load weak areas"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {error ? (
        <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p>
      ) : null}

      {!scopedSummary ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for weak-area analytics"
              : "Weak-area analytics could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This page only renders real student topic-performance data. Configure the API base URL and sign in with an active student account to identify weak topics from backend results."
              : "The weak-area workspace depends on live insight and topic-performance endpoints, and the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Student insight summary endpoint", "Topic performance endpoint"]
              : ["Backend connectivity", "Weak-area analytics endpoints"]
          }
          ctaHref="/app/analytics"
          ctaLabel="Open Analytics"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      ) : weakTopics.length === 0 ? (
        <StudentStatePanel
          eyebrow="No weak topics yet"
          title="Your topic analytics are not available right now"
          description="No topic-level performance records were returned. Once completed exams have generated student topic performance, weak areas will be ranked here automatically."
          ctaHref="/app/exams"
          ctaLabel="Start an Exam"
          statusLabel="Waiting for topic performance data"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardWarm">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag studentDashboardTagWarm">
                Improvement Priority
              </span>
              <strong>{topWeakTopic?.topic_name ?? "Build more attempt history"}</strong>
              <small>
                {recoveryHeadline(
                  scopedSummary.improvement_trend.direction,
                  scopedSummary.improvement_trend.change_percentage,
                )}
              </small>
            </div>
            <div className="studentInsightHeroActions">
              {recommendedPracticeExam && recommendedPracticeActionState ? (
                recommendedPracticeActionState.mode === "start" ? (
                  <form action={startPracticeAction}>
                    <input name="exam_id" type="hidden" value={recommendedPracticeExam.id} />
                    <ActionSubmitButton
                      className="button buttonPrimary"
                      idleLabel={recommendedPracticeActionState.label}
                      pendingLabel="Starting..."
                    />
                  </form>
                ) : recommendedPracticeActionState.mode === "unlock" ? (
                  <form action={unlockPracticeAction}>
                    <input name="exam_id" type="hidden" value={recommendedPracticeExam.id} />
                    <input
                      name="content_type"
                      type="hidden"
                      value={recommendedPracticeExam.economy_access.content_type}
                    />
                    <input
                      name="content_key"
                      type="hidden"
                      value={recommendedPracticeExam.economy_access.content_key}
                    />
                    <input
                      name="subject_id"
                      type="hidden"
                      value={recommendedPracticeExam.economy_access.subject_id ?? ""}
                    />
                    <ActionSubmitButton
                      className="button buttonPrimary"
                      idleLabel={recommendedPracticeActionState.label}
                      pendingLabel="Unlocking..."
                    />
                  </form>
                ) : (
                  <Link className="button buttonPrimary" href={recommendedPracticeActionState.href}>
                    {recommendedPracticeActionState.label}
                  </Link>
                )
              ) : (
                <Link
                  className="button buttonPrimary"
                  href={
                    topWeakTopic
                      ? `/app/practice?subject=${encodeURIComponent(
                          topWeakTopic.subject_name,
                        )}&topic=${encodeURIComponent(topWeakTopic.topic_name ?? "")}`
                      : "/app/practice"
                  }
                >
                  Open Practice
                </Link>
              )}
              <Link className="button buttonSecondary" href="/app/exams">
                Choose Mock Test
              </Link>
              {recommendedPracticeActionState?.mode === "unlock" ? (
                <Link className="button buttonGhost" href="/app/wallet">
                  Open Wallet
                </Link>
              ) : null}
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Critical Topics",
                value: criticalTopics,
                note: criticalTopics
                  ? `${criticalTopics} need immediate recovery attention`
                  : `${weakTopics.length} tracked with no critical score band`,
                tone: "primary",
              },
              {
                label: "Most Repeated Weakness",
                value: topWeakTopic?.topic_name ?? "Pending",
                note: topWeakTopic
                  ? `${topWeakTopic.attempted_questions} question signals in ${topWeakTopic.subject_name}`
                  : "No topic flagged yet",
              },
              {
                label: "Biggest Cause",
                value: biggestCauseLabel,
                note: biggestCauseNote,
              },
              {
                label: "Highest-Risk Format",
                value: topWeakQuestionType
                  ? questionTypeLabel(topWeakQuestionType.question_type)
                  : "Pending",
                note: topWeakQuestionType
                  ? `${percentageLabel(topWeakQuestionType.wrong_percentage)} wrong rate`
                  : "No question-type breakdown available",
              },
            ]}
          />

          <section className="studentWeakAreasLayout">
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Ranked Weak Topics</strong>
                <span>Priority ladder</span>
              </div>

              <div className="studentWeakAreaStack">
                {weakTopics.map((topic, index) => {
                  const score = Number(topic.percentage);
                  const composition = scoreComposition(topic);
                  const causeTags = topicCauseTags(topic);
                  const signal = weakTopicSignal(topic);
                  const isPriority = index < 3;
                  return (
                    <div
                      className={`studentWeakAreaRow ${isPriority ? "studentWeakAreaRowPriority" : ""}`}
                      key={topic.id}
                    >
                      <div className="studentWeakAreaRankColumn">
                        <span
                          className={`studentWeakAreaRankBadge ${
                            index === 0
                              ? "studentWeakAreaRankBadgeTop"
                              : index === 1
                                ? "studentWeakAreaRankBadgeHigh"
                                : index === 2
                                  ? "studentWeakAreaRankBadgeWarm"
                                  : ""
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <span className="studentWeakAreaPriorityLabel">
                          {isPriority
                            ? index === 0
                              ? "Top priority"
                              : index === 1
                                ? "Next priority"
                                : "Keep close"
                            : "Tracked"}
                        </span>
                      </div>

                      <div className="studentWeakAreaTopic">
                        <div className="studentWeakAreaTitleLine">
                          <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                          <span className={`statusPill ${severityClass(score)}`}>
                            {severityLabel(score)}
                          </span>
                        </div>
                        <span>{topic.subject_name}</span>
                        <div className="studentWeakAreaTagRow">
                          <span className="studentWeakAreaEvidencePill">
                            {topicEvidenceLabel(topic.attempted_questions)}
                          </span>
                          {causeTags.map((tag) => (
                            <span className="studentWeakAreaCausePill" key={`${topic.id}-${tag}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p>
                          {topic.attempted_questions} attempted, {topic.skipped_questions} skipped,
                          {` ${topic.incorrect_answers}`} incorrect
                        </p>
                      </div>

                      <div className="studentWeakAreaMetrics">
                        <div className="studentWeakAreaSignalHeader">
                          <strong>{percentageLabel(topic.percentage)}</strong>
                          <span>{signal.direction}</span>
                        </div>
                        <div
                          className={`scoreBar scoreBar${scoreBarTone(score)} studentWeakAreaHoverHint`}
                          data-tooltip={`Current accuracy in ${topic.topic_name ?? "this topic"} is ${percentageLabel(topic.percentage)}.`}
                          style={{ ["--score-width" as string]: `${score}%` }}
                        />
                        <div
                          className="studentWeakAreaSparkline studentWeakAreaHoverHint"
                          data-tooltip={`Recent signal is ${signal.direction}. Use this sparkline to gauge whether the topic is stabilizing or slipping.`}
                        >
                          <svg
                            aria-hidden="true"
                            className="studentWeakAreaSparklineSvg"
                            viewBox="0 0 88 40"
                          >
                            <path
                              className="studentWeakAreaSparklineGrid"
                              d="M0 34 H88"
                            />
                            <polyline
                              className={`studentWeakAreaSparklinePath studentWeakAreaSparklinePath${scoreBarTone(score)}`}
                              fill="none"
                              points={signal.points}
                            />
                          </svg>
                        </div>
                        <div
                          className="studentWeakAreaComposition studentWeakAreaHoverHint"
                          aria-hidden="true"
                          data-tooltip={`Answer mix: ${composition.correct} correct, ${composition.incorrect} wrong, and ${composition.skipped} skipped.`}
                        >
                          <span
                            className="studentWeakAreaCompositionCorrect"
                            style={{ width: `${composition.correctWidth}%` }}
                          />
                          <span
                            className="studentWeakAreaCompositionIncorrect"
                            style={{ width: `${composition.incorrectWidth}%` }}
                          />
                          <span
                            className="studentWeakAreaCompositionSkipped"
                            style={{ width: `${composition.skippedWidth}%` }}
                          />
                        </div>
                        <div className="studentWeakAreaCompositionLabel" aria-label="Answer composition">
                          <span>
                            <strong>Correct</strong>
                            <small>{composition.correct}</small>
                          </span>
                          <span>
                            <strong>Wrong</strong>
                            <small>{composition.incorrect}</small>
                          </span>
                          <span>
                            <strong>Skipped</strong>
                            <small>{composition.skipped}</small>
                          </span>
                        </div>
                      </div>

                      <div className="studentWeakAreaActions">
                        <Link
                          className="button buttonSecondary"
                          href={`/app/practice?subject=${encodeURIComponent(
                            topic.subject_name,
                          )}&topic=${encodeURIComponent(topic.topic_name ?? "")}`}
                        >
                          Start Practice
                        </Link>
                        <Link
                          className="button buttonGhost"
                          href={buildAnalyticsTopicHref({
                            topicId: topic.id,
                            subject:
                              selectedSubject === ALL_SUBJECTS_CONTEXT ? topic.subject_name : selectedSubject,
                            label: topic.topic_name ?? "",
                            source: analyticsFilters.source,
                            teacher: analyticsFilters.teacher,
                          })}
                        >
                          View Why
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="studentWeakAreasRail">
              <article className="contentCard">
                <div className="sectionHeading">
                  <strong>Why You&apos;re Losing Marks</strong>
                  <span>Diagnostic signals</span>
                </div>
                <div className="studentWeakDiagnosticStack">
                  <div className="studentWeakDiagnosticCard">
                    <span>Behavior signal</span>
                    <strong>{biggestCauseLabel} is driving the drop</strong>
                    <p>{behaviorSignal}</p>
                  </div>
                  <div className="studentWeakDiagnosticCard">
                    <span>Format signal</span>
                    <strong>
                      {topWeakQuestionType
                        ? questionTypeLabel(topWeakQuestionType.question_type)
                        : "Waiting for format evidence"}
                    </strong>
                    <p>{riskSignal}</p>
                  </div>
                  <div className="studentWeakDiagnosticCard">
                    <span>Recovery signal</span>
                    <strong>{topWeakTopic ? topWeakTopic.topic_name : "Build more evidence"}</strong>
                    <p>{actionSignal}</p>
                  </div>
                </div>
                <div className="studentWeakDiagnosticActions">
                  {topWeakTopic ? (
                    <Link
                      className="button buttonSecondary"
                      href={buildAnalyticsTopicHref({
                        topicId: topWeakTopic.id,
                        subject:
                          selectedSubject === ALL_SUBJECTS_CONTEXT ? topWeakTopic.subject_name : selectedSubject,
                        label: topWeakTopic.topic_name ?? "",
                        source: analyticsFilters.source,
                        teacher: analyticsFilters.teacher,
                      })}
                    >
                      Open Topic Drilldown
                    </Link>
                  ) : null}
                  {topWeakQuestionType ? (
                    <Link
                      className="button buttonGhost"
                      href={buildAnalyticsQuestionTypeHref({
                        questionType: topWeakQuestionType.question_type,
                        subject: analyticsFilters.subject,
                        source: analyticsFilters.source,
                        teacher: analyticsFilters.teacher,
                      })}
                    >
                      Inspect Format Risk
                    </Link>
                  ) : null}
                </div>
                {topWeakTopic && topWeakTopicComposition ? (
                  <div className="studentWeakFocusEvidence">
                    <div className="sectionHeading sectionHeadingCompact">
                      <strong>Priority topic evidence</strong>
                      <span>{topicEvidenceLabel(topWeakTopic.attempted_questions)}</span>
                    </div>
                    <div className="studentWeakAreaComposition" aria-hidden="true">
                      <span
                        className="studentWeakAreaCompositionCorrect"
                        style={{ width: `${topWeakTopicComposition.correctWidth}%` }}
                      />
                      <span
                        className="studentWeakAreaCompositionIncorrect"
                        style={{ width: `${topWeakTopicComposition.incorrectWidth}%` }}
                      />
                      <span
                        className="studentWeakAreaCompositionSkipped"
                        style={{ width: `${topWeakTopicComposition.skippedWidth}%` }}
                      />
                    </div>
                    <p className="sectionDescription">
                      Correct {topWeakTopicComposition.correct} · Wrong {topWeakTopicComposition.incorrect} · Skipped {topWeakTopicComposition.skipped} in {topWeakTopic.topic_name}.
                    </p>
                  </div>
                ) : null}
              </article>

              <article className="contentCard">
                <div className="sectionHeading">
                  <strong>Recommended Focus</strong>
                  <span>{scopedSummary.insight_messages.length} signals</span>
                </div>
                <div className="studentInsightMessageStack">
                  {scopedSummary.insight_messages.length ? (
                    scopedSummary.insight_messages
                      .filter((message) => {
                        const normalized = message.toLowerCase();
                        return !(
                          normalized.includes("perform strongly") &&
                          topWeakTopic?.subject_name &&
                          normalized.includes(topWeakTopic.subject_name.toLowerCase())
                        );
                      })
                      .map((message) => (
                      <div className="studentInsightMessage" key={message}>
                        <span className="placeholderDot" aria-hidden="true" />
                        <p>{message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="emptyText">No automated focus signals are available yet.</p>
                  )}
                </div>
                <div className="studentInsightHeroActions">
                  <Link className="button buttonSecondary" href="/app/exams">
                    Take Another Mock Test
                  </Link>
                  <Link className="button buttonGhost" href="/app/results">
                    Check Result Status
                  </Link>
                </div>
                <p className="sectionDescription">
                  If the recommended practice set is premium, the action above will show whether you can
                  start immediately or need to unlock it first with stars.
                </p>
              </article>

              <article className="contentCard">
                <div className="sectionHeading">
                  <strong>Latest Visible Results</strong>
                  <span>Recent exam evidence</span>
                </div>
                <div className="studentTopicStack">
                  {scopedSummary.recent_exams.length ? (
                    scopedSummary.recent_exams.slice(0, 3).map((exam) => (
                      <div className="studentTopicRow" key={exam.exam_id}>
                        <div>
                          <strong>{exam.exam_title}</strong>
                          <span>
                            {exam.exam_code} ·{" "}
                            {exam.published_at
                              ? studentDateTimeLabel(exam.published_at)
                              : "Awaiting publish"}
                          </span>
                        </div>
                        <div className="studentTopicRowMeta">
                          <strong>{percentageLabel(exam.percentage)}</strong>
                          <span>{exam.result_status}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="emptyText">Recent result records will appear here once visible to the student.</p>
                  )}
                </div>
                <div className="studentWeakDiagnosticActions">
                  <Link
                    className="button buttonGhost"
                    href={buildAnalyticsResultsCompareHref(analyticsFilters)}
                  >
                    Compare Recent Results
                  </Link>
                </div>
              </article>

              <article className="contentCard">
                <div className="sectionHeading">
                  <strong>Question-Type Risk</strong>
                  <span>Format pressure map</span>
                </div>
                <div className="studentTopicStack">
                  {scopedSummary.weak_question_types.length ? (
                    scopedSummary.weak_question_types.map((item) => (
                      <div className="studentTopicRow studentWeakRiskRow" key={item.question_type}>
                        <div>
                          <strong>{questionTypeLabel(item.question_type)}</strong>
                          <span>{item.total} total responses</span>
                          <div className="studentWeakRiskBar" aria-hidden="true">
                            <span
                              className="studentWeakRiskWrong"
                              style={{ width: `${Math.min(Number(item.wrong_percentage), 100)}%` }}
                            />
                            <span
                              className="studentWeakRiskSkip"
                              style={{ width: `${Math.min(Number(item.skip_percentage), 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="studentTopicRowMeta">
                          <strong>{percentageLabel(item.wrong_percentage)}</strong>
                          <span>{percentageLabel(item.skip_percentage)} skipped</span>
                        </div>
                        <div className="studentWeakAreaActions studentWeakAreaActionsCompact">
                          <Link
                            className="button buttonGhost"
                            href={buildAnalyticsQuestionTypeHref({
                              questionType: item.question_type,
                              subject: analyticsFilters.subject,
                              source: analyticsFilters.source,
                              teacher: analyticsFilters.teacher,
                            })}
                          >
                            View Format
                          </Link>
                          <Link
                            className="button buttonGhost"
                            href={buildQuestionAnalyticsHref({
                              subject: analyticsFilters.subject,
                              questionType: item.question_type,
                              source: analyticsFilters.source,
                              teacher: analyticsFilters.teacher,
                            })}
                          >
                            Question Evidence
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="emptyText">Question-type risk will appear after enough completed attempts.</p>
                  )}
                </div>
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
