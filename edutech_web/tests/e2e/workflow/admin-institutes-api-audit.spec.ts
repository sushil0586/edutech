import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

function currentSelectedInstituteId(pageUrl: string) {
  return new URL(pageUrl).searchParams.get("institute");
}

test.describe("Admin institutes API audit", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin institutes selection stays cache-aware and avoids extra client fetches", async ({
    page,
  }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];
    const audit = createNetworkAudit(page);

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/admin/institutes");
      await expect(page.getByRole("heading", { name: /^institutes$/i }).first()).toBeVisible();
      await expect(page.locator(".adminInstituteDetailCard h4").first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "admin-institutes-open",
      });

      const initialSelectedInstituteId = currentSelectedInstituteId(page.url());
      const initialSelectedInstituteName =
        ((await page.locator(".adminInstituteDetailCard h4").first().textContent()) ?? "").trim();
      expect(initialSelectedInstituteName).toBeTruthy();

      const initialClientEntries = audit.entries();
      const initialDuplicateRequests = summarizeDuplicateRequests(initialClientEntries);
      expect(initialDuplicateRequests).toEqual([]);

      const serverRenderContract = initialSelectedInstituteId
        ? [
            "/api/v1/institutes/?page_size=50",
            "/api/v1/institutes/onboarding-profiles/",
            `/api/v1/institutes/${initialSelectedInstituteId}/`,
            `/api/v1/institutes/${initialSelectedInstituteId}/onboarding-runs/`,
            `/api/v1/students/?institute=${initialSelectedInstituteId}`,
            `/api/v1/teachers/?institute=${initialSelectedInstituteId}`,
            `/api/v1/exams/?institute=${initialSelectedInstituteId}`,
          ]
        : [
            "/api/v1/institutes/?page_size=50",
            "/api/v1/institutes/onboarding-profiles/",
            "/api/v1/institutes/<selected-institute-id>/",
            "/api/v1/institutes/<selected-institute-id>/onboarding-runs/",
            "/api/v1/students/?institute=<selected-institute-id>",
            "/api/v1/teachers/?institute=<selected-institute-id>",
            "/api/v1/exams/?institute=<selected-institute-id>",
          ];

      const instituteRows = page.locator(".adminInstituteTable tbody tr");
      const rowCount = await instituteRows.count();
      expect(rowCount).toBeGreaterThan(0);

      let switchEntriesPayload: ReturnType<typeof audit.entries> = [];
      let switchDuplicateRequests: ReturnType<typeof summarizeDuplicateRequests> = [];
      let cachedBackEntries: ReturnType<typeof audit.entries> = [];
      let repeatedSelectionEntries: ReturnType<typeof audit.entries> = [];

      if (rowCount > 1) {
        const targetRow = instituteRows.nth(1);
        const targetInstituteName = ((await targetRow.textContent()) ?? "").trim();
        const switchStartedAt = Date.now();
        audit.reset();
        await targetRow.getByRole("button", { name: /^view$/i }).click();
        await expect(page).toHaveURL(/\/admin\/institutes\?institute=/);
        await expect(page.locator(".adminInstituteDetailCard h4").first()).toBeVisible();
        await audit.waitForSettled();
        metrics.push({
          elapsedMs: Date.now() - switchStartedAt,
          label: "admin-institutes-switch-selected",
        });

        const switchedInstituteId = currentSelectedInstituteId(page.url());
        expect(switchedInstituteId).toBeTruthy();
        expect(switchedInstituteId).not.toBe(initialSelectedInstituteId);

        switchEntriesPayload = audit.entries();
        switchDuplicateRequests = summarizeDuplicateRequests(switchEntriesPayload);
        expect(switchDuplicateRequests).toEqual([]);

        const workspaceEntries = switchEntriesPayload.filter(
          (entry) =>
            entry.method === "GET" &&
            entry.pathname === `/api/admin/institutes/${switchedInstituteId}/workspace`,
        );

        expect(workspaceEntries).toHaveLength(1);
        expect(workspaceEntries[0]?.status).toBe(200);
        expect(workspaceEntries[0]?.query).toEqual({});

        audit.reset();
        await page
          .locator(".adminInstituteTable tbody tr")
          .filter({ hasText: targetInstituteName })
          .first()
          .getByRole("button", { name: /^view$/i })
          .click();
        await audit.waitForSettled({ quietWindowMs: 350 });
        repeatedSelectionEntries = audit.entries();
        expect(repeatedSelectionEntries).toEqual([]);

        if (initialSelectedInstituteName) {
          const cachedBackStartedAt = Date.now();
          audit.reset();
          await page
            .locator(".adminInstituteTable tbody tr")
            .filter({ hasText: initialSelectedInstituteName })
            .first()
            .getByRole("button", { name: /^view$/i })
            .click();
          await expect(page).toHaveURL(/\/admin\/institutes\?institute=/);
          await expect(page.locator(".adminInstituteDetailCard h4").first()).toContainText(
            initialSelectedInstituteName,
          );
          await audit.waitForSettled({ quietWindowMs: 350 });
          metrics.push({
            elapsedMs: Date.now() - cachedBackStartedAt,
            label: "admin-institutes-switch-back-cached",
          });
          cachedBackEntries = audit.entries();
          expect(cachedBackEntries).toEqual([]);
        }
      }

      const payload = {
        notes: {
          initialClientFetchObservation:
            "This browser-side audit only captures client-initiated API traffic. The initial `/admin/institutes` server-render fan-out is listed separately as a code-backed expected contract.",
        },
        route: "admin-institutes",
        selectedInstituteId: initialSelectedInstituteId,
        expectedServerRenderContract: serverRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialClientEntries,
          repeatedSelection: repeatedSelectionEntries,
          switchBackCached: cachedBackEntries,
          switchSelected: switchEntriesPayload,
        },
        duplicateRequests: {
          initialLoad: initialDuplicateRequests,
          switchSelected: switchDuplicateRequests,
        },
      };

      await testInfo.attach("admin-institutes-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("admin-institutes-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
