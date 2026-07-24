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
  let optionValue: string | null = null;
  await expect
    .poll(async () => {
      const values = await locator.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      );
      optionValue = values.find((value) => value.trim().length > 0) ?? null;
      return optionValue;
    }, {
      timeout: 15000,
      message: "Expected hydrated select options to include a non-empty value",
    })
    .not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
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
      ? await findOptionValueByLabelPattern(
          programLocator,
          new RegExp(escapeRegExp(preferredProgramLabel), "i"),
        )
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
    await waitForHydratedOptions(
      subjectLocator,
      "Expected hydrated subject options to include at least one selectable value",
    );

    const subjects = await getNonEmptyOptions(subjectLocator);
    const preferredSubject =
      subjects.find((subject) => /math/i.test(subject.label))?.value ?? subjects[0]?.value ?? null;
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

async function getCurrentSessionAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken =
    cookies.find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchScopedStudents(page: Page, args: {
  academicYear: string;
  program: string;
  cohort?: string | null;
}) {
  const accessToken = await getCurrentSessionAccessToken(page);
  const searchParams = new URLSearchParams({
    page_size: "50",
    academic_year: args.academicYear,
    program: args.program,
    is_active: "true",
  });
  if (args.cohort) {
    searchParams.set("cohort", args.cohort);
  }

  const response = await page.request.get(`${backendBaseUrl}/api/v1/students/?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as {
    results: Array<{ id: string; full_name: string; admission_no: string }>;
  };
  return payload.results;
}

async function assignExamStudents(page: Page, examId: string, studentIds: string[]) {
  const accessToken = await getCurrentSessionAccessToken(page);
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

async function fetchExamDetailScope(page: Page, examId: string) {
  const accessToken = await getCurrentSessionAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as {
    academic_year: string;
    program: string;
    cohort: string | null;
  };
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

async function runInstituteExamAction(
  page: Page,
  examId: string,
  action: "sync-marks" | "publish" | "refresh-status" | "mark-live",
) {
  const result = await requestBackendJson<{
    data?: {
      status?: string | null;
    } | null;
  }>(page, `/api/v1/exams/${examId}/${action}/`, {
    method: "POST",
    data: {},
  });
  expect(result.response.ok(), result.bodyText).toBe(true);
  return result.payload?.data?.status ?? null;
}

async function expectStudentStartAccess(page: Page, examId: string) {
  const detailResult = await requestBackendJson<{
    can_start?: boolean;
    availability_state?: string | null;
    start_access?: {
      is_allowed?: boolean;
      reason_message?: string | null;
      policy_code?: string | null;
    } | null;
  }>(page, `/api/v1/student/exams/${examId}/detail/`);
  expect(detailResult.response.ok(), detailResult.bodyText).toBe(true);
  expect(
    detailResult.payload?.start_access?.is_allowed,
    detailResult.payload?.start_access?.reason_message ??
      detailResult.payload?.start_access?.policy_code ??
      `Student start access blocked for exam ${examId}.`,
  ).toBe(true);
  expect(detailResult.payload?.can_start).toBe(true);
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

async function expectAnyVisibleText(page: Page, pattern: RegExp) {
  await expect
    .poll(async () => {
      const matches = page.getByText(pattern);
      const count = await matches.count();
      for (let index = 0; index < count; index += 1) {
        if (await matches.nth(index).isVisible().catch(() => false)) {
          return true;
        }
      }
      return false;
    })
    .toBe(true);
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
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let studentCohortName: string | null = null;
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
      console.log("analysis: student scope login ready");

      const studentScope = await resolveStudentProfileScope(page);
      studentDisplayName = studentScope.displayName;
      studentAcademicYearName = studentScope.academicYearName;
      studentProgramName = studentScope.programName;
      studentCohortName = studentScope.cohortName;

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      console.log("analysis: institute login ready");

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
        studentProgramName,
      );
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
      await page.locator('input[name="is_verified"]').check();

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      console.log("analysis: question created");
      const questionDetailUrl = page.url().split("?")[0] ?? page.url();
      questionId = questionDetailUrl.match(/\/institute\/question-bank\/([^/?#]+)/)?.[1] ?? null;
      expect(questionId).not.toBeNull();

      await page.goto("/institute/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      const examAcademicYearSelect = page.getByRole("combobox", { name: /academic year/i }).first();
      const examProgramSelect = page.getByRole("combobox", { name: /^program/i }).first();
      const examCohortSelect = page.getByRole("combobox", { name: /cohort/i }).first();
      const examSubjectSelect = page.locator('select[name="subject"]').first();
      if (studentAcademicYearName) {
        await selectOptionByLabelFragment(examAcademicYearSelect, studentAcademicYearName);
      }
      if (studentProgramName) {
        await selectOptionByLabelFragment(examProgramSelect, studentProgramName);
      } else {
        await examProgramSelect.selectOption(academicLane.programValue);
      }
      if (studentCohortName && (await examCohortSelect.count())) {
        await expect(examCohortSelect).toBeEnabled();
        await waitForHydratedOptions(
          examCohortSelect,
          "Expected exam cohort options to hydrate after selecting the institute exam program",
        );
        await selectOptionByLabelFragment(examCohortSelect, studentCohortName);
      }
      await expect(subjectSelect).toBeEnabled();
      await waitForHydratedOptions(
        examSubjectSelect,
        "Expected exam subject options to hydrate after selecting the institute exam program",
      );
      await examSubjectSelect.selectOption(academicLane.subjectValue);
      await expect.poll(async () => examSubjectSelect.inputValue()).toBe(academicLane.subjectValue);
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      console.log("analysis: exam shell created");

      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      const ensuredExamId = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(ensuredExamId).not.toBeNull();
      if (!ensuredExamId) {
        throw new Error("Expected created institute exam to expose an exam ID.");
      }
      examId = ensuredExamId;

      const questionBuilderUrl = `/institute/exams/${ensuredExamId}/builder?tab=questions`;
      await page.goto(questionBuilderUrl);
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();
      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const targetQuestionOption = await waitForQuestionOption(
        page,
        questionSelect,
        questionText,
        questionBuilderUrl,
      );
      expect(targetQuestionOption).not.toBeNull();
      await questionSelect.selectOption(targetQuestionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      console.log("analysis: question attached");

      const examScope = await fetchExamDetailScope(page, ensuredExamId);
      const scopedStudents = await fetchScopedStudents(page, {
        academicYear: examScope.academic_year,
        program: examScope.program,
        cohort: examScope.cohort,
      });
      expect(scopedStudents.length).toBeGreaterThan(0);
      const matchedStudent =
        scopedStudents.find((student) =>
          student.full_name.toLowerCase().includes(studentDisplayName.toLowerCase()),
        ) ?? scopedStudents[0]!;
      await assignExamStudents(page, ensuredExamId, [matchedStudent.id]);
      console.log("analysis: student assigned");

      await page.goto(`/institute/exams/${ensuredExamId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("4");
      await page.locator('input[name="passing_marks"]').fill("2");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);
      console.log("analysis: exam settings saved");

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
      console.log("analysis: exam lifecycle actions complete");

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      console.log("analysis: student relogin ready for exam");
      await expectStudentStartAccess(page, ensuredExamId);
      await page.goto(`/app/exams/${ensuredExamId}`);
      console.log("analysis: student exam detail opened", page.url());
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
      ).toBeVisible();
      console.log("analysis: student exam heading visible");
      const startButton = page.getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i });
      await expect(startButton).toBeVisible();
      console.log("analysis: start button visible");
      await startButton.click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      console.log("analysis: student attempt opened");
      const attemptUrl = page.url().split("?")[0] ?? page.url();
      const studentAttemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
      expect(studentAttemptId).not.toBeNull();
      if (!studentAttemptId) {
        throw new Error("Expected student attempt route to expose an attempt ID.");
      }
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright institute analysis answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/1 saved|response updated successfully/i).first()).toBeVisible();
      console.log("analysis: student answer saved");

      const studentAccessToken = await getCurrentSessionAccessToken(page);
      const submitAttemptResult = await requestBackendJson<{
        success?: boolean;
      }>(page, `/api/v1/attempts/${studentAttemptId}/submit/`, {
        method: "POST",
        accessToken: studentAccessToken,
        data: {},
      });
      expect(submitAttemptResult.response.ok(), submitAttemptResult.bodyText).toBe(true);
      console.log("analysis: attempt submitted");

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${ensuredExamId}`);
      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }
      console.log("analysis: mark completed handled");

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
      console.log("analysis: results generated");

      const calculateRanksButton = page.getByRole("button", { name: /calculate ranks|recalculate ranks/i }).first();
      await expect(calculateRanksButton).toBeVisible();
      await calculateRanksButton.click();
      await expect
        .poll(
          async () =>
            /message=/.test(page.url()) ||
            Boolean((await fetchLeaderboardSummary(page, ensuredExamId))?.all_ranked),
          { timeout: 15000 },
        )
        .toBe(true);
      console.log("analysis: ranks calculated");

      const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
      if (await publishResultsButton.isVisible().catch(() => false)) {
        await publishResultsButton.click();
        await expect
          .poll(
            async () =>
              /message=/.test(page.url()) ||
              Boolean((await fetchLeaderboardSummary(page, ensuredExamId))?.published_results),
            { timeout: 15000 },
          )
          .toBe(true);
      }
      console.log("analysis: publish results handled");

      await expect
        .poll(
          async () => {
            await page.goto(`/institute/results/analysis?exam=${ensuredExamId}`);
            return page.getByText(/question risk board/i).first().isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);
      console.log("analysis: analysis workspace hydrated");

      await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*exam=/);
      await expect(page.getByText(/all exams to exam-wise to student-wise to question-wise evidence/i).first()).toBeVisible();
      await expect(page.getByText(/analysis lens/i).first()).toBeVisible();
      await expect(page.getByText(/family focus board/i).first()).toBeVisible();
      await expect(page.getByText(/exam pulse/i).first()).toBeVisible();
      await expect(page.getByText(/topic strength/i).first()).toBeVisible();
      await expect(page.getByText(/question risk board/i).first()).toBeVisible();
      await expect(page.getByText(/^student explorer$/i).first()).toBeVisible();
      console.log("analysis: overview assertions passed");
      await expectAnyVisibleText(page, new RegExp(escapeRegExp(examTitle), "i"));
      console.log("analysis: exam title visible");
      await expectAnyVisibleText(page, new RegExp(escapeRegExp(questionText), "i"));
      console.log("analysis: question text visible");
      await expectAnyVisibleText(page, new RegExp(escapeRegExp(studentDisplayName), "i"));
      console.log("analysis: student name visible");

      const studentCard = page.locator("a.analyticsResultStudentCard").first();
      await expect(studentCard).toBeVisible();
      console.log("analysis: student card visible");
      await studentCard.click();
      await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*attempt=/);
      await expect(page.getByText(/selected student/i).first()).toBeVisible();
      await expect(page.getByText(/question-wise evidence/i).first()).toBeVisible();
      await expect(page.getByText(/rubric insight/i).first()).toBeVisible();
      console.log("analysis: student drilldown visible");
      await expectAnyVisibleText(page, new RegExp(escapeRegExp(studentDisplayName), "i"));
      await expectAnyVisibleText(page, new RegExp(escapeRegExp(questionText), "i"));
      console.log("analysis: drilldown entity assertions passed");

      const drilldownUrl = new URL(page.url());
      drilldownUrl.searchParams.set("student_question_filter", "all");
      await page.goto(`${drilldownUrl.pathname}?${drilldownUrl.searchParams.toString()}`);
      await expect(page).toHaveURL(/\/institute\/results\/analysis\?[^#]*student_question_filter=all/);
      console.log("analysis: final filter assertion passed");
    } finally {
      if (page.isClosed()) {
        return;
      }
      if (examId || questionId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
      }
      if (examId) {
        await deleteInstituteExam(page, examId);
      }
      if (questionId) {
        const deleteQuestionResponse = await page.request.delete(`/api/question-bank/questions/${questionId}`);
        expect(deleteQuestionResponse.ok()).toBe(true);
      }
    }
  });
});
