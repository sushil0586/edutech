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

async function expectStudentResultsWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  return null;
}

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  }).first();
}

async function expectReviewRouteOrUnavailable(page: Page) {
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
  const unavailableHeading = page.getByRole("heading", {
    name: /attempt review is not available right now/i,
  }).first();
  if (await unavailableHeading.isVisible().catch(() => false)) {
    await expect(page.getByText(/review unavailable/i).first()).toBeVisible();
    return "unavailable" as const;
  }

  await expect(page.getByRole("heading", { name: /review/i }).first()).toBeVisible();
  await expect(page.locator(".contentCard").filter({ hasText: /review state/i }).first()).toBeVisible();
  return "available" as const;
}

test.describe("Student result state matrix workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate pending, summary-only, and review-ready result states when present", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/results");
    await expectStudentResultsWorkspace(page);

    const emptyState = page.getByText(/your result history is empty right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      test.skip(true, "Student seeded account does not currently expose result records for the state matrix.");
      return;
    }

    const cards = page.locator("article.studentResultSurface");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    const allTitles = await cards
      .locator(".studentResultSurfaceHead strong")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean));

    const pendingCard = await firstVisible([
      page.locator("article.studentResultSurface").filter({
        has: page.locator(".studentResultHelper strong", { hasText: /evaluation pending/i }),
      }).first(),
    ]);

    if (pendingCard) {
      const pendingTitle =
        (await pendingCard.locator(".studentResultSurfaceHead strong").first().textContent())?.trim() ?? "";
      await expect(pendingCard.getByText(/^pending$/i).first()).toBeVisible();
      await expect(pendingCard.getByRole("link", { name: /check attempt status|attempt summary/i })).toBeVisible();
      await expect(
        pendingCard.getByRole("link", { name: /open answer review/i }),
      ).toHaveCount(0);

      await pendingCard.getByRole("link", { name: /check attempt status|attempt summary/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/evaluation pending/i).first()).toBeVisible();
      await expect(page.getByText(/review locked/i).first()).toBeVisible();

      await gotoWithRetry(page, "/app/results");
      await expectStudentResultsWorkspace(page);
      if (pendingTitle) {
        await expect(resultCardByTitle(page, pendingTitle)).toBeVisible();
      }
    }

    await page.goto("/app/results?result_group=review");
    await expectStudentResultsWorkspace(page);
    await expect(page.getByText(/group: review/i).first()).toBeVisible();

    const summaryOnlySection = page.locator(".studentResultsGroupedSection").filter({
      has: page.locator(".sectionHeading.sectionHeadingCompact strong", { hasText: /^review locked$/i }),
    }).first();
    if (await summaryOnlySection.isVisible().catch(() => false)) {
      const summaryOnlyCard = summaryOnlySection.locator("article.studentResultSurface").first();
      await expect(summaryOnlyCard).toBeVisible();
      await expect(summaryOnlyCard.getByText(/pending/i).first()).toHaveCount(0);
      await expect(summaryOnlyCard.getByRole("link", { name: /open answer review/i })).toHaveCount(0);

      const summaryOnlyTitle =
        (await summaryOnlyCard.locator(".studentResultSurfaceHead strong").first().textContent())?.trim() ?? "";
      if (summaryOnlyTitle) {
        await page.getByRole("link", { name: /attempt summary|open summary/i }).first().click();
        await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
        await expect(page.getByText(/result published/i).first()).toBeVisible();
        await expect(page.getByText(/answer review locked/i).first()).toBeVisible();

        await gotoWithRetry(page, "/app/results?result_group=review");
        await expectStudentResultsWorkspace(page);
        await expect(resultCardByTitle(page, summaryOnlyTitle)).toBeVisible();
      }
    }

    const reviewReadySection = page.locator(".studentResultsGroupedSection").filter({
      has: page.locator(".sectionHeading.sectionHeadingCompact strong", { hasText: /^review available$/i }),
    }).first();
    if (await reviewReadySection.isVisible().catch(() => false)) {
      const reviewReadyCard = reviewReadySection.locator("article.studentResultSurface").first();
      await expect(reviewReadyCard).toBeVisible();
      await expect(reviewReadyCard.getByRole("link", { name: /open answer review/i })).toBeVisible();

      const reviewReadyTitle =
        (await reviewReadyCard.locator(".studentResultSurfaceHead strong").first().textContent())?.trim() ?? "";
      if (reviewReadyTitle) {
        await reviewReadyCard.getByRole("link", { name: /open answer review/i }).click();
        const reviewState = await expectReviewRouteOrUnavailable(page);

        if (reviewState === "available") {
          await expect(page.getByText(/review available/i).first()).toBeVisible();
          await expect(page.getByRole("link", { name: /open summary/i }).first()).toBeVisible();
        } else {
          await expect(page.getByRole("link", { name: /check result status/i }).first()).toBeVisible();
        }

        await gotoWithRetry(page, "/app/results?result_group=review");
        await expectStudentResultsWorkspace(page);
        await expect(resultCardByTitle(page, reviewReadyTitle)).toBeVisible();
      }
    }

    expect(allTitles.length).toBeGreaterThan(0);
  });
});
