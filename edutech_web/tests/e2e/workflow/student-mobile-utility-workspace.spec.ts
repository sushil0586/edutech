import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";
import { expectStudentWorkspace } from "../helpers/navigation";

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

test.describe("Student mobile utility workspace coverage", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow student can validate core mobile profile wallet subscription and search surfaces", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
    await expect(page.getByText(/student workspace/i).first()).toBeVisible();
    await expectAnyVisible(page, [
      /recommended for you/i,
      /your next recommended test/i,
      /action queue/i,
      /do this now/i,
    ]);

    await gotoWithRuntimeRecovery(page, "/app/profile");
    await expect(page).toHaveURL(/\/app\/profile(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();
    await expect(page.getByText(/student identity/i).first()).toBeVisible();
    await expect(page.getByText(/academic context/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open settings/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/app/notifications");
    await expect(page).toHaveURL(/\/app\/notifications(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /notifications/i }).first()).toBeVisible();
    await expectAnyVisible(page, [
      /your notification center is empty right now/i,
      /inbox overview/i,
      /how to use this inbox/i,
    ]);

    await gotoWithRuntimeRecovery(page, "/app/wallet");
    await expect(page).toHaveURL(/\/app\/wallet(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    await expect(page.getByText(/wallet state/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /compare plans/i }).first()).toBeVisible();
    await expectAnyVisible(page, [/star packs/i, /subscription plans/i]);

    await gotoWithRuntimeRecovery(page, "/app/subscriptions");
    await expect(page).toHaveURL(/\/app\/subscriptions(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /subscriptions/i }).first()).toBeVisible();
    await expect(page.getByText(/subscription state/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open wallet/i }).first()).toBeVisible();
    await expectAnyVisible(page, [/available plans/i, /active student subscriptions/i, /waiting for live subscription data/i]);

    await gotoWithRuntimeRecovery(page, "/app/search");
    await expect(page).toHaveURL(/\/app\/search(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /search/i }).first()).toBeVisible();
    await expect(page.getByText(/what student search covers/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to workspace/i }).first()).toBeVisible();

    const searchForm = page.locator("form.workspaceFiltersForm").first();
    await expect(searchForm).toBeVisible();
    await searchForm.locator('input[name="q"]').fill("results");
    await searchForm.locator('select[name="source"]').selectOption("catalog");
    await searchForm.locator('select[name="group"]').selectOption("section");
    await searchForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page.getByText(/source:\s*catalog/i).first()).toBeVisible();
    await expect(page.getByText(/group: section/i).first()).toBeVisible();
  });
});
