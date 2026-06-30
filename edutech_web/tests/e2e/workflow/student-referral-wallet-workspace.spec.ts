import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

test.describe("Student referral and wallet workspace", () => {
  test.skip(
    testRequiresRole("student"),
    "Student Playwright credentials are not configured.",
  );

  test("@workflow student can inspect referral identity, wallet reward surfaces, and subscription handoff", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();
    await expect(
      page.locator(".detailCard").filter({ has: page.getByText(/^referral code$/i) }).first(),
    ).toBeVisible();
    await expect(
      page.locator(".detailCard").filter({ has: page.getByText(/^referral input$/i) }).first(),
    ).toBeVisible();
    await expect(
      page.locator(".detailCard").filter({ has: page.getByText(/^referral channel$/i) }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/the resulting reward credit, if any, is best verified from wallet after onboarding is complete/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open wallet/i }).first()).toBeVisible();

    await page.goto("/app/wallet");
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    await expect(page.getByText(/wallet state/i).first()).toBeVisible();
    await expect(page.getByText(/what this page can and cannot do/i).first()).toBeVisible();
    await expect(page.getByText(/does not promise instant settlement/i).first()).toBeVisible();
    await expect(page.getByText(/balance summary/i).first()).toBeVisible();
    await expect(page.getByText(/rewards and referral/i).first()).toBeVisible();
    await expect(page.getByText(/your referral code/i).first()).toBeVisible();
    await expect(page.getByText(/latest referral reward/i).first()).toBeVisible();
    await expect(page.getByText(/reward events/i).first()).toBeVisible();
    await expect(page.getByText(/recent ledger activity/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /compare plans/i }).first()).toBeVisible();
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

    await page.getByRole("link", { name: /compare plans/i }).first().click();
    await expect(page).toHaveURL(/\/app\/subscriptions(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /subscriptions/i }).first()).toBeVisible();
    await expect(page.getByText(/subscription state/i).first()).toBeVisible();
    await expect(page.getByLabel(/student subscription section/i)).toBeVisible();
    await expect(page.getByLabel(/student subscription rows to show/i)).toBeVisible();
    await expect(page.getByText(/what this page can and cannot do/i).first()).toBeVisible();
    await expect(page.getByText(/does not promise instant subscription activation or instant wallet credit/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open wallet/i }).first()).toBeVisible();
    await expectAnyVisible(page, [
      /available plans/i,
      /active student subscriptions/i,
      /waiting for live subscription data/i,
    ]);

    await page.getByLabel(/student subscription section/i).selectOption("plans");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/\/app\/subscriptions\?[^#]*section=plans/);
    await expect(
      page.getByText(/review the available cycles and choose the plan that matches how often you expect to unlock premium content/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/what this page can and cannot do/i).first()).toHaveCount(0);

    await page.getByRole("link", { name: /open wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app\/wallet(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
  });
});

async function expectAnyVisible(page: import("@playwright/test").Page, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const locator = page.getByText(pattern).first();
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return;
    }
  }

  throw new Error(`Expected one of these patterns to be visible: ${patterns.map(String).join(", ")}`);
}
