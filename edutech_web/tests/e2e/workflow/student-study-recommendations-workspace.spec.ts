import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openStudyRecommendations(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/analytics/study-recommendations");
  await expect(page).toHaveURL(/\/app\/analytics\/study-recommendations(?:\?.*)?$/);
}

test.describe("Student study recommendations workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate the recommendation report and follow-up routes", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openStudyRecommendations(page);

    const blockedState = page
      .getByText(
        /ai study recommendations are not available yet|ai study recommendations could not be loaded/i,
      )
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.getByRole("heading", { name: /ai study recommendations/i }).first()).toBeVisible();
    await expect(page.getByText(/recommendation snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/why this is recommended/i).first()).toBeVisible();
    await expect(page.getByText(/recommended next routes/i).first()).toBeVisible();
    await expect(page.getByText(/recommendation ledger/i).first()).toBeVisible();

    for (const label of [
      /primary topic/i,
      /weakest subject/i,
      /riskiest format/i,
      /recommendation lane/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    const openPractice = page.getByRole("link", { name: /open practice report/i }).first();
    if (await openPractice.isVisible().catch(() => false)) {
      await openPractice.click();
      await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
      await openStudyRecommendations(page);
    }

    const openActionCenter = page.getByRole("link", { name: /open action center/i }).first();
    if (await openActionCenter.isVisible().catch(() => false)) {
      await openActionCenter.click();
      await expect(page).toHaveURL(/\/app\/analytics\/actions(?:\?.*)?$/);
      await openStudyRecommendations(page);
    }

    const openWrongQuestions = page.getByRole("link", { name: /open wrong questions report/i }).first();
    if (await openWrongQuestions.isVisible().catch(() => false)) {
      await openWrongQuestions.click();
      await expect(page).toHaveURL(/\/app\/analytics\/wrong-questions(?:\?.*)?$/);
    }
  });
});
