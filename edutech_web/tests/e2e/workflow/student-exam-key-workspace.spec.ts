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

test.describe("Student exam-key workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate exam-key entry guidance and required-field handling", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/exams");
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();

    const enterKeyLink = page.getByRole("link", { name: /enter exam key/i }).first();
    if (await enterKeyLink.isVisible().catch(() => false)) {
      await enterKeyLink.click();
    } else {
      await gotoWithRetry(page, "/app/exams/enter-key");
    }

    await expect(page).toHaveURL(/\/app\/exams\/enter-key(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /enter exam key/i }).first()).toBeVisible();
    await expect(page.getByText(/quick exam lookup/i).first()).toBeVisible();
    await expect(page.getByText(/jump directly to the right exam/i).first()).toBeVisible();
    await expect(page.getByText(/what happens next/i).first()).toBeVisible();
    await expect(page.getByText(/need the full list instead\?/i).first()).toBeVisible();
    await expect(
      page.getByText(/access key routing still respects the same backend rules/i).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: /open exam/i }).click();
    await expect(page).toHaveURL(/\/app\/exams\/enter-key\?error=/);
    await expect(
      page.getByText(/enter the exam key to continue/i).first(),
    ).toBeVisible();

    const accessKeyInput = page.locator('input[name="access_key"]');
    await expect(accessKeyInput).toBeVisible();
    await accessKeyInput.fill("   ");
    await page.getByRole("button", { name: /open exam/i }).click();
    await expect(page).toHaveURL(/\/app\/exams\/enter-key\?error=/);
    await expect(
      page.getByText(/enter the exam key to continue/i).first(),
    ).toBeVisible();

    await page.getByRole("link", { name: /open mock tests/i }).click();
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);

    await gotoWithRetry(page, "/app/exams/enter-key");
    await expect(page).toHaveURL(/\/app\/exams\/enter-key(?:\?.*)?$/);
    await page.getByRole("link", { name: /back to dashboard/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
  });
});
