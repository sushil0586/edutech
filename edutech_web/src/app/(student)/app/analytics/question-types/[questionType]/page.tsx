import Link from "next/link";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  StudentAnalyticsDetailHero,
  StudentQuestionInsightList,
} from "@/components/ui/student-analytics-detail";
import { fetchStudentQuestionAnalytics, getStudentApiState } from "@/lib/api/student";
import {
  aggregateQuestionsByDifficulty,
  aggregateQuestionsByTopic,
} from "@/lib/student/analytics-derivations";
import {
  buildAnalyticsActionsHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTopicHref,
  decodeAnalyticsParam,
} from "@/lib/student/analytics";
import {
  percentageLabel,
  questionTypeLabel,
  titleCaseState,
} from "@/lib/student/formatters";

export default async function StudentAnalyticsQuestionTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ questionType: string }>;
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
}) {
  const route = await params;
  const query = await searchParams;
  const questionType = decodeAnalyticsParam(route.questionType);
  const subject = query.subject ? decodeAnalyticsParam(query.subject) : null;
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Question-type analytics are waiting for backend data"
          description="This page uses question-level records to explain whether a format is hurting performance."
          bullets={["Question analytics endpoint", "Student session", "Published results"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Configuration required"
        />
      </div>
    );
  }

  const questionData = await fetchStudentQuestionAnalytics({
    question_type: questionType,
    subject,
    source: query.source ?? null,
    teacher: query.teacher ?? null,
  }).catch(() => null);

  if (!questionData) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question-type analytics could not be loaded"
          description="We need live question-level records to diagnose format-driven losses."
          bullets={["Question analytics endpoint", "Published results", "Question-type metadata"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const difficultyRows = aggregateQuestionsByDifficulty(questionData.questions);
  const topicRows = aggregateQuestionsByTopic(questionData.questions).slice(0, 5);
  const wrongCount = questionData.questions.filter(
    (item) => item.your_result === "wrong",
  ).length;
  const skippedCount = questionData.questions.filter(
    (item) => item.your_result === "skipped",
  ).length;
  const averageTime = questionData.questions.length
    ? Math.round(
        questionData.questions.reduce(
          (total, item) => total + item.your_time_spent_seconds,
          0,
        ) / questionData.questions.length,
      )
    : 0;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Question-type lab"
        title={questionTypeLabel(questionType)}
        description="Study one format in isolation to see whether a recurring answer pattern is costing marks."
        statusLabel={`${questionData.questions.length} questions analyzed`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Format behavior"
        title={questionTypeLabel(questionType)}
        description={`This page isolates ${questionTypeLabel(questionType).toLowerCase()} questions so the student can see whether the format itself is creating wrong answers, skips, or slow completion.`}
        badges={[
          subject ?? "Overall subject view",
          `${questionData.benchmark_overview.length} benchmark scopes`,
        ]}
        stats={[
          {
            label: "Wrong",
            value: String(wrongCount),
          },
          {
            label: "Skipped",
            value: String(skippedCount),
          },
          {
            label: "Average time",
            value: `${averageTime}s`,
          },
          {
            label: "Topics touched",
            value: String(topicRows.length),
          },
        ]}
        tone="warm"
        actions={
          <>
            <Link className="button buttonPrimary" href={buildAnalyticsActionsHref({ subject })}>
              Open Action Center
            </Link>
            {subject ? (
              <Link className="button buttonSecondary" href={buildAnalyticsSubjectHref(subject)}>
                Back to subject
              </Link>
            ) : null}
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Tracked Questions",
            value: String(questionData.overview.question_count),
            note: "Question evidence in this format",
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
            note: "Anonymous peer comparison scopes",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
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

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Difficulty view</strong>
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
              <p className="emptyText">Difficulty-based insights will appear as more question-level data is collected.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Topic hotspots</strong>
            <span>{topicRows.length} topics</span>
          </div>
          <div className="studentTopicStack">
            {topicRows.length ? (
              topicRows.map((row) => (
                <Link
                  className="studentTopicRow"
                  href={buildAnalyticsTopicHref({
                    topicId: row.key,
                    subject,
                    label: row.label,
                    source: query.source ?? null,
                    teacher: query.teacher ?? null,
                  })}
                  key={row.key}
                >
                  <div>
                    <strong>{row.label}</strong>
                    <span>{row.total} questions · {row.averageTimeSeconds}s average time</span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(row.accuracy)}</strong>
                    <span>{percentageLabel(row.skipRate)} skipped</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="emptyText">Topic hotspots for this question type will appear when topic tags are available.</p>
            )}
          </div>
        </article>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Question evidence</strong>
          <span>{questionData.questions.length} tracked questions</span>
        </div>
        <StudentQuestionInsightList
          questions={questionData.questions}
          subject={subject}
          source={query.source ?? null}
          teacher={query.teacher ?? null}
          currentView="question-type"
          currentQuestionType={questionType}
        />
      </section>
    </div>
  );
}
