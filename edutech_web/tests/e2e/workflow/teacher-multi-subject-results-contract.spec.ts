import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const multiSubjectPracticeExamCode = "DMO-MIX-PRACTICE-01";

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchTeacherExam(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/teacher/exams/?search=${encodeURIComponent(multiSubjectPracticeExamCode)}&page_size=20`,
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
    results?: Array<{
      id: string;
      code: string;
      title: string;
      is_multi_subject?: boolean;
      subject_summary?: {
        display_label?: string;
        subject_count?: number;
      } | null;
    }>;
  };

  const exam = payload.results?.find((item) => item.code === multiSubjectPracticeExamCode) ?? null;
  expect(exam).not.toBeNull();
  expect(exam!.is_multi_subject).toBe(true);
  expect(exam!.subject_summary?.subject_count).toBe(3);
  expect(exam!.subject_summary?.display_label).toBeTruthy();
  return exam!;
}

test.describe("Teacher multi-subject results contract", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher sees the seeded mixed-subject practice exam as a real results workspace record", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const exam = await fetchTeacherExam(page);

    await page.goto(`/teacher/results?exam=${encodeURIComponent(exam.id)}`);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(exam.title).first()).toBeVisible();
    await expect(page.getByText(exam.code).first()).toBeVisible();
    await expect(page.getByText(/exam publish readiness/i).first()).toBeVisible();
    await expect(page.getByText(/result publish readiness/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open exam/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open reviews/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open leaderboard/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^open exam$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(exam.code).first()).toBeVisible();
    await expect(page.getByText(exam.subject_summary!.display_label!).first()).toBeVisible();
    await expect(page.getByText(/mathematics section/i).first()).toBeVisible();
    await expect(page.getByText(/physics section/i).first()).toBeVisible();
    await expect(page.getByText(/chemistry section/i).first()).toBeVisible();
  });
});
