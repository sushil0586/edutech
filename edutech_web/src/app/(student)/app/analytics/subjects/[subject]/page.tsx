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
  aggregateQuestionsByType,
  sortResultsByPublishedDate,
} from "@/lib/student/analytics-derivations";
import {
  buildAnalyticsActionsHref,
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsTopicHref,
  decodeAnalyticsParam,
  loadStudentAnalyticsBundle,
} from "@/lib/student/analytics";
import {
  benchmarkLabel,
  percentageLabel,
  peerRecordLabel,
  questionTypeLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import { filterStudentExamsBySubject, filterStudentRecordsByMetadataSubject } from "@/lib/student/subject-context";

export default async function StudentAnalyticsSubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ source?: string; teacher?: string }>;
}) {
  const route = await params;
  const query = await searchParams;
  const subject = decodeAnalyticsParam(route.subject);
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Subject analytics are waiting for backend data"
          description="This page combines the summary bundle with question-level data for a single subject."
          bullets={["Student analytics bundle", "Question analytics endpoint", "Subject records"]}
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
      source: query.source ?? null,
      teacher: query.teacher ?? null,
    }).catch(() => null),
  ]);

  if (!bundle.summary || !questionData) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Subject analytics could not be loaded"
          description="We need both subject-filtered questions and the broader analytics bundle to render this page truthfully."
          bullets={["Student analytics bundle", "Question analytics endpoint", "Published results"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const subjectTopics = bundle.topicPerformance.filter(
    (item) => item.subject_name === subject,
  );
  const weakTopics = [...subjectTopics]
    .sort((a, b) => Number(a.percentage) - Number(b.percentage))
    .slice(0, 4);
  const strongTopics = [...subjectTopics]
    .sort((a, b) => Number(b.percentage) - Number(a.percentage))
    .slice(0, 4);
  const subjectResults = sortResultsByPublishedDate(
    filterStudentRecordsByMetadataSubject(bundle.results, subject).filter(
      (item) => item.is_published,
    ),
  );
  const practiceExams = filterStudentExamsBySubject(
    bundle.exams.filter((item) => item.exam_type === "practice"),
    subject,
  ).slice(0, 3);
  const difficultyRows = aggregateQuestionsByDifficulty(questionData.questions);
  const typeRows = aggregateQuestionsByType(questionData.questions).slice(0, 4);
  const averageSubjectPercentage =
    subjectTopics.reduce((total, item) => total + Number(item.percentage), 0) /
    (subjectTopics.length || 1);
  const wrongQuestions = questionData.questions.filter(
    (item) => item.your_result === "wrong",
  ).length;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Subject deep dive"
        title={`${subject} Analytics`}
        description="Inspect one subject through topic health, difficulty mix, question formats, and real question evidence."
        statusLabel={`${questionData.questions.length} questions analyzed`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Subject focus"
        title={subject}
        description={`This page isolates ${subject} so the student can understand whether the problem sits in specific chapters, certain formats, or the difficulty ladder.`}
        badges={[
          `${subjectTopics.length} tracked topics`,
          `${subjectResults.length} published results`,
        ]}
        stats={[
          {
            label: "Subject average",
            value: percentageLabel(averageSubjectPercentage),
          },
          {
            label: "Wrong questions",
            value: String(wrongQuestions),
          },
          {
            label: "Weak topics",
            value: String(weakTopics.length),
          },
          {
            label: "Practice sets",
            value: String(practiceExams.length),
          },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href={buildAnalyticsActionsHref({ subject })}>
              Open Action Center
            </Link>
            <Link className="button buttonSecondary" href={`/app/practice?subject=${encodeURIComponent(subject)}`}>
              Practice {subject}
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Tracked Questions",
            value: String(questionData.overview.question_count),
            note: "Question-level evidence in this subject",
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
            label: "Subject Topics",
            value: String(subjectTopics.length),
            note: "Tracked through topic-performance records",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Weak topic hotspots</strong>
            <span>{weakTopics.length} highlighted</span>
          </div>
          <div className="studentTopicStack">
            {weakTopics.length ? (
              weakTopics.map((topic) => (
                <Link
                  className="studentTopicRow"
                  href={buildAnalyticsTopicHref({
                    topicId: topic.topic ?? "untagged",
                    subject,
                    label: topic.topic_name,
                    source: query.source ?? null,
                    teacher: query.teacher ?? null,
                  })}
                  key={topic.id}
                >
                  <div>
                    <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                    <span>{topic.correct_answers} correct · {topic.attempted_questions} attempted</span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(topic.percentage)}</strong>
                    <span>{topic.skipped_questions} skipped</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="emptyText">Topic hotspots will appear once this subject has enough tagged records.</p>
            )}
          </div>
        </article>

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
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Difficulty ladder</strong>
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
              <p className="emptyText">Difficulty-based detail will appear as question-level subject data grows.</p>
            )}
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Question-type behavior</strong>
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
              <p className="emptyText">Question-type behavior will appear once this subject has enough tracked questions.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recent subject results</strong>
            <span>{subjectResults.length} published</span>
          </div>
          <div className="dashboardRailStack">
            {subjectResults.length ? (
              subjectResults.slice(0, 5).map((result) => (
                <div className="dashboardRailRow" key={result.id}>
                  <div>
                    <strong>{result.exam_title}</strong>
                    <span>{result.exam_code} · {studentDateTimeLabel(result.published_at)}</span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(result.percentage)}</strong>
                    <span>{result.correct_answers} correct</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Published results for this subject will appear here when available.</p>
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
          questions={questionData.questions.slice(0, 8)}
          subject={subject}
          source={query.source ?? null}
          teacher={query.teacher ?? null}
          currentView="subject"
        />
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Strong zones</strong>
            <span>{strongTopics.length} topics</span>
          </div>
          <div className="studentTopicStack">
            {strongTopics.length ? (
              strongTopics.map((topic) => (
                <div className="studentTopicRow" key={`${topic.id}-strong`}>
                  <div>
                    <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                    <span>{topic.correct_answers} correct</span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{percentageLabel(topic.percentage)}</strong>
                    <span>{topic.attempted_questions} attempted</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">Stronger zones will appear after more scored topic records are available.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recommended practice sets</strong>
            <span>{practiceExams.length} visible</span>
          </div>
          <div className="dashboardRailStack">
            {practiceExams.length ? (
              practiceExams.map((exam) => (
                <Link className="dashboardRailRow" href={`/app/exams/${exam.id}`} key={exam.id}>
                  <div>
                    <strong>{exam.title}</strong>
                    <span>{exam.code} · {exam.duration_minutes} min</span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{exam.source_label}</strong>
                    <span>{exam.exam_type}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="emptyText">Practice recommendations for this subject will appear when matching sets are available.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
