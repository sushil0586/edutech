import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

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

async function openStudentImportDialog(page: Page) {
  await page.goto("/institute/people?view=students");
  await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
  await page.getByRole("button", { name: /import students/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /bulk import/i })).toBeVisible();
  return dialog;
}

async function runStudentImport(page: Page, filePath: string) {
  const dialog = await openStudentImportDialog(page);
  await dialog.locator('input[type="file"]').setInputFiles(filePath);

  const previewResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/admin\/roster\/students\/preview$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /preview import/i }).click();
  const previewResponse = await previewResponsePromise;
  expect(previewResponse.ok()).toBe(true);
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
      /\/api\/admin\/roster\/students\/finalize$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /import valid rows/i }).click();
  const finalizeResponse = await finalizeResponsePromise;
  expect(finalizeResponse.ok()).toBe(true);
  const finalizePayload = (await finalizeResponse.json()) as BulkImportResponse;
  await expect(dialog).toBeHidden();
  return finalizePayload;
}

test.describe("Institute student bootstrap", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableRosterActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS",
      "persistent institute student bootstrap coverage",
    ),
  );

  test("@workflow @mutable institute can bootstrap persistent OPBMS student logins through the UI import flow", async ({
    page,
  }, testInfo) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const password = process.env.PLAYWRIGHT_BOOTSTRAP_STUDENT_PASSWORD?.trim() || "Demo@12345";
    const academicYear = process.env.PLAYWRIGHT_STUDENT_IMPORT_ACADEMIC_YEAR?.trim() || "2026-2027";
    const program = process.env.PLAYWRIGHT_STUDENT_IMPORT_PROGRAM?.trim() || "Class 7";
    const cohort = process.env.PLAYWRIGHT_STUDENT_IMPORT_COHORT?.trim() || "";

    const rows = Array.from({ length: 3 }, (_, index) => {
      const serial = String(index + 1).padStart(2, "0");
      return {
        admission_no: `OPBMS-STU-${uniqueSeed}-${serial}`,
        first_name: `Opbms${serial}`,
        last_name: "Student",
        gender: index % 2 === 0 ? "male" : "female",
        academic_year: academicYear,
        program,
        cohort,
        email: `opbms.student.${uniqueSeed}.${serial}@example.test`,
        phone: `8${String(uniqueSeed + index).slice(-9)}`,
        guardian_name: `Guardian ${serial}`,
        guardian_phone: `7${String(uniqueSeed + index).slice(-9)}`,
        address: "OPBMS Test Lane",
        joined_at: "2026-06-23",
        is_active: "true",
        create_login: "true",
        username: `opbms.student.${uniqueSeed}.${serial}`,
        password,
      };
    });

    const importFilePath = await buildImportFile(
      testInfo,
      "opbms-students-bootstrap.csv",
      studentImportColumns,
      rows,
    );

    const finalizePayload = await runStudentImport(page, importFilePath);
    expect(finalizePayload.created_count).toBe(rows.length);
    expect(finalizePayload.failed_count).toBe(0);
    expect(finalizePayload.credentials).toHaveLength(rows.length);

    const createdUsernames = finalizePayload.credentials
      .map((credential) => credential.username)
      .filter((value): value is string => Boolean(value));

    expect(createdUsernames).toEqual(rows.map((row) => row.username));

    await testInfo.attach("created-opbms-student-logins", {
      body: Buffer.from(
        JSON.stringify(
          {
            institute: "OPBMS",
            password,
            students: rows.map((row) => ({
              admission_no: row.admission_no,
              username: row.username,
              full_name: `${row.first_name} ${row.last_name}`,
            })),
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });

    const importedIdentifiers = finalizePayload.credentials
      .map((credential) => credential.identifier)
      .filter((value): value is string => Boolean(value));
    expect(importedIdentifiers).toEqual(rows.map((row) => row.admission_no));
  });
});
