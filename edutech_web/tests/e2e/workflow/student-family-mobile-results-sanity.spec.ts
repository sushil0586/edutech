import { expect, test, type Page } from "@playwright/test";
import type { StudentResult } from "@/features/dashboard/types";
import { loginWithCredentials } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const families = [
  {
    label: "NEET",
    credentials: {
      username: "demo-neet-student",
      password: "Demo@12345",
    },
    resultExamCode: "DMO-NEET-RESULT-01",
  },
  {
    label: "JEE",
    credentials: {
      username: "demo-jee-student",
      password: "Demo@12345",
    },
    resultExamCode: "DMO-JEE-RESULT-01",
  },
] as const;

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

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  }).first();
}

test.describe("Student family mobile results sanity", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  for (const family of families) {
    test(`@workflow ${family.label} seeded result stays reachable on a mobile-sized viewport`, async ({
      page,
    }) => {
      await loginWithCredentials(page, family.credentials, "student");
      await expectStudentWorkspace(page);

      const results = await fetchStudentResults(page);
      const familyResult = results.find((item) => item.exam_code === family.resultExamCode) ?? null;
      expect(familyResult).not.toBeNull();

      await page.goto("/app/results");
      await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(
        page.getByText(/results recovery loop|mock recovery loop/i).first(),
      ).toBeVisible();

      const familyResultCard = resultCardByTitle(page, familyResult!.exam_title);
      await expect(familyResultCard).toBeVisible();
      await expect(familyResultCard.getByText(/result published|pending/i).first()).toBeVisible();
      await expect(
        familyResultCard.getByRole("link", { name: /open summary|check attempt status/i }).first(),
      ).toBeVisible();

      await familyResultCard.getByRole("link", { name: /open summary|check attempt status/i }).first().click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
      await expect(page.getByText(/recommended actions/i).first()).toBeVisible();

      const reviewLink = page.getByRole("link", { name: /open answer review|review feedback/i }).first();
      if (familyResult!.review_available && (await reviewLink.isVisible().catch(() => false))) {
        await reviewLink.click();
        await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
        const reviewModeHeading = page.getByText(/review mode/i).first();
        if (await reviewModeHeading.isVisible().catch(() => false)) {
          await expect(reviewModeHeading).toBeVisible();
        } else {
          await expect(
            page.getByText(/review not available|review unavailable/i).first(),
          ).toBeVisible();
          await expect(page.getByText(/check result visibility/i).first()).toBeVisible();
        }
      } else {
        await expect(page.getByText(/review locked|review not available/i).first()).toBeVisible();
      }
    });
  }
});
