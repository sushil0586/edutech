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

async function expectResultsRoute(page: Page) {
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
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

test.describe("Student results timing", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student results route timing probe stays measurable", async ({ page }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await measureTiming({
      label: "results-open",
      metrics,
      action: async () => {
        await gotoWithRetry(page, "/app/results");
      },
      assertVisible: async () => {
        await expectResultsRoute(page);
      },
    });

    const emptyState = page.getByText(/your result history is empty right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      const payload = {
        route: "student-results",
        state: "empty",
        metrics,
      };
      await testInfo.attach("student-results-timing", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("student-results-timing", JSON.stringify(payload));
      return;
    }

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    if (await filtersCard.isVisible().catch(() => false)) {
      const resultsForm = filtersCard.locator("form.studentWorkspaceFiltersForm").first();

      await measureTiming({
        label: "results-filter-apply",
        metrics,
        action: async () => {
          await resultsForm.locator('select[name="result_status"]').selectOption("review_ready");
          await resultsForm.locator('select[name="result_sort"]').selectOption("highest");
          await resultsForm.locator('select[name="result_group"]').selectOption("source");
          await resultsForm.getByRole("button", { name: /apply filters/i }).click();
        },
        assertVisible: async () => {
          await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=review_ready/);
          await expect(page).toHaveURL(/\/app\/results\?[^#]*result_sort=highest/);
          await expect(page).toHaveURL(/\/app\/results\?[^#]*result_group=source/);
          await expect(page.getByText(/status: review ready/i)).toBeVisible();
        },
      });

      await measureTiming({
        label: "results-filter-reset",
        metrics,
        action: async () => {
          await page.getByRole("link", { name: /reset filters/i }).first().click();
        },
        assertVisible: async () => {
          await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
          await expectResultsRoute(page);
        },
      });
    }

    const summaryLink = page.getByRole("link", { name: /open summary|check attempt status/i }).first();
    if (await summaryLink.isVisible().catch(() => false)) {
      await measureTiming({
        label: "results-open-summary",
        metrics,
        action: async () => {
          await summaryLink.click();
        },
        assertVisible: async () => {
          await expect(page).toHaveURL(/\/app\/attempts\/[^/]+\/summary(?:\?.*)?$/);
          await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
        },
      });
    }

    const reviewLink = page.getByRole("link", { name: /open answer review/i }).first();
    if (await reviewLink.isVisible().catch(() => false)) {
      await measureTiming({
        label: "results-open-review",
        metrics,
        action: async () => {
          await reviewLink.click();
        },
        assertVisible: async () => {
          await expect(page).toHaveURL(/\/app\/attempts\/[^/]+\/review(?:\?.*)?$/);
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

    const payload = {
      route: "student-results",
      state: "populated",
      metrics,
    };
    await testInfo.attach("student-results-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("student-results-timing", JSON.stringify(payload));
  });
});
