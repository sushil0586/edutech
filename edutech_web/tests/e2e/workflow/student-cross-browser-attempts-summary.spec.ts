import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  await gotoWithRuntimeRecovery(page, url, Math.max(4, attempts));
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
      await gotoWithRetry(page, "/app/results");
      await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(page.getByText(/results loaded|average result|review ready|pending publication/i).first()).toBeVisible();

      await gotoWithRetry(page, "/app/attempts");
      await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
      await expect(
        page.getByText(/attempt history|attempts loaded|in progress|evaluation pending|your attempt history is empty/i).first(),
      ).toBeVisible();
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
      await expectReviewRouteOrUnavailable(page);
    }
  });
});
