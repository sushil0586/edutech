import Link from "next/link";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { loadStudentAnalyticsBundle, sourceDescriptor } from "@/lib/student/analytics";
import {
  benchmarkLabel,
  percentageLabel,
  peerRecordLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import {
  ALL_SUBJECTS_CONTEXT,
  filterStudentRecordsByMetadataSubject,
  filterStudentRecordsBySource,
} from "@/lib/student/subject-context";

export default async function StudentAnalyticsResultsComparePage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
}) {
  const query = await searchParams;
  const bundle = await loadStudentAnalyticsBundle();
  const subject = query.subject ?? null;
  const source = query.source ?? null;
  const teacher = query.teacher ?? null;

  if (!bundle.summary) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow={bundle.source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            bundle.source === "unconfigured"
              ? "Result comparison is waiting for backend data"
              : "Result comparison could not be loaded"
          }
          description="This page compares live published results without using any synthetic benchmark or mock result data."
          bullets={["Student analytics bundle", "Published results", "Student session"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel={
            bundle.source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      </div>
    );
  }

  const filteredResults = filterStudentRecordsByMetadataSubject(
    filterStudentRecordsBySource(
      bundle.results,
      source === "platform" || source === "institute" || source === "teacher"
        ? source
        : "all",
      source === "teacher" ? teacher : null,
    ),
    subject ?? ALL_SUBJECTS_CONTEXT,
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
        title={subject ? `${subject} Result Comparison` : "Result Comparison"}
        description="Compare real published results across time, source, and exam outcomes so students can see whether they are getting better or just getting different exams."
        statusLabel={`${publishedResults.length} published results`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Comparison snapshot"
        title={latest ? latest.exam_title : "Awaiting published results"}
        description={
          latest
            ? `The latest published result is ${percentageLabel(latest.percentage)} in ${latest.exam_title}. Use this page to compare it against your best result, your lowest result, and the broader pattern across published attempts.`
            : "Published results are required before comparison analytics can say anything meaningful."
        }
        badges={[
          source ? `Source · ${titleCaseState(source)}` : "All sources",
          subject ?? "All subjects",
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
            <Link className="button buttonPrimary" href="/app/results">
              Open Results
            </Link>
            <Link className="button buttonSecondary" href="/app/analytics/timeline">
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
            note: "Rank appears only when backend has calculated and exposed it",
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
                      {subject || source ? " · shown as overall snapshot" : ""}
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
