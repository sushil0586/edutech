import { expect, test, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import {
  fetchAuthProfile,
  fetchPrograms,
  fetchSubjects,
  fetchTopics,
} from "../helpers/assessment-family";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";
import { resolveStudentProfileScope, selectOptionByLabelFragment } from "../helpers/student-scope";

const mutableTeacherResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
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

type SessionProfile = {
  student_profile?: string | null;
};

async function selectQuestionScope(page: Page) {
  const authProfile = await fetchAuthProfile(page);
  const programs = await fetchPrograms(page, authProfile.institute);

  for (const program of programs) {
    const subjects = await fetchSubjects(page, program.id, authProfile.institute);
    for (const subject of subjects) {
      const topics = await fetchTopics(page, subject.id, authProfile.institute);
      const topic = topics[0] ?? null;
      if (!topic) {
        continue;
      }

      await page.locator('select[name="program"]').selectOption(program.id);
      await expect(page.locator('select[name="subject"]')).toBeEnabled();
      await page.locator('select[name="subject"]').selectOption(subject.id);
      await expect(page.locator('select[name="topic"]')).toBeEnabled();
      await page.locator('select[name="topic"]').selectOption(topic.id);
      return;
    }
  }

  throw new Error("No teacher-visible program/subject/topic scope with at least one topic is available.");
}

async function fetchSessionProfile(page: Page, accessToken?: string) {
  const { response, payload, bodyText } = await requestBackendJson<SessionProfile>(page, "/api/v1/auth/me/", {
    accessToken,
  });
  expect(response.ok(), bodyText).toBe(true);
  return payload;
}

async function assignStudentsToExam(page: Page, examId: string, studentIds: string[]) {
  const { response, bodyText } = await requestBackendJson(page, `/api/v1/exams/${examId}/assign-students/`, {
    method: "POST",
    data: {
      assignment_mode: "selected_students",
      student_ids: studentIds,
    },
  });
  expect(response.ok(), bodyText).toBe(true);
}

async function runTeacherExamAction(page: Page, examId: string, action: "sync-marks" | "publish" | "mark-live") {
  const { response, bodyText } = await requestBackendJson(page, `/api/v1/exams/${examId}/${action}/`, {
    method: "POST",
    data: {},
  });
  expect(response.ok(), bodyText).toBe(true);
}

async function waitForTeacherLiveAttemptDetail(
  page: Page,
  examId: string,
  attemptId: string,
  studentDisplayName: string,
) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await page.goto(`/teacher/results/live?exam=${examId}&attempt=${attemptId}`);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();

    const attemptDetail = page.getByText(/attempt detail/i).first();
    const nameMatch = page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first();
    if (
      (await attemptDetail.isVisible().catch(() => false)) &&
      (await nameMatch.isVisible().catch(() => false))
    ) {
      return;
    }

    await page.waitForTimeout(2000);
  }
}

test.describe("Teacher populated live monitor mutable coverage", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableTeacherResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
      "populated teacher live monitor coverage",
    ),
  );

  test("@workflow @mutable teacher can inspect a populated live monitor attempt and log intervention notes", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let studentProfileId = "";
    let questionId: string | null = null;
    let examId: string | null = null;
    let studentAttemptId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW teacher live monitor question ${uniqueSeed}`;
    const examTitle = `PW Teacher Live Monitor ${uniqueSeed}`;
    const examCode = `PW-TLM-${uniqueSeed}`;
    const interventionNote = `Teacher live monitor note ${uniqueSeed}`;
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
      const studentScope = await resolveStudentProfileScope(page);
      studentAcademicYearName = studentScope.academicYearName;
      studentProgramName = studentScope.programName;
      const studentProfile = await fetchSessionProfile(page);
      studentProfileId = studentProfile.student_profile?.trim() ?? "";
      expect(studentProfileId).not.toBe("");

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      await page.goto("/teacher/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      await selectQuestionScope(page);
      await page.locator('select[name="question_type"]').selectOption("true_false");
      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page
        .locator('textarea[name="explanation"]')
        .fill("Disposable explanation for teacher live monitor coverage.");

      const optionRows = page.locator(".questionEditorOptionRow");
      await expect(optionRows).toHaveCount(2);
      await optionRows.first().locator('input[type="radio"]').check();
      await page.locator('input[name="default_marks"]').fill("4");
      await page.locator('input[name="negative_marks"]').fill("0");
      await page.locator('input[name="is_verified"]').check();

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);
      const questionDetailUrl = page.url().split("?")[0] ?? page.url();
      questionId = questionDetailUrl.match(/\/teacher\/question-bank\/([^/?#]+)/)?.[1] ?? null;
      expect(questionId).not.toBeNull();

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
      if (studentAcademicYearName) {
        await selectOptionByLabelFragment(page.locator('select[name="academic_year"]').first(), studentAcademicYearName);
      }
      if (studentProgramName) {
        await selectOptionByLabelFragment(page.locator('select[name="program"]').first(), studentProgramName);
      }

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      examId = examDetailUrl.match(/\/teacher\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
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

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();
      await assignStudentsToExam(page, examId, [studentProfileId]);
      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment&message=students-assigned`);

      await page.goto(`/teacher/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("4");
      await page.locator('input[name="passing_marks"]').fill("2");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await runTeacherExamAction(page, examId, "sync-marks");
      await runTeacherExamAction(page, examId, "publish");
      await runTeacherExamAction(page, examId, "mark-live");

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

      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright teacher live answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/1 saved|response updated successfully/i).first()).toBeVisible();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await waitForTeacherLiveAttemptDetail(page, examId!, studentAttemptId!, studentDisplayName);

      await expect(page.locator(".teacherResultsMonitorCard")).toContainText(/in progress/i);
      await expect(page.getByText(/intervention queue/i).first()).toBeVisible();
      await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
      await expect(page.getByText(/decision support/i).first()).toBeVisible();
      await expect(page.getByText(/intervention notes/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();

      const followUpSelect = page.locator('select[name="follow_up"]').first();
      await followUpSelect.selectOption("contacted");
      await page.locator('textarea[name="note"]').first().fill(interventionNote);
      await page.getByRole("button", { name: /save intervention note/i }).first().click();
      await expect(page).toHaveURL(/message=/);
      const liveMonitorSurface = page.locator("main").first();
      await expect(liveMonitorSurface).toContainText(new RegExp(escapeRegExp(interventionNote), "i"));
      await expect(liveMonitorSurface).toContainText(/contacted/i);

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
        const deleteExamResponse = await page.request.delete(`/api/teacher/exams/${examId}`).catch(() => null);
        if (deleteExamResponse && !deleteExamResponse.ok()) {
          console.warn(`[pw-teacher-live] exam cleanup failed for ${examId}`);
        }
      }
      if (questionId) {
        const deleteQuestionResponse = await page.request.delete(
          `/api/teacher/question-bank/questions/${questionId}`,
        ).catch(() => null);
        if (deleteQuestionResponse && !deleteQuestionResponse.ok()) {
          console.warn(`[pw-teacher-live] question cleanup failed for ${questionId}`);
        }
      }
    }
  });
});
