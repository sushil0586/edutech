import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

test.describe("Teacher search API audit", () => {
  test.setTimeout(120_000);
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher search preserves query params without extra browser-side API calls", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/teacher/search?q=exam");
      await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
      await expect(page.getByText(/search controls/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "teacher-search-open",
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
        label: "teacher-search-apply-filters",
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
          .getAttribute("href")) ?? "/teacher/search?q=exam&source=catalog&sort=title&group=section";
      await gotoWithRuntimeRecovery(page, workspacePagesHref);
      await expect(page).toHaveURL(/source=catalog/);
      await expect(page).toHaveURL(/q=exam/);
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - quickFilterStartedAt,
        label: "teacher-search-quick-filter-workspace-pages",
      });

      const quickFilterEntries = audit.entries();
      const quickFilterDuplicates = summarizeDuplicateRequests(quickFilterEntries);
      expect(quickFilterEntries).toEqual([]);
      expect(quickFilterDuplicates).toEqual([]);

      const groupedSourceStartedAt = Date.now();
      audit.reset();
      await gotoWithRuntimeRecovery(page, "/teacher/search?q=exam&group=source");
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
        label: "teacher-search-group-by-source",
      });

      const groupedSourceEntries = audit.entries();
      const groupedSourceDuplicates = summarizeDuplicateRequests(groupedSourceEntries);
      expect(groupedSourceEntries).toEqual([]);
      expect(groupedSourceDuplicates).toEqual([]);

      const resetStartedAt = Date.now();
      audit.reset();
      await gotoWithRuntimeRecovery(page, "/teacher/search");
      await expect(page).toHaveURL(/\/teacher\/search(?:\?.*)?$/);
      await expect(page).not.toHaveURL(/q=|section=|source=|sort=|group=/);
      await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - resetStartedAt,
        label: "teacher-search-reset-filters",
      });

      const resetEntries = audit.entries();
      const resetDuplicates = summarizeDuplicateRequests(resetEntries);
      expect(resetEntries).toEqual([]);
      expect(resetDuplicates).toEqual([]);

      const expectedServerRenderContract = {
        "live-query=q": [
          "/api/v1/teacher/exams/?page_size=8&search=exam",
          "/api/v1/teacher/results/summary/?search=exam&page_size=8",
          "/api/v1/teacher/questions/?compact=true&page_size=8&search=exam",
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
            "Teacher search is server-rendered. Live search entries are resolved on the server, so browser-side API traffic should stay empty while query and filter navigation only updates URL params.",
        },
        route: "teacher-search",
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

      await testInfo.attach("teacher-search-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("teacher-search-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
