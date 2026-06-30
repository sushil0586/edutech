import { expect, test, type Page } from "@playwright/test";
import type { StudentAvailableExam, StudentExamDetail } from "@/features/dashboard/types";
import { loginWithCredentials } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const awsStudentCredentials = {
  username: "demo-aws-student",
  password: "Demo@12345",
};

const awsExamCode = "DMO-AWS-PRACTICE-01";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("ERR_ABORTED") && page.url().includes(url)) {
        return;
      }
      if (
        (!message.includes("ERR_CONNECTION_REFUSED") && !message.includes("ERR_ABORTED")) ||
        attempt === attempts
      ) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchStudentAvailableExams(page: Page) {
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

async function fetchStudentExamDetail(page: Page, examId: string) {
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

test.describe("Student AWS practice contract", () => {
  test("@workflow aws student sees the seeded AWS practice set as a practice-first certification lane", async ({
    page,
  }) => {
    await loginWithCredentials(page, awsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const awsExam = exams.find((exam) => exam.code === awsExamCode) ?? null;
    expect(awsExam).not.toBeNull();
    expect(awsExam!.is_multi_subject).toBe(false);
    expect(awsExam!.subject_summary.subject_count).toBe(1);

    const detail = await fetchStudentExamDetail(page, awsExam!.id);
    expect(detail.code).toBe(awsExamCode);
    expect(detail.exam_type).toBe("practice");
    expect(detail.result_published).toBe(true);
    expect(detail.experience_profile.assessment_family).toBe("certification");
    expect(detail.experience_profile.actual_timer_mode).toBe("global");
    expect(detail.experience_profile.actual_navigation_mode).toBe("free_exam");

    await gotoWithRetry(page, "/app/practice");
    await expect(page.getByText(awsExam!.title).first()).toBeVisible();

    await gotoWithRetry(page, `/app/exams/${awsExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(awsExam!.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(/45 minutes/i).first()).toBeVisible();
    await expect(page.getByText(/certification/i).first()).toBeVisible();
    await expect(page.getByText(/review availability/i).first()).toBeVisible();
    await expect(page.getByText(/cloud concepts/i).first()).toBeVisible();
  });
});
