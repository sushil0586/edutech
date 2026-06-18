import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { PageHeader } from "@/components/ui/page-header";
import { fetchInstituteDashboardSummary } from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { buildFilterHref, formatFilterValue, resolveFilterValue } from "@/lib/workspace/filter-utils";

type InstituteDashboardFocus = "all" | "people" | "academics" | "assessments";
type InstituteDashboardSort = "recommended" | "highest_value" | "title";

function resolveInstituteDashboardFocus(value?: string): InstituteDashboardFocus {
  return resolveFilterValue(value, ["people", "academics", "assessments"], "all");
}

function resolveInstituteDashboardSort(value?: string): InstituteDashboardSort {
  return resolveFilterValue(value, ["highest_value", "title"], "recommended");
}

function buildInstituteDashboardHref(args: { focus?: InstituteDashboardFocus; sort?: InstituteDashboardSort }) {
  return buildFilterHref("/institute/dashboard", [
    ["focus", args.focus, "all"],
    ["sort", args.sort, "recommended"],
  ]);
}

export default async function InstituteDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string; sort?: string }>;
}) {
  const params = (await searchParams) ?? {};
  await requireInstituteAdminSession();
  const dashboard = await fetchInstituteDashboardSummary().catch(() => null);
  const institute = dashboard?.institute ?? null;
  const academicYearCount = dashboard?.counts.academic_years ?? 0;
  const programCount = dashboard?.counts.programs ?? 0;
  const cohortCount = dashboard?.counts.cohorts ?? 0;
  const subjectCount = dashboard?.counts.subjects ?? 0;
  const topicCount = dashboard?.counts.topics ?? 0;
  const studentCount = dashboard?.counts.students ?? 0;
  const teacherCount = dashboard?.counts.teachers ?? 0;
  const examCount = dashboard?.counts.exams ?? 0;
  const resultCount = dashboard?.counts.results ?? 0;
  const examDefaultCount = dashboard?.institute.exam_default_count ?? 0;
  const peopleCount = dashboard?.derived.people_count ?? 0;
  const academicStructureCount = dashboard?.derived.academic_structure_count ?? 0;
  const activeCoverageSignals = dashboard?.derived.active_coverage_signals ?? 0;
  const readinessScore = dashboard?.derived.readiness_score ?? 0;

  const instituteSignals = [
    {
      label: "People readiness",
      value: peopleCount,
      note:
        peopleCount > 0
          ? "Student and teacher records are present in this institute scope."
          : "No student or teacher records are loaded into this institute yet.",
      tone: peopleCount > 0 ? "live" : "warning",
    },
    {
      label: "Academic backbone",
      value: academicStructureCount,
      note:
        academicStructureCount > 0
          ? "Academic years, programs, cohorts, subjects, and topics are available."
          : "Academic structure has not been set up yet for this institute.",
      tone: academicStructureCount > 0 ? "live" : "warning",
    },
    {
      label: "Assessment coverage",
      value: examCount + resultCount,
      note:
        examCount > 0
          ? "Assessment records are available for institute-side operations."
          : "No exams have been created in this institute scope yet.",
      tone: examCount > 0 ? "live" : "default",
    },
    {
      label: "Policy defaults",
      value: examDefaultCount,
      note:
        examDefaultCount > 0
          ? "Institute-wide exam defaults are configured."
          : "Exam defaults still need to be configured for this institute.",
      tone: examDefaultCount > 0 ? "live" : "warning",
    },
  ] as const;

  const priorityLanes = [
    {
      title: "People operations",
      value: peopleCount,
      meta: "Students and teachers",
      description: "Provision students and teachers, review access readiness, and keep roster quality tight.",
      href: "/institute/people",
      action: "Open people",
    },
    {
      title: "Academic setup",
      value: academicStructureCount,
      meta: "Academic units",
      description: "Manage academic years, programs, cohorts, subjects, topics, and teacher assignment scope.",
      href: "/institute/academic-setup",
      action: "Open academic setup",
    },
    {
      title: "Assessments",
      value: examCount + resultCount,
      meta: "Exam and result records",
      description: "Review how institute-side exam activity is progressing before expanding delivery.",
      href: "/institute/exams",
      action: "Open exams",
    },
  ] as const;
  const focus = resolveInstituteDashboardFocus(params.focus);
  const sortOption = resolveInstituteDashboardSort(params.sort);
  const visiblePriorityLanes = [...priorityLanes]
    .filter((lane) => {
      if (focus === "all") return true;
      if (focus === "people") return lane.title === "People operations";
      if (focus === "academics") return lane.title === "Academic setup";
      if (focus === "assessments") return lane.title === "Assessments";
      return true;
    })
    .sort((left, right) => {
      if (sortOption === "highest_value") return right.value - left.value;
      if (sortOption === "title") return left.title.localeCompare(right.title);
      return 0;
    });

  return (
    <section className="studentPage studentPageTight studentDashboardModern adminDashboardPage instituteConsolePage">
      <PageHeader
        eyebrow="Institute workspace"
        title={institute?.name ?? "Institute dashboard"}
        description=""
        contextLabel={institute ? `${institute.code} · institute scope only` : "Institute scope only"}
        className="pageHeaderCompact"
      />

      <section className="adminInstituteHero">
        <div className="adminInstituteHeroCopy">
          <span className="studentDashboardTag">Institute control</span>
          <strong>Run daily institute operations from one clearer command surface</strong>
          <p>
            Keep people setup, academic structure, assessments, and policy defaults visible in one place so
            the team can see what is ready and what still needs attention.
          </p>
          <div className="adminInstituteHeroMeta">
            <span>{peopleCount} people in scope</span>
            <span>{academicStructureCount} academic units tracked</span>
            <span>{examCount} exams and {resultCount} results</span>
            <span>{activeCoverageSignals} active readiness signals</span>
          </div>
          <div className="instituteConsoleActions adminInstituteHeroActions">
            <Link className="button buttonPrimary" href="/institute/people">
              Open people
            </Link>
            <Link className="button buttonSecondary" href="/institute/academic-setup">
              Open academic setup
            </Link>
            <Link className="button buttonGhost" href="/institute/exams">
              Open exams
            </Link>
          </div>
        </div>

        <div className="adminInstituteHeroAside">
          <div className="adminInstituteHeroAsideStack">
            <article className="adminInstituteHeroAsideCard adminInstituteHeroAsideCardPrimary">
              <span>Readiness score</span>
              <strong>{readinessScore}%</strong>
              <small>{activeCoverageSignals} of 5 core institute signals currently reporting non-zero data.</small>
            </article>
            <article className="adminInstituteHeroAsideCard">
              <span>Institute status</span>
              <strong>{institute?.code ?? "Unlinked"}</strong>
              <small>{institute?.is_active ? "Active institute record in scope." : "Institute record needs review."}</small>
            </article>
          </div>
          <div className="adminInstituteHeroMiniStats">
            <article className="adminInstituteHeroMiniStat">
              <span>Students</span>
              <strong>{studentCount}</strong>
              <small>Learners in institute scope.</small>
            </article>
            <article className="adminInstituteHeroMiniStat">
              <span>Teachers</span>
              <strong>{teacherCount}</strong>
              <small>Faculty records available.</small>
            </article>
            <article className="adminInstituteHeroMiniStat">
              <span>Results</span>
              <strong>{resultCount}</strong>
              <small>Outcome rows currently stored.</small>
            </article>
            <article className="adminInstituteHeroMiniStat">
              <span>Defaults</span>
              <strong>{examDefaultCount}</strong>
              <small>Exam policy fields configured.</small>
            </article>
          </div>
        </div>
      </section>

      <section className="adminCommandDeck">
        <div className="adminCommandDeckHero">
          <span className="studentDashboardTag">Operational pulse</span>
          <h2>Track readiness, inventory, and action lanes at a glance</h2>
          <p>
            Use these summary cards to spot missing setup before it blocks exams, results, or staff workflows.
          </p>
          <div className="adminHeroMetaRow">
            <span>{programCount} programs</span>
            <span>{cohortCount} cohorts</span>
            <span>{subjectCount} subjects</span>
            <span>{topicCount} topics</span>
          </div>
        </div>

        <div className="adminCommandDeckAside">
          <article className="adminExecutiveStat adminExecutiveStatPrimary">
            <span>Readiness score</span>
            <strong>{readinessScore}%</strong>
            <small>{activeCoverageSignals} of 5 core institute signals currently reporting non-zero data.</small>
          </article>
          <article className="adminExecutiveStat">
            <span>Assessment coverage</span>
            <strong>{examCount + resultCount}</strong>
            <small>Combined exam and result records currently visible.</small>
          </article>
          <article className="adminExecutiveStat">
            <span>Defaults</span>
            <strong>{examDefaultCount}</strong>
            <small>Institute-wide exam policy fields currently configured.</small>
          </article>
        </div>
      </section>

      <section className="resultsSummaryGrid adminMetricsGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Students</span>
          <strong>{studentCount}</strong>
          <small>Students currently in this institute scope.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Teachers</span>
          <strong>{teacherCount}</strong>
          <small>Teachers currently in this institute scope.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Academic units</span>
          <strong>{academicStructureCount}</strong>
          <small>Years, programs, cohorts, subjects, and topics combined.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Exams</span>
          <strong>{examCount}</strong>
          <small>Assessment shells currently available.</small>
        </article>
        <article className="metricCard dashboardHeroCard adminMetricCardAccent">
          <span>Results</span>
          <strong>{resultCount}</strong>
          <small>Published or stored exam outcome rows.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Exam defaults</span>
          <strong>{examDefaultCount}</strong>
          <small>Institute-wide exam policy fields.</small>
        </article>
      </section>

      <section className="adminSignalGrid">
        {instituteSignals.map((signal) => (
          <article className={`dashboardPanel adminSignalCard adminSignalCard${signal.tone}`} key={signal.label}>
            <span className="studentDashboardTag">{signal.label}</span>
            <strong>{signal.value}</strong>
            <p>{signal.note}</p>
          </article>
        ))}
      </section>

      <section className="contentCard workspaceFiltersCard">
        <div className="sectionHeading">
          <strong>Dashboard Focus</strong>
          <span>{visiblePriorityLanes.length} priority lanes in view</span>
        </div>
        <form className="workspaceFiltersForm" method="GET">
          <label className="workspaceFilterField">
            <span>Focus lane</span>
            <select defaultValue={focus} name="focus">
              <option value="all">All areas</option>
              <option value="people">People</option>
              <option value="academics">Academics</option>
              <option value="assessments">Assessments</option>
            </select>
          </label>
          <label className="workspaceFilterField">
            <span>Sort by</span>
            <select defaultValue={sortOption} name="sort">
              <option value="recommended">Recommended order</option>
              <option value="highest_value">Highest value</option>
              <option value="title">Title A-Z</option>
            </select>
          </label>
          <div className="workspaceFilterActions">
            <button className="button buttonPrimary" type="submit">
              Apply filters
            </button>
            <Link className="button buttonSecondary" href="/institute/dashboard">
              Reset filters
            </Link>
          </div>
        </form>
        <div className="workspaceFilterQuickRow">
          <span className="workspaceFilterQuickLabel">Quick filters</span>
          <div className="workspaceFilterQuickChips">
            {[
              { label: "All", href: buildInstituteDashboardHref({}), active: focus === "all" && sortOption === "recommended" },
              { label: "People", href: buildInstituteDashboardHref({ focus: "people", sort: sortOption }), active: focus === "people" },
              { label: "Academics", href: buildInstituteDashboardHref({ focus: "academics", sort: sortOption }), active: focus === "academics" },
              { label: "Assessments", href: buildInstituteDashboardHref({ focus: "assessments", sort: sortOption }), active: focus === "assessments" },
            ].map((chip) => (
              <Link key={chip.label} className={`workspaceQuickChip${chip.active ? " workspaceQuickChipActive" : ""}`} href={chip.href}>
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
        <FilterSummaryPills
          items={[
            { label: "Focus", value: formatFilterValue(focus) },
            { label: "Sort", value: formatFilterValue(sortOption) },
          ]}
        />
      </section>

      <section className="adminWorkspaceGrid">
        <article className="dashboardPanel adminPriorityPanel">
          <div className="sectionHeading">
            <strong>Priority lanes</strong>
            <span>Institute actions that should stay visible every day</span>
          </div>
          <div className="adminPriorityGrid">
            {visiblePriorityLanes.map((lane) => (
              <div className="adminPriorityCard" key={lane.title}>
                <div className="adminPriorityCardHeader">
                  <div>
                    <strong>{lane.title}</strong>
                    <span>{lane.description}</span>
                  </div>
                  <div className="adminPriorityCardMetric">
                    <strong>{lane.value}</strong>
                    <span>{lane.meta}</span>
                  </div>
                </div>
                <Link className="button buttonGhost" href={lane.href}>
                  {lane.action}
                </Link>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboardPanel adminStructurePanel">
          <div className="sectionHeading">
            <strong>Academic structure detail</strong>
            <span>Institute-scoped inventory only</span>
          </div>
          <div className="adminStructureGrid">
            <article className="metricCard compact">
              <span>Academic years</span>
              <strong>{academicYearCount}</strong>
              <small>Operating academic windows.</small>
            </article>
            <article className="metricCard compact">
              <span>Programs</span>
              <strong>{programCount}</strong>
              <small>Program structures assigned to this institute.</small>
            </article>
            <article className="metricCard compact">
              <span>Cohorts</span>
              <strong>{cohortCount}</strong>
              <small>Active learner cohorts.</small>
            </article>
            <article className="metricCard compact">
              <span>Subjects</span>
              <strong>{subjectCount}</strong>
              <small>Mapped subject catalog.</small>
            </article>
            <article className="metricCard compact">
              <span>Topics</span>
              <strong>{topicCount}</strong>
              <small>Topic hierarchy coverage.</small>
            </article>
          </div>
        </article>
      </section>
    </section>
  );
}
