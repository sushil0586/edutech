import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StudentWorkspaceLink as Link } from "@/components/ui/student-workspace-link";
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
import {
  attemptOutcomeHelper,
  attemptOutcomeJourney,
  attemptOutcomeLabel,
  attemptOutcomeProgressLabel,
  attemptOutcomeResultsLabel,
  attemptOutcomeReviewLabel,
  resolveAttemptOutcomeState,
} from "@/lib/student/attempt-outcome";
import { buildPracticeHref, resolvePracticeFollowUpAction } from "@/lib/student/practice";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentExamsBySubject,
  filterStudentRecordsBySource,
  filterStudentRecordsByMetadataSubject,
  getMetadataSubjectDisplayLabel,
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
const ATTEMPT_PAGE_SIZE_VALUES = [6, 12, 18] as const;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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
  const outcomeState = resolveAttemptOutcomeState({
    resultVisible: false,
    reviewAvailable: false,
  });
  const journey = attemptOutcomeJourney(outcomeState);

  return {
    workspace: attemptOutcomeLabel(outcomeState),
    helper: `${attemptOutcomeHelper(outcomeState, "mock_exam")} ${journey.laneHelper}`,
    progress: attemptOutcomeProgressLabel(outcomeState),
    primaryCta: journey.summaryCta,
    secondaryCta: journey.resultsCta,
    practiceCta: "Open Practice",
    laneLabel: journey.laneLabel,
  };
}

function compactAttemptStatusLabel(args: {
  isInProgress: boolean;
  submittedOutcomeState: ReturnType<typeof resolveAttemptOutcomeState>;
}) {
  if (args.isInProgress) return "In Progress";
  return attemptOutcomeResultsLabel(args.submittedOutcomeState);
}

function compactAttemptHeadline(args: {
  isInProgress: boolean;
  currentSectionName: string | null | undefined;
  submittedOutcomeState: ReturnType<typeof resolveAttemptOutcomeState>;
}) {
  if (args.isInProgress) {
    return args.currentSectionName || "Resume the active attempt";
  }
  return `${attemptOutcomeResultsLabel(args.submittedOutcomeState)} · ${attemptOutcomeReviewLabel(args.submittedOutcomeState)}`;
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
  page?: number;
  pageSize?: number;
  subject?: string;
  source?: string;
  teacher?: string;
}) {
  return buildFilterHref("/app/attempts", [
    ["subject", args.subject],
    ["source", args.source],
    ["teacher", args.teacher],
    ["attempt_filter", args.status, "all"],
    ["attempt_sort", args.sort, "latest"],
    ["attempt_group", args.group, "none"],
    ["attempt_page", args.page ? String(args.page) : undefined, "1"],
    ["attempt_page_size", args.pageSize ? String(args.pageSize) : undefined, "12"],
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
    subject?: string;
    source?: string;
    teacher?: string;
    attempt_filter?: string;
    attempt_sort?: string;
    attempt_group?: string;
    attempt_page?: string;
    attempt_page_size?: string;
  }>;
}) {
  const {
    error,
    subject,
    source: sourceParam,
    teacher: teacherParam,
    attempt_filter,
    attempt_sort,
    attempt_group,
    attempt_page,
    attempt_page_size,
  } = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const requestedSubject =
    subjectOptions.find((option) => option.value === subject)?.value ?? null;
  const cookieStore = await cookies();
  const requestedSource = resolveSelectedStudentSource(sourceParam ?? ALL_SOURCES_CONTEXT);
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    requestedSubject ??
      cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ??
      ALL_SUBJECTS_CONTEXT,
  );
  const selectedSubjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "Overall";
  const scopedSubjectParam =
    selectedSubject === ALL_SUBJECTS_CONTEXT ? undefined : selectedSubject;

  const { source, attempts, practiceExams } = await loadAttempts();
  const { teacherOptions } = getStudentSourceOptions([...attempts, ...practiceExams]);
  const selectedSource =
    sourceParam !== undefined
      ? requestedSource
      : resolveSelectedStudentSource(
          cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
        );
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    teacherParam ?? cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ?? null,
  );
  const scopedSourceParam =
    selectedSource === ALL_SOURCES_CONTEXT ? undefined : selectedSource;
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
  const pageSizeCandidate = parsePositiveInt(attempt_page_size, 12);
  const pageSize = ATTEMPT_PAGE_SIZE_VALUES.includes(
    pageSizeCandidate as (typeof ATTEMPT_PAGE_SIZE_VALUES)[number],
  )
    ? pageSizeCandidate
    : 12;
  const totalAttemptPages = Math.max(1, Math.ceil(filteredAttempts.length / pageSize));
  const currentPage = Math.min(parsePositiveInt(attempt_page, 1), totalAttemptPages);
  const pagedAttempts = filteredAttempts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const showingStart = filteredAttempts.length ? (currentPage - 1) * pageSize + 1 : 0;
  const showingEnd = Math.min(currentPage * pageSize, filteredAttempts.length);
  const groupedAttempts = groupAttempts(pagedAttempts, groupOption);
  const inProgressCount = scopedAttempts.filter(
    (attempt) => attempt.status === "in_progress",
  ).length;
  const submittedCount = scopedAttempts.filter(
    (attempt) => attempt.status === "submitted",
  ).length;
  const practiceAttemptCount = scopedAttempts.filter(
    (attempt) => attempt.exam_type === "practice",
  ).length;
  const mockAttemptCount = scopedAttempts.length - practiceAttemptCount;
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
            ? "Track live tests, submitted attempts, and the next action for each one."
            : `Track ongoing tests and submitted attempts for ${selectedSubjectLabel}.`
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
              ? "Sign in with your student account to load attempt history."
              : "We couldn't load your attempt history right now. Please try again shortly."
          }
          bullets={
            source === "unconfigured"
              ? ["Student sign-in", "Attempt history"]
              : ["Connection check", "Attempt history"]
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
          description="Start an assigned exam to begin building your attempt timeline."
          ctaHref="/app/exams"
          ctaLabel="Open Exams"
          statusLabel="Waiting for first attempt"
        />
      ) : (
        <>
          <section className="contentCard studentWorkspaceFiltersCard studentAttemptsFiltersCard">
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
              <label className="studentWorkspaceFilterField">
                <span>Page size</span>
                <select defaultValue={String(pageSize)} name="attempt_page_size">
                  {ATTEMPT_PAGE_SIZE_VALUES.map((value) => (
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
                  href={buildAttemptFilterHref({
                    subject: scopedSubjectParam,
                    source: scopedSourceParam,
                    teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                  })}
                >
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="studentWorkspaceFilterQuickRow">
              <span className="studentWorkspaceFilterQuickLabel">Quick filters</span>
              <div className="studentWorkspaceFilterQuickChips">
                {[
                  { label: "All", href: buildAttemptFilterHref({ pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: statusFilter === "all" && sortOption === "latest" && groupOption === "none" },
                  { label: "In Progress", href: buildAttemptFilterHref({ status: "in_progress", sort: sortOption, group: groupOption, pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: statusFilter === "in_progress" },
                  { label: "Submitted", href: buildAttemptFilterHref({ status: "submitted", sort: sortOption, group: groupOption, pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: statusFilter === "submitted" },
                  { label: "Practice", href: buildAttemptFilterHref({ status: "practice", sort: sortOption, group: groupOption, pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: statusFilter === "practice" },
                  { label: "Mock Tests", href: buildAttemptFilterHref({ status: "mock", sort: sortOption, group: groupOption, pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: statusFilter === "mock" },
                  { label: "Highest Score", href: buildAttemptFilterHref({ status: statusFilter, sort: "highest", group: groupOption, pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: sortOption === "highest" },
                  { label: "Group by Status", href: buildAttemptFilterHref({ status: statusFilter, sort: sortOption, group: "status", pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: groupOption === "status" },
                ].map((chip) => (
                  <Link
                    key={chip.label}
                    className={`studentWorkspaceQuickChip${
                      chip.active ? " studentWorkspaceQuickChipActive" : ""
                    }`}
                    href={chip.href}
                    prefetch={false}
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
                { label: "Page size", value: pageSize !== 12 ? String(pageSize) : null },
              ]}
            />
          </section>

          {filteredAttempts.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching attempts"
              title="No attempts match these controls"
              description="Try broader filters or reset the controls to return to the full attempt history."
              ctaHref={buildAttemptFilterHref({
                subject: scopedSubjectParam,
                source: scopedSourceParam,
                teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
              })}
              ctaLabel="Reset attempt filters"
              statusLabel="Filter returned zero attempts"
            />
          ) : null}

          {filteredAttempts.length > 0 ? (
            <>
          <StudentKpiGrid
            className="resultsSummaryGrid studentAttemptsKpiGrid"
            items={[
              {
                label: "Total Attempts",
                value: filteredAttempts.length,
                note: "Visible in the current scope",
                tone: "primary",
              },
              {
                label: "In Progress",
                value: inProgressCount,
                note: "Ready to resume",
              },
              {
                label: "Evaluation Pending",
                value: submittedCount,
                note: "Summary available first",
              },
              {
                label: "Practice Attempts",
                value: practiceAttemptCount,
                note: `${mockAttemptCount} mock test${mockAttemptCount === 1 ? "" : "s"}`,
              },
            ]}
          />

          <section className="studentAttemptsQuickBar">
            {[
              { label: "All", count: filteredAttempts.length, href: buildAttemptFilterHref({ pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: statusFilter === "all" },
              { label: "In Progress", count: inProgressCount, href: buildAttemptFilterHref({ status: "in_progress", sort: sortOption, group: groupOption, pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: statusFilter === "in_progress" },
              { label: "Evaluation Pending", count: submittedCount, href: buildAttemptFilterHref({ status: "submitted", sort: sortOption, group: groupOption, pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: statusFilter === "submitted" },
              { label: "Practice", count: practiceAttemptCount, href: buildAttemptFilterHref({ status: "practice", sort: sortOption, group: groupOption, pageSize, subject: scopedSubjectParam, source: scopedSourceParam, teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined }), active: statusFilter === "practice" },
            ].map((tab) => (
              <Link
                key={tab.label}
                className={`studentAttemptsQuickTab${tab.active ? " studentAttemptsQuickTabActive" : ""}`}
                href={tab.href}
              >
                <span>{tab.label}</span>
                <strong>{tab.count}</strong>
              </Link>
            ))}
          </section>

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
              const submittedOutcomeState = resolveAttemptOutcomeState({
                resultVisible: false,
                reviewAvailable: false,
              });
              const attemptSubjectName = getMetadataSubjectName(attempt.metadata);
              const attemptSubjectLabel = getMetadataSubjectDisplayLabel(attempt.metadata);
              const practiceFollowUp = resolvePracticeFollowUpAction({
                exams: scopedPracticeExams,
                subjectName: attemptSubjectName || null,
              });

              return (
                <article className={`contentCard studentAttemptsCard${isInProgress ? " studentAttemptsCardLive" : ""}`} key={attempt.id}>
                  <div className="studentAttemptsCardHead">
                    <div className="studentAttemptsCardTitle">
                      <strong>{attempt.exam_title}</strong>
                      <span className="studentAttemptsCardMeta">
                        {attempt.exam_code}
                        {attemptSubjectLabel !== "Subject pending"
                          ? ` · ${attemptSubjectLabel}`
                          : ""}{" "}
                        · Attempt {attempt.attempt_no}
                      </span>
                    </div>
                    <div className="studentAttemptsCardStatus">
                      <span className={`statusPill ${attemptTone(attempt.status)}`}>
                        {compactAttemptStatusLabel({
                          isInProgress,
                          submittedOutcomeState,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="studentAttemptsCardSourceRow">
                    <span>{attemptSourceDescriptor(attempt)}</span>
                  </div>

                  <div className="studentAttemptsMetrics">
                    <div className="studentAttemptsMetric">
                      <span>{isInProgress ? "Progress" : "Score"}</span>
                      <strong>
                        {isInProgress
                          ? percentageLabel(attempt.percentage)
                          : percentageLabel(attempt.percentage)}
                      </strong>
                    </div>
                    <div className="studentAttemptsMetric">
                      <span>Attempted</span>
                      <strong>
                        {attempt.attempted_questions}/{attempt.total_questions}
                      </strong>
                    </div>
                    <div className="studentAttemptsMetric">
                      <span>Time Taken</span>
                      <strong>{durationMinutesLabel(attempt.time_taken_seconds)}</strong>
                    </div>
                  </div>

                  {!isInProgress ? (
                    <div className="studentAttemptsNotice">
                      <strong>{compactAttemptHeadline({
                        isInProgress,
                        currentSectionName,
                        submittedOutcomeState,
                      })}</strong>
                      <span>
                        {practiceFollowUp.exam
                          ? `${submittedCopy.progress} Practice follow-up is ready after summary.`
                          : submittedCopy.progress}
                      </span>
                    </div>
                  ) : (
                    <div className="studentAttemptsUpdateRow">
                      <span>Updated {studentDateTimeLabel(attempt.updated_at)}</span>
                    </div>
                  )}

                  <div className="studentAttemptsFooter">
                    {!isInProgress ? (
                      <div className="studentAttemptsUpdateRow">
                        <span>Updated {studentDateTimeLabel(attempt.updated_at)}</span>
                      </div>
                    ) : (
                      <div className="studentAttemptsContextRow">
                        <span>{compactAttemptHeadline({
                          isInProgress,
                          currentSectionName,
                          submittedOutcomeState,
                        })}</span>
                      </div>
                    )}
                    <div className="studentAttemptsActions">
                      {isInProgress ? (
                        <Link className="button buttonPrimary" href={`/app/attempts/${attempt.id}`}>
                          Resume Attempt
                        </Link>
                      ) : (
                        <Link
                          className="button buttonPrimary"
                          href={buildFilterHref(`/app/attempts/${attempt.id}/summary`, [
                            ["subject", scopedSubjectParam],
                            ["source", scopedSourceParam],
                            ["teacher", selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined],
                          ])}
                        >
                          {submittedCopy.primaryCta}
                        </Link>
                      )}
                      <Link
                        className="button buttonSecondary"
                        href={
                          isInProgress
                            ? `/app/exams/${attempt.exam}`
                            : buildFilterHref("/app/results", [
                                ["subject", scopedSubjectParam],
                                ["source", scopedSourceParam],
                                ["teacher", selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined],
                              ])
                        }
                      >
                        {isInProgress ? "View Details" : submittedCopy.secondaryCta}
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
          {filteredAttempts.length > 0 && totalAttemptPages > 1 ? (
            <section className="contentCard studentReviewPaginationCard">
              <div className="studentReviewPaginationBar">
                <div className="studentReviewPaginationSummary">
                  <span>
                    Page {currentPage} of {totalAttemptPages} · Showing {showingStart}-{showingEnd} of {filteredAttempts.length} attempts
                  </span>
                </div>
                <div className="studentReviewPaginationActions">
                  {currentPage > 1 ? (
                    <Link
                      className="button buttonGhost"
                      href={buildAttemptFilterHref({
                        status: statusFilter,
                        sort: sortOption,
                        group: groupOption,
                        page: currentPage - 1,
                        pageSize,
                        subject: scopedSubjectParam,
                        source: scopedSourceParam,
                        teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                      })}
                    >
                      Previous page
                    </Link>
                  ) : null}
                  {currentPage < totalAttemptPages ? (
                    <Link
                      className="button buttonPrimary"
                      href={buildAttemptFilterHref({
                        status: statusFilter,
                        sort: sortOption,
                        group: groupOption,
                        page: currentPage + 1,
                        pageSize,
                        subject: scopedSubjectParam,
                        source: scopedSourceParam,
                        teacher: selectedSource === "teacher" ? selectedTeacherId ?? undefined : undefined,
                      })}
                    >
                      Next page
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
