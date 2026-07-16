import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials } from "../helpers/auth";
import {
  awsStudentCredentials,
  backendBaseUrl,
  escapeRegExp,
} from "../helpers/family-runtime";
import { expectStudentWorkspace } from "../helpers/navigation";

type StudentAvailableExam = {
  id: string;
  code: string;
  title: string;
};

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchStudentAvailableExams(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentAvailableExam[];
}

async function openAttemptFromExamDetail(page: Page, examId: string, examTitle: string) {
  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();

  const resumeLink = page.getByRole("link", { name: /^resume$/i }).first();
  const startButton = page.getByRole("button", { name: /^start$/i }).first();
  if (await resumeLink.isVisible().catch(() => false)) {
    await resumeLink.click();
  } else {
    await startButton.click();
  }

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
  const attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
  expect(attemptId).not.toBeNull();
  return attemptId!;
}

async function saveAndSubmitAttempt(page: Page, examTitle: string, answerSeed: number, prefix: string) {
  await answerCurrentAttemptQuestion(page, answerSeed, prefix);
  const saveButton = page.getByRole("button", { name: /^save answer$/i }).first();
  if (await saveButton.isVisible().catch(() => false)) {
    await saveButton.click();
    await expect(page.getByText(/response updated successfully|responses saved/i).first()).toBeVisible();
  }

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^submit test$/i }).click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: new RegExp(`${escapeRegExp(examTitle)}\\s+Summary`, "i") }).first(),
  ).toBeVisible();
}

test.describe("Student mobile post-submit visual", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @visual student mobile summary and review stay readable after submission", async ({
    page,
  }) => {
    const awsExamCode = "DMO-AWS-PRACTICE-01";
    const awsExamTitle = "Demo AWS Practitioner Practice 01";

    await loginWithCredentials(page, awsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const awsExam = exams.find((exam) => exam.code === awsExamCode) ?? null;
    expect(awsExam).not.toBeNull();

    const attemptId = await openAttemptFromExamDetail(page, awsExam!.id, awsExamTitle);
    await saveAndSubmitAttempt(page, awsExamTitle, Date.now(), "student mobile review visual");

    await expect(page.locator("main")).toHaveScreenshot("student-mobile-summary-review-ready.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 200,
      mask: [page.locator(".studentPageHeader").first(), page.locator(".studentInsightHeroCard").first()],
    });

    await page.goto(`/app/attempts/${attemptId}/review`);
    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
    await expect(page.locator("main")).toHaveScreenshot("student-mobile-review-ready.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 200,
      mask: [page.locator(".studentPageHeader").first(), page.locator(".studentInsightHeroCard").first()],
    });
  });
});
