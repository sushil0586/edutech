import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

async function openReport(page: Page, path: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\?.*)?$"));
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("Teacher report detail browser functionality coverage", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
  });

  test("@workflow browser coverage keeps teacher subject report counts internally truthful", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/subjects", /subject performance report/i);

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

    const emptyState = page.getByText(/subject-strength rows will appear when teacher weak-topic evidence is available/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      expect(subjectRowsCard).toBe(0);
      expect(pressureBoardCount).toBe(0);
      return;
    }

    const tableRows = await page.locator(".studentResultsTable tbody tr").first().locator("xpath=ancestor::table/tbody/tr").count();
    expect(subjectRowsCard).toBe(tableRows);
    expect(pressureBoardCount).toBe(tableRows);
  });

  test("@workflow browser coverage keeps teacher learner drilldown handoff truthful from report lanes", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/subjects", /subject performance report/i);

    const learnerLink = page.locator('a[href*="/teacher/reports/students/"]').first();
    await expect(learnerLink).toBeVisible();
    await expect(learnerLink).toHaveAttribute("href", /\/teacher\/reports\/students\/[^?]+(?:\?from=subjects)?$/);
    await learnerLink.click();

    await expect(page).toHaveURL(/\/teacher\/reports\/students\/[^/?]+(?:\?.*)?$/);
    await expect(page.getByText(/teacher learner drilldown/i).first()).toBeVisible();

    const backToSource = page.getByRole("link", { name: /back to subject performance/i }).first();
    await expect(backToSource).toBeVisible();
    await expect(backToSource).toHaveAttribute("href", /\/teacher\/reports\/subjects$/);
  });

  test("@workflow browser coverage keeps teacher topic mastery handoffs truthful", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/weak-areas", /topic mastery report/i);

    await expect(page.getByText(/weak-topic ranking/i).first()).toBeVisible();
    await expect(page.getByText(/recovery action lane/i).first()).toBeVisible();

    const openSubjectReport = page.getByRole("link", { name: /open subject report/i }).first();
    await expect(openSubjectReport).toBeVisible();
    await openSubjectReport.click();
    await expect(page).toHaveURL(/\/teacher\/reports\/subjects(?:\?.*)?$/);

    await openReport(page, "/teacher/reports/weak-areas", /topic mastery report/i);
    const openAnalysis = page.getByRole("link", { name: /open analysis/i }).first();
    await expect(openAnalysis).toBeVisible();
    await openAnalysis.click();
    await expect(page).toHaveURL(/\/teacher\/results\/analysis(?:\?.*)?$/);
  });

  test("@workflow browser coverage keeps teacher wrong questions report counts and handoffs truthful", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/wrong-questions", /wrong questions report/i);

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

    const emptyState = page.getByText(/wrong-question rows will appear once enough teacher-scoped answer evidence exists/i).first();
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
    await expect(page).toHaveURL(/\/teacher\/reports\/weak-areas(?:\?.*)?$/);
  });

  test("@workflow browser coverage keeps teacher time management report counts and handoffs truthful", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/time-management", /time management report/i);

    const trackedAttemptsCardText =
      (await page
        .getByText(/^Tracked attempts$/i)
        .locator("xpath=..")
        .locator("strong")
        .textContent()) ?? "";
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

    const emptyState = page.getByText(/timing rows will appear once timed teacher-scoped attempts are available/i).first();
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
    await expect(openAttemptReview).toHaveAttribute("href", /\/teacher\/results\/attempts(?:\?.*)?$/);
    await openAttemptReview.click();
    if (!/\/teacher\/results\/attempts(?:\?.*)?$/.test(page.url())) {
      await gotoWithRuntimeRecovery(page, "/teacher/results/attempts");
    }
    await expect(page).toHaveURL(/\/teacher\/results\/attempts(?:\?.*)?$/);
  });
});
