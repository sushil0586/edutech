import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  expectAdminWorkspace,
  expectInstituteWorkspace,
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openReleaseRoute(page: Page, href: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("Release UI alignment visual", () => {
  test("@workflow @visual student practice filters and actions stay aligned for release", async ({
    page,
  }) => {
    test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openReleaseRoute(page, "/app/practice", /math practice|practice/i);

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("release-student-practice-filters-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });
  });

  test("@workflow @visual teacher reviews controls and queue header stay aligned for release", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openReleaseRoute(page, "/teacher/reviews", /review queue/i);

    const filtersCard = page.locator("form.teacherExamFilters").first();
    await expect(filtersCard).toHaveScreenshot("release-teacher-reviews-filters.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });
  });

  test("@workflow @visual admin reports controls stay aligned for release", async ({ page }) => {
    test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await openReleaseRoute(page, "/admin/reports", /^reports$/i);

    const filtersCard = page.locator(".adminReportsPage .workspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("release-admin-reports-controls.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 240,
    });
  });

  test("@workflow @visual institute reports controls stay aligned for release", async ({ page }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReleaseRoute(page, "/institute/reports", /^reports$/i);

    const filtersCard = page.locator(".instituteReportsPageVivid .workspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("release-institute-reports-controls.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 240,
    });
  });
});
