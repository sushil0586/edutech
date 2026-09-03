import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  expectAdminWorkspace,
  expectInstituteWorkspace,
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";
import { suppressVisualNoise } from "../helpers/visual";

async function openMobileReleaseRoute(page: Page, href: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("Release UI mobile visual", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => {
    await suppressVisualNoise(page);
  });

  test("@workflow @visual student mobile practice stays aligned for release", async ({ page }) => {
    test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openMobileReleaseRoute(page, "/app/practice", /math practice|practice/i);

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("release-mobile-student-practice-filters-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 240,
    });
  });

  test("@workflow @visual teacher mobile reviews stay aligned for release", async ({ page }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openMobileReleaseRoute(page, "/teacher/reviews", /review queue/i);

    const filtersCard = page.locator("form.teacherExamFilters").first();
    await expect(filtersCard).toHaveScreenshot("release-mobile-teacher-reviews-filters.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 240,
    });
  });

  test("@workflow @visual admin mobile reports stay aligned for release", async ({ page }) => {
    test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await openMobileReleaseRoute(page, "/admin/reports", /^reports$/i);

    const filtersCard = page.locator(".adminReportsPage .workspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("release-mobile-admin-reports-controls.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 260,
    });
  });

  test("@workflow @visual institute mobile reviews stay aligned for release", async ({ page }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openMobileReleaseRoute(page, "/institute/reviews", /review queue/i);

    const filtersCard = page.locator("form.teacherExamFilters").first();
    await expect(filtersCard).toHaveScreenshot("release-mobile-institute-reviews-filters.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 260,
    });
  });
});
