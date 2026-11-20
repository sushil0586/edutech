import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

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

async function submitQuestionBankFilters(page: Page) {
  await page.getByRole("button", { name: /apply filters|update view/i }).click();
}

test.describe("Institute question bank workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can work through question bank workspace and authoring entry routes", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/find questions faster/i).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill("square root");
    await submitQuestionBankFilters(page);
    await expect(page).toHaveURL(/search=square\+root|search=square%20root/);
    await expect(searchField).toHaveValue("square root");

    await searchField.fill("playwright-no-match-zzqv-1781");
    await submitQuestionBankFilters(page);
    await expect(page.getByText(/no questions match these filters/i).first()).toBeVisible();
    await expect(page.getByText(/active controls are shaping this empty state/i).first()).toBeVisible();
    const resetFilters = page
      .getByRole("link", { name: /^reset filters$/i })
      .or(page.getByRole("button", { name: /^reset$/i }))
      .first();
    await expect(resetFilters).toBeVisible();
    await resetFilters.click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const firstDetails = page.locator("details.questionBankDetails").first();
    if (await firstDetails.isVisible().catch(() => false)) {
      await expect(firstDetails.locator("summary")).toContainText(/preview details|open full review/i);
      await expect(firstDetails).not.toHaveAttribute("open", "");
      await firstDetails.locator("summary").click();
      await expect(firstDetails).toHaveAttribute("open", "");
    }

    await page.getByRole("link", { name: /import questions csv/i }).click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/import(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/question-bank");
    await page.getByRole("link", { name: /import comprehension csv/i }).click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/comprehension\/import(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/question-bank");
    await page.getByRole("link", { name: /create question/i }).click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/new(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

    const questionProgramSelect = page.locator('select[name="program"]');
    const questionSubjectSelect = page.locator('select[name="subject"]');
    await expect(questionSubjectSelect).toBeDisabled();
    await selectFirstNonEmptyOption(questionProgramSelect);
    await expect(questionSubjectSelect).toBeEnabled();

    await gotoWithRuntimeRecovery(page, "/institute/question-bank");
    await page.getByRole("link", { name: /create comprehension set/i }).click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/comprehension\/new(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();

    const comprehensionProgramSelect = page.locator('select[name="program"]');
    const comprehensionSubjectSelect = page.locator('select[name="subject"]');
    await expect(comprehensionSubjectSelect).toBeDisabled();
    await selectFirstNonEmptyOption(comprehensionProgramSelect);
    await expect(comprehensionSubjectSelect).toBeEnabled();
  });
});
