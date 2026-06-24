import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

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

async function expectTeacherResultsAnalysis(page: Page) {
  await expect(page).toHaveURL(/\/teacher\/results\/analysis(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  await expect(page.getByText(/question risk board/i).first()).toBeVisible();
  await expect(page.getByText(/^student explorer$/i).first()).toBeVisible();
}

test.describe("Teacher results analysis workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can filter and drill through the results analysis workspace", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRetry(page, "/teacher/results/analysis");
    await expectTeacherResultsAnalysis(page);

    await page.getByRole("link", { name: /^hard$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results\/analysis\?[^#]*question_filter=hard_questions/);

    await page.getByRole("link", { name: /skipped often/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results\/analysis\?[^#]*question_filter=skipped_often/);

    await page.getByRole("link", { name: /revision candidates/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results\/analysis\?[^#]*question_filter=revision_candidates/);

    await page.getByRole("link", { name: /^all$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results\/analysis(?:\?.*)?$/);

    const studentCard = page.locator('a.analyticsResultStudentCard').first();
    if (await studentCard.isVisible().catch(() => false)) {
      await studentCard.click();
      await expect(page).toHaveURL(/\/teacher\/results\/analysis\?[^#]*attempt=/);
      await expect(page.getByText(/selected student/i).first()).toBeVisible();
      await expect(page.getByText(/question-wise evidence/i).first()).toBeVisible();

      const wrongChip = page.getByRole("link", { name: /^wrong$/i }).first();
      if (await wrongChip.isVisible().catch(() => false)) {
        await wrongChip.click();
        await expect(page).toHaveURL(/\/teacher\/results\/analysis\?[^#]*student_question_filter=wrong/);
      }
    }

    await gotoWithRetry(page, "/teacher/results/analysis");
    await expectTeacherResultsAnalysis(page);

    const openQuestionBankLink = page.getByRole("link", { name: /open question bank/i }).first();
    await expect(openQuestionBankLink).toBeVisible();
    await openQuestionBankLink.click();
    await expect(page).toHaveURL(/\/teacher\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/teacher/results/analysis");
    await expectTeacherResultsAnalysis(page);

    const openBuilderLink = page.getByRole("link", { name: /^open builder$/i }).last();
    await expect(openBuilderLink).toBeVisible();
    await openBuilderLink.click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/?#]+\/builder(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
  });
});
