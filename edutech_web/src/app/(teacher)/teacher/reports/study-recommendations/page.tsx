import Link from "next/link";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { fetchTeacherInsightSummary } from "@/lib/api/teacher";

type RecommendationRow = {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  focusArea: string;
  supportNote: string;
  priority: "urgent" | "watch" | "steady";
};

function percentage(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${Math.round(numeric)}%`;
}

function priorityTone(priority: RecommendationRow["priority"]) {
  if (priority === "urgent") return "statusWarning";
  if (priority === "watch") return "statusDemo";
  return "statusLive";
}

function priorityLabel(priority: RecommendationRow["priority"]) {
  if (priority === "urgent") return "Urgent";
  if (priority === "watch") return "Watch";
  return "Steady";
}

export default async function TeacherStudyRecommendationsReportPage() {
  const summary = await fetchTeacherInsightSummary().catch(() => null);

  if (!summary) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
        <TeacherPageHeader
          title="Study Recommendations Report"
          description="Teacher-scoped study recommendations could not be loaded right now."
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

  const topWeakTopic = summary.weak_topics[0] ?? null;
  const topWrongQuestion = summary.most_wrong_questions[0] ?? null;
  const rows: RecommendationRow[] = summary.low_performing_students.map((student, index) => {
    const average = Number(student.average_percentage);
    const priority: RecommendationRow["priority"] =
      average < 45 ? "urgent" : average < 60 ? "watch" : "steady";
    const focusArea = topWeakTopic
      ? `${topWeakTopic.subject_name} · ${topWeakTopic.topic_name ?? "Topic recovery"}`
      : topWrongQuestion
        ? `${topWrongQuestion.subject_name ?? "General"} · Wrong-question recovery`
        : "General academic recovery";

    return {
      id: `${student.student_id}-${index}`,
      studentId: student.student_id,
      studentName: student.student_name,
      admissionNo: student.admission_no,
      focusArea,
      supportNote: topWeakTopic
        ? `${topWeakTopic.topic_name ?? "This topic"} is averaging ${percentage(topWeakTopic.average_percentage)} and should be part of the next intervention lane.`
        : "Use wrong-question and timing reports to refine the next intervention lane.",
      priority,
    };
  });

  const urgentCount = rows.filter((row) => row.priority === "urgent").length;
  const watchCount = rows.filter((row) => row.priority === "watch").length;

  return (
    <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
      <TeacherPageHeader
        title="Study Recommendations Report"
        description="Teacher-scoped next-step coaching guidance built from low-performance, weak-topic, and wrong-question evidence."
        statusLabel={`${rows.length} student recommendation rows`}
        statusTone="live"
        action={
          <Link className="button buttonGhost" href="/teacher/reports">
            Back to Reports
          </Link>
        }
      />

      <StudentAnalyticsDetailHero
        eyebrow="Teacher study recommendations"
        title={topWeakTopic ? `Coach ${topWeakTopic.topic_name ?? topWeakTopic.subject_name} next` : "Teacher coaching cues are ready"}
        description="This report turns teacher insight signals into student-facing coaching priorities. Use it to decide who needs urgent remediation, which topic should lead the next study plan, and where to hand off into wrong-question or timing follow-up."
        badges={[
          topWeakTopic ? `${topWeakTopic.subject_name} focus` : "Topic focus pending",
          topWrongQuestion ? "Wrong-question recovery" : "Recovery lane pending",
          "Student-level teacher coaching",
        ]}
        stats={[
          { label: "Recommendation rows", value: String(rows.length) },
          { label: "Urgent", value: String(urgentCount) },
          { label: "Watch", value: String(watchCount) },
          { label: "Weak topics", value: String(summary.weak_topics.length) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/teacher/reports/wrong-questions">
              Open Wrong Questions
            </Link>
            <Link className="button buttonSecondary" href="/teacher/reports/time-management">
              Open Time Management
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
            label: "Support Students",
            value: String(rows.length),
            note: "Teacher low-performance coaching lane",
            tone: "primary",
          },
          {
            label: "Urgent Support",
            value: String(urgentCount),
            note: "Students needing immediate recovery planning",
          },
          {
            label: "Top Weak Topic",
            value: topWeakTopic?.topic_name ?? topWeakTopic?.subject_name ?? "N/A",
            note: topWeakTopic ? `${percentage(topWeakTopic.average_percentage)} average` : "Weak-topic feed not available",
          },
          {
            label: "Top Wrong Question",
            value: topWrongQuestion?.subject_name ?? "N/A",
            note: topWrongQuestion ? topWrongQuestion.question_text_summary : "Wrong-question pressure not available",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recommendation board</strong>
            <span>{rows.length} student{rows.length === 1 ? "" : "s"}</span>
          </div>
          {rows.length ? (
            <div className="studentResultsTableWrap">
              <table className="studentResultsTable">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Focus Area</th>
                    <th>Priority</th>
                    <th>Support Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr className="studentResultsTableRow" key={row.id}>
                      <td>
                        <Link href={`/teacher/reports/students/${row.studentId}?from=study-recommendations`}>
                          <strong>{row.studentName}</strong>
                        </Link>
                        <small>{row.admissionNo}</small>
                      </td>
                      <td>{row.focusArea}</td>
                      <td>
                        <span className={`statusPill ${priorityTone(row.priority)}`}>
                          {priorityLabel(row.priority)}
                        </span>
                      </td>
                      <td>{row.supportNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="emptyText">Student coaching recommendations will appear when teacher support lanes are available.</p>
          )}
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Coaching guidance</strong>
            <span>How to use this</span>
          </div>
          <div className="analyticsChecklist">
            <div className="analyticsChecklistItem">
              <strong>Start with the urgent lane</strong>
              <span>Students in the urgent lane should move into wrong-question and time-management review first.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Use topic weakness as the study anchor</strong>
              <span>Lead the next plan with the weakest visible topic before widening back out to full-subject revision.</span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Keep this teacher-scoped</strong>
              <span>This report is for coaching students, not for evaluating teachers. Use it to assign academic next steps.</span>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
