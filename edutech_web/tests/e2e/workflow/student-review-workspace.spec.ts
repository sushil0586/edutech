import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url);
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

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visible locator.");
}

async function resolveReviewHref(page: Page) {
  await gotoWithRetry(page, "/app/attempts");
  await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();

  const emptyAttempts = page.getByText(/your attempt history is empty right now/i).first();
  if (!(await emptyAttempts.isVisible().catch(() => false))) {
    const reviewLink = page.getByRole("link", { name: /open answer review|review feedback/i }).first();
    if (await reviewLink.isVisible().catch(() => false)) {
      return await reviewLink.getAttribute("href");
    }
  }

  await gotoWithRetry(page, "/app/results");
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

  const emptyResults = page.getByText(/your result history is empty right now/i).first();
  if (!(await emptyResults.isVisible().catch(() => false))) {
    const reviewLink = page.getByRole("link", { name: /open answer review|review feedback/i }).first();
    if (await reviewLink.isVisible().catch(() => false)) {
      return await reviewLink.getAttribute("href");
    }
  }

  return null;
}

async function expectStudentReviewRoute(page: Page) {
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);

  const unavailableHeading = page.getByRole("heading", {
    name: /attempt review is not available right now/i,
  }).first();
  if (await unavailableHeading.isVisible().catch(() => false)) {
    await expect(page.getByText(/review unavailable/i).first()).toBeVisible();
    await expect(page.getByText(/attempt review endpoint/i).first()).toBeVisible();
    return "unavailable" as const;
  }

  await expect(page.getByRole("heading", { name: /review/i }).first()).toBeVisible();
  await expect(page.locator(".studentDashboardTag", { hasText: /review mode/i }).first()).toBeVisible();
  await expect(page.locator(".contentCard").filter({ hasText: /review state/i }).first()).toBeVisible();
  return "available" as const;
}

test.describe("Student review workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate review workspace continuity and follow-up actions", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const reviewHref = await resolveReviewHref(page);
    if (!reviewHref) {
      test.skip(true, "Student seeded account does not currently expose a review route.");
      return;
    }

    expect(reviewHref).toMatch(/^\/app\/attempts\/[^/]+\/review$/);

    await gotoWithRetry(page, reviewHref);
    const reviewState = await expectStudentReviewRoute(page);

    if (reviewState === "available") {
      await expect(page.locator(".contentCard").filter({ hasText: /recommended actions/i }).first()).toBeVisible();
      await expect(page.locator(".contentCard").filter({ hasText: /review recovery loop/i }).first()).toBeVisible();
      await expect(page.getByText(/do this first/i).first()).toBeVisible();
    }

    const analyticsLink = page.getByRole("link", { name: /view analytics/i }).first();
    if (reviewState === "available") {
      await expect(analyticsLink).toBeVisible();
      await analyticsLink.click();
      await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
      await gotoWithRetry(page, reviewHref);
      await expectStudentReviewRoute(page);
    }

    const resultsLink = page.getByRole("link", { name: /open results|check result status/i }).first();
    await expect(resultsLink).toBeVisible();
    await resultsLink.click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await gotoWithRetry(page, reviewHref);
    const reviewStateAfterResults = await expectStudentReviewRoute(page);

    if (reviewStateAfterResults === "available") {
      const summaryLink = page.getByRole("link", { name: /back to summary|open summary/i }).first();
      await expect(summaryLink).toBeVisible();
      await summaryLink.click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await gotoWithRetry(page, reviewHref);
      await expectStudentReviewRoute(page);

      const practiceCandidate = await firstVisible([
        page.getByRole("button", { name: /practice .*|start practice|unlock with .* stars/i }).first(),
        page.getByRole("link", { name: /practice .*|resume practice|view practice detail/i }).first(),
      ]);
      await practiceCandidate.click();
      await expect(page).toHaveURL(/\/app\/(practice|attempts\/[^/]+|exams\/[^/?#]+)(?:\?.*)?$/);
    }
  });
});
