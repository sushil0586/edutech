import { expect, test } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, loginWithCredentials } from "../helpers/auth";
import { reopenExamWindow } from "../helpers/family-runtime";
import {
  openStudentPrimaryActionOrSkip,
  resolveStudentFamilyExamOrSkip,
  resolveTeacherFamilyExamOrSkip,
} from "../helpers/student-family";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const greStudentCredentials = {
  username: "demo-gre-student",
  password: "Demo@12345",
};

const mutableStudentGreLifecycleEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

const greExamCode = "DMO-GRE-QUANT-01";
const greExamTitle = "Demo GRE Quant Drill 01";

test.describe("Student GRE quant lifecycle", () => {
  test.skip(
    !mutableStudentGreLifecycleEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
      "seeded GRE quant lifecycle coverage",
    ),
  );

  test("@workflow @mutable gre student can start a seeded quant drill, move sections, and submit into controlled release state", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    const teacherExam = await resolveTeacherFamilyExamOrSkip(page, {
      familyLabel: "GRE quant lifecycle",
      examCode: greExamCode,
      expectedTitle: greExamTitle,
    });
    if (!teacherExam) {
      return;
    }
    await reopenExamWindow(page, teacherExam.id, { maxAttempts: 5 });

    await loginWithCredentials(page, greStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const greExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "GRE quant lifecycle",
      examCode: greExamCode,
      expectedTitle: greExamTitle,
    });
    if (!greExam) {
      return;
    }
    expect(greExam.is_multi_subject).toBe(false);
    expect(greExam.subject_summary?.subject_count).toBe(1);

    await page.goto(`/app/exams/${greExam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(greExamTitle, "i") }).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();

    const handoff = await openStudentPrimaryActionOrSkip(page);
    if (handoff !== "start" && handoff !== "resume") {
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/(summary|review)(?:\?.*)?$/);
      return;
    }

    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/test in progress/i).first()).toBeVisible();
    await expect(page.getByText(/test summary|overall progress/i).first()).toBeVisible();
    await expect(page.getByText(/section access/i).first()).toBeVisible();
    await expect(page.getByText(/fullscreen required/i).first()).toBeVisible();

    const attemptUrl = page.url();
    const attemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
    expect(attemptId).not.toBeNull();

    await answerCurrentAttemptQuestion(page, Date.now(), "8");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully|answer saved|last confirmed backend response/i).first()).toBeVisible();

    const quantSectionTwoButton = page
      .locator(".attemptSectionCard")
      .filter({ has: page.getByText(/quant section 2/i) })
      .getByRole("button", { name: /open section/i })
      .first();

    if (await quantSectionTwoButton.isVisible().catch(() => false)) {
      await quantSectionTwoButton.click();
      await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();
      await answerCurrentAttemptQuestion(page, Date.now() + 1, "20");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/response updated successfully|answer saved|last confirmed backend response/i).first()).toBeVisible();
    }

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^(submit test|end test)$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
    await expect(page.getByText(/wait for publication/i).first()).toBeVisible();
    await expect(page.getByText(/review locked|review availability|review depends on/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /check result status/i }).first()).toBeVisible();

    await page.goto("/app/results?result_status=pending");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    const pendingResultRow = page.locator(".studentResultsTable tbody tr").filter({
      hasText: new RegExp(greExamTitle, "i"),
    }).first();
    await expect(pendingResultRow).toBeVisible();
    await expect(pendingResultRow).toContainText(/pending/i);
    await expect(pendingResultRow).toContainText(/awaiting result|open practice/i);
  });
});
