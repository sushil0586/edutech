import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import type { TeacherExamListItem } from "@/features/dashboard/types";
import { fetchPortalList } from "@/lib/api/portal";
import { fetchTeacherExamPage, getTeacherApiState } from "@/lib/api/teacher";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { buildFilterHref, formatFilterValue, resolveFilterValue } from "@/lib/workspace/filter-utils";

type InstituteExam = TeacherExamListItem;
type InstituteExamStatusFilter = "all" | "live" | "scheduled" | "draft";
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

function titleCase(value: string) {
  return formatFilterValue(value);
}

function resolveInstituteExamStatusFilter(value?: string): InstituteExamStatusFilter {
  return resolveFilterValue(value, ["live", "scheduled", "draft"], "all");
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
      teacher: teacherFilter || undefined,
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
  const { source, examsPage } = await loadInstituteExams(
    statusFilter,
    sortOption,
    teacherFilter,
    examPage,
    examPageSize,
  );
  const exams = examsPage?.results ?? [];
  const visibleExams = exams;
  const groupedExams = groupInstituteExams(visibleExams, groupOption);
  const liveCount = exams.filter((exam) => exam.status === "live").length;
  const scheduledCount = exams.filter((exam) => exam.status === "scheduled").length;
  const draftCount = exams.filter((exam) => exam.status === "draft").length;
  const totalExams = examsPage?.count ?? 0;
  const examTotalPages = Math.max(Math.ceil(totalExams / examPageSize), 1);
  const safeExamPage = Math.min(examPage, examTotalPages);

  return (
    <div className="studentPage studentDashboardModern">
      <InstitutePageHeader
        title="Exam Management"
        description="Review institute-scoped exams, inspect sections and assigned learners, and open each exam to manage setup and delivery state."
        action={
          <div className="pageHeaderActionGroup">
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
              ? "Waiting for institute exams"
              : "Institute exams could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active institute admin account to load exams from the backend."
              : "The institute exam page is wired to live exam endpoints, but the current request did not complete successfully."
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
      ) : totalExams === 0 ? (
        <StudentStatePanel
          eyebrow="No exams in scope"
          title="Your institute exam list is empty right now"
          description="No active exams were returned for this institute account. Once exams are created within the current institute scope, they will appear here automatically."
          ctaHref="/institute/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel="Waiting for exams"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Exam Operations</span>
              <strong>Institute exam operations</strong>
              <small>
                {liveCount} live · {scheduledCount} scheduled · {draftCount} draft
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
              <small>Across the current institute scope</small>
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
                { label: "Page", value: `${safeExamPage}/${examTotalPages}` },
              ]}
            />
          </section>

          {visibleExams.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching exams"
              title="No institute exams match these controls"
              description="Try a broader status filter, change the grouping, or reset the controls to return to the full institute list."
              ctaHref="/institute/exams"
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
                          {exam.description || exam.instructions || "No additional institute-facing exam notes were provided."}
                        </p>

                        <div className="examCardFooter">
                          <div className="examStateSummary">
                            <strong>{titleCase(exam.exam_type)}</strong>
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
                    : buildInstituteExamFilterHref({
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
                    : buildInstituteExamFilterHref({
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
