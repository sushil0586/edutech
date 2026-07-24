import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openStudentRoute(page: Page, href: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

async function expectVisualSnapshot(locator: Locator, name: string, maxDiffPixels: number) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    maxDiffPixels,
  });
}

async function expectPageWithoutHorizontalSpill(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(
    Math.max(overflow.documentWidth, overflow.bodyWidth),
    `Expected no page-level horizontal spill, but viewport=${overflow.viewportWidth}, document=${overflow.documentWidth}, body=${overflow.bodyWidth}`,
  ).toBeLessThanOrEqual(overflow.viewportWidth + 2);
}

async function expectLocatorsWithoutHorizontalSpill(locators: Locator, label: string, sampleSize = 6) {
  const count = await locators.count();
  const limit = Math.min(count, sampleSize);
  for (let index = 0; index < limit; index += 1) {
    const locator = locators.nth(index);
    await expect(locator, `${label} ${index + 1} should be visible`).toBeVisible();
    const overflow = await locator.evaluate((element) => ({
      clientWidth: (element as HTMLElement).clientWidth,
      scrollWidth: (element as HTMLElement).scrollWidth,
    }));
    expect(
      overflow.scrollWidth,
      `${label} ${index + 1} should not overflow horizontally (client=${overflow.clientWidth}, scroll=${overflow.scrollWidth})`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 2);
  }
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visual target to be visible.");
}

test.describe("Student dense report surfaces visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow @visual wrong questions report hero, KPI strip, and primary table stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openStudentRoute(page, "/app/analytics/wrong-questions", /wrong questions report/i);

    const blockedState = page
      .getByText(/wrong questions report is not available yet|wrong questions report could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-wrong-questions-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 220,
      });
      return;
    }

    await expectPageWithoutHorizontalSpill(page);
    await expectVisualSnapshot(page.locator(".analyticsDetailHero").first(), "student-wrong-questions-hero.png", 320);
    await expectVisualSnapshot(page.locator(".resultsSummaryGrid").first(), "student-wrong-questions-kpi-strip.png", 280);
    await expectLocatorsWithoutHorizontalSpill(
      page.locator(".studentWrongQuestionsTable .studentResultsTableRow"),
      "Wrong questions row",
    );

    const primarySurface = await firstVisible([
      page.locator(".studentWrongQuestionsTable .studentResultsTableRow").first(),
      page.getByText(/0 wrong questions in this report|0 wrong questions in this topic slice/i).first(),
    ]);
    await expectVisualSnapshot(primarySurface, "student-wrong-questions-primary-row.png", 240);
  });

  test("@workflow @visual time management report hero, KPI strip, and ledger stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openStudentRoute(page, "/app/analytics/time-management", /time management report/i);

    const blockedState = page
      .getByText(/time management report is not available yet|time management report could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-time-management-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 220,
      });
      return;
    }

    await expectPageWithoutHorizontalSpill(page);
    await expectVisualSnapshot(page.locator(".analyticsDetailHero").first(), "student-time-management-hero.png", 4000);
    await expectVisualSnapshot(page.locator(".resultsSummaryGrid").first(), "student-time-management-kpi-strip.png", 280);
    await expectLocatorsWithoutHorizontalSpill(
      page.locator(".studentTimeManagementTable .studentResultsTableRow"),
      "Time management row",
    );

    const primarySurface = await firstVisible([
      page.locator(".studentTimeManagementTable .studentResultsTableRow").first(),
      page.locator(".studentTopicRow").first(),
      page.getByText(/published attempt timing will appear here once scored results are available/i).first(),
    ]);
    await expectVisualSnapshot(primarySurface, "student-time-management-primary-row.png", 240);
  });

  test("@workflow @visual rank history report hero, KPI strip, and ledger stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openStudentRoute(page, "/app/analytics/rank-history", /rank & percentile history/i);

    const blockedState = page
      .getByText(/rank history is not available yet|rank history could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-rank-history-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 220,
      });
      return;
    }

    await expectPageWithoutHorizontalSpill(page);
    await expectVisualSnapshot(page.locator(".analyticsDetailHero").first(), "student-rank-history-hero.png", 4000);
    await expectVisualSnapshot(page.locator(".resultsSummaryGrid").first(), "student-rank-history-kpi-strip.png", 1400);
    await expectLocatorsWithoutHorizontalSpill(
      page.locator(".studentRankHistoryTable .studentResultsTableRow"),
      "Rank history row",
    );

    const primarySurface = await firstVisible([
      page.locator(".studentRankHistoryTable .studentResultsTableRow").first(),
      page.getByText(/published rank history will appear here after scored and published results accumulate/i).first(),
    ]);
    await expectVisualSnapshot(primarySurface, "student-rank-history-primary-row.png", 240);
  });

  test("@workflow @visual study recommendations hero, KPI strip, and recommendation table stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openStudentRoute(page, "/app/analytics/study-recommendations", /ai study recommendations/i);

    const blockedState = page
      .getByText(/ai study recommendations are not available yet|ai study recommendations could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-study-recommendations-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 220,
      });
      return;
    }

    await expectPageWithoutHorizontalSpill(page);
    await expectVisualSnapshot(page.locator(".analyticsDetailHero").first(), "student-study-recommendations-hero.png", 4000);
    await expectVisualSnapshot(page.locator(".resultsSummaryGrid").first(), "student-study-recommendations-kpi-strip.png", 1600);
    await expectLocatorsWithoutHorizontalSpill(
      page.locator(".studentPracticeRecommendationTable .studentResultsTableRow"),
      "Study recommendation row",
    );

    const primarySurface = await firstVisible([
      page.locator(".studentPracticeRecommendationTable .studentResultsTableRow").first(),
      page.getByText(/recommended next routes/i).first(),
      page.getByText(/why this is recommended/i).first(),
    ]);
    await expectVisualSnapshot(primarySurface, "student-study-recommendations-primary-row.png", 240);
  });

  test("@workflow @visual reports hub hero, KPI strip, and manifest table stay aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openStudentRoute(page, "/app/reports", /reports hub|downloadable reports center/i);

    await expectPageWithoutHorizontalSpill(page);
    await expectVisualSnapshot(page.locator(".analyticsDetailHero").first(), "student-reports-hub-hero.png", 320);
    await expectVisualSnapshot(page.locator(".resultsSummaryGrid").first(), "student-reports-hub-kpi-strip.png", 280);
    await expectLocatorsWithoutHorizontalSpill(
      page.locator(".studentDownloadableReportsTable .studentResultsTableRow"),
      "Reports hub row",
    );
    await expectVisualSnapshot(page.locator(".studentDownloadableReportsTable").first(), "student-reports-hub-directory-table.png", 340);
  });
});
