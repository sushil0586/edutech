import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectInstituteResultsAttemptsWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/institute\/results\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  await expect(page.getByText(/recent attempts/i).first()).toBeVisible();
  await expect(page.locator("section.teacherResultsAttemptsCard").first()).toBeVisible();
}

test.describe("Institute results attempts workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can filter and inspect the results attempts workspace", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/results/attempts");
    await expectInstituteResultsAttemptsWorkspace(page);

    const attemptsSection = page.locator("section.teacherResultsAttemptsCard").first();
    const attemptsForm = attemptsSection.locator("form.workspaceFiltersForm").first();

    await attemptsForm.locator('select[name="attempt_filter"]').selectOption("critical");
    await attemptsForm.locator('select[name="attempt_sort"]').selectOption("warnings_high");
    await attemptsForm.locator('select[name="attempt_group"]').selectOption("health");
    await attemptsForm.locator('select[name="attempt_page_size"]').selectOption("18");
    await attemptsForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/institute\/results\/attempts\?[^#]*attempt_filter=critical/);
    await expect(page).toHaveURL(/\/institute\/results\/attempts\?[^#]*attempt_sort=warnings_high/);
    await expect(page).toHaveURL(/\/institute\/results\/attempts\?[^#]*attempt_group=health/);
    await expect(page).toHaveURL(/\/institute\/results\/attempts\?[^#]*attempt_page_size=18/);
    await expect(page.getByText(/review: critical/i)).toBeVisible();
    await expect(page.getByText(/group: health/i)).toBeVisible();

    await attemptsSection.getByRole("link", { name: /reset attempt filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/results\/attempts(?:\?.*)?$/);

    const inspectAttemptLink = page.getByRole("link", { name: /inspect attempt/i }).first();
    if (await inspectAttemptLink.isVisible().catch(() => false)) {
      await inspectAttemptLink.click();
      await expect(page).toHaveURL(/\/institute\/results\/attempts\?[^#]*attempt=/);
      await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
      await expect(page.getByText(/decision support/i).first()).toBeVisible();
    } else {
      await expect(
        page
          .getByText(
            /no attempt records were returned for the selected exam|no students match this review filter right now/i,
          )
          .first(),
      ).toBeVisible();
    }
  });
});
