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

  throw new Error("Expected at least one locator to be visible.");
}

async function resolveSummaryEntry(page: Page) {
  await gotoWithRetry(page, "/app/attempts");
  await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();

  const emptyAttempts = page.getByText(/your attempt history is empty right now/i);
  if (!(await emptyAttempts.isVisible().catch(() => false))) {
    const summaryEntry = page.getByRole("link", { name: /open summary/i }).first();
    if (await summaryEntry.isVisible().catch(() => false)) {
      const href = await summaryEntry.getAttribute("href");
      if (!href) {
        throw new Error("Expected attempts summary link to include an href.");
      }
      return {
        origin: "attempts" as const,
        entry: summaryEntry,
        href,
      };
    }
  }

  await gotoWithRetry(page, "/app/results");
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

  const emptyResults = page.getByText(/your result history is empty right now/i);
  if (!(await emptyResults.isVisible().catch(() => false))) {
    const summaryEntry = page.getByRole("link", { name: /open summary/i }).first();
    if (await summaryEntry.isVisible().catch(() => false)) {
      const href = await summaryEntry.getAttribute("href");
      if (!href) {
        throw new Error("Expected results summary link to include an href.");
      }
      return {
        origin: "results" as const,
        entry: summaryEntry,
        href,
      };
    }
  }

  return null;
}

async function expectReviewRouteOrUnavailable(page: Page) {
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
  const unavailableHeading = page.getByRole("heading", {
    name: /attempt review is not available right now/i,
  }).first();
  if (await unavailableHeading.isVisible().catch(() => false)) {
    await expect(page.getByText(/review unavailable/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /check result status/i }).first()).toBeVisible();
    return "unavailable" as const;
  }

  await expect(page.getByRole("heading", { name: /review/i }).first()).toBeVisible();
  await expect(page.locator(".contentCard").filter({ hasText: /review state/i }).first()).toBeVisible();
  return "available" as const;
}

test.describe("Student post-submit workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate post-submit summary and conditional review surfaces", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const summarySource = await resolveSummaryEntry(page);
    if (!summarySource) {
      test.skip(true, "Student seeded account does not currently expose a post-submit summary route.");
      return;
    }
    const summaryHref = summarySource.href;
    expect(summaryHref).toMatch(/^\/app\/attempts\/[^/]+\/summary$/);

    await summarySource.entry.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);

    await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
    await expect(page.getByText(/attempt status/i).first()).toBeVisible();
    await expect(page.getByText(/recommended actions/i).first()).toBeVisible();
    await expect(
      page.getByText(/submitted, evaluation pending, result published, then review available when allowed/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/use attempts history to revisit this summary later/i).first()).toBeVisible();
    await expect(
      page.getByText(/result published .* review available|result published|review available/i).first(),
    ).toBeVisible();

    const summaryHero = page.locator(".studentInsightHeroCard").first();
    await expect(summaryHero).toBeVisible();

    await firstVisible([
      summaryHero.getByRole("link", { name: /open answer review|review feedback/i }).first(),
      summaryHero.getByRole("link", { name: /open results|view results|check result status/i }).first(),
    ]);
    await expect(summaryHero.getByRole("link", { name: /open attempts/i }).first()).toBeVisible();
    await summaryHero.getByRole("link", { name: /open attempts/i }).first().click();
    await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);

    await gotoWithRetry(page, summaryHref);
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);

    const reviewEntry = summaryHero
      .getByRole("link", { name: /open answer review|review feedback/i })
      .first();

    if (await reviewEntry.isVisible().catch(() => false)) {
      const reviewHref = await reviewEntry.getAttribute("href");
      expect(reviewHref).not.toBeNull();
      expect(reviewHref).toMatch(/^\/app\/attempts\/[^/]+\/review$/);

      await reviewEntry.click();
      const reviewState = await expectReviewRouteOrUnavailable(page);

      if (reviewState === "available") {
        await expect(page.locator(".contentCard").filter({ hasText: /recommended actions/i }).first()).toBeVisible();
        await expect(
          page.getByText(/this route is the final student-release stage/i).first(),
        ).toBeVisible();
        await expect(page.getByText(/use summary to confirm release state/i).first()).toBeVisible();

        const reviewStateCard = page
          .locator(".contentCard")
          .filter({ has: page.getByText(/^review state$/i) })
          .first();
        await expect(reviewStateCard).toBeVisible();
        await expect(
          reviewStateCard.getByText(/correct answers|explanations|questions in review/i).first(),
        ).toBeVisible();

        await page.getByRole("link", { name: /open attempts/i }).first().click();
        await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);

        await gotoWithRetry(page, summaryHref);
        await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
        const backToSummaryLink = page.getByRole("link", { name: /back to summary|open summary/i }).first();
        await expect(backToSummaryLink).toBeVisible();
        await backToSummaryLink.click();
        await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      }
    }

    await page.getByRole("link", { name: /open results|view results|check result status/i }).first().click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  });
});
