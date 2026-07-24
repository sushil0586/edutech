import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectStudentWeakAreasWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/weak-areas(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /weak areas/i }).first()).toBeVisible();
}

test.describe("Student weak areas workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate topic mastery report rows and modal actions", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/weak-areas");
    await expectStudentWeakAreasWorkspace(page);

    const emptyState = page.getByText(/topic analytics are not available right now|waiting for topic performance data/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    const reportHeading = page.getByText(/topic mastery report/i).first();
    await expect(reportHeading).toBeVisible();

    const firstRow = page.locator(".studentTopicMasteryTable tbody tr").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/topic mastery/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /start practice/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open topic drilldown/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /question evidence/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /close/i }).first().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
