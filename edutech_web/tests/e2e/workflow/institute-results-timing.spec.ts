import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

type TimingMetric = {
  label: string;
  elapsedMs: number;
};

async function expectAnyVisible(page: Page, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const locator = page.getByText(pattern).first();
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return;
    }
  }
  throw new Error(`Expected one of these patterns to be visible: ${patterns.map(String).join(", ")}`);
}

async function expectInstituteResultsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  const emptyStateHeading = page.getByRole("heading", {
    name: /overview becomes useful after exams and attempts exist in your institute scope/i,
  });
  if (await emptyStateHeading.isVisible().catch(() => false)) {
    await expect(emptyStateHeading).toBeVisible();
    await expect(page.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
    return false;
  }

  await expect(page.getByRole("combobox", { name: /exam state/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /overview.*workflow, readiness, and exam health/i }).first(),
  ).toBeVisible();
  await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
  await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();
  return true;
}

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

test.describe("Institute results timing", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute results route timing probe stays measurable", async ({ page }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await measureTiming({
      label: "overview-initial",
      metrics,
      action: async () => {
        await page.goto("/institute/results", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expectInstituteResultsWorkspace(page);
      },
    });

    const resultsLoaded = await expectInstituteResultsWorkspace(page);
    if (!resultsLoaded) {
      const payload = {
        route: "institute-results",
        state: "empty",
        metrics,
      };
      await testInfo.attach("institute-results-timing", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("institute-results-timing", JSON.stringify(payload));
      return;
    }

    await measureTiming({
      label: "overview-filter-apply",
      metrics,
      action: async () => {
        await page.getByRole("combobox", { name: /exam state/i }).selectOption("published");
        await page.getByRole("combobox", { name: /sort by/i }).selectOption("title");
        await page.getByRole("combobox", { name: /group by/i }).selectOption("status");
        await page.getByRole("combobox", { name: /page size/i }).selectOption("14");
        await page.getByRole("button", { name: /apply filters/i }).click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam_list_filter=published/);
        await expect(page.getByText(/exam state: published/i)).toBeVisible();
        await expect(page.getByText(/group: status/i)).toBeVisible();
      },
    });

    await measureTiming({
      label: "overview-reset",
      metrics,
      action: async () => {
        await page.getByRole("link", { name: /reset exam filters/i }).click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
        await expectInstituteResultsWorkspace(page);
      },
    });

    await measureTiming({
      label: "leaderboard-open",
      metrics,
      action: async () => {
        await page.getByRole("link", { name: /open leaderboard/i }).first().click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/results\/leaderboard(?:\?.*)?$/);
        await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "overview-return",
      metrics,
      action: async () => {
        await page.goto("/institute/results", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expectInstituteResultsWorkspace(page);
      },
    });

    const liveMonitorNavLink = page.getByRole("link", {
      name: /live monitor.*intervention queue and active alerts/i,
    }).first();
    const liveMonitorHref = (await liveMonitorNavLink.getAttribute("href")) ?? "/institute/results/live";

    await measureTiming({
      label: "live-open",
      metrics,
      action: async () => {
        await page.goto(liveMonitorHref, { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/results\/live(?:\?.*)?$/);
        await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
        await expectAnyVisible(page, [
          /intervention queue/i,
          /live monitor unavailable/i,
          /no active warning pressure returned from live monitoring/i,
          /active alerts/i,
        ]);
      },
    });

    await measureTiming({
      label: "analysis-open",
      metrics,
      action: async () => {
        await page.goto("/institute/results/analysis", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/results\/analysis(?:\?.*)?$/);
        await expect(page.getByText(/question risk board/i).first()).toBeVisible();
        await expect(page.getByText(/student explorer/i).first()).toBeVisible();
      },
    });

    const payload = {
      route: "institute-results",
      state: "populated",
      metrics,
    };
    await testInfo.attach("institute-results-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("institute-results-timing", JSON.stringify(payload));
  });
});
