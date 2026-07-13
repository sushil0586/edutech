import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function selectFirstNonEmptyOption(locator: Locator) {
  const firstValue = await locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .find((value) => value.trim().length > 0) ?? null,
  );
  expect(firstValue).not.toBeNull();
  await locator.selectOption(firstValue!);
}

async function expectDashboard(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/dashboard");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByText(/institute control/i).first()).toBeVisible();
  await expect(page.getByText(/dashboard focus/i).first()).toBeVisible();
}

async function expectQuestionCreateDependencies(page: Page) {
  const programSelect = page.locator('select[name="program"]').first();
  const subjectSelect = page.locator('select[name="subject"]').first();
  await expect(subjectSelect).toBeDisabled();
  await selectFirstNonEmptyOption(programSelect);
  await expect(subjectSelect).toBeEnabled();
}

test.describe("Institute browser-only onboarding pack", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser pack keeps institute setup and roster surfaces ready for first-run operators", async ({
    page,
  }) => {
    await expectDashboard(page);

    await page.getByRole("link", { name: /open academic setup/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/academic-setup(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/people?view=teachers");
    await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^create teacher$/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/people?view=students");
    await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^create student$/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/teacher-assignments");
    await expect(page.getByRole("heading", { name: /teacher assignments/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
    await expect(page.getByText(/settings foundation is live/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /manage exam defaults/i })).toHaveAttribute(
      "href",
      "/institute/academic-setup",
    );
  });

  test("@workflow browser pack keeps institute authoring and exam surfaces stitched together", async ({
    page,
  }) => {
    await expectDashboard(page);

    await page.getByRole("link", { name: /open exams/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /preset library/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /quick create/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/new(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/exams/advanced");
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/exams/preset-packs");
    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open advanced builder/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/find questions faster/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /create question/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /create comprehension set/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /import comprehension csv/i })).toBeVisible();

    await page.getByRole("link", { name: /create question/i }).click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/new(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();
    await expectQuestionCreateDependencies(page);

    await gotoWithRuntimeRecovery(page, "/institute/question-bank/comprehension/new");
    await expect(page.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();
    await expectQuestionCreateDependencies(page);

    await gotoWithRuntimeRecovery(page, "/institute/question-bank/comprehension/import");
    await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^download template$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /preview import/i })).toBeVisible();
  });

  test("@workflow browser pack keeps institute oversight surfaces connected after onboarding", async ({
    page,
  }) => {
    await expectDashboard(page);

    await page.getByRole("link", { name: /open reviews/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expect(page.getByText(/quick triage/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/reports");
    await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
    await expect(page.getByText(/report controls/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/economy");
    await expect(page.getByRole("heading", { name: /economy oversight/i }).first()).toBeVisible();
    await expect(page.getByText(/overview filters/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/security");
    await expect(page.getByRole("heading", { name: /security oversight/i }).first()).toBeVisible();
    await expect(page.getByText(/security controls/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/search?q=exam");
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
    await expect(page.getByText(/search controls/i).first()).toBeVisible();
    await expect(page.locator('input[name="q"]').first()).toHaveValue("exam");

    await gotoWithRuntimeRecovery(page, "/institute/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute(
      "href",
      "/institute/dashboard",
    );
  });
});
