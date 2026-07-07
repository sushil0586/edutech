import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function openMobileAdminNav(page: Page) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  await expect(page.getByRole("navigation", { name: /platform admin navigation/i })).toBeVisible();
  await expect(page.locator("#mobile-workspace-menu")).toBeVisible();
  return page.locator("#mobile-workspace-menu");
}

test.describe("Admin mobile security workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("admin"),
    "Admin Playwright credentials are not configured.",
  );

  test("@workflow admin mobile viewport supports security filtering and watchlist handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoWithRetry(page, "/admin");
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();

    const mobileNav = await openMobileAdminNav(page);
    await expect(mobileNav.getByRole("link", { name: /^security$/i })).toBeVisible();
    await mobileNav.getByRole("link", { name: /^security$/i }).click();

    await expect(page).toHaveURL(/\/admin\/security(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /security/i }).first()).toBeVisible();
    await expect(page.getByText(/security controls/i).first()).toBeVisible();

    const searchInput = page.locator('input[type="search"][name="search"]').first();
    const examFilter = page.locator('select[name="exam_filter"]').first();
    const attemptFilter = page.locator('select[name="attempt_filter"]').first();
    const attemptGroup = page.locator('select[name="attempt_group"]').first();
    await expect(searchInput).toBeVisible();
    await expect(examFilter).toBeVisible();
    await expect(attemptFilter).toBeVisible();
    await expect(attemptGroup).toBeVisible();

    await searchInput.fill("aws");
    await examFilter.selectOption("live");
    await attemptFilter.selectOption("watch");
    await attemptGroup.selectOption("health");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=aws/i);
    await expect(page).toHaveURL(/exam_filter=live/);
    await expect(page).toHaveURL(/attempt_filter=watch/);
    await expect(page).toHaveURL(/attempt_group=health/);
    await expect(page.getByText(/^exam scope: live$/i).first()).toBeVisible();
    await expect(page.getByText(/^attempt scope: watch$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: health$/i).first()).toBeVisible();

    const criticalAttemptsLink = page.getByRole("link", { name: /critical attempts/i }).first();
    if (await criticalAttemptsLink.isVisible().catch(() => false)) {
      await criticalAttemptsLink.click();
      await expect(page).toHaveURL(/attempt_filter=critical/);
      await expect(page.getByText(/^attempt scope: critical$/i).first()).toBeVisible();
    }

    const watchExamButton = page.getByRole("link", { name: /watch exam|watching/i }).first();
    if (await watchExamButton.isVisible().catch(() => false)) {
      await watchExamButton.click();
      await expect(page).toHaveURL(/examId=/);
      await expect(page.getByText(/selected exam posture|live monitor summary/i).first()).toBeVisible();
      await expect(page.getByText(/attempt watchlist/i).first()).toBeVisible();
    } else {
      await expect(page.getByText(/choose the exam you want to monitor right now/i).first()).toBeVisible();
    }

    await attemptGroup.selectOption("status");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/attempt_group=status/);
    await expect(page.getByText(/^group: status$/i).first()).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/security(?:\?examId=.*)?$/);
    await expect(page.getByText(/^exam scope: all$/i).first()).toBeVisible();
    await expect(page.getByText(/^attempt scope: all$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: none$/i).first()).toBeVisible();
  });
});
