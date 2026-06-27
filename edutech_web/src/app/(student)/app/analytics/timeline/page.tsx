import Link from "next/link";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { fetchStudentQuestionAnalytics } from "@/lib/api/student";
import { sortResultsByPublishedDate } from "@/lib/student/analytics-derivations";
import {
  buildAnalyticsActionsHref,
  buildAnalyticsSubjectHref,
  decodeAnalyticsParam,
  loadStudentAnalyticsBundle,
  sourceDescriptor,
} from "@/lib/student/analytics";
import {
  benchmarkLabel,
  percentageLabel,
  peerRecordLabel,
  signedPercentageLabel,
  studentDateTimeLabel,
  trendDirectionLabel,
} from "@/lib/student/formatters";
import {
  ALL_SUBJECTS_CONTEXT,
  filterStudentRecordsByMetadataSubject,
  filterStudentRecordsBySource,
} from "@/lib/student/subject-context";

function aggregateQuestionSubjects(
  questions: Awaited<ReturnType<typeof fetchStudentQuestionAnalytics>>["questions"],
) {
  const map = new Map<
    string,
    {
      subject: string;
      total: number;
      correct: number;
      attempted: number;
    }
  >();

  for (const item of questions) {
    const subject = item.subject_name?.trim();
    if (!subject) {
      continue;
    }

    const bucket = map.get(subject) ?? {
      subject,
      total: 0,
      correct: 0,
      attempted: 0,
    };
    bucket.total += 1;
    bucket.attempted += item.attempted_by_you ? 1 : 0;
    bucket.correct += item.your_result === "correct" ? 1 : 0;
    map.set(subject, bucket);
  }

  return Array.from(map.values())
    .map((item) => ({
      subject: item.subject,
      averagePercentage: item.total ? (item.correct / item.total) * 100 : 0,
      trackedTopics: item.total,
      attemptedQuestions: item.attempted,
      correctAnswers: item.correct,
    }))
    .sort((left, right) => right.averagePercentage - left.averagePercentage)
    .slice(0, 4);
}

export default async function StudentAnalyticsTimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
}) {
  const query = await searchParams;
  const subject = query.subject ? decodeAnalyticsParam(query.subject) : null;
  const source = query.source ? decodeAnalyticsParam(query.source) : null;
  const teacher = query.teacher ?? null;

  const [bundle, questionData] = await Promise.all([
    loadStudentAnalyticsBundle(),
    fetchStudentQuestionAnalytics({ subject, source, teacher }).catch(() => null),
  ]);

  if (!bundle.summary || !questionData) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow={bundle.source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            bundle.source === "unconfigured"
              ? "Performance timeline is waiting for backend data"
              : "Performance timeline could not be loaded"
          }
          description="This page turns summary metrics into a real story across your recent published results."
          bullets={["Student analytics bundle", "Published result records", "Topic performance"]}
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
  const publishedResults = sortResultsByPublishedDate(
    filteredResults.filter((item) => item.is_published),
  );
  const subjectPerformance = aggregateQuestionSubjects(questionData.questions);

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Performance timeline"
        title="Momentum Over Time"
        description="See whether your scores, accuracy, and study behavior are genuinely improving across real published results."
        statusLabel={`${publishedResults.length} published results`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Trend snapshot"
        title={trendDirectionLabel(bundle.summary.improvement_trend.direction)}
        description={`Your recent result movement is currently ${trendDirectionLabel(
          bundle.summary.improvement_trend.direction,
        ).toLowerCase()} with a ${signedPercentageLabel(
          bundle.summary.improvement_trend.change_percentage,
        )} shift across recent exams.`}
        badges={[
          `${percentageLabel(bundle.summary.average_percentage)} average`,
          `${percentageLabel(bundle.summary.accuracy_percentage)} accuracy`,
        ]}
        stats={[
          {
            label: "Answered",
            value: String(questionData.overview.attempted_count),
          },
          {
            label: "Skipped",
            value: String(questionData.overview.skipped_count),
          },
          {
            label: "Results",
            value: String(publishedResults.length),
          },
          {
            label: "Benchmarks",
            value: String(bundle.summary.benchmark_overview.length),
          },
        ]}
        actions={
          <>
            <Link
              className="button buttonPrimary"
              href={buildAnalyticsActionsHref({ subject, source, teacher })}
            >
              Open Action Center
            </Link>
            <Link className="button buttonSecondary" href="/app/results">
              Open Results
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Average Performance",
            value: percentageLabel(bundle.summary.average_percentage),
            note: "Overall published result average",
            tone: "primary",
          },
          {
            label: "Accuracy Rate",
            value: percentageLabel(bundle.summary.accuracy_percentage),
            note: "Correct answers across tracked questions",
          },
          {
            label: "Trend Change",
            value: signedPercentageLabel(bundle.summary.improvement_trend.change_percentage),
            note: "Movement across recent exams",
          },
          {
            label: "Attempt History",
            value: String(questionData.overview.question_count),
            note: "Scoped questions contributing to this view",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recent result timeline</strong>
            <span>{publishedResults.length} entries</span>
          </div>
          <div className="analyticsTimelineStack">
            {publishedResults.length ? (
              publishedResults.slice(0, 8).map((result) => (
                <div className="analyticsTimelineItem" key={result.id}>
                  <div className="analyticsTimelineDot" aria-hidden="true" />
                  <div className="analyticsTimelineBody">
                    <div className="analyticsTimelineHeader">
                      <div>
                        <strong>{result.exam_title}</strong>
                        <span>
                          {result.exam_code} · {sourceDescriptor(result)}
                          {result.metadata?.subject_name
                            ? ` · ${String(result.metadata.subject_name)}`
                            : ""}
                        </span>
                      </div>
                      <div className="studentTopicRowMeta">
                        <strong>{percentageLabel(result.percentage)}</strong>
                        <span>{studentDateTimeLabel(result.published_at)}</span>
                      </div>
                    </div>
                    <div className="analyticsTimelineMetrics">
                      <span>{result.correct_answers} correct</span>
                      <span>{result.incorrect_answers} wrong</span>
                      <span>{result.skipped_questions} skipped</span>
                      <span>{result.time_taken_seconds}s spent</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Published results will appear here once scoring records are available.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Benchmark pulse</strong>
            <span>{bundle.summary.benchmark_overview.length} scopes</span>
          </div>
          <div className="studentTopicStack">
            {bundle.summary.benchmark_overview.length ? (
              bundle.summary.benchmark_overview.map((benchmark) => (
                <div className="studentTopicRow" key={benchmark.scope}>
                  <div>
                    <strong>{benchmarkLabel(benchmark.label || benchmark.scope)}</strong>
                    <span>{peerRecordLabel(benchmark.participant_count)} · percentile pending backend support</span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(benchmark.average_percentage)} peer average</strong>
                    <span>{percentageLabel(benchmark.accuracy_percentage)} peer accuracy</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Benchmark comparisons will appear when matching peer data is available.</p>
            )}
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Subject momentum</strong>
            <span>{subjectPerformance.length} subjects tracked</span>
          </div>
          <div className="studentTopicStack">
            {subjectPerformance.length ? (
              subjectPerformance.map((item) => (
                <Link
                  className="studentTopicRow"
                  href={buildAnalyticsSubjectHref(item.subject, { source, teacher })}
                  key={item.subject}
                >
                  <div>
                    <strong>{item.subject}</strong>
                    <span>
                      {item.trackedTopics} tracked topics · {item.correctAnswers} correct
                    </span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(item.averagePercentage)}</strong>
                    <span>{item.attemptedQuestions} attempted</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="emptyText">Subject movement will appear after topic-performance records accumulate.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>What to test next</strong>
            <span>Public-facing quality checks</span>
          </div>
          <div className="analyticsChecklist">
            <div className="analyticsChecklistItem">
              <strong>Trend truthfulness</strong>
              <span>Open the latest results and confirm the order, scores, and timestamps match the timeline.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Subject routing</strong>
              <span>Open a subject from the momentum panel and verify the deep dive reflects only that subject.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Action continuity</strong>
              <span>From this page, open the action center and verify the weakest recovery suggestion still matches the scoped drill.</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
