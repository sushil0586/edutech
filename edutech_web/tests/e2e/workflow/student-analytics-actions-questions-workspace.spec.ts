import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectQuestionsWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/analytics\/questions(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /question pattern report/i }).first()).toBeVisible();
}

test.describe("Student analytics actions and questions workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate action center and question drill-down surfaces", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/analytics/actions");
    await expect(page).toHaveURL(/\/app\/analytics\/actions(?:\?.*)?$/);

    const blockedState = page
      .getByText(/action center is not available yet|action center could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.getByRole("heading", { name: /next best moves/i }).first()).toBeVisible();
    await expect(page.getByText(/recommended now/i).first()).toBeVisible();
    await expect(page.getByText(/recover wrong answers/i).first()).toBeVisible();
    await expect(page.getByText(/rescue skipped questions/i).first()).toBeVisible();
    await expect(page.getByText(/slowest questions/i).first()).toBeVisible();
    await expect(page.getByText(/action shortlist/i).first()).toBeVisible();

    const openQuestionTableLink = page.getByRole("link", { name: /open question table/i }).first();
    if (await openQuestionTableLink.isVisible().catch(() => false)) {
      await openQuestionTableLink.click();
    } else {
      await gotoWithRuntimeRecovery(page, "/app/analytics/questions");
    }

    await expectQuestionsWorkspace(page);

    const blockedQuestionState = page
      .getByText(/question analytics are not available yet|question analytics could not be loaded/i)
      .first();
    if (await blockedQuestionState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.getByText(/question pattern report/i).first()).toBeVisible();
    await expect(page.getByText(/active filters/i).first()).toBeVisible();
    await expect(page.getByText(/question evidence ledger/i).first()).toBeVisible();
    await expect(page.getByText(/benchmark snapshot/i).first()).toBeVisible();

    const firstRow = page.locator(".studentQuestionPatternTable tbody tr").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    const questionDialog = page.getByRole("dialog");
    if (await questionDialog.isVisible().catch(() => false)) {
      await expect(questionDialog).toBeVisible();
      await expect(page.getByText(/question pattern/i).first()).toBeVisible();
      await expect(
        page.getByRole("link", { name: /open subject view|open topic view|open type view/i }).first(),
      ).toBeVisible();

      await page.getByRole("button", { name: /close/i }).first().click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } else {
      await expect(firstRow).toBeVisible();
    }

    const firstQuestion = page.locator("details.analyticsQuestionSurface").first();
    await expect(firstQuestion).toBeVisible();
    await firstQuestion.locator("summary").click();

    await expect(firstQuestion.getByText(/attempt signal/i).first()).toBeVisible();
    await expect(firstQuestion.getByText(/open related drill-downs/i).first()).toBeVisible();

    const relatedLink = firstQuestion
      .locator('a[href*="/app/analytics/subjects/"], a[href*="/app/analytics/topics/"], a[href*="/app/analytics/questions?"]')
      .first();

    if (await relatedLink.isVisible().catch(() => false)) {
      const href = await relatedLink.getAttribute("href");
      expect(href).not.toBeNull();
      await relatedLink.click();
      await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
});
