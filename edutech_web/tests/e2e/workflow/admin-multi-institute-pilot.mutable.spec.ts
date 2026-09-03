import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { fetchPrograms, fetchSubjects, fetchTopics } from "../helpers/assessment-family";
import { loginAsRole, loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableAdminStudentAttemptEnabled =
  isMutableLaneEnabled("PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS");

const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type InstituteRecord = {
  id: string;
  code?: string;
  name: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
};

type AcademicYearRecord = {
  id: string;
  name: string;
  is_active?: boolean;
  is_current?: boolean;
};

type ProgramRecord = {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
};

type CohortRecord = {
  id: string;
  name: string;
  code?: string;
  program?: string;
  academic_year?: string;
  is_active?: boolean;
};

type StudentRecord = {
  id: string;
  full_name?: string;
  admission_no?: string;
  login_username?: string | null;
};

type StudentTarget = {
  admissionNo: string;
  displayName: string;
  credentials: DirectLoginCredentials;
  studentId: string;
};

type InstituteScope = {
  instituteId: string;
  instituteCode: string;
  instituteName: string;
  academicYearName: string;
  programName: string;
  programCode?: string;
  cohortName: string;
  cohortCode?: string;
  academicYearId?: string;
  programId?: string;
  cohortId?: string;
};

type MultiInstituteLane = InstituteScope & {
  students: StudentTarget[];
  seededQuestionIds?: string[];
  seededTopicIds?: string[];
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

function normalizeAcademicLabel(label: string) {
  return label.replace(/\s+\([^)]+\)\s*$/, "").trim();
}

function throttleMessageFromText(message: string) {
  return /request was throttled|expected available in\s+\d+\s+seconds?/i.test(message);
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchJson<T>(page: Page, path: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${adminApiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as T;
}

function extractResults<T>(payload: { results?: T[] } | T[]) {
  return Array.isArray(payload) ? payload : (payload.results ?? []);
}

async function discoverInstituteScopes(page: Page): Promise<InstituteScope[]> {
  const institutesPayload = await fetchJson<{ results?: InstituteRecord[] } | InstituteRecord[]>(
    page,
    "/api/v1/institutes/?page_size=100",
  );
  const institutes = extractResults(institutesPayload).filter((institute) => institute.is_active !== false);
  const regularInstitutes = institutes.filter((institute) => {
    const metadata = institute.metadata as Record<string, unknown> | undefined;
    const code = String(institute.code || "").trim().toLowerCase();
    const name = String(institute.name || "").trim().toLowerCase();
    return (
      !Boolean(metadata?.is_public_content_hub) &&
      !code.startsWith("pub") &&
      !name.includes("public content hub") &&
      !name.includes("public institute") &&
      !name.includes("public learning")
    );
  });
  const candidateInstitutes = regularInstitutes.length >= 2 ? regularInstitutes : institutes;

  const scopes: InstituteScope[] = [];
  for (const institute of candidateInstitutes) {
    const [academicYearsPayload, programsPayload, cohortsPayload] = await Promise.all([
      fetchJson<{ results?: AcademicYearRecord[] } | AcademicYearRecord[]>(
        page,
        `/api/v1/academics/academic-years/?institute=${encodeURIComponent(institute.id)}&page_size=100`,
      ),
      fetchJson<{ results?: ProgramRecord[] } | ProgramRecord[]>(
        page,
        `/api/v1/academics/programs/?institute=${encodeURIComponent(institute.id)}&page_size=100`,
      ),
      fetchJson<{ results?: CohortRecord[] } | CohortRecord[]>(
        page,
        `/api/v1/academics/cohorts/?institute=${encodeURIComponent(institute.id)}&page_size=100`,
      ),
    ]);

    const academicYears = extractResults(academicYearsPayload);
    const programs = extractResults(programsPayload);
    const cohorts = extractResults(cohortsPayload);

    const academicYear =
      academicYears.find((item) => item.is_active && item.is_current) ??
      academicYears.find((item) => item.is_active) ??
      academicYears[0] ??
      null;
    const program = programs.find((item) => item.is_active) ?? programs[0] ?? null;
    if (!academicYear || !program) {
      continue;
    }

    const cohort =
      cohorts.find(
        (item) =>
          item.is_active &&
          item.program === program.id &&
          item.academic_year === academicYear.id,
      ) ??
      cohorts.find((item) => item.program === program.id) ??
      cohorts[0] ??
      null;

    scopes.push({
      instituteId: institute.id,
      instituteCode: String(institute.code || institute.id).trim(),
      instituteName: institute.name,
      academicYearId: academicYear.id,
      academicYearName: normalizeAcademicLabel(academicYear.name),
      programId: program.id,
      programName: normalizeAcademicLabel(program.code || program.name),
      programCode: normalizeAcademicLabel(program.code || program.name),
      cohortId: cohort?.id ?? "",
      cohortName: normalizeAcademicLabel(cohort?.code || cohort?.name || ""),
      cohortCode: normalizeAcademicLabel(cohort?.code || cohort?.name || ""),
    });
  }

  return scopes.slice(0, 2);
}

async function createStudentsForInstitute(
  page: Page,
  scope: InstituteScope,
  uniqueSeed: number,
  laneIndex: number,
): Promise<MultiInstituteLane> {
  const definitions = Array.from({ length: 2 }, (_, index) => {
    const suffix = `${laneIndex + 1}${index + 1}${String(uniqueSeed).slice(-4)}`;
    return {
      admissionNo: `PW-MI-${suffix}`,
      firstName: `PWMI${laneIndex + 1}Student${index + 1}`,
      lastName: "Pilot",
      username: `pw.mi.${laneIndex + 1}.${index + 1}.${uniqueSeed}`,
      password: "Student@12345",
      email: `pw.mi.${laneIndex + 1}.${index + 1}.${uniqueSeed}@example.test`,
      phone: `83${String(uniqueSeed).slice(-8 + index)}`.slice(0, 10),
      guardianPhone: `73${String(uniqueSeed).slice(-8 + index)}`.slice(0, 10),
    };
  });

  await page.goto(`/admin/people?view=students&institute=${encodeURIComponent(scope.instituteId)}`);
  await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /select institute/i })).toHaveValue(scope.instituteId);

  const students: StudentTarget[] = [];
  let selectedAcademicYearLabel = scope.academicYearName;
  let selectedProgramLabel = scope.programName;
  let selectedCohortLabel = scope.cohortName;
  let selectedAcademicYearId = scope.academicYearId ?? "";
  let selectedProgramId = scope.programId ?? "";
  let selectedCohortId = scope.cohortId ?? "";
  for (const definition of definitions) {
    await page.getByRole("button", { name: /^create student$/i }).click();
    const studentDialog = page.getByRole("dialog");
    await expect(studentDialog.getByRole("heading", { name: /new student profile/i })).toBeVisible();
    await studentDialog.getByLabel(/admission no/i).fill(definition.admissionNo);
    await studentDialog.getByLabel(/first name/i).fill(definition.firstName);
    await studentDialog.getByLabel(/last name/i).fill(definition.lastName);
    await studentDialog.getByLabel(/^email$/i).fill(definition.email);
    await studentDialog.getByLabel(/^phone$/i).fill(definition.phone);
    await studentDialog.getByLabel(/guardian name/i).fill("Playwright Guardian");
    await studentDialog.getByLabel(/guardian phone/i).fill(definition.guardianPhone);

    const firstNonEmptyOptionValue = (values: string[]) =>
      values.find((value) => value.trim().length > 0) ?? null;

    const availableAcademicYearValues = await studentDialog
      .getByLabel(/academic year/i)
      .locator("option")
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    const availableProgramValues = await studentDialog
      .getByLabel(/program/i)
      .locator("option")
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));

    const academicYearValue =
      (scope.academicYearId && availableAcademicYearValues.includes(scope.academicYearId)
        ? scope.academicYearId
        : null) ?? firstNonEmptyOptionValue(availableAcademicYearValues);
    const programValue =
      (scope.programId && availableProgramValues.includes(scope.programId)
        ? scope.programId
        : null) ?? firstNonEmptyOptionValue(availableProgramValues);
    expect(academicYearValue).not.toBeNull();
    expect(programValue).not.toBeNull();

    await studentDialog.getByLabel(/academic year/i).selectOption(academicYearValue!);
    await studentDialog.getByLabel(/program/i).selectOption(programValue!);
    selectedAcademicYearId = academicYearValue!;
    selectedProgramId = programValue!;
    selectedAcademicYearLabel = normalizeAcademicLabel(
      await studentDialog.getByLabel(/academic year/i).locator("option:checked").textContent() ?? scope.academicYearName,
    );
    selectedProgramLabel = normalizeAcademicLabel(
      await studentDialog.getByLabel(/program/i).locator("option:checked").textContent() ?? scope.programName,
    );
    await studentDialog.getByLabel(/create login after save/i).uncheck();

    const availableCohortValues = await studentDialog
      .getByLabel(/cohort/i)
      .locator("option")
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    const cohortValue =
      (scope.cohortId && availableCohortValues.includes(scope.cohortId) ? scope.cohortId : null) ??
      firstNonEmptyOptionValue(availableCohortValues);
    if (cohortValue) {
      await studentDialog.getByLabel(/cohort/i).selectOption(cohortValue);
      selectedCohortId = cohortValue;
      selectedCohortLabel = normalizeAcademicLabel(
        await studentDialog.getByLabel(/cohort/i).locator("option:checked").textContent() ?? scope.cohortName,
      );
    }

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/people/students") &&
        response.request().method() === "POST",
    );
    await studentDialog.getByRole("button", { name: /^create student$/i }).last().click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);
    const createPayload = (await createResponse.json()) as { id?: string };
    const studentId = createPayload.id ?? "";
    expect(studentId).not.toBe("");

    const createLoginResponse = await page.request.post(`/api/admin/account-management/students/${studentId}/create-login`, {
      data: {
        username: definition.username,
        password: definition.password,
        confirm_password: definition.password,
        auto_generate: false,
      },
    });
    if (!createLoginResponse.ok()) {
      const loginProvisionMessage = (await createLoginResponse.text().catch(() => "")).trim();
      if (createLoginResponse.status() === 429 || throttleMessageFromText(loginProvisionMessage)) {
        test.skip(
          true,
          "Admin student login provisioning is currently throttled by the backend cooldown window.",
        );
      }
    }
    expect(createLoginResponse.ok()).toBe(true);

    const studentResponse = await page.request.get(`/api/admin/people/students/${studentId}`);
    expect(studentResponse.ok()).toBe(true);
    const student = (await studentResponse.json()) as StudentRecord;
    students.push({
      admissionNo: definition.admissionNo,
      displayName: student.full_name?.trim() || `${definition.firstName} ${definition.lastName}`,
      credentials: {
        username: definition.username,
        password: definition.password,
      },
      studentId,
    });
  }

  return {
    ...scope,
    academicYearName: selectedAcademicYearLabel,
    programName: selectedProgramLabel,
    cohortName: selectedCohortLabel,
    academicYearId: selectedAcademicYearId,
    programId: selectedProgramId,
    cohortId: selectedCohortId,
    students,
  };
}

async function resolveInstituteScopeWithTopics(page: Page, instituteId: string) {
  const programs = await fetchPrograms(page, instituteId);
  for (const program of programs) {
    const subjects = await fetchSubjects(page, program.id, instituteId);
    for (const subject of subjects) {
      const topics = await fetchTopics(page, subject.id, instituteId);
      for (const topic of topics) {
        const questionInventory = await fetchJson<{ results?: Array<{ id: string }> }>(
          page,
          `/api/v1/question-bank/questions/?compact=1&page_size=1&institute=${encodeURIComponent(instituteId)}&program=${encodeURIComponent(program.id)}&subject=${encodeURIComponent(subject.id)}&topic=${encodeURIComponent(topic.id)}&is_active=true`,
        );
        const [firstQuestion] = extractResults(questionInventory);
        if (!firstQuestion) {
          continue;
        }
        return {
          programId: program.id,
          programName: normalizeAcademicLabel(program.code || program.name),
          subjectId: subject.id,
          subjectCode: subject.code,
          topicCode: topic.code,
          questionId: firstQuestion.id,
        };
      }
    }
  }
  return null;
}

async function createAdminQuestionDirectly(page: Page, payload: Record<string, unknown>) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${adminApiBaseUrl}/api/v1/question-bank/questions/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: payload,
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as { id: string };
}

async function createAdminTopicDirectly(page: Page, payload: {
  instituteId: string;
  subjectId: string;
  uniqueSeed: number;
}) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${adminApiBaseUrl}/api/v1/academics/topics/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: payload.instituteId,
      subject: payload.subjectId,
      parent_topic: null,
      name: `Admin Multi Institute Topic ${payload.uniqueSeed}`,
      code: `PW-ADMIN-MI-TOPIC-${payload.uniqueSeed}`,
      description: "Disposable admin topic created by Playwright for multi-institute runtime coverage.",
      difficulty_level: "foundation",
      sort_order: 9999,
      is_active: true,
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as { id: string; code: string };
}

async function deleteAdminQuestionDirectly(page: Page, questionId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/question-bank/questions/${questionId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function deleteAdminTopicDirectly(page: Page, topicId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/academics/topics/${topicId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function ensureInstituteQuestionInventory(page: Page, lane: MultiInstituteLane) {
  const programs = await fetchPrograms(page, lane.instituteId);
  const fallbackProgram =
    programs.find((program) => program.id === lane.programId) ??
    programs.find((program) => normalizeAcademicLabel(program.code || program.name) === lane.programName) ??
    programs[0] ??
    null;
  expect(fallbackProgram).not.toBeNull();

  const subjects = await fetchSubjects(page, fallbackProgram!.id, lane.instituteId);
  const fallbackSubject = subjects[0] ?? null;
  expect(fallbackSubject).not.toBeNull();

  const uniqueSeed = Date.now();
  const topics = await fetchTopics(page, fallbackSubject!.id, lane.instituteId);
  let fallbackTopic = topics[0] ?? null;
  if (!fallbackTopic) {
    const createdTopic = await createAdminTopicDirectly(page, {
      instituteId: lane.instituteId,
      subjectId: fallbackSubject!.id,
      uniqueSeed,
    });
    lane.seededTopicIds = [...(lane.seededTopicIds ?? []), createdTopic.id];
    fallbackTopic = {
      id: createdTopic.id,
      code: createdTopic.code,
      name: createdTopic.code,
      subject: fallbackSubject!.id,
    };
  }
  expect(fallbackTopic).not.toBeNull();

  const createdQuestion = await createAdminQuestionDirectly(page, {
    institute: lane.instituteId,
    program: fallbackProgram!.id,
    subject: fallbackSubject!.id,
    topic: fallbackTopic!.id,
    created_by_teacher: null,
    question_type: "mcq_single",
    difficulty_level: "foundation",
    content_format: "plain_text",
    question_text: `PW Multi Institute Seeded Question ${uniqueSeed}`,
    explanation: "Disposable question seeded for multi-institute Playwright runtime coverage.",
    review_guidance: "",
    default_marks: "1.00",
    negative_marks: "0.00",
    is_active: true,
    is_verified: false,
    metadata: {
      is_draft: true,
    },
    options: [
      {
        option_text: "True",
        option_order: 1,
        is_correct: true,
        explanation: "",
      },
      {
        option_text: "False",
        option_order: 2,
        is_correct: false,
        explanation: "",
      },
    ],
  });

  lane.seededQuestionIds = [...(lane.seededQuestionIds ?? []), createdQuestion.id];

  return {
    programId: fallbackProgram!.id,
    programName: normalizeAcademicLabel(fallbackProgram!.code || fallbackProgram!.name),
    subjectId: fallbackSubject!.id,
    subjectCode: fallbackSubject!.code,
    topicCode: fallbackTopic!.code,
    questionId: createdQuestion.id,
  };
}

async function createAdminExamShellDirectly(
  page: Page,
  uniqueSeed: number,
  lane: MultiInstituteLane,
  scope: {
    programId: string;
    subjectId: string;
  },
) {
  const examTitle = `PW Multi Institute ${lane.instituteName} ${uniqueSeed}`;
  const examCode = `PW-MI-${String(uniqueSeed).slice(-6)}-${lane.instituteId.slice(0, 4).toUpperCase()}`;
  const accessToken = await backendAccessToken(page);
  const createResponse = await page.request.post(`${adminApiBaseUrl}/api/v1/exams/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: lane.instituteId,
      academic_year: lane.academicYearId,
      program: scope.programId,
      cohort: null,
      subject: scope.subjectId,
      source_type: "institute",
      title: examTitle,
      code: examCode,
      description: `Mock exam for ${lane.instituteName}`,
      exam_type: "mock_exam",
      delivery_mode: "online",
      duration_minutes: 60,
      total_marks: "0",
      passing_marks: "0",
      start_at: null,
      end_at: null,
      instructions: "",
      allow_late_submit: false,
      randomize_questions: true,
      randomize_options: true,
      show_result_immediately: true,
      allow_review_after_submit: true,
      max_attempts: 1,
      timer_mode: "global",
      navigation_mode: "free_section",
      attempt_policy: "single",
      result_publish_mode: "immediate",
      review_mode: "attempted_only",
      security_mode: "normal",
      rank_visibility_mode: "hidden",
      percentile_visibility_mode: "hidden",
      benchmark_visibility_mode: "peer_average_only",
      rank_freeze_policy: "freeze_on_exam_closure",
      allow_resume: true,
      allow_section_switching: true,
      allow_return_to_previous_section: true,
      result_publish_at: null,
      review_available_from: null,
      review_available_until: null,
    },
    timeout: 15000,
  });
  expect(createResponse.ok(), await createResponse.text()).toBe(true);
  const createdExam = (await createResponse.json()) as { id?: string; data?: { id?: string } };
  const examId = createdExam.data?.id ?? createdExam.id ?? null;
  expect(examId).not.toBeNull();
  return { examId: examId!, examTitle };
}

async function createExamSection(
  page: Page,
  examId: string,
  name: string,
  sectionOrder: number,
  subjectId: string | null,
) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${adminApiBaseUrl}/api/v1/exams/sections/`, {
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
  marks = "1",
) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${adminApiBaseUrl}/api/v1/exams/questions/`, {
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

async function createAdminAdvancedMockExam(
  page: Page,
  uniqueSeed: number,
  lane: MultiInstituteLane,
) {
  const resolvedBuilderScope = await ensureInstituteQuestionInventory(page, lane);
  expect(resolvedBuilderScope).not.toBeNull();
  const created = await createAdminExamShellDirectly(page, uniqueSeed, lane, {
    programId: resolvedBuilderScope!.programId,
    subjectId: resolvedBuilderScope!.subjectId,
  });
  const sectionId = await createExamSection(page, created.examId, "Section A", 1, resolvedBuilderScope!.subjectId);
  await linkExamQuestion(page, created.examId, resolvedBuilderScope!.questionId, sectionId, 1, "1");
  return created;
}

async function assignStudentToAdminExam(page: Page, examId: string, studentId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${adminApiBaseUrl}/api/v1/exams/${examId}/assign-students/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      assignment_mode: "selected_students",
      student_ids: [studentId],
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function scheduleAndPublishAdminExam(page: Page, examId: string) {
  const now = new Date();
  const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await page.goto(`/admin/exams/${examId}/builder`);
  await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
  await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
  await page.locator('input[name="total_marks"]').fill("1");
  await page.locator('input[name="passing_marks"]').fill("1");
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(/message=/);
  await expect(page.getByText(/exam settings updated\./i)).toBeVisible();

  await page.goto(`/admin/exams/${examId}`);
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
}

async function attemptExamAsStudent(
  page: Page,
  examId: string,
  examTitle: string,
  credentials: DirectLoginCredentials,
  answerSeed: number,
) {
  await loginWithCredentials(page, credentials, "student");
  await expectStudentWorkspace(page);

  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();

  const startButton = page.getByRole("button", { name: /^(start|start mock test|start exam|start practice set)$/i });
  await expect(startButton).toBeVisible();
  await startButton.click();

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
  await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();

  await answerCurrentAttemptQuestion(page, answerSeed, "Playwright multi institute answer");
  await page.getByRole("button", { name: /save answer|save (&|and) review|save (&|and) next/i }).first().click();
  await expect(
    page.getByText(/response updated successfully|responses saved|your latest confirmed sync reached the backend/i).first(),
  ).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^(submit test|end test)$/i }).first().click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
  await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
  await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();
}

async function verifyExamBlockedForUnassignedStudent(
  page: Page,
  examId: string,
  credentials: DirectLoginCredentials,
) {
  await loginWithCredentials(page, credentials, "student");
  await expectStudentWorkspace(page);
  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: /exam detail/i }).first()).toBeVisible();
  await expect(
    page
      .getByText(/not available to this student|unable to load exam detail/i)
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole("heading", {
        name: /this exam is not available in your workspace|exam detail could not be loaded/i,
      })
      .first(),
  ).toBeVisible();
}

async function deleteAdminExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

test.describe("Admin multi-institute pilot workflow", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are required.",
  );

  test.skip(
    !mutableAdminStudentAttemptEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "multi-institute disposable pilot coverage",
    ),
  );

  test("@workflow @mutable admin can create multi-institute student pilot data and prove exam runtime across separate tenants", async ({
    page,
  }) => {
    test.setTimeout(420000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const scopes = await discoverInstituteScopes(page);
    expect(scopes.length).toBeGreaterThanOrEqual(2);

    const uniqueSeed = Date.now();
    const lanes: MultiInstituteLane[] = [];
    const examIds: string[] = [];

    try {
      for (const [index, scope] of scopes.entries()) {
        const lane = await createStudentsForInstitute(page, scope, uniqueSeed, index);
        lanes.push(lane);
      }

      for (const [index, lane] of lanes.entries()) {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);

        const created = await createAdminAdvancedMockExam(page, uniqueSeed + index, lane);
        examIds.push(created.examId);

        await assignStudentToAdminExam(page, created.examId, lane.students[0]!.studentId);
        await scheduleAndPublishAdminExam(page, created.examId);

        await attemptExamAsStudent(
          page,
          created.examId,
          created.examTitle,
          lane.students[0]!.credentials,
          uniqueSeed + index,
        );
        await verifyExamBlockedForUnassignedStudent(
          page,
          created.examId,
          lane.students[1]!.credentials,
        );
      }
    } finally {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      for (const examId of examIds) {
        await deleteAdminExamDirectly(page, examId);
      }
      for (const lane of lanes) {
        for (const questionId of lane.seededQuestionIds ?? []) {
          await deleteAdminQuestionDirectly(page, questionId);
        }
        for (const topicId of lane.seededTopicIds ?? []) {
          await deleteAdminTopicDirectly(page, topicId);
        }
        for (const student of lane.students) {
          const deleteStudentResponse = await page.request.delete(`/api/admin/people/students/${student.studentId}`);
          expect(deleteStudentResponse.ok()).toBe(true);
        }
      }
    }
  });
});
