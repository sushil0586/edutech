import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

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

async function openMobileInstituteNav(page: Page) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  await expect(page.getByRole("navigation", { name: /institute admin navigation/i })).toBeVisible();
  await expect(page.locator("#mobile-workspace-menu")).toBeVisible();
  return page.locator("#mobile-workspace-menu");
}

async function expectInstituteReviewsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  await expect(page.getByText(/quick triage/i).first()).toBeVisible();
}

test.describe("Institute mobile reviews workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute mobile viewport supports review filtering and scoped navigation", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRetry(page, "/institute/dashboard");
    await expect(page.getByText(/institute control/i).first()).toBeVisible();

    const mobileNav = await openMobileInstituteNav(page);
    await expect(mobileNav.getByRole("link", { name: /^reviews$/i })).toBeVisible();
    await mobileNav.getByRole("link", { name: /^reviews$/i }).click();

    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
    await expectInstituteReviewsWorkspace(page);

    await page.getByRole("combobox", { name: /^status$/i }).selectOption("reviewed");
    await page.getByRole("combobox", { name: /^assignment$/i }).selectOption("assigned");
    await page.getByRole("combobox", { name: /page size/i }).selectOption("24");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/status=reviewed/);
    await expect(page).toHaveURL(/assignment_scope=assigned/);
    await expect(page).toHaveURL(/page_size=24/);
    await expect(page.getByText(/assignment: assigned only/i).first()).toBeVisible();
    await expect(page.getByText(/page size: 24 tasks/i).first()).toBeVisible();

    await page.getByRole("textbox", { name: /^search$/i }).fill("playwright-mobile-institute-review-no-match-2045");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/search=playwright-mobile-institute-review-no-match-2045/);
    await expect(page.getByText(/no review tasks match these filters/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /reset filters and show full queue/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /reset filters and show full queue/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
    await expectInstituteReviewsWorkspace(page);

    const openQueueLink = page.getByRole("link", { name: /open queue/i }).first();
    if (await openQueueLink.isVisible().catch(() => false)) {
      await openQueueLink.click();
      await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*exam=/);
      await expect(page.getByText(/exam-scoped review queue/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open results/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /back to exam/i })).toBeVisible();
    }
  });
});
