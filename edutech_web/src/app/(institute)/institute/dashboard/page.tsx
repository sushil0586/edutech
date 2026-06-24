import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { PageHeader } from "@/components/ui/page-header";
import type { StudentExamExperienceProfile } from "@/features/dashboard/types";
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

function assessmentFamilyTone(code: string) {
  if (code === "competitive") return "statusWarning";
  if (code === "certification") return "statusLive";
  if (code === "language_proficiency") return "statusDemo";
  return "statusLive";
}

function percentage(value: string) {
  return `${Math.round(Number(value))}%`;
}

function formatDuration(seconds: number) {
  if (!seconds) return "0m";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatCompactSeconds(seconds: number) {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return formatDuration(seconds);
}

function normalizeLabel(value: string | null | undefined) {
  return value?.replaceAll("_", " ") ?? "";
}

function summarizeAssessmentFamily(profile: StudentExamExperienceProfile | null | undefined) {
  const familyCode = profile?.assessment_family ?? "general";
  const familyLabel = profile?.assessment_family_label ?? "General";
  const deliveryEmphasis = normalizeLabel(profile?.delivery_emphasis) || "balanced delivery";
  const summaryMap: Record<string, string> = {
    school: "Track syllabus coverage, concept mastery, and where reteaching should happen next.",
    competitive: "Track rank pressure, speed, accuracy, and negative-marking exposure.",
    certification: "Track scenario judgment, domain readiness, and distractor quality.",
    language_proficiency: "Track skill bands, rubric evidence, and delivery quality across media-backed sections.",
    general: "Track accuracy, topic mastery, and question-level risk.",
  };
  return {
    familyCode,
    familyLabel,
    deliveryEmphasis,
    summary: summaryMap[familyCode] ?? summaryMap.general,
  };
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
  const pendingReviewTasks = dashboard?.counts.pending_review_tasks ?? 0;
  const blockedReviewExams = dashboard?.counts.blocked_review_exams ?? 0;
  const recheckReviewTasks = dashboard?.counts.recheck_review_tasks ?? 0;
  const examDefaultCount = dashboard?.institute.exam_default_count ?? 0;
  const assessmentFamilyMix = dashboard?.counts.assessment_family_mix ?? [];
  const peopleCount = dashboard?.derived.people_count ?? 0;
  const academicStructureCount = dashboard?.derived.academic_structure_count ?? 0;
  const activeCoverageSignals = dashboard?.derived.active_coverage_signals ?? 0;
  const readinessScore = dashboard?.derived.readiness_score ?? 0;
  const activeAssessmentFamilies = dashboard?.derived.active_assessment_families ?? 0;
  const analyticsReadyExams = dashboard?.derived.analytics_ready_exams ?? 0;
  const analyticsResultRows = dashboard?.derived.analytics_result_rows ?? 0;
  const recentExamAnalytics = dashboard?.recent_exam_analytics ?? [];
  const aggregateScoreDistribution = dashboard?.aggregate_score_distribution ?? [];
  const weakestSections = recentExamAnalytics
    .filter((exam) => exam.section_performance.length)
    .map((exam) => ({
      examId: exam.exam_id,
      examTitle: exam.exam_title,
      section:
        exam.section_performance
          .slice()
          .sort((left, right) => left.accuracy_percentage - right.accuracy_percentage)[0] ?? null,
    }))
    .filter((item) => item.section);

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
    {
      label: "Review operations",
      value: pendingReviewTasks,
      note:
        pendingReviewTasks > 0
          ? `${blockedReviewExams} exam(s) currently have unresolved review work.`
          : "No unresolved review tasks are currently blocking results.",
      tone: pendingReviewTasks > 0 ? "warning" : "live",
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
            <span>{pendingReviewTasks} review task(s) open</span>
            <span>{activeCoverageSignals} active readiness signals</span>
            <span>{activeAssessmentFamilies} active family profile(s)</span>
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
            <Link className="button buttonGhost" href="/institute/reviews">
              Open reviews
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
              <span>Reviews</span>
              <strong>{pendingReviewTasks}</strong>
              <small>{recheckReviewTasks} recheck · {blockedReviewExams} blocked exam(s)</small>
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
          <article className="adminExecutiveStat">
            <span>Assessment families</span>
            <strong>{activeAssessmentFamilies}</strong>
            <small>Program-family profiles currently active in this institute.</small>
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
        <article className="metricCard dashboardHeroCard">
          <span>Family profiles</span>
          <strong>{activeAssessmentFamilies}</strong>
          <small>Distinct assessment families mapped across active programs.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Analytics-ready exams</span>
          <strong>{analyticsReadyExams}</strong>
          <small>Recent exam summaries available for institute analytics.</small>
        </article>
        <article className="metricCard dashboardHeroCard adminMetricCardAccent">
          <span>Analytics result rows</span>
          <strong>{analyticsResultRows}</strong>
          <small>Visible learner outcomes inside recent score bands.</small>
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

      <section className="dashboardGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Assessment family mix</strong>
            <span>{assessmentFamilyMix.length} profile rows</span>
          </div>
          <div className="weakTopicStack">
            {assessmentFamilyMix.length ? (
              assessmentFamilyMix.map((family) => (
                <div className="weakTopicRow" key={family.code}>
                  <div>
                    <strong>{family.label}</strong>
                    <span>{family.code === "unassigned" ? "Programs still need a mapped family profile." : "Program setup is aligned to this assessment family."}</span>
                  </div>
                  <div className="weakTopicMeta">
                    <span className={`statusPill ${assessmentFamilyTone(family.code)}`}>{family.label}</span>
                    <strong>{family.program_count}</strong>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Assessment family mix will appear after programs are configured.</p>
            )}
          </div>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Institute score distribution</strong>
            <span>{analyticsResultRows} recent result rows</span>
          </div>
          <div className="weakTopicStack">
            {aggregateScoreDistribution.length ? (
              aggregateScoreDistribution.map((bucket) => (
                <div className="weakTopicRow" key={bucket.label}>
                  <div>
                    <strong>{bucket.label}</strong>
                    <span>{Math.round(bucket.percentage_share)}% of recent visible learner outcomes</span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{bucket.count}</strong>
                    <span>result rows</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Score-band analytics will appear after exam summaries are calculated.</p>
            )}
          </div>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Section watchlist</strong>
            <span>{weakestSections.length} exam sections flagged</span>
          </div>
          <div className="weakTopicStack">
            {weakestSections.length ? (
              weakestSections.map((item) => (
                <div className="weakTopicRow" key={`${item.examId}-${item.section?.section_id ?? item.section?.section_name}`}>
                  <div>
                    <strong>{item.section?.section_name ?? "No section"}</strong>
                    <span>{item.examTitle}</span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{Math.round(item.section?.accuracy_percentage ?? 0)}%</strong>
                    <span>avg time {formatCompactSeconds(item.section?.average_time_seconds ?? 0)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Section-level pressure indicators will appear once section summaries are available.</p>
            )}
          </div>
        </article>
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel">
          <div className="sectionHeading">
            <strong>Recent assessment analytics</strong>
            <span>{recentExamAnalytics.length} exam summaries</span>
          </div>
          <div className="weakTopicStack">
            {recentExamAnalytics.length ? (
              recentExamAnalytics.map((exam) => {
                const familySummary = summarizeAssessmentFamily(exam.experience_profile);
                const weakestSection =
                  exam.section_performance
                    .slice()
                    .sort((left, right) => left.accuracy_percentage - right.accuracy_percentage)[0] ?? null;
                return (
                  <div className="weakTopicRow" key={exam.exam_id}>
                    <div>
                      <strong>{exam.exam_title}</strong>
                      <span>{exam.exam_code}</span>
                      <div className="questionBankTagRow">
                        <span className={`statusPill ${assessmentFamilyTone(familySummary.familyCode)}`}>
                          {familySummary.familyLabel}
                        </span>
                        <span className="questionBankTagChip">{familySummary.deliveryEmphasis}</span>
                        {weakestSection ? (
                          <span className="questionBankTagChip">Weakest section: {weakestSection.section_name}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{percentage(exam.average_percentage)}</strong>
                      <span>{exam.total_attempted} attempts</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="emptyText">Recent exam analytics will appear once results are calculated for this institute.</p>
            )}
          </div>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Assessment family lens</strong>
            <span>{recentExamAnalytics.length} summaries scanned</span>
          </div>
          <div className="weakTopicStack">
            {recentExamAnalytics.length ? (
              recentExamAnalytics.map((exam) => {
                const familySummary = summarizeAssessmentFamily(exam.experience_profile);
                return (
                  <div className="weakTopicRow" key={`${exam.exam_id}-family`}>
                    <div>
                      <strong>{familySummary.familyLabel}</strong>
                      <span>{familySummary.summary}</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{percentage(exam.average_percentage)}</strong>
                      <span>{exam.total_passed} passed · {exam.total_failed} failed</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="emptyText">Family-aware coaching guidance will appear after result summaries are available.</p>
            )}
          </div>
        </article>
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
