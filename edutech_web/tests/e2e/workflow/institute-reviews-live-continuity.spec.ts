import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openInstituteReviews(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/reviews");
  await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  await expect(page.getByText(/quick triage/i).first()).toBeVisible();
}

async function openInstituteLiveMonitor(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/results/live");
  await expect(page).toHaveURL(/\/institute\/results\/live(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
}

test.describe("Institute reviews and live continuity", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow institute can preserve continuity between review queue, results, and live monitoring surfaces", async ({
    page,
  }) => {
    await openInstituteReviews(page);

    const scopedQueueLink = page.getByRole("link", { name: /open queue/i }).first();
    if (await scopedQueueLink.isVisible().catch(() => false)) {
      await scopedQueueLink.click();
      await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*exam=/);
      await expect(page.getByText(/exam-scoped review queue/i).first()).toBeVisible();

      const openResults = page.getByRole("link", { name: /open results/i }).first();
      await expect(openResults).toBeVisible();
      await openResults.click();
      await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam=/);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      await page.goBack();
      await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*exam=/);
      await expect(page.getByText(/exam-scoped review queue/i).first()).toBeVisible();

      const backToExam = page.getByRole("link", { name: /back to exam/i }).first();
      await expect(backToExam).toBeVisible();
      await backToExam.click();
      await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);

      await page.goBack();
      await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*exam=/);
    } else {
      const reviewerQueueLink = page.getByRole("link", { name: /view queue/i }).first();
      if (await reviewerQueueLink.isVisible().catch(() => false)) {
        await reviewerQueueLink.click();
        await expect(page).toHaveURL(/\/institute\/reviews\?/);
        await expect(page).toHaveURL(/(reviewer=|assignment_scope=unassigned)/);
        await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
      }
    }

    await openInstituteLiveMonitor(page);

    const emptyStateHeading = page.getByRole("heading", {
      name: /live monitor is useful only during active exam windows/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
      await page.getByRole("link", { name: /open exams/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      return;
    }

    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
    await expect(page.getByText(/intervention queue/i).first()).toBeVisible();

    const inspectAttempt = page.getByRole("link", { name: /inspect attempt|review|inspect/i }).first();
    if (await inspectAttempt.isVisible().catch(() => false)) {
      await inspectAttempt.click();
      await expect(page).toHaveURL(/\/institute\/(results\/live\?[^#]*attempt=|reviews(?:\?.*)?$)/);

      if (/\/institute\/reviews(?:\?.*)?$/i.test(page.url())) {
        await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
      } else {
        await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
        await expect(page.getByText(/decision support/i).first()).toBeVisible();
      }
    } else {
      await expect(
        page.getByText(/no attempts currently need intervention beyond routine monitoring/i).first(),
      ).toBeVisible();
    }
  });
});
