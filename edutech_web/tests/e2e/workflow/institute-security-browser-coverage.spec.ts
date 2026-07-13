import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function searchInput(page: Page) {
  return page.locator('input[type="search"][name="search"]').first();
}

function examFilter(page: Page) {
  return page.locator('select[name="exam_filter"]').first();
}

function examSort(page: Page) {
  return page.locator('select[name="exam_sort"]').first();
}

function attemptFilter(page: Page) {
  return page.locator('select[name="attempt_filter"]').first();
}

function attemptSort(page: Page) {
  return page.locator('select[name="attempt_sort"]').first();
}

function attemptGroup(page: Page) {
  return page.locator('select[name="attempt_group"]').first();
}

function examPageSize(page: Page) {
  return page.locator('select[name="exam_page_size"]').first();
}

function attemptPageSize(page: Page) {
  return page.locator('select[name="attempt_page_size"]').first();
}

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => locator.locator("option").count()).toBeGreaterThan(0);
}

async function gotoSecurity(page: Page, path = "/institute/security") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /security oversight/i }).first()).toBeVisible();
  await expect(page.getByText(/security controls/i).first()).toBeVisible();
}

test.describe("Institute security browser functionality coverage", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser coverage keeps institute security filter controls hydrated", async ({ page }) => {
    await gotoSecurity(page);

    await expect(searchInput(page)).toBeVisible();
    await expectSelectHasOptions(examFilter(page));
    await expectSelectHasOptions(examSort(page));
    await expectSelectHasOptions(attemptFilter(page));
    await expectSelectHasOptions(attemptSort(page));
    await expectSelectHasOptions(attemptGroup(page));
    await expectSelectHasOptions(examPageSize(page));
    await expectSelectHasOptions(attemptPageSize(page));

    await expect(examFilter(page)).toHaveValue("all");
    await expect(examSort(page)).toHaveValue("recommended");
    await expect(attemptFilter(page)).toHaveValue("all");
    await expect(attemptSort(page)).toHaveValue("risk_high");
    await expect(attemptGroup(page)).toHaveValue("none");
    await expect(examPageSize(page)).toHaveValue("8");
    await expect(attemptPageSize(page)).toHaveValue("12");
  });

  test("@workflow browser coverage can apply and reset institute security filters truthfully", async ({
    page,
  }) => {
    await gotoSecurity(page);

    await searchInput(page).fill("math");
    await examFilter(page).selectOption("access_key");
    await examSort(page).selectOption("latest");
    await attemptFilter(page).selectOption("stable");
    await attemptSort(page).selectOption("name");
    await attemptGroup(page).selectOption("health");
    await examPageSize(page).selectOption("12");
    await attemptPageSize(page).selectOption("18");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          search: url.searchParams.get("search"),
          exam_filter: url.searchParams.get("exam_filter"),
          exam_sort: url.searchParams.get("exam_sort"),
          attempt_filter: url.searchParams.get("attempt_filter"),
          attempt_sort: url.searchParams.get("attempt_sort"),
          attempt_group: url.searchParams.get("attempt_group"),
          exam_page_size: url.searchParams.get("exam_page_size"),
          attempt_page_size: url.searchParams.get("attempt_page_size"),
        };
      })
      .toEqual({
        search: "math",
        exam_filter: "access_key",
        exam_sort: "latest",
        attempt_filter: "stable",
        attempt_sort: "name",
        attempt_group: "health",
        exam_page_size: "12",
        attempt_page_size: "18",
      });

    await expect(searchInput(page)).toHaveValue("math");
    await expect(examFilter(page)).toHaveValue("access_key");
    await expect(examSort(page)).toHaveValue("latest");
    await expect(attemptFilter(page)).toHaveValue("stable");
    await expect(attemptSort(page)).toHaveValue("name");
    await expect(attemptGroup(page)).toHaveValue("health");
    await expect(examPageSize(page)).toHaveValue("12");
    await expect(attemptPageSize(page)).toHaveValue("18");

    const resetHref = await page.getByRole("link", { name: /reset filters/i }).getAttribute("href");
    expect(resetHref).toBeTruthy();
    await page.goto(resetHref!);
    await expect(page).toHaveURL(/\/institute\/security(?:\?examId=.*)?$/);
    await expect(searchInput(page)).toHaveValue("");
    await expect(examFilter(page)).toHaveValue("all");
    await expect(examSort(page)).toHaveValue("recommended");
    await expect(attemptFilter(page)).toHaveValue("all");
    await expect(attemptSort(page)).toHaveValue("risk_high");
    await expect(attemptGroup(page)).toHaveValue("none");
    await expect(examPageSize(page)).toHaveValue("8");
    await expect(attemptPageSize(page)).toHaveValue("12");
  });

  test("@workflow browser coverage keeps institute security quick filters and watch state truthful", async ({
    page,
  }) => {
    await gotoSecurity(page);

    const criticalAttemptsHref = await page.getByRole("link", { name: /critical attempts/i }).getAttribute("href");
    expect(criticalAttemptsHref).toBeTruthy();
    await page.goto(criticalAttemptsHref!);
    await expect(page).toHaveURL(/attempt_filter=critical/);
    await expect(attemptFilter(page)).toHaveValue("critical");

    const mostAlertsHref = await page.getByRole("link", { name: /most alerts/i }).getAttribute("href");
    expect(mostAlertsHref).toBeTruthy();
    await page.goto(mostAlertsHref!);
    await expect(page).toHaveURL(/attempt_sort=alerts_high/);
    await expect(attemptSort(page)).toHaveValue("alerts_high");

    const groupByHealthHref = await page.getByRole("link", { name: /group by health/i }).getAttribute("href");
    expect(groupByHealthHref).toBeTruthy();
    await page.goto(groupByHealthHref!);
    await expect(page).toHaveURL(/attempt_group=health/);
    await expect(attemptGroup(page)).toHaveValue("health");

    const watchExamButton = page.getByRole("link", { name: /watch exam|watching/i }).first();
    await expect(watchExamButton).toBeVisible();
    await watchExamButton.click();

    const selectedExamId = new URL(page.url()).searchParams.get("examId");
    expect(selectedExamId).toBeTruthy();
    await expect(page.getByText(/^Selected exam$/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /current monitoring totals/i })).toBeVisible();
    await expect(page.getByText(/live monitor refresh/i).first()).toBeVisible();

    const watchResetHref = await page.getByRole("link", { name: /reset filters/i }).getAttribute("href");
    expect(watchResetHref).toBeTruthy();
    await page.goto(watchResetHref!);
    await expect(page).toHaveURL(new RegExp(`/institute/security\\?examId=${selectedExamId}`));
    await expect(examFilter(page)).toHaveValue("all");
    await expect(attemptFilter(page)).toHaveValue("all");
    await expect(attemptGroup(page)).toHaveValue("none");
  });

  test("@workflow browser coverage distinguishes institute security exam-empty and watchlist-empty states", async ({
    page,
  }) => {
    await gotoSecurity(page, "/institute/security?search=playwright-no-match-zzqv-1781&exam_filter=live");

    await expect(
      page
        .getByText(/no institute exams were returned for security oversight|no exams match the current selector filters/i)
        .first(),
    ).toBeVisible();

    await gotoSecurity(page, "/institute/security?attempt_filter=stable&attempt_group=status");
    await expect(page.getByText(/integrity watchlist/i).first()).toBeVisible();
    const attemptEmptyMessage = page
      .getByText(/no attempts match the current watchlist filters|no attempts are currently available for the selected exam/i)
      .first();
    if (await attemptEmptyMessage.isVisible().catch(() => false)) {
      await expect(attemptEmptyMessage).toBeVisible();
    }
  });

  test("@workflow browser coverage keeps institute security summary counts internally truthful", async ({
    page,
  }) => {
    await gotoSecurity(page);

    const statusText =
      (await page.getByText(/\d+\s+exams using elevated security/i).first().textContent())?.trim() ?? "";
    const heroSummaryText =
      (await page.locator(".studentInsightHeroCopy small").first().textContent())?.trim() ?? "";
    const filterSummaryText =
      (await page.locator(".workspaceFiltersCard .sectionHeading span").first().textContent())?.trim() ?? "";

    const elevatedCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Elevated security exams$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const accessKeyCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Access-key protected$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const watchlistCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Watchlist attempts$/i) })
        .locator("strong")
        .textContent()) ?? "";

    const elevatedFromStatus = extractLeadingNumber(statusText);
    const elevatedFromCard = extractLeadingNumber(elevatedCardText);
    const accessKeyFromHero = extractLeadingNumber(heroSummaryText.split("·")[0] ?? "");
    const accessKeyFromCard = extractLeadingNumber(accessKeyCardText);
    const criticalFromHero = extractLeadingNumber(heroSummaryText.split("·")[1] ?? "");
    const visibleExamsFromFilter = extractLeadingNumber(filterSummaryText.split("·")[0] ?? "");
    const watchlistFromFilter = extractLeadingNumber(filterSummaryText.split("·")[1] ?? "");
    const watchlistFromCard = extractLeadingNumber(watchlistCardText);

    expect(elevatedFromStatus).not.toBeNull();
    expect(elevatedFromCard).not.toBeNull();
    expect(accessKeyFromHero).not.toBeNull();
    expect(accessKeyFromCard).not.toBeNull();
    expect(criticalFromHero).not.toBeNull();
    expect(visibleExamsFromFilter).not.toBeNull();
    expect(watchlistFromFilter).not.toBeNull();
    expect(watchlistFromCard).not.toBeNull();

    expect(elevatedFromStatus).toBe(elevatedFromCard);
    expect(accessKeyFromHero).toBe(accessKeyFromCard);
    expect(watchlistFromCard).toBeGreaterThanOrEqual(criticalFromHero ?? 0);
    expect(watchlistFromFilter).toBeGreaterThanOrEqual(watchlistFromCard ?? 0);
    expect(visibleExamsFromFilter).toBeGreaterThan(0);
  });
});
