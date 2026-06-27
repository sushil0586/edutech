import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

test.describe("Teacher exam detail workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can inspect exam detail readiness and delivery control panels", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open exam/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/]+(?:\?.*)?$/);

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

    await expect(page.getByRole("link", { name: /^open builder$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /link questions/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to exams/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh status/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sync marks/i }).first()).toBeVisible();
  });
});
