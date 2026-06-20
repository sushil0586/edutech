"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  TeacherAssignmentWorkspace,
  type TeacherAssignmentRecord,
  type TeacherRecord,
} from "@/components/admin/teacher-assignment-workspace";
import { WorkspaceTabs, type WorkspaceTab } from "@/components/ui/workspace-tabs";

export type AcademicSetupTabId =
  | "academic-years"
  | "programs"
  | "cohorts"
  | "subjects"
  | "topics"
  | "teacher-assignments";

type DraftValue = string | boolean;
type DraftState = Record<string, DraftValue>;

type FieldOption = {
  label: string;
  value: string;
};

type FieldSpec = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "checkbox" | "select";
  placeholder?: string;
  helper?: string;
  options?: FieldOption[];
};

type AcademicFieldErrors = Record<string, string>;

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

export type AcademicYearRecord = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
};

export type ProgramRecord = {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export type CohortRecord = {
  id: string;
  program: string;
  academic_year: string;
  name: string;
  code: string;
  capacity: number | null;
  is_active: boolean;
};

export type SubjectRecord = {
  id: string;
  program: string | null;
  name: string;
  code: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export type TopicRecord = {
  id: string;
  subject: string;
  parent_topic: string | null;
  name: string;
  code: string;
  description: string;
  difficulty_level: string;
  sort_order: number;
  is_active: boolean;
};

type LookupMaps = {
  programNames: Map<string, string>;
  yearNames: Map<string, string>;
  subjectNames: Map<string, string>;
  topicNames: Map<string, string>;
};

type SectionConfig<TItem> = {
  resource: "academic-years" | "programs" | "cohorts" | "subjects" | "topics";
  title: string;
  tableColumns: [string, string, string];
  fields: FieldSpec[];
  emptyDraft: () => DraftState;
  fromItem: (item: TItem) => DraftState;
  buildCreatePayload: (draft: DraftState, instituteId: string | null) => Record<string, unknown>;
  buildUpdatePayload: (draft: DraftState, item: TItem, instituteId: string | null) => Record<string, unknown>;
  renderItem: (item: TItem, lookup: LookupMaps) => {
    title: string;
    lines: string[];
    badge?: string;
  };
};

function stringValue(value: DraftValue | undefined) {
  return typeof value === "boolean" ? String(value) : value ?? "";
}

function booleanValue(value: DraftValue | undefined) {
  return Boolean(value);
}

function toNumberOrNull(value: DraftValue | undefined) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AcademicEntitySection<TItem>({
  academicsApiBasePath,
  instituteId,
  items,
  lookup,
  config,
}: {
  academicsApiBasePath: string;
  instituteId: string | null;
  items: TItem[];
  lookup: LookupMaps;
  config: SectionConfig<TItem>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(config.emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AcademicFieldErrors>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  const visibleItems = showArchived ? items : items.filter((item) => getItemIsActive(item));

  function updateField(key: string, value: DraftValue) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }

  function startEdit(item: TItem, itemId: string) {
    setEditingId(itemId);
    setDraft(config.fromItem(item));
    setMessage("");
    setFieldErrors({});
    setDialogOpen(true);
  }

  const resetForm = useCallback(() => {
    setEditingId(null);
    setDraft(config.emptyDraft());
    setMessage("");
    setFieldErrors({});
  }, [config]);

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

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

  async function persist() {
    if (!instituteId) {
      setFieldErrors({ institute: "Select an institute before saving academic records." });
      setMessage("Select an institute before saving academic records.");
      return;
    }

    setSaving(true);
    setMessage("");
    setFieldErrors({});

    const currentItem = items.find((item) => getItemId(item) === editingId);
    if (editingId !== null && !currentItem) {
      setSaving(false);
      setMessage("The selected record could not be loaded for editing.");
      return;
    }

    const payload =
      editingId === null
        ? config.buildCreatePayload(draft, instituteId)
        : config.buildUpdatePayload(draft, currentItem as TItem, instituteId);

    try {
      const response = await fetch(
        editingId === null
          ? `${academicsApiBasePath}/${config.resource}`
          : `${academicsApiBasePath}/${config.resource}/${editingId}`,
        {
          method: editingId === null ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        const apiFieldErrors = Object.fromEntries(
          config.fields
            .map((field) => [field.key, firstError(body[field.key])] as const)
            .filter(([, value]) => Boolean(value)),
        ) as AcademicFieldErrors;
        setFieldErrors(apiFieldErrors);
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : "Record could not be saved. Review the highlighted fields.",
        );
      }

      setMessage(
        editingId === null
          ? `${config.title} created successfully.`
          : `${config.title} updated successfully.`,
      );
      closeDialog();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveItem(itemId: string, itemTitle: string) {
    if (!window.confirm(`Archive ${itemTitle}? This will mark the record inactive.`)) {
      return;
    }

    setArchivingId(itemId);
    setMessage("");
    setFieldErrors({});

    try {
      const response = await fetch(`${academicsApiBasePath}/${config.resource}/${itemId}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `${config.title} could not be archived right now.`,
        );
      }
      setMessage(`${itemTitle} archived successfully.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Archive failed.");
    } finally {
      setArchivingId(null);
    }
  }

  async function restoreItem(item: TItem, itemId: string, itemTitle: string) {
    setRestoringId(itemId);
    setMessage("");
    setFieldErrors({});

    try {
      const restoredDraft = {
        ...config.fromItem(item),
        is_active: true,
      };
      const response = await fetch(`${academicsApiBasePath}/${config.resource}/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config.buildUpdatePayload(restoredDraft, item, instituteId)),
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `${config.title} could not be restored right now.`,
        );
      }
      setMessage(`${itemTitle} restored successfully.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setRestoringId(null);
    }
  }

  const isDisabled = !instituteId;

  return (
    <article className="dashboardPanel academicSectionPanel">
      <div className="studentPageTight">
        <div className="academicSectionHeader">
          <strong>{config.title}</strong>
          <div className="academicSectionHeaderActions">
            <span className="setupFieldMeta">{visibleItems.length} visible</span>
            <label className="setupToggle">
              <input
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                type="checkbox"
              />
              <span>
                Show archived
              </span>
            </label>
            <button
              className="appTopbarAction"
              disabled={isDisabled}
              onClick={openCreateDialog}
              type="button"
            >
              <span className="appTopbarActionIcon" aria-hidden="true">
                +
              </span>
              Add
            </button>
          </div>
        </div>

        {isDisabled ? (
          <div className="featurePlaceholder">
            <p>Select an institute to manage academic records.</p>
          </div>
        ) : null}

        {message ? <p className="authMeta">{message}</p> : null}

        <div className="academicRecordList">
          {visibleItems.length > 0 ? (
            <div className="adminPeopleRosterTableWrap academicRecordTableWrap">
              <table className="adminPeopleRosterTable academicRecordTable">
                <thead>
                  <tr>
                    <th>{config.tableColumns[0]}</th>
                    <th>{config.tableColumns[1]}</th>
                    <th>{config.tableColumns[2]}</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => {
                    const itemId = getItemId(item);
                    const summary = config.renderItem(item, lookup);
                    const isActive = getItemIsActive(item);
                    return (
                      <tr key={itemId}>
                        <td>
                          <strong>{summary.title}</strong>
                        </td>
                        <td>
                          <strong>{summary.lines[0] ?? "-"}</strong>
                        </td>
                        <td>
                          <strong>{summary.lines[1] ?? "-"}</strong>
                          {summary.lines[2] ? <small>{summary.lines[2]}</small> : null}
                        </td>
                        <td>
                          {summary.badge ? (
                            <span className="setupFieldMeta">{summary.badge}</span>
                          ) : (
                            <small>-</small>
                          )}
                        </td>
                        <td>
                          <div className="adminPeopleRosterActionLane academicRecordActionLane">
                            <button
                              className="appTopbarAction"
                              onClick={() => startEdit(item, itemId)}
                              type="button"
                            >
                              <span className="appTopbarActionIcon" aria-hidden="true">
                                ✎
                              </span>
                              Edit
                            </button>
                            <button
                              className="appTopbarAction setupSecondaryAction"
                              disabled={archivingId === itemId || !isActive}
                              onClick={() => void archiveItem(itemId, summary.title)}
                              type="button"
                            >
                              <span className="appTopbarActionIcon" aria-hidden="true">
                                ⊖
                              </span>
                              {archivingId === itemId ? "Archiving..." : "Archive"}
                            </button>
                            <button
                              className="appTopbarAction"
                              disabled={restoringId === itemId || isActive}
                              onClick={() => void restoreItem(item, itemId, summary.title)}
                              type="button"
                            >
                              <span className="appTopbarActionIcon" aria-hidden="true">
                                ⊕
                              </span>
                              {restoringId === itemId ? "Restoring..." : "Restore"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="featurePlaceholder">
              <p>{showArchived ? "No records exist yet for this section." : "No active records are visible in this section."}</p>
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
                      <span className="eyebrow">{config.title}</span>
                      <h3>{editingId ? `Edit ${config.title}` : `Add ${config.title}`}</h3>
                    </div>
                    <button
                      className="appTopbarAction setupSecondaryAction"
                      onClick={closeDialog}
                      type="button"
                    >
                      Close
                    </button>
                  </div>

                  {message ? <div className="featurePlaceholder adminAcademicModalMessage"><p>{message}</p></div> : null}

                  <div className="setupFormGrid setupFormGridDense adminAcademicCompactForm adminAcademicModalBody">
                    {config.fields.map((field) => {
                      const value = draft[field.key];
                      if (field.type === "checkbox") {
                        return (
                          <label key={field.key} className="setupToggle setupToggleWide">
                            <input
                              type="checkbox"
                              checked={booleanValue(value)}
                              onChange={(event) => updateField(field.key, event.target.checked)}
                            />
                            <span>
                              {field.label}
                              {field.helper ? <small>{field.helper}</small> : null}
                            </span>
                          </label>
                        );
                      }

                      return (
                        <label key={field.key} className="setupField">
                          <span>{field.label}</span>
                          {field.type === "textarea" ? (
                            <textarea
                              aria-invalid={Boolean(fieldErrors[field.key])}
                              className={fieldErrors[field.key] ? "setupFieldInvalid" : undefined}
                              placeholder={field.placeholder}
                              rows={4}
                              value={stringValue(value)}
                              onChange={(event) => updateField(field.key, event.target.value)}
                            />
                          ) : field.type === "select" ? (
                            <select
                              aria-invalid={Boolean(fieldErrors[field.key])}
                              className={fieldErrors[field.key] ? "setupFieldInvalid" : undefined}
                              value={stringValue(value)}
                              onChange={(event) => updateField(field.key, event.target.value)}
                            >
                              <option value="">{field.placeholder ?? "Select an option"}</option>
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              aria-invalid={Boolean(fieldErrors[field.key])}
                              className={fieldErrors[field.key] ? "setupFieldInvalid" : undefined}
                              type={field.type}
                              placeholder={field.placeholder}
                              value={stringValue(value)}
                              onChange={(event) => updateField(field.key, event.target.value)}
                            />
                          )}
                          {fieldErrors[field.key] ? (
                            <small className="setupFieldError">{fieldErrors[field.key]}</small>
                          ) : null}
                          {field.helper ? <small>{field.helper}</small> : null}
                        </label>
                      );
                    })}
                  </div>

                  <div className="setupFieldActions adminAcademicFieldActions adminAcademicModalFooter">
                    <button
                      className="appTopbarAction"
                      disabled={saving}
                      onClick={() => void persist()}
                      type="button"
                    >
                      <span className="appTopbarActionIcon" aria-hidden="true">
                        ⌘
                      </span>
                      {saving ? "Saving..." : editingId ? "Update record" : "Create record"}
                    </button>
                    <button
                      className="appTopbarAction setupSecondaryAction"
                      disabled={saving}
                      onClick={closeDialog}
                      type="button"
                    >
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

function getItemId(item: unknown) {
  return (item as { id?: string }).id ?? "";
}

function getItemIsActive(item: unknown) {
  return Boolean((item as { is_active?: boolean }).is_active);
}

function buildLookupMaps({
  academicYears,
  programs,
  subjects,
  topics,
}: {
  academicYears: AcademicYearRecord[];
  programs: ProgramRecord[];
  subjects: SubjectRecord[];
  topics: TopicRecord[];
}): LookupMaps {
  return {
    yearNames: new Map(academicYears.map((item) => [item.id, item.name])),
    programNames: new Map(programs.map((item) => [item.id, item.name])),
    subjectNames: new Map(subjects.map((item) => [item.id, item.name])),
    topicNames: new Map(topics.map((item) => [item.id, item.name])),
  };
}

function formatDateRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    return "No dates set";
  }
  return `${startDate || "?"} to ${endDate || "?"}`;
}

export function AcademicSetupWorkspace({
  academicsApiBasePath = "/api/admin/academics",
  instituteId,
  academicYears,
  programs,
  cohorts,
  subjects,
  topics,
  teachers,
  assignments,
  activeTab,
}: {
  academicsApiBasePath?: string;
  instituteId: string | null;
  academicYears: AcademicYearRecord[];
  programs: ProgramRecord[];
  cohorts: CohortRecord[];
  subjects: SubjectRecord[];
  topics: TopicRecord[];
  teachers: TeacherRecord[];
  assignments: TeacherAssignmentRecord[];
  activeTab?: AcademicSetupTabId;
}) {
  const lookup = buildLookupMaps({ academicYears, programs, subjects, topics });
  const programOptions = programs.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id }));
  const yearOptions = academicYears.map((item) => ({ label: item.name, value: item.id }));
  const subjectOptions = subjects.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id }));
  const topicOptions = topics.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id }));

  const academicYearConfig: SectionConfig<AcademicYearRecord> = {
    resource: "academic-years",
    title: "Academic years",
    tableColumns: ["Year", "Window", "State"],
    fields: [
      { key: "name", label: "Year name", type: "text", placeholder: "2025-26" },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "end_date", label: "End date", type: "date" },
      { key: "is_current", label: "Current year", type: "checkbox", helper: "Marks the active academic cycle." },
      { key: "is_active", label: "Active", type: "checkbox", helper: "Inactive items stay archived but visible." },
    ],
    emptyDraft: () => ({
      name: "",
      start_date: "",
      end_date: "",
      is_current: true,
      is_active: true,
    }),
    fromItem: (item) => ({
      name: item.name,
      start_date: item.start_date,
      end_date: item.end_date,
      is_current: item.is_current,
      is_active: item.is_active,
    }),
    buildCreatePayload: (draft, instituteIdValue) => ({
      institute: instituteIdValue,
      name: stringValue(draft.name),
      start_date: stringValue(draft.start_date),
      end_date: stringValue(draft.end_date),
      is_current: booleanValue(draft.is_current),
      is_active: booleanValue(draft.is_active),
    }),
    buildUpdatePayload: (draft) => ({
      name: stringValue(draft.name),
      start_date: stringValue(draft.start_date),
      end_date: stringValue(draft.end_date),
      is_current: booleanValue(draft.is_current),
      is_active: booleanValue(draft.is_active),
    }),
    renderItem: (item) => ({
      title: item.name,
      lines: [formatDateRange(item.start_date, item.end_date)],
      badge: item.is_current ? "Current year" : item.is_active ? "Active" : "Inactive",
    }),
  };

  const programConfig: SectionConfig<ProgramRecord> = {
    resource: "programs",
    title: "Programs",
    tableColumns: ["Program", "Category", "Description"],
    fields: [
      { key: "name", label: "Program name", type: "text", placeholder: "JEE Foundation" },
      { key: "code", label: "Program code", type: "text", placeholder: "JEE-FOUND" },
      { key: "category", label: "Category", type: "text", placeholder: "Competitive" },
      { key: "sort_order", label: "Sort order", type: "number", placeholder: "0" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Short internal description." },
      { key: "is_active", label: "Active", type: "checkbox", helper: "Show this program in setup workflows." },
    ],
    emptyDraft: () => ({
      name: "",
      code: "",
      category: "",
      sort_order: "0",
      description: "",
      is_active: true,
    }),
    fromItem: (item) => ({
      name: item.name,
      code: item.code,
      category: item.category,
      sort_order: String(item.sort_order),
      description: item.description,
      is_active: item.is_active,
    }),
    buildCreatePayload: (draft, instituteIdValue) => ({
      institute: instituteIdValue,
      name: stringValue(draft.name),
      code: stringValue(draft.code),
      category: stringValue(draft.category),
      sort_order: toNumberOrNull(draft.sort_order) ?? 0,
      description: stringValue(draft.description),
      is_active: booleanValue(draft.is_active),
    }),
    buildUpdatePayload: (draft) => ({
      name: stringValue(draft.name),
      code: stringValue(draft.code),
      category: stringValue(draft.category),
      sort_order: toNumberOrNull(draft.sort_order) ?? 0,
      description: stringValue(draft.description),
      is_active: booleanValue(draft.is_active),
    }),
    renderItem: (item) => ({
      title: `${item.name} (${item.code})`,
      lines: [item.category || "No category", item.description || "No description"],
      badge: item.is_active ? `Order ${item.sort_order}` : "Inactive",
    }),
  };

  const cohortConfig: SectionConfig<CohortRecord> = {
    resource: "cohorts",
    title: "Cohorts",
    tableColumns: ["Cohort", "Program", "Academic year / capacity"],
    fields: [
      { key: "name", label: "Cohort name", type: "text", placeholder: "A1 - 2025" },
      { key: "code", label: "Cohort code", type: "text", placeholder: "A1-2025" },
      {
        key: "program",
        label: "Program",
        type: "select",
        placeholder: "Select a program",
        options: programOptions,
      },
      {
        key: "academic_year",
        label: "Academic year",
        type: "select",
        placeholder: "Select an academic year",
        options: yearOptions,
      },
      { key: "capacity", label: "Capacity", type: "number", placeholder: "30" },
      { key: "is_active", label: "Active", type: "checkbox", helper: "Inactive cohorts stay archived." },
    ],
    emptyDraft: () => ({
      name: "",
      code: "",
      program: "",
      academic_year: "",
      capacity: "",
      is_active: true,
    }),
    fromItem: (item) => ({
      name: item.name,
      code: item.code,
      program: item.program,
      academic_year: item.academic_year,
      capacity: item.capacity === null ? "" : String(item.capacity),
      is_active: item.is_active,
    }),
    buildCreatePayload: (draft, instituteIdValue) => ({
      institute: instituteIdValue,
      name: stringValue(draft.name),
      code: stringValue(draft.code),
      program: stringValue(draft.program),
      academic_year: stringValue(draft.academic_year),
      capacity: toNumberOrNull(draft.capacity),
      is_active: booleanValue(draft.is_active),
    }),
    buildUpdatePayload: (draft) => ({
      name: stringValue(draft.name),
      code: stringValue(draft.code),
      program: stringValue(draft.program),
      academic_year: stringValue(draft.academic_year),
      capacity: toNumberOrNull(draft.capacity),
      is_active: booleanValue(draft.is_active),
    }),
    renderItem: (item, maps) => ({
      title: `${item.name} (${item.code})`,
      lines: [
        maps.programNames.get(item.program) ?? "Unknown program",
        maps.yearNames.get(item.academic_year) ?? "Unknown academic year",
        item.capacity === null ? "No capacity limit" : `Capacity ${item.capacity}`,
      ],
      badge: item.is_active ? "Active" : "Inactive",
    }),
  };

  const subjectConfig: SectionConfig<SubjectRecord> = {
    resource: "subjects",
    title: "Subjects",
    tableColumns: ["Subject", "Program", "Description"],
    fields: [
      { key: "name", label: "Subject name", type: "text", placeholder: "Mathematics" },
      { key: "code", label: "Subject code", type: "text", placeholder: "MATH" },
      {
        key: "program",
        label: "Program",
        type: "select",
        placeholder: "Optional program",
        options: programOptions,
      },
      { key: "sort_order", label: "Sort order", type: "number", placeholder: "0" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Short internal description." },
      { key: "is_active", label: "Active", type: "checkbox", helper: "Hide inactive catalog items from setup flows." },
    ],
    emptyDraft: () => ({
      name: "",
      code: "",
      program: "",
      sort_order: "0",
      description: "",
      is_active: true,
    }),
    fromItem: (item) => ({
      name: item.name,
      code: item.code,
      program: item.program ?? "",
      sort_order: String(item.sort_order),
      description: item.description,
      is_active: item.is_active,
    }),
    buildCreatePayload: (draft, instituteIdValue) => ({
      institute: instituteIdValue,
      name: stringValue(draft.name),
      code: stringValue(draft.code),
      program: stringValue(draft.program) || null,
      sort_order: toNumberOrNull(draft.sort_order) ?? 0,
      description: stringValue(draft.description),
      is_active: booleanValue(draft.is_active),
    }),
    buildUpdatePayload: (draft) => ({
      name: stringValue(draft.name),
      code: stringValue(draft.code),
      program: stringValue(draft.program) || null,
      sort_order: toNumberOrNull(draft.sort_order) ?? 0,
      description: stringValue(draft.description),
      is_active: booleanValue(draft.is_active),
    }),
    renderItem: (item, maps) => ({
      title: `${item.name} (${item.code})`,
      lines: [
        item.program ? maps.programNames.get(item.program) ?? "Unknown program" : "All programs",
        item.description || "No description",
      ],
      badge: item.is_active ? `Order ${item.sort_order}` : "Inactive",
    }),
  };

  const topicConfig: SectionConfig<TopicRecord> = {
    resource: "topics",
    title: "Topics",
    tableColumns: ["Topic", "Subject", "Hierarchy"],
    fields: [
      { key: "name", label: "Topic name", type: "text", placeholder: "Quadratic equations" },
      { key: "code", label: "Topic code", type: "text", placeholder: "MATH-QUAD" },
      {
        key: "subject",
        label: "Subject",
        type: "select",
        placeholder: "Select a subject",
        options: subjectOptions,
      },
      {
        key: "parent_topic",
        label: "Parent topic",
        type: "select",
        placeholder: "Optional parent topic",
        options: topicOptions,
      },
      {
        key: "difficulty_level",
        label: "Difficulty",
        type: "select",
        placeholder: "Choose difficulty",
        options: [
          { label: "Foundation", value: "foundation" },
          { label: "Intermediate", value: "intermediate" },
          { label: "Advanced", value: "advanced" },
        ],
      },
      { key: "sort_order", label: "Sort order", type: "number", placeholder: "0" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Short internal description." },
      { key: "is_active", label: "Active", type: "checkbox", helper: "Show this topic in the catalog." },
    ],
    emptyDraft: () => ({
      name: "",
      code: "",
      subject: "",
      parent_topic: "",
      difficulty_level: "intermediate",
      sort_order: "0",
      description: "",
      is_active: true,
    }),
    fromItem: (item) => ({
      name: item.name,
      code: item.code,
      subject: item.subject,
      parent_topic: item.parent_topic ?? "",
      difficulty_level: item.difficulty_level,
      sort_order: String(item.sort_order),
      description: item.description,
      is_active: item.is_active,
    }),
    buildCreatePayload: (draft, instituteIdValue) => ({
      institute: instituteIdValue,
      name: stringValue(draft.name),
      code: stringValue(draft.code),
      subject: stringValue(draft.subject),
      parent_topic: stringValue(draft.parent_topic) || null,
      difficulty_level: stringValue(draft.difficulty_level),
      sort_order: toNumberOrNull(draft.sort_order) ?? 0,
      description: stringValue(draft.description),
      is_active: booleanValue(draft.is_active),
    }),
    buildUpdatePayload: (draft) => ({
      name: stringValue(draft.name),
      code: stringValue(draft.code),
      subject: stringValue(draft.subject),
      parent_topic: stringValue(draft.parent_topic) || null,
      difficulty_level: stringValue(draft.difficulty_level),
      sort_order: toNumberOrNull(draft.sort_order) ?? 0,
      description: stringValue(draft.description),
      is_active: booleanValue(draft.is_active),
    }),
    renderItem: (item, maps) => ({
      title: `${item.name} (${item.code})`,
      lines: [
        maps.subjectNames.get(item.subject) ?? "Unknown subject",
        item.parent_topic ? `Parent: ${maps.topicNames.get(item.parent_topic) ?? "Unknown topic"}` : "No parent topic",
      ],
      badge: item.is_active ? item.difficulty_level : "Inactive",
    }),
  };

  const tabs: WorkspaceTab[] = [
      {
        id: "academic-years" as const,
        label: "Academic years",
        count: academicYears.length,
        content: (
          <AcademicEntitySection
            academicsApiBasePath={academicsApiBasePath}
            config={academicYearConfig}
            instituteId={instituteId}
            items={academicYears}
            lookup={lookup}
          />
        ),
      },
      {
        id: "programs" as const,
        label: "Programs",
        count: programs.length,
        content: (
          <AcademicEntitySection
            academicsApiBasePath={academicsApiBasePath}
            config={programConfig}
            instituteId={instituteId}
            items={programs}
            lookup={lookup}
          />
        ),
      },
      {
        id: "cohorts" as const,
        label: "Cohorts",
        count: cohorts.length,
        content: (
          <AcademicEntitySection
            academicsApiBasePath={academicsApiBasePath}
            config={cohortConfig}
            instituteId={instituteId}
            items={cohorts}
            lookup={lookup}
          />
        ),
      },
      {
        id: "subjects" as const,
        label: "Subjects",
        count: subjects.length,
        content: (
          <AcademicEntitySection
            academicsApiBasePath={academicsApiBasePath}
            config={subjectConfig}
            instituteId={instituteId}
            items={subjects}
            lookup={lookup}
          />
        ),
      },
      {
        id: "topics" as const,
        label: "Topics",
        count: topics.length,
        content: (
          <AcademicEntitySection
            academicsApiBasePath={academicsApiBasePath}
            config={topicConfig}
            instituteId={instituteId}
            items={topics}
            lookup={lookup}
          />
        ),
      },
      {
        id: "teacher-assignments" as const,
        label: "Teacher assignments",
        count: assignments.length,
        content: (
          <TeacherAssignmentWorkspace
            academicYears={academicYears}
            assignments={assignments}
            cohorts={cohorts}
            instituteId={instituteId}
            programs={programs}
            subjects={subjects}
            teachers={teachers}
          />
        ),
      },
    ];

  if (activeTab) {
    const selectedTab = tabs.find((tab) => tab.id === activeTab);
    return <section className="academicTabsShell">{selectedTab?.content ?? null}</section>;
  }

  return (
    <section className="academicTabsShell">
      <WorkspaceTabs tabs={tabs} defaultTabId="academic-years" />
    </section>
  );
}
