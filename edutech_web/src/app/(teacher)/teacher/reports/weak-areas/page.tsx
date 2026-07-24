import Link from "next/link";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { fetchTeacherInsightSummary } from "@/lib/api/teacher";

type WeakAreaRow = {
  id: string;
  subjectName: string;
  topicName: string;
  averagePercentage: number;
  attemptedQuestions: number;
  severity: "critical" | "high" | "watch";
};

function percentage(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${Math.round(numeric)}%`;
}

function severityLabel(value: number): WeakAreaRow["severity"] {
  if (value < 35) return "critical";
  if (value < 55) return "high";
  return "watch";
}

function severityTone(value: WeakAreaRow["severity"]) {
  if (value === "critical") return "statusWarning";
  if (value === "high") return "statusDemo";
  return "statusLive";
}

function severityText(value: WeakAreaRow["severity"]) {
  if (value === "critical") return "Critical";
  if (value === "high") return "High";
  return "Watch";
}

function buildWeakAreaRows(
  weakTopics: Awaited<ReturnType<typeof fetchTeacherInsightSummary>>["weak_topics"],
): WeakAreaRow[] {
  return weakTopics
    .map((topic, index) => {
      const averagePercentage = Number(topic.average_percentage);
      return {
        id: `${topic.subject_name}::${topic.topic_name ?? "untitled-topic"}::${index}`,
        subjectName: topic.subject_name,
        topicName: topic.topic_name ?? "Untitled topic",
        averagePercentage: Number.isFinite(averagePercentage) ? averagePercentage : 0,
        attemptedQuestions: topic.attempted_questions,
        severity: severityLabel(Number.isFinite(averagePercentage) ? averagePercentage : 0),
      };
    })
    .sort(
      (left, right) =>
        left.averagePercentage - right.averagePercentage ||
        right.attemptedQuestions - left.attemptedQuestions ||
        left.subjectName.localeCompare(right.subjectName),
    );
}

export default async function TeacherWeakAreasReportPage() {
  const summary = await fetchTeacherInsightSummary().catch(() => null);

  if (!summary) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
        <TeacherPageHeader
          title="Topic Mastery Report"
          description="Teacher-scoped weak-area reporting could not be loaded right now."
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

  const weakAreaRows = buildWeakAreaRows(summary.weak_topics);
  const criticalTopics = weakAreaRows.filter((row) => row.severity === "critical").length;
  const highestRiskTopic = weakAreaRows[0] ?? null;
  const subjectCoverage = new Set(weakAreaRows.map((row) => row.subjectName)).size;

  return (
    <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
      <TeacherPageHeader
        title="Topic Mastery Report"
        description="Teacher-scoped weak-topic and mastery visibility built from current student performance evidence."
        statusLabel={`${weakAreaRows.length} weak-topic rows`}
        statusTone="live"
        action={
          <Link className="button buttonGhost" href="/teacher/reports">
            Back to Reports
          </Link>
        }
      />

      <StudentAnalyticsDetailHero
        eyebrow="Teacher weak areas"
        title="Topic-level recovery priorities are now visible"
        description="Use this page to rank the weakest topics across your current teacher scope, see where academic recovery is most urgent, and connect topic-level issues back to the broader results and analysis workflows."
        badges={[
          "Teacher-scoped weak topics",
          "Topic-mastery first pass",
          "Recovery planning ready",
        ]}
        stats={[
          { label: "Weak topics", value: String(weakAreaRows.length) },
          { label: "Critical topics", value: String(criticalTopics) },
          { label: "Subjects affected", value: String(subjectCoverage) },
          { label: "High-risk students", value: String(summary.low_performing_students.length) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/teacher/results/analysis">
              Open Analysis
            </Link>
            <Link className="button buttonSecondary" href="/teacher/reports/subjects">
              Open Subject Report
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
            label: "Weak Topics",
            value: String(weakAreaRows.length),
            note: "Teacher-scoped topic recovery rows",
            tone: "primary",
          },
          {
            label: "Critical Topics",
            value: String(criticalTopics),
            note: "Topics under 35% average need immediate intervention",
          },
          {
            label: "Highest Risk Topic",
            value: highestRiskTopic ? highestRiskTopic.topicName : "N/A",
            note: highestRiskTopic ? `${highestRiskTopic.subjectName} · ${percentage(highestRiskTopic.averagePercentage)}` : "No topic risk yet",
          },
          {
            label: "Affected Subjects",
            value: String(subjectCoverage),
            note: "Subjects represented in the current weak-topic lane",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Weak-topic ranking</strong>
            <span>{weakAreaRows.length} topic{weakAreaRows.length === 1 ? "" : "s"}</span>
          </div>
          {weakAreaRows.length ? (
            <div className="studentResultsTableWrap">
              <table className="studentResultsTable">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Subject</th>
                    <th>Average</th>
                    <th>Attempted</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {weakAreaRows.map((row) => (
                    <tr className="studentResultsTableRow" key={row.id}>
                      <td>
                        <strong>{row.topicName}</strong>
                      </td>
                      <td>{row.subjectName}</td>
                      <td>{percentage(row.averagePercentage)}</td>
                      <td>{row.attemptedQuestions}</td>
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
            <p className="emptyText">Weak-topic rows will appear once teacher-scoped topic evidence is available.</p>
          )}
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recovery action lane</strong>
            <span>What to do next</span>
          </div>
          <div className="studentInsightMessageStack">
            {highestRiskTopic ? (
              <>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Start here</strong>
                    {" · "}
                    {highestRiskTopic.topicName} in {highestRiskTopic.subjectName} is the current highest-risk topic at{" "}
                    {percentage(highestRiskTopic.averagePercentage)} average.
                  </p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Then compare</strong>
                    {" · "}
                    Open the subject report to see whether this topic is part of a wider subject-level decline.
                  </p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>
                    <strong>Then investigate</strong>
                    {" · "}
                    Open analysis to inspect question-risk patterns and skipped-question concentration for the same weak area.
                  </p>
                </div>
              </>
            ) : (
              <p className="emptyText">Recovery guidance will appear once a weak-topic stack is available.</p>
            )}
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Students needing support</strong>
            <span>{summary.low_performing_students.length}</span>
          </div>
          <div className="studentInsightMessageStack">
            {summary.low_performing_students.slice(0, 6).map((student) => (
              <div className="studentInsightMessage" key={`weak-low-${student.student_id}`}>
                <span className="placeholderDot" aria-hidden="true" />
                <p>
                  <Link href={`/teacher/reports/students/${student.student_id}?from=weak-areas`}>
                    <strong>{student.student_name}</strong>
                  </Link>
                  {" · "}
                  {student.admission_no}
                  {" · "}
                  {percentage(student.average_percentage)} average
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Most wrong questions</strong>
            <span>{summary.most_wrong_questions.length}</span>
          </div>
          <div className="studentInsightMessageStack">
            {summary.most_wrong_questions.slice(0, 6).map((question) => (
              <div className="studentInsightMessage" key={`wrong-${question.question_id}`}>
                <span className="placeholderDot" aria-hidden="true" />
                <p>
                  <strong>{question.subject_name ?? "Unknown subject"}</strong>
                  {" · "}
                  {question.topic_name ?? "Untitled topic"}
                  {" · "}
                  {question.wrong_count} wrong from {question.total_attempts} attempts
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
