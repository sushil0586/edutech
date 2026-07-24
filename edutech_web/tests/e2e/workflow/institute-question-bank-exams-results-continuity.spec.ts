import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openQuestionBank(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/question-bank");
  await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
}

async function openExams(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/exams");
  await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
}

async function openResults(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/results");
  await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
}

test.describe("Institute question-bank to exams to results continuity", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow institute can carry continuity from question bank into exam detail and results handoffs", async ({
    page,
  }) => {
    await openQuestionBank(page);
    await expect(page.getByText(/find questions faster/i).first()).toBeVisible();

    const createQuestionLink = page.getByRole("link", { name: /create question/i }).first();
    await expect(createQuestionLink).toBeVisible();

    await openExams(page);

    const emptyStateHeading = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(emptyStateHeading).toBeVisible();
      await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();
      return;
    }

    const openExamLink = page.getByRole("link", { name: /open exam/i }).first();
    await expect(openExamLink).toBeVisible();
    await openExamLink.click();

    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);
    await expect(page.getByText(/^delivery actions$/i).first()).toBeVisible();

    const openQuestionBankLink = page.getByRole("link", { name: /open question bank/i }).first();
    await expect(openQuestionBankLink).toBeVisible();
    await openQuestionBankLink.click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);
    await expect(page.getByText(/^delivery actions$/i).first()).toBeVisible();

    const openResultsLink = page.getByRole("link", { name: /open results/i }).first();
    await expect(openResultsLink).toBeVisible();
    await openResultsLink.click();
    await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam=/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);
    await expect(page.getByText(/^delivery actions$/i).first()).toBeVisible();

    await openResults(page);
    const viewExamLink = page.getByRole("link", { name: /^view exam$/i }).first();
    if (await viewExamLink.isVisible().catch(() => false)) {
      await viewExamLink.click();
      await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("link", { name: /open question bank/i }).first()).toBeVisible();
    }
  });
});
