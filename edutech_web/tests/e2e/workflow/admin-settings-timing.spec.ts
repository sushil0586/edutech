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

test.describe("Admin settings timing", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin settings route timing probe stays measurable", async ({
    page,
  }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await measureTiming({
      label: "admin-settings-open",
      metrics,
      action: async () => {
        await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
        await expect(page.getByText(/current live control lanes/i).first()).toBeVisible();
        await expect(page.getByRole("button", { name: /save economy policy/i })).toBeVisible();
      },
    });

    await page.locator('a[href="/admin/people"]').first().click();
    await expect(page).toHaveURL(/\/admin\/people(?:\?.*)?$/);

    await measureTiming({
      label: "admin-settings-return-from-people",
      metrics,
      action: async () => {
        await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
        await expect(page.getByText(/current institute footprint/i).first()).toBeVisible();
      },
    });

    await page.locator('a[href="/admin/academic-setup"]').first().click();
    await expect(page).toHaveURL(/\/admin\/academic-setup(?:\?.*)?$/);

    await measureTiming({
      label: "admin-settings-return-from-academics",
      metrics,
      action: async () => {
        await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
        await expect(page.getByText(/people in scope/i).first()).toBeVisible();
      },
    });

    const payload = {
      route: "admin-settings",
      metrics,
    };
    await testInfo.attach("admin-settings-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("admin-settings-timing", JSON.stringify(payload));
  });
});
