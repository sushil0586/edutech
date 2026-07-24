import { cookies } from "next/headers";
import Link from "next/link";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
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
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

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
  const cookieStore = await cookies();
  const selectedSource = resolveSelectedStudentSource(
    query.source ?? cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const selectedSubject = resolveSelectedStudentSubject(
    getStudentSubjectOptions({ subject_interests: [] }),
    query.subject
      ? decodeAnalyticsParam(query.subject)
      : cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const label = query.label ? decodeAnalyticsParam(query.label) : null;
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Topic analytics are not available yet"
          description="Sign in with your student account to load topic analytics."
          bullets={["Student sign-in", "Topic analytics", "Question data"]}
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
      topic: topicId,
      subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
      teacher: query.teacher ?? null,
    }).catch(() => null),
  ]);

  if (!bundle.summary) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Topic analytics could not be loaded"
          description="We couldn't load this topic view right now."
          bullets={["Topic analytics", "Question data", "Topic tags"]}
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

  const topicTitle =
    resolvedQuestionData.questions[0]?.topic_name ??
    bundle.topicPerformance.find((item) => item.topic === topicId)?.topic_name ??
    label ??
    "Topic";
  const difficultyRows = aggregateQuestionsByDifficulty(resolvedQuestionData.questions);
  const typeRows = aggregateQuestionsByType(resolvedQuestionData.questions);
  const topicRecords = bundle.topicPerformance.filter((item) => item.topic === topicId);
  const topicAverage =
    topicRecords.reduce((total, item) => total + Number(item.percentage), 0) /
    (topicRecords.length || 1);
  const skippedCount = resolvedQuestionData.questions.filter(
    (item) => item.your_result === "skipped",
  ).length;
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
  const effectiveSubject =
    selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Topic deep dive"
        title={topicTitle}
        description="One topic, exact question evidence, and the next move."
        statusLabel={`${resolvedQuestionData.questions.length} questions analyzed`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentReportFilters
        basePath={`/app/analytics/topics/${encodeURIComponent(topicId)}`}
        title="Topic detail filters"
        helper="Keep the topic fixed while refining the subject and source context around it."
        selectedSource={selectedSource}
        selectedSubject={effectiveSubject ?? ALL_SUBJECTS_CONTEXT}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={[
          { value: ALL_SUBJECTS_CONTEXT, label: "Overall" },
          ...(effectiveSubject ? [{ value: effectiveSubject, label: effectiveSubject }] : []),
        ]}
        teacherOptions={teacherOptions}
      />

      <section className="topicFocusCompact">
        <div className="topicFocusCompactSummary">
          <span className="studentDashboardTag studentDashboardTagWarm">Topic focus</span>
          <strong>{topicTitle}</strong>
          <div className="studentInsightHeroActions">
            <span className="studentDashboardMiniBadge">
              {effectiveSubject ?? resolvedQuestionData.questions[0]?.subject_name ?? "Overall subject"}
            </span>
            <span className="studentDashboardMiniBadge">
              {topicRecords.length} scored topic records
            </span>
            <span className="studentDashboardMiniBadge">
              {resolvedQuestionData.questions.length} questions analyzed
            </span>
          </div>
          <div className="studentInsightHeroActions topicFocusCompactActions">
            {effectiveSubject ? (
              <Link
                className="button buttonPrimary"
                href={`/app/practice?subject=${encodeURIComponent(effectiveSubject)}&topic=${encodeURIComponent(topicTitle)}`}
              >
                Practice this topic
              </Link>
            ) : (
              <Link className="button buttonPrimary" href="/app/practice">
                Open Practice Lane
              </Link>
            )}
            {effectiveSubject ? (
              <Link
                className="button buttonSecondary"
                href={buildAnalyticsSubjectHref(effectiveSubject, {
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedTeacherId,
                })}
              >
                Back to subject
              </Link>
            ) : null}
            <Link
              className="button buttonGhost"
              href={buildAnalyticsActionsHref({
                subject: effectiveSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
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
            <strong>{resolvedQuestionData.overview.wrong_count}</strong>
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
            value: String(resolvedQuestionData.overview.question_count),
            note: "Question evidence inside this topic",
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
                    subject: effectiveSubject,
                    source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedTeacherId,
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

        <article className="contentCard analyticsPanel analyticsPanelInsights">
          <div className="sectionHeading">
            <strong>Next move</strong>
            <span>Action continuity</span>
          </div>
          <div className="analyticsChecklist">
            <Link
              className="analyticsChecklistItem"
              href={buildAnalyticsActionsHref({
                subject: effectiveSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              <strong>Open action center</strong>
              <span>Check whether this topic is still the top priority.</span>
            </Link>
            {effectiveSubject ? (
              <Link
                className="analyticsChecklistItem"
                href={buildAnalyticsSubjectHref(effectiveSubject, {
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedTeacherId,
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
          <span>{resolvedQuestionData.questions.length} tracked questions</span>
        </div>
        <StudentQuestionInsightList
          questions={resolvedQuestionData.questions}
          subject={effectiveSubject}
          source={selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource}
          teacher={selectedTeacherId}
          currentView="topic"
          currentTopicId={topicId}
        />
      </section>
    </div>
  );
}
