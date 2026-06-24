import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminRosterActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS",
);

const defaultStudentImportAcademicYear =
  process.env.PLAYWRIGHT_STUDENT_IMPORT_ACADEMIC_YEAR?.trim() || "2026-2027";
const defaultStudentImportProgram =
  process.env.PLAYWRIGHT_STUDENT_IMPORT_PROGRAM?.trim() || "Class 10 Foundation";
const defaultStudentImportCohort =
  process.env.PLAYWRIGHT_STUDENT_IMPORT_COHORT?.trim() || "";

const studentImportColumns = [
  "admission_no",
  "first_name",
  "last_name",
  "gender",
  "academic_year",
  "program",
  "cohort",
  "email",
  "phone",
  "guardian_name",
  "guardian_phone",
  "address",
  "joined_at",
  "is_active",
  "create_login",
  "username",
  "password",
] as const;

const teacherImportColumns = [
  "employee_code",
  "first_name",
  "last_name",
  "email",
  "phone",
  "qualification",
  "specialization",
  "bio",
  "joined_at",
  "is_active",
  "create_login",
  "username",
  "password",
] as const;

type BulkImportResponse = {
  created_count: number;
  failed_count: number;
  errors: Array<Record<string, unknown>>;
  credentials: Array<{
    profile_id?: string;
    full_name?: string;
    identifier?: string;
    username?: string;
    generated_password?: string | null;
  }>;
};

type StudentRecord = {
  id: string;
  full_name?: string;
  admission_no?: string;
  login_username?: string | null;
};

type TeacherRecord = {
  id: string;
  full_name?: string;
  employee_code?: string;
  login_username?: string | null;
  login_is_active?: boolean;
};

type BulkImportPreviewResponse = {
  preview?: BulkImportPreviewSummary;
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
};

type BulkImportPreviewSummary = {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
};

type AcademicYearRecord = {
  id: string;
  name: string;
  is_active?: boolean;
  is_current?: boolean;
};

type ProgramRecord = {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
};

type CohortRecord = {
  id: string;
  name: string;
  code?: string;
  program?: string;
  academic_year?: string;
  is_active?: boolean;
};

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function buildCsv(columns: readonly string[], row: Record<string, string>) {
  return [
    columns.join(","),
    columns.map((column) => escapeCsvValue(row[column] ?? "")).join(","),
  ].join("\n");
}

function normalizeAcademicLabel(label: string) {
  return label.replace(/\s+\([^)]+\)\s*$/, "").trim();
}

async function buildImportFile(
  testInfo: TestInfo,
  fileName: string,
  columns: readonly string[],
  row: Record<string, string>,
) {
  const filePath = testInfo.outputPath(fileName);
  await writeFile(filePath, buildCsv(columns, row), "utf8");
  return filePath;
}

async function resolveStudentImportScope() {
  return {
    academicYearName: normalizeAcademicLabel(defaultStudentImportAcademicYear),
    programName: normalizeAcademicLabel(defaultStudentImportProgram),
    cohortName: normalizeAcademicLabel(defaultStudentImportCohort),
  };
}

async function resolveStudentImportScopeFromApi(page: Page) {
  await page.goto("/admin/people?view=students");
  await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
  const instituteId = await page.getByRole("combobox", { name: /select institute/i }).inputValue();
  expect(instituteId).toBeTruthy();

  const [academicYearsResponse, programsResponse, cohortsResponse] = await Promise.all([
    page.request.get(`/api/admin/academics/academic-years?institute=${encodeURIComponent(instituteId)}&page_size=100`),
    page.request.get(`/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=100`),
    page.request.get(`/api/admin/academics/cohorts?institute=${encodeURIComponent(instituteId)}&page_size=100`),
  ]);

  expect(academicYearsResponse.ok()).toBe(true);
  expect(programsResponse.ok()).toBe(true);
  expect(cohortsResponse.ok()).toBe(true);

  const academicYearsPayload = (await academicYearsResponse.json()) as { results?: AcademicYearRecord[] } | AcademicYearRecord[];
  const programsPayload = (await programsResponse.json()) as { results?: ProgramRecord[] } | ProgramRecord[];
  const cohortsPayload = (await cohortsResponse.json()) as { results?: CohortRecord[] } | CohortRecord[];

  const academicYears = Array.isArray(academicYearsPayload) ? academicYearsPayload : (academicYearsPayload.results ?? []);
  const programs = Array.isArray(programsPayload) ? programsPayload : (programsPayload.results ?? []);
  const cohorts = Array.isArray(cohortsPayload) ? cohortsPayload : (cohortsPayload.results ?? []);

  const selectedAcademicYear =
    academicYears.find((item) => item.is_active && item.is_current) ??
    academicYears.find((item) => item.is_active) ??
    null;
  const selectedProgram = programs.find((item) => item.is_active) ?? null;
  expect(selectedAcademicYear, "At least one active academic year must exist for admin roster import coverage.").toBeTruthy();
  expect(selectedProgram, "At least one active program must exist for admin roster import coverage.").toBeTruthy();

  const selectedCohort =
    cohorts.find(
      (item) =>
        item.is_active &&
        item.program === selectedProgram?.id &&
        item.academic_year === selectedAcademicYear?.id,
    ) ?? null;

  return {
    academicYearName:
      process.env.PLAYWRIGHT_STUDENT_IMPORT_ACADEMIC_YEAR?.trim() ||
      selectedAcademicYear!.name,
    programName:
      process.env.PLAYWRIGHT_STUDENT_IMPORT_PROGRAM?.trim() ||
      selectedProgram!.code ||
      selectedProgram!.name,
    cohortName:
      process.env.PLAYWRIGHT_STUDENT_IMPORT_COHORT?.trim() ||
      selectedCohort?.code ||
      selectedCohort?.name ||
      "",
  };
}

async function runRosterImportFlow(
  page: Page,
  options: {
    resource: "students" | "teachers";
    buttonName: RegExp;
    previewResponsePattern: RegExp;
    finalizeResponsePattern: RegExp;
    filePath: string;
  },
) {
  await page.goto(`/admin/people?view=${options.resource}`);
  await expect(
    page.getByRole("heading", {
      name: options.resource === "students" ? /student roster/i : /teacher roster/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: options.buttonName }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /bulk import/i })).toBeVisible();
  const throttledBanner = dialog.getByText(/request was throttled/i).first();

  await dialog.locator('input[type="file"]').setInputFiles(options.filePath);
  const previewResponsePromise = page.waitForResponse(
    (response) =>
      options.previewResponsePattern.test(response.url()) &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /preview import/i }).click();
  const previewResponse = await previewResponsePromise;
  if (!previewResponse.ok()) {
    if (await throttledBanner.isVisible().catch(() => false)) {
      test.skip(true, "Roster import preview is currently throttled by the backend cooldown window.");
    }
    expect(previewResponse.ok()).toBe(true);
  }
  const previewPayload = (await previewResponse.json()) as BulkImportPreviewResponse;
  const resolvedPreview =
    previewPayload.preview ??
    (typeof previewPayload.total_rows === "number"
      ? {
          total_rows: previewPayload.total_rows,
          valid_rows: previewPayload.valid_rows ?? 0,
          invalid_rows: previewPayload.invalid_rows ?? 0,
        }
      : null);
  expect(resolvedPreview).toBeTruthy();
  expect(resolvedPreview?.total_rows).toBeGreaterThan(0);
  expect(
    resolvedPreview?.valid_rows,
    `${options.resource} admin roster import preview returned zero valid rows.`,
  ).toBeGreaterThan(0);

  await expect(dialog.getByText(/preview generated\./i)).toBeVisible();
  await expect(dialog.getByRole("button", { name: /import valid rows/i })).toBeEnabled();

  const finalizeResponsePromise = page.waitForResponse(
    (response) =>
      options.finalizeResponsePattern.test(response.url()) &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /import valid rows/i }).click();
  const finalizeResponse = await finalizeResponsePromise;
  expect(finalizeResponse.ok()).toBe(true);
  const finalizePayload = (await finalizeResponse.json()) as BulkImportResponse;

  await expect(dialog).toBeHidden();
  return finalizePayload;
}

test.describe("Admin mutable roster import actions", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminRosterActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS",
      "disposable admin roster import coverage",
    ),
  );

  test("@workflow @mutable admin can preview and finalize disposable student and teacher CSV imports", async ({
    page,
  }, testInfo) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const joinedAt = "2026-06-23";

    const studentImportScope =
      process.env.PLAYWRIGHT_STUDENT_IMPORT_ACADEMIC_YEAR?.trim() &&
      process.env.PLAYWRIGHT_STUDENT_IMPORT_PROGRAM?.trim()
        ? await resolveStudentImportScope()
        : await resolveStudentImportScopeFromApi(page);

    const studentAdmissionNo = `PW-ASI-${uniqueSeed}`;
    const studentFirstName = `PWAdminStudent${uniqueSeed}`;
    const studentLastName = "Bulk";
    const studentUsername = `pw.admin.student.${uniqueSeed}`;
    const studentPassword = "Student@123";
    const studentFilePath = await buildImportFile(
      testInfo,
      "admin-students-import.csv",
      studentImportColumns,
      {
        admission_no: studentAdmissionNo,
        first_name: studentFirstName,
        last_name: studentLastName,
        gender: "female",
        academic_year: studentImportScope.academicYearName,
        program: studentImportScope.programName,
        cohort: studentImportScope.cohortName,
        email: `pw.admin.student.bulk.${uniqueSeed}@example.test`,
        phone: `82000${String(uniqueSeed).slice(-5)}`,
        guardian_name: "Playwright Guardian",
        guardian_phone: `72000${String(uniqueSeed).slice(-5)}`,
        address: "Playwright Street",
        joined_at: joinedAt,
        is_active: "true",
        create_login: "true",
        username: studentUsername,
        password: studentPassword,
      },
    );

    const teacherCode = `PW-ATI-${uniqueSeed}`;
    const teacherFirstName = `PWAdminTeacher${uniqueSeed}`;
    const teacherLastName = "Bulk";
    const teacherFilePath = await buildImportFile(
      testInfo,
      "admin-teachers-import.csv",
      teacherImportColumns,
      {
        employee_code: teacherCode,
        first_name: teacherFirstName,
        last_name: teacherLastName,
        email: `pw.admin.teacher.bulk.${uniqueSeed}@example.test`,
        phone: `92000${String(uniqueSeed).slice(-5)}`,
        qualification: "MSc Automation",
        specialization: "Bulk Testing",
        bio: "Created by Playwright admin bulk import lane",
        joined_at: joinedAt,
        is_active: "true",
        create_login: "true",
        username: "",
        password: "",
      },
    );

    let studentId: string | null = null;
    let teacherId: string | null = null;

    try {
      const studentFinalizePayload = await runRosterImportFlow(page, {
        resource: "students",
        buttonName: /import students/i,
        previewResponsePattern: /\/api\/admin\/roster\/students\/preview$/,
        finalizeResponsePattern: /\/api\/admin\/roster\/students\/finalize$/,
        filePath: studentFilePath,
      });

      expect(studentFinalizePayload.created_count).toBe(1);
      expect(studentFinalizePayload.failed_count).toBe(0);
      expect(studentFinalizePayload.credentials).toHaveLength(1);
      expect(studentFinalizePayload.credentials[0]?.username).toBe(studentUsername);
      studentId = studentFinalizePayload.credentials[0]?.profile_id ?? null;
      expect(studentId).not.toBeNull();

      const importedStudentResponse = await page.request.get(`/api/admin/people/students/${studentId}`);
      expect(importedStudentResponse.ok()).toBe(true);
      const importedStudent = (await importedStudentResponse.json()) as StudentRecord;
      expect(importedStudent.admission_no).toBe(studentAdmissionNo);
      expect(importedStudent.full_name).toBe(`${studentFirstName} ${studentLastName}`);
      expect(importedStudent.login_username).toBe(studentUsername);

      const teacherFinalizePayload = await runRosterImportFlow(page, {
        resource: "teachers",
        buttonName: /import teachers/i,
        previewResponsePattern: /\/api\/admin\/roster\/teachers\/preview$/,
        finalizeResponsePattern: /\/api\/admin\/roster\/teachers\/finalize$/,
        filePath: teacherFilePath,
      });

      expect(teacherFinalizePayload.created_count).toBe(1);
      expect(teacherFinalizePayload.failed_count).toBe(0);
      expect(teacherFinalizePayload.credentials).toHaveLength(1);
      expect(teacherFinalizePayload.credentials[0]?.username).toBeTruthy();
      expect(teacherFinalizePayload.credentials[0]?.generated_password).toBeTruthy();
      teacherId = teacherFinalizePayload.credentials[0]?.profile_id ?? null;
      expect(teacherId).not.toBeNull();

      const importedTeacherResponse = await page.request.get(`/api/admin/people/teachers/${teacherId}`);
      expect(importedTeacherResponse.ok()).toBe(true);
      const importedTeacher = (await importedTeacherResponse.json()) as TeacherRecord;
      expect(importedTeacher.employee_code).toBe(teacherCode);
      expect(importedTeacher.full_name).toBe(`${teacherFirstName} ${teacherLastName}`);
      expect(importedTeacher.login_username).toBeTruthy();
      expect(importedTeacher.login_is_active).toBe(true);
    } finally {
      if (studentId) {
        const deleteStudentResponse = await page.request.delete(`/api/admin/people/students/${studentId}`);
        expect(deleteStudentResponse.ok()).toBe(true);
      }

      if (teacherId) {
        const deleteTeacherResponse = await page.request.delete(`/api/admin/people/teachers/${teacherId}`);
        expect(deleteTeacherResponse.ok()).toBe(true);
      }
    }
  });
});
