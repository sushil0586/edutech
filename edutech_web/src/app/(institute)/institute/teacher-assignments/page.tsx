import Link from "next/link";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import {
  TeacherAssignmentWorkspace,
  type TeacherAssignmentRecord,
  type TeacherRecord,
} from "@/components/admin/teacher-assignment-workspace";
import {
  type AcademicYearRecord,
  type CohortRecord,
  type ProgramRecord,
  type SubjectRecord,
} from "@/components/admin/academic-setup-workspace";
import { fetchPortalCount, fetchPortalList } from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";

async function loadCount(path: string) {
  try {
    return await fetchPortalCount(path);
  } catch {
    return 0;
  }
}

export default async function InstituteTeacherAssignmentsPage() {
  const profile = await requireInstituteAdminSession();
  const instituteQuery = profile.institute
    ? `?institute=${profile.institute}&page_size=100`
    : "?page_size=100";

  const [teachers, academicYears, programs, cohorts, subjects, assignments] = await Promise.all([
    fetchPortalList<TeacherRecord>(`/api/v1/teachers/${instituteQuery}`),
    fetchPortalList<AcademicYearRecord>(`/api/v1/academics/academic-years/${instituteQuery}`),
    fetchPortalList<ProgramRecord>(`/api/v1/academics/programs/${instituteQuery}`),
    fetchPortalList<CohortRecord>(`/api/v1/academics/cohorts/${instituteQuery}`),
    fetchPortalList<SubjectRecord>(`/api/v1/academics/subjects/${instituteQuery}`),
    fetchPortalList<TeacherAssignmentRecord>(`/api/v1/teachers/assignments/${instituteQuery}`),
  ]);

  const assignmentCount = await loadCount(
    profile.institute ? `/api/v1/teachers/assignments/?institute=${profile.institute}` : "/api/v1/teachers/assignments/",
  );

  const activeAssignments = assignments.filter((assignment) => assignment.is_active).length;
  const primaryAssignments = assignments.filter((assignment) => assignment.is_primary).length;
  const activeTeacherIds = new Set(teachers.filter((teacher) => teacher.is_active).map((teacher) => teacher.id));
  const assignedTeacherIds = new Set(assignments.filter((assignment) => assignment.is_active).map((assignment) => assignment.teacher));
  const unassignedActiveTeachers = Array.from(activeTeacherIds).filter((teacherId) => !assignedTeacherIds.has(teacherId)).length;
  const cohortOptionalAssignments = assignments.filter((assignment) => assignment.cohort === null).length;

  return (
    <section className="studentPage studentPageTight studentDashboardModern">
      <InstitutePageHeader
        title="Teacher Assignments"
        description="Manage institute-scoped teacher ownership across years, programs, cohorts, and subjects from one operational screen."
        statusLabel={`${assignmentCount} assignments in scope`}
        statusTone="live"
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Delivery readiness</span>
          <strong>Keep teaching ownership explicit before exams, rosters, and results move into active use</strong>
          <p>
            This page is the institute oversight view for assignment health. It reuses the live assignment CRUD layer
            while making gaps visible at the institute operations level.
          </p>
          <small>
            {activeAssignments} active assignments · {unassignedActiveTeachers} active teachers still unassigned
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href="/institute/academic-setup">
            Open Academic Setup
          </Link>
          <Link className="button buttonSecondary" href="/institute/people">
            Review People
          </Link>
        </div>
      </section>

      <section className="resultsSummaryGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Total assignments</span>
          <strong>{assignmentCount}</strong>
          <small>All teacher scope records returned by the backend.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Active assignments</span>
          <strong>{activeAssignments}</strong>
          <small>Assignments currently marked active.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Primary assignments</span>
          <strong>{primaryAssignments}</strong>
          <small>Records marked as primary owner.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Active teachers without assignment</span>
          <strong>{unassignedActiveTeachers}</strong>
          <small>Teachers who still need subject mapping.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Cohort-optional assignments</span>
          <strong>{cohortOptionalAssignments}</strong>
          <small>Assignments that operate above a cohort level.</small>
        </article>
      </section>

      <section className="dashboardLowerGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Operational interpretation</span>
            <h3>What this workspace governs</h3>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>Teacher to subject ownership</strong>
                  <span>Each record binds a teacher to the academic structure that exam creation and result review depend on.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{teachers.length}</strong>
                  <span>Teachers loaded</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Program and cohort fit</strong>
                  <span>Assignments can be broad or cohort-specific, so this screen must preserve both patterns.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{programs.length + cohorts.length}</strong>
                  <span>Program units</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Exam delivery readiness</strong>
                  <span>Gaps here often surface later as question ownership confusion or wrong teacher exam scope.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>{subjects.length}</strong>
                  <span>Subjects in scope</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <TeacherAssignmentWorkspace
        academicYears={academicYears}
        assignments={assignments}
        cohorts={cohorts}
        instituteId={profile.institute ?? null}
        programs={programs}
        subjects={subjects}
        teachers={teachers}
      />
    </section>
  );
}
