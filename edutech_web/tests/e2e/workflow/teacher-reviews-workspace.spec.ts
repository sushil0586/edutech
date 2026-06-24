import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

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

async function expectTeacherReviewsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  await expect(page.getByText(/one-click grading views|quick triage/i).first()).toBeVisible();
}

test.describe("Teacher reviews workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can filter and navigate the reviews workspace", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/reviews");
    await expectTeacherReviewsWorkspace(page);

    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /open results/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);

    await page.goto("/teacher/reviews");
    await expectTeacherReviewsWorkspace(page);

    await page.getByRole("link", { name: /open pending/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*status=pending/);

    await page.getByRole("link", { name: /open reviewed/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*status=reviewed/);

    await page.getByRole("link", { name: /^reset$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);

    await page.getByRole("combobox", { name: /^status$/i }).selectOption("in_review");
    await page.getByRole("combobox", { name: /page size/i }).selectOption("24");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*status=in_review/);
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*page_size=24/);

    const openTaskLink = page.getByRole("link", { name: /open task/i }).first();
    if (await openTaskLink.isVisible().catch(() => false)) {
      await openTaskLink.click();
      await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*task=/);
      await expect(page.getByText(/task detail/i).first()).toBeVisible();
    }

    const previousPageLink = page.getByRole("link", { name: /previous page/i }).first();
    await expect(previousPageLink).toBeVisible();

    const nextPageLink = page.getByRole("link", { name: /next page/i }).first();
    await expect(nextPageLink).toBeVisible();

    await gotoWithRetry(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    const scopedReviewsLink = page.getByRole("link", { name: /^open reviews$/i }).first();
    await expect(scopedReviewsLink).toBeVisible();
    await scopedReviewsLink.click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);
    await expect(page.getByText(/exam-scoped review queue/i).first()).toBeVisible();

    await expect(page.getByRole("link", { name: /back to exam/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).nth(1)).toBeVisible();
    await expect(page.getByRole("link", { name: /clear scope/i })).toBeVisible();

    await page.getByRole("link", { name: /open results/i }).nth(1).click();
    await expect(page).toHaveURL(/\/teacher\/results\?[^#]*exam=/);

    await gotoWithRetry(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /^open reviews$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);

    await page.getByRole("link", { name: /back to exam/i }).click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam code/i).first()).toBeVisible();

    await gotoWithRetry(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /^open reviews$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);

    await page.getByRole("link", { name: /clear scope/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expectTeacherReviewsWorkspace(page);
  });
});
