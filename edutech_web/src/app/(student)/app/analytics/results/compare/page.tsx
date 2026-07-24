import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import {
  buildAnalyticsTimelineHref,
  loadStudentAnalyticsBundle,
  sourceDescriptor,
} from "@/lib/student/analytics";
import {
  benchmarkLabel,
  percentageLabel,
  peerRecordLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import { buildFilterHref } from "@/lib/workspace/filter-utils";
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

export default async function StudentAnalyticsResultsComparePage({
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
              ? "Result comparison is not available yet"
              : "Result comparison could not be loaded"
          }
          description={
            bundle.source === "unconfigured"
              ? "Sign in with your student account to compare published results."
              : "We couldn't load result comparison right now."
          }
          bullets={["Student sign-in", "Published results", "Analytics summary"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel={
            bundle.source === "unconfigured"
              ? "Sign in to continue"
              : "Try again soon"
          }
        />
      </div>
    );
  }

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

  const filteredResults = filterStudentRecordsByMetadataSubject(
    filterStudentRecordsBySource(
      bundle.results,
      selectedSource,
      selectedSource === "teacher" ? selectedTeacherId : null,
    ),
    selectedSubject,
  );
  const publishedResults = filteredResults
    .filter((item) => item.is_published)
    .sort((left, right) => {
      const leftTime = left.published_at ? new Date(left.published_at).getTime() : 0;
      const rightTime = right.published_at ? new Date(right.published_at).getTime() : 0;
      return rightTime - leftTime;
    });
  const pendingCount = filteredResults.filter((item) => !item.is_published).length;
  const latest = publishedResults[0] ?? null;
  const best = publishedResults.reduce<typeof publishedResults[number] | null>(
    (winner, item) =>
      !winner || Number(item.percentage) > Number(winner.percentage) ? item : winner,
    null,
  );
  const lowest = publishedResults.reduce<typeof publishedResults[number] | null>(
    (loser, item) =>
      !loser || Number(item.percentage) < Number(loser.percentage) ? item : loser,
    null,
  );
  const average =
    publishedResults.reduce((sum, item) => sum + Number(item.percentage), 0) /
    (publishedResults.length || 1);
  const resultsWithRank = publishedResults.filter((item) => item.rank !== null).length;
  const passCount = publishedResults.filter((item) => item.result_status === "pass").length;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Result comparison"
        title={
          selectedSubject !== ALL_SUBJECTS_CONTEXT
            ? `${selectedSubject} Result Comparison`
            : "Result Comparison"
        }
        description="Compare published results across time, source, and exam type."
        statusLabel={`${publishedResults.length} published results`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentReportFilters
        basePath="/app/analytics/results/compare"
        title="Comparison filters"
        helper="Use the same report scope here before comparing latest, best, lowest, and benchmark performance."
        selectedSource={selectedSource}
        selectedSubject={selectedSubject}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={subjectOptions}
        teacherOptions={teacherOptions}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Comparison snapshot"
        title={latest ? latest.exam_title : "Awaiting published results"}
        description={
          latest
            ? `The latest published result is ${percentageLabel(latest.percentage)} in ${latest.exam_title}. Compare it against your best, lowest, and recent published attempts.`
            : "Published results are required before comparison analytics can say anything meaningful."
        }
        badges={[
          selectedSource !== ALL_SOURCES_CONTEXT
            ? `Source · ${titleCaseState(selectedSource)}`
            : "All sources",
          selectedSubject !== ALL_SUBJECTS_CONTEXT ? selectedSubject : "All subjects",
        ]}
        stats={[
          {
            label: "Average",
            value: percentageLabel(average),
          },
          {
            label: "Best",
            value: best ? percentageLabel(best.percentage) : "No publish yet",
          },
          {
            label: "Lowest",
            value: lowest ? percentageLabel(lowest.percentage) : "No publish yet",
          },
          {
            label: "Pending",
            value: String(pendingCount),
          },
        ]}
        actions={
          <>
            <Link
              className="button buttonPrimary"
              href={buildFilterHref("/app/results", [
                ["subject", selectedSubject, ALL_SUBJECTS_CONTEXT],
                ["source", selectedSource, ALL_SOURCES_CONTEXT],
                ["teacher", selectedTeacherId],
              ])}
            >
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
            label: "Published Results",
            value: String(publishedResults.length),
            note: "Results available for comparison",
            tone: "primary",
          },
          {
            label: "Pass Rate",
            value: publishedResults.length
              ? percentageLabel((passCount / publishedResults.length) * 100)
              : "0%",
            note: `${passCount} passed results`,
          },
          {
            label: "Rank Available",
            value: String(resultsWithRank),
            note: "Rank appears only when it is available for that result",
          },
          {
            label: "Pending Publish",
            value: String(pendingCount),
            note: "Submitted or scored results not yet student-visible",
            
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Best vs latest vs lowest</strong>
            <span>Real result checkpoints</span>
          </div>
          <div className="studentTopicStack">
            {[
              { label: "Latest", result: latest },
              { label: "Best", result: best },
              { label: "Lowest", result: lowest },
            ].map((entry) => (
              <div className="studentTopicRow" key={entry.label}>
                <div>
                  <strong>{entry.label}</strong>
                  <span>
                    {entry.result
                      ? `${entry.result.exam_title} · ${sourceDescriptor(entry.result)}`
                      : "No published result available"}
                  </span>
                </div>
                <div className="studentTopicRowMeta">
                  <strong>
                    {entry.result ? percentageLabel(entry.result.percentage) : "No publish yet"}
                  </strong>
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
            <strong>Benchmark snapshot</strong>
            <span>Overall peer comparison</span>
          </div>
          <div className="studentTopicStack">
            {bundle.summary.benchmark_overview.length ? (
              bundle.summary.benchmark_overview.map((benchmark) => (
                <div className="studentTopicRow" key={benchmark.scope}>
                  <div>
                    <strong>{benchmarkLabel(benchmark.label || benchmark.scope)}</strong>
                    <span>
                      {peerRecordLabel(benchmark.participant_count)}
                      {selectedSubject !== ALL_SUBJECTS_CONTEXT ||
                      selectedSource !== ALL_SOURCES_CONTEXT
                        ? " · shown as overall snapshot"
                        : ""}
                    </span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(benchmark.average_percentage)} peer average</strong>
                    <span>{percentageLabel(benchmark.accuracy_percentage)} peer accuracy</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Benchmark comparisons will appear when matching peer records are available.</p>
            )}
          </div>
        </article>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Published result ledger</strong>
          <span>{publishedResults.length} rows</span>
        </div>
        <div className="dashboardRailStack">
          {publishedResults.length ? (
            publishedResults.map((result) => (
              <div className="dashboardRailRow" key={result.id}>
                <div>
                  <strong>{result.exam_title}</strong>
                  <span>
                    {result.exam_code} · {sourceDescriptor(result)}
                    {result.metadata?.subject_name
                      ? ` · ${String(result.metadata.subject_name)}`
                      : ""}
                    {result.published_at
                      ? ` · ${studentDateTimeLabel(result.published_at)}`
                      : ""}
                  </span>
                </div>
                <div className="studentInsightHeroActions">
                  <span className="dashboardRailStat">
                    {percentageLabel(result.percentage)}
                  </span>
                  <span className="studentDashboardMiniBadge">
                    {titleCaseState(result.result_status)}
                  </span>
                  <span className="studentDashboardMiniBadge">
                    Rank {result.rank ?? "pending"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="emptyText">Published results will appear here after scoring and publication complete.</p>
          )}
        </div>
      </section>
    </div>
  );
}
