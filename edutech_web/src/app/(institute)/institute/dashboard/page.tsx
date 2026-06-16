import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { fetchPortalCount, fetchPortalRecord } from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  is_active: boolean;
  exam_defaults: Record<string, unknown>;
};

async function loadCount(path: string) {
  try {
    return await fetchPortalCount(path);
  } catch {
    return 0;
  }
}

export default async function InstituteDashboardPage() {
  const profile = await requireInstituteAdminSession();
  const instituteQuery = profile.institute ? `?institute=${profile.institute}` : "";

  const institute = profile.institute
    ? await fetchPortalRecord<InstituteRecord>(`/api/v1/institutes/${profile.institute}/`).catch(() => null)
    : null;

  const [
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
    loadCount(`/api/v1/academics/academic-years/${instituteQuery}`),
    loadCount(`/api/v1/academics/programs/${instituteQuery}`),
    loadCount(`/api/v1/academics/cohorts/${instituteQuery}`),
    loadCount(`/api/v1/academics/subjects/${instituteQuery}`),
    loadCount(`/api/v1/academics/topics/${instituteQuery}`),
    loadCount(`/api/v1/students/${instituteQuery}`),
    loadCount(`/api/v1/teachers/${instituteQuery}`),
    loadCount(`/api/v1/exams/${instituteQuery}`),
    loadCount(`/api/v1/results/${instituteQuery}`),
  ]);

  const examDefaultCount = institute?.exam_defaults ? Object.keys(institute.exam_defaults).length : 0;
  const peopleCount = studentCount + teacherCount;
  const academicStructureCount =
    academicYearCount + programCount + cohortCount + subjectCount + topicCount;
  const activeCoverageSignals = [
    peopleCount > 0,
    academicStructureCount > 0,
    examCount > 0,
    resultCount > 0,
    examDefaultCount > 0,
  ].filter(Boolean).length;
  const readinessScore = Math.round((activeCoverageSignals / 5) * 100);

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

  return (
    <section className="studentPage studentPageTight studentDashboardModern adminDashboardPage instituteConsolePage">
      <PageHeader
        eyebrow="Institute workspace"
        title={institute?.name ?? "Institute dashboard"}
        description=""
        contextLabel={institute ? `${institute.code} · institute scope only` : "Institute scope only"}
        className="pageHeaderCompact"
      />

      <section className="adminCommandDeck">
        <div className="adminCommandDeckHero">
          <span className="studentDashboardTag">Institute control</span>
          <h2>Run daily institute operations from one compact surface</h2>
          <div className="adminHeroMetaRow">
            <span>{peopleCount} people in scope</span>
            <span>{academicStructureCount} academic units tracked</span>
            <span>{examCount} exams and {resultCount} results</span>
          </div>
          <div className="instituteConsoleActions">
            <Link className="button buttonPrimary" href="/institute/people">
              Open people
            </Link>
            <Link className="button buttonSecondary" href="/institute/academic-setup">
              Open academic setup
            </Link>
          </div>
        </div>

        <div className="adminCommandDeckAside">
          <article className="adminExecutiveStat adminExecutiveStatPrimary">
            <span>Readiness score</span>
            <strong>{readinessScore}%</strong>
            <small>{activeCoverageSignals} of 5 core institute signals currently reporting non-zero data.</small>
          </article>
          <article className="adminExecutiveStat">
            <span>Institute</span>
            <strong>{institute?.code ?? "Unlinked"}</strong>
            <small>{institute?.is_active ? "Active institute record in scope." : "Institute record needs review."}</small>
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

      <section className="adminWorkspaceGrid">
        <article className="dashboardPanel adminPriorityPanel">
          <div className="sectionHeading">
            <strong>Priority lanes</strong>
            <span>Institute actions that should stay visible every day</span>
          </div>
          <div className="adminPriorityGrid">
            {priorityLanes.map((lane) => (
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
