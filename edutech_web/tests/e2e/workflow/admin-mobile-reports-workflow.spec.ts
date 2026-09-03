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

test.describe("Admin mobile reports workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("admin"),
    "Admin Playwright credentials are not configured.",
  );

  test("@workflow admin mobile viewport supports reports filtering and route handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoWithRetry(page, "/admin");
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();

    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
    await expect(page.getByText(/report controls/i).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: /focus lane/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /subject/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /sort by/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /runtime scope/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /pending publication/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /lowest mastery/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /top performers/i })).toBeVisible();

    await page.getByRole("combobox", { name: /focus lane/i }).selectOption("publication");
    await page.getByRole("combobox", { name: /subject/i }).selectOption("all");
    await page.getByRole("combobox", { name: /sort by/i }).selectOption("backlog_high");
    await page.getByRole("combobox", { name: /runtime scope/i }).selectOption("live");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/lane=publication/);
    await expect(page).toHaveURL(/subject=all/);
    await expect(page).toHaveURL(/sort=backlog_high/);
    await expect(page).toHaveURL(/runtime_status=live/);
    await expect(page.getByText(/lane: publication/i).first()).toBeVisible();
    await expect(page.getByText(/subject: all/i).first()).toBeVisible();
    await expect(page.getByText(/sort: backlog high/i).first()).toBeVisible();
    await expect(page.getByText(/runtime: live/i).first()).toBeVisible();

    await page.getByRole("link", { name: /lowest mastery/i }).click();
    await expect(page).toHaveURL(/lane=weak_topics/);
    await expect(page).toHaveURL(/sort=score_low/);
    await expect(page.getByRole("heading", { name: /platform-level academic pressure points/i })).toBeVisible();

    await page.getByRole("link", { name: /top performers/i }).click();
    await expect(page).toHaveURL(/lane=students/);
    await expect(page).toHaveURL(/sort=score_high/);
    await expect(page.getByRole("heading", { name: /who is currently strongest and who needs support/i })).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);
    await expect(page.getByText(/report controls/i).first()).toBeVisible();

    await page.goto("/admin/security");
    await expect(page).toHaveURL(/\/admin\/security(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^security$/i }).first()).toBeVisible();

    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();

    await page.goto("/admin/economy");
    await expect(page).toHaveURL(/\/admin\/economy(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
  });
});
