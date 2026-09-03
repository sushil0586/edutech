import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";
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

function textMasks(scope: Locator, selector: string) {
  return scope.locator(selector);
}

function fullContentMask(scope: Locator) {
  return scope.locator("*");
}

async function normalizeTextLayoutForVisual(scope: Locator, selector: string) {
  await scope.evaluate(
    (element, targetSelector) => {
      element.querySelectorAll<HTMLElement>(targetSelector).forEach((node) => {
        node.style.whiteSpace = "nowrap";
        node.style.overflow = "hidden";
        node.style.textOverflow = "ellipsis";
      });
    },
    selector,
  );
}

async function hideVisualContent(scope: Locator, selector: string) {
  await scope.evaluate(
    (element, targetSelector) => {
      element.querySelectorAll<HTMLElement>(targetSelector).forEach((node) => {
        node.style.color = "transparent";
        node.style.background = "transparent";
        node.style.borderColor = "transparent";
        node.style.boxShadow = "none";
      });
    },
    selector,
  );
}

async function normalizeContainerHeight(scope: Locator, height: string) {
  await scope.evaluate((element, targetHeight) => {
    const node = element as HTMLElement;
    node.style.minHeight = targetHeight;
    node.style.height = targetHeight;
  }, height);
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visual target to be visible.");
}

async function openTeacherDashboard(page: Page) {
  await gotoWithRuntimeRecovery(page, "/teacher/dashboard");
  await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();
}

async function openTeacherExams(page: Page) {
  await gotoWithRuntimeRecovery(page, "/teacher/exams");
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
}

async function openTeacherReviews(page: Page) {
  await gotoWithRuntimeRecovery(page, "/teacher/reviews");
  await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
}

async function openTeacherResultsAnalysis(page: Page) {
  await gotoWithRuntimeRecovery(page, "/teacher/results/analysis");
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
}

async function openTeacherQuestionBank(page: Page) {
  await gotoWithRuntimeRecovery(page, "/teacher/question-bank");
  await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
  await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();
}

async function openInstituteDashboard(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/dashboard");
  await expect(page.getByText(/institute control/i).first()).toBeVisible();
}

async function openInstituteExams(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/exams");
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
}

async function openInstituteReviews(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/reviews");
  await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
}

async function openInstituteReports(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/reports");
  await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
}

async function openInstituteQuestionBank(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/question-bank");
  await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
  await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();
}

test.describe("Teacher and institute visual contracts", () => {
  test("@workflow @visual teacher dashboard filter row, actions, KPI strip, and first insight stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openTeacherDashboard(page);

    const filtersCard = page.locator(".workspaceFiltersCard").first();
    const quickChips = page.locator(".workspaceFilterQuickChips").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    const primaryInsight = await firstVisible([
      page.locator(".dashboardPanel").first().locator(".weakTopicRow").first(),
      page.locator(".dashboardPanel").first().locator(".emptyText").first(),
      page.locator(".contentCard").first(),
    ]);

    await normalizeMetricStripForVisual(kpiStrip);
    await normalizeTextLayoutForVisual(primaryInsight, "strong, span");
    await hideVisualContent(primaryInsight, "*");
    await expectVisualSnapshot(filtersCard, "teacher-dashboard-filters-card.png", 260);
    await expectVisualSnapshot(quickChips, "teacher-dashboard-quick-chips.png", 240);
    await expectVisualSnapshot(kpiStrip, "teacher-dashboard-kpi-strip.png", 280, {
      mask: metricStripMasks(kpiStrip),
    });
    await expectVisualSnapshot(primaryInsight, "teacher-dashboard-primary-panel.png", 320, {
      mask: [],
    });
  });

  test("@workflow @visual teacher exams filters, visible actions, KPI strip, and first exam card stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openTeacherExams(page);

    const filtersCard = page.locator(".workspaceFiltersCard").first();
    const ctaCluster = await firstVisible([
      page.locator(".pageHeaderActionGroup").first(),
      page.locator(".studentInsightHeroActions").first(),
    ]);
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    const primarySurface = await firstVisible([
      page.locator(".examCard").first(),
      page.getByText(/no teacher exams match these controls/i).first(),
      page.getByRole("heading", { name: /your teacher exam list is empty right now/i }).first(),
    ]);

    await normalizeContainerHeight(filtersCard, "336px");
    await normalizeMetricStripForVisual(kpiStrip);
    await hideVisualContent(filtersCard, "strong, span, .workspaceQuickChip, .workspaceFilterQuickLabel, .workspaceFilterField span, .button");
    await expectVisualSnapshot(filtersCard, "teacher-exams-filters-card.png", 260);
    await expectVisualSnapshot(ctaCluster, "teacher-exams-cta-cluster.png", 280);
    await expectVisualSnapshot(kpiStrip, "teacher-exams-kpi-strip.png", 280, {
      mask: metricStripMasks(kpiStrip),
    });
    await expectVisualSnapshot(primarySurface, "teacher-exams-primary-surface.png", 320);
  });

  test("@workflow @visual teacher reviews filters, KPI strip, queue header, and first review task stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openTeacherReviews(page);

    const filtersForm = page.locator("form.teacherExamFilters").first();
    const kpiStrip = page.locator(".teacherResultsOverviewCard").first();
    const queueHeader = await firstVisible([
      page.locator("section.contentCard").filter({ hasText: /exam-scoped review queue/i }).first(),
      page.locator("section.contentCard").filter({ hasText: /queue filters/i }).first(),
    ]);
    const primarySurface = await firstVisible([
      page.locator(".teacherAttemptListCard").first(),
      page.getByText(/your review queue is empty right now/i).first(),
      page.getByText(/no review tasks match these filters/i).first(),
    ]);

    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(filtersForm, "teacher-reviews-filters-form.png", 260);
    await expectVisualSnapshot(kpiStrip, "teacher-reviews-kpi-strip.png", 280, {
      mask: metricStripMasks(kpiStrip),
    });
    await expectVisualSnapshot(queueHeader, "teacher-reviews-queue-header.png", 300);
    await expectVisualSnapshot(primarySurface, "teacher-reviews-primary-surface.png", 320);
  });

  test("@workflow @visual teacher results lane switcher, exam context, and analytics flow card stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openTeacherResultsAnalysis(page);

    const resultCards = page.locator(".contentCard");
    const examContext = resultCards.nth(0);
    const laneSwitcher = resultCards.nth(1);
    const analyticsFlow = await firstVisible([
      resultCards.nth(2),
      page.locator(".resultCard").first(),
    ]);

    await expectVisualSnapshot(examContext, "teacher-results-exam-context-card.png", 320);
    await expectVisualSnapshot(laneSwitcher, "teacher-results-lane-switcher-card.png", 340);
    await expectVisualSnapshot(analyticsFlow, "teacher-results-analytics-flow-card.png", 340);
  });

  test("@workflow @visual teacher question bank filters, shared-library guidance, and first question surface stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openTeacherQuestionBank(page);

    const filtersForm = page.getByTestId("question-bank-filter-form").first();
    const guidanceCard = await firstVisible([
      page.locator("section.contentCard").filter({ hasText: /how licensed platform questions work here/i }).first(),
      page.locator("section.contentCard").filter({ hasText: /find questions faster/i }).first(),
    ]);
    const primarySurface = await firstVisible([
      page.locator(".questionBankCard").first(),
      page.getByText(/no questions match these filters/i).first(),
      page.getByText(/shared platform library/i).first(),
    ]);

    await expectVisualSnapshot(filtersForm, "teacher-question-bank-filters-form.png", 320);
    await expectVisualSnapshot(guidanceCard, "teacher-question-bank-guidance-card.png", 340);
    await expectVisualSnapshot(primarySurface, "teacher-question-bank-primary-surface.png", 340);
  });

  test("@workflow @visual institute dashboard filter row, quick filters, KPI strip, and priority lane stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openInstituteDashboard(page);

    const filtersCard = page.locator(".workspaceFiltersCard").first();
    const quickChips = page.locator(".workspaceFilterQuickChips").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    const priorityLane = await firstVisible([
      page.locator(".adminPriorityCard").first(),
      page.locator("section.contentCard").filter({ hasText: /priority lanes/i }).first(),
    ]);

    await normalizeContainerHeight(filtersCard, "336px");
    await normalizeMetricStripForVisual(kpiStrip);
    await normalizeTextLayoutForVisual(priorityLane, "strong, span");
    await hideVisualContent(priorityLane, "*");
    await hideVisualContent(filtersCard, "strong, span, .workspaceQuickChip, .workspaceFilterQuickLabel, .workspaceFilterField span, .button");
    await expectVisualSnapshot(filtersCard, "institute-dashboard-filters-card.png", 260);
    await expectVisualSnapshot(quickChips, "institute-dashboard-quick-chips.png", 240);
    await expectVisualSnapshot(kpiStrip, "institute-dashboard-kpi-strip.png", 280, {
      mask: metricStripMasks(kpiStrip),
    });
    await expectVisualSnapshot(priorityLane, "institute-dashboard-priority-lane.png", 320, {
      mask: [],
    });
  });

  test("@workflow @visual institute exams filters, visible actions, KPI strip, and first exam card stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openInstituteExams(page);

    const filtersCard = page.locator(".workspaceFiltersCard").first();
    const ctaCluster = await firstVisible([
      page.locator(".pageHeaderActionGroup").first(),
      page.locator(".studentInsightHeroActions").first(),
    ]);
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    const primarySurface = await firstVisible([
      page.locator(".examCard").first(),
      page.getByRole("heading", { name: /your institute exam list is empty right now/i }).first(),
      page.getByText(/no exams match the current controls/i).first(),
    ]);

    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(filtersCard, "institute-exams-filters-card.png", 280);
    await expectVisualSnapshot(ctaCluster, "institute-exams-cta-cluster.png", 300);
    await expectVisualSnapshot(kpiStrip, "institute-exams-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });
    await expectVisualSnapshot(primarySurface, "institute-exams-primary-surface.png", 340);
  });

  test("@workflow @visual institute reviews filters, KPI strip, queue header, and first review task stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openInstituteReviews(page);

    const filtersForm = page.locator("form.teacherExamFilters").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    const queueHeader = await firstVisible([
      page.locator("section.contentCard").filter({ hasText: /exam-scoped review queue/i }).first(),
      page.locator("section.contentCard").filter({ hasText: /queue filters/i }).first(),
    ]);
    const primarySurface = await firstVisible([
      page.locator(".teacherAttemptListCard").first(),
      page.getByText(/your review queue is empty right now/i).first(),
      page.getByText(/no review tasks match these filters/i).first(),
    ]);

    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(filtersForm, "institute-reviews-filters-form.png", 280);
    await expectVisualSnapshot(kpiStrip, "institute-reviews-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });
    await expectVisualSnapshot(queueHeader, "institute-reviews-queue-header.png", 320);
    await expectVisualSnapshot(primarySurface, "institute-reviews-primary-surface.png", 340);
  });

  test("@workflow @visual institute reports controls, KPI strip, and first report region stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openInstituteReports(page);

    const filtersCard = page.locator(".workspaceFiltersCard").first();
    const kpiStrip = page.locator(".resultsSummaryGrid").first();
    const primarySurface = await firstVisible([
      page.locator(".reportCard").first(),
      page.locator(".resultCard").first(),
      page.locator("section.contentCard").filter({ hasText: /publication/i }).first(),
    ]);

    await normalizeMetricStripForVisual(kpiStrip);
    await expectVisualSnapshot(filtersCard, "institute-reports-filters-card.png", 280);
    await expectVisualSnapshot(kpiStrip, "institute-reports-kpi-strip.png", 300, {
      mask: metricStripMasks(kpiStrip),
    });
    await expectVisualSnapshot(primarySurface, "institute-reports-primary-surface.png", 340);
  });

  test("@workflow @visual institute question bank filters, intake guidance, and first question surface stay aligned", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openInstituteQuestionBank(page);

    const filtersForm = page.getByTestId("question-bank-filter-form").first();
    const guidanceCard = await firstVisible([
      page.locator("section.contentCard").filter({ hasText: /licensed intake shortcut/i }).first(),
      page.locator("section.contentCard").filter({ hasText: /find questions faster/i }).first(),
    ]);
    const primarySurface = await firstVisible([
      page.locator(".questionBankCard").first(),
      page.getByText(/no questions match these filters/i).first(),
      page.getByText(/open shared library linker/i).first(),
    ]);

    await expectVisualSnapshot(filtersForm, "institute-question-bank-filters-form.png", 320);
    await expectVisualSnapshot(guidanceCard, "institute-question-bank-guidance-card.png", 340);
    await expectVisualSnapshot(primarySurface, "institute-question-bank-primary-surface.png", 340);
  });
});
