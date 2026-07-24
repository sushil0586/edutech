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

async function openAnalytics(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/analytics");
  await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
}

async function openActions(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/analytics/actions");
  await expect(page).toHaveURL(/\/app\/analytics\/actions(?:\?.*)?$/);
}

async function openFirstSource(page: Page) {
  await openAnalytics(page);
  const sourceLink = page.locator('a[href^="/app/analytics/sources/"]').first();
  await expect(sourceLink).toBeVisible();
  await sourceLink.click();
  await expect(page).toHaveURL(/\/app\/analytics\/sources\/[^/?#]+(?:\?.*)?$/);
}

test.describe("Student analytics actions and sources visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow @visual student action center stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openActions(page);

    const blockedState = page
      .getByText(/action center is not available yet|action center could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-actions-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".analyticsDetailHero").first(),
      "student-actions-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".analyticsActionGrid").first(),
      "student-actions-primary-cards.png",
      380,
    );
    const evidenceGrid = await firstVisible([
      page.locator(".studentInsightsTwoColumn").first(),
      page.locator(".contentCard").filter({ hasText: /wrong answers to review/i }).first(),
    ]);
    await expectVisualSnapshot(
      evidenceGrid,
      "student-actions-evidence-grid.png",
      400,
    );
  });

  test("@workflow @visual student source drilldown stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openFirstSource(page);

    const blockedState = page
      .getByText(/this source drill-down is not available|source analytics are not available yet|source analytics could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-source-drilldown-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".analyticsDetailHero").first(),
      "student-source-drilldown-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-source-drilldown-kpi-strip.png",
      280,
    );
    const primaryGrid = await firstVisible([
      page.locator(".studentInsightsTwoColumn").first(),
      page.locator(".contentCard").filter({ hasText: /subject breakdown inside source/i }).first(),
    ]);
    await expectVisualSnapshot(
      primaryGrid,
      "student-source-drilldown-primary-grid.png",
      400,
    );
  });
});
