import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { fetchStudentQuestionAnalytics } from "@/lib/api/student";
import {
  buildAnalyticsActionsHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTimelineHref,
  buildQuestionAnalyticsHref,
  decodeAnalyticsParam,
  loadStudentAnalyticsBundle,
  sourceDescriptor,
} from "@/lib/student/analytics";
import {
  percentageLabel,
  questionTypeLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentRecordsByMetadataSubject,
  filterStudentRecordsBySource,
  getStudentSourceOptions,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

function secondsLabel(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0s";
  }
  if (value < 60) {
    return `${value}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function attemptPacingLabel(seconds: number) {
  if (seconds >= 120) return "Very slow";
  if (seconds >= 75) return "Slow";
  if (seconds >= 35) return "Balanced";
  return "Fast";
}

export default async function StudentTimeManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
}) {
  const query = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    query.subject
      ? decodeAnalyticsParam(query.subject)
      : cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSource = resolveSelectedStudentSource(
    query.source
      ? decodeAnalyticsParam(query.source)
      : cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );

  const [bundle, questionData] = await Promise.all([
    loadStudentAnalyticsBundle(),
    fetchStudentQuestionAnalytics({
      subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
      teacher: query.teacher ?? null,
    }).catch(() => null),
  ]);

  if (!bundle.summary) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow={bundle.source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            bundle.source === "unconfigured"
              ? "Time management report is not available yet"
              : "Time management report could not be loaded"
          }
          description={
            bundle.source === "unconfigured"
              ? "Sign in with your student account to load timing and pacing analytics."
              : "We couldn't load your timing report right now."
          }
          bullets={["Student sign-in", "Published results", "Question timing"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel={bundle.source === "unconfigured" ? "Sign in to continue" : "Try again soon"}
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
  ]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    query.teacher ??
      cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ??
      null,
  );

  const filteredResults = filterStudentRecordsByMetadataSubject(
    filterStudentRecordsBySource(
      bundle.results,
      selectedSource,
      selectedSource === "teacher" ? selectedTeacherId : null,
    ),
    selectedSubject,
  ).filter((item) => item.is_published);

  const timedQuestions = resolvedQuestionData.questions.filter((item) => item.attempted_by_you);
  const totalQuestionTime = timedQuestions.reduce(
    (total, item) => total + item.your_time_spent_seconds,
    0,
  );
  const averageQuestionTime = timedQuestions.length
    ? Math.round(totalQuestionTime / timedQuestions.length)
    : 0;
  const slowQuestions = [...timedQuestions]
    .sort((left, right) => right.your_time_spent_seconds - left.your_time_spent_seconds)
    .slice(0, 8);
  const fastWrongQuestions = timedQuestions
    .filter((item) => item.your_result === "wrong")
    .sort((left, right) => left.your_time_spent_seconds - right.your_time_spent_seconds)
    .slice(0, 6);
  const longestResults = [...filteredResults]
    .sort((left, right) => right.time_taken_seconds - left.time_taken_seconds)
    .slice(0, 6);
  const averageAttemptTime = filteredResults.length
    ? Math.round(
        filteredResults.reduce((total, item) => total + item.time_taken_seconds, 0) /
          filteredResults.length,
      )
    : 0;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Time management report"
        title="Time Management Report"
        description="Review where time is being spent, where pacing breaks down, and which questions or tests deserve a closer timing check."
        statusLabel={`${timedQuestions.length} timed questions tracked`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentReportFilters
        basePath="/app/analytics/time-management"
        title="Time report filters"
        helper="Use the same academic scope here that you use in practice and results so timing signals stay comparable."
        selectedSource={selectedSource}
        selectedSubject={selectedSubject}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={subjectOptions}
        teacherOptions={teacherOptions}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Timing snapshot"
        title={attemptPacingLabel(averageQuestionTime)}
        description={
          timedQuestions.length
            ? `Your current average time per attempted question is ${secondsLabel(
                averageQuestionTime,
              )}, with ${filteredResults.length} published result records contributing exam-level timing context.`
            : "Timing analytics will become more useful as more attempted questions and published results accumulate."
        }
        badges={[
          selectedSubject !== ALL_SUBJECTS_CONTEXT ? selectedSubject : "All subjects",
          selectedSource !== ALL_SOURCES_CONTEXT
            ? `Source · ${titleCaseState(selectedSource)}`
            : "All sources",
          `${filteredResults.length} published results`,
        ]}
        stats={[
          { label: "Avg / question", value: secondsLabel(averageQuestionTime) },
          { label: "Avg / attempt", value: secondsLabel(averageAttemptTime) },
          { label: "Slow questions", value: String(slowQuestions.length) },
          { label: "Fast wrong", value: String(fastWrongQuestions.length) },
        ]}
        actions={
          <>
            <Link
              className="button buttonPrimary"
              href={buildAnalyticsTimelineHref({
                subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              Open Timeline
            </Link>
            <Link
              className="button buttonSecondary"
              href={buildAnalyticsActionsHref({
                subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              Open Action Center
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Average Question Time",
            value: secondsLabel(averageQuestionTime),
            note: "Across attempted questions in the current scope",
            tone: "primary",
          },
          {
            label: "Average Attempt Time",
            value: secondsLabel(averageAttemptTime),
            note: "Across published results in the current scope",
          },
          {
            label: "Timed Questions",
            value: String(timedQuestions.length),
            note: `${resolvedQuestionData.overview.skipped_count} skipped in the same scope`,
          },
          {
            label: "Fast Wrong Answers",
            value: String(fastWrongQuestions.length),
            note: "Wrong answers answered unusually quickly",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Longest test sessions</strong>
            <span>{longestResults.length} results</span>
          </div>
          <div className="studentTopicStack">
            {longestResults.length ? (
              longestResults.map((result) => (
                <Link className="studentTopicRow" href="/app/results" key={result.id}>
                  <div>
                    <strong>{result.exam_title}</strong>
                    <span>
                      {sourceDescriptor(result)}
                      {result.metadata?.subject_name ? ` · ${String(result.metadata.subject_name)}` : ""}
                    </span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{secondsLabel(result.time_taken_seconds)}</strong>
                    <span>{studentDateTimeLabel(result.published_at)}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="emptyText">Published attempt timing will appear here once scored results are available.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Fast wrong answers</strong>
            <span>{fastWrongQuestions.length} signals</span>
          </div>
          <div className="studentTopicStack">
            {fastWrongQuestions.length ? (
              fastWrongQuestions.map((item) => (
                <Link
                  className="studentTopicRow"
                  href={buildQuestionAnalyticsHref({
                    subject:
                      item.subject_name ??
                      (selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject),
                    topic: item.topic_id ?? null,
                    questionType: item.question_type,
                    source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedTeacherId,
                  })}
                  key={item.question_id}
                >
                  <div>
                    <strong>{item.question_text_summary}</strong>
                    <span>
                      {item.subject_name ?? "Unknown subject"}
                      {item.topic_name ? ` · ${item.topic_name}` : ""}
                    </span>
                  </div>
                  <div className="studentTopicRowMeta">
                    <strong>{secondsLabel(item.your_time_spent_seconds)}</strong>
                    <span>{questionTypeLabel(item.question_type)}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="emptyText">Fast wrong-answer patterns will appear once enough incorrect attempts are available.</p>
            )}
          </div>
        </article>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Slowest question ledger</strong>
          <span>{slowQuestions.length} items</span>
        </div>
        <div className="studentResultsTableWrap">
          <table className="studentResultsTable studentTimeManagementTable">
            <thead>
              <tr>
                <th>Question</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Type</th>
                <th>Result</th>
                <th>Time Spent</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {slowQuestions.map((item) => (
                <tr className="studentResultsTableRow" key={item.question_id}>
                  <td>
                    <strong>{item.question_text_summary}</strong>
                    <small>
                      {item.explanation
                        ? "Review the explanation and compare this timing against similar formats."
                        : "Open the full question view to inspect why this question took longer than usual."}
                    </small>
                  </td>
                  <td>{item.subject_name ?? "Unknown subject"}</td>
                  <td>{item.topic_name ?? "Unmapped topic"}</td>
                  <td>{questionTypeLabel(item.question_type)}</td>
                  <td>{titleCaseState(item.your_result)}</td>
                  <td>{secondsLabel(item.your_time_spent_seconds)}</td>
                  <td>
                    <Link
                      className="studentDashboardTextLink"
                      href={
                        item.subject_name
                          ? buildAnalyticsSubjectHref(item.subject_name, {
                              source:
                                selectedSource === ALL_SOURCES_CONTEXT
                                  ? null
                                  : selectedSource,
                              teacher: selectedTeacherId,
                            })
                          : buildQuestionAnalyticsHref({
                              subject:
                                selectedSubject === ALL_SUBJECTS_CONTEXT
                                  ? null
                                  : selectedSubject,
                              topic: item.topic_id ?? null,
                              questionType: item.question_type,
                              source:
                                selectedSource === ALL_SOURCES_CONTEXT
                                  ? null
                                  : selectedSource,
                              teacher: selectedTeacherId,
                            })
                      }
                    >
                      Open Drilldown
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!slowQuestions.length ? (
            <p className="emptyText">Slow-question timing evidence will appear here after more attempted questions are recorded.</p>
          ) : null}
        </div>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Time interpretation</strong>
            <span>How to read this report</span>
          </div>
          <div className="analyticsChecklist">
            <div className="analyticsChecklistItem">
              <strong>Long test time is not always bad</strong>
              <span>Compare score, accuracy, and time together before deciding whether a session was inefficient.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Fast wrong answers matter</strong>
              <span>Very quick mistakes often suggest overconfidence, rushed reading, or a repeat pattern in one format.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Slow question clusters matter too</strong>
              <span>When the same topic keeps taking too long, review method clarity before simply doing more volume.</span>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Related report links</strong>
            <span>Next timing checks</span>
          </div>
          <div className="studentInsightHeroActions">
            <Link
              className="button buttonPrimary"
              href={buildAnalyticsTimelineHref({
                subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              Open Improvement Timeline
            </Link>
            <Link
              className="button buttonSecondary"
              href={buildQuestionAnalyticsHref({
                subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              Open Question Pattern Report
            </Link>
            <Link className="button buttonGhost" href="/app/attempts">
              Open Attempts
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
