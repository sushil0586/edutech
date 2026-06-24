import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

async function expectTeacherResultsAttemptsWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/teacher\/results\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  await expect(page.getByText(/recent attempts/i).first()).toBeVisible();
  await expect(page.locator("section.teacherResultsAttemptsCard").first()).toBeVisible();
}

test.describe("Teacher results attempts workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can filter and inspect the results attempts workspace", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/results/attempts");
    await expectTeacherResultsAttemptsWorkspace(page);

    const attemptsSection = page.locator("section.teacherResultsAttemptsCard").first();
    const attemptsForm = attemptsSection.locator("form.workspaceFiltersForm").first();

    await attemptsForm.locator('select[name="attempt_filter"]').selectOption("critical");
    await attemptsForm.locator('select[name="attempt_sort"]').selectOption("warnings_high");
    await attemptsForm.locator('select[name="attempt_group"]').selectOption("health");
    await attemptsForm.locator('select[name="attempt_page_size"]').selectOption("18");
    await attemptsForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/teacher\/results\/attempts\?[^#]*attempt_filter=critical/);
    await expect(page).toHaveURL(/\/teacher\/results\/attempts\?[^#]*attempt_sort=warnings_high/);
    await expect(page).toHaveURL(/\/teacher\/results\/attempts\?[^#]*attempt_group=health/);
    await expect(page).toHaveURL(/\/teacher\/results\/attempts\?[^#]*attempt_page_size=18/);
    await expect(page.getByText(/review: critical/i)).toBeVisible();
    await expect(page.getByText(/group: health/i)).toBeVisible();

    await attemptsSection.getByRole("link", { name: /reset attempt filters/i }).click();
    await expect(page).toHaveURL(/\/teacher\/results\/attempts(?:\?.*)?$/);

    const inspectAttemptLink = page.getByRole("link", { name: /inspect attempt/i }).first();
    if (await inspectAttemptLink.isVisible().catch(() => false)) {
      await inspectAttemptLink.click();
      await expect(page).toHaveURL(/\/teacher\/results\/attempts\?[^#]*attempt=/);
      await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
      await expect(page.getByText(/decision support/i).first()).toBeVisible();
    } else {
      await expect(
        page.getByText(/no attempt records were returned for the selected exam|no students match this review filter right now/i).first(),
      ).toBeVisible();
    }
  });
});
