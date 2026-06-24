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

async function expectStudentAnalyticsHome(page: Page) {
  await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();
}

test.describe("Student analytics deep drills", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can navigate action center, timeline, compare, and subject analytics drills", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/analytics");
    await expectStudentAnalyticsHome(page);

    const sourceDrillLink = page.locator('a[href^="/app/analytics/sources/"]').first();
    if (await sourceDrillLink.isVisible().catch(() => false)) {
      const sourceHref = await sourceDrillLink.getAttribute("href");
      expect(sourceHref).not.toBeNull();
      await sourceDrillLink.click();
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
      await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();
      const practiceSubjectLink = page.getByRole("link", { name: /practice /i }).first();
      await expect(practiceSubjectLink).toBeVisible();
      const practiceHref = await practiceSubjectLink.getAttribute("href");
      expect(practiceHref).toContain("/app/practice?subject=");
      await gotoWithRetry(page, "/app/analytics");
      await expectStudentAnalyticsHome(page);
    }

    await page.getByRole("link", { name: /open action center/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics\/actions(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /next best moves/i }).first()).toBeVisible();

    const timelineChecklistLink = page.getByRole("link", { name: /check your timeline/i }).first();
    await expect(timelineChecklistLink).toBeVisible();
    await timelineChecklistLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();

    await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open results/i }).first().click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/timeline");
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/results/compare");
    await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open timeline/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open timeline/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/results/compare");
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /open results/i }).first().click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  });
});
