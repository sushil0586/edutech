import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin dashboard workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can filter dashboard focus and use governance handoffs", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();
    await expect(page.getByText(/dashboard focus/i).first()).toBeVisible();
    await expect(page.getByText(/priority lanes/i).first()).toBeVisible();
    await expect(page.getByText(/quick actions/i).first()).toBeVisible();

    const focusSelect = page.locator('select[name="focus"]').first();
    const sortSelect = page.locator('select[name="sort"]').first();
    await expect(focusSelect).toBeVisible();
    await expect(sortSelect).toBeVisible();

    await focusSelect.selectOption("people");
    await sortSelect.selectOption("highest_value");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/focus=people/);
    await expect(page).toHaveURL(/sort=highest_value/);
    await expect(page.getByText(/focus:\s*people/i)).toBeVisible();

    await page.getByRole("link", { name: /^academics$/i }).click();
    await expect(page).toHaveURL(/focus=academics/);

    await page.getByRole("link", { name: /open academic setup/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/academic-setup(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /go to reports/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /reports/i }).first()).toBeVisible();

    await page.goto("/admin?focus=institutes");
    await expect(page.getByText(/focus:\s*institutes/i)).toBeVisible();
    await page.getByRole("link", { name: /open institutes/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/institutes(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

    await page.goto("/admin?focus=people");
    await expect(page.getByText(/focus:\s*people/i)).toBeVisible();
    await page.getByRole("link", { name: /go to people/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/people(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /student roster and login management|teacher roster and login management/i }).first()).toBeVisible();
  });
});
