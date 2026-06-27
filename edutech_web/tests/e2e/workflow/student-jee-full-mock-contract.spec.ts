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

const jeeStudentCredentials = {
  username: "demo-jee-student",
  password: "Demo@12345",
};

const jeeExamCode = "DMO-JEE-FULL-01";
const expectedSectionNames = [
  "Physics Objective",
  "Physics Numeric",
  "Chemistry Objective",
  "Chemistry Numeric",
  "Mathematics Objective",
  "Mathematics Numeric",
];
const expectedSubjectNames = [
  "Physics",
  "Chemistry",
  "Mathematics",
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

test.describe("Student JEE full mock contract", () => {
  test("@workflow jee student sees the seeded JEE full mock as a hybrid mixed-subject competitive exam", async ({
    page,
  }) => {
    await loginWithCredentials(page, jeeStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const jeeExam = exams.find((exam) => exam.code === jeeExamCode) ?? null;
    expect(jeeExam).not.toBeNull();
    expect(jeeExam!.is_multi_subject).toBe(true);
    expect(jeeExam!.subject_summary.subject_count).toBe(3);
    expect([...jeeExam!.section_subjects.map((subject) => subject.name)].sort()).toEqual(
      [...expectedSubjectNames].sort(),
    );

    const detail = await fetchStudentExamDetail(page, jeeExam!.id);
    expect(detail.code).toBe(jeeExamCode);
    expect(detail.is_multi_subject).toBe(true);
    expect(detail.subject_summary.subject_count).toBe(3);
    expect([...detail.section_subjects.map((subject) => subject.name)].sort()).toEqual(
      [...expectedSubjectNames].sort(),
    );
    expect(detail.sections.map((section) => section.name)).toEqual(expectedSectionNames);
    expect(detail.experience_profile.assessment_family).toBe("competitive");
    expect(detail.experience_profile.actual_timer_mode).toBe("hybrid");
    expect(detail.experience_profile.actual_navigation_mode).toBe("hybrid");

    await page.goto("/app/exams");
    await expect(page.getByText(jeeExam!.title).first()).toBeVisible();
    await expect(page.getByText(jeeExam!.subject_summary.display_label).first()).toBeVisible();

    await page.goto(`/app/exams/${jeeExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(jeeExam!.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(jeeExam!.subject_summary.display_label).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();
    await expect(page.getByText(/competitive/i).first()).toBeVisible();
    await expect(page.getByText(/180 minutes/i).first()).toBeVisible();
    await expect(page.getByText(/hybrid/i).first()).toBeVisible();

    for (const sectionName of expectedSectionNames) {
      await expect(page.getByText(sectionName).first()).toBeVisible();
    }
  });
});
