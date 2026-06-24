import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function expectStudentPracticeWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
}

async function expectAnyVisible(locatorOptions: Locator[]) {
  for (const locator of locatorOptions) {
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return locator;
    }
  }
  throw new Error("Expected at least one candidate locator to be visible.");
}

test.describe("Student practice workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate practice workspace states and navigation actions", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto("/app/practice");
    await expectStudentPracticeWorkspace(page);

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();

    if (await filtersCard.isVisible().catch(() => false)) {
      const practiceForm = filtersCard.locator("form.studentWorkspaceFiltersForm").first();

      await practiceForm.locator('select[name="practice_filter"]').selectOption("review");
      await practiceForm.locator('select[name="practice_sort"]').selectOption("shortest");
      await practiceForm.locator('select[name="practice_group"]').selectOption("subject");
      await practiceForm.getByRole("button", { name: /apply filters/i }).click();

      await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_filter=review/);
      await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_sort=shortest/);
      await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_group=subject/);
      await expect(page.getByText(/sort: shortest/i)).toBeVisible();
      await expect(page.getByText(/group: subject/i)).toBeVisible();

      const noMatchState = page.getByText(/no practice sets match these controls/i).first();
      if (await noMatchState.isVisible().catch(() => false)) {
        await expect(page.getByText(/filter returned zero practice sets/i).first()).toBeVisible();
        await page.getByRole("link", { name: /reset practice filters/i }).click();
      } else {
        await expect(page.getByText(/availability: review|availability: ready/i).first()).toBeVisible();
        await filtersCard.getByRole("link", { name: /ready now/i }).click();
        await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_filter=ready/);
        await page.getByRole("link", { name: /reset filters/i }).first().click();
      }

      await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);

      const recommendedPracticeLink = page.getByRole("link", {
        name: /view recommended practice/i,
      });
      if (await recommendedPracticeLink.isVisible().catch(() => false)) {
        await recommendedPracticeLink.click();
        await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?#recommended-practice$/);
      }

      const primaryActionCandidates = [
        page.getByRole("button", { name: /start practice now|start practice/i }).first(),
        page.getByRole("link", { name: /resume practice/i }).first(),
        page.getByRole("link", { name: /review practice/i }).first(),
        page.getByRole("link", { name: /open summary/i }).first(),
        page.getByRole("link", { name: /view practice detail/i }).first(),
        page.getByRole("link", { name: /view details/i }).first(),
        page.getByRole("link", { name: /view detail/i }).first(),
      ];

      const hasVisiblePrimaryAction = await Promise.all(
        primaryActionCandidates.map((locator) => locator.isVisible().catch(() => false)),
      ).then((matches) => matches.some(Boolean));

      if (!hasVisiblePrimaryAction) {
        await expect(page.getByText(/0 practice sets ready/i).first()).toBeVisible();
        await expect(
          expectAnyVisible([
            page.getByRole("link", { name: /reset practice filters/i }).first(),
            page.getByRole("link", { name: /reset filters/i }).first(),
            page.getByRole("link", { name: /ready now/i }).first(),
            page.getByRole("link", { name: /all/i }).first(),
          ]),
        ).resolves.toBeTruthy();
        return;
      }

      const primaryAction = await expectAnyVisible(primaryActionCandidates);

      await primaryAction.click();
      await expect(page).toHaveURL(
        /\/app\/(practice|attempts\/[^/]+(?:\/review|\/summary)?|exams\/[^/?#]+)(?:\?.*)?$/,
      );
    } else {
      await expect(page.getByText(/your practice workspace is empty right now/i).first()).toBeVisible();
      const weakAreasLink = page.getByRole("link", { name: /open weak areas/i }).first();
      await expect(weakAreasLink).toBeVisible();
      await weakAreasLink.click();
      await expect(page).toHaveURL(/\/app\/weak-areas(?:\?.*)?$/);
    }
  });
});
