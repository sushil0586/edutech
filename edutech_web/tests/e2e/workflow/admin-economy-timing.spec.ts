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

test.describe("Admin economy timing", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin economy route timing probe stays measurable", async ({
    page,
  }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await measureTiming({
      label: "admin-economy-overview-open",
      metrics,
      action: async () => {
        await page.goto("/admin/economy", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
        await expect(page.getByRole("heading", { name: /^overview$/i })).toBeVisible();
      },
    });

    await measureTiming({
      label: "admin-economy-catalog-open",
      metrics,
      action: async () => {
        await page.goto("/admin/economy?tab=catalog", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/admin\/economy\?tab=catalog/);
        await expect(
          page.getByRole("heading", {
            name: /activate or pause live wallet, referral, and subscription catalog lanes/i,
          }),
        ).toBeVisible();
      },
    });

    await measureTiming({
      label: "admin-economy-question-bank-open",
      metrics,
      action: async () => {
        await page.goto("/admin/economy?tab=question-bank", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/admin\/economy\?tab=question-bank/);
        await expect(page.getByRole("heading", { name: /question bank commerce/i })).toBeVisible();
        await expect(
          page.getByText(/operate package catalog, entitlement visibility, quota consumption/i),
        ).toBeVisible();
      },
    });

    await measureTiming({
      label: "admin-economy-support-ops-open",
      metrics,
      action: async () => {
        await page.goto("/admin/economy?tab=support-ops", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/admin\/economy\?tab=support-ops/);
        await expect(
          page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i }),
        ).toBeVisible();
      },
    });

    const payload = {
      route: "admin-economy",
      metrics,
    };
    await testInfo.attach("admin-economy-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("admin-economy-timing", JSON.stringify(payload));
  });
});
