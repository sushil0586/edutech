import Link from "next/link";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { fetchTeacherResultSummary } from "@/lib/api/teacher";

function percentage(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${Math.round(numeric)}%`;
}

function timeLabel(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function TeacherRankHistoryReportPage() {
  const resultSummaries = await fetchTeacherResultSummary().catch(() => []);

  if (!resultSummaries.length) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
        <TeacherPageHeader
          title="Rank History Report"
          description="Teacher-scoped ranking history could not be loaded right now."
          statusLabel="Report unavailable"
          statusTone="warning"
          action={
            <Link className="button buttonGhost" href="/teacher/reports">
              Back to Reports
            </Link>
          }
        />
      </section>
    );
  }

  const sortedSummaries = [...resultSummaries].sort(
    (left, right) =>
      new Date(right.last_calculated_at || right.updated_at).getTime() -
      new Date(left.last_calculated_at || left.updated_at).getTime(),
  );
  const latestSummary = sortedSummaries[0] ?? null;
  const publishedCount = sortedSummaries.filter((summary) => summary.results_published).length;
  const reviewBlockedCount = sortedSummaries.filter((summary) => summary.review_blocked).length;
  const rankedReadyCount = sortedSummaries.filter(
    (summary) => summary.total_results_count > 0 && summary.published_results_count > 0,
  ).length;

  return (
    <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
      <TeacherPageHeader
        title="Rank History Report"
        description="Teacher-scoped ranking snapshots across exam result cycles, publication posture, and leaderboard readiness."
        statusLabel={`${sortedSummaries.length} ranking snapshot rows`}
        statusTone="live"
        action={
          <Link className="button buttonGhost" href="/teacher/reports">
            Back to Reports
          </Link>
        }
      />

      <StudentAnalyticsDetailHero
        eyebrow="Teacher rank history"
        title="Ranking posture is now visible across exam cycles"
        description="Use this report to review which result cycles are rank-ready, which still have publication or review blockers, and where leaderboard follow-up should happen next."
        badges={[
          "Teacher-scoped ranking snapshots",
          "Leaderboard readiness",
          "Publication posture",
        ]}
        stats={[
          { label: "Tracked exams", value: String(sortedSummaries.length) },
          { label: "Published", value: String(publishedCount) },
          { label: "Rank-ready", value: String(rankedReadyCount) },
          { label: "Review blocked", value: String(reviewBlockedCount) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/teacher/results/leaderboard">
              Open Leaderboard
            </Link>
            <Link className="button buttonSecondary" href="/teacher/results">
              Open Results
            </Link>
            <Link className="button buttonGhost" href="/teacher/reports">
              Open Reports Hub
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Latest Ranked Cycle",
            value: latestSummary ? latestSummary.exam_code : "N/A",
            note: latestSummary ? latestSummary.exam_title : "No ranked cycle yet",
            tone: "primary",
          },
          {
            label: "Published Cycles",
            value: String(publishedCount),
            note: "Teacher result cycles already visible to learners",
          },
          {
            label: "Review Blocked",
            value: String(reviewBlockedCount),
            note: "Cycles still held by review or recheck tasks",
          },
          {
            label: "Result Rows",
            value: String(
              sortedSummaries.reduce((sum, summary) => sum + summary.total_results_count, 0),
            ),
            note: "Visible ranked result records across these cycles",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Ranking snapshot</strong>
            <span>{sortedSummaries.length} cycle{sortedSummaries.length === 1 ? "" : "s"}</span>
          </div>
          <div className="studentTopicStack">
            {sortedSummaries.slice(0, 5).map((summary) => (
              <div className="studentTopicRow" key={summary.id}>
                <div>
                  <strong>{summary.exam_title}</strong>
                  <span>{summary.exam_code}</span>
                </div>
                <div className="studentTopicRowMeta">
                  <strong>{percentage(summary.average_percentage)} average</strong>
                  <span>{timeLabel(summary.last_calculated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Rank checkpoints</strong>
            <span>Readiness cues</span>
          </div>
          <div className="analyticsChecklist">
            <div className="analyticsChecklistItem">
              <strong>Published cycles matter most</strong>
              <span>Focus leaderboard follow-up on cycles where student-facing publication is already complete.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Review blockers pause ranking trust</strong>
              <span>Open review-blocked exams from results before treating the leaderboard as final.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Use leaderboard for student drilldown</strong>
              <span>The leaderboard route remains the best next handoff when you want ranked learner-level evidence.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Rank history ledger</strong>
          <span>{sortedSummaries.length} exam result cycle{sortedSummaries.length === 1 ? "" : "s"}</span>
        </div>
        <div className="studentResultsTableWrap">
          <table className="studentResultsTable">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Average</th>
                <th>Highest</th>
                <th>Results</th>
                <th>Published</th>
                <th>Review status</th>
                <th>Last calculated</th>
              </tr>
            </thead>
            <tbody>
              {sortedSummaries.map((summary) => (
                <tr className="studentResultsTableRow" key={summary.id}>
                  <td>
                    <strong>{summary.exam_title}</strong>
                    <small>{summary.exam_code}</small>
                  </td>
                  <td>{percentage(summary.average_percentage)}</td>
                  <td>{summary.highest_score}</td>
                  <td>{summary.total_results_count}</td>
                  <td>
                    <span className={`statusPill ${summary.results_published ? "statusLive" : "statusDemo"}`}>
                      {summary.results_published ? "Published" : "Pending"}
                    </span>
                  </td>
                  <td>
                    <span className={`statusPill ${summary.review_blocked ? "statusWarning" : "statusLive"}`}>
                      {summary.review_blocked ? "Review blocked" : "Clear"}
                    </span>
                  </td>
                  <td>{timeLabel(summary.last_calculated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
