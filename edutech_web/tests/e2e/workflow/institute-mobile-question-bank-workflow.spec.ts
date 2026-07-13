import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resetAndSeedDemoSharedLibraryWorkflow } from "../helpers/demo-shared-library";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function waitForQuestionAuthoringShell(page: Page, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const heading = page.locator("h1").first();
    const headingText = await heading.innerText().catch(() => "");
    if (/create question/i.test(headingText)) {
      return;
    }

    if (!/this page couldn.?t load/i.test(headingText) && attempt === attempts) {
      return;
    }

    await page.waitForTimeout(1000 * attempt);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const values = await locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  const firstValue = values[0] ?? null;
  expect(firstValue).not.toBeNull();
  await locator.selectOption(firstValue!);
}

async function selectProgramWithAvailableSubjects(page: Page) {
  const programSelect = page.locator('select[name="program"]');
  const subjectSelect = page.locator('select[name="subject"]');
  const programValues = await programSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );

  for (const programValue of programValues) {
    await programSelect.selectOption(programValue);
    try {
      await expect
        .poll(async () => subjectSelect.isDisabled().catch(() => true), { timeout: 2500 })
        .toBe(false);
      await expect.poll(async () => subjectSelect.locator("option").count()).toBeGreaterThan(1);
      const subjectValues = await subjectSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .filter((value) => value.trim().length > 0),
      );
      if (subjectValues.length > 0) {
        return { programValue, subjectValues };
      }
    } catch {
      continue;
    }
  }

  return null;
}

test.describe("Institute mobile question bank workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async () => {
    await Promise.resolve(resetAndSeedDemoSharedLibraryWorkflow());
  });

  test.afterEach(async () => {
    await Promise.resolve(resetAndSeedDemoSharedLibraryWorkflow());
  });

  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute mobile viewport supports question-bank intake and authoring entry", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRetry(page, "/institute/question-bank/new");
    await waitForQuestionAuthoringShell(page);
    await expect(page).toHaveURL(/\/institute\/question-bank\/new(?:\?.*)?$/);
    await expect(page.locator("h1").first()).toContainText(/create question/i);

    const questionProgramSelect = page.locator('select[name="program"]');
    const questionSubjectSelect = page.locator('select[name="subject"]');
    await expect(questionSubjectSelect).toBeDisabled();
    const resolvedAcademicPath = await selectProgramWithAvailableSubjects(page);
    expect(resolvedAcademicPath).not.toBeNull();
    await expect(questionProgramSelect).not.toHaveValue("");
    await expect.poll(async () => questionSubjectSelect.isDisabled().catch(() => true)).toBe(false);
  });
});
