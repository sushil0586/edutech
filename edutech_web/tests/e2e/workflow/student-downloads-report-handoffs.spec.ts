import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function clickOrGotoHref(page: Page, href: string | null, urlPattern: RegExp) {
  expect(href).not.toBeNull();
  if (urlPattern.test(page.url())) {
    return;
  }

  const resolvedUrl = new URL(href!, page.url());
  await page.goto(`${resolvedUrl.pathname}${resolvedUrl.search}`, { waitUntil: "commit" });
  await page.waitForLoadState("load").catch(() => null);
}

async function openDownloads(page: Page, query = "") {
  await page.goto(`/app/analytics/downloads${query}`, { waitUntil: "commit" });
  await page.waitForLoadState("load").catch(() => null);
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
    await expect(page.getByText(/reports hub filters/i).first()).toBeVisible();

    const filtersCard = page.locator("section.contentCard").filter({
      has: page.getByText(/reports hub filters/i),
    }).first();
    const subjectSelect = filtersCard.getByRole("combobox").nth(0);
    const sourceSelect = filtersCard.getByRole("combobox").nth(1);
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

    const resolvedReportTargets = await Promise.all(
      reportLinks.map(async (reportLink) => {
        const link = page.getByRole("link", { name: reportLink.name }).first();
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBeTruthy();

        return {
          ...reportLink,
          href,
        };
      }),
    );

    for (const reportLink of resolvedReportTargets) {
      await clickOrGotoHref(page, reportLink.href, reportLink.url);
      await expect(page).toHaveURL(reportLink.url);
      await expect(page.getByRole("heading", { name: reportLink.heading }).first()).toBeVisible();

      const reportUrl = new URL(page.url());
      if (expectedSource && expectedSource !== "all") {
        expect(reportUrl.searchParams.get("source")).toBe(expectedSource);
      }
      if (expectedSubject && expectedSubject !== "overall") {
        expect(reportUrl.searchParams.get("subject")).toBe(expectedSubject);
      }
    }

    await page.goto("/app/analytics", { waitUntil: "commit" });
    await page.waitForLoadState("load").catch(() => null);
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /student analytics|performance overview|analytics/i }).first()).toBeVisible();
  });
});
