import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";
import { suppressVisualNoise } from "../helpers/visual";

test.describe("Student mobile dashboard and analytics visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => {
    await suppressVisualNoise(page);
  });

  test("@workflow @visual student mobile dashboard cards stay readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);

    const recommendationCard = page.locator(".studentDashboardRecommendation").first();
    const recommendationLead = recommendationCard.locator(".studentDashboardRecommendationLead").first();
    await expect(recommendationLead).toHaveScreenshot("student-mobile-dashboard-recommendation-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 260,
    });

    const queueCard = page.locator("section.contentCard").filter({
      has: page.getByRole("link", { name: /open attempt timeline/i }).first(),
    }).first();
    const primaryQueueCard = queueCard.locator(".studentDashboardExamCard").first();
    await expect(primaryQueueCard).toHaveScreenshot("student-mobile-dashboard-academic-action-queue-primary.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });

    const secondaryQueueCard = queueCard.locator(".studentDashboardExamCard").nth(1);
    await expect(secondaryQueueCard).toHaveScreenshot("student-mobile-dashboard-academic-action-queue-secondary.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });
  });

  test("@workflow @visual student mobile analytics surfaces stay readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);

    const analyticsHero = page.locator(".analyticsLandingHeroCopy").first();
    await expect(analyticsHero).toHaveScreenshot("student-mobile-analytics-hero.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 340,
      mask: [
        analyticsHero.locator(".analyticsHeroMetaGrid").first(),
        analyticsHero.locator(".analyticsLandingHeroActions").first(),
      ],
    });

    const topicPanel = page.locator(".analyticsPanelTopics").first();
    await expect(topicPanel).toHaveScreenshot("student-mobile-analytics-topic-panel.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 280,
    });
  });
});
