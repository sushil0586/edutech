import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
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

test.describe("Student utility workspace coverage", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate dashboard, identity, notifications, wallet, subscriptions, and search surfaces", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
    await expect(page.getByText(/recommended for you/i).first()).toBeVisible();
    await expect(page.getByText(/action queue/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open wallet|open attempt timeline/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/profile");
    await expect(page).toHaveURL(/\/app\/profile(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();
    await expect(page.getByText(/student identity/i).first()).toBeVisible();
    await expect(page.getByText(/academic context/i).first()).toBeVisible();
    await expect(page.getByText(/orientation|what to check next/i).first()).toBeVisible();
    await expect(page.getByText(/identity trust checks/i).first()).toBeVisible();
    await expect(page.getByText(/student support flow/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open settings/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/settings");
    await expect(page).toHaveURL(/\/app\/settings(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible();
    await expect(page.getByText(/account controls/i).first()).toBeVisible();
    await expect(page.getByText(/what you can do here/i).first()).toBeVisible();
    await expect(page.getByText(/session and access/i).first()).toBeVisible();
    await expect(page.getByText(/account management handoff/i).first()).toBeVisible();
    await expect(
      page.getByText(/does not pretend to offer profile editing/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/password resets, institute corrections, and administrative identity changes remain outside this learner shell today/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /logout from this device/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /profile/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/notifications");
    await expect(page).toHaveURL(/\/app\/notifications(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /notifications/i }).first()).toBeVisible();

    const notificationsEmptyState = page.getByText(/your notification center is empty right now/i).first();
    if (await notificationsEmptyState.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
    } else {
      await expect(page.getByText(/inbox overview/i).first()).toBeVisible();
      await expect(page.getByText(/how to use this inbox/i).first()).toBeVisible();
      await expect(page.getByText(/best next checks/i).first()).toBeVisible();
      await expect(page.getByText(/a strong sequence is: open the linked learner route/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /check result status/i }).first()).toBeVisible();

      const markReadButton = page.getByRole("button", { name: /^mark read$/i }).first();
      if (await markReadButton.isVisible().catch(() => false)) {
        await markReadButton.click();
        await expect(
          page.getByText(/notification marked as read/i).first(),
        ).toBeVisible();
      }

      const markAllReadButton = page.getByRole("button", { name: /mark all read/i }).first();
      if (await markAllReadButton.isVisible().catch(() => false)) {
        const isEnabled = await markAllReadButton.isEnabled().catch(() => false);
        if (isEnabled) {
          await markAllReadButton.click();
          await expect(
            page.getByText(/all notifications marked as read/i).first(),
          ).toBeVisible();
        }
      }

      const filtersCard = page.locator("section.studentNotificationFiltersCard").first();
      await expect(filtersCard).toBeVisible();
      await filtersCard.locator('select').nth(0).selectOption("unread");
      await page.waitForURL(/\/app\/notifications\?[^#]*status=unread/);

      const noMatches = page.getByText(/no notifications match the current filters/i).first();
      if (await noMatches.isVisible().catch(() => false)) {
        const clearFiltersLink = page.getByRole("link", { name: /clear filters/i }).first();
        await expect(clearFiltersLink).toBeVisible();
        await clearFiltersLink.click();
        await expect(page).toHaveURL(/\/app\/notifications(?:\?.*)?$/);
      } else {
        const groupingSelect = page.locator("label.studentNotificationGroupingControl select");
        await expect(groupingSelect).toBeVisible();
        await groupingSelect.selectOption("type");
        await expect(page).toHaveURL(/\/app\/notifications\?[^#]*status=unread/);
        await expect(groupingSelect).toHaveValue("type");
        await expect(page.getByText(/matching notifications/i).first()).toBeVisible();
        await expectAnyVisible(page, [/open exam detail/i, /open attempt summary/i, /open notification detail/i]);

        await filtersCard.getByRole("link", { name: /^reset$/i }).click();
        await expect(page).toHaveURL(/\/app\/notifications(?:\?.*)?$/);
      }
    }

    await gotoWithRetry(page, "/app/wallet");
    await expect(page).toHaveURL(/\/app\/wallet(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    await expect(page.getByText(/wallet state/i).first()).toBeVisible();
    await expect(page.getByText(/what this page can and cannot do/i).first()).toBeVisible();
    await expect(page.getByText(/a safe order is: check balance and request state here/i).first()).toBeVisible();
    await expect(page.getByText(/instant settlement/i).first()).toBeVisible();
    await expect(
      page.getByText(/does not promise instant settlement/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /compare plans/i }).first()).toBeVisible();
    await expectAnyVisible(page, [/star packs/i, /subscription plans/i]);
    await expectAnyVisible(page, [
      /stars are available for premium unlocks/i,
      /no spendable stars are available yet/i,
    ]);
    await expectAnyVisible(page, [
      /no pending wallet requests right now/i,
      /order request.*still waiting for confirmation/i,
    ]);
    await expectAnyVisible(page, [
      /ledger history will appear here as soon as star activity is recorded/i,
      /recent ledger activity/i,
    ]);
    await expectAnyVisible(page, [
      /unlock decisions will appear here/i,
      /content access history/i,
    ]);

    await gotoWithRetry(page, "/app/subscriptions");
    await expect(page).toHaveURL(/\/app\/subscriptions(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /subscriptions/i }).first()).toBeVisible();
    await expect(page.getByText(/subscription state/i).first()).toBeVisible();
    await expect(page.getByLabel(/student subscription section/i)).toBeVisible();
    await expect(page.getByLabel(/student subscription rows to show/i)).toBeVisible();
    await expect(page.getByText(/what this page can and cannot do/i).first()).toBeVisible();
    await expect(page.getByText(/a safe order is: compare cycles here/i).first()).toBeVisible();
    await expect(page.getByText(/immediate activation/i).first()).toBeVisible();
    await expect(
      page.getByText(/does not promise instant subscription activation or instant wallet credit/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open wallet/i }).first()).toBeVisible();
    await expectAnyVisible(page, [/available plans/i, /active student subscriptions/i, /waiting for live subscription data/i]);
    await expectAnyVisible(page, [
      /no active subscription is visible yet/i,
      /recurring plans are already visible on this account/i,
    ]);
    await expectAnyVisible(page, [
      /subscription order requests will appear here after you choose a plan cycle/i,
      /subscription orders/i,
    ]);
    await expectAnyVisible(page, [
      /no active student subscriptions are visible yet/i,
      /billing events will appear here after the subscription is confirmed and credited/i,
      /latest credit state/i,
    ]);

    await page.getByLabel(/student subscription section/i).selectOption("orders");
    await page.getByLabel(/student subscription rows to show/i).selectOption("3");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/\/app\/subscriptions\?[^#]*section=orders/);
    await expect(page).toHaveURL(/\/app\/subscriptions\?[^#]*rows=3/);
    await expect(
      page.getByText(/this section shows whether your chosen plan is still only requested, already processed, or fully linked to wallet credit activity/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/review the available cycles and choose the plan that matches how often you expect to unlock premium content/i).first(),
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /what this page can and cannot do/i })).toHaveCount(0);

    await gotoWithRetry(page, "/app/search");
    await expect(page).toHaveURL(/\/app\/search(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /search/i }).first()).toBeVisible();
    await expect(page.getByText(/what student search covers/i).first()).toBeVisible();
    await expect(page.getByText(/a strong sequence is: use search to find the right learner route quickly/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to workspace/i }).first()).toBeVisible();

    const searchForm = page.locator("form.workspaceFiltersForm").first();
    await expect(searchForm).toBeVisible();
    await searchForm.locator('input[name="q"]').fill("results");
    await searchForm.locator('select[name="source"]').selectOption("catalog");
    await searchForm.locator('select[name="group"]').selectOption("section");
    await searchForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*source=catalog/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*group=section/);
    await expect(page.getByText(/source:\s*catalog/i).first()).toBeVisible();
    await expect(page.getByText(/group: section/i).first()).toBeVisible();

    const noSearchResults = page.getByText(/no pages or live records matched this search/i).first();
    if (await noSearchResults.isVisible().catch(() => false)) {
      await expect(noSearchResults).toBeVisible();
    } else {
      await expect(page.getByText(/search results|suggested pages/i).first()).toBeVisible();
      await expect(page.locator(".detailGrid .detailCard").first()).toBeVisible();
    }

    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expect(page).toHaveURL(/\/app\/search(?:\?.*)?$/);
  });
});
