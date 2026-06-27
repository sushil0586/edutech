import { test, expect, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

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
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto("/app/exams");
    await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();
    await expectOneOf(
      page.getByText(/your mock-test workspace is empty right now/i),
      page.getByText(/mock test controls/i),
    );
    if (await page.getByText(/mock test controls/i).count()) {
      await expect(page.getByRole("link", { name: /enter exam key/i })).toBeVisible();
      await page.getByRole("link", { name: /group by availability/i }).click();
      await expect(page).toHaveURL(/exam_group=availability/);
      await expect(page.getByText(/group: availability/i)).toBeVisible();
      await page.getByRole("link", { name: /reset filters/i }).click();
      await expect(page).not.toHaveURL(/exam_group=availability/);
      await page.getByRole("link", { name: /enter exam key/i }).click();
      await expect(page).toHaveURL(/\/app\/exams\/enter-key/);
      await expect(page.getByRole("heading", { name: /enter exam key/i }).first()).toBeVisible();
      await page.goto("/app/exams");
    }
    const practiceEntry = (await page.getByRole("link", { name: /open practice/i }).count())
      ? page.getByRole("link", { name: /open practice/i }).first()
      : page.getByRole("link", { name: /^practice$/i }).first();
    await practiceEntry.click();

    await expect(page).toHaveURL(/\/app\/practice/);
    await expect(page.getByRole("heading", { name: /^practice$/i }).first()).toBeVisible();
    await expectOneOf(
      page.getByText(/your practice workspace is empty right now/i),
      page.getByText(/practice controls/i),
    );
    if (await page.getByText(/practice controls/i).count()) {
      await page.getByRole("link", { name: /group by subject/i }).click();
      await expect(page).toHaveURL(/practice_group=subject/);
      await expect(page.getByText(/group: subject/i)).toBeVisible();
      await page.getByRole("link", { name: /reset filters/i }).click();
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

    await page.goto("/app/analytics");
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    await expect(page.getByText(/analytics focus/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /open mock tests/i })).toBeVisible();

    await page.goto("/app/analytics/actions");
    await expect(page.getByRole("heading", { name: /next best moves/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open practice lane/i })).toBeVisible();

    await page.goto("/app/analytics/questions");
    await expect(page.getByRole("heading", { name: /question analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /reset filters/i })).toBeVisible();

    await page.goto("/app/analytics/sources/platform?label=Platform");
    await expect(page.getByRole("heading", { name: /platform analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /compare results/i })).toBeVisible();

    await page.goto("/app/analytics/subjects/Mathematics");
    await expect(page.getByRole("heading", { name: /mathematics analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /practice mathematics/i })).toBeVisible();

    await page.goto("/app/analytics/question-types/mcq_single");
    await expect(page.getByRole("heading", { name: /single choice/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open action center/i })).toBeVisible();

    await page.goto("/app/results");
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
      page.getByRole("link", { name: /open exams/i }),
      page.getByRole("link", { name: /open attempts/i }),
    );
    if (await page.getByRole("link", { name: /open exams/i }).count()) {
      await page.getByRole("link", { name: /open exams/i }).first().click();
      await expect(page).toHaveURL(/\/app\/exams/);
    } else {
      await page.getByRole("link", { name: /open attempts/i }).first().click();
      await expect(page).toHaveURL(/\/app\/attempts/);
    }

    await page.goto("/app/analytics/timeline");
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i })).toBeVisible();

    await page.goto("/app/analytics/results/compare");
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open timeline/i })).toBeVisible();

    await page.goto("/app/attempts");
    await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
    await expectOneOf(
      page.getByText(/your attempt history is empty right now/i),
      page.getByText(/attempt controls/i),
    );
    if (await page.getByText(/attempt controls/i).count()) {
      await page.getByRole("link", { name: /group by status/i }).click();
      await expect(page).toHaveURL(/attempt_group=status/);
      await expect(page.getByText(/group: status/i)).toBeVisible();
      await page.getByRole("link", { name: /reset filters/i }).click();
      await expect(page).not.toHaveURL(/attempt_group=status/);
      await expect(page.getByRole("link", { name: /open practice/i }).first()).toBeVisible();
    }
    await expectOneOf(
      page.getByRole("link", { name: /open exams/i }),
      page.getByRole("link", { name: /open mock tests/i }),
    );
    const examsLink = (await page.getByRole("link", { name: /open exams/i }).count())
      ? page.getByRole("link", { name: /open exams/i })
      : page.getByRole("link", { name: /open mock tests/i });
    await examsLink.click();
    await expect(page).toHaveURL(/\/app\/exams/);
  });
});
