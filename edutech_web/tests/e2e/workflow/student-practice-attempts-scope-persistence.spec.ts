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

test.describe("Student practice and attempts scope persistence", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can preserve subject scope through practice, results, and attempts hops", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();

    const subjectLink = page.locator('a[href^="/app/analytics/subjects/"]').first();
    if (!(await subjectLink.isVisible().catch(() => false))) {
      test.skip(true, "Student seeded account does not currently expose a subject analytics drill route.");
      return;
    }

    await subjectLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
    const subjectAnalyticsUrl = new URL(page.url());
    const expectedSubject = subjectAnalyticsUrl.pathname.split("/").pop() ?? null;
    expect(expectedSubject).not.toBeNull();

    const practiceLink = page.getByRole("link", { name: /practice /i }).first();
    await expect(practiceLink).toBeVisible();
    const practiceHref = await practiceLink.getAttribute("href");
    expect(practiceHref).not.toBeNull();
    const practiceUrl = new URL(practiceHref!, "http://localhost");
    expect(practiceUrl.pathname).toBe("/app/practice");
    expectSearchParam(practiceUrl, "subject", expectedSubject);

    await practiceLink.click();
    await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
    const landedPracticeUrl = new URL(page.url());
    expectSearchParam(landedPracticeUrl, "subject", expectedSubject);
    await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();

    const resultsLink = page.getByRole("link", { name: /check results/i }).first();
    await expect(resultsLink).toBeVisible();
    const resultsHref = await resultsLink.getAttribute("href");
    expect(resultsHref).not.toBeNull();
    const resultsUrl = new URL(resultsHref!, "http://localhost");
    expect(resultsUrl.pathname).toBe("/app/results");
    expectSearchParam(resultsUrl, "subject", expectedSubject);

    await resultsLink.click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    const landedResultsUrl = new URL(page.url());
    expectSearchParam(landedResultsUrl, "subject", expectedSubject);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`Subject view\\s*·\\s*${expectedSubject}`, "i")).first()).toBeVisible();

    const attemptsLink = page.getByRole("link", { name: /open attempts/i }).first();
    await expect(attemptsLink).toBeVisible();
    const attemptsHref = await attemptsLink.getAttribute("href");
    expect(attemptsHref).not.toBeNull();
    const attemptsUrl = new URL(attemptsHref!, "http://localhost");
    expect(attemptsUrl.pathname).toBe("/app/attempts");
    expectSearchParam(attemptsUrl, "subject", expectedSubject);

    await attemptsLink.click();
    await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
    const landedAttemptsUrl = new URL(page.url());
    expectSearchParam(landedAttemptsUrl, "subject", expectedSubject);
    await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`Subject view\\s*·\\s*${expectedSubject}`, "i")).first()).toBeVisible();

    const returnToPracticeLink = page.getByRole("link", { name: /open practice/i }).first();
    await expect(returnToPracticeLink).toBeVisible();
    const returnPracticeHref = await returnToPracticeLink.getAttribute("href");
    expect(returnPracticeHref).not.toBeNull();
    const returnPracticeUrl = new URL(returnPracticeHref!, "http://localhost");
    expect(returnPracticeUrl.pathname).toBe("/app/practice");
    expectSearchParam(returnPracticeUrl, "subject", expectedSubject);
  });
});
