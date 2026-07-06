import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

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

async function expectInstituteResultsAnalysis(page: Page) {
  await expect(page).toHaveURL(/\/institute\/results\/analysis(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  const emptyStateHeading = page.getByRole("heading", {
    name: /analysis opens after scored attempts start arriving/i,
  });
  if (await emptyStateHeading.isVisible().catch(() => false)) {
    await expect(emptyStateHeading).toBeVisible();
    await expect(page.getByText(/this route is for weak-topic analysis, question-risk review, and student evidence/i).first()).toBeVisible();
    return false;
  }
  await expect(page.getByText(/question risk board/i).first()).toBeVisible();
  await expect(page.getByText(/^student explorer$/i).first()).toBeVisible();
  return true;
}

async function expectVisiblePaginationControlsToAvoidHashLinks(page: Page) {
  const visiblePagers = page.locator(".workspaceFilterActions").filter({
    has: page.getByText(/previous|next/i),
  });
  const visibleCount = await visiblePagers.count();

  for (let index = 0; index < visibleCount; index += 1) {
    const pager = visiblePagers.nth(index);
    if (!(await pager.isVisible().catch(() => false))) {
      continue;
    }

    await expect(pager.locator('a[href="#"]')).toHaveCount(0);
  }
}

test.describe("Institute results analysis workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can filter and drill through the results analysis workspace", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRetry(page, "/institute/results/analysis");
    const analysisLoaded = await expectInstituteResultsAnalysis(page);
    if (!analysisLoaded) {
      await page.getByRole("link", { name: /open exams/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      return;
    }
    await expectVisiblePaginationControlsToAvoidHashLinks(page);

    await page.getByRole("link", { name: /^hard$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*question_filter=hard_questions/);

    await page.getByRole("link", { name: /skipped often/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*question_filter=skipped_often/);

    await page.getByRole("link", { name: /revision candidates/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*question_filter=revision_candidates/);

    await page.getByRole("link", { name: /^all$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/results\/analysis(?:\?.*)?$/);

    const studentCard = page.locator('a.analyticsResultStudentCard').first();
    if (await studentCard.isVisible().catch(() => false)) {
      await studentCard.click();
      await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*attempt=/);
      await expect(page.getByText(/selected student/i).first()).toBeVisible();
      await expect(page.getByText(/question-wise evidence/i).first()).toBeVisible();

      const wrongChip = page.getByRole("link", { name: /^wrong$/i }).first();
      if (await wrongChip.isVisible().catch(() => false)) {
        await wrongChip.click();
        await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*student_question_filter=wrong/);
      }
    }

    await gotoWithRetry(page, "/institute/results/analysis");
    await expectInstituteResultsAnalysis(page);
    await expectVisiblePaginationControlsToAvoidHashLinks(page);

    const openQuestionBankLink = page.getByRole("link", { name: /open question bank/i }).first();
    await expect(openQuestionBankLink).toBeVisible();
    await openQuestionBankLink.click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    await gotoWithRetry(page, "/institute/results/analysis");
    await expectInstituteResultsAnalysis(page);

    const openBuilderLink = page.getByRole("link", { name: /^open builder$/i }).last();
    await expect(openBuilderLink).toBeVisible();
    await openBuilderLink.click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+\/builder(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
  });
});
