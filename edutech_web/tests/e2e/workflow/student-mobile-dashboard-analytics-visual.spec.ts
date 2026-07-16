import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

test.describe("Student mobile dashboard and analytics visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @visual student mobile dashboard cards stay readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);

    const recommendationCard = page.locator(".studentDashboardRecommendation").first();
    await expect(recommendationCard).toHaveScreenshot("student-mobile-dashboard-recommendation-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 260,
    });

    const queueCard = page.locator(".contentCard").filter({ hasText: /study queue/i }).first();
    await expect(queueCard).toHaveScreenshot("student-mobile-dashboard-study-queue.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 300,
    });
  });

  test("@workflow @visual student mobile analytics surfaces stay readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);

    const analyticsHero = page.locator(".analyticsLandingHero").first();
    await expect(analyticsHero).toHaveScreenshot("student-mobile-analytics-hero.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 340,
    });

    const topicPanel = page.locator(".analyticsPanelTopics").first();
    await expect(topicPanel).toHaveScreenshot("student-mobile-analytics-topic-panel.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 280,
    });
  });
});
