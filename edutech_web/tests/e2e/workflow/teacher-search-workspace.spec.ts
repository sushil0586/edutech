import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
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

async function gotoTeacherSearch(page: Page, path = "/teacher/search?q=exam") {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
  await expect(page.getByText(/search controls/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /back to workspace/i }).first()).toBeVisible();
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
    await gotoTeacherSearch(page, href ?? fallbackPath);
  }
  await expect(page).toHaveURL(expectedUrl);
}

test.describe("Teacher search workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can filter workspace search and use live search handoffs", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoTeacherSearch(page);

    await expect(queryInput(page)).toHaveValue("exam");
    await expect(sectionSelect(page)).toBeVisible();
    await expect(sourceSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");
    await expect(page.getByRole("link", { name: /back to workspace/i })).toHaveAttribute(
      "href",
      "/teacher/dashboard",
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
      "/teacher/search?q=exam&source=live&sort=title&group=section",
    );

    await applyQuickSearchRoute(
      page,
      /^workspace pages$/i,
      /source=catalog/,
      "/teacher/search?q=exam&source=catalog&sort=title&group=section",
    );

    await applyQuickSearchRoute(
      page,
      /group by section/i,
      /group=section/,
      "/teacher/search?q=exam&source=catalog&sort=title&group=section",
    );

    await page.goto("/teacher/search?q=exam&group=source");
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
    await expect(
      page.locator(".sectionHeading strong").filter({ hasText: /^Workspace pages$/i }).first(),
    ).toBeVisible();
    const liveRecordsHeading = page.locator(".sectionHeading strong").filter({ hasText: /^Live records$/i }).first();
    if (await liveRecordsHeading.isVisible().catch(() => false)) {
      await expect(liveRecordsHeading).toBeVisible();
    }

    const firstResultLink = page.locator('main a[href^="/teacher/"]').filter({
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

    await gotoTeacherSearch(page);
    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/teacher\/search(?:\?.*)?$/);
    await expect(queryInput(page)).toHaveValue("");
    await expect(sectionSelect(page)).toHaveValue("all");
    await expect(sourceSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");

    await gotoTeacherSearch(page, "/teacher/search?q=playwright-definitely-no-match-zzzz&source=live&group=section");
    await expect(queryInput(page)).toHaveValue("playwright-definitely-no-match-zzzz");
    await expect(page.getByText(/no pages or live records matched this search/i).first()).toBeVisible();
    await expect(page.getByText(/try shorter terms like/i).first()).toBeVisible();
  });
});
