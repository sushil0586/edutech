import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

test.describe("Institute dashboard workspace", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute can filter dashboard focus and use command-surface handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/dashboard");

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/institute control/i).first()).toBeVisible();
    await expect(page.getByText(/dashboard focus/i).first()).toBeVisible();
    await expect(page.getByText(/priority lanes/i).first()).toBeVisible();
    await expect(page.getByText(/academic structure detail/i).first()).toBeVisible();

    const focusSelect = page.locator('select[name="focus"]').first();
    const sortSelect = page.locator('select[name="sort"]').first();
    await expect(focusSelect).toBeVisible();
    await expect(sortSelect).toBeVisible();

    await focusSelect.selectOption("assessments");
    await sortSelect.selectOption("title");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/focus=assessments/);
    await expect(page).toHaveURL(/sort=title/);
    await expect(page.getByText(/focus:\s*assessments/i)).toBeVisible();
    await expect(page.getByText(/sort:\s*title/i)).toBeVisible();

    const quickFilters = page.locator(".workspaceFilterQuickChips").first();

    await quickFilters.getByRole("link", { name: /^academics$/i }).click();
    await expect(page).toHaveURL(/focus=academics/);
    await expect(page.getByText(/focus:\s*academics/i)).toBeVisible();

    await quickFilters.getByRole("link", { name: /^people$/i }).click();
    await expect(page).toHaveURL(/focus=people/);
    await expect(page.getByText(/focus:\s*people/i)).toBeVisible();

    await quickFilters.getByRole("link", { name: /^all$/i }).click();
    await expect(page).not.toHaveURL(/focus=people/);
    await expect(page.getByText(/focus:\s*all/i)).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/dashboard(?:\?.*)?$/);
    await expect(page.getByText(/focus:\s*all/i)).toBeVisible();

    await page.getByRole("link", { name: /open people/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/people(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /people/i }).first()).toBeVisible();

    await page.goto("/institute/dashboard");
    await expect(page.getByText(/dashboard focus/i).first()).toBeVisible();

    await page.getByRole("link", { name: /open academic setup/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/academic-setup(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();

    await page.goto("/institute/dashboard?focus=assessments");
    await expect(page.getByText(/focus:\s*assessments/i)).toBeVisible();

    await page.getByRole("link", { name: /open exams/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.goto("/institute/dashboard");
    await expect(page.getByText(/institute control/i).first()).toBeVisible();

    await page.getByRole("link", { name: /open reviews/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  });
});
