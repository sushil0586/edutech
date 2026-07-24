import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openStudentRoute(page: Parameters<typeof expectStudentWorkspace>[0], href: string) {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page.locator("main")).toBeVisible();
}

test.describe("Student report surfaces visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow @visual attempts workspace keeps filters and cards aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openStudentRoute(page, "/app/attempts");

    const emptyState = page.getByText(/your attempt history is empty right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-attempts-empty-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 200,
      });
      return;
    }

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("student-attempts-filters-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 180,
    });

    const firstAttemptCard = page.locator("article.studentAttemptsCard").first();
    await expect(firstAttemptCard).toHaveScreenshot("student-attempts-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });
  });

  test("@workflow @visual results workspace keeps filters and result cards aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openStudentRoute(page, "/app/results");

    const emptyState = page.getByText(/your result history is empty right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-results-empty-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 200,
      });
      return;
    }

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("student-results-filters-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 180,
    });

    const firstResultRow = page.locator(".studentResultsTableRow").first();
    await expect(firstResultRow).toHaveScreenshot("student-results-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });
  });

  test("@workflow @visual practice workspace keeps cards and pagination aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openStudentRoute(page, "/app/practice");

    const emptyState = page.getByText(/your practice workspace is empty right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-practice-empty-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 200,
      });
      return;
    }

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("student-practice-filters-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 180,
    });

    const firstPracticeRow = page.locator(".studentPracticeRecommendationTable .studentResultsTableRow").first();
    await expect(firstPracticeRow).toHaveScreenshot("student-practice-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 240,
    });

    const paginationCard = page.locator("section.studentCatalogPaginationCard").first();
    if (await paginationCard.isVisible().catch(() => false)) {
      await expect(paginationCard).toHaveScreenshot("student-practice-pagination-card.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 180,
      });
    }
  });

  test("@workflow @visual exams workspace keeps cards and pagination aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openStudentRoute(page, "/app/exams");

    const emptyState = page.getByText(/your mock-test workspace is empty right now/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-exams-empty-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 200,
      });
      return;
    }

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    await expect(filtersCard).toHaveScreenshot("student-exams-filters-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 180,
    });

    const firstExamCard = page.locator("article.studentExamCompactCard").first();
    await expect(firstExamCard).toHaveScreenshot("student-exams-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 240,
    });

    const paginationCard = page.locator("section.studentCatalogPaginationCard").first();
    if (await paginationCard.isVisible().catch(() => false)) {
      await expect(paginationCard).toHaveScreenshot("student-exams-pagination-card.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 180,
      });
    }
  });

  test("@workflow @visual weak-areas workspace keeps recovery hero and ranked topics aligned", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await openStudentRoute(page, "/app/weak-areas");

    const noTopicState = page.getByText(/your topic analytics are not available right now/i).first();
    if (await noTopicState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-weak-areas-empty-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 200,
      });
      return;
    }

    const hero = page.locator(".studentInsightHeroCard").first();
    await expect(hero).toHaveScreenshot("student-weak-areas-hero.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });

    const firstWeakTopic = page.locator(".studentResultsTableRow").first();
    await expect(firstWeakTopic).toHaveScreenshot("student-weak-topic-row.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 240,
    });
  });
});
