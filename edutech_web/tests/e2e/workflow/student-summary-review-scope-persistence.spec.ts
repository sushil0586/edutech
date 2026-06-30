import { expect, test, type Page } from "@playwright/test";
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

function expectSearchParam(url: URL, key: string, expected: string | null) {
  if (expected === null) {
    expect(url.searchParams.has(key)).toBe(false);
    return;
  }

  expect(url.searchParams.get(key)).toBe(expected);
}

test.describe("Student summary and review scope persistence", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can preserve subject scope through summary and review follow-up routes", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/results");
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    const subjectScopedResultsLink = page
      .locator('a[href^="/app/results?"][href*="subject="]')
      .first();

    if (!(await subjectScopedResultsLink.isVisible().catch(() => false))) {
      await expect(page.getByRole("link", { name: /view analytics/i }).first()).toBeVisible();
      await expect(page.locator('a[href*="subject="]').first()).not.toBeVisible();
      return;
    }

    await subjectScopedResultsLink.click();
    await expect(page).toHaveURL(/\/app\/results\?[^#]*subject=/);
    const scopedResultsUrl = new URL(page.url());
    const expectedSubject = scopedResultsUrl.searchParams.get("subject");
    expect(expectedSubject).not.toBeNull();

    const summaryLink = page.getByRole("link", { name: /open summary|check attempt status/i }).first();
    await expect(summaryLink).toBeVisible();
    const summaryHref = await summaryLink.getAttribute("href");
    expect(summaryHref).not.toBeNull();
    const summaryUrl = new URL(summaryHref!, "http://localhost");
    expect(summaryUrl.pathname).toMatch(/^\/app\/attempts\/[^/]+\/summary$/);
    expectSearchParam(summaryUrl, "subject", expectedSubject);

    await summaryLink.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
    const landedSummaryUrl = new URL(page.url());
    expectSearchParam(landedSummaryUrl, "subject", expectedSubject);
    await expect(page.getByText(/post-submit state/i).first()).toBeVisible();

    const resultsLink = page.getByRole("link", { name: /open results|view results|check result status/i }).first();
    await expect(resultsLink).toBeVisible();
    const resultsHref = await resultsLink.getAttribute("href");
    expect(resultsHref).not.toBeNull();
    const resultsBackUrl = new URL(resultsHref!, "http://localhost");
    expect(resultsBackUrl.pathname).toBe("/app/results");
    expectSearchParam(resultsBackUrl, "subject", expectedSubject);

    await resultsLink.click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    expectSearchParam(new URL(page.url()), "subject", expectedSubject);

    await gotoWithRetry(page, landedSummaryUrl.pathname + landedSummaryUrl.search);

    const attemptsLink = page.getByRole("link", { name: /open attempts/i }).first();
    await expect(attemptsLink).toBeVisible();
    const attemptsHref = await attemptsLink.getAttribute("href");
    expect(attemptsHref).not.toBeNull();
    const attemptsUrl = new URL(attemptsHref!, "http://localhost");
    expect(attemptsUrl.pathname).toBe("/app/attempts");
    expectSearchParam(attemptsUrl, "subject", expectedSubject);

    const reviewLink = page.getByRole("link", { name: /open answer review|review feedback/i }).first();
    if (await reviewLink.isVisible().catch(() => false)) {
      const reviewHref = await reviewLink.getAttribute("href");
      expect(reviewHref).not.toBeNull();
      const reviewUrl = new URL(reviewHref!, "http://localhost");
      expect(reviewUrl.pathname).toMatch(/^\/app\/attempts\/[^/]+\/review$/);
      expectSearchParam(reviewUrl, "subject", expectedSubject);

      await reviewLink.click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
      const landedReviewUrl = new URL(page.url());
      expectSearchParam(landedReviewUrl, "subject", expectedSubject);
      await expect(page.getByText(/review mode/i).first()).toBeVisible();

      const reviewResultsLink = page.getByRole("link", { name: /open results/i }).first();
      await expect(reviewResultsLink).toBeVisible();
      const reviewResultsHref = await reviewResultsLink.getAttribute("href");
      expect(reviewResultsHref).not.toBeNull();
      const reviewResultsUrl = new URL(reviewResultsHref!, "http://localhost");
      expect(reviewResultsUrl.pathname).toBe("/app/results");
      expectSearchParam(reviewResultsUrl, "subject", expectedSubject);

      const backToSummaryLink = page.getByRole("link", { name: /back to summary|open summary/i }).first();
      await expect(backToSummaryLink).toBeVisible();
      const backToSummaryHref = await backToSummaryLink.getAttribute("href");
      expect(backToSummaryHref).not.toBeNull();
      const backToSummaryUrl = new URL(backToSummaryHref!, "http://localhost");
      expect(backToSummaryUrl.pathname).toMatch(/^\/app\/attempts\/[^/]+\/summary$/);
      expectSearchParam(backToSummaryUrl, "subject", expectedSubject);
    }
  });
});
