import { expect, test, type Page } from "@playwright/test";
import type { StudentResult } from "@/features/dashboard/types";
import { loginWithCredentials } from "../helpers/auth";
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

const neetStudentCredentials = {
  username: "demo-neet-student",
  password: "Demo@12345",
};

const neetPublishedMockCode = "DMO-NEET-RESULT-01";
const neetPublishedMockTitle = "Demo NEET Published Mock 01";

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

test.describe("Student mutable analytics drill-down continuity", () => {
  test.skip(
    !mutableStudentResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
      "student analytics drill-down continuity coverage",
    ),
  );

  test("@workflow @mutable student analytics drill-downs preserve scoped result context across compare timeline actions and subject views", async ({
    page,
  }) => {
    await loginWithCredentials(page, neetStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const results = await fetchStudentResults(page);
    const seededResult = results.find((item) => item.exam_code === neetPublishedMockCode) ?? null;
    expect(seededResult).not.toBeNull();
    expect(seededResult!.exam_title).toBe(neetPublishedMockTitle);

    await page.goto("/app/analytics");
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    await expect(
      page.getByText(new RegExp(`${neetPublishedMockTitle}|${neetPublishedMockCode}`, "i")).first(),
    ).toBeVisible();

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
    await expect(page.getByText(new RegExp(`${neetPublishedMockTitle}|${neetPublishedMockCode}`, "i")).first()).toBeVisible();

    let currentUrl = new URL(page.url());
    expectSearchParamIfPresent(currentUrl, "subject", expectedSubject);
    expectSearchParamIfPresent(currentUrl, "source", expectedSource);
    expectSearchParamIfPresent(currentUrl, "teacher", expectedTeacher);

    await page.getByRole("link", { name: /open timeline/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
    await expect(page.getByText(/recent result timeline/i).first()).toBeVisible();
    await expect(page.getByText(new RegExp(neetPublishedMockTitle, "i")).first()).toBeVisible();

    currentUrl = new URL(page.url());
    expectSearchParamIfPresent(currentUrl, "subject", expectedSubject);
    expectSearchParamIfPresent(currentUrl, "source", expectedSource);
    expectSearchParamIfPresent(currentUrl, "teacher", expectedTeacher);

    await page.getByRole("link", { name: /open action center|action center/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics\/actions(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /next best moves/i }).first()).toBeVisible();
    await expect(page.getByText(/action shortlist/i).first()).toBeVisible();

    currentUrl = new URL(page.url());
    expectSearchParamIfPresent(currentUrl, "subject", expectedSubject);
    expectSearchParamIfPresent(currentUrl, "source", expectedSource);
    expectSearchParamIfPresent(currentUrl, "teacher", expectedTeacher);

    const openSubjectDeepDiveLink = page.getByRole("link", { name: /open subject deep dive/i }).first();
    if (await openSubjectDeepDiveLink.isVisible().catch(() => false)) {
      const subjectDeepDiveHref = await openSubjectDeepDiveLink.getAttribute("href");
      expect(subjectDeepDiveHref).not.toBeNull();
      const subjectDeepDiveUrl = parseRelativeHref(subjectDeepDiveHref!);
      await openSubjectDeepDiveLink.click();

      await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
      await expect(
        page.getByRole("heading", { name: new RegExp(`${expectedSubject ?? ""} analytics`, "i") }).first(),
      ).toBeVisible();
      await expect(page.getByText(/question evidence/i).first()).toBeVisible();
      await expect(page.getByText(/recent subject results/i).first()).toBeVisible();

      currentUrl = new URL(page.url());
      expect(currentUrl.pathname).toBe(subjectDeepDiveUrl.pathname);
      expectSearchParamIfPresent(currentUrl, "source", expectedSource);
      expectSearchParamIfPresent(currentUrl, "teacher", expectedTeacher);

      await page.getByRole("link", { name: /open action center|action center/i }).first().click();
      await expect(page).toHaveURL(/\/app\/analytics\/actions(?:\?.*)?$/);
      currentUrl = new URL(page.url());
      expectSearchParamIfPresent(currentUrl, "subject", expectedSubject);
      expectSearchParamIfPresent(currentUrl, "source", expectedSource);
      expectSearchParamIfPresent(currentUrl, "teacher", expectedTeacher);
    }

    const scopedResultsSearch = currentUrl.search;
    await page.goto(`/app/results${scopedResultsSearch}`);
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    currentUrl = new URL(page.url());
    expectSearchParamIfPresent(currentUrl, "subject", expectedSubject);
    expectSearchParamIfPresent(currentUrl, "source", expectedSource);
    expectSearchParamIfPresent(currentUrl, "teacher", expectedTeacher);
  });
});
