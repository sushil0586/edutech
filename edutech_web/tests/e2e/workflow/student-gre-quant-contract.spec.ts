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

const greStudentCredentials = {
  username: "demo-gre-student",
  password: "Demo@12345",
};

const greExamCode = "DMO-GRE-QUANT-01";
const expectedSectionNames = ["Quant Section 1", "Quant Section 2"];

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

test.describe("Student GRE quant contract", () => {
  test("@workflow gre student sees the seeded GRE quant drill as a formal sectional competitive exam", async ({
    page,
  }) => {
    await loginWithCredentials(page, greStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const greExam = exams.find((exam) => exam.code === greExamCode) ?? null;
    expect(greExam).not.toBeNull();
    expect(greExam!.is_multi_subject).toBe(false);
    expect(greExam!.subject_summary.subject_count).toBe(1);

    const detail = await fetchStudentExamDetail(page, greExam!.id);
    expect(detail.code).toBe(greExamCode);
    expect(detail.is_multi_subject).toBe(false);
    expect(detail.subject_summary.subject_count).toBe(1);
    expect(detail.sections.map((section) => section.name)).toEqual(expectedSectionNames);
    expect(detail.experience_profile.assessment_family).toBe("competitive");
    expect(detail.experience_profile.actual_timer_mode).toBe("section");
    expect(detail.experience_profile.actual_navigation_mode).toBe("sequential");
    await page.goto("/app/exams");
    await expect(page.getByText(greExam!.title).first()).toBeVisible();

    await page.goto(`/app/exams/${greExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(greExam!.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();
    await expect(page.getByText(/70 minutes/i).first()).toBeVisible();
    await expect(page.getByText(/competitive/i).first()).toBeVisible();
    for (const sectionName of expectedSectionNames) {
      await expect(page.getByText(sectionName).first()).toBeVisible();
    }
  });
});
