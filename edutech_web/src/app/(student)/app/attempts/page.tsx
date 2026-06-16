import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  fetchStudentAttempts,
  fetchStudentAvailableExams,
  getStudentApiState,
  spendStarsForContent,
  startStudentAttempt,
} from "@/lib/api/student";
import {
  durationMinutesLabel,
  percentageLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import { buildPracticeHref, resolvePracticeFollowUpAction } from "@/lib/student/practice";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentExamsBySubject,
  filterStudentRecordsBySource,
  filterStudentRecordsByMetadataSubject,
  getStudentSourceOptions,
  getMetadataSubjectName,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  selectedStudentSourceLabel,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

function attemptTone(status: string) {
  if (status === "submitted") return "statusLive";
  if (status === "in_progress") return "statusWarning";
  return "statusDemo";
}

function attemptSourceDescriptor(attempt: {
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
}) {
  if (attempt.source_type === "teacher" && attempt.source_teacher_name) {
    return `${attempt.source_label} · ${attempt.source_teacher_name}`;
  }

  if (attempt.source_name && attempt.source_name !== attempt.source_label) {
    return `${attempt.source_label} · ${attempt.source_name}`;
  }

  return attempt.source_label;
}

function submittedAttemptCopy() {
  return {
    workspace: "Summary and result visibility depend on policy",
    helper:
      "Open the summary first to check whether results are visible and whether review has been unlocked for this attempt.",
    primaryCta: "Check Attempt Status",
    secondaryCta: "Open Results",
    practiceCta: "Open Practice",
  };
}

async function loadAttempts() {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      attempts: [],
      practiceExams: [],
    };
  }

  try {
    const [attempts, exams] = await Promise.all([
      fetchStudentAttempts(),
      fetchStudentAvailableExams(),
    ]);
    return {
      source: "live" as const,
      attempts,
      practiceExams: exams.filter((exam) => exam.exam_type === "practice"),
    };
  } catch {
    return {
      source: "error" as const,
      attempts: [],
      practiceExams: [],
    };
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
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to start this practice set right now.";
    redirect(`/app/attempts?error=${message}`);
  }
}

async function unlockPracticeAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
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
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to unlock this practice set right now.";
    redirect(`/app/attempts?error=${message}`);
  }
}

export default async function AttemptsPage({
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

  const { source, attempts, practiceExams } = await loadAttempts();
  const { teacherOptions } = getStudentSourceOptions([...attempts, ...practiceExams]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ?? null,
  );
  const scopedAttempts = filterStudentRecordsByMetadataSubject(
    filterStudentRecordsBySource(attempts, selectedSource, selectedTeacherId),
    selectedSubject,
  );
  const scopedPracticeExams = filterStudentExamsBySubject(
    filterStudentRecordsBySource(practiceExams, selectedSource, selectedTeacherId),
    selectedSubject,
  );
  const inProgressCount = scopedAttempts.filter(
    (attempt) => attempt.status === "in_progress",
  ).length;
  const submittedCount = scopedAttempts.filter(
    (attempt) => attempt.status === "submitted",
  ).length;
  const latestAttempt = scopedAttempts[0] ?? null;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        title={
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "My Attempts"
            : `${selectedSubjectLabel} Attempts`
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
            ? "A live attempt history showing resume state, post-submit status, and the next guided action after each attempt."
            : `A live attempt history focused on ${selectedSubjectLabel}, using matching backend subject records when metadata is available.`
        }
        statusLabel={
          source === "live"
            ? `${scopedAttempts.length} attempts loaded`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load attempts"
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
              ? "Waiting for student attempt history"
              : "Attempt history could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This page only renders real student attempt data. Configure the API base URL and sign in with an active student account to load attempt history."
              : "The attempt history workspace is connected to live backend APIs, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Student attempt list endpoint", "Active student web session"]
              : ["Backend connectivity", "Student attempt list endpoint"]
          }
          ctaHref="/app/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      ) : scopedAttempts.length === 0 ? (
        <StudentStatePanel
          eyebrow="No attempts yet"
          title="Your attempt history is empty right now"
          description="No attempt records were returned for the authenticated student. Start an assigned exam to begin building your attempt timeline."
          ctaHref="/app/exams"
          ctaLabel="Open Exams"
          statusLabel="Waiting for first attempt"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Attempt Timeline</span>
              <strong>{latestAttempt?.exam_title ?? "Latest attempt"}</strong>
              <p>
                {latestAttempt?.status === "in_progress"
                  ? "You still have an active attempt in progress. Resume it directly from here."
                  : "Submitted attempts stay here so you can move from summary to results, review, and follow-up practice without losing context."}
              </p>
              <small>
                {latestAttempt
                  ? `${latestAttempt.exam_code} · ${attemptSourceDescriptor(latestAttempt)} · Updated ${studentDateTimeLabel(
                      latestAttempt.updated_at,
                    )}`
                  : "No attempt activity yet"}
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/app/exams">
                Open Mock Tests
              </Link>
              <Link className="button buttonSecondary" href={buildPracticeHref()}>
                Open Practice
              </Link>
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Total Attempts",
                value: scopedAttempts.length,
                note: "All attempt records visible to the student",
                tone: "primary",
              },
              {
                label: "In Progress",
                value: inProgressCount,
                note: "Attempts that can still be resumed",
              },
              {
                label: "Submitted",
                value: submittedCount,
                note: latestAttempt
                  ? `Latest update ${studentDateTimeLabel(latestAttempt.updated_at)}`
                  : "No attempt activity yet",
              },
            ]}
          />

          <section className="studentResultsGrid">
            {scopedAttempts.map((attempt) => {
              const isInProgress = attempt.status === "in_progress";
              const currentSectionName = attempt.section_runtime.current_section_name;
              const submittedCopy = submittedAttemptCopy();
              const attemptSubjectName = getMetadataSubjectName(attempt.metadata);
              const practiceFollowUp = resolvePracticeFollowUpAction({
                exams: scopedPracticeExams,
                subjectName: attemptSubjectName || null,
              });

              return (
                <article className="contentCard studentResultSurface" key={attempt.id}>
                  <div className="studentResultSurfaceHead">
                    <div>
                      <strong>{attempt.exam_title}</strong>
                      <span>{attempt.exam_code} · Attempt {attempt.attempt_no}</span>
                    </div>
                    <div className="studentResultSurfaceStatus">
                      <span className="statusPill statusDefault">{attempt.source_label}</span>
                      {attempt.source_type === "teacher" && attempt.source_teacher_name ? (
                        <span className="statusPill statusDemo">{attempt.source_teacher_name}</span>
                      ) : null}
                      <span className={`statusPill ${attemptTone(attempt.status)}`}>
                        {titleCaseState(attempt.status)}
                      </span>
                    </div>
                  </div>

                  <div className="studentResultStatGrid">
                    <div className="studentResultStat">
                      <span>Source</span>
                      <strong>{attempt.source_label}</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Attempted</span>
                      <strong>
                        {attempt.attempted_questions}/{attempt.total_questions}
                      </strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Current Score</span>
                      <strong>{percentageLabel(attempt.percentage)}</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Time Taken</span>
                      <strong>{durationMinutesLabel(attempt.time_taken_seconds)}</strong>
                    </div>
                    <div className="studentResultStat">
                      <span>Updated</span>
                      <strong>{studentDateTimeLabel(attempt.updated_at)}</strong>
                    </div>
                  </div>

                  <div className="studentResultFooter">
                    <div className="studentResultHelper">
                      <span>Workspace</span>
                      <strong>
                        {isInProgress
                          ? currentSectionName || "Continue active attempt"
                          : submittedCopy.workspace}
                      </strong>
                      <small>
                        {attemptSourceDescriptor(attempt)}.{" "}
                        {isInProgress
                          ? "Return to the active session and continue from the latest saved state."
                          : practiceFollowUp.exam
                            ? `${submittedCopy.helper} The next practice suggestion is resolved from live access for ${practiceFollowUp.exam.title}.`
                            : submittedCopy.helper}
                      </small>
                    </div>
                    <div className="studentInsightHeroActions">
                      {isInProgress ? (
                        <Link className="button buttonPrimary" href={`/app/attempts/${attempt.id}`}>
                          Resume Attempt
                        </Link>
                      ) : (
                        <Link
                          className="button buttonPrimary"
                          href={`/app/attempts/${attempt.id}/summary`}
                        >
                          {submittedCopy.primaryCta}
                        </Link>
                      )}
                      <Link
                        className="button buttonSecondary"
                        href={isInProgress ? `/app/exams/${attempt.exam}` : "/app/results"}
                      >
                        {isInProgress ? "Exam Detail" : submittedCopy.secondaryCta}
                      </Link>
                      {!isInProgress ? (
                        <>
                          {practiceFollowUp.action.mode === "link" ? (
                            <Link
                              className="button buttonGhost"
                              href={practiceFollowUp.action.href}
                            >
                              {attempt.exam_type === "practice"
                                ? "Practice Again"
                                : practiceFollowUp.action.label || submittedCopy.practiceCta}
                            </Link>
                          ) : null}
                          {practiceFollowUp.action.mode === "start" && practiceFollowUp.exam ? (
                            <form action={startPracticeAction}>
                              <input name="exam_id" type="hidden" value={practiceFollowUp.exam.id} />
                              <input
                                name="student_id"
                                type="hidden"
                                value={profile?.student_profile ?? ""}
                              />
                              <ActionSubmitButton
                                className="button buttonGhost"
                                disabled={!profile?.student_profile}
                                idleLabel={
                                  attempt.exam_type === "practice"
                                    ? "Practice Again"
                                    : practiceFollowUp.action.label
                                }
                                pendingLabel="Starting..."
                              />
                            </form>
                          ) : null}
                          {practiceFollowUp.action.mode === "unlock" && practiceFollowUp.exam ? (
                            <>
                              <form action={unlockPracticeAction}>
                                <input name="exam_id" type="hidden" value={practiceFollowUp.exam.id} />
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
                                  className="button buttonGhost"
                                  idleLabel={practiceFollowUp.action.label}
                                  pendingLabel="Unlocking..."
                                />
                              </form>
                              <Link className="button buttonSecondary" href="/app/wallet">
                                Open Wallet
                              </Link>
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="contentCard">
            <div className="sectionHeading">
              <strong>After each attempt</strong>
            </div>
            <p className="sectionDescription">
              Attempt follow-up is not one-size-fits-all. Some next steps start immediately, some open
              review flows, and some premium practice sets may first need stars before you continue.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
