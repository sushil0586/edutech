import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherComprehensionActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_COMPREHENSION_ACTIONS",
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function selectFirstNonEmptyOption(page: Page, selector: string) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  await expect.poll(async () => {
    const values = await locator.locator("option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
    return values.find((option) => option.trim().length > 0) ?? null;
  }).not.toBeNull();
  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const value = values.find((option) => option.trim().length > 0) ?? null;
  expect(value).not.toBeNull();
  await locator.selectOption(value!);
  return value!;
}

async function selectFirstMeaningfulOptionIfPresent(page: Page, selector: string) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();

  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const value = values.find((option) => option.trim().length > 0) ?? null;
  if (!value) {
    return null;
  }

  await locator.selectOption(value);
  return value;
}

async function selectOptionOrFirstNonEmpty(
  page: Page,
  selector: string,
  preferredValue: string | null,
) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();

  await expect
    .poll(async () => {
      const values = await locator.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      );

      if (preferredValue && values.includes(preferredValue)) {
        return preferredValue;
      }

      return values.find((option) => option.trim().length > 0) ?? null;
    })
    .not.toBeNull();

  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );

  const resolvedValue =
    (preferredValue && values.includes(preferredValue) ? preferredValue : null) ??
    values.find((option) => option.trim().length > 0) ??
    null;

  expect(resolvedValue).not.toBeNull();
  await locator.selectOption(resolvedValue!);
  return resolvedValue!;
}

test.describe("Teacher mutable comprehension actions", () => {
  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test.skip(
    !mutableTeacherComprehensionActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_COMPREHENSION_ACTIONS",
      "disposable teacher comprehension authoring coverage",
    ),
  );

  test("@workflow @mutable teacher can create a comprehension set, format rich text, and link a child question", async ({
    page,
  }) => {
    test.setTimeout(240000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const comprehensionTitle = `PW Comprehension ${uniqueSeed}`;
    const linkedQuestionText = `PW linked comprehension question ${uniqueSeed}`;
    const updatedComprehensionTitle = `${comprehensionTitle} Updated`;
    const updatedPassageSentence = "Learners secure identities in the cloud.";
    const updatedTeacherNote = "Updated teacher note";
    let passageId: string | null = null;
    let questionId: string | null = null;
    let selectedProgramId: string | null = null;
    let selectedSubjectId: string | null = null;
    let selectedTopicId: string | null = null;

    try {
      await page.goto("/teacher/question-bank/comprehension/new");
      await expect(page.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();
      await expect(page.getByText(/group a shared passage with multiple downstream questions/i).first()).toBeVisible();
      await expect(page.getByText(/^set identity$/i).first()).toBeVisible();
      await expect(page.getByText(/^passage content$/i).first()).toBeVisible();
      await expect(page.getByText(/^linked questions$/i).first()).toBeVisible();
      await expect(page.getByText(/create the comprehension set cleanly/i).first()).toBeVisible();
      await expect(page.locator('input[name="title"]')).toBeVisible();
      await expect(page.getByRole("button", { name: /create comprehension set/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /delete comprehension set/i })).toHaveCount(0);

      await page.locator('select[name="content_format"]').selectOption("plain_text");

      await page.getByRole("button", { name: /create comprehension set/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\/comprehension\/new(?:\?.*)?$/);
      await expect(page.locator('input[name="title"]')).toHaveValue("");
      await expect(page.getByText(/^set title$/i).first()).toBeVisible();
      await expect(page.getByText(/^passage text$/i).first()).toBeVisible();

      selectedProgramId = await selectFirstNonEmptyOption(page, 'select[name="program"]');
      await expect(page.locator('select[name="subject"]')).toBeEnabled();
      selectedSubjectId = await selectFirstNonEmptyOption(page, 'select[name="subject"]');
      await expect(page.locator('select[name="topic"]')).toBeEnabled();
      selectedTopicId = await selectFirstMeaningfulOptionIfPresent(page, 'select[name="topic"]');

      await page.locator('input[name="title"]').fill(comprehensionTitle);
      await page.getByRole("button", { name: /create comprehension set/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\/comprehension\/new(?:\?.*)?$/);
      await expect(page.getByText(/^passage text$/i).first()).toBeVisible();
      await expect(page.locator('input[name="title"]')).toHaveValue(comprehensionTitle);

      const passageEditor = page.locator('textarea[name="passage_text"]');
      const notesEditor = page.locator('textarea[name="description"]');
      await expect(passageEditor).toBeVisible();
      await expect(notesEditor).toBeVisible();

      await passageEditor.fill(
        [
          "Shared Responsibility",
          "",
          "Customers secure workloads in the cloud.",
          "",
          "- Provider secures infrastructure",
          "- Customer secures identities",
          "",
          "AWS reference portal: https://aws.amazon.com/shared-responsibility-model/",
        ].join("\n"),
      );
      await notesEditor.fill(
        [
          "Initial teacher note",
          "",
          "Scoring reminders",
          "1. Accept precise terminology",
          "2. Reward complete explanations",
        ].join("\n"),
      );

      await page.getByRole("button", { name: /create comprehension set/i }).click();
      await expect
        .poll(() => page.url(), { timeout: 30000 })
        .toMatch(/\/teacher\/question-bank\/comprehension\/(?!new)[^/?#]+(?:\?.*)?$/);
      const createdMessage = page.getByText(/comprehension set created successfully\./i).first();
      if (await createdMessage.isVisible().catch(() => false)) {
        await expect(createdMessage).toBeVisible();
      }

      const detailBaseUrl = page.url().split("?")[0] ?? page.url();
      const passageIdMatch = detailBaseUrl.match(/\/teacher\/question-bank\/comprehension\/([^/?#]+)/);
      passageId = passageIdMatch?.[1] ?? null;
      expect(passageId).not.toBeNull();

      const renderedPassage = page.locator('textarea[name="passage_text"]');
      const renderedNotes = page.locator('textarea[name="description"]');
      await expect(renderedPassage).toHaveValue(/Shared Responsibility/);
      await expect(renderedPassage).toHaveValue(/Customers secure workloads in the cloud\./);
      await expect(renderedPassage).toHaveValue(/Provider secures infrastructure/);
      await expect(renderedPassage).toHaveValue(/Customer secures identities/);
      await expect(renderedPassage).toHaveValue(/AWS reference portal:/);
      await expect(renderedNotes).toHaveValue(/Initial teacher note/);
      await expect(renderedNotes).toHaveValue(/Scoring reminders/);
      await expect(renderedNotes).toHaveValue(/Accept precise terminology/);
      await expect(renderedNotes).toHaveValue(/Reward complete explanations/);
      await expect(page.getByText(/^no linked questions yet$/i).first()).toBeVisible();

      await page.locator('input[name="title"]').fill(updatedComprehensionTitle);
      await passageEditor.fill(
        [
          "Shared Responsibility",
          "",
          updatedPassageSentence,
          "",
          "- Provider secures infrastructure",
          "- Customer secures identities",
          "",
          "AWS reference portal: https://aws.amazon.com/shared-responsibility-model/",
        ].join("\n"),
      );
      await notesEditor.fill(
        [
          updatedTeacherNote,
          "",
          "Scoring reminders",
          "1. Accept precise terminology",
          "2. Reward complete explanations",
        ].join("\n"),
      );
      await page.getByRole("button", { name: /save comprehension set/i }).click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(/comprehension set updated successfully\./i).first()).toBeVisible();
      await expect(page.locator('input[name="title"]')).toHaveValue(updatedComprehensionTitle);
      await expect(renderedPassage).toHaveValue(new RegExp(escapeRegExp(updatedPassageSentence)));
      await expect(renderedPassage).not.toHaveValue(/Customers secure workloads in the cloud\./i);
      await expect(renderedNotes).toHaveValue(new RegExp(escapeRegExp(updatedTeacherNote)));
      await expect(renderedNotes).not.toHaveValue(/Initial teacher note/i);

      await page.goto(`/teacher/question-bank/comprehension/${passageId}`);
      await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
      await expect(page.locator('input[name="title"]')).toHaveValue(updatedComprehensionTitle);
      await expect(page.locator('textarea[name="passage_text"]')).toHaveValue(/Shared Responsibility/);
      await expect(page.locator('textarea[name="passage_text"]')).toHaveValue(
        new RegExp(escapeRegExp(updatedPassageSentence)),
      );
      await expect(page.locator('textarea[name="passage_text"]')).not.toHaveValue(
        /Customers secure workloads in the cloud\./i,
      );
      await expect(page.locator('textarea[name="description"]')).toHaveValue(/Scoring reminders/);
      await expect(page.locator('textarea[name="description"]')).toHaveValue(
        new RegExp(escapeRegExp(updatedTeacherNote)),
      );
      await expect(page.locator('textarea[name="description"]')).not.toHaveValue(/Initial teacher note/i);
      await expect(page.getByRole("button", { name: /save comprehension set/i })).toBeVisible();

      await page.goto("/teacher/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      const subjectSelect = page.locator('select[name="subject"]');
      const topicSelect = page.locator('select[name="topic"]');
      const passageSelect = page.locator('select[name="passage"]');

      await selectOptionOrFirstNonEmpty(page, 'select[name="program"]', selectedProgramId);
      await expect(subjectSelect).toBeEnabled();
      await selectOptionOrFirstNonEmpty(page, 'select[name="subject"]', selectedSubjectId);
      await expect(topicSelect).toBeEnabled();
      if (selectedTopicId) {
        await selectOptionOrFirstNonEmpty(page, 'select[name="topic"]', selectedTopicId);
      } else {
        await selectFirstMeaningfulOptionIfPresent(page, 'select[name="topic"]');
      }
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
        "Disposable linked comprehension explanation.",
      );
      await page.locator('textarea[name="accepted_answers"]').fill("shared responsibility");
      await page.locator('input[name="default_marks"]').fill("2");
      await page.locator('input[name="negative_marks"]').fill("0");

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);
      await expect(page.getByText(/question created successfully\./i).first()).toBeVisible();

      const questionDetailUrl = page.url().split("?")[0] ?? page.url();
      const questionIdMatch = questionDetailUrl.match(/\/teacher\/question-bank\/([^/?#]+)/);
      questionId = questionIdMatch?.[1] ?? null;
      expect(questionId).not.toBeNull();
      await expect(page.getByText(/linked to a comprehension set/i).first()).toBeVisible();

      await page.goto(`/teacher/question-bank/comprehension/${passageId}`);
      await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(linkedQuestionText), "i")).first()).toBeVisible();
      await expect(page.getByText(/order 1/i).first()).toBeVisible();
      await expect(page.getByText(/short_answer/i).first()).toBeVisible();
      await expect(page.getByText(/save this set first, then open the regular question editor/i)).toHaveCount(0);
    } finally {
      if (questionId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteQuestionResponse = await page.request.delete(
          `/api/teacher/question-bank/questions/${questionId}`,
        );
        expect(deleteQuestionResponse.ok()).toBe(true);
      }
      if (passageId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deletePassageResponse = await page.request.delete(
          `/api/question-bank/passages/${passageId}`,
        );
        expect(deletePassageResponse.ok()).toBe(true);
      }
    }
  });
});
