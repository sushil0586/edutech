"use client";

import { useMemo, useState } from "react";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import type { LookupStudent } from "@/lib/api/teacher-builder";

type BuilderAction = (formData: FormData) => void | Promise<void>;

type AssignmentModeOption = {
  value: string;
  label: string;
};

type BuilderStudentAssignmentSelectorProps = {
  action: BuilderAction;
  assignmentMode: string;
  assignmentModeOptions: AssignmentModeOption[];
  cohortName: string | null;
  examId: string;
  initialSelectedStudentIds: string[];
  students: LookupStudent[];
};

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

export function BuilderStudentAssignmentSelector({
  action,
  assignmentMode,
  assignmentModeOptions,
  cohortName,
  examId,
  initialSelectedStudentIds,
  students,
}: BuilderStudentAssignmentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedStudentIds);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredStudents = useMemo(() => {
    if (!normalizedSearch) {
      return students;
    }

    return students.filter((student) => {
      const haystack = `${student.full_name} ${student.admission_no}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, students]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredSelectedCount = filteredStudents.filter((student) => selectedIdSet.has(student.id)).length;

  function toggleStudent(studentId: string) {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  function selectAllStudents() {
    setSelectedIds(students.map((student) => student.id));
  }

  function clearAllStudents() {
    setSelectedIds([]);
  }

  function selectVisibleStudents() {
    setSelectedIds((current) =>
      Array.from(new Set([...current, ...filteredStudents.map((student) => student.id)])),
    );
  }

  function clearVisibleStudents() {
    const visibleIds = new Set(filteredStudents.map((student) => student.id));
    setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
  }

  return (
    <form action={action} className="builderForm">
      <input name="exam_id" type="hidden" value={examId} />
      {selectedIds.map((studentId) => (
        <input key={studentId} name="student_ids" type="hidden" value={studentId} />
      ))}

      <div className="builderComposerGrid">
        <label className="fieldStack">
          <span>Assignment mode</span>
          <select defaultValue={assignmentMode} name="assignment_mode">
            {assignmentModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="builderMiniBanner">
          <div>
            <strong>Current targeting</strong>
            <span>{titleCase(assignmentMode)} · {cohortName ?? "All eligible cohorts in scope"}</span>
          </div>
        </div>
      </div>

      <div className="builderQuickAttachTopbar assignmentRosterToolbar">
        <label className="fieldStack assignmentRosterSearchField">
          <span>Find learners</span>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by learner name or admission number"
            type="search"
            value={searchTerm}
          />
        </label>

        <div className="builderQuestionToolbarActions assignmentRosterActions">
          <button className="button buttonGhost" onClick={selectVisibleStudents} type="button">
            Select Visible
          </button>
          <button className="button buttonGhost" onClick={clearVisibleStudents} type="button">
            Clear Visible
          </button>
          <button className="button buttonGhost" onClick={selectAllStudents} type="button">
            Select All
          </button>
          <button className="button buttonGhost" onClick={clearAllStudents} type="button">
            Clear All
          </button>
        </div>
      </div>

      <div className="builderQuestionOverviewGrid assignmentRosterSummaryGrid">
        <article className="builderQuestionOverviewCard">
          <span>Selected</span>
          <strong>{selectedIds.length}</strong>
          <p>{students.length} learners available in current scope.</p>
        </article>
        <article className="builderQuestionOverviewCard">
          <span>Visible</span>
          <strong>{filteredStudents.length}</strong>
          <p>{filteredSelectedCount} visible learner(s) are selected right now.</p>
        </article>
        <article className="builderQuestionOverviewCard">
          <span>Search state</span>
          <strong>{normalizedSearch ? "Filtered" : "Full list"}</strong>
          <p>{normalizedSearch ? `Showing matches for "${searchTerm}".` : "Showing the full learner roster."}</p>
        </article>
      </div>

      <div className="selectionList">
        {filteredStudents.map((student) => (
          <label className="selectionRow" key={student.id}>
            <input
              checked={selectedIdSet.has(student.id)}
              onChange={() => toggleStudent(student.id)}
              type="checkbox"
            />
            <div>
              <strong>{student.full_name}</strong>
              <span>{student.admission_no}</span>
            </div>
          </label>
        ))}

        {!filteredStudents.length ? (
          <div className="builderEmptyState">
            <strong>No learners match this search</strong>
            <p>Try a different name fragment or admission number, or clear the search to restore the full list.</p>
          </div>
        ) : null}
      </div>

      <div className="settingsActionRow">
        <ActionSubmitButton
          className="button buttonPrimary"
          idleLabel="Save Assignment"
          pendingLabel="Saving Assignment..."
        />
      </div>
    </form>
  );
}
