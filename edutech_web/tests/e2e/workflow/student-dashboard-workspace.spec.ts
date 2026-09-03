import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function followHrefTarget(page: Page, href: string | null, expectedUrl: RegExp) {
  expect(href).toBeTruthy();
  await gotoWithRuntimeRecovery(page, href!);
  await expect(page).toHaveURL(expectedUrl);
}

test.describe("Student dashboard workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate dashboard context controls and action handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
    await expect(page.locator(".studentDashboardRecommendation").first()).toBeVisible();
    await expect(page.locator(".studentDashboardPremiumSection").first()).toBeVisible();
    await expect(page.locator(".studentDashboardBottomGrid").first()).toBeVisible();
    await expect(page.locator(".studentDashboardChipRow").first()).toBeVisible();

    const subjectChips = page.locator(".studentDashboardChip");
    await expect(subjectChips.first()).toBeVisible();
    expect(await subjectChips.count()).toBeGreaterThan(0);

    const attemptTimelineLink = page.getByRole("link", { name: /open attempt timeline/i }).first();
    await expect(attemptTimelineLink).toBeVisible();
    const attemptTimelineHref = await attemptTimelineLink.getAttribute("href");

    const walletLink = page.getByRole("link", { name: /open wallet/i }).first();
    await expect(walletLink).toBeVisible();
    const walletHref = await walletLink.getAttribute("href");

    const primaryRecommendationAction = page
      .locator(".studentDashboardRecommendation")
      .getByRole("link")
      .first();
    await expect(primaryRecommendationAction).toBeVisible();
    const primaryRecommendationHref = await primaryRecommendationAction.getAttribute("href");

    await expect(page.locator(".studentDashboardExamGrid").nth(1)).toBeVisible();
    const examsViewAllHref = await page.getByRole("link", { name: /^view all$/i }).first().getAttribute("href");

    const reportsHubLink = page.getByRole("link", { name: /open reports hub/i }).first();
    await expect(reportsHubLink).toBeVisible();
    const reportsHubHref = await reportsHubLink.getAttribute("href");

    const detailedReportLink = page.getByRole("link", { name: /view detailed report/i }).first();
    await expect(detailedReportLink).toBeVisible();
    const detailedReportHref = await detailedReportLink.getAttribute("href");

    const resultsViewAllHref = await page.getByRole("link", { name: /^view all$/i }).last().getAttribute("href");

    await followHrefTarget(page, attemptTimelineHref, /\/app\/attempts(?:\?.*)?$/);
    await followHrefTarget(page, walletHref, /\/app\/wallet(?:\?.*)?$/);
    await followHrefTarget(
      page,
      primaryRecommendationHref,
      /\/app\/(attempts\/[^/?#]+(?:\/summary)?|results|exams\/[^/?#]+)(?:\?.*)?$/,
    );
    await followHrefTarget(page, examsViewAllHref, /\/app\/exams(?:\?.*)?$/);
    await followHrefTarget(page, reportsHubHref, /\/app\/reports(?:\?.*)?$/);
    await followHrefTarget(page, detailedReportHref, /\/app\/analytics(?:\?.*)?$/);
    await followHrefTarget(page, resultsViewAllHref, /\/app\/results(?:\?.*)?$/);
  });
});
