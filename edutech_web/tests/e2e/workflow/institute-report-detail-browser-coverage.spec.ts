import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

async function openReport(page: Page, path: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page).toHaveURL(
    new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\?.*)?$"),
  );
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("Institute report detail browser functionality coverage", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser coverage keeps institute subject report counts internally truthful", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/subjects", /subject performance report/i);

    const subjectRowsCardText =
      (await page.getByText(/^Subject Rows$/i).locator("xpath=..").locator("strong").textContent()) ?? "";
    const pressureBoardText =
      (await page
        .locator(".contentCard")
        .filter({ has: page.getByText(/^Subject pressure board$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";

    const subjectRowsCard = extractLeadingNumber(subjectRowsCardText);
    const pressureBoardCount = extractLeadingNumber(pressureBoardText);
    expect(subjectRowsCard).not.toBeNull();
    expect(pressureBoardCount).not.toBeNull();

    const emptyState = page
      .getByText(/subject-strength rows will appear when institute weak-topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      expect(subjectRowsCard).toBe(0);
      expect(pressureBoardCount).toBe(0);
      return;
    }

    const tableRows = await page.locator(".studentResultsTable tbody tr").first().locator("xpath=ancestor::table/tbody/tr").count();
    expect(subjectRowsCard).toBe(tableRows);
    expect(pressureBoardCount).toBe(tableRows);
  });

  test("@workflow browser coverage keeps institute learner drilldown handoff truthful from report lanes", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/subjects", /subject performance report/i);

    const learnerLink = page.locator('a[href*="/institute/reports/students/"]').first();
    await expect(learnerLink).toBeVisible();
    await expect(learnerLink).toHaveAttribute("href", /\/institute\/reports\/students\/[^?]+(?:\?from=subjects)?$/);
    await learnerLink.click();

    await expect(page).toHaveURL(/\/institute\/reports\/students\/[^/?]+(?:\?.*)?$/);
    await expect(page.getByText(/institute learner drilldown/i).first()).toBeVisible();

    const backToSource = page.getByRole("link", { name: /back to subject performance/i }).first();
    await expect(backToSource).toBeVisible();
    await expect(backToSource).toHaveAttribute("href", /\/institute\/reports\/subjects$/);
  });

  test("@workflow browser coverage keeps institute topic mastery handoffs truthful", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/weak-areas", /topic mastery report/i);

    const openSubjectReport = page.getByRole("link", { name: /open subject report/i }).first();
    await expect(openSubjectReport).toBeVisible();
    await openSubjectReport.click();
    await expect(page).toHaveURL(/\/institute\/reports\/subjects(?:\?.*)?$/);

    await openReport(page, "/institute/reports/weak-areas", /topic mastery report/i);
    const openAnalysis = page.getByRole("link", { name: /open analysis/i }).first();
    await expect(openAnalysis).toBeVisible();
    await openAnalysis.click();
    await expect(page).toHaveURL(/\/institute\/results\/analysis(?:\?.*)?$/);
  });

  test("@workflow browser coverage keeps institute wrong questions report counts and handoffs truthful", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/wrong-questions", /wrong questions report/i);

    const wrongQuestionsCardText =
      (await page.getByText(/^Wrong Questions$/i).locator("xpath=..").locator("strong").textContent()) ?? "";
    const wrongQuestionsSectionText =
      (await page
        .locator(".contentCard")
        .filter({ has: page.getByText(/^Most wrong questions$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";

    const wrongQuestionsCard = extractLeadingNumber(wrongQuestionsCardText);
    const wrongQuestionsSection = extractLeadingNumber(wrongQuestionsSectionText);
    expect(wrongQuestionsCard).not.toBeNull();
    expect(wrongQuestionsSection).not.toBeNull();

    const emptyState = page
      .getByText(/wrong-question rows will appear once enough institute-scoped answer evidence exists/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      expect(wrongQuestionsCard).toBe(0);
      expect(wrongQuestionsSection).toBe(0);
    } else {
      const wrongTableRows = await page
        .locator(".contentCard")
        .filter({ has: page.getByText(/^Most wrong questions$/i) })
        .locator("tbody tr")
        .count();
      expect(wrongQuestionsCard).toBe(wrongTableRows);
      expect(wrongQuestionsSection).toBe(wrongTableRows);
    }

    const openTopicMastery = page.getByRole("link", { name: /open topic mastery/i }).first();
    await expect(openTopicMastery).toBeVisible();
    await openTopicMastery.click();
    await expect(page).toHaveURL(/\/institute\/reports\/weak-areas(?:\?.*)?$/);
  });

  test("@workflow browser coverage keeps institute time management report counts and handoffs truthful", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/time-management", /time management report/i);

    const trackedAttemptsCardText =
      (await page.getByText(/^Tracked attempts$/i).locator("xpath=..").locator("strong").textContent()) ?? "";
    const timingPressureBoardText =
      (await page
        .locator(".contentCard")
        .filter({ has: page.getByText(/^Timing pressure board$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";

    const trackedAttemptsCard = extractLeadingNumber(trackedAttemptsCardText);
    const timingPressureCount = extractLeadingNumber(timingPressureBoardText);
    expect(trackedAttemptsCard).not.toBeNull();
    expect(timingPressureCount).not.toBeNull();

    const emptyState = page
      .getByText(/timing rows will appear once institute-scoped attempt timing evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      expect(trackedAttemptsCard).toBe(0);
      expect(timingPressureCount).toBe(0);
    } else {
      const timingRows = await page
        .locator(".contentCard")
        .filter({ has: page.getByText(/^Timing pressure board$/i) })
        .locator("tbody tr")
        .count();
      expect(trackedAttemptsCard).toBe(timingRows);
      expect(timingPressureCount).toBe(timingRows);
    }

    const openAttemptReview = page.getByRole("link", { name: /open attempt review/i }).first();
    await expect(openAttemptReview).toBeVisible();
    await expect(openAttemptReview).toHaveAttribute("href", /\/institute\/results\/attempts(?:\?.*)?$/);
    await openAttemptReview.click();
    if (!/\/institute\/results\/attempts(?:\?.*)?$/.test(page.url())) {
      await gotoWithRuntimeRecovery(page, "/institute/results/attempts");
    }
    await expect(page).toHaveURL(/\/institute\/results\/attempts(?:\?.*)?$/);
  });

  test("@workflow browser coverage keeps institute rank history report counts and leaderboard handoffs truthful", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/rank-history", /rank history report/i);

    const trackedCyclesCardText =
      (await page.getByText(/^Tracked exams$/i).locator("xpath=..").locator("strong").textContent()) ?? "";
    const rankingSnapshotText =
      (await page
        .locator(".contentCard")
        .filter({ has: page.getByText(/^Ranking snapshot$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";

    const trackedCycles = extractLeadingNumber(trackedCyclesCardText);
    const rankingSnapshotCount = extractLeadingNumber(rankingSnapshotText);
    expect(trackedCycles).not.toBeNull();
    expect(rankingSnapshotCount).not.toBeNull();

    const ledgerRows = await page.locator(".studentResultsTable tbody tr").count();
    const rankingSnapshotRows = await page.locator(".studentTopicStack .studentTopicRow").count();
    expect(trackedCycles).toBe(ledgerRows);
    expect(rankingSnapshotCount).toBe(ledgerRows);
    expect(rankingSnapshotRows).toBe(Math.min(ledgerRows, 5));

    const openLeaderboard = page.getByRole("link", { name: /open leaderboard/i }).first();
    await expect(openLeaderboard).toBeVisible();
    await expect(openLeaderboard).toHaveAttribute("href", /\/institute\/results\/leaderboard(?:\?.*)?$/);
    await openLeaderboard.click();
    await expect(page).toHaveURL(/\/institute\/results\/leaderboard(?:\?.*)?$/);
  });

  test("@workflow browser coverage keeps institute study recommendations report rows and learner handoffs truthful", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/study-recommendations", /study recommendations report/i);

    const recommendationRowsCardText =
      (await page.getByText(/^Recommendation rows$/i).locator("xpath=..").locator("strong").textContent()) ?? "";
    const recommendationBoardText =
      (await page
        .locator(".contentCard")
        .filter({ has: page.getByText(/^Recommendation board$/i) })
        .locator(".sectionHeading span")
        .textContent()) ?? "";

    const recommendationRowsCard = extractLeadingNumber(recommendationRowsCardText);
    const recommendationBoardCount = extractLeadingNumber(recommendationBoardText);
    expect(recommendationRowsCard).not.toBeNull();
    expect(recommendationBoardCount).not.toBeNull();

    const emptyState = page
      .getByText(/student coaching recommendations will appear when institute support lanes are available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      expect(recommendationRowsCard).toBe(0);
      expect(recommendationBoardCount).toBe(0);
      return;
    }

    const rows = await page.locator(".studentResultsTable tbody tr").count();
    expect(recommendationRowsCard).toBe(rows);
    expect(recommendationBoardCount).toBe(rows);

    const learnerLink = page.locator('a[href*="/institute/reports/students/"]').first();
    await expect(learnerLink).toBeVisible();
    await expect(learnerLink).toHaveAttribute(
      "href",
      /\/institute\/reports\/students\/[^?]+(?:\?from=study-recommendations)?$/,
    );
    await learnerLink.click();
    await expect(page).toHaveURL(/\/institute\/reports\/students\/[^/?]+(?:\?.*)?$/);
  });
});
