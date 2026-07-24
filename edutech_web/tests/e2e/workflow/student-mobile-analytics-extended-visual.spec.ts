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

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visual target to be visible.");
}

async function openStudentRoute(page: Page, href: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

async function openFirstSource(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/analytics");
  await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
  const sourceLink = page.locator('a[href^="/app/analytics/sources/"]').first();
  await expect(sourceLink).toBeVisible();
  await sourceLink.click();
  await expect(page).toHaveURL(/\/app\/analytics\/sources\/[^/?#]+(?:\?.*)?$/);
}

test.describe("Student mobile analytics extended visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @visual student mobile action center stays readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openStudentRoute(page, "/app/analytics/actions", /next best moves/i);

    const blockedState = page
      .getByText(/action center is not available yet|action center could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-mobile-actions-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".analyticsDetailHero").first(),
      "student-mobile-actions-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".analyticsActionGrid").first(),
      "student-mobile-actions-primary-cards.png",
      380,
    );
    const evidenceGrid = await firstVisible([
      page.locator(".studentInsightsTwoColumn").first(),
      page.locator(".contentCard").filter({ hasText: /wrong answers to review/i }).first(),
    ]);
    await expectVisualSnapshot(
      evidenceGrid,
      "student-mobile-actions-evidence-grid.png",
      400,
    );
  });

  test("@workflow @visual student mobile source drilldown stays readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openFirstSource(page);

    const blockedState = page
      .getByText(/this source drill-down is not available|source analytics are not available yet|source analytics could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-mobile-source-drilldown-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".analyticsDetailHero").first(),
      "student-mobile-source-drilldown-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-mobile-source-drilldown-kpi-strip.png",
      320,
    );
    const primarySurface = await firstVisible([
      page.locator(".studentInsightsTwoColumn").first(),
      page.locator(".contentCard").filter({ hasText: /subject breakdown inside source/i }).first(),
    ]);
    await expectVisualSnapshot(
      primarySurface,
      "student-mobile-source-drilldown-primary-grid.png",
      400,
    );
  });

  test("@workflow @visual student mobile results compare stays readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openStudentRoute(page, "/app/analytics/results/compare", /result comparison/i);

    const blockedState = page
      .getByText(/result comparison is not available yet|result comparison could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-mobile-results-compare-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".analyticsDetailHero").first(),
      "student-mobile-results-compare-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-mobile-results-compare-kpi-strip.png",
      320,
    );
    const primarySurface = await firstVisible([
      page.locator(".studentInsightsTwoColumn").first(),
      page.locator(".contentCard").filter({ hasText: /best vs latest vs lowest/i }).first(),
    ]);
    await expectVisualSnapshot(
      primarySurface,
      "student-mobile-results-compare-primary-grid.png",
      400,
    );
  });
});
