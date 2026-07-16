import { expect, test } from "@playwright/test";
import { loginWithCredentials, type DirectLoginCredentials } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";
import { expectStudentWorkspaceContext, selectStudentWorkspaceContext } from "../helpers/student-topbar";

const opbmsStudentCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_OPBMS_STUDENT_USERNAME?.trim() || "a001",
  password: process.env.PLAYWRIGHT_OPBMS_STUDENT_PASSWORD?.trim() || "Ansh@1789",
};

test.describe("Student OPBMS filter continuity", () => {
  test("@workflow student topbar source and subject context persists across core workspace pages", async ({
    page,
  }) => {
    await loginWithCredentials(page, opbmsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/exams");
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /tests|exam/i }).first()).toBeVisible();

    await selectStudentWorkspaceContext(page, {
      source: "institute",
      subject: "Math",
    });

    await expectStudentWorkspaceContext(page, {
      source: "Institute",
      subject: "Math",
    });
    await expect(page.getByRole("heading", { name: /math mock tests/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/app/practice");
    await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
    await expectStudentWorkspaceContext(page, {
      source: "Institute",
      subject: "Math",
    });

    await gotoWithRuntimeRecovery(page, "/app/results");
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expectStudentWorkspaceContext(page, {
      source: "Institute",
      subject: "Math",
    });

    await gotoWithRuntimeRecovery(page, "/app/attempts");
    await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
    await expectStudentWorkspaceContext(page, {
      source: "Institute",
      subject: "Math",
    });
  });
});
