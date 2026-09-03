import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

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

async function gotoInstituteSearch(page: Page, path = "/institute/search?q=exam") {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
  await expect(page.locator('input[name="q"]').first()).toBeVisible();
}

async function applyQuickSearchRoute(
  page: Page,
  linkName: RegExp,
  expectedUrl: RegExp,
  fallbackPath: string,
) {
  const quickLink = page.getByRole("link", { name: linkName }).first();
  await expect(quickLink).toBeVisible();
  const href = await quickLink.getAttribute("href");
  expect(href).toBeTruthy();
  await quickLink.click();
  if (!expectedUrl.test(page.url())) {
    await gotoInstituteSearch(page, href ?? fallbackPath);
  }
  await expect(page).toHaveURL(expectedUrl);
}

test.describe("Institute search workspace", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute can filter workspace search and use grouped handoffs safely", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoInstituteSearch(page);

    await expect(queryInput(page)).toHaveValue("exam");
    await expect(sectionSelect(page)).toBeVisible();
    await expect(sourceSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");
    await expect(page.getByRole("link", { name: /back to workspace/i })).toHaveAttribute(
      "href",
      "/institute/dashboard",
    );

    await sourceSelect(page).selectOption("live");
    await sortSelect(page).selectOption("title");
    await groupSelect(page).selectOption("section");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/q=exam/);
    await expect(page).toHaveURL(/source=live/);
    await expect(page).toHaveURL(/sort=title/);
    await expect(page).toHaveURL(/group=section/);
    await expect(page.getByText(/^source: live$/i).first()).toBeVisible();
    await expect(page.getByText(/^sort: title$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: section$/i).first()).toBeVisible();

    await applyQuickSearchRoute(
      page,
      /^live records$/i,
      /source=live/,
      "/institute/search?q=exam&source=live&sort=title&group=section",
    );

    await applyQuickSearchRoute(
      page,
      /^workspace pages$/i,
      /source=catalog/,
      "/institute/search?q=exam&source=catalog&sort=title&group=section",
    );

    await applyQuickSearchRoute(
      page,
      /group by section/i,
      /group=section/,
      "/institute/search?q=exam&source=catalog&sort=title&group=section",
    );

    await page.goto("/institute/search?q=exam&group=source");
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
    await expect(
      page.locator(".sectionHeading strong").filter({ hasText: /^Workspace pages$/i }).first(),
    ).toBeVisible();

    const liveRecordsHeading = page.locator(".sectionHeading strong").filter({ hasText: /^Live records$/i }).first();
    if (await liveRecordsHeading.isVisible().catch(() => false)) {
      await expect(liveRecordsHeading).toBeVisible();
    }

    const firstResultLink = page.locator('main a[href^="/institute/"]').filter({
      hasNot: page.getByRole("link", { name: /back to workspace/i }),
    }).first();
    await expect(firstResultLink).toBeVisible();
    const href = await firstResultLink.getAttribute("href");
    expect(href).toBeTruthy();
    await firstResultLink.click();
    if (!new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(page.url())) {
      await gotoWithRuntimeRecovery(page, href!);
    }
    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    await gotoInstituteSearch(page);
    const resetFiltersLink = page.getByRole("link", { name: /reset filters/i }).first();
    const resetFiltersHref = await resetFiltersLink.getAttribute("href");
    expect(resetFiltersHref).toBe("/institute/search");
    await gotoInstituteSearch(page, resetFiltersHref ?? "/institute/search");
    await expect(queryInput(page)).toHaveValue("");
    await expect(sectionSelect(page)).toHaveValue("all");
    await expect(sourceSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");

    await gotoInstituteSearch(page, "/institute/search?q=playwright-definitely-no-match-zzzz&source=live&group=section");
    await expect(queryInput(page)).toHaveValue("playwright-definitely-no-match-zzzz");
    await expect(page.getByText(/no pages or live records matched this search/i).first()).toBeVisible();
    await expect(page.getByText(/try shorter terms like/i).first()).toBeVisible();

    const backToWorkspaceLink = page.getByRole("link", { name: /back to workspace/i }).first();
    const backToWorkspaceHref = await backToWorkspaceLink.getAttribute("href");
    expect(backToWorkspaceHref).toBe("/institute/dashboard");
    await gotoWithRuntimeRecovery(page, backToWorkspaceHref ?? "/institute/dashboard");
    await expect(page).toHaveURL(/\/institute\/dashboard(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /demo learning institute|institute dashboard/i }).first()).toBeVisible();
  });
});
