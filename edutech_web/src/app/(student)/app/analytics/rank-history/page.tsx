import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  buildAnalyticsTimelineHref,
  loadStudentAnalyticsBundle,
  sourceDescriptor,
} from "@/lib/student/analytics";
import {
  percentageLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentRecordsByMetadataSubject,
  filterStudentRecordsBySource,
  getStudentSourceOptions,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

function parseDate(value: string | null, fallback: string) {
  return value ? Date.parse(value) : Date.parse(fallback);
}

function rankMovementLabel(change: number | null) {
  if (change === null) return "No earlier ranked result";
  if (change < 0) return `Improved by ${Math.abs(change)}`;
  if (change > 0) return `Dropped by ${change}`;
  return "No rank change";
}

export default async function StudentRankHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
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

  if (!bundle.summary) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow={bundle.source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            bundle.source === "unconfigured"
              ? "Rank history is not available yet"
              : "Rank history could not be loaded"
          }
          description={
            bundle.source === "unconfigured"
              ? "Sign in with your student account to load ranking history."
              : "We couldn't load your rank history right now."
          }
          bullets={["Student sign-in", "Published results", "Ranking history"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel={bundle.source === "unconfigured" ? "Sign in to continue" : "Try again soon"}
        />
      </div>
    );
  }

  const { teacherOptions } = getStudentSourceOptions([...bundle.results, ...bundle.exams]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    query.teacher ??
      cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ??
      null,
  );

  const filteredResults = filterStudentRecordsByMetadataSubject(
    filterStudentRecordsBySource(
      bundle.results,
      selectedSource,
      selectedSource === "teacher" ? selectedTeacherId : null,
    ),
    selectedSubject,
  )
    .filter((item) => item.is_published)
    .sort(
      (left, right) =>
        parseDate(left.published_at, left.created_at) - parseDate(right.published_at, right.created_at),
    );

  const rankedResults = filteredResults.filter((item) => item.rank !== null);
  const latestRanked = rankedResults[rankedResults.length - 1] ?? null;
  const bestRanked = [...rankedResults].sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))[0] ?? null;
  const firstRanked = rankedResults[0] ?? null;
  const rankChange =
    latestRanked && firstRanked && latestRanked.rank !== null && firstRanked.rank !== null
      ? latestRanked.rank - firstRanked.rank
      : null;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Rank and percentile history"
        title="Rank & Percentile History"
        description="Track how your published ranks move across time and compare them with your score trend."
        statusLabel={`${rankedResults.length} ranked results`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentReportFilters
        basePath="/app/analytics/rank-history"
        title="Rank history filters"
        helper="Keep rank movement scoped to one subject and source so the history stays academically meaningful."
        selectedSource={selectedSource}
        selectedSubject={selectedSubject}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={subjectOptions}
        teacherOptions={teacherOptions}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Ranking snapshot"
        title={latestRanked?.rank !== null && latestRanked?.rank !== undefined ? `Rank ${latestRanked.rank}` : "No ranked result yet"}
        description={
          latestRanked
            ? `Your latest ranked result is ${percentageLabel(latestRanked.percentage)} in ${latestRanked.exam_title}. ${rankMovementLabel(rankChange)} across the ranked history currently visible in this scope.`
            : "Rank history will appear here after published results with rank values are available."
        }
        badges={[
          selectedSubject !== ALL_SUBJECTS_CONTEXT ? selectedSubject : "All subjects",
          selectedSource !== ALL_SOURCES_CONTEXT
            ? `Source · ${titleCaseState(selectedSource)}`
            : "All sources",
          "Percentile pending backend support",
        ]}
        stats={[
          { label: "Latest rank", value: latestRanked?.rank ? String(latestRanked.rank) : "Pending" },
          { label: "Best rank", value: bestRanked?.rank ? String(bestRanked.rank) : "Pending" },
          { label: "Ranked results", value: String(rankedResults.length) },
          { label: "Published results", value: String(filteredResults.length) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/app/results">
              Open Results
            </Link>
            <Link
              className="button buttonSecondary"
              href={buildAnalyticsTimelineHref({
                subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              Open Timeline
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Latest Rank",
            value: latestRanked?.rank ? String(latestRanked.rank) : "Pending",
            note: latestRanked ? latestRanked.exam_title : "Awaiting ranked publish",
            tone: "primary",
          },
          {
            label: "Best Rank",
            value: bestRanked?.rank ? String(bestRanked.rank) : "Pending",
            note: bestRanked ? bestRanked.exam_title : "No ranked result yet",
          },
          {
            label: "Rank Movement",
            value: rankChange === null ? "Pending" : rankChange === 0 ? "Stable" : rankChange < 0 ? `+${Math.abs(rankChange)}` : `-${rankChange}`,
            note: rankMovementLabel(rankChange),
          },
          {
            label: "Percentile",
            value: "Pending",
            note: "Student percentile history needs backend payload support",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Rank checkpoints</strong>
            <span>Best, first, and latest</span>
          </div>
          <div className="studentTopicStack">
            {[
              { label: "First ranked", result: firstRanked },
              { label: "Best ranked", result: bestRanked },
              { label: "Latest ranked", result: latestRanked },
            ].map((entry) => (
              <div className="studentTopicRow" key={entry.label}>
                <div>
                  <strong>{entry.label}</strong>
                  <span>
                    {entry.result
                      ? `${entry.result.exam_title} · ${sourceDescriptor(entry.result)}`
                      : "No ranked result available"}
                  </span>
                </div>
                <div className="studentTopicRowMeta">
                  <strong>{entry.result?.rank ? `Rank ${entry.result.rank}` : "Pending"}</strong>
                  <span>
                    {entry.result?.published_at
                      ? studentDateTimeLabel(entry.result.published_at)
                      : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Reading this report</strong>
            <span>Important context</span>
          </div>
          <div className="analyticsChecklist">
            <div className="analyticsChecklistItem">
              <strong>Rank only appears when available</strong>
              <span>Some published results may still be missing rank if the exam ranking pass has not completed yet.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Percentile is not yet exposed here</strong>
              <span>This first pass keeps percentile honest by marking it as pending backend support instead of guessing.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Compare rank with score trend</strong>
              <span>Use the timeline report alongside this page to decide whether rank shifts match actual performance movement.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Rank history ledger</strong>
          <span>{filteredResults.length} published rows</span>
        </div>
        <div className="studentResultsTableWrap">
          <table className="studentResultsTable studentRankHistoryTable">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Subject Scope</th>
                <th>Source</th>
                <th>Date</th>
                <th>Percentage</th>
                <th>Rank</th>
                <th>Percentile</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => (
                <tr className="studentResultsTableRow" key={result.id}>
                  <td>
                    <strong>{result.exam_title}</strong>
                    <small>{result.exam_code}</small>
                  </td>
                  <td>{result.metadata?.subject_name ? String(result.metadata.subject_name) : "All subjects"}</td>
                  <td>{sourceDescriptor(result)}</td>
                  <td>
                    {result.published_at ? studentDateTimeLabel(result.published_at) : "Pending"}
                  </td>
                  <td>{percentageLabel(result.percentage)}</td>
                  <td>{result.rank ?? "Pending"}</td>
                  <td>Pending backend support</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredResults.length ? (
            <p className="emptyText">Published rank history will appear here after scored and published results accumulate.</p>
          ) : null}
        </div>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Related report links</strong>
            <span>Next ranking checks</span>
          </div>
          <div className="studentInsightHeroActions">
            <Link
              className="button buttonPrimary"
              href={buildAnalyticsTimelineHref({
                subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              Open Improvement Timeline
            </Link>
            <Link className="button buttonSecondary" href="/app/results">
              Open Results Report
            </Link>
            <Link className="button buttonGhost" href="/app/analytics/results/compare">
              Open Result Comparison
            </Link>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Release note</strong>
            <span>Backend dependency</span>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                Rank history is live in this first pass because rank is already present in the student result payload.
              </p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                Percentile history remains intentionally marked as pending until the backend exposes trustworthy student percentile fields.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
