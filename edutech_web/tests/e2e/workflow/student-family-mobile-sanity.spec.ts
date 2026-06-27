import { expect, test, type Page } from "@playwright/test";
import type { StudentAvailableExam } from "@/features/dashboard/types";
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

const jeeStudentCredentials = {
  username: "demo-jee-student",
  password: "Demo@12345",
};

const families = [
  {
    label: "NEET",
    credentials: neetStudentCredentials,
    examCode: "DMO-NEET-FULL-01",
    expectedSections: ["Physics Section", "Chemistry Section", "Biology Section"],
    expectedTags: [/competitive/i, /180 minutes/i],
  },
  {
    label: "JEE",
    credentials: jeeStudentCredentials,
    examCode: "DMO-JEE-FULL-01",
    expectedSections: ["Physics Objective", "Chemistry Objective", "Mathematics Objective"],
    expectedTags: [/competitive/i, /180 minutes/i, /hybrid/i],
  },
] as const;

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

test.describe("Student family mobile sanity", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  for (const family of families) {
    test(`@workflow ${family.label} seeded exam detail stays reachable on a mobile-sized viewport`, async ({
      page,
    }) => {
      await loginWithCredentials(page, family.credentials, "student");
      await expectStudentWorkspace(page);

      const exams = await fetchStudentAvailableExams(page);
      const exam = exams.find((item) => item.code === family.examCode) ?? null;
      expect(exam).not.toBeNull();

      await page.goto("/app/exams");
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();
      await expect(page.getByText(exam!.title).first()).toBeVisible();
      await expect(page.getByText(exam!.subject_summary.display_label).first()).toBeVisible();

      await page.goto(`/app/exams/${exam!.id}`);
      await expect(page).toHaveURL(/\/app\/exams\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: new RegExp(exam!.title, "i") }).first()).toBeVisible();
      await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
      await expect(page.getByText(/primary action/i).first()).toBeVisible();
      await expect(page.getByText(/section overview/i).first()).toBeVisible();
      await expect(page.getByText(exam!.subject_summary.display_label).first()).toBeVisible();

      for (const expectedTag of family.expectedTags) {
        await expect(page.getByText(expectedTag).first()).toBeVisible();
      }

      for (const sectionName of family.expectedSections) {
        await expect(page.getByText(sectionName).first()).toBeVisible();
      }

      await expect(page.getByRole("link", { name: /back to exams/i }).first()).toBeVisible();
    });
  }
});
