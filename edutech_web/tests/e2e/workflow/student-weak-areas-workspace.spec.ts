import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectWeakAreasWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/weak-areas(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /weak areas/i }).first()).toBeVisible();
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visible locator.");
}

test.describe("Student weak areas workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate weak-area recovery workspace and drilldowns", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/weak-areas");
    await expectWeakAreasWorkspace(page);

    const emptyState = page.getByText(/your topic analytics are not available right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.getByText(/waiting for topic performance data/i).first()).toBeVisible();
      await page.getByRole("link", { name: /start an exam/i }).first().click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
      return;
    }

    const loadState = page.getByText(/weak-area analytics could not be loaded/i).first();
    if (await loadState.isVisible().catch(() => false)) {
      await expect(page.getByText(/open analytics/i).first()).toBeVisible();
      await page.getByRole("link", { name: /open analytics/i }).first().click();
      await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
      return;
    }

    const hero = page.locator(".studentInsightHeroCard").first();
    await expect(hero).toBeVisible();
    await expect(hero.getByText(/improvement priority/i).first()).toBeVisible();

    const heroPrimary = await firstVisible([
      hero.locator(".studentInsightHeroActions .buttonPrimary").first(),
      hero.locator(".studentInsightHeroActions form .button").first(),
    ]);
    await expect(heroPrimary).toBeVisible();
    await expect(hero.getByRole("link", { name: /choose mock test/i }).first()).toBeVisible();

    const recoveryLane = page.locator(".contentCard").filter({ hasText: /recovery lane/i }).first();
    await expect(recoveryLane).toBeVisible();
    await expect(recoveryLane.getByText(/open focused practice workspace/i).first()).toBeVisible();

    const whyThisNext = page.locator(".contentCard").filter({ hasText: /why this next/i }).first();
    await expect(whyThisNext).toBeVisible();
    await expect(whyThisNext.getByText(/open analytics/i).first()).toBeVisible();

    const rankedTopics = page.locator(".contentCard").filter({ hasText: /ranked weak topics/i }).first();
    await expect(rankedTopics).toBeVisible();

    const firstWeakTopic = page.locator(".studentWeakAreaRow").first();
    await expect(firstWeakTopic).toBeVisible();
    await expect(firstWeakTopic.locator(".studentWeakAreaTitleLine strong").first()).toBeVisible();
    await expect(firstWeakTopic.locator(".studentWeakAreaMetrics").first()).toBeVisible();

    const drilldownAction = await firstVisible([
      firstWeakTopic.getByRole("link", { name: /view why/i }).first(),
      firstWeakTopic.getByRole("link", { name: /question evidence/i }).first(),
    ]);
    await drilldownAction.click();
    await expect(page).toHaveURL(/\/app\/analytics\/(topics|questions)(?:\/[^/?#]+)?(?:\?.*)?$/);

    await gotoWithRuntimeRecovery(page, "/app/weak-areas");
    await expectWeakAreasWorkspace(page);

    const practiceAction = page.getByRole("link", { name: /open focused practice workspace/i }).first();
    await expect(practiceAction).toBeVisible();
    await practiceAction.click();
    await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
  });
});
