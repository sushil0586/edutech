import { expect, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "./attempt";
import {
  loginAsRole,
  loginWithCredentials,
  type DirectLoginCredentials,
} from "./auth";
import {
  expectAdminWorkspace,
  expectInstituteWorkspace,
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "./navigation";
import { fetchPresetPacks, type ExamPresetPackPayload } from "./preset-packs";

export const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

export const competitiveStudentCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_COMPETITIVE_STUDENT_USERNAME ?? "demo-competitive-student",
  password: process.env.PLAYWRIGHT_COMPETITIVE_STUDENT_PASSWORD ?? "Demo@12345",
};

export const certificationStudentCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_CERTIFICATION_STUDENT_USERNAME ?? "demo-certification-student",
  password: process.env.PLAYWRIGHT_CERTIFICATION_STUDENT_PASSWORD ?? "Demo@12345",
};

export const awsStudentCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_AWS_STUDENT_USERNAME ?? "demo-aws-student",
  password: process.env.PLAYWRIGHT_AWS_STUDENT_PASSWORD ?? "Demo@12345",
};

export const languageStudentCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_LANGUAGE_STUDENT_USERNAME ?? "demo-language-student",
  password: process.env.PLAYWRIGHT_LANGUAGE_STUDENT_PASSWORD ?? "Demo@12345",
};

export const familyInstituteCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_FAMILY_INSTITUTE_USERNAME ?? "demo-institute-admin",
  password: process.env.PLAYWRIGHT_FAMILY_INSTITUTE_PASSWORD ?? "Demo@12345",
};

export const jeeStudentCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_JEE_STUDENT_USERNAME ?? "demo-jee-student",
  password: process.env.PLAYWRIGHT_JEE_STUDENT_PASSWORD ?? "Demo@12345",
};

export const greStudentCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_GRE_STUDENT_USERNAME ?? "demo-gre-student",
  password: process.env.PLAYWRIGHT_GRE_STUDENT_PASSWORD ?? "Demo@12345",
};

export const familyRuntimeScenarios = [
  {
    presetId: "neet_mock",
    familyLabel: "Competitive",
    programLabel: "Demo NEET Track",
    subjectLabel: "NEET Biology",
    studentCredentials: competitiveStudentCredentials,
  },
  {
    presetId: "jee_mains_math",
    familyLabel: "Competitive",
    programLabel: "JEE 2026 Foundation",
    subjectLabel: "Mathematics",
    studentCredentials: jeeStudentCredentials,
  },
  {
    presetId: "gre_quant",
    familyLabel: "Competitive",
    programLabel: "GRE 2026 Quant Prep",
    subjectLabel: "Quantitative Reasoning",
    studentCredentials: greStudentCredentials,
  },
  {
    presetId: "aws_practitioner",
    familyLabel: "Certification",
    programLabel: "AWS 2026 Practitioner Prep",
    subjectLabel: "AWS Cloud Practitioner",
    studentCredentials: awsStudentCredentials,
  },
  {
    presetId: "ielts_academic",
    familyLabel: "Language Proficiency",
    programLabel: "Demo IELTS Track",
    subjectLabel: "IELTS Academic Skills",
    studentCredentials: languageStudentCredentials,
  },
  {
    presetId: "pte_academic",
    familyLabel: "Language Proficiency",
    programLabel: "Demo IELTS Track",
    subjectLabel: "IELTS Academic Skills",
    studentCredentials: languageStudentCredentials,
  },
] as const;

export type FamilyRuntimeScenario = {
  presetId: (typeof familyRuntimeScenarios)[number]["presetId"];
  familyLabel: string;
  programLabel: string;
  subjectLabel: string;
  studentCredentials: DirectLoginCredentials;
};

export type StudentAttemptTarget = {
  displayName: string;
  studentProfileId: string;
};

const studentAttemptTargetCache = new Map<string, StudentAttemptTarget>();
const loginEnvelopeCache = new Map<string, LoginEnvelope>();
let cachedFamilyInstituteId: string | null = null;
let cachedFamilySetupAdminAccessToken: string | null = null;
const familyAdvancedBuilderAccessEnsured = new Set<string>();
const ADVANCED_BUILDER_FEATURE_CODE = "ADVANCED_EXAM_BUILDER";
const FAMILY_ACCESS_PACKAGE_CODE =
  process.env.PLAYWRIGHT_FAMILY_ACCESS_PACKAGE_CODE ?? "SCHOLAR-QUESTION-BANK-ACCESS";

export function escapeRegExp(value: string) {
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

export async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

type LoginEnvelope = {
  access?: string;
  refresh?: string;
  user?: {
    institute?: string | null;
    institute_name?: string | null;
  };
};

async function requestLoginEnvelope(page: Page, credentials: DirectLoginCredentials) {
  const cacheKey = credentials.username.trim().toLowerCase();
  const cachedEnvelope = loginEnvelopeCache.get(cacheKey);
  if (cachedEnvelope) {
    return cachedEnvelope;
  }

  let lastFailure = "login did not run";
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await page.request.post(`${backendBaseUrl}/api/v1/auth/login/`, {
      data: {
        username: credentials.username,
        password: credentials.password,
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    if (response.ok()) {
      const envelope = (await response.json()) as LoginEnvelope;
      loginEnvelopeCache.set(cacheKey, envelope);
      return envelope;
    }
    const snippet = (await response.text().catch(() => "")).trim();
    lastFailure = snippet || `status ${response.status()}`;
    if (attempt < 5) {
      await page.waitForTimeout(throttleBackoffMs(snippet) ?? 750 * attempt);
    }
  }

  expect(false, lastFailure).toBe(true);
  return {};
}

async function fetchAdminAccessTokenForFamilySetup(page: Page) {
  if (cachedFamilySetupAdminAccessToken) {
    return cachedFamilySetupAdminAccessToken;
  }
  const adminUsername = process.env.PLAYWRIGHT_ADMIN_USERNAME?.trim() || "demo-platform-admin";
  const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD?.trim() || "Demo@12345";
  const envelope = await requestLoginEnvelope(page, {
    username: adminUsername,
    password: adminPassword,
  });
  const access = envelope.access?.trim() ?? "";
  expect(access).not.toBe("");
  cachedFamilySetupAdminAccessToken = access;
  return access;
}

async function ensureFamilyInstituteAdvancedBuilderAccess(page: Page) {
  if (!cachedFamilyInstituteId) {
    const instituteEnvelope = await requestLoginEnvelope(page, familyInstituteCredentials);
    cachedFamilyInstituteId = instituteEnvelope.user?.institute?.trim() ?? "";
  }
  const instituteId = cachedFamilyInstituteId ?? "";
  expect(instituteId).not.toBe("");
  if (familyAdvancedBuilderAccessEnsured.has(instituteId)) {
    return;
  }

  const adminAccessToken = await fetchAdminAccessTokenForFamilySetup(page);
  const featureListResponse = await page.request.get(
    `${backendBaseUrl}/api/v1/economy/admin/question-bank-feature-entitlements/`,
    {
      headers: {
        Authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );
  expect(featureListResponse.ok(), await featureListResponse.text()).toBe(true);
  const featureRows = (await featureListResponse.json()) as Array<{
    institute?: string;
    institute_code?: string;
    feature_code?: string;
    status?: string;
  }>;
  const activeAdvancedBuilderRow = featureRows.find(
    (row) =>
      row.institute === instituteId &&
      row.feature_code === ADVANCED_BUILDER_FEATURE_CODE &&
      row.status === "active",
  );
  if (activeAdvancedBuilderRow) {
    familyAdvancedBuilderAccessEnsured.add(instituteId);
    return;
  }

  const packageListResponse = await page.request.get(`${backendBaseUrl}/api/v1/economy/admin/question-bank-packages/`, {
    headers: {
      Authorization: `Bearer ${adminAccessToken}`,
    },
  });
  expect(packageListResponse.ok(), await packageListResponse.text()).toBe(true);
  const packageRows = (await packageListResponse.json()) as Array<{
    id: string;
    code: string;
    ownership_type?: string;
    is_active?: boolean;
  }>;
  const eligiblePackage =
    packageRows.find((row) => row.code === FAMILY_ACCESS_PACKAGE_CODE) ??
    packageRows.find((row) => row.ownership_type === "platform" && row.is_active !== false);
  expect(eligiblePackage).toBeTruthy();

  const applyResponse = await page.request.post(`${backendBaseUrl}/api/v1/academics/presets/apply/`, {
    headers: {
      Authorization: `Bearer ${adminAccessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: instituteId,
      preset_code: "class_7_cbse_core",
      mode: "selected_subjects",
      subject_codes: ["CLS7-MATH"],
      academic_year_name: "2026-2027",
      academic_year_start: "2026-04-01",
      academic_year_end: "2027-03-31",
      question_bank_package_enabled: true,
      question_bank_package_code: eligiblePackage!.code,
      question_bank_assignment_mode: "access_only",
      advanced_builder_enabled: true,
      onboarding_profile_code: "TRIAL_FULL_ACCESS",
    },
  });
  expect(applyResponse.ok(), await applyResponse.text()).toBe(true);
  familyAdvancedBuilderAccessEnsured.add(instituteId);
}

export async function loginAsFamilyInstitute(page: Page) {
  await ensureFamilyInstituteAdvancedBuilderAccess(page);
  await loginWithCredentials(page, familyInstituteCredentials, "institute");
}

async function responseSnippet(response: Awaited<ReturnType<Page["request"]["get"]>>) {
  const text = (await response.text().catch(() => "")).trim();
  return text.slice(0, 240);
}

function throttleBackoffMs(message: string) {
  const seconds = Number(message.match(/available in\s+(\d+)\s+seconds?/i)?.[1] ?? "");
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000 + 500;
  }
  return null;
}

type LookupInstituteRecord = {
  id: string;
  code: string;
  name: string;
};

type LookupAcademicYearRecord = {
  id: string;
  name: string;
};

type LookupProgramRecord = {
  id: string;
  code: string;
  name: string;
};

type LookupCohortRecord = {
  id: string;
  code: string;
  name: string;
};

type LookupSubjectRecord = {
  id: string;
  code: string;
  name: string;
};

type LookupTopicRecord = {
  id: string;
  code: string;
  name: string;
};

type CurrentAccountProfile = {
  institute?: string | null;
  institute_name?: string | null;
};

const FAMILY_INSTITUTE_CODE = process.env.PLAYWRIGHT_FAMILY_INSTITUTE_CODE?.trim() || "DLI001";
const FAMILY_ACADEMIC_YEAR_NAME = process.env.PLAYWRIGHT_FAMILY_ACADEMIC_YEAR_NAME?.trim() || "2026-2027";

async function requestBackendJson<T>(
  page: Page,
  accessToken: string,
  path: string,
  options?: {
    method?: "GET" | "POST";
    data?: Record<string, unknown>;
  },
) {
  const request = options?.method === "POST" ? page.request.post.bind(page.request) : page.request.get.bind(page.request);
  const response = await request(`${backendBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: options?.data,
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as T;
}

async function resolveAdminFamilyInstitute(page: Page, accessToken: string) {
  const payload = await requestBackendJson<{ results: LookupInstituteRecord[] }>(
    page,
    accessToken,
    "/api/v1/institutes/?page_size=100",
  );
  const match =
    payload.results.find((item) => item.code === FAMILY_INSTITUTE_CODE) ??
    payload.results.find((item) => item.name.trim() === "Demo Learning Institute");
  expect(match).toBeTruthy();
  return match!;
}

async function resolveActorInstitute(page: Page, accessToken: string) {
  const me = await requestBackendJson<CurrentAccountProfile>(page, accessToken, "/api/v1/auth/me/");
  const instituteId = me.institute?.trim() ?? "";
  expect(instituteId).not.toBe("");
  const detailResponse = await page.request.get(`${backendBaseUrl}/api/v1/institutes/${instituteId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  if (detailResponse.ok()) {
    return (await detailResponse.json()) as LookupInstituteRecord;
  }
  return {
    id: instituteId,
    code: FAMILY_INSTITUTE_CODE,
    name: me.institute_name?.trim() || "Demo Learning Institute",
  };
}

async function resolveScopedFamilyBlueprintContext(
  page: Page,
  role: "admin" | "teacher" | "institute",
  scenario: FamilyRuntimeScenario,
  accessToken: string,
) {
  const institute =
    role === "admin"
      ? await resolveAdminFamilyInstitute(page, accessToken)
      : await resolveActorInstitute(page, accessToken);

  const academicYears = await requestBackendJson<{ results: LookupAcademicYearRecord[] }>(
    page,
    accessToken,
    `/api/v1/academics/academic-years/?is_active=true&institute=${encodeURIComponent(institute.id)}`,
  );
  const academicYear =
    academicYears.results.find((item) => item.name.trim() === FAMILY_ACADEMIC_YEAR_NAME) ??
    academicYears.results[0];
  expect(academicYear).toBeTruthy();

  const programs = await requestBackendJson<{ results: LookupProgramRecord[] }>(
    page,
    accessToken,
    `/api/v1/academics/programs/?is_active=true&page_size=500&institute=${encodeURIComponent(institute.id)}`,
  );
  const program = programs.results.find((item) => item.name.trim() === scenario.programLabel);
  expect(program).toBeTruthy();

  const subjects = await requestBackendJson<{ results: LookupSubjectRecord[] }>(
    page,
    accessToken,
    `/api/v1/academics/subjects/?is_active=true&page_size=500&institute=${encodeURIComponent(institute.id)}&program=${encodeURIComponent(program!.id)}`,
  );
  const subject = subjects.results.find((item) => item.name.trim() === scenario.subjectLabel);
  expect(subject).toBeTruthy();

  const cohorts = await requestBackendJson<{ results: LookupCohortRecord[] }>(
    page,
    accessToken,
    `/api/v1/academics/cohorts/?is_active=true&institute=${encodeURIComponent(institute.id)}&academic_year=${encodeURIComponent(academicYear!.id)}&program=${encodeURIComponent(program!.id)}`,
  );
  const cohort = cohorts.results[0];
  expect(cohort).toBeTruthy();

  const topics = await requestBackendJson<{ results: LookupTopicRecord[] }>(
    page,
    accessToken,
    `/api/v1/academics/topics/?is_active=true&page_size=500&institute=${encodeURIComponent(institute.id)}&subject=${encodeURIComponent(subject!.id)}`,
  );
  const topic = topics.results[0];
  expect(topic).toBeTruthy();

  return {
    institute,
    academicYear: academicYear!,
    program: program!,
    cohort: cohort!,
    subject: subject!,
    topic: topic!,
  };
}

async function createScopedFamilyExamDirectly(
  page: Page,
  role: "admin" | "teacher" | "institute",
  scenario: FamilyRuntimeScenario,
  uniqueSeed: number,
  options?: {
    sectionCount?: number;
    questionCountPerSection?: number;
    titlePrefix?: string;
    codePrefix?: string;
  },
) {
  const presetPayload = await fetchPresetPacks(page);
  const pack = presetPayload.results.find((item) => item.id === scenario.presetId);
  expect(pack).toBeTruthy();

  const titlePrefix = options?.titlePrefix ?? "PW Family Runtime";
  const codePrefix = options?.codePrefix ?? "PWFR";
  const examTitle = `${titlePrefix} ${scenario.presetId} ${uniqueSeed}`;
  const examCode = `${codePrefix}-${scenario.presetId.slice(0, 6).toUpperCase()}-${uniqueSeed}`;
  const sectionCount = options?.sectionCount ?? 1;
  const questionCountPerSection = options?.questionCountPerSection ?? 1;
  const accessToken = await backendAccessToken(page);
  const scope = await resolveScopedFamilyBlueprintContext(page, role, scenario, accessToken);

  const sections = Array.from({ length: sectionCount }, (_, index) => ({
    name:
      pack?.builderDefaults?.sections?.[index]?.name?.trim() ||
      `Section ${String.fromCharCode(65 + index)}`,
    order: index + 1,
    question_count: questionCountPerSection,
    marks_per_question: "1.00",
    negative_marks_per_question: "0.00",
    difficulty_mix: {
      foundation: 100,
      intermediate: 0,
      advanced: 0,
    },
    topics: [
      {
        topic_code: scope.topic.code,
        count: questionCountPerSection,
      },
    ],
  }));

  const payload = {
    scope: {
      institute_code: scope.institute.code,
      academic_year_name: scope.academicYear.name,
      program_code: scope.program.code,
      cohort_code: scope.cohort.code,
      subject_code: scope.subject.code,
    },
    exam: {
      title: examTitle,
      code: examCode,
      description: `${scenario.familyLabel} direct-runtime exam`,
      preset_pack_code: scenario.presetId,
      exam_type: "test",
      delivery_mode: "online",
      status: "draft",
      duration_minutes: 60,
      passing_marks: "0.00",
      instructions: "Answer carefully.",
    },
    composition: {
      selection_mode: "subject_fallback",
      sections,
    },
    delivery: {
      timer_mode: "global",
      navigation_mode: "free_exam",
      attempt_policy: "single",
      max_attempts: 1,
      result_publish_mode: "after_review",
      review_mode: "attempted_only",
      security_mode: "normal",
      assignment_mode: "scope",
      randomize_questions: true,
      randomize_options: true,
    },
    economy: {
      policy_type: "",
      star_cost: 0,
      entitlement_code: "",
      priority: 100,
      unlock_rule: {
        rule_type: "",
        required_star_balance: null,
        required_entitlement_code: "",
        required_completion_count: null,
        required_score_percentage: null,
        priority: 100,
        admin_override_allowed: true,
      },
    },
  };

  const created = await requestBackendJson<{ data: { id: string } }>(
    page,
    accessToken,
    "/api/v1/exams/advanced-builder/create/",
    {
      method: "POST",
      data: payload,
    },
  );

  expect(created.data.id).toBeTruthy();

  return {
    examId: created.data.id,
    examTitle,
    pack: pack!,
  };
}

export async function resolveStudentAttemptTarget(
  page: Page,
  credentials: DirectLoginCredentials,
): Promise<StudentAttemptTarget> {
  const cacheKey = credentials.username.trim().toLowerCase();
  const cachedTarget = studentAttemptTargetCache.get(cacheKey);
  if (cachedTarget) {
    return cachedTarget;
  }

  let accessToken = "";
  let loginFailure = "login did not run";

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const loginResponse = await page.request.post(`${backendBaseUrl}/api/v1/auth/login/`, {
      data: {
        username: credentials.username,
        password: credentials.password,
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    if (loginResponse.ok()) {
      const loginPayload = (await loginResponse.json()) as {
        access?: string;
      };
      accessToken = loginPayload.access?.trim() ?? "";
      if (accessToken) {
        break;
      }
      loginFailure = `attempt ${attempt}: login succeeded without access token`;
    } else {
      const snippet = await responseSnippet(loginResponse);
      loginFailure = `attempt ${attempt}: ${loginResponse.status()} ${snippet}`;
      const throttleWaitMs = throttleBackoffMs(snippet);
      if (attempt < 5) {
        await page.waitForTimeout(throttleWaitMs ?? 750 * attempt);
        continue;
      }
    }

    if (attempt < 5) {
      await page.waitForTimeout(750 * attempt);
    }
  }

  expect(accessToken, `Unable to resolve student access token for ${credentials.username}. ${loginFailure}`).not.toBe("");

  let payload: {
    display_name?: string;
    student_profile?: string | null;
  } | null = null;
  let profileFailure = "profile lookup did not run";

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    if (response.ok()) {
      payload = (await response.json()) as {
        display_name?: string;
        student_profile?: string | null;
      };
      break;
    }

    const snippet = await responseSnippet(response);
    profileFailure = `attempt ${attempt}: ${response.status()} ${snippet}`;
    if (attempt < 5) {
      await page.waitForTimeout(throttleBackoffMs(snippet) ?? 750 * attempt);
    }
  }

  expect(payload, `Unable to resolve student profile for ${credentials.username}. ${profileFailure}`).not.toBeNull();

  const displayName = payload!.display_name?.trim() ?? "";
  const studentProfileId = payload!.student_profile?.trim() ?? "";
  expect(displayName).not.toBe("");
  expect(studentProfileId).not.toBe("");

  const target = { displayName, studentProfileId };
  studentAttemptTargetCache.set(cacheKey, target);
  return target;
}

export async function deleteInstituteExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function normalizeBuilderCompositionForCreate(
  page: Page,
  options?: {
    sectionCount?: number;
    questionCountPerSection?: number;
  },
) {
  const targetSectionCount = options?.sectionCount ?? 1;
  const questionCountPerSection = options?.questionCountPerSection ?? 1;

  await page.getByRole("tab", { name: /\bcomposition\b/i }).first().click();
  await page.getByLabel(/selection mode/i).selectOption("subject_fallback");

  const sectionCards = page.locator(".advancedBuilderSectionCard");
  for (let index = await sectionCards.count() - 1; index >= targetSectionCount; index -= 1) {
    await sectionCards
      .nth(index)
      .locator(".advancedBuilderSectionCardTop")
      .getByRole("button", { name: /^remove$/i })
      .click();
  }

  const keptSectionCount = await sectionCards.count();
  for (let index = 0; index < keptSectionCount; index += 1) {
    const sectionCard = sectionCards.nth(index);
    await sectionCard.getByLabel(/question count/i).fill(String(questionCountPerSection));
    await sectionCard
      .locator(".advancedBuilderDifficultyRow")
      .getByLabel(/foundation/i)
      .fill("100");
    await sectionCard
      .locator(".advancedBuilderDifficultyRow")
      .getByLabel(/intermediate/i)
      .fill("0");
    await sectionCard
      .locator(".advancedBuilderDifficultyRow")
      .getByLabel(/advanced/i)
      .fill("0");

    const topicRows = sectionCard.locator(".advancedBuilderTopicRow");
    for (let topicIndex = await topicRows.count() - 1; topicIndex >= 1; topicIndex -= 1) {
      await topicRows.nth(topicIndex).getByRole("button", { name: /^remove$/i }).click();
    }

    await sectionCard
      .locator(".advancedBuilderTopicRow")
      .first()
      .locator('input[type="number"]')
      .fill(String(questionCountPerSection));

    const topicSelect = sectionCard.locator(".advancedBuilderTopicRow").first().locator("select");
    const currentValue = await topicSelect.inputValue();
    if (!currentValue) {
      const fallbackValue = await topicSelect.evaluate((element) => {
        const select = element as HTMLSelectElement;
        const option = Array.from(select.options).find((candidate) => candidate.value.trim() !== "");
        return option?.value ?? "";
      });
      if (fallbackValue) {
        await topicSelect.selectOption(fallbackValue);
      }
    }
  }
}

async function alignInstituteScopeWithPresetFamily(
  page: Page,
  pack: ExamPresetPackPayload,
  programLabel: string,
  subjectLabel: string,
) {
  const academicYearSelect = page
    .locator(".advancedBuilderField", { has: page.getByText(/^Academic year$/i) })
    .locator("select");
  const programSelect = page
    .locator(".advancedBuilderField", { has: page.getByText(/^Program$/i) })
    .locator("select");
  const subjectSelect = page
    .locator(".advancedBuilderField", { has: page.getByText(/^(Primary subject|Subject)$/i) })
    .locator("select");

  await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
  const hasCanonicalFamilyAcademicYear = await academicYearSelect.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).some((option) => option.label.trim() === "2026-2027");
  });
  if (hasCanonicalFamilyAcademicYear) {
    await academicYearSelect.selectOption({ label: "2026-2027" });
    await expect(academicYearSelect).toHaveValue(/\S+/);
  }
  await programSelect.selectOption({ label: programLabel });
  await expect(programSelect).toHaveValue(/\S+/);
  await expect
    .poll(
      async () =>
        subjectSelect.evaluate(
          (element, label) =>
            Array.from((element as HTMLSelectElement).options).some(
              (option) => option.label.trim() === String(label).trim(),
            ),
          subjectLabel,
        ),
      { timeout: 15000 },
    )
    .toBe(true);
  await subjectSelect.selectOption({ label: subjectLabel });
  await expect(subjectSelect).toHaveValue(/\S+/);

  const familyHint = page.getByText(new RegExp(`Assessment family:\\s*${pack.programFamilyCode}`, "i")).first();
  await familyHint.isVisible().catch(() => false);

  await page.getByRole("button", { name: new RegExp(pack.label, "i") }).click();
  await expect(page.getByText(new RegExp(`active pack:\\s*${escapeRegExp(pack.label)}`, "i"))).toBeVisible();
}

async function alignAdminScopeWithPresetFamily(
  page: Page,
  pack: ExamPresetPackPayload,
  programLabel: string,
  subjectLabel: string,
) {
  await page.getByLabel(/select template institute/i).selectOption("Demo Learning Institute (DLI001)");
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page.getByText(/Demo Learning Institute template scope/i)).toBeVisible();

  await alignInstituteScopeWithPresetFamily(page, pack, programLabel, subjectLabel);
}

async function createScopedFamilyExam(
  page: Page,
  role: "admin" | "teacher" | "institute",
  scenario: FamilyRuntimeScenario,
  uniqueSeed: number,
  options?: {
    sectionCount?: number;
    questionCountPerSection?: number;
    titlePrefix?: string;
    codePrefix?: string;
  },
) {
  if (role === "institute") {
    await loginAsFamilyInstitute(page);
  } else {
    await loginAsRole(page, role);
  }
  if (role === "admin") {
    await expectAdminWorkspace(page);
  } else if (role === "teacher") {
    await expectTeacherWorkspace(page);
  } else {
    await expectInstituteWorkspace(page);
  }

  const presetPayload = await fetchPresetPacks(page);
  const pack = presetPayload.results.find((item) => item.id === scenario.presetId);
  expect(pack).toBeTruthy();

  const titlePrefix = options?.titlePrefix ?? "PW Family Runtime";
  const codePrefix = options?.codePrefix ?? "PWFR";
  const examTitle = `${titlePrefix} ${scenario.presetId} ${uniqueSeed}`;
  const examCode = `${codePrefix}-${scenario.presetId.slice(0, 6).toUpperCase()}-${uniqueSeed}`;

  await page.goto(`/${role}/exams/advanced?preset_pack=${encodeURIComponent(scenario.presetId)}`);
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

  if (role === "admin") {
    await alignAdminScopeWithPresetFamily(page, pack!, scenario.programLabel, scenario.subjectLabel);
  } else {
    await alignInstituteScopeWithPresetFamily(page, pack!, scenario.programLabel, scenario.subjectLabel);
  }

  await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
  await page.getByLabel(/exam title/i).fill(examTitle);
  await page.getByLabel(/exam code/i).fill(examCode);

  await normalizeBuilderCompositionForCreate(page, options);

  const previewResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/exams/advanced-builder/preview") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /preview exam/i }).click();
  const previewResponse = await previewResponsePromise;
  expect(previewResponse.ok(), await previewResponse.text()).toBe(true);

  await expect(page.getByText(/preview refreshed\./i)).toBeVisible({ timeout: 60000 });

  await page.getByRole("button", { name: /create advanced exam/i }).click();
  await expect(page).toHaveURL(new RegExp(`\\/${role}\\/exams\\/.+\\/builder\\?message=`), { timeout: 60000 });

  const examId = page.url().match(new RegExp(`\\/${role}\\/exams\\/([^/?#]+)\\/builder`))?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
    pack: pack!,
  };
}

export async function createInstituteFamilyExam(
  page: Page,
  scenario: FamilyRuntimeScenario,
  uniqueSeed: number,
  options?: {
    sectionCount?: number;
    questionCountPerSection?: number;
    titlePrefix?: string;
    codePrefix?: string;
  },
) {
  return createScopedFamilyExam(page, "institute", scenario, uniqueSeed, options);
}

export async function createTeacherFamilyExam(
  page: Page,
  scenario: FamilyRuntimeScenario,
  uniqueSeed: number,
  options?: {
    sectionCount?: number;
    questionCountPerSection?: number;
    titlePrefix?: string;
    codePrefix?: string;
  },
) {
  return createScopedFamilyExam(page, "teacher", scenario, uniqueSeed, options);
}

export async function createAdminFamilyExam(
  page: Page,
  scenario: FamilyRuntimeScenario,
  uniqueSeed: number,
  options?: {
    sectionCount?: number;
    questionCountPerSection?: number;
    titlePrefix?: string;
    codePrefix?: string;
  },
) {
  return createScopedFamilyExam(page, "admin", scenario, uniqueSeed, options);
}

export async function createInstituteFamilyExamDirectly(
  page: Page,
  scenario: FamilyRuntimeScenario,
  uniqueSeed: number,
  options?: {
    sectionCount?: number;
    questionCountPerSection?: number;
    titlePrefix?: string;
    codePrefix?: string;
  },
) {
  return createScopedFamilyExamDirectly(page, "institute", scenario, uniqueSeed, options);
}

export async function createTeacherFamilyExamDirectly(
  page: Page,
  scenario: FamilyRuntimeScenario,
  uniqueSeed: number,
  options?: {
    sectionCount?: number;
    questionCountPerSection?: number;
    titlePrefix?: string;
    codePrefix?: string;
  },
) {
  return createScopedFamilyExamDirectly(page, "teacher", scenario, uniqueSeed, options);
}

export async function createAdminFamilyExamDirectly(
  page: Page,
  scenario: FamilyRuntimeScenario,
  uniqueSeed: number,
  options?: {
    sectionCount?: number;
    questionCountPerSection?: number;
    titlePrefix?: string;
    codePrefix?: string;
  },
) {
  return createScopedFamilyExamDirectly(page, "admin", scenario, uniqueSeed, options);
}

export async function assignStudentToExam(page: Page, examId: string, studentProfileId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/assign-students/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      assignment_mode: "selected_students",
      student_ids: [studentProfileId],
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

export async function clearExamEconomyAccessPolicy(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/economy-access-policy/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      policy_type: "",
      star_cost: 0,
      entitlement_code: "",
      priority: 100,
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

export async function scheduleAndPublishExam(page: Page, examId: string) {
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000);
  const endAt = new Date(now.getTime() + 90 * 60 * 1000);

  const accessToken = await backendAccessToken(page);
  const updateResponse = await page.request.patch(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      passing_marks: "0.00",
    },
    timeout: 15000,
  });
  expect(updateResponse.ok()).toBe(true);

  const syncResponse = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/sync-marks/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {},
    timeout: 15000,
  });
  expect(syncResponse.ok()).toBe(true);

  const publishResponse = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/publish/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {},
    timeout: 15000,
  });
  expect(publishResponse.ok()).toBe(true);

  const liveResponse = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/mark-live/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {},
    timeout: 15000,
  });
  expect(liveResponse.ok()).toBe(true);
}

export async function reopenExamWindow(
  page: Page,
  examId: string,
  options?: {
    maxAttempts?: number;
  },
) {
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000);
  const endAt = new Date(now.getTime() + 90 * 60 * 1000);

  const accessToken = await backendAccessToken(page);
  const updateResponse = await page.request.patch(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      passing_marks: "0.00",
      ...(options?.maxAttempts ? { max_attempts: options.maxAttempts } : {}),
    },
    timeout: 15000,
  });
  expect(updateResponse.ok(), await updateResponse.text()).toBe(true);
}

export async function markExamCompleted(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/mark-completed/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      remarks: "Playwright family runtime completion gate",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

export async function publishExamResultsWorkflow(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);

  const generateResponse = await page.request.post(`${backendBaseUrl}/api/v1/results/generate-for-exam/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      exam: examId,
    },
    timeout: 15000,
  });
  expect(generateResponse.ok()).toBe(true);

  const rankResponse = await page.request.post(`${backendBaseUrl}/api/v1/results/calculate-ranks/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      exam: examId,
    },
    timeout: 15000,
  });
  expect(rankResponse.ok()).toBe(true);

  const publishResponse = await page.request.post(`${backendBaseUrl}/api/v1/results/publish-exam-results/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      exam: examId,
    },
    timeout: 15000,
  });
  expect(publishResponse.ok()).toBe(true);
}

export async function calculateExamRanks(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const rankResponse = await page.request.post(`${backendBaseUrl}/api/v1/results/calculate-ranks/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      exam: examId,
    },
    timeout: 15000,
  });
  expect(rankResponse.ok()).toBe(true);
}

export async function startExamAttemptAsStudent(
  page: Page,
  examId: string,
  examTitle: string,
  familyLabel: string,
  credentials: DirectLoginCredentials,
) {
  await loginWithCredentials(page, credentials, "student");
  await expectStudentWorkspace(page);

  await page.goto(`/app/exams/${examId}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();

  const experiencePanel = page.locator('[aria-label="Exam experience profile"]').first();
  await expect(experiencePanel).toBeVisible();
  await expect(experiencePanel.getByText(new RegExp(familyLabel, "i")).first()).toBeVisible();

  const startButton = page.getByRole("button", { name: /^start$/i });
  await expect(startButton).toBeVisible();
  await startButton.click();

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/, { timeout: 30000 });
  await expect(page.getByText(/mock in progress|test in progress|attempt locked|fullscreen required to continue/i).first()).toBeVisible({
    timeout: 30000,
  });

  const enterFullscreenButtons = page.getByRole("button", { name: /^enter fullscreen$/i });
  if (await enterFullscreenButtons.first().isVisible().catch(() => false)) {
    await enterFullscreenButtons.first().click().catch(() => null);
    if (await enterFullscreenButtons.first().isVisible().catch(() => false)) {
      await enterFullscreenButtons.first().click().catch(() => null);
    }
  }

  const attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
  expect(attemptId).not.toBeNull();
  return attemptId!;
}

export async function answerAndSubmitCurrentAttempt(
  page: Page,
  uniqueSeed: number,
  prefix: string,
  examTitle: string,
) {
  await answerCurrentAttemptQuestion(page, uniqueSeed, prefix);

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^submit test$/i }).click();

  await expect(page).toHaveURL(
    /\/app\/attempts\/[^/?#]+(?:\/summary|\?question=[^#]+)(?:\?.*)?$/,
    { timeout: 30000 },
  );
  const summaryHeading = page.getByRole("heading", {
    name: new RegExp(`${escapeRegExp(examTitle)}\\s+Summary`, "i"),
  }).first();
  const postSubmitMarker = page.getByText(/post-submit state/i).first();
  if (await summaryHeading.isVisible().catch(() => false)) {
    await expect(summaryHeading).toBeVisible({ timeout: 30000 });
  } else {
    await expect(postSubmitMarker).toBeVisible({ timeout: 30000 });
  }
  await expect(page.getByText(/submitted|attempt auto-submitted/i).first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText(/post-submit state/i).first()).toBeVisible({
    timeout: 30000,
  });
}
