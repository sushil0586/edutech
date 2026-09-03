import {
  AdminPeopleWorkspace,
  type InstituteRecord,
  type StudentRosterRow,
  type TeacherRosterRow,
} from "@/components/admin/admin-people-workspace";
import {
  type AcademicYearRecord,
  type CohortRecord,
  type ProgramRecord,
} from "@/components/admin/academic-setup-workspace";
import { fetchPortalCount, fetchPortalList, fetchPortalListAll } from "@/lib/api/portal";
import { requirePlatformAdminSession } from "@/lib/auth/session";

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
  const institutes = await fetchPortalListAll<InstituteRecord>("/api/v1/institutes/?page_size=50").catch(() => []);
  const selectedInstituteId = normalizeSelectedInstitute(params.institute, institutes);
  const activeView = normalizePeopleView(params.view);
  const instituteQuery = selectedInstituteId
    ? `?institute=${selectedInstituteId}&page_size=100`
    : "?page_size=100";
  const needsStudentAcademics = activeView === "students";
  const rosterQuery = selectedInstituteId
    ? `?institute=${selectedInstituteId}&page_size=8`
    : "?page_size=8";
  const activeResourcePath =
    activeView === "students" ? "/api/v1/students/" : "/api/v1/teachers/";
  const activeCountPath = selectedInstituteId
    ? `${activeResourcePath}?institute=${selectedInstituteId}`
    : activeResourcePath;
  const [academicYears, programs, cohorts, visibleRows, visibleCount] = await Promise.all([
    needsStudentAcademics
      ? fetchPortalListAll<AcademicYearRecord>(`/api/v1/academics/academic-years/${instituteQuery}`).catch(
          () => [] as AcademicYearRecord[],
        )
      : Promise.resolve([] as AcademicYearRecord[]),
    needsStudentAcademics
      ? fetchPortalListAll<ProgramRecord>(`/api/v1/academics/programs/${instituteQuery}`).catch(
          () => [] as ProgramRecord[],
        )
      : Promise.resolve([] as ProgramRecord[]),
    needsStudentAcademics
      ? fetchPortalListAll<CohortRecord>(`/api/v1/academics/cohorts/${instituteQuery}`).catch(
          () => [] as CohortRecord[],
        )
      : Promise.resolve([] as CohortRecord[]),
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
      (needsStudentAcademics && (academicYears.length === 0 || programs.length === 0)) &&
      visibleCount === 0 &&
      visibleRows.length === 0);

  return (
    <AdminPeopleWorkspace
      academicYears={academicYears}
      activeView={activeView}
      cohorts={cohorts}
      hasWorkspaceLoadIssue={hasWorkspaceLoadIssue}
      institutes={institutes}
      programs={programs}
      selectedInstituteId={selectedInstituteId}
      visibleCount={visibleCount}
      visibleRows={visibleRows}
    />
  );
}
