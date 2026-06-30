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

test.describe("Student summary and review source persistence", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can preserve source and teacher scope through summary and review routes", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();

    const sourceLink = page
      .locator('a[href^="/app/analytics/sources/"][href*="source=teacher"], a[href^="/app/analytics/sources/"][href*="teacher="]')
      .first();

    if (!(await sourceLink.isVisible().catch(() => false))) {
      test.skip(true, "Student seeded account does not currently expose a teacher-scoped analytics source route.");
      return;
    }

    await sourceLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/sources\/[^/?#]+(?:\?.*)?$/);
    const scopedAnalyticsUrl = new URL(page.url());
    const expectedSource = scopedAnalyticsUrl.pathname.split("/").pop() ?? null;
    const expectedSubject = scopedAnalyticsUrl.searchParams.get("subject");
    const expectedTeacher = scopedAnalyticsUrl.searchParams.get("teacher");

    expect(expectedSource).not.toBeNull();

    const compareLink = page.getByRole("link", { name: /compare results/i }).first();
    await expect(compareLink).toBeVisible();
    await compareLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);

    const resultsLink = page.getByRole("link", { name: /open results/i }).first();
    if (!(await resultsLink.isVisible().catch(() => false))) {
      test.skip(true, "Student seeded account does not currently expose a results entry from the scoped analytics comparison route.");
      return;
    }

    await resultsLink.click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    const scopedResultsUrl = new URL(page.url());
    expectSearchParam(scopedResultsUrl, "source", expectedSource);
    expectSearchParam(scopedResultsUrl, "subject", expectedSubject);
    expectSearchParam(scopedResultsUrl, "teacher", expectedTeacher);

    const summaryLink = page.getByRole("link", { name: /open summary|check attempt status/i }).first();
    await expect(summaryLink).toBeVisible();
    const summaryHref = await summaryLink.getAttribute("href");
    expect(summaryHref).not.toBeNull();
    const summaryUrl = new URL(summaryHref!, "http://localhost");
    expect(summaryUrl.pathname).toMatch(/^\/app\/attempts\/[^/]+\/summary$/);
    expectSearchParam(summaryUrl, "source", expectedSource);
    expectSearchParam(summaryUrl, "subject", expectedSubject);
    expectSearchParam(summaryUrl, "teacher", expectedTeacher);

    await summaryLink.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
    const landedSummaryUrl = new URL(page.url());
    expectSearchParam(landedSummaryUrl, "source", expectedSource);
    expectSearchParam(landedSummaryUrl, "subject", expectedSubject);
    expectSearchParam(landedSummaryUrl, "teacher", expectedTeacher);

    const attemptsLink = page.getByRole("link", { name: /open attempts/i }).first();
    await expect(attemptsLink).toBeVisible();
    const attemptsHref = await attemptsLink.getAttribute("href");
    expect(attemptsHref).not.toBeNull();
    const attemptsUrl = new URL(attemptsHref!, "http://localhost");
    expect(attemptsUrl.pathname).toBe("/app/attempts");
    expectSearchParam(attemptsUrl, "source", expectedSource);
    expectSearchParam(attemptsUrl, "subject", expectedSubject);
    expectSearchParam(attemptsUrl, "teacher", expectedTeacher);

    const reviewLink = page.getByRole("link", { name: /open answer review|review feedback/i }).first();
    if (await reviewLink.isVisible().catch(() => false)) {
      const reviewHref = await reviewLink.getAttribute("href");
      expect(reviewHref).not.toBeNull();
      const reviewUrl = new URL(reviewHref!, "http://localhost");
      expect(reviewUrl.pathname).toMatch(/^\/app\/attempts\/[^/]+\/review$/);
      expectSearchParam(reviewUrl, "source", expectedSource);
      expectSearchParam(reviewUrl, "subject", expectedSubject);
      expectSearchParam(reviewUrl, "teacher", expectedTeacher);

      await reviewLink.click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
      const landedReviewUrl = new URL(page.url());
      expectSearchParam(landedReviewUrl, "source", expectedSource);
      expectSearchParam(landedReviewUrl, "subject", expectedSubject);
      expectSearchParam(landedReviewUrl, "teacher", expectedTeacher);

      const reviewResultsLink = page
        .getByRole("link", { name: /open results|check result status/i })
        .first();
      await expect(reviewResultsLink).toBeVisible();
      const reviewResultsHref = await reviewResultsLink.getAttribute("href");
      expect(reviewResultsHref).not.toBeNull();
      const reviewResultsUrl = new URL(reviewResultsHref!, "http://localhost");
      expect(reviewResultsUrl.pathname).toBe("/app/results");
      expectSearchParam(reviewResultsUrl, "source", expectedSource);
      expectSearchParam(reviewResultsUrl, "subject", expectedSubject);
      expectSearchParam(reviewResultsUrl, "teacher", expectedTeacher);
    }
  });
});
