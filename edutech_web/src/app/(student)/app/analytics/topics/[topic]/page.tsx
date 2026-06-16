import Link from "next/link";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StudentQuestionInsightList } from "@/components/ui/student-analytics-detail";
import { fetchStudentQuestionAnalytics, getStudentApiState } from "@/lib/api/student";
import {
  aggregateQuestionsByDifficulty,
  aggregateQuestionsByType,
} from "@/lib/student/analytics-derivations";
import {
  buildAnalyticsActionsHref,
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsSubjectHref,
  decodeAnalyticsParam,
  loadStudentAnalyticsBundle,
} from "@/lib/student/analytics";
import {
  percentageLabel,
  questionTypeLabel,
  titleCaseState,
} from "@/lib/student/formatters";

export default async function StudentAnalyticsTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{
    subject?: string;
    label?: string;
    source?: string;
    teacher?: string;
  }>;
}) {
  const route = await params;
  const query = await searchParams;
  const topicId = decodeAnalyticsParam(route.topic);
  const subject = query.subject ? decodeAnalyticsParam(query.subject) : null;
  const label = query.label ? decodeAnalyticsParam(query.label) : null;
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Topic analytics are waiting for backend data"
          description="This page needs topic-filtered question analytics and the broader summary bundle."
          bullets={["Student analytics bundle", "Question analytics endpoint", "Tagged topic records"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Configuration required"
        />
      </div>
    );
  }

  const [bundle, questionData] = await Promise.all([
    loadStudentAnalyticsBundle(),
    fetchStudentQuestionAnalytics({
      topic: topicId,
      subject,
      source: query.source ?? null,
      teacher: query.teacher ?? null,
    }).catch(() => null),
  ]);

  if (!bundle.summary || !questionData) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Topic analytics could not be loaded"
          description="We need both topic-filtered question evidence and the analytics summary to render this page truthfully."
          bullets={["Student analytics bundle", "Question analytics endpoint", "Topic tags"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const topicTitle =
    questionData.questions[0]?.topic_name ??
    bundle.topicPerformance.find((item) => item.topic === topicId)?.topic_name ??
    label ??
    "Topic";
  const difficultyRows = aggregateQuestionsByDifficulty(questionData.questions);
  const typeRows = aggregateQuestionsByType(questionData.questions);
  const topicRecords = bundle.topicPerformance.filter((item) => item.topic === topicId);
  const topicAverage =
    topicRecords.reduce((total, item) => total + Number(item.percentage), 0) /
    (topicRecords.length || 1);
  const skippedCount = questionData.questions.filter(
    (item) => item.your_result === "skipped",
  ).length;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Topic deep dive"
        title={topicTitle}
        description="One topic, exact question evidence, and the next move."
        statusLabel={`${questionData.questions.length} questions analyzed`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <section className="topicFocusCompact">
        <div className="topicFocusCompactSummary">
          <span className="studentDashboardTag studentDashboardTagWarm">Topic focus</span>
          <strong>{topicTitle}</strong>
          <div className="studentInsightHeroActions">
            <span className="studentDashboardMiniBadge">
              {subject ?? questionData.questions[0]?.subject_name ?? "Overall subject"}
            </span>
            <span className="studentDashboardMiniBadge">
              {topicRecords.length} scored topic records
            </span>
            <span className="studentDashboardMiniBadge">
              {questionData.questions.length} questions analyzed
            </span>
          </div>
          <div className="studentInsightHeroActions topicFocusCompactActions">
            {subject ? (
              <Link
                className="button buttonPrimary"
                href={`/app/practice?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topicTitle)}`}
              >
                Practice this topic
              </Link>
            ) : (
              <Link className="button buttonPrimary" href="/app/practice">
                Open Practice Lane
              </Link>
            )}
            {subject ? (
              <Link
                className="button buttonSecondary"
                href={buildAnalyticsSubjectHref(subject, {
                  source: query.source ?? null,
                  teacher: query.teacher ?? null,
                })}
              >
                Back to subject
              </Link>
            ) : null}
            <Link className="button buttonGhost" href={buildAnalyticsActionsHref({ subject })}>
              Open action center
            </Link>
          </div>
        </div>

        <div className="topicFocusCompactStats">
          <article className="topicFocusCompactStat">
            <span>Topic average</span>
            <strong>{percentageLabel(topicAverage)}</strong>
          </article>
          <article className="topicFocusCompactStat">
            <span>Wrong questions</span>
            <strong>{questionData.overview.wrong_count}</strong>
          </article>
          <article className="topicFocusCompactStat">
            <span>Skipped</span>
            <strong>{skippedCount}</strong>
          </article>
          <article className="topicFocusCompactStat">
            <span>Difficulty levels</span>
            <strong>{difficultyRows.length}</strong>
          </article>
        </div>
      </section>

      <StudentKpiGrid
        className="resultsSummaryGrid analyticsKpiGrid"
        items={[
          {
            label: "Tracked Questions",
            value: String(questionData.overview.question_count),
            note: "Question evidence inside this topic",
            tone: "primary",
          },
          {
            label: "Attempted",
            value: String(questionData.overview.attempted_count),
            note: `${questionData.overview.skipped_count} skipped`,
          },
          {
            label: "Correct",
            value: String(questionData.overview.correct_count),
            note: `${questionData.overview.wrong_count} wrong`,
          },
          {
            label: "Benchmarks",
            value: String(questionData.benchmark_overview.length),
            note: "Peer scopes available for this view",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard analyticsPanel analyticsPanelTopics">
          <div className="sectionHeading">
            <strong>Difficulty mix</strong>
            <span>{difficultyRows.length} levels</span>
          </div>
          <div className="studentTopicStack">
            {difficultyRows.length ? (
              difficultyRows.map((row) => (
                <div className="studentTopicRow" key={row.key}>
                  <div>
                    <strong>{titleCaseState(row.label.replace(/_/g, " "))}</strong>
                    <span>{row.total} questions · {row.averageTimeSeconds}s average time</span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(row.accuracy)}</strong>
                    <span>{percentageLabel(row.skipRate)} skipped</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Difficulty mix will appear after more question-level records are available.</p>
            )}
          </div>
        </article>

        <article className="contentCard analyticsPanel analyticsPanelRisk">
          <div className="sectionHeading">
            <strong>Question format mix</strong>
            <span>{typeRows.length} formats</span>
          </div>
          <div className="studentTopicStack">
            {typeRows.length ? (
              typeRows.map((row) => (
                <Link
                  className="studentTopicRow"
                  href={buildAnalyticsQuestionTypeHref({
                    questionType: row.key,
                    subject,
                    source: query.source ?? null,
                    teacher: query.teacher ?? null,
                  })}
                  key={row.key}
                >
                  <div>
                    <strong>{questionTypeLabel(row.label)}</strong>
                    <span>{row.total} questions · {row.averageTimeSeconds}s average time</span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(row.accuracy)}</strong>
                    <span>{percentageLabel(row.skipRate)} skipped</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="emptyText">Question-format detail will appear after more topic questions are tracked.</p>
            )}
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard analyticsPanel analyticsPanelMatrix">
          <div className="sectionHeading">
            <strong>Benchmark view</strong>
            <span>{questionData.benchmark_overview.length} scopes</span>
          </div>
          <div className="studentTopicStack">
            {questionData.benchmark_overview.length ? (
              questionData.benchmark_overview.map((benchmark) => (
                <div className="studentTopicRow" key={benchmark.scope}>
                  <div>
                    <strong>{benchmark.label}</strong>
                    <span>{benchmark.participant_count} peer records · percentile pending backend support</span>
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

        <article className="contentCard analyticsPanel analyticsPanelInsights">
          <div className="sectionHeading">
            <strong>Next move</strong>
            <span>Action continuity</span>
          </div>
          <div className="analyticsChecklist">
            <Link className="analyticsChecklistItem" href={buildAnalyticsActionsHref({ subject })}>
              <strong>Open action center</strong>
              <span>Check whether this topic is still the top priority.</span>
            </Link>
            {subject ? (
              <Link
                className="analyticsChecklistItem"
                href={buildAnalyticsSubjectHref(subject, {
                  source: query.source ?? null,
                  teacher: query.teacher ?? null,
                })}
              >
                <strong>Compare inside the subject</strong>
                <span>See whether this weakness is isolated or broader.</span>
              </Link>
            ) : null}
          </div>
        </article>
      </section>

      <section className="contentCard analyticsPanel analyticsPanelSource">
        <div className="sectionHeading">
          <strong>Question evidence</strong>
          <span>{questionData.questions.length} tracked questions</span>
        </div>
        <StudentQuestionInsightList
          questions={questionData.questions}
          subject={subject}
          source={query.source ?? null}
          teacher={query.teacher ?? null}
          currentView="topic"
          currentTopicId={topicId}
        />
      </section>
    </div>
  );
}
