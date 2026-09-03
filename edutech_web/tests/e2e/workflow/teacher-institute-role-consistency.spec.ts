import { expect, test } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const instituteCredentials = {
  username: process.env.PLAYWRIGHT_OPBMS_USERNAME?.trim() || "demo-institute-admin",
  password: process.env.PLAYWRIGHT_OPBMS_PASSWORD?.trim() || "Demo@12345",
};

const teacherCredentials = {
  username: process.env.PLAYWRIGHT_TEACHER_USERNAME?.trim() || "demo-teacher",
  password: process.env.PLAYWRIGHT_TEACHER_PASSWORD?.trim() || "Demo@12345",
};

async function selectFirstNonEmptyOption(
  locator: import("@playwright/test").Locator,
) {
  const values = await locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  const firstValue = values[0] ?? null;
  expect(firstValue).not.toBeNull();
  await locator.selectOption(firstValue!);
}

test.describe("Teacher and institute role consistency", () => {
  test("@workflow institute and teacher preserve the shared question-bank, exam-detail, and results contract", async ({
    browser,
  }) => {
    const institutePage = await browser.newPage();
    const teacherPage = await browser.newPage();

    await loginWithCredentials(institutePage, instituteCredentials, "institute");
    await expectInstituteWorkspace(institutePage);
    await institutePage.goto("/institute/question-bank");
    await expect(institutePage.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(institutePage.getByText(/find questions faster/i).first()).toBeVisible();
    await expect(institutePage.getByText(/why questions are or are not visible/i).first()).toBeVisible();
    await expect(institutePage.getByRole("link", { name: /import questions csv/i }).first()).toBeVisible();
    await expect(institutePage.getByRole("link", { name: /import comprehension csv/i }).first()).toBeVisible();
    await expect(institutePage.getByRole("link", { name: /create question/i }).first()).toBeVisible();
    await expect(institutePage.getByRole("link", { name: /create comprehension set/i }).first()).toBeVisible();

    await loginWithCredentials(teacherPage, teacherCredentials, "teacher");
    await expectTeacherWorkspace(teacherPage);
    await teacherPage.goto("/teacher/question-bank");
    await expect(teacherPage.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(teacherPage.getByText(/find questions faster/i).first()).toBeVisible();
    await expect(teacherPage.getByText(/how licensed platform questions work here/i).first()).toBeVisible();
    await expect(
      teacherPage.getByText(
        /this panel answers three operator questions quickly: can teachers see platform questions, can they act on them, and who owns the final linking step/i,
      ).first(),
    ).toBeVisible();
    await expect(teacherPage.getByRole("link", { name: /import questions/i }).first()).toBeVisible();
    await expect(teacherPage.getByRole("link", { name: /import comprehension/i }).first()).toBeVisible();
    await expect(teacherPage.getByRole("link", { name: /new question/i }).first()).toBeVisible();
    await expect(teacherPage.getByRole("link", { name: /new comprehension set/i }).first()).toBeVisible();
    await expect(institutePage.locator("form.questionBankBulkBar").first()).toBeVisible();
    await expect(teacherPage.locator("form.questionBankBulkBar").first()).toBeVisible();

    await institutePage.getByRole("link", { name: /create question/i }).first().click();
    await teacherPage.goto("/teacher/question-bank/new", { waitUntil: "domcontentloaded" });
    await expect(institutePage).toHaveURL(/\/institute\/question-bank\/new(?:\?.*)?$/);
    await expect(teacherPage).toHaveURL(/\/teacher\/question-bank\/new(?:\?.*)?$/);
    await expect(institutePage.getByRole("heading", { name: /create question/i }).first()).toBeVisible();
    await expect(teacherPage.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

    const instituteQuestionProgram = institutePage.locator('select[name="program"]');
    const instituteQuestionSubject = institutePage.locator('select[name="subject"]');
    const teacherQuestionProgram = teacherPage.locator('select[name="program"]');
    const teacherQuestionSubject = teacherPage.locator('select[name="subject"]');
    await expect(instituteQuestionSubject).toBeDisabled();
    await expect(teacherQuestionSubject).toBeDisabled();
    await selectFirstNonEmptyOption(instituteQuestionProgram);
    await selectFirstNonEmptyOption(teacherQuestionProgram);
    await expect(instituteQuestionSubject).toBeEnabled();
    await expect(teacherQuestionSubject).toBeEnabled();

    await institutePage.goto("/institute/question-bank");
    await teacherPage.goto("/teacher/question-bank");
    await institutePage.getByRole("link", { name: /create comprehension set/i }).first().click();
    await expect(teacherPage.getByRole("link", { name: /new comprehension set/i }).first()).toBeVisible();
    await teacherPage.goto("/teacher/question-bank/comprehension/new");
    await expect(institutePage).toHaveURL(/\/institute\/question-bank\/comprehension\/new(?:\?.*)?$/);
    await expect(teacherPage).toHaveURL(/\/teacher\/question-bank\/comprehension\/new(?:\?.*)?$/);
    await expect(institutePage.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();
    await expect(teacherPage.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();
    await expect(institutePage.getByText(/linked questions/i).first()).toBeVisible();
    await expect(teacherPage.getByText(/linked questions/i).first()).toBeVisible();

    const instituteComprehensionProgram = institutePage.locator('select[name="program"]');
    const instituteComprehensionSubject = institutePage.locator('select[name="subject"]');
    const teacherComprehensionProgram = teacherPage.locator('select[name="program"]');
    const teacherComprehensionSubject = teacherPage.locator('select[name="subject"]');
    await expect(instituteComprehensionSubject).toBeDisabled();
    await expect(teacherComprehensionSubject).toBeDisabled();
    await selectFirstNonEmptyOption(instituteComprehensionProgram);
    await selectFirstNonEmptyOption(teacherComprehensionProgram);
    await expect(instituteComprehensionSubject).toBeEnabled();
    await expect(teacherComprehensionSubject).toBeEnabled();

    await institutePage.goto("/institute/question-bank");
    await teacherPage.goto("/teacher/question-bank");

    await expect(institutePage.getByText(/open shared library linker/i).first()).toBeVisible();
    await expect(institutePage.getByRole("link", { name: /open linked questions/i }).first()).toBeVisible();
    await expect(teacherPage.getByText(/shared platform library/i).first()).toBeVisible();
    await expect(teacherPage.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
    await expect(teacherPage.getByRole("button", { name: /bulk link current lane/i })).toHaveCount(0);
    await expect(
      teacherPage.getByText(
        /teachers do not perform the final link here|the teacher lane stays request-only and the institute admin still approves or performs the intake step/i,
      ).first(),
    ).toBeVisible();
    await expect(teacherPage.getByText(/teacher role in licensed intake/i).first()).toBeVisible();
    await expect(
      teacherPage.getByText(/institute admins complete the final linking step in shared library linker/i).first(),
    ).toBeVisible();

    await institutePage.goto("/institute/question-bank/linked");
    await expect(institutePage.getByRole("heading", { name: /linked questions/i }).first()).toBeVisible();
    await expect(institutePage.getByText(/current lane:\s*linked questions/i).first()).toBeVisible();
    await expect(institutePage.getByText(/current linked view/i).first()).toBeVisible();
    await expect(institutePage.locator("form.questionBankBulkBar")).toHaveCount(0);
    await expect(
      institutePage.getByText(/bulk tools are hidden in linked review mode/i).first(),
    ).toBeVisible();
    await expect(
      institutePage.getByRole("link", { name: /open shared library linker/i }).first(),
    ).toBeVisible();
    await expect(
      institutePage.getByRole("link", { name: /create editable local question/i }).first(),
    ).toBeVisible();

    await institutePage.goto("/institute/question-bank");
    await expect(institutePage.getByText(/licensed intake shortcut/i).first()).toBeVisible();
    await expect(
      institutePage.getByText(/teachers can inspect licensed source rows and raise requests from their workspace, but they do not perform the final link/i).first(),
    ).toBeVisible();

    await institutePage.goto("/institute/results");
    await expect(institutePage.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(institutePage.getByText(/^exam publish readiness$/i).first()).toBeVisible();
    await expect(institutePage.getByText(/^result publish readiness$/i).first()).toBeVisible();

    await teacherPage.goto("/teacher/results");
    await expect(teacherPage.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(teacherPage.getByText(/^exam publish readiness$/i).first()).toBeVisible();
    await expect(teacherPage.getByText(/^result publish readiness$/i).first()).toBeVisible();

    await institutePage.goto("/institute/exams");
    await teacherPage.goto("/teacher/exams");
    await expect(institutePage.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(teacherPage.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await institutePage.getByRole("link", { name: /open exam/i }).first().click();
    await teacherPage.getByRole("link", { name: /open exam|view exam/i }).first().click();
    await expect(institutePage).toHaveURL(/\/institute\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(teacherPage).toHaveURL(/\/teacher\/exams\/[^/?#]+(?:\?.*)?$/);

    for (const page of [institutePage, teacherPage]) {
      await expect(page.getByText(/^exam code$/i).first()).toBeVisible();
      await expect(page.getByText(/^questions$/i).first()).toBeVisible();
      await expect(page.getByText(/^assigned students$/i).first()).toBeVisible();
      await expect(page.getByText(/^exam access key$/i).first()).toBeVisible();
      await expect(page.getByText(/^result status$/i).first()).toBeVisible();
      await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
      await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();
      await expect(page.getByText(/^exam actions$|^delivery actions$/i).first()).toBeVisible();
      await expect(page.getByText(/^exam configuration$/i).first()).toBeVisible();
      await expect(page.getByText(/^student access and stars$/i).first()).toBeVisible();
      await expect(page.getByText(/^publish history$/i).first()).toBeVisible();
    }

    await expect(institutePage.getByText(/^exam readiness$/i).first()).toBeVisible();
    await expect(institutePage.getByText(/^hard blockers$/i).first()).toBeVisible();
    await expect(institutePage.getByText(/^already ready$/i).first()).toBeVisible();
    await expect(teacherPage.getByText(/^exam readiness$/i)).toHaveCount(0);
    await expect(teacherPage.getByText(/^hard blockers$/i)).toHaveCount(0);
    await expect(teacherPage.getByText(/^already ready$/i)).toHaveCount(0);

    await institutePage.close();
    await teacherPage.close();
  });
});
