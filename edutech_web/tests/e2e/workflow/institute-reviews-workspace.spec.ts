import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectReviewsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  await expect(page.getByText(/quick triage/i)).toBeVisible();
}

test.describe("Institute reviews workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can filter and navigate the reviews workspace", async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/reviews");
    await expectReviewsWorkspace(page);

    await page.getByRole("link", { name: /view pending/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*status=pending/);

    await page.getByRole("link", { name: /view assigned/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*status=assigned/);
    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*assignment_scope=assigned/);

    await page.getByRole("link", { name: /^unassigned$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*status=pending/);
    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*assignment_scope=unassigned/);

    await page.getByRole("link", { name: /^reset$/i }).click();
    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);

    await page.getByRole("combobox", { name: /^status$/i }).selectOption("reviewed");
    await page.getByRole("combobox", { name: /^assignment$/i }).selectOption("assigned");
    await page.getByRole("combobox", { name: /page size/i }).selectOption("24");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*status=reviewed/);
    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*assignment_scope=assigned/);
    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*page_size=24/);
    await expect(page.getByText(/assignment: assigned only/i)).toBeVisible();

    const clearFiltersLink = page.getByRole("link", { name: /clear filters/i });
    await expect(clearFiltersLink).toBeVisible();
    await clearFiltersLink.click();
    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
    await expectReviewsWorkspace(page);

    const reviewerQueueLink = page.getByRole("link", { name: /view queue/i }).first();
    if (await reviewerQueueLink.isVisible().catch(() => false)) {
      await reviewerQueueLink.click();
      await expect(page).toHaveURL(/\/institute\/reviews\?/);
      await expect(page).toHaveURL(/(reviewer=|assignment_scope=unassigned)/);
      await expectReviewsWorkspace(page);
      await page.goto("/institute/reviews");
    }

    const examHotspotLink = page.getByRole("link", { name: /open queue/i }).first();
    if (await examHotspotLink.isVisible().catch(() => false)) {
      await examHotspotLink.click();
      await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*exam=/);
      await expect(page.getByText(/exam-scoped review queue/i)).toBeVisible();
      await expect(page.getByRole("link", { name: /back to exam/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /open results/i })).toBeVisible();

      await page.getByRole("link", { name: /open results/i }).click();
      await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam=/);

      await page.goto("/institute/reviews");
      await expectReviewsWorkspace(page);

      const scopedQueueLink = page.getByRole("link", { name: /open queue/i }).first();
      await scopedQueueLink.click();
      await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*exam=/);

      await page.getByRole("link", { name: /back to exam/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/[^/]+$/);
    }
  });
});
