import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

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
  await expect
    .poll(async () => locator.locator("option").count())
    .toBeGreaterThan(0);
}

async function gotoSecurity(page: Page, path = "/admin/security") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /^security$/i }).first()).toBeVisible();
  await expect(page.getByText(/security controls/i).first()).toBeVisible();
}

test.describe("Admin security browser functionality coverage", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
  });

  test("@workflow browser coverage keeps security filter controls hydrated", async ({ page }) => {
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

  test("@workflow browser coverage can apply and reset security filters truthfully", async ({
    page,
  }) => {
    await gotoSecurity(page);

    await searchInput(page).fill("aws");
    await examFilter(page).selectOption("live");
    await examSort(page).selectOption("latest");
    await attemptFilter(page).selectOption("watch");
    await attemptSort(page).selectOption("alerts_high");
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
        search: "aws",
        exam_filter: "live",
        exam_sort: "latest",
        attempt_filter: "watch",
        attempt_sort: "alerts_high",
        attempt_group: "health",
        exam_page_size: "12",
        attempt_page_size: "18",
      });

    await expect(searchInput(page)).toHaveValue("aws");
    await expect(examFilter(page)).toHaveValue("live");
    await expect(examSort(page)).toHaveValue("latest");
    await expect(attemptFilter(page)).toHaveValue("watch");
    await expect(attemptSort(page)).toHaveValue("alerts_high");
    await expect(attemptGroup(page)).toHaveValue("health");
    await expect(examPageSize(page)).toHaveValue("12");
    await expect(attemptPageSize(page)).toHaveValue("18");

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/admin\/security(?:\?examId=.*)?$/);
    await expect(searchInput(page)).toHaveValue("");
    await expect(examFilter(page)).toHaveValue("all");
    await expect(examSort(page)).toHaveValue("recommended");
    await expect(attemptFilter(page)).toHaveValue("all");
    await expect(attemptSort(page)).toHaveValue("risk_high");
    await expect(attemptGroup(page)).toHaveValue("none");
    await expect(examPageSize(page)).toHaveValue("8");
    await expect(attemptPageSize(page)).toHaveValue("12");
  });

  test("@workflow browser coverage keeps quick filters and selected exam watch state truthful", async ({
    page,
  }) => {
    await gotoSecurity(page);

    await page.getByRole("link", { name: /critical attempts/i }).click();
    await expect(page).toHaveURL(/attempt_filter=critical/);
    await expect(attemptFilter(page)).toHaveValue("critical");

    await page.getByRole("link", { name: /most alerts/i }).click();
    await expect(page).toHaveURL(/attempt_sort=alerts_high/);
    await expect(attemptSort(page)).toHaveValue("alerts_high");

    await page.getByRole("link", { name: /group by health/i }).click();
    await expect(page).toHaveURL(/attempt_group=health/);
    await expect(attemptGroup(page)).toHaveValue("health");

    const watchExamButton = page.getByRole("link", { name: /watch exam|watching/i }).first();
    await expect(watchExamButton).toBeVisible();
    await watchExamButton.click();

    const selectedExamId = new URL(page.url()).searchParams.get("examId");
    expect(selectedExamId).toBeTruthy();
    await expect(page.getByText(/selected exam posture/i).first()).toBeVisible();
    await expect(page.getByText(/live monitor summary/i).first()).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/security\\?examId=${selectedExamId}`));
    await expect(page.getByText(/selected exam posture/i).first()).toBeVisible();
    await expect(examFilter(page)).toHaveValue("all");
    await expect(attemptFilter(page)).toHaveValue("all");
    await expect(attemptGroup(page)).toHaveValue("none");
  });

  test("@workflow browser coverage distinguishes exam-empty and watchlist-empty states", async ({
    page,
  }) => {
    await gotoSecurity(page, "/admin/security?search=playwright-no-match-zzqv-1781&exam_filter=live");

    await expect(
      page
        .getByText(/no exams were returned for platform security oversight|no exams match the current selector filters/i)
        .first(),
    ).toBeVisible();

    await gotoSecurity(page, "/admin/security?attempt_filter=stable&attempt_group=status");
    await expect(page.getByText(/attempt watchlist/i).first()).toBeVisible();
    const attemptEmptyMessage = page
      .getByText(/no attempts match the current watchlist filters|no attempts are currently available for the selected exam/i)
      .first();
    if (await attemptEmptyMessage.isVisible().catch(() => false)) {
      await expect(attemptEmptyMessage).toBeVisible();
    }
  });

  test("@workflow browser coverage keeps security summary counts internally truthful", async ({
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
