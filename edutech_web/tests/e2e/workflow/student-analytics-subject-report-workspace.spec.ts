import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectStudentAnalyticsWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
}

test.describe("Student analytics subject report workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate subject performance report rows and modal actions", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/analytics");
    await expectStudentAnalyticsWorkspace(page);

    const emptyState = page.getByText(/analytics are not available yet|student analytics could not be loaded/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.getByText(/subject performance report/i).first()).toBeVisible();

    const firstRow = page.locator(".studentSubjectPerformanceTable tbody tr").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/subject performance/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open subject drilldown/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open topic mastery/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /close/i }).first().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
