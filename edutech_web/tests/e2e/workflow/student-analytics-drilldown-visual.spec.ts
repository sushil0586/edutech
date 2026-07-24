import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectVisualSnapshot(locator: Locator, name: string, maxDiffPixels: number) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    maxDiffPixels,
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

async function openAnalytics(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/analytics");
  await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
  await expect(page.locator(".analyticsKpiGrid").first()).toBeVisible();
}

async function openTimeline(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/analytics/timeline");
  await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
}

async function openFirstTopic(page: Page) {
  await openAnalytics(page);

  const directTopicLinks = page.locator('a[href^="/app/analytics/topics/"]');
  if ((await directTopicLinks.count()) === 0) {
    const sourceLink = page.locator('a[href^="/app/analytics/sources/"]').first();
    await expect(sourceLink).toBeVisible();
    await sourceLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/sources\/[^/?#]+(?:\?.*)?$/);
  }

  const topicLink = page.locator('a[href^="/app/analytics/topics/"]').first();
  await expect(topicLink).toBeVisible();
  await topicLink.click();
  await expect(page).toHaveURL(/\/app\/analytics\/topics\/[^/?#]+(?:\?.*)?$/);
}

async function openFirstSubject(page: Page) {
  await openFirstTopic(page);

  const subjectLink = page.getByRole("link", { name: /back to subject/i }).first();
  if (await subjectLink.isVisible().catch(() => false)) {
    await subjectLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
    return;
  }

  const directSubjectLink = page.locator('a[href^="/app/analytics/subjects/"]').first();
  if (await directSubjectLink.isVisible().catch(() => false)) {
    await directSubjectLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
    return;
  }

  await openAnalytics(page);
  const fallbackSubjectLink = page.locator('a[href^="/app/analytics/subjects/"]').first();
  if (await fallbackSubjectLink.isVisible().catch(() => false)) {
    await fallbackSubjectLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
    return;
  }

  const subjectOption = await page
    .getByRole("combobox", { name: /dashboard subject context/i })
    .locator("option")
    .evaluateAll((options) =>
      options
        .map((option) => option.textContent?.trim() ?? "")
        .find((label) => label && label.toLowerCase() !== "overall") ?? null,
    );

  expect(subjectOption).not.toBeNull();
  await gotoWithRuntimeRecovery(
    page,
    `/app/analytics/subjects/${encodeURIComponent(String(subjectOption))}`,
  );
  await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
}

async function openFirstQuestionType(page: Page) {
  await openFirstTopic(page);

  let questionTypeLink = page.locator('a[href^="/app/analytics/question-types/"]').first();
  if (!(await questionTypeLink.isVisible().catch(() => false))) {
    const subjectLink = page.getByRole("link", { name: /back to subject/i }).first();
    if (await subjectLink.isVisible().catch(() => false)) {
      await subjectLink.click();
      await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
    }
    questionTypeLink = page.locator('a[href^="/app/analytics/question-types/"]').first();
  }

  if (await questionTypeLink.isVisible().catch(() => false)) {
    await questionTypeLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/question-types\/[^/?#]+(?:\?.*)?$/);
    return;
  }

  await openAnalytics(page);
  const fallbackQuestionTypeLink = page.locator('a[href^="/app/analytics/question-types/"]').first();
  await expect(fallbackQuestionTypeLink).toBeVisible();
  await fallbackQuestionTypeLink.click();
  await expect(page).toHaveURL(/\/app\/analytics\/question-types\/[^/?#]+(?:\?.*)?$/);
}

test.describe("Student analytics drilldown visual", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow @visual student timeline drilldown stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openTimeline(page);

    const blockedState = page
      .getByText(/performance timeline is not available yet|performance timeline could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-timeline-drilldown-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".analyticsDetailHero").first(),
      "student-timeline-drilldown-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-timeline-drilldown-kpi-strip.png",
      280,
    );
    await expectVisualSnapshot(
      page.locator(".studentInsightsTwoColumn").first(),
      "student-timeline-drilldown-primary-grid.png",
      360,
    );
  });

  test("@workflow @visual student topic drilldown stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openFirstTopic(page);

    const blockedState = page
      .getByText(/topic analytics are not available yet|topic analytics could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-topic-drilldown-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".topicFocusCompact").first(),
      "student-topic-drilldown-focus-header.png",
      340,
    );
    await expectVisualSnapshot(
      page.locator(".analyticsKpiGrid").first(),
      "student-topic-drilldown-kpi-strip.png",
      280,
    );
    await expectVisualSnapshot(
      page.locator(".studentInsightsTwoColumn").first(),
      "student-topic-drilldown-primary-grid.png",
      360,
    );
  });

  test("@workflow @visual student subject drilldown stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openFirstSubject(page);

    const blockedState = page
      .getByText(/subject analytics are not available yet|subject analytics could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-subject-drilldown-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".analyticsDetailHero").first(),
      "student-subject-drilldown-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-subject-drilldown-kpi-strip.png",
      280,
    );
    const primarySurface = await firstVisible([
      page.locator(".studentInsightsTwoColumn").first(),
      page.locator(".contentCard").filter({ hasText: /weak topic hotspots/i }).first(),
    ]);
    await expectVisualSnapshot(
      primarySurface,
      "student-subject-drilldown-primary-grid.png",
      380,
    );
  });

  test("@workflow @visual student question-type drilldown stays aligned", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await openFirstQuestionType(page);

    const blockedState = page
      .getByText(/question-type analytics are not available yet|question-type analytics could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      await expect(page.locator("main")).toHaveScreenshot("student-question-type-drilldown-blocked-state.png", {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 240,
      });
      return;
    }

    await expectVisualSnapshot(
      page.locator(".analyticsDetailHero").first(),
      "student-question-type-drilldown-hero.png",
      320,
    );
    await expectVisualSnapshot(
      page.locator(".resultsSummaryGrid").first(),
      "student-question-type-drilldown-kpi-strip.png",
      280,
    );
    const primarySurface = await firstVisible([
      page.locator(".studentInsightsTwoColumn").first(),
      page.locator(".contentCard").filter({ hasText: /benchmark view/i }).first(),
    ]);
    await expectVisualSnapshot(
      primarySurface,
      "student-question-type-drilldown-primary-grid.png",
      380,
    );
  });
});
