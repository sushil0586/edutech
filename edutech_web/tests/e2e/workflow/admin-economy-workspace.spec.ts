import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin economy workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect economy governance and safe support controls", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");

    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
    await expect(page.getByText(/seed groups/i).first()).toBeVisible();
    await expect(page.getByText(/scenario coverage/i).first()).toBeVisible();
    await expect(page.getByText(/live runtime lanes/i).first()).toBeVisible();
    await expect(page.getByText(/mandatory phase 1 seeds/i).first()).toBeVisible();
    await expect(page.locator('a[href="/admin/institutes"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/settings"]').first()).toBeVisible();

    await expect(page.getByText(/student support actions/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i })).toBeVisible();

    const studentSelect = page.locator("select").filter({ has: page.locator('option') }).nth(0);
    await expect(studentSelect).toBeVisible();

    const starsInput = page.locator('input[type="number"]').first();
    const reasonInput = page.locator('input[placeholder*="Manual adjustment"]').first();
    const referenceInput = page.locator('input[placeholder*="Optional ticket"]').first();

    await expect(starsInput).toHaveValue("25");
    await starsInput.fill("30");
    await expect(starsInput).toHaveValue("30");

    await reasonInput.fill("");
    await referenceInput.fill("PW-E2E-REF");
    await page.getByRole("button", { name: /grant stars/i }).click();
    await expect(page.getByText(/enter a clear reason for the grant/i)).toBeVisible();

    await page.getByRole("button", { name: /refresh unlocks/i }).click();
    await expect(page.getByText(/unlock refresh output/i).first()).toBeVisible();

    await expect(page.getByText(/live wallet state/i).first()).toBeVisible();
    await expect(page.getByText(/reward timeline/i).first()).toBeVisible();
    await expect(page.getByText(/unlock refresh output/i).first()).toBeVisible();

    await page.locator('a[href="/admin/institutes"]').first().click();
    await expect(page).toHaveURL(/\/admin\/institutes(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    await page.locator('a[href="/admin/settings"]').first().click();
    await expect(page).toHaveURL(/\/admin\/settings(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
  });
});
