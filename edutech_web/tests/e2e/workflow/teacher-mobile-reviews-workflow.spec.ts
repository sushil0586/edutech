import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

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

async function openMobileTeacherNav(page: Page) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  await expect(page.getByRole("navigation", { name: /teacher navigation/i })).toBeVisible();
  await expect(page.locator("#mobile-teacher-menu")).toBeVisible();
  return page.locator("#mobile-teacher-menu");
}

async function expectTeacherReviewsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  await expect(page.getByText(/one-click grading views|quick triage/i).first()).toBeVisible();
}

test.describe("Teacher mobile reviews workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test("@workflow teacher mobile viewport supports review filtering and scoped navigation", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRetry(page, "/teacher/dashboard");
    await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();

    const mobileNav = await openMobileTeacherNav(page);
    await expect(mobileNav.getByRole("link", { name: /^reviews$/i })).toBeVisible();
    await mobileNav.getByRole("link", { name: /^reviews$/i }).click();

    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expectTeacherReviewsWorkspace(page);

    await page.getByRole("combobox", { name: /^status$/i }).selectOption("in_review");
    await page.getByRole("combobox", { name: /page size/i }).selectOption("24");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/status=in_review/);
    await expect(page).toHaveURL(/page_size=24/);
    await expect(page.getByText(/status: in review/i).first()).toBeVisible();
    await expect(page.getByText(/page size: 24 tasks/i).first()).toBeVisible();

    await page.getByRole("textbox", { name: /^search$/i }).fill("playwright-mobile-teacher-review-no-match-2044");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/search=playwright-mobile-teacher-review-no-match-2044/);
    await expect(page.getByText(/no review tasks match these filters/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /reset filters and show full queue/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /reset filters and show full queue/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expectTeacherReviewsWorkspace(page);

    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /open results/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    const openReviewsLink = page.getByRole("link", { name: /^open reviews$/i }).first();
    if (await openReviewsLink.isVisible().catch(() => false)) {
      await openReviewsLink.click();
      await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);
      await expect(page.getByText(/exam-scoped review queue/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /clear scope/i })).toBeVisible();
    }
  });
});
