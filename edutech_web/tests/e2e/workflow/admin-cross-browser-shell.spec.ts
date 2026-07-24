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

test.describe("Admin cross-browser shell sanity", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can navigate core shell routes across browser engines", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoWithRetry(page, "/admin");
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();
    const sidebarNav = page.getByRole("navigation", { name: /platform admin navigation/i });

    await expect(sidebarNav.getByRole("link", { name: /dashboard/i }).first()).toHaveAttribute(
      "aria-current",
      "page",
    );

    await Promise.all([
      page.waitForURL(/\/admin\/exams(?:\?.*)?$/),
      sidebarNav.getByRole("link", { name: /^exams$/i }).first().click(),
    ]);
    await expect(page).toHaveURL(/\/admin\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(
      await Promise.race([
        Promise.resolve(page.getByRole("link", { name: /new exam/i }).first()),
        Promise.resolve(page.getByRole("link", { name: /advanced builder/i }).first()),
      ]),
    ).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/admin\/institutes(?:\?.*)?$/),
      sidebarNav.getByRole("link", { name: /^institutes$/i }).first().click(),
    ]);
    await expect(page).toHaveURL(/\/admin\/institutes(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();
    await expect(page.getByText(/selected profile/i).first()).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/admin\/reports(?:\?.*)?$/),
      sidebarNav.getByRole("link", { name: /^reports$/i }).first().click(),
    ]);
    await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
    await expect(page.getByText(/report controls/i).first()).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/admin\/people(?:\?.*)?$/),
      sidebarNav.getByRole("link", { name: /^people$/i }).first().click(),
    ]);
    await expect(page).toHaveURL(/\/admin\/people(?:\?.*)?$/);
    await expect(
      page.getByRole("heading", {
        name: /student roster and login management|teacher roster and login management/i,
      }).first(),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /search roster/i })).toBeVisible();
  });
});
