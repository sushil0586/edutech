import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function gotoInstituteAnalysis(page: Page, href = "/institute/results/analysis") {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page).toHaveURL(/\/institute\/results\/analysis(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
}

async function expectAnalysisReadyState(page: Page) {
  const emptyStateHeading = page.getByRole("heading", {
    name: /analysis opens after scored attempts start arriving/i,
  });

  if (await emptyStateHeading.isVisible().catch(() => false)) {
    await expect(emptyStateHeading).toBeVisible();
    await expect(
      page.getByText(/this route is for weak-topic analysis, question-risk review, and student evidence/i).first(),
    ).toBeVisible();
    return false;
  }

  await expect(page.getByText(/question risk board/i).first()).toBeVisible();
  await expect(page.getByText(/^student explorer$/i).first()).toBeVisible();
  return true;
}

async function applyAnalysisContinuityFilter(page: Page) {
  await page.getByRole("combobox", { name: /question filter/i }).first().selectOption("skipped_often");
  await page.getByRole("button", { name: /apply question filter/i }).first().click();
}

async function expectAnalysisContinuityFilter(page: Page) {
  await expect(page).toHaveURL(/question_filter=skipped_often/);
  await expect(page.getByRole("combobox", { name: /question filter/i }).first()).toHaveValue("skipped_often");
}

test.describe("Institute results analysis continuity", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute analysis filters and student evidence survive refresh and revisit", async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoInstituteAnalysis(page);
    const analysisLoaded = await expectAnalysisReadyState(page);
    if (!analysisLoaded) {
      await page.getByRole("link", { name: /open exams/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      return;
    }

    await applyAnalysisContinuityFilter(page);
    await expectAnalysisContinuityFilter(page);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(/question risk board/i).first()).toBeVisible();
    await expectAnalysisContinuityFilter(page);

    await gotoWithRuntimeRecovery(page, "/institute/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await page.goBack();
    await expect(page.getByText(/question risk board/i).first()).toBeVisible();
    await expectAnalysisContinuityFilter(page);

    const studentCard = page.locator("a.analyticsResultStudentCard").first();
    if (!(await studentCard.isVisible().catch(() => false))) {
      await gotoWithRuntimeRecovery(page, "/institute/question-bank");
      await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
      await page.goBack();
      await expect(page.getByText(/question risk board/i).first()).toBeVisible();
      await expectAnalysisContinuityFilter(page);
      return;
    }

    await studentCard.click();
    await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*attempt=/);
    await expect(page.getByText(/selected student/i).first()).toBeVisible();
    await expect(page.getByText(/question-wise evidence/i).first()).toBeVisible();

    const selectedAttemptUrl = page.url();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(selectedAttemptUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.getByText(/selected student/i).first()).toBeVisible();
    await expect(page.getByText(/question-wise evidence/i).first()).toBeVisible();

    const wrongChip = page.getByRole("link", { name: /^wrong$/i }).first();
    if (await wrongChip.isVisible().catch(() => false)) {
      await wrongChip.click();
      await expect(page).toHaveURL(/student_question_filter=wrong/);
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(selectedAttemptUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      await expect(page.getByText(/selected student/i).first()).toBeVisible();
    }
  });
});
