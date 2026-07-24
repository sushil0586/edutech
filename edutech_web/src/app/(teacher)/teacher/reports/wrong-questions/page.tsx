import Link from "next/link";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { fetchTeacherInsightSummary } from "@/lib/api/teacher";

type WrongQuestionRow = {
  id: string;
  subjectName: string;
  topicName: string;
  questionText: string;
  wrongCount: number;
  totalAttempts: number;
  wrongRate: number;
  severity: "critical" | "high" | "watch";
};

type SkippedQuestionRow = {
  id: string;
  subjectName: string;
  topicName: string;
  questionText: string;
  skippedCount: number;
  totalAttempts: number;
  skippedRate: number;
};

function percentage(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${Math.round(value)}%`;
}

function severityFromWrongRate(rate: number): WrongQuestionRow["severity"] {
  if (rate >= 70) return "critical";
  if (rate >= 45) return "high";
  return "watch";
}

function severityTone(value: WrongQuestionRow["severity"]) {
  if (value === "critical") return "statusWarning";
  if (value === "high") return "statusDemo";
  return "statusLive";
}

function severityText(value: WrongQuestionRow["severity"]) {
  if (value === "critical") return "Critical";
  if (value === "high") return "High";
  return "Watch";
}

function buildWrongRows(
  questions: Awaited<ReturnType<typeof fetchTeacherInsightSummary>>["most_wrong_questions"],
): WrongQuestionRow[] {
  return questions
    .map((question) => {
      const wrongRate =
        question.total_attempts > 0 ? (question.wrong_count / question.total_attempts) * 100 : 0;
      return {
        id: question.question_id,
        subjectName: question.subject_name ?? "Unknown subject",
        topicName: question.topic_name ?? "Untitled topic",
        questionText: question.question_text_summary,
        wrongCount: question.wrong_count,
        totalAttempts: question.total_attempts,
        wrongRate,
        severity: severityFromWrongRate(wrongRate),
      };
    })
    .sort((left, right) => right.wrongRate - left.wrongRate || right.wrongCount - left.wrongCount);
}

function buildSkippedRows(
  questions: Awaited<ReturnType<typeof fetchTeacherInsightSummary>>["most_skipped_questions"],
): SkippedQuestionRow[] {
  return questions
    .map((question) => {
      const skippedRate =
        question.total_attempts > 0 ? (question.skipped_count / question.total_attempts) * 100 : 0;
      return {
        id: question.question_id,
        subjectName: question.subject_name ?? "Unknown subject",
        topicName: question.topic_name ?? "Untitled topic",
        questionText: question.question_text_summary,
        skippedCount: question.skipped_count,
        totalAttempts: question.total_attempts,
        skippedRate,
      };
    })
    .sort((left, right) => right.skippedRate - left.skippedRate || right.skippedCount - left.skippedCount);
}

export default async function TeacherWrongQuestionsReportPage() {
  const summary = await fetchTeacherInsightSummary().catch(() => null);

  if (!summary) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
        <TeacherPageHeader
          title="Wrong Questions Report"
          description="Teacher-scoped wrong-question reporting could not be loaded right now."
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

  const wrongRows = buildWrongRows(summary.most_wrong_questions);
  const skippedRows = buildSkippedRows(summary.most_skipped_questions);
  const criticalWrongQuestions = wrongRows.filter((row) => row.severity === "critical").length;
  const topWrongQuestion = wrongRows[0] ?? null;
  const topSkippedQuestion = skippedRows[0] ?? null;

  return (
    <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
      <TeacherPageHeader
        title="Wrong Questions Report"
        description="Teacher-scoped mistake recovery view for the most-missed and most-skipped questions."
        statusLabel={`${wrongRows.length} wrong-question rows`}
        statusTone="live"
        action={
          <Link className="button buttonGhost" href="/teacher/reports">
            Back to Reports
          </Link>
        }
      />

      <StudentAnalyticsDetailHero
        eyebrow="Teacher wrong questions"
        title="Mistake recovery priorities are now visible"
        description="Use this report to identify which question patterns are breaking most often, where skipping is concentrated, and which students should be pulled into immediate review or remedial follow-up."
        badges={[
          "Teacher-scoped mistake signals",
          "Wrong and skipped question lanes",
          "Recovery-first reporting",
        ]}
        stats={[
          { label: "Wrong rows", value: String(wrongRows.length) },
          { label: "Critical questions", value: String(criticalWrongQuestions) },
          { label: "Skipped rows", value: String(skippedRows.length) },
          { label: "Support students", value: String(summary.low_performing_students.length) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/teacher/results/analysis">
              Open Analysis
            </Link>
            <Link className="button buttonSecondary" href="/teacher/reports/weak-areas">
              Open Topic Mastery
            </Link>
            <Link className="button buttonGhost" href="/teacher/reports">
              Open Reports Hub
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Wrong Questions",
            value: String(wrongRows.length),
            note: "Teacher-scoped high-miss question rows",
            tone: "primary",
          },
          {
            label: "Critical Wrong",
            value: String(criticalWrongQuestions),
            note: "Questions with the highest wrong-answer pressure",
          },
          {
            label: "Top Wrong Question",
            value: topWrongQuestion ? topWrongQuestion.subjectName : "N/A",
            note: topWrongQuestion ? `${percentage(topWrongQuestion.wrongRate)} wrong · ${topWrongQuestion.topicName}` : "No wrong-question pressure yet",
          },
          {
            label: "Top Skipped Question",
            value: topSkippedQuestion ? topSkippedQuestion.subjectName : "N/A",
            note: topSkippedQuestion ? `${percentage(topSkippedQuestion.skippedRate)} skipped · ${topSkippedQuestion.topicName}` : "No skipped-question pressure yet",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Most wrong questions</strong>
            <span>{wrongRows.length} question{wrongRows.length === 1 ? "" : "s"}</span>
          </div>
          {wrongRows.length ? (
            <div className="studentResultsTableWrap">
              <table className="studentResultsTable">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Subject</th>
                    <th>Topic</th>
                    <th>Wrong</th>
                    <th>Attempts</th>
                    <th>Wrong Rate</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {wrongRows.map((row) => (
                    <tr className="studentResultsTableRow" key={row.id}>
                      <td>
                        <strong>{row.questionText}</strong>
                      </td>
                      <td>{row.subjectName}</td>
                      <td>{row.topicName}</td>
                      <td>{row.wrongCount}</td>
                      <td>{row.totalAttempts}</td>
                      <td>{percentage(row.wrongRate)}</td>
                      <td>
                        <span className={`statusPill ${severityTone(row.severity)}`}>
                          {severityText(row.severity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="emptyText">Wrong-question rows will appear once enough teacher-scoped answer evidence exists.</p>
          )}
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Most skipped questions</strong>
            <span>{skippedRows.length} question{skippedRows.length === 1 ? "" : "s"}</span>
          </div>
          {skippedRows.length ? (
            <div className="studentResultsTableWrap">
              <table className="studentResultsTable">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Subject</th>
                    <th>Topic</th>
                    <th>Skipped</th>
                    <th>Attempts</th>
                    <th>Skip Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {skippedRows.map((row) => (
                    <tr className="studentResultsTableRow" key={row.id}>
                      <td>
                        <strong>{row.questionText}</strong>
                      </td>
                      <td>{row.subjectName}</td>
                      <td>{row.topicName}</td>
                      <td>{row.skippedCount}</td>
                      <td>{row.totalAttempts}</td>
                      <td>{percentage(row.skippedRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="emptyText">Skipped-question rows will appear once teacher-scoped timing and answer patterns are available.</p>
          )}
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recovery action lane</strong>
            <span>Recommended next moves</span>
          </div>
          <div className="studentInsightMessageStack">
            {topWrongQuestion ? (
              <>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Start here</strong>
                    {" · "}
                    {topWrongQuestion.subjectName} / {topWrongQuestion.topicName} is the strongest wrong-answer concentration at{" "}
                    {percentage(topWrongQuestion.wrongRate)} wrong.
                  </p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Then compare</strong>
                    {" · "}
                    Open topic mastery to check whether the same question issue is part of a wider topic decline.
                  </p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Then intervene</strong>
                    {" · "}
                    Use analysis to inspect question-risk patterns before assigning revision, re-teaching, or review.
                  </p>
                </div>
              </>
            ) : (
              <p className="emptyText">Recovery guidance will appear once a wrong-question stack is available.</p>
            )}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Students needing support</strong>
            <span>{summary.low_performing_students.length}</span>
          </div>
          <div className="studentInsightMessageStack">
            {summary.low_performing_students.slice(0, 6).map((student) => (
              <div className="studentInsightMessage" key={`wrong-low-${student.student_id}`}>
                <span className="placeholderDot" aria-hidden="true" />
                <p>
                  <Link href={`/teacher/reports/students/${student.student_id}?from=wrong-questions`}>
                    <strong>{student.student_name}</strong>
                  </Link>
                  {" · "}
                  {student.admission_no}
                  {" · "}
                  {student.average_percentage}% average
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
