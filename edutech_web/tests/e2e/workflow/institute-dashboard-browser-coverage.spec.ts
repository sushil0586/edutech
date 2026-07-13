import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function focusSelect(page: Page) {
  return page.getByRole("combobox", { name: /focus lane/i });
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

async function gotoDashboard(page: Page, path = "/institute/dashboard") {
  await page.goto(path);
  await expect(page.getByText(/institute control/i).first()).toBeVisible();
  await expect(page.getByText(/dashboard focus/i).first()).toBeVisible();
}

function priorityLaneCards(page: Page) {
  return page.locator(".adminPriorityGrid .adminPriorityCard");
}

function quickFilters(page: Page) {
  return page.locator(".workspaceFilterQuickChips").first();
}

test.describe("Institute dashboard browser functionality coverage", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser coverage keeps institute dashboard controls hydrated", async ({ page }) => {
    await gotoDashboard(page);

    await expectSelectHasOptions(focusSelect(page));
    await expectSelectHasOptions(sortSelect(page));

    await expect(focusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");

    expect(await getOptionValues(focusSelect(page))).toEqual([
      "all",
      "people",
      "academics",
      "assessments",
    ]);
    expect(await getOptionValues(sortSelect(page))).toEqual([
      "recommended",
      "highest_value",
      "title",
    ]);
  });

  test("@workflow browser coverage can apply and reset institute dashboard filters truthfully", async ({
    page,
  }) => {
    await gotoDashboard(page);

    await focusSelect(page).selectOption("assessments");
    await sortSelect(page).selectOption("title");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          focus: url.searchParams.get("focus"),
          sort: url.searchParams.get("sort"),
        };
      })
      .toEqual({
        focus: "assessments",
        sort: "title",
      });

    await expect(focusSelect(page)).toHaveValue("assessments");
    await expect(sortSelect(page)).toHaveValue("title");
    await expect(page.getByText(/focus:\s*assessments/i).first()).toBeVisible();
    await expect(page.getByText(/sort:\s*title/i).first()).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/dashboard$/);
    await expect(focusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
  });

  test("@workflow browser coverage keeps institute dashboard quick filters truthful", async ({ page }) => {
    await gotoDashboard(page);

    await quickFilters(page).getByRole("link", { name: /^academics$/i }).click();
    await expect(page).toHaveURL(/focus=academics/);
    await expect(focusSelect(page)).toHaveValue("academics");
    await expect(sortSelect(page)).toHaveValue("recommended");

    await quickFilters(page).getByRole("link", { name: /^assessments$/i }).click();
    await expect(page).toHaveURL(/focus=assessments/);
    await expect(focusSelect(page)).toHaveValue("assessments");

    await quickFilters(page).getByRole("link", { name: /^people$/i }).click();
    await expect(page).toHaveURL(/focus=people/);
    await expect(focusSelect(page)).toHaveValue("people");

    await quickFilters(page).getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/institute\/dashboard$/);
    await expect(focusSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
  });

  test("@workflow browser coverage keeps institute dashboard visible priority lanes truthful", async ({
    page,
  }) => {
    await gotoDashboard(page, "/institute/dashboard?focus=people&sort=title");

    await expect(focusSelect(page)).toHaveValue("people");
    await expect(sortSelect(page)).toHaveValue("title");
    await expect(priorityLaneCards(page)).toHaveCount(1);
    await expect(priorityLaneCards(page).getByText(/^People operations$/i)).toBeVisible();
    await expect(priorityLaneCards(page).getByRole("link", { name: /open people/i })).toBeVisible();

    await gotoDashboard(page, "/institute/dashboard?focus=academics&sort=title");

    await expect(focusSelect(page)).toHaveValue("academics");
    await expect(priorityLaneCards(page)).toHaveCount(1);
    await expect(priorityLaneCards(page).getByText(/^Academic setup$/i)).toBeVisible();
    await expect(priorityLaneCards(page).getByRole("link", { name: /open academic setup/i })).toBeVisible();

    await gotoDashboard(page, "/institute/dashboard?focus=assessments&sort=title");

    await expect(focusSelect(page)).toHaveValue("assessments");
    await expect(priorityLaneCards(page)).toHaveCount(1);
    await expect(priorityLaneCards(page).getByText(/^Assessments$/i)).toBeVisible();
    await expect(priorityLaneCards(page).getByRole("link", { name: /open exams/i })).toBeVisible();
  });

  test("@workflow browser coverage keeps institute dashboard summary counts internally truthful", async ({
    page,
  }) => {
    await gotoDashboard(page);

    const dashboardFocusSummaryText =
      (await page.locator(".workspaceFiltersCard .sectionHeading span").first().textContent())?.trim() ?? "";
    const visibleLaneCount = await priorityLaneCards(page).count();

    const peopleInScopeText =
      (await page.locator(".adminInstituteHeroMeta span").filter({ hasText: /people in scope/i }).textContent()) ??
      "";
    const studentsCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Students$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const teachersCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Teachers$/i) })
        .locator("strong")
        .textContent()) ?? "";

    const lanesFromSummary = extractLeadingNumber(dashboardFocusSummaryText);
    const peopleFromHero = extractLeadingNumber(peopleInScopeText);
    const studentsFromCard = extractLeadingNumber(studentsCardText);
    const teachersFromCard = extractLeadingNumber(teachersCardText);

    expect(lanesFromSummary).not.toBeNull();
    expect(peopleFromHero).not.toBeNull();
    expect(studentsFromCard).not.toBeNull();
    expect(teachersFromCard).not.toBeNull();

    expect(lanesFromSummary).toBe(visibleLaneCount);
    expect(peopleFromHero).toBe((studentsFromCard ?? 0) + (teachersFromCard ?? 0));
  });
});
