import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminAcademicSetupActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ACADEMIC_SETUP_ACTIONS",
);

type AcademicResource =
  | "academic-years"
  | "programs"
  | "cohorts"
  | "subjects"
  | "topics";

type AcademicRecord = {
  id: string;
  name?: string;
  code?: string;
  end_date?: string;
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

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function selectedInstituteId(page: Page) {
  const select = page.getByLabel(/select institute/i);
  await expect(select).toBeVisible();
  return select.inputValue();
}

async function openSection(page: Page, section: AcademicResource) {
  await page.goto(`/admin/academic-setup?section=${section}`);
  await expect(page).toHaveURL(new RegExp(`/admin/academic-setup\\?.*section=${section}`));
  await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();
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

async function setWrappedCheckbox(dialog: Locator, label: RegExp, checked: boolean) {
  const checkbox = fieldContainer(dialog, label).locator('input[type="checkbox"]').first();
  if (checked) {
    await checkbox.check();
  } else {
    await checkbox.uncheck();
  }
}

async function selectWrappedOptionByText(
  dialog: Locator,
  label: RegExp,
  optionPattern: RegExp | string,
) {
  const select = fieldContainer(dialog, label).locator("select").first();
  const options = await select.locator("option").evaluateAll((elements) =>
    elements.map((element) => ({
      label: (element as HTMLOptionElement).label,
      value: (element as HTMLOptionElement).value,
      text: (element.textContent ?? "").trim(),
    })),
  );
  const matchedOption = options.find((option) =>
    typeof optionPattern === "string"
      ? option.label === optionPattern || option.value === optionPattern || option.text === optionPattern
      : optionPattern.test(option.label) || optionPattern.test(option.value) || optionPattern.test(option.text),
  );
  expect(matchedOption).toBeTruthy();
  await select.selectOption(matchedOption!.value);
}

async function createRecord(page: Page) {
  await page.getByRole("button", { name: /^add$/i }).click();
  return academicDialog(page);
}

async function listRecords(
  request: APIRequestContext,
  resource: AcademicResource,
  instituteId: string,
) {
  const response = await request.get(
    `/api/admin/academics/${resource}?page_size=200&institute=${encodeURIComponent(instituteId)}`,
  );
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { results?: AcademicRecord[] } | AcademicRecord[];
  return Array.isArray(body) ? body : (body.results ?? []);
}

async function findRecordId(
  request: APIRequestContext,
  resource: AcademicResource,
  instituteId: string,
  matcher: (record: AcademicRecord) => boolean,
) {
  const records = await listRecords(request, resource, instituteId);
  return records.find(matcher)?.id ?? null;
}

async function archiveById(
  request: APIRequestContext,
  resource: AcademicResource,
  id: string | null,
) {
  if (!id) return;
  const response = await request.delete(`/api/admin/academics/${resource}/${id}`);
  expect(response.ok()).toBe(true);
}

async function getSafeAcademicYearWindow(request: APIRequestContext, instituteId: string) {
  const records = await listRecords(request, "academic-years", instituteId);
  const latestEndDate = records
    .map((record) => record.end_date)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort()
    .at(-1);

  const startDate = latestEndDate
    ? addDays(parseIsoDate(latestEndDate), 1)
    : new Date("2031-04-01T00:00:00.000Z");
  const endDate = addDays(startDate, 364);

  return {
    startDate: formatIsoDate(startDate),
    endDate: formatIsoDate(endDate),
  };
}

test.describe("Admin mutable academic setup actions", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminAcademicSetupActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ACADEMIC_SETUP_ACTIONS",
      "disposable admin academic setup coverage",
    ),
  );

  test("@workflow @mutable admin can create, edit, archive, and restore academic setup records across structure sections", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await openSection(page, "academic-years");
    const instituteId = await selectedInstituteId(page);
    expect(instituteId).toBeTruthy();

    const uniqueSeed = Date.now();
    const yearWindow = await getSafeAcademicYearWindow(page.request, instituteId);
    const yearName = `PW Admin Year ${uniqueSeed}`;
    const yearUpdatedName = `${yearName} Updated`;
    const programName = `PW Admin Program ${uniqueSeed}`;
    const programCode = `PW-AP-${uniqueSeed}`;
    const cohortName = `PW Admin Cohort ${uniqueSeed}`;
    const cohortCode = `PW-AC-${uniqueSeed}`;
    const subjectName = `PW Admin Subject ${uniqueSeed}`;
    const subjectCode = `PW-AS-${uniqueSeed}`;
    const topicName = `PW Admin Topic ${uniqueSeed}`;
    const topicUpdatedName = `${topicName} Updated`;
    const topicCode = `PW-AT-${uniqueSeed}`;

    try {
      let dialog = await createRecord(page);
      await fillWrappedField(dialog, /year name/i, yearName);
      await fillWrappedField(dialog, /start date/i, yearWindow.startDate);
      await fillWrappedField(dialog, /end date/i, yearWindow.endDate);
      await setWrappedCheckbox(dialog, /current year/i, false);
      await dialog.getByRole("button", { name: /create record/i }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(yearName), "i") })).toBeVisible();

      const yearRow = page.getByRole("row", { name: new RegExp(escapeRegExp(yearName), "i") });
      await yearRow.getByRole("button", { name: /^edit$/i }).click();
      dialog = await academicDialog(page);
      await fillWrappedField(dialog, /year name/i, yearUpdatedName);
      await dialog.getByRole("button", { name: /update record/i }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(yearUpdatedName), "i") })).toBeVisible();

      page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept();
      });
      await page
        .getByRole("row", { name: new RegExp(escapeRegExp(yearUpdatedName), "i") })
        .getByRole("button", { name: /archive/i })
        .click();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(yearUpdatedName), "i") })).toHaveCount(0);
      await page.getByRole("checkbox", { name: /show archived/i }).check();
      const archivedYearRow = page.getByRole("row", { name: new RegExp(escapeRegExp(yearUpdatedName), "i") });
      await expect(archivedYearRow).toBeVisible();
      await archivedYearRow.getByRole("button", { name: /restore/i }).click();
      await expect(
        page.getByRole("row", { name: new RegExp(escapeRegExp(yearUpdatedName), "i") }),
      ).toBeVisible();

      await openSection(page, "programs");
      dialog = await createRecord(page);
      await fillWrappedField(dialog, /program name/i, programName);
      await fillWrappedField(dialog, /program code/i, programCode);
      await fillWrappedField(dialog, /^category$/i, "Playwright automation");
      await fillWrappedField(dialog, /sort order/i, "90");
      await fillWrappedField(dialog, /description/i, "Disposable admin program created by Playwright.");
      await dialog.getByRole("button", { name: /create record/i }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(programCode), "i") })).toBeVisible();

      await openSection(page, "cohorts");
      dialog = await createRecord(page);
      await fillWrappedField(dialog, /cohort name/i, cohortName);
      await fillWrappedField(dialog, /cohort code/i, cohortCode);
      await selectWrappedOptionByText(dialog, /\bprogram\b/i, new RegExp(escapeRegExp(programCode), "i"));
      await selectWrappedOptionByText(dialog, /academic year/i, new RegExp(escapeRegExp(yearUpdatedName), "i"));
      await fillWrappedField(dialog, /capacity/i, "25");
      await dialog.getByRole("button", { name: /create record/i }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(cohortCode), "i") })).toBeVisible();

      await openSection(page, "subjects");
      dialog = await createRecord(page);
      await fillWrappedField(dialog, /subject name/i, subjectName);
      await fillWrappedField(dialog, /subject code/i, subjectCode);
      await selectWrappedOptionByText(dialog, /\bprogram\b/i, new RegExp(escapeRegExp(programCode), "i"));
      await fillWrappedField(dialog, /sort order/i, "50");
      await fillWrappedField(dialog, /description/i, "Disposable admin subject created by Playwright.");
      await dialog.getByRole("button", { name: /create record/i }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(subjectCode), "i") })).toBeVisible();

      page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept();
      });
      await page
        .getByRole("row", { name: new RegExp(escapeRegExp(subjectCode), "i") })
        .getByRole("button", { name: /archive/i })
        .click();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(subjectCode), "i") })).toHaveCount(0);
      await page.getByRole("checkbox", { name: /show archived/i }).check();
      const archivedSubjectRow = page.getByRole("row", { name: new RegExp(escapeRegExp(subjectCode), "i") });
      await expect(archivedSubjectRow).toBeVisible();
      await archivedSubjectRow.getByRole("button", { name: /restore/i }).click();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(subjectCode), "i") })).toBeVisible();

      await openSection(page, "topics");
      dialog = await createRecord(page);
      await fillWrappedField(dialog, /topic name/i, topicName);
      await fillWrappedField(dialog, /topic code/i, topicCode);
      await selectWrappedOptionByText(dialog, /\bsubject\b/i, new RegExp(escapeRegExp(subjectCode), "i"));
      await selectWrappedOptionByText(dialog, /difficulty/i, "foundation");
      await fillWrappedField(dialog, /sort order/i, "25");
      await fillWrappedField(dialog, /description/i, "Disposable admin topic created by Playwright.");
      await dialog.getByRole("button", { name: /create record/i }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(topicCode), "i") })).toBeVisible();

      const topicRow = page.getByRole("row", { name: new RegExp(escapeRegExp(topicCode), "i") });
      await topicRow.getByRole("button", { name: /^edit$/i }).click();
      dialog = await academicDialog(page);
      await fillWrappedField(dialog, /topic name/i, topicUpdatedName);
      await selectWrappedOptionByText(dialog, /difficulty/i, "advanced");
      await dialog.getByRole("button", { name: /update record/i }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(topicUpdatedName), "i") })).toBeVisible();
      await expect(page.getByRole("row", { name: new RegExp(escapeRegExp(topicUpdatedName), "i") })).toContainText(/advanced/i);
    } finally {
      const topicId = await findRecordId(
        page.request,
        "topics",
        instituteId,
        (record) => record.code === topicCode || record.name === topicUpdatedName || record.name === topicName,
      );
      const subjectId = await findRecordId(
        page.request,
        "subjects",
        instituteId,
        (record) => record.code === subjectCode || record.name === subjectName,
      );
      const cohortId = await findRecordId(
        page.request,
        "cohorts",
        instituteId,
        (record) => record.code === cohortCode || record.name === cohortName,
      );
      const programId = await findRecordId(
        page.request,
        "programs",
        instituteId,
        (record) => record.code === programCode || record.name === programName,
      );
      const yearId = await findRecordId(
        page.request,
        "academic-years",
        instituteId,
        (record) => record.name === yearUpdatedName || record.name === yearName,
      );

      await archiveById(page.request, "topics", topicId);
      await archiveById(page.request, "subjects", subjectId);
      await archiveById(page.request, "cohorts", cohortId);
      await archiveById(page.request, "programs", programId);
      await archiveById(page.request, "academic-years", yearId);
    }
  });
});
