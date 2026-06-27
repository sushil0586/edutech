import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherComprehensionActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_COMPREHENSION_ACTIONS",
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function selectTextWithinEditor(
  editor: Locator,
  needle: string,
) {
  const found = await editor.evaluate((node, target) => {
    const root = node as HTMLElement;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      const current = walker.currentNode as Text;
      const index = current.data.indexOf(String(target));
      if (index >= 0) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(current, index);
        range.setEnd(current, index + String(target).length);
        selection?.removeAllRanges();
        selection?.addRange(range);
        return true;
      }
    }

    return false;
  }, needle);

  expect(found).toBe(true);
}

async function selectFirstNonEmptyOption(page: Page, selector: string) {
  const locator = page.locator(selector);
  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const value = values.find((option) => option.trim().length > 0) ?? null;
  expect(value).not.toBeNull();
  await locator.selectOption(value!);
  return value!;
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
    let passageId: string | null = null;
    let questionId: string | null = null;

    try {
      await page.goto("/teacher/question-bank/comprehension/new");
      await expect(page.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();

      await selectFirstNonEmptyOption(page, 'select[name="program"]');
      await expect(page.locator('select[name="subject"]')).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="subject"]');
      await expect(page.locator('select[name="topic"]')).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="topic"]');

      await page.locator('input[name="title"]').fill(comprehensionTitle);

      const passageToolbar = page.getByRole("toolbar", { name: /passage_text rich text controls/i });
      const passageEditor = page.locator('[contenteditable="true"]').first();
      await expect(passageToolbar).toBeVisible();
      await expect(passageEditor).toBeVisible();

      await passageEditor.click();
      await page.keyboard.type("Shared Responsibility");
      await selectTextWithinEditor(passageEditor, "Shared Responsibility");
      await passageToolbar.getByRole("combobox").first().selectOption("h2");
      await passageEditor.click();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Customers secure workloads in the cloud.");
      await selectTextWithinEditor(passageEditor, "Customers");
      await passageToolbar.getByTitle(/italic/i).click();
      await passageEditor.click();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await passageToolbar.getByTitle(/bulleted list/i).click();
      await page.keyboard.type("Provider secures infrastructure");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Customer secures identities");
      await page.keyboard.press("Enter");
      await passageToolbar.getByTitle(/bulleted list/i).click();
      await page.keyboard.type("AWS reference portal");
      await selectTextWithinEditor(passageEditor, "AWS reference portal");
      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toMatch(/enter link url/i);
        await dialog.accept("https://aws.amazon.com/shared-responsibility-model/");
      });
      await passageToolbar.getByTitle(/insert link/i).click();

      const notesToolbar = page.getByRole("toolbar", { name: /description rich text controls/i });
      const notesEditor = page.locator('[contenteditable="true"]').nth(1);
      await expect(notesToolbar).toBeVisible();
      await notesEditor.click();
      await page.keyboard.type("Initial teacher note");
      await selectTextWithinEditor(notesEditor, "Initial teacher note");
      await notesToolbar.getByTitle(/underline/i).click();
      await notesEditor.click();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await notesToolbar.getByRole("combobox").first().selectOption("h3");
      await page.keyboard.type("Scoring reminders");
      await notesEditor.click();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await notesToolbar.getByTitle(/numbered list/i).click();
      await page.keyboard.type("Accept precise terminology");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Reward complete explanations");
      await page.keyboard.press("Enter");
      await notesToolbar.getByTitle(/numbered list/i).click();

      await page.getByRole("button", { name: /create comprehension set/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\/comprehension\/.+\?message=/);
      await expect(page.getByText(/comprehension set created successfully\./i)).toBeVisible();

      const detailBaseUrl = page.url().split("?")[0] ?? page.url();
      const passageIdMatch = detailBaseUrl.match(/\/teacher\/question-bank\/comprehension\/([^/?#]+)/);
      passageId = passageIdMatch?.[1] ?? null;
      expect(passageId).not.toBeNull();

      const renderedPassage = page.locator('[contenteditable="true"]').first();
      await expect(renderedPassage.locator("h2")).toBeVisible();
      await expect(renderedPassage.locator("em, i")).toContainText(/customers/i);
      await expect(renderedPassage.locator("ul li").first()).toContainText(/provider secures infrastructure/i);
      await expect(renderedPassage.locator("ul li").nth(1)).toContainText(/customer secures identities/i);
      await expect(
        renderedPassage.locator('a[href="https://aws.amazon.com/shared-responsibility-model/"]'),
      ).toContainText(/aws reference portal/i);
      const renderedNotes = page.locator('[contenteditable="true"]').nth(1);
      await expect(renderedNotes.locator("u").first()).toBeVisible();
      await expect(renderedNotes.locator("h3")).toContainText(/scoring/i);
      await expect(renderedNotes.locator("ol li").first()).toContainText(/accept precise terminology/i);
      await expect(renderedNotes.locator("ol li").nth(1)).toContainText(/reward complete explanations/i);
      await expect(page.getByText(/no linked questions yet/i)).toBeVisible();

      await page.locator('input[name="title"]').fill(updatedComprehensionTitle);
      await page.getByRole("button", { name: /save comprehension set/i }).click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(/comprehension set updated successfully\./i)).toBeVisible();
      await expect(page.locator('input[name="title"]')).toHaveValue(updatedComprehensionTitle);

      await page.goto("/teacher/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      const programSelect = page.locator('select[name="program"]');
      const subjectSelect = page.locator('select[name="subject"]');
      const topicSelect = page.locator('select[name="topic"]');
      const passageSelect = page.locator('select[name="passage"]');

      await selectFirstNonEmptyOption(page, 'select[name="program"]');
      await expect(subjectSelect).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="subject"]');
      await expect(topicSelect).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="topic"]');
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
      await expect(page.getByText(/question created successfully\./i)).toBeVisible();

      const questionDetailUrl = page.url().split("?")[0] ?? page.url();
      const questionIdMatch = questionDetailUrl.match(/\/teacher\/question-bank\/([^/?#]+)/);
      questionId = questionIdMatch?.[1] ?? null;
      expect(questionId).not.toBeNull();
      await expect(page.getByText(/linked to a comprehension set/i)).toBeVisible();

      await page.goto(`/teacher/question-bank/comprehension/${passageId}`);
      await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(linkedQuestionText), "i")).first()).toBeVisible();
      await expect(page.getByText(/order 1/i)).toBeVisible();
      await expect(page.getByText(/short_answer/i)).toBeVisible();
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
