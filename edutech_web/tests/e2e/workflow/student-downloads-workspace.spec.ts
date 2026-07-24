import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

test.describe("Student downloads workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate the student reports hub and report manifest", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/analytics/downloads");
    await expect(page).toHaveURL(/\/app\/analytics\/downloads(?:\?.*)?$/);

    await expect(page.getByRole("heading", { name: /reports hub|downloadable reports center/i }).first()).toBeVisible();
    await expect(page.getByText(/report manifest/i).first()).toBeVisible();
    await expect(page.getByText(/export roadmap/i).first()).toBeVisible();
    await expect(page.getByText(/suggested next report|suggested next implementation/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/app/reports");
    await expect(page).toHaveURL(/\/app\/reports(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /reports hub|downloadable reports center/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/app/analytics/downloads");

    for (const label of [
      /academic reports|report artifacts/i,
      /interactive ready/i,
      /direct links|pdf export/i,
      /exports|spreadsheet export/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    const manifestTable = page.locator(".studentDownloadableReportsTable");
    await expect(manifestTable).toBeVisible();

    for (const reportName of [
      /overall performance dashboard/i,
      /exam summary report/i,
      /wrong questions report/i,
      /time management report/i,
      /rank & percentile history/i,
      /ai study recommendations/i,
    ]) {
      await expect(manifestTable.getByText(reportName).first()).toBeVisible();
    }

    const recommendationLink = page.getByRole("link", { name: /open recommendation report|open recommendations/i }).first();
    if (await recommendationLink.isVisible().catch(() => false)) {
      await recommendationLink.click();
      await expect(page).toHaveURL(/\/app\/analytics\/study-recommendations(?:\?.*)?$/);
      await gotoWithRuntimeRecovery(page, "/app/analytics/downloads");
    }

    const rankHistoryLink = page.getByRole("link", { name: /open rank history/i }).first();
    if (await rankHistoryLink.isVisible().catch(() => false)) {
      await rankHistoryLink.click();
      await expect(page).toHaveURL(/\/app\/analytics\/rank-history(?:\?.*)?$/);
    }
  });
});
