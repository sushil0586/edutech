import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { fetchTeacherInsightSummary } from "@/lib/api/teacher";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function percentage(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${Math.round(numeric)}%`;
}

function reportLabel(report: string) {
  switch (report) {
    case "subjects":
      return "Subject performance";
    case "weak-areas":
      return "Topic mastery";
    case "wrong-questions":
      return "Wrong questions";
    case "time-management":
      return "Time management";
    case "study-recommendations":
      return "Study recommendations";
    default:
      return "Teacher reports";
  }
}

function reportHref(report: string) {
  if (
    report === "subjects" ||
    report === "weak-areas" ||
    report === "wrong-questions" ||
    report === "time-management" ||
    report === "study-recommendations"
  ) {
    return `/teacher/reports/${report}`;
  }
  return "/teacher/reports";
}

export default async function TeacherStudentReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: SearchParams;
}) {
  const [{ studentId }, resolvedSearchParams, summary] = await Promise.all([
    params,
    searchParams,
    fetchTeacherInsightSummary().catch(() => null),
  ]);

  if (!summary) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
        <TeacherPageHeader
          title="Student Report Detail"
          description="Teacher-scoped learner report detail could not be loaded right now."
          statusLabel="Report unavailable"
          statusTone="warning"
          action={
            <Link className="button buttonGhost" href="/teacher/reports">
              Back to Reports
            </Link>
          }
        />
      </section>
    );
  }

  const sourceReport = readSingle(resolvedSearchParams.from) ?? "hub";
  const supportStudent = summary.low_performing_students.find((student) => student.student_id === studentId) ?? null;
  const strongStudent = summary.high_performing_students.find((student) => student.student_id === studentId) ?? null;
  const student = supportStudent ?? strongStudent;

  if (!student) {
    notFound();
  }

  const studentAverage = Number(student.average_percentage);
  const priority =
    supportStudent ? (studentAverage < 45 ? "Urgent support" : "Watch closely") : "Strong trajectory";
  const topWeakTopic = summary.weak_topics[0] ?? null;
  const topWrongQuestion = summary.most_wrong_questions[0] ?? null;
  const topSkippedQuestion = summary.most_skipped_questions[0] ?? null;
  const currentExam = summary.exam_overview[0] ?? null;

  return (
    <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
      <TeacherPageHeader
        title="Student Report Detail"
        description="Teacher-side learner drilldown built from current insight summary signals."
        statusLabel={`${student.student_name} · ${priority}`}
        statusTone={supportStudent ? "warning" : "live"}
        action={
          <Link className="button buttonGhost" href={reportHref(sourceReport)}>
            Back to {reportLabel(sourceReport)}
          </Link>
        }
      />

      <StudentAnalyticsDetailHero
        eyebrow="Teacher learner drilldown"
        title={student.student_name}
        description={`Use this learner view to consolidate the current academic support signal, the leading weak-topic pressure, and the best next teacher handoffs for ${student.student_name}.`}
        badges={[
          `Admission ${student.admission_no}`,
          supportStudent ? "Support lane" : "High performer lane",
          `${reportLabel(sourceReport)} source`,
        ]}
        stats={[
          { label: "Average score", value: percentage(student.average_percentage) },
          { label: "Priority", value: priority },
          { label: "Weak topics tracked", value: String(summary.weak_topics.length) },
          { label: "Wrong questions tracked", value: String(summary.most_wrong_questions.length) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/teacher/results">
              Open Results
            </Link>
            <Link className="button buttonSecondary" href="/teacher/results/analysis">
              Open Analysis
            </Link>
            <Link className="button buttonGhost" href="/teacher/results/attempts">
              Open Attempt Review
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Support status",
            value: supportStudent ? "Needs support" : "Doing well",
            note: supportStudent
              ? "Visible in the low-performance teacher lane"
              : "Visible in the high-performance teacher lane",
            tone: supportStudent ? "default" : "primary",
          },
          {
            label: "Top weak topic",
            value: topWeakTopic?.topic_name ?? topWeakTopic?.subject_name ?? "N/A",
            note: topWeakTopic ? `${percentage(topWeakTopic.average_percentage)} average` : "No topic pressure signal yet",
          },
          {
            label: "Top wrong question",
            value: topWrongQuestion?.subject_name ?? "N/A",
            note: topWrongQuestion?.topic_name ?? "No wrong-question concentration yet",
          },
          {
            label: "Current exam lens",
            value: currentExam?.exam_code ?? "N/A",
            note: currentExam ? currentExam.exam_title : "No exam overview signal yet",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Teacher interpretation</strong>
            <span>What this means now</span>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                <strong>{student.student_name}</strong>
                {" · "}
                {student.admission_no}
                {" · "}
                currently sits at {percentage(student.average_percentage)} average.
              </p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                <strong>Topic focus</strong>
                {" · "}
                {topWeakTopic
                  ? `${topWeakTopic.subject_name} / ${topWeakTopic.topic_name ?? "Topic recovery"} is the strongest current teacher insight signal.`
                  : "The weak-topic stack has not populated yet for this teacher scope."}
              </p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                <strong>Question evidence</strong>
                {" · "}
                {topWrongQuestion
                  ? `${topWrongQuestion.subject_name ?? "General"} / ${topWrongQuestion.topic_name ?? "Untitled topic"} is currently the leading wrong-answer pressure lane.`
                  : "No wrong-question concentration is available yet in this teacher scope."}
              </p>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recommended handoffs</strong>
            <span>Teacher next steps</span>
          </div>
          <div className="analyticsChecklist">
            <div className="analyticsChecklistItem">
              <strong>Open results overview</strong>
              <span>Use the results workspace for current release posture, ranking, and exam-level evidence.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Open analysis</strong>
              <span>Use analysis when you want question risk, distractor pressure, and topic-level patterns.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Open attempt review</strong>
              <span>Use attempt review to connect pacing, skipped answers, and support actions before intervention.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Current exam context</strong>
            <span>{currentExam?.exam_code ?? "No active exam lens"}</span>
          </div>
          <div className="studentInsightMessageStack">
            {currentExam ? (
              <>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>{currentExam.exam_title}</strong>
                    {" · "}
                    {currentExam.total_attempted} attempted
                    {" · "}
                    {percentage(currentExam.average_percentage)} average
                  </p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Score band lens</strong>
                    {" · "}
                    Highest score {currentExam.highest_score} and lowest score {currentExam.lowest_score} in the current teacher-visible exam cycle.
                  </p>
                </div>
              </>
            ) : (
              <p className="emptyText">Exam context will appear once the teacher insight summary includes an active results cycle.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Support cues</strong>
            <span>Quick coaching notes</span>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                <strong>Wrong-question lane</strong>
                {" · "}
                {topWrongQuestion
                  ? `${topWrongQuestion.question_text_summary}`
                  : "No wrong-question evidence available yet."}
              </p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                <strong>Skip pattern lane</strong>
                {" · "}
                {topSkippedQuestion
                  ? `${topSkippedQuestion.question_text_summary}`
                  : "No skipped-question evidence available yet."}
              </p>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
