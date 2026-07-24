import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

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

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => locator.locator("option").count()).toBeGreaterThan(0);
}

async function gotoExams(page: Page, path = "/teacher/exams") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
  await expect(page.getByText(/exam controls/i).first()).toBeVisible();
}

test.describe("Teacher exams browser functionality coverage", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
  });

  test("@workflow browser coverage keeps teacher exams filter controls hydrated", async ({ page }) => {
    await gotoExams(page);

    await expectSelectHasOptions(statusSelect(page));
    await expectSelectHasOptions(sortSelect(page));
    await expectSelectHasOptions(groupSelect(page));
    await expectSelectHasOptions(pageSizeSelect(page));

    await expect(statusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");
    await expect(pageSizeSelect(page)).toHaveValue("12");
  });

  test("@workflow browser coverage can apply and reset teacher exam filters truthfully", async ({
    page,
  }) => {
    await gotoExams(page);

    await statusSelect(page).selectOption("all");
    await sortSelect(page).selectOption("title");
    await groupSelect(page).selectOption("status");
    await pageSizeSelect(page).selectOption("18");
    await page.getByRole("button", { name: /update view/i }).click();

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          exam_status: url.searchParams.get("exam_status"),
          exam_sort: url.searchParams.get("exam_sort"),
          exam_group: url.searchParams.get("exam_group"),
          exam_page_size: url.searchParams.get("exam_page_size"),
        };
      })
      .toEqual({
        exam_status: "all",
        exam_sort: "title",
        exam_group: "status",
        exam_page_size: "18",
      });

    await expect(statusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("title");
    await expect(groupSelect(page)).toHaveValue("status");
    await expect(pageSizeSelect(page)).toHaveValue("18");
    await expect(page.getByText(/status: all/i).first()).toBeVisible();
    await expect(page.getByText(/sort: title/i).first()).toBeVisible();
    await expect(page.getByText(/group: status/i).first()).toBeVisible();

    await page.getByRole("link", { name: /reset view/i }).click();
    await expect(page).toHaveURL(/\/teacher\/exams$/);
    await expect(statusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");
    await expect(pageSizeSelect(page)).toHaveValue("12");
  });

  test("@workflow browser coverage keeps teacher exams quick filters truthful", async ({ page }) => {
    await gotoExams(page);

    await page.getByRole("link", { name: /^live$/i }).click();
    await expect(page).toHaveURL(/exam_status=live/);
    await expect(
      page.getByRole("heading", { name: /your teacher exam list is empty right now|exam management/i }).first(),
    ).toBeVisible();

    await gotoExams(page);
    await page.getByRole("link", { name: /^scheduled$/i }).click();
    await expect(page).toHaveURL(/exam_status=scheduled/);
    await expect(
      page.getByRole("heading", { name: /your teacher exam list is empty right now|exam management/i }).first(),
    ).toBeVisible();

    await gotoExams(page);
    await page.getByRole("link", { name: /^drafts$/i }).click();
    await expect(page).toHaveURL(/exam_status=draft/);
    await expect(
      page.getByRole("heading", { name: /your teacher exam list is empty right now|exam management/i }).first(),
    ).toBeVisible();

    await gotoExams(page);
    await page.getByRole("link", { name: /^starts soon$/i }).click();
    await expect(page).toHaveURL(/exam_sort=start_soon/);
    await expect(sortSelect(page)).toHaveValue("start_soon");

    await gotoExams(page);
    await page.getByRole("link", { name: /^most learners$/i }).click();
    await expect(page).toHaveURL(/exam_sort=learners_high/);
    await expect(sortSelect(page)).toHaveValue("learners_high");

    await gotoExams(page);
    await page.getByRole("link", { name: /^group by status$/i }).click();
    await expect(page).toHaveURL(/exam_group=status/);
    await expect(groupSelect(page)).toHaveValue("status");

    await page.getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/exams(?:\?.*)?$/);
    await expect(statusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");
  });

  test("@workflow browser coverage proves teacher exam empty state is distinct from loaded state", async ({
    page,
  }) => {
    await page.goto("/teacher/exams?exam_status=draft&exam_sort=title&exam_group=status&exam_page_size=18");
    const visibleExamCards = await page.locator(".examGrid .examCard").count();

    if (visibleExamCards === 0) {
      await expect(
        page.getByRole(
          "heading",
          { name: /your teacher exam list is empty right now|no teacher exams match these controls/i },
        ).first(),
      ).toBeVisible();
      await expect(page.locator(".examGrid .examCard")).toHaveCount(0);
    } else {
      await expect(page.locator(".workspaceResultsGroup").first()).toBeVisible();
      await expect(
        page.getByRole(
          "heading",
          { name: /your teacher exam list is empty right now|no teacher exams match these controls/i },
        ),
      ).toHaveCount(0);
    }
  });

  test("@workflow browser coverage keeps teacher exam summary counts internally truthful", async ({
    page,
  }) => {
    await gotoExams(page);

    const controlsSummaryText =
      (await page.locator(".workspaceFiltersCard .sectionHeading span").first().textContent())?.trim() ?? "";
    const totalExamsCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Total Exams$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const examCardsCount = await page.locator(".examGrid .examCard").count();

    const shownFromControls = extractLeadingNumber(controlsSummaryText);
    const totalFromCard = extractLeadingNumber(totalExamsCardText);

    expect(shownFromControls).not.toBeNull();
    expect(totalFromCard).not.toBeNull();
    expect(shownFromControls).toBe(examCardsCount);
    expect(totalFromCard).toBeGreaterThanOrEqual(examCardsCount);
  });
});
