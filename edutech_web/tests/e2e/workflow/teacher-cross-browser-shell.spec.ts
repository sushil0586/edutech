import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
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

test.describe("Teacher cross-browser shell sanity", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can navigate core shell routes across browser engines", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRetry(page, "/teacher/dashboard");
    await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /dashboard/i }).first()).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("link", { name: /^exams$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^question bank$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /create question/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^results$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();

    await page.getByRole("link", { name: /^reviews$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
  });
});
