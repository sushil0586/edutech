import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

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

async function resolveSummaryHref(page: Page) {
  await gotoWithRetry(page, "/app/attempts");
  await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();

  const emptyAttempts = page.getByText(/your attempt history is empty right now/i);
  if (!(await emptyAttempts.isVisible().catch(() => false))) {
    const summaryLink = page.getByRole("link", { name: /open summary/i }).first();
    if (await summaryLink.isVisible().catch(() => false)) {
      return await summaryLink.getAttribute("href");
    }
  }

  await gotoWithRetry(page, "/app/results");
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

  const emptyResults = page.getByText(/your result history is empty right now/i);
  if (!(await emptyResults.isVisible().catch(() => false))) {
    const summaryLink = page.getByRole("link", { name: /open summary/i }).first();
    if (await summaryLink.isVisible().catch(() => false)) {
      return await summaryLink.getAttribute("href");
    }
  }

  return null;
}

test.describe("Student cross-browser attempts and summary sanity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can open attempts and post-submit summary routes across browser engines", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/attempts");
    await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();

    const summaryHref = await resolveSummaryHref(page);
    if (!summaryHref) {
      test.skip(true, "Student seeded account does not currently expose a post-submit summary route.");
      return;
    }

    expect(summaryHref).toMatch(/^\/app\/attempts\/[^/]+\/summary$/);

    await gotoWithRetry(page, summaryHref);
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
    await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
    await expect(page.getByText(/attempt status/i).first()).toBeVisible();
    await expect(page.getByText(/recommended actions/i).first()).toBeVisible();

    const resultsLink = page
      .getByRole("link", { name: /open results|view results|check result status/i })
      .first();
    await expect(resultsLink).toBeVisible();
    await resultsLink.click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);

    await gotoWithRetry(page, summaryHref);
    const reviewLink = page
      .getByRole("link", { name: /open answer review|review feedback/i })
      .first();
    if (await reviewLink.isVisible().catch(() => false)) {
      await reviewLink.click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
      await expect(page.getByText(/review mode/i).first()).toBeVisible();
      await expect(page.getByText(/review state/i).first()).toBeVisible();
    }
  });
});
