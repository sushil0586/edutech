import { expect, test, type Locator, type Page } from "@playwright/test";
import { type DirectLoginCredentials, loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import {
  fetchAuthProfile,
  fetchPrograms,
  fetchSubjects,
  fetchTopics,
} from "../helpers/assessment-family";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace, expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

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
  institute?: string | null;
  student_profile?: string | null;
};

type StudentDetail = {
  id: string;
  institute: string;
  academic_year: string;
  program: string;
  cohort: string | null;
  full_name: string;
  admission_no: string;
};

type LeaderboardPayload = {
  count: number;
  results: Array<{
    student_name: string;
    student_admission_no: string;
    rank: number | null;
    final_score: string;
    percentage: string;
    is_published: boolean;
  }>;
  summary: {
    total: number;
    ranked_count: number;
    published_count: number;
    all_ranked: boolean;
    published_results: boolean;
  };
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function teacherResultsWorkspaceReadinessCard(page: Page, title: RegExp) {
  return page.locator(".teacherResultsReadinessCard").filter({
    has: page.getByText(title),
  }).first();
}

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  }).first();
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
      return;
    }
  }

  throw new Error("No teacher-visible program/subject/topic scope with at least one topic is available.");
}

async function expectOneOf(primary: Locator, secondary: Locator) {
  const primaryVisible = await primary.isVisible().catch(() => false);
  if (primaryVisible) {
    await expect(primary).toBeVisible();
    return;
  }
  await expect(secondary).toBeVisible();
}

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchSessionProfile(page: Page, accessToken?: string) {
  const token = accessToken ?? (await getAccessToken(page));
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

async function fetchStudentDetail(page: Page, studentId: string) {
  const response = await page.request.get(`/api/admin/people/students/${studentId}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentDetail;
}

async function createDisposableStudentWithLogin(
  page: Page,
  seedStudentDetail: StudentDetail,
  uniqueSeed: number,
) {
  const studentFirstName = `PWMulti${uniqueSeed}`;
  const studentLastName = "Learner";
  const studentAdmissionNo = `PW-ML-${uniqueSeed}`;
  const username = `pw.multi.student.${uniqueSeed}`;
  const password = `StrongPass@${String(uniqueSeed).slice(-6)}`;

  const createResponse = await page.request.post("/api/admin/people/students", {
    data: {
      institute: seedStudentDetail.institute,
      academic_year: seedStudentDetail.academic_year,
      program: seedStudentDetail.program,
      cohort: seedStudentDetail.cohort,
      admission_no: studentAdmissionNo,
      first_name: studentFirstName,
      last_name: studentLastName,
      gender: "prefer_not_to_say",
      email: `${username}@example.test`,
      phone: `8${String(uniqueSeed).slice(-9)}`,
      guardian_name: "Playwright Guardian",
      guardian_phone: `7${String(uniqueSeed).slice(-9)}`,
      address: "Playwright multi-learner lane",
      is_active: true,
    },
  });
  expect(createResponse.ok()).toBe(true);
  const createPayload = (await createResponse.json()) as { id?: string };
  const studentId = createPayload.id ?? null;
  expect(studentId).not.toBeNull();

  const loginResponse = await page.request.post(`/api/admin/account-management/students/${studentId}/create-login`, {
    data: {
      username,
      password,
      confirm_password: password,
      auto_generate: false,
    },
  });
  expect(loginResponse.ok()).toBe(true);

  return {
    studentId: studentId!,
    displayName: `${studentFirstName} ${studentLastName}`,
    admissionNo: studentAdmissionNo,
    credentials: {
      username,
      password,
    } satisfies DirectLoginCredentials,
  };
}

async function deleteDisposableStudent(page: Page, studentId: string) {
  const response = await page.request.delete(`/api/admin/people/students/${studentId}`);
  expect(response.ok()).toBe(true);
}

async function assignStudentsToExam(page: Page, examId: string, studentIds: string[]) {
  const accessToken = await getAccessToken(page);
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

async function runTeacherExamAction(page: Page, examId: string, action: "sync-marks" | "publish" | "mark-live") {
  const accessToken = await getAccessToken(page);
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
  const accessToken = await getAccessToken(page);
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

async function fetchTeacherLeaderboard(page: Page, examId: string) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/results/exam/${examId}/leaderboard/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as LeaderboardPayload;
}

async function fetchStudentResultsForExam(page: Page, examId: string) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/results/?exam=${examId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as {
    count?: number;
    results?: Array<{
      exam_title?: string;
      result_status?: string;
      is_published?: boolean;
    }>;
  };
}

test.describe("Teacher mutable multi-learner results distribution", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student") || testRequiresRole("institute"),
    "Teacher, student, and institute Playwright credentials are required.",
  );

  test.skip(
    !mutableTeacherResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
      "multi-learner leaderboard distribution coverage",
    ),
  );

  test("@workflow @mutable teacher can publish ranked results for two learners and expose them across teacher and student surfaces", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let primaryStudentDisplayName = studentCredentials!.username;
    let primaryStudentAdmissionNo = "";
    let secondStudentId: string | null = null;
    let secondStudentDisplayName = "";
    let secondStudentAdmissionNo = "";
    let secondStudentCredentials: DirectLoginCredentials | null = null;
    let questionId: string | null = null;
    let examId: string | null = null;

    const uniqueSeed = Date.now();
    const questionText = `PW multi learner question ${uniqueSeed}`;
    const examTitle = `PW Multi Learner Results ${uniqueSeed}`;
    const examCode = `PW-MLR-${uniqueSeed}`;
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
          primaryStudentDisplayName = renderedName;
        }
      }

      const primaryStudentProfile = await fetchSessionProfile(page);
      const primaryStudentProfileId = primaryStudentProfile.student_profile?.trim() ?? "";
      expect(primaryStudentProfileId).not.toBe("");

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      const primaryStudentDetail = await fetchStudentDetail(page, primaryStudentProfileId);
      primaryStudentAdmissionNo = primaryStudentDetail.admission_no;

      const secondStudent = await createDisposableStudentWithLogin(page, primaryStudentDetail, uniqueSeed);
      secondStudentId = secondStudent.studentId;
      secondStudentDisplayName = secondStudent.displayName;
      secondStudentAdmissionNo = secondStudent.admissionNo;
      secondStudentCredentials = secondStudent.credentials;

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      await page.goto("/teacher/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      await selectQuestionScope(page);
      await page.locator('select[name="question_type"]').selectOption("true_false");
      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page.locator('textarea[name="explanation"]').fill(
        "Disposable explanation for multi-learner leaderboard coverage.",
      );

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
      await page.locator('select[name="academic_year"]').selectOption(primaryStudentDetail.academic_year);
      await page.locator('select[name="program"]').selectOption(primaryStudentDetail.program);

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
      await assignStudentsToExam(page, examId, [primaryStudentProfileId, secondStudentId!]);
      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment&message=students-assigned`);

      await page.goto(`/teacher/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await runTeacherExamAction(page, examId, "sync-marks");
      await runTeacherExamAction(page, examId, "publish");
      await runTeacherExamAction(page, examId, "mark-live");

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam))$/i }).click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright top-rank answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expectOneOf(
        page.locator(".feedbackBannerSuccess").filter({
          hasText: /response updated successfully/i,
        }).first(),
        page.getByText(/1 saved/i).first(),
      );
      await submitAttemptViaApi(page);
      await page.goto(/\/app\/attempts\/[^/?#]+\/summary/.test(page.url()) ? page.url() : `${page.url().split("?")[0]}/summary`);
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/attempt submitted successfully|summary/i).first()).toBeVisible();

      expect(secondStudentCredentials).not.toBeNull();
      await loginWithCredentials(page, secondStudentCredentials!, "student");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam))$/i }).click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await submitAttemptViaApi(page);
      await page.goto(/\/app\/attempts\/[^/?#]+\/summary/.test(page.url()) ? page.url() : `${page.url().split("?")[0]}/summary`);
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/attempt submitted successfully|summary/i).first()).toBeVisible();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const generateResultsButton = page.getByRole("button", { name: /generate results|regenerate summary/i }).first();
      await expect(generateResultsButton).toBeVisible();
      await generateResultsButton.click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(/results generated successfully\./i)).toBeVisible();

      const calculateRanksButton = page.getByRole("button", { name: /calculate ranks|recalculate ranks/i }).first();
      await expect(calculateRanksButton).toBeVisible();
      await calculateRanksButton.click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(/ranks calculated successfully\./i)).toBeVisible();

      const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
      if (await publishResultsButton.isVisible().catch(() => false)) {
        await publishResultsButton.click();
        await expect(page).toHaveURL(/message=/);
        await expect(page.getByText(/results published successfully\./i)).toBeVisible();
      }

      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/2 generated/i);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/2 published/i);

      const leaderboard = await fetchTeacherLeaderboard(page, examId!);
      expect(leaderboard.summary.total).toBe(2);
      expect(leaderboard.summary.ranked_count).toBe(2);
      expect(leaderboard.summary.published_count).toBe(2);
      expect(leaderboard.summary.all_ranked).toBe(true);
      expect(leaderboard.summary.published_results).toBe(true);
      expect(leaderboard.results).toHaveLength(2);
      const primaryLeaderboardRow =
        leaderboard.results.find((row) => row.student_admission_no === primaryStudentAdmissionNo) ?? null;
      const secondLeaderboardRow =
        leaderboard.results.find((row) => row.student_admission_no === secondStudentAdmissionNo) ?? null;
      expect(primaryLeaderboardRow).not.toBeNull();
      expect(secondLeaderboardRow).not.toBeNull();
      expect(primaryLeaderboardRow?.student_name).toBe(primaryStudentDisplayName);
      expect(primaryLeaderboardRow?.rank).not.toBeNull();
      expect(secondLeaderboardRow?.student_name).toBe(secondStudentDisplayName);
      expect(secondLeaderboardRow?.rank).not.toBeNull();
      const publishedRanks = leaderboard.results.map((row) => row.rank).filter((rank) => rank !== null);
      expect(publishedRanks).toHaveLength(2);
      expect(publishedRanks.every((rank) => Number(rank) >= 1)).toBe(true);

      await page.getByRole("link", { name: /open leaderboard/i }).first().click();
      await expect(page).toHaveURL(/\/teacher\/results\/leaderboard\?[^#]*exam=/);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(primaryStudentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(secondStudentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(/rank 1/i).first()).toBeVisible();
      await expect(page.getByText(/rank 1|rank 2/i).first()).toBeVisible();

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await expect
        .poll(
          async () => {
            const payload = await fetchStudentResultsForExam(page, examId!);
            return (payload.results ?? []).some(
              (row) => row.is_published && (row.exam_title ?? "").toLowerCase().includes(examTitle.toLowerCase()),
            );
          },
          { timeout: 30000 },
        )
        .toBe(true);
      await page.goto("/app/results");
      await expect(page.getByText(/result published|published/i).first()).toBeVisible();

      await loginWithCredentials(page, secondStudentCredentials!, "student");
      await expectStudentWorkspace(page);
      await expect
        .poll(
          async () => {
            const payload = await fetchStudentResultsForExam(page, examId!);
            return (payload.results ?? []).some(
              (row) => row.is_published && (row.exam_title ?? "").toLowerCase().includes(examTitle.toLowerCase()),
            );
          },
          { timeout: 30000 },
        )
        .toBe(true);
      await page.goto("/app/results");
      await expect(page.getByText(/result published|published/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteExamResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteExamResponse.ok()).toBe(true);
      }
      if (questionId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteQuestionResponse = await page.request.delete(
          `/api/teacher/question-bank/questions/${questionId}`,
        );
        expect(deleteQuestionResponse.ok()).toBe(true);
      }
      if (secondStudentId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteDisposableStudent(page, secondStudentId);
      }
    }
  });

  test.fixme("@workflow @mutable teacher leaderboard stays truthful when one assigned learner never submits", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    const teacherCredentials = getRoleCredentials("teacher");
    expect(studentCredentials).not.toBeNull();
    expect(teacherCredentials).not.toBeNull();

    let primaryStudentDisplayName = studentCredentials!.username;
    let primaryStudentAdmissionNo = "";
    let secondStudentId: string | null = null;
    let secondStudentDisplayName = "";
    let secondStudentAdmissionNo = "";
    let secondStudentCredentials: DirectLoginCredentials | null = null;
    let thirdStudentId: string | null = null;
    let thirdStudentDisplayName = "";
    let thirdStudentAdmissionNo = "";
    let questionId: string | null = null;
    let examId: string | null = null;

    const uniqueSeed = Date.now();
    const questionText = `PW partial multi learner question ${uniqueSeed}`;
    const examTitle = `PW Partial Multi Learner ${uniqueSeed}`;
    const examCode = `PW-PMLR-${uniqueSeed}`;
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
          primaryStudentDisplayName = renderedName;
        }
      }

      const primaryStudentProfile = await fetchSessionProfile(page);
      const primaryStudentProfileId = primaryStudentProfile.student_profile?.trim() ?? "";
      expect(primaryStudentProfileId).not.toBe("");

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      const primaryStudentDetail = await fetchStudentDetail(page, primaryStudentProfileId);
      primaryStudentAdmissionNo = primaryStudentDetail.admission_no;

      const secondStudent = await createDisposableStudentWithLogin(page, primaryStudentDetail, uniqueSeed);
      secondStudentId = secondStudent.studentId;
      secondStudentDisplayName = secondStudent.displayName;
      secondStudentAdmissionNo = secondStudent.admissionNo;
      secondStudentCredentials = secondStudent.credentials;

      const thirdStudent = await createDisposableStudentWithLogin(page, primaryStudentDetail, uniqueSeed + 1);
      thirdStudentId = thirdStudent.studentId;
      thirdStudentDisplayName = thirdStudent.displayName;
      thirdStudentAdmissionNo = thirdStudent.admissionNo;

      await loginWithCredentials(page, teacherCredentials!, "teacher");
      await expectTeacherWorkspace(page);

      await page.goto("/teacher/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      await selectFirstNonEmptyOption(page, 'select[name="program"]');
      await expect(page.locator('select[name="subject"]')).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="subject"]');
      await expect(page.locator('select[name="topic"]')).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="topic"]');
      await page.locator('select[name="question_type"]').selectOption("true_false");
      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page.locator('textarea[name="explanation"]').fill(
        "Disposable explanation for partial multi-learner leaderboard coverage.",
      );

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

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
      await page.locator('select[name="academic_year"]').selectOption(primaryStudentDetail.academic_year);
      await page.locator('select[name="program"]').selectOption(primaryStudentDetail.program);

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
      await assignStudentsToExam(page, examId, [primaryStudentProfileId, secondStudentId!, thirdStudentId!]);
      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment&message=students-assigned`);

      await page.goto(`/teacher/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/teacher/exams/${examId}`);
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
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam))$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright top-rank answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expectOneOf(
        page.locator(".feedbackBannerSuccess").filter({
          hasText: /response updated successfully/i,
        }).first(),
        page.getByText(/1 saved/i).first(),
      );
      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^submit test$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
      await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();

      expect(secondStudentCredentials).not.toBeNull();
      await loginWithCredentials(page, secondStudentCredentials!, "student");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam))$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^submit test$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
      await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();

      await loginWithCredentials(page, teacherCredentials!, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const generateResultsButton = page.getByRole("button", { name: /generate results|regenerate summary/i }).first();
      await expect(generateResultsButton).toBeVisible();
      await generateResultsButton.click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(/results generated successfully\./i)).toBeVisible();

      const calculateRanksButton = page.getByRole("button", { name: /calculate ranks|recalculate ranks/i }).first();
      await expect(calculateRanksButton).toBeVisible();
      await calculateRanksButton.click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(/ranks calculated successfully\./i)).toBeVisible();

      const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
      if (await publishResultsButton.isVisible().catch(() => false)) {
        await publishResultsButton.click();
        await expect(page).toHaveURL(/message=/);
        await expect(page.getByText(/results published successfully\./i)).toBeVisible();
      }

      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/2 generated/i);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/2 published/i);

      const leaderboard = await fetchTeacherLeaderboard(page, examId!);
      expect(leaderboard.summary.total).toBe(2);
      expect(leaderboard.summary.ranked_count).toBe(2);
      expect(leaderboard.summary.published_count).toBe(2);
      expect(leaderboard.summary.all_ranked).toBe(true);
      expect(leaderboard.summary.published_results).toBe(true);
      expect(leaderboard.results).toHaveLength(2);
      expect(leaderboard.results[0]?.student_name).toBe(primaryStudentDisplayName);
      expect(leaderboard.results[0]?.student_admission_no).toBe(primaryStudentAdmissionNo);
      expect(leaderboard.results[0]?.rank).toBe(1);
      expect(leaderboard.results[1]?.student_name).toBe(secondStudentDisplayName);
      expect(leaderboard.results[1]?.student_admission_no).toBe(secondStudentAdmissionNo);
      expect(leaderboard.results[1]?.rank).toBe(2);
      expect(leaderboard.results.some((row) => row.student_name === thirdStudentDisplayName)).toBe(false);
      expect(leaderboard.results.some((row) => row.student_admission_no === thirdStudentAdmissionNo)).toBe(false);

      await page.getByRole("link", { name: /open leaderboard/i }).first().click();
      await expect(page).toHaveURL(/\/teacher\/results\/leaderboard\?[^#]*exam=/);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(primaryStudentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(secondStudentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(thirdStudentDisplayName), "i"))).toHaveCount(0);
      await expect(page.getByText(/rank 1/i).first()).toBeVisible();
      await expect(page.getByText(/rank 2/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginWithCredentials(page, teacherCredentials!, "teacher");
        await expectTeacherWorkspace(page);
        const deleteExamResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteExamResponse.ok()).toBe(true);
      }
      if (questionId) {
        await loginWithCredentials(page, teacherCredentials!, "teacher");
        await expectTeacherWorkspace(page);
        const deleteQuestionResponse = await page.request.delete(
          `/api/teacher/question-bank/questions/${questionId}`,
        );
        expect(deleteQuestionResponse.ok()).toBe(true);
      }
      if (thirdStudentId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteDisposableStudent(page, thirdStudentId);
      }
      if (secondStudentId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteDisposableStudent(page, secondStudentId);
      }
    }
  });
});
