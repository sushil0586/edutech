import Link from "next/link";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import {
  fetchTeacherExamAttemptPage,
  fetchTeacherInsightSummary,
  fetchTeacherResultSummary,
} from "@/lib/api/teacher";
import { requireInstituteAdminSession } from "@/lib/auth/session";

type TimingAttemptRow = {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  percentage: number;
  timeTakenSeconds: number;
  skippedQuestions: number;
  incorrectAnswers: number;
  timingSignal: "slow_watch" | "fast_risk" | "steady";
};

function formatDuration(totalSeconds: number | null | undefined) {
  if (!totalSeconds || totalSeconds <= 0) {
    return "N/A";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function percentage(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${Math.round(numeric)}%`;
}

function timingTone(signal: TimingAttemptRow["timingSignal"]) {
  if (signal === "slow_watch") return "statusWarning";
  if (signal === "fast_risk") return "statusDemo";
  return "statusLive";
}

function timingLabel(signal: TimingAttemptRow["timingSignal"]) {
  if (signal === "slow_watch") return "Slow watch";
  if (signal === "fast_risk") return "Fast risk";
  return "Steady";
}

function buildTimingRows(attempts: Awaited<ReturnType<typeof fetchTeacherExamAttemptPage>>["results"]) {
  const timedAttempts = attempts.filter((attempt) => (attempt.time_taken_seconds ?? 0) > 0);
  const averageTimeTaken =
    timedAttempts.length > 0
      ? timedAttempts.reduce((sum, attempt) => sum + (attempt.time_taken_seconds ?? 0), 0) / timedAttempts.length
      : 0;

  const rows: TimingAttemptRow[] = timedAttempts.map((attempt) => {
    const percentageValue = Number(attempt.percentage);
    const timeTakenSeconds = attempt.time_taken_seconds ?? 0;
    let timingSignal: TimingAttemptRow["timingSignal"] = "steady";
    if (percentageValue >= 60 && timeTakenSeconds > averageTimeTaken) {
      timingSignal = "slow_watch";
    } else if (percentageValue < 50 && timeTakenSeconds > 0 && timeTakenSeconds < averageTimeTaken) {
      timingSignal = "fast_risk";
    }
    return {
      id: attempt.id,
      studentId: attempt.student,
      studentName: attempt.student_name,
      admissionNo: attempt.student_admission_no,
      percentage: Number.isFinite(percentageValue) ? percentageValue : 0,
      timeTakenSeconds,
      skippedQuestions: attempt.skipped_questions,
      incorrectAnswers: attempt.incorrect_answers,
      timingSignal,
    };
  });

  return {
    averageTimeTaken,
    rows: rows.sort(
      (left, right) =>
        right.timeTakenSeconds - left.timeTakenSeconds ||
        left.percentage - right.percentage ||
        left.studentName.localeCompare(right.studentName),
    ),
  };
}

export default async function InstituteTimeManagementReportPage() {
  await requireInstituteAdminSession();
  const [summary, resultSummaries] = await Promise.all([
    fetchTeacherInsightSummary().catch(() => null),
    fetchTeacherResultSummary().catch(() => []),
  ]);

  if (!summary || !resultSummaries.length) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid instituteReportsPageVivid">
        <InstitutePageHeader
          title="Time Management Report"
          description="Institute-scoped pacing reporting could not be loaded right now."
          statusLabel="Report unavailable"
          statusTone="warning"
          action={<Link className="button buttonGhost" href="/institute/reports">Back to Reports</Link>}
        />
      </section>
    );
  }

  const selectedSummary = resultSummaries[0];
  const attemptPage = await fetchTeacherExamAttemptPage(selectedSummary.exam, {
    page: 1,
    pageSize: 24,
    sort: "time_long",
  }).catch(() => null);

  if (!attemptPage) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid instituteReportsPageVivid">
        <InstitutePageHeader
          title="Time Management Report"
          description="Institute-scoped attempt timing data could not be loaded right now."
          statusLabel="Attempt timing unavailable"
          statusTone="warning"
          action={<Link className="button buttonGhost" href="/institute/reports">Back to Reports</Link>}
        />
      </section>
    );
  }

  const { averageTimeTaken, rows } = buildTimingRows(attemptPage.results);
  const slowWatchCount = rows.filter((row) => row.timingSignal === "slow_watch").length;
  const fastRiskCount = rows.filter((row) => row.timingSignal === "fast_risk").length;
  const longestAttempt = rows[0] ?? null;
  const fastestRiskAttempt =
    rows.filter((row) => row.timingSignal === "fast_risk").sort((left, right) => left.timeTakenSeconds - right.timeTakenSeconds)[0] ?? null;

  return (
    <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteSupportPageVivid instituteReportsPageVivid">
      <InstitutePageHeader
        title="Time Management Report"
        description="Institute-scoped pacing, timing pressure, and fast-risk attempt visibility."
        statusLabel={`${rows.length} timing rows for ${selectedSummary.exam_code}`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/institute/reports">Back to Reports</Link>}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Institute time management"
        title="Pacing and time-loss patterns are now visible"
        description="Use this report to spot students who take unusually long to finish, students who move too quickly with weak accuracy, and where timing behavior may be hurting academic performance."
        badges={["Institute-scoped pacing signals", "Slow watch and fast-risk lanes", "Attempt timing first pass"]}
        stats={[
          { label: "Tracked attempts", value: String(rows.length) },
          { label: "Average time", value: formatDuration(Math.round(averageTimeTaken)) },
          { label: "Slow watch", value: String(slowWatchCount) },
          { label: "Fast risk", value: String(fastRiskCount) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/institute/results/attempts">Open Attempt Review</Link>
            <Link className="button buttonSecondary" href="/institute/results/analysis">Open Analysis</Link>
            <Link className="button buttonGhost" href="/institute/reports">Open Reports Hub</Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          { label: "Average Time Taken", value: formatDuration(Math.round(averageTimeTaken)), note: "Derived from the visible institute attempt timing lane", tone: "primary" },
          { label: "Longest Attempt", value: longestAttempt ? longestAttempt.studentName : "N/A", note: longestAttempt ? `${formatDuration(longestAttempt.timeTakenSeconds)} · ${percentage(longestAttempt.percentage)}` : "No timing evidence yet" },
          { label: "Fastest Risk", value: fastestRiskAttempt ? fastestRiskAttempt.studentName : "N/A", note: fastestRiskAttempt ? `${formatDuration(fastestRiskAttempt.timeTakenSeconds)} · ${percentage(fastestRiskAttempt.percentage)}` : "No fast-risk lane yet" },
          { label: "Insight Average", value: formatDuration(summary.overview.average_time_taken_seconds), note: "Institute insight summary timing baseline" },
        ]}
      />

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Timing pressure board</strong>
          <span>{rows.length} attempt{rows.length === 1 ? "" : "s"}</span>
        </div>
        {rows.length ? (
          <div className="studentResultsTableWrap">
            <table className="studentResultsTable">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Time Taken</th>
                  <th>Percentage</th>
                  <th>Skipped</th>
                  <th>Incorrect</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="studentResultsTableRow" key={row.id}>
                    <td>
                      <Link href={`/institute/reports/students/${row.studentId}?from=time-management`}>
                        <strong>{row.studentName}</strong>
                      </Link>
                      <small>{row.admissionNo}</small>
                    </td>
                    <td>{formatDuration(row.timeTakenSeconds)}</td>
                    <td>{percentage(row.percentage)}</td>
                    <td>{row.skippedQuestions}</td>
                    <td>{row.incorrectAnswers}</td>
                    <td><span className={`statusPill ${timingTone(row.timingSignal)}`}>{timingLabel(row.timingSignal)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="emptyText">Timing rows will appear once institute-scoped attempt timing evidence is available.</p>
        )}
      </section>
    </section>
  );
}
