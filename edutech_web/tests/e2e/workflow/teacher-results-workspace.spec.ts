import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectTeacherResultsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: /exam state/i })).toBeVisible();
  await expect(page.getByText(/visible exams/i).first()).toBeVisible();
  await expect(page.getByText(/total attempts/i).first()).toBeVisible();
  await expect(page.getByText(/average performance/i).first()).toBeVisible();
}

async function expectWorkflowLinkUtility(page: Page) {
  const workflowGrid = page.locator(".teacherWorkflowGrid").first();
  const workflowLink = workflowGrid
    .getByRole("link")
    .filter({
      hasText: /open exam lifecycle|open review queue|finish lifecycle|open exam/i,
    })
    .first();

  if (!(await workflowLink.isVisible().catch(() => false))) {
    return;
  }

  const href = await workflowLink.getAttribute("href");
  expect(href).toBeTruthy();
  await workflowLink.click();

  if (href?.includes("/teacher/reviews")) {
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    return;
  }

  await expect(page).toHaveURL(/\/teacher\/exams\/[^/?#]+(?:\?.*)?$/);
  await expect(page.getByText(/exam code/i).first()).toBeVisible();
}

async function selectFirstVisibleTeacherExam(page: Page) {
  const firstExamLink = page
    .locator('a[href^="/teacher/results?exam="]')
    .first();
  await expect(firstExamLink).toBeVisible();
  await firstExamLink.click();
  await expect(page).toHaveURL(/\/teacher\/results\?[^#]*exam=/);
}

test.describe("Teacher results workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can filter and navigate the results workspace", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/teacher/results");
    await expectTeacherResultsWorkspace(page);

    await page.getByRole("combobox", { name: /exam state/i }).selectOption("published");
    await page.getByRole("combobox", { name: /sort by/i }).selectOption("title");
    await page.getByRole("combobox", { name: /group by/i }).selectOption("status");
    await page.getByRole("combobox", { name: /page size/i }).selectOption("14");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/teacher\/results\?[^#]*exam_list_filter=published/);
    await expect(page).toHaveURL(/\/teacher\/results\?[^#]*exam_list_sort=title/);
    await expect(page).toHaveURL(/\/teacher\/results\?[^#]*exam_list_group=status/);
    await expect(page).toHaveURL(/\/teacher\/results\?[^#]*exam_page_size=14/);
    await expect(page.getByText(/exam state: published/i)).toBeVisible();
    await expect(page.getByText(/group: status/i)).toBeVisible();

    await page.getByRole("link", { name: /reset exam filters/i }).click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);

    const refreshStatusButton = page.getByRole("button", { name: /refresh exam status/i });
    if (await refreshStatusButton.isVisible().catch(() => false)) {
      await refreshStatusButton.click();
      await expect(page).toHaveURL(/\/teacher\/results(?:\?.*message=.*)?$/);
      await expectTeacherResultsWorkspace(page);
    }

    await expectWorkflowLinkUtility(page);

    await gotoWithRuntimeRecovery(page, "/teacher/results");
    await expectTeacherResultsWorkspace(page);
    await selectFirstVisibleTeacherExam(page);

    await expect(page.getByRole("link", { name: /open exam|view exam/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open reviews|view reviews/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /inspect question bank|view question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open leaderboard|view leaderboard/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open live monitor|view live monitor/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open leaderboard|view leaderboard/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results\/leaderboard(?:\?.*)?$/);
    await expect(page.getByText(/publication checklist/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/results");
    await expectTeacherResultsWorkspace(page);
    await selectFirstVisibleTeacherExam(page);

    const openExamLink = page.getByRole("link", { name: /^(open|view) exam$/i }).first();
    await expect(openExamLink).toBeVisible();
    await openExamLink.click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam code/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/results");
    await expectTeacherResultsWorkspace(page);
    await selectFirstVisibleTeacherExam(page);

    const openReviewsLink = page.getByRole("link", { name: /^(open|view) reviews$/i }).first();
    await expect(openReviewsLink).toBeVisible();
    await openReviewsLink.click();
    await expect(page).toHaveURL(/\/teacher\/reviews\?[^#]*exam=/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/results");
    await expectTeacherResultsWorkspace(page);
    await selectFirstVisibleTeacherExam(page);

    const inspectQuestionBankLink = page.getByRole("link", { name: /inspect question bank|view question bank/i }).first();
    await expect(inspectQuestionBankLink).toBeVisible();
    await inspectQuestionBankLink.click();
    await expect(page).toHaveURL(/\/teacher\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/results");
    await expectTeacherResultsWorkspace(page);
    await selectFirstVisibleTeacherExam(page);

    const liveMonitorNavLink = page.getByRole("link", {
      name: /open live monitor|view live monitor/i,
    }).first();
    await expect(liveMonitorNavLink).toBeVisible();
    const liveMonitorHref = await liveMonitorNavLink.getAttribute("href");
    expect(liveMonitorHref).toBeTruthy();
    await gotoWithRuntimeRecovery(page, liveMonitorHref!);
    await expect(page).toHaveURL(/\/teacher\/results\/live(?:\?.*)?$/);
    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
    await expect(page.getByText(/intervention queue/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/teacher/results");
    await expectTeacherResultsWorkspace(page);
    await selectFirstVisibleTeacherExam(page);

    const analysisCard = page.getByRole("link").filter({
      has: page.getByText(/^(open )?analysis$/i),
    }).first();
    await expect(analysisCard).toBeVisible();
    await analysisCard.click();
    await expect(page).toHaveURL(/\/teacher\/results\/analysis(?:\?.*)?$/);
    await expect(page.getByText(/question risk board/i).first()).toBeVisible();
    await expect(page.getByText(/student explorer/i).first()).toBeVisible();
  });
});
