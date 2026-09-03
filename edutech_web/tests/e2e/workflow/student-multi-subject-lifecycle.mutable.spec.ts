import { expect, test } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace } from "../helpers/navigation";
import {
  openStudentPrimaryActionOrSkip,
  resolveStudentFamilyExamOrSkip,
} from "../helpers/student-family";

const mutableStudentMultiSubjectLifecycleEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

const multiSubjectPracticeExamCode = "DMO-MIX-PRACTICE-01";
const multiSubjectPracticeExamTitle = "Demo Multi Subject Practice Loop";

test.describe("Student mutable multi-subject lifecycle", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are required.");

  test.skip(
    !mutableStudentMultiSubjectLifecycleEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
      "seeded multi-subject practice lifecycle coverage",
    ),
  );

  test("@workflow @mutable student can run a real mixed-subject practice attempt and see the result land", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const practiceExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "multi-subject practice lifecycle",
      examCode: multiSubjectPracticeExamCode,
      expectedTitle: multiSubjectPracticeExamTitle,
    });
    if (!practiceExam) {
      return;
    }
    expect(practiceExam.is_multi_subject).toBe(true);
    expect(practiceExam.subject_summary?.subject_count).toBe(3);

    await page.goto(`/app/exams/${practiceExam.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(multiSubjectPracticeExamTitle, "i") }).first()).toBeVisible();
    await expect(page.getByText(practiceExam.subject_summary!.display_label!).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();

    const handoff = await openStudentPrimaryActionOrSkip(page);
    if (handoff !== "start" && handoff !== "resume") {
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/(summary|review)(?:\?.*)?$/);
      return;
    }

    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();
    await expect(page.getByText(/section access/i).first()).toBeVisible();

    const attemptUrl = page.url();
    const attemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
    expect(attemptId).not.toBeNull();

    const sectionCards = page.locator(".attemptSectionCard");
    if (await sectionCards.count()) {
      await expect(sectionCards).toHaveCount(3);
    }

    await answerCurrentAttemptQuestion(page, Date.now(), "Playwright mixed subject answer");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(
      page.getByText(/response updated successfully|answer saved|last confirmed backend response|responses saved/i).first(),
    ).toBeVisible();

    const nextSectionButton = page
      .locator(".attemptSectionCard")
      .filter({ has: page.getByText(/physics section/i) })
      .getByRole("button", { name: /open section/i })
      .first();

    if (await nextSectionButton.isVisible().catch(() => false)) {
      await nextSectionButton.click();
      await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();
      await answerCurrentAttemptQuestion(page, Date.now() + 1, "Playwright mixed subject answer");
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
    await expect(page.getByText(/review/i).first()).toBeVisible();

    await page.goto("/app/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(new RegExp(multiSubjectPracticeExamTitle, "i")).first()).toBeVisible();
    const seededResultRow = page.locator(".studentResultsTable tbody tr").filter({
      hasText: new RegExp(multiSubjectPracticeExamCode, "i"),
    }).first();
    await expect(seededResultRow).toBeVisible();
    await expect(seededResultRow).toContainText(/pass|published/i);
    await expect(seededResultRow).toContainText(/available|practice again/i);
  });
});
