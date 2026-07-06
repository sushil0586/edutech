import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
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

async function requestBackendJson<T>(
  page: Page,
  path: string,
  init?: {
    method?: "GET" | "POST";
    accessToken?: string;
    data?: Record<string, unknown>;
  },
) {
  const accessToken = (init?.accessToken ?? (await getCurrentSessionAccessToken(page))).trim();
  expect(accessToken).not.toBe("");

  const response = await page.request.fetch(`${backendBaseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: init?.data,
  });

  const bodyText = await response.text();
  const contentType = response.headers()["content-type"] ?? "";
  const payload =
    bodyText && contentType.includes("application/json")
      ? (JSON.parse(bodyText) as T)
      : (null as T);
  return { response, payload, bodyText, contentType };
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

async function waitForLiveAttemptVisibility(page: Page, examId: string, studentDisplayName: string) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await page.goto(`/institute/results/live?exam=${examId}`);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();

    const studentNameMatch = page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first();
    if (await studentNameMatch.isVisible().catch(() => false)) {
      return;
    }

    await page.waitForTimeout(2000);
  }
}

test.describe("Institute populated live monitor mutable coverage", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "populated institute live monitor coverage",
    ),
  );

  test("@workflow @mutable institute can inspect a populated live monitor attempt and log intervention notes", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let questionId: string | null = null;
    let examId: string | null = null;
    let studentAttemptId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW institute live monitor question ${uniqueSeed}`;
    const examTitle = `PW Institute Live Monitor ${uniqueSeed}`;
    const examCode = `PW-ILM-${uniqueSeed}`;
    const answerText = `This is a disposable live-monitor answer ${uniqueSeed}.`;
    const interventionNote = `Institute live monitor note ${uniqueSeed}`;
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
      await questionTypeSelect.selectOption("essay_manual_review");

      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page
        .locator('textarea[name="explanation"]')
        .fill("Playwright live monitor explanation for populated institute monitoring coverage.");
      await page
        .locator('textarea[name="review_guidance"]')
        .fill("Use this disposable prompt only to create a realistic live attempt.");
      await page.locator('input[name="default_marks"]').fill("10");
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
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("10");
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
      await page.locator('input[name="total_marks"]').fill("10");
      await page.locator('input[name="passing_marks"]').fill("4");
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
      const attemptUrl = page.url().split("?")[0] ?? page.url();
      studentAttemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
      expect(studentAttemptId).not.toBeNull();

      const studentAccessToken = await getCurrentSessionAccessToken(page);
      const saveAnswerResult = await requestBackendJson<{
        data?: {
          evaluation_status?: string;
        };
      }>(page, `/api/v1/attempts/${studentAttemptId}/save-answer/`, {
        method: "POST",
        accessToken: studentAccessToken,
        data: {
          question: questionId,
          answer_text: answerText,
        },
      });
      expect(saveAnswerResult.response.ok()).toBe(true);

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await waitForLiveAttemptVisibility(page, examId!, studentDisplayName);

      await expect(page.locator(".teacherResultsMonitorCard")).toContainText(/in progress/i);
      await expect(page.getByText(/intervention queue/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();

      const inspectAttemptLink = page.getByRole("link", { name: /inspect attempt/i }).first();
      const reviewLink = page.getByRole("link", { name: /^review$/i }).first();
      const inspectLink = page.getByRole("link", { name: /^inspect$/i }).first();

      if (await inspectAttemptLink.isVisible().catch(() => false)) {
        await inspectAttemptLink.click();
      } else if (await reviewLink.isVisible().catch(() => false)) {
        await reviewLink.click();
      } else {
        await expect(inspectLink).toBeVisible();
        await inspectLink.click();
      }

      await expect(page).toHaveURL(/\/institute\/results\/live\?[^#]*attempt=/);
      await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
      await expect(page.getByText(/decision support/i).first()).toBeVisible();
      await expect(page.getByText(/intervention notes/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();

      const followUpSelect = page.locator('select[name="follow_up"]').first();
      await followUpSelect.selectOption("contacted");
      await page.locator('textarea[name="note"]').first().fill(interventionNote);
      await page.getByRole("button", { name: /save intervention note/i }).first().click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(new RegExp(escapeRegExp(interventionNote), "i")).first()).toBeVisible();
      await expect(page.getByText(/contacted/i).first()).toBeVisible();

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      const submitAttemptResult = await requestBackendJson<{
        success?: boolean;
      }>(page, `/api/v1/attempts/${studentAttemptId}/submit/`, {
        method: "POST",
        data: {},
      });
      expect(submitAttemptResult.response.ok()).toBe(true);
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
