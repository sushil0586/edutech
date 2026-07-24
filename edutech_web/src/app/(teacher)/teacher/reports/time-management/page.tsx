import Link from "next/link";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import {
  fetchTeacherExamAttemptPage,
  fetchTeacherInsightSummary,
  fetchTeacherResultSummary,
} from "@/lib/api/teacher";

type TimingAttemptRow = {
  id: string;
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

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

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

function buildTimingRows(
  attempts: Awaited<ReturnType<typeof fetchTeacherExamAttemptPage>>["results"],
) {
  const timedAttempts = attempts.filter((attempt) => (attempt.time_taken_seconds ?? 0) > 0);
  const averageTimeTaken =
    timedAttempts.length > 0
      ? timedAttempts.reduce((sum, attempt) => sum + (attempt.time_taken_seconds ?? 0), 0) /
        timedAttempts.length
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

export default async function TeacherTimeManagementReportPage() {
  const [summary, resultSummaries] = await Promise.all([
    fetchTeacherInsightSummary().catch(() => null),
    fetchTeacherResultSummary().catch(() => []),
  ]);

  if (!summary || !resultSummaries.length) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
        <TeacherPageHeader
          title="Time Management Report"
          description="Teacher-scoped pacing reporting could not be loaded right now."
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

  const selectedSummary = resultSummaries[0];
  const attemptPage = await fetchTeacherExamAttemptPage(selectedSummary.exam, {
    page: 1,
    pageSize: 24,
    sort: "time_long",
  }).catch(() => null);

  if (!attemptPage) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
        <TeacherPageHeader
          title="Time Management Report"
          description="Teacher-scoped attempt timing data could not be loaded right now."
          statusLabel="Attempt timing unavailable"
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

  const { averageTimeTaken, rows } = buildTimingRows(attemptPage.results);
  const slowWatchCount = rows.filter((row) => row.timingSignal === "slow_watch").length;
  const fastRiskCount = rows.filter((row) => row.timingSignal === "fast_risk").length;
  const longestAttempt = rows[0] ?? null;
  const fastestRiskAttempt = rows
    .filter((row) => row.timingSignal === "fast_risk")
    .sort((left, right) => left.timeTakenSeconds - right.timeTakenSeconds)[0] ?? null;

  return (
    <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
      <TeacherPageHeader
        title="Time Management Report"
        description="Teacher-scoped pacing, timing pressure, and fast-risk attempt visibility."
        statusLabel={`${rows.length} timing rows for ${selectedSummary.exam_code}`}
        statusTone="live"
        action={
          <Link className="button buttonGhost" href="/teacher/reports">
            Back to Reports
          </Link>
        }
      />

      <StudentAnalyticsDetailHero
        eyebrow="Teacher time management"
        title="Pacing and time-loss patterns are now visible"
        description="Use this report to spot students who take unusually long to finish, students who move too quickly with weak accuracy, and where timing behavior may be hurting academic performance."
        badges={[
          "Teacher-scoped pacing signals",
          "Slow watch and fast-risk lanes",
          "Attempt timing first pass",
        ]}
        stats={[
          { label: "Tracked attempts", value: String(rows.length) },
          { label: "Average time", value: formatDuration(Math.round(averageTimeTaken)) },
          { label: "Slow watch", value: String(slowWatchCount) },
          { label: "Fast risk", value: String(fastRiskCount) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/teacher/results/attempts">
              Open Attempt Review
            </Link>
            <Link className="button buttonSecondary" href="/teacher/results/analysis">
              Open Analysis
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
            label: "Average Time Taken",
            value: formatDuration(Math.round(averageTimeTaken)),
            note: "Derived from the visible teacher attempt timing lane",
            tone: "primary",
          },
          {
            label: "Longest Attempt",
            value: longestAttempt ? longestAttempt.studentName : "N/A",
            note: longestAttempt ? `${formatDuration(longestAttempt.timeTakenSeconds)} · ${percentage(longestAttempt.percentage)}` : "No timing evidence yet",
          },
          {
            label: "Fastest Risk",
            value: fastestRiskAttempt ? fastestRiskAttempt.studentName : "N/A",
            note: fastestRiskAttempt ? `${formatDuration(fastestRiskAttempt.timeTakenSeconds)} · ${percentage(fastestRiskAttempt.percentage)}` : "No fast-risk lane yet",
          },
          {
            label: "Insight Average",
            value: formatDuration(summary.overview.average_time_taken_seconds),
            note: "Teacher insight summary timing baseline",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
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
                        <strong>{row.studentName}</strong>
                        <small>{row.admissionNo}</small>
                      </td>
                      <td>{formatDuration(row.timeTakenSeconds)}</td>
                      <td>{percentage(row.percentage)}</td>
                      <td>{row.skippedQuestions}</td>
                      <td>{row.incorrectAnswers}</td>
                      <td>
                        <span className={`statusPill ${timingTone(row.timingSignal)}`}>
                          {timingLabel(row.timingSignal)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="emptyText">Timing rows will appear once timed teacher-scoped attempts are available.</p>
          )}
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Timing action lane</strong>
            <span>What to do next</span>
          </div>
          <div className="studentInsightMessageStack">
            {longestAttempt ? (
              <>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Slow watch</strong>
                    {" · "}
                    {longestAttempt.studentName} currently has the longest visible attempt at{" "}
                    {formatDuration(longestAttempt.timeTakenSeconds)}.
                  </p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Fast risk</strong>
                    {" · "}
                    {fastestRiskAttempt
                      ? `${fastestRiskAttempt.studentName} is moving quickly with only ${percentage(fastestRiskAttempt.percentage)} accuracy.`
                      : "No fast-risk attempt is currently visible in this timing lane."}
                  </p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Then inspect</strong>
                    {" · "}
                    Open attempt review to connect pacing patterns with skips, wrong answers, and follow-up action.
                  </p>
                </div>
              </>
            ) : (
              <p className="emptyText">Timing guidance will appear once attempt timing data is available.</p>
            )}
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Students needing support</strong>
            <span>{summary.low_performing_students.length}</span>
          </div>
          <div className="studentInsightMessageStack">
            {summary.low_performing_students.slice(0, 6).map((student) => (
              <div className="studentInsightMessage" key={`timing-low-${student.student_id}`}>
                <span className="placeholderDot" aria-hidden="true" />
                <p>
                  <Link href={`/teacher/reports/students/${student.student_id}?from=time-management`}>
                    <strong>{student.student_name}</strong>
                  </Link>
                  {" · "}
                  {student.admission_no}
                  {" · "}
                  {student.average_percentage}% average
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Current exam context</strong>
            <span>{selectedSummary.exam_code}</span>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                <strong>{selectedSummary.exam_title}</strong>
                {" · "}
                {selectedSummary.total_attempted} attempted
                {" · "}
                {percentage(selectedSummary.average_percentage)} average
              </p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                <strong>Published rows</strong>
                {" · "}
                {selectedSummary.published_results_count} published out of {selectedSummary.total_results_count} total results.
              </p>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
