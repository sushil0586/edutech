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

const neetStudentCredentials = {
  username: "demo-neet-student",
  password: "Demo@12345",
};

const neetExamCode = "DMO-NEET-FULL-01";
const expectedSectionNames = [
  "Physics Section",
  "Chemistry Section",
  "Biology Section",
];
const expectedSubjectNames = [
  "Physics",
  "Chemistry",
  "Biology",
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

test.describe("Student NEET full mock contract", () => {
  test("@workflow neet student sees the seeded NEET full mock as a serious mixed-subject competitive exam", async ({
    page,
  }) => {
    await loginWithCredentials(page, neetStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const neetExam = exams.find((exam) => exam.code === neetExamCode) ?? null;
    expect(neetExam).not.toBeNull();
    expect(neetExam!.is_multi_subject).toBe(true);
    expect(neetExam!.subject_summary.subject_count).toBe(3);
    expect([...neetExam!.section_subjects.map((subject) => subject.name)].sort()).toEqual(
      [...expectedSubjectNames].sort(),
    );

    const detail = await fetchStudentExamDetail(page, neetExam!.id);
    expect(detail.code).toBe(neetExamCode);
    expect(detail.is_multi_subject).toBe(true);
    expect(detail.subject_summary.subject_count).toBe(3);
    expect([...detail.section_subjects.map((subject) => subject.name)].sort()).toEqual(
      [...expectedSubjectNames].sort(),
    );
    expect(detail.sections.map((section) => section.name)).toEqual(expectedSectionNames);
    expect(detail.experience_profile.assessment_family).toBe("competitive");
    expect(detail.experience_profile.actual_timer_mode).toBe("section");
    expect(detail.experience_profile.actual_navigation_mode).toBe("sequential");

    await page.goto("/app/exams");
    await expect(page.getByText(neetExam!.title).first()).toBeVisible();
    await expect(page.getByText(neetExam!.subject_summary.display_label).first()).toBeVisible();

    await page.goto(`/app/exams/${neetExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(neetExam!.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(neetExam!.subject_summary.display_label).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();
    await expect(page.getByText(/competitive/i).first()).toBeVisible();
    await expect(page.getByText(/180 minutes/i).first()).toBeVisible();
    await expect(page.getByText(/review availability/i).first()).toBeVisible();

    for (const sectionName of expectedSectionNames) {
      await expect(page.getByText(sectionName).first()).toBeVisible();
    }
  });
});
