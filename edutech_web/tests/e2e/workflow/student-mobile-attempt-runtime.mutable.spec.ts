import { expect, test } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  backendAccessToken,
  awsStudentCredentials,
} from "../helpers/family-runtime";
import { expectStudentWorkspace } from "../helpers/navigation";
import type { StudentAvailableExam } from "@/features/dashboard/types";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);
const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);

test.describe("Student mobile attempt runtime continuity", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
      "student mobile attempt runtime continuity coverage",
    ),
  );

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @mutable student can start, resume, switch sections, and submit a mobile family exam", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const awsExamCode = "DMO-AWS-PRACTICE-01";
    const awsExamTitle = "Demo AWS Practitioner Practice 01";

    await loginWithCredentials(page, awsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const accessToken = await backendAccessToken(page);
    const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    expect(response.ok()).toBe(true);
    const exams = (await response.json()) as StudentAvailableExam[];
    const awsExam = exams.find((exam) => exam.code === awsExamCode) ?? null;
    expect(awsExam).not.toBeNull();
    expect(awsExam!.title).toBe(awsExamTitle);

    await page.goto(`/app/exams/${awsExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(awsExamTitle, "i") }).first()).toBeVisible();
    await expect(page.getByText(/certification/i).first()).toBeVisible();

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
    const attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
    expect(attemptId).not.toBeNull();
    await expect(page.getByText(/test in progress/i).first()).toBeVisible();
    await expect(page.getByText(/attempt progress/i).first()).toBeVisible();
    await expect(page.getByText(/save & recovery status/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^save answer$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^submit test$/i })).toBeVisible();

    await answerCurrentAttemptQuestion(page, Date.now(), "Mobile runtime first answer");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully|responses saved/i).first()).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
    await expect(page.getByText(/review feedback|instant feedback ready|review available/i).first()).toBeVisible();
  });
});
