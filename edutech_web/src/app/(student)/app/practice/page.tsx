import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  fetchStudentAttempts,
  fetchStudentAvailableExams,
  fetchStudentInsightSummary,
  getStudentApiState,
  spendStarsForContent,
  startStudentAttempt,
} from "@/lib/api/student";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import {
  percentageLabel,
  signedPercentageLabel,
  studentDateTimeLabel,
  titleCaseState,
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
import type {
  StudentAttemptListItem,
  StudentAvailableExam,
} from "@/features/dashboard/types";

function isPracticeAttemptInProgress(status: string | null | undefined) {
  return status === "in_progress";
}

function hasPracticeAttemptsRemaining(exam: StudentAvailableExam) {
  return (
    exam.attempt_policy === "unlimited_practice" || exam.remaining_attempts > 0
  );
}

function latestAttemptForExam(
  attempts: StudentAttemptListItem[],
  examId: string,
) {
  return (
    attempts
      .filter((attempt) => attempt.exam === examId)
      .sort(
        (left, right) =>
          new Date(right.started_at || right.created_at).getTime() -
          new Date(left.started_at || left.created_at).getTime(),
      )[0] ?? null
  );
}

function resolvePracticeUiState(
  exam: StudentAvailableExam,
  latestAttemptId: string | null,
) {
  const activeAttemptId = isPracticeAttemptInProgress(exam.active_attempt?.status)
    ? exam.active_attempt?.id ?? null
    : null;
  const canResume = Boolean(activeAttemptId) && exam.can_resume;
  const canStart =
    exam.can_start &&
    hasPracticeAttemptsRemaining(exam) &&
    !canResume;
  const hasAttemptHistory = Boolean(latestAttemptId);

  return {
    activeAttemptId,
    canResume,
    canStart,
    hasAttemptHistory,
  };
}

function practiceActionLabel(args: {
  canResume: boolean;
  canStart: boolean;
  hasAttemptHistory: boolean;
  reviewAvailable: boolean;
}) {
  if (args.canResume) return "Resume Practice";
  if (args.canStart) return "Start Practice";
  if (args.reviewAvailable && args.hasAttemptHistory) return "Review Practice";
  if (args.hasAttemptHistory) return "Open Summary";
  return "View Details";
}

function practiceActionHref(args: {
  examId: string;
  canResume: boolean;
  activeAttemptId: string | null;
  latestAttemptId: string | null;
  reviewAvailable: boolean;
}) {
  if (args.canResume && args.activeAttemptId) {
    return `/app/attempts/${args.activeAttemptId}`;
  }
  if (args.reviewAvailable && args.latestAttemptId) {
    return `/app/attempts/${args.latestAttemptId}/review`;
  }
  if (args.latestAttemptId) {
    return `/app/attempts/${args.latestAttemptId}/summary`;
  }
  return `/app/exams/${args.examId}`;
}

function practiceStateTone(state: string) {
  if (state === "locked") return "warning" as const;
  if (state === "available_now") return "live" as const;
  if (state === "upcoming") return "warning" as const;
  if (state === "completed") return "demo" as const;
  if (state === "missed") return "danger" as const;
  return "default" as const;
}

function practiceGuidance(exam: {
  can_resume: boolean;
  can_start: boolean;
  review_available: boolean;
  availability_state: string;
  remaining_attempts: number;
  attempt_policy: string;
  economy_access: {
    is_locked: boolean;
    can_unlock_with_stars: boolean;
    star_cost: number;
    lock_reason_message: string;
  };
}) {
  if (exam.can_resume) {
    return "A live practice attempt is already in progress. Jump back in and continue learning from the same session.";
  }
  if (exam.economy_access.is_locked && exam.economy_access.can_unlock_with_stars) {
    return `${exam.economy_access.star_cost} stars are required before this practice set can be started. Unlock it once, then keep using it according to its practice policy.`;
  }
  if (exam.economy_access.is_locked) {
    return (
      exam.economy_access.lock_reason_message ||
      "This practice set is currently locked by access policy."
    );
  }
  if (exam.can_start) {
    return exam.attempt_policy === "unlimited_practice"
      ? "This practice set is ready now and supports repeat work. Start it whenever you want another focused run."
      : "This practice set is ready now. Start it to get quick feedback and a fresh readiness signal.";
  }
  if (exam.review_available) {
    return "Your latest practice run is complete and feedback is ready for review.";
  }
  if (exam.remaining_attempts === 0) {
    return "All configured attempts for this practice set have been used.";
  }
  if (exam.availability_state === "upcoming") {
    return "This practice set exists, but its start window has not opened yet.";
  }
  return "Open the detail page to review rules, availability, and your next valid practice action.";
}

async function unlockPracticeAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const contentType = String(formData.get("content_type") ?? "");
  const contentKey = String(formData.get("content_key") ?? "");
  const subject = String(formData.get("subject_id") ?? "").trim();

  if (!examId || !contentType || !contentKey) {
    redirect("/app/practice?error=Unable%20to%20resolve%20the%20selected%20practice%20set.");
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
    if (isRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to unlock this practice set right now.";
    redirect(`/app/practice?error=${message}`);
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
    if (isRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to start this practice set right now.";
    redirect(`/app/practice?error=${message}`);
  }
}

async function loadPracticeWorkspace() {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      exams: [],
      attempts: [],
      summary: null,
    };
  }

  try {
    const [summary, exams, attempts] = await Promise.all([
      fetchStudentInsightSummary(),
      fetchStudentAvailableExams(),
      fetchStudentAttempts(),
    ]);

    return {
      source: "live" as const,
      exams,
      attempts,
      summary,
    };
  } catch {
    return {
      source: "error" as const,
      exams: [],
      attempts: [],
      summary: null,
    };
  }
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; subject?: string; topic?: string }>;
}) {
  const { error, subject, topic } = await searchParams;
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
  const focusSubject = subject
    ? decodeURIComponent(subject)
    : selectedSubject === ALL_SUBJECTS_CONTEXT
      ? ""
      : selectedSubject;
  const focusTopic = topic ? decodeURIComponent(topic) : "";
  const { source, exams, attempts, summary } = await loadPracticeWorkspace();
  const { teacherOptions } = getStudentSourceOptions([
    ...exams,
    ...attempts,
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

  const practiceExams = filterStudentExamsBySubject(
    filterStudentRecordsBySource(
      exams.filter((exam) => exam.exam_type === "practice"),
      selectedSource,
      selectedTeacherId,
    ),
    selectedSubject,
  ).sort((left, right) => {
    const leftPriority = left.subject_name === focusSubject ? 0 : 1;
    const rightPriority = right.subject_name === focusSubject ? 0 : 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    if (left.can_resume !== right.can_resume) return left.can_resume ? -1 : 1;
    if (left.can_start !== right.can_start) return left.can_start ? -1 : 1;
    return left.title.localeCompare(right.title);
  });

  const featuredPractice = practiceExams[0] ?? null;
  const additionalPracticeExams = featuredPractice
    ? practiceExams.filter((exam) => exam.id !== featuredPractice.id)
    : practiceExams;
  const focusedWeakTopic = scopedSummary?.weak_topics.find(
    (weakTopic) =>
      weakTopic.topic_name === focusTopic && weakTopic.subject_name === focusSubject,
  );
  const focusedTopicLabel = focusedWeakTopic?.topic_name ?? focusTopic ?? "General revision";
  const latestFocusedAttemptId = featuredPractice
    ? latestAttemptForExam(attempts, featuredPractice.id)?.id ?? null
    : null;
  const featuredPracticeState = featuredPractice
    ? resolvePracticeUiState(featuredPractice, latestFocusedAttemptId)
    : null;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        title={
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "Practice"
            : `${selectedSubjectLabel} Practice`
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
        description={`A dedicated student practice workspace${
          selectedSubject === ALL_SUBJECTS_CONTEXT ? "" : ` for ${selectedSubjectLabel}`
        }. Repeat improvement, focused revision, and faster feedback loops stay centered on the selected subject mode.`}
        statusLabel={
          source === "live"
            ? `${practiceExams.length} practice sets ready`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load practice"
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

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for live practice data"
              : "Practice workspace could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This page only renders real practice sets from the backend. Configure the API base URL and sign in with an active student account to continue."
              : "The practice workspace depends on live exam availability and student insight data, and the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Student availability endpoint", "Student insight summary endpoint"]
              : ["Backend connectivity", "Practice availability data"]
          }
          ctaHref="/app/exams"
          ctaLabel="Open Exams"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      ) : practiceExams.length === 0 ? (
        <StudentStatePanel
          eyebrow="No practice sets yet"
          title="Your practice workspace is empty right now"
          description="No exam records with practice mode were returned for this student. Add or publish practice-type exams to activate repeat practice flows."
          ctaHref="/app/weak-areas"
          ctaLabel="Open Weak Areas"
          statusLabel="Waiting for practice content"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardWarm">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag studentDashboardTagWarm">
                Practice Focus
              </span>
              <strong>
                {focusedWeakTopic
                  ? `Practice ${focusedWeakTopic.topic_name} next`
                  : featuredPractice?.title ?? "Start your next practice set"}
              </strong>
              <p>
                {focusedWeakTopic
                  ? `This topic is currently underperforming. Use a short practice run in ${focusedWeakTopic.subject_name} to improve before your next scored exam.`
                  : "Practice sessions are meant for repeat improvement. They give students a lower-friction path back into the platform between formal mock tests."}
              </p>
              <small>
                {focusedWeakTopic
                  ? `${percentageLabel(focusedWeakTopic.average_percentage)} in ${focusedWeakTopic.subject_name}`
                  : "Live practice catalog connected to student availability"}
              </small>
            </div>
            <div className="studentInsightHeroActions">
              {featuredPractice ? (
                <Link
                  className="button buttonPrimary"
                  href="#recommended-practice"
                >
                  View Recommended Practice
                </Link>
              ) : null}
              <Link className="button buttonSecondary" href="/app/weak-areas">
                Back to Weak Areas
              </Link>
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Practice Sets",
                value: practiceExams.length,
                note: "Repeatable sets available for self-improvement",
                tone: "primary",
              },
              {
                label: "Focused Topic",
                value: focusedTopicLabel || "General revision",
                note: focusedWeakTopic
                  ? `${percentageLabel(focusedWeakTopic.average_percentage)} in ${focusedWeakTopic.subject_name}`
                  : focusSubject || "Use weak-topic signals to choose what to revise next",
              },
              {
                label: "Trend Signal",
                value: scopedSummary
                  ? trendDirectionLabel(scopedSummary.improvement_trend.direction)
                  : "Pending",
                note: scopedSummary
                  ? `${signedPercentageLabel(scopedSummary.improvement_trend.change_percentage)} across recent scored attempts`
                  : "Insight summary unavailable",
              },
            ]}
          />

          {featuredPractice ? (
            <section className="studentInsightsTwoColumn">
              <article className="contentCard" id="recommended-practice">
                <div className="sectionHeading">
                  <strong>Recommended Practice Set</strong>
                  <StatusPill tone={practiceStateTone(featuredPractice.availability_state)}>
                    {titleCaseState(featuredPractice.availability_state)}
                  </StatusPill>
                </div>

                <div className="studentResultStatGrid">
                  <div className="studentResultStat">
                    <span>Subject</span>
                    <strong>{featuredPractice.subject_name || "General"}</strong>
                  </div>
                  <div className="studentResultStat">
                    <span>Duration</span>
                    <strong>{featuredPractice.duration_minutes} min</strong>
                  </div>
                  <div className="studentResultStat">
                    <span>Attempts left</span>
                    <strong>
                      {featuredPractice.attempt_policy === "unlimited_practice"
                        ? "Unlimited"
                        : featuredPractice.remaining_attempts}
                    </strong>
                  </div>
                  <div className="studentResultStat">
                    <span>Feedback</span>
                    <strong>
                      {featuredPractice.result_published || featuredPractice.review_available
                        ? "Immediate-ready"
                        : "Policy-based"}
                    </strong>
                  </div>
                  <div className="studentResultStat">
                    <span>Star Access</span>
                    <strong>
                      {featuredPractice.economy_access.requires_unlock
                        ? featuredPractice.economy_access.is_unlocked
                          ? "Unlocked"
                          : featuredPractice.economy_access.can_unlock_with_stars
                            ? `${featuredPractice.economy_access.star_cost} stars`
                            : "Restricted"
                        : "Free"}
                    </strong>
                  </div>
                </div>

                <div className="studentResultFooter">
                  <div className="studentResultHelper">
                    <span>Next step</span>
                    <strong>
                      {practiceActionLabel({
                        canResume: featuredPracticeState?.canResume ?? false,
                        canStart: featuredPracticeState?.canStart ?? false,
                        hasAttemptHistory: featuredPracticeState?.hasAttemptHistory ?? false,
                        reviewAvailable: featuredPractice.review_available,
                      })}
                    </strong>
                    <small>
                      {practiceGuidance({
                        ...featuredPractice,
                        can_resume: featuredPracticeState?.canResume ?? false,
                        can_start: featuredPracticeState?.canStart ?? false,
                      })}
                    </small>
                  </div>
                  <div className="studentInsightHeroActions">
                    {featuredPracticeState?.canStart ? (
                      <form action={startPracticeAction}>
                        <input name="exam_id" type="hidden" value={featuredPractice.id} />
                        <ActionSubmitButton
                          className="button buttonPrimary"
                          idleLabel="Start Practice Now"
                          pendingLabel="Starting..."
                        />
                      </form>
                    ) : featuredPractice.economy_access.is_locked &&
                      featuredPractice.economy_access.can_unlock_with_stars ? (
                      <form action={unlockPracticeAction}>
                        <input name="exam_id" type="hidden" value={featuredPractice.id} />
                        <input
                          name="content_type"
                          type="hidden"
                          value={featuredPractice.economy_access.content_type}
                        />
                        <input
                          name="content_key"
                          type="hidden"
                          value={featuredPractice.economy_access.content_key}
                        />
                        <input
                          name="subject_id"
                          type="hidden"
                          value={featuredPractice.economy_access.subject_id ?? ""}
                        />
                        <ActionSubmitButton
                          className="button buttonPrimary"
                          idleLabel={`Unlock with ${featuredPractice.economy_access.star_cost} Stars`}
                          pendingLabel="Unlocking..."
                        />
                      </form>
                    ) : (
                      <Link
                        className="button buttonPrimary"
                        href={practiceActionHref({
                          examId: featuredPractice.id,
                          canResume: featuredPracticeState?.canResume ?? false,
                          activeAttemptId: featuredPracticeState?.activeAttemptId ?? null,
                          latestAttemptId: latestFocusedAttemptId,
                          reviewAvailable: featuredPractice.review_available,
                        })}
                      >
                        {practiceActionLabel({
                          canResume: featuredPracticeState?.canResume ?? false,
                          canStart: featuredPracticeState?.canStart ?? false,
                          hasAttemptHistory: featuredPracticeState?.hasAttemptHistory ?? false,
                          reviewAvailable: featuredPractice.review_available,
                        })}
                      </Link>
                    )}
                    <Link className="button buttonSecondary" href={`/app/exams/${featuredPractice.id}`}>
                      View Practice Detail
                    </Link>
                  </div>
                </div>
              </article>

              <article className="contentCard">
                <div className="sectionHeading">
                  <strong>Practice Loop</strong>
                  <span>Recommended flow</span>
                </div>
                <div className="studentInsightMessageStack">
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>Use weak-topic and analytics signals to decide what to revise next instead of waiting for the next assigned mock test.</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>Practice sets are lighter-weight than high-stakes assessments and are meant for repeat use.</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>When the exam policy allows it, results and answer review become your immediate improvement loop.</p>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {additionalPracticeExams.length > 0 ? (
            <section className="studentResultsGrid">
              {additionalPracticeExams.map((exam) => {
              const latestAttemptId = latestAttemptForExam(attempts, exam.id)?.id ?? null;
              const examUiState = resolvePracticeUiState(exam, latestAttemptId);

              return (
                <article className="contentCard studentResultSurface" key={exam.id}>
                  <div className="studentResultSurfaceHead">
                    <div>
                      <strong>{exam.title}</strong>
                      <span>{exam.code} · {exam.subject_name || "General practice"}</span>
                    </div>
                    <StatusPill tone={practiceStateTone(exam.availability_state)}>
                      {titleCaseState(exam.availability_state)}
                    </StatusPill>
                  </div>

                  <div className="studentResultStatGrid">
                    <div className="studentResultStat">
                      <span>Duration</span>
                      <strong>{exam.duration_minutes} min</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Attempts</span>
                      <strong>
                        {exam.attempt_policy === "unlimited_practice"
                          ? "Unlimited"
                          : `${exam.remaining_attempts} left`}
                      </strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Availability</span>
                      <strong>
                        {exam.start_at ? studentDateTimeLabel(exam.start_at) : "Ready by policy"}
                      </strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Security</span>
                      <strong>{exam.security_policy.student_label}</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Star Access</span>
                      <strong>
                        {exam.economy_access.requires_unlock
                          ? exam.economy_access.is_unlocked
                            ? "Unlocked"
                            : exam.economy_access.can_unlock_with_stars
                              ? `${exam.economy_access.star_cost} stars`
                              : "Restricted"
                          : "Free"}
                      </strong>
                    </div>
                  </div>

                  <div className="studentResultFooter">
                    <div className="studentResultHelper">
                      <span>Next step</span>
                      <strong>
                        {practiceActionLabel({
                          canResume: examUiState.canResume,
                          canStart: examUiState.canStart,
                          hasAttemptHistory: examUiState.hasAttemptHistory,
                          reviewAvailable: exam.review_available,
                        })}
                      </strong>
                      <small>
                        {practiceGuidance({
                          ...exam,
                          can_resume: examUiState.canResume,
                          can_start: examUiState.canStart,
                        })}
                      </small>
                    </div>
                    <div className="studentInsightHeroActions">
                      {examUiState.canStart ? (
                        <form action={startPracticeAction}>
                          <input name="exam_id" type="hidden" value={exam.id} />
                          <ActionSubmitButton
                            className="button buttonPrimary"
                            idleLabel="Start Practice"
                            pendingLabel="Starting..."
                          />
                        </form>
                      ) : exam.economy_access.is_locked &&
                        exam.economy_access.can_unlock_with_stars ? (
                        <form action={unlockPracticeAction}>
                          <input name="exam_id" type="hidden" value={exam.id} />
                          <input
                            name="content_type"
                            type="hidden"
                            value={exam.economy_access.content_type}
                          />
                          <input
                            name="content_key"
                            type="hidden"
                            value={exam.economy_access.content_key}
                          />
                          <input
                            name="subject_id"
                            type="hidden"
                            value={exam.economy_access.subject_id ?? ""}
                          />
                          <ActionSubmitButton
                            className="button buttonPrimary"
                            idleLabel={`Unlock with ${exam.economy_access.star_cost} Stars`}
                            pendingLabel="Unlocking..."
                          />
                        </form>
                      ) : (
                        <Link
                          className="button buttonPrimary"
                          href={practiceActionHref({
                            examId: exam.id,
                            canResume: examUiState.canResume,
                            activeAttemptId: examUiState.activeAttemptId,
                            latestAttemptId,
                            reviewAvailable: exam.review_available,
                          })}
                        >
                          {practiceActionLabel({
                            canResume: examUiState.canResume,
                            canStart: examUiState.canStart,
                            hasAttemptHistory: examUiState.hasAttemptHistory,
                            reviewAvailable: exam.review_available,
                          })}
                        </Link>
                      )}
                      <Link className="button buttonSecondary" href={`/app/exams/${exam.id}`}>
                        View Detail
                      </Link>
                    </div>
                  </div>
                </article>
              );
              })}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
