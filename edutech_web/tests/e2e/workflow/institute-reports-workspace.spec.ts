import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openInstituteReportsHub(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/reports");
  await expect(page).toHaveURL(/\/institute\/reports(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /reports/i }).first()).toBeVisible();
  await expect(page.getByText(/institute report directory/i).first()).toBeVisible();
}

test.describe("Institute reports workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow institute can open the reports hub and first-wave academic report pages", async ({
    page,
  }) => {
    await openInstituteReportsHub(page);

    await expect(page.getByRole("link", { name: /open weak topics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open subject report/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open rank history report/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open study recommendations report/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open wrong questions report/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open time management report/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open subject report/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/reports\/subjects(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /subject performance report/i }).first()).toBeVisible();
    await expect(page.getByText(/subject pressure board/i).first()).toBeVisible();
    await expect(page.getByText(/weak-topic feed/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/reports/weak-areas");
    await expect(page.getByRole("heading", { name: /topic mastery report/i }).first()).toBeVisible();
    await expect(page.getByText(/weak-topic ranking/i).first()).toBeVisible();
    await expect(page.getByText(/recovery action lane/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/reports/rank-history");
    await expect(page.getByRole("heading", { name: /rank history report/i }).first()).toBeVisible();
    await expect(page.getByText(/ranking snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/rank history ledger/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/reports/study-recommendations");
    await expect(page.getByRole("heading", { name: /study recommendations report/i }).first()).toBeVisible();
    await expect(page.getByText(/recommendation board/i).first()).toBeVisible();
    await expect(page.getByText(/coaching guidance/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/reports/wrong-questions");
    await expect(page.getByRole("heading", { name: /wrong questions report/i }).first()).toBeVisible();
    await expect(page.getByText(/most wrong questions/i).first()).toBeVisible();
    await expect(page.getByText(/most skipped questions/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/reports/time-management");
    await expect(page.getByRole("heading", { name: /time management report/i }).first()).toBeVisible();
    await expect(page.getByText(/timing pressure board/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/reports");
    await expect(page.getByText(/institute report directory/i).first()).toBeVisible();
  });

  test("@workflow institute can carry report-directory context into learner detail and back to the source report", async ({
    page,
  }) => {
    await openInstituteReportsHub(page);

    await page.getByRole("link", { name: /open subject report/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/reports\/subjects(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /subject performance report/i }).first()).toBeVisible();

    const learnerLink = page.locator('a[href*="/institute/reports/students/"]').first();
    await expect(learnerLink).toBeVisible();
    await learnerLink.click();

    await expect(page).toHaveURL(/\/institute\/reports\/students\/[^/?]+(?:\?from=subjects)?$/);
    await expect(page.getByRole("heading", { name: /student report detail/i }).first()).toBeVisible();
    await expect(page.getByText(/institute learner drilldown/i).first()).toBeVisible();
    await expect(page.getByText(/recommended handoffs/i).first()).toBeVisible();

    const backToSubject = page.getByRole("link", { name: /back to subject performance/i }).first();
    await expect(backToSubject).toBeVisible();
    await backToSubject.click();

    await expect(page).toHaveURL(/\/institute\/reports\/subjects(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /subject performance report/i }).first()).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/institute\/reports\/students\/[^/?]+(?:\?from=subjects)?$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/institute\/reports\/subjects(?:\?.*)?$/);

    await gotoWithRuntimeRecovery(page, "/institute/reports");
    await expect(page.getByRole("heading", { name: /reports/i }).first()).toBeVisible();
    await expect(page.getByText(/institute report directory/i).first()).toBeVisible();
  });
});
