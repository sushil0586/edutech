import { test, expect, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

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

test.describe("Teacher smoke journeys", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@smoke teacher can move through dashboard, exams, question bank, reviews, and results workspaces", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/dashboard");
    await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /new exam/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /new question/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /open exams|exams/i }).first()).toBeVisible();
    await page.getByLabel(/focus lane/i).selectOption("questions");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/lane=questions/);
    await expect(page.getByText(/lane: questions/i)).toBeVisible();
    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).not.toHaveURL(/lane=questions/);

    await page.getByRole("link", { name: /^exams$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/exams/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();
    await expectOneOf(
      page.getByText(/your teacher exam list is empty right now/i),
      page.getByText(/exam controls/i),
    );
    if (await page.getByLabel(/^group by$/i).count()) {
      await page.getByLabel(/^group by$/i).selectOption("status");
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/exam_group=status/);
      await expect(page.getByText(/group: status/i)).toBeVisible();
      await page.getByRole("link", { name: /reset filters/i }).click();
      await expect(page).not.toHaveURL(/exam_group=status/);
    }

    await page.getByRole("link", { name: /quick create/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams\/new/);
    await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
    await page.goto("/teacher/exams");

    await page.getByRole("link", { name: /advanced builder/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams\/advanced/);
    await expect(page.getByRole("heading", { name: /advanced/i }).first()).toBeVisible();
    await page.goto("/teacher/exams");

    const openExamLinks = page.getByRole("link", { name: /open exam/i });
    if (await openExamLinks.count()) {
      await openExamLinks.first().click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+$/);
      const examDetailUrl = page.url();
      await expect(page.getByText("Exam Code", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Assigned Students", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Exam Access Key", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Result Status", { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /back to exams/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /link questions/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /open builder/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /save access policy/i })).toBeVisible();

      await page.getByRole("button", { name: /refresh status/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await page.goto(examDetailUrl);
      await page.getByRole("button", { name: /sync marks/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await page.goto(examDetailUrl);
      await page.getByRole("link", { name: /link questions/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\/builder\?tab=questions/);
      await expect(page.getByRole("link", { name: /open delivery view/i })).toBeVisible();
      await page.getByRole("link", { name: /open delivery view/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+$/);
    }

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /import questions csv/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /import comprehension csv/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /create comprehension set/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /create question/i })).toBeVisible();
    await page.getByLabel(/search question text/i).fill("AWS");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/search=AWS/);
    await page.getByRole("link", { name: /^reset$/i }).click();
    await expect(page).not.toHaveURL(/search=AWS/);
    await page.getByRole("link", { name: /import questions csv/i }).click();
    await expect(page).toHaveURL(/\/teacher\/question-bank\/import/);
    await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
    await page.goto("/teacher/question-bank");
    await page.getByRole("link", { name: /import comprehension csv/i }).click();
    await expect(page).toHaveURL(/\/teacher\/question-bank\/comprehension\/import/);
    await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();
    await page.goto("/teacher/question-bank");
    const createComprehensionLink = page.getByRole("link", { name: /create comprehension set/i }).last();
    await expect(createComprehensionLink).toHaveAttribute("href", /\/teacher\/question-bank\/comprehension\/new/);
    await page.goto("/teacher/question-bank/comprehension/new");
    await expect(page).toHaveURL(/\/teacher\/question-bank\/comprehension\/new/);
    await expect(page.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();
    await page.goto("/teacher/question-bank/new");
    await expect(page).toHaveURL(/\/teacher\/question-bank\/new/);
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^reviews$/i }).click();
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /claim next task|resume my next task/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /open pending/i })).toBeVisible();
    await page.getByRole("link", { name: /open pending/i }).first().click();
    await expect(page).toHaveURL(/status=pending/);
    await page.getByRole("link", { name: /^reset$/i }).click();
    await expect(page).not.toHaveURL(/status=pending/);

    await page.getByRole("link", { name: /^results$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/results/);
    await page.goto("/teacher/results/analysis");
    await expect(page.getByText(/analytics flow|analysis lens|question risk board/i).first()).toBeVisible();
  });
});
