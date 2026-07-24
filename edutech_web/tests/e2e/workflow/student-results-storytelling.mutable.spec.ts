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

function parseRelativeHref(href: string) {
  return new URL(href, "http://localhost");
}

function expectSearchParamIfPresent(url: URL, key: string, expectedValue: string | null) {
  if (!expectedValue) {
    return;
  }
  expect(url.searchParams.get(key)).toBe(expectedValue);
}

function resultRowByTitle(page: Page, title: string) {
  return page.getByRole("button", { name: new RegExp(title, "i") }).first();
}

test.describe("Student mutable results storytelling", () => {
  test.skip(
    !mutableStudentResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
      "student result storytelling coverage",
    ),
  );

  test("@workflow @mutable student can follow one seeded review-ready result across results summary review and analytics storytelling views", async ({
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

    const resultRow = resultRowByTitle(page, awsPublishedTitle);
    await expect(resultRow).toBeVisible();
    await expect(page.getByText(/result published · pass/i).first()).toBeVisible();
    await resultRow.click();

    const resultDialog = page.getByRole("dialog");
    await expect(resultDialog).toBeVisible();
    await expect(resultDialog.getByText(new RegExp(awsPublishedTitle, "i")).first()).toBeVisible();
    await expect(resultDialog.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();

    const summaryLink = resultDialog.getByRole("link", { name: /open summary/i }).first();
    await expect(summaryLink).toBeVisible();
    const summaryHref = await summaryLink.getAttribute("href");
    expect(summaryHref).toBe(`/app/attempts/${seededResult!.attempt}/summary`);
    await summaryLink.click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${seededResult!.attempt}/summary(?:\\?.*)?$`));
    await expect(page.getByRole("heading", { name: new RegExp(`${awsPublishedTitle}\\s+Summary`, "i") }).first()).toBeVisible();
    await expect(page.getByText(/attempt status/i).first()).toBeVisible();
    await expect(page.getByText(/what to do next/i).first()).toBeVisible();
    await expect(page.getByText(/review available/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open answer review|review feedback/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open answer review|review feedback/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/app/attempts/${seededResult!.attempt}/review(?:\\?.*)?$`));
    await expect(
      page.getByRole("heading", { name: new RegExp(`${awsPublishedTitle}\\s+Review`, "i") }).first(),
    ).toBeVisible();
    await expect(page.getByText(/review mode/i).first()).toBeVisible();
    await expect(page.getByText(/review available/i).first()).toBeVisible();
    await expect(page.locator(".contentCard").filter({ hasText: /review state/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /view analytics/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    await expect(page.getByText(/recent published results/i).first()).toBeVisible();

    const compareResultsLink = page.getByRole("link", { name: /compare results/i }).first();
    await expect(compareResultsLink).toBeVisible();
    const analyticsResultHref = await compareResultsLink.getAttribute("href");
    expect(analyticsResultHref).not.toBeNull();
    const scopedCompareUrl = parseRelativeHref(analyticsResultHref!);
    const expectedSubject = scopedCompareUrl.searchParams.get("subject");
    const expectedSource = scopedCompareUrl.searchParams.get("source");
    const expectedTeacher = scopedCompareUrl.searchParams.get("teacher");

    await compareResultsLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
    await expect(page.getByText(/comparison snapshot/i).first()).toBeVisible();
    await expect(page.getByText(new RegExp(awsPublishedTitle, "i")).first()).toBeVisible();
    await expect(page.getByText(/published result ledger/i).first()).toBeVisible();

    let currentUrl = new URL(page.url());
    expectSearchParamIfPresent(currentUrl, "subject", expectedSubject);
    expectSearchParamIfPresent(currentUrl, "source", expectedSource);
    expectSearchParamIfPresent(currentUrl, "teacher", expectedTeacher);

    await page.getByRole("link", { name: /open timeline/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
    await expect(page.getByText(/recent result timeline/i).first()).toBeVisible();
    await expect(page.getByText(/what to test next/i).first()).toBeVisible();

    currentUrl = new URL(page.url());
    expectSearchParamIfPresent(currentUrl, "subject", expectedSubject);
    expectSearchParamIfPresent(currentUrl, "source", expectedSource);
    expectSearchParamIfPresent(currentUrl, "teacher", expectedTeacher);

    await page.getByRole("link", { name: /open results/i }).first().click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(resultRowByTitle(page, awsPublishedTitle)).toBeVisible();

    currentUrl = new URL(page.url());
    expectSearchParamIfPresent(currentUrl, "subject", expectedSubject);
    expectSearchParamIfPresent(currentUrl, "source", expectedSource);
    expectSearchParamIfPresent(currentUrl, "teacher", expectedTeacher);
  });
});
