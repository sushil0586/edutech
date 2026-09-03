import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectVisualSnapshot(
  locator: Locator,
  name: string,
  maxDiffPixels: number,
  options?: { mask?: Locator[] },
) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    maxDiffPixels,
    mask: options?.mask,
  });
}

async function normalizeLiveMonitorSummaryForVisual(scope: Locator) {
  await scope.evaluate((element) => {
    element.querySelectorAll<HTMLElement>("strong, span, p, small").forEach((node) => {
      node.style.whiteSpace = "nowrap";
      node.style.overflow = "hidden";
      node.style.textOverflow = "ellipsis";
    });
  });
}

async function openInstituteLiveMonitor(page: Page) {
  await loginAsRole(page, "institute");
  await expectInstituteWorkspace(page);
  await gotoWithRuntimeRecovery(page, "/institute/results/live");
  await expect(page).toHaveURL(/\/institute\/results\/live(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
}

test.describe("Institute live monitor visual", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow @visual institute live monitor keeps empty or active monitoring surfaces aligned", async ({
    page,
  }) => {
    await openInstituteLiveMonitor(page);

    const emptyStateHeading = page.getByRole("heading", {
      name: /live monitor is useful only during active exam windows/i,
    });

    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-live-monitor-empty-state.png", 420);
      return;
    }

    const summarySurface = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/live monitor refresh/i).first() })
      .first();
    const healthGrid = page.locator(".teacherMonitorHealthGrid").first();
    const interventionQueue = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^intervention queue$/i).first() })
      .first();

    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
    await expect(page.getByText(/intervention queue/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh now/i })).toBeVisible();

    await normalizeLiveMonitorSummaryForVisual(summarySurface);
    await expectVisualSnapshot(summarySurface, "institute-live-monitor-summary-surface.png", 360, {
      mask: [
        summarySurface.getByText(/last refreshed at|waiting for first refresh cycle/i).first(),
        summarySurface.locator("strong"),
        summarySurface.locator("span"),
        summarySurface.locator("p"),
      ],
    });
    await expectVisualSnapshot(healthGrid, "institute-live-monitor-health-grid.png", 340);
    await expectVisualSnapshot(interventionQueue, "institute-live-monitor-intervention-queue.png", 420);

    const inspectAttemptLink = page.getByRole("link", { name: /inspect attempt|review|inspect/i }).first();
    if (await inspectAttemptLink.isVisible().catch(() => false)) {
      await inspectAttemptLink.click();
      await expect
        .poll(() => page.url(), {
          message: "Expected institute live monitor drilldown to open review queue or attempt detail.",
          timeout: 10000,
        })
        .toMatch(/\/institute\/(results\/live\?[^#]*attempt=|reviews(?:\?.*)?$)/);

      const currentUrl = page.url();
      if (/\/institute\/reviews(?:\?.*)?$/i.test(currentUrl)) {
        const reviewSurface = page.locator(".contentCard").filter({
          has: page.getByText(/review queue|pending review|reviewed/i).first(),
        }).first();
        await expect(reviewSurface).toBeVisible();
        await expectVisualSnapshot(reviewSurface, "institute-live-monitor-review-handoff.png", 420);
      } else {
        const attemptDetail = page.locator(".teacherAttemptDetailPanel").first();
        await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
        await expect(page.getByText(/decision support/i).first()).toBeVisible();
        await expect(page.getByText(/intervention notes/i).first()).toBeVisible();

        await expectVisualSnapshot(attemptDetail, "institute-live-monitor-attempt-detail.png", 520, {
          mask: [
            attemptDetail.getByText(/started|submitted|latest event time/i).first(),
            attemptDetail.getByText(/\d{1,2}\/\d{1,2}\/\d{4}|am|pm/i).first(),
          ],
        });
      }
    }
  });
});
