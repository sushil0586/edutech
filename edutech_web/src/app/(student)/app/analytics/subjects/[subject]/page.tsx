import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
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
import {
  ALL_SOURCES_CONTEXT,
  filterStudentExamsBySubject,
  filterStudentRecordsByMetadataSubject,
  getStudentSourceOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

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
          title="Subject analytics are not available yet"
          description="Sign in with your student account to load subject analytics."
          bullets={["Student sign-in", "Subject analytics", "Question data"]}
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
      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
      teacher: query.teacher ?? null,
    }).catch(() => null),
  ]);

  if (!bundle.summary) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Subject analytics could not be loaded"
          description="We couldn't load this subject view right now."
          bullets={["Subject analytics", "Question data", "Published results"]}
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
  const difficultyRows = aggregateQuestionsByDifficulty(resolvedQuestionData.questions);
  const typeRows = aggregateQuestionsByType(resolvedQuestionData.questions).slice(0, 4);
  const averageSubjectPercentage =
    subjectTopics.reduce((total, item) => total + Number(item.percentage), 0) /
    (subjectTopics.length || 1);
  const wrongQuestions = resolvedQuestionData.questions.filter(
    (item) => item.your_result === "wrong",
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

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Subject deep dive"
        title={`${subject} Analytics`}
        description="Inspect one subject through topic health, difficulty mix, and question evidence."
        statusLabel={`${resolvedQuestionData.questions.length} questions analyzed`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentReportFilters
        basePath={`/app/analytics/subjects/${encodeURIComponent(subject)}`}
        title="Subject detail filters"
        helper="Keep the subject fixed and refine this deep dive by source or teacher context."
        selectedSource={selectedSource}
        selectedSubject={subject}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={[{ value: subject, label: subject }]}
        teacherOptions={teacherOptions}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Subject focus"
        title={subject}
        description={`This page isolates ${subject} so you can see whether the issue sits in chapters, formats, or difficulty.`}
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
            value: String(resolvedQuestionData.overview.question_count),
            note: "Question-level evidence in this subject",
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
                    source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedTeacherId,
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
          <span>{resolvedQuestionData.questions.length} tracked questions</span>
        </div>
        <StudentQuestionInsightList
          questions={resolvedQuestionData.questions.slice(0, 8)}
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
