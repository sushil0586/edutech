import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

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

test.describe("Institute cross-browser shell sanity", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute can navigate core shell routes across browser engines", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRetry(page, "/institute/dashboard");
    await expect(page.getByText(/institute control/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /dashboard/i }).first()).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("link", { name: /^exams$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^results$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();

    await page.getByRole("link", { name: /^reviews$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expect(page.getByText(/quick triage/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /view pending/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^question bank$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /create question/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^people$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/people(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /people/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^students$/i }).first()).toBeVisible();
  });
});
