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

test.describe("Admin security timing", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin security route timing probe stays measurable", async ({
    page,
  }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await measureTiming({
      label: "admin-security-open",
      metrics,
      action: async () => {
        await page.goto("/admin/security", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page.getByRole("heading", { name: /^security$/i }).first()).toBeVisible();
        await expect(page.getByText(/security controls/i).first()).toBeVisible();
        await expect(page.locator('input[type="search"][name="search"]').first()).toBeVisible();
      },
    });

    const watchExamLinks = page.getByRole("link", { name: /watch exam|watching/i });
    let selectedExamId: string | null = null;
    if ((await watchExamLinks.count()) > 0) {
      await measureTiming({
        label: "admin-security-watch-exam",
        metrics,
        action: async () => {
          await watchExamLinks.first().click();
        },
        assertVisible: async () => {
          await expect(page).toHaveURL(/\/admin\/security\?[^#]*examId=/);
          await expect(page.getByText(/selected exam posture/i).first()).toBeVisible();
          await expect(page.getByText(/live monitor summary/i).first()).toBeVisible();
          selectedExamId = new URL(page.url()).searchParams.get("examId");
        },
      });
    }

    await measureTiming({
      label: "admin-security-critical-filter",
      metrics,
      action: async () => {
        const url = selectedExamId
          ? `/admin/security?examId=${encodeURIComponent(selectedExamId)}&attempt_filter=critical`
          : "/admin/security?attempt_filter=critical";
        await page.goto(url, { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/attempt_filter=critical/);
        await expect(page.getByText(/^attempt scope: critical$/i).first()).toBeVisible();
      },
    });

    const payload = {
      route: "admin-security",
      metrics,
    };
    await testInfo.attach("admin-security-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("admin-security-timing", JSON.stringify(payload));
  });
});
