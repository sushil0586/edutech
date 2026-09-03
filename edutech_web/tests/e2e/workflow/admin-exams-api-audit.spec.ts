import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

test.describe("Admin exams API audit", () => {
  test.setTimeout(180_000);
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin exams filters preserve params without extra browser-side API calls", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/admin/exams");
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
      await expect(page.getByText(/exam controls/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "admin-exams-open",
      });

      const initialEntries = audit.entries();
      const initialDuplicates = summarizeDuplicateRequests(initialEntries);
      expect(initialEntries).toEqual([]);
      expect(initialDuplicates).toEqual([]);

      const instituteSelect = page.locator('select[name="institute"]').first();
      const statusSelect = page.locator('select[name="exam_status"]').first();
      const sourceSelect = page.locator('select[name="exam_source"]').first();
      const sortSelect = page.locator('select[name="exam_sort"]').first();
      const groupSelect = page.locator('select[name="exam_group"]').first();

      await expect(instituteSelect).toBeVisible();

      const instituteOptions = await instituteSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({
            label: (option as HTMLOptionElement).label,
            value: (option as HTMLOptionElement).value,
          }))
          .filter((option) => option.value),
      );

      let selectedInstituteId = "";
      let scopeEntries: ReturnType<typeof audit.entries> = [];
      let scopeDuplicates: ReturnType<typeof summarizeDuplicateRequests> = [];
      if (instituteOptions.length > 0) {
        selectedInstituteId = instituteOptions[0]?.value ?? "";
        const scopeStartedAt = Date.now();
        audit.reset();
        await instituteSelect.selectOption(selectedInstituteId);
        await page.getByRole("button", { name: /update view/i }).click();
        await expect(page).toHaveURL(new RegExp(`/admin/exams\\?[^#]*institute=${selectedInstituteId}`), {
          timeout: 60_000,
        });
        await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible({
          timeout: 60_000,
        });
        await audit.waitForSettled();
        metrics.push({
          elapsedMs: Date.now() - scopeStartedAt,
          label: "admin-exams-open-institute-scope",
        });

        scopeEntries = audit.entries();
        scopeDuplicates = summarizeDuplicateRequests(scopeEntries);
        expect(scopeEntries).toEqual([]);
        expect(scopeDuplicates).toEqual([]);
      }

      const filterStartedAt = Date.now();
      audit.reset();
      await statusSelect.selectOption("live");
      await sourceSelect.selectOption("teacher");
      await sortSelect.selectOption("start_soon");
      await groupSelect.selectOption("source");
      await page.getByRole("button", { name: /update view/i }).click();
      await expect(page).toHaveURL(/exam_status=live/, { timeout: 60_000 });
      await expect(page).toHaveURL(/exam_source=teacher/);
      await expect(page).toHaveURL(/exam_sort=start_soon/);
      await expect(page).toHaveURL(/exam_group=source/);
      if (selectedInstituteId) {
        await expect(page).toHaveURL(new RegExp(`institute=${selectedInstituteId}`));
      }
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - filterStartedAt,
        label: "admin-exams-apply-filters",
      });

      const filteredEntries = audit.entries();
      const filteredDuplicates = summarizeDuplicateRequests(filteredEntries);
      expect(filteredEntries).toEqual([]);
      expect(filteredDuplicates).toEqual([]);

      const sourceQuickFilterStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /^platform$/i }).click();
      await expect(page).toHaveURL(/exam_source=platform/, { timeout: 60_000 });
      await expect(page).toHaveURL(/exam_status=live/);
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - sourceQuickFilterStartedAt,
        label: "admin-exams-source-quick-filter",
      });

      const sourceQuickFilterEntries = audit.entries();
      const sourceQuickFilterDuplicates = summarizeDuplicateRequests(sourceQuickFilterEntries);
      expect(sourceQuickFilterEntries).toEqual([]);
      expect(sourceQuickFilterDuplicates).toEqual([]);

      const resetStartedAt = Date.now();
      audit.reset();
      await gotoWithRuntimeRecovery(page, "/admin/exams");
      await expect(page).toHaveURL(/\/admin\/exams(?:\?.*)?$/, { timeout: 60_000 });
      await expect(page).not.toHaveURL(/exam_status=|exam_source=|exam_sort=|exam_group=/);
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - resetStartedAt,
        label: "admin-exams-reset-filters",
      });

      const resetEntries = audit.entries();
      const resetDuplicates = summarizeDuplicateRequests(resetEntries);
      expect(resetEntries).toEqual([]);
      expect(resetDuplicates).toEqual([]);

      const expectedServerRenderContract = {
        default: [
          "/api/v1/institutes/?page_size=100",
          "/api/v1/exams/platform-catalog-summary/",
          "/api/v1/exams/?page=1&page_size=24",
        ],
        "institute-scoped": selectedInstituteId
          ? [
              "/api/v1/institutes/?page_size=100",
              `/api/v1/exams/platform-catalog-summary/?institute=${selectedInstituteId}`,
              `/api/v1/exams/?page=1&page_size=24&institute=${selectedInstituteId}`,
            ]
          : [
              "/api/v1/institutes/?page_size=100",
              "/api/v1/exams/platform-catalog-summary/",
              "/api/v1/exams/?page=1&page_size=24",
            ],
        "filter-param-contract": [
          "exam_status",
          "exam_source",
          "exam_sort",
          "exam_group",
          "institute",
        ],
        "backend-filter-contract": [
          "status",
          "source_type",
          "ordering",
          "page",
          "page_size",
        ],
      };

      const payload = {
        notes: {
          browserVisibility:
            "Admin exams filters are handled via server navigation and URL params. The browser should not emit extra `/api/admin/*` or `/api/v1/*` fetches during those transitions.",
        },
        route: "admin-exams",
        selectedInstituteId: selectedInstituteId || null,
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialEntries,
          applyFilters: filteredEntries,
          openInstituteScope: scopeEntries,
          resetFilters: resetEntries,
          sourceQuickFilter: sourceQuickFilterEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicates,
          applyFilters: filteredDuplicates,
          openInstituteScope: scopeDuplicates,
          resetFilters: resetDuplicates,
          sourceQuickFilter: sourceQuickFilterDuplicates,
        },
      };

      await testInfo.attach("admin-exams-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("admin-exams-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
