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
  selectedStudentSourceLabel,
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
  const teacher = query.teacher ?? null;
  const sourceLabel = query.label ? decodeAnalyticsParam(query.label) : null;
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
          title="Source analytics are waiting for backend data"
          description="This page combines source-filtered summary, result, and question analytics from live APIs."
          bullets={["Student analytics bundle", "Question analytics endpoint", "Source filters"]}
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
      subject,
      source: sourceKey,
      teacher,
    }).catch(() => null),
  ]);

  if (!bundle.summary || !questionData) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Source analytics could not be loaded"
          description="We need the live analytics bundle and source-filtered question data to render this page truthfully."
          bullets={["Student analytics bundle", "Question analytics endpoint", "Published results"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const sourceSummary = filterStudentSummaryBySource(bundle.summary, sourceKey, teacher);
  const scopedSummary = filterStudentSummaryBySubject(
    sourceSummary,
    subject ?? ALL_SUBJECTS_CONTEXT,
  );
  const publishedResults = sortResultsByPublishedDate(
    filterStudentRecordsByMetadataSubject(
      filterStudentRecordsBySource(bundle.results, sourceKey, teacher),
      subject ?? ALL_SUBJECTS_CONTEXT,
    ).filter((item) => item.is_published),
  );
  const subjectRows = scopedSummary.source_subject_breakdown
    .slice()
    .sort((left, right) => Number(left.average_percentage) - Number(right.average_percentage));
  const typeRows = aggregateQuestionsByType(questionData.questions).slice(0, 5);
  const topicRows = aggregateQuestionsByTopic(questionData.questions).slice(0, 5);
  const difficultyRows = aggregateQuestionsByDifficulty(questionData.questions);
  const averagePercentage =
    publishedResults.reduce((total, item) => total + Number(item.percentage), 0) /
    (publishedResults.length || 1);
  const latestResult = publishedResults[0] ?? null;
  const sourceTitle =
    sourceLabel
    ?? (sourceKey === "teacher" && teacher && scopedSummary.source_breakdown[0]
      ? sourceDescriptor(scopedSummary.source_breakdown[0])
      : selectedStudentSourceLabel(sourceKey));

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Source detail"
        title={
          subject ? `${sourceTitle} · ${subject}` : `${sourceTitle} Analytics`
        }
        description="Review one learning source in isolation so students can see whether a weakness is source-specific or consistent everywhere."
        statusLabel={`${questionData.questions.length} source-filtered questions`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Source focus"
        title={sourceTitle}
        description={
          subject
            ? `This view isolates ${sourceTitle} for ${subject}, making it easier to confirm whether the weakness is tied to this source or appears across the full student profile.`
            : `This view isolates ${sourceTitle}, showing how this source contributes to recent results, subject outcomes, and question behavior.`
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
              href={buildAnalyticsActionsHref({ subject, source: sourceKey, teacher })}
            >
              Open Action Center
            </Link>
            <Link
              className="button buttonSecondary"
              href={buildAnalyticsResultsCompareHref({ subject, source: sourceKey, teacher })}
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
            value: String(questionData.overview.question_count),
            note: "Question evidence in this source",
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
                    teacher,
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
                    teacher,
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
                    teacher,
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
          <span>{questionData.questions.length} records</span>
        </div>
        <StudentQuestionInsightList
          questions={questionData.questions.slice(0, 10)}
          subject={subject}
          source={sourceKey}
          teacher={teacher}
          emptyMessage="Question-level evidence will appear here once this source has tracked attempts."
        />
      </section>
    </div>
  );
}
