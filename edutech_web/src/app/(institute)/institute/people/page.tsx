import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { RosterImportControls } from "@/components/admin/roster-import-controls";
import { RosterBrowser } from "@/components/admin/roster-browser";
import { StudentCreateDialog } from "@/components/admin/student-create-dialog";
import { TeacherCreateDialog } from "@/components/admin/teacher-create-dialog";
import {
  type AcademicYearRecord,
  type CohortRecord,
  type ProgramRecord,
} from "@/components/admin/academic-setup-workspace";
import { fetchPortalCount, fetchPortalList, fetchPortalRecord } from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";

type StudentRosterRow = {
  id: string;
  institute: string;
  full_name: string;
  admission_no: string;
  email: string;
  phone: string;
  cohort: string | null;
  is_active: boolean;
  has_login: boolean;
  login_username: string | null;
  login_is_active: boolean;
  account_user_id: number | null;
};

type TeacherRosterRow = {
  id: string;
  institute: string;
  full_name: string;
  employee_code: string;
  email: string;
  phone: string;
  specialization: string;
  is_active: boolean;
  has_login: boolean;
  login_username: string | null;
  login_is_active: boolean;
  account_user_id: number | null;
};

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

async function loadCount(path: string) {
  try {
    return await fetchPortalCount(path);
  } catch {
    return 0;
  }
}

function normalizePeopleView(view: string | undefined) {
  return view === "teachers" ? "teachers" : "students";
}

export default async function InstitutePeoplePage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const activeView = normalizePeopleView(params.view);
  const profile = await requireInstituteAdminSession();
  const instituteQuery = profile.institute ? `?institute=${profile.institute}&page_size=100` : "?page_size=100";
  const rosterQuery = profile.institute ? `?institute=${profile.institute}&page_size=8` : "?page_size=8";

  const [students, teachers, studentCount, teacherCount, academicYears, programs, cohorts, institute] =
    await Promise.all([
      fetchPortalList<StudentRosterRow>(`/api/v1/students/${rosterQuery}`),
      fetchPortalList<TeacherRosterRow>(`/api/v1/teachers/${rosterQuery}`),
      loadCount(profile.institute ? `/api/v1/students/?institute=${profile.institute}` : "/api/v1/students/"),
      loadCount(profile.institute ? `/api/v1/teachers/?institute=${profile.institute}` : "/api/v1/teachers/"),
      fetchPortalList<AcademicYearRecord>(`/api/v1/academics/academic-years/${instituteQuery}`),
      fetchPortalList<ProgramRecord>(`/api/v1/academics/programs/${instituteQuery}`),
      fetchPortalList<CohortRecord>(`/api/v1/academics/cohorts/${instituteQuery}`),
      profile.institute
        ? fetchPortalRecord<InstituteRecord>(`/api/v1/institutes/${profile.institute}/`).catch(() => null)
        : Promise.resolve(null),
    ]);

  return (
    <section className="studentPage studentPageTight studentDashboardModern adminPeoplePage adminPeoplePageCompact instituteConsolePage">
      <PageHeader
        eyebrow="Institute workspace"
        title="People"
        description=""
        contextLabel={institute ? `${institute.name} · ${institute.code}` : "Institute scope only"}
        className="pageHeaderCompact"
      />

      <section className="contentCard adminPeopleControlPanel">
        <div className="adminPeopleViewTabs">
          <Link
            className={`adminPeopleViewTab ${activeView === "students" ? "adminPeopleViewTabActive" : ""}`}
            href="/institute/people?view=students"
          >
            Students
          </Link>
          <Link
            className={`adminPeopleViewTab ${activeView === "teachers" ? "adminPeopleViewTabActive" : ""}`}
            href="/institute/people?view=teachers"
          >
            Teachers
          </Link>
        </div>

        <div className="adminPeopleActionBar">
          <div className="adminPeopleActionBarCopy">
            <span>Institute-scoped roster access only</span>
            <strong>{activeView === "students" ? "Students" : "Teachers"}</strong>
            <span>
              {institute
                ? `${institute.name} · ${activeView === "students" ? studentCount : teacherCount} records`
                : `${activeView === "students" ? studentCount : teacherCount} records`}
            </span>
          </div>
          <div className="adminPeopleActionBarButtons">
            {activeView === "students" ? (
              <StudentCreateDialog
                academicYears={academicYears}
                cohorts={cohorts}
                instituteId={profile.institute ?? null}
                programs={programs}
              />
            ) : (
              <TeacherCreateDialog instituteId={profile.institute ?? null} />
            )}
            <RosterImportControls
              allowedResources={activeView === "students" ? ["students"] : ["teachers"]}
              instituteId={profile.institute ?? null}
            />
          </div>
        </div>
      </section>

      <section className="adminPeopleSingleGrid">
        <article className="dashboardPanel adminPeopleRosterPanel adminPeopleRosterPanelSingle">
          <RosterBrowser
            academicYears={academicYears}
            cohorts={cohorts}
            cohortNames={new Map(cohorts.map((item) => [item.id, item.name]))}
            emptyMessage={
              activeView === "students"
                ? "No students were returned by the backend for this institute."
                : "No teachers were returned by the backend for this institute."
            }
            programs={programs}
            resource={activeView}
            rows={activeView === "students" ? students : teachers}
            title={activeView === "students" ? "Student roster" : "Teacher roster"}
          />
        </article>
      </section>
    </section>
  );
}
