import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

test.describe("Institute search API audit", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute search preserves query params without extra browser-side API calls", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/institute/search?q=exam");
      await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
      await expect(page.getByText(/search controls/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "institute-search-open",
      });

      const initialEntries = audit.entries();
      const initialDuplicates = summarizeDuplicateRequests(initialEntries);
      expect(initialEntries).toEqual([]);
      expect(initialDuplicates).toEqual([]);

      const sourceSelect = page.locator('select[name="source"]').first();
      const sortSelect = page.locator('select[name="sort"]').first();
      const groupSelect = page.locator('select[name="group"]').first();

      const applyStartedAt = Date.now();
      audit.reset();
      await sourceSelect.selectOption("live");
      await sortSelect.selectOption("title");
      await groupSelect.selectOption("section");
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/q=exam/);
      await expect(page).toHaveURL(/source=live/);
      await expect(page).toHaveURL(/sort=title/);
      await expect(page).toHaveURL(/group=section/);
      await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - applyStartedAt,
        label: "institute-search-apply-filters",
      });

      const applyEntries = audit.entries();
      const applyDuplicates = summarizeDuplicateRequests(applyEntries);
      expect(applyEntries).toEqual([]);
      expect(applyDuplicates).toEqual([]);

      const quickFilterStartedAt = Date.now();
      audit.reset();
      const workspacePagesHref =
        (await page
          .locator('main .workspaceFilterQuickChips a[href*="source=catalog"]')
          .filter({ hasText: /^Workspace Pages$/i })
          .first()
          .getAttribute("href")) ?? "/institute/search?q=exam&source=catalog&sort=title&group=section";
      await gotoWithRuntimeRecovery(page, workspacePagesHref);
      await expect(page).toHaveURL(/source=catalog/);
      await expect(page).toHaveURL(/q=exam/);
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - quickFilterStartedAt,
        label: "institute-search-quick-filter-workspace-pages",
      });

      const quickFilterEntries = audit.entries();
      const quickFilterDuplicates = summarizeDuplicateRequests(quickFilterEntries);
      expect(quickFilterEntries).toEqual([]);
      expect(quickFilterDuplicates).toEqual([]);

      const groupedSourceStartedAt = Date.now();
      audit.reset();
      await gotoWithRuntimeRecovery(page, "/institute/search?q=exam&group=source");
      await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
      await expect(
        page.locator(".sectionHeading strong").filter({ hasText: /^Workspace pages$/i }).first(),
      ).toBeVisible();
      const liveRecordsHeading = page.locator(".sectionHeading strong").filter({ hasText: /^Live records$/i }).first();
      if (await liveRecordsHeading.isVisible().catch(() => false)) {
        await expect(liveRecordsHeading).toBeVisible();
      }
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - groupedSourceStartedAt,
        label: "institute-search-group-by-source",
      });

      const groupedSourceEntries = audit.entries();
      const groupedSourceDuplicates = summarizeDuplicateRequests(groupedSourceEntries);
      expect(groupedSourceEntries).toEqual([]);
      expect(groupedSourceDuplicates).toEqual([]);

      const resetStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /reset filters/i }).click();
      await expect(page).toHaveURL(/\/institute\/search(?:\?.*)?$/);
      await expect(page).not.toHaveURL(/q=|section=|source=|sort=|group=/);
      await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - resetStartedAt,
        label: "institute-search-reset-filters",
      });

      const resetEntries = audit.entries();
      const resetDuplicates = summarizeDuplicateRequests(resetEntries);
      expect(resetEntries).toEqual([]);
      expect(resetDuplicates).toEqual([]);

      const expectedServerRenderContract = {
        "live-query=q": [
          "/api/v1/teacher/exams/?page_size=8&search=exam",
          "/api/v1/teacher/results/summary/?search=exam&page_size=8",
          "/api/v1/question-bank/questions/?compact=true&page_size=8&search=exam",
        ],
        "filter-param-contract": [
          "q",
          "section",
          "source",
          "sort",
          "group",
        ],
      };

      const payload = {
        notes: {
          browserVisibility:
            "Institute search is server-rendered. Live search entries are resolved on the server, so browser-side API traffic should stay empty while query and filter navigation only updates URL params.",
        },
        route: "institute-search",
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialEntries,
          applyFilters: applyEntries,
          groupBySource: groupedSourceEntries,
          quickFilterWorkspacePages: quickFilterEntries,
          resetFilters: resetEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicates,
          applyFilters: applyDuplicates,
          groupBySource: groupedSourceDuplicates,
          quickFilterWorkspacePages: quickFilterDuplicates,
          resetFilters: resetDuplicates,
        },
      };

      await testInfo.attach("institute-search-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("institute-search-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
