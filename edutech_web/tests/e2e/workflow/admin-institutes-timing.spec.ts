import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

type TimingMetric = {
  label: string;
  elapsedMs: number;
};

async function measureTiming(args: {
  action: () => Promise<void>;
  assertVisible: () => Promise<void>;
  label: string;
  metrics: TimingMetric[];
}) {
  const start = Date.now();
  await args.action();
  await args.assertVisible();
  args.metrics.push({
    label: args.label,
    elapsedMs: Date.now() - start,
  });
}

test.describe("Admin institutes timing", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin institutes route timing probe stays measurable", async ({
    page,
  }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await measureTiming({
      label: "admin-institutes-open",
      metrics,
      action: async () => {
        await page.goto("/admin/institutes", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page.getByRole("heading", { name: /^institutes$/i }).first()).toBeVisible();
        await expect(page.getByRole("searchbox", { name: /search by name, code, city, or email/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /add institute/i })).toBeVisible();
        await expect(page.locator(".adminInstituteDetailCard h4").first()).toBeVisible();
      },
    });

    const firstSelectedName = (await page.locator(".adminInstituteDetailCard h4").first().textContent())?.trim() ?? "";
    const instituteRows = page.locator(".adminInstituteTable tbody tr");
    const rowCount = await instituteRows.count();

    if (rowCount > 1) {
      const targetRow = instituteRows.nth(1);
      const targetName = (await targetRow.locator("td strong").first().textContent())?.trim() ?? "";

      await measureTiming({
        label: "admin-institutes-switch-selected",
        metrics,
        action: async () => {
          await targetRow.getByRole("button", { name: /^view$/i }).click();
        },
        assertVisible: async () => {
          await expect(page.locator(".adminInstituteDetailCard h4").first()).toHaveText(targetName);
          await expect(page.locator(".adminInstituteTable tbody tr").nth(1)).toContainText(targetName);
        },
      });

      if (firstSelectedName && targetName && firstSelectedName !== targetName) {
        await measureTiming({
          label: "admin-institutes-switch-back",
          metrics,
          action: async () => {
            await instituteRows.nth(0).getByRole("button", { name: /^view$/i }).click();
          },
          assertVisible: async () => {
            await expect(page.locator(".adminInstituteDetailCard h4").first()).toHaveText(firstSelectedName);
          },
        });
      }
    }

    const payload = {
      route: "admin-institutes",
      metrics,
    };
    await testInfo.attach("admin-institutes-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("admin-institutes-timing", JSON.stringify(payload));
  });
});
