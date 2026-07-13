import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteComprehensionActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_COMPREHENSION_ACTIONS",
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function selectFirstNonEmptyOption(page: Page, selector: string) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => {
      const values = await locator.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      );
      return values.find((option) => option.trim().length > 0) ?? null;
    })
    .not.toBeNull();
  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const value = values.find((option) => option.trim().length > 0) ?? null;
  expect(value).not.toBeNull();
  await locator.selectOption(value!);
  return value!;
}

async function selectFirstMeaningfulTopicIfPresent(page: Page, selector: string) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => ({
      value: (option as HTMLOptionElement).value,
      label: (option as HTMLOptionElement).label,
      text: (option.textContent ?? "").trim(),
    })),
  );
  const value =
    values.find((option) => option.value.trim().length > 0)?.value ??
    values.find((option) => !/no topic/i.test(`${option.label} ${option.text}`))?.value ??
    null;
  if (!value) {
    return null;
  }
  await locator.selectOption(value);
  return value;
}

test.describe("Institute mutable comprehension actions", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteComprehensionActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_COMPREHENSION_ACTIONS",
      "disposable institute comprehension authoring coverage",
    ),
  );

  test("@workflow @mutable institute can create a comprehension set, update it, and link a child question", async ({
    page,
  }) => {
    test.setTimeout(240000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const comprehensionTitle = `Institute Comprehension ${uniqueSeed}`;
    const linkedQuestionText = `Institute linked comprehension question ${uniqueSeed}`;
    const updatedComprehensionTitle = `${comprehensionTitle} Updated`;
    const updatedPassageSentence = "Learners secure access policies inside the institute workspace.";
    const updatedTeacherNote = "Updated institute author note";

    let passageId: string | null = null;
    let questionId: string | null = null;

    try {
      await page.goto("/institute/question-bank/comprehension/new");
      await expect(page.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /create comprehension set/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /delete comprehension set/i })).toHaveCount(0);

      await page.locator('select[name="content_format"]').selectOption("plain_text");

      await page.getByRole("button", { name: /create comprehension set/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/comprehension\/new(?:\?.*)?$/);
      await expect(page.locator('input[name="title"]')).toHaveValue("");
      await expect(page.getByText(/^set title$/i).first()).toBeVisible();
      await expect(page.getByText(/^passage text$/i).first()).toBeVisible();

      await selectFirstNonEmptyOption(page, 'select[name="program"]');
      await expect(page.locator('select[name="subject"]')).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="subject"]');
      await expect(page.locator('select[name="topic"]')).toBeEnabled();
      await selectFirstMeaningfulTopicIfPresent(page, 'select[name="topic"]');

      await page.locator('input[name="title"]').fill(comprehensionTitle);
      await page.getByRole("button", { name: /create comprehension set/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/comprehension\/new(?:\?.*)?$/);
      await expect(page.locator('input[name="title"]')).toHaveValue(comprehensionTitle);
      await expect(page.getByText(/^passage text$/i).first()).toBeVisible();

      const passageEditor = page.locator('textarea[name="passage_text"]');
      const notesEditor = page.locator('textarea[name="description"]');
      await expect(passageEditor).toBeVisible();
      await expect(notesEditor).toBeVisible();

      await passageEditor.fill(
        [
          "Access Control Primer",
          "",
          "Institutes assign the right users to the right assessments.",
          "",
          "- Roles define access",
          "- Reviewers verify outcomes",
          "",
          "Reference: controlled release rules",
        ].join("\n"),
      );
      await notesEditor.fill(
        [
          "Initial institute author note",
          "",
          "Review reminders",
          "1. Validate access language",
          "2. Reward complete reasoning",
        ].join("\n"),
      );

      await page.getByRole("button", { name: /create comprehension set/i }).click();
      await expect
        .poll(() => page.url(), { timeout: 30000 })
        .toMatch(/\/institute\/question-bank\/comprehension\/(?!new)[^/?#]+(?:\?.*)?$/);

      const detailBaseUrl = page.url().split("?")[0] ?? page.url();
      const passageIdMatch = detailBaseUrl.match(/\/institute\/question-bank\/comprehension\/([^/?#]+)/);
      passageId = passageIdMatch?.[1] ?? null;
      expect(passageId).not.toBeNull();

      await expect(page.locator('input[name="title"]')).toHaveValue(comprehensionTitle);
      await expect(passageEditor).toHaveValue(/Access Control Primer/);
      await expect(notesEditor).toHaveValue(/Initial institute author note/);
      await expect(page.getByText(/^no linked questions yet$/i).first()).toBeVisible();

      await page.locator('input[name="title"]').fill(updatedComprehensionTitle);
      await passageEditor.fill(
        [
          "Access Control Primer",
          "",
          updatedPassageSentence,
          "",
          "- Roles define access",
          "- Reviewers verify outcomes",
          "",
          "Reference: controlled release rules",
        ].join("\n"),
      );
      await notesEditor.fill(
        [
          updatedTeacherNote,
          "",
          "Review reminders",
          "1. Validate access language",
          "2. Reward complete reasoning",
        ].join("\n"),
      );

      await page.getByRole("button", { name: /save comprehension set/i }).click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(/comprehension set updated successfully\./i).first()).toBeVisible();
      await expect(page.locator('input[name="title"]')).toHaveValue(updatedComprehensionTitle);
      await expect(passageEditor).toHaveValue(new RegExp(escapeRegExp(updatedPassageSentence)));
      await expect(notesEditor).toHaveValue(new RegExp(escapeRegExp(updatedTeacherNote)));

      await page.goto(`/institute/question-bank/comprehension/${passageId}`);
      await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
      await expect(page.locator('input[name="title"]')).toHaveValue(updatedComprehensionTitle);
      await expect(page.locator('textarea[name="passage_text"]')).toHaveValue(
        new RegExp(escapeRegExp(updatedPassageSentence)),
      );
      await expect(page.locator('textarea[name="description"]')).toHaveValue(
        new RegExp(escapeRegExp(updatedTeacherNote)),
      );

      await page.goto("/institute/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      const subjectSelect = page.locator('select[name="subject"]');
      const topicSelect = page.locator('select[name="topic"]');
      const passageSelect = page.locator('select[name="passage"]');

      await selectFirstNonEmptyOption(page, 'select[name="program"]');
      await expect(subjectSelect).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="subject"]');
      await expect(topicSelect).toBeEnabled();
      await selectFirstMeaningfulTopicIfPresent(page, 'select[name="topic"]');
      await expect(passageSelect).toBeEnabled();

      const targetPassageOption = await passageSelect.locator("option").evaluateAll(
        (options, expectedTitle) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find(
              (option) =>
                option.value.trim().length > 0 &&
                option.label.toLowerCase().includes(String(expectedTitle).toLowerCase()),
            ) ?? null,
        updatedComprehensionTitle,
      );
      expect(targetPassageOption).not.toBeNull();
      await passageSelect.selectOption(targetPassageOption!.value);

      await page.locator('input[name="passage_order"]').fill("1");
      await page.locator('select[name="question_type"]').selectOption("short_answer");
      await page.locator('textarea[name="question_text"]').fill(linkedQuestionText);
      await page.locator('textarea[name="explanation"]').fill(
        "Disposable linked institute comprehension explanation.",
      );
      await page.locator('textarea[name="accepted_answers"]').fill("controlled release");
      await page.locator('input[name="default_marks"]').fill("2");
      await page.locator('input[name="negative_marks"]').fill("0");

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      await expect(page.getByText(/question created successfully\./i).first()).toBeVisible();

      const questionDetailUrl = page.url().split("?")[0] ?? page.url();
      const questionIdMatch = questionDetailUrl.match(/\/institute\/question-bank\/([^/?#]+)/);
      questionId = questionIdMatch?.[1] ?? null;
      expect(questionId).not.toBeNull();
      await expect(page.getByText(/linked to a comprehension set/i).first()).toBeVisible();

      await page.goto(`/institute/question-bank/comprehension/${passageId}`);
      await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(linkedQuestionText), "i")).first()).toBeVisible();
      await expect(page.getByText(/order 1/i).first()).toBeVisible();
      await expect(page.getByText(/short_answer/i).first()).toBeVisible();
      await expect(page.getByText(/save this set first, then open the regular question editor/i)).toHaveCount(0);
    } finally {
      if (questionId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        const deleteQuestionResponse = await page.request.delete(
          `/api/teacher/question-bank/questions/${questionId}`,
        );
        expect(deleteQuestionResponse.ok()).toBe(true);
      }
      if (passageId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        const deletePassageResponse = await page.request.delete(`/api/question-bank/passages/${passageId}`);
        expect(deletePassageResponse.ok()).toBe(true);
      }
    }
  });
});
