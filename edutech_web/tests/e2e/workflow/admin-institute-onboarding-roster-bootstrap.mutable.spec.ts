import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { deleteDisposableInstitute, uniqueOnboardingSeed } from "../helpers/onboarding";
import { isMutableLaneEnabled } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";
import { AdminInstituteOnboardingPage } from "../page-objects/admin/admin-institute-onboarding.po";

const mutableAdminOnboardingProfilesEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
);
const mutableRosterActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS",
);

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

type BrowserCreatedInstitute = {
  id: string;
  name: string;
  code: string;
  onboarding_run_id: string | null;
};

type BulkImportResponse = {
  created_count: number;
  failed_count: number;
  credentials: Array<{
    profile_id?: string;
    full_name?: string;
    username?: string;
    generated_password?: string | null;
  }>;
};

type BulkImportPreviewResponse = {
  preview?: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
  };
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
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

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function buildCsv(columns: readonly string[], rows: Array<Record<string, string>>) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column] ?? "")).join(",")),
  ].join("\n");
}

async function buildImportFile(
  testInfo: TestInfo,
  fileName: string,
  columns: readonly string[],
  rows: Array<Record<string, string>>,
) {
  const filePath = testInfo.outputPath(fileName);
  await writeFile(filePath, buildCsv(columns, rows), "utf8");
  return filePath;
}

async function createInstituteFromBrowser(page: Page, seed: string) {
  const instituteName = `PW Onboarding Bootstrap ${seed}`;
  const instituteCode = `PWB${seed.slice(-5)}`;

  await page.goto("/admin/institutes");
  await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /add institute/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /add institute/i })).toBeVisible();
  await dialog.getByLabel(/institute name/i).fill(instituteName);
  await dialog.getByLabel(/^code$/i).fill(instituteCode);
  await dialog.getByLabel(/^email$/i).fill(`${instituteCode.toLowerCase()}@example.test`);
  await dialog.getByLabel(/^phone$/i).fill(`91${seed.slice(-8)}`);
  await dialog.getByLabel(/website/i).fill(`https://${instituteCode.toLowerCase()}.example.test`);
  await dialog.getByLabel(/description/i).fill("Browser onboarding to roster bootstrap coverage.");
  await dialog.getByRole("combobox", { name: /onboarding profile/i }).selectOption("SCHOOL_STARTER");

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/institutes") &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /save institute/i }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), await createResponse.text()).toBe(true);

  const institute = (await createResponse.json()) as BrowserCreatedInstitute;
  await expect(page).toHaveURL(/\/admin\/academic-setup\?/);
  await expect(page).toHaveURL(new RegExp(`institute=${institute.id}`));

  return institute;
}

async function createInstituteLoginViaUi(page: Page, instituteId: string) {
  await page.goto(`/admin/institutes?institute=${instituteId}`);
  const detailCard = page.locator(".adminInstituteDetailCard").first();
  await expect(detailCard).toBeVisible();

  const accountPanel = detailCard.locator(".adminInstituteAccountPanel").first();
  await expect(accountPanel).toContainText(/credential controls/i);

  const createLoginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/admin/account-management/institutes/${instituteId}/create-login`) &&
      response.request().method() === "POST",
  );
  await accountPanel.getByRole("button", { name: /create login/i }).click();
  const createLoginResponse = await createLoginResponsePromise;
  expect(createLoginResponse.ok(), await createLoginResponse.text()).toBe(true);

  const payload = (await createLoginResponse.json()) as {
    username?: string;
    generated_password?: string;
  };
  expect(payload.username).toBeTruthy();
  expect(payload.generated_password).toBeTruthy();

  return {
    username: payload.username!.trim(),
    password: payload.generated_password!.trim(),
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
  await page.goto(`/institute/people?view=${options.resource}`);
  await expect(
    page.getByRole("heading", {
      name: options.resource === "students" ? /student roster/i : /teacher roster/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: options.buttonName }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /bulk import/i })).toBeVisible();

  await dialog.locator('input[type="file"]').setInputFiles(options.filePath);
  const previewResponsePromise = page.waitForResponse(
    (response) =>
      options.previewResponsePattern.test(response.url()) &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /preview import/i }).click();
  const previewResponse = await previewResponsePromise;
  expect(previewResponse.ok(), await previewResponse.text()).toBe(true);

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
  expect(resolvedPreview?.valid_rows).toBeGreaterThan(0);

  const finalizeResponsePromise = page.waitForResponse(
    (response) =>
      options.finalizeResponsePattern.test(response.url()) &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /import valid rows/i }).click();
  const finalizeResponse = await finalizeResponsePromise;
  expect(finalizeResponse.ok(), await finalizeResponse.text()).toBe(true);
  const finalizePayload = (await finalizeResponse.json()) as BulkImportResponse;
  await expect(dialog).toBeHidden();
  return finalizePayload;
}

test.describe("Admin onboarding to institute roster bootstrap", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingProfilesEnabled || !mutableRosterActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 and PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 for onboarding roster bootstrap coverage.",
  );

  test("@workflow @mutable @onboarding admin can onboard a fresh institute and bootstrap first teacher and student records through the browser", async ({
    page,
  }, testInfo) => {
    test.setTimeout(300000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueOnboardingSeed();
    const onboardingPage = new AdminInstituteOnboardingPage(page);
    const academicYear = `2039-2040 Bootstrap ${seed}`;
    const joinedAt = "2039-07-01";
    const studentPassword = "Student@123";

    let instituteId: string | null = null;

    try {
      const institute = await createInstituteFromBrowser(page, seed);
      instituteId = institute.id;
      expect(institute.onboarding_run_id).toBeTruthy();

      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(academicYear, "2039-04-01", "2040-03-31");
      await onboardingPage.previewThenApply();
      await onboardingPage.expectReadySummary(institute.name);

      const instituteCredentials = await createInstituteLoginViaUi(page, institute.id);

      await loginWithCredentials(page, instituteCredentials, "institute");
      await expectInstituteWorkspace(page);

      const studentAdmissionNo = `${institute.code}-STU-01`;
      const studentFirstName = `Bootstrap${seed.slice(-3)}`;
      const studentLastName = "Student";
      const studentUsername = `${institute.code.toLowerCase()}.student.01`;
      const studentFilePath = await buildImportFile(testInfo, "bootstrap-students.csv", studentImportColumns, [
        {
          admission_no: studentAdmissionNo,
          first_name: studentFirstName,
          last_name: studentLastName,
          gender: "female",
          academic_year: academicYear,
          program: "Class 7",
          cohort: "",
          email: `${studentUsername}@example.test`,
          phone: `8${seed.slice(-9)}`,
          guardian_name: "Bootstrap Guardian",
          guardian_phone: `7${seed.slice(-9)}`,
          address: "Playwright Bootstrap Street",
          joined_at: joinedAt,
          is_active: "true",
          create_login: "true",
          username: studentUsername,
          password: studentPassword,
        },
      ]);

      const teacherCode = `${institute.code}-TCH-01`;
      const teacherFirstName = `Bootstrap${seed.slice(-3)}`;
      const teacherLastName = "Teacher";
      const teacherFilePath = await buildImportFile(testInfo, "bootstrap-teachers.csv", teacherImportColumns, [
        {
          employee_code: teacherCode,
          first_name: teacherFirstName,
          last_name: teacherLastName,
          email: `${institute.code.toLowerCase()}.teacher.01@example.test`,
          phone: `9${seed.slice(-9)}`,
          qualification: "MSc Automation",
          specialization: "Onboarding Readiness",
          bio: "Created by onboarding roster bootstrap coverage.",
          joined_at: joinedAt,
          is_active: "true",
          create_login: "true",
          username: "",
          password: "",
        },
      ]);

      const studentFinalizePayload = await runRosterImportFlow(page, {
        resource: "students",
        buttonName: /import students/i,
        previewResponsePattern: /\/api\/admin\/roster\/students\/preview$/,
        finalizeResponsePattern: /\/api\/admin\/roster\/students\/finalize$/,
        filePath: studentFilePath,
      });
      expect(studentFinalizePayload.created_count).toBe(1);
      expect(studentFinalizePayload.failed_count).toBe(0);
      expect(studentFinalizePayload.credentials[0]?.username).toBe(studentUsername);

      const createdStudentId = studentFinalizePayload.credentials[0]?.profile_id ?? "";
      expect(createdStudentId).toBeTruthy();
      const importedStudentResponse = await page.request.get(`/api/admin/people/students/${createdStudentId}`);
      expect(importedStudentResponse.ok(), await importedStudentResponse.text()).toBe(true);
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
      expect(teacherFinalizePayload.credentials[0]?.username).toBeTruthy();
      expect(teacherFinalizePayload.credentials[0]?.generated_password).toBeTruthy();

      const createdTeacherId = teacherFinalizePayload.credentials[0]?.profile_id ?? "";
      expect(createdTeacherId).toBeTruthy();
      const importedTeacherResponse = await page.request.get(`/api/admin/people/teachers/${createdTeacherId}`);
      expect(importedTeacherResponse.ok(), await importedTeacherResponse.text()).toBe(true);
      const importedTeacher = (await importedTeacherResponse.json()) as TeacherRecord;
      expect(importedTeacher.employee_code).toBe(teacherCode);
      expect(importedTeacher.full_name).toBe(`${teacherFirstName} ${teacherLastName}`);
      expect(importedTeacher.login_username).toBeTruthy();
      expect(importedTeacher.login_is_active).toBe(true);

      await page.goto("/institute/people?view=students");
      await expect(page.getByText(studentAdmissionNo).first()).toBeVisible();
      await expect(page.getByText(`${studentFirstName} ${studentLastName}`)).toBeVisible();

      await page.goto("/institute/people?view=teachers");
      await expect(page.getByText(teacherCode).first()).toBeVisible();
      await expect(page.getByText(`${teacherFirstName} ${teacherLastName}`)).toBeVisible();

      await testInfo.attach("onboarding-roster-bootstrap-summary", {
        body: Buffer.from(
          JSON.stringify(
            {
              institute: {
                id: institute.id,
                code: institute.code,
                name: institute.name,
              },
              academic_year: academicYear,
              student: {
                admission_no: studentAdmissionNo,
                username: studentUsername,
                full_name: `${studentFirstName} ${studentLastName}`,
              },
              teacher: {
                employee_code: teacherCode,
                full_name: `${teacherFirstName} ${teacherLastName}`,
              },
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      });
    } finally {
      await loginAsRole(page, "admin");
      await deleteDisposableInstitute(page, instituteId);
    }
  });
});
