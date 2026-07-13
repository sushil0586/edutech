import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectParentWorkspace } from "../helpers/navigation";

test.describe("Parent mobile workflow", () => {
  test.skip(testRequiresRole("parent"), "Parent Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow parent mobile viewport keeps dashboard, alerts, and settings readable", async ({
    page,
  }) => {
    await loginAsRole(page, "parent");
    await expectParentWorkspace(page);

    await page.goto("/parent/dashboard");
    await expect(page.getByRole("heading", { name: /family dashboard/i }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /children|progress|alerts|settings/i }).first(),
    ).toBeVisible();

    await page.getByRole("link", { name: /^alerts$/i }).first().click();
    await expect(page).toHaveURL(/\/parent\/alerts(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /family alerts/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^settings$/i }).first().click();
    await expect(page).toHaveURL(/\/parent\/settings(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save preferences/i }).first()).toBeVisible();
  });
});
