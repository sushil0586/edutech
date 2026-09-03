import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function clickOrGotoHref(page: Page, href: string | null, urlPattern: RegExp) {
  expect(href).not.toBeNull();
  if (urlPattern.test(page.url())) {
    return;
  }

  const resolvedUrl = new URL(href!, page.url());
  await page.goto(`${resolvedUrl.pathname}${resolvedUrl.search}`, { waitUntil: "commit" });
  await page.waitForLoadState("load").catch(() => null);
}

async function gotoQuestionPatternReport(page: Page) {
  const targetPattern = /\/app\/analytics\/questions(?:\?.*)?$/;
  if (targetPattern.test(page.url())) {
    return;
  }

  await page.goto("/app/analytics/questions", { waitUntil: "commit" });
  await expect(page).toHaveURL(targetPattern);
}

async function openFirstVisibleResultsRow(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/results");
  await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

  const emptyState = page.getByText(/your result history is empty right now/i).first();
  if (await emptyState.isVisible().catch(() => false)) {
    return false;
  }

  const firstRow = page.locator(".studentResultsTable tbody tr").first();
  await expect(firstRow).toBeVisible();
  await firstRow.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return true;
}

async function maybeVisitSummaryOrReviewFromResults(page: Page) {
  const openReview = page.getByRole("link", { name: /open answer review/i }).first();
  if (await openReview.isVisible().catch(() => false)) {
    await openReview.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/]+\/review(?:\?.*)?$/);
    return "review" as const;
  }

  const openSummary = page.getByRole("link", { name: /open summary/i }).first();
  if (await openSummary.isVisible().catch(() => false)) {
    await openSummary.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/]+\/summary(?:\?.*)?$/);
    return "summary" as const;
  }

  return null;
}

test.describe("Student academic continuity journey", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can preserve continuity across reports, drilldowns, practice, and attempt follow-up", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const hasResults = await openFirstVisibleResultsRow(page);
    if (hasResults) {
      await expect(page.getByText(/result details/i).first()).toBeVisible();

      const practiceFromResult = page.getByRole("link", { name: /practice weak areas|resume practice|awaiting publish|review result/i }).first();
      if (await practiceFromResult.isVisible().catch(() => false)) {
        const href = await practiceFromResult.getAttribute("href");
        if (href?.startsWith("/app/practice")) {
          await practiceFromResult.click();
          await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
          await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
        } else {
          await page.getByRole("button", { name: /close/i }).first().click();
        }
      } else {
        await page.getByRole("button", { name: /close/i }).first().click();
      }
    }

    await gotoWithRuntimeRecovery(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();

    const analyticsBlocked = page
      .getByText(/analytics are not available yet|student analytics could not be loaded/i)
      .first();
    if (await analyticsBlocked.isVisible().catch(() => false)) {
      return;
    }

    const subjectRow = page.locator(".studentSubjectPerformanceTable tbody tr").first();
    if (await subjectRow.isVisible().catch(() => false)) {
      await subjectRow.click();
      const subjectDialog = page.getByRole("dialog");
      await expect(subjectDialog).toBeVisible();
      await expect(subjectDialog.getByText(/subject performance/i).first()).toBeVisible();

      const openTopicMastery = subjectDialog.getByRole("link", { name: /open topic mastery/i }).first();
      if (await openTopicMastery.isVisible().catch(() => false)) {
        const topicMasteryHref = await openTopicMastery.getAttribute("href");
        await openTopicMastery.click();
        await clickOrGotoHref(page, topicMasteryHref, /\/app\/weak-areas(?:\?.*)?$/);
        await expect(page).toHaveURL(/\/app\/weak-areas(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /weak areas/i }).first()).toBeVisible();

        const topicRow = page.locator(".studentTopicMasteryTable tbody tr").first();
        if (await topicRow.isVisible().catch(() => false)) {
          await topicRow.click();
          await expect(page.getByRole("dialog")).toBeVisible();
          await expect(page.getByText(/topic mastery/i).first()).toBeVisible();

          const startPractice = page.getByRole("link", { name: /start practice/i }).first();
          if (await startPractice.isVisible().catch(() => false)) {
            const startPracticeHref = await startPractice.getAttribute("href");
            await startPractice.click();
            await clickOrGotoHref(page, startPracticeHref, /\/app\/(practice|weak-areas)(?:\?.*)?$/);
            await expect(page).toHaveURL(/\/app\/(practice|weak-areas)(?:\?.*)?$/);

            if (/\/app\/practice(?:\?.*)?$/.test(page.url())) {
              await expect(page.getByText(/practice recommendation report/i).first()).toBeVisible();

              const practiceRow = page.locator(".studentPracticeRecommendationTable tbody tr").first();
              if (await practiceRow.isVisible().catch(() => false)) {
                await practiceRow.click();
                await expect(page.getByRole("dialog")).toBeVisible();
                await expect(page.getByText(/practice recommendation/i).first()).toBeVisible();

                const primaryAction = page
                  .getByRole("link", {
                    name: /resume practice|start practice|review practice|open summary|view details/i,
                  })
                  .first();
                if (await primaryAction.isVisible().catch(() => false)) {
                  const primaryActionHref = await primaryAction.getAttribute("href");
                  await primaryAction.click();
                  await clickOrGotoHref(
                    page,
                    primaryActionHref,
                    /\/app\/(attempts\/[^/]+(?:\/review|\/summary)?|exams\/[^/?#]+|practice|weak-areas)(?:\?.*)?$/,
                  );
                  await expect(page).toHaveURL(
                    /\/app\/(attempts\/[^/]+(?:\/review|\/summary)?|exams\/[^/?#]+|practice|weak-areas)(?:\?.*)?$/,
                  );
                }
              }
            } else {
              await expect(page.getByRole("heading", { name: /weak areas/i }).first()).toBeVisible();
            }
          }
        }
      }
    }

    await gotoQuestionPatternReport(page);
    await expect(page).toHaveURL(/\/app\/analytics\/questions(?:\?.*)?$/);

    const questionBlocked = page
      .getByText(/question analytics are not available yet|question analytics could not be loaded/i)
      .first();
    if (!(await questionBlocked.isVisible().catch(() => false))) {
      await expect(page.getByRole("heading", { name: /question pattern report/i }).first()).toBeVisible();
      const questionRow = page.locator(".studentQuestionPatternTable tbody tr").first();
      if (await questionRow.isVisible().catch(() => false)) {
        await questionRow.click({ force: true });
        const questionDialog = page.getByRole("dialog").first();
        if (await questionDialog.isVisible().catch(() => false)) {
          await expect(questionDialog).toBeVisible();
          await expect(questionDialog.getByText(/question pattern/i).first()).toBeVisible();
        } else {
          await expect(questionRow).toBeVisible();
        }
      }
    }

    await page.goto("/app/results", { waitUntil: "commit" });
    await page.waitForLoadState("load").catch(() => null);
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    const finalResultsEmpty = page.getByText(/your result history is empty right now/i).first();
    if (await finalResultsEmpty.isVisible().catch(() => false)) {
      return;
    }

    const finalRow = page.locator(".studentResultsTable tbody tr").first();
    await expect(finalRow).toBeVisible();
    await finalRow.click();

    const followUpState = await maybeVisitSummaryOrReviewFromResults(page);
    if (followUpState === "summary") {
      await expect(page.getByText(/^attempt summary$/i).first()).toBeVisible();
    }
    if (followUpState === "review") {
      await expect(page.getByRole("heading", { name: /review|attempt review is not available right now/i }).first()).toBeVisible();
    }
  });
});
