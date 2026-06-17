import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import type { TeacherExamListItem } from "@/features/dashboard/types";
import { fetchTeacherExamPage, getTeacherApiState } from "@/lib/api/teacher";
import { buildFilterHref, formatFilterValue, resolveFilterValue } from "@/lib/workspace/filter-utils";

type TeacherExam = TeacherExamListItem;
type TeacherExamStatusFilter = "all" | "live" | "scheduled" | "draft";
type TeacherExamSortOption =
  | "recommended"
  | "start_soon"
  | "duration_short"
  | "learners_high"
  | "title";
type TeacherExamGroupOption = "none" | "status" | "type" | "subject";

function titleCase(value: string) {
  return formatFilterValue(value);
}

function resolveTeacherExamStatusFilter(value?: string): TeacherExamStatusFilter {
  return resolveFilterValue(value, ["live", "scheduled", "draft"], "all");
}

function resolveTeacherExamSortOption(value?: string): TeacherExamSortOption {
  return resolveFilterValue(value, ["start_soon", "duration_short", "learners_high", "title"], "recommended");
}

function resolveTeacherExamGroupOption(value?: string): TeacherExamGroupOption {
  return resolveFilterValue(value, ["status", "type", "subject"], "none");
}

function buildTeacherExamGroupLabel(exam: TeacherExam, groupBy: TeacherExamGroupOption) {
  if (groupBy === "status") return titleCase(exam.status);
  if (groupBy === "type") return titleCase(exam.exam_type);
  if (groupBy === "subject") return exam.subject_name || "Unassigned subject";
  return "Exams";
}

function groupTeacherExams(exams: TeacherExam[], groupBy: TeacherExamGroupOption) {
  if (groupBy === "none") {
    return [{ label: "All exams", items: exams }];
  }

  const buckets = new Map<string, TeacherExam[]>();
  for (const exam of exams) {
    const label = buildTeacherExamGroupLabel(exam, groupBy);
    buckets.set(label, [...(buckets.get(label) ?? []), exam]);
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

function buildTeacherExamFilterHref(args: {
  status?: TeacherExamStatusFilter;
  sort?: TeacherExamSortOption;
  group?: TeacherExamGroupOption;
  page?: number;
  pageSize?: number;
}) {
  return buildFilterHref("/teacher/exams", [
    ["exam_status", args.status, "all"],
    ["exam_sort", args.sort, "recommended"],
    ["exam_group", args.group, "none"],
    ["exam_page", args.page ? String(args.page) : undefined, "1"],
    ["exam_page_size", args.pageSize ? String(args.pageSize) : undefined, "12"],
  ]);
}

async function loadTeacherExams(
  statusFilter: TeacherExamStatusFilter,
  sortOption: TeacherExamSortOption,
  page: number,
  pageSize: number,
) {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      examsPage: null,
    };
  }

  try {
    const examsPage = await fetchTeacherExamPage({
      page,
      pageSize,
      filter: statusFilter,
      sort: sortOption,
    });

    return {
      source: "live" as const,
      examsPage,
    };
  } catch {
    return {
      source: "error" as const,
      examsPage: null,
    };
  }
}

export default async function TeacherExamsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    exam_status?: string;
    exam_sort?: string;
    exam_group?: string;
    exam_page?: string;
    exam_page_size?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const statusFilter = resolveTeacherExamStatusFilter(params.exam_status);
  const sortOption = resolveTeacherExamSortOption(params.exam_sort);
  const groupOption = resolveTeacherExamGroupOption(params.exam_group);
  const examPage = Number.parseInt(params.exam_page ?? "1", 10) > 0 ? Number.parseInt(params.exam_page ?? "1", 10) : 1;
  const examPageSize =
    Number.parseInt(params.exam_page_size ?? "12", 10) > 0
      ? Number.parseInt(params.exam_page_size ?? "12", 10)
      : 12;
  const { source, examsPage } = await loadTeacherExams(statusFilter, sortOption, examPage, examPageSize);
  const exams = examsPage?.results ?? [];
  const visibleExams = exams;
  const groupedExams = groupTeacherExams(visibleExams, groupOption);
  const liveCount = exams.filter((exam) => exam.status === "live").length;
  const scheduledCount = exams.filter((exam) => exam.status === "scheduled").length;
  const draftCount = exams.filter((exam) => exam.status === "draft").length;
  const totalExams = examsPage?.count ?? 0;
  const examTotalPages = Math.max(Math.ceil(totalExams / examPageSize), 1);
  const safeExamPage = Math.min(examPage, examTotalPages);

  return (
    <div className="studentPage studentDashboardModern">
      <TeacherPageHeader
        title="Exam Management"
        description="Review the exams in your scope, inspect sections and assigned learners, and open each exam to manage its current delivery state."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonSecondary" href="/teacher/exams/new">
              Quick Create
            </Link>
            <Link className="button buttonPrimary" href="/teacher/exams/advanced">
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
            ? `${totalExams} exams loaded`
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
              ? "Waiting for teacher exams"
              : "Teacher exams could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active teacher account to load exams from the backend."
              : "The teacher exam page is wired to live teacher-scoped exam endpoints, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Teacher exams endpoint", "Active teacher web session"]
              : ["Backend connectivity", "Teacher exam access"]
          }
          ctaHref="/teacher/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : totalExams === 0 ? (
        <StudentStatePanel
          eyebrow="No exams in scope"
          title="Your teacher exam list is empty right now"
          description="No active exams were returned for this teacher account. Once exams are created or assigned within your institute scope, they will appear here automatically."
          ctaHref="/teacher/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel="Waiting for exams"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Exam Operations</span>
              <strong>Teacher exam operations</strong>
              <small>
                {liveCount} live · {scheduledCount} scheduled · {draftCount} draft
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/teacher/exams/new">
                Quick Create
              </Link>
              <Link className="button buttonSecondary" href="/teacher/exams/advanced">
                Advanced Builder
              </Link>
              <Link className="button buttonSecondary" href="/teacher/results">
                Open Results
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Total Exams</span>
              <strong>{visibleExams.length}</strong>
              <small>{draftCount} draft and {scheduledCount} scheduled</small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Live Exams</span>
              <strong>{liveCount}</strong>
              <small>Currently available to learners</small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Assigned Learners</span>
              <strong>{exams.reduce((total, exam) => total + exam.assigned_student_count, 0)}</strong>
              <small>Across the current teacher scope</small>
            </article>
          </section>

          <section className="contentCard workspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Exam Controls</strong>
              <span>
                {visibleExams.length} shown
                {totalExams !== visibleExams.length ? ` of ${totalExams}` : ""}
              </span>
            </div>
            <form className="workspaceFiltersForm" method="GET">
              <input name="exam_page" type="hidden" value="1" />
              <label className="workspaceFilterField">
                <span>Status</span>
                <select defaultValue={statusFilter} name="exam_status">
                  <option value="all">All exams</option>
                  <option value="live">Live</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Sort by</span>
                <select defaultValue={sortOption} name="exam_sort">
                  <option value="recommended">Recommended order</option>
                  <option value="start_soon">Starts soonest</option>
                  <option value="duration_short">Shortest duration</option>
                  <option value="learners_high">Highest learner count</option>
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
                <Link className="button buttonSecondary" href="/teacher/exams">
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="workspaceFilterQuickRow">
              <span className="workspaceFilterQuickLabel">Quick filters</span>
              <div className="workspaceFilterQuickChips">
                {[
                  { label: "All", href: buildTeacherExamFilterHref({ pageSize: examPageSize }), active: statusFilter === "all" && sortOption === "recommended" && groupOption === "none" },
                  { label: "Live", href: buildTeacherExamFilterHref({ status: "live", sort: sortOption, group: groupOption, pageSize: examPageSize }), active: statusFilter === "live" },
                  { label: "Scheduled", href: buildTeacherExamFilterHref({ status: "scheduled", sort: sortOption, group: groupOption, pageSize: examPageSize }), active: statusFilter === "scheduled" },
                  { label: "Drafts", href: buildTeacherExamFilterHref({ status: "draft", sort: sortOption, group: groupOption, pageSize: examPageSize }), active: statusFilter === "draft" },
                  { label: "Starts Soon", href: buildTeacherExamFilterHref({ status: statusFilter, sort: "start_soon", group: groupOption, pageSize: examPageSize }), active: sortOption === "start_soon" },
                  { label: "Most Learners", href: buildTeacherExamFilterHref({ status: statusFilter, sort: "learners_high", group: groupOption }), active: sortOption === "learners_high" },
                  { label: "Group by Status", href: buildTeacherExamFilterHref({ status: statusFilter, sort: sortOption, group: "status" }), active: groupOption === "status" },
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
                { label: "Status", value: formatFilterValue(statusFilter) },
                { label: "Sort", value: formatFilterValue(sortOption) },
                { label: "Group", value: formatFilterValue(groupOption) },
                { label: "Page", value: `${safeExamPage}/${examTotalPages}` },
              ]}
            />
          </section>

          {visibleExams.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching exams"
              title="No teacher exams match these controls"
              description="Try a broader status filter, change the grouping, or reset the controls to return to the full exam list."
              ctaHref="/teacher/exams"
              ctaLabel="Reset exam filters"
              statusLabel="Filter returned zero exams"
            />
          ) : null}

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
                    {group.items.map((exam) => (
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
                                : exam.status === "draft"
                                  ? "statusDemo"
                                  : "statusDanger"
                          }`}
                          >
                            {titleCase(exam.status)}
                          </span>
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
                          {exam.description ||
                            exam.instructions ||
                            "No additional teacher-facing exam notes were provided."}
                        </p>

                        <div className="examCardFooter">
                          <div className="examStateSummary">
                            <strong>{titleCase(exam.exam_type)}</strong>
                            <span>
                              {exam.start_at
                                ? `Starts ${new Date(exam.start_at).toLocaleString("en-IN")}`
                                : "Schedule pending"}
                            </span>
                          </div>

                          <div className="resultCardActions">
                            <Link className="button buttonSecondary" href={`/teacher/exams/${exam.id}/builder?tab=questions`}>
                              Link Questions
                            </Link>
                            <Link className="button buttonGhost" href={`/teacher/exams/${exam.id}/builder`}>
                              Setup
                            </Link>
                            <Link className="button buttonPrimary" href={`/teacher/exams/${exam.id}`}>
                              Open Exam
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            : null}
          {totalExams > examPageSize ? (
            <div className="workspaceFilterActions">
              <Link
                className="button buttonSecondary"
                href={
                  safeExamPage <= 1
                    ? "#"
                    : buildTeacherExamFilterHref({
                        status: statusFilter,
                        sort: sortOption,
                        group: groupOption,
                        page: safeExamPage - 1,
                        pageSize: examPageSize,
                      })
                }
              >
                Previous
              </Link>
              <Link
                className="button buttonSecondary"
                href={
                  safeExamPage >= examTotalPages
                    ? "#"
                    : buildTeacherExamFilterHref({
                        status: statusFilter,
                        sort: sortOption,
                        group: groupOption,
                        page: safeExamPage + 1,
                        pageSize: examPageSize,
                      })
                }
              >
                Next
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
