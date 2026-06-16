import Link from "next/link";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type { TeacherExam } from "@/features/dashboard/types";
import { fetchPortalList } from "@/lib/api/portal";
import { requirePlatformAdminSession } from "@/lib/auth/session";

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

async function loadPlatformExams() {
  try {
    const exams = await fetchPortalList<TeacherExam>("/api/v1/exams/?page_size=200");
    return {
      source: "live" as const,
      exams,
    };
  } catch {
    return {
      source: "error" as const,
      exams: [] as TeacherExam[],
    };
  }
}

export default async function PlatformAdminExamsPage() {
  await requirePlatformAdminSession();
  const { source, exams } = await loadPlatformExams();
  const platformCount = exams.filter((exam) => exam.source_type === "platform").length;
  const instituteCount = exams.filter((exam) => exam.source_type === "institute").length;
  const teacherCount = exams.filter((exam) => exam.source_type === "teacher").length;
  const liveCount = exams.filter((exam) => exam.status === "live").length;
  const draftCount = exams.filter((exam) => exam.status === "draft").length;

  return (
    <div className="studentPage studentDashboardModern">
      <PlatformAdminPageHeader
        title="Exam Management"
        description="Review platform-wide exam coverage and create platform-owned or institute-owned exam shells from one governance workspace."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonSecondary" href="/admin/exams/new">
              Quick Create
            </Link>
            <Link className="button buttonPrimary" href="/admin/exams/advanced">
              Advanced Builder
            </Link>
          </div>
        }
      />

      <div className="pageUtilityRow">
        <span className={`statusPill ${source === "live" ? "statusLive" : "statusDemo"}`}>
          {source === "live" ? `${exams.length} exams loaded` : "Unable to load exams"}
        </span>
      </div>

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow="Load issue"
          title="Platform exams could not be loaded"
          description="This platform-admin route is connected to the live exam endpoints, but the current request did not complete successfully."
          bullets={["Backend connectivity", "Platform-admin exam access"]}
          ctaHref="/admin"
          ctaLabel="Back to Dashboard"
          statusLabel="Retry after backend check"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Platform governance</span>
              <strong>Separate platform-owned content from institute-owned delivery while keeping one exam backbone</strong>
              <p>
                Platform-admin authoring is where global exam governance becomes explicit. Use this lane to create
                platform content intentionally and review how much of the exam catalog is still institute- or teacher-owned.
              </p>
              <small>
                {platformCount} platform · {instituteCount} institute · {teacherCount} teacher · {liveCount} live
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/admin/exams/new">
                Quick Create
              </Link>
              <Link className="button buttonSecondary" href="/admin/exams/advanced">
                Advanced Builder
              </Link>
              <Link className="button buttonSecondary" href="/admin/academic-setup">
                Open Academic Setup
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Total Exams</span>
              <strong>{exams.length}</strong>
              <small>{draftCount} draft across platform scope</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Platform Source</span>
              <strong>{platformCount}</strong>
              <small>Explicitly platform-owned exams</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Institute Source</span>
              <strong>{instituteCount}</strong>
              <small>Institute-published exams visible to governance</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Teacher Source</span>
              <strong>{teacherCount}</strong>
              <small>Teacher-owned visibility records</small>
            </article>
          </section>

          {exams.length === 0 ? (
            <StudentStatePanel
              eyebrow="No exams in scope"
              title="No exams are visible to platform governance yet"
              description="Once exam shells are created through platform, institute, or teacher lanes, they will appear here with source ownership metadata."
              ctaHref="/admin/exams/new"
              ctaLabel="Create First Exam"
              statusLabel="Waiting for exams"
            />
          ) : (
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
                    <span
                      className={`statusPill ${
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
                      <span>Source</span>
                      <strong>{exam.source_label}</strong>
                    </div>
                    <div>
                      <span>Owner</span>
                      <strong>{exam.source_teacher_name || exam.source_name}</strong>
                    </div>
                    <div>
                      <span>Questions</span>
                      <strong>{exam.active_questions_count}</strong>
                    </div>
                    <div>
                      <span>Students</span>
                      <strong>{exam.assigned_student_count}</strong>
                    </div>
                  </div>

                  <p className="examInstructions">
                    {exam.description ||
                      exam.instructions ||
                      "No additional platform-facing exam notes were provided."}
                  </p>

                  <div className="examCardFooter">
                    <div className="examStateSummary">
                      <strong>{titleCase(exam.exam_type)}</strong>
                      <span>
                        {exam.start_at
                          ? `Starts ${new Date(exam.start_at).toLocaleString("en-IN")}`
                          : "Schedule pending"}
                      </span>
                    </div>

                    <div className="resultCardActions">
                      <Link className="button buttonSecondary" href={`/admin/exams/${exam.id}/builder?tab=questions`}>
                        Link Questions
                      </Link>
                      <Link className="button buttonGhost" href={`/admin/exams/${exam.id}/builder`}>
                        Setup
                      </Link>
                      <Link className="button buttonPrimary" href={`/admin/exams/${exam.id}`}>
                        Open Exam
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
