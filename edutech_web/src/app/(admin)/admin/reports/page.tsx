import Link from "next/link";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type { TeacherInsightSummary, TeacherResultSummary } from "@/features/dashboard/types";
import {
  fetchTeacherExams,
  fetchTeacherInsightSummary,
  fetchTeacherResultSummary,
  getTeacherApiState,
} from "@/lib/api/teacher";

function percentage(value: string | number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : "0%";
}

async function loadPlatformReports() {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      insightSummary: null as TeacherInsightSummary | null,
      resultSummary: [] as TeacherResultSummary[],
      exams: [],
    };
  }

  try {
    const [insightSummary, resultSummary, exams] = await Promise.all([
      fetchTeacherInsightSummary(),
      fetchTeacherResultSummary(),
      fetchTeacherExams(),
    ]);

    return {
      source: "live" as const,
      insightSummary,
      resultSummary,
      exams,
    };
  } catch {
    return {
      source: "error" as const,
      insightSummary: null as TeacherInsightSummary | null,
      resultSummary: [] as TeacherResultSummary[],
      exams: [],
    };
  }
}

function pendingCount(summary: TeacherResultSummary) {
  return Math.max(summary.total_attempted - summary.total_passed - summary.total_failed, 0);
}

export default async function AdminReportsPage() {
  const { source, insightSummary, resultSummary, exams } = await loadPlatformReports();
  const overview = insightSummary?.overview ?? null;
  const unpublishedSummaries = resultSummary.filter((summary) => !summary.results_published);
  const liveExams = exams.filter((exam) => exam.status === "live").length;
  const completedExams = exams.filter((exam) => exam.status === "completed").length;

  return (
    <section className="studentPage studentPageTight studentDashboardModern">
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
          <strong>Track performance, readiness, and publication pressure without leaving the platform governance workspace</strong>
          <p>
            This route consolidates platform-visible reporting signals already exposed by the backend. It helps
            platform admin spot backlog, weak academic areas, and assessment-throughput issues across the visible scope.
          </p>
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
              <small>{liveExams} live and {completedExams} completed in current scope.</small>
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

          <section className="dashboardLowerGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Publication backlog</span>
                <h3>Completed or evaluated exams still needing result attention</h3>
                {unpublishedSummaries.length === 0 ? (
                  <div className="featurePlaceholder">
                    <p>All returned exam summaries appear fully published right now.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {unpublishedSummaries.slice(0, 6).map((summary) => (
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
                  {insightSummary.exam_overview.slice(0, 6).map((exam) => (
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

          <section className="dashboardLowerGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="studentPageTight">
                <span className="studentDashboardTag">Weak topics</span>
                <h3>Platform-level academic pressure points</h3>
                {insightSummary.weak_topics.length === 0 ? (
                  <div className="featurePlaceholder">
                    <p>No weak-topic analytics were returned for the current platform scope.</p>
                  </div>
                ) : (
                  <div className="weakTopicStack">
                    {insightSummary.weak_topics.slice(0, 6).map((topic, index) => (
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
                  {insightSummary.high_performing_students.slice(0, 3).map((student) => (
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
                  {insightSummary.low_performing_students.slice(0, 3).map((student) => (
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
        </>
      )}
    </section>
  );
}
