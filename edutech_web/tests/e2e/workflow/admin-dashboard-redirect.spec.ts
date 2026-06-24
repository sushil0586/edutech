import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin dashboard legacy redirect", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin dashboard alias redirects into the main admin workspace", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/dashboard");

    await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();
  });
});
