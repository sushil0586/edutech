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

test.describe("Student subscriptions workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate subscription filters plans orders wallet handoff and state messaging", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/subscriptions");
    await expect(page).toHaveURL(/\/app\/subscriptions(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /subscriptions/i }).first()).toBeVisible();
    await expect(page.getByText(/compare recurring plans, track subscriptions, and create plan requests/i).first()).toBeVisible();

    const unavailableTitle = page.getByText(/subscriptions are not available yet|subscription data could not be loaded/i).first();
    if (await unavailableTitle.isVisible().catch(() => false)) {
      await expect(unavailableTitle).toBeVisible();
      await expect(page.getByRole("link", { name: /open wallet/i }).first()).toBeVisible();
      return;
    }

    await expect(page.getByText(/subscription state/i).first()).toBeVisible();
    await expectAnyVisible(page, [
      /recurring plans are already visible on this account/i,
      /no active subscription is visible yet/i,
    ]);
    await expect(page.getByRole("link", { name: /open wallet/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /browse premium exams/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open practice catalog/i }).first()).toBeVisible();

    await expect(page.getByText(/available stars/i).first()).toBeVisible();
    await expect(page.getByText(/active plans/i).first()).toBeVisible();
    await expect(page.getByText(/pending orders/i).first()).toBeVisible();
    await expect(page.getByText(/available cycles/i).first()).toBeVisible();

    await expect(page.getByText(/subscription workspace filters/i).first()).toBeVisible();
    await expect(page.getByLabel(/student subscription section/i)).toBeVisible();
    await expect(page.getByLabel(/student subscription rows to show/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /apply filters/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /reset filters/i }).first()).toBeVisible();

    await expect(page.getByText(/when should you choose a subscription/i).first()).toBeVisible();
    await expect(page.getByText(/what this page covers/i).first()).toBeVisible();
    await expect(page.getByText(/active student subscriptions/i).first()).toBeVisible();
    await expect(page.getByText(/subscription orders/i).first()).toBeVisible();
    await expect(page.getByText(/available plans/i).first()).toBeVisible();
    await expect(page.getByText(/immediate activation/i).first()).toBeVisible();

    await expectAnyVisible(page, [
      /no active student subscriptions are visible yet/i,
      /billing events will appear here after the subscription is confirmed and credited/i,
      /latest credit state/i,
    ]);
    await expectAnyVisible(page, [
      /subscription order requests will appear here after you choose a plan cycle/i,
      /no payment transaction has been attached yet/i,
      /linked to credit/i,
      /pending credit/i,
    ]);
    await expectAnyVisible(page, [
      /subscription plans will appear here once your institute configures them/i,
      /request plan/i,
    ]);

    await page.getByLabel(/student subscription section/i).selectOption("orders");
    await page.getByLabel(/student subscription rows to show/i).selectOption("3");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/\/app\/subscriptions\?[^#]*section=orders/);
    await expect(page).toHaveURL(/\/app\/subscriptions\?[^#]*rows=3/);
    await expect(
      page.getByText(/this section shows whether your chosen plan is requested, processed, or fully linked to wallet credit activity/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/when should you choose a subscription/i).first()).toHaveCount(0);
    await expect(page.getByText(/what this page covers/i).first()).toHaveCount(0);

    await gotoWithRuntimeRecovery(page, "/app/subscriptions");
    await page.getByLabel(/student subscription section/i).selectOption("plans");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/\/app\/subscriptions\?[^#]*section=plans/);
    await expect(
      page.getByText(/review the available cycles and choose the plan that matches how often you unlock premium content/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/active student subscriptions/i).first()).toHaveCount(0);
    await expect(page.getByText(/subscription orders/i).first()).toHaveCount(0);

    const walletRailLink = page.locator("section.contentCard").filter({ hasText: /available plans/i }).getByRole("link", { name: /wallet/i }).first();
    if (await walletRailLink.isVisible().catch(() => false)) {
      await followLinkTarget(page, walletRailLink, /\/app\/wallet(?:\?.*)?$/);
    }

    await gotoWithRuntimeRecovery(page, "/app/subscriptions");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /open wallet/i }).first(),
      /\/app\/wallet(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/subscriptions");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /browse premium exams/i }).first(),
      /\/app\/exams(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/subscriptions");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /open practice catalog/i }).first(),
      /\/app\/practice(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/subscriptions?section=orders&rows=3");
    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expect(page).toHaveURL(/\/app\/subscriptions(?:\?.*)?$/);
    await expect(page.getByText(/when should you choose a subscription/i).first()).toBeVisible();
    await expect(page.getByText(/what this page covers/i).first()).toBeVisible();
  });
});
