import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { LiveMonitorRefresh } from "@/components/ui/live-monitor-refresh";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type {
  TeacherExamAttemptPage,
  TeacherExamListItem,
  TeacherExamPage,
  TeacherLiveExamMonitor,
} from "@/features/dashboard/types";
import {
  fetchTeacherExamAttemptPage,
  fetchTeacherExamPage,
  fetchTeacherLiveExamMonitor,
  getTeacherApiState,
} from "@/lib/api/teacher";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import {
  attemptHealth,
  attemptHealthLabel,
  attemptHealthPriorityScore,
  groupSecurityAttempts,
  SecurityAttemptFilter,
  SecurityAttemptGroup,
  SecurityAttemptSort,
  SecurityExamFilter,
  SecurityExamSort,
  securityTitleCase,
} from "@/lib/workspace/attempt-risk";
import { buildFilterHref, formatFilterValue, resolveFilterValue } from "@/lib/workspace/filter-utils";

type SecuritySearchParams = {
  examId?: string;
  exam_filter?: string;
  exam_sort?: string;
  exam_page?: string;
  exam_page_size?: string;
  attempt_filter?: string;
  attempt_sort?: string;
  attempt_group?: string;
  attempt_page?: string;
  attempt_page_size?: string;
  search?: string;
};

const SECURITY_EXAM_FILTERS = ["all", "live", "elevated", "access_key", "completed"] as const;
const SECURITY_EXAM_SORTS = ["recommended", "latest", "title", "risk_high", "students"] as const;
const SECURITY_ATTEMPT_FILTERS = ["all", "critical", "watch", "stable", "in_progress", "auto_submitted"] as const;
const SECURITY_ATTEMPT_SORTS = ["risk_high", "latest", "name", "alerts_high", "score_low"] as const;
const SECURITY_ATTEMPT_GROUPS = ["none", "health", "status"] as const;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatDateTime(value: string | null) {
  if (!value) return "Not available";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function loadInstituteSecurity(
  selectedExamId: string | undefined,
  examPage: number,
  examPageSize: number,
  examFilter: SecurityExamFilter,
  examSort: SecurityExamSort,
  attemptPage: number,
  attemptPageSize: number,
  attemptFilter: SecurityAttemptFilter,
  attemptSort: SecurityAttemptSort,
  search: string,
) {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      examsPage: null as TeacherExamPage | null,
      selectedExam: null as TeacherExamListItem | null,
      liveMonitor: null as TeacherLiveExamMonitor | null,
      attemptsPage: null as TeacherExamAttemptPage | null,
    };
  }

  try {
    const examsPage = await fetchTeacherExamPage({
      page: examPage,
      pageSize: examPageSize,
      filter: examFilter,
      sort: examSort,
      search,
    });
    const exams = examsPage.results;
    const selectedExam =
      exams.find((exam) => exam.id === selectedExamId) ??
      exams.find((exam) => exam.status === "live") ??
      exams.find((exam) => exam.security_mode !== "normal") ??
      exams[0] ??
      null;

    if (!selectedExam) {
      return {
        source: "live" as const,
        examsPage,
        selectedExam: null,
        liveMonitor: null,
        attemptsPage: null,
      };
    }

    const [liveMonitor, attemptsPage] = await Promise.all([
      fetchTeacherLiveExamMonitor(selectedExam.id).catch(() => null),
      fetchTeacherExamAttemptPage(selectedExam.id, {
        page: attemptPage,
        pageSize: attemptPageSize,
        filter: attemptFilter,
        sort: attemptSort,
        search,
      }).catch(() => null),
    ]);

    return {
      source: "live" as const,
      examsPage,
      selectedExam,
      liveMonitor,
      attemptsPage,
    };
  } catch {
    return {
      source: "error" as const,
      examsPage: null as TeacherExamPage | null,
      selectedExam: null as TeacherExamListItem | null,
      liveMonitor: null as TeacherLiveExamMonitor | null,
      attemptsPage: null as TeacherExamAttemptPage | null,
    };
  }
}

function buildInstituteSecurityHref(filters: {
  examId?: string;
  examFilter: SecurityExamFilter;
  examSort: SecurityExamSort;
  examPage: number;
  examPageSize: number;
  attemptFilter: SecurityAttemptFilter;
  attemptSort: SecurityAttemptSort;
  attemptGroup: SecurityAttemptGroup;
  attemptPage: number;
  attemptPageSize: number;
  search: string;
}) {
  return buildFilterHref("/institute/security", [
    ["examId", filters.examId],
    ["exam_filter", filters.examFilter, "all"],
    ["exam_sort", filters.examSort, "recommended"],
    ["exam_page", String(filters.examPage), "1"],
    ["exam_page_size", String(filters.examPageSize), "8"],
    ["attempt_filter", filters.attemptFilter, "all"],
    ["attempt_sort", filters.attemptSort, "risk_high"],
    ["attempt_group", filters.attemptGroup, "none"],
    ["attempt_page", String(filters.attemptPage), "1"],
    ["attempt_page_size", String(filters.attemptPageSize), "12"],
    ["search", filters.search],
  ]);
}

export default async function InstituteSecurityPage({
  searchParams,
}: {
  searchParams: Promise<SecuritySearchParams>;
}) {
  await requireInstituteAdminSession();
  const params = await searchParams;
  const examId = params.examId;
  const examFilter = resolveFilterValue(params.exam_filter, SECURITY_EXAM_FILTERS, "all");
  const examSort = resolveFilterValue(params.exam_sort, SECURITY_EXAM_SORTS, "recommended");
  const examPage = parsePositiveInt(params.exam_page, 1);
  const examPageSize = parsePositiveInt(params.exam_page_size, 8);
  const attemptFilter = resolveFilterValue(params.attempt_filter, SECURITY_ATTEMPT_FILTERS, "all");
  const attemptSort = resolveFilterValue(params.attempt_sort, SECURITY_ATTEMPT_SORTS, "risk_high");
  const attemptGroup = resolveFilterValue(params.attempt_group, SECURITY_ATTEMPT_GROUPS, "none");
  const attemptPage = parsePositiveInt(params.attempt_page, 1);
  const attemptPageSize = parsePositiveInt(params.attempt_page_size, 12);
  const search = params.search?.trim() ?? "";

  const { source, examsPage, selectedExam, liveMonitor, attemptsPage } = await loadInstituteSecurity(
    examId,
    examPage,
    examPageSize,
    examFilter,
    examSort,
    attemptPage,
    attemptPageSize,
    attemptFilter,
    attemptSort,
    search,
  );
  const exams = examsPage?.results ?? [];
  const nonNormalExams = exams.filter((exam) => exam.security_mode !== "normal");
  const focusExams = exams.filter((exam) => exam.security_mode === "focus").length;
  const fullscreenExams = exams.filter((exam) => exam.security_mode === "fullscreen").length;
  const accessKeyExams = exams.filter((exam) => exam.access_key_enabled).length;
  const criticalAttempts = liveMonitor?.attempts_by_health.critical ?? 0;
  const watchAttempts = liveMonitor?.attempts_by_health.watch ?? 0;
  const visibleExams = exams;
  const examCount = examsPage?.count ?? 0;
  const examTotalPages = Math.max(Math.ceil(examCount / examPageSize), 1);
  const safeExamPage = Math.min(examPage, examTotalPages);
  const pagedExams = visibleExams;
  const attempts = attemptsPage?.results ?? [];
  const attemptCount = attemptsPage?.count ?? 0;
  const attemptTotalPages = Math.max(Math.ceil(attemptCount / attemptPageSize), 1);
  const safeAttemptPage = Math.min(attemptPage, attemptTotalPages);
  const groupedAttempts = groupSecurityAttempts(attempts, attemptGroup);

  return (
    <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSecurityPageVivid">
      <InstitutePageHeader
        title="Security Oversight"
        description="Review exam security posture, access-key usage, and live integrity pressure from one institute-wide operational screen."
        statusLabel={
          source === "live"
            ? `${nonNormalExams.length} exams using elevated security`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Security data unavailable"
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
          <span className="studentDashboardTag">Assessment integrity</span>
          <strong>Keep configuration posture and live exam risk signals visible from the same institute control layer</strong>
          <p>
            This screen does not invent a separate security admin system. It reflects the security modes and integrity
            monitoring signals already attached to institute-scoped exams and attempts.
          </p>
          <small>
            {accessKeyExams} access-key exams · {criticalAttempts} critical attempts in selected exam
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href="/institute/exams">
            Open Exams
          </Link>
          <Link className="button buttonSecondary" href="/institute/results">
            Open Results
          </Link>
        </div>
      </section>

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for institute security visibility"
              : "Institute security data could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active institute admin account to inspect exam security modes and live integrity monitoring."
              : "The institute security page is connected to live exam and monitoring endpoints, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Exam list API", "Live monitor API", "Exam attempt monitoring API"]
              : ["Backend connectivity", "Institute-scoped security access"]
          }
          ctaHref="/institute/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : (
        <>
          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Elevated security exams</span>
              <strong>{nonNormalExams.length}</strong>
              <small>Exams not using the default normal mode.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Focus mode exams</span>
              <strong>{focusExams}</strong>
              <small>Integrity warnings monitored with focus signals.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Fullscreen exams</span>
              <strong>{fullscreenExams}</strong>
              <small>Exams configured for fullscreen enforcement.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Access-key protected</span>
              <strong>{accessKeyExams}</strong>
              <small>Exams currently gated by an access key.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Watchlist attempts</span>
              <strong>{criticalAttempts + watchAttempts}</strong>
              <small>Attempts in the selected exam needing attention.</small>
            </article>
          </section>

          <section className="contentCard workspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Security Controls</strong>
              <span>{visibleExams.length} exams visible · {attemptCount} attempts in watchlist scope</span>
            </div>
            <form className="workspaceFiltersForm" method="GET">
              {selectedExam?.id ? <input name="examId" type="hidden" value={selectedExam.id} /> : null}
              <input name="exam_page" type="hidden" value="1" />
              <input name="attempt_page" type="hidden" value="1" />
              <label className="workspaceFilterField workspaceFilterFieldWide">
                <span>Search</span>
                <input
                  defaultValue={search}
                  name="search"
                  placeholder="Exam code, learner, admission no, or status"
                  type="search"
                />
              </label>
              <label className="workspaceFilterField">
                <span>Exam filter</span>
                <select defaultValue={examFilter} name="exam_filter">
                  <option value="all">All exams</option>
                  <option value="live">Live exams</option>
                  <option value="elevated">Elevated security</option>
                  <option value="access_key">Access key</option>
                  <option value="completed">Completed exams</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Exam sort</span>
                <select defaultValue={examSort} name="exam_sort">
                  <option value="recommended">Recommended</option>
                  <option value="risk_high">Highest risk</option>
                  <option value="latest">Latest activity</option>
                  <option value="students">Most students</option>
                  <option value="title">Title</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Attempt filter</span>
                <select defaultValue={attemptFilter} name="attempt_filter">
                  <option value="all">All attempts</option>
                  <option value="critical">Critical</option>
                  <option value="watch">Watch</option>
                  <option value="stable">Stable</option>
                  <option value="in_progress">In progress</option>
                  <option value="auto_submitted">Auto submitted</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Attempt sort</span>
                <select defaultValue={attemptSort} name="attempt_sort">
                  <option value="risk_high">Highest risk</option>
                  <option value="latest">Latest activity</option>
                  <option value="alerts_high">Most alerts</option>
                  <option value="score_low">Lowest score</option>
                  <option value="name">Student name</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Group attempts</span>
                <select defaultValue={attemptGroup} name="attempt_group">
                  <option value="none">No grouping</option>
                  <option value="health">Health</option>
                  <option value="status">Status</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Exam page size</span>
                <select defaultValue={String(examPageSize)} name="exam_page_size">
                  <option value="8">8</option>
                  <option value="12">12</option>
                  <option value="16">16</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Attempt page size</span>
                <select defaultValue={String(attemptPageSize)} name="attempt_page_size">
                  <option value="12">12</option>
                  <option value="18">18</option>
                  <option value="24">24</option>
                </select>
              </label>
              <div className="workspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
                </button>
                <Link
                  className="button buttonSecondary"
                  href={buildInstituteSecurityHref({
                    examId: selectedExam?.id,
                    examFilter: "all",
                    examSort: "recommended",
                    examPage: 1,
                    examPageSize: 8,
                    attemptFilter: "all",
                    attemptSort: "risk_high",
                    attemptGroup: "none",
                    attemptPage: 1,
                    attemptPageSize: 12,
                    search: "",
                  })}
                >
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="workspaceFilterQuickRow">
              <span className="workspaceFilterQuickLabel">Quick filters</span>
              <div className="workspaceFilterQuickChips">
                {[
                  {
                    label: "Live Exams",
                    href: buildInstituteSecurityHref({
                      examId: selectedExam?.id,
                      examFilter: "live",
                      examSort,
                      examPage: 1,
                      examPageSize,
                      attemptFilter,
                      attemptSort,
                      attemptGroup,
                      attemptPage: 1,
                      attemptPageSize,
                      search,
                    }),
                    active: examFilter === "live",
                  },
                  {
                    label: "Critical Attempts",
                    href: buildInstituteSecurityHref({
                      examId: selectedExam?.id,
                      examFilter,
                      examSort,
                      examPage: 1,
                      examPageSize,
                      attemptFilter: "critical",
                      attemptSort,
                      attemptGroup,
                      attemptPage: 1,
                      attemptPageSize,
                      search,
                    }),
                    active: attemptFilter === "critical",
                  },
                  {
                    label: "Most Alerts",
                    href: buildInstituteSecurityHref({
                      examId: selectedExam?.id,
                      examFilter,
                      examSort,
                      examPage: 1,
                      examPageSize,
                      attemptFilter,
                      attemptSort: "alerts_high",
                      attemptGroup,
                      attemptPage: 1,
                      attemptPageSize,
                      search,
                    }),
                    active: attemptSort === "alerts_high",
                  },
                  {
                    label: "Group by Health",
                    href: buildInstituteSecurityHref({
                      examId: selectedExam?.id,
                      examFilter,
                      examSort,
                      examPage: 1,
                      examPageSize,
                      attemptFilter,
                      attemptSort,
                      attemptGroup: "health",
                      attemptPage: 1,
                      attemptPageSize,
                      search,
                    }),
                    active: attemptGroup === "health",
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
                { label: "Exam scope", value: formatFilterValue(examFilter) },
                { label: "Exam sort", value: formatFilterValue(examSort) },
                { label: "Attempt scope", value: formatFilterValue(attemptFilter) },
                { label: "Attempt sort", value: formatFilterValue(attemptSort) },
                { label: "Group", value: formatFilterValue(attemptGroup) },
                { label: "Exam page", value: `${safeExamPage}/${examTotalPages}` },
                { label: "Attempt page", value: `${safeAttemptPage}/${attemptTotalPages}` },
                { label: "Search", value: search },
              ]}
            />
          </section>

          <section className="dashboardLowerGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Exam selector</span>
                <h3>Choose the exam you want to monitor right now</h3>
                {exams.length === 0 ? (
                  <div className="featurePlaceholder">
                    <p>No institute exams were returned for security oversight.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {visibleExams.length ? pagedExams.map((exam) => (
                      <div className="weakTopicRow" key={exam.id}>
                        <div>
                          <strong>{exam.title}</strong>
                          <span>
                            {securityTitleCase(exam.security_mode)}
                            {exam.access_key_enabled ? " · Access key enabled" : " · No access key"}
                          </span>
                        </div>
                        <div className="resultCardActions">
                          <Link
                            className={selectedExam?.id === exam.id ? "button buttonPrimary" : "button buttonSecondary"}
                            href={buildInstituteSecurityHref({
                              examId: exam.id,
                              examFilter,
                              examSort,
                              examPage: safeExamPage,
                              examPageSize,
                              attemptFilter,
                              attemptSort,
                              attemptGroup,
                              attemptPage: safeAttemptPage,
                              attemptPageSize,
                              search,
                            })}
                          >
                            {selectedExam?.id === exam.id ? "Watching" : "Watch Exam"}
                          </Link>
                        </div>
                      </div>
                    )) : (
                      <div className="featurePlaceholder">
                        <p>No exams match the current selector filters.</p>
                      </div>
                    )}
                  </div>
                )}
                {visibleExams.length > examPageSize ? (
                  <div className="workspaceFilterActions">
                    <Link
                      className="button buttonSecondary"
                      href={
                        safeExamPage <= 1
                          ? "#"
                          : buildInstituteSecurityHref({
                              examId: selectedExam?.id,
                              examFilter,
                              examSort,
                              examPage: safeExamPage - 1,
                              examPageSize,
                              attemptFilter,
                              attemptSort,
                              attemptGroup,
                              attemptPage: safeAttemptPage,
                              attemptPageSize,
                              search,
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
                          : buildInstituteSecurityHref({
                              examId: selectedExam?.id,
                              examFilter,
                              examSort,
                              examPage: safeExamPage + 1,
                              examPageSize,
                              attemptFilter,
                              attemptSort,
                              attemptGroup,
                              attemptPage: safeAttemptPage,
                              attemptPageSize,
                              search,
                            })
                      }
                    >
                      Next
                    </Link>
                  </div>
                ) : null}
              </div>
            </article>
          </section>

          {selectedExam ? (
            <>
              <LiveMonitorRefresh intervalSeconds={20} />

              <section className="dashboardLowerGrid">
                <article className="dashboardPanel weakTopicsPanel">
                  <div className="studentPageTight">
                    <span className="studentDashboardTag">Selected exam</span>
                    <h3>{selectedExam.title}</h3>
                    <div className="weakTopicStack">
                      <div className="weakTopicRow">
                        <div>
                          <strong>Security mode</strong>
                          <span>{securityTitleCase(selectedExam.security_mode)} · {selectedExam.code}</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{selectedExam.access_key_enabled ? "Enabled" : "Disabled"}</strong>
                          <span>Access key</span>
                        </div>
                      </div>
                      <div className="weakTopicRow">
                        <div>
                          <strong>Exam lifecycle</strong>
                          <span>{securityTitleCase(selectedExam.status)} · {selectedExam.duration_minutes} min</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{selectedExam.assigned_student_count}</strong>
                          <span>Assigned students</span>
                        </div>
                      </div>
                      <div className="weakTopicRow">
                        <div>
                          <strong>Monitoring snapshot</strong>
                          <span>
                            {liveMonitor
                              ? `${liveMonitor.in_progress_students} in progress · ${liveMonitor.alerted_attempts} alerted`
                              : "Live monitor data not available for this exam right now."}
                          </span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{formatDateTime(liveMonitor?.last_activity_at ?? null)}</strong>
                          <span>Last activity</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="dashboardPanel weakTopicsPanel">
                  <div className="studentPageTight">
                    <span className="studentDashboardTag">Live posture</span>
                    <h3>Current monitoring totals</h3>
                    {liveMonitor ? (
                      <div className="resultsSummaryGrid">
                        <article className="metricCard metricCardPrimary dashboardHeroCard">
                          <span>In progress</span>
                          <strong>{liveMonitor.in_progress_students}</strong>
                          <small>Students currently active in the exam.</small>
                        </article>
                        <article className="metricCard dashboardHeroCard">
                          <span>Alerted attempts</span>
                          <strong>{liveMonitor.alerted_attempts}</strong>
                          <small>{liveMonitor.high_alert_attempts} high and {liveMonitor.medium_alert_attempts} medium alerts.</small>
                        </article>
                        <article className="metricCard dashboardHeroCard">
                          <span>Auto-submitted</span>
                          <strong>{liveMonitor.auto_submitted_students}</strong>
                          <small>Attempts already enforced automatically.</small>
                        </article>
                        <article className="metricCard dashboardHeroCard">
                          <span>Completion</span>
                          <strong>{Math.round(liveMonitor.completion_percentage)}%</strong>
                          <small>{liveMonitor.completed_students} completed students.</small>
                        </article>
                      </div>
                    ) : (
                      <div className="featurePlaceholder">
                        <p>Live monitor data is not available for the selected exam at the moment.</p>
                      </div>
                    )}
                  </div>
                </article>
              </section>

              <section className="dashboardLowerGrid">
                <article className="dashboardPanel weakTopicsPanel">
                  <div className="studentPageTight">
                    <span className="studentDashboardTag">Integrity watchlist</span>
                    <h3>Attempts needing review first</h3>
                    {!attemptsPage?.summary.total_attempts ? (
                      <div className="featurePlaceholder">
                        <p>No monitored attempts were returned for the selected exam.</p>
                      </div>
                    ) : !attempts.length ? (
                      <div className="featurePlaceholder">
                        <p>No attempts match the current watchlist filters.</p>
                      </div>
                    ) : (
                      groupedAttempts.map((group) => (
                        <section className="workspaceResultsGroup" key={group.label}>
                          {attemptGroup !== "none" ? (
                            <div className="sectionHeading">
                              <strong>{group.label}</strong>
                              <span>{group.items.length} attempts</span>
                            </div>
                          ) : null}
                          <div className="weakTopicStack">
                            {group.items.map((attempt) => (
                              <div className="weakTopicRow" key={attempt.id}>
                                <div>
                                  <strong>{attempt.student_name}</strong>
                                  <span>
                                    Attempt {attempt.attempt_no} · {attempt.integrity_summary.violation_count} warnings · {securityTitleCase(attempt.status)}
                                  </span>
                                </div>
                                <div className="weakTopicMeta">
                                  <strong>
                                    {attempt.is_auto_submitted
                                      ? "Auto-submitted"
                                      : attempt.integrity_summary.threshold_reached
                                        ? "Threshold reached"
                                        : attempt.alerts[0]?.label || attemptHealthLabel(attemptHealth(attempt))}
                                  </strong>
                                  <span>
                                    {attempt.percentage}% · {attempt.student_admission_no} · Risk {attemptHealthPriorityScore(attempt)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))
                    )}
                    {attemptCount > attemptPageSize ? (
                      <div className="workspaceFilterActions">
                        <Link
                          className="button buttonSecondary"
                          href={
                            safeAttemptPage <= 1
                              ? "#"
                              : buildInstituteSecurityHref({
                                  examId: selectedExam?.id,
                                  examFilter,
                                  examSort,
                                  examPage: safeExamPage,
                                  examPageSize,
                                  attemptFilter,
                                  attemptSort,
                                  attemptGroup,
                                  attemptPage: safeAttemptPage - 1,
                                  attemptPageSize,
                                  search,
                                })
                          }
                        >
                          Previous
                        </Link>
                        <Link
                          className="button buttonSecondary"
                          href={
                            safeAttemptPage >= attemptTotalPages
                              ? "#"
                              : buildInstituteSecurityHref({
                                  examId: selectedExam?.id,
                                  examFilter,
                                  examSort,
                                  examPage: safeExamPage,
                                  examPageSize,
                                  attemptFilter,
                                  attemptSort,
                                  attemptGroup,
                                  attemptPage: safeAttemptPage + 1,
                                  attemptPageSize,
                                  search,
                                })
                          }
                        >
                          Next
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </article>
              </section>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
