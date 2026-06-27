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

test.describe("Student analytics timeline and compare workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate analytics timeline and comparison surfaces", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/analytics/timeline");
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
    await expect(page.getByText(/trend snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/recent result timeline/i).first()).toBeVisible();
    await expect(page.getByText(/benchmark pulse/i).first()).toBeVisible();
    await expect(page.getByText(/subject momentum/i).first()).toBeVisible();
    await expect(page.getByText(/what to test next/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();

    const subjectMomentumLink = page.locator('a[href^="/app/analytics/subjects/"]').first();
    if (await subjectMomentumLink.isVisible().catch(() => false)) {
      await subjectMomentumLink.click();
      await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();
      await gotoWithRetry(page, "/app/analytics/timeline");
      await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
    }

    await page.getByRole("link", { name: /open results/i }).first().click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/results/compare");
    await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
    await expect(page.getByText(/comparison snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/best vs latest vs lowest/i).first()).toBeVisible();
    await expect(page.getByText(/benchmark snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/published result ledger/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open timeline/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open timeline/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
  });
});
