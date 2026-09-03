import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectInstituteWorkspace,
  expectStudentWorkspace,
} from "../helpers/navigation";
import { resolveStudentProfileScope, selectOptionByLabelFragment } from "../helpers/student-scope";

const mutableInstituteResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const instituteApiBaseUrl = (
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

function instituteExamReadinessPanel(page: Page) {
  return page.locator("article").filter({
    has: page.getByText(/^exam publish readiness$/i),
  }).first();
}

function instituteResultReadinessPanel(page: Page) {
  return page.locator("article").filter({
    has: page.getByText(/^result publish readiness$/i),
  }).first();
}

function instituteResultsWorkspaceReadinessCard(page: Page, title: RegExp) {
  return page.locator(".teacherResultsReadinessCard").filter({
    has: page.getByText(title),
  }).first();
}

async function expectOneOf(primary: Locator, secondary: Locator) {
  const primaryVisible = await primary.isVisible().catch(() => false);
  if (primaryVisible) {
    await expect(primary).toBeVisible();
    return;
  }
  await expect(secondary).toBeVisible();
}

async function deleteInstituteExam(page: Page, examId: string) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");

  try {
    const response = await page.request.delete(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
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
    // Fall back to proxy cleanup.
  }

  const proxyResponse = await page.request.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect(proxyResponse.ok()).toBe(true);
}

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchSessionProfile(page: Page) {
  const cookies = await page.context().cookies();
  const snapshotCookie = cookies.find((cookie) => cookie.name === "nexora_session_profile")?.value ?? "";
  expect(snapshotCookie).not.toBe("");
  return JSON.parse(decodeURIComponent(snapshotCookie)) as {
    student_profile?: string | null;
  };
}

async function fetchStudentDetail(page: Page, studentId: string) {
  const response = await page.request.get(`/api/admin/people/students/${studentId}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    id: string;
    academic_year: string;
    program: string;
    cohort: string | null;
    admission_no: string;
  };
}

async function assignExamStudents(page: Page, examId: string, studentIds: string[]) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.post(`${instituteApiBaseUrl}/api/v1/exams/${examId}/assign-students/`, {
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
  const accessToken = await getAccessToken(page);
  const response = await page.request.post(`${instituteApiBaseUrl}/api/v1/exams/sections/`, {
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
  const accessToken = await getAccessToken(page);
  const response = await page.request.post(`${instituteApiBaseUrl}/api/v1/exams/questions/`, {
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

async function requestBackendJson<T>(
  page: Page,
  path: string,
  init?: {
    method?: "GET" | "POST";
    accessToken?: string;
    data?: Record<string, unknown>;
  },
) {
  const accessToken = (init?.accessToken ?? (await getAccessToken(page))).trim();
  expect(accessToken).not.toBe("");
  const response = await page.request.fetch(`${instituteApiBaseUrl}${path}`, {
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
  return { response, payload, bodyText };
}

async function runInstituteExamAction(
  page: Page,
  examId: string,
  action: "sync-marks" | "publish" | "mark-live" | "mark-completed" | "refresh-status",
) {
  const result = await requestBackendJson(page, `/api/v1/exams/${examId}/${action}/`, {
    method: "POST",
    data: {},
  });
  expect(result.response.ok(), result.bodyText).toBe(true);
}

async function submitAttemptViaApi(page: Page) {
  const attemptUrl = page.url().split("?")[0] ?? page.url();
  const attemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
  expect(attemptId).not.toBeNull();
  const studentAccessToken = await getAccessToken(page);
  const submitResult = await requestBackendJson<{ success?: boolean }>(page, `/api/v1/attempts/${attemptId}/submit/`, {
    method: "POST",
    accessToken: studentAccessToken,
    data: {},
  });
  expect(submitResult.response.ok(), submitResult.bodyText).toBe(true);
}

async function fetchLeaderboardSummary(page: Page, examId: string) {
  const result = await requestBackendJson<{
    summary?: {
      total?: number;
      ranked_count?: number;
      published_count?: number;
      all_ranked?: boolean;
      published_results?: boolean;
    };
  }>(page, `/api/v1/results/exam/${examId}/leaderboard/`);
  expect(result.response.ok(), result.bodyText).toBe(true);
  return result.payload?.summary ?? null;
}

async function fetchExamStatus(page: Page, examId: string) {
  const result = await requestBackendJson<{
    status?: string | null;
  }>(page, `/api/v1/exams/${examId}/`);
  expect(result.response.ok(), result.bodyText).toBe(true);
  return result.payload?.status ?? null;
}

async function getNonEmptyOptions(locator: Locator) {
  return locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      }))
      .filter((option) => option.value.trim().length > 0),
  );
}

async function findOptionValueByLabelPattern(locator: Locator, pattern: RegExp) {
  const options = await getNonEmptyOptions(locator);
  return options.find((option) => pattern.test(option.label))?.value ?? null;
}

async function waitForHydratedOptions(locator: Locator, message: string) {
  await expect
    .poll(async () => (await getNonEmptyOptions(locator)).length, {
      timeout: 15000,
      message,
    })
    .toBeGreaterThan(0);
}

async function selectQuestionBankAcademicLane(
  page: Page,
  programLocator: Locator,
  subjectLocator: Locator,
  topicLocator: Locator,
  preferredProgramLabel?: string | null,
) {
  await waitForHydratedOptions(programLocator, "Expected hydrated program options to include a selectable value");
  const programs = await getNonEmptyOptions(programLocator);
  const preferredProgram =
    (preferredProgramLabel
      ? await findOptionValueByLabelPattern(programLocator, new RegExp(escapeRegExp(preferredProgramLabel), "i"))
      : null) ??
    (await findOptionValueByLabelPattern(programLocator, /class 7/i)) ??
    programs[0]?.value ??
    null;
  expect(preferredProgram).not.toBeNull();
  const candidatePrograms = [
    preferredProgram!,
    ...programs.map((program) => program.value).filter((value) => value !== preferredProgram),
  ];

  for (const programValue of candidatePrograms) {
    const subjectsResponse = page
      .waitForResponse((response) => {
        if (!response.ok()) {
          return false;
        }
        const url = new URL(response.url());
        return url.pathname.includes("/academics/subjects") && url.searchParams.get("program") === programValue;
      }, { timeout: 5000 })
      .catch(() => null);
    await programLocator.selectOption(programValue);
    await expect.poll(async () => programLocator.inputValue()).toBe(programValue);
    await subjectsResponse;
    await expect(subjectLocator).toBeEnabled();
    await waitForHydratedOptions(subjectLocator, "Expected hydrated subject options to include at least one selectable value");

    const subjects = await getNonEmptyOptions(subjectLocator);
    const preferredSubject = subjects.find((subject) => /math/i.test(subject.label))?.value ?? subjects[0]?.value ?? null;
    expect(preferredSubject).not.toBeNull();
    const candidateSubjects = [
      preferredSubject!,
      ...subjects.map((subject) => subject.value).filter((value) => value !== preferredSubject),
    ];

    for (const subjectValue of candidateSubjects) {
      const topicsResponse = page
        .waitForResponse((response) => {
          if (!response.ok()) {
            return false;
          }
          const url = new URL(response.url());
          return url.pathname.includes("/academics/topics") && url.searchParams.get("subject") === subjectValue;
        }, { timeout: 5000 })
        .catch(() => null);
      await subjectLocator.selectOption(subjectValue);
      await expect.poll(async () => subjectLocator.inputValue()).toBe(subjectValue);
      await topicsResponse;
      await expect(topicLocator).toBeEnabled();
      const topics = await getNonEmptyOptions(topicLocator);
      if (!topics.length) {
        continue;
      }
      await topicLocator.selectOption(topics[0]!.value);
      await expect.poll(async () => topicLocator.inputValue()).toBe(topics[0]!.value);
      return { programValue, subjectValue, topicValue: topics[0]!.value };
    }
  }

  throw new Error("Expected at least one program and subject combination to hydrate a selectable topic value");
}

async function waitForQuestionOption(
  page: Page,
  questionSelect: Locator,
  expectedQuestionText: string,
  builderUrl: string,
) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await expect(questionSelect).toBeVisible();
    const matchedOption = await questionSelect.locator("option").evaluateAll(
      (options, expectedText) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            label: (option as HTMLOptionElement).label,
          }))
          .find(
            (option) =>
              option.value.trim().length > 0 &&
              option.label.toLowerCase().includes(String(expectedText).toLowerCase()),
          ) ?? null,
      expectedQuestionText,
    );
    if (matchedOption) {
      return matchedOption;
    }
    await page.waitForTimeout(1500);
    if (attempt < 5) {
      await page.goto(builderUrl);
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();
    }
  }
  return null;
}

test.describe("Institute mutable results actions", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "disposable institute results publication coverage",
    ),
  );

  test("@workflow @mutable institute can publish leaderboard-ready results for a disposable exam", async ({
    page,
  }) => {
    test.setTimeout(240000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentScope: Awaited<ReturnType<typeof resolveStudentProfileScope>> | null = null;
    let questionId: string | null = null;
    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const examTitle = `PW Institute Results ${uniqueSeed}`;
    const examCode = `PW-IR-${uniqueSeed}`;
    const sectionName = `PW Institute Results Section ${uniqueSeed}`;
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      studentScope = await resolveStudentProfileScope(page);
      const studentSessionProfile = await fetchSessionProfile(page);
      const studentProfileId = studentSessionProfile.student_profile?.trim() ?? "";
      expect(studentProfileId).not.toBe("");

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      const studentDetail = await fetchStudentDetail(page, studentProfileId);

      const questionText = `PW institute result question ${uniqueSeed}`;
      await page.goto("/institute/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();
      const programSelect = page.locator('select[name="program"]');
      const subjectSelect = page.locator('select[name="subject"]');
      const topicSelect = page.locator('select[name="topic"]');
      const questionTypeSelect = page.locator('select[name="question_type"]');
      const academicLane = await selectQuestionBankAcademicLane(
        page,
        programSelect,
        subjectSelect,
        topicSelect,
        studentScope?.programName ?? null,
      );
      await questionTypeSelect.selectOption("true_false");
      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page.locator('textarea[name="explanation"]').fill("Playwright institute results explanation.");
      const optionRows = page.locator(".questionEditorOptionRow");
      await expect(optionRows).toHaveCount(2);
      await optionRows.first().locator('input[type="radio"]').check();
      await page.locator('input[name="default_marks"]').fill("4");
      await page.locator('input[name="negative_marks"]').fill("0");
      await page.locator('input[name="is_verified"]').check();
      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      const questionDetailUrl = page.url().split("?")[0] ?? page.url();
      questionId = questionDetailUrl.match(/\/institute\/question-bank\/([^/?#]+)/)?.[1] ?? null;
      expect(questionId).not.toBeNull();

      await page.goto("/institute/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.locator('select[name="academic_year"]').selectOption(studentDetail.academic_year);
      await page.locator('select[name="program"]').selectOption(studentDetail.program);
      if (studentDetail.cohort) {
        await expect
          .poll(
            async () =>
              await page.locator(`select[name="cohort"] option[value="${studentDetail.cohort}"]`).count(),
            { timeout: 15000 },
          )
          .toBeGreaterThan(0);
        await page.locator('select[name="cohort"]').selectOption(studentDetail.cohort);
      } else if (studentScope?.academicYearName) {
        await selectOptionByLabelFragment(page.locator('select[name="academic_year"]').first(), studentScope.academicYearName);
      }
      const examSubjectSelect = page.locator('select[name="subject"]').first();
      if (await examSubjectSelect.count()) {
        await expect(examSubjectSelect).toBeEnabled();
        await waitForHydratedOptions(
          examSubjectSelect,
          "Expected exam subject options to hydrate after selecting the institute exam program",
        );
        await examSubjectSelect.selectOption(academicLane.subjectValue);
        await expect.poll(async () => examSubjectSelect.inputValue()).toBe(academicLane.subjectValue);
      }
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
      ).toBeVisible();

      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/);
      const ensuredExamId = examIdMatch?.[1] ?? null;
      expect(ensuredExamId).not.toBeNull();
      if (!ensuredExamId) {
        throw new Error("Expected created institute exam to expose an exam ID.");
      }
      examId = ensuredExamId;

      await expect(instituteExamReadinessPanel(page)).toContainText(/blocked/i);
      await expect(instituteExamReadinessPanel(page)).toContainText(/blocker/i);
      await expect(instituteResultReadinessPanel(page)).toContainText(/review first|blocked/i);

      const sectionId = await createExamSection(
        page,
        ensuredExamId,
        sectionName,
        1,
        academicLane.subjectValue,
      );
      await linkExamQuestion(page, ensuredExamId, questionId!, sectionId, 1, "4");

      await assignExamStudents(page, ensuredExamId, [studentDetail.id]);

      await page.goto(`/institute/exams/${ensuredExamId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("4");
      await page.locator('input[name="passing_marks"]').fill("1");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/institute/exams/${ensuredExamId}`);
      const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
      if (await syncMarksButton.isVisible().catch(() => false)) {
        await syncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, ensuredExamId, "sync-marks");
      }
      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.isVisible().catch(() => false)) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, ensuredExamId, "publish");
      }
      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.isVisible().catch(() => false)) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, ensuredExamId, "mark-live");
      }

      await expect(instituteExamReadinessPanel(page)).toContainText(/ready/i);

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${ensuredExamId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await page
        .getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i })
        .click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright institute result answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expectOneOf(
        page.locator(".feedbackBannerSuccess").filter({
          hasText: /response updated successfully/i,
        }).first(),
        page.getByText(/1 saved/i).first(),
      );

      await submitAttemptViaApi(page);

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${ensuredExamId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^exam publish readiness$/i),
      ).toContainText(/blocked/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^exam publish readiness$/i),
      ).toContainText(/invalid status/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/blocked/i);

      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.isVisible().catch(() => false)) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, ensuredExamId, "refresh-status");
        await runInstituteExamAction(page, ensuredExamId, "mark-completed");
      }
      await expect
        .poll(async () => await fetchExamStatus(page, ensuredExamId), {
          timeout: 15000,
          message: `Expected exam ${ensuredExamId} to reach completed status before results publication.`,
        })
        .toBe("completed");

      const generateResultsButton = page.getByRole("button", { name: /generate results|regenerate summary/i }).first();
      await expect(generateResultsButton).toBeVisible();
      await generateResultsButton.click();
      await expect
        .poll(
          async () =>
            /message=/.test(page.url()) ||
            page.getByRole("button", { name: /calculate ranks|recalculate ranks/i }).first().isVisible().catch(() => false),
          { timeout: 15000 },
        )
        .toBe(true);

      const calculateRanksButton = page.getByRole("button", { name: /calculate ranks|recalculate ranks/i }).first();
      await expect(calculateRanksButton).toBeVisible();
      await calculateRanksButton.click();
      await expect
        .poll(async () => /message=/.test(page.url()) || Boolean((await fetchLeaderboardSummary(page, ensuredExamId))?.all_ranked))
        .toBe(true);

      const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
      if (await publishResultsButton.isVisible().catch(() => false)) {
        await publishResultsButton.click();
        await expect
          .poll(
            async () =>
              /message=/.test(page.url()) || Boolean((await fetchLeaderboardSummary(page, ensuredExamId))?.published_results),
          )
          .toBe(true);
      } else {
        await expect
          .poll(
            async () =>
              Boolean((await fetchLeaderboardSummary(page, ensuredExamId))?.published_results) ||
              page.getByText(/results published|published/i).first().isVisible().catch(() => false),
            { timeout: 15000 },
          )
          .toBe(true);
      }

      await page.goto(`/institute/results?exam=${ensuredExamId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 generated/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 published/i);
      await expect
        .poll(async () => Boolean((await fetchLeaderboardSummary(page, ensuredExamId))?.published_results), {
          timeout: 15000,
          message: `Expected leaderboard summary for exam ${ensuredExamId} to confirm published results.`,
        })
        .toBe(true);

      await page.getByRole("link", { name: /open leaderboard/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/results\/leaderboard\?[^#]*exam=/);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      const leaderboard = await fetchLeaderboardSummary(page, ensuredExamId);
      expect(leaderboard?.total).toBe(1);
      expect(leaderboard?.ranked_count).toBe(1);
      expect(leaderboard?.published_count).toBe(1);
      expect(leaderboard?.all_ranked).toBe(true);
      expect(leaderboard?.published_results).toBe(true);
      await expect(page.getByText(/rank 1/i).first()).toBeVisible();
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
