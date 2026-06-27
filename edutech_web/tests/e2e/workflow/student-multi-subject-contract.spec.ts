import { expect, test, type Page } from "@playwright/test";
import type { StudentAvailableExam, StudentExamDetail } from "@/features/dashboard/types";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const multiSubjectExamCode = "DMO-MIX-MOCK-01";
const expectedSectionNames = [
  "Mathematics Section",
  "Physics Section",
  "Chemistry Section",
];
const expectedSubjectNames = [
  "Mathematics",
  "Physics",
  "Chemistry",
];

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

test.describe("Student multi-subject exam contract", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student sees the seeded multi-subject mock as a true mixed-subject experience", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const mixedExam = exams.find((exam) => exam.code === multiSubjectExamCode) ?? null;
    expect(mixedExam).not.toBeNull();
    expect(mixedExam!.is_multi_subject).toBe(true);
    expect(mixedExam!.subject_summary.subject_count).toBe(3);
    expect(mixedExam!.subject_summary.display_label).toBeTruthy();
    expect(mixedExam!.section_subjects.map((subject) => subject.name)).toEqual(expectedSubjectNames);

    const detail = await fetchStudentExamDetail(page, mixedExam!.id);
    expect(detail.code).toBe(multiSubjectExamCode);
    expect(detail.is_multi_subject).toBe(true);
    expect(detail.subject_summary.subject_count).toBe(3);
    expect(detail.subject_summary.display_label).toBe(mixedExam!.subject_summary.display_label);
    expect(detail.section_subjects.map((subject) => subject.name)).toEqual(expectedSubjectNames);
    expect(detail.sections.map((section) => section.name)).toEqual(expectedSectionNames);

    await page.goto("/app/exams");
    await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();
    await expect(page.getByText(mixedExam!.title).first()).toBeVisible();
    await expect(page.getByText(mixedExam!.subject_summary.display_label).first()).toBeVisible();

    await page.goto(`/app/exams/${mixedExam!.id}`);
    await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
    await expect(page.getByText(mixedExam!.subject_summary.display_label).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();

    for (const sectionName of expectedSectionNames) {
      await expect(page.getByText(sectionName).first()).toBeVisible();
    }
  });
});
