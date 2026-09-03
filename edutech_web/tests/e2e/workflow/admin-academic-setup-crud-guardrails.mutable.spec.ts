import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminAcademicSetupActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ACADEMIC_SETUP_ACTIONS",
);

type AcademicYearCreatePayload = {
  id?: string;
};

type SubjectCreatePayload = {
  id?: string;
};

type ProgramRecord = {
  id: string;
  name?: string;
  code?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

async function selectedInstituteId(page: Page) {
  const select = page.getByLabel(/select institute/i);
  await expect(select).toBeVisible();
  return select.inputValue();
}

async function openSection(page: Page, section: "academic-years" | "subjects") {
  await page.goto(`/admin/academic-setup?section=${section}`);
  await expect(page).toHaveURL(new RegExp(`/admin/academic-setup\\?.*section=${section}`));
  await expect(page.getByRole("button", { name: /^(add|new)$/i })).toBeVisible();
}

async function academicDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

function fieldContainer(dialog: Locator, label: RegExp) {
  return dialog.locator("label").filter({ hasText: label }).first();
}

async function fillWrappedField(dialog: Locator, label: RegExp, value: string) {
  await fieldContainer(dialog, label).locator("input, textarea").first().fill(value);
}

async function getWrappedFieldValue(dialog: Locator, label: RegExp) {
  return fieldContainer(dialog, label).locator("input, textarea").first().inputValue();
}

async function archiveAcademicRecord(
  page: Page,
  resource: "academic-years" | "subjects",
  recordId: string | null,
) {
  if (!recordId) {
    return;
  }
  const response = await Promise.race([
    page.request.delete(`/api/admin/academics/${resource}/${recordId}`),
    new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), 2000);
    }),
  ]);
  if (response === "timeout") {
    return;
  }
  expect(response.ok(), await response.text()).toBe(true);
}

async function listAcademicYears(page: Page, instituteId: string) {
  const response = await page.request.get(
    `/api/admin/academics/academic-years?institute=${encodeURIComponent(instituteId)}&page_size=200`,
  );
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { results?: Array<{ end_date?: string }> } | Array<{ end_date?: string }>;
  return Array.isArray(body) ? body : (body.results ?? []);
}

async function setWrappedCheckbox(dialog: Locator, label: RegExp, checked: boolean) {
  const checkbox = fieldContainer(dialog, label).locator('input[type="checkbox"]').first();
  if (checked) {
    await checkbox.check();
  } else {
    await checkbox.uncheck();
  }
}

async function firstProgramId(page: Page, instituteId: string) {
  const response = await page.request.get(
    `/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=100`,
  );
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { results?: ProgramRecord[] } | ProgramRecord[];
  const records = Array.isArray(body) ? body : (body.results ?? []);
  expect(records.length).toBeGreaterThan(0);
  return records[0]!.id;
}

async function getSafeAcademicYearWindow(page: Page, instituteId: string) {
  const records = await listAcademicYears(page, instituteId);
  const latestEndDate = records
    .map((record) => record.end_date)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort()
    .at(-1);

  const startDate = latestEndDate
    ? addDays(new Date(`${latestEndDate}T00:00:00.000Z`), 1)
    : new Date("2033-04-01T00:00:00.000Z");
  const endDate = addDays(startDate, 364);
  return {
    startDate: formatIsoDate(startDate),
    endDate: formatIsoDate(endDate),
  };
}

test.describe("Admin academic setup CRUD guardrails", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminAcademicSetupActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ACADEMIC_SETUP_ACTIONS",
      "admin academic setup CRUD guardrail coverage",
    ),
  );

  test("@workflow @mutable admin can create an academic year with minimum valid browser values", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await openSection(page, "academic-years");
    const instituteId = await selectedInstituteId(page);
    expect(instituteId).toBeTruthy();

    const uniqueSeed = Date.now();
    const yearName = `PW Guardrail Year ${uniqueSeed}`;
    const yearWindow = await getSafeAcademicYearWindow(page, instituteId);
    let academicYearId: string | null = null;

    try {
      await page.getByRole("button", { name: /^(add|new)$/i }).click();
      const dialog = await academicDialog(page);
      await fillWrappedField(dialog, /year name/i, yearName);
      await fillWrappedField(dialog, /start date/i, yearWindow.startDate);
      await fillWrappedField(dialog, /end date/i, yearWindow.endDate);
      await setWrappedCheckbox(dialog, /current year/i, false);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/academics/academic-years") &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: /^create$/i }).click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok(), await createResponse.text()).toBe(true);
      const createPayload = (await createResponse.json()) as AcademicYearCreatePayload;
      academicYearId = createPayload.id ?? null;
      expect(academicYearId).toBeTruthy();

      await expect(dialog).toBeHidden();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(yearName), "i") })).toBeVisible();
    } finally {
      await archiveAcademicRecord(page, "academic-years", academicYearId);
    }
  });

  test("@workflow @mutable admin academic setup dialogs reset unsaved values and safely edit sparse subject records", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await openSection(page, "academic-years");
    const instituteId = await selectedInstituteId(page);
    expect(instituteId).toBeTruthy();

    const uniqueSeed = Date.now();
    const cancelledYearName = `PW Cancel Year ${uniqueSeed}`;
    const cancelledUpdatedYearName = `${cancelledYearName} Updated`;
    const yearWindow = await getSafeAcademicYearWindow(page, instituteId);
    const sparseSubjectName = `PW Sparse Subject ${uniqueSeed}`;
    const sparseSubjectCode = `PWSS${String(uniqueSeed).slice(-6)}`;
    const sparseSubjectUpdatedName = `${sparseSubjectName} Updated`;
    const programId = await firstProgramId(page, instituteId);
    await page.getByRole("button", { name: /^(add|new)$/i }).click();
    const initialCreateDialog = await academicDialog(page);
    await fillWrappedField(initialCreateDialog, /year name/i, cancelledYearName);
    await fillWrappedField(initialCreateDialog, /start date/i, yearWindow.startDate);
    await initialCreateDialog.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: /^(add|new)$/i }).click();
    const reopenedCreateDialog = await academicDialog(page);
    await expect(fieldContainer(reopenedCreateDialog, /year name/i).locator("input").first()).toHaveValue("");
    await expect(fieldContainer(reopenedCreateDialog, /start date/i).locator("input").first()).toHaveValue("");
    await reopenedCreateDialog.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const firstYearRow = page
      .locator(".academicRecordTable tbody tr")
      .filter({ has: page.getByRole("button", { name: /^edit$/i }) })
      .first();
    await expect(firstYearRow).toBeVisible();
    const originalYearName = (await firstYearRow.locator("td").nth(0).locator("strong").textContent())?.trim() ?? "";
    expect(originalYearName).toBeTruthy();

    await firstYearRow.getByRole("button", { name: /^edit$/i }).click();
    const initialEditDialog = await academicDialog(page);
    await fillWrappedField(initialEditDialog, /year name/i, cancelledUpdatedYearName);
    await initialEditDialog.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await firstYearRow.getByRole("button", { name: /^edit$/i }).click();
    const reopenedEditDialog = await academicDialog(page);
    await expect(fieldContainer(reopenedEditDialog, /year name/i).locator("input").first()).toHaveValue(originalYearName);
    await reopenedEditDialog.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const createSubjectResponse = await page.request.post("/api/admin/academics/subjects", {
      data: {
        institute: instituteId,
        name: sparseSubjectName,
        code: sparseSubjectCode,
        program: programId,
        sort_order: 0,
        description: "",
        is_active: true,
      },
    });
    expect(createSubjectResponse.ok(), await createSubjectResponse.text()).toBe(true);
    const createSubjectPayload = (await createSubjectResponse.json()) as SubjectCreatePayload;
    const sparseSubjectId = createSubjectPayload.id ?? null;
    expect(sparseSubjectId).toBeTruthy();

    await openSection(page, "subjects");
    const sparseSubjectRow = page.getByRole("row", { name: new RegExp(escapeRegExp(sparseSubjectCode), "i") });
    await expect(sparseSubjectRow).toBeVisible();
    await sparseSubjectRow.getByRole("button", { name: /^edit$/i }).click();
    const sparseEditDialog = await academicDialog(page);
    const sparseDescriptionField = sparseEditDialog.locator("textarea").first();

    await expect(await getWrappedFieldValue(sparseEditDialog, /subject name/i)).toBe(sparseSubjectName);
    await expect(sparseDescriptionField).toHaveValue("");
    const programSelect = sparseEditDialog.locator("select").first();
    await expect(programSelect).toHaveValue(programId);

    await fillWrappedField(sparseEditDialog, /subject name/i, sparseSubjectUpdatedName);
    await sparseDescriptionField.fill("Sparse subject updated through browser edit.");

    const patchResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/admin/academics/subjects/${sparseSubjectId}`) &&
        response.request().method() === "PATCH",
    );
    await sparseEditDialog.getByRole("button", { name: /^update$/i }).click();
    const patchResponse = await patchResponsePromise;
    expect(patchResponse.ok(), await patchResponse.text()).toBe(true);

    await openSection(page, "subjects");
    const updatedRow = page.getByRole("row", { name: new RegExp(escapeRegExp(sparseSubjectUpdatedName), "i") });
    await expect(updatedRow).toBeVisible();
    await updatedRow.getByRole("button", { name: /^edit$/i }).click();
    const reopenedSubjectDialog = await academicDialog(page);
    const reopenedSubjectDescriptionField = reopenedSubjectDialog.locator("textarea").first();
    await expect(await getWrappedFieldValue(reopenedSubjectDialog, /subject name/i)).toBe(sparseSubjectUpdatedName);
    await expect(reopenedSubjectDescriptionField).toHaveValue("Sparse subject updated through browser edit.");
    await reopenedSubjectDialog.getByRole("button", { name: /cancel/i }).click();

    page.once("dialog", async (confirmDialog) => {
      await confirmDialog.accept();
    });
    await updatedRow.getByRole("button", { name: /archive/i }).click();
    await expect(updatedRow).toHaveCount(0);
  });
});
