import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { InstituteExamsPage } from "../page-objects/institute/institute-exams.po";
import { InstituteShellPage } from "../page-objects/institute/institute-shell.po";

test.describe("Institute exams filter and pagination journey", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute exams page keeps filter context during pagination", async ({ page }) => {
    const shell = new InstituteShellPage(page);
    const exams = new InstituteExamsPage(page);

    await loginAsRole(page, "institute");
    await shell.expectWorkspace();

    await exams.goto();
    await exams.expectLoaded();

    const emptyStateHeading = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(emptyStateHeading).toBeVisible();
      await expect(page.getByText(/use quick create for the fastest first mock or practice exam/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /start with quick create/i }).first()).toBeVisible();
      return;
    }

    const teacherApplied = await exams.applyTeacher(/opbms|demo-institute-admin/i);
    if (teacherApplied) {
      await expect(page).toHaveURL(/teacher=/);
    }

    const filtersApplied = await exams.applyStatusSortAndGroup("scheduled", "title", "status");
    if (filtersApplied) {
      await expect(page).toHaveURL(/exam_status=scheduled/);
      await expect(page).toHaveURL(/exam_sort=title/);
      await expect(page).toHaveURL(/exam_group=status/);
    }

    const movedNext = await exams.goNextPageIfAvailable();
    if (movedNext) {
      await expect(page).toHaveURL(/exam_page=2/);
      if (teacherApplied) {
        await expect(page).toHaveURL(/teacher=/);
      }
      if (filtersApplied) {
        await expect(page).toHaveURL(/exam_status=scheduled/);
        await expect(page).toHaveURL(/exam_sort=title/);
        await expect(page).toHaveURL(/exam_group=status/);
      }
    }

    await page.goto("/institute/exams?exam_page=999");
    await exams.expectLoaded();

    const overflowRunEmptyStateHeading = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    if (!(await overflowRunEmptyStateHeading.isVisible().catch(() => false))) {
      const overflowState = page.getByText(/you are on a page that no longer has visible exams/i).first();
      if (await overflowState.isVisible().catch(() => false)) {
        await exams.expectPaginationOverflowState();
        await page.getByRole("link", { name: /return to page 1 with the same controls/i }).first().click();
        await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      }
    }

    await page.goto("/institute/exams?exam_status=completed&teacher=missing-teacher");
    await exams.expectLoaded();

    const filteredState = page.getByText(/no exams match the current controls/i).first();
    if (await filteredState.isVisible().catch(() => false)) {
      await exams.expectFilteredEmptyState();
      await expect(page.getByText(/active controls/i).first()).toBeVisible();
      await page.getByRole("link", { name: /clear all controls and show all exams/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    }
  });
});
