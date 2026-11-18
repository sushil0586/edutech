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
import { StudentTopicMasteryReport, type StudentTopicMasteryRow } from "@/components/ui/student-topic-mastery-report";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsResultsCompareHref,
  buildAnalyticsTopicHref,
  buildQuestionAnalyticsHref,
} from "@/lib/student/analytics";
import { resolvePracticeFocusRecommendation } from "@/lib/student/practice";
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

function masteryLabel(score: number) {
  if (score < 40) return "Weak";
  if (score < 70) return "Developing";
  return "Strong";
}

function masteryToneClass(score: number) {
  if (score < 40) return "statusDanger";
  if (score < 70) return "statusWarning";
  return "statusLive";
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
      fetchStudentAvailableExams({ examType: "practice" }),
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
  const practiceFocus = resolvePracticeFocusRecommendation({
    exams: scopedPracticeExams,
    subjectName: topWeakTopic?.subject_name ?? null,
    topicName: topWeakTopic?.topic_name ?? null,
  });
  const practiceLocked = Boolean(practiceFocus.exam) && practiceFocus.action.mode === "unlock";
  const weakAreaActionSequence = practiceLocked
    ? [
        {
          label: "Do this first",
          detail: "Inspect the top weak topic and confirm the recovery target before spending stars.",
        },
        {
          label: "Then next",
          detail: "Unlock the matching focused practice set only if it covers the same weak concept cluster.",
        },
        {
          label: "If blocked",
          detail: "Use analytics drill-down and question evidence first, then return to practice.",
        },
      ]
    : [
        {
          label: "Do this first",
          detail: "Inspect the top weak topic and start the matching focused practice pass.",
        },
        {
          label: "Then next",
          detail: "Reopen analytics or results after that practice run to see whether the pattern improved.",
        },
        {
          label: "If blocked",
          detail: "If one pass is not enough, review the question evidence before another full mock.",
        },
      ];
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
  const topicMasteryRows: StudentTopicMasteryRow[] = weakTopics.map((topic) => {
    const score = Number(topic.percentage);
    const causes = topicCauseTags(topic);
    return {
      id: topic.id,
      topicName: topic.topic_name ?? "Untagged topic",
      subjectName: topic.subject_name,
      masteryLabel: masteryLabel(score),
      masteryToneClass: masteryToneClass(score),
      percentageLabel: percentageLabel(topic.percentage),
      attemptedLabel: String(topic.attempted_questions),
      skippedLabel: String(topic.skipped_questions),
      trendLabel: weakTopicSignal(topic).direction,
      evidenceLabel: topicEvidenceLabel(topic.attempted_questions),
      causes,
      overview: `${topic.attempted_questions} attempted, ${topic.incorrect_answers} incorrect, and ${topic.skipped_questions} skipped across this topic.`,
      practiceHref: `/app/practice?subject=${encodeURIComponent(
        topic.subject_name,
      )}&topic=${encodeURIComponent(topic.topic_name ?? "")}`,
      topicDrilldownHref: buildAnalyticsTopicHref({
        topicId: topic.id,
        subject:
          selectedSubject === ALL_SUBJECTS_CONTEXT ? topic.subject_name : selectedSubject,
        label: topic.topic_name ?? "",
        source: analyticsFilters.source,
        teacher: analyticsFilters.teacher,
      }),
      questionEvidenceHref: buildQuestionAnalyticsHref({
        subject:
          selectedSubject === ALL_SUBJECTS_CONTEXT ? topic.subject_name : selectedSubject,
        topic: topic.id,
        source: analyticsFilters.source,
        teacher: analyticsFilters.teacher,
      }),
      stats: {
        correct: Math.max(
          topic.attempted_questions - topic.skipped_questions - topic.incorrect_answers,
          0,
        ),
        incorrect: topic.incorrect_answers,
        skipped: topic.skipped_questions,
        attempted: topic.attempted_questions,
      },
    };
  });

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
            ? "Rank your weakest topics and move into the next best recovery practice."
            : `Rank the weakest ${selectedSubjectLabel} topics and move into targeted recovery practice.`
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
              ? "Sign in with your student account to identify weak topics from backend results."
              : "We couldn't load weak-area analytics right now. Please try again shortly."
          }
          bullets={
            source === "unconfigured"
              ? ["Student sign-in", "Topic performance"]
              : ["Connection check", "Weak-area analytics"]
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
          description="No topic-level performance records are available yet. Weak areas will be ranked here automatically once more scored data exists."
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
              <p className="sectionDescription">{practiceFocus.helper}</p>
            </div>
            <div className="studentInsightHeroActions">
              {practiceFocus.exam ? (
                practiceFocus.action.mode === "start" ? (
                  <form action={startPracticeAction}>
                    <input name="exam_id" type="hidden" value={practiceFocus.exam.id} />
                    <ActionSubmitButton
                      className="button buttonPrimary"
                      idleLabel={practiceFocus.action.label}
                      pendingLabel="Starting..."
                    />
                  </form>
                ) : practiceFocus.action.mode === "unlock" ? (
                  <form action={unlockPracticeAction}>
                    <input name="exam_id" type="hidden" value={practiceFocus.exam.id} />
                    <input
                      name="content_type"
                      type="hidden"
                      value={practiceFocus.exam.economy_access.content_type}
                    />
                    <input
                      name="content_key"
                      type="hidden"
                      value={practiceFocus.exam.economy_access.content_key}
                    />
                    <input
                      name="subject_id"
                      type="hidden"
                      value={practiceFocus.exam.economy_access.subject_id ?? ""}
                    />
                    <ActionSubmitButton
                      className="button buttonPrimary"
                      idleLabel={practiceFocus.action.label}
                      pendingLabel="Unlocking..."
                    />
                  </form>
                ) : (
                  <Link className="button buttonPrimary" href={practiceFocus.action.href}>
                    {practiceFocus.action.label}
                  </Link>
                )
              ) : (
                <Link className="button buttonPrimary" href={practiceFocus.focusHref}>
                  {practiceFocus.focusLabel}
                </Link>
              )}
              <Link className="button buttonSecondary" href="/app/exams">
                Choose Mock Test
              </Link>
              {practiceFocus.action.mode === "unlock" ? (
                <Link className="button buttonGhost" href="/app/wallet">
                  Open Wallet
                </Link>
              ) : null}
            </div>
          </section>

          <section className="studentInsightsTwoColumn">
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Recovery Lane</strong>
                <span>{practiceFocus.focusLabel}</span>
              </div>
              <div className="studentInsightMessageStack">
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>{practiceFocus.helper}</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    Fix the weakest concept first before returning to a full mock.
                  </p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    Inspect the topic, complete the focused practice, then recheck analytics or results.
                  </p>
                </div>
              </div>
              <div className="studentActionSequence" aria-label="Weak area recovery order">
                {weakAreaActionSequence.map((step) => (
                  <div className="studentActionSequenceCard" key={step.label}>
                    <span>{step.label}</span>
                    <strong>{step.detail}</strong>
                  </div>
                ))}
              </div>
              <div className="studentInsightHeroActions">
                <Link className="button buttonSecondary" href={practiceFocus.focusHref}>
                  Open Focused Practice Workspace
                </Link>
                <Link className="button buttonGhost" href="/app/analytics">
                  Open Analytics
                </Link>
              </div>
            </article>
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Why This Next</strong>
                <span>Current recovery logic</span>
              </div>
              <div className="studentInsightMessageStack">
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>The recommendation starts with the lowest-scoring topic in this view.</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>The practice action stays state-aware: resume, start, unlock, or open details.</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>If the topic is still unclear after one pass, inspect the evidence before another mock.</p>
                </div>
              </div>
              <div className="studentInsightHeroActions">
                {topWeakTopic ? (
                  <Link
                    className="button buttonSecondary"
                    href={buildQuestionAnalyticsHref({
                      subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? topWeakTopic.subject_name : selectedSubject,
                      topic: topWeakTopic.id,
                      source: analyticsFilters.source,
                      teacher: analyticsFilters.teacher,
                    })}
                  >
                    Open Question Evidence
                  </Link>
                ) : null}
                <Link
                  className="button buttonGhost"
                  href={buildAnalyticsResultsCompareHref(analyticsFilters)}
                >
                  Compare Results First
                </Link>
                <Link className="studentDashboardTextLink" href="/app/analytics">
                  Open Analytics
                </Link>
              </div>
            </article>
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
            <StudentTopicMasteryReport rows={topicMasteryRows} />

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
                  <Link className="button buttonPrimary" href={practiceFocus.focusHref}>
                    Open Practice
                  </Link>
                  <Link className="button buttonSecondary" href="/app/exams">
                    Take Another Mock Test
                  </Link>
                  <Link className="button buttonGhost" href="/app/results">
                    Open Results
                  </Link>
                </div>
                <p className="sectionDescription">
                  Premium practice will show whether it is ready now or needs stars to unlock.
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
