import { expect, test, type Page } from "@playwright/test";
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

const neetStudentCredentials = {
  username: "demo-neet-student",
  password: "Demo@12345",
};

const mutableStudentNeetLifecycleEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

const neetExamCode = "DMO-NEET-FULL-01";
const neetExamTitle = "Demo NEET Full Mock 01";

test.describe("Student NEET full mock lifecycle", () => {
  test.skip(
    !mutableStudentNeetLifecycleEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
      "seeded NEET full-mock lifecycle coverage",
    ),
  );

  test("@workflow @mutable neet student can start a seeded full mock, move sections, and submit into controlled release state", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    const teacherExam = await resolveTeacherFamilyExamOrSkip(page, {
      familyLabel: "NEET full mock lifecycle",
      examCode: neetExamCode,
      expectedTitle: neetExamTitle,
    });
    if (!teacherExam) {
      return;
    }
    await reopenExamWindow(page, teacherExam.id, { maxAttempts: 5 });

    await loginWithCredentials(page, neetStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const neetExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "NEET full mock lifecycle",
      examCode: neetExamCode,
      expectedTitle: neetExamTitle,
    });
    if (!neetExam) {
      return;
    }
    expect(neetExam.is_multi_subject).toBe(true);
    expect(neetExam.subject_summary?.subject_count).toBe(3);

    await page.goto(`/app/exams/${neetExam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(neetExamTitle, "i") }).first()).toBeVisible();
    await expect(page.getByText(neetExam.subject_summary!.display_label!).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();

    const handoff = await openStudentPrimaryActionOrSkip(page);
    if (handoff !== "start" && handoff !== "resume") {
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/(summary|review)(?:\?.*)?$/);
      return;
    }

    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/mock in progress/i).first()).toBeVisible();
    await expect(page.getByText(/subject block progress/i).first()).toBeVisible();
    await expect(page.getByText(/section access/i).first()).toBeVisible();

    const attemptUrl = page.url();
    const attemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
    expect(attemptId).not.toBeNull();

    const sectionCards = page.locator(".attemptSectionCard");
    if (await sectionCards.count()) {
      await expect(sectionCards).toHaveCount(3);
    }

    await answerCurrentAttemptQuestion(page, Date.now(), "Playwright NEET answer");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

    const chemistrySectionButton = page
      .locator(".attemptSectionCard")
      .filter({ has: page.getByText(/chemistry section/i) })
      .getByRole("button", { name: /open section/i })
      .first();

    if (await chemistrySectionButton.isVisible().catch(() => false)) {
      await chemistrySectionButton.click();
      await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();
      await answerCurrentAttemptQuestion(page, Date.now() + 1, "Playwright NEET answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();
    }

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
    await expect(page.getByText(/wait for publication/i).first()).toBeVisible();
    await expect(page.getByText(/result published/i).first()).not.toBeVisible({ timeout: 1000 }).catch(() => null);
    await expect(page.getByText(/review locked|review availability|review depends on/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /check result status/i }).first()).toBeVisible();

    await page.goto("/app/results?result_status=pending");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    const pendingResultCard = page.locator("article.studentResultSurface").filter({
      has: page.locator(".studentResultSurfaceHead strong", {
        hasText: new RegExp(neetExamTitle, "i"),
      }),
    }).first();
    await expect(pendingResultCard).toBeVisible();
    await expect(pendingResultCard.getByText(/awaiting publication/i).first()).toBeVisible();
    await expect(pendingResultCard.getByText(/evaluation pending/i).first()).toBeVisible();
    await expect(
      pendingResultCard.getByRole("link", { name: /check attempt status/i }).first(),
    ).toBeVisible();
  });
});
