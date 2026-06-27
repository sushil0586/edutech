import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const neetFullMockCode = "DMO-NEET-FULL-01";
const neetPublishedMockCode = "DMO-NEET-RESULT-01";
const expectedSections = [
  "Physics Section",
  "Chemistry Section",
  "Biology Section",
];

async function backendAccessToken(page: Page) {
  const accessToken =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchInstituteExamByCode(page: Page, examCode: string) {
  const accessToken = await backendAccessToken(page);
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
  const exam = payload.results?.find((item) => item.code === examCode) ?? null;
  expect(exam).not.toBeNull();
  expect(exam!.is_multi_subject).toBe(true);
  expect(exam!.subject_summary?.subject_count).toBe(3);
  expect(exam!.subject_summary?.display_label).toBeTruthy();
  return exam!;
}

test.describe("Institute NEET results contract", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute sees both seeded NEET exams as real oversight records", async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const fullMock = await fetchInstituteExamByCode(page, neetFullMockCode);
    const publishedMock = await fetchInstituteExamByCode(page, neetPublishedMockCode);

    await page.goto(`/institute/exams/${fullMock.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(fullMock.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(fullMock.code).first()).toBeVisible();
    await expect(page.getByText(fullMock.subject_summary!.display_label!).first()).toBeVisible();
    await expect(page.getByText(/mock exam/i).first()).toBeVisible();
    await expect(page.getByText(/180 min/i).first()).toBeVisible();
    await expect(page.getByText(/sequential/i).first()).toBeVisible();
    for (const sectionName of expectedSections) {
      await expect(page.getByText(sectionName).first()).toBeVisible();
    }

    await page.goto(`/institute/results?exam=${encodeURIComponent(publishedMock.id)}`);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(publishedMock.title).first()).toBeVisible();
    await expect(page.getByText(publishedMock.code).first()).toBeVisible();
    await expect(page.getByText(/exam publish readiness/i).first()).toBeVisible();
    await expect(page.getByText(/result publish readiness/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open exam/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open leaderboard/i }).first()).toBeVisible();
  });
});
