import { expect, test } from "@playwright/test";
import { expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";
import {
  completeStudentProfile,
  completeTeacherProfile,
  registerBaseRole,
} from "../helpers/registration";

test.describe("Public registration onboarding completion", () => {
  test("@workflow @mutable public student signup can complete onboarding and enter the student workspace", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const identity = await registerBaseRole(page, "student");

    await expect(page).toHaveURL(/\/complete-profile/);
    await expect(page.getByText(/complete profile|class level|exam interest/i).first()).toBeVisible();
    await completeStudentProfile(page);

    await expect
      .poll(() => /\/app(\/|$)/.test(new URL(page.url()).pathname), { timeout: 30000 })
      .toBe(true);
    await expectStudentWorkspace(page);

    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();
    await expect(page.getByText(identity.email).first()).toBeVisible();
  });

  test("@workflow @mutable public teacher signup can complete onboarding and enter the teacher workspace", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const identity = await registerBaseRole(page, "teacher");

    await expect(page).toHaveURL(/\/complete-profile/);
    await expect(page.getByText(/complete profile|teaching focus|teaching scope/i).first()).toBeVisible();
    await completeTeacherProfile(page);

    await expect
      .poll(() => /\/teacher(\/|$)/.test(new URL(page.url()).pathname), { timeout: 30000 })
      .toBe(true);
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/dashboard");
    await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();
    await expect(page.getByText(identity.email).first()).toBeVisible();
  });
});
