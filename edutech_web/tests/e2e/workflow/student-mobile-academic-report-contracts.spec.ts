import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

test.describe("Student mobile academic report contracts", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow student mobile report surfaces keep first-class academic contracts", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/results");
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    const resultsEmpty = page.getByText(/your result history is empty right now/i).first();
    if (!(await resultsEmpty.isVisible().catch(() => false))) {
      const resultRow = page.locator(".studentResultsTable tbody tr").first();
      await expect(resultRow).toBeVisible();
      await resultRow.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/result details/i).first()).toBeVisible();
      await page.getByRole("button", { name: /close/i }).first().click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    await gotoWithRuntimeRecovery(page, "/app/weak-areas");
    await expect(page).toHaveURL(/\/app\/weak-areas(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /weak areas/i }).first()).toBeVisible();
    const weakAreasEmpty = page.getByText(/topic analytics are not available right now|waiting for topic performance data/i).first();
    if (!(await weakAreasEmpty.isVisible().catch(() => false))) {
      await expect(page.getByText(/topic mastery report/i).first()).toBeVisible();
      const topicRow = page.locator(".studentTopicMasteryTable tbody tr").first();
      await expect(topicRow).toBeVisible();
      await topicRow.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/topic mastery/i).first()).toBeVisible();
      await page.getByRole("button", { name: /close/i }).first().click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    await gotoWithRuntimeRecovery(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    const analyticsBlocked = page.getByText(/analytics are not available yet|student analytics could not be loaded/i).first();
    if (!(await analyticsBlocked.isVisible().catch(() => false))) {
      await expect(page.getByText(/subject performance report/i).first()).toBeVisible();
      const subjectRow = page.locator(".studentSubjectPerformanceTable tbody tr").first();
      await expect(subjectRow).toBeVisible();
      await subjectRow.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/subject performance/i).first()).toBeVisible();
      await page.getByRole("button", { name: /close/i }).first().click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    await gotoWithRuntimeRecovery(page, "/app/practice");
    await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
    const practiceEmpty = page.getByText(/your practice workspace is empty right now/i).first();
    if (!(await practiceEmpty.isVisible().catch(() => false))) {
      await expect(page.getByText(/practice recommendation report/i).first()).toBeVisible();
      const practiceRow = page.locator(".studentPracticeRecommendationTable tbody tr").first();
      await expect(practiceRow).toBeVisible();
      await practiceRow.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/practice recommendation/i).first()).toBeVisible();
      await page.getByRole("button", { name: /close/i }).first().click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    await gotoWithRuntimeRecovery(page, "/app/analytics/questions");
    await expect(page).toHaveURL(/\/app\/analytics\/questions(?:\?.*)?$/);
    const questionBlocked = page.getByText(/question analytics are not available yet|question analytics could not be loaded/i).first();
    if (!(await questionBlocked.isVisible().catch(() => false))) {
      await expect(page.getByRole("heading", { name: /question pattern report/i }).first()).toBeVisible();
      const questionRow = page
        .locator(".studentQuestionPatternTable tbody")
        .getByRole("button")
        .first();
      await expect(questionRow).toBeVisible();
      await questionRow.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/question pattern/i).first()).toBeVisible();
      await page.getByRole("button", { name: /close/i }).first().click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });
});
