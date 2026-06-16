import Link from "next/link";
import { LiveMonitorRefresh } from "@/components/ui/live-monitor-refresh";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type { TeacherExam, TeacherExamAttempt, TeacherLiveExamMonitor } from "@/features/dashboard/types";
import {
  fetchTeacherExamAttempts,
  fetchTeacherExams,
  fetchTeacherLiveExamMonitor,
  getTeacherApiState,
} from "@/lib/api/teacher";
import { requireInstituteAdminSession } from "@/lib/auth/session";

function titleCase(value: string | null | undefined) {
  if (!value) return "Not available";
  return value.replaceAll("_", " ");
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

function attemptHealth(attempt: TeacherExamAttempt) {
  if (
    attempt.is_auto_submitted ||
    attempt.integrity_summary.threshold_reached ||
    attempt.alerts.some((alert) => alert.severity === "high")
  ) {
    return "critical";
  }

  if (
    attempt.integrity_summary.violation_count > 0 ||
    attempt.alerts.some((alert) => alert.severity === "medium") ||
    attempt.status === "in_progress"
  ) {
    return "watch";
  }

  return "stable";
}

async function loadInstituteSecurity(selectedExamId?: string) {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      exams: [] as TeacherExam[],
      selectedExam: null as TeacherExam | null,
      liveMonitor: null as TeacherLiveExamMonitor | null,
      attempts: [] as TeacherExamAttempt[],
    };
  }

  try {
    const exams = await fetchTeacherExams();
    const selectedExam =
      exams.find((exam) => exam.id === selectedExamId) ??
      exams.find((exam) => exam.status === "live") ??
      exams.find((exam) => exam.security_mode !== "normal") ??
      exams[0] ??
      null;

    if (!selectedExam) {
      return {
        source: "live" as const,
        exams,
        selectedExam: null,
        liveMonitor: null,
        attempts: [],
      };
    }

    const [liveMonitor, attempts] = await Promise.all([
      fetchTeacherLiveExamMonitor(selectedExam.id).catch(() => null),
      fetchTeacherExamAttempts(selectedExam.id).catch(() => []),
    ]);

    return {
      source: "live" as const,
      exams,
      selectedExam,
      liveMonitor,
      attempts,
    };
  } catch {
    return {
      source: "error" as const,
      exams: [] as TeacherExam[],
      selectedExam: null as TeacherExam | null,
      liveMonitor: null as TeacherLiveExamMonitor | null,
      attempts: [] as TeacherExamAttempt[],
    };
  }
}

export default async function InstituteSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  await requireInstituteAdminSession();
  const { examId } = await searchParams;

  const { source, exams, selectedExam, liveMonitor, attempts } = await loadInstituteSecurity(examId);
  const nonNormalExams = exams.filter((exam) => exam.security_mode !== "normal");
  const focusExams = exams.filter((exam) => exam.security_mode === "focus").length;
  const fullscreenExams = exams.filter((exam) => exam.security_mode === "fullscreen").length;
  const accessKeyExams = exams.filter((exam) => exam.access_key_enabled).length;
  const criticalAttempts = attempts.filter((attempt) => attemptHealth(attempt) === "critical");
  const watchAttempts = attempts.filter((attempt) => attemptHealth(attempt) === "watch");

  return (
    <section className="studentPage studentPageTight studentDashboardModern">
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
            {accessKeyExams} access-key exams · {criticalAttempts.length} critical attempts in selected exam
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
              <strong>{criticalAttempts.length + watchAttempts.length}</strong>
              <small>Attempts in the selected exam needing attention.</small>
            </article>
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
                    {exams.slice(0, 8).map((exam) => (
                      <div className="weakTopicRow" key={exam.id}>
                        <div>
                          <strong>{exam.title}</strong>
                          <span>
                            {titleCase(exam.security_mode)}
                            {exam.access_key_enabled ? " · Access key enabled" : " · No access key"}
                          </span>
                        </div>
                        <div className="resultCardActions">
                          <Link
                            className={selectedExam?.id === exam.id ? "button buttonPrimary" : "button buttonSecondary"}
                            href={`/institute/security?examId=${exam.id}`}
                          >
                            {selectedExam?.id === exam.id ? "Watching" : "Watch Exam"}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                          <span>{titleCase(selectedExam.security_mode)} · {selectedExam.code}</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{selectedExam.access_key_enabled ? "Enabled" : "Disabled"}</strong>
                          <span>Access key</span>
                        </div>
                      </div>
                      <div className="weakTopicRow">
                        <div>
                          <strong>Exam lifecycle</strong>
                          <span>{titleCase(selectedExam.status)} · {selectedExam.duration_minutes} min</span>
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
                    {attempts.length === 0 ? (
                      <div className="featurePlaceholder">
                        <p>No monitored attempts were returned for the selected exam.</p>
                      </div>
                    ) : (
                      <div className="weakTopicStack">
                        {attempts
                          .slice()
                          .sort((left, right) => {
                            const score = (attempt: TeacherExamAttempt) =>
                              (attempt.is_auto_submitted ? 100 : 0) +
                              (attempt.integrity_summary.threshold_reached ? 80 : 0) +
                              attempt.integrity_summary.violation_count * 5 +
                              (attempt.alerts.some((alert) => alert.severity === "high") ? 60 : 0) +
                              (attempt.alerts.some((alert) => alert.severity === "medium") ? 30 : 0);
                            return score(right) - score(left);
                          })
                          .slice(0, 8)
                          .map((attempt) => (
                            <div className="weakTopicRow" key={attempt.id}>
                              <div>
                                <strong>{attempt.student_name}</strong>
                                <span>
                                  Attempt {attempt.attempt_no} · {attempt.integrity_summary.violation_count} warnings · {titleCase(attempt.status)}
                                </span>
                              </div>
                              <div className="weakTopicMeta">
                                <strong>
                                  {attempt.is_auto_submitted
                                    ? "Auto-submitted"
                                    : attempt.integrity_summary.threshold_reached
                                      ? "Threshold reached"
                                      : attempt.alerts[0]?.label || "Stable"}
                                </strong>
                                <span>{attempt.percentage}% · {attempt.student_admission_no}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
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
