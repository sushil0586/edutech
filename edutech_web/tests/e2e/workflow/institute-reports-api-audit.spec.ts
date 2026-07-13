import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

test.describe("Institute reports API audit", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute reports filters preserve params without extra browser-side API calls", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/institute/reports");
      await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
      await expect(page.getByText(/report controls/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "institute-reports-open",
      });

      const initialEntries = audit.entries();
      const initialDuplicates = summarizeDuplicateRequests(initialEntries);
      expect(initialEntries).toEqual([]);
      expect(initialDuplicates).toEqual([]);

      const laneSelect = page.getByRole("combobox", { name: /focus lane/i });
      const subjectSelect = page.getByRole("combobox", { name: /subject/i });
      const sortSelect = page.getByRole("combobox", { name: /sort by/i });

      const applyStartedAt = Date.now();
      audit.reset();
      await laneSelect.selectOption("publication");
      await subjectSelect.selectOption("all");
      await sortSelect.selectOption("backlog_high");
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/lane=publication/);
      await expect(page).toHaveURL(/subject=all/);
      await expect(page).toHaveURL(/sort=backlog_high/);
      await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - applyStartedAt,
        label: "institute-reports-apply-filters",
      });

      const applyEntries = audit.entries();
      const applyDuplicates = summarizeDuplicateRequests(applyEntries);
      expect(applyEntries).toEqual([]);
      expect(applyDuplicates).toEqual([]);

      const quickFilterStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /lowest mastery/i }).click();
      await expect(page).toHaveURL(/lane=weak_topics/);
      await expect(page).toHaveURL(/sort=score_low/);
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - quickFilterStartedAt,
        label: "institute-reports-quick-filter-lowest-mastery",
      });

      const quickFilterEntries = audit.entries();
      const quickFilterDuplicates = summarizeDuplicateRequests(quickFilterEntries);
      expect(quickFilterEntries).toEqual([]);
      expect(quickFilterDuplicates).toEqual([]);

      const resetStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /reset filters/i }).click();
      await expect(page).toHaveURL(/\/institute\/reports(?:\?.*)?$/);
      await expect(page).not.toHaveURL(/lane=|subject=|sort=/);
      await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - resetStartedAt,
        label: "institute-reports-reset-filters",
      });

      const resetEntries = audit.entries();
      const resetDuplicates = summarizeDuplicateRequests(resetEntries);
      expect(resetEntries).toEqual([]);
      expect(resetDuplicates).toEqual([]);

      const expectedServerRenderContract = {
        reportSummaryEndpoints: [
          "teacher insight summary",
          "teacher result summary",
          "exam runtime summary",
          "teacher exam page filter=live&pageSize=1",
          "teacher exam page filter=completed&pageSize=1",
        ],
        "filter-param-contract": ["lane", "subject", "sort"],
      };

      const payload = {
        notes: {
          browserVisibility:
            "Institute reports is server-rendered against teacher reporting summary loaders, so browser-side API traffic should stay empty while filters only change URL params.",
        },
        route: "institute-reports",
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialEntries,
          applyFilters: applyEntries,
          quickFilterLowestMastery: quickFilterEntries,
          resetFilters: resetEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicates,
          applyFilters: applyDuplicates,
          quickFilterLowestMastery: quickFilterDuplicates,
          resetFilters: resetDuplicates,
        },
      };

      await testInfo.attach("institute-reports-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("institute-reports-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
