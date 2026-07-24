import Link from "next/link";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import type { TeacherInsightSummary } from "@/features/dashboard/types";
import { fetchTeacherInsightSummary } from "@/lib/api/teacher";

type DerivedSubjectRow = {
  subjectName: string;
  topicCount: number;
  averagePercentage: number;
  attemptedQuestions: number;
  skippedQuestions: number;
  concernLevel: "strong" | "watch" | "needs_attention";
  weakestTopic: string | null;
};

function percentage(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${Math.round(numeric)}%`;
}

function deriveConcernLevel(value: number): DerivedSubjectRow["concernLevel"] {
  if (value < 45) return "needs_attention";
  if (value < 70) return "watch";
  return "strong";
}

function concernLabel(level: DerivedSubjectRow["concernLevel"]) {
  if (level === "needs_attention") return "Needs attention";
  if (level === "watch") return "Watch";
  return "Strong";
}

function concernTone(level: DerivedSubjectRow["concernLevel"]) {
  if (level === "needs_attention") return "statusWarning";
  if (level === "watch") return "statusDemo";
  return "statusLive";
}

function buildSubjectRows(
  weakTopics: TeacherInsightSummary["weak_topics"],
): DerivedSubjectRow[] {
  const subjectMap = new Map<
    string,
    {
      subjectName: string;
      totalPercentage: number;
      topicCount: number;
      attemptedQuestions: number;
      skippedQuestions: number;
      weakestTopic: string | null;
      weakestPercentage: number;
    }
  >();

  for (const topic of weakTopics) {
    const key = topic.subject_name || "Unknown subject";
    const current = subjectMap.get(key) ?? {
      subjectName: key,
      totalPercentage: 0,
      topicCount: 0,
      attemptedQuestions: 0,
      skippedQuestions: 0,
      weakestTopic: null,
      weakestPercentage: Number.POSITIVE_INFINITY,
    };
    const topicPercentage = Number(topic.average_percentage);
    current.totalPercentage += Number.isFinite(topicPercentage) ? topicPercentage : 0;
    current.topicCount += 1;
    current.attemptedQuestions += topic.attempted_questions;
    current.skippedQuestions += topic.skipped_questions;
    if (Number.isFinite(topicPercentage) && topicPercentage < current.weakestPercentage) {
      current.weakestPercentage = topicPercentage;
      current.weakestTopic = topic.topic_name;
    }
    subjectMap.set(key, current);
  }

  return Array.from(subjectMap.values())
    .map((item) => {
      const averagePercentage = item.topicCount > 0 ? item.totalPercentage / item.topicCount : 0;
      return {
        subjectName: item.subjectName,
        topicCount: item.topicCount,
        averagePercentage,
        attemptedQuestions: item.attemptedQuestions,
        skippedQuestions: item.skippedQuestions,
        concernLevel: deriveConcernLevel(averagePercentage),
        weakestTopic: item.weakestTopic,
      };
    })
    .sort((left, right) => left.averagePercentage - right.averagePercentage || left.subjectName.localeCompare(right.subjectName));
}

export default async function TeacherSubjectReportsPage() {
  const summary = await fetchTeacherInsightSummary().catch(() => null);

  if (!summary) {
    return (
      <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
        <TeacherPageHeader
          title="Subject Performance Report"
          description="Teacher-scoped student subject reporting could not be loaded right now."
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

  const subjectRows = buildSubjectRows(summary.weak_topics);
  const strongestSubject = subjectRows.at(-1) ?? null;
  const weakestSubject = subjectRows[0] ?? null;
  const attentionSubjects = subjectRows.filter((row) => row.concernLevel === "needs_attention").length;

  return (
    <section className="studentPage studentPageTight studentDashboardModern teacherResultsPageVivid">
      <TeacherPageHeader
        title="Subject Performance Report"
        description="Teacher-scoped student subject signals, derived from current weak-topic and student outcome evidence."
        statusLabel={`${subjectRows.length} subject signal rows`}
        statusTone="live"
        action={
          <Link className="button buttonGhost" href="/teacher/reports">
            Back to Reports
          </Link>
        }
      />

      <StudentAnalyticsDetailHero
        eyebrow="Teacher subject performance"
        title="Student subject comparison is now available in first-pass form"
        description="This report is built from the current teacher insights summary. It already shows subject-level pressure, weak-topic concentration, and supporting student lanes, while the dedicated backend subject aggregation endpoint remains the next data upgrade."
        badges={[
          "Teacher-scoped academic signals",
          "Weak-topic driven subject view",
          "Dedicated backend endpoint still next",
        ]}
        stats={[
          { label: "Subjects tracked", value: String(subjectRows.length) },
          { label: "Attention subjects", value: String(attentionSubjects) },
          { label: "High performers", value: String(summary.high_performing_students.length) },
          { label: "Support lane", value: String(summary.low_performing_students.length) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/teacher/results/analysis">
              Open Analysis
            </Link>
            <Link className="button buttonSecondary" href="/teacher/results">
              Open Results
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
            label: "Subject Rows",
            value: String(subjectRows.length),
            note: "Derived subject signals from teacher weak-topic evidence",
            tone: "primary",
          },
          {
            label: "Weakest Subject",
            value: weakestSubject ? weakestSubject.subjectName : "N/A",
            note: weakestSubject ? `${percentage(weakestSubject.averagePercentage)} average` : "No subject signal yet",
          },
          {
            label: "Strongest Subject",
            value: strongestSubject ? strongestSubject.subjectName : "N/A",
            note: strongestSubject ? `${percentage(strongestSubject.averagePercentage)} average` : "No subject signal yet",
          },
          {
            label: "Teacher Scope",
            value: "Student level",
            note: "Focused on student academic supervision, not teacher self-metrics",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Subject pressure board</strong>
            <span>{subjectRows.length} subject{subjectRows.length === 1 ? "" : "s"}</span>
          </div>
          {subjectRows.length ? (
            <div className="studentResultsTableWrap">
              <table className="studentResultsTable">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Average</th>
                    <th>Weak Topics</th>
                    <th>Attempted</th>
                    <th>Skipped</th>
                    <th>Weakest Topic</th>
                    <th>Concern</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectRows.map((row) => (
                    <tr className="studentResultsTableRow" key={row.subjectName}>
                      <td>
                        <strong>{row.subjectName}</strong>
                      </td>
                      <td>{percentage(row.averagePercentage)}</td>
                      <td>{row.topicCount}</td>
                      <td>{row.attemptedQuestions}</td>
                      <td>{row.skippedQuestions}</td>
                      <td>{row.weakestTopic ?? "N/A"}</td>
                      <td>
                        <span className={`statusPill ${concernTone(row.concernLevel)}`}>
                          {concernLabel(row.concernLevel)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="emptyText">Subject-strength rows will appear when teacher weak-topic evidence is available.</p>
          )}
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Weak-topic feed</strong>
            <span>{summary.weak_topics.length} topic signal{summary.weak_topics.length === 1 ? "" : "s"}</span>
          </div>
          <div className="studentInsightMessageStack">
            {summary.weak_topics.slice(0, 8).map((topic) => (
              <div className="studentInsightMessage" key={`${topic.subject_name}-${topic.topic_name ?? "untitled"}`}>
                <span className="placeholderDot" aria-hidden="true" />
                <p>
                  <strong>{topic.subject_name}</strong>
                  {" · "}
                  {topic.topic_name ?? "Untitled topic"}
                  {" · "}
                  {percentage(topic.average_percentage)} average
                  {" · "}
                  {topic.attempted_questions} attempted
                  {" · "}
                  {topic.skipped_questions} skipped
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Students doing well</strong>
            <span>{summary.high_performing_students.length}</span>
          </div>
          <div className="studentInsightMessageStack">
            {summary.high_performing_students.slice(0, 6).map((student) => (
              <div className="studentInsightMessage" key={`high-${student.student_id}`}>
                <span className="placeholderDot" aria-hidden="true" />
                <p>
                  <Link href={`/teacher/reports/students/${student.student_id}?from=subjects`}>
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
            <strong>Students needing support</strong>
            <span>{summary.low_performing_students.length}</span>
          </div>
          <div className="studentInsightMessageStack">
            {summary.low_performing_students.slice(0, 6).map((student) => (
              <div className="studentInsightMessage" key={`low-${student.student_id}`}>
                <span className="placeholderDot" aria-hidden="true" />
                <p>
                  <Link href={`/teacher/reports/students/${student.student_id}?from=subjects`}>
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
      </section>
    </section>
  );
}
