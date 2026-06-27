import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

function expectSearchParam(url: URL, key: string, expected: string | null) {
  if (expected === null) {
    expect(url.searchParams.has(key)).toBe(false);
    return;
  }

  expect(url.searchParams.get(key)).toBe(expected);
}

test.describe("Student analytics scope persistence workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can preserve scoped analytics query context through source and subject drill chains", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();

    const scopedMatrixLink = page.locator('a[href^="/app/analytics/sources/"][href*="subject="]').first();
    const fallbackSourceLink = page.locator('a[href^="/app/analytics/sources/"]').first();
    const sourceLink = (await scopedMatrixLink.isVisible().catch(() => false))
      ? scopedMatrixLink
      : fallbackSourceLink;

    await expect(sourceLink).toBeVisible();
    const sourceHref = await sourceLink.getAttribute("href");
    expect(sourceHref).not.toBeNull();

    const sourceUrl = new URL(sourceHref!, "http://localhost");
    const expectedSource = sourceUrl.pathname.split("/").pop() ?? null;
    const expectedSubject = sourceUrl.searchParams.get("subject");
    const expectedTeacher = sourceUrl.searchParams.get("teacher");

    await sourceLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/sources\/[^/?#]+(?:\?.*)?$/);

    const landedSourceUrl = new URL(page.url());
    expect(landedSourceUrl.pathname).toMatch(/^\/app\/analytics\/sources\/[^/]+$/);
    expect(landedSourceUrl.pathname.split("/").pop()).toBe(expectedSource);
    expectSearchParam(landedSourceUrl, "subject", expectedSubject);
    expectSearchParam(landedSourceUrl, "teacher", expectedTeacher);

    const compareLink = page.getByRole("link", { name: /compare results/i }).first();
    await expect(compareLink).toBeVisible();
    const compareHref = await compareLink.getAttribute("href");
    expect(compareHref).not.toBeNull();
    const compareUrl = new URL(compareHref!, "http://localhost");
    expect(compareUrl.pathname).toBe("/app/analytics/results/compare");
    expectSearchParam(compareUrl, "source", expectedSource);
    expectSearchParam(compareUrl, "subject", expectedSubject);
    expectSearchParam(compareUrl, "teacher", expectedTeacher);

    await compareLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
    const landedCompareUrl = new URL(page.url());
    expectSearchParam(landedCompareUrl, "source", expectedSource);
    expectSearchParam(landedCompareUrl, "subject", expectedSubject);
    expectSearchParam(landedCompareUrl, "teacher", expectedTeacher);
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();

    const openTimelineLink = page.getByRole("link", { name: /open timeline/i }).first();
    await expect(openTimelineLink).toBeVisible();
    const timelineHref = await openTimelineLink.getAttribute("href");
    expect(timelineHref).not.toBeNull();
    const timelineUrl = new URL(timelineHref!, "http://localhost");
    expect(timelineUrl.pathname).toBe("/app/analytics/timeline");
    expectSearchParam(timelineUrl, "source", expectedSource);
    expectSearchParam(timelineUrl, "subject", expectedSubject);
    expectSearchParam(timelineUrl, "teacher", expectedTeacher);

    await openTimelineLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    const landedTimelineUrl = new URL(page.url());
    expectSearchParam(landedTimelineUrl, "source", expectedSource);
    expectSearchParam(landedTimelineUrl, "subject", expectedSubject);
    expectSearchParam(landedTimelineUrl, "teacher", expectedTeacher);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();

    const actionCenterLink = page.getByRole("link", { name: /open action center/i }).first();
    await expect(actionCenterLink).toBeVisible();
    const actionHref = await actionCenterLink.getAttribute("href");
    expect(actionHref).not.toBeNull();
    const actionUrl = new URL(actionHref!, "http://localhost");
    expect(actionUrl.pathname).toBe("/app/analytics/actions");
    expectSearchParam(actionUrl, "source", expectedSource);
    expectSearchParam(actionUrl, "subject", expectedSubject);
    expectSearchParam(actionUrl, "teacher", expectedTeacher);

    await actionCenterLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/actions(?:\?.*)?$/);
    const landedActionUrl = new URL(page.url());
    expectSearchParam(landedActionUrl, "source", expectedSource);
    expectSearchParam(landedActionUrl, "subject", expectedSubject);
    expectSearchParam(landedActionUrl, "teacher", expectedTeacher);
    await expect(page.getByRole("heading", { name: /next best moves/i }).first()).toBeVisible();

    await gotoWithRetry(
      page,
      landedSourceUrl.pathname + landedSourceUrl.search,
    );
    await expect(page).toHaveURL(/\/app\/analytics\/sources\/[^/?#]+(?:\?.*)?$/);

    const subjectLink = page.locator('a[href^="/app/analytics/subjects/"]').first();
    if (await subjectLink.isVisible().catch(() => false)) {
      const subjectHref = await subjectLink.getAttribute("href");
      expect(subjectHref).not.toBeNull();
      const subjectUrl = new URL(subjectHref!, "http://localhost");
      expect(subjectUrl.pathname).toMatch(/^\/app\/analytics\/subjects\/[^/]+$/);
      expectSearchParam(subjectUrl, "source", expectedSource);
      expectSearchParam(subjectUrl, "teacher", expectedTeacher);

      await subjectLink.click();
      await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
      const landedSubjectUrl = new URL(page.url());
      expectSearchParam(landedSubjectUrl, "source", expectedSource);
      expectSearchParam(landedSubjectUrl, "teacher", expectedTeacher);
      const subjectActionCenterLink = page.getByRole("link", { name: /open action center/i }).first();
      await expect(subjectActionCenterLink).toBeVisible();
      const subjectActionHref = await subjectActionCenterLink.getAttribute("href");
      expect(subjectActionHref).not.toBeNull();
      const subjectActionUrl = new URL(subjectActionHref!, "http://localhost");
      expect(subjectActionUrl.pathname).toBe("/app/analytics/actions");
      expectSearchParam(subjectActionUrl, "source", expectedSource);
      expectSearchParam(subjectActionUrl, "teacher", expectedTeacher);
      expectSearchParam(subjectActionUrl, "subject", landedSubjectUrl.pathname.split("/").pop() ?? null);
      await expect(page.getByRole("link", { name: /practice /i }).first()).toBeVisible();
    }
  });
});
