import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

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

test.describe("Admin cross-browser deep routes", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can navigate deep routes across browser engines", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoWithRetry(page, "/admin/search?q=exam");
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
    await expect(page.getByText(/search controls/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to workspace/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/admin/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
    await expect(page.getByText(/current live control lanes/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /manage people/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/admin/exams/advanced");
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /basics/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /composition/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /preset library/i }).first()).toBeVisible();
  });
});
