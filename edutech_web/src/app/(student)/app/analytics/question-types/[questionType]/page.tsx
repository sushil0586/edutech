import { cookies } from "next/headers";
import Link from "next/link";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
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
  loadStudentAnalyticsBundle,
} from "@/lib/student/analytics";
import {
  benchmarkLabel,
  percentageLabel,
  peerRecordLabel,
  questionTypeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  getStudentSourceOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

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
  const cookieStore = await cookies();
  const selectedSource = resolveSelectedStudentSource(
    query.source ?? cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Question-type analytics are not available yet"
          description="Sign in with your student account to load format analytics."
          bullets={["Student sign-in", "Question analytics", "Published results"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Sign in to continue"
        />
      </div>
    );
  }

  const [bundle, questionData] = await Promise.all([
    loadStudentAnalyticsBundle(),
    fetchStudentQuestionAnalytics({
      question_type: questionType,
      subject,
      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
      teacher: query.teacher ?? null,
    }).catch(() => null),
  ]);

  if (!bundle.summary) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question-type analytics could not be loaded"
          description="We couldn't load this format view right now."
          bullets={["Question analytics", "Published results", "Question-type metadata"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Try again soon"
        />
      </div>
    );
  }

  const resolvedQuestionData = questionData ?? {
    overview: {
      question_count: 0,
      attempted_count: 0,
      correct_count: 0,
      wrong_count: 0,
      skipped_count: 0,
    },
    benchmark_overview: [],
    questions: [],
  };

  const difficultyRows = aggregateQuestionsByDifficulty(resolvedQuestionData.questions);
  const topicRows = aggregateQuestionsByTopic(resolvedQuestionData.questions).slice(0, 5);
  const wrongCount = resolvedQuestionData.questions.filter(
    (item) => item.your_result === "wrong",
  ).length;
  const skippedCount = resolvedQuestionData.questions.filter(
    (item) => item.your_result === "skipped",
  ).length;
  const averageTime = resolvedQuestionData.questions.length
    ? Math.round(
        resolvedQuestionData.questions.reduce(
          (total, item) => total + item.your_time_spent_seconds,
          0,
        ) / resolvedQuestionData.questions.length,
      )
    : 0;
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

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Question-type lab"
        title={questionTypeLabel(questionType)}
        description="Study one format in isolation to see whether it is costing marks."
        statusLabel={`${resolvedQuestionData.questions.length} questions analyzed`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentReportFilters
        basePath={`/app/analytics/question-types/${encodeURIComponent(questionType)}`}
        title="Question-type filters"
        helper="Keep the format fixed while refining the subject and source context around it."
        selectedSource={selectedSource}
        selectedSubject={subject ?? ALL_SUBJECTS_CONTEXT}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={[
          { value: ALL_SUBJECTS_CONTEXT, label: "Overall" },
          ...(subject ? [{ value: subject, label: subject }] : []),
        ]}
        teacherOptions={teacherOptions}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Format behavior"
        title={questionTypeLabel(questionType)}
        description={`This page isolates ${questionTypeLabel(questionType).toLowerCase()} questions so you can see whether the format itself is causing wrong answers, skips, or slow completion.`}
        badges={[
          subject ?? "Overall subject view",
          `${resolvedQuestionData.benchmark_overview.length} benchmark scopes`,
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
            <Link
              className="button buttonPrimary"
              href={buildAnalyticsActionsHref({
                subject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              Open Action Center
            </Link>
            {subject ? (
              <Link
                className="button buttonSecondary"
                href={buildAnalyticsSubjectHref(subject, {
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedTeacherId,
                })}
              >
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
            value: String(resolvedQuestionData.overview.question_count),
            note: "Question evidence in this format",
            tone: "primary",
          },
          {
            label: "Attempted",
            value: String(resolvedQuestionData.overview.attempted_count),
            note: `${resolvedQuestionData.overview.skipped_count} skipped`,
          },
          {
            label: "Correct",
            value: String(resolvedQuestionData.overview.correct_count),
            note: `${resolvedQuestionData.overview.wrong_count} wrong`,
          },
          {
            label: "Benchmarks",
            value: String(resolvedQuestionData.benchmark_overview.length),
            note: "Anonymous peer comparison scopes",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Benchmark view</strong>
            <span>{resolvedQuestionData.benchmark_overview.length} scopes</span>
          </div>
          <div className="studentTopicStack">
            {resolvedQuestionData.benchmark_overview.length ? (
              resolvedQuestionData.benchmark_overview.map((benchmark) => (
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
                    source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedTeacherId,
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
          <span>{resolvedQuestionData.questions.length} tracked questions</span>
        </div>
        <StudentQuestionInsightList
          questions={resolvedQuestionData.questions}
          subject={subject}
          source={selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource}
          teacher={selectedTeacherId}
          currentView="question-type"
          currentQuestionType={questionType}
        />
      </section>
    </div>
  );
}
