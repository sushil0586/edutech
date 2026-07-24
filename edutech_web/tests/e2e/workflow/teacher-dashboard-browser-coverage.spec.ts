import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function laneSelect(page: Page) {
  return page.getByRole("combobox", { name: /focus lane/i });
}

function subjectSelect(page: Page) {
  return page.getByRole("combobox", { name: /^subject$/i });
}

function sortSelect(page: Page) {
  return page.getByRole("combobox", { name: /sort by/i });
}

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => locator.locator("option").count()).toBeGreaterThan(0);
}

async function getOptionValues(locator: Locator) {
  return locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
}

async function gotoDashboard(page: Page, path = "/teacher/dashboard") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();
  await expect(page.getByText(/dashboard controls/i).first()).toBeVisible();
}

test.describe("Teacher dashboard browser functionality coverage", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
  });

  test("@workflow browser coverage keeps teacher dashboard filter controls hydrated", async ({
    page,
  }) => {
    await gotoDashboard(page);

    await expectSelectHasOptions(laneSelect(page));
    await expectSelectHasOptions(subjectSelect(page));
    await expectSelectHasOptions(sortSelect(page));

    await expect(laneSelect(page)).toHaveValue("all");
    await expect(subjectSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");

    expect(await getOptionValues(laneSelect(page))).toEqual([
      "all",
      "delivery",
      "weak_topics",
      "students",
      "questions",
    ]);
    expect(await getOptionValues(sortSelect(page))).toEqual([
      "recommended",
      "score_low",
      "score_high",
      "attempts_high",
      "wrong_high",
    ]);
    expect((await getOptionValues(subjectSelect(page))).length).toBeGreaterThan(0);
  });

  test("@workflow browser coverage can apply and reset teacher dashboard filters truthfully", async ({
    page,
  }) => {
    await gotoDashboard(page);

    await laneSelect(page).selectOption("delivery");
    await subjectSelect(page).selectOption("all");
    await sortSelect(page).selectOption("attempts_high");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          lane: url.searchParams.get("lane"),
          subject: url.searchParams.get("subject"),
          sort: url.searchParams.get("sort"),
        };
      })
      .toEqual({
        lane: "delivery",
        subject: "all",
        sort: "attempts_high",
      });

    await expect(laneSelect(page)).toHaveValue("delivery");
    await expect(subjectSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("attempts_high");
    await expect(page.getByText(/lane: delivery/i).first()).toBeVisible();
    await expect(page.getByText(/subject: all/i).first()).toBeVisible();
    await expect(page.getByText(/sort: attempts high/i).first()).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/teacher\/dashboard$/);
    await expect(laneSelect(page)).toHaveValue("all");
    await expect(subjectSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
  });

  test("@workflow browser coverage keeps teacher dashboard quick filters truthful across lanes", async ({
    page,
  }) => {
    await gotoDashboard(page);

    await page.getByRole("link", { name: /^delivery risk$/i }).click();
    await expect(page).toHaveURL(/lane=delivery/);
    await expect(page).toHaveURL(/sort=attempts_high/);
    await expect(laneSelect(page)).toHaveValue("delivery");
    await expect(sortSelect(page)).toHaveValue("attempts_high");

    await page.getByRole("link", { name: /^weakest topics$/i }).click();
    await expect(page).toHaveURL(/lane=weak_topics/);
    await expect(page).toHaveURL(/sort=score_low/);
    await expect(laneSelect(page)).toHaveValue("weak_topics");
    await expect(sortSelect(page)).toHaveValue("score_low");

    await page.getByRole("link", { name: /^top students$/i }).click();
    await expect(page).toHaveURL(/lane=students/);
    await expect(page).toHaveURL(/sort=score_high/);
    await expect(laneSelect(page)).toHaveValue("students");
    await expect(sortSelect(page)).toHaveValue("score_high");

    await page.getByRole("link", { name: /^wrong questions$/i }).click();
    await expect(page).toHaveURL(/lane=questions/);
    await expect(page).toHaveURL(/sort=wrong_high/);
    await expect(laneSelect(page)).toHaveValue("questions");
    await expect(sortSelect(page)).toHaveValue("wrong_high");

    await page.getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/dashboard$/);
    await expect(laneSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
  });

  test("@workflow browser coverage proves teacher dashboard weak-topic empty state is distinct from loaded state", async ({
    page,
  }) => {
    await gotoDashboard(page, "/teacher/dashboard?lane=weak_topics&subject=__no_such_subject__&sort=score_low");

    await expect(laneSelect(page)).toHaveValue("weak_topics");
    await expect(sortSelect(page)).toHaveValue("score_low");
    await expect(
      page.getByText(/weak topic signals will appear after students submit attempts\./i).first(),
    ).toBeVisible();
  });

  test("@workflow browser coverage keeps teacher dashboard summary counts internally truthful", async ({
    page,
  }) => {
    await gotoDashboard(page);

    const controlsSummaryText =
      (await page.locator(".workspaceFiltersCard .sectionHeading span").first().textContent())?.trim() ?? "";
    const trackedExamsCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Tracked Exams$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const weakTopicsPanelCountText =
      (await page
        .locator(".dashboardPanel")
        .filter({ has: page.getByText(/^Weak Topics Across Learners$/i) })
        .locator(".sectionHeading span")
        .textContent())?.trim() ?? "";

    const examSummariesFromControls = extractLeadingNumber(controlsSummaryText.split("·")[0] ?? "");
    const weakTopicsFromControls = extractLeadingNumber(controlsSummaryText.split("·")[1] ?? "");
    const trackedExamsFromCard = extractLeadingNumber(trackedExamsCardText);
    const weakTopicsFromPanel = extractLeadingNumber(weakTopicsPanelCountText);
    const visibleExamRows = await page
      .locator(".dashboardPanel")
      .filter({ has: page.getByText(/^Exam Delivery Snapshot$/i) })
      .locator(".weakTopicRow")
      .count();

    expect(examSummariesFromControls).not.toBeNull();
    expect(weakTopicsFromControls).not.toBeNull();
    expect(trackedExamsFromCard).not.toBeNull();
    expect(weakTopicsFromPanel).not.toBeNull();

    expect(examSummariesFromControls).toBe(visibleExamRows);
    expect(trackedExamsFromCard).toBeGreaterThanOrEqual(visibleExamRows);
    expect(weakTopicsFromControls).toBe(weakTopicsFromPanel);
  });
});
