import { test, expect, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Parameters<typeof loginAsRole>[0], url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (
        (!message.includes("ERR_CONNECTION_REFUSED") && !message.includes("Test timeout")) ||
        attempt === attempts
      ) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function expectOneOf(
  primary: Locator,
  secondary: Locator,
) {
  const primaryVisible = await primary.isVisible().catch(() => false);
  if (primaryVisible) {
    await expect(primary).toBeVisible();
    return;
  }
  await expect(secondary).toBeVisible();
}

test.describe("Student smoke journeys", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@smoke student can move through exams, practice, analytics, deep drilldowns, results, timeline, compare, and attempts journeys", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/exams");
    await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();
    await expectOneOf(
      page.getByText(/your mock-test workspace is empty right now/i),
      page.getByText(/mock test controls/i),
    );
    if (await page.getByText(/mock test controls/i).count()) {
      await expect(page.getByRole("link", { name: /enter exam key/i })).toBeVisible();
      const groupByAvailabilityLink = page.getByRole("link", { name: /group by availability/i }).first();
      const groupByAvailabilityHref = await groupByAvailabilityLink.getAttribute("href");
      expect(groupByAvailabilityHref).toContain("exam_group=availability");
      await gotoWithRetry(page, groupByAvailabilityHref!);
      await expect(page).toHaveURL(/exam_group=availability/);
      await expect(page.getByText(/group: availability/i)).toBeVisible();
      const resetExamFiltersLink = page.getByRole("link", { name: /reset filters/i }).first();
      const resetExamFiltersHref = await resetExamFiltersLink.getAttribute("href");
      expect(resetExamFiltersHref).toContain("/app/exams");
      await gotoWithRetry(page, resetExamFiltersHref!);
      await expect(page).not.toHaveURL(/exam_group=availability/);
      await page.getByRole("link", { name: /enter exam key/i }).click();
      await expect(page).toHaveURL(/\/app\/exams\/enter-key/);
      await expect(page.getByRole("heading", { name: /enter exam key/i }).first()).toBeVisible();
      await gotoWithRetry(page, "/app/exams");
    }
    const practiceEntry = (await page.getByRole("link", { name: /open practice/i }).count())
      ? page.getByRole("link", { name: /open practice/i }).first()
      : page.getByRole("link", { name: /^practice$/i }).first();
    const practiceHref = await practiceEntry.getAttribute("href");
    expect(practiceHref).toContain("/app/practice");
    await gotoWithRetry(page, practiceHref!);

    await expect(page).toHaveURL(/\/app\/practice/);
    await expect(page.getByRole("heading", { name: /^practice$/i }).first()).toBeVisible();
    await expectOneOf(
      page.getByText(/your practice workspace is empty right now/i),
      page.getByText(/practice controls/i),
    );
    if (await page.getByText(/practice controls/i).count()) {
      const groupBySubjectLink = page.getByRole("link", { name: /group by subject/i }).first();
      const groupBySubjectHref = await groupBySubjectLink.getAttribute("href");
      expect(groupBySubjectHref).toContain("practice_group=subject");
      await gotoWithRetry(page, groupBySubjectHref!);
      await expect(page).toHaveURL(/practice_group=subject/);
      await expect(page.getByText(/group: subject/i)).toBeVisible();
      const resetPracticeFiltersLink = page.getByRole("link", { name: /reset filters/i }).first();
      const resetPracticeFiltersHref = await resetPracticeFiltersLink.getAttribute("href");
      expect(resetPracticeFiltersHref).toContain("/app/practice");
      await gotoWithRetry(page, resetPracticeFiltersHref!);
      await expect(page).not.toHaveURL(/practice_group=subject/);
    }
    await expectOneOf(
      page.getByRole("link", { name: /open weak areas/i }),
      page.getByRole("link", { name: /back to weak areas/i }),
    );
    const weakAreasLink = (await page.getByRole("link", { name: /open weak areas/i }).count())
      ? page.getByRole("link", { name: /open weak areas/i })
      : page.getByRole("link", { name: /back to weak areas/i });
    await weakAreasLink.click();

    await expect(page).toHaveURL(/\/app\/weak-areas/);
    await expect(page.getByRole("heading", { name: /weak areas/i }).first()).toBeVisible();
    await expectOneOf(
      page.getByRole("heading", { name: /your topic analytics are not available right now/i }),
      page.getByText(/ranked weak topics/i),
    );
    await expectOneOf(
      page.getByRole("link", { name: /start an exam/i }),
      page.getByRole("link", { name: /choose mock test|start practice/i }).first(),
    );

    await gotoWithRetry(page, "/app/analytics");
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    await expect(page.getByText(/analytics focus/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /open mock tests/i })).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/actions");
    await expect(page.getByRole("heading", { name: /next best moves/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open practice lane/i })).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/questions");
    await expect(page.getByRole("heading", { name: /question analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /reset filters/i })).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/sources/platform?label=Platform");
    await expect(page.getByRole("heading", { name: /platform analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /compare results/i })).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/subjects/Mathematics");
    await expect(page.getByRole("heading", { name: /mathematics analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /practice mathematics/i })).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/question-types/mcq_single");
    await expect(page.getByRole("heading", { name: /single choice/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open action center/i })).toBeVisible();

    await gotoWithRetry(page, "/app/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expectOneOf(
      page.getByText(/your result history is empty right now/i),
      page.getByText(/result controls/i),
    );
    if (await page.getByText(/result controls/i).count()) {
      await page.getByRole("link", { name: /group by source/i }).click();
      await expect(page).toHaveURL(/result_group=source/);
      await expect(page.getByText(/group: source/i)).toBeVisible();
      await page.getByRole("link", { name: /reset filters/i }).click();
      await expect(page).not.toHaveURL(/result_group=source/);
      await expect(page.getByRole("link", { name: /view analytics/i }).first()).toBeVisible();
    }
    await expectOneOf(
      page.getByRole("link", { name: /open exams|open mock tests/i }),
      page.getByRole("link", { name: /open attempts/i }),
    );
    if (await page.getByRole("link", { name: /open exams|open mock tests/i }).count()) {
      const examsFromResultsLink = page.getByRole("link", { name: /open exams|open mock tests/i }).first();
      const examsFromResultsHref = await examsFromResultsLink.getAttribute("href");
      expect(examsFromResultsHref).toContain("/app/exams");
      await gotoWithRetry(page, examsFromResultsHref!);
      await expect(page).toHaveURL(/\/app\/exams/);
    } else {
      const attemptsFromResultsLink = page.getByRole("link", { name: /open attempts/i }).first();
      const attemptsFromResultsHref = await attemptsFromResultsLink.getAttribute("href");
      expect(attemptsFromResultsHref).toContain("/app/attempts");
      await gotoWithRetry(page, attemptsFromResultsHref!);
      await expect(page).toHaveURL(/\/app\/attempts/);
    }

    await gotoWithRetry(page, "/app/analytics/timeline");
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i })).toBeVisible();

    await gotoWithRetry(page, "/app/analytics/results/compare");
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open timeline/i })).toBeVisible();

    await gotoWithRetry(page, "/app/attempts");
    await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
    await expectOneOf(
      page.getByText(/your attempt history is empty right now/i),
      page.getByText(/attempt controls/i),
    );
    if (await page.getByText(/attempt controls/i).count()) {
      const groupByStatusLink = page.getByRole("link", { name: /group by status/i }).first();
      const groupByStatusHref = await groupByStatusLink.getAttribute("href");
      expect(groupByStatusHref).toContain("attempt_group=status");
      await gotoWithRetry(page, groupByStatusHref!);
      await expect(page).toHaveURL(/attempt_group=status/);
      await expect(page.getByText(/group: status/i)).toBeVisible();
      const resetAttemptFiltersLink = page.getByRole("link", { name: /reset filters/i }).first();
      const resetAttemptFiltersHref = await resetAttemptFiltersLink.getAttribute("href");
      expect(resetAttemptFiltersHref).toContain("/app/attempts");
      await gotoWithRetry(page, resetAttemptFiltersHref!);
      await expect(page.getByRole("link", { name: /open practice/i }).first()).toBeVisible();
    }
    await expectOneOf(
      page.getByRole("link", { name: /open exams|open mock tests/i }),
      page.getByRole("link", { name: /open mock tests/i }),
    );
    const examsLink = (await page.getByRole("link", { name: /open exams|open mock tests/i }).count())
      ? page.getByRole("link", { name: /open exams|open mock tests/i }).first()
      : page.getByRole("link", { name: /open mock tests/i }).first();
    const examsHref = await examsLink.getAttribute("href");
    expect(examsHref).toContain("/app/exams");
    await gotoWithRetry(page, examsHref!);
    await expect(page).toHaveURL(/\/app\/exams/);
  });
});
