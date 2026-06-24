import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectInstituteReportsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
  await expect(page.getByText(/report controls/i).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: /focus lane/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /subject/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /sort by/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /pending publication/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /lowest mastery/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /top performers/i })).toBeVisible();
  await expect(page.locator('a[href="/institute/results"]').first()).toBeVisible();
  await expect(page.locator('a[href="/institute/exams"]').first()).toBeVisible();
}

test.describe("Institute reports workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can filter and navigate the reports workspace", async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/reports");
    await expectInstituteReportsWorkspace(page);

    await page.getByRole("combobox", { name: /focus lane/i }).selectOption("publication");
    await page.getByRole("combobox", { name: /subject/i }).selectOption("all");
    await page.getByRole("combobox", { name: /sort by/i }).selectOption("backlog_high");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*lane=publication/);
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*subject=all/);
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*sort=backlog_high/);
    await expect(page.getByText(/lane: publication/i)).toBeVisible();
    await expect(page.getByText(/subject: all/i)).toBeVisible();
    await expect(page.getByText(/sort: backlog high/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /completed or evaluated exams still needing result attention/i })).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/reports(?:\?.*)?$/);

    await page.getByRole("link", { name: /pending publication/i }).click();
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*lane=publication/);
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*sort=backlog_high/);

    await page.getByRole("link", { name: /lowest mastery/i }).click();
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*lane=weak_topics/);
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*sort=score_low/);
    await expect(page.getByRole("heading", { name: /institute-level academic pressure points/i })).toBeVisible();

    await page.getByRole("link", { name: /top performers/i }).click();
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*lane=students/);
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*sort=score_high/);
    await expect(page.getByRole("heading", { name: /who is currently strongest and who needs support/i })).toBeVisible();

    await page.getByRole("link", { name: /most attempts/i }).click();
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*lane=performance/);
    await expect(page).toHaveURL(/\/institute\/reports\?[^#]*sort=attempts_high/);
    await expect(page.getByRole("heading", { name: /how institute exams are performing/i })).toBeVisible();

    await page.getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/institute\/reports(?:\?.*)?$/);
    await expectInstituteReportsWorkspace(page);

    await page.locator('a[href="/institute/results"]').first().click();
    await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await page.goto("/institute/reports");
    await expectInstituteReportsWorkspace(page);

    await page.locator('a[href="/institute/exams"]').first().click();
    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
  });
});
