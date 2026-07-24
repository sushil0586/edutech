import { expect, test, type Page } from "@playwright/test";
import type {
  StudentAvailableExam,
  StudentExamDetail,
  StudentExamExperienceProfile,
  StudentResult,
} from "@/features/dashboard/types";
import { loginWithCredentials, type DirectLoginCredentials } from "./auth";
import { expectStudentWorkspace } from "./navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type StudentAvailableExamRecord = {
  id: string;
  title: string;
  experience_profile: StudentExamExperienceProfile;
};

type StudentExamDetailRecord = {
  id: string;
  title: string;
  experience_profile: StudentExamExperienceProfile;
};

type FamilyFixtureLookupOptions = {
  familyLabel: string;
  examCode: string;
  expectedTitle?: string;
};

type TeacherExamLookupRecord = {
  id: string;
  code: string;
  title: string;
};

type LoginEnvelope = {
  access?: string;
};

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function requestAccessToken(
  page: Page,
  credentials: DirectLoginCredentials,
) {
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
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as LoginEnvelope;
  const accessToken = payload.access?.trim() ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchTeacherFamilyExamByCode(
  page: Page,
  examCode: string,
) {
  const teacherCredentials: DirectLoginCredentials = {
    username: process.env.PLAYWRIGHT_TEACHER_USERNAME ?? "demo-teacher",
    password: process.env.PLAYWRIGHT_TEACHER_PASSWORD ?? "Demo@12345",
  };
  const accessToken = await requestAccessToken(page, teacherCredentials);
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/teacher/exams/?search=${encodeURIComponent(examCode)}&page_size=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as {
    results?: TeacherExamLookupRecord[];
  };
  return {
    accessToken,
    exam: payload.results?.find((candidate) => candidate.code === examCode) ?? null,
  };
}

async function reopenTeacherExamWindowWithAccessToken(
  page: Page,
  accessToken: string,
  examId: string,
  maxAttempts = 50,
) {
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000);
  const endAt = new Date(now.getTime() + 90 * 60 * 1000);
  const basePayload = {
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    passing_marks: "0.00",
  };

  const firstResponse = await page.request.patch(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      ...basePayload,
      max_attempts: maxAttempts,
    },
    timeout: 15000,
  });

  if (firstResponse.ok()) {
    return;
  }

  const firstErrorText = await firstResponse.text();
  if (!/Unlimited practice uses policy instead of raising max attempts/i.test(firstErrorText)) {
    expect(firstResponse.ok(), firstErrorText).toBe(true);
    return;
  }

  const fallbackResponse = await page.request.patch(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: basePayload,
    timeout: 15000,
  });
  expect(fallbackResponse.ok(), await fallbackResponse.text()).toBe(true);
}

export async function fetchStudentAvailableExamsForFamily(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentAvailableExamRecord[];
}

export async function fetchStudentExamDetailForFamily(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/${examId}/detail/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentExamDetailRecord;
}

export async function fetchStudentAvailableExamsCatalog(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentAvailableExam[];
}

export async function fetchStudentExamDetailCatalog(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/${examId}/detail/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentExamDetail;
}

export async function fetchStudentResultsCatalog(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/results/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentResult[];
}

export async function resolveStudentFamilyExamOrSkip(
  page: Page,
  options: FamilyFixtureLookupOptions,
) {
  const exams = await fetchStudentAvailableExamsCatalog(page);
  const exam = exams.find((candidate) => candidate.code === options.examCode) ?? null;

  if (!exam) {
    const visibleCodes = exams
      .slice(0, 8)
      .map((candidate) => candidate.code || candidate.title)
      .filter(Boolean)
      .join(", ");

    test.skip(
      true,
      `Seeded ${options.familyLabel} exam fixture ${options.examCode} is not available on Sunday, July 19, 2026. Visible seeded entries: ${visibleCodes || "none"}.`,
    );
    return null;
  }

  if (options.expectedTitle) {
    expect(exam.title).toBe(options.expectedTitle);
  }

  return exam;
}

export async function resolveStudentFamilyResultOrSkip(
  page: Page,
  options: {
    familyLabel: string;
    resultExamCode: string;
  },
) {
  const results = await fetchStudentResultsCatalog(page);
  const result = results.find((candidate) => candidate.exam_code === options.resultExamCode) ?? null;

  if (!result) {
    const visibleCodes = results
      .slice(0, 8)
      .map((candidate) => candidate.exam_code || candidate.exam_title)
      .filter(Boolean)
      .join(", ");

    test.skip(
      true,
      `Seeded ${options.familyLabel} result fixture ${options.resultExamCode} is not available on Sunday, July 19, 2026. Visible seeded result entries: ${visibleCodes || "none"}.`,
    );
    return null;
  }

  return result;
}

export async function resolveTeacherFamilyExamOrSkip(
  page: Page,
  options: FamilyFixtureLookupOptions,
) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/teacher/exams/?search=${encodeURIComponent(options.examCode)}&page_size=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  expect(response.ok()).toBe(true);

  const payload = (await response.json()) as {
    results?: TeacherExamLookupRecord[];
  };
  const exam = payload.results?.find((candidate) => candidate.code === options.examCode) ?? null;

  if (!exam) {
    const visibleCodes = (payload.results ?? [])
      .slice(0, 8)
      .map((candidate) => candidate.code || candidate.title)
      .filter(Boolean)
      .join(", ");

    test.skip(
      true,
      `Seeded ${options.familyLabel} teacher exam fixture ${options.examCode} is not available on Sunday, July 19, 2026. Visible teacher entries: ${visibleCodes || "none"}.`,
    );
    return null;
  }

  if (options.expectedTitle) {
    expect(exam.title).toBe(options.expectedTitle);
  }

  return exam;
}

export async function openStudentPrimaryActionOrSkip(page: Page) {
  const primaryActionRegion = page.locator("article").filter({
    has: page.getByText(/primary action/i),
  }).first();
  await expect(primaryActionRegion).toBeVisible();

  const reviewLink = primaryActionRegion.getByRole("link", { name: /open answer review|open review/i }).first();
  if (await reviewLink.isVisible().catch(() => false)) {
    await reviewLink.click();
    return "review" as const;
  }

  const summaryLink = primaryActionRegion.getByRole("link", { name: /open attempt summary|open summary/i }).first();
  if (await summaryLink.isVisible().catch(() => false)) {
    await summaryLink.click();
    return "summary" as const;
  }

  const resumeLink = primaryActionRegion.getByRole("link", { name: /resume .*/i }).first();
  if (await resumeLink.isVisible().catch(() => false)) {
    await resumeLink.click();
    return "resume" as const;
  }

  const startButton = primaryActionRegion.getByRole("button", { name: /^(start|start .*?)$/i }).first();
  if (await startButton.isVisible().catch(() => false)) {
    await startButton.click();
    return "start" as const;
  }

  test.skip(
    true,
    "Student primary-action area does not currently expose a start, resume, summary, or review handoff in this environment.",
  );
  return null;
}

export async function loginStudentFamilyAccountOrSkip(
  page: Page,
  credentials: DirectLoginCredentials,
  familyLabel: string,
) {
  try {
    await loginWithCredentials(page, credentials, "student");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/invalid credentials/i.test(message)) {
      test.skip(true, `Seeded ${familyLabel} student credentials are not available in this environment.`);
      return;
    }
    throw error;
  }

  await expectStudentWorkspace(page);
}

export type StudentFamilyFixtureScenario = {
  label: string;
  credentials: DirectLoginCredentials;
  examCode: string;
  expectedTitle?: string;
  resultExamCode?: string;
  requiresLaunchableAction?: boolean;
  requiresPublishedResult?: boolean;
  requiresReviewReadyResult?: boolean;
  preflightOptional?: boolean;
  applyTeacherReopenBeforeLaunchCheck?: boolean;
};

export const studentFamilyFixtureScenarios: StudentFamilyFixtureScenario[] = [
  {
    label: "NEET full mock",
    credentials: {
      username: process.env.PLAYWRIGHT_NEET_STUDENT_USERNAME ?? "demo-neet-student",
      password: process.env.PLAYWRIGHT_NEET_STUDENT_PASSWORD ?? "Demo@12345",
    },
    examCode: "DMO-NEET-FULL-01",
    requiresLaunchableAction: true,
    applyTeacherReopenBeforeLaunchCheck: true,
  },
  {
    label: "JEE full mock",
    credentials: {
      username: process.env.PLAYWRIGHT_JEE_STUDENT_USERNAME ?? "demo-jee-student",
      password: process.env.PLAYWRIGHT_JEE_STUDENT_PASSWORD ?? "Demo@12345",
    },
    examCode: "DMO-JEE-FULL-01",
    requiresLaunchableAction: true,
    applyTeacherReopenBeforeLaunchCheck: true,
  },
  {
    label: "GRE quant",
    credentials: {
      username: process.env.PLAYWRIGHT_GRE_STUDENT_USERNAME ?? "demo-gre-student",
      password: process.env.PLAYWRIGHT_GRE_STUDENT_PASSWORD ?? "Demo@12345",
    },
    examCode: "DMO-GRE-QUANT-01",
    requiresLaunchableAction: true,
    preflightOptional: true,
    applyTeacherReopenBeforeLaunchCheck: true,
  },
  {
    label: "AWS practice",
    credentials: {
      username: process.env.PLAYWRIGHT_AWS_STUDENT_USERNAME ?? "demo-aws-student",
      password: process.env.PLAYWRIGHT_AWS_STUDENT_PASSWORD ?? "Demo@12345",
    },
    examCode: "DMO-AWS-PRACTICE-01",
    requiresLaunchableAction: true,
    applyTeacherReopenBeforeLaunchCheck: true,
  },
  {
    label: "Multi-subject mock",
    credentials: {
      username: process.env.PLAYWRIGHT_NEET_STUDENT_USERNAME ?? "demo-neet-student",
      password: process.env.PLAYWRIGHT_NEET_STUDENT_PASSWORD ?? "Demo@12345",
    },
    examCode: "DMO-MULTI-SUBJECT-01",
    requiresLaunchableAction: true,
    preflightOptional: true,
    applyTeacherReopenBeforeLaunchCheck: true,
  },
  {
    label: "AWS published result",
    credentials: {
      username: process.env.PLAYWRIGHT_AWS_STUDENT_USERNAME ?? "demo-aws-student",
      password: process.env.PLAYWRIGHT_AWS_STUDENT_PASSWORD ?? "Demo@12345",
    },
    examCode: "DMO-AWS-PRACTICE-01",
    resultExamCode: "DMO-AWS-RESULT-01",
    requiresPublishedResult: true,
    requiresReviewReadyResult: true,
  },
];

export type StudentFamilyFixtureStatus = {
  label: string;
  username: string;
  examCode: string;
  loginOk: boolean;
  examVisible: boolean;
  resultVisible: boolean | null;
  publishedResultReady: boolean | null;
  reviewReadyResult: boolean | null;
  launchableAction: "start" | "resume" | "summary" | "review" | "missing" | null;
  visibleExamCodes: string[];
  visibleResultCodes: string[];
  failureReason: string | null;
};

async function inspectStudentPrimaryAction(page: Page) {
  const primaryActionRegion = page.locator("article").filter({
    has: page.getByText(/primary action/i),
  }).first();

  if (!(await primaryActionRegion.isVisible().catch(() => false))) {
    return "missing" as const;
  }

  const reviewLink = primaryActionRegion.getByRole("link", { name: /open answer review|open review/i }).first();
  if (await reviewLink.isVisible().catch(() => false)) {
    return "review" as const;
  }

  const summaryLink = primaryActionRegion.getByRole("link", { name: /open attempt summary|open summary/i }).first();
  if (await summaryLink.isVisible().catch(() => false)) {
    return "summary" as const;
  }

  const resumeLink = primaryActionRegion.getByRole("link", { name: /resume .*/i }).first();
  if (await resumeLink.isVisible().catch(() => false)) {
    return "resume" as const;
  }

  const startButton = primaryActionRegion.getByRole("button", { name: /^(start|start .*?)$/i }).first();
  if (await startButton.isVisible().catch(() => false)) {
    return "start" as const;
  }

  return "missing" as const;
}

export async function inspectStudentFamilyFixture(
  page: Page,
  scenario: StudentFamilyFixtureScenario,
): Promise<StudentFamilyFixtureStatus> {
  try {
    await loginWithCredentials(page, scenario.credentials, "student");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      label: scenario.label,
      username: scenario.credentials.username,
      examCode: scenario.examCode,
      loginOk: false,
      examVisible: false,
      resultVisible: scenario.resultExamCode ? false : null,
      publishedResultReady: scenario.resultExamCode ? false : null,
      reviewReadyResult: scenario.resultExamCode ? false : null,
      launchableAction: null,
      visibleExamCodes: [],
      visibleResultCodes: [],
      failureReason: message,
    };
  }

  await expectStudentWorkspace(page);

  const visibleExams = await fetchStudentAvailableExamsCatalog(page);
  const visibleResults = scenario.resultExamCode
    ? await fetchStudentResultsCatalog(page)
    : [];
  const exam = visibleExams.find((candidate) => candidate.code === scenario.examCode) ?? null;
  const examVisible = Boolean(exam);
  const result = scenario.resultExamCode
    ? visibleResults.find((candidate) => candidate.exam_code === scenario.resultExamCode) ?? null
    : null;
  const resultVisible = scenario.resultExamCode
    ? Boolean(result)
    : null;
  const publishedResultReady = scenario.resultExamCode
    ? Boolean(result?.is_published)
    : null;
  const reviewReadyResult = scenario.resultExamCode
    ? Boolean(result?.is_published && result?.review_available)
    : null;

  let launchableAction: StudentFamilyFixtureStatus["launchableAction"] = null;
  if (scenario.requiresLaunchableAction && exam?.id) {
    if (scenario.applyTeacherReopenBeforeLaunchCheck) {
      const teacherLookup = await fetchTeacherFamilyExamByCode(page, scenario.examCode);
      if (teacherLookup.exam?.id) {
        await reopenTeacherExamWindowWithAccessToken(
          page,
          teacherLookup.accessToken,
          teacherLookup.exam.id,
        );
      }
    }

    const refreshedExams = await fetchStudentAvailableExamsCatalog(page);
    const refreshedExam = refreshedExams.find((candidate) => candidate.code === scenario.examCode) ?? exam;
    const targetExamId = refreshedExam?.id ?? exam.id;
    const targetExamTitle = refreshedExam?.title ?? exam.title;

    await page.goto(`/app/exams/${targetExamId}`);
    await expect(page.getByRole("heading", { name: new RegExp(targetExamTitle, "i") }).first()).toBeVisible();
    launchableAction = await inspectStudentPrimaryAction(page);
  }

  return {
    label: scenario.label,
    username: scenario.credentials.username,
    examCode: scenario.examCode,
    loginOk: true,
    examVisible,
    resultVisible,
    publishedResultReady,
    reviewReadyResult,
    launchableAction,
    visibleExamCodes: visibleExams
      .slice(0, 12)
      .map((candidate) => candidate.code || candidate.title)
      .filter(Boolean),
    visibleResultCodes: visibleResults
      .slice(0, 12)
      .map((candidate) => candidate.exam_code || candidate.exam_title)
      .filter(Boolean),
    failureReason: null,
  };
}
