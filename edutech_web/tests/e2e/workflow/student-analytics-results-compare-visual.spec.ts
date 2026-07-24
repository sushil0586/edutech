import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectVisualSnapshot(locator: Locator, name: string, maxDiffPixels: number) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    maxDiffPixels,
  });
}

async function openResultsCompare(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/analytics/results/compare");
  await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
}

test.describe("Student analytics results compare visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow @visual student results compare stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openResultsCompare(page);

    const blockedState = page
      .getByText(/result comparison is not available yet|result comparison could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot(
        "student-results-compare-blocked-state.png",
        {
          animations: "disabled",
          caret: "hide",
          maxDiffPixels: 240,
        },
      );
      return;
    }

    await expectVisualSnapshot(
      page.locator(".analyticsDetailHero").first(),
      "student-results-compare-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-results-compare-kpi-strip.png",
      280,
    );
    await expectVisualSnapshot(
      page.locator(".studentInsightsTwoColumn").first(),
      "student-results-compare-primary-grid.png",
      380,
    );
    await expectVisualSnapshot(
      page.locator(".contentCard").filter({ hasText: /published result ledger/i }).first(),
      "student-results-compare-ledger.png",
      420,
    );
  });
});
