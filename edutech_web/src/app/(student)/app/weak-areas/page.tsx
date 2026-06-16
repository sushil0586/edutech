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

  return (
    <div className="studentPage studentDashboardModern">
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
              <p>
                {topWeakTopic
                  ? `Start with ${topWeakTopic.topic_name ?? "your weakest area"} in ${topWeakTopic.subject_name}. This is currently the highest-priority tracked gap.`
                  : "Weak-area guidance becomes stronger as more completed attempts are available."}
              </p>
              <small>
                Trend: {trendDirectionLabel(scopedSummary.improvement_trend.direction)} ·{" "}
                {signedPercentageLabel(scopedSummary.improvement_trend.change_percentage)}
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
                label: "Weak Topics Tracked",
                value: weakTopics.length,
                note: "Ranked from lowest score to highest immediate concern",
                tone: "primary",
              },
              {
                label: "Most Critical Area",
                value: topWeakTopic?.topic_name ?? "Pending",
                note: topWeakTopic
                  ? `${percentageLabel(topWeakTopic.percentage)} in ${topWeakTopic.subject_name}`
                  : "No topic flagged yet",
              },
              {
                label: "Trend Signal",
                value: trendDirectionLabel(scopedSummary.improvement_trend.direction),
                note: `${signedPercentageLabel(scopedSummary.improvement_trend.change_percentage)} across recent exams`,
              },
              {
                label: "Top Question-Type Risk",
                value: scopedSummary.weak_question_types[0]
                  ? questionTypeLabel(scopedSummary.weak_question_types[0].question_type)
                  : "Pending",
                note: scopedSummary.weak_question_types[0]
                  ? `${percentageLabel(scopedSummary.weak_question_types[0].wrong_percentage)} wrong rate`
                  : "No question-type breakdown available",
              },
            ]}
          />

          <section className="studentWeakAreasLayout">
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Ranked Weak Topics</strong>
                <Link href="/app/analytics">Back to analytics</Link>
              </div>

              <div className="studentWeakAreaStack">
                {weakTopics.map((topic) => {
                  const score = Number(topic.percentage);
                  return (
                    <div className="studentWeakAreaRow" key={topic.id}>
                      <div className="studentWeakAreaTopic">
                        <div className="studentWeakAreaTitleLine">
                          <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                          <span className={`statusPill ${severityClass(score)}`}>
                            {severityLabel(score)}
                          </span>
                        </div>
                        <span>{topic.subject_name}</span>
                        <p>
                          {topic.attempted_questions} attempted, {topic.skipped_questions} skipped,
                          {` ${topic.incorrect_answers}`} incorrect
                        </p>
                      </div>

                      <div className="studentWeakAreaMetrics">
                        <strong>{percentageLabel(topic.percentage)}</strong>
                        <div
                          className={`scoreBar scoreBar${scoreBarTone(score)}`}
                          style={{ ["--score-width" as string]: `${score}%` }}
                        />
                      </div>

                      <Link
                        className="button buttonSecondary"
                        href={`/app/practice?subject=${encodeURIComponent(
                          topic.subject_name,
                        )}&topic=${encodeURIComponent(topic.topic_name ?? "")}`}
                      >
                        Start Practice
                      </Link>
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="studentWeakAreasRail">
              <article className="contentCard">
                <div className="sectionHeading">
                  <strong>Recommended Focus</strong>
                  <span>{scopedSummary.insight_messages.length} signals</span>
                </div>
                <div className="studentInsightMessageStack">
                  {scopedSummary.insight_messages.length ? (
                    scopedSummary.insight_messages.map((message) => (
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
                  <span>{scopedSummary.recent_exams.length} loaded</span>
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
              </article>

              <article className="contentCard">
                <div className="sectionHeading">
                  <strong>Question-Type Risk</strong>
                  <span>{scopedSummary.weak_question_types.length} tracked</span>
                </div>
                <div className="studentTopicStack">
                  {scopedSummary.weak_question_types.length ? (
                    scopedSummary.weak_question_types.map((item) => (
                      <div className="studentTopicRow" key={item.question_type}>
                        <div>
                          <strong>{questionTypeLabel(item.question_type)}</strong>
                          <span>{item.total} total responses</span>
                        </div>
                        <div className="studentTopicRowMeta">
                          <strong>{percentageLabel(item.wrong_percentage)}</strong>
                          <span>{percentageLabel(item.skip_percentage)} skipped</span>
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
