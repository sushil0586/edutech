import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function followLinkTarget(
  page: Page,
  locator: ReturnType<Page["getByRole"]> | ReturnType<Page["locator"]>,
  expectedUrl: RegExp,
) {
  await expect(locator).toBeVisible();
  const href = await locator.getAttribute("href");
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
    await followLinkTarget(page, attemptTimelineLink, /\/app\/attempts(?:\?.*)?$/);

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page.locator(".studentDashboardExamGrid").first()).toBeVisible();

    const walletLink = page.getByRole("link", { name: /open wallet/i }).first();
    await followLinkTarget(page, walletLink, /\/app\/wallet(?:\?.*)?$/);

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page.locator(".studentDashboardRecommendation").first()).toBeVisible();

    const primaryRecommendationAction = page
      .locator(".studentDashboardRecommendation")
      .getByRole("link")
      .first();
    await followLinkTarget(
      page,
      primaryRecommendationAction,
      /\/app\/(attempts\/[^/?#]+(?:\/summary)?|results|exams\/[^/?#]+)(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page.locator(".studentDashboardExamGrid").nth(1)).toBeVisible();
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /^view all$/i }).first(),
      /\/app\/exams(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /open results/i }).first(),
      /\/app\/results(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page.getByRole("link", { name: /view detailed report/i }).first()).toBeVisible();
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /view detailed report/i }).first(),
      /\/app\/analytics(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/dashboard");
    await expect(page.getByRole("link", { name: /^view all$/i }).last()).toBeVisible();
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /^view all$/i }).last(),
      /\/app\/results(?:\?.*)?$/,
    );
  });
});
