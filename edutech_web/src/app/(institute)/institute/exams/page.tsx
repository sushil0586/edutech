import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { OperatorWorkspaceLink as Link } from "@/components/ui/operator-workspace-link";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import type { TeacherExamListItem, TeacherResultSummary } from "@/features/dashboard/types";
import { fetchPortalList } from "@/lib/api/portal";
import { fetchTeacherExamPage, fetchTeacherResultSummary, getTeacherApiState } from "@/lib/api/teacher";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { buildFilterHref, formatFilterValue, resolveFilterValue } from "@/lib/workspace/filter-utils";

type InstituteExam = TeacherExamListItem;
type InstituteExamStatusFilter = "all" | "live" | "scheduled" | "draft" | "completed";
type InstituteExamSortOption =
  | "recommended"
  | "start_soon"
  | "duration_short"
  | "learners_high"
  | "marks_high"
  | "title";
type InstituteExamGroupOption = "none" | "status" | "type" | "subject";
type TeacherOption = {
  id: string;
  full_name: string;
  employee_code: string;
  is_active: boolean;
};

type ExamLifecycleGuidance = {
  statusLabel: string;
  summary: string;
  nextStep: string;
};

function titleCase(value: string) {
  return formatFilterValue(value);
}

function getExamLifecycleGuidance(
  exam: InstituteExam,
  summary: TeacherResultSummary | null,
): ExamLifecycleGuidance {
  if (exam.status === "draft") {
    return {
      statusLabel: "Draft setup",
      summary: "This exam is still being prepared and is not learner-ready yet.",
      nextStep: "Use Setup to review sections, questions, and learner assignment before publishing or scheduling.",
    };
  }

  if (exam.status === "scheduled") {
    return {
      statusLabel: "Scheduled delivery",
      summary: exam.start_at
        ? `This exam is scheduled and will become available when the start time arrives.`
        : "This exam is scheduled, but you should still confirm the delivery window.",
      nextStep: "Open Exam to confirm timing, assigned learners, and publish readiness before it goes live.",
    };
  }

  if (exam.status === "live") {
    return {
      statusLabel: "Live now",
      summary: "Learners can currently attempt this exam.",
      nextStep: summary?.review_blocked
        ? "Watch attempt activity now, then clear review blockers before publishing results."
        : "Monitor attempts and prepare the results workflow once submissions are complete.",
    };
  }

  if (summary?.results_published) {
    return {
      statusLabel: "Completed and published",
      summary: "Delivery is finished and learner-visible results are already published.",
      nextStep: "Open Exam to review the final configuration, or move to Results if learners need post-exam support.",
    };
  }

  if (summary?.review_blocked) {
    return {
      statusLabel: "Completed with review blockers",
      summary: `Delivery is finished, but ${summary.pending_review_tasks_count} review task${summary.pending_review_tasks_count === 1 ? "" : "s"} still block result publication.`,
      nextStep: "Open Exam and then move to Results so pending review work can be cleared before publishing.",
    };
  }

  if (exam.status === "completed") {
    return {
      statusLabel: "Completed delivery",
      summary: "Learner delivery is finished, but the results workflow still needs to be checked.",
      nextStep: summary
        ? "Open Exam and verify results readiness before publishing learner-visible outcomes."
        : "Open Exam to confirm lifecycle completion and create the first result summary if it is still missing.",
    };
  }

  return {
    statusLabel: titleCase(exam.status),
    summary: "Review this exam row before making delivery or results decisions.",
    nextStep: "Open Exam for the full lifecycle and assignment detail.",
  };
}

function resolveInstituteExamStatusFilter(value?: string): InstituteExamStatusFilter {
  return resolveFilterValue(value, ["live", "scheduled", "draft", "completed"], "all");
}

function resolveInstituteExamSortOption(value?: string): InstituteExamSortOption {
  return resolveFilterValue(value, ["start_soon", "duration_short", "learners_high", "marks_high", "title"], "recommended");
}

function resolveInstituteExamGroupOption(value?: string): InstituteExamGroupOption {
  return resolveFilterValue(value, ["status", "type", "subject"], "none");
}

function buildInstituteExamGroupLabel(exam: InstituteExam, groupBy: InstituteExamGroupOption) {
  if (groupBy === "status") return titleCase(exam.status);
  if (groupBy === "type") return titleCase(exam.exam_type);
  if (groupBy === "subject") return exam.subject_name || "Unassigned subject";
  return "Exams";
}

function groupInstituteExams(exams: InstituteExam[], groupBy: InstituteExamGroupOption) {
  if (groupBy === "none") {
    return [{ label: "All exams", items: exams }];
  }

  const buckets = new Map<string, InstituteExam[]>();
  for (const exam of exams) {
    const label = buildInstituteExamGroupLabel(exam, groupBy);
    buckets.set(label, [...(buckets.get(label) ?? []), exam]);
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

function buildInstituteExamFilterHref(args: {
  status?: InstituteExamStatusFilter;
  sort?: InstituteExamSortOption;
  group?: InstituteExamGroupOption;
  teacher?: string;
  page?: number;
  pageSize?: number;
}) {
  return buildFilterHref("/institute/exams", [
    ["exam_status", args.status, "all"],
    ["exam_sort", args.sort, "recommended"],
    ["exam_group", args.group, "none"],
    ["teacher", args.teacher, ""],
    ["exam_page", args.page ? String(args.page) : undefined, "1"],
    ["exam_page_size", args.pageSize ? String(args.pageSize) : undefined, "12"],
  ]);
}

function normalizeTeacherFilter(value: string | undefined, teachers: TeacherOption[]) {
  if (!value) {
    return "";
  }

  return teachers.some((teacher) => teacher.id === value) ? value : "";
}

async function loadInstituteExams(
  statusFilter: InstituteExamStatusFilter,
  sortOption: InstituteExamSortOption,
  teacherFilter: string,
  page: number,
  pageSize: number,
  includeBaselineCount: boolean,
) {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      examsPage: null,
      resultSummary: [] as TeacherResultSummary[],
    };
  }

  try {
    const [examsPage, resultSummary, baselineExamsPage] = await Promise.all([
      fetchTeacherExamPage({
        page,
        pageSize,
        filter: statusFilter,
        sort: sortOption,
        teacher: teacherFilter || undefined,
      }),
      fetchTeacherResultSummary(),
      includeBaselineCount
        ? fetchTeacherExamPage({
            page: 1,
            pageSize: 1,
          })
        : Promise.resolve(null),
    ]);

    return {
      source: "live" as const,
      examsPage,
      resultSummary,
      baselineExamsPage,
    };
  } catch {
    return {
      source: "error" as const,
      examsPage: null,
      resultSummary: [] as TeacherResultSummary[],
      baselineExamsPage: null,
    };
  }
}

export default async function InstituteExamsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    exam_status?: string;
    exam_sort?: string;
    exam_group?: string;
    teacher?: string;
    exam_page?: string;
    exam_page_size?: string;
  }>;
}) {
  const profile = await requireInstituteAdminSession();
  const params = (await searchParams) ?? {};
  const teachers = await fetchPortalList<TeacherOption>(
    `/api/v1/teachers/${profile.institute ? `?institute=${profile.institute}&page_size=100` : "?page_size=100"}`,
  ).catch(() => []);
  const teacherFilter = normalizeTeacherFilter(params.teacher, teachers);
  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherFilter) ?? null;
  const statusFilter = resolveInstituteExamStatusFilter(params.exam_status);
  const sortOption = resolveInstituteExamSortOption(params.exam_sort);
  const groupOption = resolveInstituteExamGroupOption(params.exam_group);
  const examPage = Number.parseInt(params.exam_page ?? "1", 10) > 0 ? Number.parseInt(params.exam_page ?? "1", 10) : 1;
  const examPageSize =
    Number.parseInt(params.exam_page_size ?? "12", 10) > 0
      ? Number.parseInt(params.exam_page_size ?? "12", 10)
      : 12;
  const hasNarrowingFilters = Boolean(teacherFilter) || statusFilter !== "all";
  const hasContextControlsChanged =
    sortOption !== "recommended" || groupOption !== "none" || examPageSize !== 12 || examPage !== 1;
  const hasExamListControlsApplied = hasNarrowingFilters || hasContextControlsChanged;
  const { source, examsPage, resultSummary, baselineExamsPage } = await loadInstituteExams(
    statusFilter,
    sortOption,
    teacherFilter,
    examPage,
    examPageSize,
    hasExamListControlsApplied,
  );
  const exams = examsPage?.results ?? [];
  const visibleExams = exams;
  const groupedExams = groupInstituteExams(visibleExams, groupOption);
  const summaryByExamId = new Map(resultSummary.map((summary) => [summary.exam, summary] as const));
  const liveCount = exams.filter((exam) => exam.status === "live").length;
  const scheduledCount = exams.filter((exam) => exam.status === "scheduled").length;
  const draftCount = exams.filter((exam) => exam.status === "draft").length;
  const completedCount = exams.filter((exam) => exam.status === "completed").length;
  const reviewBlockedCount = exams.filter((exam) => summaryByExamId.get(exam.id)?.review_blocked).length;
  const publishedCount = exams.filter((exam) => summaryByExamId.get(exam.id)?.results_published).length;
  const totalExams = examsPage?.count ?? 0;
  const overallExamCount = baselineExamsPage?.count ?? totalExams;
  const examTotalPages = Math.max(Math.ceil(totalExams / examPageSize), 1);
  const safeExamPage = Math.min(examPage, examTotalPages);
  const isPaginationOverflowState = totalExams > 0 && visibleExams.length === 0 && examPage > examTotalPages;
  const isTrueEmptyExamState = overallExamCount === 0;
  const isFilteredEmptyExamState = overallExamCount > 0 && totalExams === 0;
  const activeExamFilterSummary = [
    teacherFilter ? `Teacher: ${selectedTeacher?.full_name ?? "Selected teacher"}` : null,
    statusFilter !== "all" ? `Status: ${formatFilterValue(statusFilter)}` : null,
    sortOption !== "recommended" ? `Sort: ${formatFilterValue(sortOption)}` : null,
    groupOption !== "none" ? `Group: ${formatFilterValue(groupOption)}` : null,
    examPageSize !== 12 ? `Page size: ${examPageSize}` : null,
    safeExamPage !== 1 ? `Page: ${safeExamPage}` : null,
  ].filter(Boolean) as string[];
  const activeExamFilterPills =
    activeExamFilterSummary.length > 0
      ? activeExamFilterSummary.map((value, index) => ({
          label: index === 0 ? "Active controls" : " ",
          value,
        }))
      : [{ label: "Active controls", value: "Default exam list view" }];

  return (
    <div className="studentPage studentDashboardModern instituteConsolePage instituteExamsPageVivid">
      <InstitutePageHeader
        title="Exam Management"
        description="Review exams, inspect sections and assigned learners, and open each exam to manage setup and delivery state."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonGhost" href="/institute/exams/preset-packs">
              Preset Library
            </Link>
            <Link className="button buttonSecondary" href="/institute/exams/new">
              Quick Create
            </Link>
            <Link className="button buttonPrimary" href="/institute/exams/advanced">
              Advanced Builder
            </Link>
          </div>
        }
      />

      <div className="pageUtilityRow">
        <span
          className={`statusPill ${
            source === "live"
              ? "statusLive"
              : source === "unconfigured"
                ? "statusWarning"
                : "statusDemo"
          }`}
        >
          {source === "live"
            ? isPaginationOverflowState
              ? "Current page is outside the visible exam list"
              : isFilteredEmptyExamState
              ? "Active controls are hiding all exams"
              : `${overallExamCount} exams in this workspace`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load exams"}
        </span>
      </div>

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for institute exams"
              : "Institute exams could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active institute admin account to load exams from the backend."
              : "The institute exam page is connected to live exam data, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Institute exam endpoint", "Active institute web session"]
              : ["Backend connectivity", "Institute exam access"]
          }
          ctaHref="/institute/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : isTrueEmptyExamState ? (
        <StudentStatePanel
          eyebrow="No exams in scope"
          title="Your institute exam list is empty right now"
          description="No institute exams have been created for this account yet. Start with the fastest exam-creation path first, then return here to review schedule, assignments, and results readiness."
          bullets={[
            "Use Quick Create for the fastest first mock or practice exam.",
            "Open Academic Setup if class, subject, or topic choices are missing or incomplete.",
            "Use Advanced Builder only when you want to assemble an exam from licensed shared-library questions.",
          ]}
          ctaHref="/institute/exams/new"
          ctaLabel="Start With Quick Create"
          secondaryCtaHref="/institute/academic-setup"
          secondaryCtaLabel="Open Academic Setup"
          statusLabel="First exam not created yet"
          footnote="After the first exam is created, this page will automatically show filters, exam cards, pagination, and grouped delivery views."
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Exam Operations</span>
              <strong>Institute exam operations</strong>
              <small>
                {overallExamCount} total in this workspace · {liveCount} live · {scheduledCount} scheduled · {completedCount} completed · {reviewBlockedCount} review blocked
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/institute/exams/new">
                Quick Create
              </Link>
              <Link className="button buttonSecondary" href="/institute/exams/advanced">
                Advanced Builder
              </Link>
              <Link className="button buttonSecondary" href="/institute/question-bank">
                Open Question Bank
              </Link>
            </div>
          </section>

          {hasExamListControlsApplied ? (
            <section className="contentCard workspaceFiltersCard">
              <div className="sectionHeading">
                <strong>Active list controls are changing what you see</strong>
                <span>
                  These controls only change the current list view. They do not edit, hide, or delete any exam data.
                </span>
              </div>
              <FilterSummaryPills items={activeExamFilterPills} />
              <div className="workspaceFilterActions">
                <Link className="button buttonSecondary" href="/institute/exams">
                  Reset to the default exam view
                </Link>
              </div>
            </section>
          ) : null}

          {isFilteredEmptyExamState ? (
            <section className="contentCard workspaceFiltersCard">
              <div className="sectionHeading">
                <strong>No exams match the current controls</strong>
                <span>
                  Nothing is broken. This institute still has {overallExamCount} exam{overallExamCount === 1 ? "" : "s"},
                  but the current controls returned zero matches.
                </span>
              </div>
              <div className="builderHintPanel">
                <strong>Why this happened</strong>
                <p>
                  The current teacher, status, sorting, grouping, or page-size combination narrowed the list too far.
                  This is a filtered view, not a first-time onboarding state.
                </p>
                <small>
                  Clear all controls to return to the full exam list immediately, or keep the same controls and return to
                  page 1 if you were only experimenting with list options.
                </small>
              </div>
              <FilterSummaryPills items={activeExamFilterPills} />
              <div className="workspaceFilterActions">
                <Link className="button buttonPrimary" href="/institute/exams">
                  Clear all controls and show all exams
                </Link>
                <Link
                  className="button buttonGhost"
                  href={buildInstituteExamFilterHref({
                    teacher: teacherFilter,
                    status: statusFilter,
                    sort: sortOption,
                    group: groupOption,
                    page: 1,
                    pageSize: examPageSize,
                  })}
                >
                  Keep these controls and return to page 1
                </Link>
                <Link className="button buttonSecondary" href="/institute/exams/new">
                  Create a new exam
                </Link>
              </div>
            </section>
          ) : null}

          {isPaginationOverflowState ? (
            <section className="contentCard workspaceFiltersCard">
              <div className="sectionHeading">
                <strong>You are on a page that no longer has visible exams</strong>
                <span>
                  Exams still exist in the current scope, but page {examPage} is beyond the last page that has visible rows.
                </span>
              </div>
              <div className="builderHintPanel">
                <strong>Why this happened</strong>
                <p>
                  This usually happens after changing status, teacher, or page size controls. The result set became
                  smaller, but the page number stayed on an older later page.
                </p>
                <small>
                  Nothing is lost. Return to page 1 with the same controls, or reopen the full exam list in one click.
                </small>
              </div>
              <FilterSummaryPills
                items={[
                  { label: "Current page", value: `${examPage}` },
                  { label: "Last page with results", value: `${examTotalPages}` },
                  ...activeExamFilterPills,
                ]}
              />
              <div className="workspaceFilterActions">
                <Link
                  className="button buttonPrimary"
                  href={buildInstituteExamFilterHref({
                    teacher: teacherFilter,
                    status: statusFilter,
                    sort: sortOption,
                    group: groupOption,
                    page: 1,
                    pageSize: examPageSize,
                  })}
                >
                  Return to page 1 with the same controls
                </Link>
                <Link className="button buttonSecondary" href="/institute/exams">
                  Clear all controls and show all exams
                </Link>
              </div>
            </section>
          ) : null}

          {!isFilteredEmptyExamState && !isPaginationOverflowState ? (
            <section className="resultsSummaryGrid">
              <article className="metricCard metricCardPrimary dashboardHeroCard">
                <span>Visible On This Page</span>
                <strong>{visibleExams.length}</strong>
                <small>{totalExams} match the current scope across all visible pages</small>
              </article>

              <article className="metricCard dashboardHeroCard">
                <span>Workspace Total</span>
                <strong>{overallExamCount}</strong>
                <small>{draftCount} draft, {scheduledCount} scheduled, and {completedCount} completed in the current page slice</small>
              </article>

              <article className="metricCard dashboardHeroCard">
                <span>Assigned Learners</span>
                <strong>{exams.reduce((total, exam) => total + exam.assigned_student_count, 0)}</strong>
                <small>Across the current workspace</small>
              </article>

              <article className="metricCard dashboardHeroCard">
                <span>Review Blocked</span>
                <strong>{reviewBlockedCount}</strong>
                <small>{publishedCount} exam(s) already have student-visible results</small>
              </article>
            </section>
          ) : null}

          <section className="contentCard workspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Exam Controls</strong>
              <span>
                {isPaginationOverflowState
                  ? "No rows on the current page"
                  : isFilteredEmptyExamState
                  ? "0 shown because of active controls"
                  : overallExamCount === 0
                    ? "0 shown"
                    : `${visibleExams.length} shown${totalExams !== visibleExams.length ? ` of ${totalExams}` : ""} in the current scope`}
              </span>
            </div>
            <div className="builderHintPanel">
              <strong>How to use this workspace</strong>
              <p>
                Start with teacher and status first. Use sort and group only when you want a different way to read the same list.
                These controls change only what is visible on this page. They do not edit any exam data.
              </p>
              <small>
                If the page ever looks unexpectedly empty, review the active controls summary below before assuming an exam is missing or deleted.
              </small>
            </div>
            <form className="workspaceFiltersForm" method="GET">
              <input name="exam_page" type="hidden" value="1" />
              <label className="workspaceFilterField">
                <span>Teacher</span>
                <select defaultValue={teacherFilter} name="teacher">
                  <option value="">All teachers</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name} ({teacher.employee_code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Status</span>
                <select defaultValue={statusFilter} name="exam_status">
                  <option value="all">All exams</option>
                  <option value="live">Live</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="draft">Draft</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Sort by</span>
                <select defaultValue={sortOption} name="exam_sort">
                  <option value="recommended">Recommended order</option>
                  <option value="start_soon">Starts soonest</option>
                  <option value="duration_short">Shortest duration</option>
                  <option value="learners_high">Highest learner count</option>
                  <option value="marks_high">Highest marks</option>
                  <option value="title">Title A-Z</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Group by</span>
                <select defaultValue={groupOption} name="exam_group">
                  <option value="none">No grouping</option>
                  <option value="status">Status</option>
                  <option value="type">Exam type</option>
                  <option value="subject">Subject</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Page size</span>
                <select defaultValue={String(examPageSize)} name="exam_page_size">
                  <option value="12">12</option>
                  <option value="18">18</option>
                  <option value="24">24</option>
                </select>
              </label>
              <div className="workspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
                </button>
                <Link className="button buttonSecondary" href="/institute/exams">
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="workspaceFilterQuickRow">
              <span className="workspaceFilterQuickLabel">Quick filters</span>
              <div className="workspaceFilterQuickChips">
                {[
                  {
                    label: "All",
                    href: buildInstituteExamFilterHref({ teacher: teacherFilter, pageSize: examPageSize }),
                    active: !teacherFilter && statusFilter === "all" && sortOption === "recommended" && groupOption === "none",
                  },
                  {
                    label: "Live",
                    href: buildInstituteExamFilterHref({ teacher: teacherFilter, status: "live", sort: sortOption, group: groupOption, pageSize: examPageSize }),
                    active: statusFilter === "live",
                  },
                  {
                    label: "Scheduled",
                    href: buildInstituteExamFilterHref({ teacher: teacherFilter, status: "scheduled", sort: sortOption, group: groupOption, pageSize: examPageSize }),
                    active: statusFilter === "scheduled",
                  },
                  {
                    label: "Drafts",
                    href: buildInstituteExamFilterHref({ teacher: teacherFilter, status: "draft", sort: sortOption, group: groupOption, pageSize: examPageSize }),
                    active: statusFilter === "draft",
                  },
                  {
                    label: "Completed",
                    href: buildInstituteExamFilterHref({ teacher: teacherFilter, status: "completed", sort: sortOption, group: groupOption, pageSize: examPageSize }),
                    active: statusFilter === "completed",
                  },
                  {
                    label: "Starts Soon",
                    href: buildInstituteExamFilterHref({ teacher: teacherFilter, status: statusFilter, sort: "start_soon", group: groupOption, pageSize: examPageSize }),
                    active: sortOption === "start_soon",
                  },
                  {
                    label: "Highest Marks",
                    href: buildInstituteExamFilterHref({ teacher: teacherFilter, status: statusFilter, sort: "marks_high", group: groupOption, pageSize: examPageSize }),
                    active: sortOption === "marks_high",
                  },
                  {
                    label: "Group by Subject",
                    href: buildInstituteExamFilterHref({ teacher: teacherFilter, status: statusFilter, sort: sortOption, group: "subject", pageSize: examPageSize }),
                    active: groupOption === "subject",
                  },
                ].map((chip) => (
                  <Link
                    key={chip.label}
                    className={`workspaceQuickChip${chip.active ? " workspaceQuickChipActive" : ""}`}
                    href={chip.href}
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
            <FilterSummaryPills
              items={[
                { label: "Teacher", value: selectedTeacher?.full_name ?? "All teachers" },
                { label: "Status", value: formatFilterValue(statusFilter) },
                { label: "Sort", value: formatFilterValue(sortOption) },
                { label: "Group", value: formatFilterValue(groupOption) },
                { label: "Page size", value: `${examPageSize}` },
                { label: "Page", value: `${safeExamPage}/${examTotalPages}` },
              ]}
            />
            {isFilteredEmptyExamState || isPaginationOverflowState ? (
              <div className="workspaceFilterActions">
                {isPaginationOverflowState ? (
                  <Link
                    className="button buttonPrimary"
                    href={buildInstituteExamFilterHref({
                      teacher: teacherFilter,
                      status: statusFilter,
                      sort: sortOption,
                      group: groupOption,
                      page: 1,
                      pageSize: examPageSize,
                    })}
                  >
                    Return to page 1
                  </Link>
                ) : (
                  <Link className="button buttonPrimary" href="/institute/exams">
                    Clear all controls now
                  </Link>
                )}
              </div>
            ) : null}
          </section>

          {visibleExams.length > 0
            ? groupedExams.map((group) => (
                <section className="workspaceResultsGroup" key={group.label}>
                  {groupOption !== "none" ? (
                    <div className="sectionHeading">
                      <strong>{group.label}</strong>
                      <span>{group.items.length} exams</span>
                    </div>
                  ) : null}
                  <div className="examGrid">
                    {group.items.map((exam) => {
                      const summary = summaryByExamId.get(exam.id) ?? null;
                      const lifecycleGuidance = getExamLifecycleGuidance(exam, summary);
                      return (
                      <article className="examCard" key={exam.id}>
                        <div className="examCardTop">
                          <div>
                            <strong>{exam.title}</strong>
                            <span>
                              {exam.code}
                              {exam.subject_name ? ` · ${exam.subject_name}` : ""}
                            </span>
                          </div>
                          <span className={`statusPill ${
                            exam.status === "live"
                              ? "statusLive"
                              : exam.status === "scheduled"
                                ? "statusWarning"
                                : exam.status === "completed"
                                  ? "statusDemo"
                                : exam.status === "draft"
                                  ? "statusDemo"
                                  : "statusDanger"
                          }`}
                          >
                            {titleCase(exam.status)}
                          </span>
                        </div>

                        <div className="questionBankTagRow">
                          <span className="questionBankTagChip">{titleCase(exam.exam_type)}</span>
                          {summary?.results_published ? (
                            <span className="statusPill statusLive">Results published</span>
                          ) : summary?.review_blocked ? (
                            <span className="statusPill statusWarning">
                              {summary.pending_review_tasks_count} review blocker{summary.pending_review_tasks_count === 1 ? "" : "s"}
                            </span>
                          ) : summary ? (
                            <span className="statusPill statusDemo">Results in progress</span>
                          ) : (
                            <span className="statusPill statusDemo">No summary yet</span>
                          )}
                          {summary?.recheck_review_tasks_count ? (
                            <span className="questionBankTagChip">
                              {summary.recheck_review_tasks_count} recheck pending
                            </span>
                          ) : null}
                        </div>

                        <div className="examMetaGrid">
                          <div>
                            <span>Duration</span>
                            <strong>{exam.duration_minutes} min</strong>
                          </div>
                          <div>
                            <span>Questions</span>
                            <strong>{exam.active_questions_count}</strong>
                          </div>
                          <div>
                            <span>Students</span>
                            <strong>{exam.assigned_student_count}</strong>
                          </div>
                          <div>
                            <span>Marks</span>
                            <strong>{exam.total_marks}</strong>
                          </div>
                        </div>

                        <p className="examInstructions">
                          {exam.description || exam.instructions || "No additional institute-facing exam notes were provided."}
                        </p>

                        <div className="builderHintPanel" style={{ marginTop: 14 }}>
                          <strong>{lifecycleGuidance.statusLabel}</strong>
                          <p>{lifecycleGuidance.summary}</p>
                          <small>{lifecycleGuidance.nextStep}</small>
                        </div>

                        <div className="examCardFooter">
                          <div className="examStateSummary">
                            <strong>
                              {summary
                                ? `${summary.total_attempted} attempts · ${summary.total_passed + summary.total_failed} evaluated`
                                : titleCase(exam.exam_type)}
                            </strong>
                            <span>
                              {exam.start_at ? `Starts ${new Date(exam.start_at).toLocaleString("en-IN")}` : "Schedule pending"}
                            </span>
                          </div>

                          <div className="resultCardActions">
                            <Link className="button buttonSecondary" href={`/institute/exams/${exam.id}/builder?tab=questions`}>
                              Link Questions
                            </Link>
                            <Link className="button buttonGhost" href={`/institute/exams/${exam.id}/builder`}>
                              Setup
                            </Link>
                            <Link className="button buttonPrimary" href={`/institute/exams/${exam.id}`}>
                              Open Exam
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                    })}
                  </div>
                </section>
              ))
            : null}
          {totalExams > examPageSize ? (
            <div className="workspaceFilterActions">
              {safeExamPage <= 1 ? (
                <span className="button buttonGhost questionBankButtonDisabled">Previous</span>
              ) : (
                <Link
                  className="button buttonSecondary"
                  href={buildInstituteExamFilterHref({
                    teacher: teacherFilter,
                    status: statusFilter,
                    sort: sortOption,
                    group: groupOption,
                    page: safeExamPage - 1,
                    pageSize: examPageSize,
                  })}
                >
                  Previous
                </Link>
              )}
              <span className="statusPill statusDefault">
                Page {safeExamPage} of {examTotalPages}
              </span>
              {safeExamPage >= examTotalPages ? (
                <span className="button buttonGhost questionBankButtonDisabled">Next</span>
              ) : (
                <Link
                  className="button buttonSecondary"
                  href={buildInstituteExamFilterHref({
                    teacher: teacherFilter,
                    status: statusFilter,
                    sort: sortOption,
                    group: groupOption,
                    page: safeExamPage + 1,
                    pageSize: examPageSize,
                  })}
                >
                  Next
                </Link>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
