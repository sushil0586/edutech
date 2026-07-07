import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";
import { getRoleCredentials } from "../fixtures/env";
import { resolveBackendBaseUrl } from "../helpers/backend-base-url";

const backendBaseUrl = resolveBackendBaseUrl();

const awsLiveCode = "DMO-AWS-PRACTICE-01";
const awsPublishedCode = "DMO-AWS-RESULT-01";

async function backendAccessToken(page: Page) {
  const credentials = getRoleCredentials("admin");
  expect(credentials).not.toBeNull();

  const response = await page.request.post(`${backendBaseUrl}/api/v1/auth/login/`, {
    data: {
      username: credentials!.username,
      password: credentials!.password,
    },
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });

  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as {
    access?: string;
  };
  const accessToken = payload.access?.trim() ?? "";
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
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as {
    results?: Array<{
      id: string;
      code: string;
      title: string;
    }>;
  };
  const exam = payload.results?.find((item) => item.code === examCode) ?? null;
  expect(exam, `Expected seeded AWS exam ${examCode} to exist in admin exam search.`).not.toBeNull();
  return exam!;
}

test.describe("Admin AWS results contract", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin sees both seeded AWS exams as real oversight records", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const liveExam = await fetchAdminExamByCode(page, awsLiveCode);
    const publishedExam = await fetchAdminExamByCode(page, awsPublishedCode);

    await page.goto(`/admin/exams/${liveExam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(liveExam.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(liveExam.code).first()).toBeVisible();
    await expect(page.getByText(/exam publish readiness/i).first()).toBeVisible();
    await expect(page.getByText(/result publish readiness/i).first()).toBeVisible();
    await expect(page.getByText(/cloud concepts/i).first()).toBeVisible();

    await page.goto(`/admin/exams/${publishedExam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(publishedExam.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(publishedExam.code).first()).toBeVisible();
    await expect(page.getByText(/^result status$/i).first()).toBeVisible();
    await expect(page.getByText(/published/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /link questions/i }).first()).toBeVisible();
  });
});
