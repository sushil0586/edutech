import Link from "next/link";
import { RosterBrowser } from "@/components/admin/roster-browser";
import { RosterImportControls } from "@/components/admin/roster-import-controls";
import { StudentCreateDialog } from "@/components/admin/student-create-dialog";
import { TeacherCreateDialog } from "@/components/admin/teacher-create-dialog";
import {
  type AcademicYearRecord,
  type CohortRecord,
  type ProgramRecord,
} from "@/components/admin/academic-setup-workspace";
import { fetchPortalCount, fetchPortalList } from "@/lib/api/portal";
import { requirePlatformAdminSession } from "@/lib/auth/session";

type StudentRosterRow = {
  id: string;
  institute: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  academic_year?: string | null;
  program?: string | null;
  full_name: string;
  admission_no: string;
  email: string;
  phone: string;
  cohort: string | null;
  guardian_name?: string;
  guardian_phone?: string;
  address?: string;
  joined_at?: string | null;
  is_active: boolean;
  has_login: boolean;
  login_username: string | null;
  login_is_active: boolean;
  account_user_id: number | null;
};

type TeacherRosterRow = {
  id: string;
  institute: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  employee_code: string;
  email: string;
  phone: string;
  qualification?: string;
  specialization: string;
  bio?: string;
  joined_at?: string | null;
  is_active: boolean;
  has_login: boolean;
  login_username: string | null;
  login_is_active: boolean;
  account_user_id: number | null;
};

async function loadCount(path: string) {
  try {
    return await fetchPortalCount(path);
  } catch {
    return 0;
  }
}

function normalizeSelectedInstitute(
  requestedInstituteId: string | undefined,
  institutes: InstituteRecord[],
) {
  if (requestedInstituteId) {
    const match = institutes.find((item) => item.id === requestedInstituteId);
    if (match) {
      return match.id;
    }
  }

  return institutes.find((item) => item.is_active)?.id ?? institutes[0]?.id ?? null;
}

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  is_active: boolean;
};

function normalizePeopleView(view: string | undefined) {
  return view === "teachers" ? "teachers" : "students";
}

export default async function AdminPeoplePage({
  searchParams,
}: {
  searchParams?: Promise<{ institute?: string; view?: string }>;
}) {
  const params = (await searchParams) ?? {};
  await requirePlatformAdminSession();
  const institutes = await fetchPortalList<InstituteRecord>("/api/v1/institutes/?page_size=50").catch(() => []);
  const selectedInstituteId = normalizeSelectedInstitute(params.institute, institutes);
  const activeView = normalizePeopleView(params.view);
  const selectedInstitute = selectedInstituteId
    ? institutes.find((item) => item.id === selectedInstituteId) ?? null
    : null;
  const instituteQuery = selectedInstituteId
    ? `?institute=${selectedInstituteId}&page_size=100`
    : "?page_size=100";
  const [academicYears, programs, cohorts] = await Promise.all([
    fetchPortalList<AcademicYearRecord>(`/api/v1/academics/academic-years/${instituteQuery}`),
    fetchPortalList<ProgramRecord>(`/api/v1/academics/programs/${instituteQuery}`),
    fetchPortalList<CohortRecord>(`/api/v1/academics/cohorts/${instituteQuery}`),
  ]);
  const rosterQuery = selectedInstituteId
    ? `?institute=${selectedInstituteId}&page_size=8`
    : "?page_size=8";
  const studentCountPath = selectedInstituteId
    ? `/api/v1/students/?institute=${selectedInstituteId}`
    : "/api/v1/students/";
  const teacherCountPath = selectedInstituteId
    ? `/api/v1/teachers/?institute=${selectedInstituteId}`
    : "/api/v1/teachers/";
  const [students, teachers, studentCount, teacherCount] = await Promise.all([
    fetchPortalList<StudentRosterRow>(`/api/v1/students/${rosterQuery}`),
    fetchPortalList<TeacherRosterRow>(`/api/v1/teachers/${rosterQuery}`),
    loadCount(studentCountPath),
    loadCount(teacherCountPath),
  ]);

  return (
    <section className="studentPage studentPageTight studentDashboardModern adminPeoplePage adminPeoplePageCompact">
      <section className="contentCard adminPeopleControlPanel">
        <div className="adminPeopleViewTabs">
          <Link
            className={`adminPeopleViewTab ${activeView === "students" ? "adminPeopleViewTabActive" : ""}`}
            href={`/admin/people?institute=${selectedInstituteId ?? ""}&view=students`}
          >
            Students
          </Link>
          <Link
            className={`adminPeopleViewTab ${activeView === "teachers" ? "adminPeopleViewTabActive" : ""}`}
            href={`/admin/people?institute=${selectedInstituteId ?? ""}&view=teachers`}
          >
            Teachers
          </Link>
        </div>

        <div className="adminPeopleActionBar">
          <div className="adminPeopleActionBarCopy">
            <form action="/admin/people" className="adminPeopleInstituteSelectField" method="get">
              <span>Institute</span>
              <input name="view" type="hidden" value={activeView} />
              <div className="adminPeopleInstituteSelectRow">
                <select aria-label="Select institute" defaultValue={selectedInstituteId ?? ""} name="institute">
                  {institutes.map((institute) => (
                    <option key={institute.id} value={institute.id}>
                      {institute.name} ({institute.code})
                    </option>
                  ))}
                </select>
                <button className="button buttonSecondary" type="submit">
                  Open
                </button>
              </div>
            </form>
            <strong>{activeView === "students" ? "Students" : "Teachers"}</strong>
            <span>
              {selectedInstitute
                ? `${selectedInstitute.name} · ${activeView === "students" ? studentCount : teacherCount} records`
                : "Select an institute to begin."}
            </span>
          </div>
          <div className="adminPeopleActionBarButtons">
            {activeView === "students" ? (
              <StudentCreateDialog
                academicYears={academicYears}
                cohorts={cohorts}
                instituteId={selectedInstituteId}
                programs={programs}
              />
            ) : (
              <TeacherCreateDialog instituteId={selectedInstituteId} />
            )}
            <RosterImportControls
              allowedResources={activeView === "students" ? ["students"] : ["teachers"]}
              instituteId={selectedInstituteId}
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
                ? "No students were returned by the backend for this scope."
                : "No teachers were returned by the backend for this scope."
            }
            programs={programs}
            resource={activeView}
            rows={activeView === "students" ? students : teachers}
            title={
              activeView === "students"
                ? "Student roster and login management"
                : "Teacher roster and login management"
            }
          />
        </article>
      </section>
    </section>
  );
}
