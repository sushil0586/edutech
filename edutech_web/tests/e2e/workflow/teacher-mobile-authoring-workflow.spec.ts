import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

function firstNonEmptyOptionValue(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? null;
}

async function selectFirstNonEmptyOption(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => {
      const values = await locator.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      );
      return firstNonEmptyOptionValue(values);
    })
    .not.toBeNull();

  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const optionValue = firstNonEmptyOptionValue(values);
  expect(optionValue).not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
}

async function selectProgramWithAvailableSubjects(page: Page) {
  const programSelect = page.locator('select[name="program"]');
  const subjectSelect = page.locator('select[name="subject"]');
  const programValues = await programSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );

  for (const programValue of programValues) {
    await programSelect.selectOption(programValue);
    try {
      await expect
        .poll(async () => subjectSelect.isDisabled().catch(() => true), { timeout: 2500 })
        .toBe(false);
      await expect.poll(async () => subjectSelect.locator("option").count()).toBeGreaterThan(1);
      const subjectValues = await subjectSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .filter((value) => value.trim().length > 0),
      );
      if (subjectValues.length > 0) {
        return { programValue, subjectValues };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function waitForQuestionAuthoringShell(page: Page, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const heading = page.locator("h1").first();
    const headingText = await heading.innerText().catch(() => "");
    if (/create question/i.test(headingText)) {
      return;
    }

    if (!/this page couldn.?t load/i.test(headingText) && attempt === attempts) {
      return;
    }

    await page.waitForTimeout(1000 * attempt);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
}

test.describe("Teacher mobile authoring workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test("@workflow teacher mobile viewport supports disposable draft authoring", async ({
    page,
  }) => {
    const uniqueSeed = Date.now();
    const questionText = `PW Mobile Teacher Draft ${uniqueSeed}`;
    let questionId: string | null = null;

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    try {
      await gotoWithRetry(page, "/teacher/question-bank/new");
      await waitForQuestionAuthoringShell(page);
      await expect(page).toHaveURL(/\/teacher\/question-bank\/new(?:\?.*)?$/);
      await expect(page.locator("h1").first()).toContainText(/create question/i);

      const programSelect = page.locator('select[name="program"]');
      const subjectSelect = page.locator('select[name="subject"]');
      const topicSelect = page.locator('select[name="topic"]');
      const questionTypeSelect = page.locator('select[name="question_type"]');

      await expect(subjectSelect).toBeDisabled();
      const resolvedAcademicPath = await selectProgramWithAvailableSubjects(page);
      expect(resolvedAcademicPath).not.toBeNull();
      await expect(programSelect).not.toHaveValue("");
      await selectFirstNonEmptyOption(subjectSelect);
      await expect(topicSelect).toBeVisible();
      await expect.poll(async () => topicSelect.isDisabled().catch(() => true)).toBe(false);

      const topicValues = await topicSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .filter((value) => value.trim().length > 0),
      );
      if (topicValues.length > 0) {
        await topicSelect.selectOption(topicValues[0]!);
      }

      const questionTypeValues = await questionTypeSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .filter((value) => value.trim().length > 0),
      );

      let selectedQuestionType: string | null = null;
      for (const optionValue of questionTypeValues) {
        await questionTypeSelect.selectOption(optionValue);
        if (await page.getByText(/no options required/i).first().isVisible().catch(() => false)) {
          selectedQuestionType = optionValue;
          break;
        }
      }
      expect(selectedQuestionType).not.toBeNull();

      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page.locator('textarea[name="explanation"]').fill("Mobile teacher authoring draft explanation.");

      const acceptedAnswers = page.locator('textarea[name="accepted_answers"]');
      if (await acceptedAnswers.isVisible().catch(() => false)) {
        await acceptedAnswers.fill("Mobile teacher answer");
      }

      const reviewGuidance = page.locator('textarea[name="review_guidance"]');
      if (await reviewGuidance.isVisible().catch(() => false)) {
        await reviewGuidance.fill("Award full credit for the intended mobile teacher answer.");
      }

      await page.getByLabel(/save as draft/i).check();
      await page.getByRole("button", { name: /^create question$/i }).click();

      await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);
      const detailBaseUrl = page.url().split("?")[0] ?? page.url();
      const questionIdMatch = detailBaseUrl.match(/\/teacher\/question-bank\/([^/?#]+)/);
      questionId = questionIdMatch?.[1] ?? null;
      expect(questionId).not.toBeNull();

      await expect(page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();
      await expect(page.getByText(/draft/i).first()).toBeVisible();
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/teacher/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
