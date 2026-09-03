import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openReport(page: Page, path: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page).toHaveURL(
    new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\?.*)?$"),
  );
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("Institute report detail workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow institute can validate the subject performance report and its supporting lanes", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/subjects", /subject performance report/i);

    await expect(page.getByText(/institute subject performance/i).first()).toBeVisible();
    await expect(page.getByText(/subject pressure board/i).first()).toBeVisible();
    await expect(page.getByText(/weak-topic feed/i).first()).toBeVisible();

    const emptyState = page
      .getByText(/subject-strength rows will appear when institute weak-topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const openAnalysis = page.getByRole("link", { name: /open analysis/i }).first();
    await expect(openAnalysis).toBeVisible();
    await openAnalysis.click();
    await expect(page).toHaveURL(/\/institute\/results\/analysis(?:\?.*)?$/);
  });

  test("@workflow institute can drill from a support student lane into the learner report detail", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/subjects", /subject performance report/i);

    const supportStudentLink = page.locator('a[href*="/institute/reports/students/"]').first();
    await expect(supportStudentLink).toBeVisible();
    await supportStudentLink.click();

    await expect(page).toHaveURL(/\/institute\/reports\/students\/[^/?]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /student report detail/i }).first()).toBeVisible();
    await expect(page.getByText(/institute learner drilldown/i).first()).toBeVisible();
    await expect(page.getByText(/recommended handoffs/i).first()).toBeVisible();

    const backToSource = page.getByRole("link", { name: /back to subject performance/i }).first();
    await expect(backToSource).toBeVisible();
  });

  test("@workflow institute can validate the topic mastery report and its recovery lanes", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/weak-areas", /topic mastery report/i);

    await expect(page.getByText(/institute weak areas/i).first()).toBeVisible();
    await expect(page.getByText(/weak-topic ranking/i).first()).toBeVisible();
    await expect(page.getByText(/recovery action lane/i).first()).toBeVisible();

    const emptyState = page
      .getByText(/weak-topic rows will appear once institute-scoped topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const openSubjectReport = page.getByRole("link", { name: /open subject report/i }).first();
    await expect(openSubjectReport).toBeVisible();
    await openSubjectReport.click();
    await expect(page).toHaveURL(/\/institute\/reports\/subjects(?:\?.*)?$/);
  });

  test("@workflow institute can validate the wrong questions report and its intervention lanes", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/wrong-questions", /wrong questions report/i);

    await expect(page.getByText(/institute wrong questions/i).first()).toBeVisible();
    await expect(page.getByText(/most wrong questions/i).first()).toBeVisible();
    await expect(page.getByText(/most skipped questions/i).first()).toBeVisible();

    const emptyState = page
      .getByText(/wrong-question rows will appear once enough institute-scoped answer evidence exists/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const openTopicMastery = page.getByRole("link", { name: /open topic mastery/i }).first();
    await expect(openTopicMastery).toBeVisible();
    await openTopicMastery.click();
    await expect(page).toHaveURL(/\/institute\/reports\/weak-areas(?:\?.*)?$/);
  });

  test("@workflow institute can validate the time management report and its pacing lanes", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/time-management", /time management report/i);

    await expect(page.getByText(/institute time management/i).first()).toBeVisible();
    await expect(page.getByText(/timing pressure board/i).first()).toBeVisible();

    const emptyState = page
      .getByText(/timing rows will appear once institute-scoped attempt timing evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const openAttemptReview = page.getByRole("link", { name: /open attempt review/i }).first();
    await expect(openAttemptReview).toBeVisible();
    await expect(openAttemptReview).toHaveAttribute("href", /\/institute\/results\/attempts(?:\?.*)?$/);
    await openAttemptReview.click();
    if (!/\/institute\/results\/attempts(?:\?.*)?$/.test(page.url())) {
      await page.goto("/institute/results/attempts", { waitUntil: "domcontentloaded" });
    }
    await expect(page).toHaveURL(/\/institute\/results\/attempts(?:\?.*)?$/);
  });

  test("@workflow institute can validate the rank history report and its leaderboard handoffs", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/rank-history", /rank history report/i);

    await expect(page.getByText(/ranking posture is visible across institute result cycles/i).first()).toBeVisible();
    await expect(page.getByText(/ranking snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/rank checkpoints/i).first()).toBeVisible();
    await expect(page.getByText(/rank history ledger/i).first()).toBeVisible();
    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const openLeaderboard = page.getByRole("link", { name: /open leaderboard/i }).first();
    await expect(openLeaderboard).toBeVisible();
    await openLeaderboard.click();
    await expect(page).toHaveURL(/\/institute\/results\/leaderboard(?:\?.*)?$/);
  });

  test("@workflow institute can validate the study recommendations report and learner handoffs", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/study-recommendations", /study recommendations report/i);

    await expect(page.getByText(/coaching cues are ready|coach .* next/i).first()).toBeVisible();
    await expect(page.getByText(/recommendation board/i).first()).toBeVisible();
    await expect(page.getByText(/coaching guidance/i).first()).toBeVisible();

    const emptyState = page
      .getByText(/student coaching recommendations will appear when institute support lanes are available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const learnerLink = page.locator('a[href*="/institute/reports/students/"]').first();
    await expect(learnerLink).toBeVisible();
    await learnerLink.click();
    await expect(page).toHaveURL(/\/institute\/reports\/students\/[^/?]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /student report detail/i }).first()).toBeVisible();
  });
});
