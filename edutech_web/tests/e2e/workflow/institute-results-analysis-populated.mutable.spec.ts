import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectInstituteWorkspace,
  expectStudentWorkspace,
} from "../helpers/navigation";

const mutableInstituteResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const optionValue = values.find((value) => value.trim().length > 0) ?? null;
  expect(optionValue).not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
}

async function getCurrentSessionAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken =
    cookies.find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteInstituteExam(page: Page, examId: string) {
  const accessToken = await getCurrentSessionAccessToken(page);

  try {
    const response = await page.request.delete(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    if (response.ok()) {
      return;
    }
  } catch {
    // Fall back to the web proxy route used elsewhere in the suite.
  }

  const proxyResponse = await page.request.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect(proxyResponse.ok()).toBe(true);
}

test.describe("Institute populated analysis mutable coverage", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "populated institute analysis coverage",
    ),
  );

  test("@workflow @mutable institute can inspect populated analysis cards and student evidence for a disposable result", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let questionId: string | null = null;
    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW institute analysis question ${uniqueSeed}`;
    const examTitle = `PW Institute Analysis ${uniqueSeed}`;
    const examCode = `PW-IA-${uniqueSeed}`;
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto("/app/profile");
      await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();
      const identityCard = page.locator(".detailCard").filter({
        has: page.getByText(/^name$/i),
      }).first();
      if (await identityCard.count()) {
        const renderedName = (await identityCard.locator("strong").first().textContent())?.trim();
        if (renderedName) {
          studentDisplayName = renderedName;
        }
      }

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await page.goto("/institute/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      const programSelect = page.locator('select[name="program"]');
      const subjectSelect = page.locator('select[name="subject"]');
      const topicSelect = page.locator('select[name="topic"]');
      const questionTypeSelect = page.locator('select[name="question_type"]');

      await selectFirstNonEmptyOption(programSelect);
      await expect(subjectSelect).toBeEnabled();
      await selectFirstNonEmptyOption(subjectSelect);
      await expect(topicSelect).toBeEnabled();
      await selectFirstNonEmptyOption(topicSelect);
      await questionTypeSelect.selectOption("true_false");

      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page
        .locator('textarea[name="explanation"]')
        .fill("Playwright populated analysis explanation for institute coverage.");
      const optionRows = page.locator(".questionEditorOptionRow");
      await expect(optionRows).toHaveCount(2);
      await optionRows.first().locator('input[type="radio"]').check();
      await page.locator('input[name="default_marks"]').fill("4");
      await page.locator('input[name="negative_marks"]').fill("0");

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      const questionDetailUrl = page.url().split("?")[0] ?? page.url();
      questionId = questionDetailUrl.match(/\/institute\/question-bank\/([^/?#]+)/)?.[1] ?? null;
      expect(questionId).not.toBeNull();

      await page.goto("/institute/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);

      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      examId = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const targetQuestionOption = await questionSelect.locator("option").evaluateAll(
        (options, expectedQuestionText) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find(
              (option) =>
                option.value.trim().length > 0 &&
                option.label.toLowerCase().includes(String(expectedQuestionText).toLowerCase()),
            ) ?? null,
        questionText,
      );
      expect(targetQuestionOption).not.toBeNull();
      await questionSelect.selectOption(targetQuestionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);

      await page.goto(`/institute/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();
      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
      }).first();

      if (await matchingStudentRow.count()) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await matchingStudentRow.locator('input[name="student_ids"]').check();
      } else {
        await studentCheckboxes.first().check();
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page).toHaveURL(/tab=assignment&message=/);

      await page.goto(`/institute/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("4");
      await page.locator('input[name="passing_marks"]').fill("2");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/institute/exams/${examId}`);
      const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
      if (await syncMarksButton.count()) {
        await syncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
      }
      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.count()) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      }
      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.count()) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${examId}`);
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
      ).toBeVisible();
      await page
        .getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i })
        .click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright institute analysis answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/1 saved|response updated successfully/i).first()).toBeVisible();

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^submit test$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
      await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${examId}`);
      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const generateResultsButton = page.getByRole("button", { name: /generate results|regenerate summary/i }).first();
      await expect(generateResultsButton).toBeVisible();
      await generateResultsButton.click();
      await expect(page).toHaveURL(/message=/);

      const calculateRanksButton = page.getByRole("button", { name: /calculate ranks|recalculate ranks/i }).first();
      await expect(calculateRanksButton).toBeVisible();
      await calculateRanksButton.click();
      await expect(page).toHaveURL(/message=/);

      const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
      if (await publishResultsButton.isVisible().catch(() => false)) {
        await publishResultsButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await expect
        .poll(
          async () => {
            await page.goto(`/institute/results/analysis?exam=${examId}`);
            return page.getByText(/question risk board/i).first().isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);

      await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*exam=/);
      await expect(page.getByText(/all exams to exam-wise to student-wise to question-wise evidence/i).first()).toBeVisible();
      await expect(page.getByText(/analysis lens/i).first()).toBeVisible();
      await expect(page.getByText(/family focus board/i).first()).toBeVisible();
      await expect(page.getByText(/exam pulse/i).first()).toBeVisible();
      await expect(page.getByText(/topic strength/i).first()).toBeVisible();
      await expect(page.getByText(/question risk board/i).first()).toBeVisible();
      await expect(page.getByText(/^student explorer$/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(questionText), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();

      const studentCard = page.locator("a.analyticsResultStudentCard").first();
      await expect(studentCard).toBeVisible();
      await studentCard.click();
      await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*attempt=/);
      await expect(page.getByText(/selected student/i).first()).toBeVisible();
      await expect(page.getByText(/question-wise evidence/i).first()).toBeVisible();
      await expect(page.getByText(/rubric insight/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(questionText), "i")).first()).toBeVisible();

      await page.getByRole("link", { name: /^all$/i }).last().click();
      await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*student_question_filter=all/);
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteInstituteExam(page, examId);
      }
      if (questionId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        const deleteQuestionResponse = await page.request.delete(`/api/question-bank/questions/${questionId}`);
        expect(deleteQuestionResponse.ok()).toBe(true);
      }
    }
  });
});
