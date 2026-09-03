import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function clickOrGotoHref(page: import("@playwright/test").Page, href: string | null, urlPattern: RegExp) {
  expect(href).not.toBeNull();
  if (urlPattern.test(page.url())) {
    return;
  }

  const resolvedUrl = new URL(href!, page.url());
  await page.goto(`${resolvedUrl.pathname}${resolvedUrl.search}`, { waitUntil: "commit" });
  await page.waitForLoadState("load").catch(() => null);
}

test.describe("Student downloads workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate the student reports hub and report manifest", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto("/app/analytics/downloads", { waitUntil: "commit" });
    await page.waitForLoadState("load").catch(() => null);
    await expect(page).toHaveURL(/\/app\/analytics\/downloads(?:\?.*)?$/);

    await expect(page.getByRole("heading", { name: /reports hub|downloadable reports center/i }).first()).toBeVisible();
    await expect(page.getByText(/report manifest/i).first()).toBeVisible();
    await expect(page.getByText(/export roadmap/i).first()).toBeVisible();
    await expect(page.getByText(/suggested next report|suggested next implementation/i).first()).toBeVisible();

    await page.goto("/app/reports", { waitUntil: "commit" });
    await page.waitForLoadState("load").catch(() => null);
    await expect(page).toHaveURL(/\/app\/reports(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /reports hub|downloadable reports center/i }).first()).toBeVisible();

    await page.goto("/app/analytics/downloads", { waitUntil: "commit" });
    await page.waitForLoadState("load").catch(() => null);

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
      const recommendationHref = await recommendationLink.getAttribute("href");
      await recommendationLink.click();
      await clickOrGotoHref(page, recommendationHref, /\/app\/analytics\/study-recommendations(?:\?.*)?$/);
      await expect(page).toHaveURL(/\/app\/analytics\/study-recommendations(?:\?.*)?$/);
      await page.goto("/app/analytics/downloads", { waitUntil: "commit" });
      await page.waitForLoadState("load").catch(() => null);
    }

    const rankHistoryLink = page.getByRole("link", { name: /open rank history/i }).first();
    if (await rankHistoryLink.isVisible().catch(() => false)) {
      const rankHistoryHref = await rankHistoryLink.getAttribute("href");
      await rankHistoryLink.click();
      await clickOrGotoHref(page, rankHistoryHref, /\/app\/analytics\/rank-history(?:\?.*)?$/);
      await expect(page).toHaveURL(/\/app\/analytics\/rank-history(?:\?.*)?$/);
    }
  });
});
