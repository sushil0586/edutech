import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

type TimingMetric = {
  label: string;
  elapsedMs: number;
};

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function resolveSummaryHref(page: Page) {
  await gotoWithRetry(page, "/app/attempts");
  await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();

  const emptyAttempts = page.getByText(/your attempt history is empty right now/i).first();
  if (!(await emptyAttempts.isVisible().catch(() => false))) {
    const summaryLink = page.getByRole("link", { name: /open summary/i }).first();
    if (await summaryLink.isVisible().catch(() => false)) {
      return await summaryLink.getAttribute("href");
    }
  }

  await gotoWithRetry(page, "/app/results");
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

  const emptyResults = page.getByText(/your result history is empty right now/i).first();
  if (!(await emptyResults.isVisible().catch(() => false))) {
    const summaryLink = page.getByRole("link", { name: /open summary/i }).first();
    if (await summaryLink.isVisible().catch(() => false)) {
      return await summaryLink.getAttribute("href");
    }
  }

  return null;
}

async function expectSummaryRoute(page: Page) {
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
  await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
  await expect(page.getByText(/attempt status/i).first()).toBeVisible();
  await expect(page.getByText(/recommended actions/i).first()).toBeVisible();
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

test.describe("Student summary timing", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student summary route timing probe stays measurable", async ({ page }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const summaryHref = await resolveSummaryHref(page);
    if (!summaryHref) {
      const payload = {
        route: "student-summary",
        state: "unavailable",
        metrics,
      };
      await testInfo.attach("student-summary-timing", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("student-summary-timing", JSON.stringify(payload));
      return;
    }

    await measureTiming({
      label: "summary-open",
      metrics,
      action: async () => {
        await gotoWithRetry(page, summaryHref);
      },
      assertVisible: async () => {
        await expectSummaryRoute(page);
      },
    });

    const reviewLink = page.getByRole("link", { name: /open answer review|review feedback/i }).first();
    const reviewVisible = await reviewLink.isVisible().catch(() => false);

    await measureTiming({
      label: "summary-open-attempts",
      metrics,
      action: async () => {
        await page.getByRole("link", { name: /open attempts/i }).first().click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "summary-return",
      metrics,
      action: async () => {
        await gotoWithRetry(page, summaryHref);
      },
      assertVisible: async () => {
        await expectSummaryRoute(page);
      },
    });

    await measureTiming({
      label: "summary-open-results",
      metrics,
      action: async () => {
        await page.getByRole("link", { name: /open results|view results|check result status/i }).first().click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      },
    });

    if (reviewVisible) {
      const reviewHref = await reviewLink.getAttribute("href");
      if (reviewHref) {
        await measureTiming({
          label: "summary-open-review",
          metrics,
          action: async () => {
            await gotoWithRetry(page, reviewHref);
          },
          assertVisible: async () => {
            await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
            const unavailable = page.getByRole("heading", {
              name: /attempt review is not available right now/i,
            }).first();
            if (await unavailable.isVisible().catch(() => false)) {
              await expect(unavailable).toBeVisible();
              return;
            }
            await expect(page.getByRole("heading", { name: /review/i }).first()).toBeVisible();
          },
        });
      }
    }

    const payload = {
      route: "student-summary",
      state: "available",
      metrics,
    };
    await testInfo.attach("student-summary-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("student-summary-timing", JSON.stringify(payload));
  });
});
