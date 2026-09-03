import { expect, test } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials } from "../helpers/auth";
import { openStudentPrimaryActionOrSkip, resolveStudentFamilyExamOrSkip } from "../helpers/student-family";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace } from "../helpers/navigation";

const awsStudentCredentials = {
  username: "demo-aws-student",
  password: "Demo@12345",
};

const mutableStudentAwsLifecycleEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

const awsExamCode = "DMO-AWS-PRACTICE-01";
const awsExamTitle = "Demo AWS Practitioner Practice 01";

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

    const awsExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "AWS practice lifecycle",
      examCode: awsExamCode,
      expectedTitle: awsExamTitle,
    });
    if (!awsExam) {
      return;
    }

    await page.goto(`/app/exams/${awsExam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(awsExamTitle, "i") }).first()).toBeVisible();

    const handoff = await openStudentPrimaryActionOrSkip(page);
    if (handoff !== "start" && handoff !== "resume") {
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/(summary|review)(?:\?.*)?$/);
      return;
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
