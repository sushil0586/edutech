import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await gotoWithRuntimeRecovery(page, url, Math.max(4, attempts));
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retriable =
        message.includes("ERR_CONNECTION_REFUSED") ||
        message.includes("ERR_ABORTED") ||
        message.includes("NS_BINDING_ABORTED") ||
        message.includes("interrupted by another navigation");

      if (!retriable || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function expectStudentAnalyticsHome(page: Page) {
  await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /open action center|action center/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /open weak areas/i }).first()).toBeVisible();
}

async function clickOrGotoHref(page: Page, href: string | null, urlPattern: RegExp) {
  expect(href).not.toBeNull();
  const resolvedUrl = new URL(href!, page.url());
  if (!urlPattern.test(page.url())) {
    await gotoWithRetry(page, `${resolvedUrl.pathname}${resolvedUrl.search}`);
  }
}

test.describe("Student analytics deep drills", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can navigate action center, timeline, compare, and subject analytics drills", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/analytics");
    await expectStudentAnalyticsHome(page);
    await expect(
      page.getByText(
        /open weak areas for the ranked topic|open weak areas for the weakest ranked topic/i,
      ).first(),
    ).toBeVisible();
    await expect(page.getByText(/do this first/i).first()).toBeVisible();
    await expect(page.getByText(/if blocked/i).first()).toBeVisible();

    const openWeakAreasLink = page.getByRole("link", { name: /open weak areas/i }).first();
    const weakAreasHref = await openWeakAreasLink.getAttribute("href");
    expect(weakAreasHref).toContain("/app/weak-areas");
    await gotoWithRetry(page, weakAreasHref!);
    await expect(page).toHaveURL(/\/app\/weak-areas(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /weak areas/i }).first()).toBeVisible();
    await expect(
      page.getByText(/inspect the top weak topic|strong sequence/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/then next/i).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /open focused practice workspace|open practice workspace/i }).first(),
    ).toBeVisible();

    await gotoWithRetry(page, "/app/analytics");
    await expectStudentAnalyticsHome(page);

    const sourceDrillLink = page.locator('a[href^="/app/analytics/sources/"]').first();
    if (await sourceDrillLink.isVisible().catch(() => false)) {
      const sourceHref = await sourceDrillLink.getAttribute("href");
      expect(sourceHref).not.toBeNull();
      await sourceDrillLink.click();
      await clickOrGotoHref(page, sourceHref, /\/app\/analytics\/sources\/[^/?#]+(?:\?.*)?$/);
      await expect(page).toHaveURL(/\/app\/analytics\/sources\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("link", { name: /compare results/i }).first()).toBeVisible();
      const compareFromSource = page.getByRole("link", { name: /compare results/i }).first();
      const compareHref = await compareFromSource.getAttribute("href");
      expect(compareHref).toContain("/app/analytics/results/compare");
      if (sourceHref?.includes("teacher=")) {
        expect(compareHref).toContain("teacher=");
      }
      if (sourceHref?.includes("subject=")) {
        expect(compareHref).toContain("subject=");
      }
      await compareFromSource.click();
      await clickOrGotoHref(page, compareHref, /\/app\/analytics\/results\/compare(?:\?.*)?$/);
      await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
      const compareUrl = new URL(page.url());
      const compareSource = compareUrl.searchParams.get("source");
      const compareSubject = compareUrl.searchParams.get("subject");
      if (compareSource) {
        await expect(
          page.getByText(new RegExp(`Source\\s*·\\s*${compareSource}`, "i")).first(),
        ).toBeVisible();
      }
      if (compareSubject) {
        await expect(page.getByText(new RegExp(compareSubject, "i")).first()).toBeVisible();
      }
      await gotoWithRetry(page, "/app/analytics");
      await expectStudentAnalyticsHome(page);
    }

    const subjectDrillLink = page.locator('a[href^="/app/analytics/subjects/"]').first();
    if (await subjectDrillLink.isVisible().catch(() => false)) {
      const subjectHref = await subjectDrillLink.getAttribute("href");
      expect(subjectHref).not.toBeNull();
      await subjectDrillLink.click();
      await clickOrGotoHref(page, subjectHref, /\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
      await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("link", { name: /open action center|action center/i }).first()).toBeVisible();
      const practiceSubjectLink = page.getByRole("link", { name: /practice /i }).first();
      await expect(practiceSubjectLink).toBeVisible();
      const practiceHref = await practiceSubjectLink.getAttribute("href");
      expect(practiceHref).toContain("/app/practice?subject=");
      await gotoWithRetry(page, "/app/analytics");
      await expectStudentAnalyticsHome(page);
    }

    const actionCenterLink = page.getByRole("link", { name: /open action center|action center/i }).first();
    const actionCenterHref = await actionCenterLink.getAttribute("href");
    await actionCenterLink.click();
    await clickOrGotoHref(page, actionCenterHref, /\/app\/analytics\/actions(?:\?.*)?$/);
    await expect(page).toHaveURL(/\/app\/analytics\/actions(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /next best moves/i }).first()).toBeVisible();

    const timelineChecklistLink = page.getByRole("link", { name: /check your timeline/i }).first();
    await expect(timelineChecklistLink).toBeVisible();
    const timelineChecklistHref = await timelineChecklistLink.getAttribute("href");
    await timelineChecklistLink.click();
    await clickOrGotoHref(page, timelineChecklistHref, /\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();

    await expect(page.getByRole("link", { name: /open action center|action center/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();

    const openResultsFromTimelineLink = page.getByRole("link", { name: /open results/i }).first();
    const resultsTimelineHref = await openResultsFromTimelineLink.getAttribute("href");
    await openResultsFromTimelineLink.click();
    await clickOrGotoHref(page, resultsTimelineHref, /\/app\/results(?:\?.*)?$/);
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/timeline");
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/results/compare");
    await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
    const openTimelineLink = page.getByRole("link", { name: /open timeline/i }).first();
    await expect(openTimelineLink).toBeVisible();
    const timelineHref = await openTimelineLink.getAttribute("href");
    expect(timelineHref).toContain("/app/analytics/timeline");

    await openTimelineLink.click();
    if (!/\/app\/analytics\/timeline(?:\?.*)?$/.test(page.url())) {
      const timelineUrl = new URL(timelineHref!, page.url());
      await gotoWithRetry(page, `${timelineUrl.pathname}${timelineUrl.search}`);
    }
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/results/compare");
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
    const openResultsFromCompareLink = page.getByRole("link", { name: /open results/i }).first();
    const resultsCompareHref = await openResultsFromCompareLink.getAttribute("href");
    await openResultsFromCompareLink.click();
    await clickOrGotoHref(page, resultsCompareHref, /\/app\/results(?:\?.*)?$/);
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  });
});
