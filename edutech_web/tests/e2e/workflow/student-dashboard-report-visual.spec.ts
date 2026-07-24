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

test.describe("Student dashboard report visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow @visual student dashboard summary hierarchy stays aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openDashboard(page);

    await expectVisualSnapshot(
      page.locator(".analyticsKpiGrid").first(),
      "student-dashboard-report-kpi-strip.png",
      280,
    );
    await expectVisualSnapshot(
      page.locator(".studentDashboardPrimaryGrid").first(),
      "student-dashboard-report-summary-band.png",
      340,
    );
  });

  test("@workflow @visual student dashboard recommendation and action queue stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openDashboard(page);

    await expectVisualSnapshot(
      page.locator(".studentDashboardRecommendation").first(),
      "student-dashboard-report-spotlight-card.png",
      320,
    );

    const actionQueue = await firstVisible([
      page.locator(".contentCard").filter({ hasText: /academic action queue/i }).first(),
      page.locator(".studentDashboardExamGrid").first(),
    ]);
    await expectVisualSnapshot(
      actionQueue,
      "student-dashboard-report-action-queue.png",
      340,
    );
  });

  test("@workflow @visual student dashboard premium lane and bottom summary stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openDashboard(page);

    await expectVisualSnapshot(
      page.locator(".studentDashboardPremiumSection").first(),
      "student-dashboard-report-premium-lane.png",
      340,
    );
    await expectVisualSnapshot(
      page.locator(".studentDashboardBottomGrid").first(),
      "student-dashboard-report-bottom-summary.png",
      340,
    );
  });

  test("@workflow @visual student dashboard performance summary exposes the reports hub CTA cleanly", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openDashboard(page);

    const performanceSummaryCard = page.locator(".contentCard").filter({ hasText: /performance summary/i }).first();
    await expectVisualSnapshot(
      performanceSummaryCard,
      "student-dashboard-report-performance-summary-card.png",
      340,
    );
  });
});
