import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type { TeacherExam } from "@/features/dashboard/types";
import { fetchPortalList } from "@/lib/api/portal";
import { requirePlatformAdminSession } from "@/lib/auth/session";

type PlatformExamStatusFilter = "all" | "live" | "scheduled" | "draft";
type PlatformExamSourceFilter = "all" | "platform" | "institute" | "teacher";
type PlatformExamSortOption =
  | "recommended"
  | "start_soon"
  | "duration_short"
  | "students_high"
  | "questions_high"
  | "title";
type PlatformExamGroupOption = "none" | "status" | "type" | "source" | "subject";
type InstituteOption = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

function resolvePlatformExamStatusFilter(value?: string): PlatformExamStatusFilter {
  switch (value) {
    case "live":
    case "scheduled":
    case "draft":
      return value;
    default:
      return "all";
  }
}

function resolvePlatformExamSourceFilter(value?: string): PlatformExamSourceFilter {
  switch (value) {
    case "platform":
    case "institute":
    case "teacher":
      return value;
    default:
      return "all";
  }
}

function resolvePlatformExamSortOption(value?: string): PlatformExamSortOption {
  switch (value) {
    case "start_soon":
    case "duration_short":
    case "students_high":
    case "questions_high":
    case "title":
      return value;
    default:
      return "recommended";
  }
}

function resolvePlatformExamGroupOption(value?: string): PlatformExamGroupOption {
  switch (value) {
    case "status":
    case "type":
    case "source":
    case "subject":
      return value;
    default:
      return "none";
  }
}

function filterPlatformExams(
  exams: TeacherExam[],
  statusFilter: PlatformExamStatusFilter,
  sourceFilter: PlatformExamSourceFilter,
) {
  return exams.filter((exam) => {
    const statusMatch = statusFilter === "all" ? true : exam.status === statusFilter;
    const sourceMatch = sourceFilter === "all" ? true : exam.source_type === sourceFilter;
    return statusMatch && sourceMatch;
  });
}

function sortPlatformExams(exams: TeacherExam[], sortBy: PlatformExamSortOption) {
  const sortable = [...exams];
  const recommendedRank = (exam: TeacherExam) => {
    if (exam.status === "live") return 0;
    if (exam.status === "scheduled") return 1;
    if (exam.status === "draft") return 2;
    return 3;
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
      case "students_high":
        return right.assigned_student_count - left.assigned_student_count;
      case "questions_high":
        return right.active_questions_count - left.active_questions_count;
      case "title":
        return left.title.localeCompare(right.title);
      case "recommended":
      default: {
        const rankDelta = recommendedRank(left) - recommendedRank(right);
        if (rankDelta !== 0) return rankDelta;
        return left.title.localeCompare(right.title);
      }
    }
  });

  return sortable;
}

function buildPlatformExamGroupLabel(exam: TeacherExam, groupBy: PlatformExamGroupOption) {
  if (groupBy === "status") return titleCase(exam.status);
  if (groupBy === "type") return titleCase(exam.exam_type);
  if (groupBy === "source") return titleCase(exam.source_type);
  if (groupBy === "subject") return exam.subject_name || "Unassigned subject";
  return "Exams";
}

function groupPlatformExams(exams: TeacherExam[], groupBy: PlatformExamGroupOption) {
  if (groupBy === "none") {
    return [{ label: "All exams", items: exams }];
  }

  const buckets = new Map<string, TeacherExam[]>();
  for (const exam of exams) {
    const label = buildPlatformExamGroupLabel(exam, groupBy);
    buckets.set(label, [...(buckets.get(label) ?? []), exam]);
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

function buildPlatformExamFilterHref(args: {
  status?: PlatformExamStatusFilter;
  source?: PlatformExamSourceFilter;
  sort?: PlatformExamSortOption;
  group?: PlatformExamGroupOption;
  institute?: string;
}) {
  const params = new URLSearchParams();
  if (args.status && args.status !== "all") params.set("exam_status", args.status);
  if (args.source && args.source !== "all") params.set("exam_source", args.source);
  if (args.sort && args.sort !== "recommended") params.set("exam_sort", args.sort);
  if (args.group && args.group !== "none") params.set("exam_group", args.group);
  if (args.institute) params.set("institute", args.institute);
  const query = params.toString();
  return query ? `/admin/exams?${query}` : "/admin/exams";
}

function normalizeSelectedInstitute(
  requestedInstituteId: string | undefined,
  institutes: InstituteOption[],
) {
  if (!requestedInstituteId) {
    return "";
  }

  return institutes.some((item) => item.id === requestedInstituteId) ? requestedInstituteId : "";
}

async function loadPlatformExams(selectedInstituteId: string) {
  try {
    const exams = await fetchPortalList<TeacherExam>(
      `/api/v1/exams/?page_size=200${selectedInstituteId ? `&institute=${selectedInstituteId}` : ""}`,
    );
    return {
      source: "live" as const,
      exams,
    };
  } catch {
    return {
      source: "error" as const,
      exams: [] as TeacherExam[],
    };
  }
}

export default async function PlatformAdminExamsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    exam_status?: string;
    exam_source?: string;
    exam_sort?: string;
    exam_group?: string;
    institute?: string;
  }>;
}) {
  await requirePlatformAdminSession();
  const params = (await searchParams) ?? {};
  const institutes = await fetchPortalList<InstituteOption>("/api/v1/institutes/?page_size=100").catch(() => []);
  const selectedInstituteId = normalizeSelectedInstitute(params.institute, institutes);
  const selectedInstitute = institutes.find((item) => item.id === selectedInstituteId) ?? null;
  const { source, exams } = await loadPlatformExams(selectedInstituteId);
  const statusFilter = resolvePlatformExamStatusFilter(params.exam_status);
  const sourceFilter = resolvePlatformExamSourceFilter(params.exam_source);
  const sortOption = resolvePlatformExamSortOption(params.exam_sort);
  const groupOption = resolvePlatformExamGroupOption(params.exam_group);
  const visibleExams = sortPlatformExams(filterPlatformExams(exams, statusFilter, sourceFilter), sortOption);
  const groupedExams = groupPlatformExams(visibleExams, groupOption);
  const platformCount = exams.filter((exam) => exam.source_type === "platform").length;
  const instituteCount = exams.filter((exam) => exam.source_type === "institute").length;
  const teacherCount = exams.filter((exam) => exam.source_type === "teacher").length;
  const liveCount = exams.filter((exam) => exam.status === "live").length;
  const draftCount = exams.filter((exam) => exam.status === "draft").length;

  return (
    <div className="studentPage studentDashboardModern instituteConsolePage instituteExamsPageVivid">
      <PlatformAdminPageHeader
        title="Exam Management"
        description="Review platform-wide exam coverage and create platform-owned or institute-owned exam shells from one governance workspace."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonGhost" href="/admin/exams/preset-packs">
              Preset Library
            </Link>
            <Link className="button buttonSecondary" href="/admin/exams/new">
              Quick Create
            </Link>
            <Link className="button buttonPrimary" href="/admin/exams/advanced">
              Advanced Builder
            </Link>
          </div>
        }
      />

      <div className="pageUtilityRow">
        <span className={`statusPill ${source === "live" ? "statusLive" : "statusDemo"}`}>
          {source === "live" ? `${visibleExams.length} exams loaded` : "Unable to load exams"}
        </span>
      </div>

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow="Load issue"
          title="Platform exams could not be loaded"
          description="This platform-admin route is connected to the live exam endpoints, but the current request did not complete successfully."
          bullets={["Backend connectivity", "Platform-admin exam access"]}
          ctaHref="/admin"
          ctaLabel="Back to Dashboard"
          statusLabel="Retry after backend check"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Platform governance</span>
              <strong>Platform exam governance</strong>
              <small>
                {platformCount} platform · {instituteCount} institute · {teacherCount} teacher · {liveCount} live
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/admin/exams/new">
                Quick Create
              </Link>
              <Link className="button buttonSecondary" href="/admin/exams/advanced">
                Advanced Builder
              </Link>
              <Link className="button buttonSecondary" href="/admin/academic-setup">
                Open Academic Setup
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Total Exams</span>
              <strong>{visibleExams.length}</strong>
              <small>{draftCount} draft across platform scope</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Platform Source</span>
              <strong>{platformCount}</strong>
              <small>Explicitly platform-owned exams</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Institute Source</span>
              <strong>{instituteCount}</strong>
              <small>Institute-published exams visible to governance</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Teacher Source</span>
              <strong>{teacherCount}</strong>
              <small>Teacher-owned visibility records</small>
            </article>
          </section>

          <section className="contentCard workspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Exam Controls</strong>
              <span>
                {visibleExams.length} shown
                {visibleExams.length !== exams.length ? ` of ${exams.length}` : ""}
              </span>
            </div>
            <form className="workspaceFiltersForm" method="GET">
              <label className="workspaceFilterField">
                <span>Institute</span>
                <select defaultValue={selectedInstituteId} name="institute">
                  <option value="">All institutes</option>
                  {institutes.map((institute) => (
                    <option key={institute.id} value={institute.id}>
                      {institute.name} ({institute.code})
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
                <span>Source</span>
                <select defaultValue={sourceFilter} name="exam_source">
                  <option value="all">All sources</option>
                  <option value="platform">Platform</option>
                  <option value="institute">Institute</option>
                  <option value="teacher">Teacher</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Sort by</span>
                <select defaultValue={sortOption} name="exam_sort">
                  <option value="recommended">Recommended order</option>
                  <option value="start_soon">Starts soonest</option>
                  <option value="duration_short">Shortest duration</option>
                  <option value="students_high">Highest learner count</option>
                  <option value="questions_high">Most questions</option>
                  <option value="title">Title A-Z</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Group by</span>
                <select defaultValue={groupOption} name="exam_group">
                  <option value="none">No grouping</option>
                  <option value="status">Status</option>
                  <option value="source">Source</option>
                  <option value="type">Exam type</option>
                  <option value="subject">Subject</option>
                </select>
              </label>
              <div className="workspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
                </button>
                <Link className="button buttonSecondary" href="/admin/exams">
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
                    href: buildPlatformExamFilterHref({ institute: selectedInstituteId }),
                    active:
                      !selectedInstituteId &&
                      statusFilter === "all" &&
                      sourceFilter === "all" &&
                      sortOption === "recommended" &&
                      groupOption === "none",
                  },
                  {
                    label: "Platform",
                    href: buildPlatformExamFilterHref({ institute: selectedInstituteId, status: statusFilter, source: "platform", sort: sortOption, group: groupOption }),
                    active: sourceFilter === "platform",
                  },
                  {
                    label: "Institute",
                    href: buildPlatformExamFilterHref({ institute: selectedInstituteId, status: statusFilter, source: "institute", sort: sortOption, group: groupOption }),
                    active: sourceFilter === "institute",
                  },
                  {
                    label: "Teacher",
                    href: buildPlatformExamFilterHref({ institute: selectedInstituteId, status: statusFilter, source: "teacher", sort: sortOption, group: groupOption }),
                    active: sourceFilter === "teacher",
                  },
                  {
                    label: "Live",
                    href: buildPlatformExamFilterHref({ institute: selectedInstituteId, status: "live", source: sourceFilter, sort: sortOption, group: groupOption }),
                    active: statusFilter === "live",
                  },
                  {
                    label: "Starts Soon",
                    href: buildPlatformExamFilterHref({ institute: selectedInstituteId, status: statusFilter, source: sourceFilter, sort: "start_soon", group: groupOption }),
                    active: sortOption === "start_soon",
                  },
                  {
                    label: "Group by Source",
                    href: buildPlatformExamFilterHref({ institute: selectedInstituteId, status: statusFilter, source: sourceFilter, sort: sortOption, group: "source" }),
                    active: groupOption === "source",
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
            <div className="workspaceFilterChips">
              <span className="statusPill statusDefault">Institute: {selectedInstitute?.code ?? "all"}</span>
              <span className="statusPill statusDefault">Status: {statusFilter.replaceAll("_", " ")}</span>
              <span className="statusPill statusDefault">Source: {sourceFilter.replaceAll("_", " ")}</span>
              <span className="statusPill statusDefault">Sort: {sortOption.replaceAll("_", " ")}</span>
              <span className="statusPill statusDefault">Group: {groupOption.replaceAll("_", " ")}</span>
            </div>
            <FilterSummaryPills
              items={[
                { label: "Institute", value: selectedInstitute?.name ?? "All institutes" },
                { label: "Status", value: statusFilter.replaceAll("_", " ") },
                { label: "Source", value: sourceFilter.replaceAll("_", " ") },
                { label: "Sort", value: sortOption.replaceAll("_", " ") },
                { label: "Group", value: groupOption.replaceAll("_", " ") },
              ]}
            />
          </section>

          {exams.length === 0 ? (
            <StudentStatePanel
              eyebrow="No exams in scope"
              title="No exams are visible to platform governance yet"
              description="Once exam shells are created through platform, institute, or teacher lanes, they will appear here with source ownership metadata."
              ctaHref="/admin/exams/new"
              ctaLabel="Create First Exam"
              statusLabel="Waiting for exams"
            />
          ) : visibleExams.length === 0 ? (
            <StudentStatePanel
              eyebrow="No matching exams"
              title="No exams match these platform controls"
              description="Try a broader source or status filter, change the grouping, or reset the controls to return to the full governance list."
              ctaHref={selectedInstituteId ? "/admin/exams" : "/admin/exams"}
              ctaLabel="Reset exam filters"
              statusLabel="Filter returned zero exams"
            />
          ) : (
            groupedExams.map((group) => (
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
                        <span
                          className={`statusPill ${
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
                          <span>Source</span>
                          <strong>{exam.source_label}</strong>
                        </div>
                        <div>
                          <span>Owner</span>
                          <strong>{exam.source_teacher_name || exam.source_name}</strong>
                        </div>
                        <div>
                          <span>Questions</span>
                          <strong>{exam.active_questions_count}</strong>
                        </div>
                        <div>
                          <span>Students</span>
                          <strong>{exam.assigned_student_count}</strong>
                        </div>
                      </div>

                      <p className="examInstructions">
                        {exam.description ||
                          exam.instructions ||
                          "No additional platform-facing exam notes were provided."}
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
                          <Link className="button buttonSecondary" href={`/admin/exams/${exam.id}/builder?tab=questions`}>
                            Link Questions
                          </Link>
                          <Link className="button buttonGhost" href={`/admin/exams/${exam.id}/builder`}>
                            Setup
                          </Link>
                          <Link className="button buttonPrimary" href={`/admin/exams/${exam.id}`}>
                            Open Exam
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
