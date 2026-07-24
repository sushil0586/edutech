import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectAnyVisible(page: Page, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const locator = page.getByText(pattern).first();
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return locator;
    }
  }

  throw new Error(`Expected one of these patterns to be visible: ${patterns.map(String).join(", ")}`);
}

async function openRouteFromSearch(page: Page, card: Locator) {
  const href = await card.getAttribute("href");
  expect(href).toBeTruthy();
  await gotoWithRuntimeRecovery(page, href!);
  await expect(page).toHaveURL(/\/app\/(results|analytics|practice|attempts|notifications|settings|wallet|subscriptions|exams)(?:\/|$|\?)/);
}

test.describe("Student search workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate route-specific search filters grouping reset and handoff behavior", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/search");
    await expect(page).toHaveURL(/\/app\/search(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /search/i }).first()).toBeVisible();
    await expect(page.getByText(/what student search covers/i).first()).toBeVisible();
    await expect(page.getByText(/search is for discovery, not execution/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to workspace/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open dashboard/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open reports hub/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open analytics/i }).first()).toBeVisible();

    const searchForm = page.locator("form.workspaceFiltersForm").first();
    await expect(searchForm).toBeVisible();
    await expect(searchForm.locator('input[name="q"]')).toBeVisible();
    await expect(searchForm.locator('select[name="section"]')).toBeVisible();
    await expect(searchForm.locator('select[name="source"]')).toBeVisible();
    await expect(searchForm.locator('select[name="sort"]')).toBeVisible();
    await expect(searchForm.locator('select[name="group"]')).toBeVisible();

    await searchForm.locator('input[name="q"]').fill("results");
    await searchForm.locator('select[name="source"]').selectOption("catalog");
    await searchForm.locator('select[name="sort"]').selectOption("title");
    await searchForm.locator('select[name="group"]').selectOption("section");
    await searchForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*source=catalog/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*sort=title/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*group=section/);
    await expect(page.getByText(/source:\s*catalog/i).first()).toBeVisible();
    await expect(page.getByText(/sort:\s*title/i).first()).toBeVisible();
    await expect(page.getByText(/group:\s*section/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /workspace pages/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /group by section/i }).first()).toHaveClass(/workspaceQuickChipActive/);

    const noSearchResults = page.getByText(/no pages or live records matched this search/i).first();
    if (await noSearchResults.isVisible().catch(() => false)) {
      await expect(noSearchResults).toBeVisible();
    } else {
      await expectAnyVisible(page, [/search results/i, /suggested pages/i, /\b\d+\s+result(s)?\b/i]);
      await expect(page.locator(".detailGrid").first()).toBeVisible();
      await expect(page.locator(".detailCard").first()).toBeVisible();

      const sectionHeading = page.locator(".contentCard .sectionHeading").filter({ hasText: /items/i }).first();
      if (await sectionHeading.isVisible().catch(() => false)) {
        await expect(sectionHeading).toBeVisible();
      }

      await openRouteFromSearch(page, page.locator(".detailCard").first());
    }

    await gotoWithRuntimeRecovery(page, "/app/search?q=results&source=catalog&sort=title&group=section");
    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);

    const quickLiveRecords = page.getByRole("link", { name: /live records/i }).first();
    await expect(quickLiveRecords).toBeVisible();
    await quickLiveRecords.click();
    await expect(page).toHaveURL(/\/app\/search\?[^#]*source=live/);
    await expect(page.getByText(/source:\s*live/i).first()).toBeVisible();

    const liveNoMatches = page.getByText(/no pages or live records matched this search/i).first();
    if (await liveNoMatches.isVisible().catch(() => false)) {
      await expect(liveNoMatches).toBeVisible();
    } else {
      await expect(page.locator(".detailCard").first()).toBeVisible();
    }

    await gotoWithRuntimeRecovery(page, "/app/search?q=results");
    await searchForm.locator('select[name="group"]').selectOption("source");
    await searchForm.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/\/app\/search\?[^#]*group=source/);
    await expect(page.getByText(/group:\s*source/i).first()).toBeVisible();

    const hasGroupedSourceHeadings = await page.getByText(/live records|workspace pages/i).first().isVisible().catch(() => false);
    if (hasGroupedSourceHeadings) {
      await expect(page.getByText(/live records|workspace pages/i).first()).toBeVisible();
    }

    await gotoWithRuntimeRecovery(page, "/app/search?q=zzzzzz-not-a-real-student-route");
    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=zzzzzz-not-a-real-student-route/);
    await expect(page.getByText(/no pages or live records matched this search/i).first()).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expect(page).toHaveURL(/\/app\/search(?:\?.*)?$/);
    await expect(page.getByText(/section:\s*all/i).first()).toBeVisible();
    await expect(page.getByText(/source:\s*all/i).first()).toBeVisible();
    await expect(page.getByText(/sort:\s*recommended/i).first()).toBeVisible();
    await expect(page.getByText(/group:\s*none/i).first()).toBeVisible();
  });
});
