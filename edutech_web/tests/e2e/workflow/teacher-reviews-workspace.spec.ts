import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "commit" });
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

async function expectVisiblePaginationControlsToAvoidHashLinks(page: Page) {
  const pagers = page.locator(".resultCardActions").filter({
    has: page.getByText(/previous page|next page/i),
  });
  const count = await pagers.count();

  for (let index = 0; index < count; index += 1) {
    const pager = pagers.nth(index);
    if (!(await pager.isVisible().catch(() => false))) {
      continue;
    }

    await expect(pager.locator('a[href="#"]')).toHaveCount(0);
  }
}

test.describe("Teacher reviews workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can filter and navigate the reviews workspace", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/reviews");
    await expectTeacherReviewsWorkspace(page);
    await expectVisiblePaginationControlsToAvoidHashLinks(page);

    await expect(page.getByRole("link", { name: /view results/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /view results/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);

    await page.goto("/teacher/reviews");
    await expectTeacherReviewsWorkspace(page);

    await page.getByRole("link", { name: /view pending|^pending$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*status=pending/);

    await page.getByRole("link", { name: /view reviewed|^reviewed$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*status=reviewed/);

    await page.getByRole("link", { name: /^reset$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);

    await page.getByRole("combobox", { name: /^status$/i }).selectOption("in_review");
    await page.getByRole("combobox", { name: /page size/i }).selectOption("24");
    await page.getByRole("button", { name: /update view/i }).click();

    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*status=in_review/);
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*page_size=24/);
    await expect(page.getByText(/status: in review/i).first()).toBeVisible();
    await expect(page.getByText(/page size: 24 tasks/i).first()).toBeVisible();
    await expectVisiblePaginationControlsToAvoidHashLinks(page);

    await page.getByRole("textbox", { name: /^search$/i }).fill("playwright-no-teacher-review-match-zzqv-1943");
    await page.getByRole("button", { name: /update view/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*search=playwright-no-teacher-review-match-zzqv-1943/);
    await expect(page.getByText(/no review tasks match these filters/i)).toBeVisible();
    await expect(page.getByText(/active controls are shaping this empty state/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /reset filters and show full queue/i })).toBeVisible();
    await page.getByRole("link", { name: /reset filters and show full queue/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expectTeacherReviewsWorkspace(page);
    await expectVisiblePaginationControlsToAvoidHashLinks(page);

    const openTaskLink = page.getByRole("link", { name: /review task/i }).first();
    if (await openTaskLink.isVisible().catch(() => false)) {
      await openTaskLink.click();
      await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*task=/);
      await expect(page.getByText(/task detail/i).first()).toBeVisible();
    }

    await expect(page.getByText(/previous page/i).first()).toBeVisible();
    await expect(page.getByText(/next page/i).first()).toBeVisible();

    await gotoWithRetry(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    const scopedReviewsLink = page.getByRole("link", { name: /open review queue|view reviews/i }).first();
    await expect(scopedReviewsLink).toBeVisible();
    await scopedReviewsLink.click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);
    await expect(page.getByText(/exam-scoped review queue/i).first()).toBeVisible();

    await expect(page.getByRole("link", { name: /view exam/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view results/i }).nth(1)).toBeVisible();
    await expect(page.getByRole("link", { name: /clear scope/i })).toBeVisible();

    await page.getByRole("link", { name: /view results/i }).nth(1).click();
    await expect(page).toHaveURL(/\/teacher\/results\?[^#]*exam=/);

    await gotoWithRetry(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /open review queue|view reviews/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);

    await page.getByRole("link", { name: /view exam/i }).click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam code/i).first()).toBeVisible();

    await gotoWithRetry(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /open review queue|view reviews/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);

    await page.getByRole("link", { name: /clear scope/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expectTeacherReviewsWorkspace(page);
  });
});
