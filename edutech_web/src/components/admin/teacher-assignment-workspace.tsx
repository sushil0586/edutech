"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type TeacherAssignmentRecord = {
  id: string;
  teacher: string;
  academic_year: string;
  program: string;
  cohort: string | null;
  subject: string;
  assignment_role: string;
  is_primary: boolean;
  is_active: boolean;
};

export type TeacherRecord = {
  id: string;
  full_name: string;
  employee_code: string;
  is_active: boolean;
};

type AcademicYearRecord = {
  id: string;
  name: string;
  is_active: boolean;
};

type ProgramRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type CohortRecord = {
  id: string;
  program: string;
  name: string;
  is_active: boolean;
};

type SubjectRecord = {
  id: string;
  program: string | null;
  name: string;
  is_active: boolean;
};

type LookupMaps = {
  teacherNames: Map<string, string>;
  yearNames: Map<string, string>;
  programNames: Map<string, string>;
  cohortNames: Map<string, string>;
  subjectNames: Map<string, string>;
};

type AssignmentFieldErrors = Partial<Record<
  "institute" | "teacher" | "academic_year" | "program" | "cohort" | "subject" | "assignment_role",
  string
>>;

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

function optionLabel(label: string, active: boolean) {
  return `${label}${active ? "" : " (inactive)"}`;
}

export function TeacherAssignmentWorkspace({
  instituteId,
  teachers,
  academicYears,
  programs,
  cohorts,
  subjects,
  assignments,
}: {
  instituteId: string | null;
  teachers: TeacherRecord[];
  academicYears: AcademicYearRecord[];
  programs: ProgramRecord[];
  cohorts: CohortRecord[];
  subjects: SubjectRecord[];
  assignments: TeacherAssignmentRecord[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [programId, setProgramId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [assignmentRole, setAssignmentRole] = useState("main_teacher");
  const [isPrimary, setIsPrimary] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AssignmentFieldErrors>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  const lookup = useMemo<LookupMaps>(
    () => ({
      teacherNames: new Map(teachers.map((item) => [item.id, item.full_name])),
      yearNames: new Map(academicYears.map((item) => [item.id, item.name])),
      programNames: new Map(programs.map((item) => [item.id, item.name])),
      cohortNames: new Map(cohorts.map((item) => [item.id, item.name])),
      subjectNames: new Map(subjects.map((item) => [item.id, item.name])),
    }),
    [academicYears, cohorts, programs, subjects, teachers],
  );

  const cohortOptions = cohorts.filter((item) => !programId || item.program === programId);
  const subjectOptions = subjects.filter(
    (item) => !programId || item.program === null || item.program === programId,
  );
  const visibleAssignments = showArchived
    ? assignments
    : assignments.filter((item) => item.is_active);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTeacherId("");
    setAcademicYearId("");
    setProgramId("");
    setCohortId("");
    setSubjectId("");
    setAssignmentRole("main_teacher");
    setIsPrimary(true);
    setIsActive(true);
    setMessage("");
    setFieldErrors({});
  }, []);

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    resetForm();
  }, [resetForm]);

  function startEdit(item: TeacherAssignmentRecord) {
    setEditingId(item.id);
    setTeacherId(item.teacher);
    setAcademicYearId(item.academic_year);
    setProgramId(item.program);
    setCohortId(item.cohort ?? "");
    setSubjectId(item.subject);
    setAssignmentRole(item.assignment_role);
    setIsPrimary(item.is_primary);
    setIsActive(item.is_active);
    setMessage("");
    setFieldErrors({});
    setDialogOpen(true);
  }

  useEffect(() => {
    if (!dialogOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDialog();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogOpen, closeDialog]);

  async function saveAssignment() {
    if (!instituteId) {
      setFieldErrors({ institute: "Select an institute before saving assignments." });
      setMessage("Select an institute before saving assignments.");
      return;
    }

    const nextFieldErrors: AssignmentFieldErrors = {};
    if (!teacherId) nextFieldErrors.teacher = "Teacher is required.";
    if (!academicYearId) nextFieldErrors.academic_year = "Academic year is required.";
    if (!programId) nextFieldErrors.program = "Program is required.";
    if (!subjectId) nextFieldErrors.subject = "Subject is required.";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setMessage("Fill the required fields to continue.");
      return;
    }

    setSaving(true);
    setMessage("");
    setFieldErrors({});
    try {
      const payload = {
        institute: instituteId,
        teacher: teacherId,
        academic_year: academicYearId,
        program: programId,
        cohort: cohortId || null,
        subject: subjectId,
        assignment_role: assignmentRole,
        is_primary: isPrimary,
        is_active: isActive,
      };
      const response = await fetch(
        editingId
          ? `/api/admin/teacher-assignments/${editingId}`
          : "/api/admin/teacher-assignments",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        const apiFieldErrors: AssignmentFieldErrors = {
          institute: firstError(body.institute),
          teacher: firstError(body.teacher),
          academic_year: firstError(body.academic_year),
          program: firstError(body.program),
          cohort: firstError(body.cohort),
          subject: firstError(body.subject),
          assignment_role: firstError(body.assignment_role),
        };
        setFieldErrors(
          Object.fromEntries(
            Object.entries(apiFieldErrors).filter(([, value]) => Boolean(value)),
          ) as AssignmentFieldErrors,
        );
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : "Assignment could not be saved. Review the highlighted fields.",
        );
      }
      setMessage(editingId ? "Assignment updated successfully." : "Assignment created successfully.");
      closeDialog();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveAssignment(item: TeacherAssignmentRecord) {
    if (
      !window.confirm(
        `Archive assignment for ${lookup.teacherNames.get(item.teacher) ?? "this teacher"}? This will mark the assignment inactive.`,
      )
    ) {
      return;
    }

    setArchivingId(item.id);
    setMessage("");
    setFieldErrors({});

    try {
      const response = await fetch(`/api/admin/teacher-assignments/${item.id}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : "Assignment could not be archived right now.",
        );
      }
      setMessage("Assignment archived successfully.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Archive failed.");
    } finally {
      setArchivingId(null);
    }
  }

  async function restoreAssignment(item: TeacherAssignmentRecord) {
    setRestoringId(item.id);
    setMessage("");
    setFieldErrors({});

    try {
      const response = await fetch(`/api/admin/teacher-assignments/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacher: item.teacher,
          academic_year: item.academic_year,
          program: item.program,
          cohort: item.cohort,
          subject: item.subject,
          assignment_role: item.assignment_role,
          is_primary: item.is_primary,
          is_active: true,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : "Assignment could not be restored right now.",
        );
      }
      setMessage("Assignment restored successfully.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setRestoringId(null);
    }
  }

  if (!instituteId) {
    return (
      <article className="dashboardPanel academicSectionPanel">
        <div className="studentPageTight">
          <div className="academicSectionHeader">
            <strong>Teacher assignments</strong>
            <span className="setupFieldMeta">0 records</span>
          </div>
          <div className="featurePlaceholder">
            <p>Teacher assignments belong to a specific institute scope.</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="dashboardPanel academicSectionPanel">
      <div className="studentPageTight">
        <div className="academicSectionHeader">
          <strong>Teacher assignments</strong>
          <div className="academicSectionHeaderActions">
            <span className="setupFieldMeta">{visibleAssignments.length} visible</span>
            <label className="setupToggle">
              <input
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                type="checkbox"
              />
              <span>Show archived</span>
            </label>
            <button className="appTopbarAction" onClick={openCreateDialog} type="button">
              <span className="appTopbarActionIcon" aria-hidden="true">
                +
              </span>
              Add
            </button>
          </div>
        </div>

        {message ? <p className="authMeta">{message}</p> : null}

        <div className="academicRecordList">
          {visibleAssignments.length > 0 ? (
            <div className="adminPeopleRosterTableWrap academicRecordTableWrap">
              <table className="adminPeopleRosterTable academicRecordTable">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Academic year</th>
                    <th>Program / subject</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAssignments.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{lookup.teacherNames.get(item.teacher) ?? "Unknown teacher"}</strong>
                      </td>
                      <td>
                        <strong>{lookup.yearNames.get(item.academic_year) ?? "Unknown academic year"}</strong>
                      </td>
                      <td>
                        <strong>{lookup.programNames.get(item.program) ?? "Unknown program"}</strong>
                        <small>
                          {lookup.subjectNames.get(item.subject) ?? "Unknown subject"}
                          {item.cohort ? ` • ${lookup.cohortNames.get(item.cohort) ?? "Unknown cohort"}` : ""}
                        </small>
                      </td>
                      <td>
                        <span className="setupFieldMeta">
                          {item.is_active
                            ? item.assignment_role.replaceAll("_", " ")
                            : `Archived • ${item.assignment_role.replaceAll("_", " ")}`}
                        </span>
                      </td>
                      <td>
                        <div className="adminPeopleRosterActionLane academicRecordActionLane">
                          <button className="appTopbarAction" onClick={() => startEdit(item)} type="button">
                            <span className="appTopbarActionIcon" aria-hidden="true">
                              ✎
                            </span>
                            Edit
                          </button>
                          <button
                            className="appTopbarAction setupSecondaryAction"
                            disabled={archivingId === item.id || !item.is_active}
                            onClick={() => void archiveAssignment(item)}
                            type="button"
                          >
                            <span className="appTopbarActionIcon" aria-hidden="true">
                              ⊖
                            </span>
                            {archivingId === item.id ? "Archiving..." : "Archive"}
                          </button>
                          <button
                            className="appTopbarAction"
                            disabled={restoringId === item.id || item.is_active}
                            onClick={() => void restoreAssignment(item)}
                            type="button"
                          >
                            <span className="appTopbarActionIcon" aria-hidden="true">
                              ⊕
                            </span>
                            {restoringId === item.id ? "Restoring..." : "Restore"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="featurePlaceholder">
              <p>{showArchived ? "No teacher assignments exist yet." : "No active teacher assignments are visible."}</p>
            </div>
          )}
        </div>
      </div>

      {dialogOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="rosterImportOverlay" onClick={closeDialog} role="presentation">
              <div
                aria-modal="true"
                className="rosterImportDialog dashboardPanel adminAcademicModal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <div className="studentPageTight adminAcademicModalInner">
                  <div className="academicSectionHeader adminAcademicModalHeader">
                    <div>
                      <span className="eyebrow">Teacher assignments</span>
                      <h3>{editingId ? "Edit teacher assignment" : "Add teacher assignment"}</h3>
                    </div>
                    <button className="appTopbarAction setupSecondaryAction" onClick={closeDialog} type="button">
                      Close
                    </button>
                  </div>

                  {message ? <div className="featurePlaceholder adminAcademicModalMessage"><p>{message}</p></div> : null}

                  <div className="setupFormGrid setupFormGridDense adminAcademicCompactForm adminAcademicModalBody">
                    <label className="setupField">
                      <span>Teacher</span>
                      <select
                        aria-invalid={Boolean(fieldErrors.teacher)}
                        className={fieldErrors.teacher ? "setupFieldInvalid" : undefined}
                        value={teacherId}
                        onChange={(event) => {
                          setTeacherId(event.target.value);
                          setFieldErrors((current) => ({ ...current, teacher: "" }));
                        }}
                      >
                        <option value="">Select teacher</option>
                        {teachers.map((item) => (
                          <option key={item.id} value={item.id}>
                            {optionLabel(`${item.full_name} (${item.employee_code})`, item.is_active)}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.teacher ? <small className="setupFieldError">{fieldErrors.teacher}</small> : null}
                    </label>
                    <label className="setupField">
                      <span>Academic year</span>
                      <select
                        aria-invalid={Boolean(fieldErrors.academic_year)}
                        className={fieldErrors.academic_year ? "setupFieldInvalid" : undefined}
                        value={academicYearId}
                        onChange={(event) => {
                          setAcademicYearId(event.target.value);
                          setFieldErrors((current) => ({ ...current, academic_year: "" }));
                        }}
                      >
                        <option value="">Select academic year</option>
                        {academicYears.map((item) => (
                          <option key={item.id} value={item.id}>
                            {optionLabel(item.name, item.is_active)}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.academic_year ? <small className="setupFieldError">{fieldErrors.academic_year}</small> : null}
                    </label>
                    <label className="setupField">
                      <span>Program</span>
                      <select
                        aria-invalid={Boolean(fieldErrors.program)}
                        className={fieldErrors.program ? "setupFieldInvalid" : undefined}
                        value={programId}
                        onChange={(event) => {
                          setProgramId(event.target.value);
                          setCohortId("");
                          setSubjectId("");
                          setFieldErrors((current) => ({
                            ...current,
                            program: "",
                            cohort: "",
                            subject: "",
                          }));
                        }}
                      >
                        <option value="">Select program</option>
                        {programs.map((item) => (
                          <option key={item.id} value={item.id}>
                            {optionLabel(`${item.name} (${item.code})`, item.is_active)}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.program ? <small className="setupFieldError">{fieldErrors.program}</small> : null}
                    </label>
                    <label className="setupField">
                      <span>Cohort</span>
                      <select
                        aria-invalid={Boolean(fieldErrors.cohort)}
                        className={fieldErrors.cohort ? "setupFieldInvalid" : undefined}
                        value={cohortId}
                        onChange={(event) => {
                          setCohortId(event.target.value);
                          setFieldErrors((current) => ({ ...current, cohort: "" }));
                        }}
                      >
                        <option value="">No cohort</option>
                        {cohortOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {optionLabel(item.name, item.is_active)}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.cohort ? <small className="setupFieldError">{fieldErrors.cohort}</small> : null}
                    </label>
                    <label className="setupField">
                      <span>Subject</span>
                      <select
                        aria-invalid={Boolean(fieldErrors.subject)}
                        className={fieldErrors.subject ? "setupFieldInvalid" : undefined}
                        value={subjectId}
                        onChange={(event) => {
                          setSubjectId(event.target.value);
                          setFieldErrors((current) => ({ ...current, subject: "" }));
                        }}
                      >
                        <option value="">Select subject</option>
                        {subjectOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {optionLabel(item.name, item.is_active)}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.subject ? <small className="setupFieldError">{fieldErrors.subject}</small> : null}
                    </label>
                    <label className="setupField">
                      <span>Assignment role</span>
                      <select
                        aria-invalid={Boolean(fieldErrors.assignment_role)}
                        className={fieldErrors.assignment_role ? "setupFieldInvalid" : undefined}
                        value={assignmentRole}
                        onChange={(event) => {
                          setAssignmentRole(event.target.value);
                          setFieldErrors((current) => ({ ...current, assignment_role: "" }));
                        }}
                      >
                        <option value="main_teacher">Main Teacher</option>
                        <option value="assistant">Assistant</option>
                        <option value="mentor">Mentor</option>
                      </select>
                      {fieldErrors.assignment_role ? <small className="setupFieldError">{fieldErrors.assignment_role}</small> : null}
                    </label>
                  </div>

                  <div className="setupToggleGrid adminAcademicCompactToggleGrid">
                    <label className="setupToggle setupToggleWide">
                      <input checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} type="checkbox" />
                      <span>Primary assignment</span>
                    </label>
                    <label className="setupToggle setupToggleWide">
                      <input checked={isActive} onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="setupFieldActions adminAcademicFieldActions adminAcademicModalFooter">
                    <button className="appTopbarAction" disabled={saving} onClick={() => void saveAssignment()} type="button">
                      <span className="appTopbarActionIcon" aria-hidden="true">⌘</span>
                      {saving ? "Saving..." : editingId ? "Update assignment" : "Create assignment"}
                    </button>
                    <button className="appTopbarAction setupSecondaryAction" disabled={saving} onClick={closeDialog} type="button">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}
