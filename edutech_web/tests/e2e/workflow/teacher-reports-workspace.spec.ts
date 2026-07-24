import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

test.describe("Teacher reports workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can open the reports hub and first-wave report pages", async ({ page }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/teacher/reports");
    await expect(page.getByRole("heading", { name: /reports hub/i }).first()).toBeVisible();
    await expect(page.getByText(/teacher student-level reports/i).first()).toBeVisible();
    await expect(page.getByText(/teacher report directory/i).first()).toBeVisible();

    await expect(page.getByRole("link", { name: /open subject report/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open topic mastery report/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open rank history report/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open wrong questions report/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open time management report/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open study recommendations report/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open subject report/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reports\/subjects(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /subject performance report/i }).first()).toBeVisible();
    await expect(page.getByText(/subject pressure board/i).first()).toBeVisible();
    await expect(page.getByText(/weak-topic feed/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/reports/weak-areas");
    await expect(page.getByRole("heading", { name: /topic mastery report/i }).first()).toBeVisible();
    await expect(page.getByText(/weak-topic ranking/i).first()).toBeVisible();
    await expect(page.getByText(/recovery action lane/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/reports/rank-history");
    await expect(page.getByRole("heading", { name: /rank history report/i }).first()).toBeVisible();
    await expect(page.getByText(/ranking snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/rank history ledger/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/reports/wrong-questions");
    await expect(page.getByRole("heading", { name: /wrong questions report/i }).first()).toBeVisible();
    await expect(page.getByText(/most wrong questions/i).first()).toBeVisible();
    await expect(page.getByText(/most skipped questions/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/reports/time-management");
    await expect(page.getByRole("heading", { name: /time management report/i }).first()).toBeVisible();
    await expect(page.getByText(/timing pressure board/i).first()).toBeVisible();
    await expect(page.getByText(/timing action lane/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/reports/study-recommendations");
    await expect(page.getByRole("heading", { name: /study recommendations report/i }).first()).toBeVisible();
    await expect(page.getByText(/recommendation board/i).first()).toBeVisible();
    await expect(page.getByText(/coaching guidance/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/reports");
    const backToResultsLink = page.getByRole("link", { name: /back to results/i }).first();
    await expect(backToResultsLink).toBeVisible();
    await backToResultsLink.click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);
  });
});
