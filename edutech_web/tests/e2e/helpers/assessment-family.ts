import { expect, type APIResponse, type Page } from "@playwright/test";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

export type AssessmentFamilyProfile = {
  code: string;
  label: string;
  allowed_question_types: string[];
  scoring_defaults: {
    negative_marking_default?: boolean;
    negative_marking_scope?: string | null;
    recommended_attempt_policy?: string | null;
    strategy?: string | null;
    supports_numeric_entry?: boolean;
    supports_partial_scoring?: boolean;
  };
};

export type AssessmentRegistryResponse = {
  assessment_families: AssessmentFamilyProfile[];
  question_types: Array<{ code: string; label?: string }>;
  response_modes: Array<{ code: string }>;
  evaluation_modes: Array<{ code: string }>;
};

export type ProgramRegistryRecord = {
  id: string;
  name: string;
  code: string;
  assessment_family_profile?: AssessmentFamilyProfile | null;
};

export type SubjectRegistryRecord = {
  id: string;
  name: string;
  code: string;
  program: string;
};

export type TopicRegistryRecord = {
  id: string;
  name: string;
  code: string;
  subject: string;
};

export type AuthProfileRecord = {
  institute: string | null;
  teacher_profile: string | null;
};

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function parseJsonResponse<T>(response: APIResponse) {
  expect(response.ok(), `Expected ${response.url()} to succeed`).toBe(true);
  return (await response.json()) as T;
}

export async function fetchAssessmentRegistry(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/question-bank/questions/assessment-registry/?available_only=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  return parseJsonResponse<AssessmentRegistryResponse>(response);
}

export async function fetchPrograms(page: Page, instituteId?: string | null) {
  const accessToken = await backendAccessToken(page);
  const query = new URLSearchParams({
    is_active: "true",
    page_size: "500",
  });
  if (instituteId) {
    query.set("institute", instituteId);
  }
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/academics/programs/?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  const payload = await parseJsonResponse<{ results: ProgramRegistryRecord[] }>(response);
  return payload.results;
}

export async function fetchSubjects(page: Page, programId: string, instituteId?: string | null) {
  const accessToken = await backendAccessToken(page);
  const query = new URLSearchParams({
    is_active: "true",
    page_size: "500",
    program: programId,
  });
  if (instituteId) {
    query.set("institute", instituteId);
  }
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/academics/subjects/?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  const payload = await parseJsonResponse<{ results: SubjectRegistryRecord[] }>(response);
  return payload.results;
}

export async function fetchTopics(page: Page, subjectId: string, instituteId?: string | null) {
  const accessToken = await backendAccessToken(page);
  const query = new URLSearchParams({
    is_active: "true",
    page_size: "500",
    subject: subjectId,
  });
  if (instituteId) {
    query.set("institute", instituteId);
  }
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/academics/topics/?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  const payload = await parseJsonResponse<{ results: TopicRegistryRecord[] }>(response);
  return payload.results;
}

export async function fetchAuthProfile(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  return parseJsonResponse<AuthProfileRecord>(response);
}

export function expectAssessmentRegistryContracts(registry: AssessmentRegistryResponse) {
  const competitive = registry.assessment_families.find((item) => item.code === "competitive");
  const certification = registry.assessment_families.find((item) => item.code === "certification");
  const languageProficiency = registry.assessment_families.find((item) => item.code === "language_proficiency");

  expect(competitive).toBeTruthy();
  expect(certification).toBeTruthy();
  expect(languageProficiency).toBeTruthy();
  expect(competitive?.allowed_question_types ?? []).toContain("mcq_single");
  expect(competitive?.allowed_question_types ?? []).toContain("matrix_match");
  expect(competitive?.scoring_defaults?.negative_marking_default).toBe(true);
  expect(competitive?.scoring_defaults?.negative_marking_scope).toBe("objective_only");
  expect(certification?.allowed_question_types ?? []).toContain("short_answer");
  expect(certification?.scoring_defaults?.negative_marking_default).toBe(false);
  expect(certification?.scoring_defaults?.negative_marking_scope).toBe("disabled");
  expect(languageProficiency?.allowed_question_types ?? []).toContain("short_answer");
  expect(languageProficiency?.allowed_question_types ?? []).toContain("essay_manual_review");
  expect(languageProficiency?.allowed_question_types ?? []).not.toContain("numeric_answer");
  expect(languageProficiency?.scoring_defaults?.negative_marking_default).toBe(false);
  expect(languageProficiency?.scoring_defaults?.negative_marking_scope).toBe("disabled");
  expect(languageProficiency?.scoring_defaults?.recommended_attempt_policy).toBe("single");
  expect(languageProficiency?.scoring_defaults?.strategy).toBe("band_score");
  expect(registry.response_modes.some((item) => item.code === "single_choice")).toBe(true);
  expect(registry.evaluation_modes.some((item) => item.code === "auto_option_match")).toBe(true);
}

export function expectPreviewFamilyContract(
  previewPayload: {
    resolved_exam?: {
      assessment_family_profile?: AssessmentFamilyProfile | null;
    };
    sections?: Array<{
      family_contract?: {
        assessment_family_code?: string | null;
        negative_marking_scope?: string | null;
        negative_marking_recommended?: boolean;
        negative_marking_allowed?: boolean;
      };
    }>;
  },
  programFamilyProfile?: AssessmentFamilyProfile | null,
) {
  const firstSection = previewPayload.sections?.[0];
  expect(firstSection).toBeTruthy();
  expect(firstSection?.family_contract).toBeTruthy();

  if (!programFamilyProfile) {
    expect(previewPayload.resolved_exam?.assessment_family_profile ?? null).toBeNull();
    expect(firstSection?.family_contract?.assessment_family_code ?? null).toBeNull();
    return;
  }

  expect(previewPayload.resolved_exam?.assessment_family_profile?.code).toBe(programFamilyProfile.code);
  expect(firstSection?.family_contract?.assessment_family_code).toBe(programFamilyProfile.code);
  expect(firstSection?.family_contract?.negative_marking_scope).toBe(
    programFamilyProfile.scoring_defaults?.negative_marking_scope ?? null,
  );
  expect(firstSection?.family_contract?.negative_marking_recommended).toBe(
    Boolean(programFamilyProfile.scoring_defaults?.negative_marking_default),
  );
  expect(firstSection?.family_contract?.negative_marking_allowed).toBe(
    (programFamilyProfile.scoring_defaults?.negative_marking_scope ?? "disabled") !== "disabled",
  );
}
