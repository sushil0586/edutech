"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RosterBrowser } from "@/components/admin/roster-browser";
import { RosterImportControls } from "@/components/admin/roster-import-controls";
import { StudentCreateDialog } from "@/components/admin/student-create-dialog";
import { TeacherCreateDialog } from "@/components/admin/teacher-create-dialog";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type {
  AcademicYearRecord,
  CohortRecord,
  ProgramRecord,
} from "@/components/admin/academic-setup-workspace";

export type StudentRosterRow = {
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

export type TeacherRosterRow = {
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

export type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  is_active: boolean;
};

type PeopleWorkspacePayload = {
  academicYears: AcademicYearRecord[];
  activeView: "students" | "teachers";
  cohorts: CohortRecord[];
  programs: ProgramRecord[];
  selectedInstituteId: string | null;
  visibleCount: number;
  visibleRows: Array<StudentRosterRow | TeacherRosterRow>;
};

function buildWorkspaceHref(view: "students" | "teachers", instituteId: string | null) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (instituteId) {
    params.set("institute", instituteId);
  }
  return `/admin/people?${params.toString()}`;
}

export function AdminPeopleWorkspace({
  academicYears,
  cohorts,
  hasWorkspaceLoadIssue,
  institutes,
  programs,
  selectedInstituteId,
  visibleCount,
  visibleRows,
  activeView,
}: {
  academicYears: AcademicYearRecord[];
  cohorts: CohortRecord[];
  hasWorkspaceLoadIssue: boolean;
  institutes: InstituteRecord[];
  programs: ProgramRecord[];
  selectedInstituteId: string | null;
  visibleCount: number;
  visibleRows: Array<StudentRosterRow | TeacherRosterRow>;
  activeView: "students" | "teachers";
}) {
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [currentView, setCurrentView] = useState(activeView);
  const [currentInstituteId, setCurrentInstituteId] = useState<string | null>(selectedInstituteId);
  const [currentAcademicYears, setCurrentAcademicYears] = useState(academicYears);
  const [currentPrograms, setCurrentPrograms] = useState(programs);
  const [currentCohorts, setCurrentCohorts] = useState(cohorts);
  const [currentVisibleRows, setCurrentVisibleRows] = useState(visibleRows);
  const [currentVisibleCount, setCurrentVisibleCount] = useState(visibleCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  useEffect(() => {
    setCurrentView(activeView);
    setCurrentInstituteId(selectedInstituteId);
    setCurrentAcademicYears(academicYears);
    setCurrentPrograms(programs);
    setCurrentCohorts(cohorts);
    setCurrentVisibleRows(visibleRows);
    setCurrentVisibleCount(visibleCount);
  }, [
    academicYears,
    activeView,
    cohorts,
    programs,
    selectedInstituteId,
    visibleCount,
    visibleRows,
  ]);

  const selectedInstitute =
    (currentInstituteId
      ? institutes.find((item) => item.id === currentInstituteId) ?? null
      : null) ?? null;

  async function loadWorkspace(nextView: "students" | "teachers", nextInstituteId: string | null) {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCurrentView(nextView);
    setCurrentInstituteId(nextInstituteId);
    setIsLoading(true);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", buildWorkspaceHref(nextView, nextInstituteId));
    }

    try {
      const params = new URLSearchParams();
      params.set("view", nextView);
      if (nextInstituteId) {
        params.set("institute", nextInstituteId);
      }

      const response = await fetch(`/api/admin/people/workspace?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error("Unable to refresh people workspace right now.");
      }

      const payload = (await response.json()) as PeopleWorkspacePayload;
      if (requestId !== requestIdRef.current) {
        return;
      }

      setCurrentView(payload.activeView);
      setCurrentInstituteId(payload.selectedInstituteId);
      setCurrentAcademicYears(payload.academicYears ?? []);
      setCurrentPrograms(payload.programs ?? []);
      setCurrentCohorts(payload.cohorts ?? []);
      setCurrentVisibleRows(payload.visibleRows ?? []);
      setCurrentVisibleCount(payload.visibleCount ?? 0);
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        if (typeof window !== "undefined") {
          window.location.href = buildWorkspaceHref(nextView, nextInstituteId);
        }
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  return (
    <section className="studentPage studentPageTight studentDashboardModern adminPeoplePage adminPeoplePageCompact instituteConsolePage">
      <PlatformAdminPageHeader
        title="People"
        description="Browse institute roster records, manage login state, and coordinate student and teacher imports from one workspace."
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
          secondaryCtaHref={buildWorkspaceHref(currentView, currentInstituteId)}
          secondaryCtaLabel="Retry People"
          statusLabel="Controlled fallback"
        />
      ) : null}

      <section className="contentCard adminPeopleControlPanel">
        <div className="adminPeopleViewTabs">
          <Link
            className={`adminPeopleViewTab ${currentView === "students" ? "adminPeopleViewTabActive" : ""}`}
            href={buildWorkspaceHref("students", currentInstituteId)}
            onClick={(event) => {
              event.preventDefault();
              void loadWorkspace("students", currentInstituteId);
            }}
          >
            Students
          </Link>
          <Link
            className={`adminPeopleViewTab ${currentView === "teachers" ? "adminPeopleViewTabActive" : ""}`}
            href={buildWorkspaceHref("teachers", currentInstituteId)}
            onClick={(event) => {
              event.preventDefault();
              void loadWorkspace("teachers", currentInstituteId);
            }}
          >
            Teachers
          </Link>
        </div>

        <div className="adminPeopleActionBar">
          <div className="adminPeopleActionBarCopy">
            <form
              action="/admin/people"
              className="adminPeopleInstituteSelectField"
              method="get"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const nextInstituteId = String(formData.get("institute") ?? "").trim() || null;
                const nextView = String(formData.get("view") ?? "students") === "teachers" ? "teachers" : "students";
                void loadWorkspace(nextView, nextInstituteId);
              }}
            >
              <span>Institute</span>
              <input name="view" type="hidden" value={currentView} />
              <div className="adminPeopleInstituteSelectRow">
                <select aria-label="Select institute" defaultValue={currentInstituteId ?? ""} name="institute">
                  {institutes.map((institute) => (
                    <option key={institute.id} value={institute.id}>
                      {institute.name} ({institute.code})
                    </option>
                  ))}
                </select>
                <button className="button buttonSecondary" type="submit">
                  Update View
                </button>
              </div>
            </form>
            <strong>{currentView === "students" ? "Students" : "Teachers"}</strong>
            <span>
              {selectedInstitute
                ? `${selectedInstitute.name} · ${currentVisibleCount} records in view`
                : "Select an institute to begin."}
            </span>
          </div>
          <div className="adminPeopleActionBarButtons">
            {currentView === "students" ? (
              <StudentCreateDialog
                academicYears={currentAcademicYears}
                cohorts={currentCohorts}
                instituteId={currentInstituteId}
                programs={currentPrograms}
              />
            ) : (
              <TeacherCreateDialog instituteId={currentInstituteId} />
            )}
            <RosterImportControls
              allowedResources={currentView === "students" ? ["students"] : ["teachers"]}
              instituteId={currentInstituteId}
            />
          </div>
        </div>
      </section>

      {isLoading ? <p className="feedbackBanner">Loading people workspace...</p> : null}

      <section className="adminPeopleSingleGrid">
        <article className="dashboardPanel adminPeopleRosterPanel adminPeopleRosterPanelSingle">
          <RosterBrowser
            academicYears={currentAcademicYears}
            cohorts={currentCohorts}
            cohortNames={new Map(currentCohorts.map((item) => [item.id, item.name]))}
            emptyMessage={
              currentView === "students"
                ? "No students were returned by the backend for this scope."
                : "No teachers were returned by the backend for this scope."
            }
            programs={currentPrograms}
            resource={currentView}
            rows={
              currentView === "students"
                ? (currentVisibleRows as StudentRosterRow[])
                : (currentVisibleRows as TeacherRosterRow[])
            }
            title={
              currentView === "students"
                ? "Student roster and login management"
                : "Teacher roster and login management"
            }
          />
        </article>
      </section>
    </section>
  );
}
