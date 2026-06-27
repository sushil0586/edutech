import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin settings workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect settings summary and governance handoffs", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/settings");

    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
    await expect(page.getByText(/current live control lanes/i).first()).toBeVisible();
    await expect(
      page.getByText(/what still needs dedicated contracts before it becomes configurable here/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/current institute footprint/i).first()).toBeVisible();
    await expect(page.getByText(/economy policy/i).first()).toBeVisible();
    await expect(page.getByText(/institute-admin support limits/i).first()).toBeVisible();
    await expect(page.getByText(/policy history/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save economy policy/i })).toBeVisible();

    await expect(page.getByText(/^institutes$/i).first()).toBeVisible();
    await expect(page.getByText(/people in scope/i).first()).toBeVisible();
    await expect(page.getByText(/configured defaults/i).first()).toBeVisible();
    await expect(page.getByText(/academic backbone/i).first()).toBeVisible();
    await expect(page.locator('a[href="/admin/people"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/academic-setup"]').first()).toBeVisible();

    await expect(page.getByRole("link", { name: /manage people/i })).toHaveAttribute("href", "/admin/people");
    await expect(page.getByRole("link", { name: /manage academics/i })).toHaveAttribute(
      "href",
      "/admin/academic-setup",
    );

    await page.locator('a[href="/admin/people"]').first().click();
    await expect(page).toHaveURL(/\/admin\/people(?:\?.*)?$/);
    await expect(page.getByText(/student roster|teacher roster/i).first()).toBeVisible();

    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();

    await page.locator('a[href="/admin/academic-setup"]').first().click();
    await expect(page).toHaveURL(/\/admin\/academic-setup(?:\?.*)?$/);
    await expect(page.getByText(/academic setup/i).first()).toBeVisible();

    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /manage people/i }).click();
    await expect(page).toHaveURL(/\/admin\/people(?:\?.*)?$/);
    await expect(page.getByText(/student roster|teacher roster/i).first()).toBeVisible();

    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /manage academics/i }).click();
    await expect(page).toHaveURL(/\/admin\/academic-setup(?:\?.*)?$/);
    await expect(page.getByText(/academic setup/i).first()).toBeVisible();
  });
});
