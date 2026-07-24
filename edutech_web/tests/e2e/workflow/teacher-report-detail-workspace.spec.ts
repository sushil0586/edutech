import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openReport(page: Page, path: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\?.*)?$"));
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("Teacher report detail workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
  });

  test("@workflow teacher can validate the subject performance report and its supporting lanes", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/subjects", /subject performance report/i);

    await expect(page.getByText(/teacher subject performance/i).first()).toBeVisible();
    await expect(page.getByText(/subject pressure board/i).first()).toBeVisible();
    await expect(page.getByText(/weak-topic feed/i).first()).toBeVisible();
    await expect(page.getByText(/students doing well/i).first()).toBeVisible();
    await expect(page.getByText(/students needing support/i).first()).toBeVisible();

    const emptyState = page.getByText(/subject-strength rows will appear when teacher weak-topic evidence is available/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const openAnalysis = page.getByRole("link", { name: /open analysis/i }).first();
    await expect(openAnalysis).toBeVisible();
    await openAnalysis.click();
    await expect(page).toHaveURL(/\/teacher\/results\/analysis(?:\?.*)?$/);
  });

  test("@workflow teacher can drill from a support student lane into the learner report detail", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/subjects", /subject performance report/i);

    const supportStudentLink = page.locator('a[href*="/teacher/reports/students/"]').first();
    await expect(supportStudentLink).toBeVisible();
    await supportStudentLink.click();

    await expect(page).toHaveURL(/\/teacher\/reports\/students\/[^/?]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /student report detail/i }).first()).toBeVisible();
    await expect(page.getByText(/teacher learner drilldown/i).first()).toBeVisible();
    await expect(page.getByText(/recommended handoffs/i).first()).toBeVisible();

    const backToSource = page.getByRole("link", { name: /back to subject performance/i }).first();
    await expect(backToSource).toBeVisible();
  });

  test("@workflow teacher can validate the topic mastery report and its recovery lanes", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/weak-areas", /topic mastery report/i);

    await expect(page.getByText(/teacher weak areas/i).first()).toBeVisible();
    await expect(page.getByText(/weak-topic ranking/i).first()).toBeVisible();
    await expect(page.getByText(/recovery action lane/i).first()).toBeVisible();
    await expect(page.getByText(/students needing support/i).first()).toBeVisible();
    await expect(page.getByText(/most wrong questions/i).first()).toBeVisible();

    const emptyState = page.getByText(/weak-topic rows will appear once teacher-scoped topic evidence is available/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const openSubjectReport = page.getByRole("link", { name: /open subject report/i }).first();
    await expect(openSubjectReport).toBeVisible();
    await openSubjectReport.click();
    await expect(page).toHaveURL(/\/teacher\/reports\/subjects(?:\?.*)?$/);
  });

  test("@workflow teacher can validate the wrong questions report and its intervention lanes", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/wrong-questions", /wrong questions report/i);

    await expect(page.getByText(/teacher wrong questions/i).first()).toBeVisible();
    await expect(page.getByText(/most wrong questions/i).first()).toBeVisible();
    await expect(page.getByText(/most skipped questions/i).first()).toBeVisible();
    await expect(page.getByText(/recovery action lane/i).first()).toBeVisible();
    await expect(page.getByText(/students needing support/i).first()).toBeVisible();

    const emptyState = page.getByText(/wrong-question rows will appear once enough teacher-scoped answer evidence exists/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const openTopicMastery = page.getByRole("link", { name: /open topic mastery/i }).first();
    await expect(openTopicMastery).toBeVisible();
    await openTopicMastery.click();
    await expect(page).toHaveURL(/\/teacher\/reports\/weak-areas(?:\?.*)?$/);
  });

  test("@workflow teacher can validate the time management report and its pacing lanes", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/time-management", /time management report/i);

    await expect(page.getByText(/teacher time management/i).first()).toBeVisible();
    await expect(page.getByText(/timing pressure board/i).first()).toBeVisible();
    await expect(page.getByText(/timing action lane/i).first()).toBeVisible();
    await expect(page.getByText(/students needing support/i).first()).toBeVisible();
    await expect(page.getByText(/current exam context/i).first()).toBeVisible();

    const emptyState = page.getByText(/timing rows will appear once timed teacher-scoped attempts are available/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.locator(".studentResultsTable tbody tr").first()).toBeVisible();

    const openAttemptReview = page.getByRole("link", { name: /open attempt review/i }).first();
    await expect(openAttemptReview).toBeVisible();
    await openAttemptReview.click();
    await expect(page).toHaveURL(/\/teacher\/results\/attempts(?:\?.*)?$/);
  });
});
