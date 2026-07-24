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

async function expectAnyVisible(root: Page | Locator, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const locator = root.getByText(pattern).first();
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return locator;
    }
  }

  throw new Error(`Expected one of these patterns to be visible: ${patterns.map(String).join(", ")}`);
}

test.describe("Student attempts workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate attempts workspace ledger filters paging and branching", async ({
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
    await expect(attemptsForm.locator('select[name="attempt_page_size"]')).toBeVisible();
    await attemptsForm.locator('select[name="attempt_filter"]').selectOption("submitted");
    await attemptsForm.locator('select[name="attempt_sort"]').selectOption("highest");
    await attemptsForm.locator('select[name="attempt_group"]').selectOption("status");
    await attemptsForm.locator('select[name="attempt_page_size"]').selectOption("6");
    await attemptsForm.getByRole("button", { name: /update view|apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_filter=submitted/);
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_sort=highest/);
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_group=status/);
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_page_size=6/);
    await expect(page.getByText(/status: submitted/i)).toBeVisible();
    await expect(page.getByText(/group: status/i)).toBeVisible();
    await expect(page.getByText(/page size:\s*6/i).first()).toBeVisible();

    const noMatchState = page.getByText(/no attempts match these controls/i).first();
    if (await noMatchState.isVisible().catch(() => false)) {
      await expect(page.getByText(/filter returned zero attempts/i).first()).toBeVisible();
      await page.getByRole("link", { name: /reset attempt filters/i }).first().click();
      await expectAttemptsWorkspace(page);
      return;
    }

    const groupedSection = page.locator(".studentResultsGroupedSection").first();
    await expect(groupedSection).toBeVisible();
    await expect(groupedSection).toContainText(/attempts/i);

    const paginationSummary = page.locator(".studentReviewPaginationSummary").first();
    if (await paginationSummary.isVisible().catch(() => false)) {
      await expect(paginationSummary).toContainText(/page \d+ of \d+/i);
      await expect(paginationSummary).toContainText(/showing \d+-\d+ of \d+ attempts/i);
    }

    await page.getByRole("link", { name: /group by status/i }).first().click();
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_group=status/);
    await expect(page.getByRole("link", { name: /group by status/i }).first()).toHaveClass(/studentWorkspaceQuickChipActive/);

    await page.getByRole("link", { name: /highest score/i }).first().click();
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_sort=highest/);

    await page.getByRole("link", { name: /evaluation pending/i }).first().click();
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_filter=submitted/);
    await expect(page.getByRole("link", { name: /evaluation pending/i }).first()).toHaveClass(/studentAttemptsQuickTabActive/);

    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expectAttemptsWorkspace(page);
    await expect(page.getByText(/status:\s*all/i).first()).toBeVisible();
    await expect(page.getByText(/sort:\s*latest/i).first()).toBeVisible();

    const attemptCard = page.locator("article.studentAttemptsCard").first();
    await expect(attemptCard).toBeVisible();
    await attemptCard.scrollIntoViewIfNeeded();
    await expect(attemptCard.locator(".studentAttemptsCardTitle strong").first()).toBeVisible();
    await expect(attemptCard.locator(".studentAttemptsMetrics").first()).toBeVisible();
    await expect(attemptCard.locator(".studentAttemptsFooter").first()).toBeVisible();
    await expectAnyVisible(
      attemptCard,
      [
        /in progress|submitted|evaluation pending|summary published|summary available|result pending|review pending|review available/i,
      ],
    );

    const primaryAction = await firstVisible([
      attemptCard.getByRole("link", { name: /resume attempt/i }).first(),
      attemptCard.getByRole("link", { name: /open summary|attempt summary|check attempt|view status/i }).first(),
    ]);
    const primaryLabel = (await primaryAction.textContent()) ?? "";
    const primaryHref = await primaryAction.getAttribute("href");

    if (/resume attempt/i.test(primaryLabel)) {
      expect(primaryHref).toMatch(/\/app\/attempts\/[^/?#]+$/);
      await expect(attemptCard.getByRole("link", { name: /exam detail/i }).first()).toBeVisible();
      await expect(attemptCard.locator(".studentAttemptsContextRow").first()).toBeVisible();
    } else {
      expect(primaryHref).toMatch(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(
        attemptCard.getByRole("link", { name: /check result status|view results|open results|attempt summary/i }).first(),
      ).toBeVisible();
      await expect(attemptCard.locator(".studentAttemptsNotice").first()).toBeVisible();

      const secondaryAction = await firstVisible([
        attemptCard.getByRole("link", { name: /check result status|view results|open results/i }).first(),
        attemptCard.getByRole("link", { name: /practice again/i }).first(),
        attemptCard.getByRole("button", { name: /start practice|unlock .*|starting/i }).first(),
      ]);
      const secondaryLabel = (await secondaryAction.textContent()) ?? "";

      if (/view results|open results|check result status/i.test(secondaryLabel)) {
        const href = await secondaryAction.getAttribute("href");
        expect(href).toMatch(/\/app\/results(?:\?.*)?$/);
      }
    }
  });
});
