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

async function openDashboard(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
  await expect(page.locator(".analyticsKpiGrid").first()).toBeVisible();
  await expect(page.locator(".studentDashboardRecommendation").first()).toBeVisible();
}

test.describe("Student mobile dashboard report visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @visual student mobile dashboard summary hierarchy stays aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openDashboard(page);

    await expectVisualSnapshot(
      page.locator(".analyticsKpiGrid").first(),
      "student-mobile-dashboard-kpi-strip.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".studentDashboardPrimaryGrid").first(),
      "student-mobile-dashboard-summary-band.png",
      360,
    );
  });

  test("@workflow @visual student mobile dashboard recommendation and action queue stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openDashboard(page);

    await expectVisualSnapshot(
      page.locator(".studentDashboardRecommendation").first(),
      "student-mobile-dashboard-spotlight-card.png",
      340,
    );

    const actionQueue = await firstVisible([
      page.locator(".contentCard").filter({ hasText: /academic action queue/i }).first(),
      page.locator(".studentDashboardExamGrid").first(),
    ]);
    await expectVisualSnapshot(
      actionQueue,
      "student-mobile-dashboard-action-queue.png",
      360,
    );
  });

  test("@workflow @visual student mobile dashboard premium lane and bottom summary stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openDashboard(page);

    await expectVisualSnapshot(
      page.locator(".studentDashboardPremiumSection").first(),
      "student-mobile-dashboard-premium-lane.png",
      360,
    );
    await expectVisualSnapshot(
      page.locator(".studentDashboardBottomGrid").first(),
      "student-mobile-dashboard-bottom-summary.png",
      360,
    );
  });
});
