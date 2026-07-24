import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import type { StudentAvailableExam } from "@/features/dashboard/types";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StudentWorkspaceLink as Link } from "@/components/ui/student-workspace-link";
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
const EXAM_PAGE_SIZE_VALUES = [6, 12, 18] as const;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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
  if (args.canResume) return "Resume Test";
  if (args.canStart) return "Start Test";
  if (args.isLocked && args.canUnlockWithStars) return `Unlock with ${args.starCost} Stars`;
  if (args.reviewAvailable && args.hasAttemptHistory) return "Open Review";
  if (args.hasAttemptHistory) return "Open Summary";
  return "View Details";
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
    subscription_resolution?: {
      is_applicable: boolean;
      is_covered: boolean;
      included_allowance: number;
      remaining_allowance: number;
      reason_message: string;
    };
  };
}) {
  if (exam.can_resume && exam.active_attempt) {
    return "Your latest active attempt is still live. Continue where you left off.";
  }

  if (exam.economy_access.subscription_resolution?.is_applicable) {
    if (exam.economy_access.subscription_resolution.is_covered) {
      return `Subscription-covered. ${exam.economy_access.subscription_resolution.remaining_allowance} of ${exam.economy_access.subscription_resolution.included_allowance} allowance attempts remain in this billing cycle.`;
    }
    if (exam.economy_access.can_unlock_with_stars) {
      return `Subscription allowance is exhausted, but this exam can still be unlocked with ${exam.economy_access.star_cost} stars.`;
    }
  }

  if (exam.economy_access.is_locked && exam.economy_access.can_unlock_with_stars) {
    return `${exam.economy_access.star_cost} stars are required before this mock test can start.`;
  }

  if (exam.economy_access.is_locked) {
    return (
      exam.economy_access.lock_reason_message ||
      "This mock test is currently locked."
    );
  }

  if (exam.can_start) {
    return "This mock test is ready to start now.";
  }

  if (exam.review_available) {
    return "Attempt history is available here. Open the latest attempt for summary or review.";
  }

  if (exam.remaining_attempts === 0) {
    return "You have used all available attempts for this mock test.";
  }

  if (exam.availability_state === "upcoming") {
    return "This mock test is assigned, but not open yet.";
  }

  if (exam.availability_state === "completed") {
    return "This mock test window is closed. You can still open past attempt history if it is available.";
  }

  return "Open the detail page to review availability and the next action you can take.";
}

function subscriptionAllowanceBadge(exam: StudentAvailableExam) {
  const summary = exam.economy_access.subscription_resolution;
  if (!summary?.is_applicable) {
    return null;
  }
  if (summary.is_covered) {
    return `${summary.remaining_allowance}/${summary.included_allowance} allowance left`;
  }
  return "Allowance exhausted";
}

function compactExamHeadline(args: {
  canResume: boolean;
  canStart: boolean;
  hasAttemptHistory: boolean;
  reviewAvailable: boolean;
  isLocked: boolean;
  canUnlockWithStars: boolean;
}) {
  if (args.canResume) return "Resume available";
  if (args.canStart) return "Ready to start";
  if (args.isLocked && args.canUnlockWithStars) return "Unlock required";
  if (args.reviewAvailable && args.hasAttemptHistory) return "Review available";
  if (args.hasAttemptHistory) return "Summary available";
  if (args.isLocked) return "Access controlled";
  return "View details";
}

function detailCtaLabel() {
  return "View Details";
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
  page?: number;
  pageSize?: number;
}) {
  return buildFilterHref("/app/exams", [
    ["exam_availability", args.availability, "all"],
    ["exam_sort", args.sort, "recommended"],
    ["exam_group", args.group, "none"],
    ["exam_page", args.page ? String(args.page) : undefined, "1"],
    ["exam_page_size", args.pageSize ? String(args.pageSize) : undefined, "12"],
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
    exam_page?: string;
    exam_page_size?: string;
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
    exam_page,
    exam_page_size,
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
  const pageSizeCandidate = parsePositiveInt(exam_page_size, 12);
  const pageSize = EXAM_PAGE_SIZE_VALUES.includes(
    pageSizeCandidate as (typeof EXAM_PAGE_SIZE_VALUES)[number],
  )
    ? pageSizeCandidate
    : 12;
  const totalExamPages = Math.max(1, Math.ceil(visibleMockExams.length / pageSize));
  const currentPage = Math.min(parsePositiveInt(exam_page, 1), totalExamPages);
  const pagedMockExams = visibleMockExams.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const showingStart = visibleMockExams.length ? (currentPage - 1) * pageSize + 1 : 0;
  const showingEnd = Math.min(currentPage * pageSize, visibleMockExams.length);
  const groupedMockExams = groupExams(pagedMockExams, groupOption);
  const readyCount = visibleMockExams.filter((exam) => exam.can_start).length;
  const resumeCount = visibleMockExams.filter((exam) => exam.can_resume).length;
  const lockedCount = visibleMockExams.filter(
    (exam) => exam.economy_access.is_locked || exam.availability_state === "locked",
  ).length;
  const publishedCount = visibleMockExams.filter((exam) => exam.result_published).length;
  const featuredExam =
    pagedMockExams.find((exam) => exam.can_resume) ??
    pagedMockExams.find((exam) => exam.can_start) ??
    pagedMockExams.find((exam) => exam.availability_state === "upcoming") ??
    pagedMockExams[0] ??
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
            ? "Open mock tests, continue live attempts, and see the next valid action at a glance."
            : `Open mock tests and continue live attempts for ${selectedSubjectLabel}.`
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
              ? "Sign in with your student account to load assigned mock tests."
              : "We couldn't load your mock tests right now. Please try again shortly."
          }
          bullets={
            source === "unconfigured"
              ? ["Student sign-in", "Assigned mock tests"]
              : ["Connection check", "Mock test availability"]
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
              ? "No mock tests are available right now. Practice is still available between assigned tests."
              : "Try changing source, teacher, or subject filters."
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
          <StudentKpiGrid
            className="resultsSummaryGrid studentAttemptsKpiGrid"
            items={[
              {
                label: "Ready Now",
                value: readyCount,
                note: "Start immediately",
                tone: "primary",
              },
              {
                label: "Resume Active",
                value: resumeCount,
                note: "Continue live attempts",
              },
              {
                label: "Locked / Gated",
                value: lockedCount,
                note: `${publishedCount} results visible`,
              },
              {
                label: "Wallet Stars",
                value: wallet ? wallet.available_stars.toLocaleString("en-IN") : "--",
                note: "Current unlock balance",
              },
            ]}
          />

          <section className="contentCard studentWorkspaceFiltersCard studentAttemptsFiltersCard">
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
              <label className="studentWorkspaceFilterField">
                <span>Page size</span>
                <select defaultValue={String(pageSize)} name="exam_page_size">
                  {EXAM_PAGE_SIZE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value} per page
                    </option>
                  ))}
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
                  href={buildExamFilterHref({ sort: sortOption, group: groupOption, pageSize })}
                  prefetch={false}
                >
                  All
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${availabilityFilter === "ready" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: "ready", sort: sortOption, group: groupOption, pageSize })}
                  prefetch={false}
                >
                  Ready Now
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${availabilityFilter === "resume" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: "resume", sort: sortOption, group: groupOption, pageSize })}
                  prefetch={false}
                >
                  Resume
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${availabilityFilter === "locked" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: "locked", sort: sortOption, group: groupOption, pageSize })}
                  prefetch={false}
                >
                  Locked
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "start_soon" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: availabilityFilter, sort: "start_soon", group: groupOption, pageSize })}
                  prefetch={false}
                >
                  Starts Soon
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${sortOption === "duration_short" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: availabilityFilter, sort: "duration_short", group: groupOption, pageSize })}
                  prefetch={false}
                >
                  Shortest
                </Link>
                <Link
                  className={`studentWorkspaceQuickChip ${groupOption === "availability" ? "studentWorkspaceQuickChipActive" : ""}`}
                  href={buildExamFilterHref({ availability: availabilityFilter, sort: sortOption, group: "availability", pageSize })}
                  prefetch={false}
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
                { label: "Page size", value: pageSize !== 12 ? String(pageSize) : null },
              ]}
            />
          </section>

          <section className="studentAttemptsQuickBar">
            {[
              {
                label: "All",
                count: visibleMockExams.length,
                href: buildExamFilterHref({ sort: sortOption, group: groupOption, pageSize }),
                active: availabilityFilter === "all",
              },
              {
                label: "Ready Now",
                count: readyCount,
                href: buildExamFilterHref({ availability: "ready", sort: sortOption, group: groupOption, pageSize }),
                active: availabilityFilter === "ready",
              },
              {
                label: "Resume",
                count: resumeCount,
                href: buildExamFilterHref({ availability: "resume", sort: sortOption, group: groupOption, pageSize }),
                active: availabilityFilter === "resume",
              },
              {
                label: "Locked",
                count: lockedCount,
                href: buildExamFilterHref({ availability: "locked", sort: sortOption, group: groupOption, pageSize }),
                active: availabilityFilter === "locked",
              },
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

          {visibleMockExams.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching mock tests"
              title="No mock tests match these controls"
              description="Broaden the filters or reset the controls to return to the full mock-test list."
              ctaHref="/app/exams"
              ctaLabel="Reset mock-test filters"
              statusLabel="Filter returned zero mock tests"
            />
          ) : null}

          {featuredExam ? (
            <section className="studentResultsGroupedSection">
              <div className="sectionHeading">
                <strong>Recommended Test</strong>
                <span>
                  {featuredExam.code}
                  {featuredExamSubjectLabel ? ` · ${featuredExamSubjectLabel}` : ""}
                </span>
              </div>
              <article className="contentCard studentResultSurface studentExamCompactCard">
                <div className="studentAttemptsCardHead">
                  <div className="studentAttemptsCardTitle">
                    <strong>{featuredExam.title}</strong>
                    <span className="studentAttemptsCardMeta">
                      {featuredExam.code}
                      {featuredExamSubjectLabel ? ` · ${featuredExamSubjectLabel}` : ""}
                    </span>
                  </div>
                  <div className="studentAttemptsCardStatus">
                    <StatusPill tone={examStateTone(featuredExam.availability_state)}>
                      {formatExamState(featuredExam.availability_state)}
                    </StatusPill>
                  </div>
                </div>

                <div className="studentAttemptsCardSourceRow">
                  <span>
                    {examSourceDescriptor(featuredExam)} · {securityModeLabel(featuredExam)}
                  </span>
                </div>

                <div className="studentExamMetrics">
                  <div className="studentAttemptsMetric">
                    <span>Duration</span>
                    <strong>{featuredExam.duration_minutes}m</strong>
                  </div>
                  <div className="studentAttemptsMetric">
                    <span>Attempts</span>
                    <strong>{featuredExam.remaining_attempts}</strong>
                  </div>
                  <div className="studentAttemptsMetric">
                    <span>Marks</span>
                    <strong>{featuredExam.total_marks}</strong>
                  </div>
                  <div className="studentAttemptsMetric">
                    <span>Access</span>
                    <strong>{subscriptionAllowanceBadge(featuredExam) ?? "Open"}</strong>
                  </div>
                </div>

                <div className="studentAttemptsNotice">
                  <strong>
                    {compactExamHeadline({
                      canResume: featuredExam.can_resume,
                      canStart: featuredExam.can_start,
                      hasAttemptHistory: attempts.some((attempt) => attempt.exam === featuredExam.id),
                      reviewAvailable: featuredExam.review_available,
                      isLocked: featuredExam.economy_access.is_locked,
                      canUnlockWithStars: featuredExam.economy_access.can_unlock_with_stars,
                    })}
                  </strong>
                  <span>{examAvailabilityGuidance(featuredExam)}</span>
                </div>

                <div className="studentAttemptsFooter">
                  <div className="studentAttemptsUpdateRow">
                    <span>
                      {featuredExam.start_at
                        ? `Starts ${studentDateTimeLabel(featuredExam.start_at)}`
                        : "Check details for timing, history, and access rules."}
                    </span>
                  </div>
                  <div className="studentAttemptsActions studentExamActions">
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
                      {detailCtaLabel()}
                    </Link>
                  </div>
                  {featuredExam.access_key_enabled ? (
                    <div className="studentExamUtilityLinkRow">
                      <Link className="studentDashboardTextLink" href="/app/exams/enter-key">
                        Use Exam Key
                      </Link>
                    </div>
                  ) : null}
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
                <article className="contentCard studentResultSurface studentExamCompactCard" key={exam.id}>
                  <div className="studentAttemptsCardHead">
                    <div className="studentAttemptsCardTitle">
                      <strong>{exam.title}</strong>
                      <span className="studentAttemptsCardMeta">
                        {exam.code} · {examSourceDescriptor(exam)}
                        {examSubjectLabel ? ` · ${examSubjectLabel}` : ""}
                      </span>
                    </div>
                    <div className="studentAttemptsCardStatus">
                      <StatusPill tone={examStateTone(exam.availability_state)}>
                        {formatExamState(exam.availability_state)}
                      </StatusPill>
                    </div>
                  </div>

                  <div className="studentAttemptsCardSourceRow">
                    <span>{securityModeLabel(exam)}</span>
                  </div>

                  <div className="studentExamMetrics">
                    <div className="studentAttemptsMetric">
                      <span>Duration</span>
                      <strong>{exam.duration_minutes}m</strong>
                    </div>
                    <div className="studentAttemptsMetric">
                      <span>Attempts</span>
                      <strong>{exam.remaining_attempts}</strong>
                    </div>
                    <div className="studentAttemptsMetric">
                      <span>Marks</span>
                      <strong>{exam.total_marks}</strong>
                    </div>
                    <div className="studentAttemptsMetric">
                      <span>Passing</span>
                      <strong>{exam.passing_marks}</strong>
                    </div>
                  </div>

                  <div className="studentAttemptsNotice">
                    <strong>
                      {compactExamHeadline({
                        canResume: exam.can_resume,
                        canStart: exam.can_start,
                        hasAttemptHistory: Boolean(latestAttempt),
                        reviewAvailable: exam.review_available,
                        isLocked: exam.economy_access.is_locked,
                        canUnlockWithStars: exam.economy_access.can_unlock_with_stars,
                      })}
                    </strong>
                    <span>{examAvailabilityGuidance(exam)}</span>
                  </div>

                  <div className="studentAttemptsFooter">
                    <div className="studentAttemptsUpdateRow">
                      <span>
                        {exam.start_at
                          ? `Starts ${studentDateTimeLabel(exam.start_at)}`
                          : "Availability follows the current policy."}
                      </span>
                    </div>
                    <div className="studentAttemptsActions studentExamActions">
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
                          <Link className="button buttonSecondary" href="/app/wallet">
                            Open Wallet
                          </Link>
                        </>
                      ) : (
                        <Link className="button buttonPrimary" href={primaryHref}>
                          {primaryLabel}
                        </Link>
                      )}
                      <Link className="button buttonSecondary" href={`/app/exams/${exam.id}`}>
                        {detailCtaLabel()}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
              </div>
            </section>
          )) : null}

          {visibleMockExams.length > 0 ? (
            <section className="contentCard studentCatalogPaginationCard">
              <div className="studentCatalogPaginationSummary">
                <span>{`Page ${currentPage} of ${totalExamPages}`}</span>
                <strong>{`Showing ${showingStart}-${showingEnd} of ${visibleMockExams.length} mock tests`}</strong>
              </div>
              <div className="studentCatalogPaginationActions">
                <Link
                  className="button buttonSecondary"
                  href={buildExamFilterHref({
                    availability: availabilityFilter,
                    sort: sortOption,
                    group: groupOption,
                    page: Math.max(1, currentPage - 1),
                    pageSize,
                  })}
                >
                  Previous page
                </Link>
                <Link
                  className="button buttonPrimary"
                  href={buildExamFilterHref({
                    availability: availabilityFilter,
                    sort: sortOption,
                    group: groupOption,
                    page: Math.min(totalExamPages, currentPage + 1),
                    pageSize,
                  })}
                >
                  Next page
                </Link>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
