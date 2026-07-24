import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

const FROZEN_REPORT_TIME_ISO = "2026-07-23T09:00:00.000+05:30";

async function expectVisualSnapshot(locator: Locator, name: string, maxDiffPixels: number) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await locator.page().addStyleTag({
    content: `
      nextjs-portal,
      [data-next-badge-root],
      [data-next-mark],
      [data-nextjs-toast],
      [data-nextjs-dev-tools-button],
      [data-nextjs-dialog-overlay],
      [data-nextjs-terminal],
      [data-next-badge] {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  });
  await expect(locator).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    maxDiffPixels,
  });
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
        constructor(...args: ConstructorParameters<typeof Date>) {
          if (args.length === 0) {
            super(fixedTime);
            return;
          }
          super(...args);
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
    await expectVisualSnapshot(hero, "teacher-mobile-subject-report-hero.png", 340);

    const emptyState = page
      .getByText(/subject-strength rows will appear when teacher weak-topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "teacher-mobile-subject-report-empty-state.png", 380);
      return;
    }

    const firstSubjectRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstSubjectRow, "teacher-mobile-subject-report-first-row.png", 320);
  });

  test("@workflow @visual teacher mobile topic-mastery report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openReport(page, "/teacher/reports/weak-areas", /topic mastery report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectVisualSnapshot(hero, "teacher-mobile-weak-areas-report-hero.png", 340);

    const emptyState = page
      .getByText(/weak-topic rows will appear once teacher-scoped topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "teacher-mobile-weak-areas-report-empty-state.png", 380);
      return;
    }

    const firstWeakTopicRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstWeakTopicRow, "teacher-mobile-weak-areas-report-first-row.png", 320);
  });

  test("@workflow @visual teacher mobile wrong-questions report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openReport(page, "/teacher/reports/wrong-questions", /wrong questions report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectVisualSnapshot(hero, "teacher-mobile-wrong-questions-report-hero.png", 340);

    const emptyState = page
      .getByText(/wrong-question rows will appear once enough teacher-scoped answer evidence exists/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "teacher-mobile-wrong-questions-report-empty-state.png", 380);
      return;
    }

    const firstWrongRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Most wrong questions$/i) })
      .locator("tbody tr")
      .first();
    await expectVisualSnapshot(firstWrongRow, "teacher-mobile-wrong-questions-report-first-row.png", 320);
  });

  test("@workflow @visual teacher mobile time-management report keeps hero and first timing row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await openReport(page, "/teacher/reports/time-management", /time management report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectVisualSnapshot(hero, "teacher-mobile-time-management-report-hero.png", 340);

    const emptyState = page
      .getByText(/timing rows will appear once timed teacher-scoped attempts are available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "teacher-mobile-time-management-report-empty-state.png", 380);
      return;
    }

    const firstTimingRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Timing pressure board$/i) })
      .locator("tbody tr")
      .first();
    await expectVisualSnapshot(firstTimingRow, "teacher-mobile-time-management-report-first-row.png", 320);
  });

  test("@workflow @visual institute mobile wrong-questions report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReport(page, "/institute/reports/wrong-questions", /wrong questions report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectVisualSnapshot(hero, "institute-mobile-wrong-questions-report-hero.png", 340);

    const emptyState = page
      .getByText(/wrong-question rows will appear once enough institute-scoped answer evidence exists/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-mobile-wrong-questions-report-empty-state.png", 380);
      return;
    }

    const firstWrongRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Most wrong questions$/i) })
      .locator("tbody tr")
      .first();
    await expectVisualSnapshot(firstWrongRow, "institute-mobile-wrong-questions-report-first-row.png", 320);
  });

  test("@workflow @visual institute mobile subject report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReport(page, "/institute/reports/subjects", /subject performance report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectVisualSnapshot(hero, "institute-mobile-subject-report-hero.png", 420);

    const emptyState = page
      .getByText(/subject-strength rows will appear when institute weak-topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-mobile-subject-report-empty-state.png", 380);
      return;
    }

    const firstSubjectRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstSubjectRow, "institute-mobile-subject-report-first-row.png", 320);
  });

  test("@workflow @visual institute mobile topic-mastery report keeps hero and first table row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReport(page, "/institute/reports/weak-areas", /topic mastery report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectVisualSnapshot(hero, "institute-mobile-weak-areas-report-hero.png", 340);

    const emptyState = page
      .getByText(/weak-topic rows will appear once institute-scoped topic evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-mobile-weak-areas-report-empty-state.png", 380);
      return;
    }

    const firstWeakTopicRow = page.locator(".studentResultsTable tbody tr").first();
    await expectVisualSnapshot(firstWeakTopicRow, "institute-mobile-weak-areas-report-first-row.png", 320);
  });

  test("@workflow @visual institute mobile time-management report keeps hero and first timing row readable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await openReport(page, "/institute/reports/time-management", /time management report/i);

    const hero = page.locator(".analyticsDetailHero").first();
    await expectVisualSnapshot(hero, "institute-mobile-time-management-report-hero.png", 340);

    const emptyState = page
      .getByText(/timing rows will appear once institute-scoped attempt timing evidence is available/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expectVisualSnapshot(page.locator("main"), "institute-mobile-time-management-report-empty-state.png", 380);
      return;
    }

    const firstTimingRow = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Timing pressure board$/i) })
      .locator("tbody tr")
      .first();
    await expectVisualSnapshot(firstTimingRow, "institute-mobile-time-management-report-first-row.png", 320);
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
    await expectVisualSnapshot(hero, "institute-mobile-learner-report-hero.png", 360);

    const interpretationCard = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^Institute interpretation$/i) })
      .first();
    await expectVisualSnapshot(
      interpretationCard,
      "institute-mobile-learner-report-interpretation-card.png",
      340,
    );
  });
});
