import { expect, Page, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

async function expectRedirectToLogin(pathname: string, page: Page) {
  await page.goto(pathname);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /sign-in|welcome back/i }).first()).toBeVisible();
}

async function expectBlockedRoleRedirect(pathname: string, allowedTargets: RegExp[], page: Page) {
  await page.goto(pathname);
  await expect
    .poll(() => page.url(), {
      message: `Expected blocked access redirect for ${pathname}`,
    })
    .toMatch(new RegExp(allowedTargets.map((pattern) => pattern.source).join("|")));
}

test.describe("Role and access control", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test("anonymous user is redirected from institute results to login", async ({ page }) => {
    await expectRedirectToLogin("/institute/results", page);
  });

  test("anonymous user is redirected from teacher question bank to login", async ({ page }) => {
    await expectRedirectToLogin("/teacher/question-bank", page);
  });

  test("anonymous user is redirected from student exams to login", async ({ page }) => {
    await expectRedirectToLogin("/app/exams", page);
  });

  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");
  test("teacher session cannot open student or institute-only workspaces", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectBlockedRoleRedirect(
      "/app/exams",
      [/\/login(?:\?|$)/, /\/teacher\/dashboard(?:\?|$)/],
      page,
    );
    await expectBlockedRoleRedirect(
      "/institute/results",
      [/\/login(?:\?|$)/, /\/teacher\/dashboard(?:\?|$)/],
      page,
    );
  });

  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");
  test("student session cannot open teacher or institute-only workspaces", async ({ page }) => {
    await loginAsRole(page, "student");
    await expectBlockedRoleRedirect(
      "/teacher/question-bank",
      [/\/login(?:\?|$)/, /\/app\/dashboard(?:\?|$)/],
      page,
    );
    await expectBlockedRoleRedirect(
      "/institute/results",
      [/\/login(?:\?|$)/, /\/app\/dashboard(?:\?|$)/],
      page,
    );
  });

  test("browser session can switch cleanly between teacher and student workspaces", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await page.goto("/app/exams");
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await page.goto("/teacher/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i }).first()).toBeVisible();
  });

  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");
  test("institute session cannot open student exams", async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectBlockedRoleRedirect(
      "/app/exams",
      [/\/login(?:\?|$)/, /\/institute\/dashboard(?:\?|$)/],
      page,
    );
  });
});
