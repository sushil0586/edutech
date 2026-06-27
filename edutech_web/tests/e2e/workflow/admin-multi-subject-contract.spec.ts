import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

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

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchAdminExamList(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/exams/?search=${encodeURIComponent(multiSubjectExamCode)}&page_size=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
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
}

async function fetchAdminExamDetail(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    id: string;
    code: string;
    title: string;
    is_multi_subject?: boolean;
    subject_summary?: {
      display_label?: string;
      subject_count?: number;
    } | null;
    sections: Array<{ name: string }>;
  };
}

test.describe("Admin multi-subject contract", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin sees the seeded mixed-subject exam as a real multi-subject oversight record", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const listPayload = await fetchAdminExamList(page);
    const exam = listPayload.results?.find((item) => item.code === multiSubjectExamCode) ?? null;
    expect(exam).not.toBeNull();
    expect(exam!.is_multi_subject).toBe(true);
    expect(exam!.subject_summary?.subject_count).toBe(3);
    expect(exam!.subject_summary?.display_label).toBeTruthy();

    const detailPayload = await fetchAdminExamDetail(page, exam!.id);
    expect(detailPayload.is_multi_subject).toBe(true);
    expect(detailPayload.subject_summary?.display_label).toBe(exam!.subject_summary?.display_label);
    expect(detailPayload.sections.map((section) => section.name)).toEqual(expectedSectionNames);

    await page.goto(`/admin/exams/${exam!.id}`);
    await expect(page.getByText(exam!.code).first()).toBeVisible();
    await expect(page.getByText(exam!.subject_summary!.display_label!).first()).toBeVisible();
    await expect(page.getByText(/exam publish readiness/i).first()).toBeVisible();
    await expect(page.getByText(/result publish readiness/i).first()).toBeVisible();
  });
});
