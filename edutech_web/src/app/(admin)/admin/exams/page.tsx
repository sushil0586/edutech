import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type { TeacherExamListItem } from "@/features/dashboard/types";
import { fetchPortalList, fetchPortalPage, fetchPortalRecord, type PortalPage } from "@/lib/api/portal";
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
const ADMIN_EXAM_PAGE_SIZE = 24;

type InstituteOption = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type PlatformExamCatalogSummary = {
  total_count: number;
  source_counts: Record<string, number>;
  status_counts: Record<string, number>;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

function examSubjectDisplayLabel(exam: Pick<TeacherExamListItem, "subject_name" | "subject_summary">) {
  return exam.subject_summary?.display_label || exam.subject_name || "Unassigned subject";
}

function resolvePageNumber(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
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

function buildPlatformExamGroupLabel(exam: TeacherExamListItem, groupBy: PlatformExamGroupOption) {
  if (groupBy === "status") return titleCase(exam.status);
  if (groupBy === "type") return titleCase(exam.exam_type);
  if (groupBy === "source") return titleCase(exam.source_type);
  if (groupBy === "subject") return examSubjectDisplayLabel(exam);
  return "Exams";
}

function groupPlatformExams(exams: TeacherExamListItem[], groupBy: PlatformExamGroupOption) {
  if (groupBy === "none") {
    return [{ label: "All exams", items: exams }];
  }

  const buckets = new Map<string, TeacherExamListItem[]>();
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
  page?: number;
}) {
  const params = new URLSearchParams();
  if (args.status && args.status !== "all") params.set("exam_status", args.status);
  if (args.source && args.source !== "all") params.set("exam_source", args.source);
  if (args.sort && args.sort !== "recommended") params.set("exam_sort", args.sort);
  if (args.group && args.group !== "none") params.set("exam_group", args.group);
  if (args.institute) params.set("institute", args.institute);
  if (args.page && args.page > 1) params.set("page", String(args.page));
  const query = params.toString();
  return query ? `/admin/exams?${query}` : "/admin/exams";
}

function buildPlatformExamApiPath(args: {
  statusFilter: PlatformExamStatusFilter;
  sourceFilter: PlatformExamSourceFilter;
  sortOption: PlatformExamSortOption;
  selectedInstituteId: string;
  page: number;
}) {
  const params = new URLSearchParams({
    page: String(args.page),
    page_size: String(ADMIN_EXAM_PAGE_SIZE),
  });

  if (args.selectedInstituteId) params.set("institute", args.selectedInstituteId);
  if (args.statusFilter !== "all") params.set("status", args.statusFilter);
  if (args.sourceFilter !== "all") params.set("source_type", args.sourceFilter);

  switch (args.sortOption) {
    case "start_soon":
      params.set("ordering", "start_at,created_at");
      break;
    case "duration_short":
      params.set("ordering", "duration_minutes,title");
      break;
    case "students_high":
      params.set("ordering", "-assigned_student_count,title");
      break;
    case "questions_high":
      params.set("ordering", "-active_questions_count,title");
      break;
    case "title":
      params.set("ordering", "title");
      break;
    case "recommended":
    default:
      break;
  }

  return `/api/v1/exams/?${params.toString()}`;
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

async function loadPlatformExams(args: {
  statusFilter: PlatformExamStatusFilter;
  sourceFilter: PlatformExamSourceFilter;
  sortOption: PlatformExamSortOption;
  selectedInstituteId: string;
  page: number;
}) {
  try {
    const exams = await fetchPortalPage<TeacherExamListItem>(buildPlatformExamApiPath(args));
    return {
      source: "live" as const,
      exams,
    };
  } catch {
    return {
      source: "error" as const,
      exams: {
        count: 0,
        next: null,
        previous: null,
        results: [] as TeacherExamListItem[],
      } satisfies PortalPage<TeacherExamListItem>,
    };
  }
}

async function loadPlatformExamCatalogSummary(selectedInstituteId: string) {
  const query = selectedInstituteId ? `?institute=${encodeURIComponent(selectedInstituteId)}` : "";
  return fetchPortalRecord<PlatformExamCatalogSummary>(`/api/v1/exams/platform-catalog-summary/${query}`).catch(
    (): PlatformExamCatalogSummary => ({
      total_count: 0,
      source_counts: {},
      status_counts: {},
    }),
  );
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
    page?: string;
  }>;
}) {
  await requirePlatformAdminSession();
  const params = (await searchParams) ?? {};
  const pageNumber = resolvePageNumber(params.page);
  const instituteOptions = await fetchPortalList<InstituteOption>("/api/v1/institutes/?page_size=100").catch(() => []);
  const requestedInstituteId = params.institute ?? "";
  const selectedInstituteFromOptions = instituteOptions.find((item) => item.id === requestedInstituteId) ?? null;
  const selectedInstitute =
    selectedInstituteFromOptions ??
    (requestedInstituteId
      ? await fetchPortalRecord<InstituteOption>(`/api/v1/institutes/${requestedInstituteId}/`).catch(() => null)
      : null);
  const institutes =
    selectedInstitute && !instituteOptions.some((item) => item.id === selectedInstitute.id)
      ? [selectedInstitute, ...instituteOptions]
      : instituteOptions;
  const selectedInstituteId = normalizeSelectedInstitute(requestedInstituteId, institutes);
  const statusFilter = resolvePlatformExamStatusFilter(params.exam_status);
  const sourceFilter = resolvePlatformExamSourceFilter(params.exam_source);
  const sortOption = resolvePlatformExamSortOption(params.exam_sort);
  const groupOption = resolvePlatformExamGroupOption(params.exam_group);
  const [{ source, exams }, summary] = await Promise.all([
    loadPlatformExams({
      page: pageNumber,
      selectedInstituteId,
      sortOption,
      sourceFilter,
      statusFilter,
    }),
    loadPlatformExamCatalogSummary(selectedInstituteId),
  ]);
  const visibleExams = exams.results;
  const groupedExams = groupPlatformExams(visibleExams, groupOption);
  const platformCount = summary.source_counts.platform ?? 0;
  const instituteCount = summary.source_counts.institute ?? 0;
  const teacherCount = summary.source_counts.teacher ?? 0;
  const liveCount = summary.status_counts.live ?? 0;
  const draftCount = summary.status_counts.draft ?? 0;
  const totalPageCount = Math.max(1, Math.ceil(exams.count / ADMIN_EXAM_PAGE_SIZE));
  const pageLabel = `Page ${Math.min(pageNumber, totalPageCount)} of ${totalPageCount}`;

  return (
    <div className="studentPage studentDashboardModern instituteConsolePage instituteExamsPageVivid">
      <PlatformAdminPageHeader
        title="Exam Management"
        description="Review exam coverage and create exam shells from one governance view."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonGhost" href="/admin/exams/preset-packs">
              Preset Library
            </Link>
            <Link className="button buttonSecondary" href="/admin/exams/new">
              New Exam
            </Link>
            <Link className="button buttonPrimary" href="/admin/exams/advanced">
              Advanced Builder
            </Link>
          </div>
        }
      />

      <div className="pageUtilityRow">
        <span className={`statusPill ${source === "live" ? "statusLive" : "statusDemo"}`}>
          {source === "live" ? `${exams.count} exams in filtered scope` : "Unable to load exams"}
        </span>
        {source === "live" ? <span className="statusPill statusDefault">{pageLabel}</span> : null}
      </div>

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow="Load issue"
          title="Platform exams could not be loaded"
          description="We couldn't load platform exams right now."
          bullets={["Platform exams", "Governance access"]}
          ctaHref="/admin"
          ctaLabel="Back to Dashboard"
          statusLabel="Try again soon"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Platform governance</span>
              <strong>Platform exam governance</strong>
              <small>
                {summary.total_count} total · {platformCount} platform · {instituteCount} institute · {teacherCount} teacher · {liveCount} live
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/admin/exams/new">
                New Exam
              </Link>
              <Link className="button buttonSecondary" href="/admin/exams/advanced">
                Advanced Builder
              </Link>
              <Link className="button buttonSecondary" href="/admin/academic-setup">
                View Academic Setup
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Total Exams</span>
              <strong>{exams.count}</strong>
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
                {visibleExams.length !== exams.count ? ` of ${exams.count}` : ""}
              </span>
            </div>
            <form
              key={[selectedInstituteId, statusFilter, sourceFilter, sortOption, groupOption].join("|")}
              className="workspaceFiltersForm"
              method="GET"
            >
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
              <div className="workspaceFilterActions workspaceFilterActionsFullRow">
                <button className="button buttonPrimary" type="submit">
                  Update View
                </button>
                <Link className="button buttonSecondary" href="/admin/exams">
                  Reset View
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

          {summary.total_count === 0 ? (
            <StudentStatePanel
              eyebrow="No exams in scope"
              title="No exams are visible to platform governance yet"
              description="Exam shells will appear here with source ownership metadata once they are created."
              ctaHref="/admin/exams/new"
              ctaLabel="Create First Exam"
              statusLabel="Waiting for exams"
            />
          ) : exams.count === 0 ? (
            <StudentStatePanel
              eyebrow="No matching exams"
              title="No exams match these platform controls"
              description="Try a broader source or status filter, change the grouping, or reset the controls."
              ctaHref={selectedInstituteId ? "/admin/exams" : "/admin/exams"}
              ctaLabel="Reset exam filters"
              statusLabel="Filter returned zero exams"
            />
          ) : (
            <>
              {groupedExams.map((group) => (
                <section className="workspaceResultsGroup" key={group.label}>
                  {groupOption !== "none" ? (
                    <div className="sectionHeading">
                      <strong>{group.label}</strong>
                      <span>{group.items.length} exams on this page</span>
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
                            {examSubjectDisplayLabel(exam) ? ` · ${examSubjectDisplayLabel(exam)}` : ""}
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
                          "No additional notes were added for this exam."}
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
                              View Exam
                            </Link>
                        </div>
                      </div>
                    </article>
                    ))}
                  </div>
                </section>
              ))}

              <nav className="questionBankPagination" aria-label="Admin exam catalog pagination">
                <span>{pageLabel}</span>
                <div className="questionBankButtonRow">
                  {exams.previous && pageNumber > 1 ? (
                    <Link
                      className="button buttonGhost"
                      href={buildPlatformExamFilterHref({
                        group: groupOption,
                        institute: selectedInstituteId,
                        page: pageNumber - 1,
                        sort: sortOption,
                        source: sourceFilter,
                        status: statusFilter,
                      })}
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="button buttonGhost questionBankButtonDisabled">Previous</span>
                  )}
                  {exams.next ? (
                    <Link
                      className="button buttonSecondary"
                      href={buildPlatformExamFilterHref({
                        group: groupOption,
                        institute: selectedInstituteId,
                        page: pageNumber + 1,
                        sort: sortOption,
                        source: sourceFilter,
                        status: statusFilter,
                      })}
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="button buttonSecondary questionBankButtonDisabled">Next</span>
                  )}
                </div>
              </nav>
            </>
          )}
        </>
      )}
    </div>
  );
}
