import { cookies } from "next/headers";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
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
import { buildFilterHref, formatFilterValue } from "@/lib/workspace/filter-utils";

type AttemptStatusFilter = "all" | "in_progress" | "submitted" | "practice" | "mock";
type AttemptSortOption = "latest" | "oldest" | "highest" | "lowest" | "longest";
type AttemptGroupOption = "none" | "status" | "source" | "type";

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

function resolveAttemptStatusFilter(value?: string): AttemptStatusFilter {
  switch (value) {
    case "in_progress":
    case "submitted":
    case "practice":
    case "mock":
      return value;
    default:
      return "all";
  }
}

function resolveAttemptSortOption(value?: string): AttemptSortOption {
  switch (value) {
    case "oldest":
    case "highest":
    case "lowest":
    case "longest":
      return value;
    default:
      return "latest";
  }
}

function resolveAttemptGroupOption(value?: string): AttemptGroupOption {
  switch (value) {
    case "status":
    case "source":
    case "type":
      return value;
    default:
      return "none";
  }
}

function applyAttemptStatusFilter(
  attempts: Awaited<ReturnType<typeof fetchStudentAttempts>>,
  filter: AttemptStatusFilter,
) {
  switch (filter) {
    case "in_progress":
      return attempts.filter((attempt) => attempt.status === "in_progress");
    case "submitted":
      return attempts.filter((attempt) => attempt.status === "submitted");
    case "practice":
      return attempts.filter((attempt) => attempt.exam_type === "practice");
    case "mock":
      return attempts.filter((attempt) => attempt.exam_type !== "practice");
    default:
      return attempts;
  }
}

function sortAttempts(
  attempts: Awaited<ReturnType<typeof fetchStudentAttempts>>,
  sortBy: AttemptSortOption,
) {
  const sortable = [...attempts];
  sortable.sort((left, right) => {
    switch (sortBy) {
      case "oldest":
        return Date.parse(left.updated_at) - Date.parse(right.updated_at);
      case "highest":
        return Number(right.percentage) - Number(left.percentage);
      case "lowest":
        return Number(left.percentage) - Number(right.percentage);
      case "longest":
        return right.time_taken_seconds - left.time_taken_seconds;
      case "latest":
      default:
        return Date.parse(right.updated_at) - Date.parse(left.updated_at);
    }
  });
  return sortable;
}

function buildAttemptGroupLabel(
  attempt: Awaited<ReturnType<typeof fetchStudentAttempts>>[number],
  groupBy: AttemptGroupOption,
) {
  if (groupBy === "status") {
    return titleCaseState(attempt.status);
  }
  if (groupBy === "source") {
    return attemptSourceDescriptor(attempt);
  }
  if (groupBy === "type") {
    return attempt.exam_type === "practice" ? "Practice attempts" : "Mock tests";
  }
  return "Attempts";
}

function groupAttempts(
  attempts: Awaited<ReturnType<typeof fetchStudentAttempts>>,
  groupBy: AttemptGroupOption,
) {
  if (groupBy === "none") {
    return [{ label: "All attempts", items: attempts }];
  }

  const buckets = new Map<string, Awaited<ReturnType<typeof fetchStudentAttempts>>>();
  for (const attempt of attempts) {
    const label = buildAttemptGroupLabel(attempt, groupBy);
    buckets.set(label, [...(buckets.get(label) ?? []), attempt]);
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

function buildAttemptFilterHref(args: {
  status?: AttemptStatusFilter;
  sort?: AttemptSortOption;
  group?: AttemptGroupOption;
}) {
  return buildFilterHref("/app/attempts", [
    ["attempt_filter", args.status, "all"],
    ["attempt_sort", args.sort, "latest"],
    ["attempt_group", args.group, "none"],
  ]);
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
    unstable_rethrow(error);
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
    unstable_rethrow(error);
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
  searchParams: Promise<{
    error?: string;
    attempt_filter?: string;
    attempt_sort?: string;
    attempt_group?: string;
  }>;
}) {
  const { error, attempt_filter, attempt_sort, attempt_group } = await searchParams;
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
  const statusFilter = resolveAttemptStatusFilter(attempt_filter);
  const sortOption = resolveAttemptSortOption(attempt_sort);
  const groupOption = resolveAttemptGroupOption(attempt_group);
  const filteredAttempts = sortAttempts(
    applyAttemptStatusFilter(scopedAttempts, statusFilter),
    sortOption,
  );
  const groupedAttempts = groupAttempts(filteredAttempts, groupOption);
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
            ? `${filteredAttempts.length} attempts loaded`
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
          <section className="contentCard studentWorkspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Attempt Controls</strong>
              <span>Refine active and completed history</span>
            </div>
            <form className="studentWorkspaceFiltersForm" method="GET">
              <label className="studentWorkspaceFilterField">
                <span>Status</span>
                <select defaultValue={statusFilter} name="attempt_filter">
                  <option value="all">All attempts</option>
                  <option value="in_progress">In progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="practice">Practice only</option>
                  <option value="mock">Mock tests only</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Sort by</span>
                <select defaultValue={sortOption} name="attempt_sort">
                  <option value="latest">Latest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="highest">Highest score</option>
                  <option value="lowest">Lowest score</option>
                  <option value="longest">Longest time taken</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Group by</span>
                <select defaultValue={groupOption} name="attempt_group">
                  <option value="none">No grouping</option>
                  <option value="status">Attempt status</option>
                  <option value="source">Source</option>
                  <option value="type">Attempt type</option>
                </select>
              </label>
              <div className="studentWorkspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
                </button>
                <Link className="button buttonSecondary" href="/app/attempts">
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="studentWorkspaceFilterQuickRow">
              <span className="studentWorkspaceFilterQuickLabel">Quick filters</span>
              <div className="studentWorkspaceFilterQuickChips">
                {[
                  { label: "All", href: buildAttemptFilterHref({}), active: statusFilter === "all" && sortOption === "latest" && groupOption === "none" },
                  { label: "In Progress", href: buildAttemptFilterHref({ status: "in_progress", sort: sortOption, group: groupOption }), active: statusFilter === "in_progress" },
                  { label: "Submitted", href: buildAttemptFilterHref({ status: "submitted", sort: sortOption, group: groupOption }), active: statusFilter === "submitted" },
                  { label: "Practice", href: buildAttemptFilterHref({ status: "practice", sort: sortOption, group: groupOption }), active: statusFilter === "practice" },
                  { label: "Mock Tests", href: buildAttemptFilterHref({ status: "mock", sort: sortOption, group: groupOption }), active: statusFilter === "mock" },
                  { label: "Highest Score", href: buildAttemptFilterHref({ status: statusFilter, sort: "highest", group: groupOption }), active: sortOption === "highest" },
                  { label: "Group by Status", href: buildAttemptFilterHref({ status: statusFilter, sort: sortOption, group: "status" }), active: groupOption === "status" },
                ].map((chip) => (
                  <Link
                    key={chip.label}
                    className={`studentWorkspaceQuickChip${
                      chip.active ? " studentWorkspaceQuickChipActive" : ""
                    }`}
                    href={chip.href}
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
            <FilterSummaryPills
              className="studentWorkspaceFilterChips"
              items={[
                { label: "Status", value: formatFilterValue(statusFilter) },
                { label: "Sort", value: formatFilterValue(sortOption) },
                { label: "Group", value: formatFilterValue(groupOption) },
              ]}
            />
          </section>

          {filteredAttempts.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching attempts"
              title="No attempts match these controls"
              description="Try a broader status filter, a different sort order, or reset the controls to return to the full attempt history."
              ctaHref="/app/attempts"
              ctaLabel="Reset attempt filters"
              statusLabel="Filter returned zero attempts"
            />
          ) : null}

          {filteredAttempts.length > 0 ? (
            <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Attempt Timeline</span>
              <strong>{latestAttempt?.exam_title ?? "Latest attempt"}</strong>
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
                value: filteredAttempts.length,
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

          {groupedAttempts.map((group) => (
            <section className="studentResultsGroupedSection" key={group.label}>
              {groupOption !== "none" ? (
                <div className="sectionHeading">
                  <strong>{group.label}</strong>
                  <span>{group.items.length} attempts</span>
                </div>
              ) : null}
              <div className="studentResultsGrid">
                {group.items.map((attempt) => {
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
              </div>
            </section>
          ))}

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
          ) : null}
        </>
      )}
    </div>
  );
}
