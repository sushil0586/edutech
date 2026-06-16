import Link from "next/link";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import {
  fetchTeacherExams,
  fetchTeacherInsightSummary,
  getTeacherApiState,
} from "@/lib/api/teacher";

function percentage(value: string) {
  return `${Math.round(Number(value))}%`;
}

function formatDuration(seconds: number) {
  if (!seconds) return "0m";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

async function loadTeacherDashboard() {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      exams: [],
      summary: null,
    };
  }

  try {
    const [summary, exams] = await Promise.all([
      fetchTeacherInsightSummary(),
      fetchTeacherExams(),
    ]);

    return {
      source: "live" as const,
      exams,
      summary,
    };
  } catch {
    return {
      source: "error" as const,
      exams: [],
      summary: null,
    };
  }
}

export default async function TeacherDashboardPage() {
  const { source, exams, summary } = await loadTeacherDashboard();

  return (
    <div className="studentPage studentDashboardModern">
      <TeacherPageHeader
        title="Delivery Dashboard"
        description="Track the current exam pipeline, student attempt activity, and weak learning signals from your scoped backend data."
        statusLabel={
          source === "live"
            ? `${exams.length} exams in scope`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load teacher data"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {!summary ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for teacher insights"
              : "Teacher workspace could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active teacher account to load exam delivery and analytics data."
              : "The teacher dashboard depends on live exam and insight endpoints, and the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Teacher insights summary endpoint", "Teacher exams endpoint"]
              : ["Backend connectivity", "Teacher-scoped exam endpoints"]
          }
          ctaHref="/login"
          ctaLabel="Back to Login"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Teaching Overview</span>
              <strong>Keep delivery, outcomes, and intervention signals in one workspace</strong>
              <p>
                This dashboard stays connected to your teacher-scoped backend data so exam movement,
                weak learning patterns, and performance trends remain visible without switching tools.
              </p>
              <small>
                {summary.overview.tracked_exams} tracked exams · {summary.overview.total_attempts} learner attempts
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/teacher/exams">
                Open Exams
              </Link>
              <Link className="button buttonSecondary" href="/teacher/results">
                Open Results
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Tracked Exams</span>
              <strong>{summary.overview.tracked_exams}</strong>
              <small>{summary.exam_overview.length} recent exam summaries available</small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Total Attempts</span>
              <strong>{summary.overview.total_attempts}</strong>
              <small>{percentage(summary.overview.accuracy_percentage)} overall answer accuracy</small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Average Score</span>
              <strong>{percentage(summary.overview.average_percentage)}</strong>
              <small>{formatDuration(summary.overview.average_time_taken_seconds)} average completion time</small>
            </article>
          </section>

          <section className="dashboardGrid">
            <article className="dashboardPanel">
              <div className="sectionHeading">
                <strong>Exam Delivery Snapshot</strong>
                <Link href="/teacher/exams">Open exams</Link>
              </div>
              <div className="weakTopicStack">
                {summary.exam_overview.length ? (
                  summary.exam_overview.map((exam) => (
                    <div className="weakTopicRow" key={exam.exam_id}>
                      <div>
                        <strong>{exam.exam_title}</strong>
                        <span>{exam.exam_code}</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentage(exam.average_percentage)}</strong>
                        <span>{exam.total_attempted} attempts</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Teacher exam summaries will appear here after exam activity is recorded.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Weak Topics Across Learners</strong>
                <span>{summary.weak_topics.length} tracked</span>
              </div>
              <div className="weakTopicStack">
                {summary.weak_topics.length ? (
                  summary.weak_topics.map((topic) => (
                    <div className="weakTopicRow" key={`${topic.subject_name}-${topic.topic_name ?? "none"}`}>
                      <div>
                        <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                        <span>{topic.subject_name}</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentage(topic.average_percentage)}</strong>
                        <span>{topic.attempted_questions} questions attempted</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Weak topic signals will appear after students submit attempts.</p>
                )}
              </div>
            </article>
          </section>

          <section className="dashboardLowerGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Top Performing Students</strong>
                <span>{summary.high_performing_students.length} ranked</span>
              </div>
              <div className="weakTopicStack">
                {summary.high_performing_students.length ? (
                  summary.high_performing_students.map((student) => (
                    <div className="weakTopicRow" key={student.student_id}>
                      <div>
                        <strong>{student.student_name}</strong>
                        <span>{student.admission_no}</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentage(student.average_percentage)}</strong>
                        <span>Average result</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">High-performing students will be ranked once result summaries are available.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Most Wrong Questions</strong>
                <span>{summary.most_wrong_questions.length} tracked</span>
              </div>
              <div className="weakTopicStack">
                {summary.most_wrong_questions.length ? (
                  summary.most_wrong_questions.map((question) => (
                    <div className="weakTopicRow" key={question.question_id}>
                      <div>
                        <strong>{question.question_text_summary}</strong>
                        <span>
                          {question.subject_name ?? "Unknown subject"}
                          {question.topic_name ? ` · ${question.topic_name}` : ""}
                        </span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{question.wrong_count}</strong>
                        <span>{question.total_attempts} total attempts</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Question-level performance will appear here after learner attempts accumulate.</p>
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
