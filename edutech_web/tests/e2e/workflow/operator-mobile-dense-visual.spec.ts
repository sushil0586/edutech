import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";
import { suppressVisualNoise } from "../helpers/visual";

async function expectVisualSnapshot(
  locator: Locator,
  name: string,
  maxDiffPixels: number,
  mask: Locator[] = [],
) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await suppressVisualNoise(locator.page());
  await expect(locator).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    maxDiffPixels,
    mask,
  });
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visual target to be visible.");
}

async function openTeacherExamDetail(page: Page) {
  await loginAsRole(page, "teacher");
  await expectTeacherWorkspace(page);
  await gotoWithRuntimeRecovery(page, "/teacher/exams");
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
  await page.getByRole("link", { name: /view exam|open exam/i }).first().click();
  await expect(page).toHaveURL(/\/teacher\/exams\/[^/]+(?:\?.*)?$/);
}

async function stabilizeKpiStrip(page: Page) {
  await page.addStyleTag({
    content: `
      .resultsSummaryGrid .metricCard:nth-child(5) small {
        visibility: hidden !important;
      }
    `,
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

test.describe("Operator mobile dense visual contracts", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => {
    await suppressVisualNoise(page);
  });

  test("@workflow @visual teacher mobile exam detail keeps hero, KPI strip, and delivery actions aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await openTeacherExamDetail(page);
    await stabilizeKpiStrip(page);

    const hero = page
      .getByRole("heading", { level: 1 })
      .first()
      .locator("xpath=ancestor::div[1]");
    await expect(hero).toBeVisible();
    const kpiStrip = await firstVisible([page.locator(".resultsSummaryGrid").first()]);
    const deliveryActions = await firstVisible([
      page.locator("#exam-actions").first(),
      page.locator(".dashboardGrid#exam-actions").first(),
    ]);

    await expectVisualSnapshot(hero, "teacher-mobile-exam-detail-hero.png", 420);
    await expectVisualSnapshot(kpiStrip, "teacher-mobile-exam-detail-kpi-strip.png", 1200);
    await expectVisualSnapshot(deliveryActions, "teacher-mobile-exam-detail-delivery-actions.png", 520);
  });

  test("@workflow @visual institute mobile exam detail keeps hero, KPI strip, and delivery actions aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await gotoWithRuntimeRecovery(page, "/institute/exams");
    await stabilizeKpiStrip(page);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    const examsEmptyState = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    if (await examsEmptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-mobile-exams-empty-state.png", 420);
      return;
    }

    await page.getByRole("link", { name: /open exam|view exam/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);

    const hero = await firstVisible([
      page.locator(".studentInsightHeroCardCompact").first(),
      page.locator(".studentInsightHeroCard").first(),
    ]);
    const kpiStrip = await firstVisible([page.locator(".resultsSummaryGrid").first()]);
    const deliveryActions = await firstVisible([
      page.locator("#exam-actions").first(),
      page.locator(".dashboardGrid#exam-actions").first(),
    ]);
    const primaryActionSurface = await firstVisible([
      page.locator(".examDetailActionGrid").first(),
      page.locator(".resultCardActions").first(),
    ]);

    await expectVisualSnapshot(hero, "institute-mobile-exam-detail-hero.png", 420);
    await expectVisualSnapshot(kpiStrip, "institute-mobile-exam-detail-kpi-strip.png", 440);
    await expectVisualSnapshot(deliveryActions, "institute-mobile-exam-detail-delivery-actions.png", 6000);
    await expectVisualSnapshot(primaryActionSurface, "institute-mobile-exam-detail-action-grid.png", 2500);
  });
});
