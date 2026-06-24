import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

async function expectAdminReportsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
  await expect(page.getByText(/report controls/i).first()).toBeVisible();
  await expect(page.locator('a[href="/admin/security"]').first()).toBeVisible();
  await expect(page.locator('a[href="/admin/economy"]').first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: /focus lane/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /subject/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /sort by/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /pending publication/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /lowest mastery/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /top performers/i })).toBeVisible();
  await expect(page.locator('a[href="/admin/security"]').first()).toBeVisible();
  await expect(page.locator('a[href="/admin/economy"]').first()).toBeVisible();
}

test.describe("Admin reports workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can filter and navigate the reports workspace", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/reports");
    await expectAdminReportsWorkspace(page);

    const publicationBacklogPanel = page.getByRole("heading", {
      name: /completed or evaluated exams still needing result attention/i,
    });
    const examPerformancePanel = page.getByRole("heading", {
      name: /how visible exams are performing/i,
    });
    const weakTopicsPanel = page.getByRole("heading", {
      name: /platform-level academic pressure points/i,
    });
    const studentDistributionPanel = page.getByRole("heading", {
      name: /who is currently strongest and who needs support/i,
    });

    await expect(publicationBacklogPanel).toBeVisible();
    await expect(examPerformancePanel).toBeVisible();
    await expect(weakTopicsPanel).toBeVisible();
    await expect(studentDistributionPanel).toBeVisible();

    await page.getByRole("combobox", { name: /focus lane/i }).selectOption("publication");
    await page.getByRole("combobox", { name: /subject/i }).selectOption("all");
    await page.getByRole("combobox", { name: /sort by/i }).selectOption("backlog_high");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*lane=publication/);
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*subject=all/);
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*sort=backlog_high/);
    await expect(page.getByText(/lane: publication/i)).toBeVisible();
    await expect(page.getByText(/subject: all/i)).toBeVisible();
    await expect(page.getByText(/sort: backlog high/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /completed or evaluated exams still needing result attention/i })).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);

    await page.getByRole("link", { name: /pending publication/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*lane=publication/);
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*sort=backlog_high/);

    await page.getByRole("link", { name: /lowest mastery/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*lane=weak_topics/);
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*sort=score_low/);
    await expect(page.getByRole("heading", { name: /platform-level academic pressure points/i })).toBeVisible();

    await page.getByRole("link", { name: /top performers/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*lane=students/);
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*sort=score_high/);
    await expect(page.getByRole("heading", { name: /who is currently strongest and who needs support/i })).toBeVisible();

    await page.getByRole("link", { name: /most attempts/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*lane=performance/);
    await expect(page).toHaveURL(/\/admin\/reports\?[^#]*sort=attempts_high/);
    await expect(page.getByRole("heading", { name: /how visible exams are performing/i })).toBeVisible();

    await page.getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);
    await expectAdminReportsWorkspace(page);

    await page.locator('a[href="/admin/security"]').first().click();
    await expect(page).toHaveURL(/\/admin\/security(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^security$/i }).first()).toBeVisible();

    await page.goto("/admin/reports");
    await expectAdminReportsWorkspace(page);

    await page.locator('a[href="/admin/economy"]').first().click();
    await expect(page).toHaveURL(/\/admin\/economy(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();

    await page.goto("/admin/reports");
    await expectAdminReportsWorkspace(page);

    await page.locator('a[href="/admin/security"]').first().click();
    await expect(page).toHaveURL(/\/admin\/security(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^security$/i }).first()).toBeVisible();

    await page.goto("/admin/reports");
    await expectAdminReportsWorkspace(page);

    await page.locator('a[href="/admin/economy"]').first().click();
    await expect(page).toHaveURL(/\/admin\/economy(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
  });
});
