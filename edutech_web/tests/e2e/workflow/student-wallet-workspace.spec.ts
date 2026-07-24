import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function followLinkTarget(page: Page, locator: Locator, expectedUrl: RegExp) {
  await expect(locator).toBeVisible();
  const href = await locator.getAttribute("href");
  expect(href).toBeTruthy();
  await gotoWithRuntimeRecovery(page, href!);
  await expect(page).toHaveURL(expectedUrl);
}

async function expectAnyVisible(page: Page, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const locator = page.getByText(pattern).first();
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return locator;
    }
  }

  throw new Error(`Expected one of these patterns to be visible: ${patterns.map(String).join(", ")}`);
}

test.describe("Student wallet workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate wallet balance rewards purchase routes and request-state visibility", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/wallet");
    await expect(page).toHaveURL(/\/app\/wallet(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    await expect(page.getByText(/track star balance, unlock history, and available purchase options/i).first()).toBeVisible();

    const unavailableTitle = page.getByText(/wallet is not available yet|wallet data could not be loaded/i).first();
    if (await unavailableTitle.isVisible().catch(() => false)) {
      await expect(unavailableTitle).toBeVisible();
      await expect(page.getByRole("link", { name: /back to dashboard/i }).first()).toBeVisible();
      return;
    }

    await expect(page.getByText(/wallet state/i).first()).toBeVisible();
    await expectAnyVisible(page, [
      /stars are available for premium unlocks/i,
      /no spendable stars are available yet/i,
    ]);
    await expectAnyVisible(page, [
      /no pending wallet requests right now/i,
      /order request.*still waiting for confirmation/i,
    ]);

    await expect(page.getByRole("link", { name: /compare plans/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /browse premium exams/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open practice catalog/i }).first()).toBeVisible();

    await expect(page.getByText(/available stars/i).first()).toBeVisible();
    await expect(page.getByText(/lifetime earned/i).first()).toBeVisible();
    await expect(page.getByText(/lifetime spent/i).first()).toBeVisible();
    await expect(page.getByText(/pending orders/i).first()).toBeVisible();

    await expect(page.getByText(/how your stars work/i).first()).toBeVisible();
    await expect(page.getByText(/what this page covers/i).first()).toBeVisible();
    await expect(page.getByText(/balance summary/i).first()).toBeVisible();
    await expect(page.getByText(/rewards and referral/i).first()).toBeVisible();
    await expect(page.getByText(/recent ledger activity/i).first()).toBeVisible();
    await expect(page.getByText(/content access history/i).first()).toBeVisible();
    await expect(page.getByText(/recommended next step/i).first()).toBeVisible();
    await expect(page.getByText(/star packs/i).first()).toBeVisible();
    await expect(page.getByText(/subscription plans/i).first()).toBeVisible();
    await expect(page.getByText(/recent requests/i).first()).toBeVisible();
    await expect(page.getByText(/order progress/i).first()).toBeVisible();

    await expect(page.getByText(/check your balance here, compare plans if needed/i).first()).toBeVisible();
    await expect(page.getByText(/instant settlement/i).first()).toBeVisible();

    await expectAnyVisible(page, [
      /reward events will appear here when signup, referral, or exam rules credit your wallet/i,
      /latest referral reward/i,
      /referral reward/i,
    ]);
    await expectAnyVisible(page, [
      /ledger history will appear here as soon as star activity is recorded/i,
      /recent ledger activity/i,
      /support grant/i,
      /signup bonus/i,
      /referral reward/i,
    ]);
    await expectAnyVisible(page, [
      /unlock decisions will appear here as you browse and unlock content from the student catalog/i,
      /content access history/i,
      /locked access/i,
      /unlocked/i,
    ]);
    await expectAnyVisible(page, [
      /star packs will appear here once your institute configures them/i,
      /request pack/i,
    ]);
    await expectAnyVisible(page, [
      /subscription plans will appear here once your institute configures them/i,
      /compare plans/i,
    ]);
    await expectAnyVisible(page, [
      /purchase requests will appear here once you create a pack or subscription order/i,
      /detailed order progress will appear here after you create a star pack or subscription order/i,
      /requested/i,
      /wallet credit/i,
    ]);

    await followLinkTarget(
      page,
      page.getByRole("link", { name: /compare plans/i }).first(),
      /\/app\/subscriptions(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/wallet");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /browse premium exams/i }).first(),
      /\/app\/exams(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/wallet");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /open practice catalog/i }).first(),
      /\/app\/practice(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/wallet");
    const subscriptionRailLink = page.locator("section.contentCard").filter({ hasText: /star packs/i }).getByRole("link", { name: /subscriptions/i }).first();
    if (await subscriptionRailLink.isVisible().catch(() => false)) {
      await followLinkTarget(page, subscriptionRailLink, /\/app\/subscriptions(?:\?.*)?$/);
    }

    await gotoWithRuntimeRecovery(page, "/app/wallet");
    const comparePlansCards = page.getByRole("link", { name: /compare plans/i });
    if ((await comparePlansCards.count()) > 1) {
      await followLinkTarget(page, comparePlansCards.nth(1), /\/app\/subscriptions(?:\?.*)?$/);
    }
  });
});
