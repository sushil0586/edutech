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

test.describe("Student cross-browser shell sanity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can navigate core shell routes across browser engines", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/dashboard");
    await expect(page.getByText(/action queue/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /dashboard/i }).first()).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("link", { name: /^tests$/i }).first().click();
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^analytics$/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^results$/i }).first().click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /view analytics/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^profile$/i }).first().click();
    await expect(page).toHaveURL(/\/app\/profile(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open settings/i }).first()).toBeVisible();
  });
});
