import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
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
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let studentCohortName: string | null = null;
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

      const studentScope = await resolveStudentProfileScope(page);
      studentDisplayName = studentScope.displayName;
      studentAcademicYearName = studentScope.academicYearName;
      studentProgramName = studentScope.programName;
      studentCohortName = studentScope.cohortName;

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

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
      await page.locator('input[name="is_verified"]').check();

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
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
      await expect(examSubjectSelect).toBeEnabled();
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

      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      examId = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(examId).not.toBeNull();

      const questionBuilderUrl = `/institute/exams/${examId}/builder?tab=questions`;
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
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("10");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);

      const examScope = await fetchExamDetailScope(page, examId);
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
      await assignExamStudents(page, examId, [matchedStudent.id]);

      await page.goto(`/institute/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("10");
      await page.locator('input[name="passing_marks"]').fill("4");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/institute/exams/${examId}`);
      const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
      if (await syncMarksButton.isVisible().catch(() => false)) {
        await syncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, examId, "sync-marks");
      }
      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.isVisible().catch(() => false)) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, examId, "publish");
      }
      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.isVisible().catch(() => false)) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, examId, "mark-live");
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await expectStudentStartAccess(page, examId);
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
      await expectAnyVisibleText(page, /contacted/i);

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
