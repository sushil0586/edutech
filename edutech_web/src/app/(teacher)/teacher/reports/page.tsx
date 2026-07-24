import Link from "next/link";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";

type TeacherReportHubItem = {
  id: string;
  title: string;
  description: string;
  currentMode: "interactive_ready" | "planned_next";
  formatLabel: string;
  href: string;
  ctaLabel: string;
  lane: "overview" | "results" | "analytics" | "recovery" | "planning";
};

const teacherReports: TeacherReportHubItem[] = [
  {
    id: "student-results-report",
    title: "Student Results Report",
    description: "Teacher-scoped student result history with release state, rank posture, and follow-up cues.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/results",
    ctaLabel: "Open Results Report",
    lane: "results",
  },
  {
    id: "student-leaderboard-report",
    title: "Student Rank And Leaderboard Report",
    description: "Ranked learner outcomes for the selected exam with direct leaderboard visibility.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/results/leaderboard",
    ctaLabel: "Open Leaderboard",
    lane: "results",
  },
  {
    id: "student-attempt-review-report",
    title: "Student Attempt Review Report",
    description: "Attempt-by-attempt evidence for follow-up, risk scanning, and learner inspection.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/results/attempts",
    ctaLabel: "Open Attempt Review",
    lane: "recovery",
  },
  {
    id: "student-question-analysis-report",
    title: "Student Question And Topic Analysis Report",
    description: "Question risk, skipped patterns, and topic evidence from teacher results analysis.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/results/analysis",
    ctaLabel: "Open Analysis Report",
    lane: "analytics",
  },
  {
    id: "student-live-monitor-report",
    title: "Student Live Monitoring Report",
    description: "Active attempt warnings, intervention priorities, and live delivery follow-up.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/results/live",
    ctaLabel: "Open Live Monitor",
    lane: "planning",
  },
  {
    id: "student-subject-performance-report",
    title: "Student Subject Performance Report",
    description: "Dedicated subject comparison reporting for teacher-scoped students and classes.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/reports/subjects",
    ctaLabel: "Open Subject Report",
    lane: "analytics",
  },
  {
    id: "student-topic-mastery-report",
    title: "Student Topic Mastery Report",
    description: "Weak-topic and mastery-focused reporting that will expand from the current analysis workspace.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/reports/weak-areas",
    ctaLabel: "Open Topic Mastery Report",
    lane: "analytics",
  },
  {
    id: "student-rank-history-report",
    title: "Student Rank History Report",
    description: "Ranking posture across teacher-visible result cycles with leaderboard-ready checkpoints.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/reports/rank-history",
    ctaLabel: "Open Rank History Report",
    lane: "results",
  },
  {
    id: "student-wrong-questions-report",
    title: "Student Wrong Questions Report",
    description: "Recovery-first wrong-question reporting with grouped mistakes and drilldown follow-up.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/reports/wrong-questions",
    ctaLabel: "Open Wrong Questions Report",
    lane: "recovery",
  },
  {
    id: "student-time-management-report",
    title: "Student Time Management Report",
    description: "Pacing, slow-question, and time-loss reporting for teacher-led intervention.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/reports/time-management",
    ctaLabel: "Open Time Management Report",
    lane: "planning",
  },
  {
    id: "student-study-recommendations-report",
    title: "Student Study Recommendations Report",
    description: "Teacher-scoped coaching priorities and next-step academic recommendations for support students.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now",
    href: "/teacher/reports/study-recommendations",
    ctaLabel: "Open Study Recommendations Report",
    lane: "planning",
  },
];

const reportLaneCopy: Array<{
  lane: TeacherReportHubItem["lane"];
  title: string;
  description: string;
}> = [
  {
    lane: "overview",
    title: "Overview reports",
    description: "Use these entry points when the goal is broad teacher visibility before deeper student drilldown.",
  },
  {
    lane: "results",
    title: "Results and ranking",
    description: "Scored student outcomes, leaderboard posture, and release-aligned academic scanning.",
  },
  {
    lane: "analytics",
    title: "Subject and topic analytics",
    description: "Deep academic evidence for subject comparison, weak topics, and question-level risk.",
  },
  {
    lane: "recovery",
    title: "Recovery reports",
    description: "Reports designed for follow-up, remediation, review work, and mistake-focused intervention.",
  },
  {
    lane: "planning",
    title: "Planning and live control",
    description: "Use these for pacing, live monitoring, and next-step intervention planning.",
  },
];

export default function TeacherReportsPage() {
  const interactiveReadyCount = teacherReports.filter(
    (item) => item.currentMode === "interactive_ready",
  ).length;
  const plannedNextCount = teacherReports.filter(
    (item) => item.currentMode === "planned_next",
  ).length;

  return (
    <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
      <TeacherPageHeader
        title="Reports Hub"
        description="A single teacher-facing hub for student-level academic reports, current route access, and the next reporting build wave."
        statusLabel={`${teacherReports.length} teacher report entries tracked`}
        statusTone="live"
        action={
          <Link className="button buttonGhost" href="/teacher/results">
            Back to Results
          </Link>
        }
      />

      <StudentAnalyticsDetailHero
        eyebrow="Teacher student-level reports"
        title="Direct report entry is now organized"
        description="Use this hub to open teacher reports directly from one place. Current results routes and dedicated teacher report surfaces are now interactive across ranking, subject, topic, wrong-question, timing, and coaching lanes."
        badges={[
          "Student-level teacher reports",
          "Current routes linked",
          "Report parity expanding",
        ]}
        stats={[
          { label: "Tracked reports", value: String(teacherReports.length) },
          { label: "Interactive now", value: String(interactiveReadyCount) },
          { label: "Planned next", value: String(plannedNextCount) },
          { label: "Scope", value: "Academics first" },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/teacher/results">
              Open Results
            </Link>
            <Link className="button buttonSecondary" href="/teacher/results/analysis">
              Open Analysis
            </Link>
            <Link className="button buttonGhost" href="/teacher/dashboard">
              Open Dashboard
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Academic Reports",
            value: String(teacherReports.length),
            note: "Teacher-facing student report entries",
            tone: "primary",
          },
          {
            label: "Interactive Ready",
            value: String(interactiveReadyCount),
            note: "Routes already usable today",
          },
          {
            label: "Planned Next",
            value: String(plannedNextCount),
            note: "Dedicated teacher report surfaces still to build",
          },
          {
            label: "Current Base",
            value: "Results",
            note: "Teacher report expansion starts from results and analysis",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        {reportLaneCopy.map((lane) => {
          const laneReports = teacherReports.filter((report) => report.lane === lane.lane);
          if (!laneReports.length) {
            return null;
          }

          return (
            <article className="contentCard" key={lane.lane}>
              <div className="sectionHeading">
                <strong>{lane.title}</strong>
                <span>{laneReports.length} report{laneReports.length === 1 ? "" : "s"}</span>
              </div>
              <p className="sectionDescription">{lane.description}</p>
              <div className="studentInsightMessageStack">
                {laneReports.map((report) => (
                  <div className="studentInsightMessage" key={report.id}>
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>
                      <strong>{report.title}</strong>
                      {" · "}
                      {report.description}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Teacher report directory</strong>
          <span>{teacherReports.length} direct links</span>
        </div>
        <div className="studentResultsTableWrap">
          <table className="studentResultsTable studentDownloadableReportsTable">
            <thead>
              <tr>
                <th>Report</th>
                <th>Description</th>
                <th>Lane</th>
                <th>Current Mode</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {teacherReports.map((report) => (
                <tr className="studentResultsTableRow" key={report.id}>
                  <td>
                    <strong>{report.title}</strong>
                    <small>{report.id}</small>
                  </td>
                  <td>{report.description}</td>
                  <td>{reportLaneCopy.find((lane) => lane.lane === report.lane)?.title ?? "Teacher report"}</td>
                  <td>{report.formatLabel}</td>
                  <td>
                    <Link className="button buttonSecondary" href={report.href}>
                      {report.ctaLabel}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Implemented now</strong>
            <span>{interactiveReadyCount}</span>
          </div>
          <div className="studentInsightMessageStack">
            {teacherReports
              .filter((item) => item.currentMode === "interactive_ready")
              .map((report) => (
                <div className="studentInsightMessage" key={`ready-${report.id}`}>
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>{report.title}</strong>
                    {" · "}
                    Live through current teacher results routes.
                  </p>
                </div>
              ))}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Next build wave</strong>
            <span>{plannedNextCount}</span>
          </div>
          <div className="studentInsightMessageStack">
            {teacherReports
              .filter((item) => item.currentMode === "planned_next")
              .map((report) => (
                <div className="studentInsightMessage" key={`planned-${report.id}`}>
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>{report.title}</strong>
                    {" · "}
                    Dedicated teacher-facing student report surface still to be built.
                  </p>
                </div>
              ))}
          </div>
        </article>
      </section>
    </section>
  );
}
