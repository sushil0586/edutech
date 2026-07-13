import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

test.describe("Admin dashboard API audit", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin dashboard preserves filter params without extra browser-side API calls", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/admin");
      await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();
      await expect(page.getByText(/dashboard focus/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "admin-dashboard-open",
      });

      const initialEntries = audit.entries();
      const initialDuplicates = summarizeDuplicateRequests(initialEntries);
      expect(initialEntries).toEqual([]);
      expect(initialDuplicates).toEqual([]);

      const focusSelect = page.locator('select[name="focus"]').first();
      const sortSelect = page.locator('select[name="sort"]').first();

      const applyStartedAt = Date.now();
      audit.reset();
      await focusSelect.selectOption("people");
      await sortSelect.selectOption("highest_value");
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/focus=people/);
      await expect(page).toHaveURL(/sort=highest_value/);
      await expect(page.getByText(/focus:\s*people/i)).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - applyStartedAt,
        label: "admin-dashboard-apply-filters",
      });

      const applyEntries = audit.entries();
      const applyDuplicates = summarizeDuplicateRequests(applyEntries);
      expect(applyEntries).toEqual([]);
      expect(applyDuplicates).toEqual([]);

      const academicsQuickFilterStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /^academics$/i }).click();
      await expect(page).toHaveURL(/focus=academics/);
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - academicsQuickFilterStartedAt,
        label: "admin-dashboard-quick-filter-academics",
      });

      const academicsQuickFilterEntries = audit.entries();
      const academicsQuickFilterDuplicates = summarizeDuplicateRequests(academicsQuickFilterEntries);
      expect(academicsQuickFilterEntries).toEqual([]);
      expect(academicsQuickFilterDuplicates).toEqual([]);

      const reportsHandoffStartedAt = Date.now();
      audit.reset();
      await gotoWithRuntimeRecovery(page, "/admin");
      await page.getByRole("link", { name: /go to reports/i }).first().click();
      await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - reportsHandoffStartedAt,
        label: "admin-dashboard-handoff-reports",
      });

      const reportsHandoffEntries = audit.entries();
      const reportsHandoffDuplicates = summarizeDuplicateRequests(reportsHandoffEntries);
      expect(reportsHandoffEntries).toEqual([]);
      expect(reportsHandoffDuplicates).toEqual([]);

      const expectedServerRenderContract = {
        dashboardCounts: [
          "/api/v1/institutes/",
          "/api/v1/academics/academic-years/",
          "/api/v1/academics/programs/",
          "/api/v1/academics/cohorts/",
          "/api/v1/academics/subjects/",
          "/api/v1/academics/topics/",
          "/api/v1/students/",
          "/api/v1/teachers/",
          "/api/v1/exams/",
          "/api/v1/results/",
        ],
        "filter-param-contract": ["focus", "sort"],
      };

      const payload = {
        notes: {
          browserVisibility:
            "Admin dashboard is server-rendered from count endpoints, so browser-side API traffic should stay empty while filter and handoff navigation remains URL-driven.",
        },
        route: "admin-dashboard",
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialEntries,
          applyFilters: applyEntries,
          handoffReports: reportsHandoffEntries,
          quickFilterAcademics: academicsQuickFilterEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicates,
          applyFilters: applyDuplicates,
          handoffReports: reportsHandoffDuplicates,
          quickFilterAcademics: academicsQuickFilterDuplicates,
        },
      };

      await testInfo.attach("admin-dashboard-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("admin-dashboard-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
