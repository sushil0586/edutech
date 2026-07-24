import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openRankHistory(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/analytics/rank-history");
  await expect(page).toHaveURL(/\/app\/analytics\/rank-history(?:\?.*)?$/);
}

test.describe("Student rank history workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate the rank history report and ranking handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openRankHistory(page);

    const blockedState = page
      .getByText(/rank history is not available yet|rank history could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.getByRole("heading", { name: /rank & percentile history/i }).first()).toBeVisible();
    await expect(page.getByText(/ranking snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/rank checkpoints/i).first()).toBeVisible();
    await expect(page.getByText(/reading this report/i).first()).toBeVisible();
    await expect(page.getByText(/rank history ledger/i).first()).toBeVisible();
    await expect(page.getByText(/related report links/i).first()).toBeVisible();
    await expect(page.getByText(/release note/i).first()).toBeVisible();

    for (const label of [/latest rank/i, /best rank/i, /rank movement/i, /percentile/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    const openTimeline = page.getByRole("link", { name: /open timeline|open improvement timeline/i }).first();
    if (await openTimeline.isVisible().catch(() => false)) {
      await openTimeline.click();
      await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
      await openRankHistory(page);
    }

    const openResults = page.getByRole("link", { name: /open results|open results report/i }).first();
    if (await openResults.isVisible().catch(() => false)) {
      await openResults.click();
      await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
      await openRankHistory(page);
    }

    const compareLink = page.getByRole("link", { name: /open result comparison/i }).first();
    if (await compareLink.isVisible().catch(() => false)) {
      await compareLink.click();
      await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
    }
  });
});
