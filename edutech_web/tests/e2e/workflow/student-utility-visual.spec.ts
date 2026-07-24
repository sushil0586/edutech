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

test.describe("Student utility visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow @visual student profile stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/profile", /profile/i);

    await expectVisualSnapshot(
      page.locator(".studentInsightHeroCard").first(),
      "student-profile-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-profile-kpi-strip.png",
      280,
    );
    await expectVisualSnapshot(
      page.locator(".studentInsightsTwoColumn").first(),
      "student-profile-primary-grid.png",
      380,
    );
  });

  test("@workflow @visual student settings stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/settings", /settings/i);

    await expectVisualSnapshot(
      page.locator(".studentInsightHeroCard").first(),
      "student-settings-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-settings-kpi-strip.png",
      280,
    );
    await expectVisualSnapshot(
      page.locator(".studentInsightsTwoColumn").first(),
      "student-settings-primary-grid.png",
      380,
    );
  });

  test("@workflow @visual student notifications stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/notifications", /notifications/i);

    const statePanel = page.getByText(/your notification center is empty right now|notifications are not available yet|student notifications could not be loaded/i).first();
    if (await statePanel.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-notifications-state.png", {
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
    await expectVisualSnapshot(hero, "student-notifications-hero.png", 340);
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-notifications-kpi-strip.png",
      280,
    );
    const inboxSurface = await firstVisible([
      page.locator("section.studentNotificationFiltersCard").first(),
      page.locator(".contentCard").filter({ hasText: /how to use this inbox/i }).first(),
    ]);
    await expectVisualSnapshot(
      inboxSurface,
      "student-notifications-primary-surface.png",
      420,
    );
  });

  test("@workflow @visual student wallet stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/wallet", /wallet/i);

    const blockedState = page
      .getByText(/wallet is not available yet|wallet data could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-wallet-blocked-state.png", {
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
    await expectVisualSnapshot(hero, "student-wallet-hero.png", 340);
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-wallet-kpi-strip.png",
      280,
    );
    const primarySurface = await firstVisible([
      page.locator(".contentCard").filter({ hasText: /what this page covers/i }).first(),
      page.locator(".contentCard").nth(1),
    ]);
    await expectVisualSnapshot(
      primarySurface,
      "student-wallet-primary-surface.png",
      420,
    );
  });

  test("@workflow @visual student subscriptions stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/subscriptions", /subscriptions/i);

    const blockedState = page
      .getByText(/subscriptions are not available yet|subscription data could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-subscriptions-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".studentInsightHeroCard").first(),
      "student-subscriptions-hero.png",
      340,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-subscriptions-kpi-strip.png",
      280,
    );
    await expectVisualSnapshot(
      page.locator(".contentCard").filter({ hasText: /subscription workspace filters/i }).first(),
      "student-subscriptions-filters-card.png",
      400,
    );
  });

  test("@workflow @visual student search stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openUtilityRoute(page, "/app/search", /search/i);

    await expectVisualSnapshot(
      page.locator(".contentCard").filter({ hasText: /what student search covers/i }).first(),
      "student-search-guide-card.png",
      360,
    );
    await expectVisualSnapshot(
      page.locator(".workspaceFiltersCard").first(),
      "student-search-filters-card.png",
      420,
    );
  });
});
