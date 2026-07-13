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

type BrowserCreatedInstitute = {
  id: string;
  name: string;
  code: string;
  onboarding_run_id: string | null;
  onboarding_run_status?: string | null;
};

type BulkImportPreviewResponse = {
  preview?: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    rows?: Array<{
      status?: string;
      errors?: Record<string, string>;
    }>;
  } | null;
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
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
  const instituteName = `PW Blank Ops ${seed}`;
  const instituteCode = `PWN${seed.slice(-5)}`;

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
  await dialog.getByLabel(/description/i).fill("Blank onboarding operational negative browser coverage.");
  await dialog.getByRole("combobox", { name: /onboarding profile/i }).selectOption("BLANK_INSTITUTE");

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

test.describe("Blank onboarding operational honesty", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingProfilesEnabled || !mutableRosterActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 and PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 for blank onboarding operational coverage.",
  );

  test("@workflow @mutable @onboarding blank onboarding keeps first-day institute operations truthful in the browser", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueOnboardingSeed();
    const onboardingPage = new AdminInstituteOnboardingPage(page);
    let instituteId: string | null = null;

    try {
      const institute = await createInstituteFromBrowser(page, seed);
      instituteId = institute.id;
      expect(institute.onboarding_run_id).toBeTruthy();
      expect(institute.onboarding_run_status).toBe("pending");

      await onboardingPage.assertLoaded(institute.id);
      await expect(page.getByLabel(/onboarding profile/i)).toHaveValue("BLANK_INSTITUTE");
      await expect(
        page.getByText(/creates no academic or economy defaults\. use when the operator wants to onboard manually\./i),
      ).toBeVisible();

      const instituteCredentials = await createInstituteLoginViaUi(page, institute.id);
      await loginWithCredentials(page, instituteCredentials, "institute");
      await expectInstituteWorkspace(page);

      await page.goto("/institute/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await expect(
        page
          .locator(".builderSummaryCard")
          .filter({ hasText: /Academic year options currently visible in institute scope/i })
          .first()
          .getByText(/^0$/),
      ).toBeVisible();
      await expect(
        page
          .locator(".builderSummaryCard")
          .filter({ hasText: /Live program choices available for the new exam shell/i })
          .first()
          .getByText(/^0$/),
      ).toBeVisible();
      await expect(page.locator('select[name="academic_year"] option')).toHaveCount(0);
      await expect(page.locator('select[name="program"] option')).toHaveCount(0);

      const studentFilePath = await buildImportFile(testInfo, "blank-students.csv", studentImportColumns, [
        {
          admission_no: `${institute.code}-STU-01`,
          first_name: "Blank",
          last_name: "Student",
          gender: "female",
          academic_year: "2039-2040 Blank",
          program: "Class 7",
          cohort: "",
          email: `${institute.code.toLowerCase()}.blank.student@example.test`,
          phone: `8${seed.slice(-9)}`,
          guardian_name: "Blank Guardian",
          guardian_phone: `7${seed.slice(-9)}`,
          address: "Blank Scope Street",
          joined_at: "2039-07-01",
          is_active: "true",
          create_login: "true",
          username: `${institute.code.toLowerCase()}.blank.student`,
          password: "Student@123",
        },
      ]);

      await page.goto("/institute/people?view=students");
      await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
      await page.getByRole("button", { name: /import students/i }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /bulk import/i })).toBeVisible();
      await dialog.locator('input[type="file"]').setInputFiles(studentFilePath);

      const previewResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/roster\/students\/preview$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: /preview import/i }).click();
      const previewResponse = await previewResponsePromise;

      if (previewResponse.ok()) {
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
        expect(resolvedPreview?.total_rows).toBe(1);
        expect(resolvedPreview?.valid_rows).toBe(0);
        expect(resolvedPreview?.invalid_rows).toBeGreaterThanOrEqual(1);
        await expect(dialog.getByText(/preview generated\./i)).toBeVisible();
        await expect(dialog.getByText(/invalid/i).first()).toBeVisible();
        await expect(dialog.getByText(/issue/i).first()).toBeVisible();
      } else {
        const errorText = await previewResponse.text();
        expect(errorText.toLowerCase()).toMatch(/academic|program|cohort|scope|valid/i);
        await expect(dialog.locator(".authMeta").first()).toContainText(/academic|program|cohort|scope|valid/i);
      }
    } finally {
      await loginAsRole(page, "admin");
      await deleteDisposableInstitute(page, instituteId);
    }
  });
});
