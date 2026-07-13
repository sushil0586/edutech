import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function queryInput(page: Page) {
  return page.locator('input[name="q"]').first();
}

function sectionSelect(page: Page) {
  return page.locator('select[name="section"]').first();
}

function sourceSelect(page: Page) {
  return page.locator('select[name="source"]').first();
}

function sortSelect(page: Page) {
  return page.locator('select[name="sort"]').first();
}

function groupSelect(page: Page) {
  return page.locator('select[name="group"]').first();
}

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => locator.locator("option").count())
    .toBeGreaterThan(0);
}

async function gotoSearch(page: Page, path = "/admin/search?q=exam") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
  await expect(page.getByText(/search controls/i).first()).toBeVisible();
}

test.describe("Admin search browser functionality coverage", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
  });

  test("@workflow browser coverage keeps admin search controls hydrated", async ({ page }) => {
    await gotoSearch(page);

    await expect(queryInput(page)).toHaveValue("exam");
    await expectSelectHasOptions(sectionSelect(page));
    await expectSelectHasOptions(sourceSelect(page));
    await expectSelectHasOptions(sortSelect(page));
    await expectSelectHasOptions(groupSelect(page));

    await expect(sectionSelect(page)).toHaveValue("all");
    await expect(sourceSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");
  });

  test("@workflow browser coverage can apply and reset admin search filters truthfully", async ({
    page,
  }) => {
    await gotoSearch(page);

    await sourceSelect(page).selectOption("live");
    await sortSelect(page).selectOption("title");
    await groupSelect(page).selectOption("section");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          q: url.searchParams.get("q"),
          source: url.searchParams.get("source"),
          sort: url.searchParams.get("sort"),
          group: url.searchParams.get("group"),
        };
      })
      .toEqual({
        q: "exam",
        source: "live",
        sort: "title",
        group: "section",
      });

    await expect(queryInput(page)).toHaveValue("exam");
    await expect(sourceSelect(page)).toHaveValue("live");
    await expect(sortSelect(page)).toHaveValue("title");
    await expect(groupSelect(page)).toHaveValue("section");

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/admin\/search$/);
    await expect(queryInput(page)).toHaveValue("");
    await expect(sectionSelect(page)).toHaveValue("all");
    await expect(sourceSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");
  });

  test("@workflow browser coverage keeps admin search quick filters truthful", async ({ page }) => {
    await gotoSearch(page);

    await page.getByRole("link", { name: /^live records$/i }).click();
    await expect(page).toHaveURL(/source=live/);
    await expect(sourceSelect(page)).toHaveValue("live");

    await page.getByRole("link", { name: /^workspace pages$/i }).click();
    await expect(page).toHaveURL(/source=catalog/);
    await expect(sourceSelect(page)).toHaveValue("catalog");

    await page.getByRole("link", { name: /group by section/i }).click();
    await expect(page).toHaveURL(/group=section/);
    await expect(groupSelect(page)).toHaveValue("section");

    await page.getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/admin\/search\?q=exam$/);
    await expect(sourceSelect(page)).toHaveValue("all");
    await expect(groupSelect(page)).toHaveValue("none");
  });

  test("@workflow browser coverage proves admin search no-results state is distinct from normal results", async ({
    page,
  }) => {
    await gotoSearch(page, "/admin/search?q=playwright-definitely-no-match-zzzz&source=live&group=section");

    await expect(queryInput(page)).toHaveValue("playwright-definitely-no-match-zzzz");
    await expect(sourceSelect(page)).toHaveValue("live");
    await expect(groupSelect(page)).toHaveValue("section");
    await expect(
      page.getByText(/no pages or live records matched this search/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/try shorter terms like/i).first()).toBeVisible();
  });

  test("@workflow browser coverage keeps admin search summary counts internally truthful", async ({
    page,
  }) => {
    await gotoSearch(page);

    const controlsSummaryText =
      (await page.locator(".workspaceFiltersCard .sectionHeading span").first().textContent())?.trim() ?? "";
    const resultsHeadingText =
      (await page
        .locator(".contentCard .sectionHeading strong")
        .filter({ hasText: /result|suggested pages/i })
        .last()
        .textContent())?.trim() ?? "";
    const resultCardsCount = await page.locator(".detailGrid .detailCard").count();

    const shownFromControls = extractLeadingNumber(controlsSummaryText);
    const resultsFromHeading = extractLeadingNumber(resultsHeadingText);

    expect(shownFromControls).not.toBeNull();
    expect(resultsFromHeading).not.toBeNull();

    expect(shownFromControls).toBe(resultsFromHeading);
    expect(resultCardsCount).toBe(resultsFromHeading);
  });
});
