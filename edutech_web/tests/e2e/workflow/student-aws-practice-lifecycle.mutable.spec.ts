import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const awsStudentCredentials = {
  username: "demo-aws-student",
  password: "Demo@12345",
};

const mutableStudentAwsLifecycleEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

const awsExamCode = "DMO-AWS-PRACTICE-01";
const awsExamTitle = "Demo AWS Practitioner Practice 01";

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
  return (await response.json()) as Array<{
    id: string;
    code: string;
    title: string;
  }>;
}

test.describe("Student AWS practice lifecycle", () => {
  test.skip(
    !mutableStudentAwsLifecycleEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
      "seeded AWS practice lifecycle coverage",
    ),
  );

  test("@workflow @mutable aws student can start a seeded practice set and see truthful post-submit practice messaging", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginWithCredentials(page, awsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const awsExam = exams.find((exam) => exam.code === awsExamCode) ?? null;
    expect(awsExam).not.toBeNull();
    expect(awsExam!.title).toBe(awsExamTitle);

    await page.goto(`/app/exams/${awsExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(awsExamTitle, "i") }).first()).toBeVisible();

    const primaryActionCard = page.locator("article").filter({
      has: page.getByText(/primary action/i),
    }).first();
    const resumeLink = page.getByRole("link", { name: /^resume$/i }).first();
    const startButton = primaryActionCard.getByRole("button", { name: /^start$/i }).first();
    if (await resumeLink.isVisible().catch(() => false)) {
      await resumeLink.click();
    } else {
      await expect(startButton).toBeVisible();
      await startButton.click();
    }

    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/test in progress/i).first()).toBeVisible();

    const attemptUrl = page.url();
    const attemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
    expect(attemptId).not.toBeNull();

    await answerCurrentAttemptQuestion(page, Date.now(), "aws practice");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
    await expect(page.getByText(/review feedback|instant feedback ready|review available/i).first()).toBeVisible();

    await page.goto(`/app/attempts/${attemptId}/review`);
    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
    await expect(page.getByRole("heading", { name: /attempt review/i }).first()).toBeVisible();
    await expect(page.getByText(/review not available|review unavailable/i).first()).toBeVisible();
    await expect(page.getByText(/check result visibility/i).first()).toBeVisible();
  });
});
