import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin institutes workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect institute directory, detail state, and modal entry points", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/institutes");

    await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();
    await expect(page.getByText(/selected profile/i).first()).toBeVisible();
    await expect(page.getByText(/institute admin login/i).first()).toBeVisible();
    const searchInput = page.locator('input[type="search"][placeholder*="Search by name"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("demo");
    await expect(searchInput).toHaveValue("demo");

    const activeOnlyToggle = page.getByRole("checkbox", { name: /active only/i });
    await expect(activeOnlyToggle).toBeVisible();
    await activeOnlyToggle.check();
    await expect(activeOnlyToggle).toBeChecked();

    const instituteTable = page.locator(".adminInstituteTable").first();
    await expect(instituteTable).toBeVisible();
    const filteredRow = instituteTable.getByRole("row").filter({ hasText: /demo/i }).first();
    await expect(filteredRow).toBeVisible();
    const firstViewButton = filteredRow.getByRole("button", { name: /^view$/i }).first();
    await firstViewButton.click();
    await expect(page).toHaveURL(/\/admin\/institutes\?institute=/);

    const accountActionArea = page.locator(".adminInstituteAccountPanel").first();
    await expect(accountActionArea).toContainText(/credential controls/i);
    const createLoginButton = accountActionArea.getByRole("button", { name: /create login/i });
    const resetPasswordButton = accountActionArea.getByRole("button", { name: /reset password/i });
    const disableLoginButton = accountActionArea.getByRole("button", { name: /disable login/i });
    const enableLoginButton = accountActionArea.getByRole("button", { name: /enable login/i });
    const anyAccountButtonVisible =
      (await createLoginButton.isVisible().catch(() => false)) ||
      (await resetPasswordButton.isVisible().catch(() => false)) ||
      (await disableLoginButton.isVisible().catch(() => false)) ||
      (await enableLoginButton.isVisible().catch(() => false));
    expect(anyAccountButtonVisible).toBe(true);

    const createLoginVisible = await createLoginButton.isVisible().catch(() => false);
    const resetPasswordVisible = await resetPasswordButton.isVisible().catch(() => false);
    const disableLoginVisible = await disableLoginButton.isVisible().catch(() => false);
    const enableLoginVisible = await enableLoginButton.isVisible().catch(() => false);

    if (createLoginVisible) {
      await expect(resetPasswordButton).toHaveCount(0);
      await expect(disableLoginButton).toHaveCount(0);
      await expect(enableLoginButton).toHaveCount(0);
      await expect(accountActionArea).toContainText(/no linked login/i);
    } else {
      expect(resetPasswordVisible).toBe(true);
      expect(disableLoginVisible || enableLoginVisible).toBe(true);
      expect(disableLoginVisible && enableLoginVisible).toBe(false);
      await expect(createLoginButton).toHaveCount(0);
    }

    if (resetPasswordVisible) {
      await resetPasswordButton.click();
      await expect(page.getByRole("heading", { name: /update login password/i })).toBeVisible();

      const autoGenerateCheckbox = page.getByRole("checkbox", { name: /auto-generate password/i });
      if (await autoGenerateCheckbox.isChecked()) {
        await autoGenerateCheckbox.uncheck();
      }

      await page.getByRole("button", { name: /reset password/i }).last().click();
      await expect(
        page.getByText(/enter and confirm the new password, or choose auto-generate\./i),
      ).toBeVisible();
      await page.getByRole("button", { name: /cancel|close/i }).last().click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    await page.getByRole("button", { name: /add institute/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /add institute/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /save institute/i })).toBeVisible();
    await page.getByRole("button", { name: /save institute/i }).last().click();
    await expect(page.getByText(/fill the required fields to continue\./i)).toBeVisible();
    await expect(page.getByText(/institute name is required\./i)).toBeVisible();
    await expect(page.getByText(/institute code is required\./i)).toBeVisible();
    await page.getByRole("button", { name: /cancel|close/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: /edit selected/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /edit /i })).toBeVisible();
    await expect(page.getByText(/update identity, contact, and geography/i).first()).toBeVisible();
    await page.getByLabel(/institute name/i).fill("");
    await page.getByLabel(/^code$/i).fill("");
    await page.getByRole("button", { name: /save institute/i }).last().click();
    await expect(page.getByText(/fill the required fields to continue\./i)).toBeVisible();
    await expect(page.getByText(/institute name is required\./i)).toBeVisible();
    await expect(page.getByText(/institute code is required\./i)).toBeVisible();
    await page.getByRole("button", { name: /cancel|close/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.locator('a[href="/admin/academic-setup"]').first().click();
    await expect(page).toHaveURL(/\/admin\/academic-setup(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();

    await page.goto("/admin/institutes");
    await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

    await page.locator('a[href="/admin/settings"]').first().click();
    await expect(page).toHaveURL(/\/admin\/settings(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
  });
});
