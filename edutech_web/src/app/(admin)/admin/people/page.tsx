import Link from "next/link";
import { RosterBrowser } from "@/components/admin/roster-browser";
import { RosterImportControls } from "@/components/admin/roster-import-controls";
import { StudentCreateDialog } from "@/components/admin/student-create-dialog";
import { TeacherCreateDialog } from "@/components/admin/teacher-create-dialog";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
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
    fetchPortalList<AcademicYearRecord>(`/api/v1/academics/academic-years/${instituteQuery}`).catch(
      () => [] as AcademicYearRecord[],
    ),
    fetchPortalList<ProgramRecord>(`/api/v1/academics/programs/${instituteQuery}`).catch(
      () => [] as ProgramRecord[],
    ),
    fetchPortalList<CohortRecord>(`/api/v1/academics/cohorts/${instituteQuery}`).catch(
      () => [] as CohortRecord[],
    ),
  ]);
  const rosterQuery = selectedInstituteId
    ? `?institute=${selectedInstituteId}&page_size=8`
    : "?page_size=8";
  const activeResourcePath =
    activeView === "students" ? "/api/v1/students/" : "/api/v1/teachers/";
  const activeCountPath = selectedInstituteId
    ? `${activeResourcePath}?institute=${selectedInstituteId}`
    : activeResourcePath;
  const [visibleRows, visibleCount] = await Promise.all([
    activeView === "students"
      ? fetchPortalList<StudentRosterRow>(`${activeResourcePath}${rosterQuery}`).catch(
          () => [] as StudentRosterRow[],
        )
      : fetchPortalList<TeacherRosterRow>(`${activeResourcePath}${rosterQuery}`).catch(
          () => [] as TeacherRosterRow[],
        ),
    loadCount(activeCountPath),
  ]);

  const hasWorkspaceLoadIssue =
    institutes.length === 0 ||
    (selectedInstituteId !== null &&
      (academicYears.length === 0 || programs.length === 0) &&
      visibleCount === 0 &&
      visibleRows.length === 0);

  return (
    <section className="studentPage studentPageTight studentDashboardModern adminPeoplePage adminPeoplePageCompact instituteConsolePage">
      <PlatformAdminPageHeader
        title="People"
        description="Browse institute roster records, manage login state, and coordinate controlled student and teacher imports."
        statusLabel={hasWorkspaceLoadIssue ? "Partial data" : "Live roster"}
        statusTone={hasWorkspaceLoadIssue ? "warning" : "live"}
      />

      {hasWorkspaceLoadIssue ? (
        <StudentStatePanel
          eyebrow="Roster workspace"
          title="People workspace loaded with limited live data"
          description="The page stayed available, but one or more roster or academic dependencies did not return cleanly. Retry after backend checks to restore full create and import behavior."
          bullets={[
            "Institute directory",
            "Academic years and programs",
            "Student or teacher roster feed",
          ]}
          ctaHref="/admin"
          ctaLabel="Back to Dashboard"
          secondaryCtaHref={`/admin/people?institute=${selectedInstituteId ?? ""}&view=${activeView}`}
          secondaryCtaLabel="Retry People"
          statusLabel="Controlled fallback"
        />
      ) : null}

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
                ? `${selectedInstitute.name} · ${visibleCount} records`
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
            rows={visibleRows}
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
