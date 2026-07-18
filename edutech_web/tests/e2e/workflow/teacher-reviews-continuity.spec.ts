import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function gotoTeacherReviews(page: Page, href = "/teacher/reviews") {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  await expect(page.getByText(/one-click grading views|quick triage/i).first()).toBeVisible();
}

async function applyContinuityFilters(page: Page) {
  const form = page.locator("form.teacherExamFilters").first();
  await form.getByRole("combobox", { name: /^status$/i }).selectOption("in_review");
  await form.getByRole("combobox", { name: /page size/i }).selectOption("24");
  await form.getByRole("textbox", { name: /^search$/i }).fill("math");
  await form.getByRole("button", { name: /apply filters|update view/i }).click();
}

async function expectContinuityFilters(page: Page) {
  await expect(page).toHaveURL(/status=in_review/);
  await expect(page).toHaveURL(/page_size=24/);
  await expect(page).toHaveURL(/search=math/);
  await expect(page.getByRole("combobox", { name: /^status$/i })).toHaveValue("in_review");
  await expect(page.getByRole("combobox", { name: /page size/i })).toHaveValue("24");
  await expect(page.getByRole("textbox", { name: /^search$/i })).toHaveValue("math");
  await expect(page.getByText(/status: in review/i).first()).toBeVisible();
  await expect(page.getByText(/page size: 24 tasks/i).first()).toBeVisible();
}

test.describe("Teacher reviews continuity", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher reviews filters and scoped queue survive refresh and revisit", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoTeacherReviews(page);
    await applyContinuityFilters(page);
    await expectContinuityFilters(page);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expectContinuityFilters(page);

    await gotoWithRuntimeRecovery(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expectContinuityFilters(page);

    const scopedReviewsLink = page.getByRole("link", { name: /^open reviews$/i }).first();
    if (!(await scopedReviewsLink.isVisible().catch(() => false))) {
      await page.getByRole("link", { name: /reset|reset filters/i }).first().click();
      await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
      return;
    }

    await gotoWithRuntimeRecovery(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await scopedReviewsLink.click();

    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);
    await expect(page.getByText(/exam-scoped review queue/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /clear scope/i })).toBeVisible();

    const scopedUrl = page.url();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(scopedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.getByText(/exam-scoped review queue/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /clear scope/i })).toBeVisible();

    await page.getByRole("link", { name: /open results/i }).nth(1).click();
    await expect(page).toHaveURL(/\/teacher\/results\?[^#]*exam=/);

    await page.goBack();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);
    await expect(page.getByText(/exam-scoped review queue/i).first()).toBeVisible();

    await page.getByRole("link", { name: /clear scope/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  });
});
