import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
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

async function openReport(page: Page, path: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page).toHaveURL(
    new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\?.*)?$"),
  );
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("Teacher report surfaces visual", () => {
  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
  });

  test("@workflow @visual teacher subject report keeps hero, KPI strip, and pressure board aligned", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/subjects", /subject performance report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "teacher-subject-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "teacher-subject-report-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });

    const emptyState = page
      .getByText(/subject-strength rows will appear when teacher weak-topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "teacher-subject-report-empty-state.png", 360);
      return;
    }

    const firstSubjectRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstSubjectRow, "teacher-subject-report-first-row.png", 280);
  });

  test("@workflow @visual teacher topic mastery report keeps hero, KPI strip, and recovery board aligned", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/weak-areas", /topic mastery report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "teacher-weak-areas-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "teacher-weak-areas-report-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });

    const emptyState = page
      .getByText(/weak-topic rows will appear once teacher-scoped topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "teacher-weak-areas-report-empty-state.png", 360);
      return;
    }

    const firstWeakTopicRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstWeakTopicRow, "teacher-weak-areas-report-first-row.png", 280);
  });

  test("@workflow @visual teacher wrong questions report keeps hero, KPI strip, and mistake tables aligned", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/wrong-questions", /wrong questions report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "teacher-wrong-questions-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "teacher-wrong-questions-report-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });

    const emptyState = page
      .getByText(/wrong-question rows will appear once enough teacher-scoped answer evidence exists/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "teacher-wrong-questions-report-empty-state.png", 360);
      return;
    }

    const firstWrongQuestionRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Most wrong questions$/i) })
      .locator("tbody tr")
      .first();
    await expectVisualSnapshot(firstWrongQuestionRow, "teacher-wrong-questions-report-first-row.png", 300);
  });

  test("@workflow @visual teacher time management report keeps hero, KPI strip, and timing table aligned", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/time-management", /time management report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "teacher-time-management-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "teacher-time-management-report-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });

    const emptyState = page
      .getByText(/timing rows will appear once timed teacher-scoped attempts are available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "teacher-time-management-report-empty-state.png", 360);
      return;
    }

    const firstTimingRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstTimingRow, "teacher-time-management-report-first-row.png", 300);
  });

  test("@workflow @visual teacher learner report detail keeps hero, KPI strip, and support cards aligned", async ({
    page,
  }) => {
    await openReport(page, "/teacher/reports/subjects", /subject performance report/i);

    const learnerLink = page.locator('a[href*="/teacher/reports/students/"]').first();
    await expect(learnerLink).toBeVisible();
    await learnerLink.click();
    await expect(page).toHaveURL(/\/teacher\/reports\/students\/[^/?]+(?:\?.*)?$/);

    const hero = page.locator(".analyticsDetailHero").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    const currentExamLensCard = kpiStrip.locator(".metricCard").filter({
      has: page.getByText(/current exam lens/i),
    }).first();
    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(hero, "teacher-learner-report-hero.png", 320);
    await expectVisualSnapshot(kpiStrip, "teacher-learner-report-kpi-strip.png", 300, {
      mask: [...metricStripMasks(kpiStrip), currentExamLensCard],
    });

    const interpretationCard = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Teacher interpretation$/i) })
      .first();
    await expectVisualSnapshot(interpretationCard, "teacher-learner-report-interpretation-card.png", 340);
  });
});
