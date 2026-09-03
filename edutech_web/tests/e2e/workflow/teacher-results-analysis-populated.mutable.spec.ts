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

type SessionProfile = {
  student_profile?: string | null;
};

function logCheckpoint(startedAt: number, label: string) {
  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[pw-teacher-analysis] ${label} @ ${elapsedSeconds}s`);
}

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
      return {
        subjectId: subject.id,
      };
    }
  }

  throw new Error("No teacher-visible program/subject/topic scope with at least one topic is available.");
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchSessionProfile(page: Page, accessToken?: string) {
  const token = accessToken ?? (await backendAccessToken(page));
  const response = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as SessionProfile;
}

async function assignStudentsToExam(page: Page, examId: string, studentIds: string[]) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/assign-students/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      assignment_mode: "selected_students",
      student_ids: studentIds,
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function createExamSection(
  page: Page,
  examId: string,
  name: string,
  sectionOrder: number,
  subjectId: string | null,
) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/sections/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      exam: examId,
      subject: subjectId,
      name,
      description: "",
      section_order: sectionOrder,
      instructions: "",
      total_questions: 0,
      marks_per_question: null,
      negative_marks_per_question: null,
      timer_enabled: false,
      duration_minutes: null,
      allow_skip_section: false,
      lock_after_submit: false,
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { id?: string; data?: { id?: string } };
  const sectionId = payload.data?.id ?? payload.id ?? null;
  expect(sectionId).not.toBeNull();
  return sectionId!;
}

async function linkExamQuestion(
  page: Page,
  examId: string,
  questionId: string,
  sectionId: string | null,
  questionOrder: number,
  marks = "4",
) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/questions/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      exam: examId,
      question: questionId,
      section: sectionId,
      question_order: questionOrder,
      marks,
      negative_marks: "0",
      is_mandatory: false,
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function expectStudentStartAccess(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/${examId}/detail/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const detail = (await response.json()) as {
    can_start?: boolean;
    availability_state?: string;
    start_access?: {
      is_allowed?: boolean;
      reason_source?: string;
      reason_code?: string;
      reason_message?: string;
    } | null;
  };
  expect(
    detail.start_access?.is_allowed,
    `Student start access blocked: ${detail.start_access?.reason_source ?? "unknown"} / ${detail.start_access?.reason_code ?? "unknown"} / ${detail.start_access?.reason_message ?? "unknown"} / availability=${detail.availability_state ?? "unknown"}`,
  ).toBe(true);
  expect(detail.can_start).toBe(true);
}

async function expectTeacherExamStatus(page: Page, examId: string, expectedStatuses: string[]) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { data?: { status?: string | null } | null; status?: string | null };
  const status = payload.data?.status ?? payload.status ?? null;
  expect(status).not.toBeNull();
  expect(expectedStatuses).toContain(status!);
}

async function runTeacherExamAction(page: Page, examId: string, action: "sync-marks" | "publish" | "mark-live") {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/${action}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {},
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function submitAttemptViaApi(page: Page) {
  const attemptUrl = page.url().split("?")[0] ?? page.url();
  const attemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
  expect(attemptId).not.toBeNull();
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/attempts/${attemptId}/submit/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {},
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe("Teacher populated analysis mutable coverage", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableTeacherResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
      "populated teacher analysis coverage",
    ),
  );

  test("@workflow @mutable teacher can inspect populated analysis cards and student evidence for a disposable result", async ({
    page,
  }) => {
    test.setTimeout(300000);
    const startedAt = Date.now();

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let studentProfileId = "";
    let questionSubjectId: string | null = null;
    let questionId: string | null = null;
    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW teacher analysis question ${uniqueSeed}`;
    const examTitle = `PW Teacher Analysis ${uniqueSeed}`;
    const examCode = `PW-TA-${uniqueSeed}`;
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      logCheckpoint(startedAt, "student workspace ready");

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
      logCheckpoint(startedAt, "student scope resolved");

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      logCheckpoint(startedAt, "teacher workspace ready");

      await page.goto("/teacher/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();
      const questionScope = await selectQuestionScope(page);
      questionSubjectId = questionScope.subjectId;
      await page.locator('select[name="question_type"]').selectOption("true_false");
      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page
        .locator('textarea[name="explanation"]')
        .fill("Playwright populated analysis explanation for teacher coverage.");

      const optionRows = page.locator(".questionEditorOptionRow");
      await expect(optionRows).toHaveCount(2);
      await optionRows.first().locator('input[type="radio"]').check();
      await page.locator('input[name="default_marks"]').fill("4");
      await page.locator('input[name="negative_marks"]').fill("0");

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);
      const questionDetailUrl = page.url().split("?")[0] ?? page.url();
      questionId = questionDetailUrl.match(/\/teacher\/question-bank\/([^/?#]+)/)?.[1] ?? null;
      expect(questionId).not.toBeNull();
      logCheckpoint(startedAt, "question created");

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
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.locator('input[name="result_publish_at"]').fill(toDateTimeLocalValue(endAt));
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      examId = examDetailUrl.match(/\/teacher\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(examId).not.toBeNull();
      logCheckpoint(startedAt, "exam shell created");

      const sectionId = await createExamSection(page, examId, "Analysis Section", 1, questionSubjectId);
      await linkExamQuestion(page, examId, questionId!, sectionId, 1, "4");
      logCheckpoint(startedAt, "question attached");

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();
      await assignStudentsToExam(page, examId, [studentProfileId]);
      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment&message=students-assigned`);
      logCheckpoint(startedAt, "student assigned");

      await page.goto(`/teacher/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("4");
      await page.locator('input[name="passing_marks"]').fill("2");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);
      logCheckpoint(startedAt, "exam settings saved");

      await page.goto(`/teacher/exams/${examId}`);
      await runTeacherExamAction(page, examId, "sync-marks");
      await runTeacherExamAction(page, examId, "publish");
      await runTeacherExamAction(page, examId, "mark-live");
      await expectTeacherExamStatus(page, examId, ["scheduled", "live"]);
      logCheckpoint(startedAt, "exam published/startable");

      await loginAsRole(page, "student");
      logCheckpoint(startedAt, "student relogin completed");
      await expectStudentWorkspace(page);
      logCheckpoint(startedAt, "student workspace revalidated");
      await page.goto(`/app/exams/${examId}`);
      logCheckpoint(startedAt, "student exam detail opened");
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
      ).toBeVisible();
      logCheckpoint(startedAt, "student exam heading visible");
      await expectStudentStartAccess(page, examId);
      logCheckpoint(startedAt, "student start access confirmed");
      const primaryActionRegion = page
        .locator(".contentCard")
        .filter({ has: page.getByText(/^primary action$/i) })
        .first();
      const startButton = primaryActionRegion
        .getByRole("button", { name: /^(start|start test|start mock test|start exam|start practice set|start quiz)$/i })
        .first();
      await expect(startButton).toBeVisible();
      await startButton.click();
      logCheckpoint(startedAt, "student start clicked");

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      logCheckpoint(startedAt, "student attempt opened");
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright teacher analysis answer");
      logCheckpoint(startedAt, "student answer entered");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/1 saved|response updated successfully/i).first()).toBeVisible();
      logCheckpoint(startedAt, "student answer saved");

      await submitAttemptViaApi(page);
      await page.goto(/\/app\/attempts\/[^/?#]+\/summary/.test(page.url()) ? page.url() : `${page.url().split("?")[0]}/summary`);
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/attempt submitted successfully|summary/i).first()).toBeVisible();
      logCheckpoint(startedAt, "student attempt submitted");

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/results?exam=${examId}`);
      logCheckpoint(startedAt, "teacher results opened");
      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }
      logCheckpoint(startedAt, "exam marked completed");

      const generateResultsButton = page.getByRole("button", { name: /generate results|regenerate summary/i }).first();
      await expect(generateResultsButton).toBeVisible();
      await generateResultsButton.click();
      await expect(page).toHaveURL(/message=/);
      logCheckpoint(startedAt, "results generated");

      const calculateRanksButton = page.getByRole("button", { name: /calculate ranks|recalculate ranks/i }).first();
      await expect(calculateRanksButton).toBeVisible();
      await calculateRanksButton.click();
      await expect(page).toHaveURL(/message=/);
      logCheckpoint(startedAt, "ranks calculated");

      const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
      if (await publishResultsButton.isVisible().catch(() => false)) {
        await publishResultsButton.click();
        await expect(page).toHaveURL(/message=/);
      }
      logCheckpoint(startedAt, "results published");

      await expect
        .poll(
          async () => {
            await page.goto(`/teacher/results/analysis?exam=${examId}`);
            return page.getByText(/question risk board/i).first().isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);
      logCheckpoint(startedAt, "analysis ready");

      await expect(page).toHaveURL(/\/teacher\/results\/analysis\?[^#]*exam=/);
      await expect(page.getByText(/all exams to exam-wise to student-wise to question-wise evidence/i).first()).toBeVisible();
      await expect(page.getByText(/analysis lens/i).first()).toBeVisible();
      await expect(page.getByText(/family focus board/i).first()).toBeVisible();
      await expect(page.getByText(/exam pulse/i).first()).toBeVisible();
      await expect(page.getByText(/topic strength/i).first()).toBeVisible();
      await expect(page.getByText(/question risk board/i).first()).toBeVisible();
      await expect(page.getByText(/^student explorer$/i).first()).toBeVisible();
      const analysisSurface = page.locator("main").first();
      await expect(analysisSurface).toContainText(new RegExp(escapeRegExp(examTitle), "i"));
      await expect(analysisSurface).toContainText(new RegExp(escapeRegExp(questionText), "i"));
      await expect(analysisSurface).toContainText(new RegExp(escapeRegExp(studentDisplayName), "i"));

      const studentCard = page.locator("a.analyticsResultStudentCard").first();
      await expect(studentCard).toBeVisible();
      await studentCard.click();
      await expect(page).toHaveURL(/\/teacher\/results\/analysis\?[^#]*attempt=/);
      await expect(page.getByText(/selected student/i).first()).toBeVisible();
      await expect(page.getByText(/question-wise evidence/i).first()).toBeVisible();
      await expect(page.getByText(/rubric insight/i).first()).toBeVisible();
      await expect(analysisSurface).toContainText(new RegExp(escapeRegExp(studentDisplayName), "i"));
      await expect(analysisSurface).toContainText(new RegExp(escapeRegExp(questionText), "i"));
      logCheckpoint(startedAt, "student detail opened");

      const allFilterLink = page.getByRole("link", { name: /^all$/i }).last();
      if (await allFilterLink.isVisible().catch(() => false)) {
        await allFilterLink.click();
      } else {
        const separator = page.url().includes("?") ? "&" : "?";
        await page.goto(`${page.url()}${separator}student_question_filter=all`);
      }
      await expect
        .poll(
          async () => /\/teacher\/results\/analysis\?[^#]*student_question_filter=all/.test(page.url()),
          { timeout: 15000 },
        )
        .toBe(true);
      logCheckpoint(startedAt, "analysis flow completed");
    } finally {
      if (examId) {
        const deleteExamResponse = await page.request.delete(`/api/teacher/exams/${examId}`).catch(() => null);
        if (deleteExamResponse && !deleteExamResponse.ok()) {
          console.warn(`[pw-teacher-analysis] exam cleanup failed for ${examId}`);
        }
      }
      if (questionId) {
        const deleteQuestionResponse = await page.request.delete(
          `/api/teacher/question-bank/questions/${questionId}`,
        ).catch(() => null);
        if (deleteQuestionResponse && !deleteQuestionResponse.ok()) {
          console.warn(`[pw-teacher-analysis] question cleanup failed for ${questionId}`);
        }
      }
    }
  });
});
