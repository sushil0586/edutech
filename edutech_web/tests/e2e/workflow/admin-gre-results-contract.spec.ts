import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const greLiveCode = "DMO-GRE-QUANT-01";
const grePublishedCode = "DMO-GRE-RESULT-01";

async function backendAccessToken(page: Page) {
  const accessToken =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchAdminExamByCode(page: Page, examCode: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/exams/?search=${encodeURIComponent(examCode)}&page_size=20`,
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
    }>;
  };
  const exam = payload.results?.find((item) => item.code === examCode) ?? null;
  expect(exam).not.toBeNull();
  return exam!;
}

test.describe("Admin GRE results contract", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin sees both seeded GRE exams as real oversight records", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const liveExam = await fetchAdminExamByCode(page, greLiveCode);
    const publishedExam = await fetchAdminExamByCode(page, grePublishedCode);

    await page.goto(`/admin/exams/${liveExam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(liveExam.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(liveExam.code).first()).toBeVisible();
    await expect(page.getByText(/exam publish readiness/i).first()).toBeVisible();
    await expect(page.getByText(/result publish readiness/i).first()).toBeVisible();
    await expect(page.getByText(/quant section 1/i).first()).toBeVisible();
    await expect(page.getByText(/quant section 2/i).first()).toBeVisible();

    await page.goto(`/admin/exams/${publishedExam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(publishedExam.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(publishedExam.code).first()).toBeVisible();
    await expect(page.getByText(/^result status$/i).first()).toBeVisible();
    await expect(page.getByText(/published/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /link questions/i }).first()).toBeVisible();
  });
});
