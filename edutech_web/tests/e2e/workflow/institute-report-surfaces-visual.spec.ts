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

function metricStripMasks(scope: Locator) {
  return [
    scope.locator(".metricCard strong"),
    scope.locator(".metricCard p"),
    scope.locator(".metricCard small"),
    scope.locator(".metricCard span"),
  ];
}

async function normalizeMetricStripForVisual(scope: Locator) {
  await scope.evaluate((element) => {
    element.querySelectorAll<HTMLElement>(".metricCard").forEach((card) => {
      card.style.minHeight = "132px";
      card.style.height = "132px";
    });
    element
      .querySelectorAll<HTMLElement>(".metricCard strong, .metricCard p, .metricCard small, .metricCard span")
      .forEach((node) => {
        node.style.whiteSpace = "nowrap";
        node.style.overflow = "hidden";
        node.style.textOverflow = "ellipsis";
      });
  });
}

function currentWorkspaceDateMask(page: Page) {
  return page.locator("strong").filter({ hasText: /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{2} [A-Z][a-z]{2}$/ }).first();
}

async function openReport(page: Page, path: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page).toHaveURL(
    new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\?.*)?$"),
  );
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("Institute report surfaces visual", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow @visual institute subject report keeps hero, KPI strip, and pressure board aligned", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/subjects", /subject performance report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "institute-subject-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "institute-subject-report-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });

    const emptyState = page
      .getByText(/subject-strength rows will appear when institute weak-topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-subject-report-empty-state.png", 360);
      return;
    }

    const firstSubjectRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstSubjectRow, "institute-subject-report-first-row.png", 280);
  });

  test("@workflow @visual institute topic mastery report keeps hero, KPI strip, and recovery board aligned", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/weak-areas", /topic mastery report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "institute-weak-areas-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "institute-weak-areas-report-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });

    const emptyState = page
      .getByText(/weak-topic rows will appear once institute-scoped topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-weak-areas-report-empty-state.png", 360);
      return;
    }

    const firstWeakTopicRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstWeakTopicRow, "institute-weak-areas-report-first-row.png", 280);
  });

  test("@workflow @visual institute wrong questions report keeps hero, KPI strip, and mistake tables aligned", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/wrong-questions", /wrong questions report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "institute-wrong-questions-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "institute-wrong-questions-report-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });

    const emptyState = page
      .getByText(/wrong-question rows will appear once enough institute-scoped answer evidence exists/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-wrong-questions-report-empty-state.png", 360);
      return;
    }

    const firstWrongQuestionRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Most wrong questions$/i) })
      .locator("tbody tr")
      .first();
    await expectVisualSnapshot(firstWrongQuestionRow, "institute-wrong-questions-report-first-row.png", 300);
  });

  test("@workflow @visual institute time management report keeps hero, KPI strip, and timing table aligned", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/time-management", /time management report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "institute-time-management-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "institute-time-management-report-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });

    const emptyState = page
      .getByText(/timing rows will appear once institute-scoped attempt timing evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-time-management-report-empty-state.png", 360, {
        mask: [currentWorkspaceDateMask(page)],
      });
      return;
    }

    const firstTimingRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstTimingRow, "institute-time-management-report-first-row.png", 300);
  });

  test("@workflow @visual institute learner report detail keeps hero, KPI strip, and support cards aligned", async ({
    page,
  }) => {
    await openReport(page, "/institute/reports/subjects", /subject performance report/i);

    const learnerLink = page.locator('a[href*="/institute/reports/students/"]').first();
    await expect(learnerLink).toBeVisible();
    await learnerLink.click();
    await expect(page).toHaveURL(/\/institute\/reports\/students\/[^/?]+(?:\?.*)?$/);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    const currentExamLensCard = kpiStrip.locator(".metricCard").filter({
      has: page.getByText(/current exam lens/i),
    }).first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "institute-learner-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "institute-learner-report-kpi-strip.png", 300, {
      mask: [...metricStripMasks(kpiStrip), currentExamLensCard],
    });

    const interpretationCard = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Institute interpretation$/i) })
      .first();
    await expectVisualSnapshot(interpretationCard, "institute-learner-report-interpretation-card.png", 340);
  });
});
