import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { fetchPortalCount } from "@/lib/api/portal";
import { requirePlatformAdminSession } from "@/lib/auth/session";
import { buildFilterHref, formatFilterValue, resolveFilterValue } from "@/lib/workspace/filter-utils";

type AdminDashboardFocus = "all" | "institutes" | "people" | "academics" | "reports";
type AdminDashboardSort = "recommended" | "highest_value" | "title";

async function loadCount(path: string) {
  try {
    return await fetchPortalCount(path);
  } catch {
    return 0;
  }
}

function resolveAdminDashboardFocus(value?: string): AdminDashboardFocus {
  return resolveFilterValue(value, ["institutes", "people", "academics", "reports"], "all");
}

function resolveAdminDashboardSort(value?: string): AdminDashboardSort {
  return resolveFilterValue(value, ["highest_value", "title"], "recommended");
}

function buildAdminDashboardHref(args: { focus?: AdminDashboardFocus; sort?: AdminDashboardSort }) {
  return buildFilterHref("/admin", [
    ["focus", args.focus, "all"],
    ["sort", args.sort, "recommended"],
  ]);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string; sort?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const profile = await requirePlatformAdminSession();
  const [
    instituteCount,
    academicYearCount,
    programCount,
    cohortCount,
    subjectCount,
    topicCount,
    studentCount,
    teacherCount,
    examCount,
    resultCount,
  ] = await Promise.all([
    loadCount("/api/v1/institutes/"),
    loadCount("/api/v1/academics/academic-years/"),
    loadCount("/api/v1/academics/programs/"),
    loadCount("/api/v1/academics/cohorts/"),
    loadCount("/api/v1/academics/subjects/"),
    loadCount("/api/v1/academics/topics/"),
    loadCount("/api/v1/students/"),
    loadCount("/api/v1/teachers/"),
    loadCount("/api/v1/exams/"),
    loadCount("/api/v1/results/"),
  ]);

  const activePeopleCount = studentCount + teacherCount;
  const academicStructureCount =
    academicYearCount + programCount + cohortCount + subjectCount + topicCount;
  const activeCoverageSignals = [
    instituteCount > 0,
    activePeopleCount > 0,
    academicStructureCount > 0,
    examCount > 0,
    resultCount > 0,
  ].filter(Boolean).length;
  const coverageScore = Math.round((activeCoverageSignals / 5) * 100);
  const examDataPressure = examCount > 0 && resultCount === 0;
  const governanceSignals = [
    {
      label: "Institute network",
      value: instituteCount,
      note:
        instituteCount > 0
          ? "Institutes are visible to platform governance."
          : "No institutes are currently visible to platform governance.",
      tone: instituteCount > 0 ? "live" : "warning",
    },
    {
      label: "People coverage",
      value: activePeopleCount,
      note:
        activePeopleCount > 0
          ? "Student and teacher records are present in platform scope."
          : "No people records are currently loaded into platform scope.",
      tone: activePeopleCount > 0 ? "live" : "warning",
    },
    {
      label: "Academic backbone",
      value: academicStructureCount,
      note:
        academicStructureCount > 0
          ? "Academic structure entities are available for global oversight."
          : "Academic structure coverage has not been established yet.",
      tone: academicStructureCount > 0 ? "live" : "warning",
    },
    {
      label: "Assessment data",
      value: examCount + resultCount,
      note: examDataPressure
        ? "Exams exist, but published result depth has not started yet."
        : "Exam and result records are contributing to reporting visibility.",
      tone: examDataPressure ? "warning" : examCount + resultCount > 0 ? "live" : "default",
    },
  ] as const;
  const priorityLanes = [
    {
      title: "Institute oversight",
      value: instituteCount,
      meta: "Institutes in scope",
      description: "Review institute presence, readiness, and whether the platform footprint is expanding cleanly.",
      href: "/admin/institutes",
      action: "Open institutes",
    },
    {
      title: "People operations",
      value: activePeopleCount,
      meta: "Students and teachers",
      description: "Keep population growth, login readiness, and roster support visible from one lane.",
      href: "/admin/people",
      action: "Open people",
    },
    {
      title: "Academic governance",
      value: academicStructureCount,
      meta: "Tracked academic units",
      description: "Monitor academic-year, program, cohort, subject, and topic completeness across the network.",
      href: "/admin/academic-setup",
      action: "Open academic setup",
    },
    {
      title: "Reporting and policy",
      value: examCount + resultCount,
      meta: "Exam and result records",
      description: "Inspect whether assessment activity is translating into usable reporting and platform controls.",
      href: "/admin/reports",
      action: "Open reports",
    },
  ] as const;
  const actionCards = [
    {
      title: "Review institute growth",
      description: "Use the institute directory to validate which campuses are active and visible right now.",
      href: "/admin/institutes",
      action: "Go to institutes",
    },
    {
      title: "Inspect people readiness",
      description: "Check student and teacher volume before scaling more delivery workflows.",
      href: "/admin/people",
      action: "Go to people",
    },
    {
      title: "Check reporting depth",
      description: "Confirm exams are turning into result coverage and operational insight instead of staying shallow.",
      href: "/admin/reports",
      action: "Go to reports",
    },
  ] as const;
  const focus = resolveAdminDashboardFocus(params.focus);
  const sortOption = resolveAdminDashboardSort(params.sort);
  const visiblePriorityLanes = [...priorityLanes]
    .filter((lane) => {
      if (focus === "all") return true;
      if (focus === "institutes") return lane.title === "Institute oversight";
      if (focus === "people") return lane.title === "People operations";
      if (focus === "academics") return lane.title === "Academic governance";
      if (focus === "reports") return lane.title === "Reporting and policy";
      return true;
    })
    .sort((left, right) => {
      if (sortOption === "highest_value") return right.value - left.value;
      if (sortOption === "title") return left.title.localeCompare(right.title);
      return 0;
    });
  const visibleActionCards = [...actionCards]
    .filter((card) => {
      if (focus === "all") return true;
      if (focus === "institutes") return card.href.includes("institutes");
      if (focus === "people") return card.href.includes("people");
      if (focus === "academics") return card.href.includes("academic");
      if (focus === "reports") return card.href.includes("reports");
      return true;
    })
    .sort((left, right) => (sortOption === "title" ? left.title.localeCompare(right.title) : 0));

  return (
    <section className="studentPage studentPageTight studentDashboardModern adminDashboardPage instituteConsolePage">
      <PlatformAdminPageHeader
        title={`Platform Control for ${profile.display_name || profile.username}`}
        description="Track institute readiness, academic backbone health, people provisioning, and assessment coverage from one shared governance workspace."
        statusLabel={instituteCount > 0 ? `${instituteCount} institutes in scope` : "No institutes available"}
        statusTone={instituteCount > 0 ? "live" : "warning"}
      />

      <section className="adminCommandDeck">
        <div className="adminCommandDeckHero">
          <span className="studentDashboardTag">Global governance</span>
          <h2>Use the full workspace to monitor platform coverage, not just browse routes</h2>
          <p>
            This page now works as a compact control layer for platform-admin decisions:
            footprint, people, academic backbone, and assessment visibility are all surfaced here
            before you move into deeper workflows.
          </p>
          <div className="adminHeroMetaRow">
            <span>{activePeopleCount} people in scope</span>
            <span>{academicStructureCount} academic units tracked</span>
            <span>{examCount} exams and {resultCount} results</span>
          </div>
        </div>

        <div className="adminCommandDeckAside">
          <article className="adminExecutiveStat adminExecutiveStatPrimary">
            <span>Coverage score</span>
            <strong>{coverageScore}%</strong>
            <small>{activeCoverageSignals} of 5 core governance signals currently reporting non-zero data.</small>
          </article>
          <article className="adminExecutiveStat">
            <span>Institutes</span>
            <strong>{instituteCount}</strong>
            <small>Global scope currently visible to this workspace.</small>
          </article>
          <article className="adminExecutiveStat">
            <span>Results depth</span>
            <strong>{resultCount}</strong>
            <small>
              {examDataPressure
                ? "Assessment records exist but results have not matured yet."
                : "Result rows available for downstream reporting."}
            </small>
          </article>
        </div>
      </section>

      <section className="resultsSummaryGrid adminMetricsGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Platform footprint</span>
          <strong>{instituteCount}</strong>
          <small>Institutes currently visible to platform governance.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>People</span>
          <strong>{activePeopleCount}</strong>
          <small>Combined student and teacher population in scope.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Academic units</span>
          <strong>{academicStructureCount}</strong>
          <small>Years, programs, cohorts, subjects, and topics combined.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Assessment layer</span>
          <strong>{examCount + resultCount}</strong>
          <small>Exam and result records currently visible to governance.</small>
        </article>
        <article className="metricCard dashboardHeroCard adminMetricCardAccent">
          <span>Results</span>
          <strong>{resultCount}</strong>
          <small>Published or stored exam outcome rows.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Academic years</span>
          <strong>{academicYearCount}</strong>
          <small>Global academic windows and cycles.</small>
        </article>
      </section>

      <section className="adminSignalGrid">
        {governanceSignals.map((signal) => (
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
              <option value="institutes">Institutes</option>
              <option value="people">People</option>
              <option value="academics">Academics</option>
              <option value="reports">Reports</option>
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
            <Link className="button buttonSecondary" href="/admin">
              Reset filters
            </Link>
          </div>
        </form>
        <div className="workspaceFilterQuickRow">
          <span className="workspaceFilterQuickLabel">Quick filters</span>
          <div className="workspaceFilterQuickChips">
            {[
              { label: "All", href: buildAdminDashboardHref({}), active: focus === "all" && sortOption === "recommended" },
              { label: "Institutes", href: buildAdminDashboardHref({ focus: "institutes", sort: sortOption }), active: focus === "institutes" },
              { label: "People", href: buildAdminDashboardHref({ focus: "people", sort: sortOption }), active: focus === "people" },
              { label: "Academics", href: buildAdminDashboardHref({ focus: "academics", sort: sortOption }), active: focus === "academics" },
              { label: "Reports", href: buildAdminDashboardHref({ focus: "reports", sort: sortOption }), active: focus === "reports" },
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
            <span>Where platform-admin time should go first</span>
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
            <span>Raw inventory behind the governance score</span>
          </div>
          <div className="adminStructureGrid">
            <article className="metricCard compact">
              <span>Programs</span>
              <strong>{programCount}</strong>
              <small>Program structures across the platform.</small>
            </article>
            <article className="metricCard compact">
              <span>Cohorts</span>
              <strong>{cohortCount}</strong>
              <small>Active learner cohorts in the platform.</small>
            </article>
            <article className="metricCard compact">
              <span>Subjects</span>
              <strong>{subjectCount}</strong>
              <small>Mapped subjects across institutes.</small>
            </article>
            <article className="metricCard compact">
              <span>Topics</span>
              <strong>{topicCount}</strong>
              <small>Topic taxonomy available to the platform.</small>
            </article>
          </div>
        </article>
      </section>

      <section className="dashboardLowerGrid adminDashboardLowerGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Current coverage</strong>
            <span>What the platform-admin surface already owns</span>
          </div>
          <div className="weakTopicStack">
            <div className="weakTopicRow">
              <div>
                <strong>Institute and people governance</strong>
                <span>Institute visibility, roster oversight, and user management are available in dedicated admin routes.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{instituteCount + activePeopleCount}</strong>
                <span>Institutes and people in scope</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Academic operations</strong>
                <span>Years, programs, cohorts, subjects, and topics can be reviewed from the global academic setup lane.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{academicStructureCount}</strong>
                <span>Tracked academic units</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Security, economy, and reporting</strong>
                <span>Operational oversight routes exist for policy review, reporting, and exam-level control expansion.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>3 routes</strong>
                <span>Oversight lanes</span>
              </div>
            </div>
          </div>
        </article>

        <article className="dashboardPanel adminActionPanel">
          <div className="sectionHeading">
            <strong>Quick actions</strong>
            <span>Move directly into the next admin workflow</span>
          </div>
          <div className="adminActionGrid">
            {visibleActionCards.map((card) => (
              <article className="adminActionCard" key={card.title}>
                <div>
                  <strong>{card.title}</strong>
                  <p>{card.description}</p>
                </div>
                <Link className="button buttonSecondary" href={card.href}>
                  {card.action}
                </Link>
              </article>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
