import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openTimeManagement(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/analytics/time-management");
  await expect(page).toHaveURL(/\/app\/analytics\/time-management(?:\?.*)?$/);
}

test.describe("Student time management workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate the time management report and timing handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openTimeManagement(page);

    const blockedState = page
      .getByText(/time management report is not available yet|time management report could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.getByRole("heading", { name: /time management report/i }).first()).toBeVisible();
    await expect(page.getByText(/timing snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/longest test sessions/i).first()).toBeVisible();
    await expect(page.getByText(/fast wrong answers/i).first()).toBeVisible();
    await expect(page.getByText(/slowest question ledger/i).first()).toBeVisible();
    await expect(page.getByText(/time interpretation/i).first()).toBeVisible();
    await expect(page.getByText(/related report links/i).first()).toBeVisible();

    for (const label of [
      /average question time/i,
      /average attempt time/i,
      /timed questions/i,
      /fast wrong answers/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    const slowLedgerRow = page.locator(".studentTimeManagementTable tbody tr").first();
    if (await slowLedgerRow.isVisible().catch(() => false)) {
      const drilldownLink = slowLedgerRow.getByRole("link", { name: /open drilldown/i }).first();
      await expect(drilldownLink).toBeVisible();
      const href = await drilldownLink.getAttribute("href");
      expect(href).toBeTruthy();
      await drilldownLink.click();
      await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      await openTimeManagement(page);
    }

    const openTimeline = page.getByRole("link", { name: /open timeline|open improvement timeline/i }).first();
    if (await openTimeline.isVisible().catch(() => false)) {
      await openTimeline.click();
      await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
      await openTimeManagement(page);
    }

    const openActionCenter = page.getByRole("link", { name: /open action center/i }).first();
    if (await openActionCenter.isVisible().catch(() => false)) {
      await openActionCenter.click();
      await expect(page).toHaveURL(/\/app\/analytics\/actions(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /next best moves/i }).first()).toBeVisible();
      await openTimeManagement(page);
    }

    const resultsLink = page.locator('a[href="/app/results"]').first();
    if (await resultsLink.isVisible().catch(() => false)) {
      await resultsLink.click();
      await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    }
  });
});
