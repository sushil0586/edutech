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

async function openUtilityRoute(page: Page, href: string, title: RegExp) {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?.*)?$`));
  await expect(page.getByRole("heading", { name: title }).first()).toBeVisible();
}

test.describe("Student mobile utility visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @visual student mobile profile stays readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/profile", /profile/i);

    await expectVisualSnapshot(
      page.locator(".studentInsightHeroCard").first(),
      "student-mobile-profile-hero.png",
      340,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-mobile-profile-kpi-strip.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".studentInsightsTwoColumn").first(),
      "student-mobile-profile-primary-grid.png",
      400,
    );
  });

  test("@workflow @visual student mobile settings stays readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/settings", /settings/i);

    await expectVisualSnapshot(
      page.locator(".studentInsightHeroCard").first(),
      "student-mobile-settings-hero.png",
      340,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-mobile-settings-kpi-strip.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".studentInsightsTwoColumn").first(),
      "student-mobile-settings-primary-grid.png",
      400,
    );
  });

  test("@workflow @visual student mobile notifications stays readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/notifications", /notifications/i);

    const statePanel = page
      .getByText(/your notification center is empty right now|notifications are not available yet|student notifications could not be loaded/i)
      .first();
    if (await statePanel.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-mobile-notifications-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    const hero = await firstVisible([
      page.locator(".studentInsightHeroCard").first(),
      page.locator(".contentCard").filter({ hasText: /how to use this inbox/i }).first(),
    ]);
    await expectVisualSnapshot(hero, "student-mobile-notifications-hero.png", 360);
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-mobile-notifications-kpi-strip.png",
      320,
    );
  });

  test("@workflow @visual student mobile wallet stays readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/wallet", /wallet/i);

    const blockedState = page
      .getByText(/wallet is not available yet|wallet data could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-mobile-wallet-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    const hero = await firstVisible([
      page.locator(".studentInsightHeroCard").first(),
      page.locator(".contentCard").filter({ hasText: /wallet state/i }).first(),
    ]);
    await expectVisualSnapshot(hero, "student-mobile-wallet-hero.png", 360);
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-mobile-wallet-kpi-strip.png",
      320,
    );
  });

  test("@workflow @visual student mobile subscriptions stays readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/subscriptions", /subscriptions/i);

    const blockedState = page
      .getByText(/subscriptions are not available yet|subscription data could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-mobile-subscriptions-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".studentInsightHeroCard").first(),
      "student-mobile-subscriptions-hero.png",
      360,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-mobile-subscriptions-kpi-strip.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".contentCard").filter({ hasText: /subscription workspace filters/i }).first(),
      "student-mobile-subscriptions-filters-card.png",
      400,
    );
  });

  test("@workflow @visual student mobile search stays readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/search", /search/i);

    await expectVisualSnapshot(
      page.locator(".contentCard").filter({ hasText: /what student search covers/i }).first(),
      "student-mobile-search-guide-card.png",
      380,
    );
    await expectVisualSnapshot(
      page.locator(".workspaceFiltersCard").first(),
      "student-mobile-search-filters-card.png",
      420,
    );
  });
});
