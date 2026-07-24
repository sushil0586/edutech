import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

async function gotoReports(page: Page, path = "/teacher/reports") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /reports hub/i }).first()).toBeVisible();
  await expect(page.getByText(/teacher student-level reports/i).first()).toBeVisible();
}

test.describe("Teacher reports browser functionality coverage", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
  });

  test("@workflow browser coverage keeps teacher reports summary counts internally truthful", async ({
    page,
  }) => {
    await gotoReports(page);

    const heroTrackedText =
      (await page
        .getByText(/^Tracked reports$/i)
        .locator("xpath=..")
        .locator("strong")
        .textContent()) ?? "";
    const trackedCardText =
      (await page
        .getByText(/^Academic Reports$/i)
        .locator("xpath=..")
        .locator("strong")
        .textContent()) ?? "";
    const interactiveCardText =
      (await page
        .getByText(/^Interactive Ready$/i)
        .locator("xpath=..")
        .locator("strong")
        .textContent()) ?? "";
    const plannedCardText =
      (await page
        .getByText(/^Planned Next$/i)
        .nth(1)
        .locator("xpath=..")
        .locator("strong")
        .textContent()) ?? "";
    const implementedNowText =
      (await page
        .locator(".studentInsightsTwoColumn .contentCard")
        .filter({ has: page.getByText(/^Implemented now$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";
    const nextWaveText =
      (await page
        .locator(".studentInsightsTwoColumn .contentCard")
        .filter({ has: page.getByText(/^Next build wave$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";

    const directoryRows = await page.locator(".studentDownloadableReportsTable tbody tr").count();

    const trackedFromHero = extractLeadingNumber(heroTrackedText);
    const trackedFromCard = extractLeadingNumber(trackedCardText);
    const interactiveFromCard = extractLeadingNumber(interactiveCardText);
    const plannedFromCard = extractLeadingNumber(plannedCardText);
    const implementedFromSection = extractLeadingNumber(implementedNowText);
    const nextWaveFromSection = extractLeadingNumber(nextWaveText);

    expect(trackedFromHero).not.toBeNull();
    expect(trackedFromCard).not.toBeNull();
    expect(interactiveFromCard).not.toBeNull();
    expect(plannedFromCard).not.toBeNull();
    expect(implementedFromSection).not.toBeNull();
    expect(nextWaveFromSection).not.toBeNull();

    expect(trackedFromHero).toBe(directoryRows);
    expect(trackedFromCard).toBe(directoryRows);
    expect(interactiveFromCard).toBe(implementedFromSection);
    expect(plannedFromCard).toBe(nextWaveFromSection);
    expect((interactiveFromCard ?? 0) + (plannedFromCard ?? 0)).toBe(directoryRows);
  });

  test("@workflow browser coverage keeps teacher reports lane grouping truthful", async ({
    page,
  }) => {
    await gotoReports(page);

    const resultsCountText =
      (await page
        .locator(".studentInsightsTwoColumn .contentCard")
        .filter({ has: page.getByText(/^Results and ranking$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";
    const analyticsCountText =
      (await page
        .locator(".studentInsightsTwoColumn .contentCard")
        .filter({ has: page.getByText(/^Subject and topic analytics$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";
    const recoveryCountText =
      (await page
        .locator(".studentInsightsTwoColumn .contentCard")
        .filter({ has: page.getByText(/^Recovery reports$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";
    const planningCountText =
      (await page
        .locator(".studentInsightsTwoColumn .contentCard")
        .filter({ has: page.getByText(/^Planning and live control$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";

    const resultsCount = extractLeadingNumber(resultsCountText);
    const analyticsCount = extractLeadingNumber(analyticsCountText);
    const recoveryCount = extractLeadingNumber(recoveryCountText);
    const planningCount = extractLeadingNumber(planningCountText);

    expect(resultsCount).toBe(3);
    expect(analyticsCount).toBe(3);
    expect(recoveryCount).toBe(2);
    expect(planningCount).toBe(3);
    expect((resultsCount ?? 0) + (analyticsCount ?? 0) + (recoveryCount ?? 0) + (planningCount ?? 0)).toBe(
      await page.locator(".studentDownloadableReportsTable tbody tr").count(),
    );
  });

  test("@workflow browser coverage keeps teacher report handoffs truthful across first-wave routes", async ({
    page,
  }) => {
    await gotoReports(page);

    const handoffs = [
      {
        name: /open subject report/i,
        url: /\/teacher\/reports\/subjects(?:\?.*)?$/,
        heading: /subject performance report/i,
      },
      {
        name: /open topic mastery report/i,
        url: /\/teacher\/reports\/weak-areas(?:\?.*)?$/,
        heading: /topic mastery report/i,
      },
      {
        name: /open rank history report/i,
        url: /\/teacher\/reports\/rank-history(?:\?.*)?$/,
        heading: /rank history report/i,
      },
      {
        name: /open wrong questions report/i,
        url: /\/teacher\/reports\/wrong-questions(?:\?.*)?$/,
        heading: /wrong questions report/i,
      },
      {
        name: /open time management report/i,
        url: /\/teacher\/reports\/time-management(?:\?.*)?$/,
        heading: /time management report/i,
      },
      {
        name: /open study recommendations report/i,
        url: /\/teacher\/reports\/study-recommendations(?:\?.*)?$/,
        heading: /study recommendations report/i,
      },
    ];

    for (const handoff of handoffs) {
      await gotoReports(page);
      const handoffLink = page
        .locator(".studentDownloadableReportsTable")
        .getByRole("link", { name: handoff.name })
        .first();
      await expect(handoffLink).toBeVisible();
      const href = await handoffLink.getAttribute("href");
      expect(href).toBeTruthy();
      await page.goto(href!);
      await expect(page).toHaveURL(handoff.url);
      await expect(page.getByRole("heading", { name: handoff.heading }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /back to reports/i }).first()).toBeVisible();
    }
  });
});
