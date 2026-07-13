import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

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

test.describe("Institute reports timing", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute reports route timing probe stays measurable", async ({
    page,
  }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await measureTiming({
      label: "institute-reports-open",
      metrics,
      action: async () => {
        await page.goto("/institute/reports", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
        await expect(page.getByText(/report controls/i).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "institute-reports-publication-open",
      metrics,
      action: async () => {
        await page.goto("/institute/reports?lane=publication&sort=backlog_high", {
          waitUntil: "domcontentloaded",
        });
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/reports\?[^#]*lane=publication/);
        await expect(
          page.getByRole("heading", {
            name: /completed or evaluated exams still needing result attention/i,
          }),
        ).toBeVisible();
      },
    });

    await measureTiming({
      label: "institute-reports-weak-topics-open",
      metrics,
      action: async () => {
        await page.goto("/institute/reports?lane=weak_topics&sort=score_low", {
          waitUntil: "domcontentloaded",
        });
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/reports\?[^#]*lane=weak_topics/);
        await expect(
          page.getByRole("heading", { name: /institute-level academic pressure points/i }),
        ).toBeVisible();
      },
    });

    await measureTiming({
      label: "institute-reports-students-open",
      metrics,
      action: async () => {
        await page.goto("/institute/reports?lane=students&sort=score_high", {
          waitUntil: "domcontentloaded",
        });
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/reports\?[^#]*lane=students/);
        await expect(
          page.getByRole("heading", { name: /who is currently strongest and who needs support/i }),
        ).toBeVisible();
      },
    });

    const payload = {
      route: "institute-reports",
      metrics,
    };
    await testInfo.attach("institute-reports-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("institute-reports-timing", JSON.stringify(payload));
  });
});
