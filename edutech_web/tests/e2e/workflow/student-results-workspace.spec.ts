import { expect, test, type Page } from "@playwright/test";
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

async function expectStudentResultsWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
}

async function readResultCardSnapshot(resultCard: ReturnType<Page["locator"]>) {
  const title = (await resultCard.locator(".studentResultSurfaceHead strong").first().textContent())?.trim() ?? "";
  const source = (await resultCard.locator(".studentResultSurfaceStatus .statusPill").first().textContent())?.trim() ?? "";
  const visibility = (await resultCard.locator(".studentResultHelper strong").textContent())?.trim() ?? "";
  const reviewButtonVisible = await resultCard
    .getByRole("link", { name: /review attempt/i })
    .isVisible()
    .catch(() => false);

  return {
    title,
    source,
    visibility,
    reviewLabel:
      visibility === "Pending release" ? "Pending release" : reviewButtonVisible ? "Review ready" : "Summary only",
  };
}

test.describe("Student results workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate results workspace states and summary actions", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/results");
    await expectStudentResultsWorkspace(page);

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    if (await filtersCard.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /view analytics/i }).first()).toBeVisible();
      await page.getByRole("link", { name: /view analytics/i }).first().click();
      await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);

      await gotoWithRetry(page, "/app/results");
      await expectStudentResultsWorkspace(page);

      await expect(page.getByRole("link", { name: /open attempts/i }).first()).toBeVisible();
      await page.getByRole("link", { name: /open attempts/i }).first().click();
      await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);

      await gotoWithRetry(page, "/app/results");
      await expectStudentResultsWorkspace(page);

      const resultsForm = filtersCard.locator("form.studentWorkspaceFiltersForm").first();
      const firstResultCard = page.locator("article.studentResultSurface").first();
      const firstResultSnapshot = await readResultCardSnapshot(firstResultCard);

      await resultsForm.locator('select[name="result_status"]').selectOption("review_ready");
      await resultsForm.locator('select[name="result_sort"]').selectOption("highest");
      await resultsForm.locator('select[name="result_group"]').selectOption("source");
      await resultsForm.getByRole("button", { name: /apply filters/i }).click();

      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=review_ready/);
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_sort=highest/);
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_group=source/);
      await expect(page.getByText(/status: review ready/i)).toBeVisible();
      await expect(page.getByText(/group: source/i)).toBeVisible();
      await expect(page.locator(".studentResultsGroupedSection").filter({
        has: page.locator(".sectionHeading.sectionHeadingCompact strong", {
          hasText: firstResultSnapshot.source,
        }),
      }).locator("article.studentResultSurface").filter({
        has: page.locator(".studentResultSurfaceHead strong", {
          hasText: firstResultSnapshot.title,
        }),
      }).first()).toBeVisible();

      await filtersCard.getByRole("link", { name: /^published$/i }).click();
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=published/);

      await filtersCard.getByRole("link", { name: /review ready/i }).click();
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=review_ready/);

      await filtersCard.getByRole("link", { name: /needs work/i }).click();
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=fail/);

      await filtersCard.getByRole("link", { name: /top score/i }).click();
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_sort=highest/);

      await filtersCard.getByRole("link", { name: /fastest/i }).click();
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_sort=fastest/);

      await filtersCard.getByRole("link", { name: /group by source/i }).click();
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_group=source/);

      await filtersCard.getByRole("link", { name: /^all$/i }).click();
      await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);

      await resultsForm.locator('select[name="result_group"]').selectOption("review");
      await resultsForm.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_group=review/);
      await expect(page.getByText(/group: review/i)).toBeVisible();
      await expect(page.locator(".studentResultsGroupedSection").filter({
        has: page.locator(".sectionHeading.sectionHeadingCompact strong", {
          hasText: firstResultSnapshot.reviewLabel,
        }),
      }).locator("article.studentResultSurface").filter({
        has: page.locator(".studentResultSurfaceHead strong", {
          hasText: firstResultSnapshot.title,
        }),
      }).first()).toBeVisible();

      await page.getByRole("link", { name: /reset filters/i }).first().click();
      await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);

      const resultCard = page.locator("article.studentResultSurface").first();
      const summaryLink = resultCard.getByRole("link", {
        name: /attempt summary|check attempt/i,
      });
      await expect(summaryLink).toBeVisible();
      await summaryLink.click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/post-submit state/i).first()).toBeVisible();

      const reviewLink = page.getByRole("link", { name: /review attempt/i }).first();
      if (await reviewLink.isVisible().catch(() => false)) {
        await reviewLink.click();
        await expect(page).toHaveURL(/\/app\/attempts\/[^/]+\/review(?:\?.*)?$/);
      }
    } else {
      await expect(page.getByText(/your result history is empty right now/i).first()).toBeVisible();
      const openExamsLink = page.getByRole("link", { name: /open exams/i }).first();
      await expect(openExamsLink).toBeVisible();
      await openExamsLink.click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    }
  });
});
