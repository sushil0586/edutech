import { cookies } from "next/headers";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import type { StudentAvailableExam } from "@/features/dashboard/types";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  fetchStudentAvailableExams,
  fetchStudentAttempts,
  fetchStudentWalletSummary,
  getStudentApiState,
  spendStarsForContent,
} from "@/lib/api/student";
import { studentDateTimeLabel, titleCaseState } from "@/lib/student/formatters";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentExamsBySubject,
  getStudentSubjectOptions,
  resolveSelectedStudentSubject,
  selectedStudentSourceLabel,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

type SourceFilterValue = "all" | "platform" | "institute" | "teacher";

function formatExamState(state: string) {
  switch (state) {
    case "locked":
      return "Locked";
    case "available_now":
      return "Available now";
    case "upcoming":
      return "Upcoming";
    case "completed":
      return "Completed";
    case "missed":
      return "Missed";
    case "not_assigned":
      return "Not assigned";
    default:
      return state.replaceAll("_", " ");
  }
}

function actionLabel(
  canResume: boolean,
  canStart: boolean,
  hasAttemptHistory: boolean,
  reviewAvailable: boolean,
) {
  if (canResume) return "Resume";
  if (canStart) return "Start";
  if (reviewAvailable && hasAttemptHistory) return "Review";
  if (hasAttemptHistory) return "Summary";
  return "View";
}

function actionHref(
  examId: string,
  canResume: boolean,
  activeAttemptId: string | null,
  latestAttemptId: string | null,
  reviewAvailable: boolean,
) {
  if (canResume && activeAttemptId) {
    return `/app/attempts/${activeAttemptId}`;
  }

  if (reviewAvailable && latestAttemptId) {
    return `/app/attempts/${latestAttemptId}/review`;
  }

  if (latestAttemptId) {
    return `/app/attempts/${latestAttemptId}/summary`;
  }

  return `/app/exams/${examId}`;
}

function examStateTone(state: string) {
  switch (state) {
    case "locked":
      return "warning" as const;
    case "available_now":
      return "live" as const;
    case "upcoming":
      return "warning" as const;
    case "completed":
      return "demo" as const;
    case "missed":
      return "danger" as const;
    default:
      return "default" as const;
  }
}

function resolveSelectedSource(value?: string): SourceFilterValue {
  switch (value) {
    case "platform":
    case "institute":
    case "teacher":
      return value;
    default:
      return "all";
  }
}

function examSourceDescriptor(exam: StudentAvailableExam) {
  if (exam.source_type === "teacher" && exam.source_teacher_name) {
    return `${exam.source_label} · ${exam.source_teacher_name}`;
  }

  if (exam.source_name && exam.source_name !== exam.source_label) {
    return `${exam.source_label} · ${exam.source_name}`;
  }

  return exam.source_label;
}

function examAvailabilityGuidance(exam: {
  availability_state: string;
  can_resume: boolean;
  can_start: boolean;
  remaining_attempts: number;
  review_available: boolean;
  active_attempt: { id: string } | null;
  economy_access: {
    is_locked: boolean;
    can_unlock_with_stars: boolean;
    star_cost: number;
    lock_reason_message: string;
  };
}) {
  if (exam.can_resume && exam.active_attempt) {
    return "Your latest active attempt is still live. Re-enter and continue where you left off.";
  }

  if (exam.economy_access.is_locked && exam.economy_access.can_unlock_with_stars) {
    return `${exam.economy_access.star_cost} stars are required before this mock test can be started. Unlock it first, then return here to begin.`;
  }

  if (exam.economy_access.is_locked) {
    return (
      exam.economy_access.lock_reason_message ||
      "This mock test is currently locked by access policy."
    );
  }

  if (exam.can_start) {
    return "You can start this mock test now. Once started, your attempt will be tracked live from the backend session.";
  }

  if (exam.review_available) {
    return "Attempt history is available here. Open summary or review to learn from the last run.";
  }

  if (exam.remaining_attempts === 0) {
    return "You have used all available attempts for this mock test.";
  }

  if (exam.availability_state === "upcoming") {
    return "This mock test is assigned, but not open yet. Check the availability window before starting.";
  }

  if (exam.availability_state === "completed") {
    return "This mock test window is closed. You can only revisit history if the backend allows it.";
  }

  return "Open the detail page to review rules, visibility policy, and your next valid action.";
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

function securityModeLabel(exam: {
  security_mode: string;
  security_policy: { student_label: string };
}) {
  if (exam.security_policy.student_label) {
    return exam.security_policy.student_label;
  }
  return titleCaseState(exam.security_mode);
}

async function loadExams(filters: {
  source: SourceFilterValue;
  teacher: string | null;
}) {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      exams: [] as StudentAvailableExam[],
      catalogExams: [] as StudentAvailableExam[],
      attempts: [],
      wallet: null,
    };
  }

  try {
    const filteredExamPromise = fetchStudentAvailableExams({
      source: filters.source,
      teacher: filters.source === "teacher" ? filters.teacher : null,
    });
    const catalogExamPromise =
      filters.source === "all" && !filters.teacher
        ? filteredExamPromise
        : fetchStudentAvailableExams();

    const [exams, catalogExams, attempts, wallet] = await Promise.all([
      filteredExamPromise,
      catalogExamPromise,
      fetchStudentAttempts(),
      fetchStudentWalletSummary().catch(() => null),
    ]);
    return {
      source: "live" as const,
      exams,
      catalogExams,
      attempts,
      wallet,
    };
  } catch {
    return {
      source: "error" as const,
      exams: [] as StudentAvailableExam[],
      catalogExams: [] as StudentAvailableExam[],
      attempts: [],
      wallet: null,
    };
  }
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    source?: string;
    teacher?: string;
    subject?: string;
  }>;
}) {
  const { error, message, source: sourceParam, teacher: teacherParam, subject: subjectParam } =
    await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const selectedSource = resolveSelectedSource(
    sourceParam ?? cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    subjectParam ??
      cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ??
      ALL_SUBJECTS_CONTEXT,
  );
  const selectedSubjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "Overall";
  const selectedTeacherId =
    selectedSource === "teacher"
      ? teacherParam?.trim() ||
        cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value?.trim() ||
        null
      : null;

  const { source, exams, attempts, wallet } = await loadExams({
    source: selectedSource,
    teacher: selectedTeacherId,
  });
  const mockExams = filterStudentExamsBySubject(
    exams.filter((exam) => exam.exam_type !== "practice"),
    selectedSubject,
  );
  const readyCount = mockExams.filter((exam) => exam.can_start).length;
  const resumeCount = mockExams.filter((exam) => exam.can_resume).length;
  const publishedCount = mockExams.filter((exam) => exam.result_published).length;
  const featuredExam =
    mockExams.find((exam) => exam.can_resume) ??
    mockExams.find((exam) => exam.can_start) ??
    mockExams.find((exam) => exam.availability_state === "upcoming") ??
    mockExams[0] ??
    null;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        title={
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "Mock Tests"
            : `${selectedSubjectLabel} Mock Tests`
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
            ? "A guided mock test workspace with live availability, premium access visibility, and clear next-step actions."
            : `A guided mock test workspace focused on ${selectedSubjectLabel}, showing only matching backend subject records.`
        }
        statusLabel={
          source === "live"
            ? `${mockExams.length} mock tests loaded`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load exams"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {message ? (
        <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p>
      ) : null}
      {error ? (
        <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p>
      ) : null}

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for live exam availability"
              : "Exam availability could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This page only renders real exam data. Configure the API base URL and sign in with an active student account to load assigned exams from the backend."
              : "The exam list is connected to the student availability endpoint, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Student availability endpoint", "Active student web session"]
              : ["Backend connectivity", "Exam availability endpoint"]
          }
          ctaHref="/app/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={
            source === "unconfigured" ? "Configuration required" : "Try again shortly"
          }
        />
      ) : mockExams.length === 0 ? (
        <StudentStatePanel
          eyebrow={selectedSource === "all" ? "No assigned exams" : "No exams match this filter"}
          title={
            selectedSource === "all"
              ? "Your mock-test workspace is empty right now"
              : "No mock tests match the current source and subject view"
          }
          description={
            selectedSource === "all"
              ? "No non-practice exams were returned for the authenticated student. You can still open Practice to keep improving between assigned mock tests."
              : "Try switching source, teacher, or subject filters to return to the merged exam list."
          }
          ctaHref="/app/practice"
          ctaLabel="Open Practice"
          statusLabel={
            selectedSource === "all"
              ? "Waiting for assigned mock tests"
              : "Filter returned zero matching mock tests"
          }
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Mock Test Entry</span>
              <strong>{featuredExam?.title ?? "Mock test workspace"}</strong>
              <p>
                {featuredExam
                  ? examAvailabilityGuidance(featuredExam)
                  : "Use this workspace to move into assigned mock tests, continue active attempts, and revisit exam history when policy allows it."}
              </p>
              <small>
                {featuredExam
                  ? `${featuredExam.code} · ${examSourceDescriptor(featuredExam)}${
                      featuredExam.subject_name ? ` · ${featuredExam.subject_name}` : ""
                    } · ${formatExamState(featuredExam.availability_state)}`
                  : "Live catalog connected to student availability"}
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/app/exams/enter-key">
                Enter Exam Key
              </Link>
              <Link className="button buttonSecondary" href="/app/dashboard">
                Back to Dashboard
              </Link>
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Ready Now",
                value: readyCount,
                note: "Mock tests that can be started immediately",
                tone: "primary",
              },
              {
                label: "Resume Active",
                value: resumeCount,
                note: "Attempts still in progress and ready to continue",
              },
              {
                label: "Published Results",
                value: publishedCount,
                note: "Mock tests with visible result records",
              },
              {
                label: "Wallet Stars",
                value: wallet ? wallet.available_stars.toLocaleString("en-IN") : "--",
                note: "Current premium unlock balance",
              },
            ]}
          />

          {featuredExam ? (
            <section className="studentInsightsTwoColumn">
              <article className="contentCard">
                <div className="sectionHeading">
                  <strong>Featured Mock Test</strong>
                  <StatusPill tone={examStateTone(featuredExam.availability_state)}>
                    {formatExamState(featuredExam.availability_state)}
                  </StatusPill>
                </div>

                <div className="studentResultStatGrid">
                  <div className="studentResultStat">
                    <span>Exam code</span>
                    <strong>{featuredExam.code}</strong>
                  </div>
                  <div className="studentResultStat">
                    <span>Duration</span>
                    <strong>{featuredExam.duration_minutes} min</strong>
                  </div>
                  <div className="studentResultStat">
                    <span>Attempts left</span>
                    <strong>{featuredExam.remaining_attempts}</strong>
                  </div>
                  <div className="studentResultStat">
                    <span>Security</span>
                    <strong>{securityModeLabel(featuredExam)}</strong>
                  </div>
                </div>

                <div className="studentInsightHeroActions">
                  <StatusPill tone="default">{examSourceDescriptor(featuredExam)}</StatusPill>
                  {featuredExam.subject_name ? (
                    <StatusPill tone="demo">{featuredExam.subject_name}</StatusPill>
                  ) : null}
                </div>

                <div className="studentResultFooter">
                  <div className="studentResultHelper">
                    <span>Next action</span>
                    <strong>
                      {actionLabel(
                        featuredExam.can_resume,
                        featuredExam.can_start,
                        attempts.some((attempt) => attempt.exam === featuredExam.id),
                        featuredExam.review_available,
                      )}{" "}
                      Mock Test
                    </strong>
                    <small>{examAvailabilityGuidance(featuredExam)}</small>
                  </div>
                  <div className="studentInsightHeroActions">
                    <Link
                      className="button buttonPrimary"
                      href={actionHref(
                        featuredExam.id,
                        featuredExam.can_resume,
                        featuredExam.active_attempt?.id ?? null,
                        attempts.find((attempt) => attempt.exam === featuredExam.id)?.id ?? null,
                        featuredExam.review_available,
                      )}
                    >
                      {actionLabel(
                        featuredExam.can_resume,
                        featuredExam.can_start,
                        attempts.some((attempt) => attempt.exam === featuredExam.id),
                        featuredExam.review_available,
                      )}{" "}
                      Mock Test
                    </Link>
                    <Link className="button buttonSecondary" href={`/app/exams/${featuredExam.id}`}>
                      View Full Detail
                    </Link>
                  </div>
                </div>
              </article>

              <article className="contentCard">
                <div className="sectionHeading">
                  <strong>What to expect</strong>
                  <span>Student flow</span>
                </div>
                <div className="studentInsightMessageStack">
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>Open rules before starting so attempts left, review policy, and visibility are clear.</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>Resume always takes priority over starting fresh when the backend already has a live attempt.</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>After submission, summary, result visibility, and answer review still depend on backend lifecycle rules.</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>If a mock test is premium, the screen will show whether stars can unlock it immediately or whether another access rule is in place.</p>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          <section className="studentResultsGrid">
            {mockExams.map((exam) => {
              const latestAttempt = attempts.find((attempt) => attempt.exam === exam.id) ?? null;
              const primaryLabel = actionLabel(
                exam.can_resume,
                exam.can_start,
                Boolean(latestAttempt),
                exam.review_available,
              );
              const primaryHref = actionHref(
                exam.id,
                exam.can_resume,
                exam.active_attempt?.id ?? null,
                latestAttempt?.id ?? null,
                exam.review_available,
              );

              return (
                <article className="contentCard studentResultSurface" key={exam.id}>
                  <div className="studentResultSurfaceHead">
                    <div>
                      <strong>{exam.title}</strong>
                      <span>
                        {exam.code} · {examSourceDescriptor(exam)}
                        {exam.subject_name ? ` · ${exam.subject_name}` : ""}
                      </span>
                    </div>
                    <StatusPill tone={examStateTone(exam.availability_state)}>
                      {formatExamState(exam.availability_state)}
                    </StatusPill>
                  </div>

                  <div className="studentResultStatGrid">
                    <div className="studentResultStat">
                      <span>Duration</span>
                      <strong>{exam.duration_minutes} min</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Attempts left</span>
                      <strong>{exam.remaining_attempts}</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Total marks</span>
                      <strong>{exam.total_marks}</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Passing marks</span>
                      <strong>{exam.passing_marks}</strong>
                    </div>
                  </div>

                  <div className="studentInsightHeroActions">
                    <StatusPill tone="default">{exam.source_label}</StatusPill>
                    {exam.source_type === "teacher" && exam.source_teacher_name ? (
                      <StatusPill tone="demo">{exam.source_teacher_name}</StatusPill>
                    ) : null}
                    <StatusPill tone={exam.result_published ? "live" : "demo"}>
                      {exam.result_published ? "Result visible" : "Result pending"}
                    </StatusPill>
                    {exam.economy_access.requires_unlock ? (
                      <StatusPill tone={exam.economy_access.is_unlocked ? "live" : "warning"}>
                        {exam.economy_access.is_unlocked
                          ? "Unlocked"
                          : exam.economy_access.can_unlock_with_stars
                            ? `${exam.economy_access.star_cost} stars`
                            : "Access controlled"}
                      </StatusPill>
                    ) : null}
                    <StatusPill tone={exam.review_available ? "live" : "warning"}>
                      {exam.review_available ? "Review available" : "Review locked"}
                    </StatusPill>
                    <StatusPill
                      tone={
                        exam.security_mode === "normal"
                          ? "default"
                          : exam.security_mode === "focus"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {securityModeLabel(exam)}
                    </StatusPill>
                  </div>

                  <div className="studentResultFooter">
                    <div className="studentResultHelper">
                      <span>Next step</span>
                      <strong>{primaryLabel}</strong>
                      <small>
                        {exam.economy_access.is_locked && exam.economy_access.can_unlock_with_stars
                          ? `Needs ${exam.economy_access.star_cost} stars before start · ${securityModeLabel(exam)}`
                          : exam.start_at
                            ? `Starts ${studentDateTimeLabel(exam.start_at)} · ${securityModeLabel(exam)}`
                            : `Window controlled by backend runtime policy · ${securityModeLabel(exam)}`}
                      </small>
                    </div>
                    <div className="studentInsightHeroActions">
                      {exam.economy_access.is_locked && exam.economy_access.can_unlock_with_stars ? (
                        <>
                          <form action={unlockExamAction}>
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
                          <Link className="button buttonGhost" href="/app/wallet">
                            Open Wallet
                          </Link>
                        </>
                      ) : (
                        <Link className="button buttonSecondary" href={primaryHref}>
                          {primaryLabel}
                        </Link>
                      )}
                      <Link className="button buttonGhost" href={`/app/exams/${exam.id}`}>
                        Detail
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
