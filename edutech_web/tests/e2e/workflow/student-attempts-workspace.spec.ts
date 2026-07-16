import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url);
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

async function expectAttemptsWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visible locator.");
}

test.describe("Student attempts workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate attempts workspace continuity and branching", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/attempts");
    await expectAttemptsWorkspace(page);

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
  if (!(await filtersCard.isVisible().catch(() => false))) {
      await expect(page.getByText(/your attempt history is empty right now/i).first()).toBeVisible();
      await page.getByRole("link", { name: /open exams/i }).first().click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
      return;
    }

    const quickTabs = page.locator(".studentAttemptsQuickBar").first();
    await expect(quickTabs).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /all/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /in progress/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /evaluation pending/i }).first()).toBeVisible();

    const attemptsForm = filtersCard.locator("form.studentWorkspaceFiltersForm").first();
    await attemptsForm.locator('select[name="attempt_filter"]').selectOption("submitted");
    await attemptsForm.locator('select[name="attempt_sort"]').selectOption("highest");
    await attemptsForm.locator('select[name="attempt_group"]').selectOption("status");
    await attemptsForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_filter=submitted/);
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_sort=highest/);
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_group=status/);
    await expect(page.getByText(/status: submitted/i)).toBeVisible();
    await expect(page.getByText(/group: status/i)).toBeVisible();

    const noMatchState = page.getByText(/no attempts match these controls/i).first();
    if (await noMatchState.isVisible().catch(() => false)) {
      await expect(page.getByText(/filter returned zero attempts/i).first()).toBeVisible();
      await page.getByRole("link", { name: /reset attempt filters/i }).first().click();
      await expectAttemptsWorkspace(page);
      return;
    }

    const groupedSection = page.locator(".studentResultsGroupedSection").first();
    await expect(groupedSection).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expectAttemptsWorkspace(page);

    const attemptCard = page.locator("article.studentAttemptsCard").first();
    await expect(attemptCard).toBeVisible();
    await expect(attemptCard.locator(".studentAttemptsCardTitle strong").first()).toBeVisible();
    await expect(attemptCard.locator(".studentAttemptsMetrics").first()).toBeVisible();
    await expect(attemptCard.locator(".studentAttemptsFooter").first()).toBeVisible();

    const primaryAction = await firstVisible([
      attemptCard.getByRole("link", { name: /resume attempt/i }).first(),
      attemptCard.getByRole("link", { name: /open summary|attempt summary|check attempt|view status/i }).first(),
    ]);
    const primaryLabel = (await primaryAction.textContent()) ?? "";
    const primaryHref = await primaryAction.getAttribute("href");

    if (/resume attempt/i.test(primaryLabel)) {
      expect(primaryHref).toMatch(/\/app\/attempts\/[^/?#]+$/);
      await expect(attemptCard.getByRole("link", { name: /exam detail/i }).first()).toBeVisible();
    } else {
      expect(primaryHref).toMatch(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(
        attemptCard.getByRole("link", { name: /check result status|view results|open results|attempt summary/i }).first(),
      ).toBeVisible();
    }
  });
});
