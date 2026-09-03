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
  aggregateQuestionsByType,
  sortResultsByPublishedDate,
} from "@/lib/student/analytics-derivations";
import {
  buildAnalyticsActionsHref,
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsResultsCompareHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTopicHref,
  decodeAnalyticsParam,
  isStudentAnalyticsSourceKey,
  loadStudentAnalyticsBundle,
  scoreTone,
  sourceDescriptor,
} from "@/lib/student/analytics";
import {
  percentageLabel,
  questionTypeLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import {
  ALL_SUBJECTS_CONTEXT,
  filterStudentRecordsByMetadataSubject,
  filterStudentRecordsBySource,
  filterStudentSummaryBySource,
  filterStudentSummaryBySubject,
  getStudentSourceOptions,
  selectedStudentSourceLabel,
  resolveSelectedStudentSourceTeacher,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

export default async function StudentAnalyticsSourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceKey: string }>;
  searchParams: Promise<{ subject?: string; teacher?: string; label?: string }>;
}) {
  const route = await params;
  const query = await searchParams;
  const sourceKey = decodeAnalyticsParam(route.sourceKey).toLowerCase();
  const subject = query.subject ? decodeAnalyticsParam(query.subject) : null;
  const sourceLabel = query.label ? decodeAnalyticsParam(query.label) : null;
  const cookieStore = await cookies();
  const state = getStudentApiState();

  if (!isStudentAnalyticsSourceKey(sourceKey)) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Unsupported route"
          title="This source drill-down is not available"
          description="The analytics source route only supports platform, institute, and teacher drill-down views."
          bullets={["Platform", "Institute", "Teacher"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Select a supported source"
        />
      </div>
    );
  }

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Source analytics are not available yet"
          description="Sign in with your student account to load source analytics."
          bullets={["Student sign-in", "Source analytics", "Question data"]}
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
      subject,
      source: sourceKey,
      teacher: query.teacher ?? null,
    }).catch(() => null),
  ]);

  if (!bundle.summary) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Source analytics could not be loaded"
          description="We couldn't load this source view right now."
          bullets={["Source analytics", "Question data", "Published results"]}
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

  const { teacherOptions } = getStudentSourceOptions([
    ...bundle.results,
    ...bundle.exams,
    ...(bundle.summary?.source_breakdown ?? []),
    ...(bundle.summary?.recent_exams ?? []),
  ]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    sourceKey,
    query.teacher ??
      cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ??
      null,
  );

  const sourceSummary = filterStudentSummaryBySource(bundle.summary, sourceKey, selectedTeacherId);
  const scopedSummary = filterStudentSummaryBySubject(
    sourceSummary,
    subject ?? ALL_SUBJECTS_CONTEXT,
  );
  const publishedResults = sortResultsByPublishedDate(
    filterStudentRecordsByMetadataSubject(
      filterStudentRecordsBySource(bundle.results, sourceKey, selectedTeacherId),
      subject ?? ALL_SUBJECTS_CONTEXT,
    ).filter((item) => item.is_published),
  );
  const subjectRows = scopedSummary.source_subject_breakdown
    .slice()
    .sort((left, right) => Number(left.average_percentage) - Number(right.average_percentage));
  const typeRows = aggregateQuestionsByType(resolvedQuestionData.questions).slice(0, 5);
  const topicRows = aggregateQuestionsByTopic(resolvedQuestionData.questions).slice(0, 5);
  const difficultyRows = aggregateQuestionsByDifficulty(resolvedQuestionData.questions);
  const averagePercentage =
    publishedResults.reduce((total, item) => total + Number(item.percentage), 0) /
    (publishedResults.length || 1);
  const latestResult = publishedResults[0] ?? null;
  const sourceTitle =
    sourceLabel
    ?? (sourceKey === "teacher" && selectedTeacherId && scopedSummary.source_breakdown[0]
      ? sourceDescriptor(scopedSummary.source_breakdown[0])
      : selectedStudentSourceLabel(sourceKey));

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Source detail"
        title={
          subject ? `${sourceTitle} · ${subject}` : `${sourceTitle} Analytics`
        }
        description="Review one learning source in isolation and see whether a weakness is source-specific."
        statusLabel={`${resolvedQuestionData.questions.length} source-filtered questions`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentReportFilters
        basePath={`/app/analytics/sources/${encodeURIComponent(sourceKey)}`}
        title="Source detail filters"
        helper="Keep the source fixed while refining subject and teacher context for this drilldown."
        selectedSource={sourceKey}
        selectedSubject={subject ?? ALL_SUBJECTS_CONTEXT}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={[
          { value: ALL_SUBJECTS_CONTEXT, label: "Overall" },
          ...subjectRows.map((row) => ({ value: row.subject_name, label: row.subject_name })),
        ]}
        teacherOptions={teacherOptions}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Source focus"
        title={sourceTitle}
        description={
          subject
            ? `This view isolates ${sourceTitle} for ${subject} so you can confirm whether the weakness is tied to this source.`
            : `This view isolates ${sourceTitle} across recent results, subject outcomes, and question behavior.`
        }
        badges={[
          subject ?? "All tracked subjects",
          `${publishedResults.length} published results`,
        ]}
        stats={[
          {
            label: "Average score",
            value: percentageLabel(averagePercentage),
          },
          {
            label: "Subjects",
            value: String(subjectRows.length),
          },
          {
            label: "Question types",
            value: String(typeRows.length),
          },
          {
            label: "Latest result",
            value: latestResult ? percentageLabel(latestResult.percentage) : "No publish yet",
          },
        ]}
        tone="warm"
        actions={
          <>
            <Link
              className="button buttonPrimary"
              href={buildAnalyticsActionsHref({
                subject,
                source: sourceKey,
                teacher: selectedTeacherId,
              })}
            >
              Open Action Center
            </Link>
            <Link
              className="button buttonSecondary"
              href={buildAnalyticsResultsCompareHref({
                subject,
                source: sourceKey,
                teacher: selectedTeacherId,
              })}
            >
              Compare Results
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Tracked Questions",
            value: String(resolvedQuestionData.overview.question_count),
            note: "Question evidence in this source",
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
            label: "Published Results",
            value: String(publishedResults.length),
            note: "Scored results in this source view",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Subject breakdown inside source</strong>
            <span>{subjectRows.length} tracked rows</span>
          </div>
          <div className="studentTopicStack">
            {subjectRows.length ? (
              subjectRows.map((row) => (
                <Link
                  className="studentTopicRow"
                  href={buildAnalyticsSubjectHref(row.subject_name, {
                    source: sourceKey,
                    teacher: selectedTeacherId,
                  })}
                  key={`${row.source_type}-${row.subject_name}`}
                >
                  <div>
                    <strong>{row.subject_name}</strong>
                    <span>
                      {row.count} results · {row.attempted_questions} attempted
                    </span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(row.average_percentage)}</strong>
                    <span>{row.skipped_questions} skipped</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="emptyText">Subject breakdown for this source will appear after matching published results are available.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recent source results</strong>
            <span>{publishedResults.length} published</span>
          </div>
          <div className="analyticsTimelineStack">
            {publishedResults.length ? (
              publishedResults.slice(0, 6).map((result) => (
                <div className="analyticsTimelineItem" key={result.id}>
                  <div className="analyticsTimelineDot" aria-hidden="true" />
                  <div className="analyticsTimelineBody">
                    <div className="analyticsTimelineHeader">
                      <div>
                        <strong>{result.exam_title}</strong>
                        <span>
                          {result.exam_code}
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
                      <span>
                        Rank {result.rank ?? "pending"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Published source results will appear here once matching scored attempts are available.</p>
            )}
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Weak topic hotspots</strong>
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
                    source: sourceKey,
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
              <p className="emptyText">Topic hotspots for this source will appear as more question data accumulates.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Question-type pressure</strong>
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
                    source: sourceKey,
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
              <p className="emptyText">Question-type pressure will appear as soon as this source has matching question records.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Difficulty mix</strong>
            <span>{difficultyRows.length} levels</span>
          </div>
          <div className="studentTopicStack">
            {difficultyRows.length ? (
              difficultyRows.map((row) => {
                const value = Number(row.accuracy);
                return (
                  <div className="studentTopicRow" key={row.key}>
                    <div>
                      <strong>{titleCaseState(row.label.replace(/_/g, " "))}</strong>
                      <span>{row.total} questions · {row.averageTimeSeconds}s average time</span>
                    </div>
                    <div className="studentTopicRowMeta">
                      <strong>{percentageLabel(row.accuracy)}</strong>
                      <span>{percentageLabel(row.skipRate)} skipped</span>
                    </div>
                    <div
                      className={`scoreBar scoreBar${scoreTone(value)}`}
                      style={{ ["--score-width" as string]: `${value}%` }}
                    />
                  </div>
                );
              })
            ) : (
              <p className="emptyText">Difficulty mix will appear when this source has enough question evidence.</p>
            )}
          </div>
        </article>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Question evidence from this source</strong>
          <span>{resolvedQuestionData.questions.length} records</span>
        </div>
        <StudentQuestionInsightList
          questions={resolvedQuestionData.questions.slice(0, 10)}
          subject={subject}
          source={sourceKey}
          teacher={selectedTeacherId}
          emptyMessage="Question-level evidence will appear here once this source has tracked attempts."
        />
      </section>
    </div>
  );
}
