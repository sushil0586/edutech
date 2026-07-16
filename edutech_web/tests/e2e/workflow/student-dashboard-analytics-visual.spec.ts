import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

test.describe("Student dashboard and analytics visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow @visual dashboard recommendation and premium sections stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);

    const recommendationCard = page.locator(".studentDashboardRecommendation").first();
    await expect(recommendationCard).toHaveScreenshot("student-dashboard-recommendation-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 240,
    });

    const premiumSection = page.locator(".studentDashboardPremiumSection").first();
    await expect(premiumSection).toHaveScreenshot("student-dashboard-premium-section.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 280,
    });
  });

  test("@workflow @visual analytics hero and topic panels stay aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);

    const analyticsHero = page.locator(".analyticsLandingHero").first();
    await expect(analyticsHero).toHaveScreenshot("student-analytics-hero.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 320,
    });

    const topicPanel = page.locator(".analyticsPanelTopics").first();
    await expect(topicPanel).toHaveScreenshot("student-analytics-topic-panel.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 260,
    });
  });
});
