import { expect, test, type Locator, type Page } from "@playwright/test";
import { type DirectLoginCredentials, loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectInstituteWorkspace,
  expectStudentWorkspace,
} from "../helpers/navigation";

const mutableInstituteResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const instituteApiBaseUrl = (
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

type CatalogEntry = {
  namespace: string;
  code: string;
  is_default?: boolean;
};

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

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
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

async function fetchSessionProfile(page: Page, accessToken?: string) {
  const token = accessToken ?? (await getAccessToken(page));
  const response = await page.request.get(`${instituteApiBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as SessionProfile;
}

function pickDefaultOption(catalog: CatalogEntry[], namespace: string, fallback = "") {
  const namespaceEntries = catalog.filter((entry) => entry.namespace === namespace);
  return namespaceEntries.find((entry) => entry.is_default)?.code ?? namespaceEntries[0]?.code ?? fallback;
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
  const studentFirstName = `PWInst${uniqueSeed}`;
  const studentLastName = "Learner";
  const studentAdmissionNo = `PW-IML-${uniqueSeed}`;
  const username = `pw.institute.multi.student.${uniqueSeed}`;
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
      address: "Playwright institute multi-learner lane",
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
  const response = await page.request.delete(`/api/admin/people/students/${studentId}`, {
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function deleteInstituteExam(page: Page, examId: string) {
  const accessToken = await getAccessToken(page);

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

async function fetchInstituteLeaderboard(page: Page, examId: string) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.get(`${instituteApiBaseUrl}/api/v1/results/exam/${examId}/leaderboard/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as LeaderboardPayload;
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
    timeout: 15000,
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

async function fetchExamStatus(page: Page, examId: string) {
  const result = await requestBackendJson<{
    status?: string | null;
  }>(page, `/api/v1/exams/${examId}/`);
  expect(result.response.ok(), result.bodyText).toBe(true);
  return result.payload?.status ?? null;
}

async function publishExamResultsViaApi(page: Page, examId: string) {
  const result = await requestBackendJson<Record<string, unknown>>(page, "/api/v1/results/publish-exam-results/", {
    method: "POST",
    data: {
      exam: examId,
    },
  });
  expect(result.response.ok(), result.bodyText).toBe(true);
}

async function createInstituteExamShellViaApi(
  page: Page,
  args: {
    title: string;
    code: string;
    academicYearId: string;
    programId: string;
    subjectId: string;
  },
) {
  const accessToken = await getAccessToken(page);
  expect(accessToken).not.toBe("");
  const profile = await fetchSessionProfile(page, accessToken);
  expect(profile.institute).not.toBeNull();

  const optionCatalogResult = await requestBackendJson<{ results: CatalogEntry[] }>(
    page,
    "/api/v1/academics/option-catalog/?is_active=true&page_size=200",
    {
      accessToken,
    },
  );
  expect(optionCatalogResult.response.ok(), optionCatalogResult.bodyText).toBe(true);
  const optionCatalog = optionCatalogResult.payload?.results ?? [];

  const response = await page.request.post(`${instituteApiBaseUrl}/api/v1/exams/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: profile.institute,
      academic_year: args.academicYearId,
      program: args.programId,
      subject: args.subjectId,
      source_type: "institute",
      title: args.title,
      code: args.code,
      description: "",
      exam_type: pickDefaultOption(optionCatalog, "exam_type"),
      delivery_mode: pickDefaultOption(optionCatalog, "exam_delivery_mode"),
      duration_minutes: 60,
      total_marks: "0",
      passing_marks: "0",
      instructions: "",
      allow_late_submit: false,
      randomize_questions: false,
      randomize_options: false,
      show_result_immediately: false,
      allow_review_after_submit: true,
      max_attempts: 1,
      timer_mode: pickDefaultOption(optionCatalog, "exam_timer_mode"),
      navigation_mode: pickDefaultOption(optionCatalog, "exam_navigation_mode"),
      attempt_policy: pickDefaultOption(optionCatalog, "exam_attempt_policy"),
      result_publish_mode: pickDefaultOption(optionCatalog, "exam_result_publish_mode"),
      review_mode: pickDefaultOption(optionCatalog, "exam_review_mode"),
      security_mode: pickDefaultOption(optionCatalog, "exam_security_mode"),
      rank_visibility_mode: "hidden",
      percentile_visibility_mode: "hidden",
      benchmark_visibility_mode: "peer_average_only",
      rank_freeze_policy: "freeze_on_exam_closure",
      allow_resume: true,
      allow_section_switching: true,
      allow_return_to_previous_section: true,
    },
    timeout: 20000,
  });
  expect(response.ok(), `Institute exam create failed: ${await response.text()}`).toBe(true);
  return (await response.json()) as { id?: string | null };
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
  preferredProgramValueOrLabel?: string | null,
) {
  await waitForHydratedOptions(programLocator, "Expected hydrated program options to include a selectable value");
  const programs = await getNonEmptyOptions(programLocator);
  const preferredProgram =
    (preferredProgramValueOrLabel && programs.find((program) => program.value === preferredProgramValueOrLabel)?.value) ??
    (preferredProgramValueOrLabel
      ? await findOptionValueByLabelPattern(programLocator, new RegExp(escapeRegExp(preferredProgramValueOrLabel), "i"))
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

test.describe("Institute mutable multi-learner results distribution", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "institute multi-learner leaderboard distribution coverage",
    ),
  );

  test("@workflow @mutable institute can publish ranked results for two learners and expose them on the leaderboard", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let primaryStudentDisplayName = studentCredentials!.username;
    let primaryStudentAdmissionNo = "";
    let questionId: string | null = null;
    let secondStudentId: string | null = null;
    let secondStudentDisplayName = "";
    let secondStudentAdmissionNo = "";
    let secondStudentCredentials: DirectLoginCredentials | null = null;
    let examId: string | null = null;

    const uniqueSeed = Date.now();
    const examTitle = `PW Institute Multi Learner ${uniqueSeed}`;
    const examCode = `PW-IMLR-${uniqueSeed}`;
    const sectionName = `PW Institute Multi Learner Section ${uniqueSeed}`;
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

      const questionText = `PW institute multi learner question ${uniqueSeed}`;
      await page.goto("/institute/question-bank/new");
      console.log("[institute-results-multi] creating disposable verified question");
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
        primaryStudentDetail.program,
      );
      await questionTypeSelect.selectOption("true_false");
      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page.locator('textarea[name="explanation"]').fill("Playwright institute multi-learner explanation.");
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

      console.log("[institute-results-multi] creating exam shell via api bootstrap");
      const createdExam = await createInstituteExamShellViaApi(page, {
        title: examTitle,
        code: examCode,
        academicYearId: primaryStudentDetail.academic_year,
        programId: academicLane.programValue,
        subjectId: academicLane.subjectValue,
      });
      const ensuredExamId = createdExam.id ?? null;
      expect(ensuredExamId).not.toBeNull();
      if (!ensuredExamId) {
        throw new Error("Expected created institute exam to expose an exam ID.");
      }
      examId = ensuredExamId;
      await page.goto(`/institute/exams/${ensuredExamId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      console.log("[institute-results-multi] exam shell ready", ensuredExamId);

      await page.goto(`/institute/exams/${ensuredExamId}/builder?tab=sections`);
      await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
      await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
      await page.getByRole("button", { name: /^add section$/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);

      await page.goto(`/institute/exams/${ensuredExamId}/builder?tab=questions`);
      console.log("[institute-results-multi] attaching question and assigning learners");
      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionBuilderUrl = `/institute/exams/${ensuredExamId}/builder?tab=questions`;
      const targetQuestionOption = await waitForQuestionOption(page, questionSelect, questionText, questionBuilderUrl);
      expect(targetQuestionOption).not.toBeNull();
      await questionSelect.selectOption(targetQuestionOption!.value);

      const sectionSelect = manualAttachForm.locator('select[name="section"]');
      const sectionOption = await sectionSelect.locator("option").evaluateAll(
        (options, targetSectionName) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.label.trim() === targetSectionName) ?? null,
        sectionName,
      );
      expect(sectionOption).not.toBeNull();
      await sectionSelect.selectOption(sectionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);

      await assignExamStudents(page, ensuredExamId, [primaryStudentDetail.id, secondStudent.studentId]);

      await page.goto(`/institute/exams/${ensuredExamId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("4");
      await page.locator('input[name="passing_marks"]').fill("1");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/institute/exams/${ensuredExamId}`);
      console.log("[institute-results-multi] publishing exam lifecycle");
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

      await loginAsRole(page, "student");
      console.log("[institute-results-multi] primary student submitting attempt");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${ensuredExamId}`);
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright institute first answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expectOneOf(
        page.locator(".feedbackBannerSuccess").filter({
          hasText: /response updated successfully/i,
        }).first(),
        page.getByText(/1 saved/i).first(),
      );
      await submitAttemptViaApi(page);

      expect(secondStudentCredentials).not.toBeNull();
      await loginWithCredentials(page, secondStudentCredentials!, "student");
      console.log("[institute-results-multi] second student submitting attempt");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${ensuredExamId}`);
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await submitAttemptViaApi(page);

      await loginAsRole(page, "institute");
      console.log("[institute-results-multi] completing exam and publishing results");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${ensuredExamId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

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
        .poll(async () => /message=/.test(page.url()) || Boolean((await fetchInstituteLeaderboard(page, ensuredExamId)).summary.all_ranked))
        .toBe(true);

      const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
      if (await publishResultsButton.isVisible().catch(() => false)) {
        await publishResultsButton.click();
        await expect
          .poll(
            async () =>
              /message=/.test(page.url()) ||
              Boolean((await fetchInstituteLeaderboard(page, ensuredExamId)).summary.published_results),
          )
          .toBe(true);
      } else {
        await publishExamResultsViaApi(page, ensuredExamId);
        await expect
          .poll(
            async () =>
              /message=/.test(page.url()) ||
              Boolean((await fetchInstituteLeaderboard(page, ensuredExamId)).summary.published_results),
            { timeout: 15000 },
          )
          .toBe(true);
      }

      await page.goto(`/institute/results?exam=${ensuredExamId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      const leaderboard = await fetchInstituteLeaderboard(page, ensuredExamId);
      console.log("[institute-results-multi] leaderboard payload received", leaderboard.summary);
      expect(leaderboard.summary.total).toBe(2);
      expect(leaderboard.summary.ranked_count).toBe(2);
      expect(leaderboard.summary.published_count).toBe(2);
      expect(leaderboard.summary.all_ranked).toBe(true);
      expect(leaderboard.summary.published_results).toBe(true);
      expect(leaderboard.results).toHaveLength(2);
      expect(
        leaderboard.results
          .map((row) => row.student_name)
          .sort((left, right) => left.localeCompare(right)),
      ).toEqual(
        [primaryStudentDisplayName, secondStudentDisplayName].sort((left, right) => left.localeCompare(right)),
      );
      expect(
        leaderboard.results
          .map((row) => row.student_admission_no)
          .sort((left, right) => left.localeCompare(right)),
      ).toEqual(
        [primaryStudentAdmissionNo, secondStudentAdmissionNo].sort((left, right) => left.localeCompare(right)),
      );
      expect(leaderboard.results.every((row) => row.rank !== null)).toBe(true);
      expect(leaderboard.results.every((row) => Number.parseFloat(row.percentage) >= 0)).toBe(true);

      await page.getByRole("link", { name: /open leaderboard/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/results\/leaderboard\?[^#]*exam=/);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(/leaderboard/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteInstituteExam(page, examId);
      }
      if (secondStudentId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteDisposableStudent(page, secondStudentId);
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
