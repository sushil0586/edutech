import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
import {
  StudentQuestionPatternReport,
  type StudentQuestionPatternRow,
} from "@/components/ui/student-question-pattern-report";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  StudentAnalyticsDetailHero,
  StudentQuestionInsightList,
} from "@/components/ui/student-analytics-detail";
import { fetchStudentQuestionAnalytics, getStudentApiState } from "@/lib/api/student";
import {
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTopicHref,
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

function questionBenchmarkSignalLabel(value: {
  participant_count: number;
  correct_percentage: string;
} | null) {
  if (!value) {
    return "No school peer data yet";
  }

  return `${percentageLabel(value.correct_percentage)} correct · ${peerRecordLabel(
    value.participant_count,
    "records",
  )}`;
}

export default async function StudentQuestionAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    subject?: string;
    topic?: string;
    question_type?: string;
    source?: string;
    teacher?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    params.subject ??
      cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ??
      ALL_SUBJECTS_CONTEXT,
  );
  const selectedSource = resolveSelectedStudentSource(
    params.source ??
      cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ??
      ALL_SOURCES_CONTEXT,
  );
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Question analytics are not available yet"
          description="Sign in with your student account to load question-level analytics."
          bullets={["Student sign-in", "Question analytics", "Published results"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Sign in to continue"
        />
      </div>
    );
  }

  let data = null;
  const bundle = await loadStudentAnalyticsBundle();
  try {
    data = await fetchStudentQuestionAnalytics({
      subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
      topic: params.topic ?? null,
      question_type: params.question_type ?? null,
      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
      teacher: params.teacher ?? null,
    });
  } catch {
    data = null;
  }
  const { teacherOptions } = getStudentSourceOptions([
    ...bundle.results,
    ...bundle.exams,
    ...(bundle.summary?.source_breakdown ?? []),
    ...(bundle.summary?.recent_exams ?? []),
  ]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    params.teacher ??
      cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ??
      null,
  );

  const titleParts = [
    params.subject?.trim() || null,
    params.question_type ? questionTypeLabel(params.question_type) : null,
  ].filter(Boolean);
  const title = titleParts.length ? `${titleParts.join(" · ")} Question Analytics` : "Question Analytics";
  const wrongCount = data?.questions.filter((item) => item.your_result === "wrong").length ?? 0;
  const skippedCount = data?.questions.filter((item) => item.your_result === "skipped").length ?? 0;
  const averageTime = data?.questions.length
    ? Math.round(
        data.questions.reduce(
          (total, item) => total + item.your_time_spent_seconds,
          0,
        ) / data.questions.length,
      )
    : 0;
  const activeFilterCount = [
    selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
    params.topic,
    params.question_type,
    selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
    selectedTeacherId,
  ].filter(Boolean).length;
  const questionPatternRows: StudentQuestionPatternRow[] = (data?.questions ?? []).map((item) => {
    const resultToneClass =
      item.your_result === "correct"
        ? "statusLive"
        : item.your_result === "wrong"
          ? "statusDanger"
          : "statusWarning";
    const supportNote = item.attempted_by_you
      ? item.your_result === "correct"
        ? "This question is currently a stable point in your pattern."
        : `This question is costing marks in ${item.topic_name ?? "this topic"} and should be reviewed again.`
      : "This question was skipped and may indicate hesitation or timing pressure.";

    return {
      id: item.question_id,
      questionLabel: item.question_text_summary,
      subjectLabel: item.subject_name ?? "Unknown subject",
      topicLabel: item.topic_name ?? "Unmapped topic",
      typeLabel: questionTypeLabel(item.question_type),
      difficultyLabel: titleCaseState(item.difficulty_level.replace(/_/g, " ")),
      resultLabel: titleCaseState(item.your_result),
      resultToneClass,
      timeLabel: item.your_time_spent_seconds ? `${item.your_time_spent_seconds}s` : "N/A",
      benchmarkLabel: questionBenchmarkSignalLabel(item.school_benchmark),
      supportNote,
      explanation:
        item.explanation ||
        "Open the related drill-downs to compare this question pattern with the larger subject or topic trend.",
      subjectHref: item.subject_name
        ? buildAnalyticsSubjectHref(item.subject_name, {
            source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
            teacher: selectedTeacherId,
          })
        : null,
      topicHref: item.topic_id
        ? buildAnalyticsTopicHref({
          topicId: item.topic_id,
          subject:
            item.subject_name ??
            (selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject),
          source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
          teacher: selectedTeacherId,
        })
        : null,
      typeHref: buildAnalyticsQuestionTypeHref({
        questionType: item.question_type,
        subject:
          item.subject_name ??
          (selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject),
        source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
        teacher: selectedTeacherId,
      }),
    };
  });

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Question pattern report"
        title={titleParts.length ? `${titleParts.join(" · ")} Question Pattern Report` : "Question Pattern Report"}
        description="Review question-level academic patterns and see exactly where marks are being lost, skipped, or recovered."
        statusLabel={data ? `${data.questions.length} questions analyzed` : "Unable to load question analytics"}
        statusTone={data ? "live" : "demo"}
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      {!data ? (
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question analytics could not be loaded"
          description="We couldn't load question-level analytics right now."
          bullets={["Question analytics", "Published results", "Connection check"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Try again soon"
        />
      ) : (
        <>
          <StudentReportFilters
            basePath="/app/analytics/questions"
            title="Question report filters"
            helper="Refine the question table by subject and source before reading topic and format patterns."
            selectedSource={selectedSource}
            selectedSubject={selectedSubject}
            selectedTeacherId={selectedTeacherId}
            subjectOptions={subjectOptions}
            teacherOptions={teacherOptions}
          />

          <StudentAnalyticsDetailHero
            eyebrow="Question pattern report"
            title={params.question_type ? `${questionTypeLabel(params.question_type)} pattern` : "All tracked question patterns"}
            description={
              params.topic
                ? "This view is scoped to a topic and optional question type so you can confirm whether one pattern keeps costing marks."
                : "This view shows the question-level evidence behind the analytics summary, including outcomes, time spent, and peer benchmarks."
            }
            badges={[
              selectedSubject !== ALL_SUBJECTS_CONTEXT ? selectedSubject : "All subjects",
              selectedSource !== ALL_SOURCES_CONTEXT
                ? `Source · ${titleCaseState(selectedSource)}`
                : "All sources",
              params.topic ? "Topic scoped" : "All tracked topics",
            ]}
            stats={[
              {
                label: "Filters",
                value: String(activeFilterCount || 1),
              },
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
            ]}
            actions={
              <>
                <Link className="button buttonPrimary" href="/app/analytics">
                  Analytics Home
                </Link>
                <Link className="button buttonSecondary" href="/app/analytics/questions">
                  Reset Filters
                </Link>
              </>
            }
          />

          <StudentQuestionPatternReport
            rows={questionPatternRows}
            scopeLabel={
              params.topic
                ? `${questionPatternRows.length} questions in this topic slice`
                : `${questionPatternRows.length} questions in this report`
            }
          />

          <section className="contentCard">
            <div className="sectionHeading">
              <strong>Active Filters</strong>
              <Link href="/app/analytics/questions">Clear filters</Link>
            </div>
            <div className="studentInsightHeroActions">
              {params.subject ? (
                <Link
                  className="studentDashboardMiniBadge"
                  href={buildAnalyticsSubjectHref(selectedSubject, {
                    source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedTeacherId,
                  })}
                >
                  Subject: {selectedSubject}
                </Link>
              ) : null}
              {params.question_type ? (
                <Link
                  className="studentDashboardMiniBadge"
                  href={buildAnalyticsQuestionTypeHref({
                    questionType: params.question_type,
                    subject:
                      selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                    source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedTeacherId,
                  })}
                >
                  Type: {questionTypeLabel(params.question_type)}
                </Link>
              ) : null}
              {params.topic ? (
                <Link
                  className="studentDashboardMiniBadge"
                  href={buildAnalyticsTopicHref({
                    topicId: params.topic,
                    subject: params.subject ?? null,
                    source: params.source ?? null,
                    teacher: params.teacher ?? null,
                  })}
                >
                  Topic drill-down
                </Link>
              ) : null}
              {params.source ? (
                <span className="studentDashboardMiniBadge">
                  Source: {titleCaseState(params.source)}
                </span>
              ) : null}
              {params.teacher ? (
                <span className="studentDashboardMiniBadge">Teacher scoped</span>
              ) : null}
              {!activeFilterCount ? (
                <span className="studentDashboardMiniBadge">Overall question view</span>
              ) : null}
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Questions Tracked",
                value: String(data.overview.question_count),
                note: "Questions matching the current filters",
                tone: "primary",
              },
              {
                label: "Your Attempts",
                value: String(data.overview.attempted_count),
                note: `${data.overview.skipped_count} skipped`,
              },
              {
                label: "Correct Answers",
                value: String(data.overview.correct_count),
                note: `${data.overview.wrong_count} wrong`,
              },
              {
                label: "Benchmark Scopes",
                value: String(data.benchmark_overview.length),
                note: "Anonymous peer comparison groups",
              },
            ]}
          />

          <section className="studentInsightsTwoColumn">
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Benchmark snapshot</strong>
                <span>{data.benchmark_overview.length} scopes</span>
              </div>
              <div className="studentTopicStack">
                {data.benchmark_overview.length ? (
                  data.benchmark_overview.map((benchmark) => (
                    <div className="studentTopicRow" key={benchmark.scope}>
                    <div>
                      <strong>{benchmarkLabel(benchmark.label || benchmark.scope)}</strong>
                      <span>{peerRecordLabel(benchmark.participant_count, "results")}</span>
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

            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Use this page well</strong>
                <span>Recommended checks</span>
              </div>
              <div className="analyticsChecklist">
                <div className="analyticsChecklistItem">
                  <strong>Question accuracy</strong>
                  <span>Expand any item and make sure the summary, prompt, explanation, and benchmark rows match.</span>
                </div>
                <div className="analyticsChecklistItem">
                  <strong>Filter continuity</strong>
                  <span>Open subject, topic, and type views from a question and confirm the next page keeps the same context.</span>
                </div>
                <div className="analyticsChecklistItem">
                  <strong>First-screen quality</strong>
                  <span>Check that the first screen reads cleanly before opening any detail card.</span>
                </div>
              </div>
            </article>
          </section>

          <section className="contentCard">
            <div className="sectionHeading">
              <strong>Question Evidence Ledger</strong>
              <span>{data.questions.length} items</span>
            </div>
            <StudentQuestionInsightList
              questions={data.questions}
              subject={params.subject ?? null}
              source={params.source ?? null}
              teacher={params.teacher ?? null}
              currentView="questions"
              currentTopicId={params.topic ?? null}
              currentQuestionType={params.question_type ?? null}
            />
          </section>
        </>
      )}
    </div>
  );
}
