"use client";

import { useMemo, useState } from "react";
import { AccountActionButtons } from "@/components/admin/account-action-buttons";
import { StudentEditDialog } from "@/components/admin/student-edit-dialog";
import { TeacherEditDialog } from "@/components/admin/teacher-edit-dialog";

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
  academic_year: string;
  name: string;
  is_active: boolean;
};

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
  guardian_name?: string;
  guardian_phone?: string;
  address?: string;
  joined_at?: string | null;
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

type RosterStatusFilter =
  | "all"
  | "login-ready"
  | "no-login"
  | "login-disabled"
  | "active"
  | "inactive";
type RosterNameSort = "name-asc" | "name-desc";

type RosterBrowserProps = {
  resource: "students" | "teachers";
  rows: StudentRosterRow[] | TeacherRosterRow[];
  emptyMessage: string;
  title: string;
  cohortNames?: Map<string, string>;
  academicYears?: AcademicYearRecord[];
  programs?: ProgramRecord[];
  cohorts?: CohortRecord[];
};

function toCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const csv = [header, ...rows]
    .map((row) => row.map((value) => toCsvValue(value)).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function RosterBrowser({
  resource,
  rows,
  emptyMessage,
  title,
  cohortNames,
  academicYears = [],
  programs = [],
  cohorts = [],
}: RosterBrowserProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RosterStatusFilter>("all");
  const [nameSort, setNameSort] = useState<RosterNameSort>("name-asc");

  const filteredRows = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    return rows
      .filter((row) => {
        const haystack = [
          row.full_name,
          row.email,
          row.phone,
          row.login_username,
          row.hasOwnProperty("admission_no") ? (row as StudentRosterRow).admission_no : "",
          row.hasOwnProperty("employee_code") ? (row as TeacherRosterRow).employee_code : "",
          row.hasOwnProperty("cohort") ? (row as StudentRosterRow).cohort ?? "" : "",
          row.hasOwnProperty("specialization") ? (row as TeacherRosterRow).specialization : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = searchTerm.length === 0 || haystack.includes(searchTerm);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "login-ready"
            ? row.has_login
            : statusFilter === "no-login"
              ? !row.has_login
              : statusFilter === "login-disabled"
                ? row.has_login && !row.login_is_active
                : statusFilter === "active"
                  ? row.is_active
                  : !row.is_active);

        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        const value = left.full_name.localeCompare(right.full_name);
        return nameSort === "name-asc" ? value : -value;
      });
  }, [nameSort, query, rows, statusFilter]);
  const loginReadyCount = filteredRows.filter((row) => row.has_login).length;
  const noLoginCount = filteredRows.length - loginReadyCount;

  function handleExport() {
    if (resource === "students") {
      const csvRows = (filteredRows as StudentRosterRow[]).map((row) => [
        row.full_name,
        row.admission_no,
        row.email,
        row.phone,
        row.cohort ?? "",
        row.is_active ? "Active" : "Inactive",
        row.has_login ? "Yes" : "No",
        row.login_username ?? "",
      ]);

      downloadCsv(
        "students-roster.csv",
        ["Name", "Admission No", "Email", "Phone", "Cohort", "Status", "Login Ready", "Username"],
        csvRows,
      );
      return;
    }

    const csvRows = (filteredRows as TeacherRosterRow[]).map((row) => [
      row.full_name,
      row.employee_code,
      row.email,
      row.phone,
      row.specialization,
      row.is_active ? "Active" : "Inactive",
      row.has_login ? "Yes" : "No",
      row.login_username ?? "",
    ]);

    downloadCsv(
      "teachers-roster.csv",
      ["Name", "Employee Code", "Email", "Phone", "Specialization", "Status", "Login Ready", "Username"],
      csvRows,
    );
  }

  return (
    <div className="studentPageTight adminPeopleRosterBrowser">
      <div className="rosterBrowserHeader">
        <div>
          <span className="eyebrow">{resource === "students" ? "Students" : "Teachers"}</span>
          <h3>{title}</h3>
          <p className="academicSectionDescription">
            Search the roster, narrow by login status, and export the current view for offline coordination.
          </p>
          <div className="adminPeopleRosterMetaPills">
            <span>{filteredRows.length} visible</span>
            <span>{loginReadyCount} login ready</span>
            <span>{noLoginCount} pending access</span>
          </div>
        </div>

        <div className="rosterBrowserActions">
          <label className="rosterSearchField">
            <span className="srOnly">Search roster</span>
            <input
              aria-label="Search roster"
              className="rosterSearchInput"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, phone, or code"
              value={query}
            />
          </label>

          <select
            aria-label="Filter login status"
            className="rosterFilterSelect"
            onChange={(event) => setStatusFilter(event.target.value as RosterStatusFilter)}
            value={statusFilter}
          >
            <option value="all">All records</option>
            <option value="login-ready">Login ready</option>
            <option value="no-login">No login</option>
            <option value="login-disabled">Login disabled</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>

          <select
            aria-label="Sort by name"
            className="rosterFilterSelect"
            onChange={(event) => setNameSort(event.target.value as RosterNameSort)}
            value={nameSort}
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>

          <button className="appTopbarAction" onClick={handleExport} type="button">
            <span className="appTopbarActionIcon" aria-hidden="true">
              ⌁
            </span>
            Export CSV
          </button>
        </div>
      </div>

      <div className="workspaceFilterQuickRow">
        <span className="workspaceFilterQuickLabel">Quick filters</span>
        <div className="workspaceFilterQuickChips">
          {[
            { label: "All", value: "all" as const },
            { label: "Login Ready", value: "login-ready" as const },
            { label: "No Login", value: "no-login" as const },
            { label: "Login Disabled", value: "login-disabled" as const },
            { label: "Active", value: "active" as const },
            { label: "Inactive", value: "inactive" as const },
          ].map((chip) => (
            <button
              key={chip.value}
              className={`workspaceQuickChip${
                statusFilter === chip.value ? " workspaceQuickChipActive" : ""
              }`}
              onClick={() => setStatusFilter(chip.value)}
              type="button"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rosterBrowserMeta">
        <span>{filteredRows.length} shown</span>
        <span>{rows.length} total</span>
      </div>

      <div className="adminPeopleRosterTableWrap">
        {filteredRows.length > 0 ? (
          <table className="adminPeopleRosterTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>{resource === "students" ? "Admission / Cohort" : "Employee / Specialization"}</th>
                <th>Contact</th>
                <th>Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.full_name}</strong>
                  </td>
                  <td>
                    <strong>
                      {resource === "students"
                        ? (row as StudentRosterRow).admission_no
                        : (row as TeacherRosterRow).employee_code}
                    </strong>
                    <small>
                      {resource === "students"
                        ? ((row as StudentRosterRow).cohort
                            ? cohortNames?.get((row as StudentRosterRow).cohort as string) ?? "Unknown cohort"
                            : "No cohort linked")
                        : ((row as TeacherRosterRow).specialization || "No specialization set")}
                    </small>
                  </td>
                  <td>
                    <strong>{row.email || "No email"}</strong>
                    <small>{row.phone || "No phone"}</small>
                  </td>
                  <td>
                    <strong>{row.has_login ? row.login_username ?? "Login ready" : "No login"}</strong>
                    <small>{row.has_login ? "Credentials available" : "Create access from actions"}</small>
                  </td>
                  <td>
                    <div className="adminPeopleRosterStatusStack">
                      <span className={row.has_login ? "statusPill statusLive" : "statusPill statusWarning"}>
                        {row.has_login ? "Access ready" : "Pending access"}
                      </span>
                      <span className={row.is_active ? "statusPill statusLive" : "statusPill statusWarning"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="adminPeopleRosterActionLane">
                      {resource === "students" ? (
                        <StudentEditDialog
                          academicYears={academicYears}
                          cohorts={cohorts}
                          programs={programs}
                          row={row as StudentRosterRow}
                        />
                      ) : (
                        <TeacherEditDialog row={row as TeacherRosterRow} />
                      )}
                      <AccountActionButtons
                        resource={resource}
                        entityId={row.id}
                        hasLogin={row.has_login}
                        loginIsActive={row.login_is_active}
                        isCompact
                        userId={row.account_user_id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="featurePlaceholder">
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
