import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

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

async function fetchAdminPracticeExam(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/exams/?search=${encodeURIComponent(multiSubjectPracticeExamCode)}&page_size=20`,
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

test.describe("Admin multi-subject published practice contract", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin sees the seeded mixed-subject practice exam as a published oversight record", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const exam = await fetchAdminPracticeExam(page);

    await page.goto(`/admin/exams/${exam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(exam.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(exam.code).first()).toBeVisible();
    await expect(page.getByText(exam.subject_summary!.display_label!).first()).toBeVisible();
    await expect(page.getByText(/^result status$/i).first()).toBeVisible();
    await expect(page.getByText(/published/i).first()).toBeVisible();
    await expect(page.getByText(/exam publish readiness/i).first()).toBeVisible();
    await expect(page.getByText(/result publish readiness/i).first()).toBeVisible();
    await expect(page.getByText(/mathematics section/i).first()).toBeVisible();
    await expect(page.getByText(/physics section/i).first()).toBeVisible();
    await expect(page.getByText(/chemistry section/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /link questions/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /advanced builder|open advanced builder/i }).first()).toBeVisible();
  });
});
