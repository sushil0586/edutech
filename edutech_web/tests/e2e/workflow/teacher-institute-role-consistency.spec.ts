import { expect, test } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const instituteCredentials = {
  username: process.env.PLAYWRIGHT_OPBMS_USERNAME?.trim() || "opbms",
  password: process.env.PLAYWRIGHT_OPBMS_PASSWORD?.trim() || "Demo@12345",
};

const teacherCredentials = {
  username: process.env.PLAYWRIGHT_TEACHER_USERNAME?.trim() || "demo-teacher",
  password: process.env.PLAYWRIGHT_TEACHER_PASSWORD?.trim() || "Demo@12345",
};

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
    await expect(institutePage.getByRole("link", { name: /create question/i }).first()).toBeVisible();

    await loginWithCredentials(teacherPage, teacherCredentials, "teacher");
    await expectTeacherWorkspace(teacherPage);
    await teacherPage.goto("/teacher/question-bank");
    await expect(teacherPage.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(teacherPage.getByText(/find questions faster/i).first()).toBeVisible();
    await expect(teacherPage.getByText(/how licensed platform questions work here/i).first()).toBeVisible();
    await expect(teacherPage.getByRole("link", { name: /import questions csv/i }).first()).toBeVisible();
    await expect(teacherPage.getByRole("link", { name: /create question/i }).first()).toBeVisible();

    await expect(institutePage.getByText(/open shared library linker/i).first()).toBeVisible();
    await expect(teacherPage.getByText(/shared platform library/i).first()).toBeVisible();
    await expect(teacherPage.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
    await expect(teacherPage.getByText(/teachers do not link licensed questions directly here/i).first()).toBeVisible();

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
    await teacherPage.getByRole("link", { name: /open exam/i }).first().click();
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
      await expect(page.getByText(/^exam actions$/i).first()).toBeVisible();
      await expect(page.getByText(/^exam configuration$/i).first()).toBeVisible();
      await expect(page.getByText(/^student access and stars$/i).first()).toBeVisible();
      await expect(page.getByText(/^publish history$/i).first()).toBeVisible();
    }

    await institutePage.close();
    await teacherPage.close();
  });
});
