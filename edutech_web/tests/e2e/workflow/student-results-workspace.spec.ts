import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectStudentResultsWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visible locator.");
}

async function expectQuickResultControls(page: Page) {
  const quickTabs = page.locator(".studentAttemptsQuickBar").first();
  if (await quickTabs.isVisible().catch(() => false)) {
    await expect(quickTabs.getByRole("link", { name: /^all/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /published/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /pending/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /review ready/i }).first()).toBeVisible();
    return;
  }

  await expect(page.getByText(/quick filters/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^all$/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /published/i }).first()).toBeVisible();
}

test.describe("Student results workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate compact results workspace actions and filters", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/results");
    await expectStudentResultsWorkspace(page);

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    if (!(await filtersCard.isVisible().catch(() => false))) {
      await expect(page.getByText(/your result history is empty right now/i).first()).toBeVisible();
      await page.getByRole("link", { name: /open exams/i }).first().click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
      return;
    }

    await expectQuickResultControls(page);

    const resultsForm = filtersCard.locator("form.studentWorkspaceFiltersForm").first();
    await resultsForm.locator('select[name="result_status"]').selectOption("review_ready");
    await resultsForm.locator('select[name="result_sort"]').selectOption("highest");
    await resultsForm.locator('select[name="result_group"]').selectOption("source");
    const updateButton = resultsForm.getByRole("button", { name: /apply filters|update view/i });
    await updateButton.scrollIntoViewIfNeeded();
    await updateButton.click();

    await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=review_ready/);
    await expect(page).toHaveURL(/\/app\/results\?[^#]*result_sort=highest/);
    await expect(page).toHaveURL(/\/app\/results\?[^#]*result_group=source/);
    await expect(page.getByText(/status: review ready/i)).toBeVisible();
    await expect(page.getByText(/group: source/i)).toBeVisible();

    const noMatchState = page.getByText(/no results match these filters/i).first();
    if (await noMatchState.isVisible().catch(() => false)) {
      await page.getByRole("link", { name: /reset result filters|reset filters/i }).first().click();
      await expectStudentResultsWorkspace(page);
      return;
    }

    const pendingQuickControl = await firstVisible([
      page.locator(".studentAttemptsQuickBar").getByRole("link", { name: /pending/i }).first(),
      page.getByRole("link", { name: /pending only/i }).first(),
      page.getByRole("link", { name: /pending/i }).nth(1),
    ]).catch(() => null);

    if (pendingQuickControl) {
      await pendingQuickControl.click();
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=pending/);
    } else {
      await page.getByRole("link", { name: /reset result filters|reset filters/i }).first().click();
      await expectStudentResultsWorkspace(page);
    }

    await page.getByRole("link", { name: /^all/i }).first().click();
    await expectStudentResultsWorkspace(page);

    const firstReportRow = page.locator(".studentResultsTable tbody tr").first();
    await expect(firstReportRow).toBeVisible();
    await firstReportRow.click();

    const openSummary = page.getByRole("link", { name: /open summary/i }).first();
    const openReview = page.getByRole("link", { name: /open answer review/i }).first();

    if (await openReview.isVisible().catch(() => false)) {
      await openReview.click();
    } else {
      await openSummary.click();
    }
    await expect(page).toHaveURL(/\/app\/attempts\/[^/]+\/(summary|review)(?:\?.*)?$/);
  });
});
