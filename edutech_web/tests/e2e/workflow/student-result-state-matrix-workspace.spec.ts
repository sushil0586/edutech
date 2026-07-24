import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  await gotoWithRuntimeRecovery(page, url, Math.max(4, attempts));
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

function resultRowByTitle(page: Page, title: string) {
  return page.locator(".studentResultsTable tbody tr").filter({
    has: page.locator("td strong", { hasText: title }),
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
      await expect(emptyState).toBeVisible();
      await expect(page.getByRole("link", { name: /open exams|open practice/i }).first()).toBeVisible();
      return;
    }

    const rows = page.locator(".studentResultsTable tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    const allTitles = await rows
      .locator("td strong")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean));

    const pendingRow = page.locator(".studentResultsTable tbody tr").filter({
      has: page.locator("td .statusPill", { hasText: /^pending$/i }),
    }).first();

    if (await pendingRow.isVisible().catch(() => false)) {
      const pendingTitle =
        (await pendingRow.locator("td strong").first().textContent())?.trim() ?? "";
      await pendingRow.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/^awaiting result$/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open answer review/i })).toHaveCount(0);
      await page.getByRole("link", { name: /open summary/i }).first().click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/evaluation pending|awaiting publication/i).first()).toBeVisible();
      await expect(page.getByText(/review locked/i).first()).toBeVisible();

      await gotoWithRetry(page, "/app/results");
      await expectStudentResultsWorkspace(page);
      if (pendingTitle) {
        await expect(resultRowByTitle(page, pendingTitle)).toBeVisible();
      }
    }

    await page.goto("/app/results?result_group=review");
    await expectStudentResultsWorkspace(page);
    await expect(page.getByText(/group: review/i).first()).toBeVisible();

    const summaryOnlyRow = page.locator(".studentResultsTable tbody tr").filter({
      has: page.locator("td", { hasText: /locked/i }),
    }).first();
    if (await summaryOnlyRow.isVisible().catch(() => false)) {
      const summaryOnlyTitle =
        (await summaryOnlyRow.locator("td strong").first().textContent())?.trim() ?? "";
      if (summaryOnlyTitle) {
        await summaryOnlyRow.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByRole("link", { name: /open answer review/i })).toHaveCount(0);
        await page.getByRole("link", { name: /open summary/i }).first().click();
        await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
        await expect(page.getByText(/result published/i).first()).toBeVisible();
        await expect(page.getByText(/review locked|answer review is still locked/i).first()).toBeVisible();

        await gotoWithRetry(page, "/app/results?result_group=review");
        await expectStudentResultsWorkspace(page);
        await expect(resultRowByTitle(page, summaryOnlyTitle)).toBeVisible();
      }
    }

    const reviewReadyRow = page.locator(".studentResultsTable tbody tr").filter({
      has: page.locator("td", { hasText: /available/i }),
    }).first();
    if (await reviewReadyRow.isVisible().catch(() => false)) {
      const reviewReadyTitle =
        (await reviewReadyRow.locator("td strong").first().textContent())?.trim() ?? "";
      if (reviewReadyTitle) {
        await reviewReadyRow.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByRole("link", { name: /open answer review/i })).toBeVisible();
        await page.getByRole("link", { name: /open answer review/i }).first().click();
        const reviewState = await expectReviewRouteOrUnavailable(page);

        if (reviewState === "available") {
          await expect(page.getByText(/review available/i).first()).toBeVisible();
          await expect(page.getByRole("link", { name: /open summary/i }).first()).toBeVisible();
        } else {
          await expect(page.getByRole("link", { name: /check result status/i }).first()).toBeVisible();
        }

        await gotoWithRetry(page, "/app/results?result_group=review");
        await expectStudentResultsWorkspace(page);
        await expect(resultRowByTitle(page, reviewReadyTitle)).toBeVisible();
      }
    }

    expect(allTitles.length).toBeGreaterThan(0);
  });
});
