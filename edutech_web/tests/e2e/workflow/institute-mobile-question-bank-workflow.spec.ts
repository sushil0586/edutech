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

async function openMobileInstituteNav(page: Page) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  await expect(page.getByRole("navigation", { name: /institute admin navigation/i })).toBeVisible();
  await expect(page.locator("#mobile-workspace-menu")).toBeVisible();
  return page.locator("#mobile-workspace-menu");
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

test.describe("Institute mobile question bank workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.afterEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
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

    await gotoWithRetry(page, "/institute/dashboard");
    await expect(page.getByText(/institute control/i).first()).toBeVisible();

    const mobileNav = await openMobileInstituteNav(page);
    await expect(mobileNav.getByRole("link", { name: /^question bank$/i })).toBeVisible();
    await mobileNav.getByRole("link", { name: /^question bank$/i }).click();

    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/find questions faster/i).first()).toBeVisible();
    await expect(page.getByText(/shared library intake/i).first()).toBeVisible();
    await expect(page.getByText(/open the shared library linker only when the current bank does not have enough/i).first()).toBeVisible();

    await page.getByRole("link", { name: /open shared library linker/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/library-linker(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /shared library linker/i }).first()).toBeVisible();
    await expect(page.getByText(/current lane: shared library linker/i).first()).toBeVisible();
    await expect(page.getByText(/step 1\. choose class and subject/i).first()).toBeVisible();

    const linkerProgramSelect = page.locator('select[name="program"]');
    const linkerSubjectSelect = page.locator('select[name="subject"]');
    await expect(linkerProgramSelect).toBeVisible();
    await expect(linkerSubjectSelect).toBeVisible();
    await selectFirstNonEmptyOption(linkerProgramSelect);
    await selectFirstNonEmptyOption(linkerSubjectSelect);
    await expect(page.getByRole("button", { name: /load topics/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /open local question bank/i })).toBeVisible();

    await page.getByRole("link", { name: /open local question bank/i }).click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /create question/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/new(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

    const questionProgramSelect = page.locator('select[name="program"]');
    const questionSubjectSelect = page.locator('select[name="subject"]');
    await expect(questionSubjectSelect).toBeDisabled();
    await selectFirstNonEmptyOption(questionProgramSelect);
    await expect(questionSubjectSelect).toBeEnabled();
  });
});
