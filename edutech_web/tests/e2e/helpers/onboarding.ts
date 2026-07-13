import { expect, type Locator, type Page } from "@playwright/test";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

export type CreatedInstitute = {
  id: string;
  name: string;
  code: string;
};

export type TopicRecord = {
  id: string;
  name: string;
  code: string;
  parent_topic: string | null;
};

export type AdminQuestionEntitlement = {
  id: string;
  institute_code?: string;
  question_bank_package_code?: string;
  status?: string;
};

export type AdminFeatureEntitlement = {
  id: string;
  institute_code?: string;
  feature_code?: string;
  status?: string;
  source_package_code?: string | null;
};

export type AcademicProgram = {
  id: string;
  name: string;
  code: string;
};

export type AcademicSubject = {
  id: string;
  name: string;
  code: string;
  program?: string | null;
};

export function uniqueOnboardingSeed() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export async function createDisposableInstitute(
  page: Page,
  {
    name,
    code,
    description = "Disposable onboarding test institute.",
  }: {
    name: string;
    code: string;
    description?: string;
  },
): Promise<CreatedInstitute> {
  const response = await page.request.post("/api/admin/institutes", {
    data: {
      name,
      code,
      email: `${code.toLowerCase()}@example.test`,
      phone: `91${String(Date.now()).slice(-8)}`,
      website: `https://${code.toLowerCase()}.example.test`,
      description,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as CreatedInstitute;
}

export async function deleteDisposableInstitute(page: Page, instituteId: string | null) {
  if (!instituteId) {
    return;
  }
  try {
    await page.request.delete(`/api/admin/institutes/${instituteId}`, { timeout: 5000 });
  } catch {
    // Best-effort cleanup only for mutable onboarding lanes.
  }
}

export async function fetchRecords<T>(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { results?: T[] } | T[];
  return Array.isArray(payload) ? payload : (payload.results ?? []);
}

export async function getAdminAccessToken(page: Page) {
  const token =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(token).toBeTruthy();
  return token;
}

export async function fetchBackendRecords<T>(page: Page, accessToken: string, path: string) {
  const response = await page.request.get(`${backendBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { results?: T[] } | T[];
  return Array.isArray(payload) ? payload : (payload.results ?? []);
}

export async function fetchInstituteByCode(page: Page, accessToken: string, instituteCode: string) {
  const payload = await fetchBackendRecords<CreatedInstitute>(
    page,
    accessToken,
    `/api/v1/institutes/?search=${encodeURIComponent(instituteCode)}`,
  );
  const institute = payload.find((row) => row.code === instituteCode);
  expect(institute).toBeTruthy();
  return institute!;
}

export async function fetchInstituteOnboardingRuns(page: Page, accessToken: string, instituteId: string) {
  return fetchBackendRecords(page, accessToken, `/api/v1/institutes/${instituteId}/onboarding-runs/`);
}

export async function fetchInstituteOnboardingRunDetail(
  page: Page,
  accessToken: string,
  instituteId: string,
  runId: string,
) {
  const response = await page.request.get(`${backendBaseUrl}/api/v1/institutes/${instituteId}/onboarding-runs/${runId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

export async function fetchInstituteOnboardingTasks(
  page: Page,
  accessToken: string,
  instituteId: string,
  runId: string,
) {
  return fetchBackendRecords(page, accessToken, `/api/v1/institutes/${instituteId}/onboarding-runs/${runId}/tasks/`);
}

export async function countPrograms(page: Page, instituteId: string) {
  return (
    await fetchRecords(page, `/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=50`)
  ).length;
}

export async function countSubjects(page: Page, instituteId: string) {
  return (
    await fetchRecords(page, `/api/admin/academics/subjects?institute=${encodeURIComponent(instituteId)}&page_size=200`)
  ).length;
}

export async function countTopics(page: Page, instituteId: string) {
  return (
    await fetchRecords(page, `/api/admin/academics/topics?institute=${encodeURIComponent(instituteId)}&page_size=400`)
  ).length;
}

export async function fetchPrograms(page: Page, instituteId: string) {
  return (await fetchRecords<AcademicProgram>(
    page,
    `/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=50`,
  )) as AcademicProgram[];
}

export async function fetchSubjects(page: Page, instituteId: string) {
  return (await fetchRecords<AcademicSubject>(
    page,
    `/api/admin/academics/subjects?institute=${encodeURIComponent(instituteId)}&page_size=200`,
  )) as AcademicSubject[];
}

export async function fetchTopics(page: Page, instituteId: string, subjectId: string) {
  return (await fetchRecords<TopicRecord>(
    page,
    `/api/admin/academics/topics?institute=${encodeURIComponent(instituteId)}&subject=${encodeURIComponent(subjectId)}&page_size=200`,
  )) as TopicRecord[];
}

export async function fetchQuestionBankPackages(page: Page) {
  const response = await page.request.get("/api/admin/economy/question-bank-packages");
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as Array<{
    id: string;
    code: string;
    ownership_type?: string;
    is_active?: boolean;
  }>;
}

export async function fetchQuestionEntitlements(page: Page, accessToken: string) {
  return fetchBackendRecords<AdminQuestionEntitlement>(
    page,
    accessToken,
    "/api/v1/economy/admin/question-bank-entitlements/",
  );
}

export async function fetchFeatureEntitlements(page: Page, accessToken: string) {
  return fetchBackendRecords<AdminFeatureEntitlement>(
    page,
    accessToken,
    "/api/v1/economy/admin/question-bank-feature-entitlements/",
  );
}

export async function expectAcademicCounts(
  page: Page,
  instituteId: string,
  expected: { programs?: number; subjects?: number; topics?: number },
) {
  if (typeof expected.programs === "number") {
    await expect.poll(async () => countPrograms(page, instituteId)).toBe(expected.programs);
  }
  if (typeof expected.subjects === "number") {
    await expect.poll(async () => countSubjects(page, instituteId)).toBe(expected.subjects);
  }
  if (typeof expected.topics === "number") {
    await expect.poll(async () => countTopics(page, instituteId)).toBe(expected.topics);
  }
}

export async function selectFirstNonEmptyOption(locator: Locator) {
  const optionValue = await locator.locator("option").evaluateAll((options) => {
    const match = options.find((option) => (option as HTMLOptionElement).value.trim().length > 0);
    return match ? (match as HTMLOptionElement).value : "";
  });
  expect(optionValue).toBeTruthy();
  await locator.selectOption(optionValue);
  return optionValue;
}
