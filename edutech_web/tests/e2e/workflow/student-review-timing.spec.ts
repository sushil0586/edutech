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

async function resolveReviewHref(page: Page) {
  await gotoWithRetry(page, "/app/attempts");
  await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();

  const emptyAttempts = page.getByText(/your attempt history is empty right now/i).first();
  if (!(await emptyAttempts.isVisible().catch(() => false))) {
    const reviewLink = page.getByRole("link", { name: /open answer review|review feedback/i }).first();
    if (await reviewLink.isVisible().catch(() => false)) {
      return await reviewLink.getAttribute("href");
    }
  }

  await gotoWithRetry(page, "/app/results");
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

  const emptyResults = page.getByText(/your result history is empty right now/i).first();
  if (!(await emptyResults.isVisible().catch(() => false))) {
    const reviewLink = page.getByRole("link", { name: /open answer review|review feedback/i }).first();
    if (await reviewLink.isVisible().catch(() => false)) {
      return await reviewLink.getAttribute("href");
    }
  }

  return null;
}

async function expectReviewRoute(page: Page) {
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
  const unavailableHeading = page.getByRole("heading", {
    name: /attempt review is not available right now/i,
  }).first();
  if (await unavailableHeading.isVisible().catch(() => false)) {
    await expect(page.getByText(/review unavailable/i).first()).toBeVisible();
    return "unavailable" as const;
  }

  await expect(page.getByRole("heading", { name: /review/i }).first()).toBeVisible();
  await expect(page.locator(".contentCard").filter({ hasText: /review state/i }).first()).toBeVisible();
  return "available" as const;
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

test.describe("Student review timing", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student review route timing probe stays measurable", async ({ page }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const reviewHref = await resolveReviewHref(page);
    if (!reviewHref) {
      const payload = {
        route: "student-review",
        state: "unavailable",
        metrics,
      };
      await testInfo.attach("student-review-timing", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("student-review-timing", JSON.stringify(payload));
      return;
    }

    await measureTiming({
      label: "review-open",
      metrics,
      action: async () => {
        await gotoWithRetry(page, reviewHref);
      },
      assertVisible: async () => {
        await expectReviewRoute(page);
      },
    });

    const reviewState = await expectReviewRoute(page);

    await measureTiming({
      label: "review-open-results",
      metrics,
      action: async () => {
        await page.getByRole("link", { name: /open results|check result status/i }).first().click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "review-return",
      metrics,
      action: async () => {
        await gotoWithRetry(page, reviewHref);
      },
      assertVisible: async () => {
        await expectReviewRoute(page);
      },
    });

    if (reviewState === "available") {
      const summaryLink = page.getByRole("link", { name: /back to summary|open summary/i }).first();
      if (await summaryLink.isVisible().catch(() => false)) {
        await measureTiming({
          label: "review-open-summary",
          metrics,
          action: async () => {
            await summaryLink.click();
          },
          assertVisible: async () => {
            await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
            await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
          },
        });
      }
    }

    const payload = {
      route: "student-review",
      state: reviewState,
      metrics,
    };
    await testInfo.attach("student-review-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("student-review-timing", JSON.stringify(payload));
  });
});
