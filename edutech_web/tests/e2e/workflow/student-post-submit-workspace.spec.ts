import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  await gotoWithRuntimeRecovery(page, url, Math.max(4, attempts));
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
      await gotoWithRetry(page, "/app/results");
      await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(page.getByText(/results loaded|average result|review ready|pending publication/i).first()).toBeVisible();

      await gotoWithRetry(page, "/app/attempts");
      await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
      await expect(
        await firstVisible([
          page.getByText(/your attempt history is empty right now/i).first(),
          page.getByText(/no attempts match these controls/i).first(),
          page.getByText(/attempt history|attempts loaded|in progress|evaluation pending/i).first(),
        ]),
      ).toBeVisible();
      return;
    }
    const summaryHref = summarySource.href;
    expect(summaryHref).toMatch(/^\/app\/attempts\/[^/]+\/summary$/);

    await summarySource.entry.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);

    await expect(page.getByText(/^attempt summary$/i).first()).toBeVisible();
    await expect(page.getByText(/attempt status/i).first()).toBeVisible();
    await expect(page.getByText(/what you can do now/i).first()).toBeVisible();
    await expect(
      page.getByText(/result published|review available|review locked|evaluation pending/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/open attempts/i).first()).toBeVisible();
    await expect(
      page.getByText(/result published .* review available|result published|review available/i).first(),
    ).toBeVisible();

    const summaryHero = page.locator(".studentInsightHeroCard").first();
    await expect(summaryHero).toBeVisible();

    await firstVisible([
      summaryHero.getByRole("link", { name: /open answer review|review feedback/i }).first(),
      summaryHero.getByRole("link", { name: /open results|view results|check result status/i }).first(),
    ]);
    await expect(page.getByRole("link", { name: /open attempts/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /open attempts/i }).first().click();
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
        await expect(page.locator(".contentCard").filter({ hasText: /how to use this review/i }).first()).toBeVisible();
        await expect(page.locator(".contentCard").filter({ hasText: /next learning step/i }).first()).toBeVisible();
        await expect(
          page.getByText(/turn this review into action by practicing the topic that was most exposed in this attempt/i).first(),
        ).toBeVisible();

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
        await expect(page.getByText(/^attempt summary$/i).first()).toBeVisible();
        await expect(page.getByText(/what you can do now/i).first()).toBeVisible();
      }
    }

    await page.getByRole("link", { name: /open results|view results|check result status/i }).first().click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  });
});
