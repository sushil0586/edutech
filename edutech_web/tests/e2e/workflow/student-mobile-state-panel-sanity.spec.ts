import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

const missingExamId = "00000000-0000-0000-0000-000000000000";
const missingAttemptId = "00000000-0000-0000-0000-000000000000";

test.describe("Student mobile state-panel sanity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow student mobile viewport keeps fallback state panels truthful for unavailable exam and attempt routes", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto(`/app/exams/${missingExamId}`);
    await expect(page).toHaveURL(/\/app\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam detail/i }).first()).toBeVisible();
    await expect(
      page.getByText(/exam detail could not be loaded|this exam is not available in your workspace/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/backend connectivity|student assignment scope|exam visibility policy/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /back to exams/i }).first()).toBeVisible();

    await page.goto(`/app/attempts/${missingAttemptId}/summary`);
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /attempt summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt summary could not be loaded/i).first()).toBeVisible();
    await expect(page.getByText(/backend connectivity/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();

    await page.goto(`/app/attempts/${missingAttemptId}/review`);
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /attempt review/i }).first()).toBeVisible();
    await expect(
      page.getByText(/attempt review is not available right now|waiting for review access/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/review availability rules|attempt review endpoint/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /check result status/i }).first()).toBeVisible();
  });
});
