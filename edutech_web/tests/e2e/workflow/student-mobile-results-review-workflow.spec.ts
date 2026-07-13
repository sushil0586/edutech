import { expect, test, type Page } from "@playwright/test";
import type { StudentResult } from "@/features/dashboard/types";
import { loginWithCredentials } from "../helpers/auth";
import { awsStudentCredentials } from "../helpers/family-runtime";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const mutableStudentResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
);

const awsPublishedCode = "DMO-AWS-RESULT-01";
const awsPublishedTitle = "Demo AWS Practitioner Result 01";

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchStudentResults(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/results/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentResult[];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  }).first();
}

test.describe("Student mobile results and review workflow", () => {
  test.skip(
    !mutableStudentResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
      "student mobile result and review workflow coverage",
    ),
  );

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @mutable student can follow one seeded review-ready result across mobile results summary review and analytics continuity", async ({
    page,
  }) => {
    await loginWithCredentials(page, awsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const results = await fetchStudentResults(page);
    const seededResult = results.find((item) => item.exam_code === awsPublishedCode) ?? null;
    expect(seededResult).not.toBeNull();
    expect(seededResult!.exam_title).toBe(awsPublishedTitle);
    expect(seededResult!.is_published).toBe(true);
    expect(seededResult!.review_available).toBe(true);

    await page.goto("/app/results?result_status=review_ready&result_group=outcome");
    await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=review_ready/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/results recovery loop/i).first()).toBeVisible();

    const resultCard = resultCardByTitle(page, awsPublishedTitle);
    await expect(resultCard).toBeVisible();
    await expect(resultCard.getByText(/result published/i).first()).toBeVisible();
    await expect(resultCard.getByRole("link", { name: /open summary/i }).first()).toBeVisible();
    await expect(resultCard.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();

    await resultCard.getByRole("link", { name: /open summary/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/app/attempts/${seededResult!.attempt}/summary(?:\\?.*)?$`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
    await expect(page.getByText(/recommended actions/i).first()).toBeVisible();
    await expect(page.getByText(/review available/i).first()).toBeVisible();

    await page.getByRole("link", { name: /open answer review|review feedback/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/app/attempts/${seededResult!.attempt}/review(?:\\?.*)?$`));
    await expect(
      page.getByRole("heading", { name: new RegExp(`${escapeRegExp(awsPublishedTitle)}\\s+Review`, "i") }).first(),
    ).toBeVisible();
    await expect(page.getByText(/review mode/i).first()).toBeVisible();
    await expect(page.getByText(/review available/i).first()).toBeVisible();
    await expect(page.locator(".contentCard").filter({ hasText: /review state/i }).first()).toBeVisible();
    await expect(page.getByText(/marks awarded|score awarded|correct answer/i).first()).toBeVisible();

    await page.getByRole("link", { name: /view analytics/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    await expect(page.getByText(/recent published results/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /compare results/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /check results|open results/i }).first().click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(resultCardByTitle(page, awsPublishedTitle)).toBeVisible();
    await expect(page.getByText(new RegExp(escapeRegExp(awsPublishedTitle), "i")).first()).toBeVisible();
  });
});
