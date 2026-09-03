import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

const FROZEN_REPORT_TIME_ISO = "2026-07-23T09:00:00.000+05:30";

async function expectMobileSurfaceReadable(locator: Locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();

  const metrics = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const containingSurface = element.closest(".contentCard, main") ?? element;
    const surfaceRect = containingSurface.getBoundingClientRect();
    const documentElement = document.documentElement;

    return {
      textLength: (element.textContent ?? "").replace(/\s+/g, " ").trim().length,
      rect: {
        height: rect.height,
        width: rect.width,
      },
      surface: {
        clientWidth: (containingSurface as HTMLElement).clientWidth,
        scrollWidth: (containingSurface as HTMLElement).scrollWidth,
        left: surfaceRect.left,
        right: surfaceRect.right,
      },
      page: {
        clientWidth: documentElement.clientWidth,
        scrollWidth: documentElement.scrollWidth,
      },
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.textLength).toBeGreaterThan(0);
  expect(metrics.rect.height).toBeGreaterThan(20);
  expect(metrics.surface.left).toBeGreaterThanOrEqual(-2);
  expect(metrics.surface.right).toBeLessThanOrEqual(metrics.viewportWidth + 2);
  expect(metrics.page.scrollWidth).toBeLessThanOrEqual(metrics.page.clientWidth + 2);

  if (metrics.rect.width > metrics.viewportWidth + 2) {
    expect(metrics.surface.scrollWidth).toBeGreaterThan(metrics.surface.clientWidth);
  }
}

async function openReport(page: Page, path: string, heading: RegExp) {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page).toHaveURL(
    new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\?.*)?$"),
  );
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("Operator mobile report surfaces visual", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ frozenIso }) => {
      const fixedTime = new Date(frozenIso).valueOf();
      const RealDate = Date;

      class MockDate extends RealDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(fixedTime);
            return;
          }
          super(...(args as ConstructorParameters<typeof Date>));
        }

        static now() {
          return fixedTime;
        }
      }

      Object.setPrototypeOf(MockDate, RealDate);
      // Keep native parsing/UTC behavior while freezing "now" for visual stability.
      MockDate.parse = RealDate.parse;
      MockDate.UTC = RealDate.UTC;
      MockDate.prototype = RealDate.prototype;

      // @ts-expect-error runtime clock shim for deterministic screenshots
      window.Date = MockDate;
    }, { frozenIso: FROZEN_REPORT_TIME_ISO });
  });

  test("@workflow @visual teacher mobile subject report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openReport(page, "/teacher/reports/subjects", /subject performance report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectMobileSurfaceReadable(hero);

    const emptyState = page
      .getByText(/subject-strength rows will appear when teacher weak-topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectMobileSurfaceReadable(page.locator("main"));
      return;
    }

    const firstSubjectRow = page.locator(".studentResultsTable tbody tr").first();
    await expectMobileSurfaceReadable(firstSubjectRow);
  });

  test("@workflow @visual teacher mobile topic-mastery report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openReport(page, "/teacher/reports/weak-areas", /topic mastery report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectMobileSurfaceReadable(hero);

    const emptyState = page
      .getByText(/weak-topic rows will appear once teacher-scoped topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectMobileSurfaceReadable(page.locator("main"));
      return;
    }

    const firstWeakTopicRow = page.locator(".studentResultsTable tbody tr").first();
    await expectMobileSurfaceReadable(firstWeakTopicRow);
  });

  test("@workflow @visual teacher mobile wrong-questions report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openReport(page, "/teacher/reports/wrong-questions", /wrong questions report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectMobileSurfaceReadable(hero);

    const emptyState = page
      .getByText(/wrong-question rows will appear once enough teacher-scoped answer evidence exists/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectMobileSurfaceReadable(page.locator("main"));
      return;
    }

    const firstWrongRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Most wrong questions$/i) })
      .locator("tbody tr")
      .first();
    await expectMobileSurfaceReadable(firstWrongRow);
  });

  test("@workflow @visual teacher mobile time-management report keeps hero and first timing row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openReport(page, "/teacher/reports/time-management", /time management report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectMobileSurfaceReadable(hero);

    const emptyState = page
      .getByText(/timing rows will appear once timed teacher-scoped attempts are available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectMobileSurfaceReadable(page.locator("main"));
      return;
    }

    const firstTimingRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Timing pressure board$/i) })
      .locator("tbody tr")
      .first();
    await expectMobileSurfaceReadable(firstTimingRow);
  });

  test("@workflow @visual institute mobile wrong-questions report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReport(page, "/institute/reports/wrong-questions", /wrong questions report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectMobileSurfaceReadable(hero);

    const emptyState = page
      .getByText(/wrong-question rows will appear once enough institute-scoped answer evidence exists/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectMobileSurfaceReadable(page.locator("main"));
      return;
    }

    const firstWrongRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Most wrong questions$/i) })
      .locator("tbody tr")
      .first();
    await expectMobileSurfaceReadable(firstWrongRow);
  });

  test("@workflow @visual institute mobile subject report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReport(page, "/institute/reports/subjects", /subject performance report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectMobileSurfaceReadable(hero);

    const emptyState = page
      .getByText(/subject-strength rows will appear when institute weak-topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectMobileSurfaceReadable(page.locator("main"));
      return;
    }

    const firstSubjectRow = page.locator(".studentResultsTable tbody tr").first();
    await expectMobileSurfaceReadable(firstSubjectRow);
  });

  test("@workflow @visual institute mobile topic-mastery report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReport(page, "/institute/reports/weak-areas", /topic mastery report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectMobileSurfaceReadable(hero);

    const emptyState = page
      .getByText(/weak-topic rows will appear once institute-scoped topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectMobileSurfaceReadable(page.locator("main"));
      return;
    }

    const firstWeakTopicRow = page.locator(".studentResultsTable tbody tr").first();
    await expectMobileSurfaceReadable(firstWeakTopicRow);
  });

  test("@workflow @visual institute mobile time-management report keeps hero and first timing row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReport(page, "/institute/reports/time-management", /time management report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectMobileSurfaceReadable(hero);

    const emptyState = page
      .getByText(/timing rows will appear once institute-scoped attempt timing evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectMobileSurfaceReadable(page.locator("main"));
      return;
    }

    const firstTimingRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Timing pressure board$/i) })
      .locator("tbody tr")
      .first();
    await expectMobileSurfaceReadable(firstTimingRow);
  });

  test("@workflow @visual institute mobile learner report detail keeps hero and interpretation card readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReport(page, "/institute/reports/subjects", /subject performance report/i);

    const learnerLink = page.locator('a[href*="/institute/reports/students/"]').first();
    await expect(learnerLink).toBeVisible();
    await learnerLink.click();
    await expect(page).toHaveURL(/\/institute\/reports\/students\/[^/?]+(?:\?.*)?$/);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectMobileSurfaceReadable(hero);

    const interpretationCard = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Institute interpretation$/i) })
      .first();
    await expectMobileSurfaceReadable(interpretationCard);
  });
});
