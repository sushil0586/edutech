import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectStudentPracticeWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visible locator.");
}

async function expectQuickPracticeControls(page: Page) {
  const quickTabs = page.locator(".studentAttemptsQuickBar").first();
  if (await quickTabs.isVisible().catch(() => false)) {
    await expect(quickTabs.getByRole("link", { name: /^all/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /ready now/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /resume/i }).first()).toBeVisible();
    const reviewReadyTab = quickTabs.getByRole("link", { name: /review ready/i }).first();
    if (await reviewReadyTab.isVisible().catch(() => false)) {
      await expect(reviewReadyTab).toBeVisible();
    }
    return;
  }

  await expect(page.getByText(/quick filters/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^all$/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /ready now/i }).first()).toBeVisible();
}

test.describe("Student practice workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate compact practice workspace actions and filters", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/practice");
    await expectStudentPracticeWorkspace(page);

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    if (!(await filtersCard.isVisible().catch(() => false))) {
      await expect(page.getByText(/your practice workspace is empty right now/i).first()).toBeVisible();
      await page.getByRole("link", { name: /open weak areas/i }).first().click();
      await expect(page).toHaveURL(/\/app\/weak-areas(?:\?.*)?$/);
      return;
    }

    await expectQuickPracticeControls(page);

    const practiceForm = filtersCard.locator("form.studentWorkspaceFiltersForm").first();
    await practiceForm.locator('select[name="practice_filter"]').selectOption("review");
    await practiceForm.locator('select[name="practice_sort"]').selectOption("shortest");
    await practiceForm.locator('select[name="practice_group"]').selectOption("subject");
    await practiceForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_filter=review/);
    await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_sort=shortest/);
    await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_group=subject/);

    const noMatchState = page.getByText(/no practice sets match these controls/i).first();
    if (await noMatchState.isVisible().catch(() => false)) {
      await page.getByRole("link", { name: /reset practice filters/i }).first().click();
      await expectStudentPracticeWorkspace(page);
      return;
    }

    const readyNowTab = page.getByRole("link", { name: /ready now/i }).first();
    if (await readyNowTab.isVisible().catch(() => false)) {
      await readyNowTab.click();
      await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_filter=ready/);
    }

    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expectStudentPracticeWorkspace(page);

    const reportHeading = page.getByText(/practice recommendation report/i).first();
    if (!(await reportHeading.isVisible().catch(() => false))) {
      await expect(
        await firstVisible([
          page.getByText(/no practice sets match these controls/i).first(),
          page.getByText(/your practice workspace is empty right now/i).first(),
          page.getByText(/practice workspace/i).first(),
        ]),
      ).toBeVisible();
      return;
    }

    const firstRow = page
      .locator(".studentPracticeRecommendationTable tbody")
      .getByRole("button")
      .first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    const practiceDialog = page.getByRole("dialog");
    if (!(await practiceDialog.isVisible().catch(() => false))) {
      await firstRow.focus();
      await firstRow.press("Enter");
    }

    await expect(practiceDialog).toBeVisible();
    await expect(page.getByText(/practice recommendation/i).first()).toBeVisible();
    await expect(
      await firstVisible([
        page.getByRole("link", { name: /resume practice/i }).first(),
        page.getByRole("link", { name: /start practice/i }).first(),
        page.getByRole("link", { name: /review practice/i }).first(),
        page.getByRole("link", { name: /open summary/i }).first(),
        page.getByRole("link", { name: /view details/i }).first(),
      ]),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open weak areas/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /close/i }).first().click();
    await expect(practiceDialog).toHaveCount(0);
  });
});
