import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function laneSelect(page: Page) {
  return page.getByRole("combobox", { name: /focus lane/i });
}

function subjectSelect(page: Page) {
  return page.getByRole("combobox", { name: /subject/i });
}

function sortSelect(page: Page) {
  return page.getByRole("combobox", { name: /sort by/i });
}

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => locator.locator("option").count())
    .toBeGreaterThan(0);
}

async function getOptionValues(locator: Locator) {
  return locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
}

async function gotoReports(page: Page, path = "/admin/reports") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
  await expect(page.getByText(/report controls/i).first()).toBeVisible();
}

test.describe("Admin reports browser functionality coverage", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
  });

  test("@workflow browser coverage keeps reports filter controls hydrated", async ({ page }) => {
    await gotoReports(page);

    await expectSelectHasOptions(laneSelect(page));
    await expectSelectHasOptions(subjectSelect(page));
    await expectSelectHasOptions(sortSelect(page));

    await expect(laneSelect(page)).toHaveValue("all");
    await expect(subjectSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");

    const laneOptions = await getOptionValues(laneSelect(page));
    const subjectOptions = await getOptionValues(subjectSelect(page));
    const sortOptions = await getOptionValues(sortSelect(page));

    expect(laneOptions).toEqual(["all", "publication", "performance", "weak_topics", "students"]);
    expect(subjectOptions.length).toBeGreaterThan(0);
    expect(sortOptions).toEqual([
      "recommended",
      "backlog_high",
      "score_low",
      "score_high",
      "attempts_high",
    ]);
  });

  test("@workflow browser coverage can apply and reset reports filters truthfully", async ({
    page,
  }) => {
    await gotoReports(page);

    const subjects = await getOptionValues(subjectSelect(page));
    const scopedSubject = subjects.find((value) => value !== "all") ?? "all";

    await laneSelect(page).selectOption("weak_topics");
    await subjectSelect(page).selectOption(scopedSubject);
    await sortSelect(page).selectOption("score_low");
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
        lane: "weak_topics",
        subject: scopedSubject,
        sort: "score_low",
      });

    await expect(laneSelect(page)).toHaveValue("weak_topics");
    await expect(subjectSelect(page)).toHaveValue(scopedSubject);
    await expect(sortSelect(page)).toHaveValue("score_low");
    await expect(page.getByText(/lane: weak topics/i).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`subject: ${scopedSubject}`, "i")).first()).toBeVisible();
    await expect(page.getByText(/sort: score low/i).first()).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports$/);
    await expect(laneSelect(page)).toHaveValue("all");
    await expect(subjectSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
  });

  test("@workflow browser coverage keeps quick filters truthful across report lanes", async ({
    page,
  }) => {
    await gotoReports(page);

    await page.getByRole("link", { name: /pending publication/i }).click();
    await expect(page).toHaveURL(/lane=publication/);
    await expect(page).toHaveURL(/sort=backlog_high/);
    await expect(laneSelect(page)).toHaveValue("publication");
    await expect(sortSelect(page)).toHaveValue("backlog_high");

    await page.getByRole("link", { name: /lowest mastery/i }).click();
    await expect(page).toHaveURL(/lane=weak_topics/);
    await expect(page).toHaveURL(/sort=score_low/);
    await expect(laneSelect(page)).toHaveValue("weak_topics");
    await expect(sortSelect(page)).toHaveValue("score_low");

    await page.getByRole("link", { name: /most attempts/i }).click();
    await expect(page).toHaveURL(/lane=performance/);
    await expect(page).toHaveURL(/sort=attempts_high/);
    await expect(laneSelect(page)).toHaveValue("performance");
    await expect(sortSelect(page)).toHaveValue("attempts_high");

    await page.getByRole("link", { name: /top performers/i }).click();
    await expect(page).toHaveURL(/lane=students/);
    await expect(page).toHaveURL(/sort=score_high/);
    await expect(laneSelect(page)).toHaveValue("students");
    await expect(sortSelect(page)).toHaveValue("score_high");

    await page.getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports$/);
    await expect(laneSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
  });

  test("@workflow browser coverage proves weak-topic empty state is distinct from loaded state", async ({
    page,
  }) => {
    await gotoReports(page, "/admin/reports?lane=weak_topics&subject=__no_such_subject__&sort=score_low");

    await expect(laneSelect(page)).toHaveValue("weak_topics");
    await expect(sortSelect(page)).toHaveValue("score_low");
    await expect(page.getByRole("heading", { name: /platform-level academic pressure points/i })).toBeVisible();
    await expect(
      page.getByText(/no weak-topic analytics matched the current subject and sorting controls/i).first(),
    ).toBeVisible();
  });

  test("@workflow browser coverage keeps reports summary counts internally truthful", async ({
    page,
  }) => {
    await gotoReports(page);

    const statusLabelText =
      (await page.getByText(/\d+\s+tracked exams/i).first().textContent())?.trim() ?? "";
    const trackedCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Tracked exams$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const heroSummaryText =
      (await page.locator(".studentInsightHeroCopy small").first().textContent())?.trim() ?? "";
    const pendingPublicationCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Pending publication queues$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const filterSummaryText =
      (await page.locator(".workspaceFiltersCard .sectionHeading span").first().textContent())?.trim() ?? "";

    const trackedFromStatus = extractLeadingNumber(statusLabelText);
    const trackedFromCard = extractLeadingNumber(trackedCardText);
    const resultSummariesFromHero = extractLeadingNumber(heroSummaryText);
    const pendingFromHero = extractLeadingNumber(heroSummaryText.split("·")[1] ?? "");
    const pendingFromCard = extractLeadingNumber(pendingPublicationCardText);
    const backlogFromFilter = extractLeadingNumber(filterSummaryText);

    expect(trackedFromStatus).not.toBeNull();
    expect(trackedFromCard).not.toBeNull();
    expect(resultSummariesFromHero).not.toBeNull();
    expect(pendingFromHero).not.toBeNull();
    expect(pendingFromCard).not.toBeNull();
    expect(backlogFromFilter).not.toBeNull();

    expect(trackedFromStatus).toBe(trackedFromCard);
    expect(pendingFromHero).toBe(pendingFromCard);
    expect(backlogFromFilter).toBeGreaterThanOrEqual(pendingFromCard ?? 0);
    expect(resultSummariesFromHero).toBeGreaterThanOrEqual(pendingFromHero ?? 0);
  });
});
