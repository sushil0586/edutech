import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

type TimingMetric = {
  label: string;
  elapsedMs: number;
};

async function expectInstituteResultsLanding(page: Page) {
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

  const emptyStateHeading = page.getByRole("heading", {
    name: /overview becomes useful after exams and attempts exist in your institute scope/i,
  });
  if (await emptyStateHeading.isVisible().catch(() => false)) {
    await expect(emptyStateHeading).toBeVisible();
    await expect(page.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
    return;
  }

  await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
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

test.describe("Institute shell timing", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute shell transitions stay measurable", async ({ page }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    const sidebarNav = page.getByRole("navigation", { name: /institute admin navigation/i });

    await measureTiming({
      label: "dashboard-initial",
      metrics,
      action: async () => {
        await page.goto("/institute/dashboard", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page.getByText(/institute control/i).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "sidebar-exams",
      metrics,
      action: async () => {
        await Promise.all([
          page.waitForURL(/\/institute\/exams(?:\?.*)?$/),
          sidebarNav.getByRole("link", { name: /^exams$/i }).first().click(),
        ]);
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "sidebar-results",
      metrics,
      action: async () => {
        await Promise.all([
          page.waitForURL(/\/institute\/results(?:\?.*)?$/),
          sidebarNav.getByRole("link", { name: /^results$/i }).first().click(),
        ]);
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
        await expectInstituteResultsLanding(page);
      },
    });

    await measureTiming({
      label: "sidebar-reviews",
      metrics,
      action: async () => {
        await Promise.all([
          page.waitForURL(/\/institute\/reviews(?:\?.*)?$/),
          sidebarNav.getByRole("link", { name: /^reviews$/i }).first().click(),
        ]);
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "sidebar-question-bank",
      metrics,
      action: async () => {
        await Promise.all([
          page.waitForURL(/\/institute\/question-bank(?:\?.*)?$/),
          sidebarNav.getByRole("link", { name: /^question bank$/i }).first().click(),
        ]);
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "sidebar-people",
      metrics,
      action: async () => {
        await Promise.all([
          page.waitForURL(/\/institute\/people(?:\?.*)?$/),
          sidebarNav.getByRole("link", { name: /^people$/i }).first().click(),
        ]);
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/people(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /people/i }).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "sidebar-dashboard-return",
      metrics,
      action: async () => {
        await Promise.all([
          page.waitForURL(/\/institute\/dashboard(?:\?.*)?$/),
          sidebarNav.getByRole("link", { name: /^dashboard$/i }).first().click(),
        ]);
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/dashboard(?:\?.*)?$/);
        await expect(page.getByText(/institute control/i).first()).toBeVisible();
      },
    });

    const payload = {
      route: "institute-shell",
      metrics,
    };
    await testInfo.attach("institute-shell-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("institute-shell-timing", JSON.stringify(payload));
  });
});
