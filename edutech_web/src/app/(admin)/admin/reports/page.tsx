import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type { TeacherInsightSummary, TeacherResultSummary } from "@/features/dashboard/types";
import {
  fetchTeacherExamPage,
  fetchTeacherInsightSummary,
  fetchTeacherResultSummary,
  getTeacherApiState,
} from "@/lib/api/teacher";
import { buildFilterHref, formatFilterValue, resolveFilterValue } from "@/lib/workspace/filter-utils";

type AdminReportLane = "all" | "publication" | "performance" | "weak_topics" | "students";
type AdminReportSortOption =
  | "recommended"
  | "backlog_high"
  | "score_low"
  | "score_high"
  | "attempts_high";

function percentage(value: string | number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : "0%";
}

function resolveReportLane(value?: string): AdminReportLane {
  return resolveFilterValue(value, ["publication", "performance", "weak_topics", "students"], "all");
}

function resolveReportSortOption(value?: string): AdminReportSortOption {
  return resolveFilterValue(value, ["backlog_high", "score_low", "score_high", "attempts_high"], "recommended");
}

function buildAdminReportHref(args: {
  lane?: AdminReportLane;
  sort?: AdminReportSortOption;
  subject?: string;
}) {
  return buildFilterHref("/admin/reports", [
    ["lane", args.lane, "all"],
    ["sort", args.sort, "recommended"],
    ["subject", args.subject, "all"],
  ]);
}

async function loadPlatformReports() {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      insightSummary: null as TeacherInsightSummary | null,
      resultSummary: [] as TeacherResultSummary[],
      liveExamCount: 0,
      completedExamCount: 0,
    };
  }

  try {
    const [insightSummary, resultSummary, liveExamsPage, completedExamsPage] = await Promise.all([
      fetchTeacherInsightSummary(),
      fetchTeacherResultSummary(),
      fetchTeacherExamPage({ page: 1, pageSize: 1, filter: "live", sort: "recommended" }),
      fetchTeacherExamPage({ page: 1, pageSize: 1, filter: "completed", sort: "recommended" }),
    ]);

    return {
      source: "live" as const,
      insightSummary,
      resultSummary,
      liveExamCount: liveExamsPage.count,
      completedExamCount: completedExamsPage.count,
    };
  } catch {
    return {
      source: "error" as const,
      insightSummary: null as TeacherInsightSummary | null,
      resultSummary: [] as TeacherResultSummary[],
      liveExamCount: 0,
      completedExamCount: 0,
    };
  }
}

function pendingCount(summary: TeacherResultSummary) {
  return Math.max(summary.total_attempted - summary.total_passed - summary.total_failed, 0);
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ lane?: string; sort?: string; subject?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const { source, insightSummary, resultSummary, liveExamCount, completedExamCount } =
    await loadPlatformReports();
  const overview = insightSummary?.overview ?? null;
  const lane = resolveReportLane(params.lane);
  const sortOption = resolveReportSortOption(params.sort);
  const subjectFilter = params.subject?.trim() || "all";
  const unpublishedSummaries = resultSummary.filter((summary) => !summary.results_published);
  const weakTopicSubjects = Array.from(
    new Set((insightSummary?.weak_topics ?? []).map((topic) => topic.subject_name).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  const visibleBacklog = [...unpublishedSummaries].sort((left, right) => {
    switch (sortOption) {
      case "score_low":
        return Number(left.average_percentage) - Number(right.average_percentage);
      case "score_high":
        return Number(right.average_percentage) - Number(left.average_percentage);
      case "attempts_high":
        return right.total_attempted - left.total_attempted;
      case "backlog_high":
      case "recommended":
      default:
        return pendingCount(right) - pendingCount(left);
    }
  });

  const visibleExamOverview = [...(insightSummary?.exam_overview ?? [])].sort((left, right) => {
    switch (sortOption) {
      case "score_low":
        return Number(left.average_percentage) - Number(right.average_percentage);
      case "score_high":
        return Number(right.average_percentage) - Number(left.average_percentage);
      case "attempts_high":
        return right.total_attempted - left.total_attempted;
      case "backlog_high":
      case "recommended":
      default:
        return Number(right.average_percentage) - Number(left.average_percentage);
    }
  });

  const visibleWeakTopics = (insightSummary?.weak_topics ?? [])
    .filter((topic) => (subjectFilter === "all" ? true : topic.subject_name === subjectFilter))
    .sort((left, right) => {
      switch (sortOption) {
        case "attempts_high":
          return right.attempted_questions - left.attempted_questions;
        case "score_high":
          return Number(right.average_percentage) - Number(left.average_percentage);
        case "backlog_high":
        case "score_low":
        case "recommended":
        default:
          return Number(left.average_percentage) - Number(right.average_percentage);
      }
    });

  const highPerformers = [...(insightSummary?.high_performing_students ?? [])].sort(
    (left, right) => Number(right.average_percentage) - Number(left.average_percentage),
  );
  const lowPerformers = [...(insightSummary?.low_performing_students ?? [])].sort(
    (left, right) => Number(left.average_percentage) - Number(right.average_percentage),
  );

  return (
    <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid">
      <PlatformAdminPageHeader
        title="Reports"
        description="Review platform-wide reporting health across tracked exams, attempt volume, publication backlog, and academic weak spots."
        statusLabel={
          source === "live"
            ? `${overview?.tracked_exams ?? 0} tracked exams`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Reports unavailable"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Operational Reporting</span>
          <strong>Platform reporting overview</strong>
          <small>
            {resultSummary.length} result summaries · {unpublishedSummaries.length} still awaiting full publication
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href="/admin/security">
            Open Security
          </Link>
          <Link className="button buttonSecondary" href="/admin/economy">
            Open Economy
          </Link>
        </div>
      </section>

      {source !== "live" || !overview || !insightSummary ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for platform reporting data"
              : "Platform reports could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active platform-admin account to load reporting data from live backend summary endpoints."
              : "The platform reports page is connected to live summary endpoints, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Teacher insight summary API", "Teacher result summary API", "Platform session access"]
              : ["Backend connectivity", "Platform-admin reporting access"]
          }
          ctaHref="/admin"
          ctaLabel="Back to Dashboard"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : (
        <>
          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Tracked exams</span>
              <strong>{overview.tracked_exams}</strong>
              <small>{liveExamCount} live and {completedExamCount} completed in current scope.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Total attempts</span>
              <strong>{overview.total_attempts}</strong>
              <small>Platform-wide recorded attempt volume.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Average performance</span>
              <strong>{percentage(overview.average_percentage)}</strong>
              <small>Backend-computed average score.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Accuracy</span>
              <strong>{percentage(overview.accuracy_percentage)}</strong>
              <small>Question-level accuracy across tracked attempts.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Pending publication queues</span>
              <strong>{unpublishedSummaries.length}</strong>
              <small>Exam summaries not yet fully published.</small>
            </article>
          </section>

          <section className="contentCard workspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Report Controls</strong>
              <span>
                {visibleBacklog.length} backlog items · {visibleWeakTopics.length} weak-topic signals
              </span>
            </div>
            <form className="workspaceFiltersForm" method="GET">
              <label className="workspaceFilterField">
                <span>Focus lane</span>
                <select defaultValue={lane} name="lane">
                  <option value="all">All lanes</option>
                  <option value="publication">Publication</option>
                  <option value="performance">Performance</option>
                  <option value="weak_topics">Weak topics</option>
                  <option value="students">Students</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Subject</span>
                <select defaultValue={subjectFilter} name="subject">
                  <option value="all">All subjects</option>
                  {weakTopicSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Sort by</span>
                <select defaultValue={sortOption} name="sort">
                  <option value="recommended">Recommended order</option>
                  <option value="backlog_high">Highest backlog</option>
                  <option value="score_low">Lowest score first</option>
                  <option value="score_high">Highest score first</option>
                  <option value="attempts_high">Most attempts</option>
                </select>
              </label>
              <div className="workspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
                </button>
                <Link className="button buttonSecondary" href="/admin/reports">
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="workspaceFilterQuickRow">
              <span className="workspaceFilterQuickLabel">Quick filters</span>
              <div className="workspaceFilterQuickChips">
                {[
                  { label: "All", href: buildAdminReportHref({}), active: lane === "all" && sortOption === "recommended" && subjectFilter === "all" },
                  { label: "Pending Publication", href: buildAdminReportHref({ lane: "publication", sort: "backlog_high", subject: subjectFilter }), active: lane === "publication" },
                  { label: "Lowest Mastery", href: buildAdminReportHref({ lane: "weak_topics", sort: "score_low", subject: subjectFilter }), active: lane === "weak_topics" && sortOption === "score_low" },
                  { label: "Most Attempts", href: buildAdminReportHref({ lane: "performance", sort: "attempts_high", subject: subjectFilter }), active: lane === "performance" && sortOption === "attempts_high" },
                  { label: "Top Performers", href: buildAdminReportHref({ lane: "students", sort: "score_high", subject: subjectFilter }), active: lane === "students" && sortOption === "score_high" },
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
                { label: "Lane", value: formatFilterValue(lane) },
                { label: "Subject", value: subjectFilter },
                { label: "Sort", value: formatFilterValue(sortOption) },
              ]}
            />
          </section>

          {lane === "all" || lane === "publication" || lane === "performance" ? (
            <section className="dashboardLowerGrid">
              <article className="dashboardPanel weakTopicsPanel">
                <div className="studentPageTight">
                  <span className="studentDashboardTag">Publication backlog</span>
                  <h3>Completed or evaluated exams still needing result attention</h3>
                  {visibleBacklog.length === 0 ? (
                    <div className="featurePlaceholder">
                      <p>All returned exam summaries appear fully published right now.</p>
                    </div>
                  ) : (
                    <div className="weakTopicStack">
                      {visibleBacklog.slice(0, 6).map((summary) => (
                        <div className="weakTopicRow" key={summary.id}>
                          <div>
                            <strong>{summary.exam_title}</strong>
                            <span>
                              {summary.exam_code} · {summary.total_attempted} attempts · {pendingCount(summary)} still pending evaluation
                            </span>
                          </div>
                          <div className="weakTopicMeta">
                            <strong>{percentage(summary.average_percentage)}</strong>
                            <span>{summary.published_results_count}/{summary.total_results_count} published</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>

              <article className="dashboardPanel weakTopicsPanel">
                <div className="studentPageTight">
                  <span className="studentDashboardTag">Exam performance mix</span>
                  <h3>How visible exams are performing</h3>
                  <div className="weakTopicStack">
                    {visibleExamOverview.slice(0, 6).map((exam) => (
                      <div className="weakTopicRow" key={exam.exam_id}>
                        <div>
                          <strong>{exam.exam_title}</strong>
                          <span>
                            {exam.exam_code} · {exam.total_attempted} attempts · {exam.total_passed} passed
                          </span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{percentage(exam.average_percentage)}</strong>
                          <span>High {exam.highest_score} · Low {exam.lowest_score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {lane === "all" || lane === "weak_topics" || lane === "students" ? (
            <section className="dashboardLowerGrid">
              <article className="dashboardPanel weakTopicsPanel">
                <div className="studentPageTight">
                  <span className="studentDashboardTag">Weak topics</span>
                  <h3>Platform-level academic pressure points</h3>
                  {visibleWeakTopics.length === 0 ? (
                    <div className="featurePlaceholder">
                      <p>No weak-topic analytics matched the current subject and sorting controls.</p>
                    </div>
                  ) : (
                    <div className="weakTopicStack">
                      {visibleWeakTopics.slice(0, 6).map((topic, index) => (
                        <div className="weakTopicRow" key={`${topic.subject_name}-${topic.topic_name ?? "topic"}-${index}`}>
                          <div>
                            <strong>{topic.topic_name || "Unspecified topic"}</strong>
                            <span>{topic.subject_name} · {topic.attempted_questions} attempted questions</span>
                          </div>
                          <div className="weakTopicMeta">
                            <strong>{percentage(topic.average_percentage)}</strong>
                            <span>Average mastery</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>

              <article className="dashboardPanel weakTopicsPanel">
                <div className="studentPageTight">
                  <span className="studentDashboardTag">Student distribution</span>
                  <h3>Who is currently strongest and who needs support</h3>
                  <div className="weakTopicStack">
                    {highPerformers.slice(0, 3).map((student) => (
                      <div className="weakTopicRow" key={`high-${student.student_id}`}>
                        <div>
                          <strong>{student.student_name}</strong>
                          <span>High performing · {student.admission_no}</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{percentage(student.average_percentage)}</strong>
                          <span>Average</span>
                        </div>
                      </div>
                    ))}
                    {lowPerformers.slice(0, 3).map((student) => (
                      <div className="weakTopicRow" key={`low-${student.student_id}`}>
                        <div>
                          <strong>{student.student_name}</strong>
                          <span>Needs support · {student.admission_no}</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{percentage(student.average_percentage)}</strong>
                          <span>Average</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
