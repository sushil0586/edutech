import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openDownloads(page: Page, query = "") {
  await gotoWithRuntimeRecovery(page, `/app/analytics/downloads${query}`);
  await expect(page).toHaveURL(/\/app\/analytics\/downloads(?:\?.*)?$/);
}

test.describe("Student downloads report handoffs", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can carry scoped report context from downloads into linked academic reports", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openDownloads(page);

    await expect(page.getByRole("heading", { name: /reports hub|downloadable reports center/i }).first()).toBeVisible();
    await expect(page.getByText(/downloads center filters/i).first()).toBeVisible();

    const subjectSelect = page.getByLabel(/subject view/i).first();
    const sourceSelect = page.getByLabel(/source view/i).first();
    const applyFilters = page.getByRole("button", { name: /apply filters/i }).first();

    await expect(subjectSelect).toBeVisible();
    await expect(sourceSelect).toBeVisible();

    const sourceValue = await sourceSelect.inputValue();
    const subjectValue = await subjectSelect.inputValue();

    if (sourceValue !== "all") {
      await sourceSelect.selectOption(sourceValue);
    }
    if (subjectValue !== "all") {
      await subjectSelect.selectOption(subjectValue);
    }

    await applyFilters.click();

    const scopedUrl = new URL(page.url());
    const expectedSource = scopedUrl.searchParams.get("source");
    const expectedSubject = scopedUrl.searchParams.get("subject");

    const reportTable = page.locator(".studentDownloadableReportsTable");
    await expect(reportTable).toBeVisible();

    const reportLinks = [
      {
        name: /open results report/i,
        url: /\/app\/results(?:\?.*)?$/,
        heading: /results/i,
      },
      {
        name: /open subject report/i,
        url: /\/app\/analytics(?:\?.*)?$/,
        heading: /student analytics|performance overview|analytics/i,
      },
      {
        name: /open wrong questions report/i,
        url: /\/app\/analytics\/wrong-questions(?:\?.*)?$/,
        heading: /wrong questions report/i,
      },
      {
        name: /open time management report/i,
        url: /\/app\/analytics\/time-management(?:\?.*)?$/,
        heading: /time management report/i,
      },
      {
        name: /open rank history/i,
        url: /\/app\/analytics\/rank-history(?:\?.*)?$/,
        heading: /rank & percentile history/i,
      },
      {
        name: /open recommendation report/i,
        url: /\/app\/analytics\/study-recommendations(?:\?.*)?$/,
        heading: /ai study recommendations/i,
      },
    ] as const;

    for (const reportLink of reportLinks) {
      await openDownloads(page, scopedUrl.search);

      const link = page.getByRole("link", { name: reportLink.name }).first();
      await expect(link).toBeVisible();
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();

      await link.click();
      await expect(page).toHaveURL(reportLink.url);
      await expect(page.getByRole("heading", { name: reportLink.heading }).first()).toBeVisible();

      const reportUrl = new URL(page.url());
      if (expectedSource) {
        expect(reportUrl.searchParams.get("source")).toBe(expectedSource);
      }
      if (expectedSubject) {
        expect(reportUrl.searchParams.get("subject")).toBe(expectedSubject);
      }
    }

    await openDownloads(page, scopedUrl.search);
    await page.getByRole("link", { name: /back to analytics/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /student analytics|performance overview|analytics/i }).first()).toBeVisible();
  });
});
