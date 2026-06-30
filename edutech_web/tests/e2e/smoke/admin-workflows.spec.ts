import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Parameters<typeof loginAsRole>[0], url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (
        (!message.includes("ERR_CONNECTION_REFUSED") && !message.includes("Test timeout")) ||
        attempt === attempts
      ) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function expectOneOf(primary: Locator, secondary: Locator) {
  const primaryVisible = await primary.isVisible().catch(() => false);
  if (primaryVisible) {
    await expect(primary).toBeVisible();
    return;
  }
  await expect(secondary).toBeVisible();
}

test.describe("Platform admin smoke journeys", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@smoke platform-admin can move through dashboard, academics, people, institutes, exams, reports, economy, and settings", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoWithRetry(page, "/admin");
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();
    await expect(page.getByText(/dashboard focus/i).first()).toBeVisible();
    await expect(page.getByText(/priority lanes/i).first()).toBeVisible();
    await expect(page.getByText(/quick actions/i).first()).toBeVisible();

    const focusSelect = page.locator('select[name="focus"]').first();
    if (await focusSelect.count()) {
      await focusSelect.selectOption("academics");
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/focus=academics/);
      await expect(page.getByText(/focus:\s*academics/i).first()).toBeVisible();
      const resetFilters = page.getByRole("link", { name: /reset filters/i }).first();
      if (await resetFilters.count()) {
        await resetFilters.click();
        await expect(page).not.toHaveURL(/focus=academics/);
      }
    }

    await gotoWithRetry(page, "/admin/academic-setup");
    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/admin/people");
    await expect(
      page.getByRole("heading", {
        name: /student roster and login management|teacher roster and login management/i,
      }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /create student|create teacher/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/admin/institutes");
    await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /add institute/i }).first()).toBeVisible();
    await expect(page.getByText(/selected profile/i).first()).toBeVisible();

    await gotoWithRetry(page, "/admin/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /preset library/i }).first()).toBeVisible();
    await expectOneOf(
      page.locator(".examCard").first(),
      page.getByRole("heading", { name: /no exams match these platform controls/i }).first(),
    );

    await page.getByRole("link", { name: /quick create/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/new(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/admin/exams");
    await page.getByRole("link", { name: /advanced builder/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/advanced(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /advanced/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/admin/exams");
    const openExamLinks = page.getByRole("link", { name: /open exam/i });
    if (await openExamLinks.count()) {
      await openExamLinks.first().click();
      await expect(page).toHaveURL(/\/admin\/exams\/[^/]+(?:\?.*)?$/);
      await expect(page.getByText(/exam code/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
    }

    await gotoWithRetry(page, "/admin/reports");
    await expect(page.getByRole("heading", { name: /reports/i }).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: /subject/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
    await expect(page.getByText(/seed groups/i).first()).toBeVisible();

    await gotoWithRetry(page, "/admin/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
    await expect(page.getByText(/current live control lanes/i).first()).toBeVisible();
  });
});
