import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials } from "../helpers/auth";
import { backendAccessToken, jeeStudentCredentials, reopenExamWindow } from "../helpers/family-runtime";
import { expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";
import {
  openStudentPrimaryActionOrSkip,
  resolveStudentFamilyExamOrSkip,
  resolveTeacherFamilyExamOrSkip,
} from "../helpers/student-family";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const jeeExamCode = "DMO-JEE-FULL-01";
const jeeExamTitle = "Demo JEE Full Mock 01";

test.describe("Student mobile JEE section switching", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @mutable student can switch sections on a mobile multi-section family exam", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginWithCredentials(page, jeeStudentCredentials, "student");
    await expectStudentWorkspace(page);

    await loginWithCredentials(page, { username: "demo-teacher", password: "Demo@12345" }, "teacher");
    await expectTeacherWorkspace(page);
    const teacherExam = await resolveTeacherFamilyExamOrSkip(page, {
      familyLabel: "mobile JEE section switching",
      examCode: jeeExamCode,
      expectedTitle: jeeExamTitle,
    });
    if (!teacherExam) {
      return;
    }
    await reopenExamWindow(page, teacherExam.id, { maxAttempts: 5 });

    await loginWithCredentials(page, jeeStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const jeeExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "mobile JEE section switching",
      examCode: jeeExamCode,
      expectedTitle: jeeExamTitle,
    });
    if (!jeeExam) {
      return;
    }
    expect(jeeExam.is_multi_subject).toBe(true);
    expect(jeeExam.subject_summary?.subject_count).toBe(3);

    await page.goto(`/app/exams/${jeeExam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(jeeExamTitle, "i") }).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();

    const handoff = await openStudentPrimaryActionOrSkip(page);
    if (handoff !== "start" && handoff !== "resume") {
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
      await expect(
        page.getByText(/wait for publication|review locked|review availability|summary mode/i).first(),
      ).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
    const attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
    expect(attemptId).not.toBeNull();
    await expect(page.getByText(/test in progress/i).first()).toBeVisible();
    await expect(page.getByText(/section access/i).first()).toBeVisible();

    const sectionCards = page.locator(".attemptSectionCard");
    await expect(sectionCards).toHaveCount(6);

    await answerCurrentAttemptQuestion(page, Date.now(), "8");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

    const chemistryNumericSectionButton = page
      .locator(".attemptSectionCard")
      .filter({ hasText: /chemistry numeric/i })
      .getByRole("button", { name: /open section/i })
      .first();
    await expect(chemistryNumericSectionButton).toBeVisible();
    await chemistryNumericSectionButton.click();
    await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();

    await answerCurrentAttemptQuestion(page, 7, "7");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
    await expect(page.getByText(/test in progress/i).first()).toBeVisible();
    await expect(page.getByText(/section access/i).first()).toBeVisible();
    await expect(page.locator(".attemptSectionCard")).toHaveCount(6);
    await expect(
      page
        .locator(".attemptSectionCard")
        .filter({ has: page.getByRole("button", { name: /current section/i }) })
        .first(),
    ).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
    await expect(page.getByText(/wait for publication|review locked|review availability/i).first()).toBeVisible();
  });
});
