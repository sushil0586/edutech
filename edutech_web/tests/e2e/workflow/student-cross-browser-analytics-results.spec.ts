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

test.describe("Student cross-browser analytics and results sanity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can open results and analytics deep routes across browser engines", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/results");
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /view analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open attempts/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /view analytics/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/results/compare");
    await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
    await expect(page.getByText(/comparison snapshot/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open timeline/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open timeline/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
    await expect(page.getByText(/recent result timeline/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();
  });
});
