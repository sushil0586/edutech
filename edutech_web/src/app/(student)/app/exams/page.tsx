import { cookies } from "next/headers";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import type { StudentAvailableExam } from "@/features/dashboard/types";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
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
  getExamSubjectDisplayLabel,
  getStudentSubjectOptions,
  resolveSelectedStudentSubject,
  selectedStudentSourceLabel,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";
import { buildFilterHref, formatFilterValue } from "@/lib/workspace/filter-utils";

type SourceFilterValue = "all" | "platform" | "institute" | "teacher";
type ExamAvailabilityFilter =
  | "all"
  | "ready"
  | "resume"
  | "upcoming"
  | "completed"
  | "locked";
type ExamSortOption = "recommended" | "start_soon" | "duration_short" | "duration_long" | "title";
type ExamGroupOption = "none" | "availability" | "source" | "security";

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
      return formatFilterValue(state);
  }
}

function actionLabel(args: {
  canResume: boolean;
  canStart: boolean;
  hasAttemptHistory: boolean;
  reviewAvailable: boolean;
  isLocked: boolean;
  canUnlockWithStars: boolean;
  starCost: number;
}) {
  if (args.canResume) return "Resume";
  if (args.canStart) return "Start";
  if (args.isLocked && args.canUnlockWithStars) return `Unlock with ${args.starCost} stars`;
  if (args.reviewAvailable && args.hasAttemptHistory) return "Open review";
  if (args.hasAttemptHistory) return "Open summary";
  return "View detail";
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
    return "You can start this mock test now. Starting creates a live backend attempt immediately and sends you into the timed workspace.";
  }

  if (exam.review_available) {
    return "Attempt history is available here. Open the latest attempt to see the summary or review experience that is currently allowed by policy.";
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

function resolveExamAvailabilityFilter(value?: string): ExamAvailabilityFilter {
  switch (value) {
    case "ready":
    case "resume":
    case "upcoming":
    case "completed":
    case "locked":
      return value;
    default:
      return "all";
  }
}

function resolveExamSortOption(value?: string): ExamSortOption {
  switch (value) {
    case "start_soon":
    case "duration_short":
    case "duration_long":
    case "title":
      return value;
    default:
      return "recommended";
  }
}

function resolveExamGroupOption(value?: string): ExamGroupOption {
  switch (value) {
    case "availability":
    case "source":
    case "security":
      return value;
    default:
      return "none";
  }
}

function applyExamAvailabilityFilter(exams: StudentAvailableExam[], filter: ExamAvailabilityFilter) {
  switch (filter) {
    case "ready":
      return exams.filter((exam) => exam.can_start);
    case "resume":
      return exams.filter((exam) => exam.can_resume);
    case "upcoming":
      return exams.filter((exam) => exam.availability_state === "upcoming");
    case "completed":
      return exams.filter((exam) => exam.availability_state === "completed");
    case "locked":
      return exams.filter((exam) => exam.economy_access.is_locked || exam.availability_state === "locked");
    default:
      return exams;
  }
}

function sortExams(exams: StudentAvailableExam[], sortBy: ExamSortOption) {
  const sortable = [...exams];
  const recommendedRank = (exam: StudentAvailableExam) => {
    if (exam.can_resume) return 0;
    if (exam.can_start) return 1;
    if (exam.availability_state === "upcoming") return 2;
    if (exam.result_published) return 3;
    return 4;
  };

  sortable.sort((left, right) => {
    switch (sortBy) {
      case "start_soon": {
        const leftTime = left.start_at ? Date.parse(left.start_at) : Number.MAX_SAFE_INTEGER;
        const rightTime = right.start_at ? Date.parse(right.start_at) : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }
      case "duration_short":
        return left.duration_minutes - right.duration_minutes;
      case "duration_long":
        return right.duration_minutes - left.duration_minutes;
      case "title":
        return left.title.localeCompare(right.title);
      case "recommended":
      default: {
        const rankDiff = recommendedRank(left) - recommendedRank(right);
        if (rankDiff !== 0) return rankDiff;
        return left.title.localeCompare(right.title);
      }
    }
  });

  return sortable;
}

function buildExamGroupLabel(exam: StudentAvailableExam, groupBy: ExamGroupOption) {
  if (groupBy === "availability") {
    return formatExamState(exam.availability_state);
  }
  if (groupBy === "source") {
    return examSourceDescriptor(exam);
  }
  if (groupBy === "security") {
    return securityModeLabel(exam);
  }
  return "Mock tests";
}

function groupExams(exams: StudentAvailableExam[], groupBy: ExamGroupOption) {
  if (groupBy === "none") {
    return [{ label: "All mock tests", items: exams }];
  }

  const buckets = new Map<string, StudentAvailableExam[]>();
  for (const exam of exams) {
    const label = buildExamGroupLabel(exam, groupBy);
    buckets.set(label, [...(buckets.get(label) ?? []), exam]);
  }
  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

function buildExamFilterHref(args: {
  availability?: ExamAvailabilityFilter;
  sort?: ExamSortOption;
  group?: ExamGroupOption;
}) {
  return buildFilterHref("/app/exams", [
    ["exam_availability", args.availability, "all"],
    ["exam_sort", args.sort, "recommended"],
    ["exam_group", args.group, "none"],
  ]);
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
    exam_availability?: string;
    exam_sort?: string;
    exam_group?: string;
  }>;
}) {
  const {
    error,
    message,
    source: sourceParam,
    teacher: teacherParam,
    subject: subjectParam,
    exam_availability,
    exam_sort,
    exam_group,
  } =
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
  const availabilityFilter = resolveExamAvailabilityFilter(exam_availability);
  const sortOption = resolveExamSortOption(exam_sort);
  const groupOption = resolveExamGroupOption(exam_group);
  const visibleMockExams = sortExams(
    applyExamAvailabilityFilter(mockExams, availabilityFilter),
    sortOption,
  );
  const groupedMockExams = groupExams(visibleMockExams, groupOption);
  const readyCount = visibleMockExams.filter((exam) => exam.can_start).length;
  const resumeCount = visibleMockExams.filter((exam) => exam.can_resume).length;
  const publishedCount = visibleMockExams.filter((exam) => exam.result_published).length;
  const featuredExam =
    visibleMockExams.find((exam) => exam.can_resume) ??
    visibleMockExams.find((exam) => exam.can_start) ??
    visibleMockExams.find((exam) => exam.availability_state === "upcoming") ??
    visibleMockExams[0] ??
    null;
  const featuredExamSubjectLabel = featuredExam
    ? getExamSubjectDisplayLabel(featuredExam)
    : null;

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerExamsPage">
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
                      featuredExamSubjectLabel ? ` · ${featuredExamSubjectLabel}` : ""
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

          <section className="contentCard studentWorkspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Mock Test Controls</strong>
              <span>
                {visibleMockExams.length} shown
                {visibleMockExams.length !== mockExams.length ? ` of ${mockExams.length}` : ""}
              </span>
            </div>
            <form className="studentWorkspaceFiltersForm" method="GET">
              <label className="studentWorkspaceFilterField">
                <span>Availability</span>
                <select defaultValue={availabilityFilter} name="exam_availability">
                  <option value="all">All mock tests</option>
                  <option value="ready">Ready now</option>
                  <option value="resume">Resume active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="locked">Locked / gated</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Sort by</span>
                <select defaultValue={sortOption} name="exam_sort">
                  <option value="recommended">Recommended order</option>
                  <option value="start_soon">Starts soonest</option>
                  <option value="duration_short">Shortest duration</option>
                  <option value="duration_long">Longest duration</option>
                  <option value="title">Title A-Z</option>
                </select>
              </label>
              <label className="studentWorkspaceFilterField">
                <span>Group by</span>
                <select defaultValue={groupOption} name="exam_group">
                  <option value="none">No grouping</option>
                  <option value="availability">Availability</option>
                  <option value="source">Source</option>
                  <option value="security">Security mode</option>
                </select>
              </label>
              <div className="studentWorkspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
                </button>
                <Link className="button buttonSecondary" href="/app/exams">
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="studentWorkspaceFilterQuickRow">
              <span className="studentWorkspaceFilterQuickLabel">Quick filters</span>
              <div className="studentWorkspaceFilterQuickChips">
                <Link
                  className={`studentWorkspaceQuickChip ${availabilityFilter === "all" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ sort: sortOption, group: groupOption })}
                >
                  All
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${availabilityFilter === "ready" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: "ready", sort: sortOption, group: groupOption })}
                >
                  Ready Now
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${availabilityFilter === "resume" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: "resume", sort: sortOption, group: groupOption })}
                >
                  Resume
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${availabilityFilter === "locked" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: "locked", sort: sortOption, group: groupOption })}
                >
                  Locked
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "start_soon" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: availabilityFilter, sort: "start_soon", group: groupOption })}
                >
                  Starts Soon
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "duration_short" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: availabilityFilter, sort: "duration_short", group: groupOption })}
                >
                  Shortest
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${groupOption === "availability" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: availabilityFilter, sort: sortOption, group: "availability" })}
                >
                  Group by Availability
                </Link>
              </div>
            </div>
            <FilterSummaryPills
              className="studentWorkspaceFilterChips"
              items={[
                { label: "Availability", value: formatFilterValue(availabilityFilter) },
                { label: "Sort", value: formatFilterValue(sortOption) },
                { label: "Group", value: formatFilterValue(groupOption) },
              ]}
            />
          </section>

          {visibleMockExams.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching mock tests"
              title="No mock tests match these controls"
              description="Broaden the availability filter, change the grouping, or reset the controls to return to the full mock-test list."
              ctaHref="/app/exams"
              ctaLabel="Reset mock-test filters"
              statusLabel="Filter returned zero mock tests"
            />
          ) : null}

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
                  {featuredExamSubjectLabel ? (
                    <StatusPill tone="demo">{featuredExamSubjectLabel}</StatusPill>
                  ) : null}
                </div>

                <div className="studentResultFooter">
                  <div className="studentResultHelper">
                    <span>Next action</span>
                    <strong>
                    {actionLabel({
                      canResume: featuredExam.can_resume,
                      canStart: featuredExam.can_start,
                      hasAttemptHistory: attempts.some((attempt) => attempt.exam === featuredExam.id),
                      reviewAvailable: featuredExam.review_available,
                      isLocked: featuredExam.economy_access.is_locked,
                      canUnlockWithStars: featuredExam.economy_access.can_unlock_with_stars,
                      starCost: featuredExam.economy_access.star_cost,
                    })}
                    </strong>
                    <small>{examAvailabilityGuidance(featuredExam)}</small>
                  </div>
                  <div className="studentInsightHeroActions">
                    {featuredExam.economy_access.is_locked && featuredExam.economy_access.can_unlock_with_stars ? (
                      <>
                        <form action={unlockExamAction}>
                          <input name="exam_id" type="hidden" value={featuredExam.id} />
                          <input name="content_type" type="hidden" value={featuredExam.economy_access.content_type} />
                          <input name="content_key" type="hidden" value={featuredExam.economy_access.content_key} />
                          <input name="subject_id" type="hidden" value={featuredExam.economy_access.subject_id ?? ""} />
                          <ActionSubmitButton
                            className="button buttonPrimary"
                            idleLabel={`Unlock with ${featuredExam.economy_access.star_cost} stars`}
                            pendingLabel="Unlocking..."
                          />
                        </form>
                        <Link className="button buttonSecondary" href="/app/wallet">
                          Open Wallet
                        </Link>
                      </>
                    ) : (
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
                        {actionLabel({
                          canResume: featuredExam.can_resume,
                          canStart: featuredExam.can_start,
                          hasAttemptHistory: attempts.some((attempt) => attempt.exam === featuredExam.id),
                          reviewAvailable: featuredExam.review_available,
                          isLocked: featuredExam.economy_access.is_locked,
                          canUnlockWithStars: featuredExam.economy_access.can_unlock_with_stars,
                          starCost: featuredExam.economy_access.star_cost,
                        })}
                      </Link>
                    )}
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

          {visibleMockExams.length > 0 ? groupedMockExams.map((group) => (
            <section className="studentResultsGroupedSection" key={group.label}>
              {groupOption !== "none" ? (
                <div className="sectionHeading sectionHeadingCompact">
                  <strong>{group.label}</strong>
                  <span>{group.items.length} mock tests</span>
                </div>
              ) : null}
              <div className="studentResultsGrid">
            {group.items.map((exam) => {
              const latestAttempt = attempts.find((attempt) => attempt.exam === exam.id) ?? null;
              const examSubjectLabel = getExamSubjectDisplayLabel(exam);
              const primaryLabel = actionLabel({
                canResume: exam.can_resume,
                canStart: exam.can_start,
                hasAttemptHistory: Boolean(latestAttempt),
                reviewAvailable: exam.review_available,
                isLocked: exam.economy_access.is_locked,
                canUnlockWithStars: exam.economy_access.can_unlock_with_stars,
                starCost: exam.economy_access.star_cost,
              });
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
                        {examSubjectLabel ? ` · ${examSubjectLabel}` : ""}
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
              </div>
            </section>
          )) : null}
        </>
      )}
    </div>
  );
}
