import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";
import { suppressVisualNoise } from "../helpers/visual";

async function expectVisualSnapshot(locator: Locator, name: string, maxDiffPixels: number) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await expect(locator).toBeVisible();
      await locator.page().waitForLoadState("domcontentloaded").catch(() => null);
      await locator.scrollIntoViewIfNeeded();
      await locator.page().waitForLoadState("load").catch(() => null);
      await suppressVisualNoise(locator.page());
      await expect(locator).toHaveScreenshot(name, {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels,
        timeout: 20000,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRetriable =
        message.includes("Element is not attached to the DOM") ||
        message.includes("waiting for") ||
        message.includes("navigated to");
      if (!isRetriable || attempt === 2) {
        throw error;
      }
    }
  }
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
  await expect
    .poll(
      async () => {
        await page.waitForLoadState("domcontentloaded").catch(() => null);
        const recommendationVisible = await page
          .locator(".studentDashboardRecommendation")
          .first()
          .isVisible()
          .catch(() => false);
        const primaryGridVisible = await page
          .locator(".studentDashboardPrimaryGrid")
          .first()
          .isVisible()
          .catch(() => false);
        return recommendationVisible || primaryGridVisible;
      },
      { timeout: 15000 },
    )
    .toBe(true);
}

test.describe("Student mobile dashboard report visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => {
    await suppressVisualNoise(page);
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
