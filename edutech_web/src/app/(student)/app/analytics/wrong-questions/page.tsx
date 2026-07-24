import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  StudentWrongQuestionsReport,
  type StudentWrongQuestionRow,
} from "@/components/ui/student-wrong-questions-report";
import { fetchStudentQuestionAnalytics, getStudentApiState } from "@/lib/api/student";
import {
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTimelineHref,
  buildAnalyticsTopicHref,
  buildQuestionAnalyticsHref,
  loadStudentAnalyticsBundle,
} from "@/lib/student/analytics";
import {
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

export default async function StudentWrongQuestionsPage({
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
          title="Wrong questions report is not available yet"
          description="Sign in with your student account to load mistake-focused academic reporting."
          bullets={["Student sign-in", "Wrong question evidence", "Published results"]}
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

  const wrongQuestions = (data?.questions ?? []).filter((item) => item.your_result === "wrong");
  const averageTime = wrongQuestions.length
    ? Math.round(
        wrongQuestions.reduce((total, item) => total + item.your_time_spent_seconds, 0) /
          wrongQuestions.length,
      )
    : 0;
  const activeFilterCount = [
    selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
    params.topic,
    params.question_type,
    selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
    selectedTeacherId,
  ].filter(Boolean).length;

  const rows: StudentWrongQuestionRow[] = wrongQuestions.map((item) => ({
    id: item.question_id,
    questionLabel: item.question_text_summary,
    subjectLabel: item.subject_name ?? "Unknown subject",
    topicLabel: item.topic_name ?? "Unmapped topic",
    typeLabel: questionTypeLabel(item.question_type),
    difficultyLabel: titleCaseState(item.difficulty_level.replace(/_/g, " ")),
    timeLabel: item.your_time_spent_seconds ? `${item.your_time_spent_seconds}s` : "N/A",
    benchmarkLabel: questionBenchmarkSignalLabel(item.school_benchmark),
    supportNote: `This question cost marks in ${item.topic_name ?? "this topic"} and should be reviewed before repeating the same pattern.`,
    recoveryNote:
      item.your_time_spent_seconds > averageTime && averageTime > 0
        ? "You spent longer than your current wrong-answer average here, so revisit both method and pacing."
        : "Review the concept and retry a similar format quickly so the error does not harden into a pattern.",
    explanation:
      item.explanation ||
      "Use the subject, topic, and question-type drilldowns to check whether this mistake is isolated or recurring.",
    subjectHref: item.subject_name
      ? buildAnalyticsSubjectHref(item.subject_name, {
          source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
          teacher: selectedTeacherId,
        })
      : null,
    topicHref: item.topic_id
      ? buildAnalyticsTopicHref({
          topicId: item.topic_id,
          subject: item.subject_name ?? (selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject),
          source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
          teacher: selectedTeacherId,
        })
      : null,
    typeHref: buildAnalyticsQuestionTypeHref({
      questionType: item.question_type,
      subject: item.subject_name ?? (selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject),
      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
      teacher: selectedTeacherId,
    }),
  }));

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Wrong questions report"
        title="Wrong Questions Report"
        description="Open the exact questions that are costing marks and recover them through subject, topic, and format drilldowns."
        statusLabel={
          data
            ? `${rows.length} wrong questions tracked`
            : "Unable to load wrong-question analytics"
        }
        statusTone={data ? "warning" : "demo"}
        action={
          <Link className="button buttonGhost" href="/app/analytics">
            Back to Analytics
          </Link>
        }
      />

      {!data ? (
        <StudentStatePanel
          eyebrow="Load issue"
          title="Wrong questions report could not be loaded"
          description="We couldn't load wrong-question evidence right now."
          bullets={["Question analytics", "Wrong answers", "Connection check"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Try again soon"
        />
      ) : (
        <>
          <StudentReportFilters
            basePath="/app/analytics/wrong-questions"
            title="Wrong question filters"
            helper="Keep this report scoped to the right subject and source before drilling into topic or format patterns."
            selectedSource={selectedSource}
            selectedSubject={selectedSubject}
            selectedTeacherId={selectedTeacherId}
            subjectOptions={subjectOptions}
            teacherOptions={teacherOptions}
          />

          <StudentAnalyticsDetailHero
            eyebrow="Wrong questions report"
            title={
              selectedSubject !== ALL_SUBJECTS_CONTEXT
                ? `${selectedSubject} wrong answers`
                : "All tracked wrong answers"
            }
            description={
              params.topic
                ? "This report is scoped to a topic slice so you can isolate the questions that are still costing marks there."
                : "This report isolates every tracked wrong-answer question so you can recover concept gaps faster than scanning every question outcome."
            }
            badges={[
              selectedSubject !== ALL_SUBJECTS_CONTEXT ? selectedSubject : "All subjects",
              selectedSource !== ALL_SOURCES_CONTEXT
                ? `Source · ${titleCaseState(selectedSource)}`
                : "All sources",
              params.question_type
                ? questionTypeLabel(params.question_type)
                : "All question types",
            ]}
            stats={[
              { label: "Wrong questions", value: String(rows.length) },
              { label: "Filters", value: String(activeFilterCount || 1) },
              { label: "Avg time", value: `${averageTime}s` },
              {
                label: "Topics involved",
                value: String(new Set(rows.map((row) => row.topicLabel)).size),
              },
            ]}
            actions={
              <>
                <Link className="button buttonPrimary" href="/app/analytics">
                  Analytics Home
                </Link>
                <Link
                  className="button buttonSecondary"
                  href={buildQuestionAnalyticsHref({
                    subject:
                      selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                    topic: params.topic ?? null,
                    questionType: params.question_type ?? null,
                    source:
                      selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedTeacherId,
                  })}
                >
                  Open Full Question Table
                </Link>
              </>
            }
          />

          <StudentKpiGrid
            items={[
              {
                label: "Wrong Questions",
                value: String(rows.length),
                note: "Questions currently costing marks",
                tone: "primary",
              },
              {
                label: "Average Time",
                value: `${averageTime}s`,
                note: "Time spent on wrong-answer questions",
              },
              {
                label: "Topic Scope",
                value: String(new Set(rows.map((row) => row.topicLabel)).size),
                note: "Distinct topics involved in this error pattern",
              },
              {
                label: "Format Scope",
                value: String(new Set(rows.map((row) => row.typeLabel)).size),
                note: "Question types represented in this report",
              },
            ]}
          />

          <StudentWrongQuestionsReport
            rows={rows}
            scopeLabel={
              params.topic
                ? `${rows.length} wrong questions in this topic slice`
                : `${rows.length} wrong questions in this report`
            }
          />

          <section className="studentInsightsTwoColumn">
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Use this report well</strong>
                <span>Recovery flow</span>
              </div>
              <div className="analyticsChecklist">
                <div className="analyticsChecklistItem">
                  <strong>Open the row modal first</strong>
                  <span>
                    Review what went wrong, the timing, and the topic before opening a
                    broader drilldown.
                  </span>
                </div>
                <div className="analyticsChecklistItem">
                  <strong>Check repeat patterns</strong>
                  <span>
                    Use topic and type drilldowns to confirm whether the same concept or
                    format keeps repeating.
                  </span>
                </div>
                <div className="analyticsChecklistItem">
                  <strong>Compare with your timeline</strong>
                  <span>
                    Use the timeline view to decide whether this is a current dip or a
                    longer-running weakness.
                  </span>
                </div>
              </div>
            </article>

            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Related report links</strong>
                <span>Next academic moves</span>
              </div>
              <div className="studentInsightHeroActions">
                <Link
                  className="button buttonPrimary"
                  href={buildAnalyticsTimelineHref({
                    subject:
                      selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                    source:
                      selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedTeacherId,
                  })}
                >
                  Open Improvement Timeline
                </Link>
                <Link className="button buttonSecondary" href="/app/weak-areas">
                  Open Topic Mastery
                </Link>
                <Link className="button buttonGhost" href="/app/practice">
                  Open Practice Report
                </Link>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
