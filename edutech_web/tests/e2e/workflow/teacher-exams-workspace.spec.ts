import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

function statusSelect(page: Page) {
  return page.getByRole("combobox", { name: /^status$/i });
}

function sortSelect(page: Page) {
  return page.getByRole("combobox", { name: /sort by/i });
}

function groupSelect(page: Page) {
  return page.getByRole("combobox", { name: /group by/i });
}

function pageSizeSelect(page: Page) {
  return page.getByRole("combobox", { name: /page size/i });
}

async function openTeacherExams(page: Page, path = "/teacher/exams") {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
  await expect(page.getByText(/exam controls/i).first()).toBeVisible();
}

test.describe("Teacher exams workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can filter exam list and use core exam-management handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await openTeacherExams(page);

    await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();
    await expect(page.getByText(/^total exams$/i).first()).toBeVisible();
    await expect(page.getByText(/^live exams$/i).first()).toBeVisible();
    await expect(page.getByText(/^assigned learners$/i).first()).toBeVisible();
    await expect(page.getByText(/^review blocked$/i).first()).toBeVisible();

    await expect(statusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");

    await statusSelect(page).selectOption("draft");
    await sortSelect(page).selectOption("title");
    await groupSelect(page).selectOption("status");
    await pageSizeSelect(page).selectOption("18");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/teacher\/exams\?[^#]*exam_status=draft/);
    await expect(page).toHaveURL(/\/teacher\/exams\?[^#]*exam_sort=title/);
    await expect(page).toHaveURL(/\/teacher\/exams\?[^#]*exam_group=status/);
    await expect(page).toHaveURL(/\/teacher\/exams\?[^#]*exam_page_size=18/);
    await expect(
      page.getByRole("heading", { name: /your teacher exam list is empty right now/i }).first(),
    ).toBeVisible();

    await openTeacherExams(page);

    await page.getByRole("link", { name: /^live$/i }).click();
    await expect(page).toHaveURL(/exam_status=live/);
    await expect(statusSelect(page)).toHaveValue("live");
    await expect(page.getByText(/status: live/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^open exam$/i }).first()).toBeVisible();

    await openTeacherExams(page);

    await page.getByRole("link", { name: /^starts soon$/i }).click();
    await expect(page).toHaveURL(/exam_sort=start_soon/);
    await expect(page.getByText(/sort: start soon/i).first()).toBeVisible();

    await openTeacherExams(page);

    await page.getByRole("link", { name: /^group by status$/i }).click();
    await expect(page).toHaveURL(/exam_group=status/);

    await page.getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/exams(?:\?.*)?$/);
    await expect(statusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/teacher\/exams$/);
    await expect(statusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");

    const openExamLink = page.getByRole("link", { name: /^open exam$/i }).first();
    await expect(openExamLink).toBeVisible();
    await openExamLink.click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam code/i).first()).toBeVisible();

    await openTeacherExams(page);
    const setupLink = page.getByRole("link", { name: /^setup$/i }).first();
    await expect(setupLink).toBeVisible();
    await setupLink.click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/?#]+\/builder(?:\?.*)?$/);

    await openTeacherExams(page);
    const linkQuestionsLink = page.getByRole("link", { name: /link questions/i }).first();
    await expect(linkQuestionsLink).toBeVisible();
    await linkQuestionsLink.click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/?#]+\/builder\?tab=questions/);

    await openTeacherExams(page);
    await page.getByRole("link", { name: /quick create/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams\/new(?:\?.*)?$/);

    await openTeacherExams(page);
    await page.getByRole("link", { name: /advanced builder/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams\/advanced(?:\?.*)?$/);

    await openTeacherExams(page);
    await page.getByRole("navigation", { name: /teacher navigation/i }).getByRole("link", { name: /^results$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^results$/i }).first()).toBeVisible();
  });
});
