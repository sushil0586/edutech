import { writeFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

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

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

async function buildImportFile(
  testInfo: TestInfo,
  fileName: string,
  columns: readonly string[],
  row: Record<string, string>,
) {
  const filePath = testInfo.outputPath(fileName);
  const csv = [
    columns.join(","),
    columns.map((column) => escapeCsvValue(row[column] ?? "")).join(","),
  ].join("\n");
  await writeFile(filePath, csv, "utf8");
  return filePath;
}

async function resolveStudentImportScopeFromApi(page: Page) {
  const instituteId = await page.getByRole("combobox", { name: /select institute/i }).inputValue();
  expect(instituteId).toBeTruthy();

  const [academicYearsResponse, programsResponse] = await Promise.all([
    page.request.get(`/api/admin/academics/academic-years?institute=${encodeURIComponent(instituteId)}&page_size=100`),
    page.request.get(`/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=100`),
  ]);

  expect(academicYearsResponse.ok()).toBe(true);
  expect(programsResponse.ok()).toBe(true);

  const academicYearsPayload = (await academicYearsResponse.json()) as
    | { results?: AcademicYearRecord[] }
    | AcademicYearRecord[];
  const programsPayload = (await programsResponse.json()) as
    | { results?: ProgramRecord[] }
    | ProgramRecord[];

  const academicYears = Array.isArray(academicYearsPayload)
    ? academicYearsPayload
    : (academicYearsPayload.results ?? []);
  const programs = Array.isArray(programsPayload) ? programsPayload : (programsPayload.results ?? []);

  const selectedAcademicYear =
    academicYears.find((item) => item.is_active && item.is_current) ??
    academicYears.find((item) => item.is_active) ??
    academicYears[0] ??
    null;
  const selectedProgram = programs.find((item) => item.is_active) ?? programs[0] ?? null;

  expect(selectedAcademicYear).toBeTruthy();
  expect(selectedProgram).toBeTruthy();

  return {
    academicYearName: selectedAcademicYear!.name,
    programName: selectedProgram!.code || selectedProgram!.name,
  };
}

async function openDialogFromAction(
  page: Page,
  actionName: RegExp,
  headingName: RegExp,
) {
  await expect(async () => {
    await page.getByRole("button", { name: actionName }).first().click();
    await expect(page.getByRole("heading", { name: headingName })).toBeVisible();
  }).toPass();
}

async function expectRosterRowAccountContract(row: Locator) {
  const createLoginButton = row.getByRole("button", { name: /create login/i });
  const resetPasswordButton = row.getByRole("button", { name: /reset password/i });
  const disableLoginButton = row.getByRole("button", { name: /disable login/i });
  const enableLoginButton = row.getByRole("button", { name: /enable login/i });

  const createLoginVisible = await createLoginButton.isVisible().catch(() => false);
  const resetPasswordVisible = await resetPasswordButton.isVisible().catch(() => false);
  const disableLoginVisible = await disableLoginButton.isVisible().catch(() => false);
  const enableLoginVisible = await enableLoginButton.isVisible().catch(() => false);

  if (createLoginVisible) {
    await expect(row).toContainText(/no login/i);
    await expect(row).toContainText(/pending access/i);
    expect(resetPasswordVisible).toBe(false);
    expect(disableLoginVisible).toBe(false);
    expect(enableLoginVisible).toBe(false);
  } else {
    expect(resetPasswordVisible).toBe(true);
    expect(disableLoginVisible || enableLoginVisible).toBe(true);
    expect(disableLoginVisible && enableLoginVisible).toBe(false);
    await expect(row).toContainText(/access ready/i);
  }
}

test.describe("Admin people workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can switch roster views and export student/teacher CSV files", async ({
    page,
  }, testInfo) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/people");

    const instituteSelect = page.getByRole("combobox", { name: /select institute/i });
    await expect(instituteSelect).toBeVisible();
    await expect(page.getByRole("link", { name: /^students$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^teachers$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create student/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /import students/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /search roster/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /filter login status/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /sort by name/i })).toBeVisible();
    await page.getByRole("button", { name: /^open$/i }).click();
    await expect(page).toHaveURL(/\/admin\/people\?[^#]*institute=/);
    await expect(page.getByText(/records/i).first()).toBeVisible();
    await expectRosterRowAccountContract(page.locator(".adminPeopleRosterTable tbody tr").first());

    await openDialogFromAction(page, /create student/i, /new student profile/i);
    await page.getByRole("button", { name: /create student/i }).last().click();
    await expect(page.getByText(/fill the required fields to continue\./i)).toBeVisible();
    await expect(page.getByText(/admission number is required\./i)).toBeVisible();
    await expect(page.getByText(/first name is required\./i)).toBeVisible();
    await expect(page.getByText(/academic year is required\./i)).toBeVisible();
    await expect(page.getByText(/program is required\./i)).toBeVisible();
    await page.getByRole("button", { name: /close/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await openDialogFromAction(page, /import students/i, /bulk import students/i);
    await expect(page.getByRole("button", { name: /download template/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /preview import/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /import valid rows/i })).toBeDisabled();
    const studentImportScope = await resolveStudentImportScopeFromApi(page);
    const invalidStudentImportFile = await buildImportFile(
      testInfo,
      "invalid-student-import.csv",
      studentImportColumns,
      {
        admission_no: "PW-INVALID-STUDENT-001",
        first_name: "",
        last_name: "Preview",
        gender: "male",
        academic_year: studentImportScope.academicYearName,
        program: studentImportScope.programName,
        cohort: "",
        email: "invalid.student.preview@example.test",
        phone: "8100000001",
        guardian_name: "",
        guardian_phone: "",
        address: "",
        joined_at: "2026-04-01",
        is_active: "true",
        create_login: "false",
        username: "",
        password: "",
      },
    );
    await page.getByRole("dialog").locator('input[type="file"]').setInputFiles(invalidStudentImportFile);
    await page.getByRole("button", { name: /preview import/i }).click();
    await expect(page.getByText(/preview generated\./i)).toBeVisible();
    await expect(page.getByText(/^1$/).first()).toBeVisible();
    await expect(page.getByText(/first_name: first name is required\./i)).toBeVisible();
    await page.getByRole("button", { name: /close/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const studentDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export csv/i }).click();
    const studentDownload = await studentDownloadPromise;
    expect(studentDownload.suggestedFilename()).toBe("students-roster.csv");

    await page.getByRole("textbox", { name: /search roster/i }).fill("demo");
    await expect(page.getByText(/shown/i).first()).toBeVisible();
    await page.getByRole("combobox", { name: /filter login status/i }).selectOption("login-ready");
    await page.getByRole("button", { name: /^no login$/i }).click();
    await expect(page.getByRole("button", { name: /^no login$/i })).toHaveClass(/workspaceQuickChipActive/);

    await page.getByRole("link", { name: /^teachers$/i }).click();
    await expect(page).toHaveURL(/\/admin\/people\?[^#]*view=teachers/);
    await expect(page.getByRole("button", { name: /create teacher/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /import teachers/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /search roster/i })).toBeVisible();
    await page.getByRole("textbox", { name: /search roster/i }).fill("");
    await page.getByRole("combobox", { name: /filter login status/i }).selectOption("all");
    await expectRosterRowAccountContract(page.locator(".adminPeopleRosterTable tbody tr").first());

    await openDialogFromAction(page, /create teacher/i, /new teacher profile/i);
    await page.getByRole("button", { name: /create teacher/i }).last().click();
    await expect(page.getByText(/fill the required fields to continue\./i)).toBeVisible();
    await expect(page.getByText(/employee code is required\./i)).toBeVisible();
    await expect(page.getByText(/first name is required\./i)).toBeVisible();
    await page.getByRole("button", { name: /close/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await openDialogFromAction(page, /import teachers/i, /bulk import teachers/i);
    await expect(page.getByRole("button", { name: /download template/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /preview import/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /import valid rows/i })).toBeDisabled();
    const invalidTeacherImportFile = await buildImportFile(
      testInfo,
      "invalid-teacher-import.csv",
      teacherImportColumns,
      {
        employee_code: "PW-INVALID-TEACHER-001",
        first_name: "",
        last_name: "Preview",
        email: "invalid.teacher.preview@example.test",
        phone: "8100000002",
        qualification: "",
        specialization: "",
        bio: "",
        joined_at: "2026-04-01",
        is_active: "true",
        create_login: "false",
        username: "",
        password: "",
      },
    );
    await page.getByRole("dialog").locator('input[type="file"]').setInputFiles(invalidTeacherImportFile);
    await page.getByRole("button", { name: /preview import/i }).click();
    await expect(page.getByText(/preview generated\./i)).toBeVisible();
    await expect(page.getByText(/^1$/).first()).toBeVisible();
    await expect(page.getByText(/first_name: first name is required\./i)).toBeVisible();
    await page.getByRole("button", { name: /close/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const teacherDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export csv/i }).click();
    const teacherDownload = await teacherDownloadPromise;
    expect(teacherDownload.suggestedFilename()).toBe("teachers-roster.csv");

    await page.getByRole("textbox", { name: /search roster/i }).fill("demo");
    await page.getByRole("combobox", { name: /filter login status/i }).selectOption("active");
    await page.getByRole("button", { name: /^active$/i }).click();
    await expect(page.getByRole("button", { name: /^active$/i })).toHaveClass(/workspaceQuickChipActive/);
  });
});
