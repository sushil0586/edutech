import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openStudentRoute(page: Parameters<typeof expectStudentWorkspace>[0], href: string) {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page.locator("main")).toBeVisible();
}

test.describe("Student mobile report surfaces visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @visual student mobile results filters and cards stay readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openStudentRoute(page, "/app/results");

    const emptyState = page.getByText(/your result history is empty right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-mobile-results-empty-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 220,
      });
      return;
    }

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("student-mobile-results-filters-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });

    const firstResultCard = page.locator("article.studentResultsCompactCard").first();
    await expect(firstResultCard).toHaveScreenshot("student-mobile-results-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 260,
    });
  });

  test("@workflow @visual student mobile practice cards and pagination stay readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openStudentRoute(page, "/app/practice");

    const emptyState = page.getByText(/your practice workspace is empty right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-mobile-practice-empty-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 220,
      });
      return;
    }

    const firstPracticeCard = page.locator("article.studentPracticeCompactCard").first();
    await expect(firstPracticeCard).toHaveScreenshot("student-mobile-practice-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 280,
    });

    const paginationCard = page.locator("section.studentCatalogPaginationCard").first();
    if (await paginationCard.isVisible().catch(() => false)) {
      await expect(paginationCard).toHaveScreenshot("student-mobile-practice-pagination-card.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 220,
      });
    }
  });

  test("@workflow @visual student mobile exams cards and pagination stay readable", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openStudentRoute(page, "/app/exams");

    const emptyState = page.getByText(/your mock-test workspace is empty right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-mobile-exams-empty-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 220,
      });
      return;
    }

    const firstExamCard = page.locator("article.studentExamCompactCard").first();
    await expect(firstExamCard).toHaveScreenshot("student-mobile-exams-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 280,
    });

    const paginationCard = page.locator("section.studentCatalogPaginationCard").first();
    if (await paginationCard.isVisible().catch(() => false)) {
      await expect(paginationCard).toHaveScreenshot("student-mobile-exams-pagination-card.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 220,
      });
    }
  });
});
