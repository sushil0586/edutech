import Link from "next/link";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { fetchTeacherExams, getTeacherApiState } from "@/lib/api/teacher";

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

async function loadTeacherExams() {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      exams: [],
    };
  }

  try {
    const exams = await fetchTeacherExams();

    return {
      source: "live" as const,
      exams,
    };
  } catch {
    return {
      source: "error" as const,
      exams: [],
    };
  }
}

export default async function TeacherExamsPage() {
  const { source, exams } = await loadTeacherExams();
  const liveCount = exams.filter((exam) => exam.status === "live").length;
  const scheduledCount = exams.filter((exam) => exam.status === "scheduled").length;
  const draftCount = exams.filter((exam) => exam.status === "draft").length;

  return (
    <div className="studentPage studentDashboardModern">
      <TeacherPageHeader
        title="Exam Management"
        description="Review the exams in your scope, inspect sections and assigned learners, and open each exam to manage its current delivery state."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonSecondary" href="/teacher/exams/new">
              Quick Create
            </Link>
            <Link className="button buttonPrimary" href="/teacher/exams/advanced">
              Advanced Builder
            </Link>
          </div>
        }
      />

      <div className="pageUtilityRow">
        <span
          className={`statusPill ${
            source === "live"
              ? "statusLive"
              : source === "unconfigured"
                ? "statusWarning"
                : "statusDemo"
          }`}
        >
          {source === "live"
            ? `${exams.length} exams loaded`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load exams"}
        </span>
      </div>

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for teacher exams"
              : "Teacher exams could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active teacher account to load exams from the backend."
              : "The teacher exam page is wired to live teacher-scoped exam endpoints, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Teacher exams endpoint", "Active teacher web session"]
              : ["Backend connectivity", "Teacher exam access"]
          }
          ctaHref="/teacher/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : exams.length === 0 ? (
        <StudentStatePanel
          eyebrow="No exams in scope"
          title="Your teacher exam list is empty right now"
          description="No active exams were returned for this teacher account. Once exams are created or assigned within your institute scope, they will appear here automatically."
          ctaHref="/teacher/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel="Waiting for exams"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Exam Operations</span>
              <strong>Move from draft setup to delivery control without leaving the teacher workspace</strong>
              <p>
                Use this workspace to review scope, jump into linking and builder setup, and keep lifecycle status
                visible before learners enter the exam.
              </p>
              <small>
                {liveCount} live · {scheduledCount} scheduled · {draftCount} draft
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/teacher/exams/new">
                Quick Create
              </Link>
              <Link className="button buttonSecondary" href="/teacher/exams/advanced">
                Advanced Builder
              </Link>
              <Link className="button buttonSecondary" href="/teacher/results">
                Open Results
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Total Exams</span>
              <strong>{exams.length}</strong>
              <small>{draftCount} draft and {scheduledCount} scheduled</small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Live Exams</span>
              <strong>{liveCount}</strong>
              <small>Currently available to learners</small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Assigned Learners</span>
              <strong>{exams.reduce((total, exam) => total + exam.assigned_student_count, 0)}</strong>
              <small>Across the current teacher scope</small>
            </article>
          </section>

          <section className="examGrid">
            {exams.map((exam) => (
              <article className="examCard" key={exam.id}>
                <div className="examCardTop">
                  <div>
                    <strong>{exam.title}</strong>
                    <span>
                      {exam.code}
                      {exam.subject_name ? ` · ${exam.subject_name}` : ""}
                    </span>
                  </div>
                  <span className={`statusPill ${
                    exam.status === "live"
                      ? "statusLive"
                      : exam.status === "scheduled"
                        ? "statusWarning"
                        : exam.status === "draft"
                          ? "statusDemo"
                          : "statusDanger"
                  }`}
                  >
                    {titleCase(exam.status)}
                  </span>
                </div>

                <div className="examMetaGrid">
                  <div>
                    <span>Duration</span>
                    <strong>{exam.duration_minutes} min</strong>
                  </div>
                  <div>
                    <span>Questions</span>
                    <strong>{exam.active_questions_count}</strong>
                  </div>
                  <div>
                    <span>Students</span>
                    <strong>{exam.assigned_student_count}</strong>
                  </div>
                  <div>
                    <span>Marks</span>
                    <strong>{exam.total_marks}</strong>
                  </div>
                </div>

                <p className="examInstructions">
                  {exam.description || exam.instructions || "No additional teacher-facing exam notes were provided."}
                </p>

                <div className="examCardFooter">
                  <div className="examStateSummary">
                    <strong>{titleCase(exam.exam_type)}</strong>
                    <span>
                      {exam.start_at ? `Starts ${new Date(exam.start_at).toLocaleString("en-IN")}` : "Schedule pending"}
                    </span>
                  </div>

                  <div className="resultCardActions">
                    <Link className="button buttonSecondary" href={`/teacher/exams/${exam.id}/builder?tab=questions`}>
                      Link Questions
                    </Link>
                    <Link className="button buttonGhost" href={`/teacher/exams/${exam.id}/builder`}>
                      Setup
                    </Link>
                    <Link className="button buttonPrimary" href={`/teacher/exams/${exam.id}`}>
                      Open Exam
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
