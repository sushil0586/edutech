import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
import { loadStudentAnalyticsBundle } from "@/lib/student/analytics";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  getStudentSourceOptions,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

type StudentReportHubItem = {
  id: string;
  title: string;
  description: string;
  currentMode: "interactive_ready" | "export_contract_pending";
  formatLabel: string;
  href: string;
  ctaLabel: string;
  lane: "overview" | "results" | "analytics" | "recovery" | "planning";
};

const studentReports: StudentReportHubItem[] = [
  {
    id: "overall-dashboard",
    title: "Overall Performance Dashboard",
    description: "Student-wide academic summary across performance, action queue, and current learning priorities.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now · export contract pending",
    href: "/app/dashboard",
    ctaLabel: "Open Dashboard",
    lane: "overview",
  },
  {
    id: "results-report",
    title: "Exam Summary Report",
    description: "Published result history with score, review, status, and next-action follow-up.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now · export contract pending",
    href: "/app/results",
    ctaLabel: "Open Results Report",
    lane: "results",
  },
  {
    id: "subject-report",
    title: "Subject Performance Report",
    description: "Subject-level academic standing with drilldowns into deeper performance views.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now · export contract pending",
    href: "/app/analytics",
    ctaLabel: "Open Subject Report",
    lane: "analytics",
  },
  {
    id: "wrong-questions",
    title: "Wrong Questions Report",
    description: "Mistake-focused recovery report for wrong-answer questions and their drilldowns.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now · export contract pending",
    href: "/app/analytics/wrong-questions",
    ctaLabel: "Open Wrong Questions Report",
    lane: "recovery",
  },
  {
    id: "time-management",
    title: "Time Management Report",
    description: "Timing, pacing, slow-question, and fast-wrong-answer analysis.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now · export contract pending",
    href: "/app/analytics/time-management",
    ctaLabel: "Open Time Management Report",
    lane: "planning",
  },
  {
    id: "rank-history",
    title: "Rank & Percentile History",
    description: "Historical ranking report with current rank checkpoints and published rank ledger.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now · percentile export pending",
    href: "/app/analytics/rank-history",
    ctaLabel: "Open Rank History",
    lane: "results",
  },
  {
    id: "study-recommendations",
    title: "AI Study Recommendations",
    description: "Packaged recommendation report using weak-topic, risky-format, and practice-readiness signals.",
    currentMode: "interactive_ready",
    formatLabel: "Interactive now · export contract pending",
    href: "/app/analytics/study-recommendations",
    ctaLabel: "Open Recommendation Report",
    lane: "planning",
  },
];

const reportLaneCopy: Array<{
  lane: StudentReportHubItem["lane"];
  title: string;
  description: string;
}> = [
  {
    lane: "overview",
    title: "Workspace overview",
    description: "Start with the broad student summary before drilling into subject, result, or recovery reports.",
  },
  {
    lane: "results",
    title: "Results and progress",
    description: "Use these reports for scored outcomes, rank history, and release-driven academic follow-up.",
  },
  {
    lane: "analytics",
    title: "Subject analytics",
    description: "Open these reports when you want subject-level performance and deeper diagnostic drilldowns.",
  },
  {
    lane: "recovery",
    title: "Recovery reports",
    description: "Focus here when the goal is correction, revision, and mistake-to-practice recovery.",
  },
  {
    lane: "planning",
    title: "Planning and pacing",
    description: "Use these reports when the next step is time control, study planning, or guided recommendations.",
  },
];

export async function StudentReportsHub({
  searchParams,
  basePath,
}: {
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
  basePath: string;
}) {
  const query = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    query.subject ?? cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSource = resolveSelectedStudentSource(
    query.source ?? cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const bundle = await loadStudentAnalyticsBundle();
  const { teacherOptions } = getStudentSourceOptions([
    ...bundle.results,
    ...bundle.exams,
    ...(bundle.summary?.source_breakdown ?? []),
    ...(bundle.summary?.recent_exams ?? []),
  ]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    query.teacher ??
      cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ??
      null,
  );
  const scopedQuery = new URLSearchParams();
  if (selectedSubject !== ALL_SUBJECTS_CONTEXT) scopedQuery.set("subject", selectedSubject);
  if (selectedSource !== ALL_SOURCES_CONTEXT) scopedQuery.set("source", selectedSource);
  if (selectedTeacherId) scopedQuery.set("teacher", selectedTeacherId);
  const withScope = (href: string) => {
    const queryString = scopedQuery.toString();
    return queryString ? `${href}?${queryString}` : href;
  };

  const interactiveReadyCount = studentReports.filter(
    (item) => item.currentMode === "interactive_ready",
  ).length;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Student reports hub"
        title="Reports Hub"
        description="Open the right academic report for your next step, whether you need scores, subject insight, mistakes, pacing, or study planning."
        statusLabel={`${studentReports.length} academic reports available`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentReportFilters
        basePath={basePath}
        title="Reports hub filters"
        helper="Scope report entry points before opening them so every linked report starts in the right student context."
        selectedSource={selectedSource}
        selectedSubject={selectedSubject}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={subjectOptions}
        teacherOptions={teacherOptions}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Choose your next report"
        title="Open the report that matches your next decision"
        description="Use this hub when you want one clear place to move from broad performance into scores, weak areas, time control, rank history, or guided recommendations."
        badges={[
          "Results and score follow-up",
          "Weak-area and mistake recovery",
          "Planning and pacing support",
        ]}
        stats={[
          { label: "Tracked reports", value: String(studentReports.length) },
          { label: "Interactive ready", value: String(interactiveReadyCount) },
          { label: "Direct links", value: "Ready" },
          { label: "Student scope", value: "Academic only" },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/app/dashboard">
              Open Dashboard
            </Link>
            <Link className="button buttonSecondary" href="/app/results">
              Open Results
            </Link>
            <Link className="button buttonGhost" href="/app/analytics">
              Open Analytics
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Academic Reports",
            value: String(studentReports.length),
            note: "Student-facing academic report entries",
            tone: "primary",
          },
          {
            label: "Interactive Ready",
            value: String(interactiveReadyCount),
            note: "Available right now as live report routes",
          },
          {
            label: "Direct Links",
            value: "Ready",
            note: "Open reports directly from this hub",
          },
          {
            label: "Recovery Routes",
            value: "Ready",
            note: "Jump from reports into review, practice, and planning flows",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        {reportLaneCopy.map((lane) => {
          const laneReports = studentReports.filter((report) => report.lane === lane.lane);
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
          <strong>Report directory</strong>
          <span>{studentReports.length} direct links</span>
        </div>
        <p className="sectionDescription">
          Start with the report that answers your immediate question, then follow linked drilldowns if you need more detail.
        </p>
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
              {studentReports.map((report) => (
                <tr className="studentResultsTableRow" key={report.id}>
                  <td>
                    <strong>{report.title}</strong>
                    <small>{report.id}</small>
                  </td>
                  <td>{report.description}</td>
                  <td>{reportLaneCopy.find((lane) => lane.lane === report.lane)?.title ?? "Academic report"}</td>
                  <td>{report.formatLabel}</td>
                  <td>
                    <Link className="studentDashboardTextLink" href={withScope(report.href)}>
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
            <strong>How to use this hub</strong>
            <span>Best first moves</span>
          </div>
          <div className="analyticsChecklist">
            <div className="analyticsChecklistItem">
              <strong>Start broad, then narrow</strong>
              <span>Open Dashboard or Results first when you need the fastest overview of what changed most recently.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Use recovery reports after low scores</strong>
              <span>Wrong Questions, Time Management, and Recommendations are the best follow-up once a result shows clear weakness.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Let scope filters do the setup</strong>
              <span>Choose subject and source here first so every linked report opens in the right student context.</span>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Suggested next report</strong>
            <span>Fast follow-up</span>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonPrimary" href={withScope("/app/analytics/study-recommendations")}>
              Open Recommendations
            </Link>
            <Link className="button buttonSecondary" href={withScope("/app/analytics/rank-history")}>
              Open Rank History
            </Link>
            <Link className="button buttonGhost" href={withScope("/app/analytics/time-management")}>
              Open Time Report
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
